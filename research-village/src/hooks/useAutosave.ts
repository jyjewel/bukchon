"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clearDraft, loadDraft, saveDraft } from "@/lib/draft";

export type SaveStatus = "idle" | "saving" | "saved" | "retrying" | "conflict";
export type PersistResult = { ok: true; id: string | null; rev: number } | { conflict: true } | { error: string };
export interface ServerDoc<F> { fields: F; rev: number }

export interface AutosaveOptions<F extends Record<string, unknown>> {
  userId: string;
  kind: "journal" | "note" | "diary";
  /** 임시 보관 이름: 일지는 날짜, 노트·다이어리는 글 id (아직 없으면 'new') */
  docKey: string;
  /** 이력 함수에 넘길 키(일지는 날짜, 노트·다이어리는 글 id). 글이 아직 없으면 null */
  snapshotKey: (id: string | null) => string | null;
  initial: { fields: F; id: string | null; rev: number | null };
  persist: (fields: F, id: string | null, rev: number | null) => Promise<PersistResult>;
  fetchServer: (id: string | null) => Promise<ServerDoc<F> | null>;
  toSnapshot: (f: F) => { title: string; category: string; body: string };
  /** 새 글은 이게 true 인 동안 서버에 만들지 않는다 */
  isEmpty: (f: F) => boolean;
  onSaved?: () => void;
}

const RETRY_MS = [3000, 6000, 12000, 30000];

/**
 * 글을 쓰는 동안의 안전장치 한 벌.
 *  - 입력할 때마다 이 기기에 임시 보관 → 저장이 안 되거나 탭이 닫혀도 다시 열면 되살린다
 *  - 멈추면 0.8초 뒤 자동 저장, 실패하면 알아서 다시 시도(3·6·12·30초)
 *  - 저장 안 된 글이 있으면 탭을 닫을 때 경고
 *  - 다른 기기·탭에서 먼저 고쳤으면 조용히 덮어쓰지 않고 어느 쪽을 남길지 묻는다 (고르지 않은 쪽은 이력에 남는다)
 */
export function useAutosave<F extends Record<string, unknown>>(o: AutosaveOptions<F>) {
  const oRef = useRef(o);
  useEffect(() => { oRef.current = o; });
  const [fields, setFields] = useState<F>(o.initial.fields);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [docId, setDocId] = useState<string | null>(o.initial.id);
  const [recovered, setRecovered] = useState(false);
  const [conflict, setConflict] = useState<{ server: ServerDoc<F>; mine: F } | null>(null);
  const r = useRef({
    fields: o.initial.fields, id: o.initial.id, rev: o.initial.rev,
    dirty: false, inflight: false, paused: false, retries: 0,
    timer: undefined as ReturnType<typeof setTimeout> | undefined, retryTimer: undefined as ReturnType<typeof setTimeout> | undefined,
  });

  const runRef = useRef<() => Promise<void>>(async () => {});
  const draftKey = () => r.current.id ?? oRef.current.docKey;
  const writeDraft = () => {
    const c = r.current;
    saveDraft(oRef.current.userId, oRef.current.kind, draftKey(), { fields: c.fields, baseRev: c.rev, at: Date.now() });
  };

  const run = useCallback(async () => {
    const c = r.current;
    if (c.paused) return;
    if (c.inflight) return; // 저장 중에 쓴 글은 dirty 로 표시돼 있어 이 저장이 끝난 뒤 이어서 저장된다
    if (!c.dirty) return;
    if (c.id === null && oRef.current.isEmpty(c.fields)) { c.dirty = false; return; }
    clearTimeout(c.retryTimer);
    c.inflight = true; c.dirty = false;
    const sent = c.fields;
    setStatus("saving");
    let res: PersistResult;
    try { res = await oRef.current.persist(sent, c.id, c.rev); } catch (e) { res = { error: String(e) }; }
    c.inflight = false;
    if ("ok" in res) {
      const hadNew = c.id === null && res.id !== null;
      if (hadNew) clearDraft(oRef.current.userId, oRef.current.kind, oRef.current.docKey);
      c.id = res.id ?? c.id; c.rev = res.rev; c.retries = 0;
      if (hadNew) setDocId(c.id);
      if (c.dirty) { void runRef.current(); return; }
      clearDraft(oRef.current.userId, oRef.current.kind, draftKey());
      setStatus("saved"); setSavedAt(Date.now());
      oRef.current.onSaved?.();
    } else if ("conflict" in res) {
      c.paused = true; c.dirty = true;
      const server = await oRef.current.fetchServer(c.id);
      if (server) setConflict({ server, mine: sent });
      setStatus("conflict");
    } else {
      c.dirty = true;
      setStatus("retrying");
      const wait = RETRY_MS[Math.min(c.retries++, RETRY_MS.length - 1)];
      c.retryTimer = setTimeout(() => void runRef.current(), wait);
    }
  }, []);
  useEffect(() => { runRef.current = run; }, [run]);

  // 처음 열 때: 이 기기에 저장 못 한 글이 남아 있으면 되살린다 (서버가 그사이 바뀌었으면 어느 쪽을 남길지 묻는다)
  useEffect(() => {
    const c = r.current;
    const d = loadDraft(o.userId, o.kind, o.docKey);
    if (!d) return;
    const mine = d.fields as F;
    if (JSON.stringify(mine) === JSON.stringify(o.initial.fields)) { clearDraft(o.userId, o.kind, o.docKey); return; }
    if ((d.baseRev ?? null) === (o.initial.rev ?? null)) {
      c.fields = mine; c.dirty = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 열 때 한 번, 임시 보관된 글을 이어서 쓴다
      setFields(mine); setRecovered(true);
      void run();
    } else {
      c.paused = true; c.dirty = true; c.fields = mine;
      setFields(mine); setConflict({ server: { fields: o.initial.fields, rev: o.initial.rev ?? 0 }, mine }); setStatus("conflict");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 열 때 한 번만
  }, []);

  const set = useCallback((patch: Partial<F>) => {
    const c = r.current;
    c.fields = { ...c.fields, ...patch };
    c.dirty = true;
    setFields(c.fields);
    writeDraft();
    if (c.paused) return;
    setStatus((s) => (s === "retrying" ? s : "saving"));
    clearTimeout(c.timer);
    c.timer = setTimeout(() => void run(), 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- writeDraft 는 ref 만 읽는다
  }, [run]);

  const flush = useCallback(async () => {
    clearTimeout(r.current.timer);
    await run();
  }, [run]);

  /** 지금 쓴 글로 저장. 다른 곳에서 쓴 글은 이력에 남긴다. */
  const keepMine = useCallback(async () => {
    const c = r.current; const cf = conflict;
    const key = oRef.current.snapshotKey(c.id);
    if (key) await supabase().rpc("snapshot_item", { p_kind: oRef.current.kind, p_key: key });
    if (cf) c.rev = cf.server.rev;
    c.paused = false; c.dirty = true; setConflict(null);
    await run();
  }, [conflict, run]);

  /** 다른 곳에서 쓴 글을 불러온다. 지금 쓴 글은 이력에 남긴다. */
  const takeServer = useCallback(async () => {
    const c = r.current; const cf = conflict;
    if (!cf) return;
    const snap = oRef.current.toSnapshot(c.fields);
    const key = oRef.current.snapshotKey(c.id) ?? "new";
    await supabase().rpc("snapshot_text", { p_kind: oRef.current.kind, p_key: key, p_title: snap.title, p_category: snap.category, p_body: snap.body });
    c.fields = cf.server.fields; c.rev = cf.server.rev; c.paused = false; c.dirty = false;
    setFields(cf.server.fields); setConflict(null); setStatus("saved");
    clearDraft(oRef.current.userId, oRef.current.kind, draftKey());
  }, [conflict]);

  // 인터넷이 다시 연결되거나 탭이 가려질 때 바로 저장을 시도하고, 저장 안 된 글이 있으면 탭을 닫을 때 경고한다
  useEffect(() => {
    const retryNow = () => { if (r.current.dirty && !r.current.paused) { clearTimeout(r.current.retryTimer); void run(); } };
    const onHide = () => { if (document.visibilityState === "hidden") retryNow(); };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const c = r.current;
      if (c.dirty || c.inflight || c.paused) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("online", retryNow);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    const c = r.current;
    return () => {
      window.removeEventListener("online", retryNow);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      clearTimeout(c.timer);
      if (c.dirty && !c.paused) void run(); // 화면을 옮길 때도 마지막 글을 저장한다
      clearTimeout(c.retryTimer);
    };
  }, [run]);

  /** 쓴 글 중 아직 서버에 없는 게 있나 */
  const unsaved = status === "saving" || status === "retrying" || status === "conflict";
  return { fields, set, status, savedAt, recovered, dismissRecovered: () => setRecovered(false), conflict, keepMine, takeServer, flush, unsaved, id: docId };
}
