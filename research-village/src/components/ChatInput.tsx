"use client";
import { useLayoutEffect, useRef } from "react";

/**
 * 채팅 입력칸. 한 줄 입력칸(input)은 아이폰이 이름·주소 칸으로 착각해 '자동 완성 연락처'를 띄우므로,
 * 한 줄처럼 보이지만 안은 여러 줄 입력칸(textarea)으로 만든다. 줄바꿈 키로 보내고, 길면 알아서 늘어난다.
 */
export default function ChatInput({ id, value, onChange, placeholder, maxLength, label }: { id: string; value: string; onChange: (v: string) => void; placeholder: string; maxLength: number; label?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [value]);
  return (
    <textarea
      ref={ref} id={id} aria-label={label} className="input min-w-0 flex-1 resize-none" rows={1} maxLength={maxLength} value={value}
      autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} enterKeyHint="send"
      onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))}
      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
      placeholder={placeholder}
    />
  );
}
