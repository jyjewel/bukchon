import { disc, grid, outline, px, rect, type Grid } from "./core";

/** 책걸이 기념주화: 책 무늬가 새겨진 금화 (18×18) */
export function coinGrid(): Grid {
  const g = grid(18, 18);
  disc(g, 9, 9, 8, 8, "#b8821f");
  disc(g, 9, 9, 7.2, 7.2, "#f2c744");
  disc(g, 9, 9, 5.6, 5.6, "#e0a92c");
  disc(g, 8.5, 8.5, 5.2, 5.2, "#f8d968");
  // 톱니 테두리
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; px(g, Math.round(9 + Math.cos(a) * 7.6), Math.round(9 + Math.sin(a) * 7.6), "#fff0a8"); }
  // 펼친 책 무늬
  rect(g, 5, 7, 4, 5, "#b8821f"); rect(g, 9, 7, 4, 5, "#b8821f");
  rect(g, 6, 7, 3, 4, "#fff3b8"); rect(g, 9, 7, 3, 4, "#ffe58a");
  rect(g, 8, 6, 2, 6, "#8a5f14");
  px(g, 6, 8, "#b8821f"); px(g, 7, 9, "#b8821f"); px(g, 10, 8, "#b8821f"); px(g, 11, 9, "#b8821f");
  // 반짝임
  px(g, 4, 4, "#ffffff"); px(g, 5, 3, "#fffbe0"); px(g, 3, 5, "#fffbe0");
  return outline(g, "#6b4a10");
}
