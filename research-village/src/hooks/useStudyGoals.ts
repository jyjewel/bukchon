"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface GoalMember { user_id: string; done_at: string | null }
export interface StudyGoal { id: string; village_id: string; created_by: string; title: string; note: string; created_at: string; completed_at: string | null; members: GoalMember[] }

/** 도서관의 공동 공부 목표 (실시간) */
export function useStudyGoals(villageId: string) {
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    const sb = supabase();
    const [g, m] = await Promise.all([
      sb.from("study_goals").select("id, village_id, created_by, title, note, created_at, completed_at").eq("village_id", villageId).order("created_at", { ascending: false }).limit(40),
      sb.from("study_goal_members").select("goal_id, user_id, done_at"),
    ]);
    if (g.error || m.error) return;
    const byGoal = new Map<string, GoalMember[]>();
    for (const r of m.data as { goal_id: string; user_id: string; done_at: string | null }[]) byGoal.set(r.goal_id, [...(byGoal.get(r.goal_id) ?? []), { user_id: r.user_id, done_at: r.done_at }]);
    setGoals((g.data as Omit<StudyGoal, "members">[]).map((x) => ({ ...x, members: byGoal.get(x.id) ?? [] })));
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
      .subscribe();
    const poll = setInterval(() => void load(), 30_000);
    return () => { clearTimeout(timer); clearInterval(poll); void sb.removeChannel(channel); };
  }, [load, villageId]);
  return { goals, loaded, reload: load };
}
