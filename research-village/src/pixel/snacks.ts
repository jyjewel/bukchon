import { disc, grid, outline, px, rect, shade, type Grid } from "./core";

export const SNACK_W = 18;
export const SNACK_H = 15;
export type SnackId = "mochi" | "yakgwa" | "tangerine" | "apple" | "minishell" | "bungeoppang" | "cupbokki" | "haribo" | "stollen" | "cookie" | "buche";

/** 건네기 간식 도트 그림 (고르는 카드에 쓴다) */
export function snackGrid(kind: SnackId): Grid {
  const g = grid(SNACK_W, SNACK_H);
  if (kind === "mochi") {
    // 요거트 찹쌀떡: 하얀 가루 묻힌 말랑한 떡과, 반으로 갈라 요거트 크림이 보이는 떡
    disc(g, 6, 9, 5.5, 4.6, "#e9e4f0"); disc(g, 6, 8, 5.2, 4.2, "#fffdf8"); disc(g, 4, 6, 2, 1.2, "#ffffff");
    for (const [x, y] of [[3, 9], [7, 11], [9, 8], [5, 5]] as [number, number][]) px(g, x, y, "#efe9f6");
    px(g, 8, 6, "#cfe0ff"); px(g, 9, 7, "#cfe0ff");
    disc(g, 13, 9, 4.2, 3.8, "#e9e4f0"); disc(g, 13, 8, 4, 3.4, "#fffdf8"); disc(g, 13, 8, 2.4, 1.8, "#ffe6ef"); px(g, 12, 8, "#ffffff"); px(g, 14, 7, "#ffc9d9");
  } else if (kind === "yakgwa") {
    // 약과: 꿀 먹인 갈색 팔각 과자에 꽃무늬
    disc(g, 9, 8, 7, 5.6, "#8a5a2a"); disc(g, 9, 7, 6.6, 5.2, "#c0813f");
    disc(g, 9, 7, 4.6, 3.4, "#d49a52");
    for (const [x, y] of [[9, 4], [9, 10], [5, 7], [13, 7], [6, 5], [12, 5], [6, 9], [12, 9]] as [number, number][]) px(g, x, y, "#9a6128");
    px(g, 9, 7, "#8a5a2a"); px(g, 8, 6, "#f3c987"); px(g, 7, 5, "#f8dba6"); px(g, 11, 8, "#f3c987");
  } else if (kind === "tangerine") {
    // 귤: 주황색 귤과 한 쪽 벗긴 귤
    disc(g, 6, 8, 5.4, 5, "#d2701b"); disc(g, 6, 8, 5, 4.6, "#ff9a2e"); disc(g, 4, 6, 1.8, 1.2, "#ffc46b");
    for (const [x, y] of [[8, 10], [3, 9], [7, 6]] as [number, number][]) px(g, x, y, "#e8801a");
    rect(g, 6, 2, 1, 2, "#6b8a2f"); rect(g, 7, 3, 3, 1, "#5fae4a"); px(g, 9, 2, "#7fcf5e");
    disc(g, 14, 10, 3.2, 2.6, "#ffb347"); rect(g, 12, 9, 5, 1, "#ffd48a"); rect(g, 12, 11, 5, 1, "#e8801a"); px(g, 14, 8, "#ffd48a");
  } else if (kind === "apple") {
    // 사과: 반들반들한 빨간 사과와 잎사귀
    disc(g, 6.5, 9, 5.6, 5, "#b5232b"); disc(g, 10.5, 9, 4.6, 5, "#b5232b");
    disc(g, 6.5, 8.5, 5.2, 4.6, "#e0383f"); disc(g, 10.5, 8.5, 4.4, 4.6, "#e0383f");
    px(g, 8, 5, "#8e1a22"); px(g, 8, 4, "#8e1a22");
    rect(g, 8, 2, 1, 3, "#6b4a30"); rect(g, 9, 2, 3, 1, "#5fae4a"); px(g, 11, 3, "#4f9a54");
    rect(g, 4, 7, 2, 1, "#ff8a8a"); px(g, 4, 8, "#ff8a8a"); px(g, 12, 11, "#b5232b");
  } else if (kind === "minishell") {
    // 미니쉘: 조개 모양 마들렌 두 개
    const shell = (cx: number, cy: number) => {
      disc(g, cx, cy, 5, 4.2, "#b97a35"); disc(g, cx, cy - 0.4, 4.6, 3.8, "#e8b567"); rect(g, cx - 4, cy + 2, 9, 2, "#e8b567");
      for (let i = -3; i <= 3; i += 2) rect(g, cx + i, cy - 2, 1, 5, "#c98a40");
      px(g, cx - 2, cy - 2, "#f6d79b"); px(g, cx + 1, cy - 3, "#f6d79b"); rect(g, cx - 1, cy + 3, 3, 1, "#fff0c4");
    };
    shell(6, 7); shell(12, 10);
  } else if (kind === "bungeoppang") {
    // 붕어빵: 노릇노릇한 물고기 모양 빵 두 마리(비늘 무늬, 꼬리지느러미)
    const fish = (cx: number, cy: number, r: number) => {
      disc(g, cx, cy, r, r * 0.62, "#a8641f"); disc(g, cx, cy - 0.3, r - 0.4, r * 0.62 - 0.5, "#e8a64a"); disc(g, cx - 1, cy - 1.2, r * 0.45, r * 0.22, "#f6c878");
      rect(g, cx - r - 2, cy - 2, 3, 5, "#d98a30"); px(g, cx - r - 3, cy - 3, "#d98a30"); px(g, cx - r - 3, cy + 3, "#d98a30"); px(g, cx - r - 1, cy, "#a8641f");
      for (let i = -1; i <= 3; i++) for (const dy of [-1, 1]) px(g, Math.round(cx - 1 + i * 1.5), Math.round(cy + dy), "#c98a3a");
      px(g, Math.round(cx + r - 2), Math.round(cy - 1), "#3a2a33");
    };
    fish(11, 4, 4.4); fish(10, 10.5, 4.2);
  } else if (kind === "cupbokki") {
    // 컵볶이: 종이컵 가득 빨간 떡볶이 떡과 꼬치
    for (let y = 6; y <= 13; y++) { const inset = Math.floor((y - 6) / 3); rect(g, 4 + inset, y, 10 - inset * 2, 1, y === 9 || y === 10 ? "#e0383f" : "#fffdf8"); px(g, 4 + inset, y, "#d8d0c4"); px(g, 13 - inset, y, "#d8d0c4"); }
    rect(g, 4, 6, 10, 1, "#d8d0c4");
    for (const [x, y] of [[5, 3], [8, 2], [11, 3], [6, 5], [10, 5]] as [number, number][]) { rect(g, x, y, 3, 3, "#d4421f"); rect(g, x, y, 3, 1, "#f2683a"); px(g, x + 1, y + 1, "#8a1f12"); }
    rect(g, 13, 0, 1, 6, "#c9a24e"); px(g, 13, 0, "#e8c870"); rect(g, 12, 1, 3, 2, "#e8b567"); px(g, 13, 1, "#c98a40");
  } else if (kind === "stollen") {
    // 슈톨렌: 슈거파우더를 듬뿍 뿌린 길쭉한 빵, 단면에 건과일
    disc(g, 9, 9, 8, 4.6, "#c99a55"); disc(g, 9, 8, 7.6, 4.2, "#f4ead4"); rect(g, 3, 5, 12, 1, "#ffffff"); rect(g, 4, 6, 4, 1, "#ffffff");
    for (const [x, y] of [[5, 8], [8, 7], [11, 9], [13, 7], [7, 10]] as [number, number][]) px(g, x, y, "#e9dcc0");
    px(g, 6, 9, "#c0392b"); px(g, 10, 8, "#7a9a3a"); px(g, 12, 10, "#c0392b"); px(g, 9, 10, "#e0a53a");
    rect(g, 4, 12, 11, 1, "#a07a3e"); px(g, 15, 9, "#c99a55");
  } else if (kind === "cookie") {
    // 쿠키: 초코칩 쿠키와 별 모양 설탕 쿠키
    disc(g, 6, 8, 5.4, 4.8, "#a8742f"); disc(g, 6, 7.6, 5, 4.4, "#d9a352"); disc(g, 5, 6, 2, 1.2, "#e8bb70");
    for (const [x, y] of [[4, 8], [7, 6], [8, 10], [5, 10], [9, 8]] as [number, number][]) { px(g, x, y, "#5a3420"); px(g, x + 1, y, "#5a3420"); }
    rect(g, 13, 4, 2, 9, "#c9944a"); rect(g, 10, 7, 8, 2, "#c9944a"); rect(g, 11, 5, 6, 2, "#d9a352"); rect(g, 11, 9, 6, 3, "#d9a352"); rect(g, 12, 7, 4, 2, "#f4d9a0");
    px(g, 14, 8, "#e0383f"); px(g, 12, 6, "#ffffff"); px(g, 16, 10, "#ffffff");
  } else if (kind === "buche") {
    // 부쉬드 노엘: 통나무 모양 초코 롤케이크, 단면 소용돌이, 호랑가시 잎과 열매, 슈거파우더
    rect(g, 2, 6, 13, 7, "#5a3420"); rect(g, 2, 6, 13, 2, "#7a4a2c"); rect(g, 3, 9, 11, 1, "#6b3f26"); rect(g, 4, 11, 9, 1, "#6b3f26");
    for (const x of [4, 7, 10, 12]) px(g, x, 7, "#9a6a40");
    disc(g, 15, 9.5, 3.2, 3.6, "#7a4a2c"); disc(g, 15, 9.5, 2.2, 2.6, "#f1dcb0"); disc(g, 15, 9.5, 1.2, 1.4, "#8a5a38"); px(g, 15, 9, "#f1dcb0");
    rect(g, 4, 5, 3, 1, "#ffffff"); rect(g, 9, 5, 4, 1, "#ffffff"); px(g, 6, 6, "#ffffff");
    px(g, 6, 3, "#2f8f4a"); px(g, 7, 2, "#2f8f4a"); px(g, 8, 3, "#2f8f4a"); px(g, 7, 4, "#2f8f4a"); px(g, 9, 3, "#4fb868"); px(g, 10, 4, "#4fb868");
    px(g, 7, 3, "#e0383f"); px(g, 8, 4, "#e0383f"); px(g, 9, 4, "#c0392b");
  } else {
    // 하리보: 빨강·초록·주황 곰 젤리
    const bear = (x: number, y: number, c: string) => {
      const d = shade(c, -45), l = shade(c, 60);
      disc(g, x + 2, y + 1.5, 2, 1.8, c); px(g, x, y - 0.5, c); px(g, x + 4, y - 0.5, c);                 // 머리와 귀
      rect(g, x + 1, y + 3, 3, 3, c); rect(g, x, y + 3, 1, 2, c); rect(g, x + 4, y + 3, 1, 2, c);          // 몸과 팔
      rect(g, x + 1, y + 6, 1, 1, c); rect(g, x + 3, y + 6, 1, 1, c);                                       // 다리
      px(g, x + 1, y + 1, d); px(g, x + 3, y + 1, d); px(g, x + 2, y + 3, l); px(g, x + 1, y + 4, l);
    };
    bear(1, 6, "#ff4d5e"); bear(6, 3, "#5fd36a"); bear(11, 7, "#ffa63a"); bear(5, 8, "#ffe14d");
  }
  return outline(g);
}
