"use client";
import { STATUS_META } from "@/lib/constants";
import type { Resident } from "@/lib/types";
import { awayDays } from "@/lib/social";
import { CharacterIcon, StatusIcon } from "./Character";
import { NudgeBox, ThrowBox } from "./GiveBox";
import { Modal } from "./ui";

/** 주민의 프로필: 지금 상태와 소개 */
export default function ProfileModal({
  resident, isMe, onClose, onEditProfile, onVisit, onChat, give,
}: { resident: Resident; isMe: boolean; onClose: () => void; onEditProfile: () => void; onVisit: () => void; onChat: () => void; give: { onGesture: React.ComponentProps<typeof ThrowBox>["onGesture"]; onNudge: React.ComponentProps<typeof NudgeBox>["onNudge"] } }) {
  const { profile, status } = resident;
  const meta = STATUS_META[resident.shown];

  return (
    <Modal title={`${profile.display_name}의 프로필`} icon="" tone="rose" onClose={onClose} wide>
      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <div className="space-y-2">
          <div className="card flex flex-col items-center gap-1 p-3">
            <CharacterIcon avatar={profile.avatar} size={130} />
            <p className="font-display text-lg">{profile.display_name}</p>
            {resident.role === "admin" && <span className="chip">마을 관리자</span>}
          </div>
          <div className="card p-2 text-center text-sm" style={{ background: `${meta.color}33` }}>
            <p className="flex items-center justify-center gap-2"><StatusIcon state={resident.shown} scale={2} /> {meta.label}</p>
            <p className="text-xs">{meta.where}</p>
            {!isMe && <p className="mt-1 text-xs text-ink-soft">{meta.talk}</p>}
          </div>
          {!isMe && <button type="button" className="btn btn-primary w-full" onClick={onVisit}>연구실 방문하기</button>}
          {!isMe && resident.shown === "open" && <button type="button" className="btn btn-mint w-full" onClick={onChat}>대화 신청하기</button>}
          {isMe && <button type="button" className="btn w-full" onClick={onEditProfile}>프로필 꾸미기</button>}
        </div>
        <div className="min-w-0 space-y-3">
          <dl className="space-y-2 text-sm">
            <div><dt className="label">연구 분야</dt><dd>{profile.field || <span className="text-ink-soft">아직 적지 않았어요</span>}</dd></div>
            {profile.bio && <div><dt className="label">자기소개</dt><dd className="whitespace-pre-wrap break-words">{profile.bio}</dd></div>}
            {resident.online && status.topic && <div><dt className="label">지금 연구하는 주제</dt><dd>{status.topic}</dd></div>}
            {status.reading && <div><dt className="label">읽고 있는 책</dt><dd>{status.reading}</dd></div>}
          </dl>
          {!isMe && (() => {
            const out = ["rest", "library", "open"].includes(resident.shown);
            const days = !resident.online ? awayDays(status.left_at ?? status.last_seen_at) : 0;
            return (
              <div className="dotted space-y-2 pt-3">
                {out ? <ThrowBox name={profile.display_name} onGesture={give.onGesture} /> : <p className="text-xs text-ink-soft">던지기는 이웃이 마을에 나와 있을 때(광장·도서관·집 앞 책상) 할 수 있어요. 커피나 책은 연구실에 가서 건네 보세요.</p>}
                {days >= 3 && <NudgeBox name={profile.display_name} days={days} onNudge={give.onNudge} />}
              </div>
            );
          })()}
        </div>
      </div>
    </Modal>
  );
}
