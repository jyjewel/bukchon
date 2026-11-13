import type { Season } from "@/lib/time";
import type { HouseStyle, HouseType, ResearchState } from "@/lib/types";
import { INK, disc, fade, fromRows, grid, hash, outline, px, rect, rng, shade, type Grid } from "./core";

/** 마을 지도의 논리 해상도 (도트 단위) */
export const W = 432;
export const H = 288;

export const HOUSE_POS = [
  { x: 76, y: 92 }, { x: 356, y: 92 }, { x: 48, y: 176 },
  { x: 384, y: 176 }, { x: 108, y: 262 }, { x: 324, y: 262 },
];
export const DESK_POS = [
  { x: 128, y: 112 }, { x: 304, y: 112 }, { x: 104, y: 186 },
  { x: 328, y: 186 }, { x: 164, y: 250 }, { x: 268, y: 250 },
];
export const LIBRARY = { x: 216, y: 96 };
export const PLAZA = { x: 216, y: 168, rx: 62, ry: 34 };
export const BOARD = { x: 216, y: 256 };
export const POND = { x: 384, y: 250, rx: 24, ry: 12 };
export const LIBRARY_SPOTS = [
  { x: 186, y: 110 }, { x: 246, y: 110 }, { x: 198, y: 116 },
  { x: 234, y: 116 }, { x: 174, y: 118 }, { x: 258, y: 118 },
];
export const REST_SPOTS = [
  { x: 180, y: 172 }, { x: 252, y: 172 }, { x: 194, y: 190 },
  { x: 238, y: 190 }, { x: 216, y: 196 }, { x: 244, y: 152 },
];
export const TREES: [number, number, number][] = [
  [14, 60, 0], [36, 44, 1], [132, 44, 2], [300, 44, 0], [396, 44, 1], [420, 62, 2],
  [10, 118, 1], [424, 120, 0], [12, 228, 2], [40, 268, 0], [420, 204, 1],
  [150, 208, 2], [282, 208, 0], [60, 36, 2], [372, 30, 0], [164, 30, 1], [268, 30, 2],
];
export const LAMPS = [{ x: 150, y: 150 }, { x: 282, y: 150 }, { x: 170, y: 208 }, { x: 262, y: 208 }];
export const BUSHES = [[100, 128], [332, 128], [20, 196], [412, 160], [140, 276], [296, 276], [182, 76], [250, 76], [70, 214], [352, 214]];

export interface SeasonPalette {
  grass: string; grassL: string; grassD: string;
  leaves: [string, string, string][]; // [기본, 밝음, 어두움]
  flowers: string[];
  bush: [string, string, string];
  label: string;
}
export const SEASONS: Record<Season, SeasonPalette> = {
  spring: {
    grass: "#a5d977", grassL: "#bde58c", grassD: "#8cc968",
    leaves: [["#f7b3c8", "#fdd3df", "#e48fae"], ["#8fd17a", "#b2e293", "#6cb868"], ["#f9c4d4", "#ffe1ea", "#e9a0b8"]],
    flowers: ["#ff9ab5", "#ffffff", "#ffd65c", "#c9a5f0"], bush: ["#7fc76e", "#a3dc86", "#5faa5c"], label: "봄",
  },
  summer: {
    grass: "#8fd06a", grassL: "#a8de7c", grassD: "#74bd5e",
    leaves: [["#5fb866", "#86d37a", "#439a57"], ["#6cc470", "#93db83", "#4fa55f"], ["#52ab63", "#7cc977", "#3b8e54"]],
    flowers: ["#ffd65c", "#ffffff", "#7fb8f0", "#ff9ab5"], bush: ["#5fb866", "#86d37a", "#439a57"], label: "여름",
  },
  autumn: {
    grass: "#c5cf74", grassL: "#d9de8c", grassD: "#aebd63",
    leaves: [["#f0994a", "#f9bd6b", "#d4742f"], ["#e4675a", "#f48f7a", "#c14a47"], ["#f2c64e", "#fbe082", "#dba133"]],
    flowers: ["#f48f7a", "#fff4d6", "#f2c64e", "#d98bb0"], bush: ["#b9b85c", "#d6d57a", "#989a4a"], label: "가을",
  },
  winter: {
    grass: "#e8f1f4", grassL: "#f7fbfc", grassD: "#d2e1e8",
    leaves: [["#cfe0e8", "#f4fafc", "#a9c3d1"], ["#7fa894", "#f4fafc", "#5f8a78"], ["#d9e7ee", "#ffffff", "#b5cbd8"]],
    flowers: ["#ffffff", "#cfe4f6", "#ffffff"], bush: ["#c5d9e2", "#f4fafc", "#9fbccb"], label: "겨울",
  },
};

const WOOD = "#b98552", WOOD_D = "#8e5f3b", WOOD_L = "#dcaa72";
const STONE = "#d8d0c2", STONE_D = "#b4a999", STONE_L = "#efe9dc";

// ───────────────────────── 바닥 ─────────────────────────
function stampLine(mask: Uint8Array, x1: number, y1: number, x2: number, y2: number, r: number) {
  const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= n; i++) {
    const cx = x1 + ((x2 - x1) * i) / n, cy = y1 + ((y2 - y1) * i) / n;
    for (let y = Math.floor(cy - r * 0.62); y <= cy + r * 0.62; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = (x - cx) / r, dy = (y - cy) / (r * 0.62);
      if (dx * dx + dy * dy <= 1 && x >= 0 && y >= 0 && x < W && y < H) mask[y * W + x] = 1;
    }
  }
}

/** 잔디·길·광장·연못을 한 장의 그리드로 그린다 */
export function groundGrid(season: Season): Grid {
  const s = SEASONS[season];
  const g = grid(W, H);
  const r = rng(7);
  // 잔디: 넓게 번지는 얼룩 + 잔 무늬
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const blotch = Math.sin(x * 0.045 + Math.sin(y * 0.05) * 2) + Math.cos(y * 0.06 + Math.sin(x * 0.03) * 2.5);
    let c = blotch > 0.9 ? s.grassL : blotch < -1.1 ? s.grassD : s.grass;
    const n = hash(x, y);
    if (n > 0.985) c = s.grassD;
    else if (n < 0.012) c = s.grassL;
    g.d[y * W + x] = c;
  }
  for (let i = 0; i < 150; i++) {
    const x = Math.floor(r() * (W - 4)), y = Math.floor(r() * (H - 4)) + 2;
    px(g, x, y, s.grassD); px(g, x + 1, y - 1, s.grassD); px(g, x + 2, y, s.grassD); px(g, x + 1, y, s.grassL);
  }

  // 길
  const path = new Uint8Array(W * H);
  HOUSE_POS.forEach((h, i) => {
    const d = DESK_POS[i];
    stampLine(path, h.x + 9, h.y + 2, h.x + 9, h.y + 8, 7);
    stampLine(path, h.x + 9, h.y + 8, d.x, d.y + 8, 7);
    stampLine(path, d.x, d.y + 8, PLAZA.x, PLAZA.y, 7);
  });
  stampLine(path, LIBRARY.x, LIBRARY.y, PLAZA.x, PLAZA.y, 9);
  stampLine(path, BOARD.x, BOARD.y - 4, PLAZA.x, PLAZA.y, 7);
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && path[y * W + x] === 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!path[y * W + x]) {
      if (at(x, y - 1) || at(x - 1, y) || at(x + 1, y)) g.d[y * W + x] = s.grassD;
      continue;
    }
    const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
    const n = hash(x + 91, y + 17);
    g.d[y * W + x] = edge ? "#d2b07a" : n > 0.965 ? "#d9bb86" : n < 0.03 ? "#f7e6bd" : "#ecd3a0";
    if (!at(x, y + 1) || !at(x, y + 2)) g.d[y * W + x] = "#c9a56f";
  }

  // 광장: 엇갈린 돌바닥
  const { x: cx, y: cy, rx, ry } = PLAZA;
  for (let y = cy - ry - 3; y <= cy + ry + 3; y++) for (let x = cx - rx - 3; x <= cx + rx + 3; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy;
    const dxo = (x - cx) / (rx + 3), dyo = (y - cy) / (ry + 3);
    if (dxo * dxo + dyo * dyo > 1) continue;
    if (d > 1) { px(g, x, y, y > cy ? "#a2927c" : "#bcae98"); continue; }
    const row = Math.floor(y / 6), bx = x + (row % 2) * 5;
    const mortar = y % 6 === 0 || bx % 10 === 0;
    const tone = hash(Math.floor(bx / 10), row);
    px(g, x, y, mortar ? "#c7b99f" : tone > 0.7 ? "#f3ead6" : tone < 0.25 ? "#dccfb6" : "#e8dcc4");
  }

  // 연못
  for (let y = POND.y - POND.ry - 3; y <= POND.y + POND.ry + 3; y++) for (let x = POND.x - POND.rx - 3; x <= POND.x + POND.rx + 3; x++) {
    const dx = (x - POND.x) / POND.rx, dy = (y - POND.y) / POND.ry, d = dx * dx + dy * dy;
    const dxo = (x - POND.x) / (POND.rx + 3), dyo = (y - POND.y) / (POND.ry + 2.5);
    if (dxo * dxo + dyo * dyo > 1) continue;
    if (d > 1) px(g, x, y, hash(x >> 2, y >> 1) > 0.5 ? STONE : STONE_D);
    else px(g, x, y, d > 0.72 ? "#4fa5d8" : dy < -0.35 ? "#8fd6f2" : "#6cc0ea");
  }
  disc(g, POND.x + 11, POND.y + 4, 4, 2, "#62b866");
  px(g, POND.x + 12, POND.y + 3, "#ff9ab5"); px(g, POND.x + 9, POND.y + 4, "#4a9a54");
  disc(g, POND.x - 12, POND.y + 6, 2.500, 1.300, "#62b866");

  // 꽃
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * (W - 6)) + 3, y = Math.floor(r() * (H - 6)) + 3;
    if (path[y * W + x] || g.d[y * W + x]?.startsWith("#e") && season !== "winter" && g.d[y * W + x] !== s.grass) continue;
    const base = g.d[y * W + x];
    if (base !== s.grass && base !== s.grassL && base !== s.grassD) continue;
    const c = s.flowers[i % s.flowers.length];
    px(g, x, y, c); px(g, x - 1, y, c); px(g, x + 1, y, c); px(g, x, y - 1, c); px(g, x, y + 1, c);
    px(g, x, y, c === "#ffd65c" ? "#f08a3c" : "#ffd65c");
    px(g, x, y + 2, s.grassD);
  }
  return g;
}

// ───────────────────────── 건물·소품 ─────────────────────────
export const HOUSE_W = 54;
export const HOUSE_H = 64;

export function houseTypeOf(style: HouseStyle): HouseType {
  return style.type === "hut" || style.type === "office" || style.type === "hanok" ? style.type : "classic";
}

/** 건물 종류마다 다른 위치 정보 (그림 좌표 기준, 바닥 가운데가 (27, 62)) */
export const HOUSE_META: Record<HouseType, { window: { x: number; y: number }; smoke: { x: number; y: number } | null; bubble: { x: number; y: number } }> = {
  classic: { window: { x: 11, y: 37 }, smoke: { x: 40, y: 3 }, bubble: { x: 9, y: 20 } },
  hut: { window: { x: 14, y: 41 }, smoke: { x: 27, y: 15 }, bubble: { x: 8, y: 30 } },
  office: { window: { x: 11, y: 37 }, smoke: null, bubble: { x: 9, y: 22 } },
  hanok: { window: { x: 12, y: 37 }, smoke: { x: 45, y: 5 }, bubble: { x: 9, y: 21 } },
};

type HouseOpts = { lit: boolean; empty: boolean; mine: boolean };
const RED = "#e0605a";

/** 건물을 모두 그린 뒤, 빈 집이면 색을 바랜 회색으로 바꾼다 */
function finish(g: Grid, opts: HouseOpts, flag: { x: number; top: number; height: number }): Grid {
  if (opts.empty) for (let i = 0; i < g.d.length; i++) if (g.d[i]) g.d[i] = fade(g.d[i]!);
  if (opts.mine) {
    rect(g, flag.x, flag.top, 1, flag.height, WOOD_D);
    rect(g, flag.x + 1, flag.top, 6, 4, "#ff8fab"); px(g, flag.x + 6, flag.top, null); px(g, flag.x + 6, flag.top + 3, null);
    px(g, flag.x + 7, flag.top + 1, "#ff8fab"); px(g, flag.x + 7, flag.top + 2, "#ff8fab");
    rect(g, flag.x + 1, flag.top + 3, 5, 1, "#e0607f");
  }
  return outline(g);
}
function glow(lit: boolean) { return lit ? { glass: "#ffe07a", hi: "#fff4bf", lo: "#ffcf5c" } : { glass: "#66769c", hi: "#8191b6", lo: "#66769c" }; }

/** 기본 집: 빨간 지붕에 크림색 벽. 창문 안쪽은 (11..20, 37..46) */
function classicGrid(opts: HouseOpts): Grid {
  const roof = RED, wall = "#fff5e1", door = "#b0703f";
  const roofD = shade(roof, -38), roofL = shade(roof, 34), wallD = shade(wall, -30), wallL = shade(wall, 14);
  const g = grid(HOUSE_W, HOUSE_H);
  const top = 9;
  const w = glow(opts.lit);
  rect(g, 37, top - 3, 7, 14, "#c98a6b");
  rect(g, 36, top - 4, 9, 2, "#a86a52");
  for (let y = top; y < top + 10; y += 3) rect(g, 37, y, 7, 1, "#b5775c");
  rect(g, 6, top + 21, 42, 30, wall);
  rect(g, 6, top + 21, 42, 3, wallD);
  for (let y = top + 28; y < top + 48; y += 6) for (let x = 7; x < 47; x++) if (hash(x >> 3, y) > 0.55) px(g, x, y, wallL);
  rect(g, 45, top + 24, 3, 27, wallD);
  rect(g, 6, top + 49, 42, 3, STONE_D);
  for (let x = 8; x < 48; x += 6) px(g, x, top + 50, STONE);
  for (let y = 0; y <= 21; y++) {
    const inset = Math.round(((21 - y) * 10) / 21);
    for (let x = 2 + inset; x <= 51 - inset; x++) {
      const band = Math.floor(y / 4);
      let c = roof;
      if (y % 4 === 3) c = roofD;
      else if ((x + band * 3) % 6 === 0) c = roofD;
      else if (y % 4 === 0 && (x + band * 3) % 6 === 2) c = roofL;
      if (y === 0) c = roofL;
      px(g, x, top + y, c);
    }
  }
  rect(g, 2, top + 20, 50, 2, shade(roof, -60));
  rect(g, 10, top + 27, 12, 12, WOOD_D);
  rect(g, 11, top + 28, 10, 10, w.glass);
  if (opts.lit) { rect(g, 11, top + 28, 4, 4, w.hi); rect(g, 17, top + 34, 4, 4, w.lo); } else rect(g, 11, top + 28, 4, 2, w.hi);
  rect(g, 9, top + 39, 14, 2, WOOD_L);
  rect(g, 10, top + 41, 12, 2, WOOD);
  if (!opts.empty) {
    for (let i = 0; i < 6; i++) px(g, 10 + i * 2 + (i % 2), top + 39 - (i % 2), ["#ff9ab5", "#ffd65c", "#ffffff"][i % 3]);
    for (let i = 0; i < 6; i++) px(g, 11 + i * 2, top + 40, "#62b866");
  }
  rect(g, 30, top + 32, 12, 20, WOOD_D);
  rect(g, 31, top + 33, 10, 19, door);
  px(g, 30, top + 32, null); px(g, 41, top + 32, null); px(g, 31, top + 33, WOOD_D); px(g, 40, top + 33, WOOD_D);
  rect(g, 33, top + 36, 6, 5, shade(door, 22));
  rect(g, 33, top + 44, 6, 6, shade(door, -18));
  px(g, 39, top + 43, "#ffd65c"); px(g, 39, top + 44, "#d9a23a");
  rect(g, 28, top + 52, 16, 1, STONE_L);
  return finish(g, opts, { x: 9, top: 1, height: top + 3 });
}

/** 움집: 짚으로 두껍게 이은 둥근 초가지붕에 붉은 새끼줄. 창은 (14..23, 41..50) */
function hutGrid(opts: HouseOpts): Grid {
  const g = grid(HOUSE_W, HOUSE_H);
  const straw = "#dcb868", strawL = "#efd48e", strawD = "#b8944a", rope = "#c0504d";
  const w = glow(opts.lit);
  // 초가지붕(원뿔)
  for (let y = 22; y <= 58; y++) {
    const hw = 3 + Math.round(((y - 22) * 23) / 36);
    for (let x = 27 - hw; x <= 27 + hw; x++) {
      let c = straw;
      if ((x + y * 2) % 7 === 0) c = strawD;
      else if ((x * 3 + y) % 11 === 0) c = strawL;
      if (x === 27 - hw || x === 27 - hw + 1) c = strawL;
      if (x === 27 + hw || x === 27 + hw - 1) c = strawD;
      px(g, x, y, c);
    }
  }
  for (const y of [30, 40, 50]) { const hw = 3 + Math.round(((y - 22) * 23) / 36); rect(g, 27 - hw, y, hw * 2 + 1, 2, rope); }
  // 꼭대기 서까래와 연기 구멍
  rect(g, 26, 17, 3, 6, WOOD_D); rect(g, 24, 19, 7, 1, WOOD); px(g, 25, 18, WOOD); px(g, 29, 18, WOOD);
  // 바닥 돌
  for (let x = 2; x < 52; x += 5) rect(g, x, 57, 4, 3, hash(x, 5) > 0.5 ? STONE : STONE_D);
  rect(g, 2, 59, 50, 2, STONE_D);
  // 창
  rect(g, 13, 40, 12, 12, WOOD_D);
  for (const [x, y] of [[13, 40], [24, 40], [13, 51], [24, 51]]) px(g, x, y, null);
  rect(g, 14, 41, 10, 10, w.glass);
  for (const [x, y] of [[14, 41], [23, 41], [14, 50], [23, 50]]) px(g, x, y, WOOD_D);
  if (opts.lit) { rect(g, 15, 42, 3, 3, w.hi); rect(g, 19, 46, 4, 4, w.lo); } else rect(g, 15, 42, 3, 2, w.hi);
  px(g, 18, 41, WOOD_D); rect(g, 18, 41, 1, 10, WOOD_D); rect(g, 14, 45, 10, 1, WOOD_D);
  // 문(출입구)
  rect(g, 29, 43, 14, 2, WOOD); rect(g, 30, 45, 12, 14, WOOD_D);
  rect(g, 31, 46, 10, 13, opts.lit ? "#6a4a2a" : "#2f2420");
  if (opts.lit) { rect(g, 33, 49, 6, 8, "#ffcf5c"); rect(g, 34, 50, 4, 5, "#fff4bf"); }
  rect(g, 28, 59, 16, 1, STONE_L);
  return finish(g, opts, { x: 27, top: 9, height: 9 });
}

/** 현대식 사무실 건물: 유리창이 줄지어 있고 빨간 띠와 차양이 있다. 큰 창은 (11..20, 37..46) */
function officeGrid(opts: HouseOpts): Grid {
  const g = grid(HOUSE_W, HOUSE_H);
  const wall = "#d9dfe8", wallD = "#b6c0ce", steel = "#44546a";
  rect(g, 6, 10, 42, 50, wall);
  rect(g, 44, 10, 4, 50, wallD);                               // 옆면 그늘
  rect(g, 6, 10, 1, 50, "#eef2f7");
  for (const y of [24, 35]) { rect(g, 6, y, 42, 1, wallD); rect(g, 6, y + 1, 42, 1, "#c4ccd8"); }  // 층 구분 띠
  // 옥상: 난간, 작은 정원, 실외기, 안테나
  rect(g, 5, 6, 44, 4, "#aab4c0"); rect(g, 5, 6, 44, 1, "#eef2f7"); rect(g, 5, 9, 44, 1, "#8d98a6");
  for (let x = 7; x < 47; x += 3) rect(g, x, 7, 1, 2, "#8d98a6");
  rect(g, 8, 2, 16, 4, "#7a5a3a"); rect(g, 8, 2, 16, 1, "#9a7a55");  // 화단
  disc(g, 12, 2, 4, 3, "#62b866"); disc(g, 18, 1, 4, 3, "#4f9a54"); disc(g, 22, 3, 3, 2, "#7fcf74");
  px(g, 13, 0, "#ff8fb4"); px(g, 19, 0, "#ffd65c"); px(g, 10, 1, "#ffd65c");
  rect(g, 34, 1, 9, 5, "#8a93a0"); rect(g, 36, 2, 5, 3, "#6a7380"); px(g, 38, 3, "#c9ced6");
  rect(g, 6, 10, 42, 2, RED);                                   // 빨간 띠
  // 위층 창 (창틀 + 반사)
  const lightPane = (x: number, y: number, w: number, h: number, i: number) => {
    const on = opts.lit && hash(x, y + i) > 0.35;
    rect(g, x - 1, y - 1, w + 2, h + 2, steel);
    rect(g, x, y, w, h, on ? "#ffe9a3" : "#a8d6ee");
    rect(g, x, y, 2, h, on ? "#fff4cf" : "#d6effa");
    rect(g, x + w - 3, y + h - 2, 3, 2, on ? "#ffd45c" : "#7fb6d4");
    rect(g, x + (w >> 1), y, 1, h, steel);                        // 가운데 창틀
    rect(g, x - 2, y + h + 1, w + 4, 1, "#9aa5b4");               // 창턱
  };
  let i = 0;
  for (const y of [15, 27]) for (const x of [9, 20, 31]) lightPane(x, y, 8, 7, i++);
  rect(g, 41, 15, 4, 19, "#a8d6ee"); rect(g, 40, 14, 6, 1, steel); rect(g, 40, 34, 6, 1, steel); rect(g, 41, 15, 1, 19, "#d6effa");
  // 1층 큰 창 (집 안 모습이 비치는 창)
  const w = glow(opts.lit);
  rect(g, 10, 36, 12, 12, steel);
  rect(g, 11, 37, 10, 10, opts.lit ? w.glass : "#a8d6ee");
  if (opts.lit) { rect(g, 11, 37, 4, 4, w.hi); rect(g, 17, 43, 4, 4, w.lo); } else { rect(g, 11, 37, 2, 10, "#d6effa"); rect(g, 13, 37, 1, 4, "#d6effa"); }
  rect(g, 16, 37, 1, 10, steel);
  rect(g, 9, 48, 14, 1, "#9aa5b4");
  // 간판(책 모양 로고)과 유리문, 차양
  rect(g, 26, 34, 18, 4, "#2f4a6a"); rect(g, 26, 34, 18, 1, "#4f7098");
  rect(g, 30, 35, 4, 3, "#fff8e4"); rect(g, 34, 35, 4, 3, "#fff8e4"); rect(g, 34, 35, 1, 3, "#c0504d");
  rect(g, 28, 38, 16, 3, RED);
  for (let x = 28; x < 44; x += 4) rect(g, x, 38, 2, 3, shade(RED, 40));
  rect(g, 29, 41, 14, 18, steel);
  rect(g, 30, 42, 6, 17, opts.lit ? "#ffe9a3" : "#a8d6ee"); rect(g, 37, 42, 5, 17, opts.lit ? "#ffe9a3" : "#a8d6ee");
  rect(g, 30, 42, 2, 17, opts.lit ? "#fff4cf" : "#d6effa");
  px(g, 35, 49, "#e8e8f0"); px(g, 37, 49, "#e8e8f0"); rect(g, 35, 47, 1, 4, "#e8e8f0"); rect(g, 37, 47, 1, 4, "#e8e8f0");
  // 입구 화단과 계단
  for (const [x0, w0] of [[24, 4], [44, 4]] as const) {
    rect(g, x0, 56, w0, 3, "#7a5a3a"); disc(g, x0 + (w0 >> 1), 55, 2.5, 2.5, "#62b866"); px(g, x0 + 1, 54, "#ff8fb4");
  }
  rect(g, 6, 59, 42, 2, "#8a93a0"); rect(g, 27, 59, 18, 2, STONE_L); rect(g, 26, 61, 20, 1, STONE);
  return finish(g, opts, { x: 21, top: 0, height: 6 });
}

/** 한옥: 짙은 갈색 기와의 넓은 지붕과 들린 처마, 처마 끝 주황 등, 크림색 벽·나무 기둥·창살 창호, 가운데 쌍여닫이문, 마루와 돌계단. 창 안쪽은 (12..21, 37..46) */
function hanokGrid(opts: HouseOpts): Grid {
  const g = grid(HOUSE_W, HOUSE_H);
  const roofB = "#7a4430", roofD = "#55291c", roofL = "#9a5c40", beam = "#8e4f2a", beamD = "#6a371c", plaster = "#fdf3e0", plasterD = "#e6d9bd", orange = "#f08a2a";
  const w = glow(opts.lit);
  // 굴뚝(지붕 뒤)
  rect(g, 45, 8, 5, 16, "#9a8f85"); rect(g, 44, 6, 7, 3, "#7a6f65");
  for (let y = 11; y < 24; y += 3) rect(g, 45, y, 5, 1, "#8a7f75");
  // 벽
  rect(g, 7, 31, 40, 25, plaster);
  rect(g, 7, 31, 40, 3, plasterD);
  rect(g, 7, 53, 40, 3, "#c98a50"); rect(g, 7, 53, 40, 1, "#e0a468");            // 하방(아래 나무띠)
  for (const x of [6, 25, 41, 45]) rect(g, x, 34, x === 25 || x === 41 ? 2 : 3, 22, beam);
  for (const x of [6, 25, 41, 45]) rect(g, x + (x === 25 || x === 41 ? 1 : 2), 34, 1, 22, beamD);
  rect(g, 6, 31, 42, 3, beam); rect(g, 6, 33, 42, 1, beamD);                   // 도리
  // 지붕: 짙은 갈색 기와, 대각선 골
  for (let y = 16; y <= 29; y++) {
    const hw = 16 + Math.round(((y - 16) * 9) / 13);
    for (let x = 27 - hw; x <= 27 + hw; x++) {
      const k = (x + y) % 4;
      let c = k === 0 ? roofD : k === 2 ? roofL : roofB;
      if (x === 27 - hw || x === 27 + hw) c = roofD;
      px(g, x, y, c);
    }
  }
  rect(g, 11, 13, 32, 3, roofD); rect(g, 11, 13, 32, 1, roofL);               // 용마루
  rect(g, 9, 10, 3, 6, roofD); rect(g, 42, 10, 3, 6, roofD); px(g, 9, 10, roofL); px(g, 43, 10, roofL);   // 치미
  rect(g, 3, 28, 48, 3, roofD);                                                 // 처마 두께
  for (const [x, y] of [[2, 28], [1, 27], [0, 26], [0, 25], [2, 27], [1, 26], [51, 28], [52, 27], [53, 26], [53, 25], [51, 27], [52, 26]]) px(g, x, y, roofD);   // 하늘로 들린 처마 끝
  for (const [x, y] of [[0, 25], [53, 25]]) px(g, x, y, roofL);
  for (let x = 5; x < 50; x += 4) { px(g, x, 31, orange); px(g, x, 32, "#ffc26a"); }   // 처마 끝 주황 등
  // 창호(왼쪽 격자창)
  rect(g, 10, 35, 14, 13, beamD);
  rect(g, 12, 37, 10, 10, opts.lit ? w.glass : "#f1e8d2");
  if (opts.lit) { rect(g, 12, 37, 4, 4, w.hi); rect(g, 18, 43, 4, 4, w.lo); }
  for (let x = 14; x <= 20; x += 3) rect(g, x, 37, 1, 10, beam);
  for (let y = 40; y <= 44; y += 3) rect(g, 12, y, 10, 1, beam);
  rect(g, 10, 48, 14, 2, "#c98a50");
  // 가운데 쌍여닫이문(창살)
  rect(g, 28, 38, 12, 18, beamD);
  rect(g, 29, 39, 5, 16, opts.lit ? "#ffe9a8" : "#ecdcb4"); rect(g, 35, 39, 4, 16, opts.lit ? "#ffe9a8" : "#ecdcb4");
  for (let y = 42; y < 55; y += 3) { rect(g, 29, y, 10, 1, beam); }
  for (const x of [31, 37]) rect(g, x, 39, 1, 16, beam);
  rect(g, 34, 39, 1, 16, beamD);
  px(g, 33, 48, "#e8c24a"); px(g, 35, 48, "#e8c24a");
  // 오른쪽 작은 격자창
  rect(g, 42, 37, 4, 11, beamD); rect(g, 43, 38, 2, 9, opts.lit ? "#ffe9a8" : "#f1e8d2"); rect(g, 43, 42, 2, 1, beam);
  // 마루와 돌계단·기단
  rect(g, 4, 56, 46, 3, "#c98a50"); rect(g, 4, 56, 46, 1, "#e0a468");
  for (let x = 8; x < 48; x += 6) rect(g, x, 57, 1, 2, beam);
  rect(g, 4, 59, 46, 3, "#3b2a22");
  for (let x = 6; x < 46; x += 8) { rect(g, x, 59, 4, 3, "#a39d90"); rect(g, x, 59, 4, 1, "#c7c2b5"); }
  rect(g, 27, 59, 14, 2, STONE_L); rect(g, 26, 61, 16, 1, STONE);
  return finish(g, opts, { x: 14, top: 2, height: 9 });
}

/** 연구실 건물. 바닥 가운데가 (27, 62) */
export function houseGrid(style: HouseStyle, opts: HouseOpts): Grid {
  switch (houseTypeOf(style)) {
    case "hut": return hutGrid(opts);
    case "office": return officeGrid(opts);
    case "hanok": return hanokGrid(opts);
    default: return classicGrid(opts);
  }
}

export const LIB_W = 104;
export const LIB_H = 84;
/** 도서관. 바닥 가운데가 (52, 82) */
export function libraryGrid(lit: boolean): Grid {
  const g = grid(LIB_W, LIB_H);
  const roof = "#6f93c4", roofD = "#5477a8", roofL = "#95b4dc", cream = "#f6ead0", creamD = "#dcc9a4";
  // 박공 지붕
  for (let y = 0; y <= 24; y++) {
    const half = Math.round(2 + (y * 49) / 24);
    for (let x = 52 - half; x < 52 + half; x++) {
      let c = roof;
      if (y % 4 === 3) c = roofD;
      else if ((x + Math.floor(y / 4) * 3) % 6 === 0) c = roofD;
      if (x === 52 - half || x === 52 - half + 1) c = roofL;
      px(g, x, 3 + y, c);
    }
  }
  for (let y = 10; y <= 22; y++) {
    const half = Math.round(((y - 8) * 24) / 16);
    rect(g, 52 - half, 3 + y, half * 2, 1, cream);
  }
  disc(g, 51.500, 21, 4, 4, "#fff8e4");
  rect(g, 49, 19, 6, 4, "#e0605a"); rect(g, 49, 23, 6, 1, "#fff"); rect(g, 52, 19, 1, 4, "#b8433f");
  rect(g, 1, 27, 102, 3, roofD);
  // 처마 띠
  rect(g, 4, 30, 96, 5, cream); rect(g, 4, 34, 96, 1, creamD);
  for (let x = 8; x < 98; x += 6) px(g, x, 32, creamD);
  // 벽
  rect(g, 7, 35, 90, 41, "#ecdcb9");
  rect(g, 7, 35, 90, 3, creamD);
  // 아치 창
  for (const wx of [20, 73]) {
    rect(g, wx, 44, 11, 18, WOOD_D);
    rect(g, wx + 1, 45, 9, 16, lit ? "#ffe07a" : "#66769c");
    px(g, wx, 44, null); px(g, wx + 10, 44, null); px(g, wx + 1, 45, WOOD_D); px(g, wx + 9, 45, WOOD_D);
    if (lit) rect(g, wx + 2, 46, 3, 5, "#fff4bf");
    rect(g, wx + 5, 45, 1, 16, WOOD_D); rect(g, wx + 1, 52, 9, 1, WOOD_D);
    rect(g, wx - 1, 62, 13, 2, STONE_L);
  }
  // 문
  rect(g, 41, 44, 22, 32, WOOD_D);
  rect(g, 42, 45, 20, 31, "#a8683c");
  px(g, 41, 44, null); px(g, 62, 44, null); px(g, 42, 45, WOOD_D); px(g, 61, 45, WOOD_D);
  rect(g, 51, 45, 2, 31, WOOD_D);
  rect(g, 44, 49, 5, 9, "#c08250"); rect(g, 55, 49, 5, 9, "#c08250");
  rect(g, 44, 62, 5, 10, "#8f5530"); rect(g, 55, 62, 5, 10, "#8f5530");
  px(g, 49, 61, "#ffd65c"); px(g, 54, 61, "#ffd65c");
  // 기둥
  for (const cx of [10, 34, 64, 88]) {
    rect(g, cx, 37, 6, 38, "#fffaf0");
    rect(g, cx + 4, 37, 2, 38, "#e6d9bf");
    rect(g, cx + 2, 39, 1, 34, "#efe5cf");
    rect(g, cx - 1, 35, 8, 3, STONE_L); rect(g, cx - 1, 37, 8, 1, STONE_D);
    rect(g, cx - 1, 73, 8, 3, STONE_L); rect(g, cx - 1, 75, 8, 1, STONE_D);
  }
  // 계단
  rect(g, 4, 76, 96, 3, STONE); rect(g, 4, 78, 96, 1, STONE_D);
  rect(g, 30, 79, 44, 3, STONE_L); rect(g, 30, 81, 44, 1, STONE_D);
  return outline(g);
}

export const TREE_W = 34;
export const TREE_H = 44;
/** 나무. 밑동 가운데가 (17, 42) */
export function treeGrid(colors: [string, string, string], variant: number, season: Season): Grid {
  const [base, light, dark] = colors;
  const g = grid(TREE_W, TREE_H);
  const r = rng(variant * 31 + 5);
  rect(g, 15, 28, 5, 14, WOOD);
  rect(g, 18, 28, 2, 14, WOOD_D);
  px(g, 14, 41, WOOD); px(g, 20, 41, WOOD_D); px(g, 16, 33, WOOD_D);
  const blobs: [number, number, number, number][] = variant % 3 === 0
    ? [[17, 13, 11, 10], [9, 20, 8, 7], [25, 20, 8, 7], [17, 24, 10, 6]]
    : variant % 3 === 1
      ? [[17, 11, 9, 9], [10, 18, 9, 8], [24, 18, 9, 8], [17, 25, 11, 6]]
      : [[17, 15, 13, 11], [17, 8, 8, 6], [17, 25, 11, 6]];
  for (const [cx, cy, rx, ry] of blobs) disc(g, cx, cy, rx, ry, base);
  // 아래쪽 그늘, 위쪽 빛 (디더링)
  for (let y = 0; y < 32; y++) for (let x = 0; x < TREE_W; x++) {
    if (g.d[y * TREE_W + x] !== base) continue;
    const lightness = (17 - x) * 0.5 + (16 - y) * 1.1 + (hash(x, y + variant * 9) - 0.5) * 5;
    if (lightness < -8.500) g.d[y * TREE_W + x] = dark;
    else if (lightness > 9.500) g.d[y * TREE_W + x] = light;
  }
  for (let i = 0; i < 9; i++) {
    const x = 6 + Math.floor(r() * 22), y = 6 + Math.floor(r() * 20);
    if (g.d[y * TREE_W + x] === base) { px(g, x, y, dark); px(g, x + 1, y, dark); px(g, x, y - 1, light); }
  }
  if (season === "autumn" && variant % 2 === 0) for (let i = 0; i < 4; i++) {
    const x = 7 + Math.floor(r() * 20), y = 10 + Math.floor(r() * 16);
    if (g.d[y * TREE_W + x]) { px(g, x, y, "#e0483e"); px(g, x + 1, y, "#e0483e"); px(g, x, y + 1, "#b8332f"); px(g, x + 1, y + 1, "#e0483e"); }
  }
  return outline(g);
}

export function bushGrid(colors: [string, string, string], variant: number, flower: string): Grid {
  const g = grid(18, 13);
  disc(g, 6, 7, 5, 4, colors[0]); disc(g, 12, 7, 4.500, 4, colors[0]); disc(g, 9, 5, 4, 3.500, colors[0]);
  for (let y = 0; y < 13; y++) for (let x = 0; x < 18; x++) {
    if (g.d[y * 18 + x] !== colors[0]) continue;
    if (y > 8) g.d[y * 18 + x] = colors[2];
    else if (y < 5 && x < 10 && hash(x, y + variant) > 0.4) g.d[y * 18 + x] = colors[1];
  }
  if (variant % 2 === 0) { px(g, 5, 5, flower); px(g, 11, 7, flower); px(g, 8, 8, flower); }
  return outline(g);
}

/** 책상. 바닥 가운데가 (14, 15) */
export function deskGrid(occupied: boolean, faded: boolean): Grid {
  const g = grid(28, 17);
  rect(g, 2, 5, 24, 3, WOOD_L); rect(g, 2, 7, 24, 1, WOOD);
  rect(g, 3, 8, 22, 2, WOOD_D);
  rect(g, 4, 10, 2, 5, WOOD); rect(g, 22, 10, 2, 5, WOOD);
  if (occupied) {
    rect(g, 9, 3, 5, 2, "#ffffff"); rect(g, 14, 3, 5, 2, "#f1ead8"); px(g, 13, 2, "#ffffff"); px(g, 14, 2, "#f1ead8");
    rect(g, 21, 2, 3, 3, "#ffffff"); px(g, 24, 3, "#ffffff"); rect(g, 21, 2, 3, 1, "#8a5a3a");
  } else {
    rect(g, 10, 3, 7, 2, "#7fa7e0"); rect(g, 10, 4, 7, 1, "#ffffff");
  }
  if (faded) for (let i = 0; i < g.d.length; i++) if (g.d[i]) g.d[i] = fade(g.d[i]!);
  return outline(g);
}
/** 의자 등받이. 바닥 가운데가 (6, 15) */
export function chairGrid(faded: boolean): Grid {
  const g = grid(12, 17);
  rect(g, 2, 2, 8, 9, WOOD); rect(g, 3, 3, 6, 3, WOOD_L); rect(g, 2, 10, 8, 2, WOOD_D);
  rect(g, 2, 12, 2, 3, WOOD_D); rect(g, 8, 12, 2, 3, WOOD_D);
  if (faded) for (let i = 0; i < g.d.length; i++) if (g.d[i]) g.d[i] = fade(g.d[i]!);
  return outline(g);
}

/** 게시판. 바닥 가운데가 (17, 33) */
export function boardGrid(): Grid {
  const g = grid(34, 35);
  rect(g, 5, 20, 3, 13, WOOD_D); rect(g, 26, 20, 3, 13, WOOD_D);
  rect(g, 3, 8, 28, 19, WOOD); rect(g, 4, 9, 26, 17, "#d8a56b");
  for (let y = 0; y < 6; y++) rect(g, 1 + y * 2.700, 7 - y, 32 - y * 5.400, 1, y % 2 ? "#d6524c" : "#e8695f");
  rect(g, 1, 7, 32, 1, "#b8433f");
  rect(g, 6, 11, 7, 6, "#ffffff"); rect(g, 7, 13, 5, 1, "#b9c2d4"); rect(g, 7, 15, 3, 1, "#b9c2d4"); px(g, 9, 11, "#e0605a");
  rect(g, 15, 11, 6, 8, "#ffe58a"); rect(g, 16, 13, 4, 1, "#d6a94a"); rect(g, 16, 15, 4, 1, "#d6a94a"); px(g, 18, 11, "#4f9a6d");
  rect(g, 23, 11, 6, 5, "#bfe0f7"); px(g, 26, 11, "#e0605a");
  rect(g, 6, 19, 6, 5, "#ffc9d6"); rect(g, 23, 18, 6, 6, "#c9f0c4"); rect(g, 24, 20, 4, 1, "#7fbf7a");
  return outline(g);
}

/** 가로등. 바닥 가운데가 (5, 28) */
export function lampGrid(on: boolean): Grid {
  const g = grid(11, 30);
  rect(g, 5, 9, 1, 19, "#5a5568"); rect(g, 3, 27, 5, 1, "#5a5568"); rect(g, 4, 25, 3, 2, "#6f6a7e");
  rect(g, 3, 3, 5, 6, on ? "#ffe07a" : "#e9e2c8"); rect(g, 4, 4, 2, 2, on ? "#fff8d6" : "#f7f2df");
  rect(g, 2, 2, 7, 1, "#5a5568"); rect(g, 4, 1, 3, 1, "#5a5568"); rect(g, 2, 9, 7, 1, "#5a5568");
  return outline(g);
}

/** 분수. 바닥 가운데가 (19, 30) */
export function fountainGrid(frame: number): Grid {
  const g = grid(38, 33);
  disc(g, 18.500, 23, 17, 8, STONE);
  disc(g, 18.500, 25, 17, 6, STONE_D);
  disc(g, 18.500, 22, 17, 7, STONE_L);
  disc(g, 18.500, 22, 14, 5, "#6cc0ea");
  disc(g, 18.500, 21, 13, 3.500, "#8fd6f2");
  for (let i = 0; i < 5; i++) px(g, 8 + ((i * 6 + frame * 3) % 22), 21 + ((i + frame) % 3), "#e3f6fd");
  rect(g, 17, 10, 4, 12, STONE); rect(g, 19, 10, 2, 12, STONE_D);
  disc(g, 18.500, 10, 6, 2.200, STONE_L); rect(g, 13, 11, 12, 1, STONE_D);
  rect(g, 18, 5, 2, 5, "#bfe9fa");
  const spray = frame % 2;
  px(g, 17, 4 + spray, "#e3f6fd"); px(g, 20, 4 + (1 - spray), "#e3f6fd"); px(g, 18, 3, "#e3f6fd"); px(g, 19, 3 + spray, "#bfe9fa");
  px(g, 13 - spray, 13 + spray * 2, "#bfe9fa"); px(g, 24 + spray, 13 + (1 - spray) * 2, "#bfe9fa");
  px(g, 12, 16 + spray, "#e3f6fd"); px(g, 25, 16 + (1 - spray), "#e3f6fd");
  return outline(g);
}

export function benchGrid(): Grid {
  const g = grid(24, 14);
  rect(g, 2, 2, 20, 2, WOOD_L); rect(g, 2, 5, 20, 2, WOOD); rect(g, 1, 8, 22, 2, WOOD_L); rect(g, 1, 10, 22, 1, WOOD_D);
  rect(g, 3, 4, 1, 4, WOOD_D); rect(g, 20, 4, 1, 4, WOOD_D); rect(g, 3, 11, 2, 2, WOOD_D); rect(g, 19, 11, 2, 2, WOOD_D);
  return outline(g);
}

// ───────────────────────── 상태 아이콘 (7×7) ─────────────────────────
const ICON_ROWS: Record<ResearchState, { rows: string[]; pal: Record<string, string> }> = {
  focus: { rows: [".......", "aa...aa", "awa.awa", "awwawwa", "awwawwa", "aaaaaaa", "......."], pal: { a: "#b8433f", w: "#fff8e4" } },
  open: { rows: [".s..s..", "..s..s.", "wwwww..", "wcccwww", "wcccw.w", "wwwwwww", ".www..."], pal: { w: "#e0605a", c: "#7a4a2a", s: "#9aa6bd" } },
  library: { rows: ["..rrrr.", "..rwwr.", "bbbbbb.", "bwwwwb.", ".gggggg", ".gwwwwg", ".gggggg"], pal: { r: "#e0605a", b: "#5f8fd6", g: "#4f9a6d", w: "#fff8e4" } },
  rest: { rows: ["....gg.", "..gggg.", ".ggdgg.", ".gdggg.", "gdggg..", "dgg....", "d......"], pal: { g: "#62b866", d: "#3f8a4e" } },
  offline: { rows: [".zzzz..", "...z...", "..z....", ".zzzz..", "....zzz", ".....z.", "....zzz"], pal: { z: "#7a84b8" } },
};
export function iconGrid(state: ResearchState): Grid {
  return fromRows(ICON_ROWS[state].rows, ICON_ROWS[state].pal);
}
/** 말풍선 속 상태 아이콘 (13×14) */
export function bubbleGrid(state: ResearchState): Grid {
  const g = grid(13, 14);
  rect(g, 1, 1, 11, 9, "#fffdf4");
  px(g, 1, 1, null); px(g, 11, 1, null); px(g, 1, 9, null); px(g, 11, 9, null);
  px(g, 5, 10, "#fffdf4"); px(g, 6, 10, "#fffdf4"); px(g, 6, 11, "#fffdf4");
  const icon = iconGrid(state);
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (icon.d[y * 7 + x]) px(g, 3 + x, 2 + y, icon.d[y * 7 + x]);
  return outline(g, INK);
}
