\set ON_ERROR_STOP on

begin;
set local lock_timeout = '5s';

do $lock$
begin
  perform 1 from public.curriculum_grade_release_policies
  where grade between 2 and 9 order by grade for update;
end;
$lock$;

update public.curriculum_grade_release_policies
set release_mode='HIDDEN',catalog_enabled=false,runtime_enabled=false,
  retention_enabled=false,activated_at=null,updated_at=now()
where grade between 2 and 9;

update public.curriculum_releases release
set status='DRAFT',activation_state='INACTIVE',activated_at=null,retired_at=null
from public.curriculum_grade_release_policies policy
where policy.release_id=release.release_id;

do $verify$
begin
  if exists(select 1 from public.curriculum_grade_release_policies
    where release_mode<>'HIDDEN' or catalog_enabled or runtime_enabled
      or retention_enabled or activated_at is not null)
  then raise exception 'GRADES_2_9_RELEASE:DEACTIVATION_FAILED'; end if;
  if exists(select 1 from public.curriculum_grade_release_policies policy
    join public.curriculum_releases release on release.release_id=policy.release_id
    where release.status<>'DRAFT' or release.activation_state<>'INACTIVE')
  then raise exception 'GRADES_2_9_RELEASE:DEACTIVATION_PARTIAL'; end if;
end;
$verify$;

commit;
\echo 'Grades 2-9 local release deactivation: PASS; content and history preserved'
