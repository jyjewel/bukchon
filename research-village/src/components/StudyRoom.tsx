"use client";
import { useDiary } from "@/hooks/useDiary";
import { useJournal } from "@/hooks/useJournal";
import { useResearchNotes } from "@/hooks/useResearchNotes";
import { useRoom } from "@/hooks/useRoom";
import { STATUS_META } from "@/lib/constants";
import type { BoardTab, Resident } from "@/lib/types";
import DiaryPanel from "./DiaryView";
import JournalCard from "./JournalCard";
import ResearchNotes from "./ResearchNotes";
import RoomBoards from "./RoomBoards";
import RoomCanvas from "./RoomCanvas";
import { Window } from "./ui";

export default function StudyRoom({
  me, villageId, residents, tab, onTab,
}: {
  me: Resident;
  villageId: string;
  residents: Resident[];
  tab: BoardTab;
  onTab: (t: BoardTab) => void;
}) {
  const room = useRoom(me.user_id, villageId);
  const journal = useJournal(me.user_id);
  const notes = useResearchNotes(me.user_id);
  const diary = useDiary(villageId);
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
      </div>

      <div className="space-y-5">
        <Window title="오늘의 일지" tone="mint">
          <JournalCard journal={journal} />
        </Window>
        <Window title="연구노트" tone="rose">
          <ResearchNotes data={notes} userId={me.user_id} />
        </Window>
        <Window title="다이어리" tone="sky">
          <DiaryPanel villageId={villageId} myId={me.user_id} entries={diary.entries} loaded={diary.loaded} reload={diary.reload} />
        </Window>
      </div>
    </div>
  );
}
