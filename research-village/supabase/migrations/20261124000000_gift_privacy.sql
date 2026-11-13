-- 선물을 누가 보냈는지, 어떤 한마디를 적었는지는 받은 사람(과 보낸 사람)만 본다.
-- 방문자에게는 책상 위에 어떤 선물이 놓였는지(종류와 시각)만 보인다.
drop policy gifts_select on public.gifts;
create policy gifts_select on public.gifts for select to authenticated
  using (to_user = (select auth.uid()) or from_user = (select auth.uid()));

create function public.desk_gifts(p_owner uuid)
returns table (kind text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select g.kind, g.created_at from public.gifts g
  where g.to_user = p_owner and g.created_at > now() - interval '24 hours'
    and (p_owner = (select auth.uid()) or public.shares_village_with(p_owner))
  order by g.created_at desc limit 12;
$$;
grant execute on function public.desk_gifts(uuid) to authenticated;
revoke execute on function public.desk_gifts(uuid) from public, anon;
