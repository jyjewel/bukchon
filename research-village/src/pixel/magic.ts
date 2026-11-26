import { disc, get, grid, outline, px, rect, type Grid } from "./core";

/** 크리스마스 시즌 "마법학교" 분위기: 지붕에 눈, 처마 전구, 둥둥 떠다니는 초 */

/** 지붕·건물 윗면에 소복이 쌓인 눈과 고드름을 얹는다 (원본을 바꾸지 않고 복사본 반환) */
export function snowCap(src: Grid, depth = 0.45, lights = true): Grid {
  const g: Grid = { w: src.w, h: src.h, d: src.d.slice() };
  const limit = Math.floor(src.h * depth);
  for (let x = 0; x < g.w; x++) {
    let top = -1;
    for (let y = 0; y < limit; y++) if (get(src, x, y)) { top = y; break; }
    if (top < 0) continue;
    const thick = 2 + ((x * 7) % 3 === 0 ? 1 : 0);
    for (let k = 1; k <= thick; k++) if (get(src, x, top + k)) px(g, x, top + k, k === thick ? "#c9dcea" : "#ffffff");
    px(g, x, top, "#6f8fa8");
    if (x % 5 === 2 && get(src, x, top + thick + 1)) px(g, x, top + thick + 1, "#e6f1f8");
  }
  if (lights) {
    const cols = ["#ffd65c", "#9fd0ff", "#ffb3d9", "#b9a2ff"];
    let n = 0;
    for (let x = 3; x < g.w - 3; x += 6) {
      let top = -1;
      for (let y = 0; y < limit; y++) if (get(src, x, y)) { top = y; break; }
      if (top >= 0) px(g, x, top + 4, cols[n++ % 4]);
    }
  }
  return g;
}

/** 공중에 뜬 초 (5x11). 불꽃은 따로 그린다 */
export function candleGrid(): Grid {
  const g: Grid = { w: 5, h: 11, d: new Array(55).fill(null) };
  rect(g, 1, 4, 3, 7, "#fff3d6");
  rect(g, 1, 4, 1, 7, "#ffffff");
  rect(g, 3, 4, 1, 7, "#e7cf9f");
  px(g, 2, 10, "#e7cf9f");
  px(g, 1, 3, "#3a2a33"); px(g, 2, 3, "#3a2a33"); px(g, 3, 3, "#3a2a33");
  px(g, 0, 5, "#3a2a33"); px(g, 4, 5, "#3a2a33"); px(g, 0, 8, "#3a2a33"); px(g, 4, 8, "#3a2a33");
  px(g, 2, 11 - 1, "#e7cf9f");
  return g;
}

/** 초가 떠 있는 자리(바닥 좌표가 아니라 화면 좌표) */
export const CANDLES: { x: number; y: number; p: number }[] = [
  { x: 150, y: 52, p: 0 }, { x: 172, y: 40, p: 1.4 }, { x: 196, y: 56, p: 2.7 }, { x: 220, y: 36, p: 4 },
  { x: 244, y: 56, p: 5.1 }, { x: 268, y: 42, p: 0.8 }, { x: 290, y: 54, p: 2.2 },
  { x: 120, y: 140, p: 3.3 }, { x: 312, y: 140, p: 4.6 }, { x: 178, y: 226, p: 1.1 }, { x: 254, y: 226, p: 3.9 },
];

export function drawCandle(b: CanvasRenderingContext2D, sprite: HTMLCanvasElement, c: { x: number; y: number; p: number }, tick: number) {
  const bob = Math.round(Math.sin(tick * 0.04 + c.p) * 2);
  const x = c.x, y = c.y + bob;
  b.drawImage(sprite, x - 2, y);
  const f = Math.floor(tick / 5 + c.p * 3) % 3;
  b.fillStyle = "#ffe27a"; b.fillRect(x - 1, y - 3 - (f === 1 ? 1 : 0), 2, 3);
  b.fillStyle = "#fff8d6"; b.fillRect(x - 1, y - 2, 1, 2);
  b.fillStyle = "#ff9a3c"; b.fillRect(x, y - 4 - (f === 1 ? 1 : 0), 1, 1);
}

export function candleGlow(b: CanvasRenderingContext2D, c: { x: number; y: number; p: number }, tick: number, a: number) {
  const bob = Math.round(Math.sin(tick * 0.04 + c.p) * 2);
  const x = c.x, y = c.y + bob - 2, rad = 16;
  const gr = b.createRadialGradient(x, y, 1, x, y, rad);
  gr.addColorStop(0, `rgb(255 220 130 / ${a})`);
  gr.addColorStop(1, "rgb(255 220 130 / 0)");
  b.fillStyle = gr;
  b.fillRect(x - rad, y - rad, rad * 2, rad * 2);
}

/** 소복소복 내리는 눈. 매 프레임 tick 으로 위치를 계산한다 (reduced motion 이면 호출하지 않는다) */
export function drawSnowfall(b: CanvasRenderingContext2D, tick: number, w: number, h: number, night: boolean, level: 1 | 2 | 3 = 2) {
  const n = level === 1 ? 45 : level === 2 ? 90 : 140;
  for (let i = 0; i < n; i++) {
    const speed = 0.25 + ((i * 37) % 10) / 22;
    const x = ((i * 61) % w) + Math.sin(tick * 0.02 + i) * 4;
    const y = (((i * 83) % h) + tick * speed) % h;
    const big = i % 3 === 0;
    b.fillStyle = night ? "rgb(255 255 255 / 0.9)" : "rgb(255 255 255 / 0.95)";
    b.fillRect(Math.round((x + w) % w), Math.round(y), big ? 3 : 2, big ? 3 : 2);
    if (!night) { b.fillStyle = "rgb(150 185 210 / 0.35)"; b.fillRect(Math.round((x + w) % w) + 1, Math.round(y) + 1, 1, 1); }
  }
}

/** 편지를 물고 날아가는 올빼미: 약 25초마다 한 마리가 지도를 가로지른다 */
export function drawOwl(b: CanvasRenderingContext2D, tick: number, w: number) {
  const period = 1500, span = 520, t = (tick + 1450) % period;
  if (t > span) return;
  const k = Math.floor((tick + 1450) / period);
  const dir = k % 2 === 0 ? 1 : -1;
  const p = t / span;
  const x = Math.round(dir === 1 ? -14 + p * (w + 28) : w + 14 - p * (w + 28));
  const y = Math.round((k % 3 === 0 ? 40 : k % 3 === 1 ? 84 : 120) + Math.sin(p * Math.PI * 4) * 6);
  const up = Math.floor(tick / 6) % 2 === 0;
  const body = "#b98f62", light = "#f1dcb4", dark = "#3a2a33";
  b.save();
  b.translate(x, y);
  b.scale(dir * 1.6, 1.6);
  b.fillStyle = dark; b.fillRect(-4, -3, 9, 7);
  b.fillStyle = body; b.fillRect(-3, -2, 7, 5);
  b.fillStyle = light; b.fillRect(0, 0, 3, 3);
  b.fillStyle = "#ffe27a"; b.fillRect(2, -2, 1, 1); b.fillStyle = "#ff9a3c"; b.fillRect(5, -1, 2, 1);
  b.fillStyle = dark; b.fillRect(-4, -5, 2, 2); b.fillRect(2, -5, 2, 2);
  b.fillStyle = body;
  if (up) { b.fillRect(-7, -9, 5, 7); b.fillStyle = dark; b.fillRect(-8, -10, 1, 8); }
  else { b.fillRect(-7, 0, 5, 6); b.fillStyle = dark; b.fillRect(-8, 0, 1, 7); }
  b.fillStyle = "#fff"; b.fillRect(-6, 6, 4, 3); b.fillStyle = "#e55"; b.fillRect(-5, 7, 1, 1);
  b.restore();
}

/** 트리에서 번지는 오색 빛무리. 흰빛은 줄이고 빨강·초록·파랑·노랑 불빛이 알록달록하게 반짝인다 */
export function treeAura(b: CanvasRenderingContext2D, tree: { x: number; y: number }, tick: number, night: boolean) {
  const pulse = 0.9 + 0.1 * Math.sin(tick * 0.07);
  const cx = tree.x, cy = tree.y - 46, k = night ? 1 : 0.45;
  // 바닥 빛: 흰색이 아니라 따뜻한 분홍빛
  const g = b.createRadialGradient(cx, cy, 6, cx, cy, 74);
  g.addColorStop(0, `rgb(255 170 150 / ${0.2 * k * pulse})`);
  g.addColorStop(0.5, `rgb(255 140 190 / ${0.14 * k * pulse})`);
  g.addColorStop(1, "rgb(255 140 190 / 0)");
  b.fillStyle = g;
  b.fillRect(cx - 74, cy - 74, 148, 148);
  const cols = ["255 70 70", "70 220 110", "80 150 255", "255 200 50", "255 110 200", "170 110 255"];
  for (let i = 0; i < 22; i++) {
    const ang = i * 2.4, r = 14 + (i % 5) * 9;
    const x = cx + Math.cos(ang) * r * 0.85, y = cy + 2 + Math.sin(ang) * r * 1.35 - 6;
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(tick * 0.1 + i * 1.9));
    const c = cols[i % cols.length], rad = 11;
    const gl = b.createRadialGradient(x, y, 0, x, y, rad);
    gl.addColorStop(0, `rgb(${c} / ${0.42 * k * tw})`);
    gl.addColorStop(1, `rgb(${c} / 0)`);
    b.fillStyle = gl;
    b.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // 꼭대기 별: 금빛으로 반짝
  const sx = tree.x, sy = tree.y - 96, s = 0.5 + 0.5 * Math.sin(tick * 0.2);
  b.fillStyle = `rgb(255 214 90 / ${0.5 + 0.5 * s})`;
  b.fillRect(sx - 1, sy - 5, 2, 10); b.fillRect(sx - 5, sy - 1, 10, 2);
}

/** 도서관 처마에 반짝이는 전구줄과 문 위 리스, 창가 불빛 */
export function drawLibraryXmas(b: CanvasRenderingContext2D, lib: { x: number; y: number }, tick: number, night: boolean, mode: "deco" | "glow") {
  const cols = ["#ff6b6b", "#ffd65c", "#7fd6a0", "#8fb8ff"];
  for (let i = 0; i < 0; i++) {
    const x = lib.x - 48 + i * 6, y = lib.y - 51 + (Math.abs(i - 8) > 5 ? 0 : 0) + Math.round(Math.sin(i * 0.9) * 1.2);
    const on = (Math.floor(tick / 14) + i) % 3 !== 0;
    if (mode === "deco") { b.fillStyle = "#3a2a33"; b.fillRect(x, y - 1, 1, 1); b.fillStyle = on ? cols[i % 4] : "#8a7a6a"; b.fillRect(x, y, 2, 2); }
    if (mode === "glow" && on && night) {
      const g = b.createRadialGradient(x + 1, y + 1, 0, x + 1, y + 1, 7);
      g.addColorStop(0, "rgb(255 230 150 / 0.45)"); g.addColorStop(1, "rgb(255 230 150 / 0)");
      b.fillStyle = g; b.fillRect(x - 6, y - 6, 14, 14);
    }
  }
  if (mode === "deco") {
  // 문 위 리스
  const wx = lib.x + 2, wy = lib.y - 33;
  b.fillStyle = "#3a2a33"; b.fillRect(wx - 5, wy - 1, 11, 9);
  b.fillStyle = "#2f8f4a"; b.fillRect(wx - 4, wy, 9, 7);
  b.fillStyle = "#4fb868"; b.fillRect(wx - 3, wy + 1, 3, 2); b.fillRect(wx + 1, wy + 4, 3, 2);
  b.fillStyle = "#3a2a33"; b.fillRect(wx - 2, wy + 2, 5, 3);
  b.fillStyle = "#e84c4c"; b.fillRect(wx - 1, wy + 6, 3, 2); b.fillRect(wx - 3, wy + 3, 1, 1); b.fillRect(wx + 3, wy + 1, 1, 1);
  }
  if (mode === "glow" && night) {
    const g = b.createRadialGradient(lib.x + 2, lib.y - 6, 4, lib.x + 2, lib.y - 6, 44);
    g.addColorStop(0, "rgb(255 220 140 / 0.35)"); g.addColorStop(1, "rgb(255 220 140 / 0)");
    b.fillStyle = g; b.fillRect(lib.x - 42, lib.y - 50, 88, 88);
  }
}

export const CASTLE_W = 124;
export const CASTLE_H = 96;

/** 마법의 성 도서관: 높낮이가 다른 뾰족 탑 여럿, 긴 대강당 벽, 문루. 바닥 가운데는 (62, 94) */
export function castleGrid(lit: boolean): Grid {
  const g = grid(CASTLE_W, CASTLE_H);
  const INKC = "#3a2a33", gold = "#ffd65c";
  const pal = {
    front: { st: "#b8b2c9", stL: "#d4cee4", stD: "#8f88a9", roof: "#5b4a9e", roofL: "#8572cf", roofD: "#40337a" },
    back: { st: "#9d97b6", stL: "#b5afcb", stD: "#7a7494", roof: "#4a3c88", roofL: "#6c5cb5", roofD: "#352a6a" },
  };
  type P = typeof pal.front;
  const brick = (c: P, x0: number, y0: number, w: number, h: number) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const row = y - y0, off = (Math.floor(row / 4) % 2) * 4;
      let col = c.st;
      if (row % 4 === 3 || (x + off) % 8 === 0) col = c.stD;
      else if (row % 4 === 0 && (x + off) % 8 === 3) col = c.stL;
      if (x === x0) col = c.stL; else if (x === x0 + w - 1) col = c.stD;
      px(g, x, y, col);
    }
  };
  const cone = (c: P, cx: number, top: number, base: number, half: number) => {
    for (let y = top; y <= base; y++) {
      const t = (y - top) / Math.max(1, base - top), hw = Math.max(0, Math.round(half * t * (0.55 + 0.45 * t)));
      for (let x = cx - hw; x <= cx + hw; x++) {
        let col = c.roof;
        if (x <= cx - hw + 1) col = c.roofL; else if (x >= cx + hw - 1) col = c.roofD;
        else if ((y + Math.floor(x / 3)) % 5 === 0) col = c.roofD;
        px(g, x, y, col);
      }
    }
    rect(g, cx - half - 1, base, half * 2 + 3, 2, c.roofD);
  };
  const star = (x: number, y: number) => { px(g, x, y, gold); px(g, x, y - 1, gold); px(g, x - 1, y, gold); px(g, x + 1, y, gold); px(g, x, y + 1, gold); };
  const flag = (x: number, y: number, col: string) => { rect(g, x, y - 5, 1, 6, INKC); rect(g, x + 1, y - 5, 4, 2, col); px(g, x + 5, y - 4, col); };
  const win = (x: number, y: number, w: number, h: number) => {
    rect(g, x, y + 2, w, h - 2, INKC);
    rect(g, x + 1, y, w - 2, 2, INKC); rect(g, x + 2, y - 1, Math.max(1, w - 4), 1, INKC);
    rect(g, x + 1, y + 1, w - 2, h - 1, lit ? "#ffe07a" : "#5f6a95");
    if (lit) rect(g, x + 1, y + 3, 1, Math.max(1, h - 6), "#fff4bf");
    rect(g, x + Math.floor(w / 2), y + 1, 1, h - 1, INKC);
    if (h > 12) rect(g, x + 1, y + Math.floor(h / 2), w - 2, 1, INKC);
  };
  const tower = (c: P, cx: number, w: number, tip: number, bodyTop: number, bottom: number, wins: number[]) => {
    const x0 = cx - Math.floor(w / 2);
    brick(c, x0, bodyTop, w, bottom - bodyTop);
    rect(g, x0 - 1, bodyTop - 1, w + 2, 2, c.stL); rect(g, x0 - 1, bodyTop + 1, w + 2, 1, c.stD);
    cone(c, cx, tip, bodyTop - 1, Math.floor(w / 2) + 3);
    for (const wy of wins) win(cx - 2, wy, 5, 10);
  };

  // 뒤줄(어둡게): 먼 탑들
  tower(pal.back, 18, 14, 22, 40, 70, [46]);
  tower(pal.back, 106, 14, 18, 38, 70, [44]);
  tower(pal.back, 38, 10, 8, 30, 70, [36]);
  tower(pal.back, 86, 10, 12, 32, 70, [38]);
  tower(pal.back, 62, 20, -2, 20, 70, [28]);
  star(62, -1 + 1); star(38, 8); star(86, 12); star(18, 22); star(106, 18);
  flag(62, 3, "#e0605a");
  // 중앙 탑의 시계
  disc(g, 62, 35, 5, 5, INKC); disc(g, 62, 35, 3.6, 3.6, "#fff4d6"); rect(g, 62, 32, 1, 4, INKC); rect(g, 62, 35, 3, 1, INKC);

  const f = pal.front;
  // 대강당 긴 벽 + 총안
  brick(f, 12, 62, 100, 28);
  for (let x = 12; x < 112; x += 8) { rect(g, x, 58, 5, 4, f.st); rect(g, x, 58, 5, 1, f.stL); rect(g, x + 4, 58, 1, 4, f.stD); }
  rect(g, 12, 62, 100, 1, f.stL);
  // 부축 기둥 + 높은 창
  for (const bx of [22, 40, 84, 102]) {
    rect(g, bx - 2, 62, 4, 28, f.stL); rect(g, bx + 1, 62, 1, 28, f.stD);
    px(g, bx - 1, 61, f.stL); px(g, bx, 61, f.stL);
  }
  for (const wx of [27, 33, 89, 95]) win(wx - 2, 66, 5, 14);
  // 문루(가운데) + 작은 첨탑 둘
  brick(f, 46, 44, 32, 46);
  rect(g, 45, 43, 34, 2, f.stL); rect(g, 45, 45, 34, 1, f.stD);
  for (let x = 46; x < 78; x += 8) { rect(g, x, 40, 5, 4, f.st); rect(g, x, 40, 5, 1, f.stL); }
  tower(f, 50, 8, 28, 40, 60, []); tower(f, 74, 8, 28, 40, 60, []);
  star(50, 27); star(74, 27);
  win(54, 48, 5, 10); win(65, 48, 5, 10);
  disc(g, 61.5, 54, 0.1, 0.1, INKC);
  // 문 (기존 도서관과 같은 위치·크기)
  rect(g, 50, 66, 24, 24, INKC); rect(g, 51, 63, 22, 3, INKC); rect(g, 54, 61, 14, 2, INKC);
  rect(g, 51, 67, 22, 23, "#7a4a2c"); rect(g, 52, 64, 20, 3, "#7a4a2c"); rect(g, 55, 62, 12, 2, "#7a4a2c");
  rect(g, 61, 62, 2, 28, INKC);
  for (const y of [70, 78]) rect(g, 51, y, 22, 1, "#5a3a22");
  px(g, 59, 76, gold); px(g, 64, 76, gold);
  // 앞쪽 모서리 둥근 탑
  tower(f, 10, 16, 40, 56, 90, [62]); tower(f, 114, 16, 36, 54, 90, [60]);
  star(10, 40); star(114, 36);
  flag(114, 37, "#5aa0e0");
  // 계단
  rect(g, 8, 90, 108, 3, "#cfc9de"); rect(g, 8, 92, 108, 1, "#8f88a9");
  rect(g, 40, 93, 44, 1, "#e6e1f0");
  return outline(g);
}

/** 오늘 눈이 오는 정도(0 = 안 옴, 1 = 조금, 2 = 보통, 3 = 펑펑). 한국 날짜로 정해서 모두에게 같다.
 *  겨울(12~2월)과 크리스마스 기간(11/25~)에만 오고, 날마다 무작위로 오는 날과 안 오는 날이 갈린다. 12/24·25는 늘 온다. */
export function snowToday(d = new Date()): 0 | 1 | 2 | 3 {
  const k = new Date(d.getTime() + 9 * 3600_000);
  const y = k.getUTCFullYear(), m = k.getUTCMonth() + 1, day = k.getUTCDate();
  const winter = m === 12 || m <= 2 || (m === 11 && day >= 25);
  if (!winter) return 0;
  if (m === 12 && (day === 24 || day === 25)) return 3;
  let x = Math.imul(y * 372 + m * 31 + day, 2654435761) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 2246822519) >>> 0; x = (x ^ (x >>> 13)) >>> 0;
  const r = (x % 1000) / 1000;
  return r < 0.5 ? 0 : r < 0.72 ? 1 : r < 0.9 ? 2 : 3;
}

/** 바닥에 쌓인 눈의 정도(0~1). 눈 온 날 아침(한국 시간 8시까지)에만 쌓여 있고, 11시까지 녹아 낮에는 없다.
 *  겨울(11/25~2월)이 아니면 1(해당 없음). 12/24·25는 하루 종일 가득 쌓여 있다. */
export function snowCover(d = new Date()): number {
  const k = new Date(d.getTime() + 9 * 3600_000);
  const m = k.getUTCMonth() + 1, day = k.getUTCDate();
  const winter = m === 12 || m <= 2 || (m === 11 && day >= 25);
  if (!winter) return 1;
  if (m === 12 && (day === 24 || day === 25)) return 1;
  const lv = snowToday(d);
  if (lv === 0) return 0;
  const hr = k.getUTCHours() + k.getUTCMinutes() / 60;
  const peak = lv === 1 ? 0.5 : lv === 2 ? 0.8 : 1;
  if (hr < 8) return peak;
  if (hr >= 11) return 0;
  return peak * (11 - hr) / 3;
}
