-- 건네기 선물에 맥주 추가
alter table public.gifts drop constraint gifts_kind_check;
alter table public.gifts add constraint gifts_kind_check check (kind in ('coffee', 'americano', 'snack', 'tea', 'beer'));
