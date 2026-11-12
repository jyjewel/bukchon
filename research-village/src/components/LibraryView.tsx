"use client";
import { useState, type FormEvent } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import { clockLabel, relativeTime } from "@/lib/time";
import type { useLibrary } from "@/hooks/useLibrary";
import type { Book, Resident } from "@/lib/types";
import { CharacterIcon } from "./Character";
import { Notice, Window } from "./ui";

type Lib = ReturnType<typeof useLibrary>;
const SPINES = ["#e0605a", "#5f8fd6", "#f2c64e", "#62b866", "#b08ae0", "#f0994a", "#f7a8bf", "#6ccfc2"];
const spineColor = (id: string) => SPINES[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % SPINES.length];
const ZOOM_NEW = "https://zoom.us/start/videomeeting";

function MeetingState({ startsAt }: { startsAt: string }) {
  const [now] = useState(() => Date.now());
  const t = new Date(startsAt).getTime();
  if (now >= t - 15 * 60_000 && now <= t + 2 * 3600_000) return <span className="chip" style={{ background: "#ffe58a" }}>진행 중 / 곧 시작</span>;
  if (now > t + 2 * 3600_000) return <span className="chip">끝남</span>;
  return null;
}

export default function LibraryView({
  lib, villageId, me, residents, isAdmin, onGoHere,
}: { lib: Lib; villageId: string; me: Resident; residents: Resident[]; isAdmin: boolean; onGoHere: () => void }) {
  const [bookId, setBookId] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now());
  const [error, setError] = useState("");
  const here = residents.filter((r) => r.shown === "library");
  const who = (id: string | null) => (id ? residents.find((r) => r.user_id === id)?.profile.display_name ?? "떠난 주민" : "떠난 주민");
  const book = lib.books.find((b) => b.id === bookId) ?? null;
  const run = async (p: PromiseLike<{ error: unknown }>) => {
    const { error } = await p;
    setError(error ? errorMessage(error) : "");
    await lib.reload();
    return !error;
  };
  const sb = supabase();

  // ── 새 책 ──
  const [nb, setNb] = useState({ title: "", topic: "" });
  const createBook = async (e: FormEvent) => {
    e.preventDefault();
    const { data, error } = await sb.from("books").insert({ village_id: villageId, title: nb.title.trim(), topic: nb.topic.trim(), created_by: me.user_id }).select("id").single();
    if (error) return setError(errorMessage(error));
    setError("");
    setNb({ title: "", topic: "" });
    await lib.reload();
    setBookId(data.id as string);
  };

  // ── 회의 ──
  const [mt, setMt] = useState({ title: "", when: "", url: "", note: "" });
  const createMeeting = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^https:\/\/([a-z0-9-]+\.)*(zoom\.us|zoomgov\.com)\//i.test(mt.url.trim())) return setError("Zoom 회의 링크(https://…zoom.us/j/…)를 붙여 넣어 주세요.");
    if (await run(sb.from("meetings").insert({ village_id: villageId, title: mt.title.trim(), starts_at: new Date(mt.when).toISOString(), zoom_url: mt.url.trim(), note: mt.note.trim(), created_by: me.user_id }))) setMt({ title: "", when: "", url: "", note: "" });
  };
  const upcoming = lib.meetings.filter((m) => new Date(m.starts_at).getTime() > nowMs - 2 * 3600_000);
  const earlier = lib.meetings.filter((m) => new Date(m.starts_at).getTime() <= nowMs - 2 * 3600_000).reverse().slice(0, 3);

  return (
    <div className="space-y-5">
      {error && <Notice kind="error">{error}</Notice>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Window title="공동 도서관" tone="sky">
            <div className="space-y-2 p-3 text-sm">
              <p>모든 주민이 함께 쓰는 공부 공간이에요. 도서관에 가면 ‘공동 연구’ 상태로 보여요.</p>
              <div>
                <h3 className="label">지금 여기 있는 주민</h3>
                {here.length === 0 ? <p className="text-ink-soft">아무도 없어요.</p> : (
                  <ul className="flex flex-wrap gap-2">
                    {here.map((r) => <li key={r.user_id} className="card flex items-center gap-2 px-2 py-1"><CharacterIcon avatar={r.profile.avatar} size={34} />{r.profile.display_name}{r.user_id === me.user_id && " (나)"}</li>)}
                  </ul>
                )}
              </div>
              {me.shown !== "library" && <button type="button" className="btn btn-primary" onClick={onGoHere}>도서관으로 가기</button>}
            </div>
          </Window>

          <Window title="함께 쓰는 책장" tone="butter">
            <div className="space-y-3 p-3">
              <p className="text-xs text-ink-soft">주제를 정해 책을 만들면, 주민들이 그 아래로 차례로 이어서 써요. 책등을 눌러 읽고 이어 쓰세요.</p>
              <div className="px-box flex min-h-[180px] flex-wrap items-end gap-1 p-2" style={{ background: "linear-gradient(#6f4a30 0 0) bottom / 100% 10px no-repeat, #8a5f3c", ["--bd" as string]: "#3a2a33" }} role="group" aria-label="책장">
                {lib.loaded && lib.books.length === 0 && <p className="w-full pb-4 text-center text-xs text-[#fff8e4]">아직 책이 없어요. 아래에서 첫 책을 만들어 보세요.</p>}
                {lib.books.map((b) => {
                  const n = lib.entries.filter((e) => e.book_id === b.id).length;
                  return (
                    <button key={b.id} type="button" aria-pressed={bookId === b.id} aria-label={`${b.title} — ${n}편${b.status === "finished" ? ", 완결" : ""}`} onClick={() => setBookId(b.id)}
                      className="px-box mb-2 flex w-9 items-center justify-center whitespace-nowrap py-2 text-[12px] leading-none" style={{ height: 116 + Math.min(n, 12) * 5, background: spineColor(b.id), color: "#3a2a33", writingMode: "vertical-rl", ["--px" as string]: "2px", ["--bd" as string]: bookId === b.id ? "#fff8e4" : "#3a2a33" }}>
                      <span className="max-h-full overflow-hidden">{b.title}</span>
                    </button>
                  );
                })}
              </div>
              <form onSubmit={createBook} className="card space-y-1 p-2">
                <label className="label" htmlFor="nb-title">새 책 만들기</label>
                <input id="nb-title" className="input" placeholder="책 제목" maxLength={100} value={nb.title} onChange={(e) => setNb({ ...nb, title: e.target.value })} required />
                <label className="sr-only" htmlFor="nb-topic">주제</label>
                <input id="nb-topic" className="input" placeholder="주제와 방향 (선택)" maxLength={300} value={nb.topic} onChange={(e) => setNb({ ...nb, topic: e.target.value })} />
                <button type="submit" className="btn btn-primary btn-sm" disabled={!nb.title.trim()}>책 만들기</button>
              </form>
            </div>
          </Window>
        </div>

        <Window title="Zoom 회의" tone="mint" className="self-start">
          <div className="space-y-3 p-3 text-sm">
            <ul className="space-y-2">
              {lib.loaded && upcoming.length === 0 && <li className="text-ink-soft">예정된 회의가 없어요.</li>}
              {upcoming.map((m) => (
                <li key={m.id} className="card space-y-1 p-2">
                  <p className="flex flex-wrap items-center gap-1"><span className="font-display">{m.title}</span> <MeetingState startsAt={m.starts_at} /></p>
                  <p className="text-xs text-ink-soft">{clockLabel(m.starts_at)} · {who(m.created_by)}님이 열었어요</p>
                  {m.note && <p className="text-xs">{m.note}</p>}
                  <div className="flex flex-wrap gap-1">
                    <a className="btn btn-sm btn-primary" href={m.zoom_url} target="_blank" rel="noopener noreferrer">Zoom 참여하기 (새 창)</a>
                    {(m.created_by === me.user_id || isAdmin) && <button type="button" className="btn btn-sm btn-danger" onClick={() => window.confirm("이 회의를 지울까요?") && void run(sb.from("meetings").delete().eq("id", m.id))}>지우기</button>}
                  </div>
                </li>
              ))}
              {earlier.map((m) => <li key={m.id} className="px-1 text-xs text-ink-soft">지난 회의 · {m.title} ({clockLabel(m.starts_at)})</li>)}
            </ul>
            <form onSubmit={createMeeting} className="card space-y-1 p-2">
              <p className="label">회의 열기</p>
              <input className="input" aria-label="회의 제목" placeholder="회의 제목 (예: 주간 세미나)" maxLength={100} value={mt.title} onChange={(e) => setMt({ ...mt, title: e.target.value })} required />
              <label className="label" htmlFor="mt-when">시작 시각</label>
              <input id="mt-when" type="datetime-local" className="input" value={mt.when} onChange={(e) => setMt({ ...mt, when: e.target.value })} required />
              <label className="label" htmlFor="mt-url">Zoom 링크</label>
              <input id="mt-url" type="url" className="input" placeholder="https://us02web.zoom.us/j/…" maxLength={500} value={mt.url} onChange={(e) => setMt({ ...mt, url: e.target.value })} required />
              <input className="input" aria-label="메모" placeholder="메모 (선택)" maxLength={200} value={mt.note} onChange={(e) => setMt({ ...mt, note: e.target.value })} />
              <div className="flex flex-wrap gap-1">
                <button type="submit" className="btn btn-primary btn-sm" disabled={!mt.title.trim() || !mt.when || !mt.url.trim()}>회의 등록하고 알리기</button>
                <a className="btn btn-sm" href={ZOOM_NEW} target="_blank" rel="noopener noreferrer">Zoom에서 새 회의 만들기 (새 창)</a>
              </div>
              <p className="text-xs text-ink-soft">Zoom에서 회의를 만든 뒤 초대 링크를 복사해 붙여 넣으면, 다른 주민들에게 알림이 가고 누구나 눌러서 참여할 수 있어요.</p>
            </form>
          </div>
        </Window>
      </div>
      {book && <BookReader key={book.id} book={book} lib={lib} me={me} who={who} run={run} onClose={() => setBookId(null)} />}
    </div>
  );
}

function BookReader({
  book, lib, me, who, run, onClose,
}: { book: Book; lib: Lib; me: Resident; who: (id: string | null) => string; run: (p: PromiseLike<{ error: unknown }>) => Promise<boolean>; onClose: () => void }) {
  const entries = lib.entries.filter((e) => e.book_id === book.id);
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const sb = supabase();
  const mineBook = book.created_by === me.user_id;
  const open = book.status === "writing";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (editId) {
      if (await run(sb.from("book_entries").update({ heading: heading.trim(), body: body.trim() }).eq("id", editId))) { setEditId(null); setHeading(""); setBody(""); }
    } else if (await run(sb.from("book_entries").insert({ book_id: book.id, village_id: book.village_id, author_id: me.user_id, heading: heading.trim(), body: body.trim() }))) {
      setHeading(""); setBody("");
    }
  };
  return (
    <Window title={book.title} tone="lilac" actions={<button type="button" className="btn btn-sm" onClick={onClose}>닫기</button>}>
      <div className="space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="chip">{open ? "집필 중" : "완결"}</span>
          <span className="text-xs text-ink-soft">{who(book.created_by)}님이 시작 · 이어 쓴 글 {entries.length}편</span>
          <span className="flex-1" />
          {mineBook && <button type="button" className="btn btn-sm" onClick={() => void run(sb.from("books").update({ status: open ? "finished" : "writing" }).eq("id", book.id))}>{open ? "완결하기" : "다시 이어 쓰기"}</button>}
          {(mineBook) && <button type="button" className="btn btn-sm btn-danger" onClick={() => { if (window.confirm("책과 모든 글을 지울까요? 되돌릴 수 없어요.")) { void run(sb.from("books").delete().eq("id", book.id)); onClose(); } }}>책 지우기</button>}
        </div>
        {book.topic && <p className="card p-2 text-sm"><span className="label">주제</span>{book.topic}</p>}
        <ol className="space-y-3">
          {entries.length === 0 && <li className="py-3 text-center text-sm text-ink-soft">아직 첫 글이 없어요. 첫 문단을 열어 주세요.</li>}
          {entries.map((e, i) => (
            <li key={e.id} className="card p-3">
              <p className="text-xs text-ink-soft">{i + 1}번째 · {who(e.author_id)} · {relativeTime(e.created_at)}</p>
              {e.heading && <h3 className="font-display">{e.heading}</h3>}
              <p className="mt-1 whitespace-pre-wrap break-words text-sm">{e.body}</p>
              {(e.author_id === me.user_id || mineBook) && (
                <div className="mt-1 flex gap-1">
                  {e.author_id === me.user_id && open && <button type="button" className="btn btn-sm" onClick={() => { setEditId(e.id); setHeading(e.heading); setBody(e.body); }}>고치기</button>}
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => window.confirm("이 글을 지울까요?") && void run(sb.from("book_entries").delete().eq("id", e.id))}>지우기</button>
                </div>
              )}
            </li>
          ))}
        </ol>
        {open ? (
          <form onSubmit={submit} className="card space-y-1 p-2">
            <p className="label">{editId ? "내 글 고치기" : entries.length ? "이어서 쓰기" : "첫 글 쓰기"}</p>
            <input className="input" aria-label="소제목" placeholder="소제목 (선택)" maxLength={100} value={heading} onChange={(e) => setHeading(e.target.value)} />
            <textarea className="input" aria-label="내용" rows={6} maxLength={5000} placeholder="앞의 글에 이어서 써 보세요." value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="flex gap-1">
              <button type="submit" className="btn btn-primary btn-sm" disabled={!body.trim()}>{editId ? "고치기" : "이어 쓰기"}</button>
              {editId && <button type="button" className="btn btn-sm" onClick={() => { setEditId(null); setHeading(""); setBody(""); }}>취소</button>}
            </div>
          </form>
        ) : <p className="text-center text-sm text-ink-soft">완결된 책이에요. 만든 사람이 ‘다시 이어 쓰기’를 누르면 다시 쓸 수 있어요.</p>}
      </div>
    </Window>
  );
}
