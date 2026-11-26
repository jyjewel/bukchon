-- 공부 시간 집계는 한국 시각 오전 6시에 하루가 바뀐다(새벽까지 공부해도 같은 날로 쌓인다).
-- 오전 6시 전에 켠 모래시계는 전날 합계에 이어지고, 6시를 넘겨 돌던 것은 그날 6시부터 다시 센다.
create or replace function public._desk_roll(p_village uuid, p_uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_today date := ((now() - interval '6 hours') at time zone 'Asia/Seoul')::date;   -- 하루는 오전 6시에 바뀐다
begin
  insert into public.library_desks (village_id, user_id, day) values (p_village, p_uid, v_today) on conflict do nothing;
  update public.library_desks set day = v_today, total_seconds = 0,
         running_since = case when running_since is null then null else ((v_today::timestamp + interval '6 hours') at time zone 'Asia/Seoul') end,
         updated_at = now()
   where village_id = p_village and user_id = p_uid and day <> v_today;
end $$;

create or replace function public.library_desks(p_village uuid) returns table (user_id uuid, running boolean, since timestamptz, seconds integer)
language plpgsql security definer set search_path = '' as $$
declare v_today date := ((now() - interval '6 hours') at time zone 'Asia/Seoul')::date; v_start timestamptz := ((v_today::timestamp + interval '6 hours') at time zone 'Asia/Seoul');   -- 하루는 오전 6시에 바뀐다
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
