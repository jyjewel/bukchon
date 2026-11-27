import { fromRows, outline, type Grid } from "./core";

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

/** 작은 뱃지(5×7): 연구실 책장 3단에 놓인다 */
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
