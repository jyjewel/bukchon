-- 내 연구실의 마감 일정(D-day)과 할 일. 둘 다 본인만 읽고 쓴다.
create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  due_date date not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index deadlines_user on public.deadlines (user_id, due_date);

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 120),
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index todos_user on public.todos (user_id, created_at);

revoke all on public.deadlines, public.todos from anon, authenticated, public;
grant select, delete on public.deadlines, public.todos to authenticated;
grant insert (user_id, title, due_date), update (title, due_date, done) on public.deadlines to authenticated;
grant insert (user_id, body, due_date), update (body, due_date, done) on public.todos to authenticated;

alter table public.deadlines enable row level security;
alter table public.todos enable row level security;
create policy deadlines_own on public.deadlines for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy todos_own on public.todos for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
