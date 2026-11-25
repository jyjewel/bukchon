"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { stopPoll, visibleInterval } from "@/lib/poll";

export interface Desk { user_id: string; running: boolean; since: string | null; seconds: number }

/** 도서관 독서실: 마을 주민 모두의 모래시계(돌고 있는지, 오늘 앉은 시간). 20초마다 새로 읽고, 내가 돌리면 바로 읽는다. */
export function useLibraryDesk(villageId: string) {
  const [desks, setDesks] = useState<Desk[]>([]);
  const [loaded, setLoaded] = useState(false);
  const fetchedAt = useRef(Date.now());
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await supabase().rpc("library_desks", { p_village: villageId });
    if (error) { setError(error.message); return; }
    fetchedAt.current = Date.now();
    setDesks((data ?? []) as Desk[]);
    setLoaded(true);
    setError("");
  }, [villageId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 불러온다
    void load();
    const id = visibleInterval(() => void load(), 20000);
    return () => stopPoll(id);
  }, [load]);
  const turn = useCallback(async (): Promise<boolean> => {
    const { error } = await supabase().rpc("desk_turn", { p_village: villageId });
    if (error) { setError(error.message); return false; }
    await load();
    return true;
  }, [villageId, load]);
  /** 화면에 보일 앉은 시간(초): 불러온 값에 그 뒤 흐른 시간을 더한다 */
  const secondsOf = (d: Desk | undefined, now = Date.now()) => (d ? d.seconds + (d.running ? Math.max(0, Math.floor((now - fetchedAt.current) / 1000)) : 0) : 0);
  return { desks, loaded, error, turn, reload: load, secondsOf };
}
export const clockHM = (sec: number) => { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return `${h}:${String(m).padStart(2, "0")}`; };
