-- 학회 참석 명찰: 마을 게시판의 학회 소식에 '참석 확인'을 켜면, 게시자만 아는 현장 암호(금색코끼리 같은)를 입력한 사람에게 학회 명찰이 생긴다.
-- 역할: 참석자 · 토론자(은) · 발표자(금) · 게시자(자주). 게시자가 참석자의 역할을 정한다.
-- 같은 사람이 같은 학회(같은 제목·같은 행사일)를 여러 마을에 올려도 학회는 하나로 합쳐져, 암호도 명찰도 하나다.
alter table public.news_posts add column event_date date;

create table public.conferences (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  title_key text not null,
  event_date date not null,
  code text not null,
  created_at timestamptz not null default now(),
  unique (host_id, title_key, event_date)
);
alter table public.conferences enable row level security;
revoke all on public.conferences from anon, authenticated, public;   -- 암호가 들어 있어 직접 읽을 수 없다(함수로만)

alter table public.news_posts add column conference_id uuid references public.conferences (id) on delete set null;

create table public.conference_attendance (
  id uuid primary key default gen_random_uuid(),
  conference_id uuid not null references public.conferences (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  event_date date not null,
  role text not null default 'attendee' check (role in ('attendee', 'discussant', 'presenter', 'host')),
  checked_at timestamptz not null default now(),
  unique (conference_id, user_id)
);
create index conference_attendance_user on public.conference_attendance (user_id, event_date desc);
alter table public.conference_attendance enable row level security;
revoke all on public.conference_attendance from anon, authenticated, public;
grant select on public.conference_attendance to authenticated;
create policy conf_att_select on public.conference_attendance for select to authenticated using (public.can_see_room(user_id));

-- 참석 암호: '금색코끼리'처럼 색 + 동물. 게시자만 알고, 현장에서 참석자에게 알려 준다
create function public._conf_code() returns text
language sql volatile set search_path = '' as $$
  select (array['금색', '은색', '푸른', '붉은', '초록', '보라', '하얀', '노란', '분홍', '주황'])[1 + floor(random() * 10)::int]
      || (array['코끼리', '고래', '여우', '토끼', '부엉이', '고양이', '펭귄', '사슴', '다람쥐', '거북이', '올빼미', '두루미', '해달', '수달', '곰', '호랑이', '나비', '돌고래', '기린', '참새'])[1 + floor(random() * 20)::int];
$$;
revoke all on function public._conf_code() from public, anon, authenticated;

-- 게시자: 참석 확인을 켠다(학회 소식 글쓴이만). 같은 제목·같은 행사일로 올린 다른 마을 소식과는 같은 학회·같은 암호를 쓴다
create function public.enable_conference_checkin(p_post uuid, p_date date) returns text
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user(); v_today date := (now() at time zone 'Asia/Seoul')::date; p public.news_posts; c public.conferences; v_key text; v_code text;
begin
  select * into p from public.news_posts where id = p_post and author_id = v_uid and category = 'conference';
  if not found then raise exception 'not_found'; end if;
  if p_date is null or p_date < v_today - 1 or p_date > v_today + 400 then raise exception 'bad_date'; end if;
  v_key := lower(regexp_replace(p.title, '\s', '', 'g'));
  select * into c from public.conferences where host_id = v_uid and title_key = v_key and event_date = p_date;
  if not found then
    loop
      v_code := public._conf_code();
      -- 아직 유효한(행사일 다음 날까지인) 다른 학회가 같은 암호를 쓰고 있으면 다시 뽑는다
      exit when not exists (select 1 from public.conferences x where x.code = v_code and x.event_date >= v_today - 1);
    end loop;
    insert into public.conferences (host_id, title, title_key, event_date, code) values (v_uid, left(btrim(p.title), 120), v_key, p_date, v_code) returning * into c;
  end if;
  update public.news_posts set conference_id = c.id, event_date = p_date where id = p_post;
  insert into public.conference_attendance (conference_id, user_id, title, event_date, role) values (c.id, v_uid, c.title, c.event_date, 'host')
    on conflict (conference_id, user_id) do nothing;
  return c.code;
end $$;

-- 게시자만 자기 학회의 암호를 다시 받아 볼 수 있다
create function public.conference_code(p_post uuid) returns text
language sql stable security definer set search_path = '' as $$
  select c.code from public.news_posts n join public.conferences c on c.id = n.conference_id
  where n.id = p_post and c.host_id = (select auth.uid());
$$;

-- 참석자: 현장에서 들은 암호를 입력해 참석을 남긴다(학회 당일과 다음 날까지). 같은 학회는 한 번만 남는다
create function public.checkin_conference(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user(); v_today date := (now() at time zone 'Asia/Seoul')::date; c public.conferences; a public.conference_attendance;
begin
  select * into c from public.conferences
    where code = regexp_replace(coalesce(p_code, ''), '\s', '', 'g') order by event_date desc limit 1;
  if not found then raise exception 'invalid_code'; end if;
  if v_today < c.event_date or v_today > c.event_date + 1 then raise exception 'not_today'; end if;
  insert into public.conference_attendance (conference_id, user_id, title, event_date, role) values (c.id, v_uid, c.title, c.event_date, 'attendee')
    on conflict (conference_id, user_id) do nothing;
  select * into a from public.conference_attendance where conference_id = c.id and user_id = v_uid;
  return jsonb_build_object('title', a.title, 'event_date', a.event_date, 'role', a.role);
end $$;

-- 게시자: 참석자 목록
create function public.conference_attendees(p_post uuid) returns table (user_id uuid, display_name text, role text, checked_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.user_id, p.display_name, a.role, a.checked_at
  from public.news_posts n
  join public.conferences c on c.id = n.conference_id and c.host_id = (select auth.uid())
  join public.conference_attendance a on a.conference_id = c.id
  join public.profiles p on p.id = a.user_id
  where n.id = p_post
  order by (a.role = 'host') desc, a.checked_at;
$$;

-- 게시자: 참석자를 토론자·발표자로 정한다(게시자 본인 역할은 바꾸지 못한다)
create function public.set_conference_role(p_post uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user(); v_conf uuid;
begin
  if p_role not in ('attendee', 'discussant', 'presenter') then raise exception 'invalid_role'; end if;
  select c.id into v_conf from public.news_posts n join public.conferences c on c.id = n.conference_id where n.id = p_post and c.host_id = v_uid;
  if v_conf is null then raise exception 'not_found'; end if;
  update public.conference_attendance set role = p_role where conference_id = v_conf and user_id = p_user and role <> 'host';
  if not found then raise exception 'not_found'; end if;
end $$;

revoke all on function public.enable_conference_checkin(uuid, date), public.conference_code(uuid), public.checkin_conference(text), public.conference_attendees(uuid), public.set_conference_role(uuid, uuid, text) from public, anon;
grant execute on function public.enable_conference_checkin(uuid, date), public.conference_code(uuid), public.checkin_conference(text), public.conference_attendees(uuid), public.set_conference_role(uuid, uuid, text) to authenticated;
