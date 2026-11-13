"use client";
import { useState, type FormEvent } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import { daysUntil, ddayLabel } from "@/lib/time";
import { useToday, type usePlanner } from "@/hooks/usePlanner";
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
export function DeadlinePanel({ planner, userId }: { planner: Planner; userId: string }) {
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
      <li key={d.id} className="card flex items-center gap-2 p-2 text-sm" style={d.done ? { opacity: 0.6 } : undefined}>
        <Dday days={n} done={d.done} />
        <span className="min-w-0 flex-1">
          <span className={`block break-words ${d.done ? "line-through" : ""}`}>{d.title}</span>
          <span className="text-xs text-ink-soft">{dateText(d.due_date)}</span>
        </span>
        <label className="flex shrink-0 items-center gap-1 text-xs">
          <input type="checkbox" checked={d.done} onChange={(e) => { const done = e.target.checked; planner.setDeadlines((all) => all.map((x) => (x.id === d.id ? { ...x, done } : x))); void run(sb.from("deadlines").update({ done }).eq("id", d.id)); }} /> 완료
        </label>
        <button type="button" className="btn btn-sm btn-danger shrink-0" aria-label={`${d.title} 삭제`} onClick={() => void run(sb.from("deadlines").delete().eq("id", d.id))}>삭제</button>
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
        <div className="min-w-36 flex-1">
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

/** 할 일: 여러 개를 적고 체크한다. 날짜를 넣으면 D-day 도 함께 뜬다. */
export function TodoPanel({ planner, userId }: { planner: Planner; userId: string }) {
  const today = useToday();
  const [body, setBody] = useState("");
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
    if (await run(sb.from("todos").insert({ user_id: userId, body: body.trim(), due_date: due || null }))) { setBody(""); setDue(""); }
  };
  const open = planner.todos.filter((t) => !t.done);
  const done = planner.todos.filter((t) => t.done);
  const row = (t: (typeof planner.todos)[number]) => (
    <li key={t.id} className="card flex items-center gap-2 p-2 text-sm" style={t.done ? { opacity: 0.6 } : undefined}>
      <input type="checkbox" aria-label={`${t.body} 완료`} checked={t.done} onChange={(e) => { const done = e.target.checked; planner.setTodos((all) => all.map((x) => (x.id === t.id ? { ...x, done } : x))); void run(sb.from("todos").update({ done }).eq("id", t.id)); }} />
      <span className={`min-w-0 flex-1 break-words ${t.done ? "line-through" : ""}`}>{t.body}</span>
      {t.due_date && <Dday days={daysUntil(t.due_date, today)} done={t.done} />}
      <button type="button" className="btn btn-sm btn-danger shrink-0" aria-label={`${t.body} 삭제`} onClick={() => void run(sb.from("todos").delete().eq("id", t.id))}>삭제</button>
    </li>
  );
  return (
    <div className="space-y-2 p-3">
      <form onSubmit={add} className="flex flex-wrap items-start gap-1">
        <div className="min-w-40 flex-[2]">
          <label className="sr-only" htmlFor="td-body">할 일</label>
          <input id="td-body" className="input" maxLength={120} value={body} onChange={(e) => setBody(e.target.value)} placeholder="할 일을 적고 Enter" />
        </div>
        <div className="min-w-36 flex-1">
          <label className="sr-only" htmlFor="td-date">할 일 날짜 (선택)</label>
          <input id="td-date" type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary btn-sm mt-[5px] shrink-0" disabled={!body.trim()}>추가</button>
      </form>
      {error && <Notice kind="error">{error}</Notice>}
      {planner.loaded && planner.todos.length === 0 && <p className="py-2 text-center text-sm text-ink-soft">적어 둔 할 일이 없어요.</p>}
      <ul className="space-y-1">{open.map(row)}{done.map(row)}</ul>
    </div>
  );
}
