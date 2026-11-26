-- 편지 서랍: 운영자가 마을 모두에게 보내는 편지(설날 설빔 소식 등)를 모아 둔다.
-- 읽기만 가능하고, 새 편지는 운영자가 서버에서 직접 올린다.
create table public.mail_letters (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  icon text not null default '✉' check (char_length(icon) between 1 and 8),
  created_at timestamptz not null default now()
);
alter table public.mail_letters enable row level security;
revoke all on public.mail_letters from anon, authenticated, public;
grant select on public.mail_letters to authenticated;
create policy mail_letters_select on public.mail_letters for select to authenticated using (true);

-- 산타 쪽지('🎅 산타가 두고 갔어요')는 쪽지 보관함이 아니라 편지 서랍의 산타 카드가 맡는다
create or replace function public._keep_gift_note() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if btrim(new.note) <> '' and new.note not like '🎅%' then
    insert into public.gift_notes (to_user, from_user, kind, note, created_at) values (new.to_user, new.from_user, new.kind, left(btrim(new.note), 80), new.created_at);
  end if;
  return new;
end $$;
delete from public.gift_notes where note like '🎅%';
