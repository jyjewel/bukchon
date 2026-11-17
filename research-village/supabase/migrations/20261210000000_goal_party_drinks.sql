-- 책걸이 기념 선물을 팥시루떡 대신 막걸리로: 송편과 막걸리를 마을 전체에 돌린다.
alter table public.gifts drop constraint gifts_kind_check;
alter table public.gifts add constraint gifts_kind_check check (kind in (
  'coffee', 'americano', 'snack', 'tea', 'beer', 'siru', 'rainbow', 'songpyeon',
  'mochi', 'yakgwa', 'tangerine', 'apple', 'minishell', 'haribo', 'makgeolli'));

create or replace function public.set_study_goal_done(p_goal uuid, p_done boolean) returns boolean
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
    for m in select user_id from public.village_members where village_id = g.village_id loop
      insert into public.gifts (from_user, to_user, kind, note) values
        (g.created_by, m.user_id, 'songpyeon', left('책걸이 기념 · ' || g.title, 40)),
        (g.created_by, m.user_id, 'makgeolli', left('책걸이 기념 · ' || g.title, 40));
      if m.user_id <> me then
        insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
          values (m.user_id, g.village_id, me, 'study_goal', m.user_id, left(p_goal::text || '|' || g.title || '|done', 120));
      end if;
    end loop;
    return true;
  end if;
  return false;
end $$;
