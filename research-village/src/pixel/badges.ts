import { fromRows, outline, type Grid } from "./core";

/** 학회 뱃지(별이 박힌 둥근 메달과 리본 두 가닥): 참석자는 청회색, 토론자는 은색, 발표자는 금색, 개최자는 자주색 */
const PAL: Record<string, { m: string; d: string; h: string; s: string; r: string; rd: string }> = {
  attendee: { m: "#8fb0d9", d: "#5f84b4", h: "#d6e6f7", s: "#ffffff", r: "#5f8fd6", rd: "#3f6bb0" },
  discussant: { m: "#d4d8e0", d: "#8f95a3", h: "#ffffff", s: "#6a6f83", r: "#8a8fa3", rd: "#6a6f83" },
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
