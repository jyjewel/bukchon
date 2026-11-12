"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { dateKey } from "@/lib/time";
import type { DailyLog } from "@/lib/types";

/** 오늘의 일지(나만 볼 수 있음). 날짜를 골라 지난 일지도 볼 수 있고, 입력을 멈추면 자동 저장한다. */
export function useJournal(userId: string) {
  const [date, setDateState] = useState(() => dateKey());
  const [body, setBody] = useState("");
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [recent, setRecent] = useState<DailyLog[]>([]);
  const dirty = useRef<{ date: string; body: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const loadRecent = useCallback(async () => {
    const { data } = await supabase().from("daily_logs").select("log_date, body, updated_at").eq("user_id", userId).neq("body", "").order("log_date", { ascending: false }).limit(30);
    if (data) setRecent(data as DailyLog[]);
  }, [userId]);

  const flush = useCallback(async () => {
    const d = dirty.current;
    if (!d) return;
    clearTimeout(timer.current);
    dirty.current = null;
    setState("saving");
    const { error } = await supabase().from("daily_logs").upsert({ user_id: userId, log_date: d.date, body: d.body });
    setState(error ? "error" : "saved");
    if (!error) void loadRecent();
  }, [userId, loadRecent]);

  useEffect(() => {
    let cancelled = false;
    supabase().from("daily_logs").select("body").eq("user_id", userId).eq("log_date", date).maybeSingle().then(({ data }) => {
      if (cancelled) return;
      setBody(data?.body ?? "");
      setLoadedDate(date);
      setState("idle");
    });
    return () => {
      cancelled = true;
    };
  }, [userId, date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 불러온다
    void loadRecent();
  }, [loadRecent]);

  const edit = useCallback(
    (text: string) => {
      setBody(text);
      setState("saving");
      dirty.current = { date, body: text };
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 800);
    },
    [date, flush],
  );
  const setDate = useCallback(
    async (d: string) => {
      await flush();
      setDateState(d);
    },
    [flush],
  );
  useEffect(() => () => {
    if (dirty.current) void flush();
  }, [flush]);

  return { date, setDate, body, edit, loaded: loadedDate === date, state, recent, flush, today: dateKey() };
}
