-- 포스트잇 답장: 포스트잇에 짧은 답장을 달 수 있다(한 단계만). 연구실을 볼 수 있는 사람이면 누구나, 방 주인도 답장한다.
alter table public.postits add column reply_to uuid references public.postits (id) on delete cascade;
create index postits_reply_to on public.postits (reply_to) where reply_to is not null;

-- 답장은 같은 연구실의 포스트잇에만, 답장에 다시 답장은 못 한다
create function public._postit_reply_check() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p record;
begin
  if new.reply_to is not null then
    select owner_id, reply_to into p from public.postits where id = new.reply_to;
    if not found or p.owner_id <> new.owner_id or p.reply_to is not null then raise exception 'invalid_reply'; end if;
  end if;
  return new;
end $$;
revoke all on function public._postit_reply_check() from public, anon, authenticated;
create trigger postits_reply_check before insert on public.postits for each row execute function public._postit_reply_check();

-- 알림 종류: 포스트잇 답장
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'postit', 'comment', 'chat_request', 'meeting',
  'gesture', 'gift', 'book_tip', 'journal_reaction', 'journal_comment', 'cheer', 'nudge',
  'moving_cake', 'moving_thanks', 'study_alarm', 'study_goal', 'award', 'postit_reply'));

-- 새 포스트잇은 방 주인에게, 답장은 원래 포스트잇을 붙인 사람에게(주인이 아니면 주인에게도) 알린다.
-- 함께 사는 마을이 없는 친구 사이면, 받는 사람의 마을(가장 먼저 들어간 곳)에서 알림이 열린다.
create or replace function public.notify_postit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_parent uuid; v_village uuid;
begin
  if new.reply_to is not null then
    select author_id into v_parent from public.postits where id = new.reply_to;
    if v_parent is not null and v_parent <> new.author_id then
      v_village := coalesce(public.common_village(v_parent, new.author_id),
        case when public.are_friends(v_parent, new.author_id) then (select m.village_id from public.village_members m where m.user_id = v_parent order by m.joined_at limit 1) end);
      if v_village is not null then
        insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
        values (v_parent, v_village, new.author_id, 'postit_reply', new.owner_id, left(new.body, 60));
      end if;
    end if;
    if new.owner_id <> new.author_id and new.owner_id is distinct from v_parent then
      v_village := coalesce(public.common_village(new.owner_id, new.author_id),
        case when public.are_friends(new.owner_id, new.author_id) then (select m.village_id from public.village_members m where m.user_id = new.owner_id order by m.joined_at limit 1) end);
      if v_village is not null then
        insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
        values (new.owner_id, v_village, new.author_id, 'postit', new.owner_id, left(new.body, 60));
      end if;
    end if;
    return new;
  end if;
  v_village := coalesce(public.common_village(new.owner_id, new.author_id),
    case when public.are_friends(new.owner_id, new.author_id) then (select m.village_id from public.village_members m where m.user_id = new.owner_id order by m.joined_at limit 1) end);
  if new.owner_id <> new.author_id and v_village is not null then
    insert into public.notifications (user_id, village_id, actor_id, kind, room_owner_id, summary)
    values (new.owner_id, v_village, new.author_id, 'postit', new.owner_id, left(new.body, 60));
  end if;
  return new;
end;
$$;
