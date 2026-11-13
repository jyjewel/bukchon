"use client";
import { useState } from "react";
import { GESTURES, GIFTS, type GestureId, type GiftId } from "@/lib/social";

type Result = string | null; // 오류 문구, 성공이면 null

/** 이웃에게 마음 전하기: 논문 던지기(장난), 커피·간식, 책 추천, 마감 독촉 */
export default function GiveBox({
  name, nudgeDays, onGesture, onGift, onTip, onNudge,
}: {
  name: string;
  /** 3일 넘게 안 들어온 이웃이면 며칠째인지, 아니면 null */
  nudgeDays: number | null;
  onGesture: (kind: GestureId) => Promise<Result> | Result;
  onGift: (kind: GiftId, note: string) => Promise<Result> | Result;
  onTip: (title: string, note: string) => Promise<Result> | Result;
  onNudge: () => Promise<Result> | Result;
}) {
  const [note, setNote] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookNote, setBookNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const done = async (p: Promise<Result> | Result, okText: string, after?: () => void) => {
    const err = await p;
    setMsg(err ? { ok: false, text: err } : { ok: true, text: okText });
    if (!err) after?.();
  };
  return (
    <section aria-label={`${name}님께 마음 전하기`} className="space-y-3">
      <div>
        <h3 className="label">논문 던지기 <span className="text-ink-soft">(장난)</span></h3>
        <div className="flex flex-wrap gap-1.5">
          {GESTURES.map((g) => (
            <button key={g.id} type="button" className="btn btn-sm" onClick={() => void done(onGesture(g.id), `${name}님에게 ${g.label}을(를) 던졌어요!`)}>{g.label}</button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="label">건네기 <span className="text-ink-soft">(상대 책상 위에 하루 동안 올라가요)</span></h3>
        <div className="flex flex-wrap items-center gap-1.5">
          {GIFTS.map((g) => (
            <button key={g.id} type="button" className="btn btn-sm btn-mint" onClick={() => void done(onGift(g.id, note.trim()), `${name}님에게 ${g.label}을(를) 건넸어요.`, () => setNote(""))}>{g.label}</button>
          ))}
        </div>
        <label className="sr-only" htmlFor="give-note">건넬 때 한마디</label>
        <input id="give-note" className="input mt-1" maxLength={40} value={note} onChange={(e) => setNote(e.target.value)} placeholder="한마디 (선택, 예: 힘내요!)" />
      </div>
      <div>
        <h3 className="label">책 추천해서 책장에 꽂아 주기</h3>
        <div className="flex flex-wrap items-start gap-1.5">
          <div className="min-w-36 flex-[2]"><label className="sr-only" htmlFor="tip-title">추천할 책 제목</label><input id="tip-title" className="input" maxLength={100} value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} placeholder="책 제목" /></div>
          <div className="min-w-32 flex-1"><label className="sr-only" htmlFor="tip-note">추천 한마디</label><input id="tip-note" className="input" maxLength={100} value={bookNote} onChange={(e) => setBookNote(e.target.value)} placeholder="한마디 (선택)" /></div>
          <button type="button" className="btn btn-primary btn-sm mt-[5px]" disabled={!bookTitle.trim()} onClick={() => void done(onTip(bookTitle.trim(), bookNote.trim()), `《${bookTitle.trim()}》을(를) ${name}님 책장에 꽂아 두었어요.`, () => { setBookTitle(""); setBookNote(""); })}>추천하기</button>
        </div>
      </div>
      {nudgeDays !== null && (
        <div className="dotted pt-2">
          <p className="mb-1 text-xs text-ink-soft">{name}님이 {nudgeDays}일째 안 오고 있어요.</p>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => void done(onNudge(), "마감을 챙겨 보라고 알려 드렸어요.")}>마감 독촉하기</button>
        </div>
      )}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "" : "text-[#c0392b]"}`}>{msg.text}</p>}
    </section>
  );
}
