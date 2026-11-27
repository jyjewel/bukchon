-- 학회 소식은 마감일 대신 개최 일시(시간까지)와 장소를 적는다. 참석 확인은 개최 일시의 날짜(한국 시간)로 열린다.
alter table public.news_posts add column event_at timestamptz;
alter table public.news_posts add column place text check (place is null or char_length(place) <= 100);
grant insert (event_at, place) on public.news_posts to authenticated;

-- 개최 일시가 있으면 행사일(한국 시간 날짜)도 같이 맞춘다
create function public._news_event_date() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.event_at is not null then new.event_date := (new.event_at at time zone 'Asia/Seoul')::date; end if;
  new.place := nullif(btrim(coalesce(new.place, '')), '');
  return new;
end $$;
create trigger news_event_date before insert on public.news_posts for each row execute function public._news_event_date();

-- 참석 확인 켜기: 날짜는 글의 개최 일시에서 가져온다(옛 글처럼 개최 일시가 없으면 p_date)
drop function public.enable_conference_checkin(uuid, date);
create function public.enable_conference_checkin(p_post uuid, p_date date default null) returns text
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_user(); v_today date := (now() at time zone 'Asia/Seoul')::date; p public.news_posts; c public.conferences; v_key text; v_code text; v_date date;
begin
  select * into p from public.news_posts where id = p_post and author_id = v_uid and category = 'conference';
  if not found then raise exception 'not_found'; end if;
  v_date := coalesce((p.event_at at time zone 'Asia/Seoul')::date, p_date);
  if v_date is null or v_date < v_today - 1 or v_date > v_today + 400 then raise exception 'bad_date'; end if;
  v_key := lower(regexp_replace(p.title, '\s', '', 'g'));
  select * into c from public.conferences where host_id = v_uid and title_key = v_key and event_date = v_date;
  if not found then
    loop
      v_code := public._conf_code();
      exit when not exists (select 1 from public.conferences x where x.code = v_code and x.event_date >= v_today - 1);
    end loop;
    insert into public.conferences (host_id, title, title_key, event_date, code) values (v_uid, left(btrim(p.title), 120), v_key, v_date, v_code) returning * into c;
  end if;
  update public.news_posts set conference_id = c.id, event_date = v_date where id = p_post;
  return c.code;
end $$;
revoke all on function public.enable_conference_checkin(uuid, date) from public, anon;
grant execute on function public.enable_conference_checkin(uuid, date) to authenticated;
