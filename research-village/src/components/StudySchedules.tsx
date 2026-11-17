"use client";
import { useEffect, useState, type FormEvent } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import type { Resident } from "@/lib/types";
import { Notice, Window } from "./ui";

export interface StudySchedule { id: string; created_by: string; title: string; days: number[]; at_time: string; lead_min: number; zoom_url: string; note: string; recipients: string[]; active: boolean }
export const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];   // 월요일부터 보여 준다

export const timeLabel = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")}`;
};
export const daysLabel = (days: number[]) => {
  const d = [...days].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  if (d.length === 7) return "매일";
  if (d.join() === "1,2,3,4,5") return "평일";
  return d.map((x) => DAY_NAMES[x]).join("·");
};

const ERRORS: [string, string][] = [["too_many_schedules", "한 마을에 스터디 공지는 10개까지 만들 수 있어요."], ["zoom", "Zoom 링크(https://…zoom.us/…)를 넣어 주세요."], ["check", "입력한 내용을 확인해 주세요. (Zoom 링크는 https://…zoom.us/… 형식이에요.)"]];

/** 도서관의 스터디 공지 알람: 요일과 시간을 정해 두면 그 시간에 마을 모두에게 팝업 알림과 Zoom 링크가 뜬다 */
export default function StudySchedules({ villageId, me, residents, isAdmin }: { villageId: string; me: Resident; residents: Resident[]; isAdmin: boolean }) {
  const [list, setList] = useState<StudySchedule[] | null>(null);
  const [round, setRound] = useState(0);
  const [form, setForm] = useState({ title: "", days: [1, 3, 5] as number[], time: "09:30", lead: 0, zoom: "", note: "", who: null as string[] | null });   // who: null = 마을 모두
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const who = (id: string) => residents.find((r) => r.user_id === id)?.profile.display_name ?? "떠난 주민";
  const reload = () => setRound((n) => n + 1);

  useEffect(() => {
    let alive = true;
    supabase().from("study_schedules").select("id, created_by, title, days, at_time, lead_min, zoom_url, note, recipients, active").eq("village_id", villageId).order("created_at")
      .then(({ data }) => { if (alive) setList((data as StudySchedule[]) ?? []); });
    return () => { alive = false; };
  }, [villageId, round]);

  const fail = (e: unknown) => { const t = errorMessage(e); setMsg({ kind: "error", text: ERRORS.find(([k]) => t.includes(k))?.[1] ?? t }); };
  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (form.days.length === 0) { setMsg({ kind: "error", text: "요일을 하나 이상 골라 주세요." }); return; }
    if (form.who && form.who.length === 0) { setMsg({ kind: "error", text: "알림 받을 사람을 한 명 이상 골라 주세요." }); return; }
    setBusy(true); setMsg(null);
    const { error } = await supabase().from("study_schedules").insert({ village_id: villageId, title: form.title.trim(), days: form.days, at_time: form.time, lead_min: form.lead, zoom_url: form.zoom.trim(), note: form.note.trim(), recipients: form.who && form.who.length < residents.length ? form.who : [] });
    setBusy(false);
    if (error) { fail(error); return; }
    setForm({ ...form, title: "", note: "", zoom: "", who: null });
    setMsg({ kind: "ok", text: "스터디 공지를 만들었어요. 정해진 시간에 고른 사람들에게 알림이 가요 📚" });
    reload();
  };
  const toggle = async (s: StudySchedule) => { const { error } = await supabase().from("study_schedules").update({ active: !s.active }).eq("id", s.id); if (error) fail(error); else reload(); };
  const remove = async (s: StudySchedule) => {
    if (!window.confirm(`‘${s.title}’ 스터디 공지를 지울까요?`)) return;
    const { error } = await supabase().from("study_schedules").delete().eq("id", s.id);
    if (error) fail(error); else reload();
  };
  const canEdit = (s: StudySchedule) => s.created_by === me.user_id || isAdmin;
  const picked = (f: typeof form) => f.who ?? residents.map((r) => r.user_id);
  const toggleWho = (id: string) => setForm((f) => { const cur = picked(f); return { ...f, who: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] }; });
  const toggleDay = (d: number) => setForm((f) => ({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d] }));

  return (
    <Window title="스터디 공지 알람" tone="lilac" className="self-start">
      <div className="space-y-3 p-3">
        <p className="text-sm text-ink-soft">요일과 시간을 정해 두면 그 시간에 알림을 받기로 한 마을 사람에게 알림과 Zoom 링크가 떠요. 앱이 열려 있으면 팝업으로, 폰 알림을 켠 사람은 푸시로 와요.</p>
        {list === null && <p className="text-sm text-ink-soft">불러오는 중…</p>}
        {list?.length === 0 && <p className="text-center text-sm text-ink-soft">아직 스터디 공지가 없어요.</p>}
        <ul className="space-y-2">
          {list?.map((s) => (
            <li key={s.id} className="card space-y-1 p-2 text-sm" style={{ opacity: s.active ? 1 : 0.55 }}>
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-display">{s.title}</span>
                {!s.active && <span className="chip">꺼짐</span>}
              </p>
              <p className="text-xs">{daysLabel(s.days)} · {timeLabel(s.at_time)}{s.lead_min ? ` (${s.lead_min}분 전에 알려요)` : ""} · {who(s.created_by)}님이 만들었어요</p>
              <p className="text-xs">알림 받는 사람: {s.recipients.length === 0 ? "마을 모두" : s.recipients.map(who).join(", ")}</p>
              {s.note && <p className="text-xs text-ink-soft">{s.note}</p>}
              <div className="flex flex-wrap gap-1">
                {s.zoom_url && <a className="btn btn-sm btn-mint" href={s.zoom_url} target="_blank" rel="noopener noreferrer">Zoom 열기</a>}
                {canEdit(s) && <button type="button" className="btn btn-sm" onClick={() => void toggle(s)}>{s.active ? "알람 끄기" : "알람 켜기"}</button>}
                {canEdit(s) && <button type="button" className="btn btn-sm btn-danger" onClick={() => void remove(s)}>지우기</button>}
              </div>
            </li>
          ))}
        </ul>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <form onSubmit={add} className="card space-y-2 p-2" aria-label="스터디 공지 만들기">
          <p className="label">새 스터디 공지</p>
          <input className="input" aria-label="스터디 이름" placeholder="스터디 이름 (예: 새벽 독서 스터디)" maxLength={60} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="flex flex-wrap gap-1" role="group" aria-label="요일">
            {ORDER.map((d) => (
              <button key={d} type="button" aria-pressed={form.days.includes(d)} onClick={() => toggleDay(d)} className={`btn btn-sm ${form.days.includes(d) ? "btn-primary" : ""}`}>{DAY_NAMES[d]}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm" htmlFor="st-time">시간</label>
            <input id="st-time" type="time" className="input !w-auto" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
            <label className="text-sm" htmlFor="st-lead">알림</label>
            <select id="st-lead" className="input !w-auto" value={form.lead} onChange={(e) => setForm({ ...form, lead: Number(e.target.value) })}>
              <option value={0}>정각에</option><option value={5}>5분 전에</option><option value={10}>10분 전에</option><option value={30}>30분 전에</option>
            </select>
          </div>
          <div role="group" aria-label="알림 받을 사람" className="space-y-1">
            <p className="text-sm">알림 받을 사람 <span className="text-xs text-ink-soft">(고른 사람에게만 가요)</span></p>
            <div className="flex flex-wrap gap-1">
              {residents.map((r) => (
                <button key={r.user_id} type="button" aria-pressed={picked(form).includes(r.user_id)} onClick={() => toggleWho(r.user_id)} className={`btn btn-sm ${picked(form).includes(r.user_id) ? "btn-primary" : ""}`}>{r.profile.display_name}</button>
              ))}
            </div>
          </div>
          <input className="input" type="url" aria-label="Zoom 링크" placeholder="Zoom 링크 (https://…zoom.us/j/…)" maxLength={500} value={form.zoom} onChange={(e) => setForm({ ...form, zoom: e.target.value })} />
          <input className="input" aria-label="메모" placeholder="메모 (선택, 예: 이번 주는 3장 읽기)" maxLength={100} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <button type="submit" className="btn btn-primary" disabled={busy || !form.title.trim()}>스터디 공지 만들기</button>
        </form>
      </div>
    </Window>
  );
}
