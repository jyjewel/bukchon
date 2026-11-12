"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { STATUS_META } from "@/lib/constants";
import { humanDuration, startOfToday } from "@/lib/time";
import type { DiaryEntry, Resident } from "@/lib/types";
import { CharacterIcon, StatusIcon } from "./Character";
import { EntryCard } from "./DiaryView";
import { Modal } from "./ui";

/** 주민의 미니홈피: 프로필, 지금 상태, 공개한 다이어리 */
export default function ProfileModal({
  resident, isMe, entries, onClose, onEditProfile,
}: { resident: Resident; isMe: boolean; entries: DiaryEntry[]; onClose: () => void; onEditProfile: () => void }) {
  const { profile, status } = resident;
  const meta = STATUS_META[resident.shown];
  const [sharedSeconds, setSharedSeconds] = useState<number | null>(null);
  const theirs = entries.filter((e) => e.author_id === resident.user_id && (isMe || e.visibility !== "private")).slice(0, 5);

  useEffect(() => {
    if (!profile.share_study_time) return;
    let cancelled = false;
    supabase()
      .rpc("village_shared_study", { p_village: status.village_id, p_since: startOfToday().toISOString() })
      .then(({ data }) => {
        const row = (data as { user_id: string; seconds: number }[] | null)?.find((d) => d.user_id === resident.user_id);
        if (!cancelled && row) setSharedSeconds(row.seconds);
      });
    return () => { cancelled = true; };
  }, [profile.share_study_time, status.village_id, resident.user_id]);

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
            {sharedSeconds !== null && <div><dt className="label">오늘의 연구 시간</dt><dd>{sharedSeconds ? humanDuration(sharedSeconds) : "아직 없음"}</dd></div>}
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
