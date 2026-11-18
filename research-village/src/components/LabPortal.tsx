"use client";
import { useMemo } from "react";
import { portalGrid } from "@/pixel/portal";
import type { Resident } from "@/lib/types";
import PixelArt from "./PixelArt";
import { Modal } from "./ui";

/** 연구실 벽의 쥐구멍을 누르면 뜨는 창: 마을로 나가지 않고 바로 다른 사람의 연구실(또는 내 연구실)로 건너간다 */
export default function PortalDialog({ residents, myId, currentId, onGo, onClose }: { residents: Resident[]; myId: string; currentId: string; onGo: (userId: string) => void; onClose: () => void }) {
  const art = useMemo(() => portalGrid(), []);
  const list = [...residents.filter((r) => r.user_id === myId), ...residents.filter((r) => r.user_id !== myId)].filter((r) => r.user_id !== currentId);
  return (
    <Modal title="쥐구멍 포털" tone="lilac" onClose={onClose}>
      <div className="flex items-start gap-3">
        <PixelArt art={art} scale={4} sparkle label="포털 도트 그림" />
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-sm text-ink-soft">어느 연구실로 건너갈까요?</p>
          {list.length === 0 ? <p className="text-sm text-ink-soft">건너갈 연구실이 아직 없어요.</p> : (
            <ul className="flex flex-wrap gap-1" aria-label="이동할 연구실">
              {list.map((r) => (
                <li key={r.user_id}>
                  <button type="button" className="btn btn-sm" onClick={() => { onClose(); onGo(r.user_id); }} aria-label={`${r.user_id === myId ? "내" : `${r.profile.display_name}의`} 연구실로 이동`}>
                    {r.user_id === myId ? "내 연구실" : r.profile.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
