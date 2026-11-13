"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { DiaryEntry } from "@/lib/types";

/** 내가 볼 수 있는 다이어리(본인 글만 RLS 로 돌려받는다)를 최신순으로 불러온다. */
export function useDiary() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const { data } = await supabase()
      .from("diary_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setEntries(data as DiaryEntry[]);
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 불러온다
    void reload();
    const sb = supabase();
    const channel = sb
      .channel(`diary:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "diary_entries" }, () => void reload())
      .subscribe();
    const poll = setInterval(() => void reload(), 60_000);
    return () => {
      clearInterval(poll);
      void sb.removeChannel(channel);
    };
  }, [reload]);

  return { entries, loaded, reload };
}
