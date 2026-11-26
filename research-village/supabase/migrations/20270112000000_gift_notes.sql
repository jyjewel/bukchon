-- 쪽지 보관함: 간식을 먹거나 3일이 지나 간식이 사라져도, 받은 한마디는 받은 사람에게 남는다.
-- 보낸 사람과 한마디는 받은 사람에게만 보인다(간식 상자와 같은 규칙).
create table public.gift_notes (
  id uuid primary key default gen_random_uuid(),
  to_user uuid not null references auth.users (id) on delete cascade,
  from_user uuid references auth.users (id) on delete set null,
  kind text not null,
  note text not null check (char_length(note) between 1 and 80),
  created_at timestamptz not null default now()
);
create index gift_notes_to on public.gift_notes (to_user, created_at desc);
alter table public.gift_notes enable row level security;
revoke all on public.gift_notes from anon, authenticated, public;
grant select, delete on public.gift_notes to authenticated;
create policy gift_notes_select on public.gift_notes for select to authenticated using (to_user = (select auth.uid()));
create policy gift_notes_delete on public.gift_notes for delete to authenticated using (to_user = (select auth.uid()));

-- 선물이 올라올 때마다(친구·산타·목표 잔치 등 어떤 경로든) 한마디가 있으면 보관함에도 적는다
create function public._keep_gift_note() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if btrim(new.note) <> '' then
    insert into public.gift_notes (to_user, from_user, kind, note, created_at) values (new.to_user, new.from_user, new.kind, left(btrim(new.note), 80), new.created_at);
  end if;
  return new;
end $$;
revoke all on function public._keep_gift_note() from public, anon, authenticated;
create trigger gifts_keep_note after insert on public.gifts for each row execute function public._keep_gift_note();

-- 지금 간식 상자에 남아 있는 한마디도 옮겨 둔다
insert into public.gift_notes (to_user, from_user, kind, note, created_at)
select to_user, from_user, kind, left(btrim(note), 80), created_at from public.gifts where btrim(note) <> '';
