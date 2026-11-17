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
  // 많아지면 주화를 작게 줄여서 전부 보이게 한다 (그래도 넘치면 줄을 늘린다)
  const H = 170, scale = [3, 2, 1].find((k) => done.length * (5 * k - 1) <= H) ?? 1, perCol = Math.max(1, Math.floor(H / (5 * scale - 1)));
  const cols: StudyGoal[][] = [];
  for (let i = 0; i < done.length; i += perCol) cols.push(done.slice(i, i + perCol));
  const dateOf = (g: StudyGoal) => { const d = new Date(g.completed_at!); return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`; };
  return (
    <>
      <div className="mb-2 flex shrink-0 flex-row-reverse items-end gap-1 self-end" role="group" aria-label={`기념주화 ${done.length}개`}>
        {cols.map((col, ci) => (
          <ul key={ci} className="flex flex-col-reverse items-center">
            {col.map((g, i) => (
              <li key={g.id} style={{ marginLeft: ((i * 7) % 5 - 2) * Math.max(1, scale - 1), marginBottom: -1 }}>
                <button type="button" className="block hover:brightness-110" aria-label={`기념주화 ${dateOf(g)} ${g.title}`} title={`${dateOf(g)} · ${g.title}`} onClick={() => setOpen(g)}>
                  <PixelArt art={sides[(ci * perCol + i) % 10]} scale={scale} label="금 기념주화(옆면)" />
                </button>
              </li>
            ))}
          </ul>
        ))}
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
