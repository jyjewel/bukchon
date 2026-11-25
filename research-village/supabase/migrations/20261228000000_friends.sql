-- 친구 링크: 사람마다 친구 코드가 하나 있고, 링크를 열어 "친구 추가"를 누르면 마을과 상관없이 서로 친구가 된다.
-- 표는 직접 읽고 쓰지 못하고, 아래 함수로만 다룬다(코드 값은 본인만 알 수 있다).

create table public.friend_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique check (char_length(code) between 8 and 32),
  created_at timestamptz not null default now()
);
alter table public.friend_codes enable row level security;
revoke all on public.friend_codes from anon, authenticated, public;

create table public.friendships (
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index friendships_user_b on public.friendships (user_b);
alter table public.friendships enable row level security;
revoke all on public.friendships from anon, authenticated, public;

create function public._new_friend_code() returns text
language sql volatile set search_path = '' as $$
  select string_agg(substr('abcdefghjkmnpqrstuvwxyz23456789', 1 + floor(random() * 31)::int, 1), '') from generate_series(1, 12);
$$;
revoke all on function public._new_friend_code() from public, anon, authenticated;

-- 내 친구 코드(없으면 만든다)
create function public.my_friend_code() returns text
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user(); v_code text;
begin
  select code into v_code from public.friend_codes where user_id = v_uid;
  if v_code is null then
    loop
      v_code := public._new_friend_code();
      begin
        insert into public.friend_codes (user_id, code) values (v_uid, v_code);
        exit;
      exception when unique_violation then
        select code into v_code from public.friend_codes where user_id = v_uid;
        if v_code is not null then exit; end if;
      end;
    end loop;
  end if;
  return v_code;
end $$;

-- 링크가 퍼졌을 때 새 코드로 바꾼다(이전 링크는 더 이상 쓸 수 없다. 이미 된 친구는 그대로)
create function public.renew_friend_code() returns text
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user(); v_code text;
begin
  loop
    v_code := public._new_friend_code();
    begin
      insert into public.friend_codes (user_id, code) values (v_uid, v_code)
        on conflict (user_id) do update set code = excluded.code, created_at = now();
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  return v_code;
end $$;

-- 링크를 열었을 때 보여 줄 상대 소개(이름·분야·캐릭터만)
create function public.preview_friend(p_code text) returns jsonb
language plpgsql security definer stable set search_path = '' as $$
declare v_uid uuid := public.require_user(); v_owner uuid; r jsonb;
begin
  select user_id into v_owner from public.friend_codes where code = btrim(coalesce(p_code, ''));
  if v_owner is null then return null; end if;
  select jsonb_build_object(
    'display_name', p.display_name, 'field', p.field, 'avatar', p.avatar,
    'is_self', v_owner = v_uid,
    'already', exists (select 1 from public.friendships f where f.user_a = least(v_uid, v_owner) and f.user_b = greatest(v_uid, v_owner))
  ) into r from public.profiles p where p.id = v_owner;
  return r;
end $$;

-- 친구 추가: 서로 친구가 된다(수락 절차 없음. 링크를 건넨 것 자체가 허락이다)
create function public.add_friend(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user(); v_owner uuid; v_count int;
begin
  select user_id into v_owner from public.friend_codes where code = btrim(coalesce(p_code, ''));
  if v_owner is null then raise exception 'invalid_code'; end if;
  if v_owner = v_uid then raise exception 'self_friend'; end if;
  select count(*) into v_count from public.friendships where user_a = v_uid or user_b = v_uid;
  if v_count >= 200 then raise exception 'friend_limit'; end if;
  insert into public.friendships (user_a, user_b) values (least(v_uid, v_owner), greatest(v_uid, v_owner))
    on conflict do nothing;
  return v_owner;
end $$;

-- 내 친구들(이름·연구 분야·소개·캐릭터만)
create function public.list_friends() returns table (user_id uuid, display_name text, field text, bio text, avatar jsonb, since timestamptz)
language sql security definer stable set search_path = '' as $$
  select p.id, p.display_name, p.field, p.bio, p.avatar, f.created_at
  from public.friendships f
  join public.profiles p on p.id = case when f.user_a = (select auth.uid()) then f.user_b else f.user_a end
  where (select auth.uid()) in (f.user_a, f.user_b)
  order by f.created_at desc
$$;

create function public.remove_friend(p_friend uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user();
begin
  delete from public.friendships where user_a = least(v_uid, p_friend) and user_b = greatest(v_uid, p_friend);
end $$;

revoke all on function public.my_friend_code(), public.renew_friend_code(), public.preview_friend(text), public.add_friend(text), public.list_friends(), public.remove_friend(uuid) from public, anon;
grant execute on function public.my_friend_code(), public.renew_friend_code(), public.preview_friend(text), public.add_friend(text), public.list_friends(), public.remove_friend(uuid) to authenticated;
