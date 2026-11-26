"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { dateKey, dateLabel } from "@/lib/time";
import { useAutosave, type PersistResult } from "@/hooks/useAutosave";
import type { VillageInfo } from "@/lib/types";
import { DocTools, SaveStatusBar } from "./DocTools";

function shift(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return dateKey(new Date(y, m - 1, d + days));
}

interface Fields extends Record<string, unknown> { body: string; shared: string[] }
interface Loaded { fields: Fields; rev: number | null; updatedAt: string | null }
interface PastLog { log_date: string; body: string; shared_villages: string[]; updated_at: string }

/**
 * 오늘의 일지. 날짜를 골라 지난 일지도 볼 수 있다. 입력은 자동 저장되고(이 기기에도 임시 보관),
 * 나만 보기가 기본이며 마을을 골라 주민에게 공개할 수 있다.
 */
export default function JournalCard({ userId, villages, initialDate }: { userId: string; villages: VillageInfo[]; initialDate?: string }) {
  const today = dateKey();
  const [date, setDate] = useState(initialDate ?? today);
  const [past, setPast] = useState<PastLog[]>([]);

  const loadPast = useCallback(async () => {
    const { data } = await supabase().from("daily_logs").select("log_date, body, shared_villages, updated_at").eq("user_id", userId).neq("body", "").order("log_date", { ascending: false }).limit(500);
    if (data) setPast(data as PastLog[]);
  }, [userId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 불러온다
    void loadPast();
  }, [loadPast]);
  useEffect(() => {
    if (initialDate) setDate(initialDate); // eslint-disable-line react-hooks/set-state-in-effect -- 찾기 결과에서 날짜를 골라 들어올 때
  }, [initialDate]);

  return (
    <div className="space-y-1.5 p-1.5 sm:p-2">
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" className="btn btn-sm" onClick={() => setDate(shift(date, -1))} aria-label="전날">◀</button>
        <button type="button" className="btn btn-sm" disabled={date >= today} onClick={() => setDate(shift(date, 1))} aria-label="다음날">▶</button>
        <button type="button" className="btn btn-sm" disabled={date === today} onClick={() => setDate(today)}>오늘</button>
        <span className="font-display text-sm">{date === today ? "오늘 · " : ""}{dateLabel(date)}</span>
      </div>
      <details className="pb-1">
        <summary className="label cursor-pointer">일지 달력{past.length > 0 ? ` · 쓴 날 ${past.length}일` : ""}</summary>
        <JournalCalendar today={today} selected={date} logs={past} onPick={setDate} />
      </details>
      <JournalEditor key={date} userId={userId} date={date} villages={villages} onSaved={() => void loadPast()} />
    </div>
  );
}

/** 달력: 일지를 쓴 날은 색이 칠해지고, 날짜를 누르면 그날 일지가 열린다 */
function JournalCalendar({ today, selected, logs, onPick }: { today: string; selected: string; logs: PastLog[]; onPick: (d: string) => void }) {
  const [month, setMonth] = useState(selected.slice(0, 7));
  const [y, m] = month.split("-").map(Number);
  const byDate = new Map(logs.map((l) => [l.log_date, l]));
  const first = new Date(y, m - 1, 1).getDay(), days = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  const move = (n: number) => { const d = new Date(y, m - 1 + n, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };
  return (
    <div className="mt-1 max-w-sm" aria-label="일지 달력">
      <div className="mb-1 flex items-center justify-between">
        <button type="button" className="btn btn-sm" onClick={() => move(-1)} aria-label="이전 달">◀</button>
        <span className="font-display text-sm">{y}년 {m}월</span>
        <button type="button" className="btn btn-sm" disabled={month >= today.slice(0, 7)} onClick={() => move(1)} aria-label="다음 달">▶</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-soft" aria-hidden>
        {["일", "월", "화", "수", "목", "금", "토"].map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const log = byDate.get(d), future = d > today, on = d === selected;
          return (
            <button key={d} type="button" disabled={future} onClick={() => onPick(d)} aria-label={`${m}월 ${Number(d.slice(8))}일${log ? " 일지 있음" : ""}${log && log.shared_villages.length ? " (공개)" : ""}`} aria-pressed={on}
              className={`h-9 rounded-md border text-sm ${on ? "border-[#3a2a33] bg-[#ffe07a] font-display" : log ? "border-[#e0c98a] bg-[#fff3c4]" : "border-transparent"} ${d === today && !on ? "ring-1 ring-[#e07a8a]" : ""} ${future ? "opacity-30" : ""}`}>
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-ink-soft">색이 칠해진 날은 일지를 쓴 날이에요.</p>
    </div>
  );
}

function JournalEditor({ userId, date, villages, onSaved }: { userId: string; date: string; villages: VillageInfo[]; onSaved: () => void }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase().from("daily_logs").select("body, rev, shared_villages, updated_at").eq("user_id", userId).eq("log_date", date).maybeSingle().then(({ data, error }) => {
      if (cancelled || error) return;
      setLoaded({ fields: { body: data?.body ?? "", shared: (data?.shared_villages as string[]) ?? [] }, rev: data?.rev ?? null, updatedAt: (data?.updated_at as string | undefined) ?? null });
    });
    return () => { cancelled = true; };
  }, [userId, date]);
  if (!loaded) return <p className="py-6 text-center text-sm text-ink-soft" role="status">일지를 불러오는 중…</p>;
  return <JournalForm userId={userId} date={date} villages={villages} loaded={loaded} onSaved={onSaved} />;
}

function JournalForm({ userId, date, villages, loaded, onSaved }: { userId: string; date: string; villages: VillageInfo[]; loaded: Loaded; onSaved: () => void }) {
  const auto = useAutosave<Fields>({
    userId, kind: "journal", docKey: date, snapshotKey: () => date,
    initial: { fields: loaded.fields, id: loaded.rev === null ? null : date, rev: loaded.rev },
    isEmpty: (f) => f.body.trim() === "" && f.shared.length === 0,
    toSnapshot: (f) => ({ title: "", category: "", body: f.body }),
    fetchServer: async () => {
      const { data } = await supabase().from("daily_logs").select("body, rev, shared_villages").eq("user_id", userId).eq("log_date", date).maybeSingle();
      return data ? { fields: { body: data.body as string, shared: data.shared_villages as string[] }, rev: data.rev as number } : null;
    },
    persist: async (f, _id, rev): Promise<PersistResult> => {
      const sb = supabase();
      if (rev === null) {
        const { data, error } = await sb.from("daily_logs").insert({ user_id: userId, log_date: date, body: f.body, shared_villages: f.shared }).select("rev").single();
        if (error) return error.code === "23505" ? { conflict: true } : { error: error.message };
        return { ok: true, id: date, rev: data.rev as number };
      }
      const { data, error } = await sb.from("daily_logs").update({ body: f.body, shared_villages: f.shared }).eq("user_id", userId).eq("log_date", date).eq("rev", rev).select("rev");
      if (error) return { error: error.message };
      if (!data || data.length === 0) return { conflict: true };
      return { ok: true, id: date, rev: data[0].rev as number };
    },
    onSaved,
  });
  const { fields } = auto;
  const isPublic = fields.shared.length > 0;
  const setPublic = (on: boolean) => {
    if (!on) return auto.set({ shared: [] });
    if (!window.confirm("공개하면 선택한 마을 주민이 이 일지를 읽을 수 있어요. 공개한 뒤에 고친 내용도 바로 보여요. 공개할까요?")) return;
    if (villages.length) auto.set({ shared: [villages[0].id] });
  };
  const toggleVillage = (id: string) => {
    const next = fields.shared.includes(id) ? fields.shared.filter((x) => x !== id) : [...fields.shared, id];
    auto.set({ shared: next });
  };

  return (
    <>
      <label className="sr-only" htmlFor="journal-body">일지</label>
      <textarea
        id="journal-body" className="input big-write" rows={8} maxLength={20000} value={fields.body}
        onChange={(e) => auto.set({ body: e.target.value })}
        placeholder={date === dateKey() ? "오늘 한 연구, 읽은 것, 막힌 점, 내일 할 일…" : "이 날의 일지가 비어 있어요."}
      />
      <SaveStatusBar auto={auto} />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <DocTools kind="journal" itemKey={auto.id} text={`${date} (${dateLabel(date)})\n\n${fields.body}`} filename={`일지-${date}`} onRestore={(r) => auto.set({ body: r.body })} />
        <fieldset className="min-w-0 text-sm">
          <legend className="label">공개 범위</legend>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" aria-pressed={!isPublic} className={`btn btn-sm ${!isPublic ? "btn-primary" : ""}`} onClick={() => setPublic(false)}>나만 보기</button>
            <button type="button" aria-pressed={isPublic} className={`btn btn-sm ${isPublic ? "btn-primary" : ""}`} onClick={() => !isPublic && setPublic(true)}>마을 주민에게 공개</button>
          </div>
          {isPublic && villages.length > 1 && (
            <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="공개할 마을">
              {villages.map((v) => (
                <label key={v.id} className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={fields.shared.includes(v.id)} onChange={() => toggleVillage(v.id)} /> {v.name}
                </label>
              ))}
            </div>
          )}
          {isPublic && villages.length === 1 && <p className="mt-1 text-xs text-ink-soft">{villages[0].name} 주민이 읽을 수 있어요.</p>}
          {isPublic && villages.length > 1 && <p className="mt-1 text-xs text-ink-soft">{fields.shared.length ? `${villages.filter((v) => fields.shared.includes(v.id)).map((v) => v.name).join(", ")} 주민이 읽을 수 있어요.` : "공개할 마을을 골라 주세요."}</p>}
        </fieldset>
      </div>
    </>
  );
}
