-- 한 번 본 안내(예: 부엉이 편지)를 기기와 상관없이 기억한다
create table public.user_flags (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  flag text not null check (char_length(flag) between 1 and 40),
  created_at timestamptz not null default now(),
  primary key (user_id, flag)
);
alter table public.user_flags enable row level security;
revoke all on public.user_flags from anon, authenticated, public;
grant select, insert on public.user_flags to authenticated;
create policy flags_select on public.user_flags for select to authenticated using (user_id = (select auth.uid()));
create policy flags_insert on public.user_flags for insert to authenticated with check (user_id = (select auth.uid()));
