-- 이룬 공동 공부 목표(기념 주화)는 지울 수 없다. 진행 중인 목표만 지울 수 있다.
drop policy goals_delete on public.study_goals;
create policy goals_delete on public.study_goals for delete to authenticated
  using (completed_at is null and (created_by = (select auth.uid()) or public.is_village_admin(village_id)));
