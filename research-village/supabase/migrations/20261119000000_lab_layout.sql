-- 내 연구실 위젯의 순서와 접힘 상태 (본인 설정). 예: {"order":["todos","deadlines"],"collapsed":["diary"]}
alter table public.profiles
  add column lab_layout jsonb not null default '{}'::jsonb
  check (jsonb_typeof(lab_layout) = 'object' and octet_length(lab_layout::text) <= 1000);
grant update (lab_layout) on public.profiles to authenticated;
