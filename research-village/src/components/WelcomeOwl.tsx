"use client";
import { useEffect, useMemo, useState } from "react";
import { owlGrid } from "@/pixel/owl";
import { setWelcome, welcomeState } from "@/lib/welcome";
import PixelArt from "./PixelArt";
import WelcomeLetter from "./WelcomeLetter";

/** 처음 접속했을 때만: 부엉이가 날아와 편지를 내려놓는다. 눌러서 읽고 나면 서랍에 보관된다. */
export default function WelcomeOwl({ userId }: { userId: string }) {
  const [state, setState] = useState(() => welcomeState(userId));
  const [flap, setFlap] = useState(false);
  const [landed, setLanded] = useState(state === "delivered");
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const wings = useMemo(() => [owlGrid(false), owlGrid(true)], []);
  useEffect(() => {
    if (state !== "new") return;
    const t = setInterval(() => setFlap((f) => !f), 220);
    const done = setTimeout(() => { clearInterval(t); setFlap(false); setLanded(true); setWelcome(userId, "delivered"); setState("delivered"); }, 2600);
    return () => { clearInterval(t); clearTimeout(done); };
  }, [state, userId]);
  useEffect(() => { if (!saved) return; const t = setTimeout(() => setSaved(false), 5000); return () => clearTimeout(t); }, [saved]);

  if (state === "read") return saved ? <p role="status" className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 card px-4 py-2 text-sm">편지는 ‘내 연구실 → 편지 서랍’에 넣어 뒀어요 ✉</p> : null;
  return (
    <>
      <div className={`owl-visit ${landed ? "owl-landed" : "owl-flying"}`}>
        <div className={landed ? "owl-bob" : ""}><PixelArt art={wings[flap ? 1 : 0]} scale={4} label="편지를 물어온 부엉이" /></div>
        {landed && <button type="button" className="btn btn-primary owl-btn" onClick={() => setOpen(true)}>부엉이가 편지를 가져왔어요 ✉</button>}
      </div>
      {open && <WelcomeLetter first onClose={() => { setOpen(false); setWelcome(userId, "read"); setState("read"); setSaved(true); }} />}
    </>
  );
}
