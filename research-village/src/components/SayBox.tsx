"use client";
import { useState, type FormEvent } from "react";
import { SAY_MAX } from "@/lib/constants";

/** 내 머리 위에 띄우는 한마디. 12시간 뒤 저절로 사라지고, 언제든 지울 수 있다. */
export default function SayBox({ current, onSay }: { current: string; onSay: (text: string) => void | Promise<void> }) {
  const [text, setText] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    await onSay(t);
    setText("");
  };
  return (
    <form onSubmit={submit} className="border-t-[3px] border-dotted border-line p-3">
      <label className="label" htmlFor="say-input">머리 위 한마디</label>
      <div className="flex items-start gap-1">
        <input id="say-input" className="input" maxLength={SAY_MAX} value={text} onChange={(e) => setText(e.target.value)} placeholder={current || "점심 먹고 올게요!"} autoComplete="off" />
        <button type="submit" className="btn btn-sm btn-primary mt-[5px] shrink-0" disabled={!text.trim()}>띄우기</button>
      </div>
      {current && (
        <p className="mt-1 flex items-center gap-2 text-xs">
          <span className="min-w-0 flex-1 truncate text-ink-soft">지금: “{current}”</span>
          <button type="button" className="btn btn-sm shrink-0" onClick={() => void onSay("")}>지우기</button>
        </p>
      )}
    </form>
  );
}
