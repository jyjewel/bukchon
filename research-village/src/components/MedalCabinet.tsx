"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StudyGoal } from "@/hooks/useStudyGoals";
import { cabinetInterior } from "@/pixel/libraryRoom";
import { bake } from "@/pixel/core";
import { Window } from "./ui";

const PER = 15, W = 128, H = 100;
/** 기념 장식장: 공동 목표를 이룰 때마다 끈 달린 메달이 하나씩 걸린다. 메달을 누르면 날짜와 목표가 보인다. */
export default function MedalCabinet({ goals }: { goals: StudyGoal[] }) {
  const done = useMemo(() => goals.filter((g) => g.completed_at).sort((a, b) => String(a.completed_at).localeCompare(String(b.completed_at))), [goals]);
  const pages = Math.max(1, Math.ceil(done.length / PER));
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const cur = Math.min(page, pages - 1);
  const slice = done.slice(cur * PER, cur * PER + PER);
  const art = useMemo(() => cabinetInterior(slice.length, sel === null ? -1 : sel - cur * PER), [slice.length, sel, cur]);
  const dateOf = (g: StudyGoal) => { const d = new Date(g.completed_at!); return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`; };
  const picked = sel !== null ? done[sel] : null;
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(bake(art), 0, 0, c.width, c.height);
  }, [art]);
  return (
    <Window title="🏅 기념 장식장" tone="butter">
      <div className="space-y-3 p-3">
        <div className="relative mx-auto w-full max-w-xl">
          <canvas ref={cv} width={W * 5} height={H * 5} className="pixelated block h-auto w-full" role="img" aria-label={`기념 메달 ${done.length}개`} />
          {slice.map((g, i) => {
            const r = Math.floor(i / 5), c = i % 5, cx = 16 + c * 24, top = 10 + r * 30;
            return (
              <button key={g.id} type="button" className="absolute" style={{ left: `${((cx - 10) / W) * 100}%`, top: `${((top + 1) / H) * 100}%`, width: `${(20 / W) * 100}%`, height: `${(28 / H) * 100}%` }}
                aria-label={`기념 메달 ${dateOf(g)} ${g.title}`} title={`${dateOf(g)} · ${g.title}`} onClick={() => setSel(cur * PER + i)} />
            );
          })}
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button type="button" className="btn btn-sm" disabled={cur === 0} onClick={() => { setPage(cur - 1); setSel(null); }}>◀</button>
            <span className="text-sm">{cur + 1} / {pages}</span>
            <button type="button" className="btn btn-sm" disabled={cur >= pages - 1} onClick={() => { setPage(cur + 1); setSel(null); }}>▶</button>
          </div>
        )}
        <div className="card min-h-[64px] space-y-1 p-3 text-center">
          {done.length === 0 ? <p className="text-sm text-ink-soft">아직 메달이 없어요. 공동 공부 목표를 이루면 장식장에 메달이 걸려요.</p>
            : picked ? (
              <>
                <p className="text-sm text-ink-soft">{sel! + 1}번째 메달 · {dateOf(picked)}</p>
                <p className="font-display text-lg">{picked.title}</p>
                {picked.note && <p className="text-sm text-ink-soft">{picked.note}</p>}
                <p className="text-sm">{picked.members.length}명이 함께 이뤘어요</p>
              </>
            ) : <p className="text-sm text-ink-soft">메달 {done.length}개가 걸려 있어요. 눌러서 자세히 보세요.</p>}
        </div>
      </div>
    </Window>
  );
}
