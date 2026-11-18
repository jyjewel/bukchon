/** 한국 시각 기준 날짜·시각 */
export function kst(d = new Date()) {
  const k = new Date(d.getTime() + 9 * 3600_000);
  return { y: k.getUTCFullYear(), m: k.getUTCMonth() + 1, d: k.getUTCDate(), h: k.getUTCHours() };
}
/** 이브 밤(12/24 18시 ~ 12/25 06시)엔 산타가 돌아다니고, 놓친 사람은 12/25 아침(06시~자정)에 선물을 받는다 */
export type XmasPhase = "eve" | "morning" | null;
export function xmasPhase(d = new Date()): XmasPhase {
  const { m, d: day, h } = kst(d);
  if (m !== 12) return null;
  if ((day === 24 && h >= 18) || (day === 25 && h < 6)) return "eve";
  if (day === 25 && h >= 6) return "morning";
  return null;
}
