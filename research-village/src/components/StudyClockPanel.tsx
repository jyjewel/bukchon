"use client";
import type { Desk } from "@/hooks/useLibraryDesk";
import { Window } from "./ui";

const hms = (sec: number) => { const s = Math.max(0, Math.floor(sec)); return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")).join(":"); };

/** 벽시계를 누르면 열리는 내 공부 시간: 오늘 합계를 디지털 시계로 보여 주고 재생·일시정지로 잰다 */
export default function StudyClockPanel({ desk, seconds, onTurn }: { desk: Desk | undefined; seconds: number; now?: number; onTurn: () => void }) {
  const running = Boolean(desk?.running);
  return (
    <Window title="⏱ 내 공부 시간" tone="mint">
      <div className="space-y-3 p-4 text-center">
        <p className="text-sm text-ink-soft">오늘 공부한 시간</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <p className="rounded-lg border border-ink bg-[#1d2a24] px-3 py-4 font-display text-5xl tracking-widest text-[#9dffb0] tabular-nums max-sm:text-4xl" role="timer" aria-label={`오늘 공부 시간 ${hms(seconds)}`}>{hms(seconds)}</p>
          <div className="flex gap-2" role="group" aria-label="공부 시간 재기">
            <button type="button" className={`btn h-14 w-14 !p-0 ${running ? "" : "btn-primary"}`} aria-label="공부 시작" title="시작" disabled={running} onClick={onTurn}>
              <svg viewBox="0 0 16 16" width="22" height="22" aria-hidden className="mx-auto"><path d="M4 2 L13 8 L4 14 Z" fill="currentColor" /></svg>
            </button>
            <button type="button" className={`btn h-14 w-14 !p-0 ${running ? "btn-primary" : ""}`} aria-label="일시정지" title="일시정지" disabled={!running} onClick={onTurn}>
              <svg viewBox="0 0 16 16" width="22" height="22" aria-hidden className="mx-auto"><rect x="3" y="2" width="4" height="12" fill="currentColor" /><rect x="9" y="2" width="4" height="12" fill="currentColor" /></svg>
            </button>
          </div>
        </div>
        <p className="text-xs text-ink-soft">시간은 오전 6시에 0부터 다시 시작해요.</p>
      </div>
    </Window>
  );
}
