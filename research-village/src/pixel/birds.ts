import { INK, grid, outline, px, rect, type Grid } from "./core";

/** 지붕에 앉는 작은 새 네 종류 (겨울 카드의 새들): 푸른 새, 수컷 홍관조, 암컷 홍관조, 박새 */
export const BIRD_KINDS = ["bluebird", "cardinal", "hen", "chickadee"] as const;
export type BirdKind = (typeof BIRD_KINDS)[number];

const PAL: Record<BirdKind, { back: string; backD: string; head: string; belly: string; breast: string; beak: string; face?: string; cheek?: string; crest: boolean; wing: string }> = {
  bluebird: { back: "#3f7fd0", backD: "#2a5aa8", head: "#4a8ae0", belly: "#f4f2ea", breast: "#e69a52", beak: "#3a2a33", crest: false, wing: "#2a5aa8" },
  cardinal: { back: "#d92b2b", backD: "#a81c1c", head: "#e63a35", belly: "#d92b2b", breast: "#e63a35", beak: "#ff9a2e", face: "#2b1a1a", crest: true, wing: "#a81c1c" },
  hen: { back: "#cfa874", backD: "#d65a4a", head: "#d9b27a", belly: "#ecd49a", breast: "#e6c98a", beak: "#ff6a3a", face: "#a8683a", crest: true, wing: "#d65a4a" },
  chickadee: { back: "#7d838c", backD: "#5f656e", head: "#2a2a2e", belly: "#eee3c8", breast: "#eee3c8", beak: "#3a2a33", cheek: "#ffffff", crest: false, wing: "#5f656e" },
};

/** pose: 0 앉아 있기 · 1 콕 쪼기 · 2 꼬리 까딱 · 3 날개 펼치고 날아오기. 바닥(발)이 맨 아래 줄 */
export function birdGrid(kind: BirdKind, pose: 0 | 1 | 2 | 3): Grid {
  const p = PAL[kind];
  const g = grid(14, 12);
  const ox = 1, oy = 1;                                             // 윤곽선 여유
  const R = (x: number, y: number, w: number, h: number, c: string) => rect(g, ox + x, oy + y, w, h, c);
  const P = (x: number, y: number, c: string) => px(g, ox + x, oy + y, c);
  const fly = pose === 3;
  const bodyY = fly ? 3 : 4;
  // 꼬리
  R(0, bodyY + (pose === 2 ? 0 : 1), 4, 2, p.backD);
  // 몸통
  R(3, bodyY, 6, 4, p.back); R(3, bodyY, 6, 1, p.head === p.back ? p.back : p.back);
  R(5, bodyY + 2, 4, 2, p.belly); P(8, bodyY + 1, p.breast); R(7, bodyY + 1, 2, 1, p.breast);
  R(4, bodyY + 1, 3, 2, p.wing);                                   // 날개
  if (fly) { R(3, bodyY - 3, 3, 3, p.wing); P(4, bodyY - 4, p.wing); R(5, bodyY - 2, 2, 2, p.backD); }   // 치켜든 날개
  // 머리
  const hy = pose === 1 ? 3 : 0, hx = pose === 1 ? 1 : 0;
  R(7 + hx, 1 + hy + (fly ? 1 : 0), 4, 4, p.head);
  if (p.crest) { P(7 + hx, hy + (fly ? 1 : 0), p.head); P(8 + hx, hy + (fly ? 1 : 0), p.head); P(7 + hx, hy - 1 < -1 ? -1 : hy - 1 + (fly ? 1 : 0), p.head); }
  if (kind === "chickadee") { R(8 + hx, 3 + hy + (fly ? 1 : 0), 3, 2, p.cheek!); R(10 + hx, 4 + hy + (fly ? 1 : 0), 1, 1, "#2a2a2e"); }   // 하얀 볼과 검은 턱받이
  if (p.face) R(9 + hx, 2 + hy + (fly ? 1 : 0), 2, 2, p.face);      // 부리 둘레 검은(갈색) 얼굴
  P(11 + hx, 2 + hy + (fly ? 1 : 0), p.beak);                       // 부리
  if (kind === "cardinal" || kind === "hen") P(11 + hx, 3 + hy + (fly ? 1 : 0), p.beak);   // 홍관조는 굵은 부리
  P(9 + hx, 2 + hy + (fly ? 1 : 0), kind === "chickadee" ? "#ffffff" : INK);   // 눈 (박새는 하얀 볼 위라 눈을 검게 따로 찍는다)
  if (kind === "chickadee") P(9 + hx, 3 + hy + (fly ? 1 : 0), INK);
  if (!fly) { P(5, 8, "#7a5a3a"); P(7, 8, "#7a5a3a"); }              // 발
  return outline(g);
}
