/** 처음 접속하면 부엉이가 사용법 편지를 가져다 준다. 읽은 뒤에는 연구실 서랍에 보관된다. */
export type WelcomeState = "new" | "delivered" | "read";
const key = (uid: string) => `welcome:${uid}`;

export function welcomeState(uid: string): WelcomeState {
  try { const v = localStorage.getItem(key(uid)); return v === "read" ? "read" : v === "delivered" ? "delivered" : "new"; } catch { return "read"; }
}
export function setWelcome(uid: string, s: WelcomeState) { try { localStorage.setItem(key(uid), s); } catch { /* 저장 못 해도 괜찮다 */ } }

/** 편지 내용 (짧게: 처음부터 부담 주지 않는다) */
export const LETTER: { icon: string; title: string; body: string }[] = [
  { icon: "🏠", title: "마을 지도", body: "내 집을 누르면 연구실에 들어가 ‘집중 연구’가 시작돼요. 이웃의 집을 누르면 놀러 갈 수 있어요." },
  { icon: "📝", title: "내 연구실", body: "오늘의 일지·연구노트·다이어리를 쓰고, 화이트보드에 고민을 올리면 이웃이 댓글과 포스트잇을 남겨요." },
  { icon: "📚", title: "도서관", body: "함께 쓰는 책, Zoom 회의, 정해진 시간에 알려 주는 스터디 공지 알람이 있어요." },
  { icon: "🏘️", title: "새 마을 만들기", body: "맨 위 마을 이름 옆 ▲▼를 눌러 ‘＋ 다른 마을 추가’를 고르면 새 마을을 만들거나 초대받은 마을에 입주할 수 있어요. 마을은 한 사람당 5개까지, 한 마을엔 6명까지 살아요. 이웃은 설정의 ‘초대 링크’로 부르세요." },
  { icon: "🔮", title: "소원구슬", body: "광장의 구슬에 ‘이런 게 있으면 좋겠어요’를 적어 주세요. 하루 3개까지 빌 수 있어요." },
  { icon: "🔔", title: "알림", body: "설정에서 폰 알림을 켜면 댓글이나 스터디 시간을 놓치지 않아요." },
];
