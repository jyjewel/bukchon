import type { LabStyle } from "./types";

/** 연구실 안쪽 꾸미기 선택지 (도트로 그려지므로 고정된 목록만 허용한다) */
export const LAB_WALLS = ["#fff5e1", "#e4f4e1", "#e2eefb", "#efe6fa", "#fde4ea", "#f6efc4"];
export const LAB_ACCENTS = ["#e0605a", "#5f8fd6", "#4f9a6d", "#9a6fd0", "#e8934a", "#3fa5a5"];
export const LAB_PATTERNS = [
  { id: "stripe", label: "줄무늬" }, { id: "dots", label: "물방울" }, { id: "check", label: "체크" }, { id: "plain", label: "민무늬" },
] as const;
export const LAB_FLOORS = [
  { id: "wood", label: "마루" }, { id: "dark", label: "짙은 마루" }, { id: "tile", label: "타일" }, { id: "jangpan", label: "장판" },
] as const;
export const LAB_DESKS = [{ id: "wood", label: "원목 책상" }, { id: "system", label: "시스템 책상 (흰색)" }] as const;
/** 책상 위에 올리는 물건 (문방사우 = 종이·붓·먹·벼루) */
export const LAB_DESK_ITEMS = [
  { id: "books", label: "책" }, { id: "laptop", label: "노트북" }, { id: "notebook", label: "공책" },
  { id: "paper", label: "흰 종이" }, { id: "munbang", label: "문방사우" }, { id: "mug", label: "머그컵" },
] as const;
export const LAB_RUGS = [{ id: "round", label: "둥근 러그" }, { id: "square", label: "네모 러그" }] as const;
export const LAB_VIEWS = [
  { id: "auto", label: "시간 따라" }, { id: "day", label: "맑은 낮" }, { id: "night", label: "별 밤" },
  { id: "rain", label: "비" }, { id: "snow", label: "눈" }, { id: "sakura", label: "벚꽃" },
] as const;
export const LAB_PETS = [{ id: "cat", label: "고양이" }, { id: "dog", label: "강아지" }, { id: "hedwig", label: "해리포터 부엉이" }, { id: "duo", label: "듀오링고 부엉이" }, { id: "none", label: "없음" }] as const;
export const LAB_EXTRAS = [
  { id: "plant", label: "화분" }, { id: "bigplant", label: "큰 화분" }, { id: "beanbag", label: "빈백" }, { id: "globe", label: "지구본" }, { id: "nameplate", label: "자개 명패" },
] as const;

export const DEFAULT_LAB_STYLE: LabStyle = {
  wall: LAB_WALLS[0], pattern: "stripe", floor: "wood", desk: "wood", deskItems: ["books", "mug"], accent: LAB_ACCENTS[0], rug: "round", view: "auto", pet: "cat", extras: ["plant"],
};

const pick = <T extends string>(v: unknown, ids: readonly T[], fallback: T): T => (typeof v === "string" && (ids as readonly string[]).includes(v) ? (v as T) : fallback);

/** DB 에서 읽은 값(없거나 이상해도)을 항상 완전한 꾸미기 설정으로 바꾼다. */
export function normalizeLabStyle(raw: unknown): LabStyle {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_LAB_STYLE;
  return {
    wall: pick(r.wall, LAB_WALLS, d.wall),
    pattern: pick(r.pattern, LAB_PATTERNS.map((x) => x.id), d.pattern),
    floor: pick(r.floor, LAB_FLOORS.map((x) => x.id), d.floor),
    desk: pick(r.desk, LAB_DESKS.map((x) => x.id), d.desk),
    deskItems: Array.isArray(r.deskItems) ? LAB_DESK_ITEMS.map((x) => x.id).filter((id) => (r.deskItems as unknown[]).includes(id)) : d.deskItems,
    accent: pick(r.accent, LAB_ACCENTS, d.accent),
    rug: pick(r.rug, LAB_RUGS.map((x) => x.id), d.rug),
    view: pick(r.view, LAB_VIEWS.map((x) => x.id), d.view),
    pet: pick(r.pet, LAB_PETS.map((x) => x.id), d.pet),
    extras: Array.isArray(r.extras) && "extras" in r ? LAB_EXTRAS.map((x) => x.id).filter((id) => (r.extras as unknown[]).includes(id)) : d.extras,
  };
}
