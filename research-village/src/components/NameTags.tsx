"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CONF_ROLES, roleLabel, type NameTag } from "@/lib/conference";
import { badgeGrid } from "@/pixel/badges";
import PixelArt from "./PixelArt";
import PixelNameTag from "./PixelNameTag";
import { Modal, Window } from "./ui";

const dayLabel = (d: string) => { const [y, m, day] = d.split("-").map(Number); return `${y}.${String(m).padStart(2, "0")}.${String(day).padStart(2, "0")}`; };

/** 학회 명찰: 참석한 학회마다 날짜와 학회 이름이 적힌 명찰과 역할 뱃지가 붙는다 */
export default function NameTags({ userId, name, mine = false, title }: { userId: string; name: string; mine?: boolean; title?: string }) {
  const [tags, setTags] = useState<NameTag[] | null>(null);
  const [open, setOpen] = useState<NameTag | null>(null);
  const arts = useMemo(() => Object.fromEntries(CONF_ROLES.map((r) => [r.id, badgeGrid(r.id)])), []);
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
      {mine && <p className="text-sm text-ink-soft">학회 현장에서 들은 참석 암호를 마을 게시판에 입력하면 그 학회의 명찰이 생겨요. 명찰을 누르면 어느 학회인지 볼 수 있어요. 참석자는 흰색, 토론자는 은색, 발표자는 금색, 게시자는 자주색 뱃지가 달려요.</p>}
      {tags.length === 0 && <p className="text-center text-sm text-ink-soft">아직 받은 명찰이 없어요.</p>}
      <ul className="flex flex-wrap gap-3">
        {tags.map((t) => (
          <li key={t.id}>
            <button type="button" className="block rounded active:translate-y-px" aria-label={`${t.title} ${roleLabel(t.role)} 명찰 열어 보기`} onClick={() => setOpen(t)}>
              <PixelNameTag name={name} role={t.role} label={`${name} 명찰 (${roleLabel(t.role)})`} />
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <Modal title="학회 명찰" tone="sky" onClose={() => setOpen(null)}>
          <div className="card flex items-center gap-3 px-3 py-3" style={{ background: "#fffdf6" }}>
            <span className="min-w-0 flex-1">
              <span className="block break-words font-display text-lg">{open.title}</span>
              <span className="text-sm text-ink-soft">{dayLabel(open.event_date)} · {roleLabel(open.role)}</span>
            </span>
            <span className="flex shrink-0 justify-center"><PixelArt art={arts[open.role]} scale={4} label={`${roleLabel(open.role)} 뱃지`} /></span>
          </div>
        </Modal>
      )}
    </section>
  );
  return title ? <Window title={title} tone="sky">{body}</Window> : body;
}
