"use client";
import { useEffect, useRef } from "react";
import { fromRows, outline, paint } from "@/pixel/core";

/** 작은 도트 아이콘 (일지 반응 등에 쓴다) */
const ICONS: Record<string, { rows: string[]; pal: Record<string, string> }> = {
  heart: {
    rows: [".rr.rr.", "rhrrrrr", "rrrrrrr", ".rrrrr.", "..rrr..", "...r..."],
    pal: { r: "#ff5a7a", h: "#ffc2d0" },
  },
  thumbsup: {
    rows: ["....yy....", "....yyy...", "....yyy...", "bb.yyyyyyy", "bb.yyyyyyy", "bb.yyyyyyo", "bb.yyyyyyy", "bb.yyyyyyo", "bb..yyyyyy"],
    pal: { y: "#ffc94a", o: "#e09a28", b: "#5f8fd6" },
  },
  coffee: {
    rows: ["..w.w....", ".w.w.....", "ccccccc..", "cbbbbbcwc", "cbbbbbcwc", "cbbbbbcc.", ".ccccc...", "..ccc...."],
    pal: { c: "#fffaf0", b: "#7a4a2a", w: "#cfd8e8" },
  },
  book: {
    rows: ["bbbbbbbb", "brrrrrrb", "brwwwwrb", "brrrrrrb", "brrrrrrb", "bpppppwb", "bbbbbbbb"],
    pal: { b: "#7a3a2a", r: "#d9534f", w: "#fff3c9", p: "#f6efe0" },
  },
};

export default function PixelIcon({ name, scale = 2, className = "" }: { name: string; scale?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const def = ICONS[name];
  const blank = def ? ".".repeat(def.rows[0].length + 2) : "";
  const g = def ? outline(fromRows([blank, ...def.rows.map((r) => `.${r}.`), blank], def.pal)) : null;
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx || !g) return;
    ctx.clearRect(0, 0, g.w, g.h);
    paint(ctx, g, 0, 0);
  }, [g]);
  if (!g) return null;
  return <canvas ref={ref} width={g.w} height={g.h} aria-hidden className={`pixelated inline-block align-middle ${className}`} style={{ width: g.w * scale, height: g.h * scale }} />;
}
