/** 댓글 묶음에서 한 댓글 아래에 달린 모든 답글(답글의 답글 포함)을 작성 순서대로 돌려준다 */
export function threadOf<T extends { id: string; reply_to: string | null; created_at: string }>(all: T[], rootId: string): T[] {
  const out: T[] = [];
  const seen = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of all) if (c.reply_to && seen.has(c.reply_to) && !seen.has(c.id)) { seen.add(c.id); out.push(c); grew = true; }
  }
  return out.sort((a, b) => a.created_at.localeCompare(b.created_at));
}
