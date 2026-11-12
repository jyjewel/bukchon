"use client";
import { useState } from "react";
import { CharacterG } from "./Character";
import TimerCard from "./TimerCard";
import { Window } from "./ui";
import { DEFAULT_ROOFS, STATUS_META, WALLS } from "@/lib/constants";
import { humanDuration } from "@/lib/time";
import type { useTimer } from "@/hooks/useTimer";
import type { useNotes } from "@/hooks/useNotes";
import type { ResearchState, Resident, StatusRow } from "@/lib/types";

const LINE = "#5b4636";

function RoomArt({ me, studying }: { me: Resident; studying: boolean }) {
  const accent = me.house.style.roof ?? DEFAULT_ROOFS[me.slot];
  const wall = me.house.style.wall ?? WALLS[0];
  const inside = me.status.status === "focus" || me.status.status === "offline";
  return (
    <svg viewBox="0 0 480 280" className="block h-auto w-full" role="img" aria-label={inside ? "내 연구실 — 책상에 앉아 있어요" : "내 연구실 — 지금은 비어 있어요"}>
      <rect width="480" height="190" fill={wall} />
      <path d="M0 40 H480 M0 80 H480 M0 120 H480 M0 160 H480" stroke="rgb(91 70 54 / 0.06)" strokeWidth="14" />
      <rect y="186" width="480" height="94" fill="#e7c9a0" />
      <path d="M0 186 H480" stroke={LINE} strokeWidth="2" />
      {[60, 150, 240, 330, 420].map((x) => <path key={x} d={`M${x} 186 L${x - 30} 280`} stroke="rgb(91 70 54 / 0.15)" strokeWidth="1.5" />)}
      {/* 창문 */}
      <rect x="40" y="40" width="96" height="90" rx="10" fill="#cfe9f7" stroke={LINE} strokeWidth="2.500" />
      <path d="M88 40 V130 M40 85 H136" stroke={LINE} strokeWidth="2" />
      <circle cx="112" cy="62" r="9" fill="#fff6b8" />
      <path d="M34 36 q20 26 6 70 M142 36 q-20 26 -6 70" fill={accent} stroke={LINE} strokeWidth="2" opacity="0.9" />
      {/* 책장 */}
      <rect x="352" y="48" width="100" height="150" rx="6" fill="#c99b6d" stroke={LINE} strokeWidth="2.500" />
      {[0, 1, 2].map((row) => (
        <g key={row}>
          <rect x="360" y={58 + row * 46} width="84" height="36" fill="#f6ead2" stroke={LINE} strokeWidth="1.5" />
          {[0, 1, 2, 3, 4, 5].map((b) => (
            <rect key={b} x={364 + b * 13} y={64 + row * 46 + ((b + row) % 3) * 2} width="10" height={30 - ((b + row) % 3) * 2} rx="1.500" fill={["#e8837c", "#8fb8e8", "#f6cf73", "#8fc7a3", "#b497d6", "#f2a477"][(b + row * 2) % 6]} stroke={LINE} strokeWidth="1" />
          ))}
        </g>
      ))}
      {/* 러그 */}
      <ellipse cx="225" cy="246" rx="120" ry="22" fill={accent} opacity="0.45" stroke={LINE} strokeWidth="1.5" strokeDasharray="5 4" />
      {/* 의자 + 캐릭터 */}
      <rect x="205" y="120" width="44" height="60" rx="12" fill="#d9b48a" stroke={LINE} strokeWidth="2" />
      {inside && (
        <g transform="translate(227 196) scale(1.75)">
          <g className={studying ? "anim-bob" : undefined}><CharacterG avatar={me.profile.avatar} seated /></g>
        </g>
      )}
      {/* 책상 */}
      <rect x="150" y="176" width="160" height="14" rx="5" fill="#e2bd8f" stroke={LINE} strokeWidth="2.500" />
      <rect x="160" y="190" width="9" height="56" fill="#b08a63" stroke={LINE} strokeWidth="2" />
      <rect x="291" y="190" width="9" height="56" fill="#b08a63" stroke={LINE} strokeWidth="2" />
      <path d="M198 174 l28 -7 l28 7 v-14 l-28 -7 l-28 7 z" fill="#fff" stroke={LINE} strokeWidth="1.800" strokeLinejoin="round" />
      <path d="M226 167 v-14" stroke={LINE} strokeWidth="1.300" />
      {/* 스탠드 */}
      <path d="M286 176 v-28 l-14 -10" fill="none" stroke={LINE} strokeWidth="2.500" strokeLinecap="round" />
      <path d="M258 146 l22 -16 l8 12 z" fill="#f6cf73" stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      {studying && <path d="M262 150 l-18 26 h44 z" fill="#fff6b8" opacity="0.5" />}
      {/* 머그 */}
      <rect x="166" y="162" width="14" height="14" rx="3" fill="#fff" stroke={LINE} strokeWidth="1.800" />
      {/* 화분 */}
      <path d="M302 246 h30 l-4 -22 h-22 z" fill="#e8a27c" stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M317 224 q-18 -22 -8 -40 q10 14 8 40 q4 -28 20 -32 q0 22 -20 32" fill="#8fc7a3" stroke={LINE} strokeWidth="1.800" strokeLinejoin="round" />
      {!inside && (
        <text x="227" y="110" textAnchor="middle" fontSize="15" fill={LINE} stroke="#fffaf0" strokeWidth="4" paintOrder="stroke" style={{ fontFamily: "var(--font-display)" }}>
          {STATUS_META[me.status.status].icon} 지금은 {STATUS_META[me.status.status].where}
        </text>
      )}
    </svg>
  );
}

export default function StudyRoom({
  me, timer, notes, onStatus, onUpdateStatus,
}: {
  me: Resident;
  timer: ReturnType<typeof useTimer>;
  notes: ReturnType<typeof useNotes>;
  onStatus: (s: ResearchState) => void;
  onUpdateStatus: (patch: Partial<Pick<StatusRow, "topic" | "reading">>) => void;
}) {
  const [topic, setTopic] = useState(me.status.topic);
  const [reading, setReading] = useState(me.status.reading);
  const saveLabel = { idle: "", saving: "저장 중…", saved: "✓ 저장됨", error: "⚠ 저장하지 못했어요" }[notes.state];
  const { stats } = timer;
  const max = Math.max(1, ...stats.bySubject.map((s) => s.seconds));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Window title={`${me.profile.display_name}의 연구실`} icon="🏠" tone="butter">
          <RoomArt me={me} studying={timer.running} />
          <div className="space-y-2 border-t-2 border-ink p-3">
            <p className="text-sm">
              {me.status.status === "focus"
                ? "🔒 집 안에 있어요. 다른 주민에게는 ‘집중 중’이라는 것만 보이고, 누구도 들어올 수 없어요."
                : me.status.status === "offline"
                  ? "🌙 불을 끄고 있어요. 다른 주민에게는 오프라인으로 보여요."
                  : `${STATUS_META[me.status.status].icon} 지금은 ${STATUS_META[me.status.status].where}`}
            </p>
            <div className="flex flex-wrap gap-2">
              {me.status.status !== "focus" && <button type="button" className="btn btn-primary" onClick={() => onStatus("focus")}>📖 집 안에서 집중하기</button>}
              <button type="button" className="btn btn-mint" onClick={() => onStatus("open")}>☕ 밖에서 공부하기</button>
              <button type="button" className="btn" onClick={() => onStatus("library")}>📚 도서관 가기</button>
              <button type="button" className="btn" onClick={() => onStatus("rest")}>🌿 광장에서 쉬기</button>
            </div>
          </div>
        </Window>

        <Window title="지금 하는 연구" icon="🔎" tone="sky">
          <div className="space-y-3 p-3">
            <p className="text-xs text-ink-soft">여기 적은 두 가지는 프로필을 눌러 본 마을 주민에게 보여요.</p>
            <div>
              <label className="label" htmlFor="room-topic">현재 연구 주제</label>
              <input id="room-topic" className="input" value={topic} maxLength={120} onChange={(e) => setTopic(e.target.value)} onBlur={() => topic !== me.status.topic && onUpdateStatus({ topic: topic.trim() })} placeholder="예: 조선 후기 방각본의 유통" />
            </div>
            <div>
              <label className="label" htmlFor="room-reading">읽고 있는 책</label>
              <input id="room-reading" className="input" value={reading} maxLength={120} onChange={(e) => setReading(e.target.value)} onBlur={() => reading !== me.status.reading && onUpdateStatus({ reading: reading.trim() })} />
            </div>
          </div>
        </Window>
      </div>

      <div className="space-y-4">
        <Window title="연구 타이머" icon="⏱️" tone="rose">
          <TimerCard timer={timer} goalMinutes={notes.notes.goal_minutes} defaultSubject={me.profile.field} />
        </Window>

        <Window title="오늘의 목표와 노트" icon="📝" tone="mint" actions={<span className="text-xs" role="status">{saveLabel}</span>}>
          <div className="space-y-3 p-3">
            <p className="text-xs text-ink-soft">🔒 목표와 노트는 나만 볼 수 있어요.</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label" htmlFor="room-goal">오늘의 목표</label>
                <input id="room-goal" className="input" value={notes.notes.goal} maxLength={200} onChange={(e) => notes.update({ goal: e.target.value })} disabled={!notes.loaded} placeholder="예: 2장 초고 마무리" />
              </div>
              <div className="w-24">
                <label className="label" htmlFor="room-goal-min">목표 시간(분)</label>
                <input id="room-goal-min" type="number" min={0} max={1440} step={10} className="input" value={notes.notes.goal_minutes || ""} onChange={(e) => notes.update({ goal_minutes: Math.max(0, Math.min(1440, Number(e.target.value) || 0)) })} disabled={!notes.loaded} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="room-note">개인 노트</label>
              <textarea id="room-note" className="input" rows={7} value={notes.notes.note} maxLength={20000} onChange={(e) => notes.update({ note: e.target.value })} onBlur={() => void notes.flush()} disabled={!notes.loaded} />
            </div>
          </div>
        </Window>

        <Window title="나의 연구 기록" icon="📊" tone="lilac">
          <div className="space-y-3 p-3 text-sm">
            <dl className="grid grid-cols-3 gap-2 text-center">
              {([["오늘", stats.today], ["이번 주", stats.week], ["이번 달", stats.month]] as const).map(([label, sec]) => (
                <div key={label} className="rounded-xl border-2 border-line bg-white p-2">
                  <dt className="text-xs text-ink-soft">{label}</dt>
                  <dd className="font-display">{sec ? humanDuration(sec) : "–"}</dd>
                </div>
              ))}
            </dl>
            {stats.bySubject.length > 0 && (
              <div>
                <h3 className="label">이번 달 분야별</h3>
                <ul className="space-y-1">
                  {stats.bySubject.slice(0, 6).map((s) => (
                    <li key={s.subject} className="flex items-center gap-2">
                      <span className="w-24 shrink-0 truncate text-xs">{s.subject}</span>
                      <span className="h-3 rounded-full border border-ink bg-lilac" style={{ width: `${Math.max(4, (s.seconds / max) * 55)}%` }} />
                      <span className="text-xs text-ink-soft">{humanDuration(s.seconds)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-ink-soft">🔒 이 기록은 나만 볼 수 있어요. 마을에 순위표는 없어요.</p>
          </div>
        </Window>
      </div>
    </div>
  );
}
