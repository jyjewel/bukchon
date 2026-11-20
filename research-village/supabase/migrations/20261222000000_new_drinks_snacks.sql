-- 건네기: 음료에 아이스 바닐라 라떼·핫 카푸치노, 간식에 붕어빵·컵볶이를 추가한다(미니쉘은 목록에서 빠지지만 예전에 건넨 것은 그대로 읽힌다)
alter table public.gifts drop constraint gifts_kind_check;
alter table public.gifts add constraint gifts_kind_check check (kind in (
  'coffee', 'americano', 'snack', 'tea', 'beer', 'siru', 'rainbow', 'songpyeon',
  'mochi', 'yakgwa', 'tangerine', 'apple', 'minishell', 'haribo', 'makgeolli',
  'cocoa', 'gingerbread', 'stollen', 'xmascake',
  'vanillalatte', 'cappuccino', 'bungeoppang', 'cupbokki'));
