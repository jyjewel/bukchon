-- 친구(마을이 달라도)에게도 책상에 커피·간식 선물을 올릴 수 있다.
-- 같은 마을이면 지금처럼, 마을이 다르면 서로 친구인 경우에만. 알림은 받는 사람의 마을(함께 사는 마을이 있으면 그곳)에서 열린다.
create or replace function public.send_gift(p_village uuid, p_target uuid, p_kind text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user(); v_village uuid;
begin
  if p_target = v_uid then raise exception 'invalid_target'; end if;
  if public.is_user_in_village(p_village, v_uid) and public.is_user_in_village(p_village, p_target) then
    v_village := p_village;
  elsif public.are_friends(v_uid, p_target) then
    v_village := coalesce(public.common_village(p_target, v_uid),
                          (select m.village_id from public.village_members m where m.user_id = p_target order by m.joined_at limit 1));
  else
    raise exception 'not_member';
  end if;
  insert into public.gifts (from_user, to_user, kind, note) values (v_uid, p_target, p_kind, left(btrim(coalesce(p_note, '')), 40));
  if v_village is not null then
    perform public._notify(v_village, p_target, 'gift', p_kind || ':' || left(btrim(coalesce(p_note, '')), 40));
  end if;
end;
$$;

-- 책상 위 선물(종류만): 친구의 연구실에서도 보인다
create or replace function public.desk_gifts(p_owner uuid)
returns table (kind text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select g.kind, g.created_at from public.gifts g
  where g.to_user = p_owner and g.created_at > now() - interval '24 hours'
    and public.can_see_room(p_owner)
  order by g.created_at desc limit 12;
$$;
