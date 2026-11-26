-- 일지를 마을 주민뿐 아니라 '친구'에게도 공개할 수 있다. 한 명씩 고르지 않고, 친구로 등록한 사람 모두에게 한꺼번에 공개/비공개.
alter table public.daily_logs add column shared_friends boolean not null default false;
grant insert (shared_friends), update (shared_friends) on public.daily_logs to authenticated;

drop policy logs_select on public.daily_logs;
create policy logs_select on public.daily_logs for select to authenticated
  using (user_id = (select auth.uid())
         or public.can_read_shared_log(user_id, shared_villages)
         or (shared_friends and public.are_friends((select auth.uid()), user_id)));

-- 공개 일지의 반응·댓글도 같은 범위(친구 포함)에게 열린다
create or replace function public.can_read_log(p_owner uuid, p_date date) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.daily_logs l
                 where l.user_id = p_owner and l.log_date = p_date
                   and (l.user_id = (select auth.uid())
                        or public.can_read_shared_log(l.user_id, l.shared_villages)
                        or (l.shared_friends and public.are_friends((select auth.uid()), l.user_id))));
$$;

-- 알림: 함께 사는 마을이 없는 친구가 반응·댓글을 남겨도, 받는 사람의 마을(가장 먼저 들어간 곳)에서 알림이 열린다
create function public._notify_village(p_to uuid, p_actor uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(public.common_village(p_to, p_actor),
    case when public.are_friends(p_to, p_actor) then (select m.village_id from public.village_members m where m.user_id = p_to order by m.joined_at limit 1) end);
$$;
revoke all on function public._notify_village(uuid, uuid) from public, anon, authenticated;

create or replace function public.notify_journal_reaction() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_village uuid := public._notify_village(new.owner_id, new.user_id);
begin
  if new.owner_id <> new.user_id and v_village is not null then
    insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
      values (new.owner_id, v_village, new.user_id, 'journal_reaction', new.owner_id, new.emoji || ':' || new.log_date::text);
  end if;
  return new;
end;
$$;
create or replace function public.notify_journal_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
  select t.u, public._notify_village(t.u, new.author_id), new.author_id, 'journal_comment', new.owner_id, left(new.body, 60)
  from (select new.owner_id as u union select author_id from public.journal_comments where owner_id = new.owner_id and log_date = new.log_date) t
  where t.u <> new.author_id and public._notify_village(t.u, new.author_id) is not null;
  return new;
end;
$$;
