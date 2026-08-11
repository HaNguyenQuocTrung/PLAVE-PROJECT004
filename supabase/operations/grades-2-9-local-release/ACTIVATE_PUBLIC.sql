\set ON_ERROR_STOP on

-- LOCAL/DISPOSABLE ONLY. The launcher verifies the database classification
-- and loopback target before this operation is invoked.
begin;

set local lock_timeout = '5s';

do $activate$
declare
  v_policies integer;
  v_units integer;
  v_questions integer;
  v_solutions integer;
  v_skills integer;
begin
  perform 1 from public.curriculum_grade_release_policies
  where grade between 2 and 9 order by grade for update;

  select count(*) into v_policies from public.curriculum_grade_release_policies
  where grade between 2 and 9
    and combined_a_k_sha256 = 'de5cff15605c2fd4d09bf06740db9475a9918d20396e9d06f5ec27200b362b1e';
  select count(*) into v_units from public.curriculum_release_units unit
  join public.curriculum_grade_release_policies policy on policy.release_id=unit.release_id;
  select count(*) into v_questions from public.curriculum_release_questions question
  join public.curriculum_grade_release_policies policy on policy.release_id=question.release_id;
  select count(*) into v_solutions from private.curriculum_release_solutions solution
  join public.curriculum_grade_release_policies policy on policy.release_id=solution.release_id;
  select count(*) into v_skills from public.curriculum_release_skills skill
  join public.curriculum_grade_release_policies policy on policy.release_id=skill.release_id;

  if v_policies<>8 or v_units<>163 or v_questions<>2460 or v_solutions<>2460 or v_skills<>287 then
    raise exception 'GRADES_2_9_RELEASE:INVENTORY_MISMATCH';
  end if;
  if exists(select 1 from public.curriculum_grade_release_policies policy
    join public.curriculum_releases release on release.release_id=policy.release_id
    where release.content_version<>policy.candidate_version
      or policy.candidate_bundle_sha256 !~ '^[0-9a-f]{64}$'
      or policy.policy_version='' or policy.candidate_id='')
  then raise exception 'GRADES_2_9_RELEASE:EXACT_TUPLE_MISMATCH'; end if;
end;
$activate$;

update public.curriculum_releases release
set status='ACTIVE',activation_state='ACTIVE',activated_at=coalesce(release.activated_at,now()),retired_at=null
from public.curriculum_grade_release_policies policy
where policy.release_id=release.release_id
  and ((release.status='DRAFT' and release.activation_state='INACTIVE')
    or (release.status='ACTIVE' and release.activation_state='ACTIVE'));

update public.curriculum_grade_release_policies
set release_mode='PUBLIC',catalog_enabled=true,runtime_enabled=true,
  retention_enabled=false,activated_at=coalesce(activated_at,now()),updated_at=now()
where grade between 2 and 9;

do $verify$
begin
  if (select count(*) from public.curriculum_grade_release_policies
    where release_mode='PUBLIC' and catalog_enabled and runtime_enabled
      and not retention_enabled and activated_at is not null)<>8
  then raise exception 'GRADES_2_9_RELEASE:ACTIVATION_FAILED'; end if;
  if exists(select 1 from public.curriculum_grade_release_policies policy
    join public.curriculum_releases release on release.release_id=policy.release_id
    where release.status<>'ACTIVE' or release.activation_state<>'ACTIVE')
  then raise exception 'GRADES_2_9_RELEASE:ACTIVATION_PARTIAL'; end if;
end;
$verify$;

commit;
\echo 'Grades 2-9 local PUBLIC release activation: PASS (8 grades, 163 units, 287 skills, 2460 questions)'
