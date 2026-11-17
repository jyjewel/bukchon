"use client";
import { useMemo } from "react";
import { coinGrid } from "@/pixel/coin";
import type { StudyGoal } from "@/hooks/useStudyGoals";
import PixelArt from "./PixelArt";
import { Window } from "./ui";

/** 공동 책장의 기념주화: 공동 공부 목표를 이룰 때마다 금화가 하나씩 생기고, 이룬 날짜와 목표가 적힌다 */
export default function CoinShelf({ goals }: { goals: StudyGoal[] }) {
  const art = useMemo(() => coinGrid(), []);
  const done = goals.filter((g) => g.completed_at).sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)));
  return (
    <Window title="기념 주화" tone="butter" className="self-start">
      <div className="space-y-2 p-3">
        <p className="text-sm text-ink-soft">공동 공부 목표를 이룰 때마다 금화가 하나씩 생겨요.</p>
        {done.length === 0 ? <p className="py-2 text-center text-sm text-ink-soft">아직 이룬 목표가 없어요. 첫 금화를 만들어 보세요.</p> : (
          <ul aria-label="기념주화" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {done.map((g) => {
              const d = new Date(g.completed_at!);
              return (
                <li key={g.id} className="card flex flex-col items-center px-1 pb-1.5 pt-2 text-center">
                  <PixelArt art={art} scale={4} sparkle label="금 기념주화" />
                  <span className="mt-1 text-xs text-ink-soft">{d.getFullYear()}.{d.getMonth() + 1}.{d.getDate()}</span>
                  <span className="line-clamp-2 break-words text-xs">{g.title}</span>
                  <span className="text-[11px] text-ink-soft">{g.members.length}명이 함께</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Window>
  );
}
