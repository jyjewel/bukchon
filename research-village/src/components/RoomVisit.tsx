"use client";
import { STATUS_META } from "@/lib/constants";
import { useRoom } from "@/hooks/useRoom";
import type { BoardTab, Resident } from "@/lib/types";
import RoomBoards from "./RoomBoards";
import RoomCanvas from "./RoomCanvas";
import { Window } from "./ui";

/** 다른 주민의 연구실 방문. 집중 연구 중이면 안으로 들어갈 수 없고 문 앞에 포스트잇만 남긴다. */
export default function RoomVisit({
  owner, myId, villageId, residents, tab, onTab, onBack, onProfile,
}: { owner: Resident; myId: string; villageId: string; residents: Resident[]; tab: BoardTab; onTab: (t: BoardTab) => void; onBack: () => void; onProfile: () => void }) {
  const locked = owner.shown === "focus";
  const room = useRoom(owner.user_id, villageId, !locked);
  const meta = STATUS_META[owner.shown];
  const name = owner.profile.display_name;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn" onClick={onBack}>◀ 마을로 돌아가기</button>
        <button type="button" className="btn" onClick={onProfile}>{name}의 미니홈피</button>
      </div>
      {locked ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <Window title={`${name}의 연구실 — 문 앞`} tone="butter">
            <div className="space-y-3 p-6 text-center">
              <p className="font-display text-xl">집중 연구 중</p>
              <p className="text-sm">{name}님은 지금 집 안에서 집중하고 있어요.<br />방해하지 않도록 문은 닫혀 있고, 포스트잇만 남길 수 있어요.</p>
              <p className="text-xs text-ink-soft">{name}님이 밖으로 나오면 연구실을 구경할 수 있어요.</p>
            </div>
          </Window>
          <Window title="문에 포스트잇 붙이기" tone="rose">
            <RoomBoards owner={owner} myId={myId} villageId={villageId} residents={residents} room={room} tab="postits" onTab={onTab} postitsOnly />
          </Window>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <Window title={`${name}의 연구실`} tone="butter">
            <RoomCanvas
              owner={owner} inside={false} studying={false} boardCount={room.items.length} postitColors={room.postits.map((p) => p.color)} shelf={room.achievements.map((a) => a.kind)}
              note={`${name}님은 ${owner.shown === "offline" ? "자리에 없어요" : meta.where}`} onPick={onTab}
            />
            <p className="border-t-[3px] border-ink px-3 py-2 text-xs text-ink-soft">화이트보드·책장·벽의 포스트잇을 눌러 보세요.</p>
          </Window>
          <Window title="구경하고 남기기" tone="sky">
            <RoomBoards owner={owner} myId={myId} villageId={villageId} residents={residents} room={room} tab={tab} onTab={onTab} />
          </Window>
        </div>
      )}
    </div>
  );
}
