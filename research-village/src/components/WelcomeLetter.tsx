"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { letterGrid } from "@/pixel/owl";
import { LETTER } from "@/lib/welcome";
import PixelArt from "./PixelArt";
import { Modal } from "./ui";

/** 사용법 편지. 처음엔 부엉이가 가져다 주고, 다시 읽고 싶으면 연구실 서랍에서 꺼낸다 */
export default function WelcomeLetter({ onClose, first = false }: { onClose: () => void; first?: boolean }) {
  return (
    <Modal title="✉ 마을에서 온 편지" tone="butter" onClose={onClose} wide>
      <div className="space-y-3">
        <p className="font-display text-lg">연구자 마을에 오신 걸 환영해요!</p>
        <p className="text-sm text-ink-soft">처음이라 어색하죠? 마을 생활을 짧게 알려 드릴게요.</p>
        <ul className="space-y-2">
          {LETTER.map((l) => (
            <li key={l.title} className="card flex gap-2 px-3 py-2">
              <span aria-hidden className="text-xl">{l.icon}</span>
              <span className="min-w-0"><span className="block font-display">{l.title}</span><span className="block text-sm">{l.body}</span></span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink-soft">{first ? "이 편지는 ‘내 연구실 → 편지 서랍’에 넣어 둘게요. 언제든 다시 꺼내 보세요." : "이 편지는 언제든 서랍에서 다시 꺼내 볼 수 있어요."}</p>
        <button type="button" className="btn btn-primary" onClick={onClose}>{first ? "서랍에 넣어 둘게요" : "닫기"}</button>
      </div>
    </Modal>
  );
}

/** 연구실 서랍 화면: 보관된 편지를 눌러 다시 읽는다 */
export function LetterDrawer({ onOpen, cards = [], onOpenCard }: { onOpen: () => void; cards?: { year: number }[]; onOpenCard?: (year: number) => void }) {
  const art = useMemo(() => letterGrid(), []);
  // 운영자가 마을 모두에게 보낸 편지(설날 소식 등)
  const [mails, setMails] = useState<{ id: string; title: string; body: string; icon: string; created_at: string }[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    supabase().from("mail_letters").select("id, title, body, icon, created_at").order("created_at", { ascending: false }).limit(50).then(({ data }) => { if (alive && data) setMails(data as typeof mails); });
    return () => { alive = false; };
  }, []);
  const mail = mails.find((m) => m.id === open) ?? null;
  return (
    <section aria-label="편지 서랍">
      <div className="space-y-3 p-3">
        <p className="text-sm text-ink-soft">마을에서 받은 편지를 모아 두는 서랍이에요.</p>
        <button type="button" className="card flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#fff3c4]" onClick={onOpen}>
          <PixelArt art={art} scale={3} label="편지 도트 그림" />
          <span><span className="block font-display">마을에서 온 사용법 편지</span><span className="block text-xs text-ink-soft">부엉이가 가져다 준 편지 · 눌러서 다시 읽기</span></span>
        </button>
        {mails.map((m) => (
          <button key={m.id} type="button" className="card flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#fff3c4]" onClick={() => setOpen(m.id)}>
            <span aria-hidden className="flex w-[66px] justify-center text-3xl">{m.icon}</span>
            <span><span className="block font-display">{m.title}</span><span className="block text-xs text-ink-soft">마을 운영자의 편지 · {new Date(m.created_at).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} · 눌러서 읽기</span></span>
          </button>
        ))}
        {cards.map((c) => (
          <button key={c.year} type="button" className="card flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#fff3c4]" onClick={() => onOpenCard?.(c.year)}>
            <span aria-hidden className="flex w-[66px] justify-center text-3xl">💌</span>
            <span><span className="block font-display">{c.year}년 산타의 카드</span><span className="block text-xs text-ink-soft">크리스마스 이브에 받은 카드 · 눌러서 다시 읽기</span></span>
          </button>
        ))}
      </div>
      {mail && (
        <Modal title={`${mail.icon} ${mail.title}`} tone="butter" onClose={() => setOpen(null)} wide>
          <div className="space-y-3">
            <p className="whitespace-pre-wrap break-words text-sm leading-7">{mail.body}</p>
            <button type="button" className="btn btn-primary" onClick={() => setOpen(null)}>닫기</button>
          </div>
        </Modal>
      )}
    </section>
  );
}
