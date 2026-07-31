-- PLAVE controlled-dev remediation for the remote-only Supabase RLS helper.
--
-- NOT A MIGRATION. DO NOT APPLY WITHOUT EXPLICIT OWNER APPROVAL.
-- Run the complete file once in the selected controlled-dev SQL Editor.
-- Every precondition is checked before the two permanent DROP statements.

begin;

do $precondition$
declare
  v_function_oid oid;
  v_function_count integer;
  v_owner_name text;
  v_return_type text;
  v_language_name text;
  v_security_definer boolean;
  v_config text[];
  v_definition_md5 text;
  v_normalized_definition_md5 text;
begin
  select count(*), min(procedure.oid)
  into v_function_count, v_function_oid
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'rls_auto_enable';

  if v_function_count <> 1 or v_function_oid is null then
    raise exception using
      errcode = 'P0001',
      message = 'PLAVE_RLS_DRIFT:FUNCTION_IDENTITY_MISMATCH';
  end if;

  if pg_catalog.pg_get_function_identity_arguments(v_function_oid) <> '' then
    raise exception using
      errcode = 'P0001',
      message = 'PLAVE_RLS_DRIFT:FUNCTION_SIGNATURE_MISMATCH';
  end if;

  select
    owner_role.rolname,
    pg_catalog.format_type(procedure.prorettype, null),
    language.lanname,
    procedure.prosecdef,
    procedure.proconfig,
    pg_catalog.md5(pg_catalog.pg_get_functiondef(procedure.oid)),
    pg_catalog.md5(
      pg_catalog.regexp_replace(
        pg_catalog.lower(pg_catalog.pg_get_functiondef(procedure.oid)),
        '\s+',
        ' ',
        'g'
      )
    )
  into
    v_owner_name,
    v_return_type,
    v_language_name,
    v_security_definer,
    v_config,
    v_definition_md5,
    v_normalized_definition_md5
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_roles as owner_role
    on owner_role.oid = procedure.proowner
  join pg_catalog.pg_language as language
    on language.oid = procedure.prolang
  where procedure.oid = v_function_oid;

  if v_owner_name <> 'postgres'
    or v_return_type <> 'event_trigger'
    or v_language_name <> 'plpgsql'
    or not v_security_definer
    or v_config is distinct from array['search_path=pg_catalog']::text[]
    or v_definition_md5 <> '6998ea6b4c2480f5d2e34b5dcf3f8d36'
    or v_normalized_definition_md5 <>
      '685bfb43070e3afbcc764020048aaa0c'
  then
    raise exception using
      errcode = 'P0001',
      message = 'PLAVE_RLS_DRIFT:FUNCTION_METADATA_MISMATCH';
  end if;

  if (
    select count(*)
    from pg_catalog.aclexplode(
      coalesce(
        (
          select procedure.proacl
          from pg_catalog.pg_proc as procedure
          where procedure.oid = v_function_oid
        ),
        pg_catalog.acldefault(
          'f',
          (
            select procedure.proowner
            from pg_catalog.pg_proc as procedure
            where procedure.oid = v_function_oid
          )
        )
      )
    ) as function_acl
    where function_acl.grantee = 0
      and function_acl.privilege_type = 'EXECUTE'
  ) <> 1
  or exists (
    select 1
    from pg_catalog.pg_proc as procedure
    cross join lateral pg_catalog.aclexplode(
      coalesce(
        procedure.proacl,
        pg_catalog.acldefault('f', procedure.proowner)
      )
    ) as function_acl
    where procedure.oid = v_function_oid
      and (
        function_acl.privilege_type <> 'EXECUTE'
        or function_acl.grantee not in (0, procedure.proowner)
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'PLAVE_RLS_DRIFT:FUNCTION_ACL_MISMATCH';
  end if;

  if (
    select count(*)
    from pg_catalog.pg_depend as dependency
    where dependency.classid =
      'pg_catalog.pg_proc'::pg_catalog.regclass
      and dependency.objid = v_function_oid
  ) <> 2
  or (
    select count(*)
    from pg_catalog.pg_depend as dependency
    join pg_catalog.pg_language as language
      on dependency.refclassid =
        'pg_catalog.pg_language'::pg_catalog.regclass
      and language.oid = dependency.refobjid
    where dependency.classid =
      'pg_catalog.pg_proc'::pg_catalog.regclass
      and dependency.objid = v_function_oid
      and dependency.deptype = 'n'
      and language.lanname = 'plpgsql'
  ) <> 1
  or (
    select count(*)
    from pg_catalog.pg_depend as dependency
    join pg_catalog.pg_namespace as namespace
      on dependency.refclassid =
        'pg_catalog.pg_namespace'::pg_catalog.regclass
      and namespace.oid = dependency.refobjid
    where dependency.classid =
      'pg_catalog.pg_proc'::pg_catalog.regclass
      and dependency.objid = v_function_oid
      and dependency.deptype = 'n'
      and namespace.nspname = 'public'
  ) <> 1
  or exists (
    select 1
    from pg_catalog.pg_depend as dependency
    where dependency.classid =
      'pg_catalog.pg_proc'::pg_catalog.regclass
      and dependency.objid = v_function_oid
      and (
        dependency.deptype = 'e'
        or dependency.refclassid =
          'pg_catalog.pg_extension'::pg_catalog.regclass
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'PLAVE_RLS_DRIFT:FUNCTION_DEPENDENCY_MISMATCH';
  end if;

  if (
    select count(*)
    from pg_catalog.pg_event_trigger as event_trigger
    where event_trigger.evtname = 'ensure_rls'
  ) <> 1
  or (
    select count(*)
    from pg_catalog.pg_event_trigger as event_trigger
    where event_trigger.evtfoid = v_function_oid
  ) <> 1
  or not exists (
    select 1
    from pg_catalog.pg_event_trigger as event_trigger
    where event_trigger.evtname = 'ensure_rls'
      and event_trigger.evtfoid = v_function_oid
      and event_trigger.evtenabled = 'O'
      and event_trigger.evtevent = 'ddl_command_end'
      and pg_catalog.cardinality(event_trigger.evttags) = 3
      and event_trigger.evttags @> array[
        'CREATE TABLE',
        'CREATE TABLE AS',
        'SELECT INTO'
      ]::text[]
      and event_trigger.evttags <@ array[
        'CREATE TABLE',
        'CREATE TABLE AS',
        'SELECT INTO'
      ]::text[]
  )
  or (
    select count(*)
    from pg_catalog.pg_depend as dependency
    join pg_catalog.pg_event_trigger as event_trigger
      on dependency.classid =
        'pg_catalog.pg_event_trigger'::pg_catalog.regclass
      and event_trigger.oid = dependency.objid
    where dependency.refclassid =
      'pg_catalog.pg_proc'::pg_catalog.regclass
      and dependency.refobjid = v_function_oid
      and dependency.deptype = 'n'
      and event_trigger.evtname = 'ensure_rls'
  ) <> 1
  or (
    select count(*)
    from pg_catalog.pg_depend as dependency
    where dependency.refclassid =
      'pg_catalog.pg_proc'::pg_catalog.regclass
      and dependency.refobjid = v_function_oid
  ) <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'PLAVE_RLS_DRIFT:EVENT_TRIGGER_MISMATCH';
  end if;

  if (
    select count(*)
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
  ) <> 24
  or exists (
    select 1
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
      and relation.relname <> all(array[
        'assignment_answers',
        'assignment_submissions',
        'classroom_memberships',
        'classrooms',
        'diagnostic_answers',
        'diagnostic_attempts',
        'grade1_diagnostic_blueprint',
        'learning_goals',
        'learning_units',
        'parent_goal_suggestions',
        'parent_student_connections',
        'parent_student_lookup_failures',
        'practice_answers',
        'practice_attempts',
        'profiles',
        'question_solutions',
        'questions',
        'student_profiles',
        'teacher_assignment_items',
        'teacher_assignments',
        'teacher_invitations',
        'teacher_profiles',
        'teacher_question_solutions',
        'teacher_questions'
      ]::text[])
  )
  or exists (
    select 1
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
      and not relation.relrowsecurity
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'PLAVE_RLS_DRIFT:PUBLIC_TABLE_BASELINE_MISMATCH';
  end if;

  if (
    select count(*)
    from public.learning_units as unit
    where unit.grade = 1
  ) <> 13
  or (
    select count(*)
    from public.learning_units as unit
    where unit.grade = 1 and unit.published
  ) <> 13
  or (
    select count(*)
    from public.questions as question
    join public.learning_units as unit
      on unit.slug = question.unit_slug
    where unit.grade = 1
  ) <> 312
  or (
    select count(*)
    from public.question_solutions as solution
    join public.questions as question
      on question.code = solution.question_id
    join public.learning_units as unit
      on unit.slug = question.unit_slug
    where unit.grade = 1
  ) <> 312 then
    raise exception using
      errcode = 'P0001',
      message = 'PLAVE_RLS_DRIFT:GRADE1_BASELINE_MISMATCH';
  end if;

  if exists (
    select 1
    from public.learning_units as unit
    where unit.slug = 'grade-2-numbers-to-1000'
  )
  or pg_catalog.to_regclass(
    'public.adaptive_practice_releases'
  ) is not null
  or pg_catalog.to_regclass(
    'public.adaptive_practice_attempts'
  ) is not null
  or pg_catalog.to_regclass(
    'public.adaptive_practice_answers'
  ) is not null
  or exists (
    select 1
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname in ('public', 'private')
      and procedure.proname in (
        'is_valid_grade2_number_visual_spec',
        'adaptive_hash_text',
        'get_adaptive_skill_mastery',
        'plan_adaptive_practice_transition',
        'build_adaptive_practice_response',
        'start_or_resume_adaptive_practice',
        'get_adaptive_practice_state',
        'submit_adaptive_practice_answer'
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'PLAVE_RLS_DRIFT:DRAFT_0035_0036_STATE_MISMATCH';
  end if;
end;
$precondition$;

lock table
  public.assignment_answers,
  public.assignment_submissions,
  public.classroom_memberships,
  public.classrooms,
  public.diagnostic_answers,
  public.diagnostic_attempts,
  public.grade1_diagnostic_blueprint,
  public.learning_goals,
  public.learning_units,
  public.parent_goal_suggestions,
  public.parent_student_connections,
  public.parent_student_lookup_failures,
  public.practice_answers,
  public.practice_attempts,
  public.profiles,
  public.question_solutions,
  public.questions,
  public.student_profiles,
  public.teacher_assignment_items,
  public.teacher_assignments,
  public.teacher_invitations,
  public.teacher_profiles,
  public.teacher_question_solutions,
  public.teacher_questions
in share mode;

create temporary table plave_rls_drift_table_snapshot
on commit drop
as
select
  namespace.nspname::text as schema_name,
  relation.relname::text as table_name,
  relation.relrowsecurity as rls_enabled,
  relation.relforcerowsecurity as force_rls_enabled
from pg_catalog.pg_class as relation
join pg_catalog.pg_namespace as namespace
  on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relkind in ('r', 'p');

create temporary table plave_rls_drift_count_snapshot (
  metric text primary key,
  before_count bigint not null
) on commit drop;

insert into plave_rls_drift_count_snapshot (metric, before_count)
select 'grade1_units', count(*)
from public.learning_units as unit
where unit.grade = 1
union all
select 'grade1_questions', count(*)
from public.questions as question
join public.learning_units as unit
  on unit.slug = question.unit_slug
where unit.grade = 1
union all
select 'grade1_solutions', count(*)
from public.question_solutions as solution
join public.questions as question
  on question.code = solution.question_id
join public.learning_units as unit
  on unit.slug = question.unit_slug
where unit.grade = 1
union all
select 'practice_attempts', count(*)
from public.practice_attempts
union all
select 'practice_answers', count(*)
from public.practice_answers
union all
select 'diagnostic_attempts', count(*)
from public.diagnostic_attempts
union all
select 'diagnostic_answers', count(*)
from public.diagnostic_answers
union all
select 'public_tables', count(*)
from pg_catalog.pg_class as relation
join pg_catalog.pg_namespace as namespace
  on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relkind in ('r', 'p')
union all
select 'public_tables_rls_enabled', count(*)
from pg_catalog.pg_class as relation
join pg_catalog.pg_namespace as namespace
  on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relkind in ('r', 'p')
  and relation.relrowsecurity
union all
select 'public_tables_force_rls_enabled', count(*)
from pg_catalog.pg_class as relation
join pg_catalog.pg_namespace as namespace
  on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relkind in ('r', 'p')
  and relation.relforcerowsecurity
union all
select 'draft_0035_grade2_units', count(*)
from public.learning_units as unit
where unit.slug = 'grade-2-numbers-to-1000'
union all
select 'draft_0036_tables', count(*)
from pg_catalog.pg_class as relation
join pg_catalog.pg_namespace as namespace
  on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relname in (
    'adaptive_practice_releases',
    'adaptive_practice_attempts',
    'adaptive_practice_answers'
  )
  and relation.relkind in ('r', 'p');

drop event trigger ensure_rls;
drop function public.rls_auto_enable();

create temporary table plave_rls_drift_count_after (
  metric text primary key,
  after_count bigint not null
) on commit drop;

insert into plave_rls_drift_count_after (metric, after_count)
select 'grade1_units', count(*)
from public.learning_units as unit
where unit.grade = 1
union all
select 'grade1_questions', count(*)
from public.questions as question
join public.learning_units as unit
  on unit.slug = question.unit_slug
where unit.grade = 1
union all
select 'grade1_solutions', count(*)
from public.question_solutions as solution
join public.questions as question
  on question.code = solution.question_id
join public.learning_units as unit
  on unit.slug = question.unit_slug
where unit.grade = 1
union all
select 'practice_attempts', count(*)
from public.practice_attempts
union all
select 'practice_answers', count(*)
from public.practice_answers
union all
select 'diagnostic_attempts', count(*)
from public.diagnostic_attempts
union all
select 'diagnostic_answers', count(*)
from public.diagnostic_answers
union all
select 'public_tables', count(*)
from pg_catalog.pg_class as relation
join pg_catalog.pg_namespace as namespace
  on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relkind in ('r', 'p')
union all
select 'public_tables_rls_enabled', count(*)
from pg_catalog.pg_class as relation
join pg_catalog.pg_namespace as namespace
  on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relkind in ('r', 'p')
  and relation.relrowsecurity
union all
select 'public_tables_force_rls_enabled', count(*)
from pg_catalog.pg_class as relation
join pg_catalog.pg_namespace as namespace
  on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relkind in ('r', 'p')
  and relation.relforcerowsecurity
union all
select 'draft_0035_grade2_units', count(*)
from public.learning_units as unit
where unit.slug = 'grade-2-numbers-to-1000'
union all
select 'draft_0036_tables', count(*)
from pg_catalog.pg_class as relation
join pg_catalog.pg_namespace as namespace
  on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relname in (
    'adaptive_practice_releases',
    'adaptive_practice_attempts',
    'adaptive_practice_answers'
  )
  and relation.relkind in ('r', 'p');

do $postcondition$
begin
  if exists (
    select 1
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'rls_auto_enable'
  )
  or exists (
    select 1
    from pg_catalog.pg_event_trigger as event_trigger
    where event_trigger.evtname = 'ensure_rls'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'PLAVE_RLS_DRIFT:OBJECT_REMOVAL_POSTCONDITION_FAILED';
  end if;

  if exists (
    (
      select
        snapshot.schema_name,
        snapshot.table_name,
        snapshot.rls_enabled,
        snapshot.force_rls_enabled
      from plave_rls_drift_table_snapshot as snapshot
      except
      select
        namespace.nspname::text,
        relation.relname::text,
        relation.relrowsecurity,
        relation.relforcerowsecurity
      from pg_catalog.pg_class as relation
      join pg_catalog.pg_namespace as namespace
        on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relkind in ('r', 'p')
    )
    union all
    (
      select
        namespace.nspname::text,
        relation.relname::text,
        relation.relrowsecurity,
        relation.relforcerowsecurity
      from pg_catalog.pg_class as relation
      join pg_catalog.pg_namespace as namespace
        on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relkind in ('r', 'p')
      except
      select
        snapshot.schema_name,
        snapshot.table_name,
        snapshot.rls_enabled,
        snapshot.force_rls_enabled
      from plave_rls_drift_table_snapshot as snapshot
    )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'PLAVE_RLS_DRIFT:RLS_STATE_CHANGED';
  end if;

  if exists (
    select 1
    from plave_rls_drift_count_snapshot as before_state
    full join plave_rls_drift_count_after as after_state
      on after_state.metric = before_state.metric
    where before_state.metric is null
      or after_state.metric is null
      or before_state.before_count <> after_state.after_count
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'PLAVE_RLS_DRIFT:BASELINE_COUNT_CHANGED';
  end if;

  if exists (
    select 1
    from public.learning_units as unit
    where unit.slug = 'grade-2-numbers-to-1000'
  )
  or pg_catalog.to_regclass(
    'public.adaptive_practice_releases'
  ) is not null
  or pg_catalog.to_regclass(
    'public.adaptive_practice_attempts'
  ) is not null
  or pg_catalog.to_regclass(
    'public.adaptive_practice_answers'
  ) is not null then
    raise exception using
      errcode = 'P0001',
      message = 'PLAVE_RLS_DRIFT:DRAFT_STATE_CHANGED';
  end if;
end;
$postcondition$;

select
  'REMOTE_RLS_DRIFT_REMEDIATED'::text as result,
  preserved.metric,
  preserved.before_count,
  after_state.after_count,
  'PRESERVED'::text as status
from plave_rls_drift_count_snapshot as preserved
join plave_rls_drift_count_after as after_state
  on after_state.metric = preserved.metric
union all
select
  'REMOTE_RLS_DRIFT_REMEDIATED',
  'event_trigger_ensure_rls',
  1,
  0,
  'REMOVED'
union all
select
  'REMOTE_RLS_DRIFT_REMEDIATED',
  'function_public_rls_auto_enable',
  1,
  0,
  'REMOVED'
order by metric;

commit;
