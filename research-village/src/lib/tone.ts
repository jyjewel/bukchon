import type { CSSProperties } from "react";

/** 댓글·답장 줄 모양: 누가 썼든 옅은 회갈색 바탕에 세로줄 하나(일지·글 본문의 흰 바탕과 구분된다)(글쓴이는 이름으로 구분한다) */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- 호출하는 쪽 모양을 그대로 두려고 인자를 남겨 둔다
export function speakerStyle(_authorId: string | null, _ownerId: string, _myId: string): CSSProperties {
  return { background: "#f3f0e8", borderLeft: "3px solid #d6cbb0", padding: "3px 8px" };
}
/** 이름 표시: 내가 쓴 글에는 '나' */
export const speakerName = (authorId: string, myId: string, name: string) => (authorId === myId ? `나(${name})` : name);
export const OWNER_BG = "#ffffff";
