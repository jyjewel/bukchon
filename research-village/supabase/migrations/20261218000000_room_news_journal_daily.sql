-- 공개 일지는 하루에 한 번만 새 글로 친다: 그날의 일지를 처음 보기 전에만 알리고, 본 뒤에 같은 날 고쳐도 다시 알리지 않는다
create or replace function public.rooms_with_news(p_village uuid) returns setof uuid
language sql stable security invoker set search_path = public as $$
  with me as (select (select auth.uid()) as id),
  mem as (select m.user_id, m.joined_at from public.village_members m, me where m.village_id = p_village and m.user_id <> me.id),
  posts as (
    select owner_id as o, created_at as t, null::timestamptz as since from public.whiteboard_items
    union all select i.owner_id, c.created_at, null from public.whiteboard_comments c join public.whiteboard_items i on i.id = c.item_id, me where c.author_id <> me.id
    union all select owner_id, created_at, null from public.achievements
    union all select p.owner_id, p.created_at, null from public.postits p, me where p.author_id <> me.id
    union all select user_id, updated_at, (log_date::timestamp at time zone 'Asia/Seoul') from public.daily_logs where p_village = any (shared_villages)
  )
  select distinct mem.user_id from mem
  join posts on posts.o = mem.user_id
  left join public.room_seen s on s.viewer_id = (select auth.uid()) and s.owner_id = mem.user_id
  where posts.t > coalesce(s.seen_at, greatest(mem.joined_at, timestamptz '2026-11-18 16:00:00+00'))
    and (posts.since is null or s.seen_at is null or s.seen_at < posts.since)
$$;
