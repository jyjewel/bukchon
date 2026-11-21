-- 간식 먹기: 받은 간식을 먹으면 상자에서 사라지고, 한 시간 동안 지도의 내 캐릭터 곁에 먹는 모습이 보인다
alter table public.research_status
  add column snack_kind text check (snack_kind is null or char_length(snack_kind) <= 20),
  add column snack_until timestamptz;

create function public.eat_gift(p_gift uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user(); v_kind text;
begin
  delete from public.gifts where id = p_gift and to_user = v_uid returning kind into v_kind;
  if v_kind is null then raise exception 'no_gift'; end if;
  update public.research_status set snack_kind = v_kind, snack_until = now() + interval '1 hour' where user_id = v_uid;
  return v_kind;
end;
$$;
revoke all on function public.eat_gift(uuid) from public, anon;
grant execute on function public.eat_gift(uuid) to authenticated;
