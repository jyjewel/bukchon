"use client";
import { stopPoll, visibleInterval } from "@/lib/poll";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface GoalMember { user_id: string; done_at: string | null }
export interface StudyGoal {
  id: string; village_id: string; created_by: string; title: string; note: string; created_at: string; completed_at: string | null;
  kind: "once" | "habit"; start_date: string | null; end_date: string | null; per_week: number | null; missed_at: string | null;
  members: GoalMember[];
  /** 기간형: 구성원별 체크한 날짜 */
  checks: Record<string, string[]>;
}

/** 기간형 목표의 달성 기준: 기간 일수 × 주 N일 ÷ 7 (올림) */
export function needDays(start: string, end: string, perWeek: number): number {
  const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400_000) + 1;
  return Math.ceil((days * perWeek) / 7);
}

/** 도서관의 공동 공부 목표 (실시간) */
export function useStudyGoals(villageId: string) {
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    const sb = supabase();
    const cols = "id, village_id, created_by, title, note, created_at, completed_at, kind, start_date, end_date, per_week, missed_at";
    const [a, d, m, c] = await Promise.all([
      sb.from("study_goals").select(cols).eq("village_id", villageId).is("completed_at", null).order("created_at", { ascending: false }).limit(40),
      sb.from("study_goals").select(cols).eq("village_id", villageId).not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(500),   // 기념 주화는 전부 남는다
      sb.from("study_goal_members").select("goal_id, user_id, done_at"),
      sb.from("study_goal_checks").select("goal_id, user_id, day").limit(3000),
    ]);
    if (a.error || d.error || m.error || c.error) return;
    const byGoal = new Map<string, GoalMember[]>();
    for (const r of m.data as { goal_id: string; user_id: string; done_at: string | null }[]) byGoal.set(r.goal_id, [...(byGoal.get(r.goal_id) ?? []), { user_id: r.user_id, done_at: r.done_at }]);
    const checks = new Map<string, Record<string, string[]>>();
    for (const r of c.data as { goal_id: string; user_id: string; day: string }[]) {
      const g = checks.get(r.goal_id) ?? {};
      (g[r.user_id] ??= []).push(r.day);
      checks.set(r.goal_id, g);
    }
    const all = [...(a.data ?? []), ...(d.data ?? [])] as Omit<StudyGoal, "members" | "checks">[];
    setGoals(all.map((x) => ({ ...x, members: byGoal.get(x.id) ?? [], checks: checks.get(x.id) ?? {} })));
    setLoaded(true);
  }, [villageId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 불러온다
    void load();
    const sb = supabase();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const again = () => { clearTimeout(timer); timer = setTimeout(() => void load(), 200); };
    const channel = sb.channel(`goals:${villageId}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "study_goals" }, again)
      .on("postgres_changes", { event: "*", schema: "public", table: "study_goal_members" }, again)
      .on("postgres_changes", { event: "*", schema: "public", table: "study_goal_checks" }, again)
      .subscribe();
    const poll = visibleInterval(() => void load(), 30_000);
    return () => { clearTimeout(timer); stopPoll(poll); void sb.removeChannel(channel); };
  }, [load, villageId]);
  return { goals, loaded, reload: load };
}

export interface HabitToday { id: string; title: string; village_id: string; start: string; end: string; perWeek: number; checked: string[]; need: number; upcoming: boolean }

/** 오늘의 체크리스트에 올라오는, 내가 참여 중인 기간형 목표들(모든 마을) */
export function useMyHabits(userId: string, today: string) {
  const [list, setList] = useState<HabitToday[]>([]);
  const load = useCallback(async () => {
    const sb = supabase();
    const mine = await sb.from("study_goal_members").select("goal_id").eq("user_id", userId);
    const ids = (mine.data ?? []).map((r) => r.goal_id as string);
    if (ids.length === 0) { setList([]); return; }
    const [g, c] = await Promise.all([
      sb.from("study_goals").select("id, title, village_id, start_date, end_date, per_week").in("id", ids).eq("kind", "habit").is("completed_at", null).is("missed_at", null),
      sb.from("study_goal_checks").select("goal_id, day").eq("user_id", userId).in("goal_id", ids),
    ]);
    if (g.error || c.error) return;
    const days = new Map<string, string[]>();
    for (const r of c.data as { goal_id: string; day: string }[]) days.set(r.goal_id, [...(days.get(r.goal_id) ?? []), r.day]);
    setList((g.data as { id: string; title: string; village_id: string; start_date: string; end_date: string; per_week: number }[])
      .filter((x) => today <= x.end_date)   // 아직 시작 전인 목표도 "○/○부터"로 미리 보인다
      .map((x) => ({ id: x.id, title: x.title, village_id: x.village_id, start: x.start_date, end: x.end_date, perWeek: x.per_week, checked: days.get(x.id) ?? [], need: needDays(x.start_date, x.end_date, x.per_week), upcoming: x.start_date > today })));
  }, [userId, today]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 불러온다
    void load();
    const t = visibleInterval(() => void load(), 60_000);
    return () => stopPoll(t);
  }, [load]);
  return { list, reload: load, setList };
}
