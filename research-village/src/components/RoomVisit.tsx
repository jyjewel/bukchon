"use client";
import { STATUS_META } from "@/lib/constants";
import { useFavBooks } from "@/hooks/useFavBooks";
import { useRoom } from "@/hooks/useRoom";
import type { BoardTab, Resident, VillageInfo } from "@/lib/types";
import { useState } from "react";
import { labTitle } from "@/lib/labName";
import FavoriteShelf from "./FavoriteShelf";
import { GiftBox } from "./GiveBox";
import { useNameTags } from "@/hooks/useNameTags";
import NameTags from "./NameTags";
import PortalDialog from "./LabPortal";
import RoomBoards from "./RoomBoards";
import RoomCanvas from "./RoomCanvas";
import { Modal, Window } from "./ui";

/** 다른 주민의 연구실 방문. 주민이 연구실 안에서 집중하고 있어도 들어가 볼 수 있다. */
export default function RoomVisit({
  owner, myId, residents, tab, onTab, onBack, onProfile, onGoto, villages, villageId, give, isGuest = false,
}: { owner: Resident; myId: string; residents: Resident[]; tab: BoardTab; onTab: (t: BoardTab) => void; onBack: () => void; onProfile?: () => void; onGoto: (userId: string, villageId: string) => void; villages: VillageInfo[]; villageId: string; isGuest?: boolean; give?: { onGift: React.ComponentProps<typeof GiftBox>["onGift"] } }) {
  const [giving, setGiving] = useState(false);
  const [portal, setPortal] = useState(false);
  const room = useRoom(owner.user_id, false);
  const fav = useFavBooks(owner.user_id);
  const nameTags = useNameTags(owner.user_id);
  const meta = STATUS_META[owner.shown];
  const name = owner.profile.display_name;
  const inRoom = owner.shown === "focus";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn" onClick={onBack}>◀ 마을로 돌아가기</button>
        {onProfile && <button type="button" className="btn" onClick={onProfile}>{name}의 프로필</button>}
        {isGuest && <span className="chip">친구 연구실 구경 중</span>}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="contents lg:block lg:space-y-5">
        <div className="order-1"><Window title={labTitle(owner.profile)} tone="butter">
          <RoomCanvas
            owner={owner} inside={inRoom} studying={inRoom} boardCount={room.items.length} postitColors={room.postits.filter((p) => !p.reply_to).map((p) => p.color)} shelf={room.achievements.map((a) => a.kind)} favs={fav.books ?? []} gifts={room.gifts.map((g) => g.kind)} tips={room.tips.length}
            note={inRoom || isGuest ? undefined : `${name}님은 ${owner.shown === "offline" ? "자리에 없어요" : meta.where}`} onPick={(t) => { onTab(t); document.getElementById(t === "shelf" ? "visit-results" : "visit-board")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} badges={(nameTags ?? []).map((t) => t.role)} onTags={() => document.getElementById("visit-badges")?.scrollIntoView({ behavior: "smooth", block: "start" })} onDesk={() => { if (give) setGiving(true); }} onPortal={() => setPortal(true)}
          />
          <p className="px-2 pb-1 pt-1 text-center text-xs text-ink-soft">{isGuest ? "친구 연구실을 구경 중이에요. 책상을 누르면 선물을 올리고, 화이트보드에 댓글과 포스트잇을 남길 수 있어요" : "책상을 누르면 커피나 간식을 올려 줄 수 있어요"}</p>
        </Window></div>
        <div className="order-4"><FavoriteShelf books={fav.books} names={fav.names} reload={fav.reload} editable={false} ownerName={name} /></div>
        <div id="visit-results" className="order-3"><Window title={`${name}님의 연구 성과`} tone="lilac">
          <RoomBoards owner={owner} myId={myId} residents={residents} room={room} tab={tab} onTab={onTab} only="shelf" />
        </Window></div>
        <div className="order-3"><div id="visit-badges"><NameTags userId={owner.user_id} title={`${name}님의 뱃지 보관함`} /></div></div>
        </div>
        <div className="contents lg:block lg:space-y-5">
          <div id="visit-board" className="order-2"><Window title="구경하고 남기기" tone="sky">
            <RoomBoards owner={owner} myId={myId} residents={residents} room={room} tab={tab} onTab={onTab} only="whiteboard" />
          </Window></div>
        </div>
      </div>
      {portal && <PortalDialog villages={villages} currentVillageId={villageId} myId={myId} currentId={owner.user_id} onGo={onGoto} onClose={() => setPortal(false)} />}
      {giving && give && (
        <Modal title={`${name}님 책상에 건네기`} tone="mint" onClose={() => setGiving(false)}>
          <GiftBox name={name} onGift={give.onGift} onDone={() => setTimeout(() => setGiving(false), 900)} />
        </Modal>
      )}
    </div>
  );
}
