-- 던지기에 눈덩이 추가(눈싸움)
create or replace function public.send_gesture(p_village uuid, p_target uuid, p_kind text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._same_village(p_village, p_target);
  if p_kind not in ('thesis', 'alarm', 'snack', 'bulb', 'clap', 'praise', 'snowball') then raise exception 'invalid_kind'; end if;
  perform public._notify(p_village, p_target, 'gesture', p_kind);
end;
$$;
