begin;

-- DRAFT ONLY — DO NOT APPLY WITHOUT A SEPARATE OWNER DATABASE APPROVAL.
-- Sprint 6J proves that the user-JWT PostgREST channel needs a database-side
-- membership check. A server-only environment allowlist protects PLAVE
-- routes, but cannot by itself protect an authenticated direct RPC call.
--
-- This migration does not add a pilot member, activate a release, publish a
-- unit/question, create an attempt/answer, or change Grade 1/history data.

do $precondition$
declare
  v_release_count bigint := 0;
  v_unit_count bigint := 0;
  v_question_count bigint := 0;
  v_solution_count bigint := 0;
  v_adaptive_attempt_count bigint := 0;
  v_adaptive_answer_count bigint := 0;
begin
  if
    pg_catalog.to_regclass('public.adaptive_practice_releases') is null
    or pg_catalog.to_regclass('public.adaptive_practice_attempts') is null
    or pg_catalog.to_regclass('public.adaptive_practice_answers') is null
  then
    raise exception 'PILOT:PRECONDITION_FAILED:0036_SCHEMA_REQUIRED';
  end if;

  if
    pg_catalog.to_regclass('public.adaptive_practice_pilot_members') is not null
    or pg_catalog.to_regprocedure(
      'public.get_adaptive_controlled_pilot_availability(text)'
    ) is not null
    or pg_catalog.to_regprocedure(
      'private.is_adaptive_controlled_pilot_member(uuid,text,text,text,text,text)'
    ) is not null
  then
    raise exception 'PILOT:PRECONDITION_FAILED:OBJECT_ALREADY_EXISTS';
  end if;

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
    and release.publication_status = 'DRAFT'
    and release.student_visibility = 'HIDDEN'
    and not release.runtime_enabled
    and not release.controlled_pilot_enabled
    and not release.retention_runtime_enabled;

  select count(*)
  into v_unit_count
  from public.learning_units as unit
  where unit.slug = 'grade-2-numbers-to-1000'
    and unit.grade = 2
    and unit.total_questions = 24
    and not unit.published;

  select count(*)
  into v_question_count
  from public.questions as question
  where question.unit_slug = 'grade-2-numbers-to-1000'
    and not question.published;

  select count(*)
  into v_solution_count
  from public.question_solutions as solution
  join public.questions as question
    on question.code = solution.question_id
  where question.unit_slug = 'grade-2-numbers-to-1000';

  select count(*)
  into v_adaptive_attempt_count
  from public.adaptive_practice_attempts;

  select count(*)
  into v_adaptive_answer_count
  from public.adaptive_practice_answers;

  if
    v_release_count <> 1
    or v_unit_count <> 1
    or v_question_count <> 24
    or v_solution_count <> 24
    or v_adaptive_attempt_count <> 0
    or v_adaptive_answer_count <> 0
  then
    raise exception 'PILOT:PRECONDITION_FAILED:FROZEN_STATE_MISMATCH';
  end if;
end;
$precondition$;

alter table public.adaptive_practice_releases
  drop constraint adaptive_release_visibility_check;

alter table public.adaptive_practice_releases
  add constraint adaptive_release_visibility_check check (
    (
      publication_status = 'DRAFT'
      and student_visibility = 'HIDDEN'
      and runtime_enabled = controlled_pilot_enabled
      and not retention_runtime_enabled
    )
    or publication_status in ('PUBLISHED', 'RETIRED')
  );

create table public.adaptive_practice_pilot_members (
  student_id uuid not null
    references public.student_profiles(user_id) on delete restrict,
  unit_slug text not null
    references public.adaptive_practice_releases(unit_slug)
    on delete restrict,
  release_candidate_id text not null,
  content_version text not null,
  bundle_sha256 text not null,
  policy_version text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, unit_slug),
  constraint adaptive_pilot_member_bundle_hash_check check (
    bundle_sha256 ~ '^[0-9a-f]{64}$'
  )
);

alter table public.adaptive_practice_pilot_members
  enable row level security;
alter table public.adaptive_practice_pilot_members
  force row level security;

revoke all on table public.adaptive_practice_pilot_members from public;
revoke all on table public.adaptive_practice_pilot_members from anon;
revoke all on table public.adaptive_practice_pilot_members
  from authenticated;

create or replace function private.is_adaptive_controlled_pilot_member(
  p_student_id uuid,
  p_unit_slug text,
  p_release_candidate_id text,
  p_content_version text,
  p_bundle_sha256 text,
  p_policy_version text
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.adaptive_practice_pilot_members as member
    where member.student_id = p_student_id
      and member.unit_slug = p_unit_slug
      and member.release_candidate_id = p_release_candidate_id
      and member.content_version = p_content_version
      and member.bundle_sha256 = p_bundle_sha256
      and member.policy_version = p_policy_version
      and member.enabled
  )
$$;

revoke all on function private.is_adaptive_controlled_pilot_member(
  uuid,
  text,
  text,
  text,
  text,
  text
) from public;
revoke all on function private.is_adaptive_controlled_pilot_member(
  uuid,
  text,
  text,
  text,
  text,
  text
) from anon;
revoke all on function private.is_adaptive_controlled_pilot_member(
  uuid,
  text,
  text,
  text,
  text,
  text
) from authenticated;

-- Pilot questions stay unpublished. The private planner may use only the
-- exact question bank bound to an eligible adaptive attempt.
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

create or replace function public.get_adaptive_controlled_pilot_availability(
  p_unit_slug text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_release public.adaptive_practice_releases%rowtype;
begin
  begin
    if v_current_user_id is null then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:UNAUTHENTICATED';
    end if;

    select release.*
    into v_release
    from public.adaptive_practice_releases as release
    join public.learning_units as unit
      on unit.slug = release.unit_slug
    join public.profiles as profile
      on profile.user_id = v_current_user_id
    join public.student_profiles as student
      on student.user_id = profile.user_id
    where release.unit_slug = lower(btrim(coalesce(p_unit_slug, '')))
      and profile.role = 'STUDENT'
      and profile.onboarding_completed
      and student.grade = 2
      and unit.grade = 2
      and not unit.published
      and release.runtime_enabled
      and release.controlled_pilot_enabled
      and not release.retention_runtime_enabled
      and release.publication_status = 'DRAFT'
      and release.student_visibility = 'HIDDEN'
      and private.is_adaptive_controlled_pilot_member(
        v_current_user_id,
        release.unit_slug,
        release.release_candidate_id,
        release.content_version,
        release.bundle_sha256,
        release.policy_version
      );

    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'ADAPTIVE:UNIT_NOT_AVAILABLE';
    end if;

    return jsonb_build_object(
      'available', true,
      'unit_slug', v_release.unit_slug,
      'release_candidate_id', v_release.release_candidate_id,
      'content_version', v_release.content_version,
      'bundle_sha256', v_release.bundle_sha256,
      'policy_version', v_release.policy_version
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

revoke all on function public.get_adaptive_controlled_pilot_availability(
  text
) from public;
revoke all on function public.get_adaptive_controlled_pilot_availability(
  text
) from anon;
grant execute on function public.get_adaptive_controlled_pilot_availability(
  text
) to authenticated;

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
      and not unit.published
      and release.runtime_enabled
      and release.controlled_pilot_enabled
      and not release.retention_runtime_enabled
      and release.publication_status = 'DRAFT'
      and release.student_visibility = 'HIDDEN'
      and private.is_adaptive_controlled_pilot_member(
        v_current_user_id,
        release.unit_slug,
        release.release_candidate_id,
        release.content_version,
        release.bundle_sha256,
        release.policy_version
      );

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
        and not release.retention_runtime_enabled
        and release.publication_status = 'DRAFT'
        and release.student_visibility = 'HIDDEN'
        and not unit.published
        and private.is_adaptive_controlled_pilot_member(
          v_current_user_id,
          release.unit_slug,
          release.release_candidate_id,
          release.content_version,
          release.bundle_sha256,
          release.policy_version
        )
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
      and not question.published;

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

comment on table public.adaptive_practice_pilot_members is
  'Private database-side controlled-pilot membership. Browser roles have no direct access.';
comment on function public.get_adaptive_controlled_pilot_availability(text) is
  'Returns only frozen public binding metadata after Student, membership and activation checks.';
comment on function public.start_or_resume_adaptive_practice(text, uuid) is
  'Atomic controlled-pilot start/resume for an unpublished frozen candidate; database membership required.';
comment on function public.submit_adaptive_practice_answer(
  uuid,
  text,
  text,
  integer,
  uuid
) is
  'Atomic controlled-pilot grade/evidence/plan transition; membership and activation required.';

do $validation$
declare
  v_table_count bigint := 0;
  v_rls_count bigint := 0;
  v_browser_table_grants bigint := 0;
  v_authenticated_execute_count bigint := 0;
  v_release_count bigint := 0;
  v_member_count bigint := 0;
  v_attempt_count bigint := 0;
  v_answer_count bigint := 0;
  v_start_definition text;
  v_submit_definition text;
  v_planner_definition text;
  v_availability_definition text;
begin
  select count(*)
  into v_table_count
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relname = 'adaptive_practice_pilot_members'
    and relation.relkind = 'r';

  select count(*)
  into v_rls_count
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relname = 'adaptive_practice_pilot_members'
    and relation.relrowsecurity
    and relation.relforcerowsecurity;

  select count(*)
  into v_browser_table_grants
  from information_schema.role_table_grants as table_grant
  where table_grant.table_schema = 'public'
    and table_grant.table_name = 'adaptive_practice_pilot_members'
    and table_grant.grantee in ('PUBLIC', 'anon', 'authenticated');

  select count(*)
  into v_authenticated_execute_count
  from (
    values
      ('public.get_adaptive_controlled_pilot_availability(text)'),
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
  join public.learning_units as unit
    on unit.slug = release.unit_slug
  where release.unit_slug = 'grade-2-numbers-to-1000'
    and release.release_candidate_id = 'g2-numbers-to-1000-rc1'
    and release.content_version = 'g2n1000-1.0.0-rc.1'
    and release.bundle_sha256 =
      '1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530'
    and release.policy_version =
      'g2n1000-adaptive-policy-1.0.0-pilot'
    and release.publication_status = 'DRAFT'
    and release.student_visibility = 'HIDDEN'
    and not release.runtime_enabled
    and not release.controlled_pilot_enabled
    and not release.retention_runtime_enabled
    and not unit.published;

  select count(*) into v_member_count
  from public.adaptive_practice_pilot_members;
  select count(*) into v_attempt_count
  from public.adaptive_practice_attempts;
  select count(*) into v_answer_count
  from public.adaptive_practice_answers;

  select pg_get_functiondef(
    'public.start_or_resume_adaptive_practice(text,uuid)'::regprocedure
  ) into v_start_definition;
  select pg_get_functiondef(
    'public.submit_adaptive_practice_answer(uuid,text,text,integer,uuid)'::regprocedure
  ) into v_submit_definition;
  select pg_get_functiondef(
    'private.plan_adaptive_practice_transition(uuid)'::regprocedure
  ) into v_planner_definition;
  select pg_get_functiondef(
    'public.get_adaptive_controlled_pilot_availability(text)'::regprocedure
  ) into v_availability_definition;

  if
    v_table_count <> 1
    or v_rls_count <> 1
    or v_browser_table_grants <> 0
    or v_authenticated_execute_count <> 4
    or v_release_count <> 1
    or v_member_count <> 0
    or v_attempt_count <> 0
    or v_answer_count <> 0
    or v_start_definition not like
      '%private.is_adaptive_controlled_pilot_member%'
    or v_start_definition like '%and unit.published%'
    or v_submit_definition not like
      '%private.is_adaptive_controlled_pilot_member%'
    or v_submit_definition like '%and question.published%'
    or v_planner_definition like '%and question.published%'
    or v_availability_definition not like
      '%private.is_adaptive_controlled_pilot_member%'
  then
    raise exception 'Controlled pilot eligibility validation failed';
  end if;
end;
$validation$;

commit;
