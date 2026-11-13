"use client";
import { useState } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import { KIND_META } from "@/lib/constants";
import { relativeTime } from "@/lib/time";
import type { DiaryEntry, DiaryKind } from "@/lib/types";
import { useAutosave, type PersistResult } from "@/hooks/useAutosave";
import { DocTools, SaveStatusBar } from "./DocTools";
import { Notice } from "./ui";

const safeLink = (url: string) => (/^https?:\/\//i.test(url) ? url : null);

/** 내 연구실 안의 다이어리. 쓴 글은 항상 나만 볼 수 있다. */
export default function DiaryPanel({
  myId, entries, loaded, reload, openId,
}: { myId: string; entries: DiaryEntry[]; loaded: boolean; reload: () => Promise<void>; openId?: string }) {
  const [editing, setEditing] = useState<DiaryEntry | "new" | null>(null);
  const [openedFor, setOpenedFor] = useState<string | undefined>(undefined);
  if (openId && openId !== openedFor && loaded) {
    const e = entries.find((x) => x.id === openId);
    if (e) { setOpenedFor(openId); setEditing(e); }
  }
  const [error, setError] = useState("");

  const remove = async (e: DiaryEntry) => {
    if (!window.confirm("이 기록을 지울까요? 지워도 ‘찾기·내보내기’의 삭제한 글 보관함에서 되살릴 수 있어요.")) return;
    const { error } = await supabase().from("diary_entries").delete().eq("id", e.id);
    if (error) setError(errorMessage(error));
    await reload();
  };

  return (
    <div className="space-y-2 p-3">
      {editing ? (
        <Editor key={editing === "new" ? "new" : editing.id} myId={myId} entry={editing === "new" ? null : editing}
          onChanged={reload} onClose={() => setEditing(null)} />
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

interface DiaryFields extends Record<string, unknown> { kind: DiaryKind; title: string; body: string; link: string }

function Editor({
  myId, entry, onChanged, onClose,
}: { myId: string; entry: DiaryEntry | null; onChanged: () => void | Promise<void>; onClose: () => void }) {
  const [error, setError] = useState("");
  const auto = useAutosave<DiaryFields>({
    userId: myId, kind: "diary", docKey: entry?.id ?? "new", snapshotKey: (id) => id,
    initial: { fields: { kind: entry?.kind ?? "daily", title: entry?.title ?? "", body: entry?.body ?? "", link: entry?.link_url ?? "" }, id: entry?.id ?? null, rev: entry?.rev ?? null },
    isEmpty: (f) => f.title.trim() === "" && f.body.trim() === "",
    toSnapshot: (f) => ({ title: f.title, category: "", body: f.body }),
    fetchServer: async (id) => {
      if (!id) return null;
      const { data } = await supabase().from("diary_entries").select("kind, title, body, link_url, rev").eq("id", id).maybeSingle();
      return data ? { fields: { kind: data.kind as DiaryKind, title: data.title as string, body: data.body as string, link: data.link_url as string }, rev: data.rev as number } : null;
    },
    persist: async (f, id, rev): Promise<PersistResult> => {
      const link = f.link.trim();
      const fields = { kind: f.kind, title: f.title.trim(), body: f.body, link_url: safeLink(link) ? link : "", visibility: "private" };
      const sb = supabase();
      if (id === null) {
        const { data, error } = await sb.from("diary_entries").insert({ ...fields, author_id: myId }).select("id, rev").single();
        return error ? { error: error.message } : { ok: true, id: data.id as string, rev: data.rev as number };
      }
      const { data, error } = await sb.from("diary_entries").update(fields).eq("id", id).eq("rev", rev ?? 0).select("rev");
      if (error) return { error: error.message };
      return !data || data.length === 0 ? { conflict: true } : { ok: true, id, rev: data[0].rev as number };
    },
    onSaved: () => void onChanged(),
  });
  const { fields } = auto;
  const badLink = fields.link.trim() !== "" && !safeLink(fields.link.trim());

  const close = async () => {
    await auto.flush();
    if (auto.unsaved && !window.confirm("아직 저장되지 않은 글이 있어요. 그래도 닫을까요? (글은 이 기기에 임시 보관돼 있어서, 이 글을 다시 열면 되살려요.)")) return;
    onClose();
  };
  const remove = async () => {
    if (!auto.id || !window.confirm("이 기록을 지울까요? 지워도 ‘찾기·내보내기’의 삭제한 글 보관함에서 되살릴 수 있어요.")) return;
    const { error } = await supabase().from("diary_entries").delete().eq("id", auto.id);
    if (error) return setError(errorMessage(error));
    await onChanged();
    onClose();
  };

  return (
    <div className="card space-y-2 p-2">
      <fieldset>
        <legend className="label">종류</legend>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(KIND_META) as DiaryKind[]).map((k) => (
            <button key={k} type="button" aria-pressed={fields.kind === k} className={`btn btn-sm ${fields.kind === k ? "btn-primary" : ""}`} onClick={() => auto.set({ kind: k })}>{KIND_META[k].label}</button>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="d-title">제목 <span className="text-ink-soft">(선택)</span></label>
        <input id="d-title" className="input" value={fields.title} onChange={(e) => auto.set({ title: e.target.value })} maxLength={100} />
      </div>
      <div>
        <label className="label" htmlFor="d-body">내용</label>
        <textarea id="d-body" className="input big-write" rows={6} value={fields.body} onChange={(e) => auto.set({ body: e.target.value })} maxLength={10000} />
      </div>
      <div>
        <label className="label" htmlFor="d-link">링크 <span className="text-ink-soft">(선택)</span></label>
        <input id="d-link" type="url" className="input" value={fields.link} onChange={(e) => auto.set({ link: e.target.value })} maxLength={500} placeholder="https://" />
        {badLink && <p className="text-xs text-[#c0392b]">링크는 http:// 또는 https:// 로 시작해야 저장돼요.</p>}
      </div>
      <SaveStatusBar auto={auto} />
      {error && <Notice kind="error">{error}</Notice>}
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => void close()}>닫기</button>
        <DocTools kind="diary" itemKey={auto.id} text={`${fields.title}\n\n${fields.body}${fields.link ? `\n\n링크: ${fields.link}` : ""}`} filename={`다이어리-${fields.title || "제목없음"}`} onRestore={(r) => auto.set({ title: r.title, body: r.body })} />
        <span className="flex-1" />
        {auto.id && <button type="button" className="btn btn-sm btn-danger" onClick={() => void remove()}>지우기</button>}
      </div>
    </div>
  );
}
