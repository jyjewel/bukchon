"use client";
import { useState } from "react";

/** 달력: 일지를 쓴 날은 색이 칠해지고, 날짜를 누르면 그날 일지가 열린다 */
export default function JournalCalendar({ today, selected, logs, onPick, note = "색이 칠해진 날은 일지를 쓴 날이에요." }: { today: string; selected: string; logs: { log_date: string }[]; onPick: (d: string) => void; note?: string }) {
  const [month, setMonth] = useState(selected.slice(0, 7));
  const [y, m] = month.split("-").map(Number);
  const byDate = new Map(logs.map((l) => [l.log_date, l]));
  const first = new Date(y, m - 1, 1).getDay(), days = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  const move = (n: number) => { const d = new Date(y, m - 1 + n, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };
  return (
    <div className="mt-1 max-w-sm" aria-label="일지 달력">
      <div className="mb-1 flex items-center justify-between">
        <button type="button" className="btn btn-sm" onClick={() => move(-1)} aria-label="이전 달">◀</button>
        <span className="font-display text-sm">{y}년 {m}월</span>
        <button type="button" className="btn btn-sm" disabled={month >= today.slice(0, 7)} onClick={() => move(1)} aria-label="다음 달">▶</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-soft" aria-hidden>
        {["일", "월", "화", "수", "목", "금", "토"].map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const log = byDate.get(d), future = d > today, on = d === selected;
          return (
            <button key={d} type="button" disabled={future} onClick={() => onPick(d)} aria-label={`${m}월 ${Number(d.slice(8))}일${log ? " 일지 있음" : ""}`} aria-pressed={on}
              className={`h-9 rounded-md border text-sm ${on ? "border-[#3a2a33] bg-[#ffe07a] font-display" : log ? "border-[#e0c98a] bg-[#fff3c4]" : "border-transparent"} ${d === today && !on ? "ring-1 ring-[#e07a8a]" : ""} ${future ? "opacity-30" : ""}`}>
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-ink-soft">{note}</p>
    </div>
  );
}
