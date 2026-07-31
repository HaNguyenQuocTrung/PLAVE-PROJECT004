\set ON_ERROR_STOP on

-- OWNER LOCAL DEMO ONLY. The caller must enforce a loopback PostgreSQL
-- connection. This operation activates only the verified universal release
-- and explicitly refuses to run while the frozen adaptive pilot is enabled.

begin;

do $preflight$
declare
  v_release_count integer;
  v_units integer;
  v_questions integer;
  v_solutions integer;
  v_outcomes integer;
begin
  if
    pg_catalog.to_regclass('public.curriculum_releases') is null
    or pg_catalog.to_regclass('public.curriculum_release_units') is null
    or pg_catalog.to_regclass('public.curriculum_release_questions') is null
    or pg_catalog.to_regclass('private.curriculum_release_solutions') is null
    or pg_catalog.to_regclass('public.adaptive_practice_releases') is null
  then
    raise exception 'OWNER_LOCAL_DEMO:SCHEMA_INCOMPLETE';
  end if;

  select count(*) into v_release_count
  from public.curriculum_releases
  where release_id = 'plave-math-grades-1-9-v1';

  select count(*) into v_units
  from public.curriculum_release_units
  where release_id = 'plave-math-grades-1-9-v1';

  select count(*) into v_questions
  from public.curriculum_release_questions
  where release_id = 'plave-math-grades-1-9-v1';

  select count(*) into v_solutions
  from private.curriculum_release_solutions
  where release_id = 'plave-math-grades-1-9-v1';

  select count(distinct outcome_id) into v_outcomes
  from public.curriculum_release_units as unit
  cross join lateral unnest(unit.official_outcome_ids)
    as outcome(outcome_id)
  where unit.release_id = 'plave-math-grades-1-9-v1';

  if
    v_release_count <> 1
    or v_units <> 171
    or v_questions <> 2052
    or v_solutions <> 2052
    or v_outcomes <> 546
  then
    raise exception 'OWNER_LOCAL_DEMO:RELEASE_FINGERPRINT_MISMATCH';
  end if;

  if exists (
    select 1
    from public.adaptive_practice_releases
    where
      runtime_enabled
      or controlled_pilot_enabled
      or retention_runtime_enabled
      or publication_status <> 'DRAFT'
      or student_visibility <> 'HIDDEN'
  ) then
    raise exception 'OWNER_LOCAL_DEMO:ADAPTIVE_PILOT_MUST_REMAIN_DISABLED';
  end if;
end;
$preflight$;

update public.curriculum_releases
set
  status = 'ACTIVE',
  activation_state = 'ACTIVE',
  activated_at = coalesce(activated_at, now()),
  retired_at = null
where release_id = 'plave-math-grades-1-9-v1'
  and (
    (status = 'DRAFT' and activation_state = 'INACTIVE')
    or (status = 'ACTIVE' and activation_state = 'ACTIVE')
  );

do $verify$
begin
  if not exists (
    select 1
    from public.curriculum_releases
    where release_id = 'plave-math-grades-1-9-v1'
      and status = 'ACTIVE'
      and activation_state = 'ACTIVE'
      and activated_at is not null
      and retired_at is null
  ) then
    raise exception 'OWNER_LOCAL_DEMO:ACTIVATION_FAILED';
  end if;
end;
$verify$;

commit;

\echo 'Owner local universal curriculum activation: PASS'
