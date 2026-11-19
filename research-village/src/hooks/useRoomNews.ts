"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { stopPoll, visibleInterval } from "@/lib/poll";

/** 새 글이 올라온 이웃(마을 지도에서 집 지붕에 새가 앉는 사람). 그 연구실을 보고 나오면 날아간다. */
export function useRoomNews(villageId: string) {
  const [owners, setOwners] = useState<Set<string>>(new Set());
  const gen = useRef(0);                                   // 연구실을 본 뒤에는, 그 전에 출발한 오래된 응답을 버린다
  const reload = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const g = gen.current;
      const { data } = await supabase().rpc("rooms_with_news", { p_village: villageId });
      if (alive && g === gen.current && Array.isArray(data)) setOwners(new Set(data as string[]));
    };
    reload.current = load;
    void load();
    const id = visibleInterval(() => void load(), 60000);
    return () => { alive = false; stopPoll(id); };
  }, [villageId]);
  const markSeen = useCallback((ownerId: string) => {
    gen.current += 1;
    setOwners((s) => { if (!s.has(ownerId)) return s; const n = new Set(s); n.delete(ownerId); return n; });
    void Promise.resolve(supabase().rpc("mark_room_seen", { p_owner: ownerId })).then(() => reload.current());
  }, []);
  return { owners, markSeen };
}
