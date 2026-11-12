-- 연구실 방문: 화이트보드(고민 + 댓글), 포스트잇, 책장(연구 성과, RISS 링크), 알림

create table public.whiteboard_items (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null,
  owner_id uuid not null default auth.uid(),
  body text not null check (char_length(btrim(body)) between 1 and 500),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (village_id, owner_id) references public.village_members (village_id, user_id) on delete cascade
);
create index whiteboard_items_owner on public.whiteboard_items (village_id, owner_id, created_at desc);

create table public.whiteboard_comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.whiteboard_items (id) on delete cascade,
  village_id uuid not null,
  author_id uuid not null default auth.uid(),
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now(),
  foreign key (village_id, author_id) references public.village_members (village_id, user_id) on delete cascade
);
create index whiteboard_comments_item on public.whiteboard_comments (item_id, created_at);

-- 포스트잇: owner_id 는 붙여진 연구실의 주인
create table public.postits (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null,
  owner_id uuid not null,
  author_id uuid not null default auth.uid(),
  body text not null check (char_length(btrim(body)) between 1 and 140),
  color text not null default '#ffe58a' check (color in ('#ffe58a', '#ffb3c8', '#a9e5a0', '#a9d8f5', '#d8c0f5', '#ffc9a0')),
  created_at timestamptz not null default now(),
  foreign key (village_id, owner_id) references public.village_members (village_id, user_id) on delete cascade,
  foreign key (village_id, author_id) references public.village_members (village_id, user_id) on delete cascade
);
create index postits_owner on public.postits (village_id, owner_id, created_at desc);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null,
  owner_id uuid not null default auth.uid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  kind text not null default 'article' check (kind in ('article', 'book', 'thesis', 'presentation', 'other')),
  year smallint check (year between 1900 and 2100),
  link_url text not null default '' check (link_url = '' or (link_url ~* '^https?://' and char_length(link_url) <= 600)),
  created_at timestamptz not null default now(),
  foreign key (village_id, owner_id) references public.village_members (village_id, user_id) on delete cascade
);
create index achievements_owner on public.achievements (village_id, owner_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  village_id uuid not null references public.villages (id) on delete cascade,
  actor_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('postit', 'comment')),
  room_owner_id uuid not null,
  summary text not null default '',
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user on public.notifications (user_id, created_at desc);

-- Supabase 가 새 테이블에 자동으로 주는 권한을 모두 회수하고, 아래에서 필요한 것만 다시 준다.
revoke all on public.whiteboard_items, public.whiteboard_comments, public.postits, public.achievements, public.notifications from anon, authenticated, public;

-- ───────────── helper functions ─────────────
create function public.is_user_in_village(p_village uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.village_members where village_id = p_village and user_id = p_user);
$$;
create function public.is_item_owner(p_item uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.whiteboard_items where id = p_item and owner_id = (select auth.uid()));
$$;
create function public.item_in_village(p_item uuid, p_village uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.whiteboard_items where id = p_item and village_id = p_village);
$$;
grant execute on function public.is_user_in_village(uuid, uuid), public.is_item_owner(uuid), public.item_in_village(uuid, uuid) to authenticated;
revoke execute on function public.is_user_in_village(uuid, uuid), public.is_item_owner(uuid), public.item_in_village(uuid, uuid) from public, anon;

-- ───────────── 알림 생성 (서버 쪽에서만) ─────────────
create function public.notify_postit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.owner_id <> new.author_id then
    insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
    values (new.owner_id, new.village_id, new.author_id, 'postit', new.owner_id, left(new.body, 60));
  end if;
  return new;
end;
$$;
create trigger postits_notify after insert on public.postits for each row execute function public.notify_postit();

-- 댓글: 화이트보드 주인과, 같은 글에 먼저 댓글을 단 사람들에게 알린다.
create function public.notify_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from public.whiteboard_items where id = new.item_id;
  insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
  select distinct u, new.village_id, new.author_id, 'comment', v_owner, left(new.body, 60)
  from (
    select v_owner as u
    union
    select author_id from public.whiteboard_comments where item_id = new.item_id
  ) t
  where u <> new.author_id and public.is_user_in_village(new.village_id, u);
  return new;
end;
$$;
create trigger comments_notify after insert on public.whiteboard_comments for each row execute function public.notify_comment();

-- ───────────── 권한과 RLS ─────────────
grant select, insert, delete on public.whiteboard_items, public.whiteboard_comments, public.postits, public.achievements to authenticated;
grant update (body, resolved) on public.whiteboard_items to authenticated;
grant update (title, kind, year, link_url) on public.achievements to authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

alter table public.whiteboard_items enable row level security;
alter table public.whiteboard_comments enable row level security;
alter table public.postits enable row level security;
alter table public.achievements enable row level security;
alter table public.notifications enable row level security;

create policy wb_select on public.whiteboard_items for select to authenticated using (public.is_village_member(village_id));
create policy wb_insert on public.whiteboard_items for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.is_village_member(village_id));
create policy wb_update on public.whiteboard_items for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy wb_delete on public.whiteboard_items for delete to authenticated using (owner_id = (select auth.uid()));

create policy wbc_select on public.whiteboard_comments for select to authenticated using (public.is_village_member(village_id));
create policy wbc_insert on public.whiteboard_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_village_member(village_id) and public.item_in_village(item_id, village_id));
create policy wbc_delete on public.whiteboard_comments for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_item_owner(item_id));

create policy postits_select on public.postits for select to authenticated using (public.is_village_member(village_id));
create policy postits_insert on public.postits for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_village_member(village_id) and public.is_user_in_village(village_id, owner_id));
create policy postits_delete on public.postits for delete to authenticated
  using (author_id = (select auth.uid()) or owner_id = (select auth.uid()));

create policy ach_select on public.achievements for select to authenticated using (public.is_village_member(village_id));
create policy ach_insert on public.achievements for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.is_village_member(village_id));
create policy ach_update on public.achievements for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy ach_delete on public.achievements for delete to authenticated using (owner_id = (select auth.uid()));

create policy notif_select on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notif_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notif_delete on public.notifications for delete to authenticated using (user_id = (select auth.uid()));

alter publication supabase_realtime add table
  public.whiteboard_items, public.whiteboard_comments, public.postits, public.achievements, public.notifications;

revoke execute on function public.notify_postit(), public.notify_comment() from public, anon, authenticated;
