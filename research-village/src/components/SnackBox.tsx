"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { giftOf } from "@/lib/social";
import { relativeTime } from "@/lib/time";
import { snackGrid, type SnackId } from "@/pixel/snacks";
import { tteokGrid, type TteokId } from "@/pixel/tteok";
import type { Resident } from "@/lib/types";
import PixelArt from "./PixelArt";

const SNACKS = ["mochi", "yakgwa", "tangerine", "apple", "minishell", "haribo"];
const TTEOKS = ["siru", "rainbow", "songpyeon"];
const KEEP_MS = 3 * 86400_000;
interface Row { id: string; kind: string; from_user: string; note: string; created_at: string }

/** 간식 상자: 이웃이 건네 준 커피·간식을 모두 모아 보여 준다(책상 위에는 하루만 올라가지만 여기엔 남는다) */
export default function SnackBox({ residents, myId }: { residents: Resident[]; myId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const arts = useMemo(() => ({ ...Object.fromEntries(SNACKS.map((k) => [k, snackGrid(k as SnackId)])), ...Object.fromEntries(TTEOKS.map((k) => [k, tteokGrid(k as TteokId)])) }), []);
  const [now] = useState(() => Date.now());
  useEffect(() => {
    let alive = true;
    supabase().from("gifts").select("id, kind, from_user, note, created_at").eq("to_user", myId).gt("created_at", new Date(Date.now() - 3 * 86400_000).toISOString()).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => { if (alive) setRows(((data as Row[]) ?? []).filter((r) => now - new Date(r.created_at).getTime() < KEEP_MS)); });
    return () => { alive = false; };
  }, [myId, now]);
  const who = (id: string) => residents.find((r) => r.user_id === id)?.profile.display_name ?? "이웃마을 주민";
  const counts = new Map<string, number>();
  rows?.forEach((r) => counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1));
  const icon = (kind: string) => SNACKS.includes(kind) || TTEOKS.includes(kind) ? <PixelArt art={arts[kind]} scale={2} label={`${giftOf(kind)?.label ?? "간식"} 도트 그림`} /> : <span aria-hidden className="text-2xl">{giftOf(kind)?.icon ?? "🎁"}</span>;
  return (
    <section aria-label="간식 상자">
      <div className="space-y-3 p-3">
        <p className="text-sm text-ink-soft">이웃이 건네 준 커피와 간식이 여기 모여요. 받은 지 3일이 지나면 저절로 사라져요. 보낸 사람과 한마디는 나에게만 보여요.</p>
        {rows === null && <p className="text-sm text-ink-soft">상자를 여는 중…</p>}
        {rows?.length === 0 && <p className="text-center text-sm text-ink-soft">아직 받은 간식이 없어요.</p>}
        {rows && rows.length > 0 && (
          <>
            <ul aria-label="받은 간식 개수" className="flex flex-wrap gap-1.5">
              {[...counts].map(([k, n]) => <li key={k} className="chip" style={{ background: "#fff3c4" }}>{giftOf(k)?.label ?? "선물"} × {n}</li>)}
            </ul>
            <ul aria-label="받은 간식 목록" className="space-y-1.5">
              {rows.map((r) => (
                <li key={r.id} className="card flex items-center gap-3 px-3 py-1.5">
                  <span className="flex w-16 shrink-0 justify-center">{icon(r.kind)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display">{giftOf(r.kind)?.label ?? "선물"}</span>
                    <span className="block break-words text-sm">{who(r.from_user)}님{r.note ? <>: “{r.note}”</> : ""}</span>
                  </span>
                  <span className="shrink-0 text-xs text-ink-soft">{relativeTime(r.created_at)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
