"use client";
import { useEffect, useRef } from "react";
import { bake, paint } from "@/pixel/core";
import { avatarGrid } from "@/pixel/avatar";
import { HALL_H, HALL_W, LROOM_H, LROOM_W, hourglassGrid, hourglassSmall, lampGrid, libraryBackground, libraryHall, longTableGrid } from "@/pixel/libraryRoom";

const K = 6;
const AV = [
  { hair: "short", hairColor: "#4a3430", outfit: "#e0605a", top: "tee" },
  { hair: "long", hairColor: "#2f2a3a", outfit: "#5f8fd6", top: "tee" },
  { hair: "short", hairColor: "#8a5a3a", outfit: "#62b866", top: "tee", accessories: ["glasses"] },
  { hair: "bun", hairColor: "#c98a4e", outfit: "#b08ae0", top: "tee" },
  { hair: "short", hairColor: "#6a3a2a", outfit: "#f2c64e", top: "tee" },
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
  if (typeof window !== "undefined" && window.location.search.includes("hall")) return <Hall />;
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

type St = "empty" | "seated" | "study" | "done";
const NAMES = ["아라", "하나", "윤수", "민규"];
/** 한 자리: 상태에 따라 캐릭터 동작과 독서등·책이 달라진다 */
function drawSeat(b: CanvasRenderingContext2D, cx: number, ty: number, who: number | null, st: St, sand: number, flip: number, tick: number) {
  const lit = st === "study";
  if (who !== null) {
    const av = bake(avatarGrid(AV[who] as never, 0, true));
    const dy = st === "study" ? 1 + (Math.floor(tick / 40) % 5 === 0 ? 1 : 0) : st === "done" ? -1 : 0;   // 책에 고개를 숙이고, 가끔 더 숙인다
    b.drawImage(av, cx - 12, ty - 22 + dy);
    if (st === "done") { b.fillStyle = "#f6cba6"; b.fillRect(cx - 14, ty - 28, 3, 12); b.fillRect(cx + 11, ty - 28, 3, 12); b.fillStyle = "#3a2a33"; b.fillRect(cx - 15, ty - 29, 1, 14); b.fillRect(cx + 14, ty - 29, 1, 14); }   // 기지개
    if (st === "study") { b.fillStyle = "#f6cba6"; b.fillRect(cx - 6, ty - 4, 3, 2); b.fillRect(cx + 4, ty - 4, 3, 2); }   // 책을 짚은 두 손
  }
  // 책
  if (who !== null) {
    if (st === "study") { b.fillStyle = "#3a2a33"; b.fillRect(cx - 8, ty - 3, 17, 4); b.fillStyle = "#fff8e4"; b.fillRect(cx - 7, ty - 3, 7, 3); b.fillRect(cx + 1, ty - 3, 7, 3); b.fillStyle = "#d8c9a8"; for (const x of [cx - 6, cx - 5, cx + 2, cx + 3]) b.fillRect(x, ty - 2, 3, 1);
      const pen = Math.floor(tick / 8) % 2; b.fillStyle = "#3a5fa8"; b.fillRect(cx + 5 + pen, ty - 5 + pen, 2, 1); b.fillRect(cx + 6 + pen, ty - 6 + pen, 1, 1); }   // 글씨 쓰는 펜
    else { b.fillStyle = "#c0504d"; b.fillRect(cx - 5, ty - 2, 9, 2); b.fillStyle = "#fff8e4"; b.fillRect(cx - 4, ty - 3, 7, 1); }
  }
  // 독서등: 공부 중엔 켜지고 책상에 따뜻한 빛이 번진다
  b.drawImage(bake(lampGrid(lit)), cx + 18, ty - 9);
  if (lit) { const gr = b.createRadialGradient(cx + 22, ty - 6, 1, cx + 22, ty - 6, 20); gr.addColorStop(0, "rgb(255 226 140 / .55)"); gr.addColorStop(1, "rgb(255 226 140 / 0)"); b.fillStyle = gr; b.fillRect(cx + 2, ty - 28, 44, 34); }
  b.drawImage(bake(hourglassSmall(sand, flip)), cx + 9 - (flip ? 2 : 0), ty - (flip ? 8 : 10));
}
export function Hall() {
  const ref = useRef<HTMLCanvasElement>(null);
  const K = 5;
  const SEATS: [number, number | null, St, number, string, number][] = [
    [22, 0, "study", 0.7, "0:42", 0], [52, 1, "study", 0.35, "1:18", 0], [82, null, "empty", 1, "", 0],
    [112, 3, "seated", 1, "0:00", 0], [142, 2, "study", 0.9, "0:09", 1], [172, 4, "done", 0, "2:05", 0],
  ];
  useEffect(() => {
    const ctx = ref.current!.getContext("2d")!; ctx.imageSmoothingEnabled = false;
    const buf = document.createElement("canvas"); buf.width = HALL_W; buf.height = HALL_H;
    const b = buf.getContext("2d")!;
    paint(b, libraryHall("day"), 0, 0);
    const ty = 104;
    for (const [cx, who, st, sand, , flip] of SEATS) drawSeat(b, cx, ty, who, st, sand, flip, 10);
    b.drawImage(bake(longTableGrid(186)), 7, ty);
    // 탁자 위 물건은 탁자 뒤에 가리지 않게 다시 그린다
    for (const [cx, who, st, sand, , flip] of SEATS) { b.save(); b.beginPath(); b.rect(0, 0, HALL_W, ty); b.clip(); drawSeat(b, cx, ty, who, st, sand, flip, 10); b.restore(); }
    ctx.drawImage(buf, 0, 0, HALL_W * K, HALL_H * K);
  }, []);
  return (
    <div id="prev" style={{ position: "relative", width: HALL_W * K, height: HALL_H * K }}>
      <canvas ref={ref} width={HALL_W * K} height={HALL_H * K} style={{ width: HALL_W * K, height: HALL_H * K, imageRendering: "pixelated" }} />
      {SEATS.filter((d) => d[1] !== null).map((d, i) => (
        <span key={i} style={{ position: "absolute", left: (d[0] - 13) * K, top: 112 * K, width: 26 * K, textAlign: "center", font: "11px Galmuri11, sans-serif", color: "#fff3c4", background: "rgb(58 42 51 / .78)", borderRadius: 3, padding: "1px 0" }}>{["아라", "하나", "윤수", "민규", "수찬"][d[1] as number]} {d[4]}</span>
      ))}
    </div>
  );
}
