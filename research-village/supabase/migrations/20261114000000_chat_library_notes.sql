-- 연구 타이머 제거 / 일지·연구노트 / 1:1 실시간 대화 / 도서관(공동 집필·Zoom 회의)

-- ───────────── 1. 연구 타이머 제거 ─────────────
-- (study_sessions · study_notes 테이블의 기존 데이터는 지우지 않고 그대로 둔다. 앱에서는 더 이상 쓰지 않는다.)
drop function if exists public.timer_start(uuid, text);
drop function if exists public.timer_pause();
drop function if exists public.timer_resume();
drop function if exists public.timer_stop();
drop function if exists public.village_shared_study(uuid, timestamptz);

create or replace function public.enter_village(p_village uuid) returns timestamptz
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
  -- 오래 자리를 비웠다면 '집중 연구' 같은 상태가 남아 있지 않도록 '휴식(광장)'으로 되돌린다.
  if v_last < now() - interval '150 seconds' then
    update public.research_status set status = 'rest'
      where village_id = p_village and user_id = v_uid and status <> 'offline';
  end if;
  update public.research_status set last_seen_at = now(), left_at = null
    where village_id = p_village and user_id = v_uid;
  return now();
end;
$$;

-- ───────────── 2. 오늘의 일지 · 연구노트(카테고리별) ─────────────
create table public.daily_logs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date date not null,
  body text not null default '' check (char_length(body) <= 20000),
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date)
);
create table public.research_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null default '기타' check (char_length(btrim(category)) between 1 and 30),
  title text not null default '' check (char_length(title) <= 100),
  body text not null default '' check (char_length(body) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index research_notes_user on public.research_notes (user_id, category, updated_at desc);
create trigger daily_logs_touch before update on public.daily_logs for each row execute function public.touch_updated_at();
create trigger research_notes_touch before update on public.research_notes for each row execute function public.touch_updated_at();

-- ───────────── 3. 1:1 실시간 대화 ─────────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references public.villages (id) on delete cascade,
  user_a uuid not null references auth.users (id) on delete cascade,  -- 신청한 사람
  user_b uuid not null references auth.users (id) on delete cascade,  -- 신청받은 사람
  status text not null default 'pending' check (status in ('pending', 'active', 'declined', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_sender uuid,
  read_a timestamptz not null default now(),
  read_b timestamptz not null default now(),
  check (user_a <> user_b)
);
create index conversations_a on public.conversations (user_a, updated_at desc);
create index conversations_b on public.conversations (user_b, updated_at desc);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null default auth.uid(),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index messages_conv on public.messages (conversation_id, created_at);

-- ───────────── 4. 도서관: 공동 집필 · Zoom 회의 ─────────────
create table public.books (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references public.villages (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  topic text not null default '' check (char_length(topic) <= 300),
  status text not null default 'writing' check (status in ('writing', 'finished')),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index books_village on public.books (village_id, created_at desc);
-- 집필자가 마을을 떠나도 이어 쓴 글은 남도록, 작성자만 비운다('떠난 주민').
create table public.book_entries (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  village_id uuid not null,
  author_id uuid default auth.uid(),
  heading text not null default '' check (char_length(heading) <= 100),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  foreign key (village_id, author_id) references public.village_members (village_id, user_id) on delete set null (author_id)
);
create index book_entries_book on public.book_entries (book_id, created_at);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references public.villages (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  starts_at timestamptz not null,
  zoom_url text not null check (char_length(zoom_url) <= 500 and zoom_url ~* '^https://([a-z0-9-]+\.)*(zoom\.us|zoomgov\.com)/'),
  note text not null default '' check (char_length(note) <= 200),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index meetings_village on public.meetings (village_id, starts_at desc);

-- 새 테이블에 자동으로 붙는 권한을 모두 회수하고 필요한 것만 다시 준다.
revoke all on public.daily_logs, public.research_notes, public.conversations, public.messages, public.books, public.book_entries, public.meetings
  from anon, authenticated, public;

-- ───────────── helper functions ─────────────
create function public.is_chat_member(p_conv uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversations c
                 where c.id = p_conv and (select auth.uid()) in (c.user_a, c.user_b));
$$;
create function public.is_chat_active_member(p_conv uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversations c
                 where c.id = p_conv and c.status = 'active' and (select auth.uid()) in (c.user_a, c.user_b));
$$;
create function public.book_in_village(p_book uuid, p_village uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.books where id = p_book and village_id = p_village);
$$;
create function public.book_is_open(p_book uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.books where id = p_book and status = 'writing');
$$;
create function public.is_book_creator(p_book uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.books where id = p_book and created_by = (select auth.uid()));
$$;

-- ───────────── 대화 RPC ─────────────
-- 신청은 '열린 연구'(집 앞 책상)에 나와 있는 주민에게만 할 수 있다.
create function public.request_chat(p_village uuid, p_target uuid) returns public.conversations
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
  v_row public.conversations;
begin
  if p_target = v_uid then raise exception 'invalid_target'; end if;
  if not (public.is_village_member(p_village) and public.is_user_in_village(p_village, p_target)) then
    raise exception 'not_member';
  end if;
  select * into v_row from public.conversations
    where village_id = p_village and status in ('pending', 'active')
      and ((user_a = v_uid and user_b = p_target) or (user_a = p_target and user_b = v_uid))
    limit 1;
  if found then return v_row; end if;
  if not exists (select 1 from public.research_status s
                 where s.village_id = p_village and s.user_id = p_target and s.status = 'open'
                   and s.left_at is null and s.last_seen_at > now() - interval '150 seconds') then
    raise exception 'not_available';
  end if;
  insert into public.conversations (village_id, user_a, user_b) values (p_village, v_uid, p_target) returning * into v_row;
  insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
    values (p_target, p_village, v_uid, 'chat_request', p_target, '');
  return v_row;
end;
$$;

create function public.respond_chat(p_conv uuid, p_accept boolean) returns public.conversations
language plpgsql security definer set search_path = '' as $$
declare v_row public.conversations;
begin
  update public.conversations
    set status = case when p_accept then 'active' else 'declined' end, updated_at = now()
    where id = p_conv and user_b = public.require_user() and status = 'pending'
    returning * into v_row;
  if not found then raise exception 'not_found'; end if;
  return v_row;
end;
$$;

create function public.end_chat(p_conv uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user();
begin
  update public.conversations set status = 'ended', updated_at = now()
    where id = p_conv and v_uid in (user_a, user_b) and status in ('pending', 'active');
end;
$$;

create function public.mark_chat_read(p_conv uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user();
begin
  update public.conversations
    set read_a = case when user_a = v_uid then now() else read_a end,
        read_b = case when user_b = v_uid then now() else read_b end
    where id = p_conv and v_uid in (user_a, user_b);
end;
$$;

create function public.on_message_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations
    set last_message_at = new.created_at, last_sender = new.sender_id, updated_at = new.created_at,
        read_a = case when user_a = new.sender_id then new.created_at else read_a end,
        read_b = case when user_b = new.sender_id then new.created_at else read_b end
    where id = new.conversation_id;
  return new;
end;
$$;
create trigger messages_after_insert after insert on public.messages for each row execute function public.on_message_insert();

-- ───────────── 알림 종류 확장 + Zoom 회의 알림 ─────────────
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in ('postit', 'comment', 'chat_request', 'meeting'));

create function public.notify_meeting() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
  select m.user_id, new.village_id, new.created_by, 'meeting', new.created_by, left(new.title, 60)
  from public.village_members m
  where m.village_id = new.village_id and m.user_id <> new.created_by and new.created_by is not null;
  return new;
end;
$$;
create trigger meetings_notify after insert on public.meetings for each row execute function public.notify_meeting();

-- 마을을 떠나면 그 마을의 대화도 함께 지운다. (상태·다이어리 등은 기존대로 cascade)
create or replace function public._remove_from_village(p_village uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_was_admin boolean;
begin
  select role = 'admin' into v_was_admin from public.village_members
    where village_id = p_village and user_id = p_user;
  if v_was_admin is null then
    return;
  end if;
  delete from public.conversations where village_id = p_village and p_user in (user_a, user_b);
  update public.houses set owner_id = null, style = '{}'::jsonb where village_id = p_village and owner_id = p_user;
  delete from public.village_members where village_id = p_village and user_id = p_user;
  if not exists (select 1 from public.village_members where village_id = p_village) then
    delete from public.villages where id = p_village;
  elsif v_was_admin and not exists (select 1 from public.village_members where village_id = p_village and role = 'admin') then
    update public.village_members set role = 'admin'
      where village_id = p_village
        and user_id = (select user_id from public.village_members where village_id = p_village order by joined_at limit 1);
  end if;
end;
$$;

-- ───────────── 권한 ─────────────
grant select, delete on public.daily_logs, public.research_notes to authenticated;
grant insert (user_id, log_date, body), update (user_id, log_date, body) on public.daily_logs to authenticated; -- upsert 가 충돌 키 열도 갱신하려 하므로
grant insert (user_id, category, title, body), update (category, title, body) on public.research_notes to authenticated;
grant select on public.conversations to authenticated;
grant select on public.messages to authenticated;
grant insert (conversation_id, sender_id, body) on public.messages to authenticated;
grant select, delete on public.books, public.book_entries, public.meetings to authenticated;
grant insert (village_id, title, topic, created_by) on public.books to authenticated;
grant update (title, topic, status) on public.books to authenticated;
grant insert (book_id, village_id, author_id, heading, body) on public.book_entries to authenticated;
grant update (heading, body) on public.book_entries to authenticated;
grant insert (village_id, title, starts_at, zoom_url, note, created_by) on public.meetings to authenticated;

grant execute on function public.is_chat_member(uuid), public.is_chat_active_member(uuid), public.book_in_village(uuid, uuid),
  public.book_is_open(uuid), public.is_book_creator(uuid),
  public.request_chat(uuid, uuid), public.respond_chat(uuid, boolean), public.end_chat(uuid), public.mark_chat_read(uuid)
  to authenticated;
revoke execute on function public.is_chat_member(uuid), public.is_chat_active_member(uuid), public.book_in_village(uuid, uuid),
  public.book_is_open(uuid), public.is_book_creator(uuid),
  public.request_chat(uuid, uuid), public.respond_chat(uuid, boolean), public.end_chat(uuid), public.mark_chat_read(uuid),
  public.on_message_insert(), public.notify_meeting()
  from public, anon;
revoke execute on function public.on_message_insert(), public.notify_meeting() from authenticated;

-- ───────────── RLS ─────────────
alter table public.daily_logs enable row level security;
alter table public.research_notes enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.books enable row level security;
alter table public.book_entries enable row level security;
alter table public.meetings enable row level security;

create policy logs_all on public.daily_logs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy rnotes_all on public.research_notes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy conv_select on public.conversations for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));
create policy msg_select on public.messages for select to authenticated using (public.is_chat_member(conversation_id));
create policy msg_insert on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_chat_active_member(conversation_id));

create policy books_select on public.books for select to authenticated using (public.is_village_member(village_id));
create policy books_insert on public.books for insert to authenticated
  with check (created_by = (select auth.uid()) and public.is_village_member(village_id));
create policy books_update on public.books for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy books_delete on public.books for delete to authenticated
  using (created_by = (select auth.uid()) or public.is_village_admin(village_id));

create policy bentries_select on public.book_entries for select to authenticated using (public.is_village_member(village_id));
create policy bentries_insert on public.book_entries for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_village_member(village_id)
              and public.book_in_village(book_id, village_id) and public.book_is_open(book_id));
create policy bentries_update on public.book_entries for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy bentries_delete on public.book_entries for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_book_creator(book_id));

create policy meet_select on public.meetings for select to authenticated using (public.is_village_member(village_id));
create policy meet_insert on public.meetings for insert to authenticated
  with check (created_by = (select auth.uid()) and public.is_village_member(village_id));
create policy meet_delete on public.meetings for delete to authenticated
  using (created_by = (select auth.uid()) or public.is_village_admin(village_id));

alter publication supabase_realtime add table public.conversations, public.messages, public.books, public.book_entries, public.meetings;
