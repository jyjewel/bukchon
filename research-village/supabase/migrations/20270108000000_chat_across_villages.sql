-- 대화는 마을과 상관없이 두 사람 사이에 하나로 이어진다: 이미 진행 중인(신청 중·대화 중) 대화가 있으면
-- 다른 마을에서 다시 신청해도 그 대화를 그대로 돌려준다.
create or replace function public.request_chat(p_village uuid, p_target uuid) returns public.conversations
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
  v_row public.conversations;
begin
  if p_target = v_uid then raise exception 'invalid_target'; end if;
  if not (public.is_village_member(p_village) and public.is_user_in_village(p_village, p_target)) then
    raise exception 'not_member';
  end if;
  select * into v_row from public.conversations
    where status in ('pending', 'active')
      and ((user_a = v_uid and user_b = p_target) or (user_a = p_target and user_b = v_uid))
    order by updated_at desc limit 1;
  if found then return v_row; end if;
  if not exists (select 1 from public.research_status s
                 where s.village_id = p_village and s.user_id = p_target and s.status = 'open'
                   and s.left_at is null and s.last_seen_at > now() - interval '150 seconds') then
    raise exception 'not_available';
  end if;
  insert into public.conversations (village_id, user_a, user_b) values (p_village, v_uid, p_target) returning * into v_row;
  insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
    values (p_target, p_village, v_uid, 'chat_request', p_target, '');
  return v_row;
end;
$$;
