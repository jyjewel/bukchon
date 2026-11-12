import type { DiaryKind, DiaryVisibility, ResearchState } from "./types";

/** heartbeat 가 이 시간(ms) 넘게 끊기면 오프라인으로 본다. DB 의 enter_village 와 같은 값. */
export const STALE_MS = 150_000;
export const HEARTBEAT_MS = 25_000;
/** 머리 위 한마디가 화면에 남아 있는 시간 */
export const SAY_MS = 12 * 3600_000;
export const SAY_MAX = 30;
export const VILLAGE_CAPACITY = 6;

export const STATUS_META: Record<ResearchState, { label: string; icon: string; where: string; talk: string; color: string }> = {
  offline: { label: "오프라인", icon: "", where: "집 안의 불이 꺼져 있어요", talk: "지금은 자리에 없어요", color: "#a9a3b8" },
  focus: { label: "집중 연구", icon: "", where: "집 안에서 연구하고 있어요", talk: "대화 신청은 받지 않아요", color: "#f2a65a" },
  open: { label: "열린 연구", icon: "", where: "집 앞 책상에 나와 있어요", talk: "말을 걸어도 좋아요", color: "#6fbf8e" },
  library: { label: "공동 연구", icon: "", where: "도서관에 있어요", talk: "함께 공부할 수 있어요", color: "#6ea8dc" },
  rest: { label: "휴식 중", icon: "", where: "광장에서 쉬고 있어요", talk: "편하게 인사해요", color: "#e58fb0" },
};
export const STATUS_ORDER: ResearchState[] = ["focus", "open", "library", "rest", "offline"];

export const KIND_META: Record<DiaryKind, { label: string; icon: string }> = {
  daily: { label: "일상", icon: "" },
  reading: { label: "독서 기록", icon: "" },
  progress: { label: "연구 진행", icon: "" },
  writing: { label: "논문 작성", icon: "" },
};

export const VISIBILITY_META: Record<DiaryVisibility, { label: string; icon: string }> = {
  private: { label: "나만 보기", icon: "" },
  village: { label: "우리 마을 주민", icon: "" },
  selected: { label: "선택한 연구자만", icon: "" },
};

export const SKINS = ["#ffe0c7", "#f6cba6", "#e0a97f", "#b97d56", "#8a5a3c"];
export const HAIR_COLORS = [
  "#3b2a25", "#6b4a35", "#a8733f", "#d9a55b", "#8e8e9c", "#c7607a", "#5a6fa8",
  "#f3dc7a", "#f2f2f6", "#6fc3f0", "#9a6fd0", "#e0483e", "#ff9fb6", "#5fae7a", "#ff8a3d", "#2c3e6b",
];
export const HAIR_STYLES = [
  { id: "short", label: "짧은 머리" },
  { id: "bob", label: "단발" },
  { id: "curlybob", label: "곱슬 단발" },
  { id: "long", label: "긴 머리" },
  { id: "hippie", label: "히피펌" },
  { id: "ponytail", label: "포니테일" },
  { id: "pigtails", label: "양갈래" },
  { id: "bun", label: "똥머리" },
  { id: "curly", label: "곱슬" },
  { id: "receding", label: "반대머리" },
  { id: "bald", label: "삭발" },
];
export const EYES = [
  { id: "default", label: "기본" },
  { id: "smile", label: "웃는 눈" },
  { id: "sleepy", label: "졸린 눈" },
  { id: "wink", label: "윙크" },
  { id: "focus", label: "활활 집중" },
];
export const TOPS = [
  { id: "tee", label: "티셔츠" },
  { id: "hoodie", label: "후드티" },
  { id: "sweatshirt", label: "맨투맨" },
  { id: "pullover", label: "풀오버" },
  { id: "fleece", label: "플리스 점퍼" },
  { id: "vest", label: "패딩 조끼" },
  { id: "suit", label: "셔츠·넥타이" },
  { id: "corduroy", label: "코듀로이 재킷" },
  { id: "stripe", label: "줄무늬 스웨터" },
  { id: "labcoat", label: "연구실 가운" },
  { id: "gown", label: "학위복" },
];
export const OUTFITS = [
  "#f4a7b9", "#8fc7a3", "#8fb8e8", "#f6cf73", "#b9a2e0", "#f2a477", "#8a8fa3", "#f5f0e6",
  "#e0605a", "#3f5f9a", "#4a4458", "#a8764a",
];
export const ACCENTS = ["#e0605a", "#f2c64e", "#62b866", "#5f8fd6", "#b08ae0", "#ff8fab", "#3a3a4a", "#f5f0e6"];
export const HATS = [
  { id: "none", label: "없음" },
  { id: "cap", label: "캡모자" },
  { id: "beanie", label: "비니" },
  { id: "beret", label: "베레모" },
  { id: "phd", label: "박사모" },
];
/** 여러 개를 동시에 쓸 수 있다. 안경류(glasses·square·sunglasses)는 하나만 고를 수 있다. */
export const ACCESSORIES = [
  { id: "glasses", label: "동그란 안경" },
  { id: "square", label: "사각 안경" },
  { id: "sunglasses", label: "선글라스" },
  { id: "headphones", label: "헤드폰" },
  { id: "hairpin", label: "머리핀" },
  { id: "ribbon", label: "리본" },
  { id: "mask", label: "마스크" },
  { id: "scarf", label: "목도리" },
];
export const EYEWEAR = ["glasses", "square", "sunglasses"];
/** 소품: 손에 든 것은 하나만, 가방도 하나만 고를 수 있고 둘은 같이 쓸 수 있다. */
export const HAND_PROPS = [
  { id: "book", label: "책" },
  { id: "thesis", label: "학위논문" },
  { id: "scroll", label: "두루마리" },
  { id: "laptop", label: "노트북" },
  { id: "coffee", label: "커피잔" },
  { id: "americano", label: "아이스 아메리카노" },
  { id: "stanley", label: "스탠리컵" },
  { id: "brush", label: "붓" },
];
export const BAGS = [
  { id: "backpack", label: "백팩" },
  { id: "ecobag", label: "에코백" },
];
export const PROPS = [...HAND_PROPS, ...BAGS];

export const ROOFS = ["#e8837c", "#f2a65a", "#7fb3d9", "#8fc7a3", "#b497d6", "#d98bb0", "#9a8f85"];
export const WALLS = ["#fff5e1", "#fde8ea", "#e9f4ec", "#e8f0fb", "#f4ecfa", "#f7e7cf"];
/** 집 번호별 기본 지붕 색 */
export const DEFAULT_ROOFS = ["#e8837c", "#7fb3d9", "#f2a65a", "#8fc7a3", "#b497d6", "#d98bb0"];

export const POSTIT_COLORS = ["#ffe58a", "#ffb3c8", "#a9e5a0", "#a9d8f5", "#d8c0f5", "#ffc9a0"];
export const ACHIEVEMENT_KINDS: { id: import("./types").AchievementKind; label: string; color: string }[] = [
  { id: "article", label: "학술논문", color: "#e0605a" },
  { id: "book", label: "단행본", color: "#5f8fd6" },
  { id: "thesis", label: "학위논문", color: "#b08ae0" },
  { id: "presentation", label: "학술발표", color: "#f2c64e" },
  { id: "other", label: "기타", color: "#62b866" },
];
export function rissSearchUrl(q: string): string {
  const e = encodeURIComponent(q.trim());
  return `https://www.riss.kr/search/Search.do?isDetailSearch=N&searchGubun=true&viewYn=OP&queryText=&strQuery=${e}&query=${e}`;
}
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
export function isRiss(url: string): boolean {
  const h = linkHost(url);
  return h === "riss.kr" || h.endsWith(".riss.kr");
}

export const NEWS_CATEGORIES: { id: import("./types").NewsCategory; label: string; color: string }[] = [
  { id: "conference", label: "학회·학술대회", color: "#a9d8f5" },
  { id: "job", label: "채용", color: "#a5e3a0" },
  { id: "funding", label: "연구비·공모", color: "#ffe58a" },
  { id: "news", label: "학술 뉴스", color: "#ffb3c8" },
  { id: "etc", label: "기타", color: "#d8c0f5" },
];
