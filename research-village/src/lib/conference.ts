/** 학회 명찰의 역할: 참석자 · 토론자(은) · 발표자(금) · 개최자(자주) */
export type ConfRole = "attendee" | "discussant" | "presenter" | "host";
export const CONF_ROLES: { id: ConfRole; label: string; badge: string }[] = [
  { id: "attendee", label: "참석자", badge: "흰색 뱃지" },
  { id: "discussant", label: "토론자", badge: "은색 뱃지" },
  { id: "presenter", label: "발표자", badge: "금색 뱃지" },
  { id: "host", label: "개최자", badge: "자주색 뱃지" },
];
export const roleLabel = (r: string) => CONF_ROLES.find((x) => x.id === r)?.label ?? "참석";
export interface NameTag { id: string; conference_id: string; title: string; event_date: string; role: ConfRole; talk_title: string | null; checked_at: string }
