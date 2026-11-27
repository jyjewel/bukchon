"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CONF_ROLES, roleLabel, type NameTag } from "@/lib/conference";
import { badgeGrid } from "@/pixel/badges";
import PixelArt from "./PixelArt";
import { Window } from "./ui";

const dayLabel = (d: string) => { const [y, m, day] = d.split("-").map(Number); return `${y}.${String(m).padStart(2, "0")}.${String(day).padStart(2, "0")}`; };

/** 학회 명찰: 참석한 학회마다 날짜와 학회 이름이 적힌 명찰과 역할 뱃지가 붙는다 */
export default function NameTags({ userId, mine = false, title }: { userId: string; mine?: boolean; title?: string }) {
  const [tags, setTags] = useState<NameTag[] | null>(null);
  const arts = useMemo(() => Object.fromEntries(CONF_ROLES.map((r) => [r.id, badgeGrid(r.id)])), []);
  useEffect(() => {
    let alive = true;
    supabase().from("conference_attendance").select("id, post_id, title, event_date, role, checked_at").eq("user_id", userId).order("event_date", { ascending: false }).limit(100)
      .then(({ data }) => { if (alive) setTags((data as NameTag[]) ?? []); });
    return () => { alive = false; };
  }, [userId]);
  if (tags === null) return title ? null : <p className="p-3 text-sm text-ink-soft">불러오는 중…</p>;
  if (tags.length === 0 && !mine) return null;   // 남의 연구실에서는 명찰이 있을 때만 보인다
  const body = (
    <section aria-label="학회 명찰" className="space-y-2 p-3">
      {mine && <p className="text-sm text-ink-soft">학회 현장에서 받은 참석 코드를 마을 게시판에 입력하면 그 학회의 명찰이 생겨요. 토론자는 은색, 발표자는 금색, 개최자는 자주색 뱃지가 달려요.</p>}
      {tags.length === 0 && <p className="text-center text-sm text-ink-soft">아직 받은 명찰이 없어요.</p>}
      <ul className="space-y-2">
        {tags.map((t) => (
          <li key={t.id} className="card flex items-center gap-3 px-3 py-2" style={{ background: "#fffdf6" }}>
            <span className="flex w-12 shrink-0 justify-center"><PixelArt art={arts[t.role]} scale={3} label={`${roleLabel(t.role)} 뱃지`} /></span>
            <span className="min-w-0 flex-1">
              <span className="block break-words font-display">{t.title}</span>
              <span className="text-xs text-ink-soft">{dayLabel(t.event_date)} · {roleLabel(t.role)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
  return title ? <Window title={title} tone="sky">{body}</Window> : body;
}
