"use client";
import { useState, type FormEvent } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import { Notice } from "./ui";

/** 새 비밀번호 정하기 (설정에서 바꿀 때와, 재설정 메일의 링크로 들어왔을 때 같이 쓴다) */
export default function PasswordForm({ onDone, submitLabel = "비밀번호 바꾸기" }: { onDone?: () => void; submitLabel?: string }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return setMsg({ kind: "error", text: "비밀번호는 6자 이상으로 해 주세요." });
    if (pw !== pw2) return setMsg({ kind: "error", text: "두 비밀번호가 달라요. 다시 확인해 주세요." });
    setBusy(true); setMsg(null);
    const { error } = await supabase().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      const t = errorMessage(error);
      return setMsg({ kind: "error", text: t.includes("different from the old") ? "예전과 다른 비밀번호로 정해 주세요." : t });
    }
    setPw(""); setPw2("");
    setMsg({ kind: "ok", text: "비밀번호를 바꿨어요." });
    onDone?.();
  };
  return (
    <form onSubmit={submit} className="space-y-2" aria-label="비밀번호 바꾸기">
      <div>
        <label className="label" htmlFor="pw-new">새 비밀번호 <span className="text-ink-soft">(6자 이상)</span></label>
        <input id="pw-new" type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required autoComplete="new-password" />
      </div>
      <div>
        <label className="label" htmlFor="pw-new2">새 비밀번호 한 번 더</label>
        <input id="pw-new2" type="password" className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={6} required autoComplete="new-password" />
      </div>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <button type="submit" className="btn btn-primary" disabled={busy || !pw || !pw2}>{busy ? "잠시만요…" : submitLabel}</button>
    </form>
  );
}
