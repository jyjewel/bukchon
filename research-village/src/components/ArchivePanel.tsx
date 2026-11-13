"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { buildExport, copyText, downloadText, fetchAll, todayStamp } from "@/lib/textExport";
import { dateLabel, relativeTime } from "@/lib/time";
import { KIND_META } from "@/lib/constants";
import type { DiaryKind } from "@/lib/types";
import { Notice } from "./ui";

type Kind = "journal" | "note" | "diary";
export interface OpenTarget { kind: Kind; key: string }
interface Doc { kind: Kind; key: string; date: string; title: string; label: string; body: string }
interface Trashed { id: string; kind: Kind; title: string; category: string; body: string; extra: Record<string, unknown>; created_at: string }

const KIND_LABEL: Record<Kind, string> = { journal: "일지", note: "연구노트", diary: "다이어리" };
const EXPORT_KEY = "rv.lastExport";
const RESTORED_KEY = "rv.restoredRevisions";

function readLS(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
function writeLS(k: string, v: string) { try { localStorage.setItem(k, v); } catch {} }

function highlight(text: string, q: string) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}
function snippet(body: string, q: string): string {
  const flat = body.replace(/\s+/g, " ");
  if (!q) return flat.slice(0, 90);
  const i = flat.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return flat.slice(0, 90);
  const from = Math.max(0, i - 30);
  return (from > 0 ? "…" : "") + flat.slice(from, from + 100) + (from + 100 < flat.length ? "…" : "");
}

/** 찾기 · 내보내기: 내가 쓴 모든 글에서 찾고, 텍스트로 내려받고, 지운 글을 되살린다. */
export default function ArchivePanel({ userId, onOpen }: { userId: string; onOpen: (t: OpenTarget) => void }) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [kinds, setKinds] = useState<Kind[]>(["journal", "note", "diary"]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [trash, setTrash] = useState<Trashed[] | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  useEffect(() => {
    const t = readLS(EXPORT_KEY);
    /* eslint-disable react-hooks/set-state-in-effect -- 브라우저 저장소는 마운트 뒤에만 읽을 수 있다 */
    setLastExport(t);
    setStale(t === null || Date.now() - new Date(t).getTime() > 30 * 86400_000);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const load = async () => {
    try {
      const sb = supabase();
      const [j, n, d] = await Promise.all([
        fetchAll<{ log_date: string; body: string }>((a, b) => sb.from("daily_logs").select("log_date, body").eq("user_id", userId).neq("body", "").order("log_date", { ascending: false }).range(a, b)),
        fetchAll<{ id: string; category: string; title: string; body: string; updated_at: string }>((a, b) => sb.from("research_notes").select("id, category, title, body, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).range(a, b)),
        fetchAll<{ id: string; kind: DiaryKind; title: string; body: string; created_at: string }>((a, b) => sb.from("diary_entries").select("id, kind, title, body, created_at").eq("author_id", userId).order("created_at", { ascending: false }).range(a, b)),
      ]);
      const list: Doc[] = [
        ...j.map((x) => ({ kind: "journal" as const, key: x.log_date, date: x.log_date, title: `${x.log_date} ${dateLabel(x.log_date).split(" ").pop()}`, label: "일지", body: x.body })),
        ...n.map((x) => ({ kind: "note" as const, key: x.id, date: x.updated_at.slice(0, 10), title: x.title || "(제목 없음)", label: x.category, body: x.body })),
        ...d.map((x) => ({ kind: "diary" as const, key: x.id, date: x.created_at.slice(0, 10), title: x.title || KIND_META[x.kind].label, label: KIND_META[x.kind].label, body: x.body })),
      ];
      setDocs(list);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오지 못했어요");
    }
  };
  const loadTrash = async () => {
    const { data } = await supabase().from("revisions").select("id, kind, title, category, body, extra, created_at").eq("reason", "delete").order("created_at", { ascending: false }).limit(100);
    const restored = new Set((readLS(RESTORED_KEY) ?? "").split(",").filter(Boolean));
    setTrash(((data ?? []) as Trashed[]).filter((t) => t.kind !== "journal" && !restored.has(t.id)));
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 열 때 한 번 불러온다
    void load(); void loadTrash();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 처음 한 번
  }, []);

  const hits = useMemo(() => {
    if (!docs) return [];
    const needle = q.trim().toLowerCase();
    return docs.filter((d) => kinds.includes(d.kind)
      && (!from || d.date >= from) && (!to || d.date <= to)
      && (!needle || d.body.toLowerCase().includes(needle) || d.title.toLowerCase().includes(needle) || d.label.toLowerCase().includes(needle)))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [docs, q, kinds, from, to]);

  const [exp, setExp] = useState({ journal: true, notes: true, diary: true });
  const [xFrom, setXFrom] = useState("");
  const [xTo, setXTo] = useState("");
  const doExport = async (mode: "download" | "copy") => {
    setBusy(true); setMsg("");
    try {
      const r = await buildExport(userId, { ...exp, from: xFrom || undefined, to: xTo || undefined });
      const total = r.counts.journal + r.counts.notes + r.counts.diary;
      if (total === 0) { setMsg("내보낼 글이 없어요."); return; }
      if (mode === "download") { downloadText(`연구기록-${todayStamp()}.md`, r.text); writeLS(EXPORT_KEY, new Date().toISOString()); setLastExport(new Date().toISOString()); setStale(false); setMsg(`일지 ${r.counts.journal} · 연구노트 ${r.counts.notes} · 다이어리 ${r.counts.diary}개를 내려받았어요.`); }
      else setMsg((await copyText(r.text)) ? `일지 ${r.counts.journal} · 연구노트 ${r.counts.notes} · 다이어리 ${r.counts.diary}개를 복사했어요.` : "복사하지 못했어요. 내려받기를 써 주세요.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "내보내지 못했어요"); } finally { setBusy(false); }
  };

  const restore = async (t: Trashed) => {
    setMsg("");
    const sb = supabase();
    const { error } = t.kind === "note"
      ? await sb.from("research_notes").insert({ user_id: userId, category: t.category || "기타", title: t.title, body: t.body })
      : await sb.from("diary_entries").insert({ author_id: userId, kind: (t.extra.kind as string) ?? "daily", title: t.title, body: t.body, link_url: (t.extra.link_url as string) ?? "", visibility: "private" });
    if (error) return setMsg(error.message);
    writeLS(RESTORED_KEY, [...(readLS(RESTORED_KEY) ?? "").split(",").filter(Boolean), t.id].join(","));
    setTrash((l) => (l ?? []).filter((x) => x.id !== t.id));
    setMsg("되살렸어요. 연구노트/다이어리 목록에서 확인해 보세요.");
    void load();
  };

  const toggleKind = (k: Kind) => setKinds((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]));

  return (
    <div className="space-y-4 p-3">
      <section className="space-y-2" aria-label="글 찾기">
        <h3 className="label">내 글에서 찾기</h3>
        <label className="sr-only" htmlFor="ar-q">찾을 말</label>
        <input id="ar-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="일지·연구노트·다이어리에서 단어를 찾아요 (예: 방각본)" autoComplete="off" />
        <div className="flex flex-wrap items-center gap-1.5">
          {(["journal", "note", "diary"] as Kind[]).map((k) => (
            <button key={k} type="button" aria-pressed={kinds.includes(k)} className={`btn btn-sm ${kinds.includes(k) ? "btn-primary" : ""}`} onClick={() => toggleKind(k)}>{KIND_LABEL[k]}</button>
          ))}
          <label className="flex items-center gap-1 text-xs">에서 <input aria-label="찾기 시작일" type="date" className="input !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} /> ~ <input aria-label="찾기 종료일" type="date" className="input !w-auto" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        {error && <Notice kind="error">{error}</Notice>}
        {docs === null && !error && <p className="text-sm text-ink-soft" role="status">내 글을 불러오는 중…</p>}
        {docs && <p className="text-xs text-ink-soft" role="status">{q.trim() ? `‘${q.trim()}’ 검색 결과 ${hits.length}개` : `전체 ${hits.length}개 (최근 글부터)`}</p>}
        <ul className="max-h-[420px] space-y-1 overflow-y-auto" aria-label="검색 결과">
          {hits.slice(0, 200).map((h) => (
            <li key={`${h.kind}:${h.key}`}>
              <button type="button" className="card w-[calc(100%-6px)] p-2 text-left text-sm" onClick={() => onOpen({ kind: h.kind, key: h.key })}>
                <span className="flex items-center gap-2"><span className="chip">{KIND_LABEL[h.kind]}</span><span className="flex-1 truncate font-display">{highlight(h.title, q.trim())}</span><span className="text-xs text-ink-soft">{h.date}</span></span>
                <span className="mt-1 block text-xs text-ink-soft">{highlight(snippet(h.body, q.trim()), q.trim())}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="dotted space-y-2 pt-3" aria-label="텍스트로 내보내기">
        <h3 className="label">텍스트로 내보내기</h3>
        <p className="text-xs text-ink-soft">내 일지·연구노트·다이어리를 하나의 텍스트(.md) 파일로 받아요. 워드·메모장·한글 어디서든 열 수 있어요. 글 하나만 받으려면 각 글 아래의 ‘텍스트로 받기’를 쓰세요.</p>
        {stale && <Notice kind="info">{lastExport ? "최근 한 달 동안 전체를 내려받지 않았어요." : "아직 전체를 내려받은 적이 없어요."} 중요한 기록은 가끔 내려받아 두면 더 안전해요.</Notice>}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {([["journal", "일지"], ["notes", "연구노트"], ["diary", "다이어리"]] as const).map(([k, label]) => (
            <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={exp[k]} onChange={() => setExp((e) => ({ ...e, [k]: !e[k] }))} /> {label}</label>
          ))}
          <label className="flex items-center gap-1 text-xs">기간 <input aria-label="내보내기 시작일" type="date" className="input !w-auto" value={xFrom} onChange={(e) => setXFrom(e.target.value)} /> ~ <input aria-label="내보내기 종료일" type="date" className="input !w-auto" value={xTo} onChange={(e) => setXTo(e.target.value)} /> <span className="text-ink-soft">(비우면 전체)</span></label>
        </div>
        <div className="flex flex-wrap gap-1">
          <button type="button" className="btn btn-primary btn-sm" disabled={busy || (!exp.journal && !exp.notes && !exp.diary)} onClick={() => void doExport("download")}>텍스트 파일로 내려받기</button>
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void doExport("copy")}>전체 복사</button>
        </div>
        {lastExport && <p className="text-xs text-ink-soft">마지막으로 내려받은 때: {relativeTime(lastExport)}</p>}
      </section>

      <section className="dotted space-y-2 pt-3" aria-label="삭제한 글 보관함">
        <h3 className="label">삭제한 글 보관함</h3>
        <p className="text-xs text-ink-soft">지운 연구노트·다이어리는 여기에 남아 있어요. 되살리면 새 글로 다시 생겨요.</p>
        {trash === null && <p className="text-sm text-ink-soft">불러오는 중…</p>}
        {trash && trash.length === 0 && <p className="text-sm text-ink-soft">지운 글이 없어요.</p>}
        <ul className="space-y-1">
          {(trash ?? []).map((t) => (
            <li key={t.id} className="card flex items-center gap-2 p-2 text-sm">
              <span className="chip">{KIND_LABEL[t.kind]}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-display">{t.title || t.body.slice(0, 20) || "(제목 없음)"}</span><span className="block truncate text-xs text-ink-soft">{t.body.replace(/\s+/g, " ").slice(0, 50)} · {relativeTime(t.created_at)} 삭제</span></span>
              <button type="button" className="btn btn-sm btn-primary" onClick={() => void restore(t)}>되살리기</button>
            </li>
          ))}
        </ul>
      </section>
      {msg && <p role="status" className="text-sm">{msg}</p>}
    </div>
  );
}
