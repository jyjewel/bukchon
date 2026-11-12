"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { NewsPost } from "@/lib/types";

/** 마을 광장 소식 (실시간) */
export function useNews(villageId: string, enabled: boolean) {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    const { data } = await supabase().from("news_posts").select("*").eq("village_id", villageId).order("created_at", { ascending: false }).limit(100);
    if (data) setPosts(data as NewsPost[]);
    setLoaded(true);
  }, [villageId]);

  useEffect(() => {
    if (!enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 광장을 열면 불러온다
    void load();
    const sb = supabase();
    const channel = sb
      .channel(`news:${villageId}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "news_posts", filter: `village_id=eq.${villageId}` }, () => void load())
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [enabled, load, villageId]);
  return { posts, loaded, reload: load };
}
