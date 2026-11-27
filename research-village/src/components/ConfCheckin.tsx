"use client";
import { useEffect, useState } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import { roleLabel } from "@/lib/conference";
import { Window } from "./ui";

/** 현장 QR(주소의 ?conf=코드)로 들어오면, 로그인한 뒤 바로 참석을 확인하고 명찰이 생겼다고 알려 준다 */
export default function ConfCheckin({ code, onDone }: { code: string; onDone: () => void }) {
  const [state, setState] = useState<{ kind: "wait" } | { kind: "ok"; title: string; role: string } | { kind: "err"; text: string }>({ kind: "wait" });
  useEffect(() => {
    let alive = true;
    void supabase().rpc("checkin_conference", { p_code: code }).then(({ data, error }) => {
      if (!alive) return;
      if (error) {
        const m = error.message;
        return setState({ kind: "err", text: m.includes("invalid_code") ? "코드가 맞지 않아요." : m.includes("not_today") ? "아직 열리지 않았거나 지난 학회예요. 행사일과 다음 날까지만 참석을 남길 수 있어요." : errorMessage(error) });
      }
      const r = data as { title: string; role: string };
      setState({ kind: "ok", title: r.title, role: r.role });
    });
    return () => { alive = false; };
  }, [code]);
  return (
    <Window title="학회 참석 확인" tone="lilac" className="mx-auto max-w-md">
      <div className="space-y-3 p-4 text-center">
        {state.kind === "wait" && <p className="text-sm text-ink-soft">참석을 확인하는 중…</p>}
        {state.kind === "ok" && (
          <>
            <p className="font-display text-lg">‘{state.title}’ 참석을 확인했어요! 🎉</p>
            <p className="text-sm">내 연구실의 ‘학회 명찰’에 {roleLabel(state.role)} 명찰이 생겼어요.</p>
          </>
        )}
        {state.kind === "err" && <p role="alert" className="text-sm text-[#c0392b]">{state.text}</p>}
        <button type="button" className="btn btn-primary" onClick={onDone}>마을로 가기</button>
      </div>
    </Window>
  );
}
