import { disc, get, grid, outline, px, rect, type Grid } from "./core";
import { LIB_H, LIB_W } from "./village";

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
export function drawSnowfall(b: CanvasRenderingContext2D, tick: number, w: number, h: number, night: boolean) {
  for (let i = 0; i < 110; i++) {
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

/** 트리에서 번지는 오색 빛무리. 낮에도 은은하게, 밤에는 광장 전체를 물들인다 */
export function treeAura(b: CanvasRenderingContext2D, tree: { x: number; y: number }, tick: number, night: boolean) {
  const pulse = 0.88 + 0.12 * Math.sin(tick * 0.07);
  const a = (night ? 0.85 : 0.35) * pulse, cx = tree.x, cy = tree.y - 46;
  const g = b.createRadialGradient(cx, cy, 6, cx, cy, 82);
  g.addColorStop(0, `rgb(255 236 160 / ${a})`);
  g.addColorStop(0.45, `rgb(255 210 130 / ${a * 0.45})`);
  g.addColorStop(1, "rgb(255 190 120 / 0)");
  b.fillStyle = g;
  b.fillRect(cx - 82, cy - 82, 164, 164);
  const cols = ["255 90 90", "120 220 140", "130 180 255", "255 220 90"];
  for (let i = 0; i < 12; i++) {
    const ang = i * 2.4, r = 10 + (i % 4) * 9;
    const x = cx + Math.cos(ang) * r * 0.9, y = cy + 4 + Math.sin(ang) * r * 1.3 - 6;
    const tw = 0.5 + 0.5 * Math.sin(tick * 0.12 + i * 1.7);
    const gl = b.createRadialGradient(x, y, 0, x, y, 9);
    gl.addColorStop(0, `rgb(${cols[i % 4]} / ${(night ? 0.55 : 0.25) * tw})`);
    gl.addColorStop(1, `rgb(${cols[i % 4]} / 0)`);
    b.fillStyle = gl;
    b.fillRect(x - 9, y - 9, 18, 18);
  }
  // 트리 꼭대기 별에서 퍼지는 반짝임
  const sx = tree.x, sy = tree.y - 96, s = 0.6 + 0.4 * Math.sin(tick * 0.2);
  b.fillStyle = `rgb(255 250 200 / ${s})`;
  b.fillRect(sx - 1, sy - 6, 2, 12); b.fillRect(sx - 6, sy - 1, 12, 2);
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

/** 마법의 성 도서관 (고딕 탑 셋 + 뾰족 지붕). 크기·문 위치는 기존 도서관과 같다 */
export function castleGrid(lit: boolean): Grid {
  const g = grid(LIB_W, LIB_H);
  const st = "#b3adc4", stL = "#cfc9de", stD = "#8d86a6", roof = "#5b4a9e", roofL = "#8572cf", roofD = "#40337a", gold = "#ffd65c";
  const brick = (x0: number, y0: number, w: number, h: number) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const row = y - y0, off = (Math.floor(row / 4) % 2) * 4;
      let c = st;
      if (row % 4 === 3 || (x + off) % 8 === 0) c = stD;
      else if (row % 4 === 0 && (x + off) % 8 === 3) c = stL;
      px(g, x, y, c);
    }
  };
  const cone = (cx: number, top: number, base: number, half: number) => {
    for (let y = top; y <= base; y++) {
      const t = (y - top) / (base - top), hw = Math.max(0, Math.round(half * t));
      for (let x = cx - hw; x <= cx + hw; x++) {
        let c = roof;
        if (x <= cx - hw + 1) c = roofL; else if (x >= cx + hw - 1) c = roofD;
        else if ((y + Math.floor(x / 3)) % 5 === 0) c = roofD;
        px(g, x, y, c);
      }
    }
    rect(g, cx - half - 2, base, half * 2 + 5, 2, roofD);
  };
  const star = (x: number, y: number) => { px(g, x, y, gold); px(g, x, y - 1, gold); px(g, x, y + 1, gold); px(g, x - 1, y, gold); px(g, x + 1, y, gold); };
  const win = (x: number, y: number, w: number, h: number) => {   // 뾰족 아치 창
    rect(g, x, y + 2, w, h - 2, "#3a2a33");
    for (let i = 0; i < Math.ceil(w / 2) + 1; i++) { rect(g, x + i, y + 2 - Math.min(2, i < 2 ? 2 - i : 0), 1, 1, "#3a2a33"); }
    rect(g, x + 1, y + 2, w - 2, h - 3, lit ? "#ffe07a" : "#5f6a95");
    if (lit) rect(g, x + 1, y + 3, 1, Math.max(1, h - 6), "#fff4bf");
    rect(g, x + Math.floor(w / 2), y + 2, 1, h - 3, "#3a2a33");
  };
  // 가운데 본탑
  brick(34, 28, 36, 48);
  cone(52, 2, 28, 22);
  star(52, 1);
  rect(g, 33, 27, 38, 2, stL); rect(g, 33, 29, 38, 1, stD);
  win(42, 33, 6, 12); win(56, 33, 6, 12);
  disc(g, 51.5, 51, 5, 5, "#3a2a33"); disc(g, 51.5, 51, 3.4, 3.4, lit ? "#ffe07a" : "#5f6a95"); rect(g, 51, 47, 1, 8, "#3a2a33"); rect(g, 47, 51, 9, 1, "#3a2a33");
  // 양옆 탑
  for (const cx of [14, 90]) {
    brick(cx - 11, 40, 22, 36);
    cone(cx, 16, 40, 15);
    star(cx, 15);
    rect(g, cx - 12, 39, 24, 2, stL); rect(g, cx - 12, 41, 24, 1, stD);
    win(cx - 3, 46, 6, 14);
  }
  // 가운데 성벽 + 총안
  brick(24, 58, 56, 18);
  for (let x = 24; x < 80; x += 8) { rect(g, x, 54, 5, 4, st); rect(g, x, 54, 5, 1, stL); }
  // 문 (기존 도서관과 같은 위치)
  rect(g, 41, 56, 22, 20, "#3a2a33"); rect(g, 42, 53, 20, 3, "#3a2a33"); rect(g, 45, 51, 14, 2, "#3a2a33");
  rect(g, 42, 57, 20, 19, "#7a4a2c"); rect(g, 43, 54, 18, 3, "#7a4a2c"); rect(g, 46, 52, 12, 2, "#7a4a2c");
  rect(g, 51, 52, 2, 24, "#3a2a33");
  for (const y of [60, 68]) rect(g, 42, y, 20, 1, "#5a3a22");
  px(g, 49, 66, gold); px(g, 54, 66, gold);
  // 깃발
  rect(g, 52, 0, 1, 3, "#3a2a33");
  // 계단
  rect(g, 4, 76, 96, 3, "#cfc9de"); rect(g, 4, 78, 96, 1, stD);
  rect(g, 30, 79, 44, 3, "#e6e1f0"); rect(g, 30, 81, 44, 1, stD);
  return outline(g);
}
