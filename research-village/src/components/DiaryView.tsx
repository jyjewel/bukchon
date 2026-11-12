"use client";
import { useState, type FormEvent } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import { KIND_META, VISIBILITY_META } from "@/lib/constants";
import { relativeTime } from "@/lib/time";
import type { DiaryEntry, DiaryKind, DiaryVisibility, Resident } from "@/lib/types";
import { CharacterIcon } from "./Character";
import { Notice, Window } from "./ui";

function safeLink(url: string): string | null {
  return /^https?:\/\//i.test(url) ? url : null;
}

export function EntryCard({
  entry, author, mine, onEdit, onDelete, compact = false,
}: { entry: DiaryEntry; author?: Resident; mine: boolean; onEdit?: () => void; onDelete?: () => void; compact?: boolean }) {
  const link = safeLink(entry.link_url);
  return (
    <article className="rounded-xl border-2 border-line bg-white p-3">
      <header className="flex items-center gap-2">
        {author && <CharacterIcon avatar={author.profile.avatar} size={36} />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm">{author?.profile.display_name ?? "떠난 주민"}</p>
          <p className="text-xs text-ink-soft"><time dateTime={entry.created_at}>{relativeTime(entry.created_at)}</time></p>
        </div>
        <span className="chip">{KIND_META[entry.kind].icon} {KIND_META[entry.kind].label}</span>
        {mine && <span className="chip" title="공개 범위">{VISIBILITY_META[entry.visibility].icon} {VISIBILITY_META[entry.visibility].label}</span>}
      </header>
      {entry.title && <h3 className="mt-2 font-display">{entry.title}</h3>}
      <p className={`mt-1 whitespace-pre-wrap break-words text-sm ${compact ? "line-clamp-3" : ""}`}>{entry.body}</p>
      {link && <p className="mt-1 truncate text-sm"><a href={link} target="_blank" rel="noopener noreferrer" className="text-[#3f7fb5] underline">🔗 {link}</a></p>}
      {mine && onEdit && onDelete && (
        <div className="mt-2 flex gap-2">
          <button type="button" className="btn btn-sm" onClick={onEdit}>수정</button>
          <button type="button" className="btn btn-sm btn-danger" onClick={onDelete}>삭제</button>
        </div>
      )}
    </article>
  );
}

function Editor({
  villageId, myId, others, editing, onDone, onCancel,
}: { villageId: string; myId: string; others: Resident[]; editing: { entry: DiaryEntry; allowed: string[] } | null; onDone: () => void; onCancel: () => void }) {
  const e0 = editing?.entry;
  const [kind, setKind] = useState<DiaryKind>(e0?.kind ?? "daily");
  const [title, setTitle] = useState(e0?.title ?? "");
  const [body, setBody] = useState(e0?.body ?? "");
  const [link, setLink] = useState(e0?.link_url ?? "");
  const [visibility, setVisibility] = useState<DiaryVisibility>(e0?.visibility ?? "village");
  const [allowed, setAllowed] = useState<string[]>(editing?.allowed ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (link.trim() && !safeLink(link.trim())) return setError("링크는 http:// 또는 https:// 로 시작해야 해요.");
    if (visibility === "selected" && allowed.length === 0) return setError("글을 보여 줄 연구자를 한 명 이상 골라 주세요.");
    setBusy(true);
    setError("");
    const sb = supabase();
    const fields = { kind, title: title.trim(), body: body.trim(), link_url: link.trim(), visibility };
    const saved = e0
      ? await sb.from("diary_entries").update(fields).eq("id", e0.id).select("id").single()
      : await sb.from("diary_entries").insert({ ...fields, village_id: villageId, author_id: myId }).select("id").single();
    let err = saved.error;
    if (!err && saved.data) {
      const id = saved.data.id as string;
      if (e0) err = (await sb.from("entry_permissions").delete().eq("entry_id", id)).error;
      if (!err && visibility === "selected") {
        err = (await sb.from("entry_permissions").insert(allowed.map((user_id) => ({ entry_id: id, user_id })))).error;
      }
    }
    setBusy(false);
    if (err) return setError(errorMessage(err));
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-3 p-3">
      <fieldset>
        <legend className="label">어떤 기록인가요?</legend>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(KIND_META) as DiaryKind[]).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} className={`btn btn-sm ${kind === k ? "btn-primary" : ""}`} onClick={() => setKind(k)}>
              {KIND_META[k].icon} {KIND_META[k].label}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="d-title">제목 <span className="text-ink-soft">(선택)</span></label>
        <input id="d-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
      </div>
      <div>
        <label className="label" htmlFor="d-body">내용</label>
        <textarea id="d-body" className="input" rows={6} value={body} onChange={(e) => setBody(e.target.value)} maxLength={10000} required />
      </div>
      <div>
        <label className="label" htmlFor="d-link">링크 <span className="text-ink-soft">(선택)</span></label>
        <input id="d-link" type="url" className="input" value={link} onChange={(e) => setLink(e.target.value)} maxLength={500} placeholder="https://" />
      </div>
      <fieldset>
        <legend className="label">누구에게 보여 줄까요?</legend>
        <div className="space-y-1">
          {(Object.keys(VISIBILITY_META) as DiaryVisibility[]).map((v) => (
            <label key={v} className="flex items-center gap-2 text-sm">
              <input type="radio" name="visibility" checked={visibility === v} onChange={() => setVisibility(v)} />
              {VISIBILITY_META[v].icon} {VISIBILITY_META[v].label}
            </label>
          ))}
        </div>
        {visibility === "selected" && (
          <div className="mt-2 rounded-lg border-2 border-dashed border-line p-2">
            {others.length === 0 && <p className="text-sm text-ink-soft">아직 다른 주민이 없어요.</p>}
            {others.map((r) => (
              <label key={r.user_id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={allowed.includes(r.user_id)} onChange={(e) => setAllowed((a) => (e.target.checked ? [...a, r.user_id] : a.filter((x) => x !== r.user_id)))} />
                {r.profile.display_name}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={busy || !body.trim()}>{busy ? "저장 중…" : e0 ? "고쳐 쓰기" : "기록 남기기"}</button>
        {e0 && <button type="button" className="btn" onClick={onCancel}>취소</button>}
      </div>
    </form>
  );
}

export default function DiaryView({
  villageId, myId, residents, entries, reload,
}: { villageId: string; myId: string; residents: Resident[]; entries: DiaryEntry[]; reload: () => Promise<void> }) {
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [editing, setEditing] = useState<{ entry: DiaryEntry; allowed: string[] } | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [error, setError] = useState("");
  const shown = filter === "mine" ? entries.filter((e) => e.author_id === myId) : entries;
  const byId = new Map(residents.map((r) => [r.user_id, r]));

  const startEdit = async (entry: DiaryEntry) => {
    const { data } = await supabase().from("entry_permissions").select("user_id").eq("entry_id", entry.id);
    setEditing({ entry, allowed: (data ?? []).map((d) => d.user_id as string) });
    setEditorKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const remove = async (entry: DiaryEntry) => {
    if (!window.confirm("이 기록을 지울까요? 되돌릴 수 없어요.")) return;
    const { error } = await supabase().from("diary_entries").delete().eq("id", entry.id);
    if (error) setError(errorMessage(error));
    await reload();
  };
  const done = async () => {
    setEditing(null);
    setEditorKey((k) => k + 1);
    await reload();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <Window title={editing ? "기록 고치기" : "새 기록 쓰기"} icon="✏️" tone="rose" className="self-start">
        <Editor key={editorKey} villageId={villageId} myId={myId} others={residents.filter((r) => r.user_id !== myId)} editing={editing} onDone={done} onCancel={() => { setEditing(null); setEditorKey((k) => k + 1); }} />
      </Window>
      <Window title="연구 다이어리" icon="📔" tone="sky">
        <div className="space-y-3 p-3">
          <div className="flex gap-2" role="group" aria-label="보기 범위">
            <button type="button" aria-pressed={filter === "all"} className={`btn btn-sm ${filter === "all" ? "btn-primary" : ""}`} onClick={() => setFilter("all")}>마을 전체</button>
            <button type="button" aria-pressed={filter === "mine"} className={`btn btn-sm ${filter === "mine" ? "btn-primary" : ""}`} onClick={() => setFilter("mine")}>내 기록</button>
          </div>
          {error && <Notice kind="error">{error}</Notice>}
          {shown.length === 0 && <p className="py-6 text-center text-sm text-ink-soft">아직 기록이 없어요. 오늘의 연구를 한 줄 남겨 보세요.</p>}
          {shown.map((e) => (
            <EntryCard key={e.id} entry={e} author={byId.get(e.author_id)} mine={e.author_id === myId} onEdit={() => void startEdit(e)} onDelete={() => void remove(e)} />
          ))}
        </div>
      </Window>
    </div>
  );
}
