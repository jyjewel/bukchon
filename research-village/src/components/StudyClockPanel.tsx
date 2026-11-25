"use client";
import type { Desk } from "@/hooks/useLibraryDesk";
import { Window } from "./ui";

const hms = (sec: number) => { const s = Math.max(0, Math.floor(sec)); return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")).join(":"); };

/** 벽시계를 누르면 열리는 내 공부 시간: 오늘 합계를 디지털 시계로 보여 주고 모래시계를 돌리거나 멈춘다 */
export default function StudyClockPanel({ desk, seconds, now, onTurn }: { desk: Desk | undefined; seconds: number; now: number; onTurn: () => void }) {
  const running = Boolean(desk?.running);
  const turnSec = running && desk?.since ? (now - new Date(desk.since).getTime()) / 1000 : 0;
  return (
    <Window title="⏱ 내 공부 시간" tone="mint">
      <div className="space-y-3 p-4 text-center">
        <p className="text-sm text-ink-soft">오늘 공부한 시간</p>
        <p className="rounded-lg border border-ink bg-[#1d2a24] px-3 py-4 font-display text-5xl tracking-widest text-[#9dffb0] tabular-nums max-sm:text-4xl" role="timer" aria-label={`오늘 공부 시간 ${hms(seconds)}`}>{hms(seconds)}</p>
        <p className="text-sm">{running ? <>모래시계가 돌아가는 중이에요 · 이번에 <b className="font-display">{Math.floor(turnSec / 60)}</b>분째</> : "모래시계가 멈춰 있어요"}</p>
        <button type="button" className={`btn ${running ? "" : "btn-primary"}`} onClick={onTurn}>{running ? "⏳ 모래시계 멈추기" : "⏳ 모래시계 돌려서 공부 시작"}</button>
        <p className="text-xs text-ink-soft">시간은 한국 날짜 기준으로 날마다 0부터 다시 시작해요.</p>
      </div>
    </Window>
  );
}
