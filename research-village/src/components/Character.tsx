"use client";
import { useEffect, useRef } from "react";
import type { Avatar, ResearchState } from "@/lib/types";
import { paint } from "@/pixel/core";
import { AV_H, AV_W, avatarGrid } from "@/pixel/avatar";
import { iconGrid } from "@/pixel/village";

/** 도트 캐릭터. size 는 대략적인 높이(px)이며 도트가 고르게 보이도록 정수 배율로 맞춘다. */
export function CharacterIcon({ avatar, size = 50, className = "" }: { avatar: Avatar; size?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const k = Math.max(2, Math.round(size / AV_H));
  const key = JSON.stringify(avatar);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, AV_W, AV_H);
    paint(ctx, avatarGrid(JSON.parse(key) as Avatar), 0, 0);
  }, [key]);
  return <canvas ref={ref} width={AV_W} height={AV_H} className={`pixelated shrink-0 ${className}`} style={{ width: AV_W * k, height: AV_H * k, margin: `0 ${-3 * k}px` }} aria-hidden />;
}

/** 연구 상태를 나타내는 7×7 도트 아이콘 */
export function StatusIcon({ state, scale = 2, className = "" }: { state: ResearchState; scale?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 7, 7);
    paint(ctx, iconGrid(state), 0, 0);
  }, [state]);
  return <canvas ref={ref} width={7} height={7} className={`pixelated inline-block shrink-0 align-middle ${className}`} style={{ width: 7 * scale, height: 7 * scale }} aria-hidden />;
}
