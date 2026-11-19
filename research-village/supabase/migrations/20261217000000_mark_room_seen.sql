-- 연구실을 본 시각은 서버 시계로 기록한다(기기 시계가 달라도 '본 뒤'로 정확히 센다)
create function public.mark_room_seen(p_owner uuid) returns void
language sql security invoker set search_path = public as $$
  insert into public.room_seen (viewer_id, owner_id, seen_at)
  values ((select auth.uid()), p_owner, now())
  on conflict (viewer_id, owner_id) do update set seen_at = now()
$$;
revoke all on function public.mark_room_seen(uuid) from public, anon;
grant execute on function public.mark_room_seen(uuid) to authenticated;
