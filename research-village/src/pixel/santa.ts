import type { Avatar } from "@/lib/types";
import { disc, grid, outline, px, rect, type Grid } from "./core";

/** 크리스마스 이브에 마을을 돌아다니는 산타 (캐릭터와 같은 그림 방식으로 그린다) */
export const SANTA_AVATAR: Avatar = {
  skin: "#f6cba6", hair: "short", hairColor: "#f4f4f8", beard: "beard", eyes: "smile",
  top: "pullover", outfit: "#d9303a", pants: "#c02530", shoes: "default", hat: "santa", accessories: [], props: [],
};

/** 산타가 멘 선물 주머니 (12×14) */
export function sackGrid(): Grid {
  const g = grid(12, 14);
  disc(g, 6, 8, 5.5, 5.5, "#a8733f"); disc(g, 5, 7, 4.5, 4.5, "#c58d52");
  rect(g, 4, 1, 5, 3, "#a8733f"); rect(g, 3, 3, 7, 1, "#6b4a30");                        // 묶은 입구
  px(g, 5, 0, "#e0302a"); px(g, 6, 0, "#e0302a"); px(g, 7, 1, "#e0302a");              // 리본
  px(g, 8, 6, "#8a5a2a"); px(g, 4, 9, "#8a5a2a"); px(g, 7, 10, "#8a5a2a");
  return outline(g);
}

/** 루돌프 (오른쪽을 보고 걷는다, 26×22). frame 0/1 은 다리 동작 */
export function rudolphGrid(frame: 0 | 1): Grid {
  const g = grid(26, 22);
  const B = "#8a5a2a", BL = "#b07a40", BD = "#5f3d1c", BELLY = "#e8d2a8";
  // 다리 (앞뒤 두 쌍, 걸을 때 번갈아)
  const legs = frame === 0 ? [[5, 0], [8, 1], [15, 1], [18, 0]] : [[5, 1], [8, 0], [15, 0], [18, 1]];
  for (const [x, off] of legs) { rect(g, x, 14, 2, 6 - off, B); rect(g, x, 19 - off, 2, 1, BD); }
  disc(g, 11, 12, 8.5, 5, B); disc(g, 11, 11, 8, 4.4, BL); disc(g, 10, 14, 6, 2.2, BELLY);   // 몸통
  rect(g, 2, 10, 2, 2, "#ffffff");                                                             // 꼬리
  rect(g, 17, 6, 4, 8, B); rect(g, 17, 6, 1, 8, BL);                                           // 목
  disc(g, 21, 6, 3.4, 3, B); disc(g, 21, 5.4, 3, 2.6, BL);                                     // 머리
  rect(g, 22, 8, 4, 3, BL); px(g, 25, 8, "#ff3a2a"); px(g, 25, 9, "#e0201a"); px(g, 24, 8, "#ff9a90");   // 주둥이와 빨간 코
  px(g, 22, 5, "#2a1f26"); px(g, 23, 5, "#2a1f26");                                            // 눈
  // 뿔
  rect(g, 19, 0, 1, 4, BD); rect(g, 22, 0, 1, 4, BD); px(g, 18, 1, BD); px(g, 17, 0, BD); px(g, 21, 1, BD); px(g, 23, 0, BD); px(g, 24, 1, BD);
  px(g, 19, 1, "#7a5230"); px(g, 22, 2, "#7a5230");
  rect(g, 18, 11, 3, 1, "#d9303a"); px(g, 19, 12, "#ffd23f");                                 // 목에 걸린 방울 목걸이
  return outline(g);
}
