"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { STATUS_META } from "@/lib/constants";
import { currentPhase, currentSeason, type DayPhase, type Season } from "@/lib/time";
import type { House, Resident } from "@/lib/types";
import { bake } from "@/pixel/core";
import { BOOK_COLORS, flyingBookGrid } from "@/pixel/book";
import { fxGrid } from "@/pixel/fx";
import { nearestWalkable } from "@/lib/walk";
import { labTitle, signLines } from "@/lib/labName";
import { SANTA_AVATAR, rudolphGrid, sackGrid } from "@/pixel/santa";
import { TREE_BASE, christmasTreeGrid, drawLightStrings, isChristmasSeason } from "@/pixel/christmas";
import { CANDLES, candleGlow, candleGrid, drawCandle, drawOwl, drawSnowfall, snowToday, drawLibraryXmas, castleGrid, CASTLE_H, CASTLE_W, treeAura, snowCap, snowCover } from "@/pixel/magic";
import { MON_H, MON_POS, MON_W, drawMonumentBreak, monumentGrid } from "@/pixel/monument";
import { BIRD_KINDS, birdGrid } from "@/pixel/birds";
import { eatGrid } from "@/pixel/eat";
import { ORB_H, ORB_POS, ORB_W, newMarkGrid, orbPedestalGrid, orbSphereGrid } from "@/pixel/orb";
import { RACCOON_POS, TRUCK_AWNING_Y, TRUCK_H, TRUCK_POS, TRUCK_REST_SPOTS, TRUCK_W, TRUCK_WINDOW, ladleGrid, raccoonGrid, truckGrid } from "@/pixel/truck";
import { AV_CX, AV_H, avatarGrid } from "@/pixel/avatar";
import {
  BICHEON_H, BICHEON_W, BOARD, BUSHES, DESK_POS, H, HOUSE_H, HOUSE_META, HOUSE_POS, LAMPS, LIBRARY, LIBRARY_SPOTS, LIB_H, LIB_W, PLAZA, POND, REST_SPOTS, SEASONS, TREES, TREE_H, W,
  benchGrid, boardGrid, bubbleGrid, bushGrid, chairGrid, deskGrid, fountainGrid, groundGrid, houseGrid, houseTypeOf, lampGrid, libraryGrid, treeGrid, type LibraryStyle,
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
  /** 광장에 와 있는 트럭(야식 트럭·아침 밥차). 눌렀을 때 */
  truck?: "night" | "morning" | null;
  onTruck?: () => void;
  /** 도서관 건물 모양(마을 장이 바꾼다) */
  libraryStyle?: LibraryStyle | "castle";
  /** 소원구슬을 눌렀을 때 */
  onOrb?: () => void;
  /** 마을 게시판 옆에 뜨는 안 읽은 새 글 수 */
  boardNew?: number;
  /** 비석 이벤트: 있으면 서 있고, 부서지면 먼지로 사라진다. 정해진 한 사람만 누를 수 있다 */
  monument?: { broken_at: string | null } | null;
  /** 공동 목표를 다 이뤘을 때 광장에서 벌어지는 한바탕 잔치 */
  party?: { id: string; title: string; members: string[]; start: number } | null;
  /** 크리스마스 이브 밤: 산타와 루돌프가 마을을 돌아다닌다. 산타를 누르면 선물 */
  santa?: boolean;
  onSanta?: () => void;
  /** 지도의 빈 곳을 눌렀을 때(걸을 수 있는 자리로 보정된 좌표) */
  onWalk?: (x: number, y: number) => void;
  canBreakMonument?: boolean;
  onBreakMonument?: () => void;
  /** 연구실 앞 책상을 눌렀을 때 */
  onDesk: (slot: number) => void;
  /** 이웃에게 던지기 (학위논문·마감 알림·과자). id 가 바뀔 때마다 한 번 재생된다 */
  /** 새 글이 올라온 이웃의 집 자리: 그 집 지붕에 작은 새가 앉는다 */
  birdSlots?: number[];
  fx?: { id: number; kind: string; from: string; to: string } | null;
}

export default function VillageScene({ houses, residents, myId, onCharacter, onHouse, onPlace, onDesk, fx, truck, onTruck, libraryStyle = "classic", onOrb, boardNew = 0, birdSlots, monument = null, canBreakMonument = false, onBreakMonument, party = null, santa = false, onSanta, onWalk }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tagRefs = useRef(new Map<string, HTMLButtonElement>());
  const walkers = useRef(new Map<string, Walker>());
  const data = useRef({ houses, residents, myId });
  const monRef = useRef(monument);
  useEffect(() => { monRef.current = monument; }, [monument]);
  const [monFont, setMonFont] = useState(false);
  useEffect(() => { void document.fonts.load("11px Galmuri11").then(() => setMonFont(true)); }, []);
  const partyRef = useRef(party);
  useEffect(() => { partyRef.current = party; }, [party]);
  const santaRef = useRef(santa);
  useEffect(() => { santaRef.current = santa; }, [santa]);
  const santaBtn = useRef<HTMLButtonElement>(null);
  // 새 글이 있는 집 자리 → 새가 앉기 시작한 시각(-1: 아직 안 그림). 이미 앉은 새는 그대로 둔다
  const sparkRef = useRef(new Map<number, number>());
  useEffect(() => { const m = new Map<number, number>(); for (const sl of birdSlots ?? []) m.set(sl, sparkRef.current.get(sl) ?? -1); sparkRef.current = m; }, [birdSlots]);
  const newRef = useRef(boardNew);
  useEffect(() => { newRef.current = boardNew; }, [boardNew]);
  const fxRef = useRef<{ id: number; kind: string; from: string; to: string; start: number } | null>(null);
  useEffect(() => {
    if (fx && fxRef.current?.id !== fx.id) fxRef.current = { ...fx, start: performance.now() };
  }, [fx]);
  const [clock, setClock] = useState<{ season: Season; phase: DayPhase; xmas: boolean; snow: 0 | 1 | 2 | 3; cover: number }>({ season: "spring", phase: "day", xmas: false, snow: 0, cover: 1 });
  useEffect(() => {
    data.current = { houses, residents, myId };
  }, [houses, residents, myId]);

  useEffect(() => {
    const update = () => setClock({ season: currentSeason(), phase: currentPhase(), xmas: isChristmasSeason(), snow: snowToday(), cover: snowCover() });
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const { season, phase, xmas, snow, cover } = clock;
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
    const vSeason: Season = xmas ? "winter" : season;
    const wintry = vSeason === "winter";
    const capped = wintry && cover >= 0.4;     // 지붕에 눈이 쌓일 만큼 쌓였을 때만
    const bare = wintry && cover < 0.4;       // 눈이 많이 녹은 날의 나무 잎
    const BARE: [string, string, string][] = [["#6f8f74", "#8fae92", "#527358"], ["#7a9468", "#9cb585", "#5b7550"], ["#6a8a7e", "#8aab9d", "#4f6d62"]];
    const ground = bake(groundGrid(vSeason, wintry ? cover : 1));
    const trees = TREES.map(([x, y, v], i) => ({ x, y, c: bake(bare ? treeGrid(BARE[(v + i) % 3], v + i, "summer") : treeGrid(SEASONS[vSeason].leaves[(v + i) % pal.leaves.length], v + i, vSeason)) }));
    const bushes = BUSHES.map(([x, y], i) => ({ x, y, c: bake(bushGrid(pal.bush, i, pal.flowers[i % pal.flowers.length])) }));
    const fountain = [0, 1, 2, 3].map((f) => bake(fountainGrid(f)));
    const candleImg = bake(candleGrid());
    const xtree = xmas ? [0, 1, 2, 3].map((f) => bake(christmasTreeGrid(f))) : [];
    const monSrc = monFont ? bake(monumentGrid()) : null;
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

    const partySpot = (r: Resident) => {
      const p = partyRef.current;
      if (!p) return null;
      const i = p.members.indexOf(r.user_id);
      if (i < 0) return null;
      const n = Math.max(2, p.members.length), a = Math.PI * (0.08 + (0.84 * i) / (n - 1));
      return { x: PLAZA.x - Math.cos(a) * 56, y: PLAZA.y + 14 + Math.sin(a) * 22, visible: true };
    };
    const targetOf = (r: Resident) => {
      const spot = partySpot(r);
      if (spot) return spot;
      const door = { x: HOUSE_POS[r.slot].x + 9, y: HOUSE_POS[r.slot].y + 3 };
      if (r.shown === "open") return { x: DESK_POS[r.slot].x, y: DESK_POS[r.slot].y - 2, visible: true };
      if (r.shown === "library") return { ...LIBRARY_SPOTS[r.slot], visible: true };
      if (r.shown === "rest" && r.status.pos_x != null && r.status.pos_y != null) return { x: r.status.pos_x, y: r.status.pos_y, visible: true };
      if (r.shown === "rest") return { ...(truck ? TRUCK_REST_SPOTS : REST_SPOTS)[r.slot], visible: true };
      return { ...door, visible: false };
    };

    // 산타와 루돌프: 광장 둘레를 천천히 돈다 (루돌프가 앞, 산타는 조금 뒤에서 따라간다)
    const route: [number, number][] = [[150, 176], [182, 206], [232, 214], [284, 198], [310, 168], [286, 142], [236, 130], [186, 138]];
    const rud = { x: route[0][0], y: route[0][1], i: 1, left: false, moving: true };
    const trail: [number, number][] = [];
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

      // ── 산타와 루돌프 걸음 ──
      if (santaRef.current) {
        const [tx, ty] = route[rud.i], dx = tx - rud.x, dy = ty - rud.y, dist = Math.hypot(dx, dy);
        if (dist < 1.2) rud.i = (rud.i + 1) % route.length;
        else { rud.x += (dx / dist) * 0.8; rud.y += (dy / dist) * 0.8; if (Math.abs(dx) > 0.3) rud.left = dx < 0; }
        trail.push([rud.x, rud.y]); if (trail.length > 40) trail.shift();
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
      if (santaRef.current && trail.length > 0) {
        const sp0 = trail[0], face = rud.left;
        const rf = (Math.floor(tick / 5) % 2) as 0 | 1;
        items.push({ y: rud.y, draw: () => {
          const x = Math.round(rud.x), y = Math.round(rud.y), spr = sp(`rud${rf}`, () => rudolphGrid(rf));
          shadow(x, y, 9);
          if (face) { b.save(); b.translate(x * 2, 0); b.scale(-1, 1); b.drawImage(spr, x - 13, y - 21); b.restore(); } else b.drawImage(spr, x - 13, y - 21);
          // 반짝이는 루돌프 코
          const gl = 0.55 + 0.4 * Math.sin(tick * 0.3), nx = face ? x - 12 : x + 12;
          b.globalCompositeOperation = "lighter"; b.fillStyle = `rgb(255 80 60 / ${gl})`; b.fillRect(nx - 2, y - 13, 5, 5); b.globalCompositeOperation = "source-over";
        } });
        items.push({ y: sp0[1], draw: () => {
          const x = Math.round(sp0[0]), y = Math.round(sp0[1]), f = (Math.floor(tick / 4) % 2) + 1 as 1 | 2;
          const av = sp(`santa${f}`, () => avatarGrid(SANTA_AVATAR, f, false)), sack = sp("sack", () => sackGrid());
          shadow(x, y, 6);
          if (face) { b.save(); b.translate(x * 2, 0); b.scale(-1, 1); b.drawImage(sack, x + 3, y - 18); b.drawImage(av, x - AV_CX, y - AV_H + 1); b.restore(); }
          else { b.drawImage(sack, x - 15, y - 18); b.drawImage(av, x - AV_CX, y - AV_H + 1); }
          if (Math.floor(tick / 45) % 4 === 0) {           // 가끔 "호호호!"
            b.save(); b.textAlign = "center"; b.textBaseline = "middle"; b.font = `9px ${monFont ? "Galmuri11, sans-serif" : "sans-serif"}`; b.lineWidth = 3; b.lineJoin = "round";
            b.strokeStyle = "#3a2a33"; b.strokeText("호호호!", x, y - AV_H - 6); b.fillStyle = "#ffe27a"; b.fillText("호호호!", x, y - AV_H - 6); b.restore();
          }
        } });
        const tag = santaBtn.current;
        if (tag) { tag.style.display = ""; tag.style.left = `${((sp0[0] - 12) / W) * 100}%`; tag.style.top = `${((sp0[1] - AV_H) / H) * 100}%`; tag.style.width = `${(24 / W) * 100}%`; tag.style.height = `${(AV_H / H) * 100}%`; }
      } else if (santaBtn.current) santaBtn.current.style.display = "none";
      for (const l of LAMPS) items.push({ y: l.y, draw: () => b.drawImage(lamp, l.x - 5, l.y - 28) });
      if (xmas) {
        // 크리스마스 달: 분수 자리에 커다란 트리가 서고, 가로등까지 전구 줄이 이어진다
        const base = { x: PLAZA.x, y: PLAZA.y + 12 };
        items.push({ y: base.y, draw: () => { shadow(base.x, base.y, 24); b.drawImage(xtree[Math.floor(tick / 8) % 4], base.x - TREE_BASE.x, base.y - TREE_BASE.y); } });
        items.push({ y: base.y + 0.5, draw: () => drawLightStrings(b, tick, base, LAMPS) });
      } else items.push({ y: PLAZA.y + 6, draw: () => b.drawImage(fountain[slow % 4], PLAZA.x - 19, PLAZA.y - 24) });
      items.push({ y: PLAZA.y + 30, draw: () => b.drawImage(bench, PLAZA.x - 44, PLAZA.y + 18) });
      items.push({ y: PLAZA.y + 30, draw: () => b.drawImage(bench, PLAZA.x + 20, PLAZA.y + 18) });
      items.push({ y: BOARD.y, draw: () => { shadow(BOARD.x, BOARD.y, 14); b.drawImage(board, BOARD.x - 17, BOARD.y - 33); } });
      items.push({
        y: ORB_POS.y,
        draw: () => {
          shadow(ORB_POS.x, ORB_POS.y, 8);
          b.drawImage(sp("orb-ped", () => orbPedestalGrid()), ORB_POS.x - ORB_W / 2, ORB_POS.y - 12);
          const float = Math.round(Math.sin(tick * 0.09) * 1.5);
          b.drawImage(sp("orb-sphere", () => orbSphereGrid()), ORB_POS.x - 8, ORB_POS.y - ORB_H + float);
          // 구슬 둘레를 도는 작은 별빛
          for (let i = 0; i < 4; i++) {
            const a = tick * 0.05 + (i * Math.PI) / 2, tw = (slow + i) % 3;
            if (tw === 0) continue;
            b.fillStyle = tw === 1 ? "#fff6b0" : "#ffffff";
            b.fillRect(Math.round(ORB_POS.x + Math.cos(a) * 12), Math.round(ORB_POS.y - ORB_H / 2 - 2 + float + Math.sin(a) * 6), 1, 1);
          }
        },
      });
      {
        // 비석: 서 있다가, 부서지면 먼지로 흩어져 사라진다
        const mon = monRef.current;
        if (mon && monSrc) {
          const age = mon.broken_at ? Date.now() - new Date(mon.broken_at).getTime() : -1;
          const t = age < 0 ? -1 : age / 2800;
          if (t < 1) {
            items.push({
              y: MON_POS.y,
              draw: () => {
                if (t < 0.5) shadow(MON_POS.x, MON_POS.y, 12);
                if (t < 0) b.drawImage(monSrc, MON_POS.x - Math.floor(MON_W / 2), MON_POS.y - MON_H + 1);
                else drawMonumentBreak(b, monSrc, MON_POS.x - Math.floor(MON_W / 2), MON_POS.y - MON_H + 1, t);
              },
            });
          }
        }
      }
      if (newRef.current > 0) {
        // 게시판 위에서 반짝이는 N (노란 테두리)
        items.push({
          y: BOARD.y + 1,
          draw: () => {
            const nx = BOARD.x + 12, ny = BOARD.y - 38 + (Math.round(Math.sin(tick * 0.18) * 1.5));
            b.drawImage(sp("newmark", () => newMarkGrid()), nx - 5, ny - 6);
            // 노란 별빛이 N 둘레에서 번갈아 반짝인다
            const star = (x: number, y: number, big: boolean) => {
              b.fillStyle = "#fff6b0"; b.fillRect(x, y, 1, 1);
              if (big) { b.fillRect(x - 1, y, 1, 1); b.fillRect(x + 1, y, 1, 1); b.fillRect(x, y - 1, 1, 1); b.fillRect(x, y + 1, 1, 1); }
            };
            const ph = Math.floor(tick / 5) % 4;
            if (ph !== 1) star(nx - 8, ny - 6, ph === 0);
            if (ph !== 2) star(nx + 8, ny - 4, ph === 3);
            if (ph !== 3) star(nx + 7, ny + 7, ph === 1);
            if (ph !== 0) star(nx - 7, ny + 6, ph === 2);
          },
        });
      }
      if (truck) {
        const tx = TRUCK_POS.x - TRUCK_W / 2, ty = TRUCK_POS.y - TRUCK_H + 3;
        items.push({
          y: TRUCK_POS.y,
          draw: () => {
            shadow(TRUCK_POS.x, TRUCK_POS.y, 22);
            b.drawImage(sp(`truck-${truck}`, () => truckGrid(truck)), tx, ty);
            // 창문에서 올라오는 김
            for (let i = 0; i < 3; i++) {
              const p = (tick * 0.014 + i / 3) % 1;
              b.globalAlpha = 0.9 * (1 - p);
              b.fillStyle = "#ffffff";
              const size = 2 + Math.round(p * 2);
              b.fillRect(Math.round(tx + TRUCK_WINDOW.x + (i - 1) * 5 + Math.sin(p * 6 + i) * 2), Math.round(ty + TRUCK_WINDOW.y - 2 - p * 14), size, size);
            }
            b.globalAlpha = 1;
            // 야식 트럭은 차양 끝에 알전구가 번갈아 반짝인다
            if (truck === "night") for (let x = 5; x < 30; x += 4) {
              b.fillStyle = (slow + x) % 2 ? "#ffe34a" : "#ff9fb6";
              b.fillRect(tx + x + 1, ty + TRUCK_AWNING_Y + 1, 2, 2);
            }
          },
        });
      }
      if (truck) {
        // 요리사 모자를 쓴 너구리가 국자를 휘젓는다
        items.push({
          y: RACCOON_POS.y,
          draw: () => {
            shadow(RACCOON_POS.x, RACCOON_POS.y, 7);
            const bob = slow % 3 === 0 ? 1 : 0;
            const rx = RACCOON_POS.x - 11, ry = RACCOON_POS.y - 27 - bob;
            b.drawImage(sp("raccoon", () => raccoonGrid()), rx, ry);
            b.drawImage(sp("ladle", () => ladleGrid()), rx + 13 + Math.round(Math.sin(tick * 0.28) * 2), ry + 7 + Math.round(Math.cos(tick * 0.28)));
          },
        });
      }
      const libLit = night || residents.some((r) => r.shown === "library");
      const bich = libraryStyle === "bicheondang";
      const castle = libraryStyle === "castle" || (xmas && libraryStyle === "classic");   // 마법의 성: 마을 장이 고르거나, 크리스마스 기간엔 기본 도서관 대신
      items.push({ y: LIBRARY.y, draw: () => b.drawImage(sp(`lib${libLit}${libraryStyle}${castle}${capped}`, () => { const g0 = castle ? castleGrid(libLit) : libraryGrid(libLit, libraryStyle as LibraryStyle); return capped ? snowCap(g0, castle ? 0.6 : 0.4, false) : g0; }), LIBRARY.x - (castle ? CASTLE_W : bich ? BICHEON_W : LIB_W) / 2, LIBRARY.y - (castle ? CASTLE_H : bich ? BICHEON_H : LIB_H) + 2) });

      if (xmas) for (const c of CANDLES) items.push({ y: 400, draw: () => drawCandle(b, candleImg, c, tick) });
      if (xmas && !reduced) items.push({ y: 401, draw: () => drawOwl(b, tick, W) });
      if (snow > 0 && !reduced) items.push({ y: 402, draw: () => drawSnowfall(b, tick, W, H, night, snow as 1 | 2 | 3) });
      for (const h of houses) {
        const pos = HOUSE_POS[h.slot], r = bySlot.get(h.slot);
        const lit = Boolean(r?.online), empty = !h.owner_id, mine = h.owner_id === data.current.myId;
        const meta = HOUSE_META[houseTypeOf(h.style)];
        const c = sp(`h${houseTypeOf(h.style)}${lit}${empty}${mine}`, () => capped ? snowCap(houseGrid(h.style, { lit, empty, mine })) : houseGrid(h.style, { lit, empty, mine }));
        items.push({
          y: pos.y,
          draw: () => {
            shadow(pos.x, pos.y, 26);
            b.drawImage(c, pos.x - 27, pos.y - HOUSE_H + 2);
            const born = sparkRef.current.get(h.slot);
            if (born !== undefined) {
              // 새 글이 있는 집: 지붕에 작은 새가 날아와 앉는다. 가끔 콕콕 쪼고, 꼬리를 까딱이고, 폴짝 뛴다.
              if (born < 0) sparkRef.current.set(h.slot, tick);
              const age = born < 0 ? 0 : tick - born, kind = BIRD_KINDS[h.slot % 4], pch = meta.perch;
              const px0 = pos.x - 27 + pch.x - 7, py0 = pos.y - HOUSE_H + 2 + pch.y - 10;
              if (age < 60) {
                const u = age / 60, e = 1 - (1 - u) * (1 - u);                        // 위쪽에서 포물선을 그리며 내려앉는다
                b.drawImage(sp(`bird${kind}3`, () => birdGrid(kind, 3)), Math.round(px0 + (1 - e) * 46), Math.round(py0 - (1 - e) * 40 + Math.sin(u * Math.PI) * -4));
              } else {
                const ph = Math.floor(tick / 10 + h.slot * 3) % 14, pose = ph === 2 || ph === 8 ? 1 : ph === 5 || ph === 11 ? 2 : 0;
                b.globalAlpha = 0.22; b.fillStyle = "#3a2a33"; b.fillRect(px0 + 3, py0 + 11, 8, 1); b.globalAlpha = 1;
                b.drawImage(sp(`bird${kind}${pose}`, () => birdGrid(kind, pose as 0 | 1 | 2)), px0, py0 - (ph === 6 ? 1 : 0));
              }
            }
            const inside = r && r.shown === "focus" && !walkers.current.get(r.user_id)?.visible;
            if (inside) {
              // 창문 너머로 보이는 집중 중인 주민
              const av = sp(`a${JSON.stringify(r.profile.avatar)}0s`, () => avatarGrid(r.profile.avatar, 0, true));
              const wx = pos.x - 27 + meta.window.x, wy = pos.y - 62 + meta.window.y;
              b.save();
              b.beginPath();
              b.rect(wx, wy, 10, 10);
              b.clip();
              b.drawImage(av, wx - 7, wy - 1 + (slow % 4 === 0 ? 1 : 0));
              b.restore();
              b.drawImage(sp("bfocus", () => bubbleGrid("focus")), pos.x - 27 + meta.bubble.x, pos.y - 62 + meta.bubble.y - (slow % 2));
            }
            if (lit && meta.smoke) {
              for (let i = 0; i < 3; i++) {
                const p = ((tick * 0.012 + i / 3) % 1);
                b.globalAlpha = 0.85 * (1 - p);
                b.fillStyle = "#ffffff";
                const size = 2 + Math.round(p * 2);
                b.fillRect(Math.round(pos.x - 27 + meta.smoke.x + Math.sin(p * 5 + i) * 2 + p * 3), Math.round(pos.y - 62 + meta.smoke.y - p * 16), size, size);
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
        // 간식을 먹는 중(먹고 한 시간): 손에 들고 있다가 가끔 입으로 들어 올려 한 입 먹는다
        const eatK = r.status.snack_kind && r.status.snack_until && Date.parse(r.status.snack_until) > Date.now() ? r.status.snack_kind : null;
        const eatUp = Boolean(eatK) && !w.moving && Math.floor((tick + r.slot * 17) / 22) % 3 === 1;
        const av = sp(`a${JSON.stringify(r.profile.avatar)}${f}${seated ? "s" : ""}${eatK ? `e${eatK}${eatUp ? "u" : "d"}` : ""}`, () => avatarGrid(r.profile.avatar, f, seated, eatK ? { kind: eatK, up: eatUp } : undefined));
        const pa = partyRef.current, dancing = Boolean(pa && pa.members.includes(r.user_id) && !w.moving && (performance.now() - pa.start) / 1000 > 3);
        const bob = dancing ? -Math.round(Math.abs(Math.sin(tick * 0.28 + r.slot)) * 6) : !w.moving && (slow + r.slot) % 4 === 0 ? 1 : 0;
        items.push({
          y: w.y,
          draw: () => {
            const x = Math.round(w.x), y = Math.round(w.y);
            if (!seated) shadow(x, y, 6);
            if (w.left) {
              b.save();
              b.translate(x * 2, 0);
              b.scale(-1, 1);
              b.drawImage(av, x - AV_CX, y - AV_H + 1 + bob);
              b.restore();
            } else b.drawImage(av, x - AV_CX, y - AV_H + 1 + bob);
            if (!w.moving && !r.say) b.drawImage(sp(`b${r.shown}`, () => bubbleGrid(r.shown)), x - 6, y - AV_H - 13 - ((slow + r.slot) % 2));
            if (eatUp) {
              // 한 입 먹는 순간: 입가에 작은 별빛이 반짝인다
              const ex = x + 3, ey = y - AV_H + 11;
              b.fillStyle = "#fff6b0"; b.fillRect(ex, ey, 1, 1); b.fillRect(ex + 3, ey - 2, 1, 1);
              b.fillStyle = "#ffffff"; b.fillRect(ex + 1, ey + 1, 1, 1);
            }
          },
        });
      }
      items.sort((a, c) => a.y - c.y);
      for (const it of items) it.draw();
      // ── 던지기: 보낸 사람에게서 받은 사람에게 날아가 별이 튄다 ──
      const f = fxRef.current;
      if (f) {
        const el = (performance.now() - f.start) / 1000;
        const a = walkers.current.get(f.from), t = walkers.current.get(f.to);
        if (!a || !t || el > 1.5) fxRef.current = null;
        else {
          const sx = a.x, sy = a.y - AV_H / 2, tx = t.x, ty = t.y - AV_H / 2;
          if (el < 0.7) {
            const u = el / 0.7, x = sx + (tx - sx) * u, y = sy + (ty - sy) * u - Math.sin(Math.PI * u) * 22;
            const spr = sp(`fx-${f.kind}`, () => fxGrid(f.kind) ?? fxGrid("thesis")!);
            const spin = Math.floor(el * 14) % 4;
            b.save();
            b.translate(Math.round(x), Math.round(y));
            b.rotate((spin * Math.PI) / 2);
            b.drawImage(spr, -Math.floor(spr.width / 2), -Math.floor(spr.height / 2));
            b.restore();
          } else {
            const u = (el - 0.7) / 0.8, star = sp("fx-star", () => fxGrid("star")!);
            for (let i = 0; i < 6; i++) {
              const ang = (i / 6) * Math.PI * 2 + 0.4, r = 4 + u * 16;
              b.globalAlpha = Math.max(0, 1 - u);
              b.drawImage(star, Math.round(tx + Math.cos(ang) * r - 2), Math.round(ty + Math.sin(ang) * r - 2));
            }
            b.globalAlpha = 1;
          }
        }
      }

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
          if (xmas) for (const c of CANDLES) candleGlow(b, c, tick, night ? 0.5 : 0.16);
          if (xmas) { treeAura(b, { x: PLAZA.x, y: PLAZA.y + 12 }, tick, night); drawLibraryXmas(b, LIBRARY, tick, night, "glow"); }
          if (truck) glow(TRUCK_POS.x - 9, TRUCK_POS.y - 17, 26, a + 0.15);
          for (const h of houses) if (bySlot.get(h.slot)?.online) { const m = HOUSE_META[houseTypeOf(h.style)]; glow(HOUSE_POS[h.slot].x - 27 + m.window.x + 5, HOUSE_POS[h.slot].y - 62 + m.window.y + 5, 20, a); }
          if (libLit) { glow(LIBRARY.x - 27, LIBRARY.y - 30, 18, a); glow(LIBRARY.x + 27, LIBRARY.y - 30, 18, a); }
          if (night) for (let i = 0; i < 10; i++) {
            if ((slow + i * 3) % 7 < 3) continue;
            b.fillStyle = "rgb(255 246 160 / 0.9)";
            b.fillRect((i * 97 + 40 + Math.round(Math.sin(tick * 0.02 + i) * 4)) % W, (i * 53 + 70 + Math.round(Math.cos(tick * 0.017 + i) * 3)) % H, 1, 1);
          }
        }
        b.globalCompositeOperation = "source-over";
      }
      if (xmas && !night && phase !== "dusk") treeAura(b, { x: PLAZA.x, y: PLAZA.y + 12 }, tick, false);

      {
        // 책걸이: 색종이가 쏟아지고 별이 터진다
        const pa = partyRef.current;
        if (pa) {
          const el = (performance.now() - pa.start) / 1000;
          if (el > 3 && el < 21) {
            const cols = ["#ff5a5a", "#ffd23f", "#6adf7a", "#5ab0ff", "#ff8ac2", "#ffffff"];
            for (let i = 0; i < 90; i++) {
              const sp0 = 28 + (i * 7) % 22, x = PLAZA.x - 110 + ((i * 53) % 220) + Math.round(Math.sin(el * 2 + i) * 5);
              const y = ((el * sp0 + i * 23) % (H + 20)) - 10;
              b.fillStyle = cols[i % cols.length];
              b.fillRect(Math.round(x), Math.round(y), 2, i % 3 === 0 ? 3 : 2);
            }
            const star = sp("fx-star", () => fxGrid("star")!);
            pa.members.forEach((id, k) => {
              const w = walkers.current.get(id);
              if (!w || !w.visible || w.moving) return;
              const u = ((el * 1.4 + k * 0.37) % 1), ang = k * 1.7;
              b.globalAlpha = Math.max(0, 1 - u);
              for (let j = 0; j < 3; j++) b.drawImage(star, Math.round(w.x + Math.cos(ang + j * 2.1) * (6 + u * 14) - 2), Math.round(w.y - AV_H - 2 - u * 10 + Math.sin(ang + j * 2.1) * 6));
              b.globalAlpha = 1;
            });
            // 폴짝 뛰며 책을 공중으로 던진다
            pa.members.forEach((id, k) => {
              const w = walkers.current.get(id);
              if (!w || !w.visible || w.moving) return;
              for (let n = 0; n < 2; n++) {
                const cyc = el * 0.8 + k * 0.29 + n * 0.5, u = cyc % 1, idx = Math.floor(cyc) + k + n * 3;
                const bx = w.x + (n ? 7 : -7) + Math.sin(idx) * 4 * u, by = w.y - AV_H * 0.55 - Math.sin(Math.PI * u) * 36;
                const bk = sp(`book${idx % BOOK_COLORS.length}`, () => flyingBookGrid(BOOK_COLORS[idx % BOOK_COLORS.length]));
                b.save(); b.translate(Math.round(bx), Math.round(by)); b.rotate(u * Math.PI * 4 * (n ? 1 : -1));
                b.drawImage(bk, -4, -3); b.restore();
              }
            });
          }
          // 현수막 대신 글씨만: 통통 튀는 "책걸이!"와 목표 이름
          if (el > 1.5 && el < 21) {
            const pop = Math.min(1, (el - 1.5) / 0.5), bounce = Math.round(Math.sin(tick * 0.25) * 2), ff = monFont ? "Galmuri11, sans-serif" : "sans-serif";
            b.save();
            b.textAlign = "center"; b.textBaseline = "middle"; b.lineJoin = "round";
            b.globalAlpha = pop;
            b.font = `${Math.round(22 * (0.6 + 0.4 * pop))}px ${ff}`;
            b.lineWidth = 4; b.strokeStyle = "#3a2a33"; b.strokeText("책걸이!", W / 2, 26 + bounce);
            b.fillStyle = Math.floor(tick / 6) % 2 ? "#ffe27a" : "#ffb3c8"; b.fillText("책걸이!", W / 2, 26 + bounce);
            b.font = `11px ${ff}`; b.lineWidth = 3;
            const label = pa.title.length > 24 ? `${pa.title.slice(0, 23)}…` : pa.title;
            b.strokeText(label, W / 2, 45); b.fillStyle = "#ffffff"; b.fillText(label, W / 2, 45);
            b.restore();
          }
        }
      }
      {
        // 소원구슬의 은은한 보랏빛 번짐
        b.globalCompositeOperation = "lighter";
        const gx = ORB_POS.x, gy = ORB_POS.y - ORB_H / 2 - 1, gr = b.createRadialGradient(gx, gy, 1, gx, gy, 20);
        const ga = night ? 0.5 : 0.22 + 0.06 * Math.sin(tick * 0.07);
        gr.addColorStop(0, `rgb(170 150 255 / ${ga})`);
        gr.addColorStop(1, "rgb(170 150 255 / 0)");
        b.fillStyle = gr;
        b.fillRect(gx - 20, gy - 20, 40, 40);
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
  }, [clock, truck, libraryStyle, monFont]);

  const bySlot = new Map(residents.map((r) => [r.slot, r]));
  const castleLib = libraryStyle === "castle" || (clock.xmas && libraryStyle === "classic");
  const libHit = castleLib ? pct(LIBRARY.x - CASTLE_W / 2, LIBRARY.y - CASTLE_H + 4, CASTLE_W, CASTLE_H - 4) : (libraryStyle === "bicheondang" ? pct(LIBRARY.x - BICHEON_W / 2, LIBRARY.y - BICHEON_H + 4, BICHEON_W, BICHEON_H - 4) : pct(LIBRARY.x - LIB_W / 2, LIBRARY.y - LIB_H + 4, LIB_W, LIB_H - 4));
  return (
    <div ref={wrapRef} className="scene relative w-full" style={{ aspectRatio: `${W} / ${H}` }} role="group" aria-label={`마을 지도 — ${SEASONS[clock.season].label}, ${PHASE_LABEL[clock.phase]}`}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden onClick={(e) => {
        if (!onWalk) return;
        const r = e.currentTarget.getBoundingClientRect();
        const p = nearestWalkable(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H);
        if (p) onWalk(p.x, p.y);
      }} />

      <button type="button" className="scene-hit" style={pct(PLAZA.x - PLAZA.rx, PLAZA.y - PLAZA.ry, PLAZA.rx * 2, PLAZA.ry * 2)} aria-label="마을 광장 — 눌러서 열기" onClick={() => onPlace("plaza")}>
      </button>
      <button type="button" className="scene-hit" style={libHit} aria-label="공동 도서관 — 눌러서 열기" onClick={() => onPlace("library")}>
      </button>

      <button type="button" className="scene-hit" style={pct(ORB_POS.x - 10, ORB_POS.y - ORB_H, 20, ORB_H + 1)} aria-label="소원구슬 — 눌러서 소원 빌기" onClick={() => onOrb?.()} />
      {truck && <button type="button" className="scene-hit" style={pct(TRUCK_POS.x - TRUCK_W / 2, TRUCK_POS.y - TRUCK_H + 3, TRUCK_W, TRUCK_H - 4)} aria-label={truck === "night" ? "새벽 야식 트럭 — 눌러서 메뉴 보기" : "아침 밥차 — 눌러서 메뉴 보기"} onClick={() => onTruck?.()} />}
      {monument && !monument.broken_at && canBreakMonument && <button type="button" className="scene-hit" style={pct(MON_POS.x - Math.floor(MON_W / 2), MON_POS.y - MON_H + 1, MON_W, MON_H - 2)} aria-label="비석" onClick={() => onBreakMonument?.()} />}
      <button ref={santaBtn} type="button" className="scene-hit" style={{ display: "none" }} aria-label="산타 할아버지 — 눌러서 선물 받기" onClick={() => onSanta?.()} />
      {boardNew > 0 && <span className="sr-only" role="status" aria-label={`게시판에 안 읽은 새 글 ${boardNew}개`}>게시판에 새 글이 있어요</span>}
      <button type="button" className="scene-hit" style={pct(BOARD.x - 17, BOARD.y - 33, 34, 34)} aria-label="마을 게시판 — 눌러서 소식 보기" onClick={() => onPlace("board")} />

      {houses.map((h) => {
        const r = bySlot.get(h.slot);
        const d = DESK_POS[h.slot];
        const label = !r ? `${h.slot + 1}번 연구실 앞 책상 — 비어 있음` : r.user_id === myId ? "내 책상 — 눌러서 밖에서 공부하기" : `${r.profile.display_name}의 책상 — 눌러서 프로필 보기`;
        return <button key={`desk-${h.slot}`} type="button" className="scene-hit" style={pct(d.x - 14, d.y - 20, 28, 22)} aria-label={label} disabled={!r} onClick={() => onDesk(h.slot)} />;
      })}

      {houses.map((h) => {
        const r = bySlot.get(h.slot) ?? null;
        const mine = h.owner_id === myId;
        const label = !r ? `${h.slot + 1}번 연구실 — 비어 있음` : mine ? "내 연구실 — 눌러서 들어가기" : `${labTitle(r.profile)} — ${STATUS_META[r.shown].label}. 눌러서 연구실 방문하기`;
        const pos = HOUSE_POS[h.slot];
        return (
          <button key={h.slot} type="button" className="scene-hit" style={pct(pos.x - 27, pos.y - HOUSE_H + 6, 54, HOUSE_H - 4)} aria-label={label} disabled={!r} onClick={() => onHouse(h.slot)}>
          </button>
        );
      })}

      {houses.map((h) => {
        const r = bySlot.get(h.slot);
        if (!r) return null;
        const sx = HOUSE_POS[h.slot].x - 20, sy = HOUSE_POS[h.slot].y + 12;
        return (
          <span key={`sign-${h.slot}`} className="scene-sign" aria-hidden style={{ left: `${(sx / W) * 100}%`, top: `${(sy / H) * 100}%` }}>
            <span className={`scene-sign-board ${r.user_id === myId ? "scene-sign-board-mine" : ""}`}>
              {r.profile.lab_name?.trim() ? (() => { const [l1, l2] = signLines(r.profile.lab_name); return <><span className="scene-sign-name">{l1}</span>{l2 && <span className="scene-sign-sub">{l2}</span>}</>; })() : <><span className="scene-sign-name">{r.profile.display_name}의</span><span className="scene-sign-sub">연구실</span></>}
            </span>
            <span className="scene-sign-post" />
          </span>
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
          {r.say && <span className={`scene-say ${r.user_id === myId ? "scene-say-mine" : ""}`}><span className="scene-say-text">{r.say}</span></span>}
          <span className={`scene-label scene-label-name ${r.user_id === myId ? "scene-label-mine" : ""}`} style={{ top: r.shown === "open" ? "128%" : "104%" }}>
            {r.profile.display_name}
          </span>
        </button>
      ))}
    </div>
  );
}
