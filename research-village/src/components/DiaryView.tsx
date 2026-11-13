"use client";
import { useState, type FormEvent } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import { KIND_META } from "@/lib/constants";
import { relativeTime } from "@/lib/time";
import type { DiaryEntry, DiaryKind } from "@/lib/types";
import { Notice } from "./ui";

const safeLink = (url: string) => (/^https?:\/\//i.test(url) ? url : null);

/** 내 연구실 안의 다이어리. 쓴 글은 항상 나만 볼 수 있다. */
export default function DiaryPanel({
  villageId, myId, entries, loaded, reload,
}: { villageId: string; myId: string; entries: DiaryEntry[]; loaded: boolean; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState<DiaryEntry | "new" | null>(null);
  const [error, setError] = useState("");

  const remove = async (e: DiaryEntry) => {
    if (!window.confirm("이 기록을 지울까요? 되돌릴 수 없어요.")) return;
    const { error } = await supabase().from("diary_entries").delete().eq("id", e.id);
    if (error) setError(errorMessage(error));
    await reload();
  };

  return (
    <div className="space-y-2 p-3">
      {editing ? (
        <Editor key={editing === "new" ? "new" : editing.id} villageId={villageId} myId={myId} entry={editing === "new" ? null : editing}
          onDone={async () => { setEditing(null); await reload(); }} onCancel={() => setEditing(null)} />
      ) : (
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing("new")}>+ 새 글</button>
      )}
      {error && <Notice kind="error">{error}</Notice>}
      {loaded && entries.length === 0 && !editing && <p className="py-3 text-center text-sm text-ink-soft">아직 쓴 글이 없어요.</p>}
      <ul className="space-y-2">
        {entries.map((e) => {
          const link = safeLink(e.link_url);
          return (
            <li key={e.id}>
              <article className="card p-3">
                <p className="flex flex-wrap items-center gap-1">
                  <span className="chip">{KIND_META[e.kind].label}</span>
                  <span className="flex-1" />
                  <time className="text-xs text-ink-soft" dateTime={e.created_at}>{relativeTime(e.created_at)}</time>
                </p>
                {e.title && <h3 className="mt-1 font-display">{e.title}</h3>}
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{e.body}</p>
                {link && <p className="mt-1 truncate text-sm"><a href={link} target="_blank" rel="noopener noreferrer" className="text-[#2f6fd0] underline">{link}</a></p>}
                <div className="mt-1 flex gap-1">
                  <button type="button" className="btn btn-sm" onClick={() => setEditing(e)}>고치기</button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => void remove(e)}>삭제</button>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Editor({
  villageId, myId, entry, onDone, onCancel,
}: { villageId: string; myId: string; entry: DiaryEntry | null; onDone: () => void | Promise<void>; onCancel: () => void }) {
  const [kind, setKind] = useState<DiaryKind>(entry?.kind ?? "daily");
  const [title, setTitle] = useState(entry?.title ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const [link, setLink] = useState(entry?.link_url ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (link.trim() && !safeLink(link.trim())) return setError("링크는 http:// 또는 https:// 로 시작해야 해요.");
    setBusy(true);
    setError("");
    const fields = { kind, title: title.trim(), body: body.trim(), link_url: link.trim(), visibility: "private" };
    const { error } = entry
      ? await supabase().from("diary_entries").update(fields).eq("id", entry.id)
      : await supabase().from("diary_entries").insert({ ...fields, village_id: villageId, author_id: myId });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    await onDone();
  };

  return (
    <form onSubmit={submit} className="card space-y-2 p-2">
      <fieldset>
        <legend className="label">종류</legend>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(KIND_META) as DiaryKind[]).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} className={`btn btn-sm ${kind === k ? "btn-primary" : ""}`} onClick={() => setKind(k)}>{KIND_META[k].label}</button>
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
      {error && <Notice kind="error">{error}</Notice>}
      <div className="flex gap-1">
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !body.trim()}>{busy ? "저장 중…" : entry ? "고쳐 쓰기" : "기록 남기기"}</button>
        <button type="button" className="btn btn-sm" onClick={onCancel}>닫기</button>
      </div>
    </form>
  );
}
