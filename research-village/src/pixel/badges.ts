import { fromRows, outline, type Grid } from "./core";

/** 학회 뱃지(둥근 금속 핀과 리본): 참석자는 청회색, 토론자는 은색, 발표자는 금색, 개최자는 자주색 */
const PAL: Record<string, { m: string; d: string; h: string; r: string; rd: string }> = {
  attendee: { m: "#8fb0d9", d: "#5f84b4", h: "#d6e6f7", r: "#5f8fd6", rd: "#3f6bb0" },
  discussant: { m: "#d4d8e0", d: "#9aa0ad", h: "#ffffff", r: "#8a8fa3", rd: "#6a6f83" },
  presenter: { m: "#f2c744", d: "#c8921c", h: "#fff0a8", r: "#d9303a", rd: "#a82430" },
  host: { m: "#a86fd6", d: "#7a42a8", h: "#e6ccf7", r: "#e8902a", rd: "#c06a14" },
};
export function badgeGrid(role: string): Grid {
  const p = PAL[role] ?? PAL.attendee;
  return outline(fromRows([
    "..r...r..",
    "..rr.rr..",
    "...rrr...",
    "..mmmmm..",
    ".mhhmmmd.",
    ".mhmmmmd.",
    ".mmmmmdd.",
    ".mmmmddd.",
    "..ddddd..",
  ], { m: p.m, d: p.d, h: p.h, r: p.r }), "#3a2a33");
}
