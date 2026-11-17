-- 스터디 공지 알람: 마을 사람들이 요일·시간을 정해 두면 그 시간에 마을 모두에게 알림이 가고(앱이 열려 있으면 팝업, 폰 알림을 켠 사람은 푸시), Zoom 링크가 같이 뜬다.
create extension if not exists pg_cron with schema pg_catalog;

create table public.study_schedules (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references public.villages (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 60),
  days smallint[] not null check (cardinality(days) between 1 and 7 and days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),   -- 0=일 … 6=토
  at_time time not null,
  lead_min integer not null default 0 check (lead_min in (0, 5, 10, 30)),
  tz text not null default 'Asia/Seoul',
  zoom_url text not null default '' check (zoom_url = '' or (char_length(zoom_url) <= 500 and zoom_url ~* '^https://([a-z0-9-]+\.)*(zoom\.us|zoomgov\.com)/')),
  note text not null default '' check (char_length(note) <= 100),
  active boolean not null default true,
  last_fired_on date,
  created_at timestamptz not null default now()
);
create index study_schedules_village on public.study_schedules (village_id);
alter table public.study_schedules enable row level security;
revoke all on public.study_schedules from anon, authenticated, public;
grant select, delete on public.study_schedules to authenticated;
grant insert (village_id, title, days, at_time, lead_min, zoom_url, note) on public.study_schedules to authenticated;
grant update (title, days, at_time, lead_min, zoom_url, note, active) on public.study_schedules to authenticated;
create policy study_select on public.study_schedules for select to authenticated using (public.is_village_member(village_id));
create policy study_insert on public.study_schedules for insert to authenticated
  with check (created_by = (select auth.uid()) and public.is_village_member(village_id));
create policy study_update on public.study_schedules for update to authenticated
  using (created_by = (select auth.uid()) or public.is_village_admin(village_id))
  with check (created_by = (select auth.uid()) or public.is_village_admin(village_id));
create policy study_delete on public.study_schedules for delete to authenticated
  using (created_by = (select auth.uid()) or public.is_village_admin(village_id));

-- 한 마을에 스터디 공지는 10개까지
create function public.limit_study_schedules() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.study_schedules s where s.village_id = new.village_id) >= 10 then
    raise exception 'too_many_schedules';
  end if;
  return new;
end $$;
revoke all on function public.limit_study_schedules() from public, anon, authenticated;
create trigger study_schedules_limit before insert on public.study_schedules for each row execute function public.limit_study_schedules();

-- 알림 종류 추가
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'postit', 'comment', 'chat_request', 'meeting',
  'gesture', 'gift', 'book_tip', 'journal_reaction', 'journal_comment', 'cheer', 'nudge',
  'moving_cake', 'moving_thanks', 'study_alarm'));

-- 스터디 알림은 만든 사람에게도 간다 (푸시도 포함)
create or replace function public._push_on_notification() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'study_alarm' or new.actor_id is distinct from new.user_id then
    perform public._push(new.user_id, new.village_id, new.kind, new.actor_id);
  end if;
  return new;
end $$;

-- 매분 불러서, 때가 된 스터디 공지를 마을 사람 모두의 알림으로 만든다. 같은 날 두 번 보내지 않는다.
create function public.fire_study_alarms() returns integer
language plpgsql security definer set search_path = '' as $$
declare s record; local_now timestamp; local_time time; fire_time time; n integer := 0;
begin
  for s in select * from public.study_schedules where active for update skip locked loop
    local_now := now() at time zone s.tz;
    local_time := local_now::time;
    fire_time := s.at_time - make_interval(mins => s.lead_min);
    if extract(dow from local_now)::smallint = any (s.days)
       and local_time >= fire_time and local_time < fire_time + interval '3 minutes'
       and s.last_fired_on is distinct from local_now::date then
      update public.study_schedules set last_fired_on = local_now::date where id = s.id;
      insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
        select m.user_id, s.village_id, s.created_by, 'study_alarm', m.user_id, left(s.id::text || '|' || s.title, 120)
        from public.village_members m where m.village_id = s.village_id;
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;
revoke all on function public.fire_study_alarms() from public, anon, authenticated;
grant execute on function public.fire_study_alarms() to service_role;

-- 매분 실행 (이미 있으면 다시 잡는다)
do $$ begin
  perform cron.unschedule('study-alarms');
exception when others then null;
end $$;
select cron.schedule('study-alarms', '* * * * *', 'select public.fire_study_alarms()');
