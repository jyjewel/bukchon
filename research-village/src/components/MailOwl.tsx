"use client";
import { useEffect, useMemo, useState } from "react";
import { owlGrid } from "@/pixel/owl";
import { supabase } from "@/lib/supabase";
import { setWelcome, welcomeReadOnServer, welcomeState } from "@/lib/welcome";
import PixelArt from "./PixelArt";
import { MailLetterModal, type MailLetter } from "./WelcomeLetter";

const FRESH_MS = 14 * 86400_000;   // 오래된 편지가 한꺼번에 쏟아지지 않게, 최근 2주 안의 읽지 않은 편지만 부엉이가 가져온다

/** 운영자가 마을에 보내는 편지는 모두 부엉이가 가져다 준다. 안 읽은 편지가 있으면 날아와서 내려놓고, 읽으면 서랍에 보관된다. */
export default function MailOwl({ userId }: { userId: string }) {
  const [queue, setQueue] = useState<MailLetter[]>([]);
  const [open, setOpen] = useState<MailLetter | null>(null);
  const [landed, setLanded] = useState(false);
  const [flap, setFlap] = useState(false);
  const wings = useMemo(() => [owlGrid(false), owlGrid(true)], []);

  useEffect(() => {
    let alive = true;
    (async () => {
      // 사용법 편지를 가져오는 부엉이가 먼저다(겹쳐서 날아오지 않게)
      if (welcomeState(userId) !== "read") {
        if (!(await welcomeReadOnServer(userId))) return;
        setWelcome(userId, "read");
      }
      const sb = supabase();
      const [m, r] = await Promise.all([
        sb.from("mail_letters").select("id, title, body, icon, created_at").gt("created_at", new Date(Date.now() - FRESH_MS).toISOString()).order("created_at"),
        sb.from("mail_letter_reads").select("letter_id").eq("user_id", userId),
      ]);
      if (!alive || m.error || r.error) return;
      const seen = new Set((r.data ?? []).map((x) => x.letter_id as string));
      setQueue(((m.data ?? []) as MailLetter[]).filter((x) => !seen.has(x.id)));
    })();
    return () => { alive = false; };
  }, [userId]);

  const first = queue[0];
  useEffect(() => {
    if (!first || landed) return;   // 처음 한 번만 날아오는 모습을 보여 준다
    const t = setInterval(() => setFlap((f) => !f), 220);
    const done = setTimeout(() => { clearInterval(t); setFlap(false); setLanded(true); }, 2600);
    return () => { clearInterval(t); clearTimeout(done); };
  }, [first, landed]);

  const markRead = async (ids: string[]) => {
    setQueue((q) => q.filter((x) => !ids.includes(x.id)));
    await supabase().from("mail_letter_reads").upsert(ids.map((id) => ({ user_id: userId, letter_id: id })), { onConflict: "user_id,letter_id", ignoreDuplicates: true });
  };

  if (!first && !open) return null;
  return (
    <>
      {first && !open && (
        <div className={`pinned owl-visit ${landed ? "owl-landed" : "owl-flying"}`}>
          <div className={landed ? "owl-bob" : ""}><PixelArt art={wings[flap ? 1 : 0]} scale={4} label="편지를 물어온 부엉이" /></div>
          {landed && (
            <span className="owl-btn flex items-center gap-1">
              <button type="button" className="btn btn-primary" onClick={() => setOpen(first)}>부엉이가 편지를 가져왔어요 ✉</button>
              <button type="button" className="btn btn-sm" aria-label="부엉이 접기 (편지는 편지 서랍에 넣어 둬요)" title="접기" onClick={() => void markRead(queue.map((x) => x.id))}>✕</button>
            </span>
          )}
        </div>
      )}
      {open && <MailLetterModal mail={open} saved onClose={() => { const id = open.id; setOpen(null); void markRead([id]); }} />}
    </>
  );
}
