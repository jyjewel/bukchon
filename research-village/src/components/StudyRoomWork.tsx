"use client";
import { useState } from "react";
import { useDiary } from "@/hooks/useDiary";
import { usePlanner } from "@/hooks/usePlanner";
import { useJournal } from "@/hooks/useJournal";
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
import { Window } from "./ui";

type Section = "journal" | "notes" | "diary" | "boards";
const SECTIONS: { id: Section; label: string }[] = [
  { id: "journal", label: "오늘의 일지" },
  { id: "notes", label: "연구노트" },
  { id: "diary", label: "다이어리" },
  { id: "boards", label: "화이트보드 · 책장" },
];

/** 내 연구실(작업 화면): 글쓰기 창이 가운데에 크게, 왼쪽엔 작은 연구실 그림과 항목 목록, 오른쪽엔 마감·할 일. 집중 모드는 가운데만 남긴다. */
export default function StudyRoomWork({
  me, residents, tab, onTab, onDecorate,
}: { me: Resident; residents: Resident[]; tab: BoardTab; onTab: (t: BoardTab) => void; onDecorate: () => void }) {
  const [section, setSection] = useState<Section>("journal");
  const [focus, setFocus] = useState(false);
  const room = useRoom(me.user_id);
  const journal = useJournal(me.user_id);
  const notes = useResearchNotes(me.user_id);
  const diary = useDiary();
  const planner = usePlanner(me.user_id);
  const st = me.status.status;
  const inside = st === "focus" || st === "offline";
  const current = SECTIONS.find((s) => s.id === section)!;

  return (
    <div className={`grid gap-5 ${focus ? "" : "lg:grid-cols-[250px_minmax(0,1fr)_300px]"}`}>
      {!focus && (
        <div className="space-y-4">
          <Window title={`${me.profile.display_name}의 연구실`} tone="butter" actions={<button type="button" className="btn btn-sm" onClick={onDecorate}>꾸미기</button>}>
            <RoomCanvas owner={me} inside={inside} studying={st === "focus"} boardCount={room.items.length} postitColors={room.postits.map((p) => p.color)} shelf={room.achievements.map((a) => a.kind)}
              note={inside ? undefined : `지금은 ${STATUS_META[st].where}`} onPick={(t) => { onTab(t); setSection("boards"); }} />
            <nav aria-label="연구실 항목" className="space-y-1 p-2">
              {SECTIONS.map((s) => (
                <button key={s.id} type="button" aria-current={section === s.id ? "page" : undefined} onClick={() => setSection(s.id)}
                  className={`card block w-[calc(100%-6px)] px-3 py-2 text-left font-display ${section === s.id ? "card-on" : "hover:bg-[#fff3c4]"}`}>
                  {s.label}
                </button>
              ))}
            </nav>
          </Window>
        </div>
      )}

      <div className="min-w-0">
        <Window title={current.label} tone="butter" actions={<button type="button" className="btn btn-sm" aria-pressed={focus} onClick={() => setFocus((f) => !f)}>{focus ? "집중 모드 끄기" : "집중 모드"}</button>}>
          <div className={`lab-main mx-auto ${focus ? "lab-focus max-w-[64rem]" : section === "boards" ? "max-w-[58rem]" : "max-w-[46rem]"}`}>
            {section === "journal" && <JournalCard journal={journal} />}
            {section === "notes" && <ResearchNotes data={notes} userId={me.user_id} />}
            {section === "diary" && <DiaryPanel myId={me.user_id} entries={diary.entries} loaded={diary.loaded} reload={diary.reload} />}
            {section === "boards" && <RoomBoards owner={me} myId={me.user_id} residents={residents} room={room} tab={tab} onTab={onTab} />}
          </div>
        </Window>
      </div>

      {!focus && (
        <div className="space-y-4">
          <Window title="마감 일정" tone="butter"><DeadlinePanel planner={planner} userId={me.user_id} /></Window>
          <Window title="할 일" tone="butter"><TodoPanel planner={planner} userId={me.user_id} /></Window>
        </div>
      )}
    </div>
  );
}
