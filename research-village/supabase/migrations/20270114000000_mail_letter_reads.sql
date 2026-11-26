-- 부엉이가 가져다 준 운영자 편지: 사람마다 어떤 편지를 읽었는지 기억해, 안 읽은 편지가 있을 때만 부엉이가 날아온다.
create table public.mail_letter_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  letter_id uuid not null references public.mail_letters (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, letter_id)
);
alter table public.mail_letter_reads enable row level security;
revoke all on public.mail_letter_reads from anon, authenticated, public;
grant select, insert on public.mail_letter_reads to authenticated;
create policy mlr_select on public.mail_letter_reads for select to authenticated using (user_id = (select auth.uid()));
create policy mlr_insert on public.mail_letter_reads for insert to authenticated with check (user_id = (select auth.uid()));
