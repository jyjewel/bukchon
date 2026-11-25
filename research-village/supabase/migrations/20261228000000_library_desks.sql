-- 도서관 독서실: 자리마다 모래시계가 있고, 돌리면 공부 시간이 재져 같은 마을 모두에게 보인다.
-- 표는 직접 읽고 쓰지 못하고 아래 함수로만 다룬다. 시간은 "오늘(한국 날짜)" 합계만 남는다.

create table public.library_desks (
  village_id uuid not null,
  user_id uuid not null,
  day date not null default ((now() at time zone 'Asia/Seoul')::date),
  total_seconds integer not null default 0 check (total_seconds >= 0),
  running_since timestamptz,
  updated_at timestamptz not null default now(),
  primary key (village_id, user_id),
  foreign key (village_id, user_id) references public.village_members (village_id, user_id) on delete cascade
);
alter table public.library_desks enable row level security;
revoke all on public.library_desks from anon, authenticated, public;

-- 날짜가 바뀌었으면 합계를 0으로 되돌리고, 자정을 넘겨 돌던 모래시계는 오늘 0시부터 다시 센다
create function public._desk_roll(p_village uuid, p_uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_today date := (now() at time zone 'Asia/Seoul')::date;
begin
  insert into public.library_desks (village_id, user_id, day) values (p_village, p_uid, v_today) on conflict do nothing;
  update public.library_desks set day = v_today, total_seconds = 0,
         running_since = case when running_since is null then null else (v_today::timestamp at time zone 'Asia/Seoul') end,
         updated_at = now()
   where village_id = p_village and user_id = p_uid and day <> v_today;
end $$;
revoke all on function public._desk_roll(uuid, uuid) from public, anon, authenticated;

-- 모래시계 돌리기: 멈춰 있으면 시작하고(내 상태는 '공동 연구'), 돌고 있으면 멈추며 시간을 합계에 더한다
create function public.desk_turn(p_village uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user(); r public.library_desks;
begin
  if not public.is_village_member(p_village) then raise exception 'not_member'; end if;
  perform public._desk_roll(p_village, v_uid);
  select * into r from public.library_desks where village_id = p_village and user_id = v_uid for update;
  if r.running_since is null then
    update public.library_desks set running_since = now(), updated_at = now() where village_id = p_village and user_id = v_uid returning * into r;
    update public.research_status set status = 'library' where village_id = p_village and user_id = v_uid and status not in ('offline', 'library');
  else
    update public.library_desks set total_seconds = total_seconds + greatest(0, floor(extract(epoch from (now() - r.running_since)))::int),
           running_since = null, updated_at = now() where village_id = p_village and user_id = v_uid returning * into r;
  end if;
  return jsonb_build_object('running', r.running_since is not null, 'total', r.total_seconds);
end $$;

-- 마을 모두의 자리: 앉은 시간(오늘 합계 + 지금 돌고 있는 시간)과 돌고 있는지.
-- 접속이 끊긴 사람의 모래시계는 마지막으로 확인된 시각에서 멈춘 것으로 친다.
create function public.library_desks(p_village uuid) returns table (user_id uuid, running boolean, since timestamptz, seconds integer)
language plpgsql security definer set search_path = '' as $$
declare v_today date := (now() at time zone 'Asia/Seoul')::date; v_start timestamptz := (v_today::timestamp at time zone 'Asia/Seoul');
begin
  if not public.is_village_member(p_village) then raise exception 'not_member'; end if;
  -- 접속이 끊긴 채 돌던 모래시계는 마지막 접속 시각까지만 합계에 넣고 멈춘다
  update public.library_desks d set
      total_seconds = case when d.day = v_today then d.total_seconds else 0 end
        + greatest(0, floor(extract(epoch from (least(s.last_seen_at + interval '150 seconds', now()) - greatest(d.running_since, case when d.day = v_today then d.running_since else v_start end))))::int),
      day = v_today, running_since = null, updated_at = now()
    from public.research_status s
   where d.village_id = p_village and d.running_since is not null
     and s.village_id = d.village_id and s.user_id = d.user_id
     and (s.left_at is not null or s.last_seen_at < now() - interval '150 seconds');
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

revoke all on function public.desk_turn(uuid), public.library_desks(uuid) from public, anon;
grant execute on function public.desk_turn(uuid), public.library_desks(uuid) to authenticated;
