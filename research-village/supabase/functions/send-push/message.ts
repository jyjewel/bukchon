// 푸시 알림 문구. 잠금 화면에 보이므로 일지·메시지 같은 내용은 넣지 않고 "누가 무엇을 했는지"만 알린다.
const TEXT: Record<string, string> = {
  postit: "화이트보드에 포스트잇을 붙였어요",
  comment: "화이트보드에 댓글을 남겼어요",
  chat_request: "대화를 신청했어요",
  meeting: "Zoom 회의를 열었어요",
  gesture: "던지기를 했어요!",
  gift: "책상에 선물을 올려 두었어요",
  book_tip: "책을 추천해 책장에 꽂아 두었어요",
  journal_reaction: "공개 일지에 반응을 남겼어요",
  journal_comment: "공개 일지에 댓글을 남겼어요",
  cheer: "마감을 응원해요. 파이팅!",
  nudge: "마감을 챙겨 보래요",
  message: "새 메시지를 보냈어요",
};

export function pushText(kind: string, actor: string): { title: string; body: string; tag: string } {
  const who = actor.trim() ? `${actor.trim()}님이` : "누군가";
  const what = TEXT[kind] ?? "새 소식을 보냈어요";
  return { title: "연구자 마을", body: `${who} ${what}`, tag: kind };
}
