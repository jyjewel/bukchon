"use client";
import { useState, type FormEvent } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import type { StudyGoal } from "@/hooks/useStudyGoals";
import type { Resident } from "@/lib/types";
import { Notice, Window } from "./ui";

const ERRORS: [string, string][] = [["too_many_goals", "진행 중인 공동 목표는 마을에 8개까지예요."], ["bad_members", "함께할 사람을 1~5명 골라 주세요."], ["goal_completed", "이미 끝난 목표예요."]];

/** 도서관의 공동 공부 목표: 함께할 사람을 고르고 목표를 정한 뒤, 각자 완료 버튼을 누른다 */
export default function StudyGoals({ villageId, me, residents, isAdmin, goals, loaded, reload, onDone }: { villageId: string; me: Resident; residents: Resident[]; isAdmin: boolean; goals: StudyGoal[]; loaded: boolean; reload: () => Promise<void>; onDone?: () => void }) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const others = residents.filter((r) => r.user_id !== me.user_id);
  const who = (id: string) => (id === me.user_id ? "나" : residents.find((r) => r.user_id === id)?.profile.display_name ?? "이웃마을 주민");
  const fail = (e: unknown) => { const t = errorMessage(e); setMsg({ kind: "error", text: ERRORS.find(([k]) => t.includes(k))?.[1] ?? t }); };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (picked.length === 0) { setMsg({ kind: "error", text: "함께할 사람을 한 명 이상 골라 주세요." }); return; }
    setBusy(true); setMsg(null);
    const { error } = await supabase().rpc("create_study_goal", { p_village: villageId, p_title: title.trim(), p_note: note.trim(), p_members: picked });
    setBusy(false);
    if (error) return fail(error);
    setTitle(""); setNote(""); setPicked([]);
    setMsg({ kind: "ok", text: "공동 목표를 정했어요. 함께하는 사람들에게 알림이 갔어요." });
    await reload();
  };
  const setDone = async (g: StudyGoal, done: boolean) => {
    const { data, error } = await supabase().rpc("set_study_goal_done", { p_goal: g.id, p_done: done });
    if (error) fail(error); else setMsg(null);
    await reload();
    if (!error && data === true) onDone?.();   // 마지막 한 명이 눌렀다면 광장으로 가서 같이 본다
  };
  const remove = async (g: StudyGoal) => {
    if (!window.confirm(`‘${g.title}’ 목표를 지울까요?`)) return;
    const { error } = await supabase().from("study_goals").delete().eq("id", g.id);
    if (error) fail(error); else await reload();
  };
  const active = goals.filter((g) => !g.completed_at);
  const finished = goals.filter((g) => g.completed_at).slice(0, 5);
  const row = (g: StudyGoal) => {
    const mine = g.members.find((m) => m.user_id === me.user_id);
    const doneCount = g.members.filter((m) => m.done_at).length;
    return (
      <li key={g.id} className="card space-y-1 p-2 text-sm" style={g.completed_at ? { opacity: 0.65 } : undefined}>
        <p className="flex flex-wrap items-center gap-2"><span className="font-display">{g.title}</span><span className="chip">{g.completed_at ? "목표 달성 🎉" : `${doneCount}/${g.members.length} 완료`}</span></p>
        {g.note && <p className="text-xs text-ink-soft">{g.note}</p>}
        <ul className="flex flex-wrap gap-1" aria-label="함께하는 사람">
          {g.members.map((m) => <li key={m.user_id} className="chip" style={{ background: m.done_at ? "#d5f2cf" : "#fff3c4" }}>{m.done_at ? "✔ " : ""}{who(m.user_id)}</li>)}
        </ul>
        {!g.completed_at && (
          <div className="flex flex-wrap gap-1">
            {mine && !mine.done_at && <button type="button" className="btn btn-sm btn-primary" onClick={() => void setDone(g, true)}>목표 완료</button>}
            {mine?.done_at && <button type="button" className="btn btn-sm" onClick={() => void setDone(g, false)}>완료 취소</button>}
            {(g.created_by === me.user_id || isAdmin) && <button type="button" className="btn btn-sm btn-danger" onClick={() => void remove(g)}>지우기</button>}
          </div>
        )}
      </li>
    );
  };
  return (
    <Window title="공동 공부 목표" tone="butter" className="self-start">
      <div className="space-y-3 p-3">
        <p className="text-sm text-ink-soft">함께할 사람을 골라 공부 목표를 정해요. 모두 ‘목표 완료’를 누르면 목표 달성!</p>
        {loaded && active.length === 0 && finished.length === 0 && <p className="text-center text-sm text-ink-soft">아직 공동 목표가 없어요.</p>}
        <ul className="space-y-2" aria-label="진행 중인 목표">{active.map(row)}</ul>
        {finished.length > 0 && <><p className="label">최근에 이룬 목표</p><ul className="space-y-2">{finished.map(row)}</ul></>}
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <form onSubmit={create} className="card space-y-2 p-2" aria-label="공동 목표 만들기">
          <p className="label">새 공동 목표</p>
          <input className="input" aria-label="목표" placeholder="목표 (예: 이번 주까지 논문 3편 읽기)" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} required />
          <input className="input" aria-label="메모" placeholder="메모 (선택)" maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} />
          <div role="group" aria-label="함께할 사람" className="space-y-1">
            <p className="text-sm">함께할 사람 <span className="text-xs text-ink-soft">(나는 자동으로 들어가요)</span></p>
            {others.length === 0 ? <p className="text-xs text-ink-soft">이웃이 입주하면 함께할 수 있어요.</p> : (
              <div className="flex flex-wrap gap-1">
                {others.map((r) => { const on = picked.includes(r.user_id); return <button key={r.user_id} type="button" aria-pressed={on} className={`btn btn-sm ${on ? "btn-primary" : ""}`} onClick={() => setPicked(on ? picked.filter((x) => x !== r.user_id) : [...picked, r.user_id])}>{r.profile.display_name}</button>; })}
              </div>
            )}
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy || !title.trim() || others.length === 0}>목표 정하기</button>
        </form>
      </div>
    </Window>
  );
}
