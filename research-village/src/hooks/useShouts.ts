"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Shout } from "@/lib/types";

/** 광장 전체 채팅방(외침). 최근 50개를 오래된 순으로 돌려주고 실시간으로 갱신한다. */
export function useShouts(villageId: string) {
  const [shouts, setShouts] = useState<Shout[]>([]);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    const { data } = await supabase().from("shouts").select("*").eq("village_id", villageId).order("created_at", { ascending: false }).limit(50);
    if (data) setShouts((data as Shout[]).reverse());
    setLoaded(true);
  }, [villageId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 불러온다
    void load();
    const sb = supabase();
    const channel = sb
      .channel(`shouts:${villageId}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shouts" }, () => void load())
      .subscribe();
    const poll = setInterval(() => void load(), 60_000);
    return () => {
      clearInterval(poll);
      void sb.removeChannel(channel);
    };
  }, [load, villageId]);
  return { shouts, loaded, reload: load };
}
