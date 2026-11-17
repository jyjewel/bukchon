import { disc, grid, hash, outline, px, rect, type Grid } from "./core";

/** 크리스마스 한 달 전(11월 25일)부터 크리스마스(12월 25일)까지 광장의 분수가 커다란 트리로 바뀐다 */
export function isChristmasSeason(d = new Date()): boolean {
  const m = d.getMonth() + 1, day = d.getDate();
  return (m === 11 && day >= 25) || (m === 12 && day <= 25);
}

export const TREE_W = 70;
export const TREE_H = 100;
/** 트리 바닥 가운데는 (35, 98) */
export const TREE_BASE = { x: 35, y: 98 };

const CX2 = 35;

/** 거대한 크리스마스 트리. frame 은 별·전구·장식이 반짝이는 장면(0~3) */
export function christmasTreeGrid(frame: number): Grid {
  const g = grid(TREE_W, TREE_H);
  const L0 = "#0f4a2a", L1 = "#17683a", L2 = "#22894a", L3 = "#37a85a", L4 = "#63cc7a";
  // 잎이 풍성하게: 단마다 가장자리가 물결치고, 바늘잎 무늬와 늘어진 가지 끝이 보인다
  const tier = (top: number, bottom: number, halfTop: number, halfBottom: number, seed: number) => {
    for (let y = top; y <= bottom; y++) {
      const t = (y - top) / Math.max(1, bottom - top);
      const half = Math.round(halfTop + (halfBottom - halfTop) * t + Math.sin(y * 1.3 + seed) * 1.6);
      for (let x = CX2 - half; x <= CX2 + half; x++) {
        const h = hash(x + seed * 7, y);
        const edge = Math.min(x - (CX2 - half), CX2 + half - x);
        let c = L2;
        if (edge < 2) c = L0;
        else if (h % 7 === 0) c = L1;
        else if (h % 5 === 0) c = L3;
        else if (((x + y * 2) % 6 === 0) && edge > 2) c = L1;
        // 왼쪽 위에서 빛이 비치는 느낌
        if (c === L2 && x < CX2 - half * 0.25 && h % 3 === 0) c = L3;
        if (c === L3 && x < CX2 - half * 0.5 && h % 4 === 0) c = L4;
        px(g, x, y, c);
      }
    }
    // 아래로 늘어진 가지 끝(둥글게 겹친 잎 뭉치)
    const hb = Math.round(halfBottom + 1.5);
    for (let x = CX2 - hb; x <= CX2 + hb; x += 5) {
      disc(g, x + 1.5, bottom + 1, 3.4, 2.6, L1); disc(g, x + 1.5, bottom, 3, 2.3, L2); px(g, x, bottom - 1, L3); px(g, x + 1, bottom - 1, L4);
      px(g, x + 3, bottom, L3);
    }
  };
  tier(9, 33, 2, 13, 1);
  tier(27, 52, 6, 19, 2);
  tier(45, 70, 10, 26, 3);
  // 줄기
  rect(g, CX2 - 4, 72, 9, 6, "#7a4a2a"); rect(g, CX2 - 4, 72, 2, 6, "#5a3420"); rect(g, CX2 - 5, 78, 11, 1, "#5a3420");
  // 눈 덮인 가지 끝
  for (const [x, y] of [[27, 33], [43, 33], [21, 52], [49, 52], [12, 70], [58, 70], [35, 12], [30, 28], [40, 28]] as [number, number][]) { rect(g, x - 2, y, 5, 1, "#f4f9ff"); px(g, x - 1, y - 1, "#ffffff"); px(g, x + 1, y - 1, "#e6f1ff"); }
  // 꼬마전구: 트리 안쪽에서 차례로 반짝인다
  const LB = ["#ff5a5a", "#ffe34a", "#6af07a", "#5ab8ff", "#ff9ae0"];
  for (let i = 0; i < 38; i++) {
    const y = 12 + ((i * 53) % 62), maxHalf = y < 33 ? 2 + (y - 9) * 0.45 : y < 52 ? 6 + (y - 27) * 0.5 : 10 + (y - 45) * 0.62;
    const x = Math.round(CX2 + (((i * 37) % 19) / 9 - 1) * (maxHalf * 0.85));
    const on = (i + frame) % 4 !== 0;
    px(g, x, y, on ? LB[i % LB.length] : L1); if (on) { px(g, x + 1, y, "#ffffffcc"); }
  }
  // 반짝이 띠(금색·빨강)
  const garland = (y: number, half: number, c: string, ph: number) => { for (let x = CX2 - half; x <= CX2 + half; x++) px(g, x, y + Math.round(Math.sin((x - CX2) * 0.7 + ph) * 2.2), (x + ph) % 5 === 0 ? "#ffffff" : c); };
  garland(33, 15, "#ffd860", 0); garland(52, 22, "#ff6b7a", 1); garland(66, 28, "#ffd860", 2); garland(42, 18, "#ff6b7a", 3);
  // 별 (크고 빛남)
  const star = frame % 2 === 0 ? "#fff6a0" : "#ffe34a";
  rect(g, CX2 - 1, 0, 3, 12, star); rect(g, CX2 - 6, 5, 13, 3, star); rect(g, CX2 - 3, 3, 7, 8, star); rect(g, CX2 - 4, 4, 9, 5, star);
  px(g, CX2, 0, "#ffffff"); px(g, CX2 - 1, 5, "#ffffff"); px(g, CX2 + 1, 6, "#fff1b0");
  // 장식 공 (3×3, 하이라이트)
  const ORN: [number, number, string][] = [
    [35, 20, "#ff5a5a"], [30, 31, "#ffd23f"], [41, 32, "#5ab0ff"], [34, 40, "#ff8ac2"], [26, 45, "#ff5a5a"], [44, 46, "#ffd23f"],
    [35, 50, "#5ab0ff"], [24, 56, "#ffd23f"], [47, 57, "#ff8ac2"], [33, 60, "#ff5a5a"], [41, 63, "#5ab0ff"], [20, 66, "#ff8ac2"], [52, 67, "#ff5a5a"],
    [29, 68, "#ffd23f"], [44, 69, "#ffd23f"], [14, 70, "#5ab0ff"], [57, 70, "#ffd23f"], [37, 28, "#ff8ac2"], [31, 52, "#ff8ac2"], [39, 54, "#ffd23f"],
  ];
  ORN.forEach(([x, y, c], i) => {
    const lit = (i + frame) % 3 === 0;
    rect(g, x - 1, y - 1, 3, 3, c); px(g, x, y - 2, "#e6c84a");
    px(g, x - 1, y - 1, lit ? "#ffffff" : "#ffffffbb"); if (lit) { px(g, x, y - 3, "#ffffff"); px(g, x + 2, y, "#fff6c0"); px(g, x - 2, y + 1, "#fff6c0"); }
  });
  // 지팡이 사탕
  for (const [x, y] of [[23, 61], [49, 62], [33, 47]] as [number, number][]) { rect(g, x, y, 1, 4, "#ffffff"); px(g, x, y + 1, "#ff3a4a"); px(g, x, y + 3, "#ff3a4a"); px(g, x + 1, y - 1, "#ff3a4a"); px(g, x + 2, y - 1, "#ffffff"); px(g, x + 2, y, "#ff3a4a"); }
  // 선물 상자
  rect(g, 4, 86, 12, 9, "#e0505a"); rect(g, 9, 86, 2, 9, "#ffe27a"); rect(g, 4, 90, 12, 2, "#ffe27a"); rect(g, 6, 83, 3, 3, "#ffe27a"); rect(g, 11, 83, 3, 3, "#ffe27a");
  rect(g, 53, 90, 12, 6, "#5aa0e8"); rect(g, 58, 90, 2, 6, "#fff6d0"); rect(g, 53, 92, 12, 1, "#fff6d0"); rect(g, 55, 87, 3, 3, "#fff6d0"); rect(g, 60, 87, 3, 3, "#fff6d0");
  rect(g, 57, 84, 9, 6, "#8ad06a"); rect(g, 61, 84, 1, 6, "#ffffff"); rect(g, 57, 87, 9, 1, "#ffffff");
  rect(g, 16, 92, 7, 4, "#c58af0"); rect(g, 19, 92, 1, 4, "#ffffff");
  return outline(g, "#0c2e1b");
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
