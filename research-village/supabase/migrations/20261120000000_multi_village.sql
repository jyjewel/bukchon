-- 한 계정으로 여러 마을에 살 수 있게 한다.
--  · 마을마다 따로: 집, 연구 상태·말풍선, 대화, 도서관, 광장 외침·소식
--  · 마을과 상관없이 하나: 프로필, 연구실 안(화이트보드·포스트잇·책장), 다이어리, 일지·연구노트·할 일·마감 일정
--    연구실 안은 '나와 같은 마을에 사는 사람'이면 어느 마을에서든 볼 수 있다.

-- ───────────── 1. 마을 만들기·입주 (이미 다른 마을에 있어도 된다. 한 계정 최대 5개 마을) ─────────────
create or replace function public.create_village(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
  v_id uuid;
begin
  if (select count(*) from public.village_members where user_id = v_uid) >= 5 then
    raise exception 'too_many_villages';
  end if;
  insert into public.villages (name, created_by) values (btrim(p_name), v_uid) returning id into v_id;
  insert into public.houses (village_id, slot, owner_id)
    select v_id, s, case when s = 0 then v_uid end from generate_series(0, 5) s;
  insert into public.village_members (village_id, user_id, role) values (v_id, v_uid, 'admin');
  insert into public.research_status (village_id, user_id) values (v_id, v_uid);
  return v_id;
end;
$$;

create or replace function public.join_village(p_code text) returns uuid
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
$$;

-- ───────────── 2. 헬퍼 ─────────────
-- 연구실(주인 p_owner)을 볼 수 있는가: 내 연구실이거나, 주인과 같은 마을에 사는 사람.
create function public.can_see_room(p_owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_owner = (select auth.uid()) or public.shares_village_with(p_owner);
$$;
create function public.can_see_item(p_item uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.whiteboard_items i where i.id = p_item and public.can_see_room(i.owner_id));
$$;
-- 두 사람이 함께 사는 마을 하나 (알림이 열릴 마을). 없으면 null.
create function public.common_village(p_a uuid, p_b uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select a.village_id from public.village_members a
    join public.village_members b on a.village_id = b.village_id
    where a.user_id = p_a and b.user_id = p_b
    order by a.joined_at limit 1;
$$;
grant execute on function public.can_see_room(uuid), public.can_see_item(uuid) to authenticated;
revoke execute on function public.can_see_room(uuid), public.can_see_item(uuid), public.common_village(uuid, uuid) from public, anon;
revoke execute on function public.common_village(uuid, uuid) from authenticated;

-- ───────────── 3. 연구실 안(화이트보드·댓글·포스트잇·책장)은 마을에서 분리 ─────────────
drop policy wb_select on public.whiteboard_items;
drop policy wb_insert on public.whiteboard_items;
drop policy wbc_select on public.whiteboard_comments;
drop policy wbc_insert on public.whiteboard_comments;
drop policy wbc_delete on public.whiteboard_comments;
drop policy postits_select on public.postits;
drop policy postits_insert on public.postits;
drop policy ach_select on public.achievements;
drop policy ach_insert on public.achievements;

alter table public.whiteboard_items drop column village_id;
alter table public.whiteboard_comments drop column village_id;
alter table public.postits drop column village_id;
alter table public.achievements drop column village_id;
drop function public.item_in_village(uuid, uuid);

alter table public.whiteboard_items
  add foreign key (owner_id) references auth.users (id) on delete cascade;
alter table public.whiteboard_comments
  add foreign key (author_id) references auth.users (id) on delete cascade;
alter table public.postits
  add foreign key (owner_id) references auth.users (id) on delete cascade,
  add foreign key (author_id) references auth.users (id) on delete cascade;
alter table public.achievements
  add foreign key (owner_id) references auth.users (id) on delete cascade;
create index whiteboard_items_owner_idx on public.whiteboard_items (owner_id, created_at desc);
create index postits_owner_idx on public.postits (owner_id, created_at desc);
create index achievements_owner_idx on public.achievements (owner_id, created_at desc);

create policy wb_select on public.whiteboard_items for select to authenticated using (public.can_see_room(owner_id));
create policy wb_insert on public.whiteboard_items for insert to authenticated with check (owner_id = (select auth.uid()));
create policy wbc_select on public.whiteboard_comments for select to authenticated using (public.can_see_item(item_id));
create policy wbc_insert on public.whiteboard_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and public.can_see_item(item_id));
create policy wbc_delete on public.whiteboard_comments for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_item_owner(item_id));
create policy postits_select on public.postits for select to authenticated using (public.can_see_room(owner_id));
create policy postits_insert on public.postits for insert to authenticated
  with check (author_id = (select auth.uid()) and public.can_see_room(owner_id));
create policy ach_select on public.achievements for select to authenticated using (public.can_see_room(owner_id));
create policy ach_insert on public.achievements for insert to authenticated with check (owner_id = (select auth.uid()));

-- 알림은 두 사람이 함께 사는 마을에서 열린다. (함께 사는 마을이 없으면 알리지 않는다.)
create or replace function public.notify_postit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_village uuid := public.common_village(new.owner_id, new.author_id);
begin
  if new.owner_id <> new.author_id and v_village is not null then
    insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
    values (new.owner_id, v_village, new.author_id, 'postit', new.owner_id, left(new.body, 60));
  end if;
  return new;
end;
$$;
create or replace function public.notify_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from public.whiteboard_items where id = new.item_id;
  insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
  select t.u, public.common_village(t.u, new.author_id), new.author_id, 'comment', v_owner, left(new.body, 60)
  from (
    select v_owner as u
    union
    select author_id from public.whiteboard_comments where item_id = new.item_id
  ) t
  where t.u <> new.author_id and public.common_village(t.u, new.author_id) is not null;
  return new;
end;
$$;

-- ───────────── 4. 다이어리도 마을에서 분리 (본인만 보는 기록이라 마을을 떠나도 그대로 남는다) ─────────────
drop policy diary_select on public.diary_entries;
drop policy diary_insert on public.diary_entries;
drop policy diary_update on public.diary_entries;
drop policy diary_delete on public.diary_entries;
drop table public.entry_permissions;
drop function public.has_entry_permission(uuid);
drop function public.can_grant_entry(uuid, uuid);
drop function public.is_entry_author(uuid);
alter table public.diary_entries drop column village_id;
alter table public.diary_entries add foreign key (author_id) references auth.users (id) on delete cascade;
create index diary_entries_author_idx on public.diary_entries (author_id, created_at desc);

create policy diary_select on public.diary_entries for select to authenticated using (author_id = (select auth.uid()));
create policy diary_insert on public.diary_entries for insert to authenticated
  with check (author_id = (select auth.uid()) and visibility = 'private');
create policy diary_update on public.diary_entries for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()) and visibility = 'private');
create policy diary_delete on public.diary_entries for delete to authenticated using (author_id = (select auth.uid()));
