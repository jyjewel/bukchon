/** 작은 픽셀 그리드 위에 도트를 찍고 캔버스로 굽는 도구 모음 */
export const INK = "#3a2a33";

export interface Grid {
  w: number;
  h: number;
  d: (string | null)[];
}

export function grid(w: number, h: number): Grid {
  return { w, h, d: new Array(w * h).fill(null) };
}
export function get(g: Grid, x: number, y: number): string | null {
  return x < 0 || y < 0 || x >= g.w || y >= g.h ? null : g.d[y * g.w + x];
}
export function px(g: Grid, x: number, y: number, c: string | null) {
  x = Math.round(x);
  y = Math.round(y);
  if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.d[y * g.w + x] = c;
}
export function rect(g: Grid, x: number, y: number, w: number, h: number, c: string | null) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(g, x + i, y + j, c);
}
/** 타원 채우기 */
export function disc(g: Grid, cx: number, cy: number, rx: number, ry: number, c: string | ((x: number, y: number) => string | null | undefined)) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / (rx + 0.35), dy = (y - cy) / (ry + 0.35);
      if (dx * dx + dy * dy <= 1) {
        const col = typeof c === "function" ? c(x, y) : c;
        if (col !== undefined) px(g, x, y, col);
      }
    }
  }
}
/** 칠해진 픽셀 둘레에 1px 외곽선을 두른다 */
export function outline(g: Grid, c: string = INK): Grid {
  const add: number[] = [];
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      if (g.d[y * g.w + x]) continue;
      if (get(g, x - 1, y) || get(g, x + 1, y) || get(g, x, y - 1) || get(g, x, y + 1)) add.push(y * g.w + x);
    }
  }
  for (const i of add) g.d[i] = c;
  return g;
}
export function stamp(dst: Grid, src: Grid, ox: number, oy: number) {
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const c = src.d[y * src.w + x];
    if (c) px(dst, ox + x, oy + y, c);
  }
}

export function bake(g: Grid): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = g.w;
  c.height = g.h;
  paint(c.getContext("2d")!, g, 0, 0);
  return c;
}
export function paint(ctx: CanvasRenderingContext2D, g: Grid, ox: number, oy: number) {
  let last = "";
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const c = g.d[y * g.w + x];
    if (!c) continue;
    if (c !== last) ctx.fillStyle = last = c;
    ctx.fillRect(ox + x, oy + y, 1, 1);
  }
}

export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount))).toString(16).padStart(2, "0");
  return `#${ch(n >> 16)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}
/** 회색조로 바꾸고 살짝 밝힌다 (빈 집용) */
export function fade(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const l = Math.round(((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.5 + (n & 255) * 0.2) * 0.55 + 105);
  const h = Math.min(255, l).toString(16).padStart(2, "0");
  return `#${h}${h}${Math.max(0, Math.min(255, l - 12)).toString(16).padStart(2, "0")}`;
}

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** 문자열 도안 → 그리드. 팔레트에 없는 글자(.)는 투명 */
export function fromRows(rows: string[], pal: Record<string, string>): Grid {
  const g = grid(rows[0].length, rows.length);
  rows.forEach((r, y) => [...r].forEach((ch, x) => pal[ch] && px(g, x, y, pal[ch])));
  return g;
}
