"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { NameTag } from "@/lib/conference";

/** 한 사람이 받은 학회 뱃지(명찰)들. 최근 학회부터 */
export function useNameTags(userId: string) {
  const [tags, setTags] = useState<NameTag[] | null>(null);
  useEffect(() => {
    let alive = true;
    supabase().from("conference_attendance").select("id, conference_id, title, event_date, role, talk_title, checked_at").eq("user_id", userId).order("event_date", { ascending: false }).limit(100)
      .then(({ data }) => { if (alive) setTags((data as NameTag[]) ?? []); });
    return () => { alive = false; };
  }, [userId]);
  return tags;
}
