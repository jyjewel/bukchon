"use client";
import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { CharacterG } from "./Character";
import { DEFAULT_ROOFS, STATUS_META, WALLS } from "@/lib/constants";
import { currentPhase, currentSeason, type DayPhase, type Season } from "@/lib/time";
import type { House, Resident } from "@/lib/types";

const LINE = "#5b4636";
const W = 1000;
const H = 660;

const HOUSE_POS = [
  { x: 170, y: 215 }, { x: 830, y: 215 }, { x: 105, y: 415 },
  { x: 895, y: 415 }, { x: 250, y: 610 }, { x: 750, y: 610 },
];
const DESK_POS = [
  { x: 288, y: 262 }, { x: 712, y: 262 }, { x: 232, y: 442 },
  { x: 768, y: 442 }, { x: 385, y: 588 }, { x: 615, y: 588 },
];
const LIBRARY = { x: 500, y: 190 };
const PLAZA = { x: 500, y: 400 };
const BOARD = { x: 500, y: 612 };
const LIBRARY_SPOTS = [0, 1, 2, 3, 4, 5].map((i) => ({ x: 410 + i * 36, y: 240 + (i % 2) * 8 }));
const REST_SPOTS = [
  { x: 415, y: 408 }, { x: 585, y: 408 }, { x: 448, y: 458 },
  { x: 552, y: 458 }, { x: 500, y: 476 }, { x: 562, y: 352 },
];

const SEASONS: Record<Season, { ground: string; ground2: string; leaves: string[]; flowers: string[]; label: string }> = {
  spring: { ground: "#cfeab4", ground2: "#bfe0a2", leaves: ["#f9c9d6", "#a9d99a", "#f7b6c8"], flowers: ["#f4a7b9", "#fff", "#f6cf73"], label: "봄" },
  summer: { ground: "#bfe3a3", ground2: "#aad68e", leaves: ["#7cc486", "#8fd08d", "#69b57c"], flowers: ["#f6cf73", "#fff", "#8fb8e8"], label: "여름" },
  autumn: { ground: "#dde3a6", ground2: "#cfd692", leaves: ["#f2a65a", "#e8837c", "#f6cf73"], flowers: ["#f2a477", "#fff5e1", "#d98bb0"], label: "가을" },
  winter: { ground: "#eef4f1", ground2: "#dfe9e6", leaves: ["#d5e4ea", "#c5d8e0", "#e3eef2"], flowers: ["#fff", "#cfe4f6", "#fff"], label: "겨울" },
};
const PHASES: Record<DayPhase, { tint: string; opacity: number; label: string }> = {
  dawn: { tint: "#ffc9a8", opacity: 0.16, label: "새벽" },
  day: { tint: "#fff", opacity: 0, label: "낮" },
  dusk: { tint: "#ff9060", opacity: 0.18, label: "해질녘" },
  night: { tint: "#232c66", opacity: 0.4, label: "밤" },
};

function Hit({ label, onActivate, children, x, y }: { label: string; onActivate: () => void; children: ReactNode; x: number; y: number }) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate();
    }
  };
  return (
    <g role="button" tabIndex={0} aria-label={label} className="scene-hit" transform={`translate(${x} ${y})`} onClick={onActivate} onKeyDown={onKey}>
      {children}
    </g>
  );
}

function Label({ y, children, size = 15 }: { y: number; children: ReactNode; size?: number }) {
  return (
    <text y={y} textAnchor="middle" fontSize={size} fill={LINE} stroke="#fffaf0" strokeWidth="4" paintOrder="stroke" style={{ fontFamily: "var(--font-display)" }}>
      {children}
    </text>
  );
}

function Tree({ x, y, color, s = 1 }: { x: number; y: number; color: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="2" rx="22" ry="6" fill="rgb(91 70 54 / 0.15)" />
      <rect x="-5" y="-26" width="10" height="28" rx="3" fill="#b08a63" stroke={LINE} strokeWidth="1.5" />
      <g className="anim-sway">
        <circle cx="-14" cy="-36" r="17" fill={color} stroke={LINE} strokeWidth="1.5" />
        <circle cx="14" cy="-36" r="17" fill={color} stroke={LINE} strokeWidth="1.5" />
        <circle cx="0" cy="-54" r="20" fill={color} stroke={LINE} strokeWidth="1.5" />
        <circle cx="0" cy="-38" r="16" fill={color} />
        <circle cx="-6" cy="-58" r="4" fill="rgb(255 255 255 / 0.35)" />
      </g>
    </g>
  );
}

function Flowers({ x, y, colors }: { x: number; y: number; colors: string[] }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[[-10, 0], [0, -6], [10, 1], [4, 8], [-6, 9]].map(([dx, dy], i) => (
        <g key={i} transform={`translate(${dx} ${dy})`}>
          <circle r="3.6" fill={colors[i % colors.length]} stroke={LINE} strokeWidth="0.8" />
          <circle r="1.2" fill="#f6cf73" />
        </g>
      ))}
    </g>
  );
}

function HouseSprite({ house, resident, isMine }: { house: House; resident: Resident | null; isMine: boolean }) {
  const empty = !resident;
  const roof = house.style.roof ?? DEFAULT_ROOFS[house.slot];
  const wall = house.style.wall ?? WALLS[0];
  const lit = Boolean(resident?.online);
  const focusing = resident?.shown === "focus";
  const clip = `win-${house.slot}`;
  return (
    <g opacity={empty ? 0.6 : 1}>
      <ellipse cx="0" cy="1" rx="78" ry="10" fill="rgb(91 70 54 / 0.16)" />
      <ellipse className="hover-ring" cx="0" cy="1" rx="84" ry="14" fill="none" stroke="#6ea8dc" strokeWidth="3" strokeDasharray="6 5" />
      {/* 굴뚝 */}
      <rect x="30" y="-138" width="16" height="30" fill="#c9a98b" stroke={LINE} strokeWidth="2" />
      {lit && [0, 1, 2].map((i) => (
        <circle key={i} className="anim-smoke" cx="38" cy="-144" r="6" fill="#fff" opacity="0" style={{ animationDelay: `${i * 1.05}s` }} />
      ))}
      {/* 벽 */}
      <rect x="-62" y="-80" width="124" height="80" rx="6" fill={empty ? "#ece6dc" : wall} stroke={LINE} strokeWidth="2" />
      <rect x="-62" y="-12" width="124" height="12" fill="rgb(91 70 54 / 0.12)" />
      {/* 지붕 */}
      <path d="M-78 -74 L-42 -130 H42 L78 -74 Z" fill={empty ? "#c9c2b8" : roof} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M-60 -102 H60 M-51 -116 H51" stroke="rgb(91 70 54 / 0.25)" strokeWidth="2" strokeLinecap="round" />
      <path d="M-78 -74 H78" stroke={LINE} strokeWidth="4" strokeLinecap="round" />
      {/* 창문 */}
      <clipPath id={clip}><rect x="-47" y="-64" width="36" height="34" rx="6" /></clipPath>
      <rect x="-47" y="-64" width="36" height="34" rx="6" fill={lit ? "#ffe9a3" : "#7f89a8"} stroke={LINE} strokeWidth="2" />
      {focusing && resident && (
        <g clipPath={`url(#${clip})`}>
          <g transform="translate(-29 -17) scale(0.62)"><g className="anim-bob"><CharacterG avatar={resident.profile.avatar} seated /></g></g>
        </g>
      )}
      {!focusing && <path d="M-29 -64 V-30 M-47 -47 H-11" stroke={LINE} strokeWidth="1.5" opacity="0.55" />}
      <rect x="-50" y="-30" width="42" height="7" rx="3" fill="#c98f6b" stroke={LINE} strokeWidth="1.5" />
      {!empty && [-42, -32, -22, -14].map((fx, i) => <circle key={fx} cx={fx} cy="-33" r="3.2" fill={["#f4a7b9", "#fff", "#f6cf73", "#f4a7b9"][i]} stroke={LINE} strokeWidth="0.8" />)}
      {/* 문 */}
      <path d="M10 0 V-36 a15 15 0 0 1 30 0 V0 Z" fill={empty ? "#b7aa9b" : "#b9825a"} stroke={LINE} strokeWidth="2" />
      <circle cx="34" cy="-22" r="2.2" fill="#f6cf73" stroke={LINE} strokeWidth="1" />
      {isMine && (
        <g transform="translate(-62 -130)">
          <path d="M0 0 V-26" stroke={LINE} strokeWidth="2" strokeLinecap="round" />
          <path d="M0 -26 L20 -20 L0 -14 Z" fill="#f4a7b9" stroke={LINE} strokeWidth="1.5" strokeLinejoin="round" />
        </g>
      )}
      {focusing && <text x="-29" y="-72" textAnchor="middle" fontSize="15">📖</text>}
      <Label y={22}>{empty ? "빈 집" : `${resident.profile.display_name}의 집`}</Label>
    </g>
  );
}

function Desk({ x, y, occupied }: { x: number; y: number; occupied: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="3" rx="30" ry="6" fill="rgb(91 70 54 / 0.14)" />
      <rect x="-24" y="-17" width="4" height="19" fill="#b08a63" stroke={LINE} strokeWidth="1.3" />
      <rect x="20" y="-17" width="4" height="19" fill="#b08a63" stroke={LINE} strokeWidth="1.3" />
      <rect x="-29" y="-22" width="58" height="9" rx="3" fill="#e2bd8f" stroke={LINE} strokeWidth="1.8" />
      {occupied ? (
        <>
          <path d="M-12 -24 l10 -3 l10 3 v-7 l-10 -3 l-10 3 z" fill="#fff" stroke={LINE} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M-2 -27 v-7" stroke={LINE} strokeWidth="1" />
          <rect x="15" y="-30" width="7" height="8" rx="1.5" fill="#fff" stroke={LINE} strokeWidth="1.2" />
        </>
      ) : (
        <rect x="-9" y="-26" width="18" height="4" rx="1" fill="#8fb8e8" stroke={LINE} strokeWidth="1.2" />
      )}
    </g>
  );
}

export interface SceneProps {
  houses: House[];
  residents: Resident[];
  myId: string;
  onCharacter: (userId: string) => void;
  onHouse: (slot: number) => void;
  onPlace: (place: "library" | "plaza" | "board") => void;
}

export default function VillageScene({ houses, residents, myId, onCharacter, onHouse, onPlace }: SceneProps) {
  // 계절·시간대는 브라우저의 현지 시각 기준 (서버 렌더링 결과와 어긋나지 않도록 마운트 후 계산)
  const [clock, setClock] = useState<{ season: Season; phase: DayPhase }>({ season: "spring", phase: "day" });
  useEffect(() => {
    const update = () => setClock({ season: currentSeason(), phase: currentPhase() });
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, []);
  const season = SEASONS[clock.season];
  const phase = PHASES[clock.phase];
  const bySlot = new Map(residents.map((r) => [r.slot, r]));

  const target = (r: Resident) => {
    const door = { x: HOUSE_POS[r.slot].x + 25, y: HOUSE_POS[r.slot].y + 2 };
    switch (r.shown) {
      case "open": return { ...DESK_POS[r.slot], y: DESK_POS[r.slot].y - 8, visible: true, seated: true };
      case "library": return { ...LIBRARY_SPOTS[r.slot], visible: true, seated: false };
      case "rest": return { ...REST_SPOTS[r.slot], visible: true, seated: false };
      default: return { ...door, visible: false, seated: false };
    }
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full select-none" role="group" aria-label={`마을 지도 — ${season.label}, ${phase.label}`}>
      <defs>
        <radialGradient id="grass" cx="50%" cy="45%" r="75%">
          <stop offset="0%" stopColor={season.ground} />
          <stop offset="100%" stopColor={season.ground2} />
        </radialGradient>
        <pattern id="cobble" width="26" height="18" patternUnits="userSpaceOnUse">
          <rect width="26" height="18" fill="#f1e2c4" />
          <ellipse cx="7" cy="5" rx="5.500" ry="3.200" fill="#e6d2ad" />
          <ellipse cx="20" cy="13" rx="5.500" ry="3.200" fill="#e9d8b6" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#grass)" />
      {/* 잔디 무늬 */}
      {Array.from({ length: 46 }, (_, i) => {
        const x = (i * 197 + 61) % W, y = (i * 113 + 37) % H;
        return <path key={i} d={`M${x} ${y} l3 -6 l2 6 l3 -5`} fill="none" stroke="rgb(91 70 54 / 0.13)" strokeWidth="1.5" strokeLinecap="round" />;
      })}

      {/* 산책로 */}
      <g fill="none" strokeLinecap="round">
        {[...HOUSE_POS.map((p, i) => [p.x + 25, p.y + 4, DESK_POS[i].x, DESK_POS[i].y + 14]), [LIBRARY.x, LIBRARY.y, PLAZA.x, PLAZA.y], [BOARD.x, BOARD.y - 20, PLAZA.x, PLAZA.y]].map(([x1, y1, x2, y2], i) => (
          <g key={i}>
            <path d={`M${x1} ${y1} L${x2} ${y2} L${PLAZA.x} ${PLAZA.y}`} stroke="#d9c39a" strokeWidth="27" strokeLinejoin="round" />
            <path d={`M${x1} ${y1} L${x2} ${y2} L${PLAZA.x} ${PLAZA.y}`} stroke="#f1e2c4" strokeWidth="22" strokeLinejoin="round" />
          </g>
        ))}
      </g>

      {/* 연못 */}
      <g transform="translate(905 598)">
        <ellipse rx="66" ry="34" fill="#cbb892" />
        <ellipse rx="60" ry="29" fill="#a9d7ee" stroke={LINE} strokeWidth="1.5" />
        <ellipse className="anim-ripple" cx="-14" cy="-4" rx="22" ry="9" fill="none" stroke="#fff" strokeWidth="1.5" />
        <ellipse cx="22" cy="8" rx="11" ry="5" fill="#8fc7a3" stroke={LINE} strokeWidth="1" />
        <circle cx="25" cy="6" r="2.500" fill="#f4a7b9" />
      </g>

      {/* 광장 */}
      <Hit x={PLAZA.x} y={PLAZA.y} label="마을 광장 — 눌러서 광장으로 가기" onActivate={() => onPlace("plaza")}>
        <ellipse rx="166" ry="97" fill="#d9c39a" />
        <ellipse rx="160" ry="92" fill="url(#cobble)" stroke={LINE} strokeWidth="1.5" />
        <ellipse className="hover-ring" rx="172" ry="103" fill="none" stroke="#6ea8dc" strokeWidth="3" strokeDasharray="6 5" />
        {/* 분수 */}
        <g transform="translate(0 -4)">
          <ellipse cy="6" rx="40" ry="16" fill="rgb(91 70 54 / 0.15)" />
          <ellipse rx="36" ry="15" fill="#e8dcc6" stroke={LINE} strokeWidth="2" />
          <ellipse cy="-2" rx="28" ry="10" fill="#a9d7ee" stroke={LINE} strokeWidth="1.5" />
          <ellipse className="anim-ripple" cy="-2" rx="26" ry="9" fill="none" stroke="#fff" strokeWidth="1.5" />
          <rect x="-4" y="-24" width="8" height="22" rx="3" fill="#e8dcc6" stroke={LINE} strokeWidth="1.5" />
          <path d="M0 -26 q-12 -10 -14 8 M0 -26 q12 -10 14 8" fill="none" stroke="#7fc4e8" strokeWidth="2.500" strokeLinecap="round" />
        </g>
        <Label y={84} size={14}>마을 광장</Label>
      </Hit>

      {/* 나무와 꽃 */}
      {[[36, 130], [300, 108, 0.9], [700, 108, 0.9], [962, 128], [28, 300, 0.9], [975, 300, 0.9], [60, 585], [130, 632, 0.85], [985, 500, 0.85], [335, 470, 0.7], [668, 500, 0.7]].map(([x, y, s], i) => (
        <Tree key={i} x={x} y={y} s={s ?? 1} color={season.leaves[i % season.leaves.length]} />
      ))}
      {[[250, 330], [760, 330], [50, 500], [640, 80], [360, 70], [160, 540], [840, 520], [950, 660], [420, 640]].map(([x, y], i) => (
        <Flowers key={i} x={x} y={y} colors={season.flowers} />
      ))}

      {/* 공동 도서관 */}
      <Hit x={LIBRARY.x} y={LIBRARY.y} label="공동 도서관 — 눌러서 열기" onActivate={() => onPlace("library")}>
        <ellipse cx="0" cy="2" rx="140" ry="13" fill="rgb(91 70 54 / 0.16)" />
        <ellipse className="hover-ring" cx="0" cy="2" rx="148" ry="17" fill="none" stroke="#6ea8dc" strokeWidth="3" strokeDasharray="6 5" />
        <rect x="-118" y="-104" width="236" height="104" rx="5" fill="#f6ead2" stroke={LINE} strokeWidth="2" />
        <path d="M-134 -100 L0 -158 L134 -100 Z" fill="#7fa7c9" stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
        <path d="M-134 -100 H134" stroke={LINE} strokeWidth="4" strokeLinecap="round" />
        <circle cx="0" cy="-122" r="12" fill="#fff5e1" stroke={LINE} strokeWidth="2" />
        <text x="0" y="-117" textAnchor="middle" fontSize="14">📚</text>
        {[-96, -56, 56, 96].map((cx) => (
          <g key={cx}>
            <rect x={cx - 7} y="-94" width="14" height="94" rx="3" fill="#fffaf0" stroke={LINE} strokeWidth="1.8" />
            <rect x={cx - 10} y="-96" width="20" height="7" rx="2" fill="#e8dcc6" stroke={LINE} strokeWidth="1.5" />
          </g>
        ))}
        {[-76, 76].map((cx) => (
          <g key={cx}>
            <rect x={cx - 11} y="-70" width="22" height="34" rx="11" fill="#ffe9a3" stroke={LINE} strokeWidth="1.8" />
            <path d={`M${cx} -70 V-36`} stroke={LINE} strokeWidth="1.2" opacity="0.5" />
          </g>
        ))}
        <path d="M-26 0 V-50 a26 26 0 0 1 52 0 V0 Z" fill="#b9825a" stroke={LINE} strokeWidth="2" />
        <path d="M0 0 V-76" stroke={LINE} strokeWidth="1.5" />
        <rect x="-46" y="-98" width="92" height="20" rx="6" fill="#fffaf0" stroke={LINE} strokeWidth="1.8" />
        <text x="0" y="-83" textAnchor="middle" fontSize="13" fill={LINE} style={{ fontFamily: "var(--font-display)" }}>공동 도서관</text>
      </Hit>

      {/* 집 6채 */}
      {houses.map((h) => {
        const r = bySlot.get(h.slot) ?? null;
        const mine = h.owner_id === myId;
        const label = !r ? `${h.slot + 1}번 집 — 빈 집` : mine ? "내 집 — 눌러서 연구실로 들어가기" : `${r.profile.display_name}의 집 — ${STATUS_META[r.shown].label}. 눌러서 미니홈피 보기`;
        return (
          <Hit key={h.slot} x={HOUSE_POS[h.slot].x} y={HOUSE_POS[h.slot].y} label={label} onActivate={() => onHouse(h.slot)}>
            <HouseSprite house={h} resident={r} isMine={mine} />
          </Hit>
        );
      })}

      {/* 게시판 */}
      <Hit x={BOARD.x} y={BOARD.y} label="마을 게시판 — 눌러서 열기" onActivate={() => onPlace("board")}>
        <ellipse cx="0" cy="2" rx="44" ry="7" fill="rgb(91 70 54 / 0.15)" />
        <ellipse className="hover-ring" cx="0" cy="2" rx="50" ry="10" fill="none" stroke="#6ea8dc" strokeWidth="3" strokeDasharray="6 5" />
        <rect x="-32" y="-18" width="6" height="20" fill="#b08a63" stroke={LINE} strokeWidth="1.5" />
        <rect x="26" y="-18" width="6" height="20" fill="#b08a63" stroke={LINE} strokeWidth="1.5" />
        <rect x="-40" y="-62" width="80" height="48" rx="5" fill="#c99b6d" stroke={LINE} strokeWidth="2" />
        <path d="M-46 -62 L0 -76 L46 -62 Z" fill="#e8837c" stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
        <rect x="-33" y="-56" width="20" height="16" fill="#fff" stroke={LINE} strokeWidth="1" transform="rotate(-4 -23 -48)" />
        <rect x="-8" y="-55" width="18" height="22" fill="#fbe7a8" stroke={LINE} strokeWidth="1" />
        <rect x="15" y="-56" width="18" height="15" fill="#cfe4f6" stroke={LINE} strokeWidth="1" transform="rotate(5 24 -48)" />
        <rect x="-32" y="-36" width="19" height="16" fill="#fde8ea" stroke={LINE} strokeWidth="1" />
        <Label y={18} size={14}>게시판</Label>
      </Hit>

      {/* 의자 (캐릭터 뒤) */}
      {DESK_POS.map((d, i) => (
        <rect key={i} x={d.x - 11} y={d.y - 40} width="22" height="26" rx="6" fill="#d9b48a" stroke={LINE} strokeWidth="1.5" opacity={houses[i]?.owner_id ? 1 : 0.5} />
      ))}

      {/* 시간대 색조 */}
      {phase.opacity > 0 && <rect width={W} height={H} fill={phase.tint} opacity={phase.opacity} pointerEvents="none" />}
      {clock.phase === "night" && (
        <g pointerEvents="none">
          {houses.map((h) => bySlot.get(h.slot)?.online && (
            <rect key={h.slot} x={HOUSE_POS[h.slot].x - 47} y={HOUSE_POS[h.slot].y - 64} width="36" height="34" rx="6" fill="#ffe9a3" opacity="0.55" />
          ))}
          {Array.from({ length: 14 }, (_, i) => (
            <circle key={i} className="anim-twinkle" cx={(i * 263 + 90) % W} cy={(i * 171 + 60) % H} r="2.200" fill="#fff6b8" style={{ animationDelay: `${(i % 5) * 0.5}s` }} />
          ))}
        </g>
      )}

      {/* 캐릭터 — 상태가 바뀌면 새 자리로 걸어간다 */}
      {residents.map((r) => {
        const t = target(r);
        const mine = r.user_id === myId;
        const meta = STATUS_META[r.shown];
        return (
          <g key={r.user_id} className="walker" style={{ transform: `translate(${t.x}px, ${t.y}px)`, opacity: t.visible ? 1 : 0, pointerEvents: t.visible ? "auto" : "none" }}>
            <g
              role="button"
              tabIndex={t.visible ? 0 : -1}
              aria-hidden={!t.visible}
              aria-label={`${r.profile.display_name}${mine ? " (나)" : ""} — ${meta.label}. 눌러서 프로필 보기`}
              className="scene-hit"
              onClick={(e) => {
                e.stopPropagation();
                onCharacter(r.user_id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onCharacter(r.user_id);
                }
              }}
            >
              <ellipse className="hover-ring" cx="0" cy="-28" rx="24" ry="38" fill="rgb(255 255 255 / 0.35)" stroke="#6ea8dc" strokeWidth="2.500" strokeDasharray="5 4" />
              {!t.seated && <ellipse cx="0" cy="1" rx="14" ry="4" fill="rgb(91 70 54 / 0.2)" />}
              <g className="anim-bob" style={{ animationDelay: `${r.slot * 0.35}s` }}>
                <CharacterG avatar={r.profile.avatar} seated={t.seated} />
              </g>
              <g transform="translate(0 -66)">
                <Label y={0} size={14}>{meta.icon} {r.profile.display_name}{mine ? " (나)" : ""}</Label>
              </g>
            </g>
          </g>
        );
      })}

      {/* 집 앞 책상 (앉은 캐릭터 앞을 가린다) */}
      {DESK_POS.map((d, i) => {
        const r = bySlot.get(i);
        return <g key={i} opacity={houses[i]?.owner_id ? 1 : 0.5} pointerEvents="none"><Desk x={d.x} y={d.y} occupied={r?.shown === "open"} /></g>;
      })}
    </svg>
  );
}
