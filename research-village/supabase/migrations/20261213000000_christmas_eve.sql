-- 크리스마스 이브의 산타: 이브 밤(12/24 18:00 ~ 12/25 06:00, 한국 시각)에 산타를 만나면, 놓친 사람은 12/25 아침(06:00~)에 선물을 받는다.
-- 선물: 산타 모자·연구실 소품(양말·리스)·간식 둘·산타 카드(올해 기록)·가끔 황금 루돌프 코. 한 사람이 한 해에 한 번.
create table public.app_settings (key text primary key, value text not null);   -- 서비스 키로만 읽고 쓴다 (시험용 시계 등)
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated, public;

create table public.christmas_gifts (
  user_id uuid not null references auth.users (id) on delete cascade,
  year integer not null,
  kind text not null check (kind in ('eve', 'morning')),
  golden boolean not null default false,
  snacks text[] not null default '{}',
  stats jsonb not null default '{}',
  claimed_at timestamptz not null default now(),
  primary key (user_id, year)
);
alter table public.christmas_gifts enable row level security;
revoke all on public.christmas_gifts from anon, authenticated, public;
grant select on public.christmas_gifts to authenticated;
create policy xmas_own on public.christmas_gifts for select to authenticated using (user_id = (select auth.uid()));

alter table public.gifts drop constraint gifts_kind_check;
alter table public.gifts add constraint gifts_kind_check check (kind in (
  'coffee', 'americano', 'snack', 'tea', 'beer', 'siru', 'rainbow', 'songpyeon',
  'mochi', 'yakgwa', 'tangerine', 'apple', 'minishell', 'haribo', 'makgeolli',
  'cocoa', 'gingerbread', 'stollen', 'xmascake'));

create function public._now_app() returns timestamptz
language sql stable security definer set search_path = '' as $$
  select coalesce((select value::timestamptz from public.app_settings where key = 'now_override'), now())
$$;
revoke all on function public._now_app() from public, anon, authenticated;

create function public._claim_christmas(p_user uuid, p_now timestamptz) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t timestamp := p_now at time zone 'Asia/Seoul'; y integer := extract(year from p_now at time zone 'Asia/Seoul')::integer;
  eve_start timestamp := make_timestamp(y, 12, 24, 18, 0, 0); morning_start timestamp := make_timestamp(y, 12, 25, 6, 0, 0); day_end timestamp := make_timestamp(y, 12, 26, 0, 0, 0);
  k text; pool text[] := array['gingerbread', 'stollen', 'xmascake']; sn text[]; gold boolean := random() < 0.05; st jsonb; s text;
begin
  if p_user is null then raise exception 'not_member'; end if;
  if t >= eve_start and t < morning_start then k := 'eve';
  elsif t >= morning_start and t < day_end then k := 'morning';
  else raise exception 'not_christmas'; end if;
  if exists (select 1 from public.christmas_gifts where user_id = p_user and year = y) then raise exception 'already'; end if;
  sn := array['cocoa', pool[1 + floor(random() * 3)::integer]];
  st := jsonb_build_object(
    'logs', (select count(*) from public.daily_logs l where l.user_id = p_user and length(btrim(l.body)) > 0 and extract(year from l.log_date) = y),
    'notes', (select count(*) from public.research_notes n where n.user_id = p_user and extract(year from n.created_at at time zone 'Asia/Seoul') = y),
    'diary', (select count(*) from public.diary_entries d where d.author_id = p_user and extract(year from d.created_at at time zone 'Asia/Seoul') = y),
    'goals', (select count(*) from public.study_goal_members gm join public.study_goals g on g.id = gm.goal_id where gm.user_id = p_user and g.completed_at is not null and extract(year from g.completed_at at time zone 'Asia/Seoul') = y),
    'wishes', (select count(*) from public.wishes w where w.author_id = p_user and extract(year from w.created_at at time zone 'Asia/Seoul') = y));
  insert into public.christmas_gifts (user_id, year, kind, golden, snacks, stats) values (p_user, y, k, gold, sn, st);
  foreach s in array sn loop
    insert into public.gifts (from_user, to_user, kind, note) values (p_user, p_user, s, '🎅 산타가 두고 갔어요');
  end loop;
  return jsonb_build_object('kind', k, 'golden', gold, 'snacks', to_jsonb(sn), 'stats', st, 'year', y);
end $$;
revoke all on function public._claim_christmas(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public._claim_christmas(uuid, timestamptz) to service_role;

create function public.claim_christmas() returns jsonb
language sql security definer set search_path = '' as $$
  select public._claim_christmas((select auth.uid()), public._now_app())
$$;
revoke all on function public.claim_christmas() from public, anon;
grant execute on function public.claim_christmas() to authenticated;
