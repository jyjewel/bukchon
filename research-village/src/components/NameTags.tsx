"use client";
import { useMemo } from "react";
import { useNameTags } from "@/hooks/useNameTags";
import { CONF_ROLES, roleLabel } from "@/lib/conference";
import { badgeGrid } from "@/pixel/badges";
import PixelArt from "./PixelArt";
import { Window } from "./ui";

const dayLabel = (d: string) => { const [y, m, day] = d.split("-").map(Number); return `${y}.${String(m).padStart(2, "0")}.${String(day).padStart(2, "0")}`; };

/** 뱃지 보관함: 참석한 학회마다 학회 이름·날짜·역할이 적힌 뱃지가 쌓인다 (참석 흰색 · 토론 은색 · 발표 금색 · 개최 자주색) */
export default function NameTags({ userId, mine = false, title }: { userId: string; mine?: boolean; title?: string }) {
  const tags = useNameTags(userId);
  const arts = useMemo(() => Object.fromEntries(CONF_ROLES.map((r) => [r.id, badgeGrid(r.id)])), []);
  if (tags === null) return title ? null : <p className="p-3 text-sm text-ink-soft">불러오는 중…</p>;
  if (tags.length === 0 && !mine) return null;   // 남의 연구실에서는 뱃지가 있을 때만 보인다
  const body = (
    <section aria-label="뱃지 보관함" className="space-y-2 p-3">
      {tags.length === 0 && <p className="text-center text-sm text-ink-soft">아직 받은 뱃지가 없어요.</p>}
      <ul className="space-y-2">
        {tags.map((t) => (
          <li key={t.id} className="card flex items-center gap-3 px-3 py-2" style={{ background: "#fffdf6" }}>
            <span className="flex w-12 shrink-0 justify-center"><PixelArt art={arts[t.role]} scale={3} label={`${roleLabel(t.role)} 뱃지`} /></span>
            <span className="min-w-0 flex-1">
              <span className="block break-words font-display">{t.title}</span>
              <span className="text-xs text-ink-soft">{dayLabel(t.event_date)} · {roleLabel(t.role)}</span>
              {t.talk_title && <span className="block break-words text-sm">“{t.talk_title}”</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
  return title ? <Window title={title} tone="sky">{body}</Window> : body;
}
