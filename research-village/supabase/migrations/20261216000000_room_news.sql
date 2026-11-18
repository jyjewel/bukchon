-- 이웃 연구실에 새 글이 올라왔는지: 내가 마지막으로 그 연구실을 본 시각 이후의 글이 있으면 집이 반짝인다
create table public.room_seen (
  viewer_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (viewer_id, owner_id)
);
alter table public.room_seen enable row level security;
revoke all on public.room_seen from anon, authenticated, public;
grant select, insert, update on public.room_seen to authenticated;
create policy room_seen_select on public.room_seen for select to authenticated using (viewer_id = (select auth.uid()));
create policy room_seen_insert on public.room_seen for insert to authenticated with check (viewer_id = (select auth.uid()));
create policy room_seen_update on public.room_seen for update to authenticated using (viewer_id = (select auth.uid())) with check (viewer_id = (select auth.uid()));

-- 보안 호출자(invoker): 내가 볼 수 있는 글만 센다(공개 일지는 공유된 마을 주민에게만 보인다). 글 내용은 돌려주지 않고 주인 id 만 돌려준다.
create function public.rooms_with_news(p_village uuid) returns setof uuid
language sql stable security invoker set search_path = public as $$
  with me as (select (select auth.uid()) as id),
  mem as (select m.user_id, m.joined_at from public.village_members m, me where m.village_id = p_village and m.user_id <> me.id),
  posts as (
    select owner_id as o, created_at as t from public.whiteboard_items
    union all select i.owner_id, c.created_at from public.whiteboard_comments c join public.whiteboard_items i on i.id = c.item_id, me where c.author_id <> me.id
    union all select owner_id, created_at from public.achievements
    union all select p.owner_id, p.created_at from public.postits p, me where p.author_id <> me.id
    union all select user_id, updated_at from public.daily_logs where p_village = any (shared_villages)
  )
  select distinct mem.user_id from mem
  join posts on posts.o = mem.user_id
  left join public.room_seen s on s.viewer_id = (select auth.uid()) and s.owner_id = mem.user_id
  where posts.t > coalesce(s.seen_at, greatest(mem.joined_at, timestamptz '2026-11-18 16:00:00+00'))
$$;
revoke all on function public.rooms_with_news(uuid) from public, anon;
grant execute on function public.rooms_with_news(uuid) to authenticated;
