"use client";
import { useEffect, useMemo, useState } from "react";
import { owlGrid } from "@/pixel/owl";
import { markWelcomeRead, setWelcome, welcomeReadOnServer, welcomeState } from "@/lib/welcome";
import PixelArt from "./PixelArt";
import WelcomeLetter from "./WelcomeLetter";

/** 처음 접속했을 때만: 부엉이가 날아와 편지를 내려놓는다. 눌러서 읽고 나면 서랍에 보관된다. */
export default function WelcomeOwl({ userId }: { userId: string }) {
  const [state, setState] = useState(() => welcomeState(userId));
  const [checked, setChecked] = useState(() => welcomeState(userId) === "read");   // 다른 기기에서 이미 읽었는지 서버에 물어보기 전에는 부엉이를 보내지 않는다
  useEffect(() => {
    if (checked) return;
    let alive = true;
    void welcomeReadOnServer(userId).then((done) => { if (!alive) return; if (done) { setWelcome(userId, "read"); setState("read"); } setChecked(true); });
    return () => { alive = false; };
  }, [checked, userId]);
  const [flap, setFlap] = useState(false);
  const [landed, setLanded] = useState(state === "delivered");
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const wings = useMemo(() => [owlGrid(false), owlGrid(true)], []);
  useEffect(() => {
    if (state !== "new" || !checked) return;
    const t = setInterval(() => setFlap((f) => !f), 220);
    const done = setTimeout(() => { clearInterval(t); setFlap(false); setLanded(true); setWelcome(userId, "delivered"); setState("delivered"); }, 2600);
    return () => { clearInterval(t); clearTimeout(done); };
  }, [state, userId, checked]);
  useEffect(() => { if (!saved) return; const t = setTimeout(() => setSaved(false), 5000); return () => clearTimeout(t); }, [saved]);

  if (!checked) return null;
  if (state === "read") return saved ? <p role="status" className="pinned above-nav fixed left-1/2 z-40 -translate-x-1/2 card px-4 py-2 text-sm">편지는 ‘내 연구실 → 편지 서랍’에 넣어 뒀어요 ✉</p> : null;
  return (
    <>
      <div className={`pinned owl-visit ${landed ? "owl-landed" : "owl-flying"}`}>
        <div className={landed ? "owl-bob" : ""}><PixelArt art={wings[flap ? 1 : 0]} scale={4} label="편지를 물어온 부엉이" /></div>
        {landed && (
          <span className="owl-btn flex items-center gap-1">
            <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>부엉이가 편지를 가져왔어요 ✉</button>
            <button type="button" className="btn btn-sm" aria-label="부엉이 접기 (편지는 편지 서랍에 넣어 둬요)" title="접기" onClick={() => { void markWelcomeRead(userId); setState("read"); setSaved(true); }}>✕</button>
          </span>
        )}
      </div>
      {open && <WelcomeLetter first onClose={() => { setOpen(false); void markWelcomeRead(userId); setState("read"); setSaved(true); }} />}
    </>
  );
}
