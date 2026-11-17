"use client";
import { useMemo, useState } from "react";
import { coinGrid } from "@/pixel/coin";
import type { StudyGoal } from "@/hooks/useStudyGoals";
import PixelArt from "./PixelArt";

/** 공동 책장 오른쪽에 쌓이는 기념주화: 공동 공부 목표를 이룰 때마다 금화가 하나씩 쌓인다. 누르면 날짜와 목표가 보인다. */
export default function CoinStack({ goals }: { goals: StudyGoal[] }) {
  const art = useMemo(() => coinGrid(), []);
  const [open, setOpen] = useState<string | null>(null);
  const done = goals.filter((g) => g.completed_at).sort((a, b) => String(a.completed_at).localeCompare(String(b.completed_at)));
  if (done.length === 0) return null;
  const shown = done.slice(-8);                                  // 맨 위에서 보이는 최근 금화 여덟 개
  const dateOf = (g: StudyGoal) => { const d = new Date(g.completed_at!); return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`; };
  const sel = done.find((g) => g.id === open);
  return (
    <div className="flex w-[84px] shrink-0 flex-col items-center justify-end self-stretch border-l-2 border-dotted border-[#c9a27a] pl-1" aria-label={`기념주화 ${done.length}개`} role="group">
      {sel && <p role="status" className="mb-1 w-full break-words text-center text-[10px] leading-tight text-[#fff8e4]">{dateOf(sel)}<br />{sel.title}<br /><span className="text-[#f2c744]">{sel.members.length}명이 함께</span></p>}
      <ul className="flex flex-col-reverse items-center pb-2">
        {shown.map((g, i) => (
          <li key={g.id} className={i === 0 ? "" : "-mb-[38px]"}>
            <button type="button" className="block" aria-label={`기념주화 ${dateOf(g)} ${g.title}`} title={`${dateOf(g)} · ${g.title}`} aria-pressed={open === g.id} onClick={() => setOpen(open === g.id ? null : g.id)}>
              <PixelArt art={art} scale={3} sparkle={i === shown.length - 1} label="금 기념주화" />
            </button>
          </li>
        ))}
      </ul>
      {done.length > shown.length && <span className="pb-1 text-[11px] text-[#fff8e4]">+{done.length - shown.length}</span>}
    </div>
  );
}
