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
export function lampGrid(lit = false): Grid {
  const g = grid(8, 9);
  rect(g, 1, 0, 6, 3, lit ? "#3fae5e" : "#2f8f4a"); rect(g, 1, 0, 6, 1, "#4fb868");
  if (lit) { rect(g, 2, 3, 4, 1, "#fff3b0"); px(g, 3, 3, "#ffffff"); } rect(g, 3, 3, 1, 4, "#c9a24e"); rect(g, 1, 7, 5, 2, "#8a6a2f");
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

export const HALL_W = 200;
export const HALL_H = 140;

/** 웅장한 도서관 홀: 높은 천장의 들보와 샹들리에, 가운데 스테인드글라스 아치 창, 양옆 2층 책장과 난간,
 *  체크무늬 대리석 바닥과 붉은 카펫. 앞쪽(y 100~)은 열람 탁자를 놓는 자리다. */
export function libraryHall(phase: DayPhase): Grid {
  const g = grid(HALL_W, HALL_H);
  const stone = "#d8c4a2", stoneD = "#b59f7c", stoneL = "#ecdcbc";
  rect(g, 0, 0, HALL_W, 84, stone);
  for (let y = 0; y < 84; y += 6) for (let x = (Math.floor(y / 6) % 2) * 6; x < HALL_W; x += 12) px(g, x, y, stoneD);    // 벽돌 결
  // 천장 들보
  rect(g, 0, 0, HALL_W, 9, "#4a2f1c"); rect(g, 0, 7, HALL_W, 2, "#2f1d10");
  for (let x = 6; x < HALL_W; x += 22) { rect(g, x, 0, 4, 9, "#6e4a2a"); rect(g, x, 0, 1, 9, "#8a6038"); }
  // 가운데 아치 창(스테인드글라스)
  const sky = phase === "night" ? "#243060" : phase === "dusk" ? "#e88a6a" : "#7ec4ec";
  rect(g, 82, 22, 36, 62, "#5a3a22"); disc(g, 100, 22, 18, 14, "#5a3a22");
  rect(g, 85, 22, 30, 62, sky); disc(g, 100, 22, 15, 11, sky);
  const panes = ["#e0605a", "#f2c64e", "#5f8fd6", "#62b866", "#b08ae0"];
  for (let py = 10; py < 80; py += 7) for (let pxx = 85; pxx < 115; pxx += 6) {
    const dx = pxx + 3 - 100, dy = py - 22;
    if (py < 22 && (dx * dx) / 225 + (dy * dy) / 121 > 1) continue;
    if (phase === "night" ? hash(pxx, py) > 0.8 : (py > 40 && py < 64) || hash(pxx, py) > 0.55) rect(g, pxx, py, 5, 6, shade(panes[Math.floor(hash(pxx + 3, py + 1) * 5)], phase === "night" ? -50 : 0));
  }
  rect(g, 99, 8, 2, 76, "#5a3a22"); for (let y = 30; y < 84; y += 14) rect(g, 85, y, 30, 2, "#5a3a22");
  rect(g, 80, 82, 40, 3, stoneL);
  // 양옆 2층 책장과 난간
  bookcase(g, 4, 14, 56, 30, 21); bookcase(g, 4, 48, 56, 34, 22);
  bookcase(g, 140, 14, 56, 30, 31); bookcase(g, 140, 48, 56, 34, 32);
  for (const x0 of [4, 140]) {
    rect(g, x0, 44, 56, 4, "#6e4a2a"); rect(g, x0, 44, 56, 1, WOOD_L);                    // 2층 바닥판과 난간
    for (let x = x0 + 2; x < x0 + 56; x += 5) rect(g, x, 40, 1, 4, "#c9a24e");
    rect(g, x0, 39, 56, 1, WOOD_L);
  }
  // 기둥(책장 구획)
  for (const x of [4, 22, 41, 59, 140, 158, 177, 195]) { rect(g, x - 1, 14, 3, 68, stoneL); rect(g, x + 1, 14, 1, 68, stoneD); rect(g, x - 2, 12, 5, 3, stoneL); rect(g, x - 2, 80, 5, 3, stoneL); }
  // 굴러다니는 사다리
  rect(g, 30, 50, 1, 34, "#8a5a32"); rect(g, 35, 50, 1, 34, "#8a5a32"); for (let y = 54; y < 82; y += 5) rect(g, 30, y, 6, 1, "#c28b52");
  // 게시판(왼쪽)·칠판(오른쪽): 창 양옆 벽에
  rect(g, 63, 28, 15, 22, WOOD_D); rect(g, 64, 29, 13, 20, "#c9965e");
  for (const [x, y, c] of [[65, 31, "#fffdf2"], [71, 31, "#ffe58a"], [65, 39, "#cfe8ff"], [71, 40, "#ffd3de"]] as [number, number, string][]) { rect(g, x, y, 5, 6, c); px(g, x + 2, y, "#e0383f"); rect(g, x + 1, y + 2, 3, 1, "#8a7a6a"); }
  rect(g, 122, 28, 15, 22, "#5a3a22"); rect(g, 123, 29, 13, 20, "#2f5a48");
  rect(g, 125, 32, 9, 1, "#e8f2ea"); rect(g, 125, 36, 7, 1, "#e8f2ea"); rect(g, 125, 40, 8, 1, "#e8f2ea"); rect(g, 125, 44, 4, 3, "#f2c64e");
  // 샹들리에
  for (const [cx, cy, w] of [[100, 10, 14], [40, 8, 8], [160, 8, 8]] as [number, number, number][]) {
    rect(g, cx, 7, 1, cy - 7 + 2, "#3a2a33"); rect(g, cx - w / 2, cy + 2, w, 2, "#c9a24e"); rect(g, cx - w / 2 + 1, cy + 4, w - 2, 1, "#8a6a2f");
    for (let x = cx - w / 2 + 1; x < cx + w / 2; x += 3) { rect(g, x, cy - 1, 1, 3, "#fff6c0"); px(g, x, cy - 2, "#ffd65c"); }
  }
  // 마룻바닥: 체크무늬 대리석
  for (let y = 84; y < HALL_H; y += 6) for (let x = 0; x < HALL_W; x += 12) {
    const dark = (x / 12 + (y - 84) / 6) % 2 === 0;
    rect(g, x, y, 12, 6, dark ? "#b9a888" : "#eadfc8");
  }
  rect(g, 0, 83, HALL_W, 2, "#7a5a3a");
  // 붉은 카펫(아래로 갈수록 넓어짐)
  for (let y = 85; y < HALL_H; y++) {
    const hw = 12 + Math.floor((y - 85) * 0.16);
    rect(g, 100 - hw, y, hw * 2, 1, "#a8303c"); px(g, 100 - hw, y, "#e8c870"); px(g, 100 + hw - 1, y, "#e8c870"); px(g, 100 - hw + 2, y, "#e8c870"); px(g, 100 + hw - 3, y, "#e8c870");
    if (y % 6 === 0) rect(g, 100 - hw + 4, y, hw * 2 - 8, 1, "#8a2230");
  }
  // 창빛이 바닥에 비친다
  if (phase !== "night") for (let i = 0; i < 5; i++) rect(g, 86 + i * 6, 88 + i * 3, 4, 4, "rgb(255 240 200)".replace("rgb(255 240 200)", "#fff0c8"));
  // 회의용 노트북 탁자(왼쪽 안쪽)와 지구본(오른쪽)
  rect(g, 63, 68, 18, 14, WOOD_D); rect(g, 63, 68, 18, 3, WOOD_L); rect(g, 67, 60, 10, 8, "#b9bdc7"); rect(g, 68, 61, 8, 6, "#5f8fd6"); rect(g, 69, 62, 3, 2, "#fff"); rect(g, 73, 62, 2, 3, "#f2c64e");
  rect(g, 123, 70, 2, 12, "#8a5a32"); disc(g, 124, 66, 6, 6, "#4a8ac0"); disc(g, 122, 65, 2.5, 2, "#62b866"); disc(g, 127, 68, 2, 2, "#62b866"); rect(g, 119, 66, 11, 1, "#c9a24e");
  return outline(g, "#3a2a33");
}

/** 작은 모래시계(7×9): 홀에서 책상 위에 올릴 때 쓰는 작은 크기 */
export function hourglassSmall(sand: number, flip = 0): Grid {
  const W = 7, H = 9, cx = 3;
  const g = grid(W, H);
  const wood = "#9a6a3e", woodL = "#c28b52", glass = "#e6f5fa", sandC = "#f2c64e", sandL = "#ffe58a";
  rect(g, 1, 1, 5, 7, "#efe3c8");
  const up = [2, 2, 1], down = [1, 2, 2];
  up.forEach((h, i) => rect(g, cx - h, 1 + i, h * 2 + 1, 1, glass));
  down.forEach((h, i) => rect(g, cx - h, 5 + i, h * 2 + 1, 1, glass));
  px(g, cx, 4, glass); px(g, 1, 1, "#ffffff");
  const top = Math.round(sand * 3), bot = Math.round((1 - sand) * 3);
  for (let i = 0; i < top; i++) { const h = up[2 - i]; rect(g, cx - h + 1 - (h === 1 ? 1 : 0), 3 - i, Math.max(1, h * 2 - 1 + (h === 1 ? 2 : 0)), 1, i === top - 1 ? sandL : sandC); }
  for (let i = 0; i < bot; i++) { const y = 7 - i, h = Math.max(0, down[2 - i] - (i === 2 ? 1 : 0)); rect(g, cx - h, y, h * 2 + 1, 1, i === bot - 1 ? sandL : sandC); }
  if (sand > 0 && sand < 1) { px(g, cx, 4, sandC); }
  rect(g, 0, 0, W, 1, woodL); rect(g, 0, 8, W, 1, wood); rect(g, 0, 1, 1, 7, woodL); rect(g, W - 1, 1, 1, 7, wood);
  const o = outline(g, "#3a2a33");
  if (!flip) return o;
  const r = grid(o.h, o.w);
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) r.d[x * r.w + (o.h - 1 - y)] = o.d[y * o.w + x];
  return r;
}
