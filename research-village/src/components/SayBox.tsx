"use client";
import { useState, type FormEvent } from "react";
import { SAY_MAX } from "@/lib/constants";

/** 오늘의 말풍선: 내 머리 위에 띄우는 한마디. 12시간 뒤 저절로 사라지고, 언제든 지울 수 있다. */
export default function SayBox({ current, onSay }: { current: string; onSay: (text: string) => void | Promise<void> }) {
  const [text, setText] = useState(current);
  const t = text.trim();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (t && t !== current) await onSay(t);
  };
  return (
    <form onSubmit={submit} className="border-t-[3px] border-dotted border-line p-3">
      <label className="label" htmlFor="say-input">오늘의 말풍선</label>
      <input id="say-input" className="input" maxLength={SAY_MAX} value={text} onChange={(e) => setText(e.target.value)} placeholder="점심 먹고 올게요!" autoComplete="off" />
      <div className="flex gap-1">
        <button type="submit" className="btn btn-sm btn-primary" disabled={!t || t === current}>띄우기</button>
        {current && <button type="button" className="btn btn-sm" onClick={() => { setText(""); void onSay(""); }}>지우기</button>}
      </div>
    </form>
  );
}
