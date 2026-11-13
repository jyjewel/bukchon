"use client";
import { useEffect, useState } from "react";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/push";
import { Notice } from "./ui";

/** 설정 > 폰 알림: 이 기기에서 푸시 알림을 켜고 끈다 */
export default function PushSettings() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void pushState().then(setState); }, []);

  const toggle = async () => {
    setBusy(true); setError(null);
    const e = state === "on" ? await disablePush() : await enablePush();
    if (e) setError(e);
    setState(await pushState());
    setBusy(false);
  };

  return (
    <div className="space-y-2 p-3 text-sm">
      <p className="text-ink-soft">이웃이 던지기·선물·메시지를 보내면 폰 알림으로 알려 줘요. 마을을 열어 보고 있을 때와 ‘집중 연구’ 중에는 울리지 않아요. 알림 내용에는 글 내용이 들어가지 않아요.</p>
      {error && <Notice kind="error">{error}</Notice>}
      {state === null && <p className="text-ink-soft">확인하는 중…</p>}
      {state === "unsupported" && <p className="text-ink-soft">이 브라우저는 푸시 알림을 지원하지 않아요.</p>}
      {state === "needs-install" && <Notice kind="info">아이폰은 먼저 사파리에서 공유 버튼 → ‘홈 화면에 추가’로 앱을 설치하고, 설치한 앱을 열어서 여기서 켜 주세요. (iOS 16.4 이상)</Notice>}
      {state === "denied" && <Notice kind="error">이 기기에서 알림이 차단되어 있어요. 브라우저(또는 폰) 설정에서 이 사이트의 알림을 허용한 뒤 다시 눌러 주세요.</Notice>}
      {(state === "off" || state === "on") && (
        <div className="flex items-center gap-3">
          <button type="button" className={`btn ${state === "on" ? "" : "btn-primary"}`} disabled={busy} onClick={() => void toggle()}>
            {busy ? "처리 중…" : state === "on" ? "이 기기 알림 끄기" : "이 기기에서 알림 받기"}
          </button>
          <span className="text-xs text-ink-soft" role="status">{state === "on" ? "✓ 이 기기에서 알림을 받고 있어요" : "꺼져 있어요"}</span>
        </div>
      )}
    </div>
  );
}
