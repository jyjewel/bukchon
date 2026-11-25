-- 특별한 선물(예: 명예 뱃지)을 받았다는 알림 종류
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'postit', 'comment', 'chat_request', 'meeting',
  'gesture', 'gift', 'book_tip', 'journal_reaction', 'journal_comment', 'cheer', 'nudge',
  'moving_cake', 'moving_thanks', 'study_alarm', 'study_goal', 'award'));
