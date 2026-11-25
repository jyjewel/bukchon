-- 연구실 이름: 비워 두면 "{이름}의 연구실"로 보이고, 정하면 그 이름이 연구실 제목과 지도 간판에 보인다
alter table public.profiles add column lab_name text not null default '' check (char_length(lab_name) <= 20);
grant update (lab_name) on public.profiles to authenticated;
