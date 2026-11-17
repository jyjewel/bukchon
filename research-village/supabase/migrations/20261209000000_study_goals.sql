-- 도서관 '공동 공부 목표': 마을 사람 몇 명을 골라 함께 목표를 정하고, 모두 완료 버튼을 누르면 목표가 끝난다.
create table public.study_goals (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references public.villages (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 60),
  note text not null default '' check (char_length(note) <= 100),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index study_goals_village on public.study_goals (village_id, created_at desc);

create table public.study_goal_members (
  goal_id uuid not null references public.study_goals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  done_at timestamptz,
  primary key (goal_id, user_id)
);
create index study_goal_members_user on public.study_goal_members (user_id);

alter table public.study_goals enable row level security;
alter table public.study_goal_members enable row level security;
revoke all on public.study_goals, public.study_goal_members from anon, authenticated, public;
grant select, delete on public.study_goals to authenticated;
grant select on public.study_goal_members to authenticated;
create policy goals_select on public.study_goals for select to authenticated using (public.is_village_member(village_id));
create policy goals_delete on public.study_goals for delete to authenticated
  using (created_by = (select auth.uid()) or public.is_village_admin(village_id));
create policy goal_members_select on public.study_goal_members for select to authenticated
  using (exists (select 1 from public.study_goals g where g.id = goal_id and public.is_village_member(g.village_id)));

-- 알림 종류 추가
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'postit', 'comment', 'chat_request', 'meeting',
  'gesture', 'gift', 'book_tip', 'journal_reaction', 'journal_comment', 'cheer', 'nudge',
  'moving_cake', 'moving_thanks', 'study_alarm', 'study_goal'));

-- 목표 만들기: 만든 사람은 자동으로 들어가고, 고른 사람들(같은 마을)에게 알림이 간다
create function public.create_study_goal(p_village uuid, p_title text, p_note text, p_members uuid[]) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); gid uuid; ids uuid[]; m uuid;
begin
  if me is null or not public.is_village_member(p_village) then raise exception 'not_member'; end if;
  select coalesce(array_agg(distinct x), '{}') into ids from unnest(coalesce(p_members, '{}') || me) as x;
  if cardinality(ids) < 2 or cardinality(ids) > 6 then raise exception 'bad_members'; end if;
  if (select count(*) from public.village_members vm where vm.village_id = p_village and vm.user_id = any (ids)) <> cardinality(ids) then
    raise exception 'bad_members';
  end if;
  if (select count(*) from public.study_goals g where g.village_id = p_village and g.completed_at is null) >= 8 then
    raise exception 'too_many_goals';
  end if;
  insert into public.study_goals (village_id, created_by, title, note) values (p_village, me, btrim(p_title), btrim(coalesce(p_note, '')))
    returning id into gid;
  foreach m in array ids loop
    insert into public.study_goal_members (goal_id, user_id) values (gid, m);
    if m <> me then
      insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
        values (m, p_village, me, 'study_goal', m, left(gid::text || '|' || btrim(p_title) || '|new', 120));
    end if;
  end loop;
  return gid;
end $$;

-- 내 목표 완료(또는 취소). 모두 완료하면 목표가 끝나고 다른 구성원에게 알림이 간다.
create function public.set_study_goal_done(p_goal uuid, p_done boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); g public.study_goals; m record; left_count integer;
begin
  select * into g from public.study_goals where id = p_goal for update;
  if not found then raise exception 'no_goal'; end if;
  if g.completed_at is not null then raise exception 'goal_completed'; end if;
  update public.study_goal_members set done_at = case when p_done then now() else null end where goal_id = p_goal and user_id = me;
  if not found then raise exception 'not_member'; end if;
  select count(*) into left_count from public.study_goal_members where goal_id = p_goal and done_at is null;
  if left_count = 0 then
    update public.study_goals set completed_at = now() where id = p_goal;
    for m in select user_id from public.study_goal_members where goal_id = p_goal and user_id <> me loop
      insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
        values (m.user_id, g.village_id, me, 'study_goal', m.user_id, left(p_goal::text || '|' || g.title || '|done', 120));
    end loop;
    return true;
  end if;
  return false;
end $$;
revoke all on function public.create_study_goal(uuid, text, text, uuid[]), public.set_study_goal_done(uuid, boolean) from public, anon;
grant execute on function public.create_study_goal(uuid, text, text, uuid[]), public.set_study_goal_done(uuid, boolean) to authenticated;

alter publication supabase_realtime add table public.study_goals, public.study_goal_members;
