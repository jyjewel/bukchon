-- 도서관 공부 시간을 마을마다 따로 재지 않고, 사람마다 하나로 합친다.
-- 어느 마을 도서관에서 재든 같은 시계 하나가 돌고, 속한 모든 마을 도서관에 같은 시간이 보인다.
-- (예전 표 library_desks 는 더 쓰지 않고 그대로 둔다.)

create table public.study_clocks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  day date not null,
  total_seconds integer not null default 0 check (total_seconds >= 0),
  running_since timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.study_clocks enable row level security;
revoke all on public.study_clocks from anon, authenticated, public;

-- 지금 하루(한국 시각 오전 6시 기준)
create function public._study_day() returns date
language sql stable set search_path = '' as $$ select ((now() - interval '6 hours') at time zone 'Asia/Seoul')::date $$;
create function public._study_day_start() returns timestamptz
language sql stable set search_path = '' as $$ select (public._study_day()::timestamp + interval '6 hours') at time zone 'Asia/Seoul' $$;
revoke all on function public._study_day(), public._study_day_start() from public, anon, authenticated;

-- 기존 마을별 기록 합치기: 오늘 기록은 합계를 더하고, 돌고 있는 것이 있으면 가장 먼저 시작한 시각부터 하나로 이어 간다
insert into public.study_clocks (user_id, day, total_seconds, running_since)
select d.user_id, public._study_day(),
       coalesce(sum(case when d.day = public._study_day() then d.total_seconds else 0 end), 0)::int,
       min(d.running_since)
  from public.library_desks d
 group by d.user_id
on conflict do nothing;

create function public._clock_roll(p_uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.study_clocks (user_id, day) values (p_uid, public._study_day()) on conflict do nothing;
  update public.study_clocks set day = public._study_day(), total_seconds = 0,
         running_since = case when running_since is null then null else public._study_day_start() end,
         updated_at = now()
   where user_id = p_uid and day <> public._study_day();
end $$;
revoke all on function public._clock_roll(uuid) from public, anon, authenticated;

-- 재생/일시정지: 멈춰 있으면 시작(속한 모든 마을에서 내 상태가 '공동 연구'), 돌고 있으면 멈추며 시간을 합계에 더한다
create or replace function public.desk_turn(p_village uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user(); r public.study_clocks;
begin
  if not public.is_village_member(p_village) then raise exception 'not_member'; end if;
  perform public._clock_roll(v_uid);
  select * into r from public.study_clocks where user_id = v_uid for update;
  if r.running_since is null then
    update public.study_clocks set running_since = now(), updated_at = now() where user_id = v_uid returning * into r;
    update public.research_status set status = 'library' where user_id = v_uid and status not in ('offline', 'library');
  else
    update public.study_clocks set total_seconds = total_seconds + greatest(0, floor(extract(epoch from (now() - r.running_since)))::int),
           running_since = null, updated_at = now() where user_id = v_uid returning * into r;
  end if;
  return jsonb_build_object('running', r.running_since is not null, 'total', r.total_seconds);
end $$;

-- 마을 모두의 자리: 같은 마을 주민의 오늘 합계(+지금 돌고 있는 시간)와 돌고 있는지.
-- 3시간 넘게 접속이 끊긴 채 돌던 시계는 마지막 접속 시각까지만 합계에 넣고 멈춘다.
create or replace function public.library_desks(p_village uuid) returns table (user_id uuid, running boolean, since timestamptz, seconds integer)
language plpgsql security definer set search_path = '' as $$
declare v_today date := public._study_day(); v_start timestamptz := public._study_day_start();
begin
  if not public.is_village_member(p_village) then raise exception 'not_member'; end if;
  update public.study_clocks c set
      total_seconds = case when c.day = v_today then c.total_seconds else 0 end
        + greatest(0, floor(extract(epoch from (least(s.seen + interval '150 seconds', now()) - greatest(c.running_since, case when c.day = v_today then c.running_since else v_start end))))::int),
      day = v_today, running_since = null, updated_at = now()
    from (select rs.user_id, max(rs.last_seen_at) as seen from public.research_status rs group by rs.user_id) s
   where c.running_since is not null and s.user_id = c.user_id
     and c.user_id in (select m.user_id from public.village_members m where m.village_id = p_village)
     and s.seen < now() - interval '3 hours';
  return query
    select c.user_id,
           c.running_since is not null,
           case when c.running_since is null then null else greatest(c.running_since, v_start) end,
           (case when c.day = v_today then c.total_seconds else 0 end
             + case when c.running_since is null then 0 else greatest(0, floor(extract(epoch from (now() - greatest(c.running_since, v_start))))::int) end)
      from public.study_clocks c
      join public.village_members m on m.user_id = c.user_id and m.village_id = p_village
     where c.running_since is not null or (c.day = v_today and c.total_seconds > 0);
end $$;
