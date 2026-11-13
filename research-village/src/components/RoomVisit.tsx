"use client";
import { STATUS_META } from "@/lib/constants";
import { useRoom } from "@/hooks/useRoom";
import type { BoardTab, Resident } from "@/lib/types";
import { useState } from "react";
import { GiftBox } from "./GiveBox";
import RoomBoards from "./RoomBoards";
import RoomCanvas from "./RoomCanvas";
import { Modal, Window } from "./ui";

/** 다른 주민의 연구실 방문. 주민이 연구실 안에서 집중하고 있어도 들어가 볼 수 있다. */
export default function RoomVisit({
  owner, myId, residents, tab, onTab, onBack, onProfile, give,
}: { owner: Resident; myId: string; residents: Resident[]; tab: BoardTab; onTab: (t: BoardTab) => void; onBack: () => void; onProfile: () => void; give: { onGift: React.ComponentProps<typeof GiftBox>["onGift"]; onTip: (title: string, note: string) => Promise<string | null> | string | null } }) {
  const [giving, setGiving] = useState(false);
  const room = useRoom(owner.user_id, false);
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
            note={inRoom ? undefined : `${name}님은 ${owner.shown === "offline" ? "자리에 없어요" : meta.where}`} onPick={onTab} onDesk={() => setGiving(true)}
          />
          <p className="px-2 pb-1 pt-1 text-center text-xs text-ink-soft">책상을 누르면 커피나 간식을 올려 줄 수 있어요</p>
        </Window>
        <Window title="구경하고 남기기" tone="sky">
          <RoomBoards owner={owner} myId={myId} residents={residents} room={room} tab={tab} onTab={onTab} onTip={give.onTip} />
        </Window>
      </div>
      {giving && (
        <Modal title={`${name}님 책상에 건네기`} tone="mint" onClose={() => setGiving(false)}>
          <GiftBox name={name} onGift={give.onGift} onDone={() => setTimeout(() => setGiving(false), 900)} />
        </Modal>
      )}
    </div>
  );
}
