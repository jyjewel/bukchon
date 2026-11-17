import { grid, outline, px, rect, type Grid } from "./core";

/** 책걸이 때 공중으로 던지는 작은 책 (9×7) */
export function flyingBookGrid(color: string): Grid {
  const g = grid(9, 7);
  rect(g, 1, 1, 7, 5, color); rect(g, 1, 1, 1, 5, "#00000033"); rect(g, 2, 5, 6, 1, "#fff6d8"); px(g, 4, 2, "#ffffffaa"); px(g, 5, 2, "#ffffffaa"); rect(g, 3, 3, 4, 1, "#ffe27a");
  return outline(g);
}
export const BOOK_COLORS = ["#d9454f", "#3f78c8", "#e8a93a", "#4f9a6d", "#9a62c8", "#e87aa6"];
