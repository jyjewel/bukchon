-- 내 설정: 마을 목록 순서(내 화면에서만 적용)
create table public.user_prefs (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  village_order uuid[] not null default '{}' check (cardinality(village_order) <= 20),
  updated_at timestamptz not null default now()
);
alter table public.user_prefs enable row level security;
revoke all on public.user_prefs from anon, authenticated, public;
grant select, insert, update on public.user_prefs to authenticated;
create policy prefs_select on public.user_prefs for select to authenticated using (user_id = (select auth.uid()));
create policy prefs_insert on public.user_prefs for insert to authenticated with check (user_id = (select auth.uid()));
create policy prefs_update on public.user_prefs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
