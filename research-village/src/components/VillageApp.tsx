"use client";
import { useCallback, useEffect, useState } from "react";
import type { useAuth } from "@/hooks/useAuth";
import type { useVillage } from "@/hooks/useVillage";
import { useDiary } from "@/hooks/useDiary";
import { useChat } from "@/hooks/useChat";
import { useLibrary } from "@/hooks/useLibrary";
import { useNotifications } from "@/hooks/useNotifications";
import { STATUS_META, STATUS_ORDER, VILLAGE_CAPACITY } from "@/lib/constants";
import { errorMessage, supabase } from "@/lib/supabase";
import type { AppNotification, BoardTab, Conversation, ResearchState, Resident } from "@/lib/types";
import NotificationsView, { notifText } from "./NotificationsView";
import RoomVisit from "./RoomVisit";
import { CharacterIcon, StatusIcon } from "./Character";
import VillageScene from "./VillageScene";
import StudyRoom from "./StudyRoom";
import SayBox from "./SayBox";
import PlazaNews from "./PlazaNews";
import ChatView from "./ChatView";
import LibraryView from "./LibraryView";
import DiaryView, { EntryCard } from "./DiaryView";
import ProfileModal from "./ProfileModal";
import SettingsView from "./SettingsView";
import { Notice, Window } from "./ui";

type View = "home" | "room" | "visit" | "library" | "chat" | "diary" | "alerts" | "settings";
type Toast = { kind: "notif"; n: AppNotification } | { kind: "chat"; conv: Conversation };
const NAV: { id: View; label: string }[] = [
  { id: "home", label: "마을 홈" },
  { id: "room", label: "내 연구실" },
  { id: "diary", label: "다이어리" },
  { id: "library", label: "도서관" },
];

function StatusChip({ r }: { r: Resident }) {
  const meta = STATUS_META[r.shown];
  return <span className="chip" style={{ background: `${meta.color}33` }}><StatusIcon state={r.shown} scale={1} className="!h-[10px] !w-[10px]" /> {meta.label}</span>;
}

export default function VillageApp({ auth, v }: { auth: ReturnType<typeof useAuth>; v: ReturnType<typeof useVillage> }) {
  const me = v.me!;
  const village = v.village!;
  const profile = auth.profile!;
  const [view, setView] = useState<View>("home");
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<BoardTab>("whiteboard");
  const [visitId, setVisitId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [newsOpen, setNewsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const onNew = useCallback((n: AppNotification) => setToast({ kind: "notif", n }), []);
  const onIncoming = useCallback((conv: Conversation) => setToast({ kind: "chat", conv }), []);
  const notifs = useNotifications(me.user_id, onNew);
  const chat = useChat(me.user_id, village.id, onIncoming);
  const lib = useLibrary(village.id);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);
  const diary = useDiary(village.id);
  const selectedResident = v.residents.find((r) => r.user_id === selected) ?? null;
  const byId = new Map(v.residents.map((r) => [r.user_id, r]));

  /** 내 연구실 화면으로 간다. 지도에서 내 집을 눌러 들어갈 때(study)만 '집중 연구'가 된다. */
  const enterRoom = (study = false) => {
    if (study && me.status.status !== "focus" && me.status.status !== "offline") void v.setStatus("focus");
    setView("room");
  };
  const changeStatus = (s: ResearchState) => {
    void v.setStatus(s);
    if (view === "room" && s !== "focus" && s !== "offline") setView("home");
  };
  const visit = (userId: string, t?: BoardTab, fromMap = false) => {
    setSelected(null);
    if (userId === me.user_id) {
      if (t) setTab(t);
      return enterRoom(fromMap);
    }
    if (t) setTab(t);
    setVisitId(userId);
    setView("visit");
  };
  const openChat = (id: string | null) => {
    setChatId(id);
    setSelected(null);
    setView("chat");
  };
  const openNotification = (n: AppNotification) => {
    void notifs.markRead([n.id]);
    setToast(null);
    if (n.kind === "meeting") return setView("library");
    if (n.kind === "chat_request") return openChat(chat.convs.find((c) => c.user_a === n.actor_id && c.status === "pending")?.id ?? null);
    visit(n.room_owner_id, "whiteboard");
  };
  /** 집 앞 책상에 나와 있는 주민에게 대화를 신청한다 */
  const startChat = async (userId: string) => {
    setNotice("");
    const { data, error } = await supabase().rpc("request_chat", { p_village: village.id, p_target: userId });
    if (error) {
      setSelected(null);
      return setNotice(errorMessage(error));
    }
    await chat.reload();
    openChat((data as Conversation).id);
  };
  /** 지도에서 도서관·광장을 누르면 그곳으로 가고, 게시판을 누르면 소식 창이 열린다 */
  const goPlace = (p: "library" | "plaza" | "board") => {
    if (p === "board") return setNewsOpen(true);
    void v.setStatus(p === "library" ? "library" : "rest");
    if (p === "library") setView("library");
  };
  const go = (id: View) => (id === "room" ? enterRoom(false) : setView(id));
  const emptyHouses = VILLAGE_CAPACITY - v.residents.length;
  const others = v.residents.filter((r) => r.user_id !== me.user_id);

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-3 sm:p-4">
      <header className="window flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2" style={{ background: "#fff3c4" }}>
        <div className="flex items-baseline gap-2">
          <h1 className="font-display text-xl">연구자 마을</h1>
          <p className="font-display text-sm text-rose-deep">{village.name}</p>
        </div>
        <nav aria-label="주 메뉴" className="flex basis-full flex-wrap gap-2 sm:flex-1 sm:basis-auto">
          {NAV.map((n) => (
            <button key={n.id} type="button" aria-current={view === n.id ? "page" : undefined} className={`btn ${view === n.id ? "btn-primary" : ""}`} onClick={() => go(n.id)}>
              {n.label}
            </button>
          ))}
          <button type="button" aria-current={view === "chat" ? "page" : undefined} className={`btn ${view === "chat" ? "btn-primary" : ""}`} onClick={() => openChat(chatId)}>
            대화{chat.badge > 0 && <span className="chip" style={{ background: "#d9547a", color: "#fff", ["--bd" as string]: "#3a2a33" }} aria-label={`새 대화 ${chat.badge}개`}>{chat.badge}</span>}
          </button>
          <button type="button" aria-current={view === "alerts" ? "page" : undefined} className={`btn ${view === "alerts" ? "btn-primary" : ""}`} onClick={() => setView("alerts")}>
            알림{notifs.unread > 0 && <span className="chip" style={{ background: "#d9547a", color: "#fff", ["--bd" as string]: "#3a2a33" }} aria-label={`새 알림 ${notifs.unread}개`}>{notifs.unread}</span>}
          </button>
          <button type="button" aria-current={view === "settings" ? "page" : undefined} className={`btn ${view === "settings" ? "btn-primary" : ""}`} onClick={() => setView("settings")}>설정</button>
        </nav>
      </header>
      {notice && <Notice kind="error">{notice}</Notice>}

      {view === "home" && (
        <main className="grid gap-5 lg:grid-cols-[264px_minmax(0,1fr)_276px]">
          <div className="order-2 space-y-4 lg:order-1">
            <Window title="내 프로필" icon="" tone="lilac" as="aside">
              <div className="flex items-center gap-3 p-3">
                <button type="button" onClick={() => setSelected(me.user_id)} aria-label="내 프로필 보기" className="card px-2 pt-1">
                  <CharacterIcon avatar={profile.avatar} size={72} />
                </button>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg">{profile.display_name}</p>
                  <p className="truncate text-sm text-ink-soft">{profile.field || "연구 분야를 적어 보세요"}</p>
                  {me.status.topic && <p className="mt-1 line-clamp-2 text-xs">{me.status.topic}</p>}
                </div>
              </div>
              <SayBox key={me.say} current={me.say} onSay={(t) => v.updateMyStatus({ message: t })} />
            </Window>
            <Window title="지금 나는" icon="" tone="mint" as="aside">
              <div className="space-y-1.5 p-3" role="radiogroup" aria-label="연구 상태">
                {STATUS_ORDER.map((s) => {
                  const meta = STATUS_META[s];
                  const on = me.status.status === s;
                  return (
                    <button key={s} type="button" role="radio" aria-checked={on} onClick={() => changeStatus(s)}
                      className={`card flex w-[calc(100%-6px)] items-center gap-3 px-2 py-1.5 text-left text-sm ${on ? "card-on" : "hover:bg-[#fff3c4]"}`}>
                      <StatusIcon state={s} scale={3} />
                      <span className="flex-1"><span className="font-display">{meta.label}</span><br /><span className="text-xs text-ink-soft">{s === "focus" ? "집 안 · 대화는 받지 않아요" : s === "open" ? "집 앞 책상 · 말 걸어도 좋아요" : s === "library" ? "도서관 · 함께 공부해요" : s === "rest" ? "광장 · 편하게 쉬어요" : "불을 끄고 자리를 비워요"}</span></span>
                      {on && <span aria-hidden>◀</span>}
                    </button>
                  );
                })}
              </div>
            </Window>
            <Window title="대화" tone="rose" as="aside">
              <ul className="space-y-1 p-2 text-sm">
                {chat.pendingIncoming.map((c) => {
                  const other = byId.get(c.user_a);
                  return (
                    <li key={c.id} className="card flex items-center gap-2 p-2">
                      <span className="flex-1 truncate">{other?.profile.display_name ?? "누군가"}님이 대화를 신청했어요</span>
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => openChat(c.id)}>보기</button>
                    </li>
                  );
                })}
                {chat.convs.filter((c) => c.status === "active").slice(0, 4).map((c) => {
                  const other = byId.get(c.user_a === me.user_id ? c.user_b : c.user_a);
                  return (
                    <li key={c.id}>
                      <button type="button" className="flex w-full items-center gap-2 p-1.5 text-left hover:bg-[#fff3c4]" onClick={() => openChat(c.id)}>
                        <span className="flex-1 truncate">{other?.profile.display_name ?? "떠난 주민"}님과 대화 중</span>
                        {chat.unreadOf(c) && <span className="chip" style={{ background: "#d9547a", color: "#fff" }}>새</span>}
                      </button>
                    </li>
                  );
                })}
                {chat.pendingIncoming.length === 0 && !chat.convs.some((c) => c.status === "active") && <li className="p-1 text-ink-soft">진행 중인 대화가 없어요.</li>}
              </ul>
            </Window>
          </div>

          <div className="order-1 min-w-0 space-y-4 lg:order-2">
            <Window title={village.name} icon="" tone="sky">
              <div className="overflow-x-auto">
                <div className="min-w-[648px]">
                  <VillageScene
                    houses={v.houses}
                    residents={v.residents}
                    myId={me.user_id}
                    onCharacter={setSelected}
                    onHouse={(slot) => {
                      const owner = v.residents.find((r) => r.slot === slot);
                      if (!owner) return;
                      visit(owner.user_id, undefined, true);
                    }}
                    onPlace={goPlace}
                    onDesk={(slot) => {
                      const owner = v.residents.find((r) => r.slot === slot);
                      if (!owner) return;
                      if (owner.user_id === me.user_id) void v.setStatus("open"); // 내 책상: 밖에 나와 앉는다
                      else setSelected(owner.user_id);
                    }}
                  />
                </div>
              </div>
            </Window>
            <Window title="다이어리 업데이트" icon="" tone="butter" actions={<button type="button" className="btn btn-sm" onClick={() => setView("diary")}>모두 보기</button>}>
              <div className="grid gap-2 p-3 sm:grid-cols-2">
                {diary.entries.slice(0, 4).map((e) => <EntryCard key={e.id} entry={e} author={byId.get(e.author_id)} mine={e.author_id === me.user_id} compact />)}
                {diary.loaded && diary.entries.length === 0 && <p className="text-sm text-ink-soft sm:col-span-2">아직 마을에 올라온 기록이 없어요.</p>}
              </div>
            </Window>
          </div>

          <div className="order-3 space-y-4">
            <Window title="마을 주민" icon="" tone="rose" as="aside">
              <ul className="space-y-1 p-2">
                {others.map((r) => (
                  <li key={r.user_id} className="flex items-center">
                    <button type="button" onClick={() => setSelected(r.user_id)} className="flex min-w-0 flex-1 items-center gap-3 p-1.5 text-left hover:bg-[#fff3c4]">
                      <span className={r.online ? "" : "opacity-45 grayscale"}><CharacterIcon avatar={r.profile.avatar} size={44} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-sm">{r.profile.display_name}</span>
                        <StatusChip r={r} />
                        {r.online && r.status.topic && <span className="mt-0.5 block truncate text-xs text-ink-soft">{r.status.topic}</span>}
                      </span>
                    </button>
                    {r.shown === "open" && <button type="button" className="btn btn-sm btn-mint shrink-0" onClick={() => void startChat(r.user_id)}>대화 신청</button>}
                  </li>
                ))}
                {others.length === 0 && <li className="p-2 text-sm text-ink-soft">아직 이웃이 없어요.</li>}
              </ul>
              {emptyHouses > 0 && (
                <p className="border-t-2 border-dotted border-line px-3 py-2 text-xs text-ink-soft">
                  빈 연구실이 {emptyHouses}채 있어요.{" "}
                  {me.role === "admin" ? <button type="button" className="underline" onClick={() => setView("settings")}>초대 링크 만들기</button> : "관리자가 초대 링크를 보낼 수 있어요."}
                </p>
              )}
            </Window>
          </div>
        </main>
      )}

      {view === "room" && <main><StudyRoom key={me.user_id} me={me} villageId={village.id} residents={v.residents} tab={tab} onTab={setTab} /></main>}
      {view === "visit" && (() => {
        const owner = v.residents.find((r) => r.user_id === visitId);
        return owner ? (
          <main><RoomVisit key={owner.user_id} owner={owner} myId={me.user_id} villageId={village.id} residents={v.residents} tab={tab} onTab={setTab} onBack={() => setView("home")} onProfile={() => setSelected(owner.user_id)} /></main>
        ) : <main><Notice>이 주민은 더 이상 마을에 없어요.</Notice></main>;
      })()}
      {view === "library" && <main><LibraryView lib={lib} villageId={village.id} me={me} residents={v.residents} isAdmin={me.role === "admin"} /></main>}
      {view === "chat" && <main><ChatView chat={chat} residents={v.residents} myId={me.user_id} selectedId={chatId} onSelect={setChatId} /></main>}
      {view === "alerts" && <main><NotificationsView list={notifs.list} residents={v.residents} myId={me.user_id} onOpen={openNotification} onReadAll={() => void notifs.markRead(notifs.list.filter((n) => !n.read_at).map((n) => n.id))} /></main>}
      {view === "diary" && <main><DiaryView villageId={village.id} myId={me.user_id} residents={v.residents} entries={diary.entries} reload={diary.reload} /></main>}
      {view === "settings" && <main><SettingsView profile={profile} me={me} village={village} residents={v.residents} reloadProfile={auth.reloadProfile} reloadVillage={v.reload} /></main>}

      {selectedResident && (
        <ProfileModal resident={selectedResident} isMe={selectedResident.user_id === me.user_id} entries={diary.entries} onClose={() => setSelected(null)} onEditProfile={() => { setSelected(null); setView("settings"); }} onVisit={() => visit(selectedResident.user_id)} onChat={() => void startChat(selectedResident.user_id)} />
      )}
      {newsOpen && <PlazaNews villageId={village.id} myId={me.user_id} isAdmin={me.role === "admin"} residents={v.residents} onClose={() => setNewsOpen(false)} />}
      {toast && !(toast.kind === "notif" && view === "alerts") && !(toast.kind === "chat" && view === "chat" && chatId === toast.conv.id) && (
        <div role="status" className="window fixed bottom-4 right-4 z-50 max-w-xs" style={{ background: "#fff3c4" }}>
          <div className="space-y-2 p-3 text-sm">
            {toast.kind === "notif" ? (
              <>
                <p className="font-display">새 알림</p>
                <p>{notifText(toast.n, v.residents, me.user_id)}</p>
                {toast.n.summary && <p className="text-xs text-ink-soft">“{toast.n.summary}”</p>}
              </>
            ) : (
              <>
                <p className="font-display">새 메시지</p>
                <p>{byId.get(toast.conv.last_sender ?? "")?.profile.display_name ?? "이웃"}님이 말을 걸었어요</p>
              </>
            )}
            <div className="flex gap-1">
              <button type="button" className="btn btn-sm btn-primary" onClick={() => { const t = toast; setToast(null); if (t.kind === "notif") openNotification(t.n); else openChat(t.conv.id); }}>보러 가기</button>
              <button type="button" className="btn btn-sm" onClick={() => setToast(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
