import { get, px, rect, type Grid } from "./core";

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
