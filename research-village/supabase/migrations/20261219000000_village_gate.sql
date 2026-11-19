-- 대문 빗장: 마을장이 걸면 초대 코드가 있어도 새 주민이 들어올 수 없다(이미 들어간 주민은 그대로)
alter table public.villages add column gate_locked boolean not null default false;

create function public.set_village_gate(p_village uuid, p_locked boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_village_admin(p_village) then
    raise exception 'not_admin';
  end if;
  update public.villages set gate_locked = p_locked where id = p_village;
  if p_locked then
    delete from public.village_invites where village_id = p_village;   -- 걸 때 남아 있던 초대 링크도 없앤다
  end if;
end;
$$;
revoke all on function public.set_village_gate(uuid, boolean) from public, anon;
grant execute on function public.set_village_gate(uuid, boolean) to authenticated;

CREATE OR REPLACE FUNCTION public.join_village(p_code text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := public.require_user();
  v_village uuid;
  v_slot smallint;
begin
  select village_id into v_village from public.village_invites
    where code = p_code and expires_at > now();
  if v_village is null then
    raise exception 'invalid_invite';
  end if;
  if exists (select 1 from public.village_members where village_id = v_village and user_id = v_uid) then
    return v_village;
  end if;
  if (select gate_locked from public.villages where id = v_village) then
    raise exception 'village_locked';
  end if;
  if (select count(*) from public.village_members where user_id = v_uid) >= 5 then
    raise exception 'too_many_villages';
  end if;
  -- 빈 집 한 채를 잠그고 차지한다. 동시에 가입해도 6명을 넘을 수 없다.
  select slot into v_slot from public.houses
    where village_id = v_village and owner_id is null
    order by slot limit 1 for update skip locked;
  if v_slot is null then
    raise exception 'village_full';
  end if;
  update public.houses set owner_id = v_uid, style = '{}'::jsonb where village_id = v_village and slot = v_slot;
  insert into public.village_members (village_id, user_id) values (v_village, v_uid);
  insert into public.research_status (village_id, user_id) values (v_village, v_uid);
  return v_village;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_invite(p_village uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := public.require_user();
  v_code text := replace(gen_random_uuid()::text, '-', '');
begin
  if not public.is_village_admin(p_village) then
    raise exception 'not_admin';
  end if;
  if (select gate_locked from public.villages where id = p_village) then
    raise exception 'village_locked';
  end if;
  delete from public.village_invites where village_id = p_village;
  insert into public.village_invites (code, village_id, created_by, expires_at)
    values (v_code, p_village, v_uid, now() + interval '7 days');
  return v_code;
end;
$function$;
