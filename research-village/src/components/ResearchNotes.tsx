"use client";
import { useState } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import { relativeTime } from "@/lib/time";
import type { useResearchNotes } from "@/hooks/useResearchNotes";
import type { ResearchNote } from "@/lib/types";
import { useAutosave, type PersistResult } from "@/hooks/useAutosave";
import { DocTools, SaveStatusBar } from "./DocTools";
import { Notice } from "./ui";

type Notes = ReturnType<typeof useResearchNotes>;
const ALL = "__all__";

/** 카테고리별 연구노트 (나만 볼 수 있음) */
export default function ResearchNotes({ data, userId, openId }: { data: Notes; userId: string; openId?: string }) {
  const [filter, setFilter] = useState(ALL);
  const [editing, setEditing] = useState<ResearchNote | "new" | null>(null);
  const [openedFor, setOpenedFor] = useState<string | undefined>(undefined);
  if (openId && openId !== openedFor && data.loaded) {
    const n = data.notes.find((x) => x.id === openId);
    if (n) { setOpenedFor(openId); setEditing(n); }
  }
  const shown = filter === ALL ? data.notes : data.notes.filter((n) => n.category === filter);
  const count = (c: string) => data.notes.filter((n) => n.category === c).length;

  return (
    <div className="space-y-2 p-3">
      <div className="flex flex-wrap items-center" role="group" aria-label="카테고리 목록">
        <button type="button" aria-pressed={filter === ALL} className={`btn btn-sm ${filter === ALL ? "btn-primary" : ""}`} onClick={() => setFilter(ALL)}>전체 {data.notes.length}</button>
        {data.categories.map((c) => (
          <button key={c} type="button" aria-pressed={filter === c} className={`btn btn-sm ${filter === c ? "btn-primary" : ""}`} onClick={() => setFilter(c)}>{c} {count(c)}</button>
        ))}
      </div>
      {editing ? (
        <NoteEditor key={editing === "new" ? "new" : editing.id} note={editing === "new" ? null : editing} userId={userId} categories={data.categories} defaultCategory={filter === ALL ? "" : filter}
          onChanged={data.reload} onClose={() => setEditing(null)} />
      ) : (
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing("new")}>+ 새 노트</button>
      )}
      {data.loaded && shown.length === 0 && !editing && <p className="py-3 text-center text-sm text-ink-soft">{data.notes.length ? "이 카테고리에는 노트가 없어요." : "아직 연구노트가 없어요. 첫 노트를 써 보세요."}</p>}
      <ul className="space-y-2">
        {shown.map((n) => (
          <li key={n.id}>
            <button type="button" onClick={() => setEditing(n)} className={`card w-[calc(100%-6px)] p-2 text-left text-sm ${editing !== "new" && editing?.id === n.id ? "card-on" : ""}`}>
              <span className="flex items-center gap-2"><span className="chip">{n.category}</span><span className="flex-1 truncate font-display">{n.title || "(제목 없음)"}</span><span className="text-xs text-ink-soft">{relativeTime(n.updated_at)}</span></span>
              {n.body && <span className="mt-1 line-clamp-2 block text-xs text-ink-soft">{n.body}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface NoteFields extends Record<string, unknown> { category: string; title: string; body: string }

function NoteEditor({
  note, userId, categories, defaultCategory, onChanged, onClose,
}: { note: ResearchNote | null; userId: string; categories: string[]; defaultCategory: string; onChanged: () => void | Promise<void>; onClose: () => void }) {
  const [error, setError] = useState("");
  const auto = useAutosave<NoteFields>({
    userId, kind: "note", docKey: note?.id ?? "new",
    snapshotKey: (id) => id,
    initial: { fields: { category: note?.category ?? defaultCategory, title: note?.title ?? "", body: note?.body ?? "" }, id: note?.id ?? null, rev: note?.rev ?? null },
    isEmpty: (f) => f.title.trim() === "" && f.body.trim() === "",
    toSnapshot: (f) => ({ title: f.title, category: f.category, body: f.body }),
    fetchServer: async (id) => {
      if (!id) return null;
      const { data } = await supabase().from("research_notes").select("category, title, body, rev").eq("id", id).maybeSingle();
      return data ? { fields: { category: data.category as string, title: data.title as string, body: data.body as string }, rev: data.rev as number } : null;
    },
    persist: async (f, id, rev): Promise<PersistResult> => {
      const fields = { category: f.category.trim() || "기타", title: f.title.trim(), body: f.body };
      const sb = supabase();
      if (id === null) {
        const { data, error } = await sb.from("research_notes").insert({ user_id: userId, ...fields }).select("id, rev").single();
        return error ? { error: error.message } : { ok: true, id: data.id as string, rev: data.rev as number };
      }
      const { data, error } = await sb.from("research_notes").update(fields).eq("id", id).eq("rev", rev ?? 0).select("rev");
      if (error) return { error: error.message };
      return !data || data.length === 0 ? { conflict: true } : { ok: true, id, rev: data[0].rev as number };
    },
    onSaved: () => void onChanged(),
  });
  const { fields } = auto;

  const close = async () => {
    await auto.flush();
    if (auto.unsaved && !window.confirm("아직 저장되지 않은 글이 있어요. 그래도 닫을까요? (글은 이 기기에 임시 보관돼 있어서, 이 노트를 다시 열면 되살려요.)")) return;
    onClose();
  };
  const remove = async () => {
    if (!auto.id || !window.confirm("이 노트를 지울까요? 지워도 ‘찾기·내보내기’의 삭제한 글 보관함에서 되살릴 수 있어요.")) return;
    const { error } = await supabase().from("research_notes").delete().eq("id", auto.id);
    if (error) return setError(errorMessage(error));
    await onChanged();
    onClose();
  };
  return (
    <div className="card space-y-2 p-2">
      <div className="flex flex-wrap gap-2">
        <div className="min-w-36 flex-1">
          <label className="label" htmlFor="rn-cat">카테고리</label>
          <input id="rn-cat" className="input" list="rn-cats" maxLength={30} value={fields.category} onChange={(e) => auto.set({ category: e.target.value })} placeholder="예: 방각본, 논문 구상" />
          <datalist id="rn-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div className="min-w-36 flex-[2]">
          <label className="label" htmlFor="rn-title">제목</label>
          <input id="rn-title" className="input" maxLength={100} value={fields.title} onChange={(e) => auto.set({ title: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="rn-body">내용</label>
        <textarea id="rn-body" className="input big-write" rows={9} maxLength={20000} value={fields.body} onChange={(e) => auto.set({ body: e.target.value })} />
      </div>
      <SaveStatusBar auto={auto} />
      {error && <Notice kind="error">{error}</Notice>}
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => void close()}>닫기</button>
        <DocTools kind="note" itemKey={auto.id} text={`${fields.title}\n[${fields.category}]\n\n${fields.body}`} filename={`노트-${fields.title || "제목없음"}`} onRestore={(r) => auto.set({ title: r.title, category: r.category || fields.category, body: r.body })} />
        <span className="flex-1" />
        {auto.id && <button type="button" className="btn btn-sm btn-danger" onClick={() => void remove()}>지우기</button>}
      </div>
    </div>
  );
}
