"use client";
import { useState } from "react";
import { useDiary } from "@/hooks/useDiary";
import { useFavBooks } from "@/hooks/useFavBooks";
import { usePlanner } from "@/hooks/usePlanner";
import { useResearchNotes } from "@/hooks/useResearchNotes";
import { useRoom } from "@/hooks/useRoom";
import { STATUS_META } from "@/lib/constants";
import type { BoardTab, Resident, VillageInfo } from "@/lib/types";
import ArchivePanel, { type OpenTarget } from "./ArchivePanel";
import DiaryPanel from "./DiaryView";
import FavoriteShelf from "./FavoriteShelf";
import JournalCard from "./JournalCard";
import { DeadlinePanel, TodoPanel } from "./Planner";
import ResearchNotes from "./ResearchNotes";
import RoomBoards from "./RoomBoards";
import RoomCanvas from "./RoomCanvas";
import LabDecorator from "./LabDecorator";
import { Modal, Window } from "./ui";
import WindowColumn from "./WindowColumn";
import NameTags from "./NameTags";
import SnackBox from "./SnackBox";
import PortalDialog from "./LabPortal";
import { labTitle } from "@/lib/labName";
import { SantaCard } from "./ChristmasGift";
import { useChristmas } from "@/hooks/useChristmas";
import WelcomeLetter, { LetterDrawer } from "./WelcomeLetter";

export type Section = "journal" | "notes" | "diary" | "boards" | "results" | "tags" | "shelf" | "archive" | "drawer" | "snacks";
const SECTIONS: { id: Section; label: string }[] = [
  { id: "journal", label: "오늘의 일지" },
  { id: "notes", label: "연구노트" },
  { id: "diary", label: "다이어리" },
  { id: "boards", label: "화이트보드" },
  { id: "results", label: "연구 성과" },
  { id: "tags", label: "학회 명찰" },
  { id: "shelf", label: "좋아하는 책" },
  { id: "archive", label: "찾기 · 내보내기" },
  { id: "drawer", label: "편지 서랍" },
  { id: "snacks", label: "간식 상자" },
];
/** 메뉴(컴퓨터 왼쪽 목록·폰 가로 메뉴)에서는 간식 상자를 오늘의 일지 바로 다음에 둔다 */
const MENU_SECTIONS = [SECTIONS[0], SECTIONS[SECTIONS.length - 1], ...SECTIONS.slice(1, -1)];

/** 내 연구실(작업 화면): 글쓰기 창이 가운데에 크게, 왼쪽엔 작은 연구실 그림과 항목 목록, 오른쪽엔 마감·할 일. 집중 모드는 가운데만 남긴다. */
export default function StudyRoomWork({
  me, residents, villages, tab, onTab, onProfileSaved, onVisit, villageId, initialSection,
}: { me: Resident; residents: Resident[]; villages: VillageInfo[]; tab: BoardTab; onTab: (t: BoardTab) => void; onProfileSaved: () => Promise<void>; onVisit: (userId: string, villageId: string) => void; villageId: string; initialSection?: Section | null }) {
  const [roomView, setRoomView] = useState<"decorate" | null>(null);
  const [section, setSection] = useState<Section>(initialSection ?? "journal");   // 알림을 눌러 들어오면 그 알림이 가리키는 항목을 바로 연다
  const [focus, setFocus] = useState(false);
  const [letter, setLetter] = useState(false);
  const [portal, setPortal] = useState(false);
  const xmas = useChristmas(me.user_id);
  const [cardYear, setCardYear] = useState<number | null>(null);
  const room = useRoom(me.user_id, true);
  const fav = useFavBooks(me.user_id);
  const [target, setTarget] = useState<OpenTarget | null>(null);
  const notes = useResearchNotes(me.user_id);
  const diary = useDiary();
  const planner = usePlanner(me.user_id);
  const st = me.status.status;
  const inside = st === "focus" || st === "offline";
  const current = SECTIONS.find((s) => s.id === section)!;

  return (
    <div className={`grid gap-5 ${focus ? "" : "lg:grid-cols-[250px_minmax(0,1fr)_360px]"}`}>
      {roomView && (
        <Modal title="내 연구실 꾸미기" tone="butter" wide onClose={() => setRoomView(null)}>
          <div className="-m-3"><LabDecorator me={me} onSaved={onProfileSaved} /></div>
        </Modal>
      )}
      {!focus && (
        <div className="order-2 space-y-4 lg:order-1">
          <Window title={labTitle(me.profile)} tone="butter">
              <RoomCanvas owner={me} inside={inside} studying={st === "focus"} boardCount={room.items.length} postitColors={room.postits.filter((p) => !p.reply_to).map((p) => p.color)} shelf={room.achievements.map((a) => a.kind)} favs={fav.books ?? []} gifts={room.gifts.map((g) => g.kind)} tips={room.tips.length}
                note={inside ? undefined : `지금은 ${STATUS_META[st].where}`} onOpen={() => setRoomView("decorate")} onPortal={() => setPortal(true)} />
            <nav aria-label="연구실 항목" className="space-y-1 p-2 max-lg:hidden">
              {MENU_SECTIONS.map((s) => (
                <button key={s.id} type="button" aria-current={section === s.id ? "page" : undefined} onClick={() => { setTarget(null); setSection(s.id); if (s.id === "notes") void notes.reload(); if (s.id === "diary") void diary.reload(); }}
                  className={`card block w-[calc(100%-6px)] px-3 py-2 text-left font-display ${section === s.id ? "card-on" : "hover:bg-[#fff3c4]"}`}>
                  {s.label}
                </button>
              ))}
            </nav>
          </Window>
        </div>
      )}

      <div className="order-1 min-w-0 lg:order-2">
        {!focus && (
          <nav aria-label="연구실 항목 (폰)" className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:hidden">
            {MENU_SECTIONS.map((s) => (
              <button key={s.id} type="button" aria-current={section === s.id ? "page" : undefined} onClick={() => { setTarget(null); setSection(s.id); if (s.id === "notes") void notes.reload(); if (s.id === "diary") void diary.reload(); }}
                className={`btn shrink-0 whitespace-nowrap ${section === s.id ? "btn-primary" : ""}`}>{s.label}</button>
            ))}
          </nav>
        )}
        <Window title={current.label} tone="butter" actions={<button type="button" className="btn btn-sm btn-xs" aria-pressed={focus} onClick={() => setFocus((f) => !f)}>{focus ? "집중 모드 끄기" : "집중 모드"}</button>}>
          <div className={`lab-main mx-auto ${focus ? "lab-focus max-w-[64rem]" : section === "boards" || section === "results" ? "max-w-[52rem]" : "max-w-[42rem]"}`}>
            {section === "tags" && <NameTags userId={me.user_id} mine />}
            {section === "snacks" && <SnackBox residents={residents} myId={me.user_id} />}
            {section === "drawer" && <LetterDrawer onOpen={() => setLetter(true)} cards={xmas.rows} onOpenCard={setCardYear} />}
            {section === "journal" && <JournalCard userId={me.user_id} villages={villages} initialDate={target?.kind === "journal" ? target.key : undefined} />}
            {section === "notes" && <ResearchNotes data={notes} userId={me.user_id} openId={target?.kind === "note" ? target.key : undefined} />}
            {section === "diary" && <DiaryPanel myId={me.user_id} entries={diary.entries} loaded={diary.loaded} reload={diary.reload} openId={target?.kind === "diary" ? target.key : undefined} />}
            {section === "archive" && <ArchivePanel userId={me.user_id} onOpen={(t) => { setTarget(t); setSection(t.kind === "journal" ? "journal" : t.kind === "note" ? "notes" : "diary"); void notes.reload(); void diary.reload(); }} />}
            {section === "shelf" && <FavoriteShelf books={fav.books} names={fav.names} reload={fav.reload} editable bare ownerName={me.profile.display_name} />}
            {(section === "boards" || section === "results") && <RoomBoards owner={me} myId={me.user_id} residents={residents} room={room} tab={tab} onTab={onTab} only={section === "results" ? "shelf" : "whiteboard"} />}
          </div>
        </Window>
      </div>

      {!focus && (
        <WindowColumn col="lab-right" userId={me.user_id} className="order-3 space-y-4">
          <Window key="deadline" title="마감 일정" tone="butter"><DeadlinePanel planner={planner} userId={me.user_id} names={Object.fromEntries(residents.map((r) => [r.user_id, r.profile.display_name]))} /></Window>
          <Window key="todo" title="오늘의 체크리스트" tone="butter"><TodoPanel planner={planner} userId={me.user_id} /></Window>
        </WindowColumn>
      )}
      {cardYear !== null && xmas.rows.find((r) => r.year === cardYear) && <SantaCard row={xmas.rows.find((r) => r.year === cardYear)!} name={me.profile.display_name} onClose={() => setCardYear(null)} />}
      {portal && <PortalDialog villages={villages} currentVillageId={villageId} myId={me.user_id} currentId={me.user_id} onGo={onVisit} onClose={() => setPortal(false)} />}
      {letter && <WelcomeLetter onClose={() => setLetter(false)} />}
    </div>
  );
}
