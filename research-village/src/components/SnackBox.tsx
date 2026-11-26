"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { giftOf } from "@/lib/social";
import { relativeTime } from "@/lib/time";
import { snackGrid, type SnackId } from "@/pixel/snacks";
import { tteokGrid, type TteokId } from "@/pixel/tteok";
import type { Resident } from "@/lib/types";
import PixelArt from "./PixelArt";

const SNACKS = ["mochi", "yakgwa", "tangerine", "apple", "minishell", "bungeoppang", "cupbokki", "haribo", "stollen", "cookie", "buche"];   // 미니쉘은 예전에 받은 것을 보여 주려고 남겨 둔다
const TTEOKS = ["siru", "rainbow", "songpyeon"];
const KEEP_MS = 3 * 86400_000;
interface Row { id: string; kind: string; from_user: string; note: string; created_at: string }
interface Note { id: string; kind: string; from_user: string | null; note: string; created_at: string }

/** 간식 상자: 이웃이 건네 준 커피·간식을 모두 모아 보여 준다(책상 위에는 하루만 올라가지만 여기엔 남는다) */
export default function SnackBox({ residents, myId }: { residents: Resident[]; myId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const arts = useMemo(() => ({ ...Object.fromEntries(SNACKS.map((k) => [k, snackGrid(k as SnackId)])), ...Object.fromEntries(TTEOKS.map((k) => [k, tteokGrid(k as TteokId)])) }), []);
  const [now] = useState(() => Date.now());
  useEffect(() => {
    let alive = true;
    supabase().from("gifts").select("id, kind, from_user, note, created_at").eq("to_user", myId).gt("created_at", new Date(Date.now() - 3 * 86400_000).toISOString()).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => { if (alive) setRows(((data as Row[]) ?? []).filter((r) => now - new Date(r.created_at).getTime() < KEEP_MS)); });
    return () => { alive = false; };
  }, [myId, now]);
  const [notes, setNotes] = useState<Note[] | null>(null);   // 쪽지 보관함: 간식이 사라져도 한마디는 남는다
  useEffect(() => {
    let alive = true;
    supabase().from("gift_notes").select("id, kind, from_user, note, created_at").eq("to_user", myId).order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => { if (alive) setNotes((data as Note[]) ?? []); });
    return () => { alive = false; };
  }, [myId]);
  const removeNote = async (id: string) => {
    setNotes((cur) => cur?.filter((n) => n.id !== id) ?? cur);
    await supabase().from("gift_notes").delete().eq("id", id);
  };
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const eat = async (r: Row) => {
    const { error } = await supabase().rpc("eat_gift", { p_gift: r.id });
    if (error) return setMsg({ ok: false, text: "먹지 못했어요. 이미 사라졌을 수 있어요." });
    setRows((cur) => cur?.filter((x) => x.id !== r.id) ?? cur);
    setMsg({ ok: true, text: `${giftOf(r.kind)?.label ?? "간식"}을(를) 냠냠! 한 시간 동안 지도에서 먹는 모습이 보여요.` });
  };
  const who = (id: string) => residents.find((r) => r.user_id === id)?.profile.display_name ?? "이웃마을 주민";
  const counts = new Map<string, number>();
  rows?.forEach((r) => counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1));
  const icon = (kind: string) => SNACKS.includes(kind) || TTEOKS.includes(kind) ? <PixelArt art={arts[kind]} scale={2} label={`${giftOf(kind)?.label ?? "간식"} 도트 그림`} /> : <span aria-hidden className="text-2xl">{giftOf(kind)?.icon ?? "🎁"}</span>;
  return (
    <section aria-label="간식 상자">
      <div className="space-y-3 p-3">
        <p className="text-sm text-ink-soft">이웃이 건네 준 커피와 간식이 여기 모여요. 간식은 받은 지 3일이 지나면 저절로 사라지지만, 한마디는 아래 쪽지 보관함에 남아요. 보낸 사람과 한마디는 나에게만 보여요.</p>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "" : "text-[#c0392b]"}`}>{msg.text}</p>}
        {rows === null && <p className="text-sm text-ink-soft">상자를 여는 중…</p>}
        {rows?.length === 0 && <p className="text-center text-sm text-ink-soft">아직 받은 간식이 없어요.</p>}
        {rows && rows.length > 0 && (
          <>
            <ul aria-label="받은 간식 개수" className="flex flex-wrap gap-1.5">
              {[...counts].map(([k, n]) => <li key={k} className="chip" style={{ background: "#fff3c4" }}>{giftOf(k)?.label ?? "선물"} × {n}</li>)}
            </ul>
            <ul aria-label="받은 간식 목록" className="space-y-1.5">
              {rows.map((r) => (
                <li key={r.id} className="card flex items-center gap-3 px-3 py-1.5">
                  <span className="flex w-16 shrink-0 justify-center">{icon(r.kind)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display">{giftOf(r.kind)?.label ?? "선물"}</span>
                    <span className="block break-words text-sm">{r.note.startsWith("🎅") ? <>🎅 산타{r.note.slice(2) ? <>: “{r.note.slice(2).trim()}”</> : ""}</> : <>{who(r.from_user)}님{r.note ? <>: “{r.note}”</> : ""}</>}</span>
                  </span>
                  <span className="shrink-0 text-xs text-ink-soft">{relativeTime(r.created_at)}</span>
                  <button type="button" className="btn btn-sm btn-mint shrink-0" aria-label={`${giftOf(r.kind)?.label ?? "간식"} 먹기`} onClick={() => void eat(r)}>먹기</button>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="dotted pt-2">
          <h3 className="label">쪽지 보관함{notes && notes.length > 0 ? ` · ${notes.length}통` : ""}</h3>
          {notes === null && <p className="text-sm text-ink-soft">불러오는 중…</p>}
          {notes?.length === 0 && <p className="text-sm text-ink-soft">간식과 함께 받은 한마디가 여기 모여요.</p>}
          {notes && notes.length > 0 && (
            <ul aria-label="받은 쪽지 목록" className="space-y-1.5">
              {notes.map((n) => (
                <li key={n.id} className="card flex items-start gap-2 px-3 py-1.5 text-sm" style={{ background: "#fff8e4" }}>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words">{n.note.startsWith("🎅") ? <>🎅 산타: “{n.note.slice(2).trim()}”</> : <>{n.from_user ? who(n.from_user) : "이웃마을 주민"}님: “{n.note}”</>}</span>
                    <span className="text-xs text-ink-soft">{giftOf(n.kind)?.label ?? "선물"} · {new Date(n.created_at).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}</span>
                  </span>
                  <button type="button" className="shrink-0 text-xs text-ink-soft underline" aria-label="쪽지 지우기" onClick={() => void removeNote(n.id)}>지우기</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
