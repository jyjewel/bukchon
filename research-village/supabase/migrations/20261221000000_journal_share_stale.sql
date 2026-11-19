-- 일지 저장이 막히던 문제: 예전에 공개했던 마을을 떠난 뒤에는 저장할 때마다 오류가 났다.
-- 이제 내가 살지 않는 마을은 오류 없이 공개 목록에서 조용히 뺀다(그 마을 주민은 어차피 읽을 수 없다).
create or replace function public.validate_log_shares() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.shared_villages := coalesce(array(
    select v from unnest(new.shared_villages) v
    where exists (select 1 from public.village_members m where m.user_id = new.user_id and m.village_id = v)
  ), '{}');
  return new;
end;
$$;
-- 이미 쌓인 옛 공개 목록도 한 번 정리한다
update public.daily_logs d set shared_villages = array(
  select v from unnest(d.shared_villages) v
  where exists (select 1 from public.village_members m where m.user_id = d.user_id and m.village_id = v)
) where exists (select 1 from unnest(d.shared_villages) v
  where not exists (select 1 from public.village_members m where m.user_id = d.user_id and m.village_id = v));
