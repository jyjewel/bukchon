"use client";
import { useCallback, useEffect, useState } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import { dateKey } from "@/lib/time";
import { roleLabel, type ConfRole } from "@/lib/conference";
import { Notice } from "./ui";

interface Attendee { user_id: string; display_name: string; role: ConfRole; talk_title: string | null; checked_at: string }

/** 학회 소식 올린 사람 칸: 참석 확인을 켜고, 현장에서 알려 줄 암호와 참석자 명단을 다룬다 */
export default function ConferenceHost({ postId, eventDate, onChanged }: { postId: string; eventDate: string | null; onChanged: () => void }) {
  const [date, setDate] = useState(eventDate ?? dateKey());
  const [code, setCode] = useState<string | null>(null);
  const [people, setPeople] = useState<Attendee[]>([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    const c = await sb.rpc("conference_code", { p_post: postId });
    setCode((c.data as string | null) ?? null);
    const a = await sb.rpc("conference_attendees", { p_post: postId });
    if (a.data) setPeople(a.data as Attendee[]);
  }, [postId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 불러온다
    if (eventDate) void load();
  }, [eventDate, load]);
  const enable = async () => {
    setMsg("");
    const { error } = await supabase().rpc("enable_conference_checkin", { p_post: postId, p_date: date });
    if (error) return setMsg(error.message.includes("bad_date") ? "행사일은 어제부터 1년 안의 날짜로 정해 주세요." : errorMessage(error));
    onChanged();
    await load();
  };
  return (
    <div className="mt-2 space-y-2 rounded border border-line p-2" style={{ background: "#f6f2ff" }}>
      <p className="font-display text-sm">내가 게시한 학회 · 참석 암호</p>
      {!code ? (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="label" htmlFor={`cd-${postId}`}>행사일</label>
            <input id={`cd-${postId}`} type="date" className="input !w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => void enable()}>참석 확인 켜기</button>
          <p className="w-full text-xs text-ink-soft">켜면 이 학회만의 특별한 암호(예: 금색코끼리)가 생겨요. 암호는 소식을 올린 나만 볼 수 있고, 참석자는 행사일과 다음 날까지 암호를 입력할 수 있어요. 같은 제목·같은 행사일로 여러 마을에 올리면 암호와 명찰은 하나로 합쳐져요.</p>
        </div>
      ) : (
        <>
          <div className="space-y-1 text-sm">
            <p>참석 암호: <b className="font-display text-2xl tracking-wider">{code}</b></p>
            <p className="text-xs text-ink-soft">행사일 {eventDate} · 현장에서 참석자에게만 알려 주세요. 참석자는 게시판의 “학회 참석 확인” 칸에 이 암호를 입력해요.</p>
          </div>
          <ul className="space-y-1" aria-label="참석자">
            {people.map((p) => (
              <li key={p.user_id} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 break-words">{p.display_name}{p.talk_title && <span className="text-xs text-ink-soft"> · “{p.talk_title}”</span>}</span>
                <span className="chip shrink-0">{roleLabel(p.role)}</span>
              </li>
            ))}
            {people.length <= 1 && <li className="text-xs text-ink-soft">아직 참석 확인한 사람이 없어요.</li>}
          </ul>
        </>
      )}
      {msg && <Notice kind="error">{msg}</Notice>}
    </div>
  );
}
