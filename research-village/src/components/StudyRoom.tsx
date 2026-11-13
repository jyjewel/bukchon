"use client";
import { useDiary } from "@/hooks/useDiary";
import { usePlanner } from "@/hooks/usePlanner";
import { useJournal } from "@/hooks/useJournal";
import { useLabLayout, type CollapsibleId, type WidgetId } from "@/hooks/useLabLayout";
import { useResearchNotes } from "@/hooks/useResearchNotes";
import { useRoom } from "@/hooks/useRoom";
import { STATUS_META } from "@/lib/constants";
import type { BoardTab, Resident } from "@/lib/types";
import DiaryPanel from "./DiaryView";
import JournalCard from "./JournalCard";
import { DeadlinePanel, TodoPanel } from "./Planner";
import ResearchNotes from "./ResearchNotes";
import RoomBoards from "./RoomBoards";
import RoomCanvas from "./RoomCanvas";
import { Window, type Tone } from "./ui";

export default function StudyRoom({
  me, residents, tab, onTab, onDecorate,
}: {
  me: Resident;
  residents: Resident[];
  tab: BoardTab;
  onTab: (t: BoardTab) => void;
  onDecorate: () => void;
}) {
  const room = useRoom(me.user_id);
  const journal = useJournal(me.user_id);
  const notes = useResearchNotes(me.user_id);
  const diary = useDiary();
  const planner = usePlanner(me.user_id);
  const layout = useLabLayout(me.user_id);
  const inside = me.status.status === "focus" || me.status.status === "offline";
  const st = me.status.status;

  const ctl = (id: CollapsibleId, extra?: { onUp?: () => void; onDown?: () => void }) => ({ collapsed: layout.collapsed.includes(id), onToggle: () => layout.toggle(id), ...extra });
  const widgets: Record<WidgetId, { title: string; tone: Tone; body: React.ReactNode }> = {
    deadlines: { title: "마감 일정", tone: "butter", body: <DeadlinePanel planner={planner} userId={me.user_id} /> },
    todos: { title: "할 일", tone: "lilac", body: <TodoPanel planner={planner} userId={me.user_id} /> },
    journal: { title: "오늘의 일지", tone: "mint", body: <JournalCard journal={journal} /> },
    notes: { title: "연구노트", tone: "rose", body: <ResearchNotes data={notes} userId={me.user_id} /> },
    diary: { title: "다이어리", tone: "sky", body: <DiaryPanel myId={me.user_id} entries={diary.entries} loaded={diary.loaded} reload={diary.reload} /> },
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <Window title={`${me.profile.display_name}의 연구실`} tone="butter" controls={ctl("room")} actions={<button type="button" className="btn btn-sm" onClick={onDecorate}>꾸미기</button>}>
          <RoomCanvas owner={me} inside={inside} studying={st === "focus"} boardCount={room.items.length} postitColors={room.postits.map((p) => p.color)} shelf={room.achievements.map((a) => a.kind)}
            note={inside ? undefined : `지금은 ${STATUS_META[st].where}`} onPick={onTab} />
        </Window>

        <Window title="내 화이트보드 · 책장" tone="lilac" controls={ctl("boards")}>
          <RoomBoards owner={me} myId={me.user_id} residents={residents} room={room} tab={tab} onTab={onTab} />
        </Window>
      </div>

      <div className="space-y-5">
        <div className="flex justify-end gap-1" role="group" aria-label="창 모두 접기·펴기">
          <button type="button" className="btn btn-sm" onClick={() => layout.setAll(true)}>모두 접기</button>
          <button type="button" className="btn btn-sm" onClick={() => layout.setAll(false)}>모두 펴기</button>
        </div>
        {layout.order.map((id, i) => (
          <Window key={id} title={widgets[id].title} tone={widgets[id].tone}
            controls={ctl(id, { onUp: i > 0 ? () => layout.move(id, -1) : undefined, onDown: i < layout.order.length - 1 ? () => layout.move(id, 1) : undefined })}>
            {widgets[id].body}
          </Window>
        ))}
      </div>
    </div>
  );
}
