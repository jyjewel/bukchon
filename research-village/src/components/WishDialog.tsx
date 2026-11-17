"use client";
import { useEffect, useState } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import { relativeTime } from "@/lib/time";
import type { Resident } from "@/lib/types";
import { Modal, Notice } from "./ui";

interface Wish { id: string; author_id: string; body: string; status: "new" | "doing" | "done" | "declined"; reply: string; created_at: string }

const STATUS: Record<Wish["status"], { label: string; bg: string }> = {
  new: { label: "구슬이 듣는 중", bg: "#e8e2ff" },
  doing: { label: "만드는 중", bg: "#ffe9a0" },
  done: { label: "이뤄졌어요", bg: "#d5f2cf" },
  declined: { label: "이번엔 어려워요", bg: "#e6dfd0" },
};

/** 소원구슬: 마을 주민이 "이런 게 있으면 좋겠어요"를 적는 창. 적힌 소원은 운영자가 모아서 처리한다 */
export default function WishDialog({ villageId, myId, residents, onClose }: { villageId: string; myId: string; residents: Resident[]; onClose: () => void }) {
  const [wishes, setWishes] = useState<Wish[] | null>(null);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const name = (id: string) => residents.find((r) => r.user_id === id)?.profile.display_name ?? "이웃마을 주민";

  const [round, setRound] = useState(0);
  const load = () => setRound((n) => n + 1);
  useEffect(() => {
    let alive = true;
    supabase().from("wishes").select("id, author_id, body, status, reply, created_at").eq("village_id", villageId).order("created_at", { ascending: false }).limit(30)
      .then(({ data }) => { if (alive) setWishes((data as Wish[]) ?? []); });
    return () => { alive = false; };
  }, [villageId, round]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error } = await supabase().from("wishes").insert({ village_id: villageId, body: text.trim() });
    setBusy(false);
    if (error) {
      setMsg({ kind: "error", text: errorMessage(error).includes("too_many_wishes") ? "구슬이 하루에 들어줄 수 있는 소원은 세 개까지예요. 내일 다시 빌어 주세요." : errorMessage(error) });
      return;
    }
    setText(""); setMsg({ kind: "ok", text: "소원이 구슬에 스며들었어요 ✨" });
    load();
  };
  const remove = async (id: string) => {
    if (!window.confirm("이 소원을 거둘까요?")) return;
    await supabase().from("wishes").delete().eq("id", id);
    load();
  };

  return (
    <Modal title="🔮 소원구슬" tone="lilac" onClose={onClose}>
      <div className="space-y-3">
        <div className="card space-y-1 px-3 py-2 text-sm">
          <p className="font-display">마을에 새로 생기거나 고쳐졌으면 하는 기능을 비는 곳이에요</p>
          <p className="text-ink-soft">개인적인 소원 말고, “이런 기능이 있으면 좋겠어요”, “이 부분이 불편해요”처럼 마을에 더해지거나 바뀌었으면 하는 것을 적어 주세요.</p>
          <p className="text-ink-soft">빌어 주신 소원은 <b>24시간 안에 검토</b>한 뒤 처리하고, 진행 상태는 아래 ‘마을의 소원들’에서 볼 수 있어요. 하루에 세 개까지 빌 수 있어요.</p>
        </div>
        <form onSubmit={submit} className="space-y-1">
          <label className="label" htmlFor="wish-text">소원</label>
          <textarea id="wish-text" className="input" rows={3} maxLength={300} placeholder="예: 광장에 모닥불이 생겼으면 좋겠어요 / 도서관에서 책 검색이 되면 좋겠어요" value={text} onChange={(e) => setText(e.target.value)} required />
          <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>소원 빌기</button>
        </form>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <section aria-label="마을의 소원들" className="space-y-2">
          <h3 className="label">마을의 소원들</h3>
          {wishes === null && <p className="text-sm text-ink-soft">구슬을 들여다보는 중…</p>}
          {wishes?.length === 0 && <p className="text-sm text-ink-soft">아직 소원이 없어요. 첫 소원을 빌어 보세요.</p>}
          <ul className="space-y-2">
            {wishes?.map((w) => (
              <li key={w.id} className="card px-3 py-2">
                <p className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                  <span className="chip" style={{ background: STATUS[w.status].bg }}>{STATUS[w.status].label}</span>
                  {name(w.author_id)} · {relativeTime(w.created_at)}
                  {w.author_id === myId && w.status === "new" && <button type="button" className="btn btn-sm ml-auto" onClick={() => void remove(w.id)}>거두기</button>}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm">{w.body}</p>
                {w.reply && <p className="mt-1 text-sm text-ink-soft">구슬의 답: {w.reply}</p>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Modal>
  );
}
