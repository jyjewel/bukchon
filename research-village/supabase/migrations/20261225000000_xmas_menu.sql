-- 건네기: 음료에 뱅쇼·따뜻한 우유, 간식에 슈톨렌·쿠키·부쉬드 노엘을 추가한다
alter table public.gifts drop constraint gifts_kind_check;
alter table public.gifts add constraint gifts_kind_check check (kind in (
  'coffee', 'americano', 'snack', 'tea', 'beer', 'siru', 'rainbow', 'songpyeon',
  'mochi', 'yakgwa', 'tangerine', 'apple', 'minishell', 'haribo', 'makgeolli',
  'cocoa', 'gingerbread', 'stollen', 'xmascake',
  'vanillalatte', 'cappuccino', 'bungeoppang', 'cupbokki',
  'vinchaud', 'warmmilk', 'cookie', 'buche'));
