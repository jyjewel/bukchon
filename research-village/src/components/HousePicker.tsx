"use client";
import { useEffect, useRef } from "react";
import { HOUSE_TYPES } from "@/lib/constants";
import type { HouseType } from "@/lib/types";
import { paint } from "@/pixel/core";
import { HOUSE_H, HOUSE_W, houseGrid } from "@/pixel/village";

function Preview({ type }: { type: HouseType }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, HOUSE_W, HOUSE_H);
    paint(ctx, houseGrid({ type }, { lit: true, empty: false, mine: false }), 0, 0);
  }, [type]);
  return <canvas ref={ref} width={HOUSE_W} height={HOUSE_H} className="pixelated mx-auto block" style={{ width: HOUSE_W * 2, height: HOUSE_H * 2 }} aria-hidden />;
}

/** 내 연구실 건물 모양 고르기 (지붕·벽 색은 건물마다 정해져 있다) */
export default function HousePicker({ value, onChange }: { value: HouseType; onChange: (t: HouseType) => void }) {
  return (
    <fieldset>
      <legend className="sr-only">연구실 건물 모양</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {HOUSE_TYPES.map((h) => (
          <button key={h.id} type="button" aria-pressed={value === h.id} onClick={() => onChange(h.id)} className={`card px-1 pb-2 pt-1 text-center text-sm ${value === h.id ? "card-on" : "hover:bg-[#fff3c4]"}`}>
            <Preview type={h.id} />
            <span className="block font-display">{h.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
