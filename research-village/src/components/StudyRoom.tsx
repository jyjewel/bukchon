"use client";
import { useState } from "react";
import { useJournal } from "@/hooks/useJournal";
import { useResearchNotes } from "@/hooks/useResearchNotes";
import { useRoom } from "@/hooks/useRoom";
import { STATUS_META } from "@/lib/constants";
import type { BoardTab, Resident, StatusRow } from "@/lib/types";
import JournalCard from "./JournalCard";
import ResearchNotes from "./ResearchNotes";
import RoomBoards from "./RoomBoards";
import RoomCanvas from "./RoomCanvas";
import { Window } from "./ui";

export default function StudyRoom({
  me, villageId, residents, tab, onTab, onUpdateStatus,
}: {
  me: Resident;
  villageId: string;
  residents: Resident[];
  tab: BoardTab;
  onTab: (t: BoardTab) => void;
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
        </Window>

        <Window title="내 화이트보드 · 책장" tone="lilac">
          <RoomBoards owner={me} myId={me.user_id} villageId={villageId} residents={residents} room={room} tab={tab} onTab={onTab} />
        </Window>

        <Window title="지금 하는 연구" tone="sky">
          <div className="space-y-3 p-3">
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
