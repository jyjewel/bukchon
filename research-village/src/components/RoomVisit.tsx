"use client";
import { STATUS_META } from "@/lib/constants";
import { useRoom } from "@/hooks/useRoom";
import type { BoardTab, Resident } from "@/lib/types";
import RoomBoards from "./RoomBoards";
import RoomCanvas from "./RoomCanvas";
import { Window } from "./ui";

/** 다른 주민의 연구실 방문. 주민이 연구실 안에서 집중하고 있어도 들어가 볼 수 있다. */
export default function RoomVisit({
  owner, myId, villageId, residents, tab, onTab, onBack, onProfile,
}: { owner: Resident; myId: string; villageId: string; residents: Resident[]; tab: BoardTab; onTab: (t: BoardTab) => void; onBack: () => void; onProfile: () => void }) {
  const room = useRoom(owner.user_id, villageId);
  const meta = STATUS_META[owner.shown];
  const name = owner.profile.display_name;
  const inRoom = owner.shown === "focus";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn" onClick={onBack}>◀ 마을로 돌아가기</button>
        <button type="button" className="btn" onClick={onProfile}>{name}의 미니홈피</button>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Window title={`${name}의 연구실`} tone="butter">
          <RoomCanvas
            owner={owner} inside={inRoom} studying={inRoom} boardCount={room.items.length} postitColors={room.postits.map((p) => p.color)} shelf={room.achievements.map((a) => a.kind)}
            note={inRoom ? undefined : `${name}님은 ${owner.shown === "offline" ? "자리에 없어요" : meta.where}`} onPick={onTab}
          />
          <p className="border-t-[3px] border-ink px-3 py-2 text-xs text-ink-soft">
            {inRoom ? `${name}님이 연구 중이에요. 조용히 구경하고, 포스트잇이나 댓글을 남겨 보세요.` : "화이트보드와 책장을 눌러 보세요."}
          </p>
        </Window>
        <Window title="구경하고 남기기" tone="sky">
          <RoomBoards owner={owner} myId={myId} villageId={villageId} residents={residents} room={room} tab={tab} onTab={onTab} />
        </Window>
      </div>
    </div>
  );
}
