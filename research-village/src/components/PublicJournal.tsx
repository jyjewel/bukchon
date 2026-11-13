"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { dateLabel } from "@/lib/time";

interface Shared { log_date: string; body: string; shared_villages: string[] }

/** 연구실 주인이 마을 주민에게 공개한 오늘의 일지. 화이트보드 칸에서 누구나(공개된 마을 주민) 읽을 수 있다. */
export default function PublicJournal({ ownerId, isOwner, name }: { ownerId: string; isOwner: boolean; name: string }) {
  const [list, setList] = useState<Shared[] | null>(null);
  const [all, setAll] = useState(false);
  useEffect(() => {
    let cancelled = false;
    supabase().from("daily_logs").select("log_date, body, shared_villages").eq("user_id", ownerId).neq("body", "").order("log_date", { ascending: false }).limit(120)
      .then(({ data }) => { if (!cancelled) setList(((data ?? []) as Shared[]).filter((l) => l.shared_villages.length > 0)); });
    return () => { cancelled = true; };
  }, [ownerId]);
  if (list === null) return null;
  const shown = all ? list : list.slice(0, 5);
  return (
    <section aria-label={`${isOwner ? "내가" : `${name}님이`} 공개한 일지`} className="space-y-2">
      <h3 className="label">{isOwner ? "내가 공개한 일지" : `${name}님의 공개 일지`}</h3>
      {list.length === 0 ? (
        <p className="px-box p-3 text-sm text-ink-soft" style={{ background: "#fdfdfb", ["--bd" as string]: "#8a8fa3" }}>
          {isOwner ? "오늘의 일지에서 ‘마을 주민에게 공개’를 누르면 여기에 보여요." : "아직 공개한 일지가 없어요."}
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((l, i) => (
            <li key={l.log_date}>
              <details open={i === 0} className="px-box p-2" style={{ background: "#fdfdfb", ["--bd" as string]: "#8a8fa3" }}>
                <summary className="cursor-pointer font-display text-sm">{l.log_date} {dateLabel(l.log_date).split(" ").pop()} <span className="font-body text-xs text-ink-soft">· {l.body.replace(/\s+/g, " ").slice(0, 28)}</span></summary>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{l.body}</p>
              </details>
            </li>
          ))}
        </ul>
      )}
      {list.length > 5 && <button type="button" className="btn btn-sm" onClick={() => setAll((a) => !a)}>{all ? "접기" : `더 보기 (${list.length - 5})`}</button>}
    </section>
  );
}
