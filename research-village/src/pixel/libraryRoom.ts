import type { DayPhase } from "@/lib/time";
import { disc, grid, hash, outline, px, rect, rng, shade, type Grid } from "./core";

export const LROOM_W = 160;
export const LROOM_H = 120;
const WOOD = "#b98552", WOOD_D = "#8e5f3b", WOOD_L = "#dcaa72";
const SPINES = ["#e0605a", "#5f8fd6", "#f2c64e", "#62b866", "#b08ae0", "#f0994a", "#f7a8bf", "#6ccfc2", "#a8764a", "#4a5f8a"];

/** 책장: 칸마다 책등이 빽빽하게 꽂혀 있다 */
function bookcase(g: Grid, x: number, y: number, w: number, h: number, seed: number) {
  const r = rng(seed);
  rect(g, x, y, w, h, WOOD_D);
  rect(g, x + 1, y + 1, w - 2, h - 2, "#6e4a30");
  const rows = Math.floor((h - 2) / 12);
  for (let i = 0; i < rows; i++) {
    const sy = y + 2 + i * 12;
    rect(g, x + 1, sy + 9, w - 2, 2, WOOD);                              // 선반
    let bx = x + 2;
    while (bx < x + w - 4) {
      const bw = 2 + Math.floor(r() * 3), bh = 6 + Math.floor(r() * 4);
      const c = SPINES[Math.floor(r() * SPINES.length)];
      rect(g, bx, sy + 9 - bh, bw, bh, c); rect(g, bx, sy + 9 - bh, 1, bh, shade(c, 28));
      if (r() > 0.55) px(g, bx + 1, sy + 9 - bh + 2, "#fff3c4");
      bx += bw;
      if (r() > 0.9) bx += 2;                                            // 가끔 비는 자리
    }
  }
  rect(g, x - 1, y - 1, w + 2, 2, WOOD_L);
}

/** 도서관 실내 배경: 큰 책장 둘, 창, 게시판, 칠판, 회의용 노트북 탁자, 마룻바닥 */
export function libraryBackground(phase: DayPhase, tick = 0): Grid {
  const g = grid(LROOM_W, LROOM_H);
  const wall = "#efe2c8";
  rect(g, 0, 0, LROOM_W, 56, wall);
  for (let x = 3; x < LROOM_W; x += 9) rect(g, x, 0, 1, 56, shade(wall, -8));           // 벽 무늬
  rect(g, 0, 54, LROOM_W, 3, WOOD_D);
  // 마루
  rect(g, 0, 57, LROOM_W, LROOM_H - 57, "#c99a64");
  for (let y = 57; y < LROOM_H; y += 6) rect(g, 0, y, LROOM_W, 1, shade("#c99a64", -14));
  for (let y = 57; y < LROOM_H; y += 6) for (let x = (Math.floor(y / 6) % 2) * 10; x < LROOM_W; x += 20) rect(g, x, y, 1, 6, shade("#c99a64", -14));
  for (let y = 58; y < LROOM_H; y++) for (let x = 0; x < LROOM_W; x++) if (hash(x, y) > 0.985) px(g, x, y, shade("#c99a64", 12));
  // 가운데 카펫
  rect(g, 20, 62, 120, 54, "#7d4f66"); rect(g, 22, 64, 116, 50, "#9b6680");
  for (let x = 24; x < 136; x += 6) { px(g, x, 66, "#e6c8d6"); px(g, x + 3, 111, "#e6c8d6"); }

  // 책장 둘
  bookcase(g, 3, 4, 38, 50, 5);
  bookcase(g, 119, 4, 38, 50, 11);
  // 창: 둥근 아치, 낮밤에 따라 하늘색이 바뀐다
  const sky = phase === "night" ? "#2a3560" : phase === "dusk" ? "#f2a98a" : phase === "dawn" ? "#f4c9a8" : "#a9dcf5";
  rect(g, 66, 16, 28, 38, WOOD_D); disc(g, 79.5, 16, 14, 11, WOOD_D);          // 아치 창틀
  rect(g, 68, 16, 24, 38, sky); disc(g, 79.5, 16, 12, 9, sky);
  rect(g, 79, 6, 2, 48, WOOD_D); rect(g, 68, 32, 24, 2, WOOD_D);
  if (phase === "night") { for (const [x, y] of [[72, 20], [86, 24], [75, 40], [88, 44], [80, 12]]) px(g, x, y, "#fff6c0"); disc(g, 88, 22, 2.5, 2.5, "#f4ecc0"); }
  else { disc(g, 74, 22, 4, 2, "#ffffff"); disc(g, 86, 40, 5, 2, "#ffffff"); }
  rect(g, 63, 54, 34, 2, WOOD_L);
  // 창에서 들어오는 빛(바닥)
  if (phase !== "night") for (let i = 0; i < 4; i++) rect(g, 66 + i * 7, 58 + i, 5, 3, "#e6b87a");

  // 게시판(스터디 일정): 코르크 판에 종이와 핀
  rect(g, 44, 10, 20, 26, WOOD_D); rect(g, 45, 11, 18, 24, "#c9965e");
  for (let i = 0; i < 20; i++) px(g, 46 + (i * 7) % 16, 12 + (i * 5) % 22, "#b78450");
  const papers: [number, number, string][] = [[47, 13, "#fffdf2"], [55, 14, "#ffe58a"], [48, 22, "#cfe8ff"], [56, 24, "#ffd3de"]];
  for (const [x, y, c] of papers) { rect(g, x, y, 7, 8, c); rect(g, x + 1, y + 2, 5, 1, "#8a7a6a"); rect(g, x + 1, y + 4, 4, 1, "#8a7a6a"); px(g, x + 3, y, "#e0383f"); }
  // 칠판(공동 공부 목표)
  rect(g, 96, 10, 20, 26, "#5a3a22"); rect(g, 97, 11, 18, 24, "#2f5a48");
  rect(g, 99, 14, 12, 1, "#e8f2ea"); rect(g, 99, 18, 9, 1, "#e8f2ea"); rect(g, 99, 22, 11, 1, "#e8f2ea");
  rect(g, 99, 27, 5, 4, "#f2c64e"); px(g, 109, 30, "#e8f2ea"); rect(g, 97, 35, 18, 1, "#8a6a4a");
  rect(g, 100, 34, 4, 1, "#f6f6f6");
  // 회의용 노트북 탁자(벽 앞 낮은 탁자)
  rect(g, 44, 42, 22, 12, WOOD_D); rect(g, 44, 42, 22, 3, WOOD_L);
  rect(g, 49, 34, 11, 8, "#b9bdc7"); rect(g, 50, 35, 9, 6, "#5f8fd6"); rect(g, 51, 36, 3, 2, "#ffffff"); rect(g, 55, 36, 3, 3, "#f2c64e");
  rect(g, 48, 41, 13, 1, "#8e93a0");
  // 천장 등
  for (const x of [26, 80, 134]) { rect(g, x, 0, 1, 4, "#5a5568"); rect(g, x - 3, 4, 7, 2, "#f2c64e"); rect(g, x - 2, 3, 5, 1, "#fff0b0"); }
  return outline(g, "#3a2a33");
}

/** 도서관 긴 열람 탁자: 여럿이 나란히 앉는다. 위 윗면, 아래 앞면 널빤지와 다리 */
export function longTableGrid(w: number): Grid {
  const g = grid(w, 18);
  rect(g, 0, 0, w, 5, WOOD_L); rect(g, 0, 4, w, 1, WOOD);
  for (let x = 6; x < w - 4; x += 17) rect(g, x, 1, 7, 1, shade(WOOD_L, 14));   // 윗면 결
  rect(g, 1, 5, w - 2, 9, WOOD); rect(g, 1, 5, w - 2, 1, WOOD_D);
  for (let x = 3; x < w - 8; x += 20) { rect(g, x, 7, 17, 5, shade(WOOD, -14)); rect(g, x, 7, 17, 1, shade(WOOD, -30)); }
  rect(g, 1, 14, 5, 4, WOOD_D); rect(g, w - 6, 14, 5, 4, WOOD_D); rect(g, Math.floor(w / 2) - 2, 14, 5, 4, WOOD_D);
  return outline(g, "#3a2a33");
}

/** 자리마다 놓인 독서등(초록 갓) */
export function lampGrid(): Grid {
  const g = grid(8, 9);
  rect(g, 1, 0, 6, 3, "#2f8f4a"); rect(g, 1, 0, 6, 1, "#4fb868"); rect(g, 3, 3, 1, 4, "#c9a24e"); rect(g, 1, 7, 5, 2, "#8a6a2f");
  return outline(g, "#3a2a33");
}

/** 모래시계(11×17): 선반 모양 나무 뚜껑, 두 개의 기둥, 곡선 유리, 모래 더미와 흘러내리는 모래.
 *  sand 는 윗칸에 남은 모래 비율(1 = 막 뒤집음, 0 = 다 떨어짐). flip 1 = 옆으로 눕는 중간 모습 */
export function hourglassGrid(sand: number, flip = 0): Grid {
  const W = 11, H = 17, cx = 5;
  const g = grid(W, H);
  const wood = "#9a6a3e", woodL = "#c28b52", woodD = "#6e4a2a", gold = "#e0b04a";
  const glass = "#e6f5fa", glassD = "#b9d8e4", hi = "#ffffff";
  const sandC = "#f2c64e", sandL = "#ffe58a", sandD = "#d9992b";
  // 유리 반폭: 위칸(y 2~7)과 아래칸(y 9~14), 목(y 8)
  const up = [3, 4, 4, 3, 2, 1], down = [1, 2, 3, 4, 4, 3];
  rect(g, 1, 3, W - 2, 11, "#efe3c8");                                       // 기둥 사이 뒤쪽(유리 바깥) 바탕
  rect(g, 1, 3, 1, 11, "#d9c8a4"); rect(g, W - 2, 3, 1, 11, "#d9c8a4");
  const bulb = (y0: number, hw: number[]) => hw.forEach((h, i) => {
    rect(g, cx - h, y0 + i, h * 2 + 1, 1, glass);
    px(g, cx - h, y0 + i, glassD); px(g, cx + h, y0 + i, glassD);          // 유리 가장자리
    if (h >= 2) px(g, cx - h + 1, y0 + i, hi);                              // 왼쪽 반사광
  });
  bulb(2, up); px(g, cx, 8, glassD); bulb(9, down);
  // 모래: 아랫칸은 쌓인 더미, 윗칸은 남은 양
  const topRows = Math.round(sand * 6), botRows = Math.round((1 - sand) * 6);
  for (let i = 0; i < topRows; i++) {
    const y = 7 - i, h = up[5 - i];
    rect(g, cx - h + 1, y, Math.max(1, h * 2 - 1), 1, sandC);
    if (h >= 2) px(g, cx - h + 1, y, sandL);
  }
  for (let i = 0; i < botRows; i++) {
    const y = 14 - i, h = Math.max(0, down[5 - i] - 1 - Math.floor(Math.max(0, i - 3) * 1.0));
    const hw = Math.max(0, h - (i >= 3 ? i - 2 : 0));
    rect(g, cx - hw, y, hw * 2 + 1, 1, i === botRows - 1 ? sandL : sandC);
    if (hw >= 1) px(g, cx + hw, y, sandD);
  }
  if (sand > 0 && sand < 1) { px(g, cx, 8, sandC); for (let y = 9; y < 14 - botRows; y++) px(g, cx, y, sandL); }   // 흘러내리는 모래
  // 뚜껑·받침: 황동 띠를 두른 나무 판
  rect(g, 0, 0, W, 2, wood); rect(g, 0, 0, W, 1, woodL); px(g, 0, 0, woodD); px(g, W - 1, 0, woodD); rect(g, 1, 2, W - 2, 1, woodD);
  rect(g, 0, 15, W, 2, wood); rect(g, 0, 16, W, 1, woodD); rect(g, 0, 15, W, 1, woodL); rect(g, 1, 14, W - 2, 1, woodD);
  rect(g, 2, 1, W - 4, 1, gold);                                            // 윗판 황동 띠
  // 기둥 두 개
  rect(g, 0, 3, 1, 12, woodL); rect(g, W - 1, 3, 1, 12, wood); px(g, 0, 3, gold); px(g, W - 1, 3, gold); px(g, 0, 13, gold); px(g, W - 1, 13, gold);
  const up2 = outline(g, "#3a2a33");
  if (!flip) return up2;
  // 옆으로 눕는 모습: 90° 돌린다
  const r = grid(up2.h, up2.w);
  for (let y = 0; y < up2.h; y++) for (let x = 0; x < up2.w; x++) r.d[x * r.w + (up2.h - 1 - y)] = up2.d[y * up2.w + x];
  return r;
}
