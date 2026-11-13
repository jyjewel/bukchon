"use client";
import { useState, type FormEvent } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import { relativeTime } from "@/lib/time";
import type { useResearchNotes } from "@/hooks/useResearchNotes";
import type { ResearchNote } from "@/lib/types";
import { Notice } from "./ui";

type Notes = ReturnType<typeof useResearchNotes>;
const ALL = "__all__";

/** 카테고리별 연구노트 (나만 볼 수 있음) */
export default function ResearchNotes({ data, userId }: { data: Notes; userId: string }) {
  const [filter, setFilter] = useState(ALL);
  const [editing, setEditing] = useState<ResearchNote | "new" | null>(null);
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
          onDone={async () => { setEditing(null); await data.reload(); }} onCancel={() => setEditing(null)} />
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

function NoteEditor({
  note, userId, categories, defaultCategory, onDone, onCancel,
}: { note: ResearchNote | null; userId: string; categories: string[]; defaultCategory: string; onDone: () => void | Promise<void>; onCancel: () => void }) {
  const [category, setCategory] = useState(note?.category ?? defaultCategory);
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fields = { category: category.trim() || "기타", title: title.trim(), body };
    const { error } = note
      ? await supabase().from("research_notes").update(fields).eq("id", note.id)
      : await supabase().from("research_notes").insert({ user_id: userId, ...fields });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    await onDone();
  };
  const remove = async () => {
    if (!note || !window.confirm("이 노트를 지울까요? 되돌릴 수 없어요.")) return;
    const { error } = await supabase().from("research_notes").delete().eq("id", note.id);
    if (error) return setError(errorMessage(error));
    await onDone();
  };
  return (
    <form onSubmit={save} className="card space-y-2 p-2">
      <div className="flex flex-wrap gap-2">
        <div className="min-w-36 flex-1">
          <label className="label" htmlFor="rn-cat">카테고리</label>
          <input id="rn-cat" className="input" list="rn-cats" maxLength={30} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="예: 방각본, 논문 구상" />
          <datalist id="rn-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div className="min-w-36 flex-[2]">
          <label className="label" htmlFor="rn-title">제목</label>
          <input id="rn-title" className="input" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="rn-body">내용</label>
        <textarea id="rn-body" className="input big-write" rows={9} maxLength={20000} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="flex flex-wrap gap-1">
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || (!title.trim() && !body.trim())}>{busy ? "저장 중…" : "저장"}</button>
        <button type="button" className="btn btn-sm" onClick={onCancel}>닫기</button>
        {note && <button type="button" className="btn btn-sm btn-danger" onClick={() => void remove()}>지우기</button>}
      </div>
    </form>
  );
}
