begin;

-- DRAFT ONLY — DO NOT APPLY WITHOUT A SEPARATE OWNER DATABASE APPROVAL.
-- Owner state at design time: 0035 and 0036 are DRAFT_NOT_APPLIED.
-- This draft depends on 0035 being applied first in a future isolated test.
-- It does not publish content, enable a pilot, seed attempts/answers, persist
-- retention evidence, or change the verified fixed Grade 1 practice runtime.
--
-- Architecture decision: browser and Next.js currently share a user-JWT
-- PostgREST channel; there is no private PostgreSQL driver/role. Therefore
-- every transition callable through PostgREST must validate and plan inside
-- one PostgreSQL transaction. The TypeScript planner remains the canonical
-- specification; the SQL planner requires isolated equivalence tests before
-- this draft may be approved for application.

do $precondition$
declare
  v_candidate_count integer;
  v_question_count integer;
  v_solution_count integer;
  v_existing_function_count integer;
begin
  if
    pg_catalog.to_regclass('public.adaptive_practice_releases') is not null
    or pg_catalog.to_regclass('public.adaptive_practice_attempts') is not null
    or pg_catalog.to_regclass('public.adaptive_practice_answers') is not null
  then
    raise exception 'ADAPTIVE:PRECONDITION_FAILED:TABLE_ALREADY_EXISTS';
  end if;

  select count(*)
  into v_existing_function_count
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where
    (
      namespace.nspname = 'public'
      and procedure.proname in (
        'start_or_resume_adaptive_practice',
        'get_adaptive_practice_state',
        'submit_adaptive_practice_answer'
      )
    )
    or (
      namespace.nspname = 'private'
      and procedure.proname in (
        'adaptive_hash_text',
        'get_adaptive_skill_mastery',
        'plan_adaptive_practice_transition',
        'build_adaptive_practice_response'
      )
    );

  if v_existing_function_count <> 0 then
    raise exception 'ADAPTIVE:PRECONDITION_FAILED:FUNCTION_ALREADY_EXISTS';
  end if;

  select count(*)
  into v_candidate_count
  from public.learning_units as unit
  where
    unit.slug = 'grade-2-numbers-to-1000'
    and unit.grade = 2
    and unit.total_questions = 24
    and not unit.published;

  select count(*)
  into v_question_count
  from public.questions as question
  where
    question.unit_slug = 'grade-2-numbers-to-1000'
    and not question.published;

  select count(*)
  into v_solution_count
  from public.question_solutions as solution
  join public.questions as question
    on question.code = solution.question_id
  where question.unit_slug = 'grade-2-numbers-to-1000';

  if
    v_candidate_count <> 1
    or v_question_count <> 24
    or v_solution_count <> 24
  then
    raise exception 'ADAPTIVE:PRECONDITION_FAILED:FROZEN_CANDIDATE_MISMATCH';
  end if;
end;
$precondition$;

create table public.adaptive_practice_releases (
  unit_slug text primary key
    references public.learning_units(slug) on delete restrict,
  release_candidate_id text not null unique,
  content_version text not null unique,
  release_seed text not null,
  bundle_sha256 text not null,
  policy_version text not null,
  mode text not null check (mode = 'ADAPTIVE'),
  min_questions smallint not null
    check (min_questions between 1 and 100),
  max_questions smallint not null
    check (max_questions between min_questions and 100),
  required_skill_ids text[] not null,
  minimum_evidence_per_skill smallint not null
    check (minimum_evidence_per_skill between 1 and 100),
  mastery_threshold numeric(5, 4) not null
    check (mastery_threshold > 0 and mastery_threshold <= 1),
  recent_correct_requirement smallint not null
    check (
      recent_correct_requirement between 1
      and minimum_evidence_per_skill
    ),
  runtime_enabled boolean not null default false,
  controlled_pilot_enabled boolean not null default false,
  retention_runtime_enabled boolean not null default false,
  publication_status text not null default 'DRAFT'
    check (publication_status in ('DRAFT', 'PUBLISHED', 'RETIRED')),
  student_visibility text not null default 'HIDDEN'
    check (student_visibility in ('HIDDEN', 'VISIBLE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint adaptive_release_candidate_id_check check (
    release_candidate_id = btrim(release_candidate_id)
    and release_candidate_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(release_candidate_id) between 8 and 100
  ),
  constraint adaptive_release_content_version_check check (
    content_version = btrim(content_version)
    and content_version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{4,79}$'
  ),
  constraint adaptive_release_seed_check check (
    release_seed = btrim(release_seed)
    and release_seed ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
  ),
  constraint adaptive_release_bundle_hash_check check (
    bundle_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint adaptive_release_policy_version_check check (
    policy_version = btrim(policy_version)
    and policy_version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{4,79}$'
  ),
  constraint adaptive_release_skill_coverage_check check (
    cardinality(required_skill_ids) between 1 and 16
    and array_position(required_skill_ids, null) is null
    and minimum_evidence_per_skill * cardinality(required_skill_ids)
      <= max_questions
  ),
  constraint adaptive_release_visibility_check check (
    (
      publication_status = 'DRAFT'
      and student_visibility = 'HIDDEN'
      and not runtime_enabled
      and not controlled_pilot_enabled
      and not retention_runtime_enabled
    )
    or publication_status in ('PUBLISHED', 'RETIRED')
  )
);

create table public.adaptive_practice_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null
    references public.student_profiles(user_id) on delete cascade,
  unit_slug text not null
    references public.adaptive_practice_releases(unit_slug)
    on delete restrict,
  start_idempotency_key uuid not null,
  release_candidate_id text not null,
  content_version text not null,
  bundle_sha256 text not null,
  policy_version text not null,
  planner_seed text not null,
  status text not null default 'STARTED'
    check (
      status in (
        'STARTED',
        'IN_PROGRESS',
        'MASTERED_EARLY',
        'REMEDIATION_REQUIRED',
        'MAX_REACHED',
        'ABANDONED'
      )
    ),
  revision integer not null default 0 check (revision >= 0),
  current_question_id text
    references public.questions(code) on delete restrict,
  answered_count smallint not null default 0
    check (answered_count between 0 and 100),
  correct_count smallint not null default 0
    check (correct_count between 0 and answered_count),
  min_questions smallint not null
    check (min_questions between 1 and 100),
  max_questions smallint not null
    check (max_questions between min_questions and 100),
  required_skill_ids text[] not null,
  minimum_evidence_per_skill smallint not null
    check (minimum_evidence_per_skill between 1 and 100),
  mastery_threshold numeric(5, 4) not null
    check (mastery_threshold > 0 and mastery_threshold <= 1),
  recent_correct_requirement smallint not null
    check (
      recent_correct_requirement between 1
      and minimum_evidence_per_skill
    ),
  remediation_skill_ids text[] not null default array[]::text[],
  completion_reason text
    check (
      completion_reason is null
      or completion_reason in (
        'ADAPTIVE_MASTERY_EVIDENCE_MET',
        'MASTERY_MET_AT_MAXIMUM',
        'MAXIMUM_REACHED_WITHOUT_MASTERY',
        'QUESTION_BANK_EXHAUSTED',
        'OWNER_ABANDONED'
      )
    ),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (student_id, start_idempotency_key),
  constraint adaptive_attempt_release_candidate_id_check check (
    release_candidate_id = btrim(release_candidate_id)
    and release_candidate_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(release_candidate_id) between 8 and 100
  ),
  constraint adaptive_attempt_content_version_check check (
    content_version = btrim(content_version)
    and content_version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{4,79}$'
  ),
  constraint adaptive_attempt_bundle_hash_check check (
    bundle_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint adaptive_attempt_policy_version_check check (
    policy_version = btrim(policy_version)
    and policy_version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{4,79}$'
  ),
  constraint adaptive_attempt_planner_seed_check check (
    planner_seed = btrim(planner_seed)
    and planner_seed ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
  ),
  constraint adaptive_attempt_skill_coverage_check check (
    cardinality(required_skill_ids) between 1 and 16
    and array_position(required_skill_ids, null) is null
    and minimum_evidence_per_skill * cardinality(required_skill_ids)
      <= max_questions
  ),
  constraint adaptive_attempt_remediation_check check (
    array_position(remediation_skill_ids, null) is null
  ),
  constraint adaptive_attempt_lifecycle_check check (
    (
      status = 'STARTED'
      and current_question_id is null
      and answered_count = 0
      and completed_at is null
      and completion_reason is null
      and cardinality(remediation_skill_ids) = 0
    )
    or (
      status = 'IN_PROGRESS'
      and current_question_id is not null
      and answered_count < max_questions
      and completed_at is null
      and completion_reason is null
      and cardinality(remediation_skill_ids) = 0
    )
    or (
      status in ('MASTERED_EARLY', 'MAX_REACHED')
      and current_question_id is null
      and completed_at is not null
      and completion_reason in (
        'ADAPTIVE_MASTERY_EVIDENCE_MET',
        'MASTERY_MET_AT_MAXIMUM'
      )
      and cardinality(remediation_skill_ids) = 0
    )
    or (
      status = 'REMEDIATION_REQUIRED'
      and current_question_id is null
      and completed_at is not null
      and completion_reason in (
        'MAXIMUM_REACHED_WITHOUT_MASTERY',
        'QUESTION_BANK_EXHAUSTED'
      )
      and cardinality(remediation_skill_ids) > 0
    )
    or (
      status = 'ABANDONED'
      and current_question_id is null
      and completed_at is not null
      and completion_reason = 'OWNER_ABANDONED'
    )
  )
);

create table public.adaptive_practice_answers (
  attempt_id uuid not null
    references public.adaptive_practice_attempts(id) on delete cascade,
  question_id text not null
    references public.questions(code) on delete restrict,
  submission_id uuid not null,
  evidence_sequence smallint not null
    check (evidence_sequence between 1 and 100),
  normalized_answer text not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (attempt_id, question_id),
  unique (attempt_id, submission_id),
  unique (attempt_id, evidence_sequence),
  constraint adaptive_answer_normalized_check check (
    normalized_answer = upper(btrim(normalized_answer))
    and char_length(normalized_answer) between 1 and 20
  )
);

do $table_phase_validation$
begin
  if
    pg_catalog.to_regclass('public.adaptive_practice_releases') is null
    or pg_catalog.to_regclass('public.adaptive_practice_attempts') is null
    or pg_catalog.to_regclass('public.adaptive_practice_answers') is null
  then
    raise exception 'ADAPTIVE:TABLE_PHASE_INCOMPLETE';
  end if;
end;
$table_phase_validation$;

insert into public.adaptive_practice_releases (
  unit_slug,
  release_candidate_id,
  content_version,
  release_seed,
  bundle_sha256,
  policy_version,
  mode,
  min_questions,
  max_questions,
  required_skill_ids,
  minimum_evidence_per_skill,
  mastery_threshold,
  recent_correct_requirement,
  runtime_enabled,
  controlled_pilot_enabled,
  retention_runtime_enabled,
  publication_status,
  student_visibility
)
select
  unit.slug,
  'g2-numbers-to-1000-rc1',
  'g2n1000-1.0.0-rc.1',
  'g2-review-number-language',
  '1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530',
  'g2n1000-adaptive-policy-1.0.0-pilot',
  'ADAPTIVE',
  12,
  24,
  array[
    'NUMBER_RECOGNITION_TO_1000',
    'READ_WRITE_TO_1000',
    'PLACE_VALUE_TO_1000',
    'SEQUENCE_TO_1000'
  ]::text[],
  2,
  0.75,
  2,
  false,
  false,
  false,
  'DRAFT',
  'HIDDEN'
from public.learning_units as unit
where unit.slug = 'grade-2-numbers-to-1000'
  and unit.grade = 2
  and unit.total_questions = 24
  and not unit.published;

create unique index adaptive_attempts_one_active_idx
  on public.adaptive_practice_attempts (
    student_id,
    unit_slug,
    content_version
  )
  where status in ('STARTED', 'IN_PROGRESS');

create index adaptive_attempts_student_started_idx
  on public.adaptive_practice_attempts (student_id, started_at desc);

create index adaptive_answers_attempt_sequence_idx
  on public.adaptive_practice_answers (
    attempt_id,
    evidence_sequence desc
  );

alter table public.adaptive_practice_releases enable row level security;
alter table public.adaptive_practice_attempts enable row level security;
alter table public.adaptive_practice_answers enable row level security;
alter table public.adaptive_practice_releases force row level security;
alter table public.adaptive_practice_attempts force row level security;
alter table public.adaptive_practice_answers force row level security;

revoke all on table public.adaptive_practice_releases from public;
revoke all on table public.adaptive_practice_releases from anon;
revoke all on table public.adaptive_practice_releases from authenticated;
revoke all on table public.adaptive_practice_attempts from public;
revoke all on table public.adaptive_practice_attempts from anon;
revoke all on table public.adaptive_practice_attempts from authenticated;
revoke all on table public.adaptive_practice_answers from public;
revoke all on table public.adaptive_practice_answers from anon;
revoke all on table public.adaptive_practice_answers from authenticated;

create policy adaptive_practice_attempts_select_own
on public.adaptive_practice_attempts
for select
to authenticated
using (student_id = auth.uid());

create policy adaptive_practice_answers_select_own
on public.adaptive_practice_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.adaptive_practice_attempts as attempt
    where attempt.id = adaptive_practice_answers.attempt_id
      and attempt.student_id = auth.uid()
  )
);

create or replace function private.adaptive_hash_text(
  p_value text
)
returns bigint
language plpgsql
immutable
strict
security invoker
set search_path = ''
as $$
declare
  v_hash bigint := 2166136261;
  v_index integer;
begin
  for v_index in 1..char_length(p_value) loop
    v_hash := (
      (v_hash # ascii(substr(p_value, v_index, 1))) * 16777619
    ) & 4294967295;
  end loop;
  return v_hash;
end;
$$;

revoke all on function private.adaptive_hash_text(text) from public;
revoke all on function private.adaptive_hash_text(text) from anon;
revoke all on function private.adaptive_hash_text(text)
  from authenticated;

create or replace function private.get_adaptive_skill_mastery(
  p_attempt_id uuid
)
returns table (
  skill_family_id text,
  skill_ordinal bigint,
  evidence_count bigint,
  correct_count bigint,
  accuracy numeric,
  recent_total_count bigint,
  recent_correct_count bigint,
  mastered boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    required_skill.skill_family_id,
    required_skill.skill_ordinal,
    coalesce(evidence_stats.evidence_count, 0),
    coalesce(evidence_stats.correct_count, 0),
    case
      when coalesce(evidence_stats.evidence_count, 0) = 0 then null
      else
        evidence_stats.correct_count::numeric
        / evidence_stats.evidence_count::numeric
    end,
    coalesce(recent_stats.recent_total_count, 0),
    coalesce(recent_stats.recent_correct_count, 0),
    (
      coalesce(evidence_stats.evidence_count, 0)
        >= attempt.minimum_evidence_per_skill
      and
        evidence_stats.correct_count::numeric
        / nullif(evidence_stats.evidence_count, 0)::numeric
        >= attempt.mastery_threshold
      and coalesce(recent_stats.recent_total_count, 0)
        = attempt.recent_correct_requirement
      and coalesce(recent_stats.recent_correct_count, 0)
        = attempt.recent_correct_requirement
    )
  from public.adaptive_practice_attempts as attempt
  cross join lateral unnest(attempt.required_skill_ids)
    with ordinality as required_skill(
      skill_family_id,
      skill_ordinal
    )
  left join lateral (
    select
      count(*) as evidence_count,
      count(*) filter (where answer.is_correct) as correct_count
    from public.adaptive_practice_answers as answer
    join public.questions as question
      on question.code = answer.question_id
    where answer.attempt_id = attempt.id
      and question.skill_code = required_skill.skill_family_id
  ) as evidence_stats on true
  left join lateral (
    select
      count(*) as recent_total_count,
      count(*) filter (where recent_answer.is_correct)
        as recent_correct_count
    from (
      select answer.is_correct
      from public.adaptive_practice_answers as answer
      join public.questions as question
        on question.code = answer.question_id
      where answer.attempt_id = attempt.id
        and question.skill_code = required_skill.skill_family_id
      order by answer.evidence_sequence desc
      limit attempt.recent_correct_requirement
    ) as recent_answer
  ) as recent_stats on true
  where attempt.id = p_attempt_id
$$;

revoke all on function private.get_adaptive_skill_mastery(uuid)
  from public;
revoke all on function private.get_adaptive_skill_mastery(uuid)
  from anon;
revoke all on function private.get_adaptive_skill_mastery(uuid)
  from authenticated;

create or replace function private.plan_adaptive_practice_transition(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_attempt public.adaptive_practice_attempts%rowtype;
  v_evidence_count bigint := 0;
  v_all_mastered boolean := false;
  v_unmastered_count bigint := 0;
  v_repeated_recent_skill text;
  v_target_skill text;
  v_next_question_id text;
  v_remediation_skill_ids text[] := array[]::text[];
begin
  select attempt.*
  into v_attempt
  from public.adaptive_practice_attempts as attempt
  where attempt.id = p_attempt_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'ADAPTIVE:INTEGRITY_FAILURE';
  end if;

  select count(*)
  into v_evidence_count
  from public.adaptive_practice_answers as answer
  where answer.attempt_id = p_attempt_id;

  select
    coalesce(bool_and(mastery.mastered), false),
    count(*) filter (where not mastery.mastered)
  into
    v_all_mastered,
    v_unmastered_count
  from private.get_adaptive_skill_mastery(p_attempt_id) as mastery;

  if v_evidence_count >= v_attempt.max_questions then
    if v_all_mastered then
      return jsonb_build_object(
        'action', 'TERMINAL',
        'status', 'MAX_REACHED',
        'completion_reason', 'MASTERY_MET_AT_MAXIMUM',
        'remediation_skill_ids', jsonb_build_array()
      );
    end if;

    select coalesce(
      array_agg(
        mastery.skill_family_id
        order by mastery.skill_ordinal
      ) filter (where not mastery.mastered),
      array[]::text[]
    )
    into v_remediation_skill_ids
    from private.get_adaptive_skill_mastery(p_attempt_id) as mastery;

    return jsonb_build_object(
      'action', 'TERMINAL',
      'status', 'REMEDIATION_REQUIRED',
      'completion_reason', 'MAXIMUM_REACHED_WITHOUT_MASTERY',
      'remediation_skill_ids', to_jsonb(v_remediation_skill_ids)
    );
  end if;

  select mastery.skill_family_id
  into v_target_skill
  from private.get_adaptive_skill_mastery(p_attempt_id) as mastery
  where mastery.evidence_count
      < v_attempt.minimum_evidence_per_skill
    and exists (
      select 1
      from public.questions as question
      where question.unit_slug = v_attempt.unit_slug
        and question.published
        and question.skill_code = mastery.skill_family_id
        and not exists (
          select 1
          from public.adaptive_practice_answers as answer
          where answer.attempt_id = p_attempt_id
            and answer.question_id = question.code
        )
    )
  order by
    mastery.evidence_count,
    mastery.skill_ordinal
  limit 1;

  if v_target_skill is null
    and v_evidence_count >= v_attempt.min_questions
    and v_all_mastered
  then
    return jsonb_build_object(
      'action', 'TERMINAL',
      'status', 'MASTERED_EARLY',
      'completion_reason', 'ADAPTIVE_MASTERY_EVIDENCE_MET',
      'remediation_skill_ids', jsonb_build_array()
    );
  end if;

  if v_target_skill is null and v_all_mastered then
    select mastery.skill_family_id
    into v_target_skill
    from private.get_adaptive_skill_mastery(p_attempt_id) as mastery
    where exists (
      select 1
      from public.questions as question
      where question.unit_slug = v_attempt.unit_slug
        and question.published
        and question.skill_code = mastery.skill_family_id
        and not exists (
          select 1
          from public.adaptive_practice_answers as answer
          where answer.attempt_id = p_attempt_id
            and answer.question_id = question.code
        )
    )
    order by
      mastery.evidence_count,
      mastery.skill_ordinal
    limit 1;
  end if;

  if v_target_skill is null then
    select case
      when count(*) = 2
        and count(distinct recent_skill.skill_family_id) = 1
      then min(recent_skill.skill_family_id)
      else null
    end
    into v_repeated_recent_skill
    from (
      select question.skill_code as skill_family_id
      from public.adaptive_practice_answers as answer
      join public.questions as question
        on question.code = answer.question_id
      where answer.attempt_id = p_attempt_id
      order by answer.evidence_sequence desc
      limit 2
    ) as recent_skill;

    if v_unmastered_count < 2 then
      v_repeated_recent_skill := null;
    end if;

    select mastery.skill_family_id
    into v_target_skill
    from private.get_adaptive_skill_mastery(p_attempt_id) as mastery
    where not mastery.mastered
      and exists (
        select 1
        from public.questions as question
        where question.unit_slug = v_attempt.unit_slug
          and question.published
          and question.skill_code = mastery.skill_family_id
          and not exists (
            select 1
            from public.adaptive_practice_answers as answer
            where answer.attempt_id = p_attempt_id
              and answer.question_id = question.code
          )
      )
    order by
      case
        when mastery.skill_family_id = v_repeated_recent_skill
          then 1
        else 0
      end,
      mastery.accuracy nulls first,
      mastery.evidence_count,
      mastery.skill_ordinal
    limit 1;
  end if;

  if v_target_skill is not null then
    select question.code
    into v_next_question_id
    from public.questions as question
    where question.unit_slug = v_attempt.unit_slug
      and question.published
      and question.skill_code = v_target_skill
      and not exists (
        select 1
        from public.adaptive_practice_answers as answer
        where answer.attempt_id = p_attempt_id
          and answer.question_id = question.code
      )
    order by
      private.adaptive_hash_text(
        v_attempt.planner_seed
        || ':' || v_evidence_count::text
        || ':' || question.code
      ),
      question.display_order,
      question.code
    limit 1;
  end if;

  if v_next_question_id is not null then
    return jsonb_build_object(
      'action', 'SELECT_QUESTION',
      'status', 'IN_PROGRESS',
      'next_question_id', v_next_question_id,
      'remediation_skill_ids', jsonb_build_array()
    );
  end if;

  select coalesce(
    array_agg(
      mastery.skill_family_id
      order by mastery.skill_ordinal
    ) filter (where not mastery.mastered),
    v_attempt.required_skill_ids
  )
  into v_remediation_skill_ids
  from private.get_adaptive_skill_mastery(p_attempt_id) as mastery;

  return jsonb_build_object(
    'action', 'TERMINAL',
    'status', 'REMEDIATION_REQUIRED',
    'completion_reason', 'QUESTION_BANK_EXHAUSTED',
    'remediation_skill_ids', to_jsonb(v_remediation_skill_ids)
  );
end;
$$;

revoke all on function private.plan_adaptive_practice_transition(uuid)
  from public;
revoke all on function private.plan_adaptive_practice_transition(uuid)
  from anon;
revoke all on function private.plan_adaptive_practice_transition(uuid)
  from authenticated;

create or replace function private.build_adaptive_practice_response(
  p_attempt_id uuid,
  p_feedback jsonb
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
      'attempt_id', attempt.id,
      'unit_slug', attempt.unit_slug,
      'content_version', attempt.content_version,
      'status', attempt.status,
      'revision', attempt.revision,
      'answered_count', attempt.answered_count,
      'current_question',
        case
          when question.code is null then null
          else jsonb_build_object(
            'question_id', question.code,
            'prompt', question.prompt,
            'answer_type', question.question_type,
            'options', question.options,
            'visual', question.visual_spec,
            'accessibility_description',
              question.visual_spec ->> 'description',
            'skill_family_id', question.skill_code,
            'difficulty', question.difficulty,
            'display_order', question.display_order
          )
        end,
      'remediation_skill_ids', to_jsonb(
        attempt.remediation_skill_ids
      ),
      'completed_at', attempt.completed_at,
      'feedback', p_feedback
  )
  from public.adaptive_practice_attempts as attempt
  left join public.questions as question
    on question.code = attempt.current_question_id
  where attempt.id = p_attempt_id
$$;

revoke all on function private.build_adaptive_practice_response(
  uuid,
  jsonb
) from public;
revoke all on function private.build_adaptive_practice_response(
  uuid,
  jsonb
) from anon;
revoke all on function private.build_adaptive_practice_response(
  uuid,
  jsonb
) from authenticated;

create or replace function public.start_or_resume_adaptive_practice(
  p_unit_slug text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_student_count bigint := 0;
  v_student_grade smallint;
  v_release public.adaptive_practice_releases%rowtype;
  v_attempt_id uuid;
  v_decision jsonb;
  v_next_question_id text;
begin
  begin
    if v_current_user_id is null then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:UNAUTHENTICATED';
    end if;
    if p_idempotency_key is null then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:INVALID_ANSWER';
    end if;

    select
      count(*),
      max(student.grade)
    into
      v_student_count,
      v_student_grade
    from public.profiles as profile
    join public.student_profiles as student
      on student.user_id = profile.user_id
    where profile.user_id = v_current_user_id
      and profile.role = 'STUDENT'
      and profile.onboarding_completed;

    if v_student_count <> 1 or v_student_grade <> 2 then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:FORBIDDEN';
    end if;

    select release.*
    into v_release
    from public.adaptive_practice_releases as release
    join public.learning_units as unit
      on unit.slug = release.unit_slug
    where release.unit_slug = lower(btrim(coalesce(p_unit_slug, '')))
      and unit.grade = v_student_grade
      and unit.published
      and release.runtime_enabled
      and release.controlled_pilot_enabled
      and release.publication_status = 'PUBLISHED'
      and release.student_visibility = 'VISIBLE';

    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:UNIT_NOT_AVAILABLE';
    end if;

    perform pg_advisory_xact_lock(
      hashtextextended(
        v_current_user_id::text
        || ':' || v_release.unit_slug
        || ':' || v_release.content_version,
        0
      )
    );

    select attempt.id
    into v_attempt_id
    from public.adaptive_practice_attempts as attempt
    where attempt.student_id = v_current_user_id
      and attempt.start_idempotency_key = p_idempotency_key
    limit 1;

    if v_attempt_id is not null then
      return private.build_adaptive_practice_response(
        v_attempt_id,
        null
      );
    end if;

    select attempt.id
    into v_attempt_id
    from public.adaptive_practice_attempts as attempt
    where attempt.student_id = v_current_user_id
      and attempt.unit_slug = v_release.unit_slug
      and attempt.content_version = v_release.content_version
      and attempt.status in ('STARTED', 'IN_PROGRESS')
    order by attempt.started_at desc, attempt.id desc
    limit 1
    for update;

    if v_attempt_id is not null then
      return private.build_adaptive_practice_response(
        v_attempt_id,
        null
      );
    end if;

    v_attempt_id := extensions.gen_random_uuid();

    insert into public.adaptive_practice_attempts (
      id,
      student_id,
      unit_slug,
      start_idempotency_key,
      release_candidate_id,
      content_version,
      bundle_sha256,
      policy_version,
      planner_seed,
      status,
      revision,
      min_questions,
      max_questions,
      required_skill_ids,
      minimum_evidence_per_skill,
      mastery_threshold,
      recent_correct_requirement
    )
    values (
      v_attempt_id,
      v_current_user_id,
      v_release.unit_slug,
      p_idempotency_key,
      v_release.release_candidate_id,
      v_release.content_version,
      v_release.bundle_sha256,
      v_release.policy_version,
      v_attempt_id::text,
      'STARTED',
      0,
      v_release.min_questions,
      v_release.max_questions,
      v_release.required_skill_ids,
      v_release.minimum_evidence_per_skill,
      v_release.mastery_threshold,
      v_release.recent_correct_requirement
    );

    v_decision :=
      private.plan_adaptive_practice_transition(v_attempt_id);
    if v_decision ->> 'action' <> 'SELECT_QUESTION' then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:INTEGRITY_FAILURE';
    end if;
    v_next_question_id := v_decision ->> 'next_question_id';

    update public.adaptive_practice_attempts as attempt
    set
      status = 'IN_PROGRESS',
      revision = 1,
      current_question_id = v_next_question_id,
      updated_at = now()
    where attempt.id = v_attempt_id
      and attempt.student_id = v_current_user_id
      and attempt.status = 'STARTED'
      and attempt.revision = 0;

    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:INTEGRITY_FAILURE';
    end if;

    return private.build_adaptive_practice_response(
      v_attempt_id,
      null
    );
  exception
    when others then
      if left(sqlerrm, 9) = 'ADAPTIVE:' then
        raise;
      end if;
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:INTEGRITY_FAILURE';
  end;
end;
$$;

revoke all on function public.start_or_resume_adaptive_practice(
  text,
  uuid
) from public;
revoke all on function public.start_or_resume_adaptive_practice(
  text,
  uuid
) from anon;
grant execute on function public.start_or_resume_adaptive_practice(
  text,
  uuid
) to authenticated;

create or replace function public.get_adaptive_practice_state(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_attempt_id uuid;
begin
  begin
    if v_current_user_id is null then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:UNAUTHENTICATED';
    end if;

    select attempt.id
    into v_attempt_id
    from public.adaptive_practice_attempts as attempt
    where attempt.id = p_attempt_id
      and attempt.student_id = v_current_user_id;

    if v_attempt_id is null then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:ATTEMPT_NOT_FOUND';
    end if;

    return private.build_adaptive_practice_response(
      v_attempt_id,
      null
    );
  exception
    when others then
      if left(sqlerrm, 9) = 'ADAPTIVE:' then
        raise;
      end if;
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:INTEGRITY_FAILURE';
  end;
end;
$$;

revoke all on function public.get_adaptive_practice_state(uuid)
  from public;
revoke all on function public.get_adaptive_practice_state(uuid)
  from anon;
grant execute on function public.get_adaptive_practice_state(uuid)
  to authenticated;

create or replace function public.submit_adaptive_practice_answer(
  p_attempt_id uuid,
  p_question_id text,
  p_answer text,
  p_expected_revision integer,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_student_count bigint := 0;
  v_attempt public.adaptive_practice_attempts%rowtype;
  v_existing public.adaptive_practice_answers%rowtype;
  v_question_type text;
  v_normalized_answer text;
  v_correct_answer text;
  v_solution_steps jsonb;
  v_explanation text;
  v_hint text;
  v_is_correct boolean;
  v_decision jsonb;
  v_new_status text;
  v_next_question_id text;
  v_completion_reason text;
  v_remediation_skill_ids text[] := array[]::text[];
  v_answered_count bigint := 0;
  v_correct_count bigint := 0;
  v_feedback jsonb;
begin
  begin
    if v_current_user_id is null then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:UNAUTHENTICATED';
    end if;
    if
      p_attempt_id is null
      or p_idempotency_key is null
      or p_expected_revision is null
      or p_expected_revision < 0
    then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:INVALID_ANSWER';
    end if;

    select count(*)
    into v_student_count
    from public.profiles as profile
    join public.student_profiles as student
      on student.user_id = profile.user_id
    where profile.user_id = v_current_user_id
      and profile.role = 'STUDENT'
      and profile.onboarding_completed
      and student.grade = 2;

    if v_student_count <> 1 then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:FORBIDDEN';
    end if;

    select attempt.*
    into v_attempt
    from public.adaptive_practice_attempts as attempt
    where attempt.id = p_attempt_id
      and attempt.student_id = v_current_user_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:ATTEMPT_NOT_FOUND';
    end if;

    if not exists (
      select 1
      from public.adaptive_practice_releases as release
      join public.learning_units as unit
        on unit.slug = release.unit_slug
      where release.unit_slug = v_attempt.unit_slug
        and release.release_candidate_id
          = v_attempt.release_candidate_id
        and release.content_version = v_attempt.content_version
        and release.bundle_sha256 = v_attempt.bundle_sha256
        and release.policy_version = v_attempt.policy_version
        and release.runtime_enabled
        and release.controlled_pilot_enabled
        and release.publication_status = 'PUBLISHED'
        and release.student_visibility = 'VISIBLE'
        and unit.published
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:CONTENT_VERSION_MISMATCH';
    end if;

    select
      question.question_type,
      solution.correct_answer,
      solution.solution_steps,
      solution.explanation,
      solution.hint
    into
      v_question_type,
      v_correct_answer,
      v_solution_steps,
      v_explanation,
      v_hint
    from public.questions as question
    join public.question_solutions as solution
      on solution.question_id = question.code
    where question.code = p_question_id
      and question.unit_slug = v_attempt.unit_slug
      and question.published;

    if v_question_type is null then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:QUESTION_MISMATCH';
    end if;
    if p_answer is null or char_length(p_answer) not between 1 and 20 then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:INVALID_ANSWER';
    end if;

    if v_question_type = 'MULTIPLE_CHOICE' then
      v_normalized_answer := upper(btrim(p_answer));
      if v_normalized_answer !~ '^[A-D]$' then
        raise exception using
          errcode = 'P0001',
          message = 'ADAPTIVE:INVALID_ANSWER';
      end if;
    elsif v_question_type = 'NUMBER_INPUT' then
      v_normalized_answer := btrim(p_answer);
      if v_normalized_answer !~ '^(0|[1-9][0-9]{0,5})$' then
        raise exception using
          errcode = 'P0001',
          message = 'ADAPTIVE:INVALID_ANSWER';
      end if;
      v_normalized_answer := v_normalized_answer::integer::text;
    else
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:INTEGRITY_FAILURE';
    end if;

    select answer.*
    into v_existing
    from public.adaptive_practice_answers as answer
    where answer.attempt_id = p_attempt_id
      and answer.submission_id = p_idempotency_key;

    if found then
      if
        v_existing.question_id <> p_question_id
        or v_existing.normalized_answer <> v_normalized_answer
      then
        raise exception using
          errcode = 'P0001',
          message = 'ADAPTIVE:DUPLICATE_SUBMISSION';
      end if;

      v_feedback := jsonb_build_object(
        'question_id', p_question_id,
        'is_correct', v_existing.is_correct,
        'correct_answer', v_correct_answer,
        'solution_steps', v_solution_steps,
        'explanation', v_explanation,
        'hint', v_hint
      );
      return private.build_adaptive_practice_response(
        p_attempt_id,
        v_feedback
      );
    end if;

    if v_attempt.status <> 'IN_PROGRESS' then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:ATTEMPT_NOT_ACTIVE';
    end if;
    if v_attempt.revision <> p_expected_revision then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:REVISION_CONFLICT';
    end if;
    if v_attempt.current_question_id <> p_question_id then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:QUESTION_MISMATCH';
    end if;

    v_is_correct := v_normalized_answer = v_correct_answer;

    insert into public.adaptive_practice_answers (
      attempt_id,
      question_id,
      submission_id,
      evidence_sequence,
      normalized_answer,
      is_correct
    )
    values (
      p_attempt_id,
      p_question_id,
      p_idempotency_key,
      (v_attempt.answered_count + 1)::smallint,
      v_normalized_answer,
      v_is_correct
    );

    select
      count(*),
      count(*) filter (where answer.is_correct)
    into
      v_answered_count,
      v_correct_count
    from public.adaptive_practice_answers as answer
    where answer.attempt_id = p_attempt_id;

    if
      v_answered_count <> v_attempt.answered_count + 1
      or v_answered_count > v_attempt.max_questions
    then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:INTEGRITY_FAILURE';
    end if;

    v_decision :=
      private.plan_adaptive_practice_transition(p_attempt_id);
    v_new_status := v_decision ->> 'status';
    v_next_question_id := v_decision ->> 'next_question_id';
    v_completion_reason := v_decision ->> 'completion_reason';
    select coalesce(array_agg(value), array[]::text[])
    into v_remediation_skill_ids
    from jsonb_array_elements_text(
      coalesce(
        v_decision -> 'remediation_skill_ids',
        jsonb_build_array()
      )
    ) as remediation(value);

    update public.adaptive_practice_attempts as attempt
    set
      status = v_new_status,
      revision = attempt.revision + 1,
      current_question_id = v_next_question_id,
      answered_count = v_answered_count::smallint,
      correct_count = v_correct_count::smallint,
      remediation_skill_ids = v_remediation_skill_ids,
      completion_reason = v_completion_reason,
      completed_at = case
        when v_new_status = 'IN_PROGRESS' then null
        else now()
      end,
      updated_at = now()
    where attempt.id = p_attempt_id
      and attempt.student_id = v_current_user_id
      and attempt.status = 'IN_PROGRESS'
      and attempt.revision = p_expected_revision;

    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:REVISION_CONFLICT';
    end if;

    v_feedback := jsonb_build_object(
      'question_id', p_question_id,
      'is_correct', v_is_correct,
      'correct_answer', v_correct_answer,
      'solution_steps', v_solution_steps,
      'explanation', v_explanation,
      'hint', v_hint
    );

    return private.build_adaptive_practice_response(
      p_attempt_id,
      v_feedback
    );
  exception
    when unique_violation then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:INTEGRITY_FAILURE';
    when others then
      if left(sqlerrm, 9) = 'ADAPTIVE:' then
        raise;
      end if;
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:INTEGRITY_FAILURE';
  end;
end;
$$;

revoke all on function public.submit_adaptive_practice_answer(
  uuid,
  text,
  text,
  integer,
  uuid
) from public;
revoke all on function public.submit_adaptive_practice_answer(
  uuid,
  text,
  text,
  integer,
  uuid
) from anon;
grant execute on function public.submit_adaptive_practice_answer(
  uuid,
  text,
  text,
  integer,
  uuid
) to authenticated;

comment on table public.adaptive_practice_releases is
  'DRAFT fail-closed release/policy binding. All activation flags are false.';
comment on table public.adaptive_practice_attempts is
  'DRAFT adaptive runtime state, version-bound and separate from Grade 1 fixed attempts.';
comment on table public.adaptive_practice_answers is
  'DRAFT immutable graded evidence with question/submission/sequence uniqueness.';
comment on function public.start_or_resume_adaptive_practice(text, uuid) is
  'DRAFT atomic start/resume. Direct PostgREST calls remain fail-closed.';
comment on function public.submit_adaptive_practice_answer(
  uuid,
  text,
  text,
  integer,
  uuid
) is
  'DRAFT atomic grade/evidence/plan/CAS transition; never trusts client scoring or terminal state.';

do $validation$
declare
  v_table_count bigint := 0;
  v_rls_count bigint := 0;
  v_browser_table_grants bigint := 0;
  v_public_function_count bigint := 0;
  v_private_function_count bigint := 0;
  v_secure_function_count bigint := 0;
  v_authenticated_execute_count bigint := 0;
  v_release_count bigint := 0;
  v_old_start_definition text;
  v_old_submit_definition text;
begin
  select count(*)
  into v_table_count
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relname in (
      'adaptive_practice_releases',
      'adaptive_practice_attempts',
      'adaptive_practice_answers'
    )
    and relation.relkind = 'r';

  select count(*)
  into v_rls_count
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relname in (
      'adaptive_practice_releases',
      'adaptive_practice_attempts',
      'adaptive_practice_answers'
    )
    and relation.relrowsecurity
    and relation.relforcerowsecurity;

  select count(*)
  into v_browser_table_grants
  from information_schema.role_table_grants as table_grant
  where table_grant.table_schema = 'public'
    and table_grant.table_name in (
      'adaptive_practice_releases',
      'adaptive_practice_attempts',
      'adaptive_practice_answers'
    )
    and table_grant.grantee in ('PUBLIC', 'anon', 'authenticated');

  select count(*)
  into v_public_function_count
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname in (
      'start_or_resume_adaptive_practice',
      'get_adaptive_practice_state',
      'submit_adaptive_practice_answer'
    );

  select count(*)
  into v_private_function_count
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'private'
    and procedure.proname in (
      'adaptive_hash_text',
      'get_adaptive_skill_mastery',
      'plan_adaptive_practice_transition',
      'build_adaptive_practice_response'
    );

  select count(*)
  into v_secure_function_count
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where (
      namespace.nspname = 'public'
      and procedure.proname in (
        'start_or_resume_adaptive_practice',
        'get_adaptive_practice_state',
        'submit_adaptive_practice_answer'
      )
      and procedure.prosecdef
    )
    or (
      namespace.nspname = 'private'
      and procedure.proname in (
        'adaptive_hash_text',
        'get_adaptive_skill_mastery',
        'plan_adaptive_practice_transition',
        'build_adaptive_practice_response'
      )
      and not procedure.prosecdef
    );

  select count(*)
  into v_authenticated_execute_count
  from (
    values
      ('public.start_or_resume_adaptive_practice(text,uuid)'),
      ('public.get_adaptive_practice_state(uuid)'),
      ('public.submit_adaptive_practice_answer(uuid,text,text,integer,uuid)')
  ) as expected(signature)
  where has_function_privilege(
    'authenticated',
    expected.signature,
    'EXECUTE'
  )
    and not has_function_privilege(
      'anon',
      expected.signature,
      'EXECUTE'
    );

  select count(*)
  into v_release_count
  from public.adaptive_practice_releases as release
  where release.unit_slug = 'grade-2-numbers-to-1000'
    and release.release_candidate_id = 'g2-numbers-to-1000-rc1'
    and release.content_version = 'g2n1000-1.0.0-rc.1'
    and release.bundle_sha256 =
      '1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530'
    and release.policy_version =
      'g2n1000-adaptive-policy-1.0.0-pilot'
    and release.min_questions = 12
    and release.max_questions = 24
    and not release.runtime_enabled
    and not release.controlled_pilot_enabled
    and not release.retention_runtime_enabled
    and release.publication_status = 'DRAFT'
    and release.student_visibility = 'HIDDEN';

  select pg_get_functiondef(
    'public.start_or_resume_practice(text)'::regprocedure
  )
  into v_old_start_definition;
  select pg_get_functiondef(
    'public.submit_practice_answer(uuid,text,text)'::regprocedure
  )
  into v_old_submit_definition;

  if
    v_table_count <> 3
    or v_rls_count <> 3
    or v_browser_table_grants <> 0
    or v_public_function_count <> 3
    or v_private_function_count <> 4
    or v_secure_function_count <> 7
    or v_authenticated_execute_count <> 3
    or v_release_count <> 1
    or v_old_start_definition not like '%public.practice_attempts%'
    or v_old_start_definition like '%adaptive_practice_attempts%'
    or v_old_submit_definition not like '%public.practice_answers%'
    or v_old_submit_definition like '%adaptive_practice_answers%'
  then
    raise exception 'Adaptive runtime draft validation failed';
  end if;

  if exists (
    select 1
    from public.adaptive_practice_attempts
  ) or exists (
    select 1
    from public.adaptive_practice_answers
  ) then
    raise exception 'Adaptive runtime draft must not seed attempts or answers';
  end if;

  if
    has_table_privilege(
      'anon',
      'public.question_solutions',
      'SELECT'
    )
    or has_table_privilege(
      'authenticated',
      'public.question_solutions',
      'SELECT'
    )
  then
    raise exception 'Browser role can directly read question_solutions';
  end if;
end;
$validation$;

commit;
