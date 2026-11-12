"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Achievement, Postit, WhiteboardComment, WhiteboardItem } from "@/lib/types";

/** 한 연구실(ownerId)의 화이트보드·포스트잇·책장을 불러오고 실시간으로 갱신한다. */
export function useRoom(ownerId: string, villageId: string, enabled = true) {
  const [items, setItems] = useState<WhiteboardItem[]>([]);
  const [comments, setComments] = useState<WhiteboardComment[]>([]);
  const [postits, setPostits] = useState<Postit[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    const sb = supabase();
    const [i, p, a] = await Promise.all([
      sb.from("whiteboard_items").select("*").eq("village_id", villageId).eq("owner_id", ownerId).order("created_at", { ascending: false }),
      sb.from("postits").select("*").eq("village_id", villageId).eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(60),
      sb.from("achievements").select("*").eq("village_id", villageId).eq("owner_id", ownerId).order("created_at", { ascending: false }),
    ]);
    if (i.error || p.error || a.error) return;
    const ids = (i.data ?? []).map((x) => x.id as string);
    const c = ids.length ? await sb.from("whiteboard_comments").select("*").in("item_id", ids).order("created_at") : { data: [], error: null };
    if (c.error) return;
    setItems(i.data as WhiteboardItem[]);
    setPostits(p.data as Postit[]);
    setAchievements(a.data as Achievement[]);
    setComments(c.data as WhiteboardComment[]);
    setLoaded(true);
  }, [ownerId, villageId, enabled]);

  useEffect(() => {
    if (!enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 방에 들어오면 한 번 불러온다
    void load();
    const sb = supabase();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const again = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void load(), 200);
    };
    const f = `village_id=eq.${villageId}`;
    const channel = sb
      .channel(`room:${villageId}:${ownerId}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "whiteboard_items", filter: f }, again)
      .on("postgres_changes", { event: "*", schema: "public", table: "whiteboard_comments", filter: f }, again)
      .on("postgres_changes", { event: "*", schema: "public", table: "postits", filter: f }, again)
      .on("postgres_changes", { event: "*", schema: "public", table: "achievements", filter: f }, again)
      .subscribe();
    const poll = setInterval(() => void load(), 45_000);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      void sb.removeChannel(channel);
    };
  }, [load, ownerId, villageId, enabled]);

  return { items, comments, postits, achievements, loaded, reload: load };
}
