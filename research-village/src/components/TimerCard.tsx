"use client";
import { useState } from "react";
import { hms, humanDuration } from "@/lib/time";
import type { useTimer } from "@/hooks/useTimer";

type Timer = ReturnType<typeof useTimer>;

export default function TimerCard({ timer, goalMinutes, defaultSubject }: { timer: Timer; goalMinutes: number; defaultSubject: string }) {
  const [subject, setSubject] = useState("");
  const { active, running, busy, elapsed, stats } = timer;
  const goalSec = goalMinutes * 60;
  const pct = goalSec ? Math.min(100, Math.round((stats.today / goalSec) * 100)) : 0;
  return (
    <div className="space-y-2 p-3">
      <p className="text-center font-display text-4xl tabular-nums" role="timer" aria-live="off" aria-label={`이번 연구 시간 ${humanDuration(elapsed)}`}>
        {hms(elapsed)}
      </p>
      {active ? (
        <p className="text-center text-sm text-ink-soft">
          {running ? "연구 중" : "잠시 멈춤"}{active.subject && ` · ${active.subject}`}
        </p>
      ) : (
        <div>
          <label className="label" htmlFor="timer-subject">무엇을 연구하나요? <span className="text-ink-soft">(선택)</span></label>
          <input id="timer-subject" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={60} placeholder={defaultSubject || "예: 한문 강독"} />
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        {!active && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => timer.start(subject.trim() || defaultSubject)}>▶ 시작</button>}
        {active && running && <button type="button" className="btn" disabled={busy} onClick={() => timer.pause()}>|| 일시정지</button>}
        {active && !running && <button type="button" className="btn btn-mint" disabled={busy} onClick={() => timer.resume()}>▶ 이어서</button>}
        {active && <button type="button" className="btn btn-primary" disabled={busy} onClick={async () => { await timer.stop(); setSubject(""); }}>■ 종료</button>}
      </div>
      <div className="dotted pt-2 text-sm">
        <p>오늘의 연구 시간 <strong className="font-display">{stats.today ? humanDuration(stats.today) : "아직 없음"}</strong></p>
        {goalSec > 0 && (
          <div className="mt-1">
            <div className="px-box m-[3px] h-3 overflow-hidden bg-[#fffdf6]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="오늘 목표 달성률">
              <div className="h-full bg-mint" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-0.5 text-xs text-ink-soft">목표 {humanDuration(goalSec)} 중 {pct}%{pct >= 100 && " "}</p>
          </div>
        )}
      </div>
    </div>
  );
}
