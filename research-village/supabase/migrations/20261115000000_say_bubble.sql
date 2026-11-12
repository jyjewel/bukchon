-- 머리 위 말풍선(한마디). 30자까지, 올린 시각을 함께 저장해 화면에서는 12시간 뒤 자동으로 사라진다.
alter table public.research_status
  add column message text not null default '' check (char_length(message) <= 30),
  add column message_at timestamptz;

create function public.touch_message() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.message := btrim(new.message);
  new.message_at := case when new.message = '' then null else now() end;
  return new;
end;
$$;
create trigger research_status_message before update of message on public.research_status
  for each row execute function public.touch_message();
revoke execute on function public.touch_message() from public, anon, authenticated;

grant update (message) on public.research_status to authenticated;
