"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ResearchNote } from "@/lib/types";

/** 카테고리별 연구노트(나만 볼 수 있음) */
export function useResearchNotes(userId: string) {
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase().from("research_notes").select("id, rev, category, title, body, created_at, updated_at").eq("user_id", userId).order("updated_at", { ascending: false });
    if (data) setNotes(data as ResearchNote[]);
    setLoaded(true);
  }, [userId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 불러온다
    void load();
  }, [load]);

  const categories = [...new Set(notes.map((n) => n.category))].sort((a, b) => a.localeCompare(b, "ko"));
  return { notes, loaded, categories, reload: load };
}
