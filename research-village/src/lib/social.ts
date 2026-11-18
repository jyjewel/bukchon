/** 이웃끼리 주고받는 상호작용의 종류와 문구 */
export const GESTURES = [
  { id: "thesis", label: "학위논문", icon: "📘", hit: "학위논문(312쪽)으로 때렸어요!" },
  { id: "alarm", label: "마감 알림", icon: "⏰", hit: "마감 알림을 울렸어요!" },
  { id: "snack", label: "학회 하고 남은 과자", icon: "🍪", hit: "학회 하고 남은 과자를 던졌어요!" },
] as const;
export type GestureId = (typeof GESTURES)[number]["id"];
/** 예전에 보낸 알림이 계속 읽히도록 남겨 둔 지금은 보낼 수 없는 던지기 */
const OLD_GESTURES = [
  { id: "footnote", hit: "각주 폭탄을 던졌어요!" },
  { id: "redpen", hit: "빨간 펜으로 첨삭했어요!" },
] as const;

export const GIFTS = [
  { id: "coffee", label: "커피 한 잔", icon: "☕" },
  { id: "americano", label: "아이스 아메리카노", icon: "🧊" },
  { id: "mochi", label: "요거트 찹쌀떡", icon: "🍡" },
  { id: "yakgwa", label: "약과", icon: "🍪" },
  { id: "tangerine", label: "귤", icon: "🍊" },
  { id: "apple", label: "사과", icon: "🍎" },
  { id: "minishell", label: "미니쉘", icon: "🐚" },
  { id: "haribo", label: "하리보", icon: "🧸" },
  { id: "tea", label: "따뜻한 차", icon: "🍵" },
  { id: "beer", label: "맥주 한 잔", icon: "🍺" },
] as const;
export type GiftId = (typeof GIFTS)[number]["id"];

/** 일지 반응: id 는 DB 값, icon 은 도트 아이콘 이름 */
export const REACTIONS = [
  { id: "heart", label: "공감해요", icon: "heart" },
  { id: "clap", label: "좋아요", icon: "thumbsup" },
  { id: "coffee", label: "응원해요", icon: "coffee" },
  { id: "book", label: "저도 읽었어요", icon: "book" },
] as const;

export const gestureOf = (id: string): { id: string; hit: string } | undefined => GESTURES.find((g) => g.id === id) ?? OLD_GESTURES.find((g) => g.id === id);
export const isGesture = (id: string): id is GestureId => GESTURES.some((g) => g.id === id);
/** 이사 떡 (건네기 메뉴에는 없고, 이사 떡 돌리기로만 가는 선물) */
export const TTEOK = [
  { id: "siru", label: "팥시루떡", icon: "🍡" },
  { id: "rainbow", label: "무지개떡", icon: "🍡" },
  { id: "songpyeon", label: "송편", icon: "🍡" },
] as const;
export type TteokKind = (typeof TTEOK)[number]["id"];
/** 예전에 건넨 "간식" 선물이 계속 읽히도록 남겨 둔 종류 */
const OLD_GIFTS = [{ id: "snack", label: "간식", icon: "🍪" }, { id: "makgeolli", label: "막걸리", icon: "🍶" }, { id: "cocoa", label: "핫초코", icon: "☕" }, { id: "gingerbread", label: "진저맨 쿠키", icon: "🍪" }, { id: "stollen", label: "슈톨렌", icon: "🍞" }, { id: "xmascake", label: "딸기 케이크", icon: "🍰" }] as const;
/** 간식으로 묶이는 선물 (고르는 화면에서 따로 보여 준다) */
export const SNACK_IDS = ["mochi", "yakgwa", "tangerine", "apple", "minishell", "haribo"] as const;
export const giftOf = (id: string): { id: string; label: string; icon: string } | undefined => GIFTS.find((g) => g.id === id) ?? TTEOK.find((g) => g.id === id) ?? OLD_GIFTS.find((g) => g.id === id);
export const reactionOf = (id: string) => REACTIONS.find((g) => g.id === id);

/** 마지막 접속에서 지난 날수 (오프라인일 때만 의미가 있다) */
export function awayDays(lastSeenIso: string, now = Date.now()): number {
  return Math.floor((now - new Date(lastSeenIso).getTime()) / 86_400_000);
}
