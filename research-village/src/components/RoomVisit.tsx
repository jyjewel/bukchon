"use client";
import { STATUS_META } from "@/lib/constants";
import { useRoom } from "@/hooks/useRoom";
import type { BoardTab, Resident } from "@/lib/types";
import { awayDays } from "@/lib/social";
import GiveBox from "./GiveBox";
import RoomBoards from "./RoomBoards";
import RoomCanvas from "./RoomCanvas";
import { Window } from "./ui";

/** 다른 주민의 연구실 방문. 주민이 연구실 안에서 집중하고 있어도 들어가 볼 수 있다. */
export default function RoomVisit({
  owner, myId, residents, tab, onTab, onBack, onProfile, give,
}: { owner: Resident; myId: string; residents: Resident[]; tab: BoardTab; onTab: (t: BoardTab) => void; onBack: () => void; onProfile: () => void; give: Omit<React.ComponentProps<typeof GiveBox>, "name" | "nudgeDays"> }) {
  const room = useRoom(owner.user_id);
  const meta = STATUS_META[owner.shown];
  const name = owner.profile.display_name;
  const inRoom = owner.shown === "focus";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn" onClick={onBack}>◀ 마을로 돌아가기</button>
        <button type="button" className="btn" onClick={onProfile}>{name}의 프로필</button>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Window title={`${name}의 연구실`} tone="butter">
          <RoomCanvas
            owner={owner} inside={inRoom} studying={inRoom} boardCount={room.items.length} postitColors={room.postits.map((p) => p.color)} shelf={room.achievements.map((a) => a.kind)} gifts={room.gifts.map((g) => g.kind)} tips={room.tips.length}
            note={inRoom ? undefined : `${name}님은 ${owner.shown === "offline" ? "자리에 없어요" : meta.where}`} onPick={onTab}
          />
        </Window>
        <div className="space-y-5">
          <Window title="구경하고 남기기" tone="sky">
            <RoomBoards owner={owner} myId={myId} residents={residents} room={room} tab={tab} onTab={onTab} />
          </Window>
          <Window title="마음 전하기" tone="rose">
            <div className="p-3"><GiveBox name={name} nudgeDays={!owner.online && awayDays(owner.status.left_at ?? owner.status.last_seen_at) >= 3 ? awayDays(owner.status.left_at ?? owner.status.last_seen_at) : null} {...give} /></div>
          </Window>
        </div>
      </div>
    </div>
  );
}
