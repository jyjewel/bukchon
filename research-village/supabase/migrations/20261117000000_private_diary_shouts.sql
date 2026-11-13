-- 1) 다이어리는 이제 본인만 볼 수 있다. 예전에 마을·선택 공개로 쓴 글도 모두 '나만 보기'로 바꾼다.
update public.diary_entries set visibility = 'private' where visibility <> 'private';
alter table public.diary_entries alter column visibility set default 'private';

drop policy diary_select on public.diary_entries;
create policy diary_select on public.diary_entries for select to authenticated
  using (author_id = (select auth.uid()));

drop policy diary_insert on public.diary_entries;
create policy diary_insert on public.diary_entries for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_village_member(village_id) and visibility = 'private');

drop policy diary_update on public.diary_entries;
create policy diary_update on public.diary_entries for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()) and visibility = 'private');

-- 2) 광장 외침: 마을 전체 채팅방. 광장에 나와 있는('휴식 중') 주민만 외칠 수 있고, 마을 주민은 모두 읽는다.
create function public.is_in_plaza(p_village uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.research_status s
                 where s.village_id = p_village and s.user_id = (select auth.uid()) and s.status = 'rest'
                   and s.left_at is null and s.last_seen_at > now() - interval '150 seconds');
$$;
revoke execute on function public.is_in_plaza(uuid) from public, anon;
grant execute on function public.is_in_plaza(uuid) to authenticated;

create table public.shouts (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references public.villages (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null default auth.uid(),
  body text not null check (char_length(btrim(body)) between 1 and 100),
  created_at timestamptz not null default now()
);
create index shouts_village on public.shouts (village_id, created_at desc);

revoke all on public.shouts from anon, authenticated, public;
grant select, delete on public.shouts to authenticated;
grant insert (village_id, author_id, body) on public.shouts to authenticated;

alter table public.shouts enable row level security;
create policy shouts_select on public.shouts for select to authenticated using (public.is_village_member(village_id));
create policy shouts_insert on public.shouts for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_village_member(village_id) and public.is_in_plaza(village_id));
create policy shouts_delete on public.shouts for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_village_admin(village_id));

alter publication supabase_realtime add table public.shouts;
