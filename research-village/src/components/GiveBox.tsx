"use client";
import { useState } from "react";
import { GESTURES, GIFTS, type GestureId, type GiftId } from "@/lib/social";

type Result = string | null; // 오류 문구, 성공이면 null

function useFeedback() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const done = async (p: Promise<Result> | Result, okText: string, after?: () => void) => {
    const err = await p;
    setMsg(err ? { ok: false, text: err } : { ok: true, text: okText });
    if (!err) after?.();
  };
  const view = msg ? <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "" : "text-[#c0392b]"}`}>{msg.text}</p> : null;
  return { done, view };
}

/** 던지기: 마을에서 밖에 나와 있는 이웃에게 (논문·각주 폭탄·빨간 펜·마감 알람) */
export function ThrowBox({ name, onGesture }: { name: string; onGesture: (kind: GestureId) => Promise<Result> | Result }) {
  const { done, view } = useFeedback();
  return (
    <section aria-label={`${name}님께 던지기`} className="space-y-1">
      <h3 className="label">던지기</h3>
      <div className="flex flex-wrap gap-1.5">
        {GESTURES.map((g) => (
          <button key={g.id} type="button" className="btn btn-sm" onClick={() => void done(onGesture(g.id), `${name}님에게 ${g.label}을(를) 던졌어요!`)}>{g.label}</button>
        ))}
      </div>
      {view}
    </section>
  );
}

/** 건네기: 상대 연구실 책상에 올려 두는 커피·간식 */
export function GiftBox({ name, onGift, onDone }: { name: string; onGift: (kind: GiftId, note: string) => Promise<Result> | Result; onDone?: () => void }) {
  const [note, setNote] = useState("");
  const { done, view } = useFeedback();
  return (
    <section aria-label={`${name}님 책상에 건네기`} className="space-y-2">
      <p className="text-sm text-ink-soft">책상 위에 하루 동안 올라가요. 보낸 사람과 한마디는 {name}님에게만 보여요.</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {GIFTS.map((g) => (
          <button key={g.id} type="button" className="btn btn-sm btn-mint" onClick={() => void done(onGift(g.id, note.trim()), `${name}님 책상에 ${g.label}을(를) 올려 두었어요.`, () => { setNote(""); onDone?.(); })}>{g.label}</button>
        ))}
      </div>
      <label className="sr-only" htmlFor="give-note">건넬 때 한마디</label>
      <input id="give-note" className="input" maxLength={40} value={note} onChange={(e) => setNote(e.target.value)} placeholder="한마디 (선택, 예: 힘내요!)" />
      {view}
    </section>
  );
}

/** 책 추천: 상대 책장에 꽂아 주기 */
export function TipBox({ name, onTip }: { name: string; onTip: (title: string, note: string) => Promise<Result> | Result }) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const { done, view } = useFeedback();
  return (
    <section aria-label={`${name}님 책장에 책 추천하기`} className="space-y-1">
      <h3 className="label">책 추천해서 꽂아 주기</h3>
      <div className="flex flex-wrap items-start gap-1.5">
        <div className="min-w-36 flex-[2]"><label className="sr-only" htmlFor="tip-title">추천할 책 제목</label><input id="tip-title" className="input" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="책 제목" /></div>
        <div className="min-w-32 flex-1"><label className="sr-only" htmlFor="tip-note">추천 한마디</label><input id="tip-note" className="input" maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} placeholder="한마디 (선택)" /></div>
        <button type="button" className="btn btn-primary btn-sm mt-[5px]" disabled={!title.trim()} onClick={() => void done(onTip(title.trim(), note.trim()), `《${title.trim()}》을(를) ${name}님 책장에 꽂아 두었어요.`, () => { setTitle(""); setNote(""); })}>추천하기</button>
      </div>
      {view}
    </section>
  );
}

/** 마감 독촉: 3일 넘게 안 들어온 이웃에게 */
export function NudgeBox({ name, days, onNudge }: { name: string; days: number; onNudge: () => Promise<Result> | Result }) {
  const { done, view } = useFeedback();
  return (
    <section aria-label={`${name}님께 마감 독촉하기`} className="dotted space-y-1 pt-2">
      <p className="text-xs text-ink-soft">{name}님이 {days}일째 안 오고 있어요.</p>
      <button type="button" className="btn btn-sm btn-danger" onClick={() => void done(onNudge(), "마감을 챙겨 보라고 알려 드렸어요.")}>마감 독촉하기</button>
      {view}
    </section>
  );
}
