-- 이웃끼리 주고받는 상호작용: 논문 던지기(장난), 커피·간식 선물, 책 추천, 일지 반응·댓글, 마감 응원, 마감 독촉

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'postit', 'comment', 'chat_request', 'meeting',
  'gesture', 'gift', 'book_tip', 'journal_reaction', 'journal_comment', 'cheer', 'nudge'));

-- 같은 마을 사람인지 확인하고, 그 마을에서 알림을 만들어 주는 내부 함수
create function public._notify(p_village uuid, p_to uuid, p_kind text, p_summary text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
    values (p_to, p_village, v_uid, p_kind, p_to, left(coalesce(p_summary, ''), 120));
end;
$$;
revoke execute on function public._notify(uuid, uuid, text, text) from public, anon, authenticated;

create function public._same_village(p_village uuid, p_target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user();
begin
  if p_target = v_uid then raise exception 'invalid_target'; end if;
  if not (public.is_user_in_village(p_village, v_uid) and public.is_user_in_village(p_village, p_target)) then
    raise exception 'not_member';
  end if;
end;
$$;
revoke execute on function public._same_village(uuid, uuid) from public, anon, authenticated;

-- ───────────── 1. 장난: 논문 던지기 ─────────────
create function public.send_gesture(p_village uuid, p_target uuid, p_kind text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._same_village(p_village, p_target);
  if p_kind not in ('thesis', 'footnote', 'redpen', 'alarm') then raise exception 'invalid_kind'; end if;
  perform public._notify(p_village, p_target, 'gesture', p_kind);
end;
$$;

-- ───────────── 2. 커피·간식 선물 (받은 사람 책상에 하루 동안 올라간다) ─────────────
create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('coffee', 'americano', 'snack', 'tea')),
  note text not null default '' check (char_length(note) <= 40),
  created_at timestamptz not null default now()
);
create index gifts_to on public.gifts (to_user, created_at desc);

create function public.send_gift(p_village uuid, p_target uuid, p_kind text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._same_village(p_village, p_target);
  insert into public.gifts (from_user, to_user, kind, note) values ((select auth.uid()), p_target, p_kind, left(btrim(coalesce(p_note, '')), 40));
  perform public._notify(p_village, p_target, 'gift', p_kind || ':' || left(btrim(coalesce(p_note, '')), 40));
end;
$$;

-- ───────────── 3. 책 추천 (받은 사람 책장에 꽂힌다) ─────────────
create table public.book_tips (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  note text not null default '' check (char_length(note) <= 100),
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);
create index book_tips_to on public.book_tips (to_user, created_at desc);

create function public.send_book_tip(p_village uuid, p_target uuid, p_title text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._same_village(p_village, p_target);
  insert into public.book_tips (from_user, to_user, title, note) values ((select auth.uid()), p_target, btrim(p_title), left(btrim(coalesce(p_note, '')), 100));
  perform public._notify(p_village, p_target, 'book_tip', left(btrim(p_title), 80));
end;
$$;

-- ───────────── 4. 공개 일지의 반응과 댓글 ─────────────
create function public.can_read_log(p_owner uuid, p_date date) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.daily_logs l
                 where l.user_id = p_owner and l.log_date = p_date
                   and (l.user_id = (select auth.uid()) or public.can_read_shared_log(l.user_id, l.shared_villages)));
$$;
grant execute on function public.can_read_log(uuid, date) to authenticated;
revoke execute on function public.can_read_log(uuid, date) from public, anon;

create table public.journal_reactions (
  owner_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  emoji text not null check (emoji in ('coffee', 'clap', 'book', 'heart')),
  created_at timestamptz not null default now(),
  primary key (owner_id, log_date, user_id, emoji)
);
create table public.journal_comments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index journal_comments_log on public.journal_comments (owner_id, log_date, created_at);

create function public.notify_journal_reaction() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_village uuid := public.common_village(new.owner_id, new.user_id);
begin
  if new.owner_id <> new.user_id and v_village is not null then
    insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
      values (new.owner_id, v_village, new.user_id, 'journal_reaction', new.owner_id, new.emoji || ':' || new.log_date::text);
  end if;
  return new;
end;
$$;
create function public.notify_journal_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
  select t.u, public.common_village(t.u, new.author_id), new.author_id, 'journal_comment', new.owner_id, left(new.body, 60)
  from (select new.owner_id as u union select author_id from public.journal_comments where owner_id = new.owner_id and log_date = new.log_date) t
  where t.u <> new.author_id and public.common_village(t.u, new.author_id) is not null;
  return new;
end;
$$;
revoke execute on function public.notify_journal_reaction(), public.notify_journal_comment() from public, anon, authenticated;
create trigger journal_reactions_notify after insert on public.journal_reactions for each row execute function public.notify_journal_reaction();
create trigger journal_comments_notify after insert on public.journal_comments for each row execute function public.notify_journal_comment();

-- ───────────── 5. 마감 공개와 응원 ─────────────
alter table public.deadlines add column shared boolean not null default false;
grant insert (shared), update (shared) on public.deadlines to authenticated;
create policy deadlines_shared on public.deadlines for select to authenticated
  using (shared and public.shares_village_with(user_id));

create table public.cheers (
  id uuid primary key default gen_random_uuid(),
  deadline_id uuid not null references public.deadlines (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  from_user uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (deadline_id, from_user)
);
create function public.cheer_deadline(p_deadline uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user(); d public.deadlines; v_village uuid; v_new uuid;
begin
  select * into d from public.deadlines where id = p_deadline and shared and not done;
  if not found or d.user_id = v_uid then raise exception 'not_found'; end if;
  v_village := public.common_village(d.user_id, v_uid);
  if v_village is null then raise exception 'not_member'; end if;
  insert into public.cheers (deadline_id, to_user, from_user) values (p_deadline, d.user_id, v_uid)
    on conflict (deadline_id, from_user) do nothing returning id into v_new;
  if v_new is not null then perform public._notify(v_village, d.user_id, 'cheer', d.title); end if;
end;
$$;

-- ───────────── 6. 마감 독촉: 3일 넘게 안 들어온 이웃에게 ─────────────
create function public.send_nudge(p_village uuid, p_target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user(); v_summary text := '';
begin
  perform public._same_village(p_village, p_target);
  if not exists (select 1 from public.research_status s where s.village_id = p_village and s.user_id = p_target
                 and (s.left_at is not null or s.last_seen_at < now() - interval '3 days')
                 and coalesce(s.left_at, s.last_seen_at) < now() - interval '3 days') then
    raise exception 'not_away';
  end if;
  if exists (select 1 from public.notifications n where n.actor_id = v_uid and n.user_id = p_target and n.kind = 'nudge' and n.created_at > now() - interval '12 hours') then
    raise exception 'too_often';
  end if;
  select title || '|' || due_date::text into v_summary from public.deadlines
    where user_id = p_target and shared and not done and due_date >= current_date order by due_date limit 1;
  perform public._notify(p_village, p_target, 'nudge', coalesce(v_summary, ''));
end;
$$;

-- ───────────── 권한과 RLS ─────────────
revoke all on public.gifts, public.book_tips, public.journal_reactions, public.journal_comments, public.cheers from anon, authenticated, public;
grant select on public.gifts, public.cheers to authenticated;
grant select, delete on public.book_tips to authenticated;
grant select, insert, delete on public.journal_reactions, public.journal_comments to authenticated;
grant delete on public.cheers to authenticated;
grant delete on public.gifts to authenticated;
alter table public.gifts enable row level security;
alter table public.book_tips enable row level security;
alter table public.journal_reactions enable row level security;
alter table public.journal_comments enable row level security;
alter table public.cheers enable row level security;

create policy gifts_select on public.gifts for select to authenticated using (to_user = (select auth.uid()) or from_user = (select auth.uid()) or public.shares_village_with(to_user));
create policy gifts_delete on public.gifts for delete to authenticated using (to_user = (select auth.uid()));
create policy tips_select on public.book_tips for select to authenticated using (to_user = (select auth.uid()) or from_user = (select auth.uid()) or public.shares_village_with(to_user));
create policy tips_delete on public.book_tips for delete to authenticated using (to_user = (select auth.uid()) or from_user = (select auth.uid()));
create policy jr_select on public.journal_reactions for select to authenticated using (public.can_read_log(owner_id, log_date));
create policy jr_insert on public.journal_reactions for insert to authenticated with check (user_id = (select auth.uid()) and public.can_read_log(owner_id, log_date));
create policy jr_delete on public.journal_reactions for delete to authenticated using (user_id = (select auth.uid()));
create policy jc_select on public.journal_comments for select to authenticated using (public.can_read_log(owner_id, log_date));
create policy jc_insert on public.journal_comments for insert to authenticated with check (author_id = (select auth.uid()) and public.can_read_log(owner_id, log_date));
create policy jc_delete on public.journal_comments for delete to authenticated using (author_id = (select auth.uid()) or owner_id = (select auth.uid()));
create policy cheers_select on public.cheers for select to authenticated using (to_user = (select auth.uid()) or from_user = (select auth.uid()) or public.shares_village_with(to_user));
create policy cheers_delete on public.cheers for delete to authenticated using (from_user = (select auth.uid()));

grant execute on function public.send_gesture(uuid, uuid, text), public.send_gift(uuid, uuid, text, text),
  public.send_book_tip(uuid, uuid, text, text), public.cheer_deadline(uuid), public.send_nudge(uuid, uuid) to authenticated;
revoke execute on function public.send_gesture(uuid, uuid, text), public.send_gift(uuid, uuid, text, text),
  public.send_book_tip(uuid, uuid, text, text), public.cheer_deadline(uuid), public.send_nudge(uuid, uuid) from public, anon;

alter publication supabase_realtime add table public.gifts, public.book_tips, public.journal_reactions, public.journal_comments, public.cheers;
