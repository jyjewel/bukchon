"use client";
import { stopPoll, visibleInterval } from "@/lib/poll";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface MonumentRow { target_user: string; broken_at: string | null }

/** 마을의 비석 이벤트. 비석이 없으면 row 가 null 이다 */
export function useMonument(villageId: string) {
  const [row, setRow] = useState<MonumentRow | null>(null);
  const [round, setRound] = useState(0);
  useEffect(() => {
    const sb = supabase();
    let alive = true;
    const load = () => sb.from("monuments").select("target_user, broken_at").eq("village_id", villageId).maybeSingle().then(({ data }) => { if (alive) setRow((data as MonumentRow | null) ?? null); });
    void load();
    const channel = sb.channel(`monument:${villageId}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "monuments" }, () => void load())
      .subscribe();
    const poll = visibleInterval(() => void load(), 60_000);
    return () => { alive = false; stopPoll(poll); void sb.removeChannel(channel); };
  }, [villageId, round]);
  /** 비석을 부순다. 바로 사라지는 모습을 보이도록 먼저 바꾸고 서버에 알린다 */
  const breakIt = useCallback(async () => {
    setRow((r) => (r ? { ...r, broken_at: new Date().toISOString() } : r));
    await supabase().rpc("break_monument", { p_village: villageId });
    setRound((n) => n + 1);
  }, [villageId]);
  return { row, breakIt };
}
