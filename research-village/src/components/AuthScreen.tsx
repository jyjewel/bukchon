"use client";
import { useState, type FormEvent } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import { Notice, Window } from "./ui";

export default function AuthScreen({ hasInvite }: { hasInvite: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup">(hasInvite ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    const sb = supabase();
    if (mode === "signin") {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setError(errorMessage(error));
    } else {
      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: name.trim() }, emailRedirectTo: window.location.origin + window.location.pathname },
      });
      if (error) setError(errorMessage(error));
      else if (!data.session) setInfo("가입 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 이 화면에서 로그인해 주세요.");
    }
    setBusy(false);
  };

  return (
    <Window title={mode === "signin" ? "마을 들어가기" : "새 연구자 등록"} icon="🔑" tone="rose">
      <form onSubmit={submit} className="space-y-3 p-4">
        {hasInvite && <Notice kind="ok">💌 마을 초대장을 가지고 오셨네요! 로그인하면 바로 입주할 수 있어요.</Notice>}
        <div role="tablist" aria-label="로그인 또는 가입" className="flex gap-2">
          {(["signin", "signup"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} className={`btn flex-1 ${mode === m ? "btn-primary" : ""}`} onClick={() => { setMode(m); setError(""); setInfo(""); }}>
              {m === "signin" ? "로그인" : "처음 왔어요"}
            </button>
          ))}
        </div>
        {mode === "signup" && (
          <div>
            <label className="label" htmlFor="auth-name">이름 (마을에서 불릴 이름)</label>
            <input id="auth-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} required autoComplete="nickname" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="auth-email">이메일</label>
          <input id="auth-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="auth-password">비밀번호 {mode === "signup" && <span className="text-ink-soft">(6자 이상)</span>}</label>
          <input id="auth-password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required autoComplete={mode === "signin" ? "current-password" : "new-password"} />
        </div>
        {error && <Notice kind="error">{error}</Notice>}
        {info && <Notice kind="ok">{info}</Notice>}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? "잠시만요…" : mode === "signin" ? "로그인" : "가입하기"}
        </button>
      </form>
    </Window>
  );
}
