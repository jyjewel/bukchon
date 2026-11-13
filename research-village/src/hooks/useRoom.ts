"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Achievement, BookTip, Gift, Postit, WhiteboardComment, WhiteboardItem } from "@/lib/types";

/** 한 연구실(ownerId)의 화이트보드·포스트잇·책장을 불러오고 실시간으로 갱신한다. */
export function useRoom(ownerId: string, enabled = true) {
  const [items, setItems] = useState<WhiteboardItem[]>([]);
  const [comments, setComments] = useState<WhiteboardComment[]>([]);
  const [postits, setPostits] = useState<Postit[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [tips, setTips] = useState<BookTip[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    const sb = supabase();
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const [i, p, a, gf, bt] = await Promise.all([
      sb.from("whiteboard_items").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false }),
      sb.from("postits").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(60),
      sb.from("achievements").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false }),
      sb.from("gifts").select("*").eq("to_user", ownerId).gt("created_at", since).order("created_at", { ascending: false }).limit(12),
      sb.from("book_tips").select("*").eq("to_user", ownerId).order("created_at", { ascending: false }).limit(60),
    ]);
    if (i.error || p.error || a.error || gf.error || bt.error) return;
    const ids = (i.data ?? []).map((x) => x.id as string);
    const c = ids.length ? await sb.from("whiteboard_comments").select("*").in("item_id", ids).order("created_at") : { data: [], error: null };
    if (c.error) return;
    setItems(i.data as WhiteboardItem[]);
    setPostits(p.data as Postit[]);
    setAchievements(a.data as Achievement[]);
    setGifts(gf.data as Gift[]);
    setTips(bt.data as BookTip[]);
    setComments(c.data as WhiteboardComment[]);
    setLoaded(true);
  }, [ownerId, enabled]);

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
    const channel = sb
      .channel(`room:${ownerId}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "whiteboard_items" }, again)
      .on("postgres_changes", { event: "*", schema: "public", table: "whiteboard_comments" }, again)
      .on("postgres_changes", { event: "*", schema: "public", table: "postits" }, again)
      .on("postgres_changes", { event: "*", schema: "public", table: "achievements" }, again)
      .on("postgres_changes", { event: "*", schema: "public", table: "gifts" }, again)
      .on("postgres_changes", { event: "*", schema: "public", table: "book_tips" }, again)
      .subscribe();
    const poll = setInterval(() => void load(), 45_000);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      void sb.removeChannel(channel);
    };
  }, [load, ownerId, enabled]);

  return { items, comments, postits, achievements, gifts, tips, loaded, reload: load };
}
