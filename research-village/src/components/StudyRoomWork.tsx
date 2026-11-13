"use client";
import { useState } from "react";
import { useDiary } from "@/hooks/useDiary";
import { usePlanner } from "@/hooks/usePlanner";
import { useResearchNotes } from "@/hooks/useResearchNotes";
import { useRoom } from "@/hooks/useRoom";
import { STATUS_META } from "@/lib/constants";
import type { BoardTab, Resident, VillageInfo } from "@/lib/types";
import ArchivePanel, { type OpenTarget } from "./ArchivePanel";
import DiaryPanel from "./DiaryView";
import JournalCard from "./JournalCard";
import { DeadlinePanel, TodoPanel } from "./Planner";
import ResearchNotes from "./ResearchNotes";
import RoomBoards from "./RoomBoards";
import RoomCanvas from "./RoomCanvas";
import LabDecorator from "./LabDecorator";
import { Modal, Window } from "./ui";

type Section = "journal" | "notes" | "diary" | "boards" | "archive";
const SECTIONS: { id: Section; label: string }[] = [
  { id: "journal", label: "오늘의 일지" },
  { id: "notes", label: "연구노트" },
  { id: "diary", label: "다이어리" },
  { id: "boards", label: "화이트보드 · 책장" },
  { id: "archive", label: "찾기 · 내보내기" },
];

/** 내 연구실(작업 화면): 글쓰기 창이 가운데에 크게, 왼쪽엔 작은 연구실 그림과 항목 목록, 오른쪽엔 마감·할 일. 집중 모드는 가운데만 남긴다. */
export default function StudyRoomWork({
  me, residents, villages, tab, onTab, onProfileSaved,
}: { me: Resident; residents: Resident[]; villages: VillageInfo[]; tab: BoardTab; onTab: (t: BoardTab) => void; onProfileSaved: () => Promise<void> }) {
  const [roomView, setRoomView] = useState<"view" | "decorate" | null>(null);
  const [section, setSection] = useState<Section>("journal");
  const [focus, setFocus] = useState(false);
  const room = useRoom(me.user_id, true);
  const [target, setTarget] = useState<OpenTarget | null>(null);
  const notes = useResearchNotes(me.user_id);
  const diary = useDiary();
  const planner = usePlanner(me.user_id);
  const st = me.status.status;
  const inside = st === "focus" || st === "offline";
  const current = SECTIONS.find((s) => s.id === section)!;

  return (
    <div className={`grid gap-5 ${focus ? "" : "lg:grid-cols-[250px_minmax(0,1fr)_300px]"}`}>
      {roomView && (
        <Modal title={roomView === "view" ? `${me.profile.display_name}의 연구실` : "내 연구실 꾸미기"} tone="butter" wide onClose={() => setRoomView(null)}>
          {roomView === "view" ? (
            <div className="space-y-3">
              <RoomCanvas owner={me} inside={inside} studying={st === "focus"} boardCount={room.items.length} postitColors={room.postits.map((p) => p.color)} shelf={room.achievements.map((a) => a.kind)} gifts={room.gifts.map((g) => g.kind)} tips={room.tips.length}
                note={inside ? undefined : `지금은 ${STATUS_META[st].where}`} onPick={(t) => { onTab(t); setSection("boards"); setRoomView(null); }} />
              <p className="text-xs text-ink-soft">화이트보드나 책장을 누르면 그 화면으로 가요.</p>
              <div className="flex gap-1">
                <button type="button" className="btn btn-primary" onClick={() => setRoomView("decorate")}>꾸미기</button>
                <button type="button" className="btn" onClick={() => setRoomView(null)}>닫기</button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button type="button" className="btn btn-sm" onClick={() => setRoomView("view")}>◀ 연구실로 돌아가기</button>
              <div className="-m-3"><LabDecorator me={me} onSaved={onProfileSaved} /></div>
            </div>
          )}
        </Modal>
      )}
      {!focus && (
        <div className="space-y-4">
          <Window title={`${me.profile.display_name}의 연구실`} tone="butter">
            <button type="button" onClick={() => setRoomView("view")} aria-label="연구실 크게 보기" className="block w-full cursor-pointer">
              <RoomCanvas owner={me} inside={inside} studying={st === "focus"} boardCount={room.items.length} postitColors={room.postits.map((p) => p.color)} shelf={room.achievements.map((a) => a.kind)} gifts={room.gifts.map((g) => g.kind)} tips={room.tips.length}
                note={inside ? undefined : `지금은 ${STATUS_META[st].where}`} />
            </button>
            <p className="px-2 pt-1 text-center text-xs text-ink-soft">그림을 누르면 크게 보고 꾸밀 수 있어요</p>
            <nav aria-label="연구실 항목" className="space-y-1 p-2">
              {SECTIONS.map((s) => (
                <button key={s.id} type="button" aria-current={section === s.id ? "page" : undefined} onClick={() => { setTarget(null); setSection(s.id); if (s.id === "notes") void notes.reload(); if (s.id === "diary") void diary.reload(); }}
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
            {section === "journal" && <JournalCard userId={me.user_id} villages={villages} initialDate={target?.kind === "journal" ? target.key : undefined} />}
            {section === "notes" && <ResearchNotes data={notes} userId={me.user_id} openId={target?.kind === "note" ? target.key : undefined} />}
            {section === "diary" && <DiaryPanel myId={me.user_id} entries={diary.entries} loaded={diary.loaded} reload={diary.reload} openId={target?.kind === "diary" ? target.key : undefined} />}
            {section === "archive" && <ArchivePanel userId={me.user_id} onOpen={(t) => { setTarget(t); setSection(t.kind === "journal" ? "journal" : t.kind === "note" ? "notes" : "diary"); void notes.reload(); void diary.reload(); }} />}
            {section === "boards" && <RoomBoards owner={me} myId={me.user_id} residents={residents} room={room} tab={tab} onTab={onTab} />}
          </div>
        </Window>
      </div>

      {!focus && (
        <div className="space-y-4">
          <Window title="마감 일정" tone="butter"><DeadlinePanel planner={planner} userId={me.user_id} names={Object.fromEntries(residents.map((r) => [r.user_id, r.profile.display_name]))} /></Window>
          <Window title="할 일" tone="butter"><TodoPanel planner={planner} userId={me.user_id} /></Window>
        </div>
      )}
    </div>
  );
}
