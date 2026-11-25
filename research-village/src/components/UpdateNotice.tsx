"use client";
import { useEffect, useState } from "react";
import { markUpdatesSeen, unseenUpdates } from "@/lib/updates";
import { Window } from "./ui";
import UpdateGroups from "./UpdateGroups";

/** 접속했을 때 홈 위쪽에 한 번 뜨는 업데이트 소식. 확인하면 사라진다(푸시 알림 아님) */
export default function UpdateNotice({ userId }: { userId: string }) {
  const [list, setList] = useState(() => unseenUpdates(userId));
  // 한 번 화면에 보여 줬으면 읽은 것으로 친다. 마을을 바꾸거나 다시 열어도 같은 소식이 또 뜨지 않게 한다.
  useEffect(() => { if (list.length > 0) markUpdatesSeen(userId); }, [list.length, userId]);
  if (list.length === 0) return null;
  return (
    <Window title="✨ 새 소식" tone="butter" as="section">
      <div className="space-y-2 p-3">
        <UpdateGroups list={list} openAll />
        <button type="button" className="btn btn-primary" onClick={() => { markUpdatesSeen(userId); setList([]); }}>확인했어요</button>
      </div>
    </Window>
  );
}
