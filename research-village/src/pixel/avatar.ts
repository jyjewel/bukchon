import { HAIR_COLORS, OUTFITS, SKINS } from "@/lib/constants";
import type { Avatar } from "@/lib/types";
import { grid, outline, px, rect, shade, stamp, type Grid } from "./core";

/** 캐릭터 그림 한 장의 크기. 본체는 가운데 18칸이고 양옆 3칸은 손에 든 소품 자리다. */
export const AV_W = 24;
export const AV_H = 25;
/** 발끝 가운데 가로 칸 */
export const AV_CX = 12;
const OX = 3;

export interface FullAvatar {
  skin: string; hair: string; hairColor: string; eyes: string; top: string;
  outfit: string; accent: string; hat: string; accessories: string[]; props: string[];
}

/** 저장된 값에서 빠진 항목을 기본값으로 채운다. 예전의 '한 개만 고르던' 액세서리도 새 형식으로 바꾼다. */
export function normalizeAvatar(a: Avatar): FullAvatar {
  const legacy = a.accessory ?? "none";
  const hat = a.hat ?? (legacy === "beret" ? "beret" : "none");
  const accessories = a.accessories ?? (["glasses", "ribbon", "scarf"].includes(legacy) ? [legacy] : []);
  return {
    skin: a.skin ?? SKINS[0], hair: a.hair === "undercut" ? "short" : a.hair ?? "short", hairColor: a.hairColor ?? HAIR_COLORS[0], eyes: a.eyes ?? "default",
    top: a.top ?? "tee", outfit: a.outfit ?? OUTFITS[0], accent: a.accent ?? "#e0605a", hat, accessories, props: a.props ?? (a.prop && a.prop !== "none" ? [a.prop] : []),
  };
}

const INKC = "#3a2a33";
/** 옷 종류별로 몸통과 소매를 그린다 (본체 좌표 18칸 기준) */
function drawTop(g: Grid, f: FullAvatar, frame: number, seated: boolean) {
  const { top, outfit, accent, skin } = f;
  let main = outfit, side = shade(outfit, -42), hi = shade(outfit, 30), sleeve = side;
  if (top === "suit") { main = "#f4f6fa"; side = "#c8cfdc"; hi = "#ffffff"; sleeve = side; }
  if (top === "labcoat") { main = "#f7f9fc"; side = "#cdd5e2"; hi = "#ffffff"; sleeve = side; }
  if (top === "gown") { main = "#37314a"; side = "#262136"; hi = "#4a4263"; sleeve = side; }
  if (top === "vest") sleeve = "#e4e8f0";                           // 조끼 안에 입은 긴팔
  if (top === "hoodie" || top === "sweatshirt" || top === "pullover" || top === "fleece") sleeve = shade(outfit, -26);
  const last = top === "labcoat" ? 21 : top === "gown" ? 22 : 19; // 몸통 마지막 줄
  const wide = top === "gown";

  rect(g, wide ? 4 : 5, 14, wide ? 10 : 8, last - 13, main);
  rect(g, wide ? 4 : 5, last, wide ? 10 : 8, 1, side);
  rect(g, 12, 15, 1, last - 15, side);
  rect(g, 8, 14, 2, 1, hi);

  if (top === "stripe") {
    for (const y of [15, 17, 19]) rect(g, 5, y, 8, 1, "#f6f2ea");
    rect(g, 6, 14, 6, 1, side);
  }
  if (top === "hoodie") {
    rect(g, 4, 14, 10, 1, side);                                      // 목 뒤로 넘어온 모자
    px(g, 7, 15, "#ffffff"); px(g, 7, 16, "#ffffff"); px(g, 10, 15, "#ffffff"); px(g, 10, 16, "#ffffff"); // 끈
    rect(g, 6, 18, 6, 2, shade(main, -16)); px(g, 6, 18, side); px(g, 11, 18, side);                       // 주머니
  }
  if (top === "sweatshirt") {
    rect(g, 6, 14, 6, 1, side);                                       // 목 시보리
    rect(g, 5, 19, 8, 1, side); px(g, 5, 18, hi); px(g, 12, 18, hi);  // 밑단 시보리
    rect(g, 10, 16, 2, 1, shade(main, 55)); px(g, 10, 17, shade(main, 55)); // 가슴 로고
  }
  if (top === "pullover") {
    rect(g, 5, 14, 8, 2, shade(outfit, -34));                         // 윗부분 색 블록
    rect(g, 6, 14, 6, 1, shade(outfit, -52));
    rect(g, 9, 14, 1, 4, "#e8e8f0"); px(g, 9, 18, "#c8c8d4");       // 반집업 지퍼
    rect(g, 5, 19, 8, 1, side);
  }
  if (top === "fleece") {
    rect(g, 5, 14, 8, 1, shade(outfit, -38));                         // 세운 깃
    rect(g, 9, 14, 1, 6, "#e8e8f0"); px(g, 9, 19, "#b8b8c8");        // 집업 지퍼
    rect(g, 10, 16, 2, 2, shade(outfit, -26)); px(g, 10, 16, "#e8e8f0"); // 가슴 주머니
    rect(g, 5, 19, 8, 1, shade(outfit, -38));
  }
  if (top === "vest") {
    for (const y of [16, 18]) rect(g, 5, y, 8, 1, side);              // 퀼팅 줄
    rect(g, 5, 14, 8, 1, shade(outfit, -36)); rect(g, 9, 14, 1, 6, "#d8dae4"); // 깃, 지퍼
    rect(g, 10, 15, 2, 1, shade(outfit, 45));                         // 가슴 로고
  }
  if (top === "corduroy") {
    for (const x of [6, 10, 12]) rect(g, x, 15, 1, 4, side);
    rect(g, 8, 14, 2, 6, "#f4eee0");
    px(g, 7, 14, side); px(g, 10, 14, side); px(g, 7, 15, side); px(g, 10, 15, side);
    px(g, 8, 18, "#c9bda6"); px(g, 9, 18, "#c9bda6");
    rect(g, 6, 18, 1, 1, shade(main, -60)); rect(g, 11, 18, 1, 1, shade(main, -60));
  }
  if (top === "suit") {
    px(g, 7, 14, "#dfe5ee"); px(g, 10, 14, "#dfe5ee"); px(g, 6, 14, "#dfe5ee"); px(g, 11, 14, "#dfe5ee");
    rect(g, 8, 14, 2, 1, accent);
    rect(g, 8, 15, 2, 3, accent); rect(g, 8, 18, 2, 1, shade(accent, -34));
    rect(g, 12, 14, 1, 5, "#dde3ee");
  }
  if (top === "labcoat") {
    rect(g, 8, 14, 2, 6, outfit);       // 안에 입은 옷
    rect(g, 8, 20, 2, 2, "#5b5068");
    rect(g, 7, 14, 1, 8, side); rect(g, 10, 14, 1, 8, side);
    rect(g, 11, 17, 2, 2, side); px(g, 12, 16, "#e0605a"); px(g, 12, 15, "#5f8fd6");
    px(g, 6, 14, side); px(g, 11, 14, side);
  }
  if (top === "gown") {
    rect(g, 7, 14, 1, 8, accent); rect(g, 10, 14, 1, 8, accent);
    rect(g, 7, 14, 4, 1, shade(accent, -20));
    rect(g, 12, 15, 1, 7, side);
  }

  // 팔(소매) — 걸을 때 앞뒤로 흔들린다
  const swing = seated ? 0 : frame === 1 ? -1 : frame === 2 ? 1 : 0;
  const lx = wide ? 3 : 4, rx = wide ? 14 : 13;
  rect(g, lx, 15, wide ? 2 : 1, 3 + (swing < 0 ? -1 : 0), sleeve);
  px(g, lx, 18 + (swing < 0 ? -1 : 0), skin);
  rect(g, rx, 15, wide ? 2 : 1, 3 + (swing > 0 ? -1 : 0), sleeve);
  px(g, rx + (wide ? 1 : 0), 18 + (swing > 0 ? -1 : 0), skin);
  if (top === "stripe") { px(g, lx, 16, "#f6f2ea"); px(g, rx, 16, "#f6f2ea"); }
  if (top === "sweatshirt") { px(g, lx, 17, shade(outfit, -60)); px(g, rx, 17, shade(outfit, -60)); } // 소매 시보리
}

/** 표정(눈). 'focus' 의 불꽃은 앞머리를 그린 뒤에 덧그린다. */
function drawEyes(g: Grid, eyes: string) {
  const k = INKC;
  const happy = (x: number) => { px(g, x - 1, 10, k); px(g, x, 9, k); px(g, x + 1, 10, k); };
  const normal = (x: number) => { px(g, x, 9, k); px(g, x, 10, k); };
  if (eyes === "smile") { happy(6); happy(11); }
  else if (eyes === "sleepy") { for (const x of [5, 6, 7, 10, 11, 12]) px(g, x, 10, k); px(g, 6, 9, shade("#f6cba6", -30)); px(g, 11, 9, shade("#f6cba6", -30)); }
  else if (eyes === "wink") { normal(6); happy(11); }
  else if (eyes === "focus") {
    for (const x of [6, 11]) { px(g, x, 8, "#ffd23f"); px(g, x, 9, "#ff7a2f"); px(g, x, 10, "#e0302a"); px(g, x - 1, 9, "#ffffff"); }
  } else { normal(6); normal(11); }
}
function drawFocusFlames(g: Grid) {
  for (const x of [6, 11]) { px(g, x, 7, "#ff9a3f"); px(g, x - 1 + (x === 6 ? 0 : 2), 7, "#ffd23f"); px(g, x, 6, "#ff5a1f"); }
}

/**
 * 도트 캐릭터 한 프레임. 발끝 가운데가 (AV_CX, 24).
 * frame 0 = 서 있음, 1·2 = 걷는 동작. seated 면 다리를 그리지 않는다.
 */
export function avatarGrid(avatar: Avatar, frame: 0 | 1 | 2 = 0, seated = false): Grid {
  const f = normalizeAvatar(avatar);
  const { skin, hairColor: hair, hair: style, accent, hat } = f;
  const has = (id: string) => f.accessories.includes(id);
  const skinD = shade(skin, -34);
  const hairL = shade(hair, 38);
  const hairD = shade(hair, -26);
  const g = grid(18, AV_H);

  // 뒷머리
  if (style === "long") rect(g, 3, 7, 12, 11, hairD);
  if (style === "bob") rect(g, 3, 7, 12, 7, hairD);
  if (style === "curly") {
    rect(g, 2, 6, 14, 6, hairD);
    px(g, 2, 8, null); px(g, 15, 8, null); px(g, 2, 11, null); px(g, 15, 11, null);
  }
  if (style === "curlybob") {
    rect(g, 2, 6, 14, 9, hairD);
    for (const [x, y] of [[2, 6], [15, 6], [2, 9], [15, 9], [2, 12], [15, 12], [3, 14], [5, 14], [8, 14], [10, 14], [12, 14]]) px(g, x, y, null);
  }
  if (style === "hippie") {
    // 히피펌: 굽이치는 긴 파마머리 (가장자리가 물결 모양)
    for (let y = 5; y <= 19; y++) {
      const wl = Math.floor(y / 2) % 2, wr = Math.floor((y + 1) / 2) % 2;
      rect(g, 2 + wl, y, 14 - wl - wr, 1, hairD);
    }
  }
  if (f.props.includes("backpack")) {
    // 등에 멘 가방이 몸 옆으로 살짝 보인다
    rect(g, 2, 15, 2, 6, accent); rect(g, 14, 15, 2, 6, accent);
    rect(g, 2, 15, 1, 6, shade(accent, -40)); rect(g, 15, 15, 1, 6, shade(accent, -40));
    px(g, 3, 16, shade(accent, 45)); px(g, 14, 16, shade(accent, 45));
    px(g, 3, 14, accent); px(g, 14, 14, accent);
  }
  if (style === "ponytail") {
    rect(g, 14, 5, 3, 7, hair); rect(g, 15, 12, 2, 4, hair); rect(g, 16, 5, 1, 11, hairD);
    rect(g, 14, 5, 2, 1, hairL); px(g, 14, 6, accent); px(g, 15, 6, accent);
  }
  if (style === "pigtails") {
    for (const x0 of [1, 14]) { rect(g, x0, 6, 3, 8, hair); rect(g, x0 + (x0 === 1 ? 0 : 2), 6, 1, 8, hairD); rect(g, x0, 14, 2, 2, hair); }
    px(g, 2, 6, "#ff8fab"); px(g, 3, 6, "#ff8fab"); px(g, 14, 6, "#ff8fab"); px(g, 15, 6, "#ff8fab");
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
  drawTop(g, f, frame, seated);
  if (f.props.includes("backpack")) {
    const strap = shade(accent, -48);
    rect(g, 6, 14, 1, 6, strap); rect(g, 11, 14, 1, 6, strap);
    rect(g, 6, 16, 6, 1, shade(accent, -20));                          // 가슴 끈
  }
  if (has("scarf")) {
    rect(g, 5, 13, 8, 2, "#e0605a");
    rect(g, 10, 15, 2, 3, "#c94c4c");
  }

  // 얼굴
  rect(g, 4, 5, 10, 9, skin);
  px(g, 4, 13, null); px(g, 13, 13, null);
  rect(g, 5, 13, 8, 1, skinD);
  drawEyes(g, f.eyes);
  px(g, 5, 11, "#f29aa8"); px(g, 12, 11, "#f29aa8");
  if (f.eyes === "smile") { px(g, 7, 12, "#b5574f"); px(g, 8, 13, "#b5574f"); px(g, 9, 13, "#b5574f"); px(g, 10, 12, "#b5574f"); }
  else { px(g, 8, 12, "#b5574f"); px(g, 9, 12, "#b5574f"); }
  if (f.eyes === "wink") px(g, 10, 12, "#b5574f");

  // 안경류
  if (has("glasses")) {
    const frameC = "#4a3d5c", glass = "#e3f3fb";
    for (const x0 of [5, 10]) {
      px(g, x0 + 1, 8, frameC); px(g, x0 + 2, 8, frameC);
      px(g, x0 + 1, 11, frameC); px(g, x0 + 2, 11, frameC);
      px(g, x0, 9, frameC); px(g, x0, 10, frameC);
      px(g, x0 + 3, 9, frameC); px(g, x0 + 3, 10, frameC);
    }
    for (const [x, y] of [[7, 9], [7, 10], [12, 9], [12, 10]]) px(g, x, y, glass);
    px(g, 9, 9, frameC); px(g, 4, 9, frameC);
  }
  if (has("square")) {
    const frameC = "#2f3a4a", glass = "#e3f3fb";
    for (const x0 of [5, 10]) {
      rect(g, x0, 8, 4, 1, frameC); rect(g, x0, 11, 4, 1, frameC);
      rect(g, x0, 9, 1, 2, frameC); rect(g, x0 + 3, 9, 1, 2, frameC);
    }
    for (const [x, y] of [[7, 9], [7, 10], [12, 9], [12, 10]]) px(g, x, y, glass);
    px(g, 9, 9, frameC); px(g, 4, 9, frameC);
  }
  if (has("sunglasses")) {
    rect(g, 5, 8, 4, 3, "#23232f"); rect(g, 10, 8, 4, 3, "#23232f");
    rect(g, 9, 8, 1, 1, "#23232f"); rect(g, 4, 8, 1, 1, "#23232f");
    px(g, 6, 8, "#5a5a78"); px(g, 11, 8, "#5a5a78"); px(g, 7, 9, "#3a3a50"); px(g, 12, 9, "#3a3a50");
  }
  if (has("mask")) {
    rect(g, 5, 11, 8, 3, "#eef6fb");
    rect(g, 5, 12, 8, 1, "#cfe2ee");
    px(g, 4, 11, "#cfe2ee"); px(g, 13, 11, "#cfe2ee"); px(g, 4, 10, "#cfe2ee"); px(g, 13, 10, "#cfe2ee");
  }

  // 앞머리
  const front = () => {
    rect(g, 5, 2, 8, 1, hair);
    rect(g, 4, 3, 10, 1, hair);
    rect(g, 3, 4, 12, 3, hair);
    px(g, 3, 7, hair); px(g, 4, 7, hair); px(g, 13, 7, hair); px(g, 14, 7, hair);
    px(g, 5, 7, hair); px(g, 8, 7, hair); px(g, 9, 7, hair);
    rect(g, 6, 3, 3, 1, hairL); px(g, 5, 4, hairL);
    rect(g, 3, 6, 1, 1, hairD); rect(g, 14, 6, 1, 1, hairD);
  };
  if (style === "bald") {
    // 삭발: 반질반질한 머리 + 반짝임
    rect(g, 6, 3, 6, 1, skin); rect(g, 5, 4, 8, 1, skin);
    rect(g, 7, 3, 2, 1, "#fffdf0"); px(g, 6, 4, "#fffdf0"); px(g, 9, 4, "#fff6d8");
    for (const [x, y] of [[13, 1], [12, 2], [13, 2], [14, 2], [13, 3]]) px(g, x, y, "#fff6c0");
    px(g, 13, 2, "#ffffff");
  } else if (style === "receding") {
    // 반대머리: 이마가 넓게 벗겨지고 정수리 쪽과 옆머리만 남은 머리
    rect(g, 6, 3, 6, 1, skin); rect(g, 6, 4, 6, 1, skin);
    rect(g, 5, 2, 8, 1, hair); rect(g, 4, 3, 2, 1, hair); rect(g, 12, 3, 2, 1, hair);
    rect(g, 3, 4, 3, 3, hair); rect(g, 12, 4, 3, 3, hair);
    rect(g, 3, 7, 1, 2, hair); rect(g, 14, 7, 1, 2, hair);
    rect(g, 7, 4, 3, 1, "#fffdf0"); px(g, 6, 5, "#fff3d8");              // 반짝이는 이마
    px(g, 8, 3, hairL); px(g, 9, 2, hairL); px(g, 7, 2, hairL);
    rect(g, 3, 6, 1, 1, hairD); rect(g, 14, 6, 1, 1, hairD);
  } else if (style === "curly" || style === "curlybob") {
    front();
    for (const x of [4, 5, 8, 9, 12, 13]) px(g, x, 1, hair);
    rect(g, 3, 2, 12, 1, hair);
    rect(g, 2, 3, 14, 4, hair);
    px(g, 2, 5, null); px(g, 15, 5, null);
    rect(g, 2, 7, 2, 4, hair); rect(g, 14, 7, 2, 4, hair);
    px(g, 6, 7, hair); px(g, 7, 7, hairD); px(g, 10, 7, hair); px(g, 11, 7, hairD);
    px(g, 5, 3, hairL); px(g, 9, 2, hairL); px(g, 12, 4, hairL);
  } else {
    front();
    if (style === "short" || style === "ponytail" || style === "pigtails") { px(g, 3, 8, hair); px(g, 14, 8, hair); }
    if (style === "bob" || style === "long") {
      rect(g, 3, 8, 1, style === "long" ? 9 : 5, hair);
      rect(g, 14, 8, 1, style === "long" ? 9 : 5, hair);
      if (style === "long") { rect(g, 4, 14, 1, 3, hair); rect(g, 13, 14, 1, 3, hair); }
    }
    if (style === "bun") {
      // 똥머리: 정수리에 크게 틀어 올린 뭉치와 삐져나온 잔머리
      rect(g, 6, 0, 6, 2, hair); px(g, 5, 1, hair); px(g, 12, 1, hair); px(g, 5, 2, hairD); px(g, 12, 2, hairD);
      rect(g, 7, 0, 2, 1, hairL); px(g, 10, 1, hairD); px(g, 3, 8, hair); px(g, 14, 8, hair);
      px(g, 4, 8, hair); px(g, 13, 9, hair);
    }
    if (style === "hippie") {
      rect(g, 4, 1, 10, 1, hair); px(g, 3, 2, hair); px(g, 14, 2, hair);
      rect(g, 3, 8, 1, 9, hair); rect(g, 14, 8, 1, 9, hair);
      for (const [x, y] of [[4, 14], [4, 15], [13, 14], [13, 15], [4, 9], [13, 10]]) px(g, x, y, hair);
      px(g, 3, 10, hairL); px(g, 14, 12, hairL); px(g, 3, 13, hairL); px(g, 6, 1, hairL);
    }
  }
  if (f.eyes === "focus") drawFocusFlames(g);

  // 머리에 거는 것들
  if (has("hairpin")) { rect(g, 10, 4, 3, 1, accent); px(g, 10, 4, shade(accent, 50)); px(g, 12, 5, accent); }
  if (has("ribbon")) {
    rect(g, 10, 2, 2, 2, "#e0605a"); rect(g, 13, 2, 2, 2, "#e0605a"); px(g, 12, 3, "#c94c4c");
  }
  if (has("headphones")) {
    const band = "#3a3a4a";
    rect(g, 4, 1, 10, 1, band); px(g, 3, 2, band); px(g, 14, 2, band);
    rect(g, 2, 3, 1, 5, band); rect(g, 15, 3, 1, 5, band);
    rect(g, 1, 8, 3, 4, accent); rect(g, 14, 8, 3, 4, accent);
    rect(g, 1, 8, 1, 4, shade(accent, -40)); rect(g, 16, 8, 1, 4, shade(accent, -40));
    rect(g, 2, 9, 1, 1, shade(accent, 50)); rect(g, 14, 9, 1, 1, shade(accent, 50));
  }

  // 모자 (하나만)
  if (hat === "cap") {
    rect(g, 4, 1, 10, 4, accent);
    rect(g, 3, 5, 12, 1, shade(accent, -42));        // 챙
    rect(g, 6, 5, 8, 1, shade(accent, -30));
    rect(g, 5, 2, 3, 1, shade(accent, 40)); px(g, 9, 0, shade(accent, -30));
    px(g, 9, 3, "#ffffff"); px(g, 8, 3, "#ffffff");
  }
  if (hat === "beanie") {
    rect(g, 4, 2, 10, 4, accent);
    rect(g, 3, 5, 12, 2, shade(accent, -30));         // 접힌 단
    for (let x = 4; x < 14; x += 2) px(g, x, 6, shade(accent, -55));
    rect(g, 8, 0, 2, 2, "#f6f2ea"); rect(g, 7, 1, 4, 1, "#f6f2ea");
    rect(g, 5, 3, 3, 1, shade(accent, 40));
  }
  if (hat === "beret") {
    rect(g, 4, 1, 10, 1, "#8a5a9c"); rect(g, 2, 2, 13, 2, "#8a5a9c"); rect(g, 3, 4, 11, 1, "#6f4680");
    px(g, 9, 0, "#6f4680"); rect(g, 5, 2, 3, 1, "#a878b8");
  }
  if (hat === "phd") {
    rect(g, 5, 2, 8, 3, "#2f2a3a");                  // 모자 몸통
    rect(g, 1, 1, 16, 1, "#2f2a3a"); rect(g, 3, 0, 12, 1, "#2f2a3a"); rect(g, 3, 2, 12, 1, "#2f2a3a"); // 네모난 판
    rect(g, 4, 0, 4, 1, "#4a4263"); px(g, 9, 0, accent);                                            // 윗면 빛, 단추
    px(g, 15, 2, "#f2c64e"); px(g, 16, 3, "#f2c64e"); px(g, 16, 4, "#f2c64e"); px(g, 16, 5, "#f2c64e"); px(g, 16, 6, "#e0a830"); px(g, 15, 6, "#e0a830"); // 술
  }

  // 24칸 그림으로 옮기고 손에 든 소품·에코백을 그린다
  const out = grid(AV_W, AV_H);
  stamp(out, g, OX, 0);
  if (f.props.includes("ecobag")) drawEcoBag(out, accent);
  for (const p of f.props) drawHandProp(out, p, accent);
  return outline(out);
}

/** 왼쪽 어깨에 건 에코백 (24칸 좌표) */
function drawEcoBag(g: Grid, accent: string) {
  const cloth = "#f3ecd8", edge = "#d8cdb0";
  for (const [x, y] of [[6, 14], [5, 13], [4, 12], [3, 13], [2, 14]]) px(g, x, y, edge);     // 어깨끈
  rect(g, 1, 15, 6, 7, cloth); rect(g, 1, 15, 6, 1, edge); rect(g, 6, 15, 1, 7, edge); rect(g, 1, 21, 6, 1, edge);
  rect(g, 2, 17, 3, 1, accent); rect(g, 2, 19, 2, 1, accent); px(g, 4, 19, shade(accent, 40));  // 프린트
}

/** 오른손에 든 소품 (24칸 좌표: 오른손이 (16, 18)) */
function drawHandProp(g: Grid, prop: string, accent: string) {
  if (prop === "book") {
    rect(g, 17, 15, 5, 6, "#c0504d"); rect(g, 17, 15, 1, 6, "#8e3330"); rect(g, 21, 16, 1, 4, "#fff8e4");
    rect(g, 19, 17, 2, 1, "#f2c64e"); rect(g, 19, 19, 1, 1, "#f2c64e"); rect(g, 17, 20, 5, 1, "#8e3330");
  }
  if (prop === "thesis") {
    // 학위논문: 두껍게 제본된 남색 표지에 금박 글씨
    rect(g, 17, 13, 6, 8, "#1f3a6e"); rect(g, 17, 13, 1, 8, "#14264a"); rect(g, 22, 14, 1, 6, "#f6f2ea");
    rect(g, 19, 15, 3, 1, "#e8c24a"); rect(g, 19, 17, 2, 1, "#e8c24a"); rect(g, 19, 19, 3, 1, "#b8963a");
    rect(g, 17, 20, 6, 1, "#14264a");
  }
  if (prop === "scroll") {
    rect(g, 18, 13, 3, 9, "#f6e7c1"); rect(g, 17, 12, 5, 1, "#c0504d"); rect(g, 17, 22, 5, 1, "#c0504d");
    rect(g, 18, 13, 1, 9, "#fff8e4");
    for (const y of [15, 17, 19]) px(g, 19, y, "#a88f6a");
  }
  if (prop === "laptop") {
    rect(g, 17, 14, 6, 5, "#7a8092"); rect(g, 18, 15, 4, 3, "#9fd8f0"); px(g, 19, 16, "#ffffff");
    rect(g, 16, 19, 8, 1, "#5d6272"); rect(g, 17, 20, 6, 1, "#7a8092");
  }
  if (prop === "coffee") {
    rect(g, 17, 17, 4, 4, "#fffaf0"); rect(g, 17, 17, 4, 1, "#7a4a2a"); rect(g, 17, 20, 4, 1, "#e0d8c8");
    px(g, 21, 18, "#fffaf0"); px(g, 22, 18, "#fffaf0"); px(g, 22, 19, "#fffaf0"); px(g, 21, 19, "#fffaf0");
    px(g, 18, 14, "#ffffff"); px(g, 19, 13, "#f0f0f6"); px(g, 18, 12, "#ffffff"); px(g, 20, 15, "#f0f0f6");
  }
  if (prop === "americano") {
    // 아이스 아메리카노: 투명한 일회용 컵, 진한 커피와 얼음, 검은 빨대
    rect(g, 17, 15, 5, 1, "#dfe8ee");                                 // 뚜껑
    rect(g, 17, 16, 5, 5, "#e9f2f7"); rect(g, 18, 20, 3, 1, "#e9f2f7");
    rect(g, 17, 17, 5, 3, "#4a2c1c"); rect(g, 18, 20, 3, 1, "#3a2216");
    px(g, 18, 17, "#f4fbff"); px(g, 20, 18, "#f4fbff"); px(g, 19, 19, "#dbe9f2"); px(g, 21, 17, "#dbe9f2");
    rect(g, 19, 11, 1, 5, "#2f2a3a"); px(g, 20, 11, "#2f2a3a");       // 빨대
    px(g, 17, 16, "#ffffff");
  }
  if (prop === "stanley") {
    // 스탠리 텀블러: 손잡이 달린 큼직한 보온컵, 색은 포인트색
    rect(g, 17, 13, 5, 1, "#f6f2ea"); px(g, 20, 12, "#f6f2ea"); px(g, 21, 12, "#f6f2ea");  // 뚜껑·빨대 입구
    rect(g, 17, 14, 5, 6, accent); rect(g, 18, 20, 3, 1, accent);
    rect(g, 17, 14, 1, 6, shade(accent, 40)); rect(g, 21, 14, 1, 6, shade(accent, -34)); rect(g, 18, 20, 3, 1, shade(accent, -34));
    rect(g, 18, 17, 3, 1, "#ffffff"); px(g, 19, 17, shade(accent, -34));  // 로고 띠
    px(g, 22, 15, shade(accent, -34)); px(g, 23, 15, shade(accent, -34)); px(g, 23, 16, shade(accent, -34)); px(g, 23, 17, shade(accent, -34)); px(g, 22, 18, shade(accent, -34)); // 손잡이
  }
  if (prop === "brush") {
    for (const [x, y] of [[17, 19], [18, 18], [19, 17], [20, 16], [21, 15], [22, 14]]) px(g, x, y, "#b98552");
    for (const [x, y] of [[23, 13], [23, 12], [22, 13]]) px(g, x, y, "#2f2a3a");
    px(g, 20, 17, "#8e5f3b"); px(g, 18, 19, "#8e5f3b");
  }
}
