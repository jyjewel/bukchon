/** 학회 명찰의 역할: 참석자 · 토론자(은) · 발표자(금) · 개최자(자주) */
export type ConfRole = "attendee" | "discussant" | "presenter" | "host";
export const CONF_ROLES: { id: ConfRole; label: string; badge: string }[] = [
  { id: "attendee", label: "참석", badge: "명찰" },
  { id: "discussant", label: "토론", badge: "은색 뱃지" },
  { id: "presenter", label: "발표", badge: "금색 뱃지" },
  { id: "host", label: "개최", badge: "자주색 뱃지" },
];
export const roleLabel = (r: string) => CONF_ROLES.find((x) => x.id === r)?.label ?? "참석";
export interface NameTag { id: string; post_id: string | null; title: string; event_date: string; role: ConfRole; checked_at: string }
export const confLink = (code: string) => `${typeof window === "undefined" ? "" : window.location.origin + window.location.pathname.replace(/\/$/, "")}/?conf=${code}`;
