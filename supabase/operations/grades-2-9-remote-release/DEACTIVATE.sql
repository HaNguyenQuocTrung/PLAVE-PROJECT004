\set ON_ERROR_STOP on
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
do $deactivate$
declare v_before bigint[]; v_after bigint[]; v_policies integer; v_releases integer;
begin
  perform 1 from public.curriculum_grade_release_policies where grade between 2 and 9 order by grade for update;
  if (select count(*) from public.curriculum_grade_release_policies where grade between 2 and 9
      and release_mode in ('PUBLIC','HIDDEN')) <> 8
  then raise exception 'GRADES_2_9_REMOTE:DEACTIVATION_TUPLE_SCOPE_MISMATCH'; end if;
  select array[(select count(*) from public.practice_attempts),(select count(*) from public.practice_answers),
    (select count(*) from public.diagnostic_attempts),(select count(*) from public.diagnostic_answers),
    (select count(*) from public.curriculum_attempts),(select count(*) from public.curriculum_answers),
    (select count(*) from public.student_curriculum_unit_progress),(select count(*) from public.student_curriculum_outcome_progress),
    (select count(*) from public.student_curriculum_skill_progress)] into v_before;
  update public.curriculum_grade_release_policies set release_mode='HIDDEN',catalog_enabled=false,
    runtime_enabled=false,retention_enabled=false,activated_at=null,updated_at=now() where grade between 2 and 9;
  get diagnostics v_policies = row_count;
  update public.curriculum_releases r set status='DRAFT',activation_state='INACTIVE',activated_at=null,retired_at=null
    from public.curriculum_grade_release_policies p where p.release_id=r.release_id and p.grade between 2 and 9;
  get diagnostics v_releases = row_count;
  if v_policies<>8 or v_releases<>8 or exists(select 1 from public.curriculum_grade_release_policies
    where grade between 2 and 9 and (release_mode<>'HIDDEN' or catalog_enabled or runtime_enabled or retention_enabled or activated_at is not null))
  then raise exception 'GRADES_2_9_REMOTE:DEACTIVATION_POSTCONDITION_FAILED'; end if;
  select array[(select count(*) from public.practice_attempts),(select count(*) from public.practice_answers),
    (select count(*) from public.diagnostic_attempts),(select count(*) from public.diagnostic_answers),
    (select count(*) from public.curriculum_attempts),(select count(*) from public.curriculum_answers),
    (select count(*) from public.student_curriculum_unit_progress),(select count(*) from public.student_curriculum_outcome_progress),
    (select count(*) from public.student_curriculum_skill_progress)] into v_after;
  if v_after<>v_before then raise exception 'GRADES_2_9_REMOTE:HISTORY_CHANGED'; end if;
end;
$deactivate$;
commit;
\echo 'GRADES_2_9_REMOTE_DEACTIVATION=PASS'
