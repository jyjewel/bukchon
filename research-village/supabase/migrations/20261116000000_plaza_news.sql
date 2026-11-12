-- 마을 광장 소식: 학회·채용·연구비·학술 뉴스를 이웃에게 알린다.
create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references public.villages (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null default auth.uid(),
  category text not null default 'news' check (category in ('conference', 'job', 'funding', 'news', 'etc')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null default '' check (char_length(body) <= 600),
  link_url text not null default '' check (link_url = '' or (link_url ~* '^https?://' and char_length(link_url) <= 600)),
  deadline date,
  created_at timestamptz not null default now()
);
create index news_posts_village on public.news_posts (village_id, created_at desc);

revoke all on public.news_posts from anon, authenticated, public;
grant select, delete on public.news_posts to authenticated;
grant insert (village_id, author_id, category, title, body, link_url, deadline) on public.news_posts to authenticated;

alter table public.news_posts enable row level security;
create policy news_select on public.news_posts for select to authenticated using (public.is_village_member(village_id));
create policy news_insert on public.news_posts for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_village_member(village_id));
create policy news_delete on public.news_posts for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_village_admin(village_id));

alter publication supabase_realtime add table public.news_posts;
