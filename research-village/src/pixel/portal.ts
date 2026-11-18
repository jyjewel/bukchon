import { disc, grid, outline, px, rect, type Grid } from "./core";

/** 연구실 포탈: 돌 문틀 속에서 보랏빛 소용돌이가 도는 문 (20×26) */
export function portalGrid(): Grid {
  const g = grid(20, 26);
  const S1 = "#a49cb8", S2 = "#c9c3d9", S3 = "#7d7592";
  rect(g, 2, 22, 16, 3, S3); rect(g, 1, 24, 18, 1, "#625b78");                       // 바닥 돌
  rect(g, 2, 6, 3, 17, S1); rect(g, 15, 6, 3, 17, S1); rect(g, 2, 6, 1, 17, S2); rect(g, 15, 6, 1, 17, S2);
  disc(g, 10, 7, 8.5, 6.5, S1); disc(g, 10, 7.5, 6, 5, "#3a2f86");                       // 아치
  rect(g, 4, 5, 12, 1, S2); px(g, 3, 6, S2); px(g, 16, 6, S2);
  // 문 안: 가장자리는 짙게, 가운데로 갈수록 밝은 소용돌이
  disc(g, 10, 14, 5.5, 8.5, "#3a2f86"); disc(g, 10, 14, 4.2, 7, "#5b4cc4"); disc(g, 10, 14, 3, 5, "#7b6bd6"); disc(g, 10, 14, 1.8, 3, "#9a8cf0"); disc(g, 10, 14, 0.9, 1.4, "#e8e2ff");
  for (const [x, y] of [[7, 9], [12, 8], [13, 12], [6, 15], [9, 19], [12, 17], [8, 12], [10, 10]] as [number, number][]) px(g, x, y, "#fff2a8");
  px(g, 11, 14, "#ffffff"); px(g, 9, 13, "#ffffff");
  return outline(g);
}
