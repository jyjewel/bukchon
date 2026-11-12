"use client";
import { useEffect, useRef } from "react";
import { currentPhase } from "@/lib/time";
import type { BoardTab, Resident } from "@/lib/types";
import { paint } from "@/pixel/core";
import { ROOM_H, ROOM_W, roomGrid } from "@/pixel/room";

function pos(x: number, y: number, w: number, h: number) {
  return { left: `${(x / ROOM_W) * 100}%`, top: `${(y / ROOM_H) * 100}%`, width: `${(w / ROOM_W) * 100}%`, height: `${(h / ROOM_H) * 100}%` };
}

/** 연구실 내부 도트 그림. 화이트보드·책장·포스트잇이 실제 데이터를 반영하고, 누르면 해당 탭으로 이동한다. */
export default function RoomCanvas({
  owner, inside, studying, boardCount, postitColors, shelf, note, onPick,
}: {
  owner: Resident; inside: boolean; studying: boolean; boardCount: number; postitColors: string[]; shelf: string[]; note?: string; onPick?: (t: BoardTab) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const styleKey = JSON.stringify(owner.house.style), avatarKey = JSON.stringify(owner.profile.avatar);
  const pcKey = postitColors.join(","), shelfKey = shelf.join(",");
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    const draw = () => {
      paint(ctx, roomGrid({
        slot: owner.slot, style: JSON.parse(styleKey), avatar: JSON.parse(avatarKey), inside, studying, phase: currentPhase(), frame,
        boardCount, postitColors: pcKey ? pcKey.split(",") : [], shelf: shelfKey ? shelfKey.split(",") : [],
      }), 0, 0);
      frame++;
    };
    ctx.clearRect(0, 0, ROOM_W, ROOM_H);
    draw();
    const t = setInterval(draw, 700);
    return () => clearInterval(t);
  }, [owner.slot, styleKey, avatarKey, inside, studying, boardCount, pcKey, shelfKey]);
  return (
    <div className="relative">
      <canvas ref={ref} width={ROOM_W} height={ROOM_H} className="pixelated block h-auto w-full" role="img" aria-label={`${owner.profile.display_name}의 연구실`} />
      {onPick && (
        <>
          <button type="button" className="scene-hit" style={pos(52, 5, 48, 32)} aria-label="화이트보드 보기" onClick={() => onPick("whiteboard")} />
          <button type="button" className="scene-hit" style={pos(102, 6, 34, 50)} aria-label="책장 보기" onClick={() => onPick("shelf")} />
          <button type="button" className="scene-hit" style={pos(0, 8, 10, 30)} aria-label="포스트잇 보기" onClick={() => onPick("postits")} />
        </>
      )}
      {note && <p className="scene-label" style={{ top: "88%" }}>{note}</p>}
    </div>
  );
}
