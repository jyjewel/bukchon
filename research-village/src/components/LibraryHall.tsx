"use client";
import { useEffect, useRef, useState } from "react";
import { bake } from "@/pixel/core";
import { avatarGrid } from "@/pixel/avatar";
import { currentPhase, type DayPhase } from "@/lib/time";
import { HALL_H, HALL_TABLE_W, HALL_TABLE_X, HALL_TABLE_Y, HALL_W, drawSeatObjects, drawSeatPerson, lampGrid, libraryHall, longTableGrid, seatX, type SeatState } from "@/pixel/libraryRoom";
import type { Avatar, Resident } from "@/lib/types";
import type { Desk } from "@/hooks/useLibraryDesk";
import { clockHM } from "@/hooks/useLibraryDesk";

export type HallPanel = "books" | "schedules" | "goals" | "zoom" | "cabinet" | "clock";
const SAND_SECONDS = 3600;   // 공부 한 시간마다 기지개를 켠다

/** 도서관 홀: 뒤쪽 큰 도서관과 앞쪽 열람 탁자. 물건을 누르면 기능이 열리고, 내 모래시계를 누르면 공부가 시작된다. */
export default function LibraryHall({ medals, goalTitles, goalCount, residents, myId, desks, secondsOf, onOpen }: {
  medals: number; goalTitles: string[]; goalCount: number; residents: Resident[]; myId: string; desks: Desk[]; secondsOf: (d: Desk | undefined, now?: number) => number;
  onOpen: (p: HallPanel) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ residents, desks, myId, secondsOf });
  const hallMedals = Math.min(9, medals);
  const [phase] = useState<DayPhase>(() => currentPhase());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { live.current = { residents, desks, myId, secondsOf }; }, [residents, desks, myId, secondsOf]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const cv = canvas.current, box = wrap.current;
    if (!cv || !box) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bg = bake(libraryHall(phase, hallMedals)), table = bake(longTableGrid(HALL_TABLE_W));
    const lamp = { off: bake(lampGrid(false)), on: bake(lampGrid(true)) };
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
      {   // 벽시계 바늘: 실제 시각
        const d = new Date(ms), sec = d.getSeconds() + d.getMilliseconds() / 1000, min = d.getMinutes() + sec / 60, hr = (d.getHours() % 12) + min / 60;
        const hand = (ang: number, len: number, col: string) => { for (let r = 0; r <= len; r += 0.5) { b.fillStyle = col; b.fillRect(Math.round(100 + Math.sin(ang) * r), Math.round(30 - Math.cos(ang) * r), 1, 1); } };
        hand((hr / 12) * Math.PI * 2, 5, "#3a2a33"); hand((min / 60) * Math.PI * 2, 8.5, "#3a2a33"); hand((Math.floor(sec) / 60) * Math.PI * 2, 9.5, "#d9303a");
        b.fillStyle = "#3a2a33"; b.fillRect(100, 29, 2, 2); b.fillStyle = "#d9303a"; b.fillRect(100, 29, 1, 1);
      }
      const seats = Array.from({ length: 6 }, (_, slot) => {
        const r = residents.find((x) => x.slot === slot);
        const d = r ? desks.find((x) => x.user_id === r.user_id) : undefined;
        const running = Boolean(d?.running);
        const sinceSec = running && d?.since ? (ms - new Date(d.since).getTime()) / 1000 : 0;
        const cycle = sinceSec % SAND_SECONDS;
        const st: SeatState = !r ? "empty" : running ? (sinceSec >= SAND_SECONDS && cycle < 25 ? "done" : "study") : (r.shown === "library" ? "seated" : "empty");
        return { slot, r, st };
      });
      for (const s of seats) if (s.r && s.st !== "empty") drawSeatPerson(b, seatX(s.slot), avOf(s.r.profile.avatar), s.st, tick);
      b.drawImage(table, HALL_TABLE_X, HALL_TABLE_Y);
      for (const s of seats) drawSeatObjects(b, seatX(s.slot), s.st, tick, lamp);
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
  return (
    <div ref={wrap} className="hall-wrap relative w-full" style={{ aspectRatio: `${HALL_W} / ${HALL_H}` }} role="group" aria-label="도서관 홀">
      <canvas ref={canvas} width={HALL_W} height={HALL_H} className="pixelated absolute inset-0 h-full w-full" aria-hidden />
      {hit("함께 읽는 책 (책장)", "books", 4, 14, 56, 68)}
      {hit("스터디 일정 (게시판)", "schedules", 63, 28, 15, 22)}
      {hit("공동 공부 목표 (큰 게시판)", "goals", 140, 14, 56, 68)}
      {hit("내 공부 시간 (벽시계)", "clock", 86, 16, 28, 28)}
      {hit("Zoom 회의 (노트북)", "zoom", 63, 54, 26, 28)}
      {hit("기념 장식장 (메달)", "cabinet", 118, 50, 20, 32)}
      <div className="hall-board-title" style={pct(146, 19, 44, 8)} aria-hidden>공동 공부 목표</div>
      <ul className="hall-board" style={pct(144, 30, 48, 48)} aria-hidden>
        {goalTitles.slice(0, 4).map((t, i) => <li key={i} className="hall-card">{t}</li>)}
        {goalCount === 0 && <li className="hall-card hall-card-empty">진행 중인 목표가 없어요</li>}
        {goalCount > 4 && <li className="hall-more">외 {goalCount - 4}개</li>}
      </ul>
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
