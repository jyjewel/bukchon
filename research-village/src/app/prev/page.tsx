"use client";
import { useEffect, useRef } from "react";
import { bake, paint } from "@/pixel/core";
import { avatarGrid } from "@/pixel/avatar";
import { LROOM_H, LROOM_W, hourglassGrid, lampGrid, libraryBackground, longTableGrid } from "@/pixel/libraryRoom";

const K = 6;
const AV = [
  { hair: "short", hairColor: "#4a3430", outfit: "#e0605a", top: "tee" },
  { hair: "long", hairColor: "#2f2a3a", outfit: "#5f8fd6", top: "tee" },
  { hair: "short", hairColor: "#8a5a3a", outfit: "#62b866", top: "tee", accessories: ["glasses"] },
  { hair: "bun", hairColor: "#c98a4e", outfit: "#b08ae0", top: "tee" },
];
// 책상 6개: [가운데 x, 윗면 y, 앉은 사람(없으면 null), 모래 남은 비율, 시간표시, 뒤집는 중]
const DESKS: [number, number, number | null, number, string, number][] = [
  [34, 72, 0, 0.7, "0:42", 0], [80, 72, 1, 0.35, "1:18", 0], [126, 72, null, 1, "", 0],
  [34, 100, null, 1, "", 0], [80, 100, 2, 0.9, "0:09", 1], [126, 100, 3, 0.15, "2:05", 0],
];
function Sheet() {
  const ref = useRef<HTMLCanvasElement>(null);
  const items: [number, number, string][] = [[1, 0, "막 뒤집음"], [0.75, 0, "공부 중"], [0.5, 0, "절반"], [0.2, 0, "거의 끝"], [0, 0, "다 떨어짐"], [0.6, 1, "뒤집는 중"]];
  useEffect(() => {
    const c = ref.current!, ctx = c.getContext("2d")!; ctx.imageSmoothingEnabled = false; ctx.fillStyle = "#f6e9cf"; ctx.fillRect(0, 0, c.width, c.height);
    items.forEach(([sand, flip], i) => { const g = bake(hourglassGrid(sand, flip)); ctx.drawImage(g, 30 + i * 165, 30 + (flip ? 40 : 0), g.width * 10, g.height * 10); });
  });
  return (
    <div id="prev" style={{ position: "relative" }}>
      <canvas ref={ref} width={1020} height={260} />
      {items.map(([, , t], i) => <span key={i} style={{ position: "absolute", left: 30 + i * 165, top: 225, width: 130, textAlign: "center", font: "14px Galmuri11, sans-serif" }}>{t}</span>)}
    </div>
  );
}
export default function P() {
  if (typeof window !== "undefined" && window.location.search.includes("sheet")) return <Sheet />;
  const ref = useRef<HTMLCanvasElement>(null);
  const labels = typeof window !== "undefined" && window.location.search.includes("labels");
  useEffect(() => {
    const ctx = ref.current!.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    const buf = document.createElement("canvas"); buf.width = LROOM_W; buf.height = LROOM_H;
    const b = buf.getContext("2d")!;
    paint(b, libraryBackground("day"), 0, 0);
    const table = bake(longTableGrid(144)), lamp = bake(lampGrid());
    for (const row of [72, 100]) {
      const seats = DESKS.filter((d) => d[1] === row);
      for (const [cx, ty, who] of seats) if (who !== null) b.drawImage(bake(avatarGrid(AV[who] as never, 0, true)), cx - 12, ty - 22);
      b.drawImage(table, 8, row);
      for (const [cx, ty, who, sand, , flip] of seats) {
        b.drawImage(bake(hourglassGrid(sand, flip)), cx - (flip ? 30 : 17), ty - (flip ? 12 : 16));
        b.drawImage(lamp, cx + 10, ty - 8);
        if (who !== null) { b.fillStyle = "#c0504d"; b.fillRect(cx - 4, ty - 2, 9, 2); b.fillStyle = "#fff8e4"; b.fillRect(cx - 3, ty - 3, 7, 1); }
      }
    }
    ctx.drawImage(buf, 0, 0, LROOM_W * K, LROOM_H * K);
  }, []);
  return (
    <div id="prev" style={{ position: "relative", width: LROOM_W * K, height: LROOM_H * K, background: "#222" }}>
      <canvas ref={ref} width={LROOM_W * K} height={LROOM_H * K} style={{ width: LROOM_W * K, height: LROOM_H * K, imageRendering: "pixelated" }} />
      {DESKS.filter((d) => d[2] !== null).map((d, i) => (
        <span key={i} style={{ position: "absolute", left: (d[0] - 16) * K, top: (d[1] + 5) * K, textAlign: "center", font: "13px Galmuri11, sans-serif", color: "#fff3c4", background: "rgb(58 42 51 / .78)", borderRadius: 4, padding: "1px 0", width: 28 * K, marginLeft: 2 * K }}>{["아라", "하나", "윤수", "민규"][d[2] as number]} ⏳{d[4]}</span>
      ))}
      {labels && ([["책장 → 함께 읽는 책", 3, 4, 38, 50], ["게시판 → 스터디 일정", 44, 10, 20, 26], ["칠판 → 공동 공부 목표", 96, 10, 20, 26], ["노트북 → Zoom 회의", 44, 34, 22, 20], ["책장 → 책 읽기", 119, 4, 38, 50], ["창문 (밤엔 별)", 66, 6, 28, 48]] as [string, number, number, number, number][]).map(([t, x, y, w, h], i) => (
        <span key={i} style={{ position: "absolute", left: x * K, top: y * K, width: w * K, height: h * K, border: "3px dashed #ff4d8d", boxSizing: "border-box", font: "12px Galmuri11, sans-serif", color: "#fff", background: "rgb(255 77 141 / .18)", display: "flex", alignItems: "flex-end", justifyContent: "center", textShadow: "0 1px 2px #000" }}>{t}</span>
      ))}
    </div>
  );
}
