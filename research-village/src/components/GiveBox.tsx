"use client";
import { useMemo, useState } from "react";
import { GESTURES, GIFTS, SNACK_IDS, type GestureId, type GiftId } from "@/lib/social";
import { snackGrid, type SnackId } from "@/pixel/snacks";
import PixelArt from "./PixelArt";

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

/** 던지기: 마을에서 밖에 나와 있는 이웃에게 (학위논문·마감 알림·학회 하고 남은 과자) */
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
  const drinks = GIFTS.filter((g) => !(SNACK_IDS as readonly string[]).includes(g.id));
  const snacks = GIFTS.filter((g) => (SNACK_IDS as readonly string[]).includes(g.id));
  const arts = useMemo(() => Object.fromEntries(SNACK_IDS.map((id) => [id, snackGrid(id)])) as Record<SnackId, ReturnType<typeof snackGrid>>, []);
  const [pick, setPick] = useState<GiftId | null>(null);
  const picked = GIFTS.find((g) => g.id === pick);
  const send = () => { if (picked) void done(onGift(picked.id, note.trim()), `${name}님 책상에 ${picked.label}을(를) 올려 두었어요.`, () => { setNote(""); setPick(null); onDone?.(); }); };
  return (
    <section aria-label={`${name}님 책상에 건네기`} className="space-y-2">
      <p className="text-sm text-ink-soft">책상 위에 하루 동안 올라가요. 보낸 사람과 한마디는 {name}님에게만 보여요.</p>
      <p className="label">음료</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {drinks.map((g) => (
          <button key={g.id} type="button" className={`btn btn-sm btn-mint ${pick === g.id ? "ring-2 ring-ink" : ""}`} aria-pressed={pick === g.id} onClick={() => setPick(g.id)}>{g.label}</button>
        ))}
      </div>
      <p className="label">간식</p>
      <div className="flex flex-wrap items-stretch gap-1.5" role="group" aria-label="간식">
        {snacks.map((g) => (
          <button key={g.id} type="button" className={`card flex w-[88px] flex-col items-center px-1 pb-1 pt-1.5 text-center hover:bg-[#fff3c4] ${pick === g.id ? "bg-[#fff3c4] ring-2 ring-ink" : ""}`} aria-pressed={pick === g.id} onClick={() => setPick(g.id)}>
            <PixelArt art={arts[g.id as SnackId]} scale={3} label={`${g.label} 도트 그림`} />
            <span className="mt-1 block text-xs leading-tight">{g.label}</span>
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor="give-note">건넬 때 한마디</label>
      <input id="give-note" className="input" maxLength={40} value={note} onChange={(e) => setNote(e.target.value)} placeholder="한마디 (선택, 예: 힘내요!)" />
      <button type="button" className="btn btn-primary btn-sm" disabled={!picked} onClick={send}>{picked ? `${picked.label} 보내기` : "보낼 것을 골라 주세요"}</button>
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
