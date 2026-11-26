-- 쪽지 보관함은 기본이 아니라 선택: 간식을 먹거나 3일이 지나면 간식과 한마디는 사라지고,
-- 받은 사람이 '보관하기'를 누른 한마디만 쪽지 보관함에 남는다(간식 종류 아이콘과 함께).
drop trigger gifts_keep_note on public.gifts;
drop function public._keep_gift_note();

alter table public.gift_notes add column gift_id uuid unique;

create function public.keep_gift_note(p_gift uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user(); g public.gifts;
begin
  select * into g from public.gifts where id = p_gift and to_user = v_uid;
  if not found then raise exception 'no_gift'; end if;
  if btrim(g.note) = '' or g.note like '🎅%' then raise exception 'no_note'; end if;
  insert into public.gift_notes (to_user, from_user, kind, note, created_at, gift_id)
    values (g.to_user, g.from_user, g.kind, left(btrim(g.note), 80), g.created_at, g.id)
    on conflict (gift_id) do nothing;
end $$;
revoke all on function public.keep_gift_note(uuid) from public, anon;
grant execute on function public.keep_gift_note(uuid) to authenticated;
