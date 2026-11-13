"use client";
import { useState, type FormEvent } from "react";
import { ACHIEVEMENT_KINDS, POSTIT_COLORS, isRiss, linkHost, rissSearchUrl } from "@/lib/constants";
import { errorMessage, supabase } from "@/lib/supabase";
import { relativeTime } from "@/lib/time";
import type { Achievement, AchievementKind, BoardTab, Resident } from "@/lib/types";
import type { useRoom } from "@/hooks/useRoom";
import { CharacterIcon } from "./Character";
import PublicJournal from "./PublicJournal";
import PublicDeadlines from "./PublicDeadlines";
import { TipBox } from "./GiveBox";
import { giftOf } from "@/lib/social";
import { Notice } from "./ui";

type Room = ReturnType<typeof useRoom>;

const TABS: { id: BoardTab; label: string }[] = [
  { id: "whiteboard", label: "화이트보드" },
  { id: "shelf", label: "책장" },
];

/** 화이트보드(고민과 댓글) · 포스트잇 · 책장(연구 성과) 패널. 주인이면 쓰고 지울 수 있고, 방문자는 댓글과 포스트잇을 남길 수 있다. */
export default function RoomBoards({
  owner, myId, residents, room, tab, onTab, onTip,
}: {
  owner: Resident; myId: string; residents: Resident[]; room: Room; tab: BoardTab; onTab: (t: BoardTab) => void; onTip?: (title: string, note: string) => Promise<string | null> | string | null;
}) {
  const isOwner = owner.user_id === myId;
  const who = (id: string) => residents.find((r) => r.user_id === id)?.profile.display_name ?? "떠난 주민";
  const [error, setError] = useState("");
  const run = async (p: PromiseLike<{ error: unknown }>) => {
    const { error } = await p;
    setError(error ? errorMessage(error) : "");
    await room.reload();
    return !error;
  };
  const sb = supabase();

  // ── 포스트잇 (화이트보드에 붙는다) ──
  const [pi, setPi] = useState("");
  const [color, setColor] = useState(POSTIT_COLORS[0]);
  const postitsBlock = (
    <div className="space-y-3">
      <form className="space-y-2" onSubmit={async (e: FormEvent) => { e.preventDefault(); if (await run(sb.from("postits").insert({ owner_id: owner.user_id, author_id: myId, body: pi.trim(), color }))) setPi(""); }}>
        <label className="label" htmlFor="pi-new">{isOwner ? "화이트보드에 붙이는 메모" : `${owner.profile.display_name}님의 화이트보드에 포스트잇 붙이기`}</label>
        <textarea id="pi-new" className="input" rows={2} maxLength={140} value={pi} onChange={(e) => setPi(e.target.value)} placeholder="응원, 질문, 읽어 볼 만한 자료…" />
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="포스트잇 색">
          {POSTIT_COLORS.map((c) => (
            <button key={c} type="button" aria-label={`색 ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} className="px-box m-[1px] h-6 w-6" style={{ background: c, ["--bd" as string]: color === c ? "#3a2a33" : "#d9c39a" }} />
          ))}
          <span className="flex-1" />
          <span className="text-xs text-ink-soft">{pi.length}/140</span>
          <button type="submit" className="btn btn-primary btn-sm" disabled={!pi.trim()}>붙이기</button>
        </div>
      </form>
      {room.postits.length > 0 && (
        <ul className="space-y-1" aria-label="붙은 포스트잇">
          {room.postits.map((p) => {
            const author = residents.find((r) => r.user_id === p.author_id);
            return (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <span title={who(p.author_id)} className="shrink-0">{author ? <CharacterIcon avatar={author.profile.avatar} size={30} /> : <span className="inline-block w-[36px]" />}</span>
                <span className="sr-only">{who(p.author_id)}:</span>
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{p.body}</span>
                {(p.author_id === myId || isOwner) && (
                  <button type="button" className="shrink-0 text-xs text-ink-soft underline" aria-label="포스트잇 떼기" onClick={() => void run(sb.from("postits").delete().eq("id", p.id))}>떼기</button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  // ── 화이트보드 ──
  const [wb, setWb] = useState("");
  const [cm, setCm] = useState<Record<string, string>>({});
  const whiteboard = (
    <div className="space-y-3">
      {room.gifts.length > 0 && (
        <section aria-label="받은 선물" className="space-y-1">
          <h3 className="label">{isOwner ? "받은 선물 (보낸 사람은 나에게만 보여요 · 하루 동안 책상에 올라가요)" : `${owner.profile.display_name}님의 책상 위 선물`}</h3>
          <ul className="flex flex-wrap gap-1.5">
            {room.gifts.map((g) => (
              <li key={g.id} className="chip" style={{ background: "#fff3c4" }}>{giftOf(g.kind)?.label ?? "선물"}{isOwner && g.from_user ? ` · ${who(g.from_user)}` : ""}{isOwner && g.note ? ` “${g.note}”` : ""} · {relativeTime(g.created_at)}</li>
            ))}
          </ul>
        </section>
      )}
      {!isOwner && <PublicDeadlines ownerId={owner.user_id} name={owner.profile.display_name} />}
      <PublicJournal ownerId={owner.user_id} isOwner={isOwner} name={owner.profile.display_name} myId={myId} names={Object.fromEntries(residents.map((r) => [r.user_id, r.profile.display_name]))} />
      <div className="dotted" />
      {postitsBlock}
      {!isOwner && <h3 className="label dotted pt-3">고민하는 문제</h3>}
      {isOwner && <div className="dotted" />}
      {isOwner ? (
        <form className="space-y-1" onSubmit={async (e: FormEvent) => { e.preventDefault(); if (await run(sb.from("whiteboard_items").insert({ owner_id: myId, body: wb.trim() }))) setWb(""); }}>
          <label className="label" htmlFor="wb-new">요즘 고민하는 문제를 적어 보세요</label>
          <textarea id="wb-new" className="input" rows={3} maxLength={500} value={wb} onChange={(e) => setWb(e.target.value)} placeholder="예: 방각본의 간행 연대를 어떻게 추정할 수 있을까?" />
          <button type="submit" className="btn btn-primary btn-sm" disabled={!wb.trim()}>화이트보드에 쓰기</button>
        </form>
      ) : null}
      {room.loaded && room.items.length === 0 && <p className="py-3 text-center text-sm text-ink-soft">{isOwner ? "아직 적은 고민이 없어요." : "화이트보드가 비어 있어요."}</p>}
      {room.items.map((it) => {
        const cs = room.comments.filter((c) => c.item_id === it.id);
        return (
          <article key={it.id} className="card p-3" style={{ background: it.resolved ? "#eef8ea" : "#fffdf6" }}>
            <div className="flex items-start gap-2">
              <p className="flex-1 whitespace-pre-wrap break-words text-sm">{it.body}</p>
              {it.resolved && <span className="chip">해결됨</span>}
            </div>
            <p className="text-xs text-ink-soft">{relativeTime(it.created_at)} · 댓글 {cs.length}</p>
            {isOwner && (
              <div className="flex gap-1">
                <button type="button" className="btn btn-sm" onClick={() => void run(sb.from("whiteboard_items").update({ resolved: !it.resolved }).eq("id", it.id))}>{it.resolved ? "다시 열기" : "해결됨으로"}</button>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => window.confirm("이 고민과 달린 댓글을 지울까요?") && void run(sb.from("whiteboard_items").delete().eq("id", it.id))}>지우기</button>
              </div>
            )}
            <ul className="dotted mt-2 space-y-1 pt-2">
              {cs.map((c) => (
                <li key={c.id} className="text-sm">
                  <span className="font-display">{who(c.author_id)}</span> <span className="whitespace-pre-wrap break-words">{c.body}</span>{" "}
                  <span className="text-xs text-ink-soft">{relativeTime(c.created_at)}</span>
                  {(c.author_id === myId || isOwner) && (
                    <button type="button" className="ml-1 text-xs text-ink-soft underline" onClick={() => void run(sb.from("whiteboard_comments").delete().eq("id", c.id))}>삭제</button>
                  )}
                </li>
              ))}
            </ul>
            <form className="mt-1 flex items-start gap-1" onSubmit={async (e: FormEvent) => {
              e.preventDefault();
              const text = (cm[it.id] ?? "").trim();
              if (text && (await run(sb.from("whiteboard_comments").insert({ item_id: it.id, author_id: myId, body: text })))) setCm((m) => ({ ...m, [it.id]: "" }));
            }}>
              <label className="sr-only" htmlFor={`cm-${it.id}`}>댓글</label>
              <input id={`cm-${it.id}`} className="input" maxLength={500} value={cm[it.id] ?? ""} onChange={(e) => setCm((m) => ({ ...m, [it.id]: e.target.value }))} placeholder="댓글 달기" />
              <button type="submit" className="btn btn-sm btn-mint mt-[5px]" disabled={!(cm[it.id] ?? "").trim()}>달기</button>
            </form>
          </article>
        );
      })}
    </div>
  );

  // ── 책장 ──
  const [form, setForm] = useState<{ title: string; kind: AchievementKind; year: string; link: string }>({ title: "", kind: "article", year: "", link: "" });
  const [shelfErr, setShelfErr] = useState("");
  const addAchievement = async (e: FormEvent) => {
    e.preventDefault();
    const link = form.link.trim();
    if (link && !/^https?:\/\//i.test(link)) return setShelfErr("링크는 http:// 또는 https:// 로 시작해야 해요.");
    setShelfErr("");
    const year = form.year ? Number(form.year) : null;
    if (await run(sb.from("achievements").insert({ owner_id: myId, title: form.title.trim(), kind: form.kind, year, link_url: link }))) setForm({ title: "", kind: "article", year: "", link: "" });
  };
  const kindLabel = (a: Achievement) => ACHIEVEMENT_KINDS.find((k) => k.id === a.kind);
  const shelf = (
    <div className="space-y-3">
      {isOwner && (
        <form className="space-y-2" onSubmit={addAchievement}>
          <div>
            <label className="label" htmlFor="ac-title">제목</label>
            <input id="ac-title" className="input" maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="min-w-32 flex-1">
              <label className="label" htmlFor="ac-kind">종류</label>
              <select id="ac-kind" className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as AchievementKind })}>
                {ACHIEVEMENT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </div>
            <div className="w-28">
              <label className="label" htmlFor="ac-year">발행 연도</label>
              <input id="ac-year" className="input" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value.replace(/\D/g, "") })} placeholder="2025" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ac-link">RISS 링크 <span className="text-ink-soft">(선택)</span></label>
            <input id="ac-link" type="url" className="input" maxLength={600} value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://www.riss.kr/link?id=…" />
          </div>
          {shelfErr && <Notice kind="error">{shelfErr}</Notice>}
          <div className="flex flex-wrap gap-1">
            <button type="submit" className="btn btn-primary btn-sm" disabled={!form.title.trim()}>책장에 꽂기</button>
            <a className="btn btn-sm" href={rissSearchUrl(form.title || owner.profile.display_name)} target="_blank" rel="noopener noreferrer">RISS에서 찾기 (새 창)</a>
          </div>
        </form>
      )}
      {!isOwner && onTip && <TipBox name={owner.profile.display_name} onTip={onTip} />}
      {room.tips.length > 0 && (
        <section aria-label="추천받은 책" className="space-y-1">
          <h3 className="label">{isOwner ? "이웃이 추천해 준 책" : `${owner.profile.display_name}님에게 추천된 책`}</h3>
          <ul className="space-y-1">
            {room.tips.map((t) => (
              <li key={t.id} className="card flex items-start gap-2 p-2 text-sm" style={{ background: "#fff0f5" }}>
                <span className="min-w-0 flex-1"><span className="block break-words font-display">《{t.title}》</span><span className="block text-xs text-ink-soft">{who(t.from_user)} 추천{t.note ? ` — ${t.note}` : ""} · {relativeTime(t.created_at)}</span></span>
                {(isOwner || t.from_user === myId) && <button type="button" className="btn btn-sm" onClick={() => void run(sb.from("book_tips").delete().eq("id", t.id))}>떼기</button>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {room.loaded && room.achievements.length === 0 && room.tips.length === 0 && <p className="py-3 text-center text-sm text-ink-soft">{isOwner ? "아직 책장이 비어 있어요." : "아직 꽂힌 책이 없어요."}</p>}
      <ul className="space-y-2">
        {room.achievements.map((a) => (
          <li key={a.id} className="card flex items-start gap-2 p-2 text-sm">
            <span className="mt-1 inline-block h-6 w-3 shrink-0" style={{ background: kindLabel(a)?.color }} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="break-words">{a.title}</p>
              <p className="text-xs text-ink-soft">{kindLabel(a)?.label}{a.year ? ` · ${a.year}` : ""}</p>
              {a.link_url && (
                <a className="text-xs text-[#2f6fd0] underline" href={a.link_url} target="_blank" rel="noopener noreferrer">
                  {isRiss(a.link_url) ? "RISS에서 보기" : `링크 열기 (${linkHost(a.link_url)})`}
                </a>
              )}
            </div>
            {isOwner && <button type="button" className="btn btn-sm btn-danger" onClick={() => window.confirm("책장에서 뺄까요?") && void run(sb.from("achievements").delete().eq("id", a.id))}>빼기</button>}
          </li>
        ))}
      </ul>
    </div>
  );

  const count = { whiteboard: room.items.length + room.postits.length, shelf: room.achievements.length };
  return (
    <div>
      <div role="tablist" aria-label="연구실 게시판" className="flex flex-wrap border-b border-ink bg-[#fff3c4] px-1 pt-1">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => onTab(t.id)} className={`btn btn-sm ${tab === t.id ? "btn-primary" : ""}`}>
            {t.label}{room.loaded ? ` ${count[t.id]}` : ""}
          </button>
        ))}
      </div>
      <div className="space-y-3 p-3">
        {error && <Notice kind="error">{error}</Notice>}
        {tab === "whiteboard" ? whiteboard : shelf}
      </div>
    </div>
  );
}
