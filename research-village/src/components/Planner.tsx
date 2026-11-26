"use client";
import { useState, type FormEvent } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import { dateKey, daysUntil, ddayLabel } from "@/lib/time";
import { useToday, type Todo, type usePlanner } from "@/hooks/usePlanner";
import { useMyHabits } from "@/hooks/useStudyGoals";
import { Notice } from "./ui";

type Planner = ReturnType<typeof usePlanner>;

/** 남은 날수에 따라 색이 달라지는 D-day 표시 */
function Dday({ days, done }: { days: number; done: boolean }) {
  const bg = done ? "#e6e0d2" : days < 0 ? "#c9c3d6" : days <= 3 ? "#ff9a8a" : days <= 7 ? "#ffe58a" : "#cfe4f6";
  return <span className="chip shrink-0 font-display" style={{ background: bg, minWidth: 56, justifyContent: "center" }}>{ddayLabel(days)}</span>;
}
const dateText = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
};

/** 마감 일정: 제목과 날짜를 넣으면 D-○○ 이 뜬다. 여러 개를 추가할 수 있다. */
export function DeadlinePanel({ planner, userId, names = {} }: { planner: Planner; userId: string; names?: Record<string, string> }) {
  const today = useToday();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [error, setError] = useState("");
  const sb = supabase();
  const run = async (p: PromiseLike<{ error: unknown }>) => {
    const { error } = await p;
    setError(error ? errorMessage(error) : "");
    await planner.reload();
    return !error;
  };
  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(sb.from("deadlines").insert({ user_id: userId, title: title.trim(), due_date: due }))) { setTitle(""); setDue(""); }
  };
  const open = planner.deadlines.filter((d) => !d.done);
  const done = planner.deadlines.filter((d) => d.done);
  const row = (d: (typeof planner.deadlines)[number]) => {
    const n = daysUntil(d.due_date, today);
    return (
      <li key={d.id} className="card space-y-1 p-2 text-sm" style={d.done ? { opacity: 0.6 } : undefined}>
        <div className="flex items-start gap-2">
          <Dday days={n} done={d.done} />
          <span className="min-w-0 flex-1">
            <span className={`block break-words ${d.done ? "line-through" : ""}`}>{d.title}</span>
            <span className="text-xs text-ink-soft">{dateText(d.due_date)}</span>
            {planner.cheers.filter((c) => c.deadline_id === d.id).length > 0 && (
              <span className="block text-xs" style={{ color: "#c0504d" }}>응원 {planner.cheers.filter((c) => c.deadline_id === d.id).length}명: {planner.cheers.filter((c) => c.deadline_id === d.id).map((c) => names[c.from_user] ?? "이웃").join(", ")}</span>
            )}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
          <label className="flex items-center gap-1 text-xs" title="공개하면 마을 주민이 이 마감을 보고 응원할 수 있어요">
            <input type="checkbox" checked={d.shared} onChange={(e) => { const shared = e.target.checked; planner.setDeadlines((all) => all.map((x) => (x.id === d.id ? { ...x, shared } : x))); void run(sb.from("deadlines").update({ shared }).eq("id", d.id)); }} /> 공개
          </label>
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={d.done} onChange={(e) => { const done = e.target.checked; planner.setDeadlines((all) => all.map((x) => (x.id === d.id ? { ...x, done } : x))); void run(sb.from("deadlines").update({ done }).eq("id", d.id)); }} /> 완료
          </label>
          <button type="button" className="btn btn-sm btn-danger" aria-label={`${d.title} 삭제`} onClick={() => void run(sb.from("deadlines").delete().eq("id", d.id))}>삭제</button>
        </div>
      </li>
    );
  };
  return (
    <div className="space-y-2 p-3">
      <form onSubmit={add} className="flex flex-wrap items-start gap-1">
        <div className="min-w-40 flex-[2]">
          <label className="sr-only" htmlFor="dl-title">마감 일정 제목</label>
          <input id="dl-title" className="input" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 학회 발표 원고 마감" />
        </div>
        <div className="min-w-[10.5rem] flex-1">
          <label className="sr-only" htmlFor="dl-date">마감 날짜</label>
          <input id="dl-date" type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary btn-sm mt-[5px] shrink-0" disabled={!title.trim() || !due}>추가</button>
      </form>
      {error && <Notice kind="error">{error}</Notice>}
      {planner.loaded && planner.deadlines.length === 0 && <p className="py-2 text-center text-sm text-ink-soft">등록한 마감 일정이 없어요.</p>}
      <ul className="space-y-1">{open.map(row)}{done.map(row)}</ul>
    </div>
  );
}

/** 오늘의 체크리스트: 오늘 할 일을 적고 눌러서 바로 체크한다. 못 끝낸 일은 다음 날로 이어지고, 끝낸 일은 그날만 보인다. */
export function TodoPanel({ planner, userId }: { planner: Planner; userId: string }) {
  const today = useToday();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const habits = useMyHabits(userId, today);
  const sb = supabase();
  const toggleHabit = async (id: string, on: boolean) => {
    habits.setList((all) => all.map((h) => (h.id === id ? { ...h, checked: on ? [...h.checked, today] : h.checked.filter((d) => d !== today) } : h)));   // 바로 체크되어 보이게
    const { error } = await sb.rpc("set_goal_check", { p_goal: id, p_day: today, p_on: on });
    setError(error ? errorMessage(error) : "");
    await habits.reload();
  };
  const run = async (p: PromiseLike<{ error: unknown }>) => {
    const { error } = await p;
    setError(error ? errorMessage(error) : "");
    await planner.reload();
    return !error;
  };
  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(sb.from("todos").insert({ user_id: userId, body: body.trim(), due_date: today }))) setBody("");
  };
  const listDay = (t: Todo) => t.due_date ?? dateKey(new Date(t.created_at));
  const shown = planner.todos.filter((t) => !t.done || listDay(t) === today);
  const open = shown.filter((t) => !t.done);
  const done = shown.filter((t) => t.done);
  const toggle = (t: Todo) => { const next = !t.done; planner.setTodos((all) => all.map((x) => (x.id === t.id ? { ...x, done: next } : x))); void run(sb.from("todos").update({ done: next }).eq("id", t.id)); };
  const row = (t: Todo) => {
    const late = !t.done && listDay(t) < today;
    return (
      <li key={t.id} className="card flex items-center gap-2 p-2 text-sm" style={t.done ? { opacity: 0.6 } : undefined}>
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
          <input type="checkbox" className="h-5 w-5 shrink-0" aria-label={`${t.body} 완료`} checked={t.done} onChange={() => toggle(t)} />
          <span className={`min-w-0 flex-1 break-words ${t.done ? "line-through" : ""}`}>{t.body}</span>
        </label>
        {late && <span className="chip shrink-0 text-xs">어제부터</span>}
        <button type="button" className="btn btn-sm btn-danger shrink-0" aria-label={`${t.body} 삭제`} onClick={() => void run(sb.from("todos").delete().eq("id", t.id))}>삭제</button>
      </li>
    );
  };
  return (
    <div className="space-y-2 p-3">
      {habits.list.length > 0 && (
        <ul aria-label="공동 공부" className="space-y-1">
          {habits.list.map((h) => {
            const on = h.checked.includes(today), n = h.checked.length;
            if (h.upcoming) {
              const [, mm, dd] = h.start.split("-").map(Number);
              return (
                <li key={h.id} className="card p-2 text-sm" style={{ background: "#eef6ff", opacity: 0.75 }}>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-5 w-5 shrink-0" aria-label={`공동 공부: ${h.title} (${mm}월 ${dd}일부터)`} disabled />
                    <span className="min-w-0 flex-1 break-words">공동 공부: {h.title}</span>
                    <span className="chip shrink-0 text-xs">{mm}/{dd}부터</span>
                  </label>
                </li>
              );
            }
            return (
              <li key={h.id} className="card p-2 text-sm" style={{ background: "#eef6ff" }}>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" className="h-5 w-5 shrink-0" aria-label={`공동 공부: ${h.title} 완료`} checked={on} onChange={() => void toggleHabit(h.id, !on)} />
                  <span className={`min-w-0 flex-1 break-words ${on ? "line-through" : ""}`}>공동 공부: {h.title}</span>
                  <span className="chip shrink-0 text-xs">{n}/{h.need}일</span>
                </label>
                <div className="mt-1 h-1.5 w-full overflow-hidden border border-[#3a2a33] bg-white" aria-hidden><div className="h-full" style={{ width: `${Math.min(100, Math.round((n / h.need) * 100))}%`, background: n >= h.need ? "#6adf7a" : "#ffd23f" }} /></div>
              </li>
            );
          })}
        </ul>
      )}
      {shown.length > 0 && <p className="text-xs text-ink-soft" aria-live="polite">{done.length}/{shown.length} 완료{done.length === shown.length ? " 🎉" : ""}</p>}
      <form onSubmit={add} className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="td-body">오늘 할 일</label>
          <input id="td-body" className="input" maxLength={120} value={body} onChange={(e) => setBody(e.target.value)} placeholder="오늘 할 일을 적고 Enter" />
        </div>
        <button type="submit" className="btn btn-primary btn-sm mt-[5px] shrink-0" disabled={!body.trim()}>추가</button>
      </form>
      {error && <Notice kind="error">{error}</Notice>}
      {planner.loaded && shown.length === 0 && <p className="py-2 text-center text-sm text-ink-soft">오늘 체크할 일을 적어 보세요.</p>}
      <ul className="space-y-1">{open.map(row)}{done.map(row)}</ul>
    </div>
  );
}
