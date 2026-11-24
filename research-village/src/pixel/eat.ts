import { disc, grid, outline, px, rect, type Grid } from "./core";
import { snackGrid, type SnackId } from "./snacks";
import { tteokGrid, type TteokId } from "./tteok";

const SNACKS = ["mochi", "yakgwa", "tangerine", "apple", "minishell", "bungeoppang", "cupbokki", "haribo", "stollen", "cookie", "buche"];
const TTEOK = ["siru", "rainbow", "songpyeon"];

/** 2×2 칸을 한 칸으로 줄인다(가장 많이 쓰인 색). 간식 그림을 캐릭터 머리 옆에 작게 띄울 때 쓴다 */
function halve(g: Grid): Grid {
  const out = grid(Math.ceil(g.w / 2), Math.ceil(g.h / 2));
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
    const count = new Map<string, number>();
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const c = g.d[(y * 2 + dy) * g.w + (x * 2 + dx)];
      if (c && x * 2 + dx < g.w) count.set(c, (count.get(c) ?? 0) + 1);
    }
    let best: string | null = null, n = 0;
    count.forEach((v, c) => { if (v > n) { best = c; n = v; } });
    if (best && n >= 2) px(out, x, y, best);
    else if (best) px(out, x, y, best);
  }
  return out;
}

/** 작은 음료 잔 (가로 7칸 안팎) */
function drinkGrid(kind: string): Grid {
  const g = grid(9, 11);
  if (kind === "beer") {
    rect(g, 1, 3, 5, 6, "#e0a53a"); rect(g, 1, 3, 1, 6, "#f3c25a"); rect(g, 1, 2, 5, 2, "#ffffff"); px(g, 2, 1, "#ffffff"); px(g, 4, 1, "#f0f0f6");
    px(g, 6, 4, "#e9e2c8"); px(g, 7, 5, "#e9e2c8"); px(g, 7, 6, "#e9e2c8"); px(g, 6, 7, "#e9e2c8");
  } else if (kind === "americano" || kind === "vanillalatte") {
    rect(g, 1, 3, 5, 7, "#e9f2f7"); rect(g, 1, 4, 5, 5, kind === "americano" ? "#4a2c1c" : "#f3e3c3");
    if (kind === "vanillalatte") rect(g, 1, 7, 5, 2, "#8a5a3a");
    px(g, 2, 5, "#ffffff"); rect(g, 4, 0, 1, 5, kind === "americano" ? "#2f2a3a" : "#e0605a");
  } else {
    const c = kind === "tea" ? "#7fbf6a" : kind === "cappuccino" ? "#f1e3c8" : kind === "vinchaud" ? "#9b1f3a" : kind === "warmmilk" ? "#fffaf0" : "#7a4a2a";
    rect(g, 1, 4, 6, 5, kind === "warmmilk" ? "#cfe4f6" : "#ffffff"); rect(g, 1, 4, 6, 1, c); px(g, 7, 5, "#ffffff"); px(g, 7, 6, "#ffffff"); rect(g, 0, 9, 8, 1, "#e6dfd0");
    px(g, 2, 2, "#ffffff"); px(g, 3, 1, "#f0f0f6"); px(g, 5, 2, "#ffffff");   // 김
  }
  return outline(g);
}

/** 머리 옆에 띄우기 좋게 손으로 작게 그린 간식 (가로 8~10칸) */
function tinySnack(kind: string): Grid | null {
  const g = grid(11, 9);
  if (kind === "bungeoppang") {
    disc(g, 6, 4, 3.2, 2.1, "#e8a64a"); disc(g, 5, 3.4, 1.8, 0.9, "#f6c878");
    rect(g, 1, 3, 2, 3, "#d98a30"); px(g, 1, 2, "#d98a30"); px(g, 1, 6, "#d98a30");                                  // 꼬리지느러미
    for (const [x, y] of [[5, 5], [7, 5], [6, 6]] as [number, number][]) px(g, x, y, "#c98a3a");                    // 비늘
    px(g, 8, 3, "#3a2a33");
  } else if (kind === "cupbokki") {
    rect(g, 2, 4, 6, 5, "#fffdf8"); rect(g, 2, 6, 6, 1, "#e0383f"); rect(g, 3, 8, 4, 1, "#d8d0c4");
    for (const x of [2, 4, 6]) { rect(g, x, 2, 2, 3, "#d4421f"); px(g, x, 2, "#f2683a"); }
    rect(g, 8, 0, 1, 5, "#c9a24e");
  } else if (kind === "mochi") {
    disc(g, 5, 5, 4, 2.6, "#fffdf8"); disc(g, 6, 5, 2, 1.2, "#ffe6ef"); px(g, 3, 4, "#cfe0ff");
  } else if (kind === "yakgwa") {
    disc(g, 5, 5, 4, 3, "#c0813f"); disc(g, 5, 5, 2.2, 1.6, "#d49a52"); px(g, 5, 5, "#8a5a2a"); px(g, 3, 3, "#f3c987");
  } else if (kind === "tangerine") {
    disc(g, 5, 5, 3.2, 3, "#ff9a2e"); px(g, 4, 4, "#ffc46b"); rect(g, 5, 1, 1, 1, "#6b8a2f"); rect(g, 6, 1, 2, 1, "#5fae4a");
  } else if (kind === "apple") {
    disc(g, 4, 5, 2.4, 3, "#e0383f"); disc(g, 6, 5, 2.4, 3, "#e0383f"); px(g, 4, 4, "#ff8a8a"); rect(g, 5, 1, 1, 2, "#6b4a30"); rect(g, 6, 1, 2, 1, "#5fae4a");
  } else if (kind === "haribo") {
    [["#ff4d5e", 1], ["#5fd36a", 4], ["#ffa63a", 7]].forEach(([c, x]) => { rect(g, x as number, 3, 2, 5, c as string); px(g, x as number, 2, c as string); px(g, (x as number) + 1, 2, c as string); });
  } else if (kind === "stollen") {
    disc(g, 5, 5, 4.5, 2.6, "#f4ead4"); rect(g, 2, 3, 7, 1, "#ffffff"); px(g, 4, 5, "#c0392b"); px(g, 7, 5, "#7a9a3a"); rect(g, 2, 7, 7, 1, "#c99a55");
  } else if (kind === "cookie") {
    disc(g, 5, 5, 3.6, 3.2, "#d9a352"); disc(g, 4, 4, 1.6, 1, "#e8bb70"); for (const [x, y] of [[4, 5], [6, 4], [6, 6], [3, 6]] as [number, number][]) px(g, x, y, "#5a3420");
  } else if (kind === "buche") {
    rect(g, 1, 3, 7, 4, "#5a3420"); rect(g, 1, 3, 7, 1, "#7a4a2c"); disc(g, 8, 5, 1.8, 2.2, "#f1dcb0"); px(g, 8, 5, "#8a5a38"); rect(g, 2, 2, 3, 1, "#ffffff");
    px(g, 4, 1, "#2f8f4a"); px(g, 5, 1, "#2f8f4a"); px(g, 5, 2, "#e0383f");
  } else return null;
  return outline(g);
}

/** 그림이 차지한 부분만 남기고 둘레 빈칸을 자른다 */
function crop(g: Grid): Grid {
  let x0 = g.w, y0 = g.h, x1 = -1, y1 = -1;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.d[y * g.w + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < 0) return g;
  const out = grid(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px(out, x - x0, y - y0, g.d[y * g.w + x]);
  return out;
}

/** 먹는 중인 간식·음료를 머리 옆에 띄울 작은 그림 (모르는 종류는 null) */
export function eatGrid(kind: string): Grid | null {
  const tiny = tinySnack(kind);
  if (tiny) return crop(tiny);
  if (SNACKS.includes(kind)) return crop(outline(halve(snackGrid(kind as SnackId))));
  if (TTEOK.includes(kind)) return crop(outline(halve(tteokGrid(kind as TteokId))));
  if (["coffee", "americano", "vanillalatte", "cappuccino", "tea", "beer", "vinchaud", "warmmilk"].includes(kind)) return crop(drinkGrid(kind));
  return null;
}
