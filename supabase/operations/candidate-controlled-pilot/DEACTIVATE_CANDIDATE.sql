\set ON_ERROR_STOP on
begin;
set local lock_timeout = '5s';
set local statement_timeout = '120s';
select pg_catalog.set_config('plave.operation.grade', :'grade', true);
select pg_catalog.set_config('plave.operation.unit_slug', :'unit_slug', true);
select pg_catalog.set_config('plave.operation.candidate_id', :'candidate_id', true);
select pg_catalog.set_config('plave.operation.candidate_version', :'candidate_version', true);
select pg_catalog.set_config('plave.operation.bundle_hash', :'bundle_hash', true);
select pg_catalog.set_config('plave.operation.policy_version', :'policy_version', true);
select pg_catalog.set_config('plave.operation.resume_policy', :'resume_policy', true);

do $operation$
declare
  v_updated integer;
  v_grade smallint := current_setting('plave.operation.grade')::smallint;
  v_unit_slug text := current_setting('plave.operation.unit_slug');
  v_candidate_id text := current_setting('plave.operation.candidate_id');
  v_candidate_version text := current_setting('plave.operation.candidate_version');
  v_bundle_hash text := current_setting('plave.operation.bundle_hash');
  v_policy_version text := current_setting('plave.operation.policy_version');
begin
  if current_setting('plave.operation.resume_policy') <> 'PAUSE_RESUME_PRESERVE_HISTORY' then
    raise exception 'CANDIDATE_PILOT:RESUME_POLICY_UNRESOLVED';
  end if;
  perform 1 from public.learning_units as unit
  where unit.slug = v_unit_slug and unit.grade = v_grade
  for update;
  if not found then raise exception 'CANDIDATE_PILOT:UNIT_PRECONDITION_FAILED'; end if;
  perform 1 from public.questions as question
  where question.unit_slug = v_unit_slug
  for update;
  if not found then raise exception 'CANDIDATE_PILOT:QUESTION_PRECONDITION_FAILED'; end if;
  perform 1 from public.adaptive_practice_releases as release
  join public.learning_units as unit on unit.slug = release.unit_slug
  where unit.grade = v_grade and release.unit_slug = v_unit_slug
    and release.release_candidate_id = v_candidate_id and release.content_version = v_candidate_version
    and release.bundle_sha256 = v_bundle_hash and release.policy_version = v_policy_version
    and release.publication_status = 'DRAFT' and release.student_visibility = 'HIDDEN'
    and release.runtime_enabled and release.controlled_pilot_enabled
  for update of release;
  if not found then raise exception 'CANDIDATE_PILOT:DEACTIVATION_PRECONDITION_FAILED'; end if;
  if exists (select 1 from public.learning_units where slug = v_unit_slug and published)
    or exists (select 1 from public.questions where unit_slug = v_unit_slug and published)
  then raise exception 'CANDIDATE_PILOT:PUBLICATION_BOUNDARY_FAILED'; end if;
  update public.adaptive_practice_releases
  set runtime_enabled = false, controlled_pilot_enabled = false, retention_runtime_enabled = false, updated_at = pg_catalog.now()
  where unit_slug = v_unit_slug and release_candidate_id = v_candidate_id
    and content_version = v_candidate_version and bundle_sha256 = v_bundle_hash
    and policy_version = v_policy_version;
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then raise exception 'CANDIDATE_PILOT:DEACTIVATION_DRIFT'; end if;
end;
$operation$;
commit;
