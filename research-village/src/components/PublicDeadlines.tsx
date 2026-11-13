"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysUntil, ddayLabel } from "@/lib/time";
import { useToday } from "@/hooks/usePlanner";

interface Dl { id: string; title: string; due_date: string }
interface Cheer { deadline_id: string; from_user: string }

/** 이웃이 공개한 임박한 마감. 응원(파이팅)을 눌러 줄 수 있다. */
export default function PublicDeadlines({ ownerId, name }: { ownerId: string; name: string }) {
  const today = useToday();
  const [list, setList] = useState<Dl[]>([]);
  const [cheers, setCheers] = useState<Cheer[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const load = useCallback(async () => {
    const sb = supabase();
    const [d, u] = await Promise.all([
      sb.from("deadlines").select("id, title, due_date").eq("user_id", ownerId).eq("shared", true).eq("done", false).order("due_date").limit(10),
      sb.auth.getUser(),
    ]);
    setMe(u.data.user?.id ?? null);
    const ds = (d.data ?? []) as Dl[];
    setList(ds);
    if (ds.length) {
      const c = await sb.from("cheers").select("deadline_id, from_user").in("deadline_id", ds.map((x) => x.id));
      setCheers((c.data ?? []) as Cheer[]);
    } else setCheers([]);
  }, [ownerId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 열 때 한 번 불러온다
    void load();
  }, [load]);
  const upcoming = list.filter((d) => daysUntil(d.due_date, today) >= 0 && daysUntil(d.due_date, today) <= 30);
  if (upcoming.length === 0) return null;
  return (
    <section aria-label={`${name}님의 공개 마감`} className="space-y-1">
      <h3 className="label">{name}님의 임박한 마감 <span className="text-ink-soft">(공개)</span></h3>
      <ul className="space-y-1">
        {upcoming.map((d) => {
          const n = daysUntil(d.due_date, today);
          const mine = cheers.some((c) => c.deadline_id === d.id && c.from_user === me);
          const count = cheers.filter((c) => c.deadline_id === d.id).length;
          return (
            <li key={d.id} className="card flex items-center gap-2 p-2 text-sm">
              <span className="chip font-display" style={{ background: n <= 3 ? "#ff9a8a" : n <= 7 ? "#ffe58a" : "#cfe4f6" }}>{ddayLabel(n)}</span>
              <span className="min-w-0 flex-1 break-words">{d.title}</span>
              <button type="button" className={`btn btn-sm ${mine ? "" : "btn-mint"}`} disabled={mine}
                onClick={async () => { await supabase().rpc("cheer_deadline", { p_deadline: d.id }); await load(); }}>
                {mine ? "응원했어요" : "파이팅!"}{count > 0 ? ` ${count}` : ""}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
