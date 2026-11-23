/** 업데이트 소식. 새 기능을 올릴 때마다 맨 위에 항목을 하나 추가한다(id 는 겹치지 않게 날짜-이름으로).
 *  깜짝 업데이트(예: 광장에 오는 트럭)는 일부러 적지 않는다.
 *  소원구슬에 올라온 소원을 반영한 업데이트는 제목 맨 앞에 "[소원] "을 붙인다. (예: "[소원] 연구실 벽의 포탈로 …")
 *  사용자가 접속하면 아직 못 본 항목이 홈 위쪽 "새 소식"에 뜬다. 푸시 알림은 보내지 않는다. */
export interface UpdateEntry {
  id: string;
  date: string;
  title: string;
  body: string;
}

export const UPDATES: UpdateEntry[] = [
  { id: "2026-11-23-nice-throw", date: "11월 23일", title: "[소원] 영감 전구, 응원 박수, 칭찬 별을 던질 수 있어요", body: "" },
  { id: "2026-11-23-notif-link", date: "11월 23일", title: "[소원] 알림을 누르면 해당 내용으로 바로 가요", body: "" },
  { id: "2026-11-21-eat", date: "11월 21일", title: "[소원] 받은 간식을 먹을 수 있어요", body: "" },
  { id: "2026-11-20-menu", date: "11월 20일", title: "건네기 메뉴가 바뀌었어요: 바닐라 라떼, 카푸치노, 붕어빵, 컵볶이", body: "" },
  { id: "2026-11-19-order", date: "11월 19일", title: "[소원] 내 마을 순서를 바꿀 수 있어요", body: "" },
  { id: "2026-11-19-newsread", date: "11월 19일", title: "[소원] 새 소식은 한 번 보면 마을을 바꿔도 다시 안 떠요", body: "" },
  { id: "2026-11-19-gate", date: "11월 19일", title: "마을장이 대문 빗장을 걸 수 있어요", body: "" },
  { id: "2026-11-19-room-news", date: "11월 19일", title: "[소원] 새 글이 올라오면 지붕에 새가 앉아요", body: "" },
  { id: "2026-11-18-gift-send", date: "11월 18일", title: "[소원] 선물은 ‘보내기’를 눌러야 가요", body: "건넬 것을 고르고 한마디를 쓴 다음 보내기를 누르면 전해져요." },
  { id: "2026-11-18-password", date: "11월 18일", title: "비밀번호를 바꾸거나, 잊었을 때 다시 정할 수 있어요", body: "설정에서 바꾸고, 로그인 화면의 ‘비밀번호를 잊었어요’로 메일을 받아요." },
  { id: "2026-11-18-walk", date: "11월 18일", title: "[소원] 어디든 누르면 걸어 다닐 수 있어요", body: "마을 지도의 빈 곳을 누르면 내 캐릭터가 걸어가요. 이웃에게도 보여요." },
  { id: "2026-11-18-portal", date: "11월 18일", title: "연구실 벽의 포탈로 다른 연구실에 바로 건너갈 수 있어요", body: "" },
  { id: "2026-11-18-hairpods", date: "11월 18일", title: "캐릭터 머리에 투블럭, 액세서리에 에어팟이 생겼어요", body: "" },
  { id: "2026-11-18-habit", date: "11월 18일", title: "공동 공부 목표를 고칠 수 있고, 기간을 정해 매일 체크하는 목표가 생겼어요", body: "예: 한 달 동안 주 3일 한시 읽기. 매일 연구실 체크리스트에 올라와요." },
  { id: "2026-11-17-dragwin", date: "11월 17일", title: "창 제목줄을 끌어서 순서를 바꿀 수 있어요", body: "같은 칸 안에서 옮길 수 있고, 폰에서는 꾹 눌러서 끌어요." },
  { id: "2026-11-17-goals", date: "11월 17일", title: "도서관에 함께 정하는 공동 공부 목표가 생겼어요", body: "" },
  { id: "2026-11-17-checklist", date: "11월 17일", title: "할 일이 오늘의 체크리스트로 바뀌었어요", body: "" },
  { id: "2026-11-17-snackbox", date: "11월 17일", title: "내 연구실에 간식 상자가 생겼어요", body: "" },
  { id: "2026-11-17-fold", date: "11월 17일", title: "모든 창을 접었다 펼 수 있어요", body: "" },
  { id: "2026-11-17-study", date: "11월 17일", title: "도서관에 스터디 공지 알람이 생겼어요", body: "" },
  { id: "2026-11-17-lastseen", date: "11월 17일", title: "오프라인이어도 마지막 접속 시각이 보여요", body: "" },
  { id: "2026-11-17-tiername", date: "11월 17일", title: "좋아하는 책장의 단마다 이름을 지을 수 있어요", body: "" },
  { id: "2026-11-17-online", date: "11월 17일", title: "옆 마을에 가 있어도 접속 중이면 온라인으로 보여요", body: "" },
  { id: "2026-11-17-snacks", date: "11월 17일", title: "건네기 간식이 종류별로 나뉘었어요", body: "" },
  { id: "2026-11-17-newbadge", date: "11월 17일", title: "게시판에 새 글이 오면 N이 반짝여요", body: "" },
  { id: "2026-11-17-drag", date: "11월 17일", title: "책장과 연구 성과를 끌어서 순서를 바꿀 수 있어요", body: "" },
  { id: "2026-11-16-favshelf", date: "11월 16일", title: "내 연구실에 좋아하는 책을 꽂는 책장이 생겼어요", body: "" },
  { id: "2026-11-16-tteok", date: "11월 16일", title: "이사 떡 돌리기가 생겼어요", body: "" },
  { id: "2026-11-16-orb", date: "11월 16일", title: "광장에 소원구슬이 생겼어요", body: "" },
  { id: "2026-11-16-booktitle", date: "11월 16일", title: "함께 쓰는 책의 제목을 고칠 수 있어요", body: "" },
  { id: "2026-11-15-bicheondang", date: "11월 15일", title: "도서관을 성균관대 비천당으로 바꿀 수 있어요", body: "마을 장님만 바꿀 수 있어요." },
  { id: "2026-11-15-dolsang", date: "11월 15일", title: "소품에 돌잔치 돌상이 추가되었어요", body: "" },
  { id: "2026-11-15-gestures", date: "11월 15일", title: "던지기가 새로워졌어요", body: "" },
  { id: "2026-11-14-bubble", date: "11월 14일", title: "말풍선이 바꾸기 전까지 유지돼요", body: "" },
  { id: "2026-11-13-beer", date: "11월 13일", title: "건네기에 맥주, 소품에 맥주 발효통", body: "" },
  { id: "2026-11-13-push", date: "11월 13일", title: "폰에 앱처럼 설치하고 알림 받기", body: "" },
];

const KEY = (userId: string) => `rv.updates.${userId}`;

/** 아직 안 본 항목들 (최신순). 마지막으로 본 항목 id 를 이 기기에 기억한다 */
export function unseenUpdates(userId: string): UpdateEntry[] {
  let seen: string | null = null;
  try { seen = localStorage.getItem(KEY(userId)); } catch { /* 저장소를 못 써도 괜찮다 */ }
  const i = seen ? UPDATES.findIndex((u) => u.id === seen) : -1;
  return i >= 0 ? UPDATES.slice(0, i) : UPDATES.slice(0, 5);
}

export function markUpdatesSeen(userId: string) {
  try { localStorage.setItem(KEY(userId), UPDATES[0].id); } catch { /* 무시 */ }
}
