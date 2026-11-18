-- 기간형 공동 공부 목표: 기간과 "주 N일"을 정하면 매일 오늘의 체크리스트에 '공동 공부: 활동'이 올라오고,
-- 기간이 끝났을 때 모든 구성원이 기준(기간 일수 × N/7, 올림) 이상 체크했으면 목표 달성(책걸이), 아니면 조용히 미달로 끝난다.
alter table public.study_goals
  add column kind text not null default 'once' check (kind in ('once', 'habit')),
  add column start_date date,
  add column end_date date,
  add column per_week smallint check (per_week between 1 and 7),
  add column missed_at timestamptz,
  add constraint study_goals_habit_ck check (kind = 'once' or (start_date is not null and end_date is not null and per_week is not null and end_date >= start_date + 6 and end_date <= start_date + 120));

create table public.study_goal_checks (
  goal_id uuid not null references public.study_goals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  primary key (goal_id, user_id, day)
);
create index study_goal_checks_user on public.study_goal_checks (user_id);
alter table public.study_goal_checks enable row level security;
revoke all on public.study_goal_checks from anon, authenticated, public;
grant select on public.study_goal_checks to authenticated;
create policy goal_checks_select on public.study_goal_checks for select to authenticated
  using (exists (select 1 from public.study_goals g where g.id = goal_id and public.is_village_member(g.village_id)));
alter publication supabase_realtime add table public.study_goal_checks;

-- 목표 끝내기(달성): 책걸이 기념 송편·막걸리를 마을 전체에 돌리고 알림을 보낸다 (p_skip 은 알림에서 뺄 사람, 보통 마지막으로 누른 사람)
create function public._finish_goal(p_goal uuid, p_skip uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.study_goals; m record;
begin
  select * into g from public.study_goals where id = p_goal;
  update public.study_goals set completed_at = now() where id = p_goal;
  for m in select user_id from public.village_members where village_id = g.village_id loop
    insert into public.gifts (from_user, to_user, kind, note) values
      (g.created_by, m.user_id, 'songpyeon', left('책걸이 기념 · ' || g.title, 40)),
      (g.created_by, m.user_id, 'makgeolli', left('책걸이 기념 · ' || g.title, 40));
    if m.user_id is distinct from p_skip then
      insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
        values (m.user_id, g.village_id, g.created_by, 'study_goal', m.user_id, left(p_goal::text || '|' || g.title || '|done', 120));
    end if;
  end loop;
end $$;
revoke all on function public._finish_goal(uuid, uuid) from public, anon, authenticated;

-- 한 번 완료형: 내 완료 누르기 (기존 동작, _finish_goal 사용)
create or replace function public.set_study_goal_done(p_goal uuid, p_done boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); g public.study_goals; left_count integer;
begin
  select * into g from public.study_goals where id = p_goal for update;
  if not found then raise exception 'no_goal'; end if;
  if g.completed_at is not null or g.missed_at is not null then raise exception 'goal_completed'; end if;
  if g.kind <> 'once' then raise exception 'not_once'; end if;
  update public.study_goal_members set done_at = case when p_done then now() else null end where goal_id = p_goal and user_id = me;
  if not found then raise exception 'not_member'; end if;
  select count(*) into left_count from public.study_goal_members where goal_id = p_goal and done_at is null;
  if left_count = 0 then perform public._finish_goal(p_goal, me); return true; end if;
  return false;
end $$;

-- 기간형 목표 만들기
create function public.create_habit_goal(p_village uuid, p_title text, p_note text, p_members uuid[], p_start date, p_end date, p_per_week integer) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); gid uuid; ids uuid[]; m uuid; today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if me is null or not public.is_village_member(p_village) then raise exception 'not_member'; end if;
  select coalesce(array_agg(distinct x), '{}') into ids from unnest(coalesce(p_members, '{}') || me) as x;
  if cardinality(ids) < 2 or cardinality(ids) > 6 then raise exception 'bad_members'; end if;
  if (select count(*) from public.village_members vm where vm.village_id = p_village and vm.user_id = any (ids)) <> cardinality(ids) then raise exception 'bad_members'; end if;
  if p_start < today or p_end < p_start + 6 or p_end > p_start + 120 or p_per_week not between 1 and 7 then raise exception 'bad_period'; end if;
  if (select count(*) from public.study_goals g where g.village_id = p_village and g.completed_at is null and g.missed_at is null) >= 8 then raise exception 'too_many_goals'; end if;
  insert into public.study_goals (village_id, created_by, title, note, kind, start_date, end_date, per_week)
    values (p_village, me, btrim(p_title), btrim(coalesce(p_note, '')), 'habit', p_start, p_end, p_per_week) returning id into gid;
  foreach m in array ids loop
    insert into public.study_goal_members (goal_id, user_id) values (gid, m);
    if m <> me then
      insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
        values (m, p_village, me, 'study_goal', m, left(gid::text || '|' || btrim(p_title) || '|new', 120));
    end if;
  end loop;
  return gid;
end $$;

-- 오늘(또는 어제) 체크하기/취소: 기간 안, 구성원만
create function public.set_goal_check(p_goal uuid, p_day date, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); g public.study_goals; today date := (now() at time zone 'Asia/Seoul')::date;
begin
  select * into g from public.study_goals where id = p_goal;
  if not found or g.kind <> 'habit' or g.completed_at is not null or g.missed_at is not null then raise exception 'no_goal'; end if;
  if not exists (select 1 from public.study_goal_members where goal_id = p_goal and user_id = me) then raise exception 'not_member'; end if;
  if p_day < g.start_date or p_day > g.end_date or p_day > today or p_day < today - 1 then raise exception 'bad_day'; end if;
  if p_on then insert into public.study_goal_checks (goal_id, user_id, day) values (p_goal, me, p_day) on conflict do nothing;
  else delete from public.study_goal_checks where goal_id = p_goal and user_id = me and day = p_day; end if;
end $$;

-- 목표 고치기(만든 사람·마을 장, 진행 중일 때만): 제목·메모·함께하는 사람, 기간형은 종료일·주 N일도
create function public.update_study_goal(p_goal uuid, p_title text, p_note text, p_members uuid[], p_end date, p_per_week integer) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); g public.study_goals; ids uuid[]; m uuid; today date := (now() at time zone 'Asia/Seoul')::date; left_count integer;
begin
  select * into g from public.study_goals where id = p_goal for update;
  if not found then raise exception 'no_goal'; end if;
  if g.completed_at is not null or g.missed_at is not null then raise exception 'goal_completed'; end if;
  if not (g.created_by = me or public.is_village_admin(g.village_id)) then raise exception 'not_allowed'; end if;
  select coalesce(array_agg(distinct x), '{}') into ids from unnest(coalesce(p_members, '{}') || g.created_by) as x;
  if cardinality(ids) < 2 or cardinality(ids) > 6 then raise exception 'bad_members'; end if;
  if (select count(*) from public.village_members vm where vm.village_id = g.village_id and vm.user_id = any (ids)) <> cardinality(ids) then raise exception 'bad_members'; end if;
  if g.kind = 'habit' and (p_end < greatest(g.start_date + 6, today) or p_end > g.start_date + 120 or p_per_week not between 1 and 7) then raise exception 'bad_period'; end if;
  update public.study_goals set title = btrim(p_title), note = btrim(coalesce(p_note, '')),
    end_date = case when g.kind = 'habit' then p_end else end_date end, per_week = case when g.kind = 'habit' then p_per_week else per_week end where id = p_goal;
  delete from public.study_goal_members where goal_id = p_goal and not (user_id = any (ids));
  delete from public.study_goal_checks where goal_id = p_goal and not (user_id = any (ids));
  foreach m in array ids loop
    if not exists (select 1 from public.study_goal_members where goal_id = p_goal and user_id = m) then
      insert into public.study_goal_members (goal_id, user_id) values (p_goal, m);
      if m <> me then
        insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
          values (m, g.village_id, me, 'study_goal', m, left(p_goal::text || '|' || btrim(p_title) || '|new', 120));
      end if;
    end if;
  end loop;
  -- 한 번 완료형은 남은 사람이 모두 끝낸 상태가 될 수 있다
  if g.kind = 'once' then
    select count(*) into left_count from public.study_goal_members where goal_id = p_goal and done_at is null;
    if left_count = 0 then perform public._finish_goal(p_goal, me); end if;
  end if;
end $$;

-- 매일 새벽: 기간이 끝난 기간형 목표를 판정한다 (기준 = 기간 일수 × 주 N일 ÷ 7, 올림). 모두 채웠으면 달성, 아니면 조용히 미달.
create function public.finalize_habit_goals() returns integer
language plpgsql security definer set search_path = '' as $$
declare g record; n integer := 0; today date := (now() at time zone 'Asia/Seoul')::date; need integer; ok boolean; m record;
begin
  for g in select * from public.study_goals where kind = 'habit' and completed_at is null and missed_at is null and end_date < today for update skip locked loop
    need := ceil(((g.end_date - g.start_date + 1) * g.per_week) / 7.0);
    select coalesce(bool_and((select count(*) from public.study_goal_checks c where c.goal_id = g.id and c.user_id = gm.user_id and c.day between g.start_date and g.end_date) >= need), false)
      into ok from public.study_goal_members gm where gm.goal_id = g.id;
    if ok then perform public._finish_goal(g.id, null);
    else
      update public.study_goals set missed_at = now() where id = g.id;
      for m in select user_id from public.study_goal_members where goal_id = g.id loop
        insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
          values (m.user_id, g.village_id, g.created_by, 'study_goal', m.user_id, left(g.id::text || '|' || g.title || '|missed', 120));
      end loop;
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.finalize_habit_goals() from public, anon, authenticated;
grant execute on function public.finalize_habit_goals() to service_role;

revoke all on function public.create_habit_goal(uuid, text, text, uuid[], date, date, integer), public.set_goal_check(uuid, date, boolean),
  public.update_study_goal(uuid, text, text, uuid[], date, integer) from public, anon;
grant execute on function public.create_habit_goal(uuid, text, text, uuid[], date, date, integer), public.set_goal_check(uuid, date, boolean),
  public.update_study_goal(uuid, text, text, uuid[], date, integer) to authenticated;

select cron.unschedule('habit-goals') where exists (select 1 from cron.job where jobname = 'habit-goals');
select cron.schedule('habit-goals', '5 15 * * *', 'select public.finalize_habit_goals()');   -- 매일 00:05 (한국 시각)
