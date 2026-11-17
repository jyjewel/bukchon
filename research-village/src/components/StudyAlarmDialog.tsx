"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AppNotification } from "@/lib/types";
import { Modal } from "./ui";
import { daysLabel, timeLabel, type StudySchedule } from "./StudySchedules";

/** 스터디 시간이 되면 뜨는 팝업: 제목, 시간, 메모와 Zoom 참여 버튼 */
export default function StudyAlarmDialog({ n, creator, onClose }: { n: AppNotification; creator: string; onClose: () => void }) {
  const [id, ...rest] = n.summary.split("|");
  const title = rest.join("|");
  const [s, setS] = useState<StudySchedule | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    supabase().from("study_schedules").select("id, created_by, title, days, at_time, lead_min, zoom_url, note, active").eq("id", id).maybeSingle()
      .then(({ data }) => { if (alive) setS((data as StudySchedule | null) ?? null); });
    return () => { alive = false; };
  }, [id]);
  return (
    <Modal title="📚 스터디 시간이에요" tone="lilac" onClose={onClose}>
      <div className="space-y-3">
        <p className="font-display text-xl">{s?.title ?? title}</p>
        {s && <p className="text-sm text-ink-soft">{daysLabel(s.days)} · {timeLabel(s.at_time)}</p>}
        {s?.note && <p className="card p-2 text-sm">{s.note}</p>}
        <p className="text-xs text-ink-soft">{creator}님이 만든 스터디예요.</p>
        <div className="flex flex-wrap gap-2">
          {s?.zoom_url ? <a className="btn btn-primary" href={s.zoom_url} target="_blank" rel="noopener noreferrer" onClick={onClose}>Zoom으로 참여하기</a> : s !== undefined && <span className="text-sm text-ink-soft">Zoom 링크가 없는 스터디예요.</span>}
          <button type="button" className="btn" onClick={onClose}>닫기</button>
        </div>
      </div>
    </Modal>
  );
}
