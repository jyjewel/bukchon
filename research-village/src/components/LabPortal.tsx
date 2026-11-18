"use client";
import { useMemo } from "react";
import { portalGrid } from "@/pixel/portal";
import type { Resident } from "@/lib/types";
import PixelArt from "./PixelArt";
import { Window } from "./ui";

/** 연구실 포털: 마을로 나가지 않고 바로 다른 사람의 연구실(또는 내 연구실)로 건너간다 */
export default function LabPortal({ residents, myId, currentId, onGo }: { residents: Resident[]; myId: string; currentId: string; onGo: (userId: string) => void }) {
  const art = useMemo(() => portalGrid(), []);
  const list = [...residents.filter((r) => r.user_id === myId), ...residents.filter((r) => r.user_id !== myId)].filter((r) => r.user_id !== currentId);
  return (
    <Window title="연구실 포털" tone="lilac">
      <div className="flex items-center gap-3 p-3">
        <PixelArt art={art} scale={3} sparkle label="연구실 포털 도트 그림" />
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs text-ink-soft">눌러서 다른 연구실로 바로 건너가요</p>
          {list.length === 0 ? <p className="text-xs text-ink-soft">건너갈 연구실이 아직 없어요.</p> : (
            <ul className="flex flex-wrap gap-1" aria-label="이동할 연구실">
              {list.map((r) => (
                <li key={r.user_id}>
                  <button type="button" className="btn btn-sm" onClick={() => onGo(r.user_id)} aria-label={`${r.user_id === myId ? "내" : `${r.profile.display_name}의`} 연구실로 이동`}>
                    {r.user_id === myId ? "내 연구실" : r.profile.display_name}{r.online ? "" : ""}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Window>
  );
}
