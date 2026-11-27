import { fromRows, grid, outline, px, rect, stamp, type Grid } from "./core";

/** 학회 뱃지(별이 박힌 둥근 메달과 리본 두 가닥): 참석자는 흰색, 토론자는 은색, 발표자는 금색, 게시자는 자주색 */
const PAL: Record<string, { m: string; d: string; h: string; s: string; r: string; rd: string }> = {
  attendee: { m: "#f7f8fa", d: "#b4b9c4", h: "#ffffff", s: "#b4b9c4", r: "#e3e6ec", rd: "#b4b9c4" },
  discussant: { m: "#b9c0cc", d: "#7f8797", h: "#eef1f6", s: "#ffffff", r: "#8a8fa3", rd: "#6a6f83" },
  presenter: { m: "#f2c744", d: "#c8921c", h: "#fff0a8", s: "#fff9d6", r: "#d9303a", rd: "#a82430" },
  host: { m: "#a86fd6", d: "#7a42a8", h: "#e6ccf7", s: "#fff0ff", r: "#e8902a", rd: "#c06a14" },
};
export function badgeGrid(role: string): Grid {
  const p = PAL[role] ?? PAL.attendee;
  return outline(fromRows([
    "...ddddd...",
    "..dmmmmmd..",
    ".dmhhmmmmd.",
    ".dmhmsmmmd.",
    ".dmmsssmmd.",
    ".dmsssssmd.",
    ".dmmsssmmd.",
    ".dmmsmsmmd.",
    ".dmmmmmmmd.",
    "..dmmmmmd..",
    "...ddddd...",
    "...rr.rr...",
    "...rr.rr...",
    "..rrd.drr..",
    "..rd...dr..",
  ], p), "#3a2a33");
}

/** 작은 뱃지(5×7): 연구실 뱃지 보관함 안에 걸린다 */
export function miniBadgeGrid(role: string): Grid {
  const p = PAL[role] ?? PAL.attendee;
  return fromRows([
    ".ddd.",
    "dmhmd",
    "dmsmd",
    "dmmmd",
    ".ddd.",
    ".r.r.",
    ".r.r.",
  ], { d: p.d, m: p.m, h: p.h, s: p.s, r: p.r });
}

/** 뱃지 보관함(연구실 바닥에 놓는 작은 진열장, 20×30): 벨벳 판에 받은 뱃지가 최근 것부터 여섯 개까지 걸린다 */
export function badgeCaseGrid(roles: string[]): Grid {
  const WOOD_D = "#6b4a30", WOOD = "#8a6240", WOOD_L = "#b98552";
  const g = grid(20, 30);
  rect(g, 0, 0, 20, 30, WOOD_D); rect(g, 0, 0, 20, 2, WOOD_L); rect(g, 1, 2, 18, 1, WOOD);
  rect(g, 2, 4, 16, 22, "#3b2a4a");                                  // 벨벳 판
  rect(g, 2, 4, 16, 1, "#4d3a60");
  for (let i = 0; i < 6; i++) {
    const x = 4 + (i % 2) * 7, y = 5 + Math.floor(i / 2) * 7;
    if (i < roles.length) stamp(g, miniBadgeGrid(roles[i]), x, y);
    else { px(g, x + 2, y + 1, "#5b4770"); }                          // 비어 있는 걸이
  }
  rect(g, 15, 5, 2, 20, "#5b4770");                                  // 유리에 비친 빛줄기
  rect(g, 4, 27, 12, 1, "#c9a24e"); rect(g, 2, 28, 16, 2, WOOD);
  return outline(g, "#3a2a33");
}
