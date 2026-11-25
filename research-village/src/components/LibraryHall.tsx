"use client";
import { useEffect, useRef, useState } from "react";
import { bake } from "@/pixel/core";
import { avatarGrid } from "@/pixel/avatar";
import { currentPhase, type DayPhase } from "@/lib/time";
import { HALL_H, HALL_TABLE_W, HALL_TABLE_X, HALL_TABLE_Y, HALL_W, drawSeatObjects, drawSeatPerson, hourglassSmall, lampGrid, libraryHall, longTableGrid, seatX, type SeatState } from "@/pixel/libraryRoom";
import type { Avatar, Resident } from "@/lib/types";
import type { Desk } from "@/hooks/useLibraryDesk";
import { clockHM } from "@/hooks/useLibraryDesk";

export type HallPanel = "books" | "schedules" | "goals" | "zoom" | "cabinet";
const SAND_SECONDS = 3600;   // 모래가 다 떨어지는 데 1시간. 다 떨어지면 저절로 다시 뒤집힌다

/** 도서관 홀: 뒤쪽 큰 도서관과 앞쪽 열람 탁자. 물건을 누르면 기능이 열리고, 내 모래시계를 누르면 공부가 시작된다. */
export default function LibraryHall({ medals, residents, myId, desks, secondsOf, onOpen, onTurn }: {
  medals: number; residents: Resident[]; myId: string; desks: Desk[]; secondsOf: (d: Desk | undefined, now?: number) => number;
  onOpen: (p: HallPanel) => void; onTurn: () => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ residents, desks, myId, secondsOf });
  const hallMedals = Math.min(9, medals);
  const [phase] = useState<DayPhase>(() => currentPhase());
  const [now, setNow] = useState(() => Date.now());
  const flip = useRef<Record<string, number>>({});          // 방금 모래시계를 돌린 사람: 눕는 동작이 끝나는 때
  const prevRunning = useRef<Record<string, boolean>>({});
  useEffect(() => { live.current = { residents, desks, myId, secondsOf }; }, [residents, desks, myId, secondsOf]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const cv = canvas.current, box = wrap.current;
    if (!cv || !box) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bg = bake(libraryHall(phase, hallMedals)), table = bake(longTableGrid(HALL_TABLE_W));
    const lamp = { off: bake(lampGrid(false)), on: bake(lampGrid(true)) };
    const glassCache = new Map<string, HTMLCanvasElement>();
    const glass = (s: number, f: number) => { const key = `${Math.round(s * 3)}-${f}`; let c = glassCache.get(key); if (!c) glassCache.set(key, (c = bake(hourglassSmall(Math.round(s * 3) / 3, f)))); return c; };
    const avCache = new Map<string, HTMLCanvasElement>();
    const avOf = (a: Avatar) => { const k = JSON.stringify(a); let c = avCache.get(k); if (!c) avCache.set(k, (c = bake(avatarGrid(a, 0, true)))); return c; };
    const buf = document.createElement("canvas"); buf.width = HALL_W; buf.height = HALL_H;
    const b = buf.getContext("2d")!;
    const resize = () => {
      const k = Math.max(1, Math.min(6, Math.ceil((box.clientWidth * (window.devicePixelRatio || 1)) / HALL_W)));
      if (cv.width !== HALL_W * k) { cv.width = HALL_W * k; cv.height = HALL_H * k; }
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(box);
    const ctx = cv.getContext("2d")!;
    let raf = 0, tick = 0, last = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (t - last < 66) return;                      // 초당 15번이면 충분하다
      last = t; if (!reduced) tick += 4;
      const { residents, desks } = live.current;
      const ms = Date.now();
      b.clearRect(0, 0, HALL_W, HALL_H);
      b.drawImage(bg, 0, 0);
      const seats = Array.from({ length: 6 }, (_, slot) => {
        const r = residents.find((x) => x.slot === slot);
        const d = r ? desks.find((x) => x.user_id === r.user_id) : undefined;
        const running = Boolean(d?.running);
        const sinceSec = running && d?.since ? (ms - new Date(d.since).getTime()) / 1000 : 0;
        const cycle = sinceSec % SAND_SECONDS;
        const st: SeatState = !r ? "empty" : running ? (sinceSec >= SAND_SECONDS && cycle < 25 ? "done" : "study") : (r.shown === "library" ? "seated" : "empty");
        const sand = running ? 1 - cycle / SAND_SECONDS : 1;
        if (r) { const was = prevRunning.current[r.user_id]; if (was !== undefined && was !== running) flip.current[r.user_id] = ms + 700; prevRunning.current[r.user_id] = running; }
        return { slot, r, st, sand, flipping: r ? (flip.current[r.user_id] ?? 0) > ms : false };
      });
      for (const s of seats) if (s.r && s.st !== "empty") drawSeatPerson(b, seatX(s.slot), avOf(s.r.profile.avatar), s.st, tick);
      b.drawImage(table, HALL_TABLE_X, HALL_TABLE_Y);
      for (const s of seats) drawSeatObjects(b, seatX(s.slot), s.st, s.sand, s.flipping, tick, lamp, glass);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(buf, 0, 0, cv.width, cv.height);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [phase, hallMedals]);

  const pct = (x: number, y: number, w: number, h: number) => ({ left: `${(x / HALL_W) * 100}%`, top: `${(y / HALL_H) * 100}%`, width: `${(w / HALL_W) * 100}%`, height: `${(h / HALL_H) * 100}%` });
  const hit = (label: string, p: HallPanel, x: number, y: number, w: number, h: number) => (
    <button key={label} type="button" className="scene-hit hall-hit" style={pct(x, y, w, h)} aria-label={label} title={label} onClick={() => onOpen(p)} />
  );
  const mySlot = residents.find((r) => r.user_id === myId)?.slot ?? -1;
  const myDesk = desks.find((d) => d.user_id === myId);
  return (
    <div ref={wrap} className="hall-wrap relative w-full" style={{ aspectRatio: `${HALL_W} / ${HALL_H}` }} role="group" aria-label="도서관 홀">
      <canvas ref={canvas} width={HALL_W} height={HALL_H} className="pixelated absolute inset-0 h-full w-full" aria-hidden />
      {hit("함께 읽는 책 (왼쪽 책장)", "books", 4, 14, 56, 68)}
      {hit("함께 읽는 책 (오른쪽 책장)", "books", 140, 14, 56, 68)}
      {hit("스터디 일정 (게시판)", "schedules", 63, 28, 15, 22)}
      {hit("공동 공부 목표 (칠판)", "goals", 122, 28, 15, 22)}
      {hit("Zoom 회의 (노트북)", "zoom", 63, 60, 18, 22)}
      {hit("기념 장식장 (메달)", "cabinet", 118, 50, 20, 32)}
      {mySlot >= 0 && (
        <button type="button" className="scene-hit hall-hit" style={pct(seatX(mySlot) + 6, HALL_TABLE_Y - 10, 14, 16)} aria-label={myDesk?.running ? "내 모래시계 멈추기" : "내 모래시계 돌려서 공부 시작"} title={myDesk?.running ? "모래시계 멈추기" : "모래시계 돌리기"} onClick={onTurn} />
      )}
      {residents.filter((r) => r.slot >= 0 && r.slot < 6).map((r) => {
        const d = desks.find((x) => x.user_id === r.user_id);
        const sec = secondsOf(d, now);
        if (!d && r.shown !== "library") return null;
        return (
          <span key={r.user_id} className={`hall-plate ${d?.running ? "hall-plate-on" : ""}`} style={pct(seatX(r.slot) - 12, HALL_TABLE_Y + 9, 24, 5.5)}>
            <span className="nm">{r.profile.display_name} </span>{clockHM(sec)}
          </span>
        );
      })}
    </div>
  );
}
