import { HAIR_COLORS, OUTFITS, SKINS } from "@/lib/constants";
import type { Avatar } from "@/lib/types";
import { grid, outline, px, rect, shade, type Grid } from "./core";

export const AV_W = 18;
export const AV_H = 25;

/**
 * 도트 캐릭터 한 프레임. 발끝 가운데가 (9, 24).
 * frame 0 = 서 있음, 1·2 = 걷는 동작. seated 면 다리를 그리지 않는다.
 */
export function avatarGrid(avatar: Avatar, frame: 0 | 1 | 2 = 0, seated = false): Grid {
  const skin = avatar.skin ?? SKINS[0];
  const hair = avatar.hairColor ?? HAIR_COLORS[0];
  const outfit = avatar.outfit ?? OUTFITS[0];
  const style = avatar.hair ?? "short";
  const acc = avatar.accessory ?? "none";
  const skinD = shade(skin, -34);
  const hairL = shade(hair, 38);
  const hairD = shade(hair, -26);
  const outD = shade(outfit, -42);
  const outL = shade(outfit, 30);
  const g = grid(AV_W, AV_H);

  // 뒷머리
  if (style === "long") rect(g, 3, 7, 12, 11, hairD);
  if (style === "bob") rect(g, 3, 7, 12, 7, hairD);
  if (style === "curly") {
    rect(g, 2, 6, 14, 6, hairD);
    px(g, 2, 8, null); px(g, 15, 8, null); px(g, 2, 11, null); px(g, 15, 11, null);
  }

  // 다리
  if (!seated) {
    const pants = "#5b5068", shoe = "#7a4a3a";
    const l = frame === 1 ? 1 : 0, r = frame === 2 ? 1 : 0;
    rect(g, 6, 20, 2, 3 - l, pants);
    rect(g, 10, 20, 2, 3 - r, pants);
    rect(g, 5 + (frame === 1 ? 1 : 0), 23 - l, 3, 1, shoe);
    rect(g, 10, 23 - r, 3 - (frame === 2 ? 1 : 0), 1, shoe);
  }

  // 몸
  rect(g, 5, 14, 8, 6, outfit);
  rect(g, 5, 19, 8, 1, outD);
  rect(g, 12, 15, 1, 4, outD);
  rect(g, 8, 14, 2, 1, outL);
  // 팔
  const swing = seated ? 0 : frame === 1 ? -1 : frame === 2 ? 1 : 0;
  rect(g, 4, 15, 1, 3 + (swing < 0 ? -1 : 0), outD);
  px(g, 4, 18 + (swing < 0 ? -1 : 0), skin);
  rect(g, 13, 15, 1, 3 + (swing > 0 ? -1 : 0), outD);
  px(g, 13, 18 + (swing > 0 ? -1 : 0), skin);
  if (acc === "scarf") {
    rect(g, 5, 13, 8, 2, "#e0605a");
    rect(g, 10, 15, 2, 3, "#c94c4c");
  }

  // 얼굴
  rect(g, 4, 5, 10, 9, skin);
  px(g, 4, 13, null); px(g, 13, 13, null);
  rect(g, 5, 13, 8, 1, skinD);
  px(g, 6, 9, "#3a2a33"); px(g, 6, 10, "#3a2a33");
  px(g, 11, 9, "#3a2a33"); px(g, 11, 10, "#3a2a33");
  px(g, 5, 11, "#f29aa8"); px(g, 12, 11, "#f29aa8");
  px(g, 8, 12, "#b5574f"); px(g, 9, 12, "#b5574f");
  if (acc === "glasses") {
    // 동그란 안경: 눈을 감싸는 4×4 고리 두 개 + 코다리 + 다리
    const frame = "#4a3d5c", glass = "#e3f3fb";
    for (const x0 of [5, 10]) {
      px(g, x0 + 1, 8, frame); px(g, x0 + 2, 8, frame);
      px(g, x0 + 1, 11, frame); px(g, x0 + 2, 11, frame);
      px(g, x0, 9, frame); px(g, x0, 10, frame);
      px(g, x0 + 3, 9, frame); px(g, x0 + 3, 10, frame);
    }
    for (const [x, y] of [[7, 9], [7, 10], [12, 9], [12, 10]]) px(g, x, y, glass);
    px(g, 9, 9, frame); px(g, 4, 9, frame);
  }
  // 앞머리
  rect(g, 5, 2, 8, 1, hair);
  rect(g, 4, 3, 10, 1, hair);
  rect(g, 3, 4, 12, 3, hair);
  px(g, 3, 7, hair); px(g, 4, 7, hair); px(g, 13, 7, hair); px(g, 14, 7, hair);
  px(g, 5, 7, hair); px(g, 8, 7, hair); px(g, 9, 7, hair);
  rect(g, 6, 3, 3, 1, hairL); px(g, 5, 4, hairL);
  rect(g, 3, 6, 1, 1, hairD); rect(g, 14, 6, 1, 1, hairD);
  if (style === "short") { px(g, 3, 8, hair); px(g, 14, 8, hair); }
  if (style === "bob" || style === "long") {
    rect(g, 3, 8, 1, style === "long" ? 9 : 5, hair);
    rect(g, 14, 8, 1, style === "long" ? 9 : 5, hair);
    if (style === "long") { rect(g, 4, 14, 1, 3, hair); rect(g, 13, 14, 1, 3, hair); }
  }
  if (style === "bun") {
    rect(g, 7, 0, 4, 2, hair); px(g, 6, 1, hair); px(g, 11, 1, hair);
    px(g, 8, 0, hairL); px(g, 3, 8, hair); px(g, 14, 8, hair);
  }
  if (style === "curly") {
    for (const x of [4, 5, 8, 9, 12, 13]) px(g, x, 1, hair);
    rect(g, 3, 2, 12, 1, hair);
    rect(g, 2, 3, 14, 4, hair);
    px(g, 2, 5, null); px(g, 15, 5, null);
    rect(g, 2, 7, 2, 4, hair); rect(g, 14, 7, 2, 4, hair);
    px(g, 6, 7, hair); px(g, 7, 7, hairD); px(g, 10, 7, hair); px(g, 11, 7, hairD);
    px(g, 5, 3, hairL); px(g, 9, 2, hairL); px(g, 12, 4, hairL);
  }
  if (acc === "ribbon") {
    rect(g, 10, 2, 2, 2, "#e0605a"); rect(g, 13, 2, 2, 2, "#e0605a"); px(g, 12, 3, "#c94c4c");
  }
  if (acc === "beret") {
    rect(g, 4, 1, 10, 1, "#8a5a9c");
    rect(g, 2, 2, 13, 2, "#8a5a9c");
    rect(g, 3, 4, 11, 1, "#6f4680");
    px(g, 9, 0, "#6f4680"); rect(g, 5, 2, 3, 1, "#a878b8");
  }
  return outline(g);
}
