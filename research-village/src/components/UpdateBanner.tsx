"use client";
import { useEffect, useState } from "react";
import { stopPoll, visibleInterval } from "@/lib/poll";

const BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** 앱(홈 화면에 추가한 것)은 새로고침하기 어렵다. 새 버전이 배포되면 알려 주고, 눌러서 바로 새로고침한다. */
export default function UpdateBanner() {
  const [stale, setStale] = useState(false);
  useEffect(() => {
    if (!BUILD) return;
    let alive = true;
    const check = async () => {
      try {
        const r = await fetch(`${BASE}/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { id?: string };
        if (alive && j.id && j.id !== BUILD) setStale(true);
      } catch { /* 연결이 없으면 다음에 다시 본다 */ }
    };
    void check();
    const id = visibleInterval(() => void check(), 5 * 60_000);
    return () => { alive = false; stopPoll(id); };
  }, []);
  if (!stale) return null;
  return (
    <div role="status" className="card flex items-center gap-2 px-3 py-2 text-sm" style={{ background: "#fff3c4" }}>
      <span className="flex-1">새 버전이 나왔어요.</span>
      <button type="button" className="btn btn-sm btn-primary" onClick={() => window.location.reload()}>새로고침</button>
    </div>
  );
}
