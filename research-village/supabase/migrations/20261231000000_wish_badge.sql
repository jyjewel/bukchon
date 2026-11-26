-- 명예 마을 보완관 뱃지를 받은 사람은 소원을 하루에 몇 개든 빌 수 있다.
-- 뱃지 표시는 사용자가 직접 고칠 수 있는 캐릭터 값이라, 권한은 본인이 못 바꾸는 별도 표(honor_badge)로 구분한다.
alter table public.profiles add column honor_badge boolean not null default false;
update public.profiles set honor_badge = true where avatar->'props' ? 'honorbadge';

create or replace function public.limit_wishes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.profiles p where p.id = new.author_id and p.honor_badge) then
    return new;
  end if;
  if (select count(*) from public.wishes w where w.author_id = new.author_id and w.created_at > now() - interval '24 hours') >= 3 then
    raise exception 'too_many_wishes';
  end if;
  return new;
end $$;
