import { grid, outline, px, rect, type Grid } from "./core";

/** 크리스마스 한 달 전(11월 25일)부터 크리스마스(12월 25일)까지 광장의 분수가 커다란 트리로 바뀐다 */
export function isChristmasSeason(d = new Date()): boolean {
  const m = d.getMonth() + 1, day = d.getDate();
  return (m === 11 && day >= 25) || (m === 12 && day <= 25);
}

export const TREE_W = 70;
export const TREE_H = 100;
/** 트리 바닥 가운데는 (35, 98) */
export const TREE_BASE = { x: 35, y: 98 };
const CX = 35, K = 1.32;

// 장식 공 (원래 52×76 도안 좌표를 키워서 놓는다)
const ORNS: [number, number, string][] = [
  [26, 22, "#ff5a5a"], [20, 31, "#ffd23f"], [33, 33, "#5ab0ff"], [26, 42, "#ff8ac2"], [15, 47, "#ff5a5a"], [37, 47, "#ffd23f"],
  [22, 53, "#5ab0ff"], [31, 56, "#ff5a5a"], [12, 60, "#ffd23f"], [40, 61, "#ff8ac2"], [26, 63, "#5ab0ff"], [19, 66, "#ff8ac2"], [34, 67, "#ffd23f"],
  [26, 30, "#5ab0ff"], [16, 56, "#ff5a5a"], [36, 40, "#ff5a5a"], [27, 49, "#ffd23f"],
];
const sx = (x: number) => Math.round(CX + (x - 26) * K), sy = (y: number) => Math.round(y * K);

/** 거대한 크리스마스 트리. frame 은 별과 장식이 반짝이는 장면(0~3) */
export function christmasTreeGrid(frame: number): Grid {
  const g = grid(TREE_W, TREE_H);
  const G1 = "#1f6b3a", G2 = "#2e8a4c", G3 = "#46a860";
  const tier = (top: number, bottom: number, halfTop: number, halfBottom: number) => {
    const t0 = sy(top), t1 = sy(bottom);
    for (let y = t0; y <= t1; y++) {
      const t = (y - t0) / Math.max(1, t1 - t0), half = Math.round((halfTop + (halfBottom - halfTop) * t) * K);
      rect(g, CX - half, y, half * 2 + 1, 1, G2);
      rect(g, CX - half, y, 2, 1, G1); rect(g, CX + half - 1, y, 2, 1, G1);
      if ((y - t0) % 4 === 1) rect(g, CX - half + 2, y, half * 2 - 3, 1, G3);
    }
    const hb = Math.round(halfBottom * K);
    for (let x = CX - hb; x <= CX + hb; x += 4) { px(g, x, t1 + 1, G1); px(g, x + 1, t1 + 1, G1); }
  };
  tier(10, 32, 2, 12);
  tier(26, 50, 6, 17);
  tier(44, 68, 9, 23);
  // 줄기
  rect(g, CX - 4, sy(69), 9, 6, "#7a4a2a"); rect(g, CX - 4, sy(69), 2, 6, "#5a3420"); rect(g, CX - 5, sy(69) + 6, 11, 1, "#5a3420");
  // 눈 쌓인 가지 끝
  for (const [x, y] of [[12, 32], [41, 32], [8, 50], [45, 50], [3, 68], [49, 68]] as [number, number][]) rect(g, sx(x) - 2, sy(y), 4, 1, "#f4f9ff");
  // 금빛 띠
  const garland = (y: number, half: number) => { for (let x = CX - Math.round(half * K); x <= CX + Math.round(half * K); x++) px(g, x, sy(y) + Math.round(Math.sin((x - CX) * 0.8) * 1.8), "#ffe27a"); };
  garland(36, 13); garland(55, 20);
  // 별
  const star = frame % 2 === 0 ? "#fff6a0" : "#ffe34a";
  rect(g, CX - 1, 2, 3, 11, star); rect(g, CX - 5, 6, 11, 3, star); rect(g, CX - 3, 4, 7, 7, star); px(g, CX, 1, "#fffbe0"); px(g, CX, 0, "#fffbe0");
  // 반짝이는 장식 공
  ORNS.forEach(([x, y, c], i) => {
    const lit = (i + frame) % 3 === 0, ox = sx(x), oy = sy(y);
    rect(g, ox - 1, oy - 1, 3, 3, c); px(g, ox - 1, oy - 1, lit ? "#ffffff" : "#ffffffaa"); if (lit) { px(g, ox, oy - 2, "#ffffff"); px(g, ox + 2, oy, "#ffffff"); }
  });
  // 선물 상자
  rect(g, 6, 88, 11, 8, "#e0505a"); rect(g, 11, 88, 1, 8, "#ffe27a"); rect(g, 6, 91, 11, 1, "#ffe27a"); rect(g, 9, 85, 5, 3, "#ffe27a");
  rect(g, 52, 91, 10, 5, "#5aa0e8"); rect(g, 56, 91, 1, 5, "#fff6d0"); rect(g, 52, 93, 10, 1, "#fff6d0"); rect(g, 54, 89, 4, 2, "#fff6d0");
  rect(g, 56, 86, 8, 5, "#8ad06a"); rect(g, 59, 86, 1, 5, "#ffffff"); rect(g, 56, 88, 8, 1, "#ffffff");
  return outline(g, "#12301f");
}

const BULBS = ["#ff5a5a", "#ffd23f", "#6adf7a", "#5ab0ff"];

/** 트리에서 가로등까지 이어진 반짝이 전구 줄. 전구가 차례로 반짝인다 */
export function drawLightStrings(
  b: CanvasRenderingContext2D, tick: number,
  tree: { x: number; y: number }, lamps: { x: number; y: number }[],
) {
  lamps.forEach((l, li) => {
    const sx = tree.x + (l.x < tree.x ? -17 : 17), sy = tree.y - (l.y < tree.y ? 48 : 16);
    const ex = l.x, ey = l.y - 24;
    const n = Math.max(6, Math.round(Math.hypot(ex - sx, ey - sy) / 7));
    // 전선
    b.fillStyle = "#3a2a33";
    const pts: [number, number][] = [];
    for (let i = 0; i <= n * 3; i++) {
      const u = i / (n * 3), x = sx + (ex - sx) * u, y = sy + (ey - sy) * u + Math.sin(Math.PI * u) * 9;
      pts.push([Math.round(x), Math.round(y)]);
      b.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    // 전구
    for (let i = 1; i < n; i++) {
      const [x, y] = pts[Math.round((i / n) * (pts.length - 1))];
      const on = (Math.floor(tick / 6) + i + li) % 3 !== 0;
      const c = BULBS[(i + li) % BULBS.length];
      b.fillStyle = on ? c : "#5a5568";
      b.fillRect(x, y + 1, 2, 2);
      if (on) { b.fillStyle = "#ffffffcc"; b.fillRect(x, y + 1, 1, 1); }
    }
    // 가로등 머리에 두른 전구
    for (let i = 0; i < 3; i++) {
      const on = (Math.floor(tick / 6) + i + li) % 2 === 0;
      b.fillStyle = on ? BULBS[(i + li + 1) % 4] : "#5a5568";
      b.fillRect(l.x - 4 + i * 4, l.y - 20 + (i % 2), 2, 2);
    }
  });
}

/** 밤에 트리와 전구가 번지는 빛 */
export function drawTreeGlow(b: CanvasRenderingContext2D, tree: { x: number; y: number }, tick: number, alpha: number) {
  const pulse = 0.9 + 0.1 * Math.sin(tick * 0.08);
  const g = b.createRadialGradient(tree.x, tree.y - 48, 4, tree.x, tree.y - 48, 56);
  g.addColorStop(0, `rgb(255 232 150 / ${alpha * 0.55 * pulse})`);
  g.addColorStop(1, "rgb(255 232 150 / 0)");
  b.fillStyle = g;
  b.fillRect(tree.x - 56, tree.y - 104, 112, 112);
}
