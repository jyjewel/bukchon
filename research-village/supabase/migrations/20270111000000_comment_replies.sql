-- 일지·화이트보드 댓글에 대댓글(한 단계). 알림은 원래 댓글 흐름에 참여한 사람들에게 이미 가는 규칙을 그대로 따른다.
alter table public.whiteboard_comments add column reply_to uuid references public.whiteboard_comments (id) on delete cascade;
alter table public.journal_comments add column reply_to uuid references public.journal_comments (id) on delete cascade;
create index whiteboard_comments_reply on public.whiteboard_comments (reply_to) where reply_to is not null;
create index journal_comments_reply on public.journal_comments (reply_to) where reply_to is not null;

create function public._wb_comment_reply_check() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p record;
begin
  if new.reply_to is not null then
    select item_id, reply_to into p from public.whiteboard_comments where id = new.reply_to;
    if not found or p.item_id <> new.item_id or p.reply_to is not null then raise exception 'invalid_reply'; end if;
  end if;
  return new;
end $$;
create function public._journal_comment_reply_check() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p record;
begin
  if new.reply_to is not null then
    select owner_id, log_date, reply_to into p from public.journal_comments where id = new.reply_to;
    if not found or p.owner_id <> new.owner_id or p.log_date <> new.log_date or p.reply_to is not null then raise exception 'invalid_reply'; end if;
  end if;
  return new;
end $$;
revoke all on function public._wb_comment_reply_check(), public._journal_comment_reply_check() from public, anon, authenticated;
create trigger wbc_reply_check before insert on public.whiteboard_comments for each row execute function public._wb_comment_reply_check();
create trigger jc_reply_check before insert on public.journal_comments for each row execute function public._journal_comment_reply_check();
