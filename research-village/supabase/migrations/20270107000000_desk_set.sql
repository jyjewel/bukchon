-- 공부 시계 재생/일시정지를 "켜기/끄기"로 분명히 정한다(예전 desk_turn 은 지금 상태를 뒤집기만 해서,
-- 화면에 보이는 상태가 서버와 달랐다면 재생을 눌러도 오히려 멈출 수 있었다).
create function public.desk_set(p_village uuid, p_run boolean) returns jsonb
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
  end if;
  return jsonb_build_object('running', r.running_since is not null, 'total', r.total_seconds);
end $$;
revoke all on function public.desk_set(uuid, boolean) from public, anon;
grant execute on function public.desk_set(uuid, boolean) to authenticated;
