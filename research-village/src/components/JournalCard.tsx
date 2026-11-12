"use client";
import { dateKey, dateLabel } from "@/lib/time";
import type { useJournal } from "@/hooks/useJournal";

type Journal = ReturnType<typeof useJournal>;

function shift(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return dateKey(new Date(y, m - 1, d + days));
}

/** 오늘의 일지: 하루를 마무리하며 적는 나만의 기록. 날짜를 옮겨 지난 일지도 볼 수 있다. */
export default function JournalCard({ journal }: { journal: Journal }) {
  const { date, today } = journal;
  const label = { idle: "", saving: "저장 중…", saved: "저장됨", error: "저장하지 못했어요" }[journal.state];
  return (
    <div className="space-y-2 p-3">
      <p className="text-xs text-ink-soft">나만 볼 수 있어요. 쓰는 동안 자동으로 저장돼요.</p>
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" className="btn btn-sm" onClick={() => void journal.setDate(shift(date, -1))} aria-label="전날">◀</button>
        <label className="sr-only" htmlFor="journal-date">일지 날짜</label>
        <input id="journal-date" type="date" className="input !w-auto" value={date} max={today} onChange={(e) => e.target.value && void journal.setDate(e.target.value)} />
        <button type="button" className="btn btn-sm" disabled={date >= today} onClick={() => void journal.setDate(shift(date, 1))} aria-label="다음날">▶</button>
        {date !== today && <button type="button" className="btn btn-sm btn-primary" onClick={() => void journal.setDate(today)}>오늘로</button>}
        <span className="flex-1" />
        <span className="text-xs" role="status">{label}</span>
      </div>
      <p className="font-display">{date === today ? "오늘의 일지" : "지난 일지"} · {dateLabel(date)}</p>
      <label className="sr-only" htmlFor="journal-body">일지</label>
      <textarea
        id="journal-body" className="input" rows={8} maxLength={20000} value={journal.body} disabled={!journal.loaded}
        onChange={(e) => journal.edit(e.target.value)} onBlur={() => void journal.flush()}
        placeholder={date === today ? "오늘 한 연구, 읽은 것, 막힌 점, 내일 할 일…" : "이 날의 일지가 비어 있어요."}
      />
      {journal.recent.length > 0 && (
        <details className="dotted pt-2">
          <summary className="label">최근 일지 {journal.recent.length}개</summary>
          <ul className="mt-1 space-y-1">
            {journal.recent.slice(0, 14).map((l) => (
              <li key={l.log_date}>
                <button type="button" className={`card w-[calc(100%-6px)] px-2 py-1 text-left text-xs ${l.log_date === date ? "card-on" : ""}`} onClick={() => void journal.setDate(l.log_date)}>
                  <span className="font-display">{dateLabel(l.log_date)}</span> · <span className="text-ink-soft">{l.body.replace(/\s+/g, " ").slice(0, 40)}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
