-- 답글에도 답글을 달 수 있다(포스트잇 답장·일지 댓글·화이트보드 댓글). 같은 연구실/같은 글의 댓글에만 달 수 있는 규칙은 그대로.
create or replace function public._postit_reply_check() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p record;
begin
  if new.reply_to is not null then
    select owner_id into p from public.postits where id = new.reply_to;
    if not found or p.owner_id <> new.owner_id then raise exception 'invalid_reply'; end if;
  end if;
  return new;
end $$;

create or replace function public._wb_comment_reply_check() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p record;
begin
  if new.reply_to is not null then
    select item_id into p from public.whiteboard_comments where id = new.reply_to;
    if not found or p.item_id <> new.item_id then raise exception 'invalid_reply'; end if;
  end if;
  return new;
end $$;

create or replace function public._journal_comment_reply_check() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p record;
begin
  if new.reply_to is not null then
    select owner_id, log_date into p from public.journal_comments where id = new.reply_to;
    if not found or p.owner_id <> new.owner_id or p.log_date <> new.log_date then raise exception 'invalid_reply'; end if;
  end if;
  return new;
end $$;
