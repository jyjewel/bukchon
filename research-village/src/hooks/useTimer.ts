"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { startOfMonth, startOfToday, startOfWeek } from "@/lib/time";
import type { StudySession } from "@/lib/types";

function seconds(s: StudySession, serverNow: number): number {
  return s.accumulated_seconds + (s.running_since ? Math.max(0, Math.floor((serverNow - new Date(s.running_since).getTime()) / 1000)) : 0);
}

/** 연구 타이머. 시작·정지 시각은 모두 서버(DB)가 기록하므로 새로고침하거나 다른 기기에서 열어도 이어진다. */
export function useTimer(userId: string | null, villageId: string | null, skew: number) {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!userId) return;
    const since = new Date(Math.min(startOfMonth().getTime(), startOfWeek().getTime())).toISOString();
    const { data } = await supabase()
      .from("study_sessions")
      .select("*")
      .eq("user_id", userId)
      .or(`started_at.gte.${since},ended_at.is.null`)
      .order("started_at", { ascending: false });
    if (data) setSessions(data as StudySession[]);
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 기록을 처음 불러온다
    void load();
  }, [load, villageId]);

  const active = sessions.find((s) => !s.ended_at) ?? null;
  const running = Boolean(active?.running_since);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  const call = useCallback(
    async (fn: "timer_start" | "timer_pause" | "timer_resume" | "timer_stop", args?: Record<string, unknown>) => {
      setBusy(true);
      const { error } = await supabase().rpc(fn, args);
      await load();
      setNow(Date.now());
      setBusy(false);
      return error;
    },
    [load],
  );

  const stats = useMemo(() => {
    const serverNow = now + skew;
    const today = startOfToday().getTime();
    const week = startOfWeek().getTime();
    const month = startOfMonth().getTime();
    const out = { today: 0, week: 0, month: 0, bySubject: [] as { subject: string; seconds: number }[] };
    const subjects = new Map<string, number>();
    for (const s of sessions) {
      const sec = seconds(s, serverNow);
      const t = new Date(s.started_at).getTime();
      if (t >= today) out.today += sec;
      if (t >= week) out.week += sec;
      if (t >= month) {
        out.month += sec;
        const key = s.subject || "분류 없음";
        subjects.set(key, (subjects.get(key) ?? 0) + sec);
      }
    }
    out.bySubject = [...subjects.entries()].map(([subject, sec]) => ({ subject, seconds: sec })).sort((a, b) => b.seconds - a.seconds);
    return out;
  }, [sessions, now, skew]);

  return {
    active,
    running,
    busy,
    elapsed: active ? seconds(active, now + skew) : 0,
    stats,
    reload: load,
    start: (subject: string) => call("timer_start", { p_village: villageId, p_subject: subject }),
    pause: () => call("timer_pause"),
    resume: () => call("timer_resume"),
    stop: () => call("timer_stop"),
  };
}
