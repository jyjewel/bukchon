export function hms(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

export function humanDuration(totalSeconds: number): string {
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  if (m < 1) return "1분 미만";
  const h = Math.floor(m / 60);
  return h ? `${h}시간 ${m % 60}분` : `${m}분`;
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 이번 주 월요일 0시 */
export function startOfWeek(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function startOfMonth(): Date {
  const d = startOfToday();
  d.setDate(1);
  return d;
}

export function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "방금";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

export type Season = "spring" | "summer" | "autumn" | "winter";
export function currentSeason(d = new Date()): Season {
  const m = d.getMonth() + 1;
  return m >= 3 && m <= 5 ? "spring" : m >= 6 && m <= 8 ? "summer" : m >= 9 && m <= 11 ? "autumn" : "winter";
}

export type DayPhase = "dawn" | "day" | "dusk" | "night";
export function currentPhase(d = new Date()): DayPhase {
  const h = d.getHours();
  return h >= 5 && h < 7 ? "dawn" : h >= 7 && h < 17 ? "day" : h >= 17 && h < 20 ? "dusk" : "night";
}

/** 브라우저 현지 날짜를 YYYY-MM-DD 로 */
export function dateKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function dateLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}
export function clockLabel(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { month: "long", day: "numeric", weekday: "short", hour: "numeric", minute: "2-digit" });
}

/** 마감일까지 남은 날수 (오늘이면 0, 지났으면 음수). 둘 다 YYYY-MM-DD */
export function daysUntil(due: string, today: string): number {
  const [y, m, d] = due.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000);
}
export function ddayLabel(n: number): string {
  return n > 0 ? `D-${n}` : n === 0 ? "D-DAY" : `D+${-n}`;
}
