"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { dateKey } from "@/lib/time";

export interface Deadline { id: string; title: string; due_date: string; done: boolean; shared: boolean; created_at: string }
export interface MyCheer { deadline_id: string; from_user: string }
export interface Todo { id: string; body: string; due_date: string | null; done: boolean; created_at: string }

/** 오늘 날짜(YYYY-MM-DD). 자정이 지나면 D-day 가 바뀌도록 1분마다 다시 확인한다. */
export function useToday(): string {
  const [today, setToday] = useState(() => dateKey());
  useEffect(() => {
    const t = setInterval(() => setToday(dateKey()), 60_000);
    return () => clearInterval(t);
  }, []);
  return today;
}

/** 내 마감 일정과 할 일 (본인만 읽을 수 있다) */
export function usePlanner(userId: string) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [cheers, setCheers] = useState<MyCheer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    const sb = supabase();
    const [d, t, c] = await Promise.all([
      sb.from("deadlines").select("id, title, due_date, done, shared, created_at").eq("user_id", userId).order("due_date").order("created_at"),
      sb.from("todos").select("id, body, due_date, done, created_at").eq("user_id", userId).order("created_at"),
      sb.from("cheers").select("deadline_id, from_user").eq("to_user", userId),
    ]);
    if (d.error || t.error) return;
    setDeadlines(d.data as Deadline[]);
    setTodos(t.data as Todo[]);
    setCheers((c.data ?? []) as MyCheer[]);
    setLoaded(true);
  }, [userId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 불러온다
    void load();
  }, [load]);
  return { deadlines, todos, cheers, loaded, reload: load, setDeadlines, setTodos };
}
