"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { copyText, downloadText, safeName, todayStamp } from "@/lib/textExport";
import type { SaveStatus, useAutosave } from "@/hooks/useAutosave";
import { Modal, Notice } from "./ui";

type Auto = ReturnType<typeof useAutosave>;

const clock = (t: number) => new Date(t).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

/** 저장 상태 표시 + 충돌·복구 안내 */
export function SaveStatusBar({ auto }: { auto: Pick<Auto, "status" | "savedAt" | "recovered" | "dismissRecovered" | "conflict" | "keepMine" | "takeServer"> }) {
  const { status, savedAt, recovered, conflict } = auto;
  const label: Record<SaveStatus, string> = {
    idle: "자동 저장돼요", saving: "저장 중…", saved: savedAt ? `✓ 저장됨 ${clock(savedAt)}` : "✓ 저장됨",
    retrying: "저장하지 못했어요 — 자동으로 다시 시도하고 있어요", conflict: "저장을 잠시 멈췄어요",
  };
  return (
    <div className="space-y-2">
      <p role="status" className={`text-xs ${status === "retrying" || status === "conflict" ? "font-bold text-[#c0392b]" : "text-ink-soft"}`}>
        {label[status]}
        {status === "retrying" && <span className="font-normal text-ink"> · 쓰던 글은 이 기기에 임시 보관돼 있으니 창을 닫지 마세요. 인터넷이 돌아오면 바로 저장돼요.</span>}
      </p>
      {recovered && (
        <Notice kind="ok">
          저장되지 않았던 글을 되살렸어요. 지금 다시 저장하고 있어요. <button type="button" className="underline" onClick={auto.dismissRecovered}>확인</button>
        </Notice>
      )}
      {conflict && (
        <Notice kind="error">
          <p className="font-display">다른 기기나 탭에서 이 글이 먼저 고쳐졌어요.</p>
          <p className="text-sm">어느 쪽을 남길까요? 고르지 않은 쪽 글은 &lsquo;이력&rsquo;에 그대로 남으니 걱정하지 마세요.</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <button type="button" className="btn btn-sm btn-primary" onClick={() => void auto.keepMine()}>지금 쓴 글로 저장</button>
            <button type="button" className="btn btn-sm" onClick={() => void auto.takeServer()}>다른 곳에서 쓴 글 불러오기</button>
          </div>
        </Notice>
      )}
    </div>
  );
}

interface Rev { id: string; title: string; category: string; body: string; extra: Record<string, unknown>; reason: string; created_at: string }

/** 이력 보기: 이전에 저장된 글을 골라 미리 보고 그 글로 되돌린다 */
function RevisionsModal({ kind, itemKey, onClose, onRestore }: { kind: "journal" | "note" | "diary"; itemKey: string; onClose: () => void; onRestore: (r: Rev) => void }) {
  const [list, setList] = useState<Rev[] | null>(null);
  const [pick, setPick] = useState<Rev | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase().from("revisions").select("id, title, category, body, extra, reason, created_at").eq("kind", kind).eq("item_key", itemKey).order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => { if (!cancelled) { setList((data ?? []) as Rev[]); setPick(((data ?? [])[0] as Rev) ?? null); } });
    return () => { cancelled = true; };
  }, [kind, itemKey]);
  return (
    <Modal title="이 글의 이력" tone="butter" onClose={onClose} wide>
      <div className="space-y-3 p-4">
        <p className="text-sm text-ink-soft">글을 고치거나 지우기 전 모습이 자동으로 남아요. 고르면 그 시점의 글을 볼 수 있고, 되돌릴 수 있어요. (되돌리기 전 글도 다시 이력에 남아요.)</p>
        {list === null && <p className="text-sm">불러오는 중…</p>}
        {list && list.length === 0 && <p className="text-sm">아직 남은 이력이 없어요. 글을 고치면 자동으로 쌓여요.</p>}
        {list && list.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
            <ul className="max-h-[320px] space-y-1 overflow-y-auto" aria-label="이력 목록">
              {list.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setPick(r)} className={`card w-[calc(100%-6px)] px-2 py-1 text-left text-xs ${pick?.id === r.id ? "card-on" : ""}`}>
                    <span className="font-display">{new Date(r.created_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    {r.reason === "delete" && <span className="chip ml-1">삭제 전</span>}
                    <span className="block truncate text-ink-soft">{r.body.replace(/\s+/g, " ").slice(0, 36) || "(빈 글)"}</span>
                    <span className="text-ink-soft">{r.body.length.toLocaleString()}자</span>
                  </button>
                </li>
              ))}
            </ul>
            {pick && (
              <div className="space-y-2">
                {(pick.title || pick.category) && <p className="font-display">{pick.category && <span className="chip mr-1">{pick.category}</span>}{pick.title}</p>}
                <label className="sr-only" htmlFor="rev-body">이 시점의 글</label>
                <textarea id="rev-body" readOnly className="input" rows={12} value={pick.body} />
                <div className="flex flex-wrap gap-1">
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => { onRestore(pick); onClose(); }}>이 글로 되돌리기</button>
                  <button type="button" className="btn btn-sm" onClick={() => void copyText(pick.body)}>복사</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

/** 글 도구 모음: 이력, 복사, 텍스트로 내려받기 */
export function DocTools({
  kind, itemKey, text, filename, onRestore,
}: { kind: "journal" | "note" | "diary"; itemKey: string | null; text: string; filename: string; onRestore: (r: { title: string; category: string; body: string; extra: Record<string, unknown> }) => void }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };
  return (
    <div className="flex flex-wrap items-center gap-1">
      <button type="button" className="btn btn-sm" disabled={!itemKey} onClick={() => setOpen(true)}>이력</button>
      <button type="button" className="btn btn-sm" onClick={async () => flash((await copyText(text)) ? "복사했어요" : "복사하지 못했어요")}>복사</button>
      <button type="button" className="btn btn-sm" onClick={() => { downloadText(`${safeName(filename)}-${todayStamp()}.txt`, text); flash("내려받았어요"); }}>텍스트로 받기</button>
      {msg && <span role="status" className="text-xs text-ink-soft">{msg}</span>}
      {open && itemKey && <RevisionsModal kind={kind} itemKey={itemKey} onClose={() => setOpen(false)} onRestore={onRestore} />}
    </div>
  );
}
