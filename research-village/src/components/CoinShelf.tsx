"use client";
import { useMemo, useState } from "react";
import { coinGrid, coinSideGrid } from "@/pixel/coin";
import type { StudyGoal } from "@/hooks/useStudyGoals";
import PixelArt from "./PixelArt";
import { Modal } from "./ui";

/** 공동 책장 오른쪽에 쌓이는 기념주화: 목표를 이룰 때마다 금화가 하나씩 옆면이 보이게 쌓인다. 누르면 날짜·기념주화 그림·목표가 보인다. */
export default function CoinStack({ goals }: { goals: StudyGoal[] }) {
  const sides = useMemo(() => Array.from({ length: 10 }, (_, i) => coinSideGrid(i)), []);
  const face = useMemo(() => coinGrid(), []);
  const [open, setOpen] = useState<StudyGoal | null>(null);
  const done = goals.filter((g) => g.completed_at).sort((a, b) => String(a.completed_at).localeCompare(String(b.completed_at)));
  if (done.length === 0) return null;
  const shown = done.slice(-14);
  const dateOf = (g: StudyGoal) => { const d = new Date(g.completed_at!); return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`; };
  return (
    <>
      <div className="mb-2 flex shrink-0 flex-col items-center self-end" role="group" aria-label={`기념주화 ${done.length}개`}>
        {done.length > shown.length && <span className="pb-0.5 text-[11px] text-[#fff8e4]">+{done.length - shown.length}</span>}
        <ul className="flex flex-col items-center">
          {shown.map((g, i) => (
            <li key={g.id} style={{ marginLeft: ((i * 7) % 5 - 2) * 2, marginTop: -1 }}>
              <button type="button" className="block hover:brightness-110" aria-label={`기념주화 ${dateOf(g)} ${g.title}`} title={`${dateOf(g)} · ${g.title}`} onClick={() => setOpen(g)}>
                <PixelArt art={sides[i % 10]} scale={3} label="금 기념주화(옆면)" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      {open && (
        <Modal title="🪙 기념 주화" tone="butter" onClose={() => setOpen(null)}>
          <div className="flex flex-col items-center gap-2 text-center">
            <PixelArt art={face} scale={9} sparkle label="금 기념주화" />
            <p className="text-sm text-ink-soft">{dateOf(open)}</p>
            <p className="font-display text-lg">{open.title}</p>
            {open.note && <p className="text-sm text-ink-soft">{open.note}</p>}
            <p className="text-sm">{open.members.length}명이 함께 이뤘어요</p>
            <button type="button" className="btn" onClick={() => setOpen(null)}>닫기</button>
          </div>
        </Modal>
      )}
    </>
  );
}
