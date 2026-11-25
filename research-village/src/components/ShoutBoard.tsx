"use client";
import ChatInput from "./ChatInput";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import { relativeTime } from "@/lib/time";
import { useShouts } from "@/hooks/useShouts";
import type { Resident } from "@/lib/types";
import { CharacterIcon } from "./Character";
import { Notice, Window } from "./ui";

/** 광장 전체 채팅방: 광장에 나와 있는 주민이 모두에게 외치고, 마을 주민 모두가 읽는다. */
export default function ShoutBoard({
  villageId, myId, isAdmin, residents, inPlaza, onGoPlaza, onProfile,
}: { villageId: string; myId: string; isAdmin: boolean; residents: Resident[]; inPlaza: boolean; onGoPlaza: () => void; onProfile: (userId: string) => void }) {
  const { shouts, loaded, reload } = useShouts(villageId);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  const lastId = shouts[shouts.length - 1]?.id;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    const { error } = await supabase().from("shouts").insert({ village_id: villageId, author_id: myId, body });
    if (error) {
      setText(body);
      setError(/row-level security/i.test(error.message) ? "광장에 나와 있을 때만 외칠 수 있어요." : errorMessage(error));
    } else setError("");
    await reload();
  };
  const remove = async (id: string) => {
    const { error } = await supabase().from("shouts").delete().eq("id", id);
    if (error) setError(errorMessage(error));
    await reload();
  };

  return (
    <Window title="광장 전체 채팅방" tone="butter">
      <ul ref={listRef} className="max-h-60 min-h-[120px] space-y-2 overflow-y-auto p-3 max-lg:space-y-1 max-lg:p-2" aria-live="polite" aria-label="광장에서 외친 말">
        {loaded && shouts.length === 0 && <li className="py-4 text-center text-sm text-ink-soft">아직 외친 사람이 없어요.</li>}
        {shouts.map((s) => {
          const who = residents.find((r) => r.user_id === s.author_id);
          const mine = s.author_id === myId;
          return (
            <li key={s.id} className={`flex items-end gap-2 max-lg:items-start ${mine ? "flex-row-reverse" : ""}`}>
              {who ? <><button type="button" aria-label={`${who.profile.display_name} 프로필 보기`} onClick={() => onProfile(who.user_id)} className="flex w-[44px] shrink-0 flex-col items-center lg:hidden"><CharacterIcon avatar={who.profile.avatar} size={36} headOnly /><span className="mt-[3px] w-full truncate text-center text-[10px] leading-[12px] text-ink-soft">{who.profile.display_name}</span></button><button type="button" aria-label={`${who.profile.display_name} 프로필 보기`} onClick={() => onProfile(who.user_id)} className="hidden shrink-0 lg:inline"><CharacterIcon avatar={who.profile.avatar} size={36} /></button></> : <span className="w-[27px]" />}
              <div className={`min-w-0 max-w-[80%] ${mine ? "text-right" : ""}`}>
                <p className="text-xs text-ink-soft max-lg:hidden">{who?.profile.display_name ?? "떠난 주민"}<span className="max-lg:hidden"> · {relativeTime(s.created_at)}</span></p>
                <p className="px-box inline-block break-words px-2 py-1 text-left text-sm max-lg:inline-flex max-lg:min-h-[28px] max-lg:items-center max-lg:px-1.5 max-lg:py-0.5 max-lg:text-[14px] max-lg:leading-[18px]" style={{ background: mine ? "#ffc9d6" : "#fffdf6", ["--px" as string]: "1px" }}>{s.body}</p>
                {(mine || isAdmin) && <button type="button" className="ml-1 text-xs text-ink-soft underline max-lg:hidden" onClick={() => void remove(s.id)}>삭제</button>}
                <p className="mt-[3px] text-xs [font-size:11px] leading-[14px] text-ink-soft lg:hidden">{relativeTime(s.created_at)}{(mine || isAdmin) && <button type="button" className="ml-1.5 underline" onClick={() => void remove(s.id)}>삭제</button>}</p>
              </div>
            </li>
          );
        })}
      </ul>
      {error && <div className="px-3 pb-2"><Notice kind="error">{error}</Notice></div>}
      {inPlaza ? (
        <form onSubmit={send} className="flex items-start gap-1 border-t border-ink p-2">
          <label className="sr-only" htmlFor="shout-input">모두에게 외치기</label>
          <ChatInput id="shout-input" maxLength={100} value={text} onChange={setText} placeholder="광장에서 모두에게 외치기" />
          <button type="submit" className="btn btn-primary shrink-0 whitespace-nowrap" disabled={!text.trim()}>외치기</button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-2 border-t border-ink p-2 text-sm">
          <span className="flex-1 text-ink-soft">광장에 나오면 모두에게 외칠 수 있어요.</span>
          <button type="button" className="btn btn-sm btn-primary" onClick={onGoPlaza}>광장으로 가기</button>
        </div>
      )}
    </Window>
  );
}
