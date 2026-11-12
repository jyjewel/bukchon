"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { DiaryEntry } from "@/lib/types";

/** 내가 볼 수 있는 다이어리(공개 범위는 DB의 RLS가 걸러 준다)를 최신순으로 불러온다. */
export function useDiary(villageId: string | null) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!villageId) return;
    const { data } = await supabase()
      .from("diary_entries")
      .select("*")
      .eq("village_id", villageId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setEntries(data as DiaryEntry[]);
    setLoaded(true);
  }, [villageId]);

  useEffect(() => {
    if (!villageId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 불러온다
    void reload();
    const sb = supabase();
    const channel = sb
      .channel(`diary:${villageId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "diary_entries" }, () => void reload())
      .subscribe();
    const poll = setInterval(() => void reload(), 60_000);
    return () => {
      clearInterval(poll);
      void sb.removeChannel(channel);
    };
  }, [villageId, reload]);

  return { entries, loaded, reload };
}
