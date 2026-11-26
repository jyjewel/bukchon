-- 일시정지를 누르면 도서관 자리에서 일어난다(내 상태가 '공동 연구'에서 '휴식'으로 돌아간다).
-- 오늘 잰 시간은 그대로 남고, 빈 책상 앞 이름표에 계속 보인다.
create or replace function public.desk_set(p_village uuid, p_run boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user(); r public.study_clocks;
begin
  if not public.is_village_member(p_village) then raise exception 'not_member'; end if;
  perform public._clock_roll(v_uid);
  select * into r from public.study_clocks where user_id = v_uid for update;
  if p_run and r.running_since is null then
    update public.study_clocks set running_since = now(), updated_at = now() where user_id = v_uid returning * into r;
    update public.research_status set status = 'library' where user_id = v_uid and status not in ('offline', 'library');
  elsif not p_run and r.running_since is not null then
    update public.study_clocks set total_seconds = total_seconds + greatest(0, floor(extract(epoch from (now() - r.running_since)))::int),
           running_since = null, updated_at = now() where user_id = v_uid returning * into r;
    update public.research_status set status = 'rest' where user_id = v_uid and status = 'library';   -- 일시정지하면 자리에서 일어난다
  end if;
  return jsonb_build_object('running', r.running_since is not null, 'total', r.total_seconds);
end $$;
