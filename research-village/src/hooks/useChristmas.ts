"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { kst } from "@/lib/christmas";

export interface XmasRow { year: number; kind: "eve" | "morning"; golden: boolean; snacks: string[]; stats: { logs?: number; notes?: number; diary?: number; goals?: number; wishes?: number } }

/** 내가 받은 크리스마스 선물(해마다 한 번). 받은 적이 있으면 산타 모자·루돌프·양말·리스를 고를 수 있다 */
export function useChristmas(userId: string) {
  const [rows, setRows] = useState<XmasRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    const { data, error } = await supabase().from("christmas_gifts").select("year, kind, golden, snacks, stats").eq("user_id", userId).order("year", { ascending: false });
    if (error) return;
    setRows((data ?? []) as XmasRow[]);
    setLoaded(true);
  }, [userId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 불러온다
    void load();
  }, [load]);
  const thisYear = rows.find((r) => r.year === kst().y) ?? null;
  const claim = async (): Promise<{ ok: true; row: XmasRow } | { ok: false; error: string }> => {
    const { data, error } = await supabase().rpc("claim_christmas");
    if (error) return { ok: false, error: error.message };
    await load();
    return { ok: true, row: data as XmasRow };
  };
  return { rows, loaded, thisYear, hasAny: rows.length > 0, golden: rows.some((r) => r.golden), claim, reload: load };
}
