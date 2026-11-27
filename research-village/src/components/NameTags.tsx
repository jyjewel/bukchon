"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { roleLabel, type NameTag } from "@/lib/conference";
import { Window } from "./ui";

/** 명찰 색: 참석자 흰색 · 토론자 은색 · 발표자 금색 · 게시자 자주색 (플라스틱 명찰 판 자체의 색) */
const PLATE: Record<string, { bg: string; edge: string; ink: string; sub: string }> = {
  attendee: { bg: "linear-gradient(135deg, #ffffff 0%, #eef0f4 55%, #ffffff 100%)", edge: "#b8bec9", ink: "#3a2a33", sub: "#6a6f7d" },
  discussant: { bg: "linear-gradient(135deg, #eef1f6 0%, #b9c0cc 50%, #e6e9ef 100%)", edge: "#8a91a1", ink: "#2b2f3a", sub: "#4d5361" },
  presenter: { bg: "linear-gradient(135deg, #fff1a8 0%, #f2c744 50%, #ffe27a 100%)", edge: "#c8921c", ink: "#4a3205", sub: "#7a5510" },
  host: { bg: "linear-gradient(135deg, #d8b4f5 0%, #a86fd6 50%, #c99ef0 100%)", edge: "#7a42a8", ink: "#ffffff", sub: "#f1e3ff" },
};
const dayLabel = (d: string) => { const [y, m, day] = d.split("-").map(Number); return `${y}.${String(m).padStart(2, "0")}.${String(day).padStart(2, "0")}`; };

/** 학회 명찰: 참석한 학회마다 날짜와 학회 이름이 적힌 명찰과 역할 뱃지가 붙는다 */
export default function NameTags({ userId, name, mine = false, title }: { userId: string; name: string; mine?: boolean; title?: string }) {
  const [tags, setTags] = useState<NameTag[] | null>(null);
  useEffect(() => {
    let alive = true;
    supabase().from("conference_attendance").select("id, conference_id, title, event_date, role, checked_at").eq("user_id", userId).order("event_date", { ascending: false }).limit(100)
      .then(({ data }) => { if (alive) setTags((data as NameTag[]) ?? []); });
    return () => { alive = false; };
  }, [userId]);
  if (tags === null) return title ? null : <p className="p-3 text-sm text-ink-soft">불러오는 중…</p>;
  if (tags.length === 0 && !mine) return null;   // 남의 연구실에서는 명찰이 있을 때만 보인다
  const body = (
    <section aria-label="학회 명찰" className="space-y-2 p-3">
      {mine && <p className="text-sm text-ink-soft">학회 현장에서 들은 참석 암호를 마을 게시판에 입력하면 그 학회의 명찰이 생겨요. 참석자는 흰색, 토론자는 은색, 발표자는 금색, 게시자는 자주색 뱃지가 달려요.</p>}
      {tags.length === 0 && <p className="text-center text-sm text-ink-soft">아직 받은 명찰이 없어요.</p>}
      <ul className="space-y-3">
        {tags.map((t) => {
          const c = PLATE[t.role] ?? PLATE.attendee;
          return (
            <li key={t.id} className="relative overflow-hidden rounded-lg border px-4 pb-2 pt-4 shadow-[0_2px_0_rgba(58,42,51,0.3)]" style={{ background: c.bg, borderColor: c.edge }}>
              <span aria-hidden className="absolute left-1/2 top-1.5 h-2 w-10 -translate-x-1/2 rounded-full border" style={{ borderColor: c.edge, background: "rgba(0,0,0,0.12)" }} />
              <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0))" }} />
              <div className="relative text-center">
                <span className="block truncate font-display text-2xl font-bold leading-tight" style={{ color: c.ink }}>{name}</span>
                <span className="block break-words text-xs" style={{ color: c.sub }}>{t.title}</span>
                <span className="text-[11px]" style={{ color: c.sub }}>{dayLabel(t.event_date)} · {roleLabel(t.role)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
  return title ? <Window title={title} tone="sky">{body}</Window> : body;
}
