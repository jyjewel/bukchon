"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { STATUS_META } from "@/lib/constants";
import { currentPhase, currentSeason, type DayPhase, type Season } from "@/lib/time";
import type { House, Resident } from "@/lib/types";
import { bake } from "@/pixel/core";
import { AV_H, avatarGrid } from "@/pixel/avatar";
import {
  BOARD, BUSHES, DESK_POS, H, HOUSE_H, HOUSE_POS, LAMPS, LIBRARY, LIBRARY_SPOTS, LIB_H, LIB_W, PLAZA, POND, REST_SPOTS, SEASONS, TREES, TREE_H, W,
  benchGrid, boardGrid, bubbleGrid, bushGrid, chairGrid, deskGrid, fountainGrid, groundGrid, houseGrid, lampGrid, libraryGrid, treeGrid,
} from "@/pixel/village";

const PHASE_LABEL: Record<DayPhase, string> = { dawn: "새벽", day: "낮", dusk: "해질녘", night: "밤" };
const TINT: Record<DayPhase, string | null> = { dawn: "#ffe3d2", day: null, dusk: "#ffc7a0", night: "#6f7fc4" };
const SPEED = 2.4; // 한 프레임(1/30초)에 걷는 도트 수

interface Walker { x: number; y: number; visible: boolean; moving: boolean; left: boolean }

function pct(x: number, y: number, w: number, h: number): CSSProperties {
  return { left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, width: `${(w / W) * 100}%`, height: `${(h / H) * 100}%` };
}

export interface SceneProps {
  houses: House[];
  residents: Resident[];
  myId: string;
  onCharacter: (userId: string) => void;
  onHouse: (slot: number) => void;
  onPlace: (place: "library" | "plaza" | "board") => void;
}

export default function VillageScene({ houses, residents, myId, onCharacter, onHouse, onPlace }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tagRefs = useRef(new Map<string, HTMLButtonElement>());
  const walkers = useRef(new Map<string, Walker>());
  const data = useRef({ houses, residents, myId });
  const [clock, setClock] = useState<{ season: Season; phase: DayPhase }>({ season: "spring", phase: "day" });
  useEffect(() => {
    data.current = { houses, residents, myId };
  }, [houses, residents, myId]);

  useEffect(() => {
    const update = () => setClock({ season: currentSeason(), phase: currentPhase() });
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const { season, phase } = clock;
    const pal = SEASONS[season];
    const night = phase === "night";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const buf = document.createElement("canvas");
    buf.width = W;
    buf.height = H;
    const b = buf.getContext("2d")!;
    const cache = new Map<string, HTMLCanvasElement>();
    const sp = (key: string, build: () => ReturnType<typeof boardGrid>) => {
      let c = cache.get(key);
      if (!c) cache.set(key, (c = bake(build())));
      return c;
    };
    const ground = bake(groundGrid(season));
    const trees = TREES.map(([x, y, v], i) => ({ x, y, c: bake(treeGrid(pal.leaves[(v + i) % pal.leaves.length], v + i, season)) }));
    const bushes = BUSHES.map(([x, y], i) => ({ x, y, c: bake(bushGrid(pal.bush, i, pal.flowers[i % pal.flowers.length])) }));
    const fountain = [0, 1, 2, 3].map((f) => bake(fountainGrid(f)));
    const board = bake(boardGrid()), bench = bake(benchGrid()), lamp = bake(lampGrid(night || phase === "dusk"));

    const resize = () => {
      const k = Math.max(1, Math.min(5, Math.ceil((wrap.clientWidth * (window.devicePixelRatio || 1)) / W)));
      if (canvas.width !== W * k) {
        canvas.width = W * k;
        canvas.height = H * k;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const targetOf = (r: Resident) => {
      const door = { x: HOUSE_POS[r.slot].x + 9, y: HOUSE_POS[r.slot].y + 3 };
      if (r.shown === "open") return { x: DESK_POS[r.slot].x, y: DESK_POS[r.slot].y - 2, visible: true };
      if (r.shown === "library") return { ...LIBRARY_SPOTS[r.slot], visible: true };
      if (r.shown === "rest") return { ...REST_SPOTS[r.slot], visible: true };
      return { ...door, visible: false };
    };

    let raf = 0, last = 0, tick = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < 33) return;
      last = now;
      tick++;
      const { houses, residents } = data.current;
      const bySlot = new Map(residents.map((r) => [r.slot, r]));
      const slow = Math.floor(tick / 9);

      // ── 캐릭터 이동 ──
      for (const id of walkers.current.keys()) if (!residents.some((r) => r.user_id === id)) walkers.current.delete(id);
      for (const r of residents) {
        const t = targetOf(r);
        let w = walkers.current.get(r.user_id);
        if (!w) walkers.current.set(r.user_id, (w = { x: t.x, y: t.y, visible: t.visible, moving: false, left: false }));
        if (t.visible && !w.visible) {
          const door = HOUSE_POS[r.slot];
          Object.assign(w, { x: door.x + 9, y: door.y + 3, visible: true });
        }
        const dx = t.x - w.x, dy = t.y - w.y, dist = Math.hypot(dx, dy);
        if (dist < SPEED || reduced) {
          w.x = t.x; w.y = t.y; w.moving = false;
          if (!t.visible) w.visible = false;
        } else {
          w.x += (dx / dist) * SPEED; w.y += (dy / dist) * SPEED; w.moving = true;
          if (Math.abs(dx) > 0.5) w.left = dx < 0;
        }
      }

      // ── 바닥 ──
      b.globalCompositeOperation = "source-over";
      b.globalAlpha = 1;
      b.drawImage(ground, 0, 0);
      for (let i = 0; i < 4; i++) {
        const sx = POND.x - 14 + ((i * 9 + slow * 2) % 28), sy = POND.y - 5 + ((i * 5 + slow) % 10);
        b.fillStyle = "#e3f6fd";
        b.fillRect(sx, sy, 2, 1);
      }

      // ── y 순서대로 그리기 ──
      const items: { y: number; draw: () => void }[] = [];
      const shadow = (x: number, y: number, rx: number) => {
        b.fillStyle = "rgb(58 42 51 / 0.2)";
        b.fillRect(Math.round(x - rx), Math.round(y - 1), rx * 2, 2);
        b.fillRect(Math.round(x - rx + 2), Math.round(y - 2), rx * 2 - 4, 4);
      };
      for (const t of trees) items.push({ y: t.y, draw: () => { shadow(t.x, t.y, 10); b.drawImage(t.c, t.x - 17, t.y - TREE_H + 2); } });
      for (const s of bushes) items.push({ y: s.y, draw: () => b.drawImage(s.c, s.x - 9, s.y - 11) });
      for (const l of LAMPS) items.push({ y: l.y, draw: () => b.drawImage(lamp, l.x - 5, l.y - 28) });
      items.push({ y: PLAZA.y + 6, draw: () => b.drawImage(fountain[slow % 4], PLAZA.x - 19, PLAZA.y - 24) });
      items.push({ y: PLAZA.y + 30, draw: () => b.drawImage(bench, PLAZA.x - 44, PLAZA.y + 18) });
      items.push({ y: PLAZA.y + 30, draw: () => b.drawImage(bench, PLAZA.x + 20, PLAZA.y + 18) });
      items.push({ y: BOARD.y, draw: () => { shadow(BOARD.x, BOARD.y, 14); b.drawImage(board, BOARD.x - 17, BOARD.y - 33); } });
      const libLit = night || residents.some((r) => r.shown === "library");
      items.push({ y: LIBRARY.y, draw: () => b.drawImage(sp(`lib${libLit}`, () => libraryGrid(libLit)), LIBRARY.x - LIB_W / 2, LIBRARY.y - LIB_H + 2) });

      for (const h of houses) {
        const pos = HOUSE_POS[h.slot], r = bySlot.get(h.slot);
        const lit = Boolean(r?.online), empty = !h.owner_id, mine = h.owner_id === data.current.myId;
        const c = sp(`h${h.slot}${JSON.stringify(h.style)}${lit}${empty}${mine}`, () => houseGrid(h.slot, h.style, { lit, empty, mine }));
        items.push({
          y: pos.y,
          draw: () => {
            shadow(pos.x, pos.y, 26);
            b.drawImage(c, pos.x - 27, pos.y - HOUSE_H + 2);
            const inside = r && r.shown === "focus" && !walkers.current.get(r.user_id)?.visible;
            if (inside) {
              // 창문 너머로 보이는 집중 중인 주민
              const av = sp(`a${JSON.stringify(r.profile.avatar)}0s`, () => avatarGrid(r.profile.avatar, 0, true));
              const wx = pos.x - 16, wy = pos.y - 25;
              b.save();
              b.beginPath();
              b.rect(wx, wy, 10, 10);
              b.clip();
              b.drawImage(av, wx - 4, wy - 1 + (slow % 4 === 0 ? 1 : 0));
              b.restore();
              b.drawImage(sp("bfocus", () => bubbleGrid("focus")), pos.x - 18, pos.y - 42 - (slow % 2));
            }
            if (lit) {
              for (let i = 0; i < 3; i++) {
                const p = ((tick * 0.012 + i / 3) % 1);
                b.globalAlpha = 0.85 * (1 - p);
                b.fillStyle = "#ffffff";
                const size = 2 + Math.round(p * 2);
                b.fillRect(Math.round(pos.x + 13 + Math.sin(p * 5 + i) * 2 + p * 3), Math.round(pos.y - 58 - p * 16), size, size);
              }
              b.globalAlpha = 1;
            }
          },
        });
        const desk = DESK_POS[h.slot];
        const seatedHere = r?.shown === "open" && !walkers.current.get(r.user_id)?.moving;
        items.push({ y: desk.y - 6, draw: () => b.drawImage(sp(`chair${empty}`, () => chairGrid(empty)), desk.x - 6, desk.y - 19) });
        items.push({ y: desk.y + 0.5, draw: () => { shadow(desk.x, desk.y + 1, 12); b.drawImage(sp(`desk${seatedHere}${empty}`, () => deskGrid(Boolean(seatedHere), empty)), desk.x - 14, desk.y - 14); } });
      }

      for (const r of residents) {
        const w = walkers.current.get(r.user_id)!;
        const tag = tagRefs.current.get(r.user_id);
        if (tag) {
          tag.style.display = w.visible ? "" : "none";
          tag.style.left = `${(w.x / W) * 100}%`;
          tag.style.top = `${((w.y - AV_H) / H) * 100}%`;
        }
        if (!w.visible) continue;
        const seated = r.shown === "open" && !w.moving;
        const f = w.moving ? ((Math.floor(tick / 4) % 2) + 1) as 1 | 2 : 0;
        const av = sp(`a${JSON.stringify(r.profile.avatar)}${f}${seated ? "s" : ""}`, () => avatarGrid(r.profile.avatar, f, seated));
        const bob = !w.moving && (slow + r.slot) % 4 === 0 ? 1 : 0;
        items.push({
          y: w.y,
          draw: () => {
            const x = Math.round(w.x), y = Math.round(w.y);
            if (!seated) shadow(x, y, 6);
            if (w.left) {
              b.save();
              b.translate(x * 2, 0);
              b.scale(-1, 1);
              b.drawImage(av, x - 9, y - AV_H + 1 + bob);
              b.restore();
            } else b.drawImage(av, x - 9, y - AV_H + 1 + bob);
            if (!w.moving) b.drawImage(sp(`b${r.shown}`, () => bubbleGrid(r.shown)), x - 6, y - AV_H - 13 - ((slow + r.slot) % 2));
          },
        });
      }
      items.sort((a, c) => a.y - c.y);
      for (const it of items) it.draw();

      // ── 시간대 색조와 불빛 ──
      const tint = TINT[phase];
      if (tint) {
        b.globalCompositeOperation = "multiply";
        b.fillStyle = tint;
        b.fillRect(0, 0, W, H);
        if (night || phase === "dusk") {
          b.globalCompositeOperation = "lighter";
          const glow = (x: number, y: number, rad: number, a: number) => {
            const gr = b.createRadialGradient(x, y, 1, x, y, rad);
            gr.addColorStop(0, `rgb(255 214 120 / ${a})`);
            gr.addColorStop(1, "rgb(255 214 120 / 0)");
            b.fillStyle = gr;
            b.fillRect(x - rad, y - rad, rad * 2, rad * 2);
          };
          const a = night ? 0.5 : 0.22;
          for (const l of LAMPS) glow(l.x, l.y - 23, 26, a);
          for (const h of houses) if (bySlot.get(h.slot)?.online) glow(HOUSE_POS[h.slot].x - 11, HOUSE_POS[h.slot].y - 20, 20, a);
          if (libLit) { glow(LIBRARY.x - 27, LIBRARY.y - 30, 18, a); glow(LIBRARY.x + 27, LIBRARY.y - 30, 18, a); }
          if (night) for (let i = 0; i < 10; i++) {
            if ((slow + i * 3) % 7 < 3) continue;
            b.fillStyle = "rgb(255 246 160 / 0.9)";
            b.fillRect((i * 97 + 40 + Math.round(Math.sin(tick * 0.02 + i) * 4)) % W, (i * 53 + 70 + Math.round(Math.cos(tick * 0.017 + i) * 3)) % H, 1, 1);
          }
        }
        b.globalCompositeOperation = "source-over";
      }

      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [clock]);

  const bySlot = new Map(residents.map((r) => [r.slot, r]));
  return (
    <div ref={wrapRef} className="scene relative w-full" style={{ aspectRatio: `${W} / ${H}` }} role="group" aria-label={`마을 지도 — ${SEASONS[clock.season].label}, ${PHASE_LABEL[clock.phase]}`}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />

      <button type="button" className="scene-hit" style={pct(PLAZA.x - PLAZA.rx, PLAZA.y - PLAZA.ry, PLAZA.rx * 2, PLAZA.ry * 2)} aria-label="마을 광장 — 눌러서 열기" onClick={() => onPlace("plaza")}>
        <span className="scene-label" style={{ top: "100%" }}>마을 광장</span>
      </button>
      <button type="button" className="scene-hit" style={pct(LIBRARY.x - LIB_W / 2, LIBRARY.y - LIB_H + 4, LIB_W, LIB_H - 4)} aria-label="공동 도서관 — 눌러서 열기" onClick={() => onPlace("library")}>
        <span className="scene-label scene-label-sign" style={{ top: "33%" }}>공동 도서관</span>
      </button>
      <button type="button" className="scene-hit" style={pct(BOARD.x - 17, BOARD.y - 33, 34, 34)} aria-label="마을 게시판 — 눌러서 열기" onClick={() => onPlace("board")}>
        <span className="scene-label" style={{ top: "100%" }}>게시판</span>
      </button>

      {houses.map((h) => {
        const r = bySlot.get(h.slot) ?? null;
        const mine = h.owner_id === myId;
        const label = !r ? `${h.slot + 1}번 연구실 — 비어 있음` : mine ? "내 연구실 — 눌러서 들어가기" : `${r.profile.display_name}의 연구실 — ${STATUS_META[r.shown].label}. 눌러서 연구실 방문하기`;
        const pos = HOUSE_POS[h.slot];
        return (
          <button key={h.slot} type="button" className="scene-hit" style={pct(pos.x - 27, pos.y - HOUSE_H + 6, 54, HOUSE_H - 4)} aria-label={label} disabled={!r} onClick={() => onHouse(h.slot)}>
            <span className={`scene-label ${mine ? "scene-label-mine" : ""} ${r ? "" : "scene-label-empty"}`} style={{ top: "100%" }}>
              {r ? `${r.profile.display_name}의 연구실` : "빈 연구실"}
            </span>
          </button>
        );
      })}

      {residents.map((r) => (
        <button
          key={r.user_id}
          type="button"
          ref={(el) => {
            if (el) tagRefs.current.set(r.user_id, el);
            else tagRefs.current.delete(r.user_id);
          }}
          className="scene-hit scene-char"
          style={{ width: `${(20 / W) * 100}%`, height: `${(AV_H / H) * 100}%`, display: "none" }}
          aria-label={`${r.profile.display_name}${r.user_id === myId ? " (나)" : ""} — ${STATUS_META[r.shown].label}. 눌러서 프로필 보기`}
          onClick={() => onCharacter(r.user_id)}
        >
          <span className={`scene-label scene-label-name ${r.user_id === myId ? "scene-label-mine" : ""}`} style={{ top: r.shown === "open" ? "128%" : "104%" }}>
            {r.profile.display_name}
          </span>
        </button>
      ))}
    </div>
  );
}
