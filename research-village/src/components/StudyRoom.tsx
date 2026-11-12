"use client";
import { useState } from "react";
import { useJournal } from "@/hooks/useJournal";
import { useResearchNotes } from "@/hooks/useResearchNotes";
import { useRoom } from "@/hooks/useRoom";
import { STATUS_META } from "@/lib/constants";
import type { BoardTab, ResearchState, Resident, StatusRow } from "@/lib/types";
import JournalCard from "./JournalCard";
import ResearchNotes from "./ResearchNotes";
import RoomBoards from "./RoomBoards";
import RoomCanvas from "./RoomCanvas";
import { Window } from "./ui";

export default function StudyRoom({
  me, villageId, residents, tab, onTab, onStatus, onUpdateStatus,
}: {
  me: Resident;
  villageId: string;
  residents: Resident[];
  tab: BoardTab;
  onTab: (t: BoardTab) => void;
  onStatus: (s: ResearchState) => void;
  onUpdateStatus: (patch: Partial<Pick<StatusRow, "topic" | "reading">>) => void;
}) {
  const [topic, setTopic] = useState(me.status.topic);
  const [reading, setReading] = useState(me.status.reading);
  const room = useRoom(me.user_id, villageId);
  const journal = useJournal(me.user_id);
  const notes = useResearchNotes(me.user_id);
  const inside = me.status.status === "focus" || me.status.status === "offline";
  const st = me.status.status;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <Window title={`${me.profile.display_name}의 연구실`} tone="butter">
          <RoomCanvas owner={me} inside={inside} studying={st === "focus"} boardCount={room.items.length} postitColors={room.postits.map((p) => p.color)} shelf={room.achievements.map((a) => a.kind)}
            note={inside ? undefined : `지금은 ${STATUS_META[st].where}`} onPick={onTab} />
          <div className="space-y-2 border-t-[3px] border-ink p-3">
            <p className="text-sm">
              {st === "focus"
                ? "집 안에서 연구하고 있어요. 대화 신청은 받지 않지만, 주민들이 연구실에 들러 포스트잇을 붙이거나 댓글을 남길 수 있어요."
                : st === "offline"
                  ? "불을 끄고 있어요. 다른 주민에게는 오프라인으로 보여요. 연구실에는 포스트잇이나 댓글을 남길 수 있어요."
                  : `지금은 ${STATUS_META[st].where}`}
            </p>
            <div className="flex flex-wrap gap-2">
              {st !== "focus" && <button type="button" className="btn btn-primary" onClick={() => onStatus("focus")}>집 안에서 집중하기</button>}
              <button type="button" className="btn btn-mint" onClick={() => onStatus("open")}>밖에서 공부하기 (대화 가능)</button>
              <button type="button" className="btn" onClick={() => onStatus("library")}>도서관 가기</button>
              <button type="button" className="btn" onClick={() => onStatus("rest")}>광장에서 쉬기</button>
            </div>
          </div>
        </Window>

        <Window title="내 화이트보드 · 책장" tone="lilac">
          <RoomBoards owner={me} myId={me.user_id} villageId={villageId} residents={residents} room={room} tab={tab} onTab={onTab} />
        </Window>

        <Window title="지금 하는 연구" tone="sky">
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

      <div className="space-y-5">
        <Window title="오늘의 일지" tone="mint">
          <JournalCard journal={journal} />
        </Window>
        <Window title="연구노트" tone="rose">
          <ResearchNotes data={notes} userId={me.user_id} />
        </Window>
      </div>
    </div>
  );
}
