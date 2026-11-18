"use client";
import { useState, type FormEvent } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import { needDays, type StudyGoal } from "@/hooks/useStudyGoals";
import { dateKey } from "@/lib/time";
import type { Resident } from "@/lib/types";
import { Modal, Notice, Window } from "./ui";

const ERRORS: [string, string][] = [["too_many_goals", "진행 중인 공동 목표는 마을에 8개까지예요."], ["bad_members", "함께할 사람을 1~5명 골라 주세요."], ["goal_completed", "이미 끝난 목표예요."], ["bad_period", "기간은 7일 이상 120일 이하로, 시작일은 오늘 이후로 정해 주세요."], ["bad_day", "오늘이나 어제만 체크할 수 있어요."], ["not_allowed", "만든 사람이나 마을 장님만 고칠 수 있어요."]];
const addDays = (key: string, n: number) => { const d = new Date(`${key}T00:00:00`); d.setDate(d.getDate() + n); return dateKey(d); };
const short = (k: string) => { const [, m, d] = k.split("-"); return `${Number(m)}/${Number(d)}`; };

/** 도서관의 공동 공부 목표: 한 번 완료형, 또는 기간을 정해 매일 체크하는 기간형. 만든 사람·마을 장님은 고치거나 지울 수 있다. */
export default function StudyGoals({ villageId, me, residents, isAdmin, goals, loaded, reload, onDone }: { villageId: string; me: Resident; residents: Resident[]; isAdmin: boolean; goals: StudyGoal[]; loaded: boolean; reload: () => Promise<void>; onDone?: () => void }) {
  const today = dateKey();
  const [type, setType] = useState<"once" | "habit">("once");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(addDays(today, 29));
  const [perWeek, setPerWeek] = useState(3);
  const [edit, setEdit] = useState<StudyGoal | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const others = residents.filter((r) => r.user_id !== me.user_id);
  const who = (id: string) => (id === me.user_id ? "나" : residents.find((r) => r.user_id === id)?.profile.display_name ?? "이웃마을 주민");
  const fail = (e: unknown) => { const t = errorMessage(e); setMsg({ kind: "error", text: ERRORS.find(([k]) => t.includes(k))?.[1] ?? t }); };
  const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400_000) + 1;
  const need = days >= 7 ? needDays(start, end, perWeek) : 0;

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (picked.length === 0) { setMsg({ kind: "error", text: "함께할 사람을 한 명 이상 골라 주세요." }); return; }
    setBusy(true); setMsg(null);
    const { error } = type === "once"
      ? await supabase().rpc("create_study_goal", { p_village: villageId, p_title: title.trim(), p_note: note.trim(), p_members: picked })
      : await supabase().rpc("create_habit_goal", { p_village: villageId, p_title: title.trim(), p_note: note.trim(), p_members: picked, p_start: start, p_end: end, p_per_week: perWeek });
    setBusy(false);
    if (error) return fail(error);
    setTitle(""); setNote(""); setPicked([]);
    setMsg({ kind: "ok", text: type === "once" ? "공동 목표를 정했어요. 함께하는 사람들에게 알림이 갔어요." : "기간형 목표를 정했어요. 오늘부터 매일 연구실 체크리스트에 ‘공동 공부’가 올라와요." });
    await reload();
  };
  const setDone = async (g: StudyGoal, done: boolean) => {
    const { data, error } = await supabase().rpc("set_study_goal_done", { p_goal: g.id, p_done: done });
    if (error) fail(error); else setMsg(null);
    await reload();
    if (!error && data === true) onDone?.();   // 마지막 한 명이 눌렀다면 광장으로 가서 같이 본다
  };
  const checkToday = async (g: StudyGoal, on: boolean) => {
    const { error } = await supabase().rpc("set_goal_check", { p_goal: g.id, p_day: today, p_on: on });
    if (error) fail(error); else setMsg(null);
    await reload();
  };
  const remove = async (g: StudyGoal) => {
    if (!window.confirm(`‘${g.title}’ 목표를 지울까요?`)) return;
    const { error } = await supabase().from("study_goals").delete().eq("id", g.id);
    if (error) fail(error); else await reload();
  };
  const active = goals.filter((g) => !g.completed_at && !g.missed_at);
  const missed = goals.filter((g) => g.missed_at).slice(0, 3);
  const canEdit = (g: StudyGoal) => g.created_by === me.user_id || isAdmin;

  const row = (g: StudyGoal) => {
    const mine = g.members.find((m) => m.user_id === me.user_id);
    const isHabit = g.kind === "habit" && g.start_date && g.end_date && g.per_week;
    const needN = isHabit ? needDays(g.start_date!, g.end_date!, g.per_week!) : 0;
    const doneCount = g.members.filter((m) => m.done_at).length;
    const myChecks = g.checks[me.user_id] ?? [];
    return (
      <li key={g.id} className="card space-y-1 p-2 text-sm" style={g.missed_at ? { opacity: 0.6 } : undefined}>
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-display">{g.title}</span>
          <span className="chip">{g.missed_at ? "아쉽게 끝났어요" : isHabit ? "기간형" : `${doneCount}/${g.members.length} 완료`}</span>
        </p>
        {isHabit && <p className="text-xs">{short(g.start_date!)} ~ {short(g.end_date!)} · 주 {g.per_week}일 · {needN}일 이상 체크하면 달성</p>}
        {g.note && <p className="text-xs text-ink-soft">{g.note}</p>}
        <ul className="flex flex-wrap gap-1" aria-label="함께하는 사람">
          {g.members.map((m) => {
            const n = (g.checks[m.user_id] ?? []).length;
            const ok = isHabit ? n >= needN : Boolean(m.done_at);
            return <li key={m.user_id} className="chip" style={{ background: ok ? "#d5f2cf" : "#fff3c4" }}>{ok ? "✔ " : ""}{who(m.user_id)}{isHabit ? ` ${n}/${needN}` : ""}</li>;
          })}
        </ul>
        {!g.missed_at && (
          <div className="flex flex-wrap gap-1">
            {isHabit && mine && g.start_date! <= today && today <= g.end_date! && (myChecks.includes(today)
              ? <button type="button" className="btn btn-sm" onClick={() => void checkToday(g, false)}>오늘 체크 취소</button>
              : <button type="button" className="btn btn-sm btn-primary" onClick={() => void checkToday(g, true)}>오늘 했어요</button>)}
            {!isHabit && mine && !mine.done_at && <button type="button" className="btn btn-sm btn-primary" onClick={() => void setDone(g, true)}>목표 완료</button>}
            {!isHabit && mine?.done_at && <button type="button" className="btn btn-sm" onClick={() => void setDone(g, false)}>완료 취소</button>}
            {canEdit(g) && <button type="button" className="btn btn-sm" onClick={() => setEdit(g)}>고치기</button>}
          </div>
        )}
        {(canEdit(g)) && <button type="button" className="btn btn-sm btn-danger" onClick={() => void remove(g)}>지우기</button>}
      </li>
    );
  };

  return (
    <Window title="공동 공부 목표" tone="butter" className="self-start">
      <div className="space-y-3 p-3">
        <p className="text-sm text-ink-soft">함께할 사람을 골라 목표를 정해요. 한 번에 끝내는 목표는 모두 ‘목표 완료’를 누르면 달성! 기간형은 기간 동안 매일 연구실 체크리스트로 체크해요.</p>
        {loaded && active.length === 0 && <p className="text-center text-sm text-ink-soft">진행 중인 공동 목표가 없어요.</p>}
        <ul className="space-y-2" aria-label="진행 중인 목표">{active.map(row)}</ul>
        {missed.length > 0 && <><p className="label">아쉽게 끝난 목표</p><ul className="space-y-2">{missed.map(row)}</ul></>}
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <form onSubmit={create} className="card space-y-2 p-2" aria-label="공동 목표 만들기">
          <p className="label">새 공동 목표</p>
          <div role="radiogroup" aria-label="목표 종류" className="flex flex-wrap gap-1">
            <button type="button" role="radio" aria-checked={type === "once"} className={`btn btn-sm ${type === "once" ? "btn-primary" : ""}`} onClick={() => setType("once")}>한 번 완료하는 목표</button>
            <button type="button" role="radio" aria-checked={type === "habit"} className={`btn btn-sm ${type === "habit" ? "btn-primary" : ""}`} onClick={() => setType("habit")}>기간 동안 매일 체크</button>
          </div>
          <input className="input" aria-label="목표" placeholder={type === "once" ? "목표 (예: 이번 주까지 논문 3편 읽기)" : "할 일 (예: 한시 읽기)"} maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} required />
          <input className="input" aria-label="메모" placeholder="메모 (선택)" maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} />
          {type === "habit" && (
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label htmlFor="g-start">시작</label><input id="g-start" type="date" className="input !w-auto" min={today} value={start} onChange={(e) => setStart(e.target.value)} required />
                <label htmlFor="g-end">끝</label><input id="g-end" type="date" className="input !w-auto" min={addDays(start, 6)} value={end} onChange={(e) => setEnd(e.target.value)} required />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label htmlFor="g-pw">일주일에</label>
                <select id="g-pw" className="input !w-auto" value={perWeek} onChange={(e) => setPerWeek(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}일 이상</option>)}</select>
              </div>
              <p className="text-xs text-ink-soft" aria-live="polite">{need > 0 ? `총 ${days}일 중 ${need}일 이상 체크하면 달성이에요 (${days}일 × ${perWeek}/7). 함께하는 모두가 채워야 해요.` : "기간을 7일 이상으로 정해 주세요."}</p>
            </div>
          )}
          <div role="group" aria-label="함께할 사람" className="space-y-1">
            <p className="text-sm">함께할 사람 <span className="text-xs text-ink-soft">(나는 자동으로 들어가요)</span></p>
            {others.length === 0 ? <p className="text-xs text-ink-soft">이웃이 입주하면 함께할 수 있어요.</p> : (
              <div className="flex flex-wrap gap-1">
                {others.map((r) => { const on = picked.includes(r.user_id); return <button key={r.user_id} type="button" aria-pressed={on} className={`btn btn-sm ${on ? "btn-primary" : ""}`} onClick={() => setPicked(on ? picked.filter((x) => x !== r.user_id) : [...picked, r.user_id])}>{r.profile.display_name}</button>; })}
              </div>
            )}
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy || !title.trim() || others.length === 0 || (type === "habit" && need === 0)}>목표 정하기</button>
        </form>
      </div>
      {edit && <EditGoal goal={edit} me={me} residents={residents} onClose={() => setEdit(null)} onSaved={async () => { setEdit(null); await reload(); }} />}
    </Window>
  );
}

function EditGoal({ goal, me, residents, onClose, onSaved }: { goal: StudyGoal; me: Resident; residents: Resident[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState(goal.title);
  const [note, setNote] = useState(goal.note);
  const [members, setMembers] = useState(goal.members.map((m) => m.user_id).filter((id) => id !== goal.created_by));
  const [end, setEnd] = useState(goal.end_date ?? "");
  const [perWeek, setPerWeek] = useState(goal.per_week ?? 3);
  const [err, setErr] = useState("");
  const habit = goal.kind === "habit";
  const candidates = residents.filter((r) => r.user_id !== goal.created_by);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase().rpc("update_study_goal", { p_goal: goal.id, p_title: title.trim(), p_note: note.trim(), p_members: members, p_end: habit ? end : null, p_per_week: habit ? perWeek : null });
    if (error) { const t = errorMessage(error); setErr(ERRORS.find(([k]) => t.includes(k))?.[1] ?? t); return; }
    await onSaved();
  };
  return (
    <Modal title="공동 목표 고치기" tone="butter" onClose={onClose}>
      <form onSubmit={save} className="space-y-2">
        <input className="input" aria-label="목표 이름" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input className="input" aria-label="메모" placeholder="메모 (선택)" maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} />
        {habit && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label htmlFor="e-end">끝나는 날</label><input id="e-end" type="date" className="input !w-auto" value={end} onChange={(e) => setEnd(e.target.value)} required />
            <label htmlFor="e-pw">일주일에</label>
            <select id="e-pw" className="input !w-auto" value={perWeek} onChange={(e) => setPerWeek(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}일 이상</option>)}</select>
          </div>
        )}
        <div role="group" aria-label="함께하는 사람" className="space-y-1">
          <p className="text-sm">함께하는 사람 <span className="text-xs text-ink-soft">({me.user_id === goal.created_by ? "나" : "만든 사람"}은 빠질 수 없어요)</span></p>
          <div className="flex flex-wrap gap-1">
            {candidates.map((r) => { const on = members.includes(r.user_id); return <button key={r.user_id} type="button" aria-pressed={on} className={`btn btn-sm ${on ? "btn-primary" : ""}`} onClick={() => setMembers(on ? members.filter((x) => x !== r.user_id) : [...members, r.user_id])}>{r.profile.display_name}</button>; })}
          </div>
        </div>
        {err && <Notice kind="error">{err}</Notice>}
        <div className="flex gap-2"><button type="submit" className="btn btn-primary" disabled={!title.trim() || members.length === 0}>저장</button><button type="button" className="btn" onClick={onClose}>취소</button></div>
      </form>
    </Modal>
  );
}
