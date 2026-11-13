/** 쓰는 중인 글을 이 기기에 임시 보관한다. 저장이 실패하거나 탭이 닫혀도 다시 열면 되살릴 수 있다. */
export interface Draft {
  fields: Record<string, unknown>;
  baseRev: number | null; // 이 글을 쓰기 시작할 때 서버의 수정 번호
  at: number;
}
const k = (userId: string, kind: string, key: string) => `rv.draft.${userId}.${kind}.${key}`;

export function saveDraft(userId: string, kind: string, key: string, d: Draft) {
  try {
    localStorage.setItem(k(userId, kind, key), JSON.stringify(d));
  } catch {}
}
export function loadDraft(userId: string, kind: string, key: string): Draft | null {
  try {
    const raw = localStorage.getItem(k(userId, kind, key));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}
export function clearDraft(userId: string, kind: string, key: string) {
  try {
    localStorage.removeItem(k(userId, kind, key));
  } catch {}
}
