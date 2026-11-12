"use client";
import { useState } from "react";
import type { useAuth } from "@/hooks/useAuth";
import type { useVillage } from "@/hooks/useVillage";
import { useTimer } from "@/hooks/useTimer";
import { useNotes } from "@/hooks/useNotes";
import { useDiary } from "@/hooks/useDiary";
import { STATUS_META, STATUS_ORDER, VILLAGE_CAPACITY } from "@/lib/constants";
import type { ResearchState, Resident } from "@/lib/types";
import { CharacterIcon } from "./Character";
import VillageScene from "./VillageScene";
import TimerCard from "./TimerCard";
import StudyRoom from "./StudyRoom";
import DiaryView, { EntryCard } from "./DiaryView";
import ProfileModal from "./ProfileModal";
import SettingsView from "./SettingsView";
import { Modal, Notice, Window } from "./ui";

type View = "home" | "room" | "diary" | "settings";
type Place = "library" | "plaza" | "board";
const NAV: { id: View; label: string; icon: string }[] = [
  { id: "home", label: "마을 홈", icon: "🏡" },
  { id: "room", label: "내 연구실", icon: "📖" },
  { id: "diary", label: "다이어리", icon: "📔" },
  { id: "settings", label: "설정", icon: "⚙️" },
];

function StatusChip({ r }: { r: Resident }) {
  const meta = STATUS_META[r.shown];
  return <span className="chip" style={{ borderColor: meta.color, background: `${meta.color}26` }}>{meta.icon} {meta.label}</span>;
}

function PlaceModal({ place, residents, me, onGo, onClose }: { place: Place; residents: Resident[]; me: Resident; onGo: (s: ResearchState) => void; onClose: () => void }) {
  if (place === "board") {
    return (
      <Modal title="마을 게시판" icon="📌" tone="butter" onClose={onClose}>
        <Notice>게시판은 아직 짓는 중이에요. 신규 논문·학술대회·공모 소식은 다음 단계에서 이곳에 붙을 예정이에요.</Notice>
      </Modal>
    );
  }
  const state: ResearchState = place === "library" ? "library" : "rest";
  const here = residents.filter((r) => r.shown === state);
  const iAmHere = me.shown === state;
  return (
    <Modal title={place === "library" ? "공동 도서관" : "마을 광장"} icon={place === "library" ? "📚" : "⛲"} tone={place === "library" ? "sky" : "mint"} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm">
          {place === "library" ? "모든 주민이 함께 쓰는 공부 공간이에요. 이곳에 있으면 ‘공동 연구’ 상태로 보여요." : "주민들이 쉬어 가는 곳이에요. 이곳에 있으면 ‘휴식 중’으로 보여요."}
        </p>
        <div>
          <h3 className="label">지금 여기 있는 주민</h3>
          {here.length === 0 ? <p className="text-sm text-ink-soft">아무도 없어요.</p> : (
            <ul className="flex flex-wrap gap-2">
              {here.map((r) => (
                <li key={r.user_id} className="flex items-center gap-1 rounded-xl border-2 border-line bg-white px-2 py-1 text-sm">
                  <CharacterIcon avatar={r.profile.avatar} size={34} />{r.profile.display_name}{r.user_id === me.user_id && " (나)"}
                </li>
              ))}
            </ul>
          )}
        </div>
        {!iAmHere && <button type="button" className="btn btn-primary" onClick={() => { onGo(state); onClose(); }}>{place === "library" ? "📚 도서관으로 가기" : "🌿 광장으로 가기"}</button>}
        {place === "library" && <p className="text-xs text-ink-soft">공동 독서 목록·세미나 일정·Zoom 연결은 다음 단계에서 이곳에 생겨요.</p>}
      </div>
    </Modal>
  );
}

export default function VillageApp({ auth, v }: { auth: ReturnType<typeof useAuth>; v: ReturnType<typeof useVillage> }) {
  const me = v.me!;
  const village = v.village!;
  const profile = auth.profile!;
  const [view, setView] = useState<View>("home");
  const [selected, setSelected] = useState<string | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const timer = useTimer(me.user_id, village.id, v.skew);
  const notes = useNotes(me.user_id);
  const diary = useDiary(village.id);
  const selectedResident = v.residents.find((r) => r.user_id === selected) ?? null;
  const byId = new Map(v.residents.map((r) => [r.user_id, r]));

  const enterRoom = () => {
    // 집에 들어가면 '집중 연구'가 된다 (일부러 불을 꺼 둔 경우는 그대로)
    if (me.status.status !== "focus" && me.status.status !== "offline") void v.setStatus("focus");
    setView("room");
  };
  const changeStatus = (s: ResearchState) => {
    void v.setStatus(s);
    if (view === "room" && s !== "focus" && s !== "offline") setView("home");
  };
  const go = (id: View) => (id === "room" ? enterRoom() : setView(id));
  const emptyHouses = VILLAGE_CAPACITY - v.residents.length;
  const others = v.residents.filter((r) => r.user_id !== me.user_id);

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-3 sm:p-4">
      <header className="window flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <div className="flex items-baseline gap-2">
          <h1 className="font-display text-xl">🏡 연구자 마을</h1>
          <p className="font-display text-sm text-rose-deep">{village.name}</p>
        </div>
        <nav aria-label="주 메뉴" className="flex basis-full flex-wrap gap-2 sm:flex-1 sm:basis-auto">
          {NAV.map((n) => (
            <button key={n.id} type="button" aria-current={view === n.id ? "page" : undefined} className={`btn ${view === n.id ? "btn-primary" : ""}`} onClick={() => go(n.id)}>
              <span aria-hidden>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
      </header>

      {view === "home" && (
        <main className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_270px]">
          <div className="order-2 space-y-4 lg:order-1">
            <Window title="내 프로필" icon="🙂" tone="lilac" as="aside">
              <div className="flex items-center gap-3 p-3">
                <button type="button" onClick={() => setSelected(me.user_id)} aria-label="내 미니홈피 보기" className="rounded-xl border-2 border-dashed border-line bg-white px-2 pt-1">
                  <CharacterIcon avatar={profile.avatar} size={72} />
                </button>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg">{profile.display_name}</p>
                  <p className="truncate text-sm text-ink-soft">{profile.field || "연구 분야를 적어 보세요"}</p>
                  {me.status.topic && <p className="mt-1 line-clamp-2 text-xs">🔎 {me.status.topic}</p>}
                </div>
              </div>
            </Window>
            <Window title="지금 나는" icon="🚶" tone="mint" as="aside">
              <div className="space-y-1.5 p-3" role="radiogroup" aria-label="연구 상태">
                {STATUS_ORDER.map((s) => {
                  const meta = STATUS_META[s];
                  const on = me.status.status === s;
                  return (
                    <button key={s} type="button" role="radio" aria-checked={on} onClick={() => changeStatus(s)}
                      className={`flex w-full items-center gap-2 rounded-xl border-2 px-2 py-1.5 text-left text-sm transition-colors ${on ? "border-ink bg-butter" : "border-line bg-white hover:bg-butter/40"}`}>
                      <span className="text-lg" aria-hidden>{meta.icon}</span>
                      <span className="flex-1"><span className="font-display">{meta.label}</span><br /><span className="text-xs text-ink-soft">{s === "focus" ? "집 안 · 방해받지 않아요" : s === "open" ? "집 앞 책상 · 말 걸어도 좋아요" : s === "library" ? "도서관 · 함께 공부해요" : s === "rest" ? "광장 · 편하게 쉬어요" : "불을 끄고 자리를 비워요"}</span></span>
                      {on && <span aria-hidden>✔</span>}
                    </button>
                  );
                })}
              </div>
            </Window>
            <Window title="연구 타이머" icon="⏱️" tone="rose" as="aside">
              {notes.notes.goal && <p className="border-b-2 border-dotted border-line px-3 py-2 text-sm">🎯 {notes.notes.goal}</p>}
              <TimerCard timer={timer} goalMinutes={notes.notes.goal_minutes} defaultSubject={profile.field} />
            </Window>
          </div>

          <div className="order-1 min-w-0 space-y-4 lg:order-2">
            <Window title={village.name} icon="🗺️" tone="sky">
              <div className="overflow-x-auto">
                <div className="min-w-[640px]">
                  <VillageScene
                    houses={v.houses}
                    residents={v.residents}
                    myId={me.user_id}
                    onCharacter={setSelected}
                    onHouse={(slot) => {
                      const owner = v.residents.find((r) => r.slot === slot);
                      if (!owner) return;
                      if (owner.user_id === me.user_id) enterRoom();
                      else setSelected(owner.user_id);
                    }}
                    onPlace={setPlace}
                  />
                </div>
              </div>
              <p className="border-t-2 border-ink px-3 py-1.5 text-xs text-ink-soft">내 집을 누르면 연구실로 들어가요. 주민이나 다른 집을 누르면 미니홈피가 열려요.</p>
            </Window>
            <Window title="다이어리 업데이트" icon="📔" tone="butter" actions={<button type="button" className="btn btn-sm" onClick={() => setView("diary")}>모두 보기</button>}>
              <div className="grid gap-2 p-3 sm:grid-cols-2">
                {diary.entries.slice(0, 4).map((e) => <EntryCard key={e.id} entry={e} author={byId.get(e.author_id)} mine={e.author_id === me.user_id} compact />)}
                {diary.loaded && diary.entries.length === 0 && <p className="text-sm text-ink-soft sm:col-span-2">아직 마을에 올라온 기록이 없어요.</p>}
              </div>
            </Window>
          </div>

          <div className="order-3 space-y-4">
            <Window title="마을 주민" icon="👥" tone="rose" as="aside">
              <ul className="space-y-1 p-2">
                {others.map((r) => (
                  <li key={r.user_id}>
                    <button type="button" onClick={() => setSelected(r.user_id)} className="flex w-full items-center gap-2 rounded-xl border-2 border-transparent p-1.5 text-left hover:border-line hover:bg-white">
                      <span className={r.online ? "" : "opacity-45 grayscale"}><CharacterIcon avatar={r.profile.avatar} size={44} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-sm">{r.profile.display_name}</span>
                        <StatusChip r={r} />
                        {r.online && r.status.topic && <span className="mt-0.5 block truncate text-xs text-ink-soft">🔎 {r.status.topic}</span>}
                      </span>
                    </button>
                  </li>
                ))}
                {others.length === 0 && <li className="p-2 text-sm text-ink-soft">아직 이웃이 없어요.</li>}
              </ul>
              {emptyHouses > 0 && (
                <p className="border-t-2 border-dotted border-line px-3 py-2 text-xs text-ink-soft">
                  빈 집이 {emptyHouses}채 있어요.{" "}
                  {me.role === "admin" ? <button type="button" className="underline" onClick={() => setView("settings")}>초대 링크 만들기</button> : "관리자가 초대 링크를 보낼 수 있어요."}
                </p>
              )}
            </Window>
            <Window title="지금 말 걸 수 있는 연구자" icon="☕" tone="mint" as="aside">
              <ul className="space-y-1 p-3 text-sm">
                {others.filter((r) => r.shown === "open" || r.shown === "library" || r.shown === "rest").map((r) => (
                  <li key={r.user_id} className="flex items-center gap-2">
                    <span aria-hidden>{STATUS_META[r.shown].icon}</span>
                    <span className="flex-1 truncate">{r.profile.display_name}</span>
                    <span className="text-xs text-ink-soft">{r.shown === "open" ? "집 앞 책상" : r.shown === "library" ? "도서관" : "광장"}</span>
                  </li>
                ))}
                {others.every((r) => r.shown === "focus" || r.shown === "offline") && <li className="text-ink-soft">지금은 모두 집중하고 있거나 자리에 없어요.</li>}
              </ul>
              <p className="border-t-2 border-dotted border-line px-3 py-2 text-xs text-ink-soft">대화 신청과 채팅은 다음 단계에서 열려요.</p>
            </Window>
          </div>
        </main>
      )}

      {view === "room" && <main><StudyRoom key={me.user_id} me={me} timer={timer} notes={notes} onStatus={changeStatus} onUpdateStatus={(p) => void v.updateMyStatus(p)} /></main>}
      {view === "diary" && <main><DiaryView villageId={village.id} myId={me.user_id} residents={v.residents} entries={diary.entries} reload={diary.reload} /></main>}
      {view === "settings" && <main><SettingsView profile={profile} me={me} village={village} residents={v.residents} reloadProfile={auth.reloadProfile} reloadVillage={v.reload} /></main>}

      {selectedResident && (
        <ProfileModal resident={selectedResident} isMe={selectedResident.user_id === me.user_id} entries={diary.entries} onClose={() => setSelected(null)} onEditProfile={() => { setSelected(null); setView("settings"); }} />
      )}
      {place && <PlaceModal place={place} residents={v.residents} me={me} onGo={changeStatus} onClose={() => setPlace(null)} />}
    </div>
  );
}
