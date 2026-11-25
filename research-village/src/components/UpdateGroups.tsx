import type { UpdateEntry } from "@/lib/updates";

/** 업데이트 소식을 날짜별로 묶어 보여 준다. 가장 최근 날짜만 펼쳐 두고, 나머지는 눌러서 연다. */
export default function UpdateGroups({ list, openAll = false }: { list: UpdateEntry[]; openAll?: boolean }) {
  const groups: { date: string; items: UpdateEntry[] }[] = [];
  for (const u of list) {
    const g = groups.find((x) => x.date === u.date);
    if (g) g.items.push(u); else groups.push({ date: u.date, items: [u] });
  }
  return (
    <div className="space-y-2">
      {groups.map((g, i) => (
        <details key={g.date} open={openAll || i === 0} className="card px-3 py-2">
          <summary className="cursor-pointer font-display">{g.date} <span className="text-xs text-ink-soft">· {g.items.length}건</span></summary>
          <ul className="mt-2 space-y-2">
            {g.items.map((u) => (
              <li key={u.id}>
                <p>{u.title}</p>
                {u.body && <p className="text-sm text-ink-soft">{u.body}</p>}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
