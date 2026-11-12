import { DEFAULT_ROOFS, WALLS } from "@/lib/constants";
import type { DayPhase } from "@/lib/time";
import type { Avatar, HouseStyle } from "@/lib/types";
import { avatarGrid } from "./avatar";
import { disc, grid, hash, outline, px, rect, rng, shade, stamp, type Grid } from "./core";

export const ROOM_W = 144;
export const ROOM_H = 84;
const WOOD = "#b98552", WOOD_D = "#8e5f3b", WOOD_L = "#dcaa72";

/** 내 연구실 내부. 집 꾸미기 색(벽·지붕)이 벽지와 커튼·러그에 쓰인다. */
export function roomGrid(opts: { slot: number; style: HouseStyle; avatar: Avatar; inside: boolean; studying: boolean; phase: DayPhase; frame: number }): Grid {
  const wall = opts.style.wall ?? WALLS[0];
  const accent = opts.style.roof ?? DEFAULT_ROOFS[opts.slot];
  const g = grid(ROOM_W, ROOM_H);
  const r = rng(opts.slot + 3);

  // 벽지
  rect(g, 0, 0, ROOM_W, 54, wall);
  for (let x = 4; x < ROOM_W; x += 8) rect(g, x, 0, 2, 44, shade(wall, 10));
  for (let x = 0; x < ROOM_W; x += 8) for (let y = 5; y < 42; y += 10) px(g, x + (y % 20 ? 0 : 4), y, shade(wall, -22));
  rect(g, 0, 43, ROOM_W, 1, shade(wall, -40));
  rect(g, 0, 44, ROOM_W, 10, WOOD_L);
  for (let x = 0; x < ROOM_W; x += 9) rect(g, x, 45, 1, 8, WOOD);
  rect(g, 0, 52, ROOM_W, 2, WOOD_D);
  // 마루
  rect(g, 0, 54, ROOM_W, 30, "#dfb57f");
  for (let y = 54; y < ROOM_H; y += 6) {
    rect(g, 0, y, ROOM_W, 1, "#c79a63");
    for (let x = (y % 12 ? 10 : 0); x < ROOM_W; x += 22) rect(g, x, y, 1, 6, "#c79a63");
  }
  for (let i = 0; i < 40; i++) px(g, Math.floor(r() * ROOM_W), 55 + Math.floor(r() * 28), "#ecc892");

  // 창문
  const sky = { day: "#a6dcf7", dawn: "#f9cdb8", dusk: "#f6a97c", night: "#2f3b73" }[opts.phase];
  rect(g, 11, 9, 34, 30, WOOD_D);
  rect(g, 13, 11, 30, 26, sky);
  if (opts.phase === "night") {
    disc(g, 35, 17, 3, 3, "#fff3b0"); px(g, 36, 16, sky); px(g, 37, 16, sky);
    for (const [sx, sy] of [[17, 14], [24, 20], [20, 29], [30, 26], [39, 30]]) px(g, sx, sy, "#fff8d6");
  } else {
    disc(g, 34, 17, 3, 3, opts.phase === "day" ? "#fff3b0" : "#ffd98a");
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

  // 액자
  rect(g, 58, 12, 16, 13, WOOD_D); rect(g, 60, 14, 12, 9, "#cfeaf7");
  rect(g, 60, 20, 12, 3, "#8fd17a"); disc(g, 68, 16, 1.500, 1.500, "#ffd65c"); px(g, 63, 19, "#5fb866"); px(g, 64, 18, "#5fb866"); px(g, 65, 19, "#5fb866");

  // 책장
  rect(g, 103, 7, 32, 47, WOOD_D);
  rect(g, 105, 9, 28, 43, "#6f4a30");
  const BOOKS = ["#e0605a", "#5f8fd6", "#f2c64e", "#62b866", "#b08ae0", "#f0994a", "#f7a8bf", "#6ccfc2"];
  for (let s = 0; s < 4; s++) {
    const y0 = 9 + s * 11;
    rect(g, 105, y0 + 9, 28, 2, WOOD);
    let x = 106;
    while (x < 131) {
      const w = 2 + Math.floor(r() * 2), h = 5 + Math.floor(r() * 4);
      if (r() < 0.14) { x += 3; continue; }
      const c = BOOKS[Math.floor(r() * BOOKS.length)];
      rect(g, x, y0 + 9 - h, w, h, c);
      px(g, x, y0 + 9 - h + 1, shade(c, 60));
      rect(g, x + w - 1, y0 + 9 - h, 1, h, shade(c, -40));
      x += w;
    }
  }
  rect(g, 103, 7, 32, 2, WOOD);

  // 러그
  disc(g, 72, 72, 36, 8, shade(accent, 26));
  disc(g, 72, 72, 32, 6, accent);
  disc(g, 72, 72, 26, 4, shade(accent, 26));
  for (let x = 40; x < 105; x += 4) { px(g, x, 72, shade(accent, -30)); }

  // 화분
  rect(g, 93, 60, 9, 8, "#e08a5c"); rect(g, 92, 59, 11, 2, "#c96f45"); rect(g, 100, 61, 2, 7, "#c96f45");
  disc(g, 97, 52, 5, 5, "#62b866"); disc(g, 93, 55, 3, 3, "#4f9a54"); disc(g, 101, 56, 3, 3, "#7fcf74");
  px(g, 96, 50, "#a3e08f"); px(g, 99, 53, "#a3e08f"); px(g, 97, 58, "#3f8a4e");

  // 의자
  rect(g, 65, 33, 14, 15, WOOD); rect(g, 67, 35, 10, 5, WOOD_L); rect(g, 65, 46, 14, 2, WOOD_D);

  // 주민
  if (opts.inside) {
    const av = avatarGrid(opts.avatar, 0, true);
    stamp(g, av, 63, 26 + (opts.studying && opts.frame % 2 ? 1 : 0));
  }

  // 책상
  rect(g, 50, 46, 44, 3, WOOD_L); rect(g, 50, 48, 44, 1, WOOD);
  rect(g, 52, 49, 40, 4, WOOD_D); rect(g, 78, 50, 10, 2, WOOD); px(g, 83, 51, "#ffd65c");
  rect(g, 53, 53, 3, 14, WOOD); rect(g, 88, 53, 3, 14, WOOD); rect(g, 55, 53, 1, 14, WOOD_D); rect(g, 90, 53, 1, 14, WOOD_D);
  // 책상 위: 책, 머그, 스탠드
  rect(g, 66, 44, 6, 2, "#ffffff"); rect(g, 72, 44, 6, 2, "#f1ead8"); px(g, 71, 43, "#ffffff"); px(g, 72, 43, "#f1ead8");
  for (const lx of [67, 69, 74, 76]) px(g, lx, 45, "#b9c2d4");
  rect(g, 54, 42, 4, 4, "#ffffff"); px(g, 58, 43, "#ffffff"); px(g, 58, 44, "#ffffff"); rect(g, 54, 42, 4, 1, "#8a5a3a");
  if (opts.studying && opts.frame % 2 === 0) { px(g, 55, 39, "#ffffff"); px(g, 56, 37, "#ffffff"); }
  rect(g, 87, 44, 5, 2, "#5a5568"); rect(g, 89, 36, 1, 8, "#5a5568"); rect(g, 85, 35, 5, 1, "#5a5568");
  rect(g, 82, 36, 6, 3, opts.studying ? "#ffe07a" : "#e9e2c8"); rect(g, 81, 39, 8, 1, "#5a5568");
  if (opts.studying) for (let y = 40; y < 46; y++) for (let x = 80 - (y - 40); x < 90; x++) if ((x + y) % 2 === 0 && hash(x, y) > 0.2) px(g, x, y, "#fff4bf");

  // 러그 위 고양이
  const cat = grid(13, 8);
  rect(cat, 2, 3, 9, 4, "#f2c98a"); rect(cat, 1, 2, 4, 4, "#f2c98a"); px(cat, 1, 1, "#f2c98a"); px(cat, 4, 1, "#f2c98a");
  rect(cat, 6, 3, 2, 4, "#e0a45c"); rect(cat, 9, 3, 1, 4, "#e0a45c"); px(cat, 11, 5, "#f2c98a"); px(cat, 11, 4, "#e0a45c");
  px(cat, 2, 4, "#3a2a33"); px(cat, 4, 4, "#3a2a33"); px(cat, 3, 5, "#f29aa8");
  stamp(g, outline(cat), 104, 70);
  return g;
}
