"use client";
import { useState } from "react";
import { relativeTime } from "@/lib/time";
import type { AppNotification, Resident, VillageInfo } from "@/lib/types";
import { gestureOf, giftOf, reactionOf } from "@/lib/social";
import { Window } from "./ui";

export function notifText(n: AppNotification, residents: Resident[], myId: string, names: Record<string, string> = {}): string {
  const nameOf = (id: string) => residents.find((r) => r.user_id === id)?.profile.display_name ?? names[id];
  const actor = nameOf(n.actor_id) ?? "누군가";
  if (n.kind === "chat_request") return `${actor}님이 대화를 신청했어요`;
  if (n.kind === "meeting") return `${actor}님이 Zoom 회의를 열었어요`;
  if (n.kind === "gesture") return `${actor}님이 ${gestureOf(n.summary)?.hit ?? "장난을 쳤어요!"}`;
  if (n.kind === "gift") { const i = n.summary.indexOf(":"); const k = i < 0 ? n.summary : n.summary.slice(0, i); const note = i < 0 ? "" : n.summary.slice(i + 1); return `${actor}님이 ${giftOf(k)?.label ?? "선물"}을(를) 건넸어요${note ? ` — “${note}”` : ""}`; }
  if (n.kind === "book_tip") return `${actor}님이 책 《${n.summary}》을(를) 추천해 책장에 꽂아 두었어요`;
  if (n.kind === "journal_reaction") return `${actor}님이 ${n.room_owner_id === myId ? "내" : `${nameOf(n.room_owner_id) ?? ""}님의`} 공개 일지에 ‘${reactionOf(n.summary.split(":")[0])?.label ?? "반응"}’을 남겼어요`;
  if (n.kind === "journal_comment") return `${actor}님이 ${n.room_owner_id === myId ? "내" : `${nameOf(n.room_owner_id) ?? ""}님의`} 공개 일지에 댓글을 남겼어요`;
  if (n.kind === "cheer") return `${actor}님이 내 마감 ‘${n.summary}’을(를) 응원해요. 파이팅!`;
  if (n.kind === "nudge") { const [title, due] = n.summary.split("|"); return due ? `${actor}님이 마감을 챙겨 보래요: ${title} (${due})` : `${actor}님이 요즘 어떻게 지내는지 궁금해해요. 마감 잘 챙기고 계시죠?`; }
  const roomOwner = n.room_owner_id === myId ? "내" : `${nameOf(n.room_owner_id) ?? ""}님의`;
  return n.kind === "postit" ? `${actor}님이 ${roomOwner} 화이트보드에 포스트잇을 붙였어요` : `${actor}님이 ${roomOwner} 화이트보드에 댓글을 남겼어요`;
}

export default function NotificationsView({
  list, residents, myId, names, villages, villageId, onOpen, onReadAll, onReply,
}: { list: AppNotification[]; residents: Resident[]; myId: string; names: Record<string, string>; villages: VillageInfo[]; villageId: string; onOpen: (n: AppNotification) => void; onReadAll: () => void; onReply: (n: AppNotification) => Promise<string | null> }) {
  const [replied, setReplied] = useState<Record<string, string>>({});
  const unread = list.filter((n) => !n.read_at).length;
  return (
    <Window title="알림" tone="mint" actions={<button type="button" className="btn btn-sm" disabled={!unread} onClick={onReadAll}>모두 읽음</button>}>
      <ul className="p-2">
        {list.length === 0 && <li className="p-4 text-center text-sm text-ink-soft">아직 알림이 없어요.</li>}
        {list.map((n) => (
          <li key={n.id}>
            <button type="button" onClick={() => onOpen(n)} className={`card flex w-[calc(100%-6px)] items-start gap-3 p-2 text-left text-sm ${n.read_at ? "" : "card-on"}`}>
              <span className="mt-1 inline-block h-3 w-3 shrink-0" style={{ background: n.read_at ? "transparent" : "#d9547a" }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block">{notifText(n, residents, myId, names)}{n.read_at ? "" : <span className="sr-only"> (새 알림)</span>}</span>
                {n.summary && <span className="block truncate text-xs text-ink-soft">“{n.summary}”</span>}
                <span className="text-xs text-ink-soft">{relativeTime(n.created_at)}{n.village_id !== villageId && villages.length > 1 ? ` · ${villages.find((x) => x.id === n.village_id)?.name ?? "다른 마을"}` : ""}</span>
              </span>
            </button>
            {n.kind === "gesture" && (
              <div className="px-3 pb-1">
                <button type="button" className="btn btn-sm" disabled={Boolean(replied[n.id])} onClick={async () => { const e = await onReply(n); setReplied((r) => ({ ...r, [n.id]: e ?? "되받아쳤어요!" })); }}>{replied[n.id] ?? "되받아치기"}</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Window>
  );
}
