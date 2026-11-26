import type { DayPhase } from "@/lib/time";
import { disc, grid, hash, outline, px, rect, rng, shade, stamp, type Grid } from "./core";

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
  const top = "#7a4a2a", topL = "#93603a", front = "#5e3a22", frontD = "#47291a";                  // 짙은 호두나무색: 원목 마루 위에서 또렷하다
  rect(g, 0, 0, w, 5, top); rect(g, 0, 0, w, 1, topL); rect(g, 0, 4, w, 1, front);
  for (let x = 6; x < w - 4; x += 17) rect(g, x, 1, 7, 1, topL);                                  // 윗면 결
  rect(g, 1, 5, w - 2, 9, front); rect(g, 1, 5, w - 2, 1, frontD);
  for (let x = 3; x < w - 8; x += 20) { rect(g, x, 7, 17, 5, frontD); rect(g, x, 7, 17, 1, "#33200f"); }
  rect(g, 1, 14, 5, 4, frontD); rect(g, w - 6, 14, 5, 4, frontD); rect(g, Math.floor(w / 2) - 2, 14, 5, 4, frontD);
  return outline(g, "#3a2a33");
}

/** 1인 책상(36×18): 짙은 호두색 상판과 서랍 하나, 양쪽 다리 */
export function deskGrid(): Grid {
  const g = grid(DESK_W, 18);
  const top = "#7a4a2a", topL = "#93603a", front = "#5e3a22", frontD = "#47291a";
  rect(g, 0, 0, DESK_W, 5, top); rect(g, 0, 0, DESK_W, 1, topL); rect(g, 0, 4, DESK_W, 1, front);
  rect(g, 1, 5, DESK_W - 2, 9, front); rect(g, 1, 5, DESK_W - 2, 1, frontD);
  rect(g, 9, 7, 18, 5, frontD); rect(g, 9, 7, 18, 1, "#33200f"); rect(g, 17, 9, 2, 1, "#e8c870");   // 서랍
  rect(g, 1, 14, 4, 4, frontD); rect(g, DESK_W - 5, 14, 4, 4, frontD);
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
export const HALL_H = 150;

/** 웅장한 도서관 홀: 높은 천장의 들보와 샹들리에, 가운데 큰 벽시계, 왼쪽 2층 책장과 오른쪽 큰 게시판,
 *  체크무늬 대리석 바닥과 붉은 카펫. 앞쪽(y 100~)은 열람 탁자를 놓는 자리다. */
export type HallTheme = "tan" | "green" | "navy" | "sage" | "cream" | "slate" | "mint";
const HALL_THEMES: Record<HallTheme, { stone: string; stoneD: string; stoneL: string; floorA: string; floorB: string }> = {
  tan: { stone: "#d8c4a2", stoneD: "#b59f7c", stoneL: "#ecdcbc", floorA: "#b9a888", floorB: "#eadfc8" },
  green: { stone: "#4a7a5e", stoneD: "#3a6249", stoneL: "#efe4c8", floorA: "#7d9a82", floorB: "#efe6d0" },
  navy: { stone: "#44558a", stoneD: "#35446e", stoneL: "#efe4c8", floorA: "#9aa3c4", floorB: "#f2eadb" },
  sage: { stone: "#e6ecdc", stoneD: "#cdd8c0", stoneL: "#fbf6e6", floorA: "#b7c8a8", floorB: "#f3ead2" },
  cream: { stone: "#f1e6cb", stoneD: "#e0d2b0", stoneL: "#fffaf0", floorA: "#b9a888", floorB: "#eadfc8" },
  mint: { stone: "#dcefe4", stoneD: "#c3ddd0", stoneL: "#f9f6ea", floorA: "#b9c9bf", floorB: "#eef2e8" },
  slate: { stone: "#8fa3b8", stoneD: "#7b90a6", stoneL: "#f3ecdc", floorA: "#9aa3c4", floorB: "#f2eadb" },
};
export type HallFloor = "checker" | "wood" | "stone" | "carpet";
export type HallCarpet = "red" | "green" | "none";
export function libraryHall(phase: DayPhase, medals = 0, theme: HallTheme = "tan", floor: HallFloor = "checker", carpet: HallCarpet = "red", floorColor = "#6f7f93"): Grid {
  const g = grid(HALL_W, HALL_H);
  const { stone, stoneD, stoneL, floorA, floorB } = HALL_THEMES[theme];
  rect(g, 0, 0, HALL_W, 84, stone);
  for (let y = 0; y < 84; y += 6) for (let x = (Math.floor(y / 6) % 2) * 6; x < HALL_W; x += 12) px(g, x, y, stoneD);    // 벽돌 결
  // 천장 들보
  rect(g, 0, 0, HALL_W, 9, "#4a2f1c"); rect(g, 0, 7, HALL_W, 2, "#2f1d10");
  for (let x = 6; x < HALL_W; x += 22) { rect(g, x, 0, 4, 9, "#6e4a2a"); rect(g, x, 0, 1, 9, "#8a6038"); }
  // 가운데 벽시계: 깔끔한 하얀 둥근 시계(바늘은 화면에서 실제 시각으로 그린다)
  const face = phase === "night" ? "#f6f1e0" : "#ffffff";
  disc(g, 100, 30, 11, 11, face);                                                               // 테두리 없이 하얀 둥근 시계만
  // 양옆 2층 책장과 난간
  bookcase(g, 4, 14, 56, 30, 21); bookcase(g, 4, 48, 56, 34, 22);
  // 오른쪽: 큰 게시판(공동 공부 목표를 써 붙인다. 글씨는 화면 위에 겹쳐 쓴다)
  rect(g, 140, 14, 56, 68, "#5a3a22"); rect(g, 142, 16, 52, 64, "#c9965e");
  for (let i = 0; i < 160; i++) px(g, 143 + (i * 13) % 50, 17 + (i * 29) % 62, hash(i, 3) > 0.5 ? "#b78450" : "#d9aa78");
  rect(g, 145, 18, 46, 10, "#5a3a22"); rect(g, 146, 19, 44, 8, "#7a5230"); rect(g, 146, 19, 44, 1, "#c9a24e"); rect(g, 146, 26, 44, 1, "#c9a24e");   // 윗머리판
  for (const [x, y] of [[144, 18], [192, 18], [144, 78], [192, 78]]) { px(g, x, y, "#e0383f"); px(g, x + 1, y, "#ff8a8a"); }
  for (const x0 of [4]) {
    rect(g, x0, 44, 56, 4, "#6e4a2a"); rect(g, x0, 44, 56, 1, WOOD_L);                    // 2층 바닥판과 난간
    for (let x = x0 + 2; x < x0 + 56; x += 5) rect(g, x, 40, 1, 4, "#c9a24e");
    rect(g, x0, 39, 56, 1, WOOD_L);
  }
  // 기둥(책장 구획)
  for (const x of [4, 22, 41, 59, 140, 195]) { rect(g, x - 1, 14, 3, 68, stoneL); rect(g, x + 1, 14, 1, 68, stoneD); rect(g, x - 2, 12, 5, 3, stoneL); rect(g, x - 2, 80, 5, 3, stoneL); }
  // 굴러다니는 사다리
  rect(g, 30, 50, 1, 34, "#8a5a32"); rect(g, 35, 50, 1, 34, "#8a5a32"); for (let y = 54; y < 82; y += 5) rect(g, 30, y, 6, 1, "#c28b52");
  // 스터디 일정 게시판(시계 왼쪽 벽)
  rect(g, 63, 28, 15, 22, WOOD_D); rect(g, 64, 29, 13, 20, "#c9965e");
  for (const [x, y, c] of [[65, 31, "#fffdf2"], [71, 31, "#ffe58a"], [65, 39, "#cfe8ff"], [71, 40, "#ffd3de"]] as [number, number, string][]) { rect(g, x, y, 5, 6, c); px(g, x + 2, y, "#e0383f"); rect(g, x + 1, y + 2, 3, 1, "#8a7a6a"); }
  // 샹들리에
  for (const [cx, cy, w] of [[40, 8, 8], [160, 8, 8]] as [number, number, number][]) {
    rect(g, cx, 7, 1, cy - 7 + 2, "#3a2a33"); rect(g, cx - w / 2, cy + 2, w, 2, "#c9a24e"); rect(g, cx - w / 2 + 1, cy + 4, w - 2, 1, "#8a6a2f");
    for (let x = cx - w / 2 + 1; x < cx + w / 2; x += 3) { rect(g, x, cy - 1, 1, 3, "#fff6c0"); px(g, x, cy - 2, "#ffd65c"); }
  }
  // 바닥: 체크무늬 대리석 / 원목 마루 / 단색 석재
  if (floor === "checker") {
    for (let y = 84; y < HALL_H; y += 6) for (let x = 0; x < HALL_W; x += 12) rect(g, x, y, 12, 6, (x / 12 + (y - 84) / 6) % 2 === 0 ? floorA : floorB);
  } else if (floor === "wood") {
    const tones = ["#b98552", "#c18f5a", "#b07c4a", "#c9965f"];
    for (let y = 84, row = 0; y < HALL_H; y += 7, row++) {
      let x = -((row * 23) % 41);
      while (x < HALL_W) {
        const w = 34 + ((row * 7 + x) % 3) * 8, t = tones[Math.abs(row * 3 + Math.floor(x / 40)) % tones.length];
        rect(g, x, y, w, 7, t); rect(g, x, y, w, 1, shade(t, 14)); rect(g, x, y + 6, w, 1, shade(t, -26)); rect(g, x + w - 1, y, 1, 7, shade(t, -26));
        for (let k = 0; k < 3; k++) px(g, x + 4 + ((k * 13 + row * 5) % (w - 6)), y + 2 + (k % 3), shade(t, -10));   // 나뭇결
        x += w;
      }
    }
  } else if (floor === "carpet") {
    // 바닥 전체에 깐 카펫: 짜임 무늬가 은은하게 보인다
    rect(g, 0, 84, HALL_W, HALL_H - 84, floorColor);
    for (let y = 84; y < HALL_H; y++) for (let x = 0; x < HALL_W; x++) {
      if ((x + y * 2) % 4 === 0) px(g, x, y, shade(floorColor, 9));
      else if ((x * 2 + y) % 7 === 0) px(g, x, y, shade(floorColor, -9));
    }
  } else {
    rect(g, 0, 84, HALL_W, HALL_H - 84, "#e8dfca");
    for (let y = 84; y < HALL_H; y += 12) rect(g, 0, y, HALL_W, 1, "#d3c8ae");
    for (let y = 84, row = 0; y < HALL_H; y += 12, row++) for (let x = (row % 2) * 20; x < HALL_W; x += 40) rect(g, x, y, 1, 12, "#d3c8ae");
  }
  rect(g, 0, 83, HALL_W, 2, "#7a5a3a");
  // 카펫(아래로 갈수록 넓어짐)
  if (carpet !== "none") {
    const base = carpet === "red" ? "#a8303c" : "#3f6b52", dark = carpet === "red" ? "#8a2230" : "#325643", trim = "#e8c870";
    for (let y = 85; y < HALL_H; y++) {
      const hw = 12 + Math.floor((y - 85) * 0.16);
      rect(g, 100 - hw, y, hw * 2, 1, base); px(g, 100 - hw, y, trim); px(g, 100 + hw - 1, y, trim); px(g, 100 - hw + 2, y, trim); px(g, 100 + hw - 3, y, trim);
      if (y % 6 === 0) rect(g, 100 - hw + 4, y, hw * 2 - 8, 1, dark);
    }
  }
  // 노트북을 올린 낮은 탁자: 다리가 마룻바닥에 닿는다(앉은 사람 앞줄에 가려져도 괜찮다)
  rect(g, 63, 64, 26, 3, WOOD_L); rect(g, 63, 67, 26, 3, WOOD_D);
  rect(g, 65, 70, 3, 14, WOOD_D); rect(g, 84, 70, 3, 14, WOOD_D); rect(g, 65, 70, 3, 1, "#47291a"); rect(g, 84, 70, 3, 1, "#47291a");
  rect(g, 62, 84, 28, 2, "#3a2a3338");                                                         // 바닥에 지는 그림자
  rect(g, 68, 53, 16, 11, "#b9bdc7"); rect(g, 69, 54, 14, 9, "#5f8fd6"); rect(g, 71, 56, 5, 2, "#ffffff"); rect(g, 77, 56, 4, 4, "#f2c64e"); rect(g, 71, 60, 9, 1, "#cfe0ff");
  rect(g, 66, 63, 20, 1, "#9aa0ad");
  stamp(g, cabinetGrid(medals), 118, 52);                                    // 기념 장식장(오른쪽 게시판 옆, 바닥에 선다)
  rect(g, 117, 84, 22, 2, "#3a2a3338");
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

// ───────── 열람 탁자의 자리: 캐릭터와 책상 위 물건 ─────────
/** 열람 탁자는 두 줄: 뒤줄(벽 쪽)과 앞줄에 길게 놓이고, 줄마다 3자리가 있다. 집 번호(0~5)가 곧 자리 번호 */
export const DESK_W = 36;
export const HALL_TABLE_YS = [88, 126] as const;
/** 한 사람에 책상 하나(라운지형 열람석): 뒷줄 3개와, 그 사이사이에 놓인 앞줄 3개. 집 번호(0~5)가 곧 자리 번호 */
export const seatPos = (slot: number) => ({ cx: (slot < 3 ? 35 : 62) + 55 * (slot % 3), ty: HALL_TABLE_YS[slot < 3 ? 0 : 1] });
export type SeatState = "empty" | "seated" | "study" | "done";

const SKIN = "#f6cba6";
/** 앉은 캐릭터(탁자 뒤에 가려지도록 탁자보다 먼저 그린다). 공부 중엔 고개를 숙이고 가끔 더 숙인다 */
export function drawSeatPerson(b: CanvasRenderingContext2D, cx: number, ty: number, avatar: CanvasImageSource, st: SeatState, tick: number) {
  const dy = st === "study" ? 1 + (Math.floor(tick / 40) % 5 === 0 ? 1 : 0) : st === "done" ? -1 : 0;
  b.drawImage(avatar, cx - 12, ty - 22 + dy);
}

/** 탁자 위 물건과 팔·책·펜·독서등·모래시계(탁자 위에 놓인 것은 탁자보다 나중에 그린다) */
export function drawSeatObjects(b: CanvasRenderingContext2D, cx: number, ty: number, st: SeatState, tick: number, lamp: { off: CanvasImageSource; on: CanvasImageSource }) {
  const person = st !== "empty";
  if (st === "done") { b.fillStyle = SKIN; b.fillRect(cx - 14, ty - 28, 3, 12); b.fillRect(cx + 11, ty - 28, 3, 12); b.fillStyle = "#3a2a33"; b.fillRect(cx - 15, ty - 29, 1, 14); b.fillRect(cx + 14, ty - 29, 1, 14); }   // 기지개
  if (st === "study") {
    b.fillStyle = "#3a2a33"; b.fillRect(cx - 9, ty - 1, 19, 4);                                   // 펼친 책
    b.fillStyle = "#fff8e4"; b.fillRect(cx - 8, ty - 1, 8, 3); b.fillRect(cx + 1, ty - 1, 8, 3);
    b.fillStyle = "#d8c9a8"; for (const x of [cx - 7, cx - 6, cx + 2, cx + 3]) b.fillRect(x, ty, 3, 1);
    b.fillStyle = SKIN; b.fillRect(cx - 7, ty - 3, 3, 2); b.fillRect(cx + 5, ty - 3, 3, 2);       // 책을 짚은 두 손
    const pen = Math.floor(tick / 8) % 2; b.fillStyle = "#3a5fa8"; b.fillRect(cx + 5 + pen, ty - 4 + pen, 2, 1); b.fillRect(cx + 6 + pen, ty - 5 + pen, 1, 1);   // 글씨 쓰는 펜
  } else if (person) { b.fillStyle = "#c0504d"; b.fillRect(cx - 5, ty, 9, 2); b.fillStyle = "#fff8e4"; b.fillRect(cx - 4, ty - 1, 7, 1); }   // 닫힌 책
  const lit = st === "study";
  if (person) b.drawImage(lit ? lamp.on : lamp.off, cx + 9, ty - 6);
  if (lit) { const gr = b.createRadialGradient(cx + 13, ty - 3, 1, cx + 13, ty - 3, 20); gr.addColorStop(0, "rgb(255 226 140 / .5)"); gr.addColorStop(1, "rgb(255 226 140 / 0)"); b.fillStyle = gr; b.fillRect(cx - 7, ty - 25, 44, 34); }
}

/** 기념 장식장(홀에 놓인 모습, 20×32): 유리문 안 벨벳 판에 끈 달린 메달이 걸린다. medals 는 0~9 */
export function cabinetGrid(medals: number): Grid {
  const g = grid(20, 32);
  rect(g, 0, 0, 20, 32, WOOD_D); rect(g, 0, 0, 20, 2, WOOD_L); rect(g, 1, 2, 18, 1, WOOD);
  rect(g, 2, 4, 16, 25, "#4a2430");
  const cols = ["#d9303a", "#2f6fd0", "#2f9a5a", "#8a5ac8", "#e8902a"];
  for (let r = 0; r < 3; r++) {
    const y = 4 + r * 8;
    rect(g, 2, y, 16, 1, "#c9a24e");                                                              // 걸이 봉
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c, x = 5 + c * 5;
      if (idx < medals) { px(g, x, y + 1, cols[idx % 5]); px(g, x, y + 2, cols[idx % 5]); disc(g, x, y + 5, 1.6, 1.6, "#f2c744"); px(g, x - 1, y + 4, "#fff0a8"); }
      else px(g, x, y + 1, "#6a3a46");
    }
  }
  rect(g, 15, 5, 2, 22, "#7a4a60");                                                            // 유리에 비친 은은한 빛줄기
  rect(g, 8, 29, 4, 1, "#c9a24e"); rect(g, 2, 30, 16, 2, WOOD);
  return g;
}

const RIBBONS: [string, string][] = [["#d9303a", "#a82430"], ["#2f6fd0", "#1f4f9a"], ["#2f9a5a", "#1f7040"], ["#8a5ac8", "#6a3aa0"], ["#e8902a", "#c06a14"]];
/** 끈 달린 메달(18×28): 위쪽은 V자로 모인 리본, 아래는 책 무늬가 새겨진 금메달 */
export function medalGrid(i: number): Grid {
  const g = grid(18, 28);
  const [r, rd] = RIBBONS[i % RIBBONS.length];
  // 리본: 위가 넓고 아래로 모이는 두 가닥
  for (let y = 0; y < 11; y++) { const half = Math.max(1, 5 - Math.floor(y / 3)); rect(g, 9 - half - 1, y, 3, 1, r); rect(g, 9 + half - 2, y, 3, 1, rd); }
  rect(g, 7, 10, 4, 2, rd); rect(g, 8, 10, 2, 1, r);
  // 고리
  disc(g, 9, 12, 2, 2, "#c9a24e"); px(g, 9, 12, null);
  // 메달
  disc(g, 9, 20, 8, 8, "#b8821f"); disc(g, 9, 20, 7.2, 7.2, "#f2c744"); disc(g, 9, 20, 5.6, 5.6, "#e0a92c"); disc(g, 8.5, 19.5, 5.2, 5.2, "#f8d968");
  for (let k = 0; k < 16; k++) { const t = (k / 16) * Math.PI * 2; px(g, Math.round(9 + Math.cos(t) * 7.6), Math.round(20 + Math.sin(t) * 7.6), "#fff0a8"); }
  rect(g, 5, 18, 4, 5, "#b8821f"); rect(g, 9, 18, 4, 5, "#b8821f"); rect(g, 6, 18, 3, 4, "#fff3b8"); rect(g, 9, 18, 3, 4, "#ffe58a"); rect(g, 8, 17, 2, 6, "#8a5f14");   // 펼친 책
  px(g, 4, 15, "#ffffff"); px(g, 5, 14, "#fffbe0");
  return outline(g, "#6b4a10");
}

/** 장식장 안쪽(눌렀을 때 열리는 진열 화면, 128×100): 벨벳을 댄 판에 걸쇠를 박고 끈 달린 메달을 걸어 둔다 */
export function cabinetInterior(medals: number, sel = -1): Grid {
  const W = 128, H = 100, g = grid(W, H);
  rect(g, 0, 0, W, H, WOOD_D); rect(g, 0, 0, W, 3, WOOD_L); rect(g, 1, 3, W - 2, 1, WOOD);
  rect(g, 5, 7, W - 10, H - 14, "#4a2430");
  for (let y = 7; y < H - 7; y++) for (let x = 5; x < W - 5; x++) if ((x + y) % 4 === 0) px(g, x, y, "#5a303c");   // 벨벳 결
  const PER = 5;
  for (let r = 0; r < 3; r++) {
    const top = 10 + r * 30;
    rect(g, 7, top, W - 14, 2, "#c9a24e"); rect(g, 7, top, W - 14, 1, "#f0d27a");                    // 걸이 봉
    for (let c = 0; c < PER; c++) {
      const idx = r * PER + c, cx = 16 + c * 24;
      px(g, cx, top + 2, "#c9a24e");
      if (idx < medals) {
        stamp(g, medalGrid(idx), cx - 9, top + 1);
        if (idx === sel) for (let a = 0; a < 24; a++) { const t = (a / 24) * Math.PI * 2; px(g, Math.round(cx + Math.cos(t) * 11), Math.round(top + 21 + Math.sin(t) * 11), "#fff6c0"); }
      } else {
        rect(g, cx - 1, top + 3, 3, 6, "#6a3a46"); disc(g, cx, top + 19, 6, 6, "#42202b");            // 빈 자리 걸쇠
        disc(g, cx, top + 19, 5, 5, "#4a2430");
      }
    }
  }
  for (let i = 0; i < 6; i++) rect(g, 18 + i * 18, 4, 6, 2, "#fff0b0");                              // 위 조명
  return outline(g, "#3a2a33");
}

/** 도서관 홀의 지금 모습(벽 색·바닥·카펫) */
export const HALL_LOOK: { theme: HallTheme; floor: HallFloor; carpet: HallCarpet; floorColor?: string } = { theme: "mint", floor: "stone", carpet: "none" };

/** 밤에 켜진 독서등의 따뜻한 빛(어두워진 홀 위에 덧칠한다) */
export function drawLampGlow(b: CanvasRenderingContext2D, cx: number, ty: number, alpha: number) {
  b.globalCompositeOperation = "lighter";
  const gr = b.createRadialGradient(cx + 13, ty - 4, 1, cx + 13, ty - 4, 30);
  gr.addColorStop(0, `rgb(255 214 120 / ${alpha})`); gr.addColorStop(1, "rgb(255 214 120 / 0)");
  b.fillStyle = gr; b.fillRect(cx - 20, ty - 36, 66, 60);
  b.globalCompositeOperation = "source-over";
}
