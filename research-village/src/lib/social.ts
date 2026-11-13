/** 이웃끼리 주고받는 상호작용의 종류와 문구 */
export const GESTURES = [
  { id: "thesis", label: "학위논문", icon: "📘", hit: "학위논문(312쪽)으로 때렸어요!" },
  { id: "footnote", label: "각주 폭탄", icon: "💣", hit: "각주 폭탄을 던졌어요!" },
  { id: "redpen", label: "빨간 펜", icon: "🖍️", hit: "빨간 펜으로 첨삭했어요!" },
  { id: "alarm", label: "마감 알람", icon: "⏰", hit: "마감 알람을 울렸어요!" },
] as const;
export type GestureId = (typeof GESTURES)[number]["id"];

export const GIFTS = [
  { id: "coffee", label: "커피 한 잔", icon: "☕" },
  { id: "americano", label: "아이스 아메리카노", icon: "🧊" },
  { id: "snack", label: "간식", icon: "🍪" },
  { id: "tea", label: "따뜻한 차", icon: "🍵" },
] as const;
export type GiftId = (typeof GIFTS)[number]["id"];

export const REACTIONS = [
  { id: "coffee", label: "응원해요", icon: "☕" },
  { id: "clap", label: "대단해요", icon: "👏" },
  { id: "book", label: "저도 읽었어요", icon: "📚" },
  { id: "heart", label: "공감해요", icon: "💗" },
] as const;

export const gestureOf = (id: string) => GESTURES.find((g) => g.id === id);
export const giftOf = (id: string) => GIFTS.find((g) => g.id === id);
export const reactionOf = (id: string) => REACTIONS.find((g) => g.id === id);

/** 마지막 접속에서 지난 날수 (오프라인일 때만 의미가 있다) */
export function awayDays(lastSeenIso: string, now = Date.now()): number {
  return Math.floor((now - new Date(lastSeenIso).getTime()) / 86_400_000);
}
