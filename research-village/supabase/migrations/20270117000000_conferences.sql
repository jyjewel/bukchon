-- 학회 참석 명찰: 마을 게시판의 학회 소식에 '참석 확인'을 켜면, 현장 코드(QR)를 입력한 사람에게 학회 명찰이 생긴다.
-- 역할: 참석자 · 토론자(은) · 발표자(금) · 개최자(자주). 개최자가 참석자의 역할을 정한다.
alter table public.news_posts add column event_date date;

-- 참석 암호는 주민에게 보이면 안 되므로 소식 글과 따로 둔다(직접 읽을 수 없고, 개최자는 아래 함수로 받는다)
create table public.conference_codes (
  post_id uuid primary key references public.news_posts (id) on delete cascade,
  code text not null
);
alter table public.conference_codes enable row level security;
revoke all on public.conference_codes from anon, authenticated, public;

create table public.conference_attendance (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.news_posts (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  event_date date not null,
  role text not null default 'attendee' check (role in ('attendee', 'discussant', 'presenter', 'host')),
  checked_at timestamptz not null default now(),
  unique (post_id, user_id)
);
create index conference_attendance_user on public.conference_attendance (user_id, event_date desc);
alter table public.conference_attendance enable row level security;
revoke all on public.conference_attendance from anon, authenticated, public;
grant select on public.conference_attendance to authenticated;
create policy conf_att_select on public.conference_attendance for select to authenticated using (public.can_see_room(user_id));

-- 참석 암호: '금색코끼리'처럼 색 + 동물. 개최자만 알고, 현장에서 참석자에게 알려 준다
create function public._conf_code() returns text
language sql volatile set search_path = '' as $$
  select (array['금색', '은색', '푸른', '붉은', '초록', '보라', '하얀', '노란', '분홍', '주황'])[1 + floor(random() * 10)::int]
      || (array['코끼리', '고래', '여우', '토끼', '부엉이', '고양이', '펭귄', '사슴', '다람쥐', '거북이', '올빼미', '두루미', '해달', '수달', '곰', '호랑이', '나비', '돌고래', '기린', '참새'])[1 + floor(random() * 20)::int];
$$;
revoke all on function public._conf_code() from public, anon, authenticated;

-- 개최자: 참석 확인을 켠다(학회 소식 글쓴이만). 이미 켰으면 날짜만 고치고 코드는 그대로 돌려준다
create function public.enable_conference_checkin(p_post uuid, p_date date) returns text
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user(); v_today date := (now() at time zone 'Asia/Seoul')::date; p public.news_posts; v_code text;
begin
  select * into p from public.news_posts where id = p_post and author_id = v_uid and category = 'conference';
  if not found then raise exception 'not_found'; end if;
  if p_date is null or p_date < v_today - 1 or p_date > v_today + 400 then raise exception 'bad_date'; end if;
  select code into v_code from public.conference_codes where post_id = p_post;
  if v_code is null then
    loop
      v_code := public._conf_code();
      -- 아직 유효한(행사 전이거나 행사일 다음 날까지인) 다른 학회가 같은 암호를 쓰고 있으면 다시 뽑는다
      exit when not exists (select 1 from public.conference_codes c join public.news_posts n on n.id = c.post_id
                            where c.code = v_code and (n.event_date is null or n.event_date >= v_today - 1));
    end loop;
    insert into public.conference_codes (post_id, code) values (p_post, v_code);
  end if;
  update public.news_posts set event_date = p_date where id = p_post;
  insert into public.conference_attendance (post_id, user_id, title, event_date, role) values (p_post, v_uid, p.title, p_date, 'host')
    on conflict (post_id, user_id) do update set event_date = excluded.event_date, title = excluded.title;
  update public.conference_attendance set event_date = p_date where post_id = p_post;
  return v_code;
end $$;

-- 개최자만 자기 학회의 코드를 다시 받아 볼 수 있다
create function public.conference_code(p_post uuid) returns text
language sql stable security definer set search_path = '' as $$
  select c.code from public.conference_codes c join public.news_posts n on n.id = c.post_id where c.post_id = p_post and n.author_id = (select auth.uid());
$$;

-- 참석자: 현장에서 들은 암호를 입력해 참석을 남긴다(학회 당일과 다음 날까지)
create function public.checkin_conference(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user(); v_today date := (now() at time zone 'Asia/Seoul')::date; p public.news_posts; a public.conference_attendance;
begin
  select n.* into p from public.news_posts n join public.conference_codes c on c.post_id = n.id
    where c.code = regexp_replace(coalesce(p_code, ''), '\s', '', 'g') order by n.event_date desc nulls last limit 1;
  if not found then raise exception 'invalid_code'; end if;
  if p.event_date is null or v_today < p.event_date or v_today > p.event_date + 1 then raise exception 'not_today'; end if;
  insert into public.conference_attendance (post_id, user_id, title, event_date, role) values (p.id, v_uid, p.title, p.event_date, 'attendee')
    on conflict (post_id, user_id) do nothing;
  select * into a from public.conference_attendance where post_id = p.id and user_id = v_uid;
  return jsonb_build_object('title', a.title, 'event_date', a.event_date, 'role', a.role);
end $$;

-- 개최자: 참석자 목록
create function public.conference_attendees(p_post uuid) returns table (user_id uuid, display_name text, role text, checked_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.user_id, p.display_name, a.role, a.checked_at
  from public.conference_attendance a join public.profiles p on p.id = a.user_id
  where a.post_id = p_post
    and exists (select 1 from public.news_posts n where n.id = p_post and n.author_id = (select auth.uid()))
  order by (a.role = 'host') desc, a.checked_at;
$$;

-- 개최자: 참석자를 토론자·발표자로 정한다(개최자 본인 역할은 바꾸지 못한다)
create function public.set_conference_role(p_post uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user();
begin
  if p_role not in ('attendee', 'discussant', 'presenter') then raise exception 'invalid_role'; end if;
  if not exists (select 1 from public.news_posts where id = p_post and author_id = v_uid) then raise exception 'not_found'; end if;
  update public.conference_attendance set role = p_role where post_id = p_post and user_id = p_user and role <> 'host';
  if not found then raise exception 'not_found'; end if;
end $$;

revoke all on function public.enable_conference_checkin(uuid, date), public.conference_code(uuid), public.checkin_conference(text), public.conference_attendees(uuid), public.set_conference_role(uuid, uuid, text) from public, anon;
grant execute on function public.enable_conference_checkin(uuid, date), public.conference_code(uuid), public.checkin_conference(text), public.conference_attendees(uuid), public.set_conference_role(uuid, uuid, text) to authenticated;
