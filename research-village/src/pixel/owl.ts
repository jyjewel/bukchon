import { disc, grid, outline, px, rect, type Grid } from "./core";

export const OWL_W = 26;
export const OWL_H = 24;

/** 편지를 물어다 주는 부엉이. wing=true 면 날개를 위로 편 모습(날갯짓 두 장면) */
export function owlGrid(wing: boolean, withLetter = true): Grid {
  const g = grid(OWL_W, OWL_H);
  const body = "#9a6b45", dark = "#6f4a2e", belly = "#f3dcb8", belly2 = "#e3c394";
  // 날개
  if (wing) {
    rect(g, 2, 3, 4, 8, dark); rect(g, 3, 2, 3, 1, dark); rect(g, 20, 3, 4, 8, dark); rect(g, 20, 2, 3, 1, dark);
    rect(g, 3, 4, 2, 6, body); rect(g, 21, 4, 2, 6, body);
  } else {
    rect(g, 2, 11, 4, 8, dark); rect(g, 20, 11, 4, 8, dark);
    rect(g, 3, 12, 2, 6, body); rect(g, 21, 12, 2, 6, body);
  }
  // 몸통과 배
  disc(g, 13, 13, 8, 8, dark); disc(g, 13, 12.5, 7.4, 7.6, body);
  disc(g, 13, 15, 4.6, 5, belly);
  for (const [x, y] of [[11, 13], [14, 14], [12, 17], [15, 17], [10, 16]] as [number, number][]) px(g, x, y, belly2);
  // 머리 깃털(귀)
  rect(g, 6, 3, 3, 3, dark); rect(g, 17, 3, 3, 3, dark); px(g, 7, 2, dark); px(g, 18, 2, dark);
  rect(g, 7, 4, 1, 2, body); rect(g, 18, 4, 1, 2, body);
  // 얼굴
  disc(g, 9.5, 8, 3.3, 3.3, belly); disc(g, 16.5, 8, 3.3, 3.3, belly);
  disc(g, 9.5, 8, 2, 2, "#ffffff"); disc(g, 16.5, 8, 2, 2, "#ffffff");
  rect(g, 9, 7, 2, 3, "#2b1d24"); rect(g, 16, 7, 2, 3, "#2b1d24");
  px(g, 9, 7, "#ffffff"); px(g, 16, 7, "#ffffff");
  rect(g, 12, 10, 2, 2, "#f0a93a"); px(g, 12, 12, "#d88a22"); px(g, 13, 12, "#d88a22");
  // 볼 홍조
  px(g, 7, 11, "#f2a6a0"); px(g, 8, 11, "#f2a6a0"); px(g, 18, 11, "#f2a6a0"); px(g, 19, 11, "#f2a6a0");
  // 발
  rect(g, 10, 20, 2, 2, "#f0a93a"); rect(g, 14, 20, 2, 2, "#f0a93a");
  if (withLetter) stampLetter(g, 8, 17);
  return outline(g);
}

function stampLetter(g: Grid, ox: number, oy: number) {
  rect(g, ox, oy, 10, 6, "#fffaf0"); rect(g, ox, oy, 10, 1, "#e6d8bd"); rect(g, ox, oy + 5, 10, 1, "#e6d8bd");
  px(g, ox + 1, oy + 1, "#e6d8bd"); px(g, ox + 2, oy + 2, "#e6d8bd"); px(g, ox + 3, oy + 3, "#d9c9a8"); px(g, ox + 4, oy + 3, "#d9c9a8");
  px(g, ox + 8, oy + 1, "#e6d8bd"); px(g, ox + 7, oy + 2, "#e6d8bd"); px(g, ox + 6, oy + 3, "#d9c9a8"); px(g, ox + 5, oy + 3, "#d9c9a8");
  rect(g, ox + 4, oy + 2, 2, 2, "#d9454f"); // 붉은 봉인
}

/** 서랍에 들어 있는 편지 */
export function letterGrid(): Grid {
  const g = grid(22, 16);
  rect(g, 1, 1, 20, 14, "#fffaf0"); rect(g, 1, 14, 20, 1, "#e6d8bd");
  for (let i = 0; i < 10; i++) { px(g, 2 + i, 2 + i * 0.6 | 0, "#e6d8bd"); px(g, 19 - i, 2 + i * 0.6 | 0, "#e6d8bd"); }
  rect(g, 9, 6, 4, 4, "#d9454f"); rect(g, 10, 7, 2, 2, "#f07a82"); px(g, 9, 6, "#b32f39");
  return outline(g);
}
