"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysUntil, ddayLabel, dateKey } from "@/lib/time";
import { awayDays } from "@/lib/social";

interface Dl { id: string; title: string; due_date: string }
const KEY = "rv.welcomeBack";

/** 며칠 만에 들어왔을 때 보이는 안내: 다가오는 마감과 이웃이 보낸 독촉 */
export default function WelcomeBack({ prevSeen, userId, nudges, onGoLab }: { prevSeen: string | null; userId: string; nudges: number; onGoLab: () => void }) {
  const days = prevSeen ? awayDays(prevSeen) : 0;
  const today = dateKey();
  const [hidden, setHidden] = useState(true);
  const [list, setList] = useState<Dl[]>([]);
  useEffect(() => {
    if (days < 2) return;
    let seen: string | null = null;
    try { seen = sessionStorage.getItem(KEY); } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 이번 방문에서 이미 닫았는지 확인한다
    if (seen !== today) setHidden(false);
    supabase().from("deadlines").select("id, title, due_date").eq("user_id", userId).eq("done", false).gte("due_date", today).order("due_date").limit(5)
      .then(({ data }) => setList((data ?? []) as Dl[]));
  }, [days, userId, today]);
  if (days < 2 || hidden) return null;
  const soon = list.filter((d) => daysUntil(d.due_date, today) <= 14);
  return (
    <section aria-label="오랜만에 오셨어요" className="window px-4 py-3" style={{ background: "#fff3c4" }}>
      <p className="font-display text-lg">오랜만이에요! {days}일 만에 오셨네요.</p>
      {nudges > 0 && <p className="text-sm" style={{ color: "#c0504d" }}>이웃이 보낸 마감 독촉이 {nudges}건 와 있어요. 알림에서 확인해 보세요.</p>}
      {soon.length > 0 ? (
        <ul className="mt-1 space-y-1 text-sm" aria-label="다가오는 마감">
          {soon.map((d) => <li key={d.id} className="flex items-center gap-2"><span className="chip font-display" style={{ background: daysUntil(d.due_date, today) <= 3 ? "#ff9a8a" : "#ffe58a" }}>{ddayLabel(daysUntil(d.due_date, today))}</span>{d.title}</li>)}
        </ul>
      ) : <p className="text-sm text-ink-soft">2주 안에 다가오는 마감은 없어요.</p>}
      <div className="mt-2 flex gap-1">
        <button type="button" className="btn btn-sm btn-primary" onClick={onGoLab}>내 연구실로 가기</button>
        <button type="button" className="btn btn-sm" onClick={() => { setHidden(true); try { sessionStorage.setItem(KEY, today); } catch {} }}>닫기</button>
      </div>
    </section>
  );
}
