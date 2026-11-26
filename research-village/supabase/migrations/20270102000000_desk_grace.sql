-- 도서관 모래시계: 폰 화면이 꺼지거나 다른 앱을 쓰는 동안(접속 신호가 끊겨도) 공부 시간이 계속 재지도록,
-- 자동으로 멈추는 기준을 2분 30초에서 3시간으로 늘리고, 탭을 닫았다는 표시만으로는 멈추지 않게 한다.
create or replace function public.library_desks(p_village uuid) returns table (user_id uuid, running boolean, since timestamptz, seconds integer)
language plpgsql security definer set search_path = '' as $$
declare v_today date := (now() at time zone 'Asia/Seoul')::date; v_start timestamptz := (v_today::timestamp at time zone 'Asia/Seoul');
begin
  if not public.is_village_member(p_village) then raise exception 'not_member'; end if;
  -- 오래(3시간) 접속이 끊긴 채 돌던 모래시계는 마지막 접속 시각까지만 합계에 넣고 멈춘다
  update public.library_desks d set
      total_seconds = case when d.day = v_today then d.total_seconds else 0 end
        + greatest(0, floor(extract(epoch from (least(s.last_seen_at + interval '150 seconds', now()) - greatest(d.running_since, case when d.day = v_today then d.running_since else v_start end))))::int),
      day = v_today, running_since = null, updated_at = now()
    from public.research_status s
   where d.village_id = p_village and d.running_since is not null
     and s.village_id = d.village_id and s.user_id = d.user_id
     and s.last_seen_at < now() - interval '3 hours';
  return query
    select d.user_id,
           d.running_since is not null,
           case when d.running_since is null then null else greatest(d.running_since, v_start) end,
           (case when d.day = v_today then d.total_seconds else 0 end
             + case when d.running_since is null then 0 else greatest(0, floor(extract(epoch from (now() - greatest(d.running_since, v_start))))::int) end)
      from public.library_desks d
     where d.village_id = p_village
       and (d.running_since is not null or (d.day = v_today and d.total_seconds > 0));
end $$;
