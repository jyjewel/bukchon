-- 기록 보호(글 이력·삭제 복구·동시 수정 감지)와 오늘의 일지 마을 공개

-- ───────────── 1. 글 이력 (서버가 자동으로 남기며, 사용자는 읽기만 한다) ─────────────
create table public.revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('journal', 'note', 'diary')),
  item_key text not null,                         -- 일지: 날짜(YYYY-MM-DD), 노트·다이어리: 글 id
  title text not null default '',
  category text not null default '',
  body text not null default '',
  extra jsonb not null default '{}'::jsonb,       -- 다이어리 종류·링크, 일지 공개 마을 등
  reason text not null default 'edit' check (reason in ('edit', 'delete')),
  created_at timestamptz not null default now()
);
create index revisions_item on public.revisions (user_id, kind, item_key, created_at desc);
create index revisions_user_time on public.revisions (user_id, created_at desc);
revoke all on public.revisions from anon, authenticated, public;
grant select on public.revisions to authenticated;
alter table public.revisions enable row level security;
create policy revisions_own on public.revisions for select to authenticated using (user_id = (select auth.uid()));

-- ───────────── 2. 수정 번호(rev): 두 기기·탭에서 동시에 고칠 때 한쪽이 조용히 덮어쓰지 못하게 ─────────────
alter table public.daily_logs add column rev integer not null default 1;
alter table public.research_notes add column rev integer not null default 1;
alter table public.diary_entries add column rev integer not null default 1;

-- 고치거나 지울 때마다 이전 내용을 이력에 남긴다.
--  · 고칠 때: 마지막 이력이 5분보다 오래됐거나, 글이 크게(30% 넘게) 줄었을 때
--  · 지울 때: 항상
create function public.keep_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_kind text; v_key text; v_user uuid; v_title text := ''; v_cat text := ''; v_extra jsonb := '{}'::jsonb;
  v_changed boolean;
begin
  if tg_table_name = 'daily_logs' then
    v_kind := 'journal'; v_key := old.log_date::text; v_user := old.user_id;
    v_extra := jsonb_build_object('shared_villages', old.shared_villages);
  elsif tg_table_name = 'research_notes' then
    v_kind := 'note'; v_key := old.id::text; v_user := old.user_id; v_title := old.title; v_cat := old.category;
  else
    v_kind := 'diary'; v_key := old.id::text; v_user := old.author_id; v_title := old.title;
    v_extra := jsonb_build_object('kind', old.kind, 'link_url', old.link_url);
  end if;

  if tg_op = 'DELETE' then
    if old.body <> '' or v_title <> '' then
      insert into public.revisions (user_id, kind, item_key, title, category, body, extra, reason)
        values (v_user, v_kind, v_key, v_title, v_cat, old.body, v_extra, 'delete');
    end if;
    return old;
  end if;

  new.rev := old.rev + 1;
  v_changed := old.body is distinct from new.body
    or (to_jsonb(old) ->> 'title') is distinct from (to_jsonb(new) ->> 'title');
  if v_changed and (old.body <> '' or v_title <> '') then
    if char_length(new.body) < char_length(old.body) * 0.7
       or not exists (select 1 from public.revisions r
                      where r.user_id = v_user and r.kind = v_kind and r.item_key = v_key
                        and r.created_at > now() - interval '5 minutes') then
      insert into public.revisions (user_id, kind, item_key, title, category, body, extra, reason)
        values (v_user, v_kind, v_key, v_title, v_cat, old.body, v_extra, 'edit');
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.keep_revision() from public, anon, authenticated;
create trigger daily_logs_keep before update or delete on public.daily_logs for each row execute function public.keep_revision();
create trigger research_notes_keep before update or delete on public.research_notes for each row execute function public.keep_revision();
create trigger diary_entries_keep before update or delete on public.diary_entries for each row execute function public.keep_revision();

-- ───────────── 3. 오늘의 일지 공개: 어느 마을 주민에게 보일지 (비어 있으면 나만 보기) ─────────────
alter table public.daily_logs add column shared_villages uuid[] not null default '{}'
  check (cardinality(shared_villages) <= 5);

create function public.can_read_shared_log(p_owner uuid, p_villages uuid[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.village_members me
    join public.village_members o on o.village_id = me.village_id
    where me.user_id = (select auth.uid()) and o.user_id = p_owner and me.village_id = any (p_villages));
$$;
grant execute on function public.can_read_shared_log(uuid, uuid[]) to authenticated;
revoke execute on function public.can_read_shared_log(uuid, uuid[]) from public, anon;

-- 내가 사는 마을만 고를 수 있다
create function public.validate_log_shares() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from unnest(new.shared_villages) v
             where not exists (select 1 from public.village_members m where m.user_id = new.user_id and m.village_id = v)) then
    raise exception 'not_member';
  end if;
  return new;
end;
$$;
revoke execute on function public.validate_log_shares() from public, anon, authenticated;
create trigger daily_logs_shares before insert or update of shared_villages on public.daily_logs for each row execute function public.validate_log_shares();

drop policy logs_all on public.daily_logs;
create policy logs_select on public.daily_logs for select to authenticated
  using (user_id = (select auth.uid()) or public.can_read_shared_log(user_id, shared_villages));
create policy logs_insert on public.daily_logs for insert to authenticated with check (user_id = (select auth.uid()));
create policy logs_update on public.daily_logs for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy logs_delete on public.daily_logs for delete to authenticated using (user_id = (select auth.uid()));
grant insert (shared_villages), update (shared_villages) on public.daily_logs to authenticated;

-- ───────────── 4. 덮어쓰기 직전에 양쪽 글을 모두 이력에 남기기 위한 함수 ─────────────
-- (동시 수정 충돌을 풀 때 어느 쪽을 고르든 다른 쪽 글이 사라지지 않게 한다.)
create function public.snapshot_item(p_kind text, p_key text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user();
begin
  if p_kind = 'journal' then
    insert into public.revisions (user_id, kind, item_key, body, extra)
      select user_id, 'journal', log_date::text, body, jsonb_build_object('shared_villages', shared_villages)
      from public.daily_logs where user_id = v_uid and log_date = p_key::date;
  elsif p_kind = 'note' then
    insert into public.revisions (user_id, kind, item_key, title, category, body)
      select user_id, 'note', id::text, title, category, body from public.research_notes where user_id = v_uid and id = p_key::uuid;
  elsif p_kind = 'diary' then
    insert into public.revisions (user_id, kind, item_key, title, body, extra)
      select author_id, 'diary', id::text, title, body, jsonb_build_object('kind', kind, 'link_url', link_url)
      from public.diary_entries where author_id = v_uid and id = p_key::uuid;
  else
    raise exception 'invalid_kind';
  end if;
end;
$$;

create function public.snapshot_text(p_kind text, p_key text, p_title text, p_category text, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user();
begin
  if p_kind not in ('journal', 'note', 'diary') then raise exception 'invalid_kind'; end if;
  if char_length(coalesce(p_body, '')) > 20000 or char_length(coalesce(p_title, '')) > 100 or char_length(coalesce(p_category, '')) > 30 then
    raise exception 'too_long';
  end if;
  insert into public.revisions (user_id, kind, item_key, title, category, body)
    values (v_uid, p_kind, left(p_key, 60), coalesce(p_title, ''), coalesce(p_category, ''), coalesce(p_body, ''));
end;
$$;
grant execute on function public.snapshot_item(text, text), public.snapshot_text(text, text, text, text, text) to authenticated;
revoke execute on function public.snapshot_item(text, text), public.snapshot_text(text, text, text, text, text) from public, anon;
