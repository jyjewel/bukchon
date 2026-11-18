import type { CSSProperties } from "react";

/** 글쓴이에 따라 색을 달리한다: 연구실 주인(따뜻한 상아색) · 나(연분홍) · 다른 사람(연하늘) */
export function speakerStyle(authorId: string | null, ownerId: string, myId: string): CSSProperties {
  const c = authorId === ownerId ? { bg: "#fff8e4", bar: "#d4a63a" } : authorId === myId ? { bg: "#ffe6ee", bar: "#e0708c" } : { bg: "#e3f1fb", bar: "#5f9fd6" };
  return { background: c.bg, borderLeft: `4px solid ${c.bar}`, padding: "3px 8px" };
}
/** 이름 표시: 내가 쓴 글에는 '나' */
export const speakerName = (authorId: string, myId: string, name: string) => (authorId === myId ? `나(${name})` : name);
export const OWNER_BG = "#fff8e4";
