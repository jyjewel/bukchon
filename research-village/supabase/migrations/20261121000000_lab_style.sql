-- 연구실 안쪽 꾸미기(벽지·바닥·러그·창밖 풍경·반려동물·소품). 연구실은 마을과 상관없이 하나라서 프로필에 저장한다.
-- 예: {"wall":"#e4f4e1","pattern":"dots","floor":"tile","accent":"#5f8fd6","rug":"square","view":"rain","pet":"dog","extras":["plant","globe"]}
alter table public.profiles
  add column lab_style jsonb not null default '{}'::jsonb
  check (jsonb_typeof(lab_style) = 'object' and octet_length(lab_style::text) <= 600);
grant update (lab_style) on public.profiles to authenticated;
