\set ON_ERROR_STOP on

-- Canonical post-0047 remote operation. The caller must independently verify
-- project identity and run a fresh verified pre-activation backup/restore proof.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $activate$
declare
  v_policy_rows integer;
  v_release_rows integer;
  v_history_before bigint[];
  v_history_after bigint[];
begin
  if (select count(*) from supabase_migrations.schema_migrations) <> 47
    or (select count(distinct version) from supabase_migrations.schema_migrations) <> 47
    or exists (
      select 1 from generate_series(1,47) as expected(version)
      where not exists (
        select 1 from supabase_migrations.schema_migrations as applied
        where applied.version = lpad(expected.version::text,4,'0')
      )
    )
  then raise exception 'GRADES_2_9_REMOTE:LEDGER_NOT_EXACT_0047'; end if;

  perform 1 from public.curriculum_grade_release_policies
    where grade between 2 and 9 order by grade for update;

  if exists (
    select 1
    from (values
      (2,'plave-math-grade-2-a-k-v1','g2-combined-wave-a-b-c-d-e-f-g-h-i-j-k','g2-combined-1.0.0-wave-k','d07d43cfe4a55f6609b41ade67b461664a1506a1a3044e20037181ddd24dada1','g2-combined-policy-1.0.0-wave-k'),
      (3,'plave-math-grade-3-a-k-v1','g3-combined-wave-a-b-c-d-e-f-g-h-i-j-k','g3-combined-1.0.0-wave-k','da36593c635f74e7affbe7f21cd120b7af674a1915a21490df1273158b1b13b6','g3-combined-policy-1.0.0-wave-k'),
      (4,'plave-math-grade-4-a-k-v1','g4-combined-wave-a-b-c-d-e-f-g-h-i-j-k','g4-combined-1.0.0-wave-k','d5d3f524fa021ef9909e8de44764e8957a5fb0e2611051f38657439aca6b3d3a','g4-combined-policy-1.0.0-wave-k'),
      (5,'plave-math-grade-5-a-k-v1','g5-combined-wave-a-b-c-d-e-f-g-h-i-j-k','g5-combined-1.0.0-wave-k','004d6c9babf5987db901b153cca334f0568d6292c53fe7e92fcdd40393b7d35b','g5-combined-policy-1.0.0-wave-k'),
      (6,'plave-math-grade-6-a-k-v1','g6-combined-wave-a-b-c-d-e-f-g-h-i-j-k','g6-combined-1.0.0-wave-k','5f9c2b792e2c4b6eb32c589ad6ff2e966af191ebe3643cec093c499c11b37077','g6-combined-policy-1.0.0-wave-k'),
      (7,'plave-math-grade-7-a-k-v1','g7-combined-wave-a-b-c-d-e-f-g-h-i-j-k','g7-combined-1.0.0-wave-k','c8dd0f279a61a6950a234073ddd20df6796a454145e3d60cb365e8ad203768db','g7-combined-policy-1.0.0-wave-k'),
      (8,'plave-math-grade-8-a-k-v1','g8-combined-wave-a-b-c-d-e-f-g-h-i-j-k','g8-combined-1.0.0-wave-k','333dd541cb85e7583d819c785bc5b62c79f823cdd3e7c6d1e6077b54ef4f7ce2','g8-combined-policy-1.0.0-wave-k'),
      (9,'plave-math-grade-9-a-k-v1','g9-combined-wave-a-b-c-d-e-f-g-h-i-j-k','g9-combined-1.0.0-wave-k','4c82299bd8ab0fa6b4d69eca64a831cff4ecec8ff1808c40fb391f92e6640bb7','g9-combined-policy-1.0.0-wave-k')
    ) as expected(grade,release_id,candidate_id,candidate_version,candidate_bundle_sha256,policy_version)
    full join (
      select grade,release_id,candidate_id,candidate_version,candidate_bundle_sha256,policy_version
      from public.curriculum_grade_release_policies where grade between 2 and 9
    ) as actual using (grade)
    where expected.grade is null or actual.grade is null
      or row(expected.release_id,expected.candidate_id,expected.candidate_version,
        expected.candidate_bundle_sha256,expected.policy_version)
        is distinct from
        row(actual.release_id,actual.candidate_id,actual.candidate_version,
          actual.candidate_bundle_sha256,actual.policy_version)
  ) then raise exception 'GRADES_2_9_REMOTE:EXACT_TUPLE_MISMATCH'; end if;

  if (select count(*) from public.curriculum_grade_release_policies where grade between 2 and 9
        and combined_a_k_sha256='de5cff15605c2fd4d09bf06740db9475a9918d20396e9d06f5ec27200b362b1e') <> 8
    or (select count(*) from public.curriculum_release_units u join public.curriculum_grade_release_policies p using(release_id)) <> 163
    or (select count(*) from public.curriculum_release_questions q join public.curriculum_grade_release_policies p using(release_id)) <> 2460
    or (select count(*) from private.curriculum_release_solutions s join public.curriculum_grade_release_policies p using(release_id)) <> 2460
    or (select count(*) from public.curriculum_release_skills s join public.curriculum_grade_release_policies p using(release_id)) <> 287
    or (select count(*) from public.curriculum_release_pilot_entitlements) <> 0
  then raise exception 'GRADES_2_9_REMOTE:INVENTORY_OR_ENTITLEMENT_MISMATCH'; end if;

  if (select count(*) from public.learning_units where grade=1 and published) <> 13
    or (select count(*) from public.questions q join public.learning_units u on u.slug=q.unit_slug where u.grade=1 and q.published) <> 312
    or (select count(*) from public.question_solutions s join public.questions q on q.code=s.question_id join public.learning_units u on u.slug=q.unit_slug where u.grade=1) <> 312
    or (select count(*) from public.grade1_diagnostic_blueprint where blueprint_version=1) <> 24
  then raise exception 'GRADES_2_9_REMOTE:GRADE1_BOUNDARY_MISMATCH'; end if;

  if exists(select 1 from public.learning_units where grade between 2 and 9 and published)
    or exists(select 1 from public.questions q join public.learning_units u on u.slug=q.unit_slug where u.grade between 2 and 9 and q.published)
  then raise exception 'GRADES_2_9_REMOTE:LEGACY_PUBLICATION_FORBIDDEN'; end if;

  select array[
    (select count(*) from public.practice_attempts), (select count(*) from public.practice_answers),
    (select count(*) from public.diagnostic_attempts), (select count(*) from public.diagnostic_answers),
    (select count(*) from public.curriculum_attempts), (select count(*) from public.curriculum_answers),
    (select count(*) from public.student_curriculum_unit_progress),
    (select count(*) from public.student_curriculum_outcome_progress),
    (select count(*) from public.student_curriculum_skill_progress)
  ] into v_history_before;

  update public.curriculum_releases r
    set status='ACTIVE',activation_state='ACTIVE',activated_at=coalesce(r.activated_at,now()),retired_at=null
    from public.curriculum_grade_release_policies p
    where p.release_id=r.release_id and p.grade between 2 and 9
      and ((r.status='DRAFT' and r.activation_state='INACTIVE') or (r.status='ACTIVE' and r.activation_state='ACTIVE'));
  get diagnostics v_release_rows = row_count;

  update public.curriculum_grade_release_policies p
    set release_mode='PUBLIC',catalog_enabled=true,runtime_enabled=true,
        retention_enabled=false,activated_at=coalesce(p.activated_at,now()),updated_at=now()
    where p.grade between 2 and 9
      and ((p.release_mode='HIDDEN' and not p.catalog_enabled and not p.runtime_enabled)
        or (p.release_mode='PUBLIC' and p.catalog_enabled and p.runtime_enabled))
      and not p.retention_enabled;
  get diagnostics v_policy_rows = row_count;

  if v_release_rows <> 8 or v_policy_rows <> 8
    or (select count(*) from public.curriculum_grade_release_policies
        where grade between 2 and 9 and release_mode='PUBLIC' and catalog_enabled
          and runtime_enabled and not retention_enabled and activated_at is not null) <> 8
    or (select count(*) from public.curriculum_releases r join public.curriculum_grade_release_policies p using(release_id)
        where r.status='ACTIVE' and r.activation_state='ACTIVE') <> 8
  then raise exception 'GRADES_2_9_REMOTE:ACTIVATION_POSTCONDITION_FAILED'; end if;

  select array[
    (select count(*) from public.practice_attempts), (select count(*) from public.practice_answers),
    (select count(*) from public.diagnostic_attempts), (select count(*) from public.diagnostic_answers),
    (select count(*) from public.curriculum_attempts), (select count(*) from public.curriculum_answers),
    (select count(*) from public.student_curriculum_unit_progress),
    (select count(*) from public.student_curriculum_outcome_progress),
    (select count(*) from public.student_curriculum_skill_progress)
  ] into v_history_after;
  if v_history_after <> v_history_before then raise exception 'GRADES_2_9_REMOTE:HISTORY_CHANGED'; end if;
end;
$activate$;
commit;
\echo 'GRADES_2_9_REMOTE_PUBLIC_ACTIVATION=PASS'
