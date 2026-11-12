import { HAIR_COLORS, OUTFITS, SKINS } from "@/lib/constants";
import type { Avatar } from "@/lib/types";

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount)));
  return `rgb(${ch(n >> 16)}, ${ch((n >> 8) & 255)}, ${ch(n & 255)})`;
}

/**
 * 연구자 캐릭터 (SVG <g>). 원점은 발끝 가운데, 키는 약 58.
 * seated: 책상에 앉은 모습(다리를 그리지 않음)
 */
export function CharacterG({ avatar, seated = false }: { avatar: Avatar; seated?: boolean }) {
  const skin = avatar.skin ?? SKINS[0];
  const hairColor = avatar.hairColor ?? HAIR_COLORS[0];
  const outfit = avatar.outfit ?? OUTFITS[0];
  const hair = avatar.hair ?? "short";
  const acc = avatar.accessory ?? "none";
  const line = "#5b4636";
  const outfitDark = shade(outfit, -32);
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      {/* 긴 머리 뒷부분 */}
      {hair === "long" && <path d="M-15 -46 q-3 22 1 30 h28 q4 -8 1 -30 z" fill={hairColor} stroke={line} strokeWidth="1.5" />}
      {hair === "bun" && <circle cx="0" cy="-60" r="6.5" fill={hairColor} stroke={line} strokeWidth="1.5" />}
      {/* 다리 */}
      {!seated && (
        <>
          <rect x="-8" y="-9" width="6" height="9" rx="2.5" fill={shade(outfit, -70)} stroke={line} strokeWidth="1.5" />
          <rect x="2" y="-9" width="6" height="9" rx="2.5" fill={shade(outfit, -70)} stroke={line} strokeWidth="1.5" />
        </>
      )}
      {/* 몸 */}
      <path d="M-11 -8 q-2 -17 4 -21 h14 q6 4 4 21 z" fill={outfit} stroke={line} strokeWidth="1.5" />
      <path d="M-4 -29 l4 5 l4 -5" fill="none" stroke={outfitDark} strokeWidth="1.5" />
      {/* 팔 */}
      <path d="M-10 -24 q-6 6 -4 13" fill="none" stroke={line} strokeWidth="5.5" />
      <path d="M-10 -24 q-6 6 -4 13" fill="none" stroke={outfit} strokeWidth="3" />
      <path d="M10 -24 q6 6 4 13" fill="none" stroke={line} strokeWidth="5.5" />
      <path d="M10 -24 q6 6 4 13" fill="none" stroke={outfit} strokeWidth="3" />
      {acc === "scarf" && <path d="M-8 -30 h16 v4 h-5 l1 8 h-5 l1 -8 h-8 z" fill="#e8837c" stroke={line} strokeWidth="1.3" />}
      {/* 머리 */}
      <circle cx="0" cy="-42" r="14.5" fill={skin} stroke={line} strokeWidth="1.5" />
      {/* 앞머리 */}
      {hair === "short" && <path d="M-14.5 -43 q0 -15 14.5 -15 q14.5 0 14.5 15 q-6 -7 -13 -7 q-9 0 -16 7 z" fill={hairColor} stroke={line} strokeWidth="1.5" />}
      {hair === "bob" && <path d="M-15 -34 q-3 -24 15 -24 q18 0 15 24 l-4 0 q1 -12 -3 -15 q-8 3 -16 0 q-4 3 -3 15 z" fill={hairColor} stroke={line} strokeWidth="1.5" />}
      {hair === "long" && <path d="M-14.5 -40 q-1 -18 14.5 -18 q15.5 0 14.5 18 q-4 -9 -10 -10 q-10 4 -19 10 z" fill={hairColor} stroke={line} strokeWidth="1.5" />}
      {hair === "bun" && <path d="M-14.5 -43 q0 -14 14.5 -14 q14.5 0 14.5 14 q-7 -6 -14.5 -6 q-7.500 0 -14.5 6 z" fill={hairColor} stroke={line} strokeWidth="1.5" />}
      {hair === "curly" && (
        <g fill={hairColor} stroke={line} strokeWidth="1.5">
          <circle cx="-11" cy="-49" r="6" /><circle cx="-4" cy="-55" r="6.5" /><circle cx="5" cy="-55" r="6.5" /><circle cx="12" cy="-49" r="6" />
          <circle cx="-14" cy="-41" r="4.5" /><circle cx="14" cy="-41" r="4.500" />
          <path d="M-11 -48 q11 -8 22 0 q-11 -4 -22 0 z" stroke="none" />
        </g>
      )}
      {/* 얼굴 */}
      <ellipse cx="-5.500" cy="-40" rx="1.800" ry="2.300" fill={line} />
      <ellipse cx="5.500" cy="-40" rx="1.800" ry="2.300" fill={line} />
      <ellipse cx="-9" cy="-35.500" rx="3" ry="1.800" fill="#f4a7b9" opacity="0.75" />
      <ellipse cx="9" cy="-35.500" rx="3" ry="1.800" fill="#f4a7b9" opacity="0.75" />
      <path d="M-2.500 -35 q2.500 2.500 5 0" fill="none" stroke={line} strokeWidth="1.3" />
      {acc === "glasses" && (
        <g fill="rgb(255 255 255 / 0.35)" stroke={line} strokeWidth="1.3">
          <circle cx="-5.500" cy="-40" r="4.200" /><circle cx="5.500" cy="-40" r="4.200" /><path d="M-1.300 -40 h2.600" />
        </g>
      )}
      {acc === "ribbon" && (
        <g fill="#e8837c" stroke={line} strokeWidth="1.2">
          <path d="M8 -55 l-7 -4 v8 z" /><path d="M8 -55 l7 -4 v8 z" /><circle cx="8" cy="-55" r="2" />
        </g>
      )}
      {acc === "beret" && (
        <g stroke={line} strokeWidth="1.5">
          <ellipse cx="-2" cy="-56" rx="15" ry="6.500" fill="#8a5a8c" transform="rotate(-10 -2 -56)" />
          <path d="M-1 -63 v-3" fill="none" />
        </g>
      )}
    </g>
  );
}

/** HTML 안에서 쓰는 캐릭터 아이콘 */
export function CharacterIcon({ avatar, size = 56, className = "" }: { avatar: Avatar; size?: number; className?: string }) {
  return (
    <svg viewBox="-24 -70 48 72" width={size * (48 / 72)} height={size} className={className} aria-hidden>
      <CharacterG avatar={avatar} />
    </svg>
  );
}
