-- 연구자 마을 (Research Village) — Phase 1 schema
-- 모든 마을 소속 데이터는 village_id 로 분리하고, RLS 로 접근을 제한한다.
-- 정원(6명), 초대, 타이머, 접속 상태처럼 신뢰가 필요한 변경은 security definer 함수(RPC)로만 수행한다.

-- ───────────────────────── types ─────────────────────────
create type public.research_state as enum ('offline', 'focus', 'open', 'library', 'rest');
create type public.diary_visibility as enum ('private', 'village', 'selected');

-- ───────────────────────── tables ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 20),
  field text not null default '' check (char_length(field) <= 60),
  bio text not null default '' check (char_length(bio) <= 300),
  keywords text[] not null default '{}' check (cardinality(keywords) <= 12),
  avatar jsonb not null default '{}'::jsonb,
  share_study_time boolean not null default false,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.villages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 30),
  theme text not null default 'meadow',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.village_members (
  village_id uuid not null references public.villages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (village_id, user_id)
);
create index village_members_user_idx on public.village_members (user_id);

-- 마을마다 정확히 6채. 빈 집(owner_id is null)이 없으면 가입할 수 없다 → 정원 6명 보장.
create table public.houses (
  village_id uuid not null references public.villages (id) on delete cascade,
  slot smallint not null check (slot between 0 and 5),
  owner_id uuid references auth.users (id) on delete set null,
  style jsonb not null default '{}'::jsonb,
  primary key (village_id, slot),
  unique (village_id, owner_id)
);

create table public.research_status (
  village_id uuid not null,
  user_id uuid not null,
  status public.research_state not null default 'rest',
  topic text not null default '' check (char_length(topic) <= 120),
  reading text not null default '' check (char_length(reading) <= 120),
  last_seen_at timestamptz not null default now(),
  left_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (village_id, user_id),
  foreign key (village_id, user_id) references public.village_members (village_id, user_id) on delete cascade
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  village_id uuid references public.villages (id) on delete set null,
  subject text not null default '' check (char_length(subject) <= 60),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  running_since timestamptz,            -- null 이면 일시정지 상태
  accumulated_seconds integer not null default 0 check (accumulated_seconds >= 0)
);
create unique index study_sessions_one_active on public.study_sessions (user_id) where ended_at is null;
create index study_sessions_user_started on public.study_sessions (user_id, started_at desc);

create table public.study_notes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  goal text not null default '' check (char_length(goal) <= 200),
  goal_minutes integer not null default 0 check (goal_minutes between 0 and 1440),
  note text not null default '' check (char_length(note) <= 20000),
  updated_at timestamptz not null default now()
);

create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null,
  author_id uuid not null default auth.uid(),
  kind text not null default 'daily' check (kind in ('daily', 'reading', 'progress', 'writing')),
  title text not null default '' check (char_length(title) <= 100),
  body text not null check (char_length(body) between 1 and 10000),
  link_url text not null default '' check (char_length(link_url) <= 500),
  visibility public.diary_visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (village_id, author_id) references public.village_members (village_id, user_id) on delete cascade
);
create index diary_entries_village_created on public.diary_entries (village_id, created_at desc);

create table public.entry_permissions (
  entry_id uuid not null references public.diary_entries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (entry_id, user_id)
);

create table public.village_invites (
  code text primary key,
  village_id uuid not null references public.villages (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index village_invites_village_idx on public.village_invites (village_id);

-- ───────────────────────── helper functions (RLS 재귀 방지) ─────────────────────────
create function public.is_village_member(p_village uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.village_members m
                 where m.village_id = p_village and m.user_id = (select auth.uid()));
$$;

create function public.is_village_admin(p_village uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.village_members m
                 where m.village_id = p_village and m.user_id = (select auth.uid()) and m.role = 'admin');
$$;

create function public.shares_village_with(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.village_members a
                 join public.village_members b on a.village_id = b.village_id
                 where a.user_id = (select auth.uid()) and b.user_id = p_user);
$$;

create function public.is_entry_author(p_entry uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.diary_entries e
                 where e.id = p_entry and e.author_id = (select auth.uid()));
$$;

create function public.has_entry_permission(p_entry uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.entry_permissions p
                 where p.entry_id = p_entry and p.user_id = (select auth.uid()));
$$;

-- 선택 공개 대상은 같은 마을 주민이어야 한다.
create function public.can_grant_entry(p_entry uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.diary_entries e
                 join public.village_members m on m.village_id = e.village_id and m.user_id = p_user
                 where e.id = p_entry and e.author_id = (select auth.uid()));
$$;

-- ───────────────────────── triggers ─────────────────────────
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 20));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_status() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.last_seen_at := now();
  new.left_at := null;
  return new;
end;
$$;
-- 사용자가 상태/주제를 바꿀 때만 발동 (heartbeat 등 RPC 는 다른 컬럼만 갱신)
create trigger research_status_touch before update of status, topic, reading on public.research_status
  for each row execute function public.touch_status();

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger diary_entries_touch before update on public.diary_entries
  for each row execute function public.touch_updated_at();
create trigger study_notes_touch before update on public.study_notes
  for each row execute function public.touch_updated_at();

-- ───────────────────────── privileges ─────────────────────────
-- 기본 권한을 모두 회수하고 필요한 것만 부여한다. 비로그인(anon) 사용자는 아무 것도 읽을 수 없다.
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;

grant select on public.profiles, public.villages, public.village_members, public.houses,
  public.research_status, public.study_sessions, public.village_invites to authenticated;
grant update (display_name, field, bio, keywords, avatar, share_study_time, onboarded) on public.profiles to authenticated;
grant update (name, theme) on public.villages to authenticated;
grant update (style) on public.houses to authenticated;
grant update (status, topic, reading) on public.research_status to authenticated;
grant select, insert, update on public.study_notes to authenticated;
grant select, insert, delete on public.diary_entries to authenticated;
grant update (kind, title, body, link_url, visibility) on public.diary_entries to authenticated;
grant select, insert, delete on public.entry_permissions to authenticated;

grant execute on function public.is_village_member(uuid), public.is_village_admin(uuid),
  public.shares_village_with(uuid), public.is_entry_author(uuid), public.has_entry_permission(uuid),
  public.can_grant_entry(uuid, uuid) to authenticated;

-- ───────────────────────── row level security ─────────────────────────
alter table public.profiles enable row level security;
alter table public.villages enable row level security;
alter table public.village_members enable row level security;
alter table public.houses enable row level security;
alter table public.research_status enable row level security;
alter table public.study_sessions enable row level security;
alter table public.study_notes enable row level security;
alter table public.diary_entries enable row level security;
alter table public.entry_permissions enable row level security;
alter table public.village_invites enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_village_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy villages_select on public.villages for select to authenticated
  using (public.is_village_member(id));
create policy villages_update on public.villages for update to authenticated
  using (public.is_village_admin(id)) with check (public.is_village_admin(id));

create policy members_select on public.village_members for select to authenticated
  using (public.is_village_member(village_id));

create policy houses_select on public.houses for select to authenticated
  using (public.is_village_member(village_id));
create policy houses_update on public.houses for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy status_select on public.research_status for select to authenticated
  using (public.is_village_member(village_id));
create policy status_update on public.research_status for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 연구 시간과 개인 노트는 본인만 열람
create policy sessions_select on public.study_sessions for select to authenticated
  using (user_id = (select auth.uid()));

create policy notes_select on public.study_notes for select to authenticated
  using (user_id = (select auth.uid()));
create policy notes_insert on public.study_notes for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy notes_update on public.study_notes for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy diary_select on public.diary_entries for select to authenticated
  using (
    author_id = (select auth.uid())
    or (visibility = 'village' and public.is_village_member(village_id))
    or (visibility = 'selected' and public.is_village_member(village_id) and public.has_entry_permission(id))
  );
create policy diary_insert on public.diary_entries for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_village_member(village_id));
create policy diary_update on public.diary_entries for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy diary_delete on public.diary_entries for delete to authenticated
  using (author_id = (select auth.uid()));

create policy perms_select on public.entry_permissions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_entry_author(entry_id));
create policy perms_insert on public.entry_permissions for insert to authenticated
  with check (public.can_grant_entry(entry_id, user_id));
create policy perms_delete on public.entry_permissions for delete to authenticated
  using (public.is_entry_author(entry_id));

create policy invites_select on public.village_invites for select to authenticated
  using (public.is_village_admin(village_id));

-- ───────────────────────── RPC: 마을 ─────────────────────────
create function public.require_user() returns uuid
language plpgsql stable set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  return v_uid;
end;
$$;

create function public.create_village(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
  v_id uuid;
begin
  -- Phase 1: 한 사람은 한 마을에만 산다 (데이터 구조는 여러 마을을 지원).
  if exists (select 1 from public.village_members where user_id = v_uid) then
    raise exception 'already_in_village';
  end if;
  insert into public.villages (name, created_by) values (btrim(p_name), v_uid) returning id into v_id;
  insert into public.houses (village_id, slot, owner_id)
    select v_id, s, case when s = 0 then v_uid end from generate_series(0, 5) s;
  insert into public.village_members (village_id, user_id, role) values (v_id, v_uid, 'admin');
  insert into public.research_status (village_id, user_id) values (v_id, v_uid);
  return v_id;
end;
$$;

-- 초대 링크 발급(재발급 시 기존 링크는 폐기). 7일 뒤 만료.
create function public.create_invite(p_village uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
  v_code text := replace(gen_random_uuid()::text, '-', '');
begin
  if not public.is_village_admin(p_village) then
    raise exception 'not_admin';
  end if;
  delete from public.village_invites where village_id = p_village;
  insert into public.village_invites (code, village_id, created_by, expires_at)
    values (v_code, p_village, v_uid, now() + interval '7 days');
  return v_code;
end;
$$;

create function public.revoke_invite(p_village uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_user();
  if not public.is_village_admin(p_village) then
    raise exception 'not_admin';
  end if;
  delete from public.village_invites where village_id = p_village;
end;
$$;

-- 가입 전 초대장 미리보기: 초대 코드를 가진 로그인 사용자에게 마을 이름과 남은 자리만 알려준다.
create function public.preview_invite(p_code text)
returns table (village_name text, member_count integer, valid boolean)
language sql stable security definer set search_path = '' as $$
  select v.name,
         (select count(*)::int from public.village_members m where m.village_id = v.id),
         i.expires_at > now()
  from public.village_invites i join public.villages v on v.id = i.village_id
  where i.code = p_code and (select auth.uid()) is not null;
$$;

create function public.join_village(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
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
  if exists (select 1 from public.village_members where user_id = v_uid) then
    raise exception 'already_in_village';
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
$$;

-- 내부용: 주민 한 명을 마을에서 내보낸다.
create function public._remove_from_village(p_village uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_was_admin boolean;
begin
  select role = 'admin' into v_was_admin from public.village_members
    where village_id = p_village and user_id = p_user;
  if v_was_admin is null then
    return;
  end if;
  update public.houses set owner_id = null, style = '{}'::jsonb where village_id = p_village and owner_id = p_user;
  delete from public.village_members where village_id = p_village and user_id = p_user; -- 상태·다이어리는 cascade
  if not exists (select 1 from public.village_members where village_id = p_village) then
    delete from public.villages where id = p_village;
  elsif v_was_admin and not exists (select 1 from public.village_members where village_id = p_village and role = 'admin') then
    update public.village_members set role = 'admin'
      where village_id = p_village
        and user_id = (select user_id from public.village_members where village_id = p_village order by joined_at limit 1);
  end if;
end;
$$;

create function public.leave_village(p_village uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._remove_from_village(p_village, public.require_user());
end;
$$;

create function public.remove_member(p_village uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user();
begin
  if not public.is_village_admin(p_village) then
    raise exception 'not_admin';
  end if;
  if p_user = v_uid then
    raise exception 'cannot_remove_self';
  end if;
  perform public._remove_from_village(p_village, p_user);
end;
$$;

create function public.delete_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
  v_village uuid;
begin
  for v_village in select village_id from public.village_members where user_id = v_uid loop
    perform public._remove_from_village(v_village, v_uid);
  end loop;
  delete from auth.users where id = v_uid;
end;
$$;

-- ───────────────────────── RPC: 접속 상태 ─────────────────────────
-- 접속 여부(last_seen_at / left_at)는 서버 시각으로만 기록한다. 연구 상태(status)와는 별개.
-- 150초 이상 heartbeat 가 없으면 '오프라인'으로 본다.
-- 서버 시각을 돌려주어 클라이언트가 시계 오차를 보정할 수 있게 한다.
create function public.heartbeat(p_village uuid) returns timestamptz
language sql security definer set search_path = '' as $$
  update public.research_status set last_seen_at = now(), left_at = null
  where village_id = p_village and user_id = (select auth.uid());
  select now();
$$;

-- 탭을 닫을 때 호출: 다른 주민에게 곧바로 오프라인으로 보인다.
create function public.go_away(p_village uuid) returns void
language sql security definer set search_path = '' as $$
  update public.research_status set left_at = now()
  where village_id = p_village and user_id = (select auth.uid());
$$;

-- 마을에 들어올 때 호출. 오래 자리를 비웠다면(heartbeat 끊김)
--  · 돌아가던 타이머는 마지막으로 확인된 접속 시각까지만 인정하고 일시정지
--  · '집중 연구' 같은 상태가 남아 있지 않도록 '휴식(광장)'으로 되돌린다.
create function public.enter_village(p_village uuid) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
  v_last timestamptz;
begin
  select last_seen_at into v_last from public.research_status
    where village_id = p_village and user_id = v_uid for update;
  if v_last is null then
    raise exception 'not_member';
  end if;
  if v_last < now() - interval '150 seconds' then
    update public.study_sessions
      set accumulated_seconds = accumulated_seconds
            + greatest(0, floor(extract(epoch from (v_last - running_since))))::int,
          running_since = null
      where user_id = v_uid and ended_at is null and running_since is not null;
    update public.research_status set status = 'rest'
      where village_id = p_village and user_id = v_uid and status <> 'offline';
  end if;
  update public.research_status set last_seen_at = now(), left_at = null
    where village_id = p_village and user_id = v_uid;
  return now();
end;
$$;

-- ───────────────────────── RPC: 연구 타이머 (서버 시각 기준) ─────────────────────────
create function public.timer_start(p_village uuid, p_subject text) returns public.study_sessions
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
  v_row public.study_sessions;
begin
  if p_village is not null and not public.is_village_member(p_village) then
    raise exception 'not_member';
  end if;
  select * into v_row from public.study_sessions where user_id = v_uid and ended_at is null;
  if found then
    return v_row;
  end if;
  insert into public.study_sessions (user_id, village_id, subject, running_since)
    values (v_uid, p_village, left(btrim(coalesce(p_subject, '')), 60), now())
    returning * into v_row;
  return v_row;
end;
$$;

create function public.timer_pause() returns public.study_sessions
language plpgsql security definer set search_path = '' as $$
declare v_row public.study_sessions;
begin
  update public.study_sessions
    set accumulated_seconds = accumulated_seconds + floor(extract(epoch from (now() - running_since)))::int,
        running_since = null
    where user_id = public.require_user() and ended_at is null and running_since is not null
    returning * into v_row;
  if not found then
    select * into v_row from public.study_sessions where user_id = auth.uid() and ended_at is null;
  end if;
  return v_row;
end;
$$;

create function public.timer_resume() returns public.study_sessions
language plpgsql security definer set search_path = '' as $$
declare v_row public.study_sessions;
begin
  update public.study_sessions set running_since = now()
    where user_id = public.require_user() and ended_at is null and running_since is null
    returning * into v_row;
  if not found then
    select * into v_row from public.study_sessions where user_id = auth.uid() and ended_at is null;
  end if;
  return v_row;
end;
$$;

create function public.timer_stop() returns public.study_sessions
language plpgsql security definer set search_path = '' as $$
declare v_row public.study_sessions;
begin
  update public.study_sessions
    set accumulated_seconds = accumulated_seconds
          + case when running_since is null then 0
                 else floor(extract(epoch from (now() - running_since)))::int end,
        running_since = null,
        ended_at = now()
    where user_id = public.require_user() and ended_at is null
    returning * into v_row;
  return v_row;
end;
$$;

-- 연구 시간 공유에 동의한 주민의 '오늘' 누적 시간만 돌려준다. (순위 없음)
create function public.village_shared_study(p_village uuid, p_since timestamptz)
returns table (user_id uuid, seconds integer)
language sql stable security definer set search_path = '' as $$
  select m.user_id,
         coalesce(sum(s.accumulated_seconds
           + case when s.running_since is null then 0
                  else floor(extract(epoch from (now() - s.running_since)))::int end), 0)::int
  from public.village_members m
  join public.profiles p on p.id = m.user_id and p.share_study_time
  left join public.study_sessions s on s.user_id = m.user_id and s.started_at >= p_since
  where m.village_id = p_village and public.is_village_member(p_village)
  group by m.user_id;
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.create_village(text), public.create_invite(uuid), public.revoke_invite(uuid),
  public.preview_invite(text), public.join_village(text), public.leave_village(uuid),
  public.remove_member(uuid, uuid), public.delete_account(),
  public.heartbeat(uuid), public.go_away(uuid), public.enter_village(uuid),
  public.timer_start(uuid, text), public.timer_pause(), public.timer_resume(), public.timer_stop(),
  public.village_shared_study(uuid, timestamptz), public.require_user()
  to authenticated;

-- ───────────────────────── realtime ─────────────────────────
alter publication supabase_realtime add table
  public.research_status, public.houses, public.village_members,
  public.profiles, public.villages, public.diary_entries;
