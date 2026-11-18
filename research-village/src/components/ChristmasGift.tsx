"use client";
import { useState } from "react";
import { giftOf } from "@/lib/social";
import type { XmasRow } from "@/hooks/useChristmas";
import { Modal } from "./ui";

/** 산타를 만났을 때(이브 밤) 또는 놓친 사람이 25일 아침에 여는 선물 창 */
export default function ChristmasGift({ mode, already, claim, onWear, onClose }: {
  mode: "eve" | "morning"; already: boolean;
  claim: () => Promise<{ ok: true; row: XmasRow } | { ok: false; error: string }>; onWear: () => Promise<void>; onClose: () => void;
}) {
  const [row, setRow] = useState<XmasRow | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [worn, setWorn] = useState(false);
  const open = async () => {
    setBusy(true); setErr("");
    const r = await claim();
    setBusy(false);
    if (r.ok) setRow(r.row); else setErr(r.error.includes("already") ? "이미 선물을 받았어요 🎅" : r.error.includes("not_christmas") ? "지금은 선물을 줄 때가 아니에요." : r.error);
  };
  return (
    <Modal title={mode === "eve" ? "🎅 산타의 선물" : "🎁 산타가 두고 간 선물"} tone="rose" onClose={onClose}>
      <div className="space-y-3 text-center">
        {already && !row && <p className="py-2">산타 할아버지가 말해요. “올해 선물은 이미 드렸어요! 메리 크리스마스 🎄”</p>}
        {!already && !row && (
          <>
            <p className="py-1">{mode === "eve" ? "산타 할아버지가 큰 선물 주머니를 열었어요!" : "크리스마스 아침, 산타 할아버지가 못 만난 분께 선물을 두고 갔어요."}</p>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void open()}>{busy ? "여는 중…" : "선물 열기"}</button>
          </>
        )}
        {err && <p role="alert" className="text-sm text-[#c2304a]">{err}</p>}
        {row && (
          <div className="space-y-2 text-left">
            <p className="text-center font-display text-lg">메리 크리스마스! 🎄</p>
            <ul className="space-y-1 text-sm" aria-label="받은 선물">
              <li className="card px-3 py-1.5">🎅 <b>산타 모자</b> — 캐릭터 꾸미기 · 모자</li>
              <li className="card px-3 py-1.5">🧦 <b>벽걸이 양말</b>과 🎄 <b>크리스마스 리스</b> — 연구실 꾸미기 · 소품</li>
              <li className="card px-3 py-1.5">🦌 <b>루돌프 뿔과 코</b> — 캐릭터 꾸미기 · 액세서리</li>
              <li className="card px-3 py-1.5">{row.snacks.map((k) => `${giftOf(k)?.icon ?? "🎁"} ${giftOf(k)?.label ?? k}`).join(", ")} — 간식 상자 (3일 안에 드세요!)</li>
              <li className="card px-3 py-1.5">💌 <b>산타의 카드</b> — 편지 서랍</li>
              {row.golden && <li className="card px-3 py-1.5" style={{ background: "#fff3c4" }}>✨ 아주 드문 <b>황금 루돌프 코</b>도 받았어요! — 액세서리</li>}
            </ul>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" className="btn btn-primary" disabled={worn} onClick={() => void onWear().then(() => setWorn(true))}>{worn ? "쓰고 있어요 🎅" : "산타 모자 지금 쓰기"}</button>
              <button type="button" className="btn" onClick={onClose}>닫기</button>
            </div>
          </div>
        )}
        {(already || err) && !row && <button type="button" className="btn" onClick={onClose}>닫기</button>}
      </div>
    </Modal>
  );
}

/** 편지 서랍의 산타 카드: 올해의 기록을 짧게 돌아보는 카드 */
export function SantaCard({ row, name, onClose }: { row: XmasRow; name: string; onClose: () => void }) {
  const s = row.stats;
  const lines = [
    s.logs ? `연구 일지를 ${s.logs}번 쓰셨고` : "",
    s.notes ? `연구노트를 ${s.notes}편 남기셨고` : "",
    s.diary ? `다이어리를 ${s.diary}번 쓰셨고` : "",
    s.goals ? `함께 공부한 목표를 ${s.goals}번 이루셨고` : "",
    s.wishes ? `소원구슬에 ${s.wishes}번 마을을 위한 소원을 빌어 주셨고` : "",
  ].filter(Boolean);
  return (
    <Modal title="💌 산타의 카드" tone="rose" onClose={onClose}>
      <div className="space-y-3">
        <p className="font-display text-lg">{name}님께,</p>
        <p className="text-sm leading-relaxed">
          {lines.length > 0 ? `올해 ${lines.join(", ")} 연구하느라 정말 고생 많으셨어요.` : "올해도 마을에서 지내 주셔서 고마워요."}<br />
          추운 겨울, 따뜻한 핫초코 한 잔 마시고 푹 쉬세요. 내년에도 건강하게, 함께 공부해요.
        </p>
        <p className="text-right text-sm">메리 크리스마스 🎄 — 산타 드림</p>
        <button type="button" className="btn" onClick={onClose}>닫기</button>
      </div>
    </Modal>
  );
}
