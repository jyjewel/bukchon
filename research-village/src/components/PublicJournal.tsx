"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { relativeTime, dateLabel } from "@/lib/time";
import { REACTIONS } from "@/lib/social";
import PixelIcon from "./PixelIcon";

interface Shared { log_date: string; body: string; shared_villages: string[] }
interface Reaction { log_date: string; user_id: string; emoji: string }
interface Comment { id: string; log_date: string; author_id: string; body: string; created_at: string }

/** 연구실 주인이 마을 주민에게 공개한 오늘의 일지. 읽고, 반응(응원·박수 등)과 댓글을 남길 수 있다. */
export default function PublicJournal({
  ownerId, isOwner, name, myId, names,
}: { ownerId: string; isOwner: boolean; name: string; myId: string; names: Record<string, string> }) {
  const [list, setList] = useState<Shared[] | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [all, setAll] = useState(false);

  const load = useCallback(async () => {
    const sb = supabase();
    const { data } = await sb.from("daily_logs").select("log_date, body, shared_villages").eq("user_id", ownerId).neq("body", "").order("log_date", { ascending: false }).limit(120);
    const shared = ((data ?? []) as Shared[]).filter((l) => l.shared_villages.length > 0);
    setList(shared);
    const dates = shared.slice(0, 15).map((l) => l.log_date);
    if (dates.length) {
      const [r, c] = await Promise.all([
        sb.from("journal_reactions").select("log_date, user_id, emoji").eq("owner_id", ownerId).in("log_date", dates),
        sb.from("journal_comments").select("id, log_date, author_id, body, created_at").eq("owner_id", ownerId).in("log_date", dates).order("created_at"),
      ]);
      setReactions((r.data ?? []) as Reaction[]);
      setComments((c.data ?? []) as Comment[]);
    }
  }, [ownerId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 열 때 한 번 불러온다
    void load();
    const sb = supabase();
    const ch = sb.channel(`pj:${ownerId}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "journal_reactions" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "journal_comments" }, () => void load())
      .subscribe();
    return () => { void sb.removeChannel(ch); };
  }, [load, ownerId]);

  if (list === null) return null;
  const shown = all ? list : list.slice(0, 5);
  const react = async (date: string, emoji: string) => {
    const sb = supabase();
    const has = reactions.some((r) => r.log_date === date && r.user_id === myId && r.emoji === emoji);
    if (has) await sb.from("journal_reactions").delete().eq("owner_id", ownerId).eq("log_date", date).eq("emoji", emoji).eq("user_id", myId);
    else await sb.from("journal_reactions").insert({ owner_id: ownerId, log_date: date, emoji });
    await load();
  };
  const comment = async (date: string) => {
    const body = (drafts[date] ?? "").trim();
    if (!body) return;
    const { error } = await supabase().from("journal_comments").insert({ owner_id: ownerId, log_date: date, body });
    if (!error) { setDrafts((d) => ({ ...d, [date]: "" })); await load(); }
  };

  return (
    <section aria-label={`${isOwner ? "내가" : `${name}님이`} 공개한 일지`} className="space-y-2">
      <h3 className="label">{isOwner ? "내가 공개한 일지" : `${name}님의 공개 일지`}</h3>
      {list.length === 0 ? (
        <p className="px-box p-3 text-sm text-ink-soft" style={{ background: "#fdfdfb", ["--bd" as string]: "#8a8fa3" }}>
          {isOwner ? "오늘의 일지에서 ‘마을 주민에게 공개’를 누르면 여기에 보여요." : "아직 공개한 일지가 없어요."}
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((l, i) => {
            const rs = reactions.filter((r) => r.log_date === l.log_date);
            const cs = comments.filter((c) => c.log_date === l.log_date);
            return (
              <li key={l.log_date}>
                <details open={i === 0} className="px-box p-2" style={{ background: "#fdfdfb", ["--bd" as string]: "#8a8fa3" }}>
                  <summary className="cursor-pointer font-display text-sm">{l.log_date} {dateLabel(l.log_date).split(" ").pop()} <span className="font-body text-xs text-ink-soft">· {l.body.replace(/\s+/g, " ").slice(0, 28)}{cs.length ? ` · 댓글 ${cs.length}` : ""}</span></summary>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{l.body}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="일지 반응">
                    {REACTIONS.map((r) => {
                      const n = rs.filter((x) => x.emoji === r.id).length;
                      const mine = rs.some((x) => x.emoji === r.id && x.user_id === myId);
                      return (
                        <button key={r.id} type="button" aria-pressed={mine} aria-label={`${r.label}${n > 0 ? ` ${n}` : ""}`} className={`btn btn-sm inline-flex items-center gap-1 ${mine ? "btn-primary" : ""}`}
                          title={`${r.label}${rs.filter((x) => x.emoji === r.id).length ? ` · ${rs.filter((x) => x.emoji === r.id).map((x) => names[x.user_id] ?? "").filter(Boolean).join(", ")}` : ""}`} onClick={() => void react(l.log_date, r.id)}>
                          <PixelIcon name={r.icon} scale={2} />{n > 0 && <span className="font-display text-xs">{n}</span>}
                        </button>
                      );
                    })}
                  </div>
                  <ul className="mt-2 space-y-1" aria-label="일지 댓글">
                    {cs.map((c) => (
                      <li key={c.id} className="flex items-start gap-2 text-sm">
                        <span className="min-w-0 flex-1 break-words"><span className="font-display">{names[c.author_id] ?? "떠난 주민"}</span> {c.body} <span className="text-xs text-ink-soft">{relativeTime(c.created_at)}</span></span>
                        {(c.author_id === myId || isOwner) && <button type="button" className="text-xs text-ink-soft underline" aria-label="댓글 지우기" onClick={async () => { await supabase().from("journal_comments").delete().eq("id", c.id); await load(); }}>지우기</button>}
                      </li>
                    ))}
                  </ul>
                  <form className="mt-1 flex items-start gap-1" onSubmit={(e) => { e.preventDefault(); void comment(l.log_date); }}>
                    <label className="sr-only" htmlFor={`jc-${l.log_date}`}>댓글 쓰기</label>
                    <input id={`jc-${l.log_date}`} className="input" maxLength={500} value={drafts[l.log_date] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [l.log_date]: e.target.value }))} placeholder="댓글 달기" />
                    <button type="submit" className="btn btn-sm btn-mint mt-[5px] shrink-0" disabled={!(drafts[l.log_date] ?? "").trim()}>달기</button>
                  </form>
                </details>
              </li>
            );
          })}
        </ul>
      )}
      {list.length > 5 && <button type="button" className="btn btn-sm" onClick={() => setAll((a) => !a)}>{all ? "접기" : `더 보기 (${list.length - 5})`}</button>}
    </section>
  );
}
