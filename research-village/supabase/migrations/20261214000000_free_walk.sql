-- 마을 지도에서 빈 곳을 누르면 내 캐릭터가 거기로 걸어가고, 이웃 화면에서도 그 자리에 서 있다.
-- 위치는 '광장에서 쉬는 중' 상태일 때만 쓰이고, 상태를 바꾸면 원래 자리(책상·도서관·집)로 돌아간다.
alter table public.research_status add column pos_x smallint, add column pos_y smallint;
alter table public.research_status add constraint research_status_pos_ck check ((pos_x is null) = (pos_y is null) and (pos_x is null or (pos_x between 0 and 432 and pos_y between 0 and 288)));

-- 상태가 바뀌면(같은 문장에서 위치를 함께 바꾸는 경우만 빼고) 위치를 지운다
create function public.reset_pos_on_status() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status and new.pos_x is not distinct from old.pos_x then
    new.pos_x := null; new.pos_y := null;
  end if;
  return new;
end $$;
create trigger research_status_resetpos before update of status on public.research_status
  for each row execute function public.reset_pos_on_status();

create function public.walk_to(p_village uuid, p_x integer, p_y integer) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); cur public.research_status;
begin
  if me is null or not public.is_village_member(p_village) then raise exception 'not_member'; end if;
  if p_x not between 0 and 432 or p_y not between 0 and 288 then raise exception 'bad_pos'; end if;
  select * into cur from public.research_status where village_id = p_village and user_id = me for update;
  if not found then raise exception 'not_member'; end if;
  if cur.status in ('focus', 'offline') then raise exception 'cannot_walk'; end if;
  update public.research_status set status = 'rest', pos_x = p_x, pos_y = p_y where village_id = p_village and user_id = me;
end $$;
revoke all on function public.walk_to(uuid, integer, integer) from public, anon;
grant execute on function public.walk_to(uuid, integer, integer) to authenticated;
