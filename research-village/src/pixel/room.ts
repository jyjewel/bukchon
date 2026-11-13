import type { DayPhase } from "@/lib/time";
import type { Avatar, LabStyle } from "@/lib/types";
import { ACHIEVEMENT_KINDS } from "@/lib/constants";
import { DEFAULT_LAB_STYLE } from "@/lib/labStyle";
import { avatarGrid } from "./avatar";
import { disc, grid, hash, outline, px, rect, rng, shade, stamp, type Grid } from "./core";

export const ROOM_W = 144;
export const ROOM_H = 84;
const WOOD = "#b98552", WOOD_D = "#8e5f3b", WOOD_L = "#dcaa72";

/** 연구실 내부. 꾸미기 설정(style)이 벽지·바닥·커튼·러그·창밖 풍경·반려동물·소품에 쓰인다. */
export function roomGrid(opts: { slot: number; avatar: Avatar; inside: boolean; studying: boolean; phase: DayPhase; frame: number; boardCount: number; postitColors: string[]; shelf: string[]; style?: LabStyle }): Grid {
  const st = opts.style ?? DEFAULT_LAB_STYLE;
  const wall = st.wall;
  const accent = st.accent; // 커튼·러그 색
  const g = grid(ROOM_W, ROOM_H);
  const r = rng(opts.slot + 3);

  // 벽지
  rect(g, 0, 0, ROOM_W, 54, wall);
  if (st.pattern === "stripe") {
    for (let x = 4; x < ROOM_W; x += 8) rect(g, x, 0, 2, 44, shade(wall, 10));
    for (let x = 0; x < ROOM_W; x += 8) for (let y = 5; y < 42; y += 10) px(g, x + (y % 20 ? 0 : 4), y, shade(wall, -22));
  } else if (st.pattern === "dots") {
    for (let y = 4; y < 42; y += 8) for (let x = (y % 16 ? 0 : 4); x < ROOM_W; x += 8) { px(g, x, y, shade(wall, -26)); px(g, x + 1, y, shade(wall, -26)); px(g, x, y + 1, shade(wall, -26)); px(g, x + 1, y + 1, shade(wall, -26)); }
  } else if (st.pattern === "check") {
    for (let y = 0; y < 43; y += 6) for (let x = 0; x < ROOM_W; x += 6) if (((x / 6) + (y / 6)) % 2 === 0) rect(g, x, y, 6, Math.min(6, 43 - y), shade(wall, -9));
  }
  rect(g, 0, 43, ROOM_W, 1, shade(wall, -40));
  rect(g, 0, 44, ROOM_W, 10, WOOD_L);
  for (let x = 0; x < ROOM_W; x += 9) rect(g, x, 45, 1, 8, WOOD);
  rect(g, 0, 52, ROOM_W, 2, WOOD_D);
  // 바닥
  if (st.floor === "tile") {
    rect(g, 0, 54, ROOM_W, 30, "#f0ece2");
    for (let y = 54; y < ROOM_H; y += 7) for (let x = 0; x < ROOM_W; x += 14) if (((x / 14) + ((y - 54) / 7)) % 2 === 0) rect(g, x, y, 14, 7, "#e2ddcf");
    for (let y = 54; y < ROOM_H; y += 7) rect(g, 0, y, ROOM_W, 1, "#cfc9b8");
    for (let x = 0; x < ROOM_W; x += 14) rect(g, x, 54, 1, 30, "#cfc9b8");
  } else if (st.floor === "jangpan") {
    // 온돌 장판: 누르스름한 장판지, 긴 이음선과 은은한 윤기
    rect(g, 0, 54, ROOM_W, 30, "#dcae55");
    for (let x = 0; x < ROOM_W; x += 24) { rect(g, x, 54, 1, 30, "#b98a36"); rect(g, x + 1, 54, 1, 30, "#e9c680"); }
    for (let y = 58; y < ROOM_H; y += 9) for (let x = (y % 18 ? 6 : 14); x < ROOM_W; x += 24) { rect(g, x, y, 5, 1, "#e9c680"); }
    for (let i = 0; i < 30; i++) px(g, Math.floor(r() * ROOM_W), 55 + Math.floor(r() * 28), "#cf9f48");
  } else {
    const dark = st.floor === "dark";
    const base = dark ? "#a87850" : "#dfb57f", line = dark ? "#8a5f3c" : "#c79a63", speck = dark ? "#b98a5e" : "#ecc892";
    rect(g, 0, 54, ROOM_W, 30, base);
    for (let y = 54; y < ROOM_H; y += 6) {
      rect(g, 0, y, ROOM_W, 1, line);
      for (let x = (y % 12 ? 10 : 0); x < ROOM_W; x += 22) rect(g, x, y, 1, 6, line);
    }
    for (let i = 0; i < 40; i++) px(g, Math.floor(r() * ROOM_W), 55 + Math.floor(r() * 28), speck);
  }

  // 창문 (창밖 풍경: 시간 따라 / 맑은 낮 / 별 밤 / 비 / 눈 / 벚꽃)
  const view = st.view === "auto" ? opts.phase : st.view;
  const sky = { day: "#a6dcf7", dawn: "#f9cdb8", dusk: "#f6a97c", night: "#2f3b73", rain: "#8fa0b4", snow: "#c3d6ea", sakura: "#bfe6f7" }[view] ?? "#a6dcf7";
  rect(g, 11, 9, 34, 30, WOOD_D);
  rect(g, 13, 11, 30, 26, sky);
  if (view === "night") {
    disc(g, 35, 17, 3, 3, "#fff3b0"); px(g, 36, 16, sky); px(g, 37, 16, sky);
    for (const [sx, sy] of [[17, 14], [24, 20], [20, 29], [30, 26], [39, 30]]) px(g, sx, sy, "#fff8d6");
  } else if (view === "rain") {
    rect(g, 14, 13, 12, 3, "#6f7e92"); rect(g, 17, 11, 8, 2, "#6f7e92"); rect(g, 30, 14, 12, 3, "#6f7e92"); rect(g, 33, 12, 7, 2, "#6f7e92");
    for (let y = 19; y < 36; y += 4) for (let x = 15 + ((y / 4) % 2) * 2; x < 42; x += 5) { px(g, x, y, "#d6e6f5"); px(g, x - 1, y + 1, "#d6e6f5"); }
  } else if (view === "snow") {
    rect(g, 13, 33, 30, 4, "#ffffff");
    for (let y = 13; y < 33; y += 4) for (let x = 15 + ((y / 4) % 2) * 3; x < 42; x += 6) px(g, x, y, "#ffffff");
  } else if (view === "sakura") {
    rect(g, 13, 16, 14, 2, "#7a4a3a"); rect(g, 22, 14, 2, 4, "#7a4a3a"); rect(g, 13, 20, 8, 1, "#7a4a3a");
    for (const [bx, by] of [[15, 14], [19, 13], [24, 12], [17, 18], [14, 22], [21, 17], [28, 22], [34, 28], [38, 20], [30, 33], [22, 30]]) { px(g, bx, by, "#ffb7c9"); px(g, bx + 1, by, "#ffd6e0"); px(g, bx, by + 1, "#ffd6e0"); }
  } else {
    disc(g, 34, 17, 3, 3, view === "day" ? "#fff3b0" : "#ffd98a");
    rect(g, 16, 24, 9, 2, "#ffffff"); rect(g, 18, 22, 5, 2, "#ffffff"); rect(g, 30, 29, 8, 2, "#ffffff");
  }
  rect(g, 27, 11, 2, 26, WOOD_D); rect(g, 13, 23, 30, 2, WOOD_D);
  rect(g, 9, 39, 38, 2, WOOD_L); rect(g, 9, 41, 38, 1, WOOD_D);
  // 커튼
  for (const cx of [9, 41]) {
    rect(g, cx, 7, 6, 30, accent);
    rect(g, cx + (cx === 9 ? 4 : 0), 7, 2, 30, shade(accent, -34));
    rect(g, cx + (cx === 9 ? 1 : 3), 9, 1, 26, shade(accent, 30));
  }
  rect(g, 8, 6, 40, 2, WOOD_D);

  // 화이트보드
  rect(g, 53, 6, 46, 28, "#8a8fa3");
  rect(g, 54, 7, 44, 26, "#fdfdfb");
  rect(g, 54, 7, 44, 1, "#e9ecef"); rect(g, 54, 32, 44, 1, "#dfe3e8");
  rect(g, 56, 34, 40, 2, "#8a8fa3");
  rect(g, 60, 34, 5, 1, "#e0605a"); rect(g, 67, 34, 5, 1, "#5f8fd6"); rect(g, 74, 34, 5, 1, "#3a2a33");
  const inks = ["#5f8fd6", "#e0605a", "#4f9a6d", "#3a2a33"];
  const lines = Math.min(4, opts.boardCount);
  for (let i = 0; i < lines; i++) {
    const y = 11 + i * 6, w = 18 + ((i * 7) % 16);
    for (let x = 58; x < 58 + w; x += 2) { px(g, x, y, inks[i % 4]); if ((x + i) % 5) px(g, x + 1, y + (x % 3 === 0 ? 1 : 0), inks[i % 4]); }
  }
  if (!lines) { px(g, 75, 19, "#c9ced6"); px(g, 76, 19, "#c9ced6"); px(g, 77, 19, "#c9ced6"); }
  if (opts.boardCount > 4) disc(g, 92, 12, 2.5, 2.5, "#e0605a");

  // 포스트잇: 화이트보드 위에 붙는다 (최근 것부터)
  const SPOTS: [number, number][] = [[89, 8], [81, 20], [57, 9], [66, 24], [74, 8], [90, 22], [58, 21], [67, 12], [82, 9], [75, 23]];
  opts.postitColors.slice(0, SPOTS.length).forEach((c, i) => {
    const [x, y] = SPOTS[i];
    rect(g, x + 1, y + 1, 7, 7, "#b9bfca");
    rect(g, x, y, 7, 7, c); rect(g, x, y, 7, 1, shade(c, 28));
    rect(g, x + 1, y + 3, 4, 1, shade(c, -48)); rect(g, x + 1, y + 5, 3, 1, shade(c, -48));
    px(g, x + 3, y - 1, "#e0605a");
  });

  // 책장
  rect(g, 103, 7, 32, 47, WOOD_D);
  rect(g, 105, 9, 28, 43, "#6f4a30");
  const kindColor = (k: string) => ACHIEVEMENT_KINDS.find((x) => x.id === k)?.color ?? "#62b866";
  let n = 0;
  for (let sIdx = 0; sIdx < 4; sIdx++) {
    const y0 = 9 + sIdx * 11;
    rect(g, 105, y0 + 9, 28, 2, WOOD);
    let x = 106;
    while (x < 131 && n < opts.shelf.length) {
      const c = kindColor(opts.shelf[n]);
      const w = 2 + (n % 2), h = 6 + ((n * 5) % 3);
      rect(g, x, y0 + 9 - h, w, h, c);
      px(g, x, y0 + 9 - h + 1, shade(c, 60));
      rect(g, x + w - 1, y0 + 9 - h, 1, h, shade(c, -40));
      rect(g, x, y0 + 6, w, 1, "#fff8e4");
      x += w; n++;
    }
    if (sIdx === 3) { rect(g, 124, y0 + 2, 7, 7, "#e08a5c"); disc(g, 127, y0 + 1, 3, 3, "#62b866"); }
    if (sIdx === 0 && opts.shelf.length === 0) { rect(g, 108, y0 + 3, 6, 6, "#fdfdfb"); rect(g, 109, y0 + 5, 4, 1, "#c9ced6"); }
  }
  rect(g, 103, 7, 32, 2, WOOD);

  // 러그
  if (st.rug === "square") {
    rect(g, 38, 62, 68, 20, shade(accent, 26));
    rect(g, 40, 64, 64, 16, accent);
    rect(g, 44, 67, 56, 10, shade(accent, 26));
    for (let x = 48; x < 98; x += 4) { px(g, x, 72, shade(accent, -30)); px(g, x + 2, 70, shade(accent, -30)); px(g, x + 2, 74, shade(accent, -30)); }
    for (let y = 63; y < 81; y += 3) { px(g, 37, y, shade(accent, -20)); px(g, 106, y, shade(accent, -20)); }
  } else {
    disc(g, 72, 72, 36, 8, shade(accent, 26));
    disc(g, 72, 72, 32, 6, accent);
    disc(g, 72, 72, 26, 4, shade(accent, 26));
    for (let x = 40; x < 105; x += 4) { px(g, x, 72, shade(accent, -30)); }
  }

  // 소품 (꾸미기에서 고른 것)
  if (st.extras.includes("plant")) {
    // 꽃 화분: 작은 잎 위에 분홍·노랑·하늘색 꽃
    rect(g, 93, 60, 9, 8, "#e08a5c"); rect(g, 92, 59, 11, 2, "#c96f45"); rect(g, 100, 61, 2, 7, "#c96f45");
    rect(g, 96, 52, 1, 7, "#3f8a4e"); rect(g, 94, 55, 2, 1, "#4f9a54"); rect(g, 98, 56, 2, 1, "#4f9a54");
    disc(g, 95, 56, 2, 2, "#62b866"); disc(g, 99, 57, 2, 2, "#4f9a54"); disc(g, 97, 54, 3, 2.5, "#62b866");
    const bloom = (x: number, y: number, c: string) => { px(g, x, y - 1, c); px(g, x - 1, y, c); px(g, x + 1, y, c); px(g, x, y + 1, c); px(g, x, y, "#fff3b0"); };
    bloom(94, 51, "#ff8fb4"); bloom(99, 50, "#ffd65c"); bloom(97, 47, "#ff8fb4"); bloom(101, 54, "#9ad0ff");
  }
  if (st.extras.includes("bigplant")) {
    rect(g, 3, 64, 10, 9, "#e08a5c"); rect(g, 2, 63, 12, 2, "#c96f45"); rect(g, 11, 65, 2, 8, "#c96f45");
    rect(g, 7, 52, 2, 12, "#3f8a4e");
    disc(g, 8, 50, 6, 7, "#4f9a54"); disc(g, 4, 54, 4, 5, "#62b866"); disc(g, 12, 55, 4, 5, "#7fcf74"); disc(g, 8, 45, 4, 4, "#62b866");
    px(g, 6, 47, "#a3e08f"); px(g, 10, 52, "#a3e08f"); px(g, 4, 54, "#a3e08f");
  }
  if (st.extras.includes("beanbag")) {
    disc(g, 23, 77, 10, 5, shade(accent, -30));
    disc(g, 23, 75, 9, 5, shade(accent, 10)); disc(g, 22, 73, 6, 3, shade(accent, 38));
    px(g, 19, 72, "#ffffff"); px(g, 20, 72, "#ffffff");
  }
  if (st.extras.includes("suseok")) {
    // 수석: 창틀 위 수반(물그릇)에 올린 산 모양 돌 (영화 <기생충>의 그 돌)
    rect(g, 24, 38, 14, 2, "#ece8de"); rect(g, 25, 40, 12, 1, "#cfcabd"); rect(g, 26, 38, 10, 1, "#a9d8f5");
    rect(g, 27, 36, 8, 2, "#5e626c"); rect(g, 28, 34, 6, 2, "#5e626c"); rect(g, 29, 32, 3, 2, "#5e626c"); px(g, 30, 31, "#5e626c");
    rect(g, 33, 35, 2, 3, "#6f7480"); rect(g, 25, 37, 3, 1, "#6f7480");
    px(g, 29, 33, "#9aa0ab"); px(g, 30, 32, "#b9bec8"); px(g, 28, 35, "#9aa0ab"); px(g, 31, 35, "#8a909c"); px(g, 30, 37, "#8a909c");
    px(g, 29, 36, "#3f424b"); px(g, 32, 34, "#3f424b"); px(g, 33, 37, "#3f424b");
  }
  if (st.extras.includes("slime")) {
    // 슬라임: 말랑한 민트색 덩어리, 반짝이는 하이라이트와 점 눈
    disc(g, 61, 78, 6, 2, shade("#7be0a8", -40));
    disc(g, 61, 76, 6, 4.5, "#7be0a8"); disc(g, 61, 72, 3, 3, "#7be0a8"); rect(g, 60, 69, 2, 2, "#7be0a8");
    px(g, 58, 73, "#d9fff0"); px(g, 59, 72, "#d9fff0"); px(g, 58, 74, "#bff2dc"); px(g, 64, 76, "#58c98a"); px(g, 57, 77, "#58c98a");
    px(g, 59, 76, "#3a2a33"); px(g, 63, 76, "#3a2a33"); px(g, 61, 78, "#3a2a33");
  }
  if (st.extras.includes("train")) {
    // 바닥에 두는 장난감 빨간 기차 (기관차 + 객차 두 칸)와 작은 선로
    rect(g, 70, 83, 30, 1, "#6b5a48"); for (let x = 71; x < 100; x += 4) rect(g, x, 82, 2, 1, "#8a7358");
    rect(g, 72, 77, 10, 4, "#d9302a"); rect(g, 72, 77, 10, 1, "#f06a62"); rect(g, 72, 74, 5, 4, "#b32520"); rect(g, 73, 75, 3, 2, "#ffe9a8");
    rect(g, 79, 74, 2, 3, "#2a2a31"); px(g, 80, 72, "#ffffff"); px(g, 81, 71, "#e6e6ee"); rect(g, 82, 78, 1, 2, "#ffd65c");
    for (const cx of [73, 77, 81]) { rect(g, cx, 81, 2, 2, "#2a2a31"); px(g, cx, 81, "#8a8fa3"); }
    for (const x0 of [84, 92]) {
      rect(g, x0, 77, 7, 4, "#e8453d"); rect(g, x0, 77, 7, 1, "#f48a83"); rect(g, x0 + 1, 78, 2, 2, "#ffe9a8"); rect(g, x0 + 4, 78, 2, 2, "#ffe9a8");
      rect(g, x0, 81, 2, 2, "#2a2a31"); rect(g, x0 + 5, 81, 2, 2, "#2a2a31"); rect(g, x0 - 1, 80, 1, 1, "#8a8fa3");
    }
  }
  if (st.extras.includes("xmastree")) {
    // 꾸민 크리스마스 트리: 세 단 초록 가지, 꼭대기 별, 전구·오너먼트·반짝이 줄, 아래에 선물
    const cx = 130;
    [[48, 9, 2], [57, 9, 4], [66, 9, 6]].forEach(([y0, rows, hw0], t) => {
      for (let i = 0; i < rows + 1; i++) {
        const hw = hw0 + Math.floor(i * (t === 2 ? 0.62 : 0.55)) + 1, y = y0 + i;
        rect(g, cx - hw, y, hw * 2 + 1, 1, i % 2 ? "#2f7d3f" : "#3f9a4e");
        px(g, cx - hw, y, "#256a34"); px(g, cx + hw, y, "#256a34");
      }
    });
    rect(g, cx - 1, 76, 3, 4, "#7a4a2a");
    for (const [x, y] of [[-1, 50], [-3, 55], [3, 59], [-6, 63], [2, 68], [-8, 72], [7, 73], [0, 63], [-3, 69]]) { px(g, cx + x, y, "#ffd65c"); }
    const orn: [number, number, string][] = [[2, 52, "#e0302a"], [-4, 59, "#5f8fd6"], [5, 62, "#e0302a"], [-2, 66, "#ffd65c"], [4, 70, "#5f8fd6"], [-7, 70, "#e0302a"], [8, 74, "#ffd65c"], [-1, 73, "#e0302a"]];
    for (const [dx, y, c] of orn) { rect(g, cx + dx, y, 2, 2, c); px(g, cx + dx, y, "#ffffff"); }
    for (let i = 0; i < 17; i++) px(g, cx - 8 + i, 66 + Math.round(Math.sin(i / 2.7) * 2), "#fff8d6"); // 반짝이 줄
    rect(g, cx - 2, 44, 5, 1, "#ffd65c"); rect(g, cx - 1, 43, 3, 3, "#ffd65c"); px(g, cx, 42, "#ffd65c"); px(g, cx, 47, "#ffd65c"); px(g, cx, 44, "#fff3b0");
    rect(g, cx - 12, 77, 6, 5, "#e0605a"); rect(g, cx - 10, 77, 2, 5, "#ffd65c"); rect(g, cx - 12, 79, 6, 1, "#ffd65c");
    rect(g, cx + 6, 78, 7, 4, "#5f8fd6"); rect(g, cx + 8, 78, 2, 4, "#ffffff"); rect(g, cx + 6, 80, 7, 1, "#ffffff");
  }
  if (st.extras.includes("globe")) {
    rect(g, 40, 76, 8, 1, WOOD_D); rect(g, 43, 71, 2, 5, WOOD_D);
    disc(g, 44, 66, 5, 5, "#5f8fd6"); px(g, 42, 64, "#62b866"); px(g, 43, 64, "#62b866"); px(g, 43, 65, "#62b866");
    px(g, 46, 67, "#62b866"); px(g, 47, 67, "#62b866"); px(g, 46, 68, "#62b866"); px(g, 42, 63, "#a9d8f5");
    rect(g, 39, 61, 1, 10, WOOD_D); px(g, 40, 61, WOOD_D);
  }

  // 의자
  rect(g, 65, 33, 14, 15, WOOD); rect(g, 67, 35, 10, 5, WOOD_L); rect(g, 65, 46, 14, 2, WOOD_D);

  // 주민
  if (opts.inside) {
    const av = avatarGrid(opts.avatar, 0, true);
    stamp(g, av, 60, 26 + (opts.studying && opts.frame % 2 ? 1 : 0));
  }

  // 책상 (원목 / 시스템 책상(흰색))
  const system = st.desk === "system";
  const top = system ? "#fbfbf9" : WOOD_L, edge = system ? "#cfd2d8" : WOOD, apron = system ? "#eceef2" : WOOD_D, leg = system ? "#e2e4e9" : WOOD, legD = system ? "#b8bcc6" : WOOD_D;
  rect(g, 50, 46, 44, 3, top); rect(g, 50, 48, 44, 1, edge);
  rect(g, 52, 49, 40, 4, apron);
  if (system) { rect(g, 78, 50, 10, 2, "#cfd2d8"); px(g, 82, 50, "#ffffff"); } else { rect(g, 78, 50, 10, 2, WOOD); px(g, 83, 51, "#ffd65c"); }
  rect(g, 53, 53, 3, 14, leg); rect(g, 88, 53, 3, 14, leg); rect(g, 55, 53, 1, 14, legD); rect(g, 90, 53, 1, 14, legD);
  if (system) { rect(g, 53, 66, 3, 1, "#8a8f9a"); rect(g, 88, 66, 3, 1, "#8a8f9a"); }
  // 자개 명패: 검은 옻칠 바탕에 자개 조각을 박은 명패 (책상 앞판)
  if (st.extras.includes("nameplate")) {
    rect(g, 62, 49, 15, 4, "#2a2030"); rect(g, 62, 49, 15, 1, "#caa24e"); rect(g, 62, 52, 15, 1, "#caa24e");
    const pearl = ["#f6c7e0", "#bfe9e3", "#fff6c9", "#c9d6f6"];
    for (let i = 0; i < 6; i++) { px(g, 64 + i * 2, 50 + (i % 2), pearl[i % 4]); px(g, 65 + i * 2, 51 - (i % 2), pearl[(i + 2) % 4]); }
  }
  // 책상 위: 고른 물건을 왼쪽부터 놓는다 (스탠드는 늘 있다)
  const W: Record<string, number> = { mug: 5, notebook: 8, books: 11, laptop: 14, paper: 9, munbang: 10 };
  const order = ["mug", "notebook", "laptop", "books", "paper", "munbang"].filter((k) => st.deskItems.includes(k));
  let cx = 54;
  for (const k of order) {
    const w = W[k], x = Math.min(cx, 81 - w);
    if (k === "mug") {
      rect(g, x, 42, 4, 4, "#ffffff"); px(g, x + 4, 43, "#ffffff"); px(g, x + 4, 44, "#ffffff"); rect(g, x, 42, 4, 1, "#8a5a3a");
      if (opts.studying && opts.frame % 2 === 0) { px(g, x + 1, 39, "#ffffff"); px(g, x + 2, 37, "#ffffff"); }
    } else if (k === "books") {
      rect(g, x, 44, 6, 2, "#ffffff"); rect(g, x + 6, 44, 5, 2, "#f1ead8"); px(g, x + 5, 43, "#ffffff"); px(g, x + 6, 43, "#f1ead8");
      for (const lx of [1, 3, 8, 10]) px(g, x + lx, 45, "#b9c2d4");
    } else if (k === "notebook") {
      rect(g, x, 43, 8, 3, "#c5504c"); rect(g, x, 43, 8, 1, "#e07a74"); rect(g, x + 1, 45, 6, 1, "#fff8e4"); rect(g, x, 43, 1, 3, "#8e302e");
    } else if (k === "laptop") {
      // 사용자 쪽에서 보이는 노트북 뒷면(뚜껑)
      rect(g, x + 1, 38, 12, 7, "#b9bdc7"); rect(g, x + 1, 38, 12, 1, "#d6d9e0"); rect(g, x + 1, 44, 12, 1, "#8e93a0");
      rect(g, x + 6, 40, 3, 3, "#dfe2e8"); px(g, x + 7, 41, "#b9bdc7");
      rect(g, x, 45, 14, 1, "#9aa0ad");
    } else if (k === "paper") {
      rect(g, x + 1, 44, 8, 2, "#ffffff"); rect(g, x, 45, 8, 1, "#e6e6e6"); rect(g, x + 2, 44, 3, 1, "#c9ced6"); rect(g, x + 6, 45, 2, 1, "#c9ced6");
    } else if (k === "munbang") {
      // 문방사우: 벼루·먹·붓
      rect(g, x, 44, 6, 2, "#2a2a31"); rect(g, x + 1, 44, 3, 1, "#4a4a55"); px(g, x + 2, 44, "#15151a");
      rect(g, x + 6, 45, 3, 1, "#15151a"); px(g, x + 8, 45, "#caa24e");
      rect(g, x + 1, 41, 1, 3, "#8a5a3a"); px(g, x + 1, 40, "#3a2a33"); px(g, x + 1, 44, "#3a2a33");
    }
    cx += w + 1;
  }
  rect(g, 87, 44, 5, 2, "#5a5568"); rect(g, 89, 36, 1, 8, "#5a5568"); rect(g, 85, 35, 5, 1, "#5a5568");
  rect(g, 82, 36, 6, 3, opts.studying ? "#ffe07a" : "#e9e2c8"); rect(g, 81, 39, 8, 1, "#5a5568");
  if (opts.studying) for (let y = 40; y < 46; y++) for (let x = 80 - (y - 40); x < 90; x++) if ((x + y) % 2 === 0 && hash(x, y) > 0.2) px(g, x, y, "#fff4bf");

  // 러그 위 반려동물
  if (st.pet === "cat") {
    const cat = grid(13, 8);
    rect(cat, 2, 3, 9, 4, "#f2c98a"); rect(cat, 1, 2, 4, 4, "#f2c98a"); px(cat, 1, 1, "#f2c98a"); px(cat, 4, 1, "#f2c98a");
    rect(cat, 6, 3, 2, 4, "#e0a45c"); rect(cat, 9, 3, 1, 4, "#e0a45c"); px(cat, 11, 5, "#f2c98a"); px(cat, 11, 4, "#e0a45c");
    px(cat, 2, 4, "#3a2a33"); px(cat, 4, 4, "#3a2a33"); px(cat, 3, 5, "#f29aa8");
    stamp(g, outline(cat), 104, 70);
  } else if (st.pet === "dog") {
    const dog = grid(15, 9);
    rect(dog, 3, 3, 9, 4, "#d9a066"); rect(dog, 1, 2, 5, 5, "#d9a066"); rect(dog, 1, 1, 2, 3, "#8a5a3a"); rect(dog, 5, 1, 1, 2, "#8a5a3a");
    rect(dog, 7, 3, 3, 3, "#f3dcb4"); rect(dog, 3, 6, 2, 2, "#c58c52"); rect(dog, 9, 6, 2, 2, "#c58c52");
    rect(dog, 12, 2, 2, 2, "#d9a066"); px(dog, 13, 1, "#d9a066");
    px(dog, 2, 4, "#3a2a33"); px(dog, 4, 4, "#3a2a33"); px(dog, 1, 5, "#3a2a33"); px(dog, 2, 6, "#e0605a");
    stamp(g, outline(dog), 103, 69);
  } else if (st.pet === "haetae") {
    // 해태: 궁궐 앞에 앉아 있는 돌 해태 상 (뿔, 불꽃 갈기, 부리부리한 눈)
    const h = grid(14, 14);
    rect(h, 3, 8, 9, 5, "#c9c3b2"); rect(h, 3, 12, 9, 1, "#9d9784"); rect(h, 4, 11, 2, 2, "#b3ad9a"); rect(h, 9, 11, 2, 2, "#b3ad9a");
    rect(h, 2, 3, 8, 7, "#d6d0bf"); rect(h, 2, 9, 8, 1, "#b3ad9a");
    rect(h, 5, 0, 2, 3, "#e8e2d0"); px(h, 5, 0, "#b3ad9a");                                  // 뿔
    for (const [x, y] of [[1, 4], [1, 6], [1, 8], [10, 4], [10, 6], [10, 8], [3, 3], [8, 3]]) { px(h, x, y, "#6f9a86"); px(h, x, y + 1, "#4f7a68"); } // 청록빛 갈기
    rect(h, 3, 5, 2, 2, "#ffffff"); rect(h, 7, 5, 2, 2, "#ffffff"); px(h, 4, 6, "#3a2a33"); px(h, 7, 6, "#3a2a33"); // 눈
    rect(h, 4, 8, 4, 1, "#3a2a33"); px(h, 5, 8, "#e0605a"); px(h, 6, 8, "#e0605a");              // 벌린 입
    rect(h, 10, 9, 3, 2, "#6f9a86"); px(h, 12, 8, "#4f7a68");                                // 꼬리
    stamp(g, outline(h), 103, 65);
  } else if (st.pet === "squirrel") {
    // 다람쥐: 등에 검은 줄무늬, 크고 복슬한 꼬리, 도토리를 들고 있다
    const q = grid(13, 12);
    disc(q, 10, 6, 2.5, 5, "#c98a4e"); disc(q, 10, 4, 2, 3, "#d9a066"); px(q, 9, 1, "#c98a4e");              // 꼬리
    disc(q, 5, 8, 4, 3.5, "#b8743a"); rect(q, 3, 6, 5, 1, "#3a2a33"); rect(q, 3, 8, 6, 1, "#3a2a33");            // 몸 + 등 줄무늬
    disc(q, 5, 9, 2, 2, "#f3dcb4");                                                                            // 배
    disc(q, 3, 5, 3, 2.7, "#c98a4e"); px(q, 1, 2, "#8a5a3a"); px(q, 4, 2, "#8a5a3a");                          // 머리와 귀
    px(q, 2, 5, "#3a2a33"); px(q, 4, 5, "#3a2a33"); px(q, 1, 6, "#3a2a33"); px(q, 3, 7, "#f29aa8");
    rect(q, 2, 8, 3, 2, "#8a5a3a"); rect(q, 2, 8, 3, 1, "#c98a4e"); px(q, 3, 10, "#8a5a3a");                    // 도토리
    rect(q, 3, 11, 2, 1, "#8a5a3a"); rect(q, 6, 11, 2, 1, "#8a5a3a");
    stamp(g, outline(q), 104, 69);
  } else if (st.pet === "hedwig") {
    // 눈처럼 흰 부엉이(해리포터의 편지 배달 부엉이 풍): 흰 깃털에 회색 점, 노란 눈
    const o = grid(12, 14);
    disc(o, 6, 8, 5, 5.5, "#f7f7f2"); disc(o, 6, 4, 4.5, 4, "#ffffff");
    rect(o, 1, 6, 2, 6, "#e3e3de"); rect(o, 9, 6, 2, 6, "#e3e3de");
    for (const [x, y] of [[3, 8], [5, 9], [8, 8], [4, 11], [7, 11], [6, 7], [9, 10], [2, 9]]) px(o, x, y, "#8e8e98");
    for (const [x, y] of [[4, 2], [8, 2], [3, 5], [9, 5]]) px(o, x, y, "#b9b9c2");
    rect(o, 3, 4, 2, 2, "#f2c230"); rect(o, 7, 4, 2, 2, "#f2c230"); px(o, 4, 5, "#3a2a33"); px(o, 7, 5, "#3a2a33");
    px(o, 5, 6, "#3a2a33"); px(o, 6, 6, "#3a2a33"); px(o, 5, 7, "#e0a45c");
    rect(o, 3, 13, 2, 1, "#caa24e"); rect(o, 7, 13, 2, 1, "#caa24e");
    stamp(g, outline(o), 104, 65);
  } else if (st.pet === "duo") {
    // 초록 부엉이(언어 학습 앱 마스코트 풍): 큰 흰 눈, 주황 부리와 발
    const o = grid(13, 14);
    disc(o, 6.5, 8.5, 5.5, 5, "#58cc02"); disc(o, 6.5, 10, 3, 3.5, "#89e219");
    rect(o, 0, 7, 2, 5, "#46a302"); rect(o, 11, 7, 2, 5, "#46a302");
    disc(o, 6.5, 4, 5.5, 3.5, "#58cc02"); rect(o, 1, 0, 2, 3, "#58cc02"); rect(o, 10, 0, 2, 3, "#58cc02");
    disc(o, 4, 4, 2.4, 2.4, "#ffffff"); disc(o, 9, 4, 2.4, 2.4, "#ffffff");
    px(o, 4, 4, "#3a2a33"); px(o, 5, 4, "#3a2a33"); px(o, 8, 4, "#3a2a33"); px(o, 9, 4, "#3a2a33"); px(o, 4, 5, "#3a2a33"); px(o, 9, 5, "#3a2a33");
    rect(o, 5, 6, 3, 2, "#ff9600"); px(o, 6, 8, "#ff9600");
    rect(o, 4, 13, 2, 1, "#ff9600"); rect(o, 8, 13, 2, 1, "#ff9600");
    stamp(g, outline(o), 104, 65);
  }
  return g;
}
