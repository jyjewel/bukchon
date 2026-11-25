"use client";
import { useEffect, useRef } from "react";
import { bake, paint } from "@/pixel/core";
import { HALL_H, HALL_W, cabinetInterior, libraryHall } from "@/pixel/libraryRoom";

export default function P() {
  const a = useRef<HTMLCanvasElement>(null), b = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ca = a.current!.getContext("2d")!, cb = b.current!.getContext("2d")!;
    ca.imageSmoothingEnabled = false; cb.imageSmoothingEnabled = false;
    const buf = document.createElement("canvas"); buf.width = HALL_W; buf.height = HALL_H;
    paint(buf.getContext("2d")!, libraryHall("day", 8), 0, 0);
    ca.drawImage(buf, 100, 20, 100, 100, 0, 0, 500, 500);          // 홀의 오른쪽 일부를 크게
    const g = cabinetInterior(8, 2); const c = bake(g);
    cb.drawImage(c, 0, 0, g.w * 5, g.h * 5);
  }, []);
  return (
    <div id="prev" style={{ display: "flex", gap: 20, padding: 10, background: "#eee" }}>
      <canvas ref={a} width={500} height={500} />
      <canvas ref={b} width={640} height={420} />
    </div>
  );
}
