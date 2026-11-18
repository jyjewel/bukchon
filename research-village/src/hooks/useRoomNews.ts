"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { stopPoll, visibleInterval } from "@/lib/poll";

/** 새 글이 올라온 이웃(마을 지도에서 집이 반짝이는 사람). 그 연구실을 보고 나오면 꺼진다. */
export function useRoomNews(villageId: string) {
  const [owners, setOwners] = useState<Set<string>>(new Set());
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase().rpc("rooms_with_news", { p_village: villageId });
      if (alive && Array.isArray(data)) setOwners(new Set(data as string[]));
    };
    void load();
    const id = visibleInterval(() => void load(), 60000);
    return () => { alive = false; stopPoll(id); };
  }, [villageId]);
  const markSeen = useCallback((ownerId: string) => {
    setOwners((s) => { if (!s.has(ownerId)) return s; const n = new Set(s); n.delete(ownerId); return n; });
    void supabase().from("room_seen").upsert({ owner_id: ownerId, seen_at: new Date().toISOString() }, { onConflict: "viewer_id,owner_id" });
  }, []);
  return { owners, markSeen };
}
