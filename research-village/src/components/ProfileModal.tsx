"use client";
import { STATUS_META } from "@/lib/constants";
import type { DiaryEntry, Resident } from "@/lib/types";
import { CharacterIcon, StatusIcon } from "./Character";
import { EntryCard } from "./DiaryView";
import { Modal } from "./ui";

/** 주민의 미니홈피: 프로필, 지금 상태, 공개한 다이어리 */
export default function ProfileModal({
  resident, isMe, entries, onClose, onEditProfile, onVisit, onChat,
}: { resident: Resident; isMe: boolean; entries: DiaryEntry[]; onClose: () => void; onEditProfile: () => void; onVisit: () => void; onChat: () => void }) {
  const { profile, status } = resident;
  const meta = STATUS_META[resident.shown];
  const theirs = entries.filter((e) => e.author_id === resident.user_id && (isMe || e.visibility !== "private")).slice(0, 5);

  return (
    <Modal title={`${profile.display_name}의 미니홈피`} icon="" tone="rose" onClose={onClose} wide>
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
          {!isMe && (resident.shown === "open"
            ? <button type="button" className="btn btn-mint w-full" onClick={onChat}>대화 신청하기</button>
            : <p className="card p-2 text-center text-xs text-ink-soft">지금은 대화 신청을 받지 않아요.<br />집 앞 책상에 나와 있을 때만 신청할 수 있어요.</p>)}
          {isMe && <button type="button" className="btn w-full" onClick={onEditProfile}>프로필 꾸미기</button>}
        </div>
        <div className="min-w-0 space-y-3">
          <dl className="space-y-2 text-sm">
            <div><dt className="label">연구 분야</dt><dd>{profile.field || <span className="text-ink-soft">아직 적지 않았어요</span>}</dd></div>
            {profile.keywords.length > 0 && (
              <div><dt className="label">관심 키워드</dt><dd className="flex flex-wrap gap-1">{profile.keywords.map((k) => <span key={k} className="chip">#{k}</span>)}</dd></div>
            )}
            {profile.bio && <div><dt className="label">자기소개</dt><dd className="whitespace-pre-wrap break-words">{profile.bio}</dd></div>}
            {resident.online && status.topic && <div><dt className="label">지금 연구하는 주제</dt><dd>{status.topic}</dd></div>}
            {status.reading && <div><dt className="label">읽고 있는 책</dt><dd>{status.reading}</dd></div>}
          </dl>
          <section className="dotted pt-3">
            <h3 className="label">최근 다이어리</h3>
            {theirs.length === 0 ? (
              <p className="text-sm text-ink-soft">{isMe ? "아직 쓴 기록이 없어요." : "아직 나에게 공개된 기록이 없어요."}</p>
            ) : (
              <div className="space-y-2">{theirs.map((e) => <EntryCard key={e.id} entry={e} author={resident} mine={isMe} compact />)}</div>
            )}
          </section>
        </div>
      </div>
    </Modal>
  );
}
