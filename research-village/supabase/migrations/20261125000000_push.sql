-- 폰 푸시 알림: 기기 구독 저장, 새 알림·새 대화 메시지가 생기면 send-push 함수를 부른다

create extension if not exists pg_net with schema extensions;

-- ───────────── 1. 기기 구독 ─────────────
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 10 and 2000),
  p256dh text not null check (char_length(p256dh) between 10 and 300),
  auth text not null check (char_length(auth) between 10 and 100),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated, public;
-- 내 기기 목록(주소만)과 해제는 직접, 저장은 아래 RPC 로. 암호 키는 본인도 읽지 못한다.
grant select (id, user_id, endpoint, created_at), delete on public.push_subscriptions to authenticated;
create policy push_subscriptions_select on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy push_subscriptions_delete on public.push_subscriptions for delete to authenticated using (user_id = (select auth.uid()));

create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user();
begin
  -- 같은 기기에서 다른 사람이 로그인했다면 구독은 지금 로그인한 사람에게 넘어간다
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (v_uid, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
  -- 한 사람당 기기 10개까지, 오래된 것부터 정리
  delete from public.push_subscriptions where id in (
    select id from public.push_subscriptions where user_id = v_uid order by created_at desc offset 10);
end $$;
revoke all on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- ───────────── 2. 서버 설정(함수 주소·비밀 값·VAPID 키). 앱 사용자는 접근할 수 없다 ─────────────
create table public.push_config (key text primary key, value text not null);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated, public;

-- ───────────── 3. 보내기 ─────────────
create function public._push(p_user uuid, p_village uuid, p_kind text, p_actor uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_url text; v_secret text; v_name text; v_status public.research_state;
begin
  select value into v_url from public.push_config where key = 'push_url';
  select value into v_secret from public.push_config where key = 'push_secret';
  if v_url is null or v_secret is null then return; end if;
  if not exists (select 1 from public.push_subscriptions where user_id = p_user) then return; end if;
  -- 집중 연구 중에는 팝업을 보내지 않는다. 알림함에만 쌓인다.
  select status into v_status from public.research_status where village_id = p_village and user_id = p_user;
  if v_status = 'focus' then return; end if;
  select display_name into v_name from public.profiles where id = p_actor;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := jsonb_build_object('user_id', p_user, 'kind', p_kind, 'actor', coalesce(v_name, ''))
  );
exception when others then
  null;   -- 푸시가 안 가도 알림·메시지 저장은 절대 실패하지 않는다
end $$;
revoke all on function public._push(uuid, uuid, text, uuid) from public, anon, authenticated;

create function public._push_on_notification() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.actor_id is distinct from new.user_id then
    perform public._push(new.user_id, new.village_id, new.kind, new.actor_id);
  end if;
  return new;
end $$;
revoke all on function public._push_on_notification() from public, anon, authenticated;
create trigger notifications_push after insert on public.notifications
  for each row execute function public._push_on_notification();

create function public._push_on_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c public.conversations;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if found and c.status = 'active' then
    perform public._push(case when new.sender_id = c.user_a then c.user_b else c.user_a end, c.village_id, 'message', new.sender_id);
  end if;
  return new;
end $$;
revoke all on function public._push_on_message() from public, anon, authenticated;
create trigger messages_push after insert on public.messages
  for each row execute function public._push_on_message();
