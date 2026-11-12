"use client";
import { useState } from "react";
import { useRoom } from "@/hooks/useRoom";
import RoomBoards from "./RoomBoards";
import RoomCanvas from "./RoomCanvas";
import TimerCard from "./TimerCard";
import { Window } from "./ui";
import { STATUS_META } from "@/lib/constants";
import { humanDuration } from "@/lib/time";
import type { useTimer } from "@/hooks/useTimer";
import type { useNotes } from "@/hooks/useNotes";
import type { BoardTab, ResearchState, Resident, StatusRow } from "@/lib/types";

export default function StudyRoom({
  me, villageId, residents, tab, onTab, timer, notes, onStatus, onUpdateStatus,
}: {
  me: Resident;
  villageId: string;
  residents: Resident[];
  tab: BoardTab;
  onTab: (t: BoardTab) => void;
  timer: ReturnType<typeof useTimer>;
  notes: ReturnType<typeof useNotes>;
  onStatus: (s: ResearchState) => void;
  onUpdateStatus: (patch: Partial<Pick<StatusRow, "topic" | "reading">>) => void;
}) {
  const [topic, setTopic] = useState(me.status.topic);
  const [reading, setReading] = useState(me.status.reading);
  const room = useRoom(me.user_id, villageId);
  const inside = me.status.status === "focus" || me.status.status === "offline";
  const saveLabel = { idle: "", saving: "저장 중…", saved: "저장됨", error: "! 저장하지 못했어요" }[notes.state];
  const { stats } = timer;
  const max = Math.max(1, ...stats.bySubject.map((s) => s.seconds));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Window title={`${me.profile.display_name}의 연구실`} icon="" tone="butter">
          <RoomCanvas owner={me} inside={inside} studying={timer.running} boardCount={room.items.length} postitColors={room.postits.map((p) => p.color)} shelf={room.achievements.map((a) => a.kind)}
            note={inside ? undefined : `지금은 ${STATUS_META[me.status.status].where}`} onPick={onTab} />
          <div className="space-y-2 border-t-[3px] border-ink p-3">
            <p className="text-sm">
              {me.status.status === "focus"
                ? "집 안에 있어요. 다른 주민에게는 ‘집중 중’이라는 것만 보이고, 누구도 들어올 수 없어요."
                : me.status.status === "offline"
                  ? "불을 끄고 있어요. 다른 주민에게는 오프라인으로 보여요."
                  : `${STATUS_META[me.status.status].icon} 지금은 ${STATUS_META[me.status.status].where}`}
            </p>
            <div className="flex flex-wrap gap-2">
              {me.status.status !== "focus" && <button type="button" className="btn btn-primary" onClick={() => onStatus("focus")}>집 안에서 집중하기</button>}
              <button type="button" className="btn btn-mint" onClick={() => onStatus("open")}>밖에서 공부하기</button>
              <button type="button" className="btn" onClick={() => onStatus("library")}>도서관 가기</button>
              <button type="button" className="btn" onClick={() => onStatus("rest")}>광장에서 쉬기</button>
            </div>
          </div>
        </Window>

        <Window title="내 화이트보드 · 포스트잇 · 책장" tone="lilac">
          <RoomBoards owner={me} myId={me.user_id} villageId={villageId} residents={residents} room={room} tab={tab} onTab={onTab} />
        </Window>

        <Window title="지금 하는 연구" icon="" tone="sky">
          <div className="space-y-3 p-3">
            <p className="text-xs text-ink-soft">여기 적은 두 가지는 프로필을 눌러 본 마을 주민에게 보여요.</p>
            <div>
              <label className="label" htmlFor="room-topic">현재 연구 주제</label>
              <input id="room-topic" className="input" value={topic} maxLength={120} onChange={(e) => setTopic(e.target.value)} onBlur={() => topic !== me.status.topic && onUpdateStatus({ topic: topic.trim() })} placeholder="예: 조선 후기 방각본의 유통" />
            </div>
            <div>
              <label className="label" htmlFor="room-reading">읽고 있는 책</label>
              <input id="room-reading" className="input" value={reading} maxLength={120} onChange={(e) => setReading(e.target.value)} onBlur={() => reading !== me.status.reading && onUpdateStatus({ reading: reading.trim() })} />
            </div>
          </div>
        </Window>
      </div>

      <div className="space-y-4">
        <Window title="연구 타이머" icon="" tone="rose">
          <TimerCard timer={timer} goalMinutes={notes.notes.goal_minutes} defaultSubject={me.profile.field} />
        </Window>

        <Window title="오늘의 목표와 노트" icon="" tone="mint" actions={<span className="text-xs" role="status">{saveLabel}</span>}>
          <div className="space-y-3 p-3">
            <p className="text-xs text-ink-soft">목표와 노트는 나만 볼 수 있어요.</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label" htmlFor="room-goal">오늘의 목표</label>
                <input id="room-goal" className="input" value={notes.notes.goal} maxLength={200} onChange={(e) => notes.update({ goal: e.target.value })} disabled={!notes.loaded} placeholder="예: 2장 초고 마무리" />
              </div>
              <div className="w-36">
                <label className="label" htmlFor="room-goal-min">목표 시간(분)</label>
                <input id="room-goal-min" type="number" min={0} max={1440} step={10} className="input" value={notes.notes.goal_minutes || ""} onChange={(e) => notes.update({ goal_minutes: Math.max(0, Math.min(1440, Number(e.target.value) || 0)) })} disabled={!notes.loaded} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="room-note">개인 노트</label>
              <textarea id="room-note" className="input" rows={7} value={notes.notes.note} maxLength={20000} onChange={(e) => notes.update({ note: e.target.value })} onBlur={() => void notes.flush()} disabled={!notes.loaded} />
            </div>
          </div>
        </Window>

        <Window title="나의 연구 기록" icon="" tone="lilac">
          <div className="space-y-3 p-3 text-sm">
            <dl className="grid grid-cols-3 gap-2 text-center">
              {([["오늘", stats.today], ["이번 주", stats.week], ["이번 달", stats.month]] as const).map(([label, sec]) => (
                <div key={label} className="card p-2">
                  <dt className="text-xs text-ink-soft">{label}</dt>
                  <dd className="font-display">{sec ? humanDuration(sec) : "–"}</dd>
                </div>
              ))}
            </dl>
            {stats.bySubject.length > 0 && (
              <div>
                <h3 className="label">이번 달 분야별</h3>
                <ul className="space-y-1">
                  {stats.bySubject.slice(0, 6).map((s) => (
                    <li key={s.subject} className="flex items-center gap-2">
                      <span className="w-24 shrink-0 truncate text-xs">{s.subject}</span>
                      <span className="px-box h-2 bg-lilac [--px:2px]" style={{ width: `${Math.max(4, (s.seconds / max) * 55)}%` }} />
                      <span className="text-xs text-ink-soft">{humanDuration(s.seconds)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-ink-soft">이 기록은 나만 볼 수 있어요. 마을에 순위표는 없어요.</p>
          </div>
        </Window>
      </div>
    </div>
  );
}
