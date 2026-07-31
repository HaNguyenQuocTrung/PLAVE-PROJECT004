begin;

-- LOCAL-ONLY DRAFT. Do not apply remotely without a separate Owner approval.
-- This migration creates an inactive release/runtime contract. It does not
-- materialize content, activate a release, publish curriculum, mutate legacy
-- Grade 1 attempts/answers, or grant Parent/Teacher access.

do $precondition$
begin
  if
    pg_catalog.to_regclass('public.curriculum_releases') is not null
    or pg_catalog.to_regclass('public.curriculum_release_units') is not null
    or pg_catalog.to_regclass('public.curriculum_release_questions') is not null
    or pg_catalog.to_regclass('private.curriculum_release_solutions') is not null
    or pg_catalog.to_regclass('public.curriculum_attempts') is not null
    or pg_catalog.to_regclass('public.curriculum_answers') is not null
    or pg_catalog.to_regclass('public.student_curriculum_unit_progress') is not null
    or pg_catalog.to_regclass('public.student_curriculum_outcome_progress') is not null
    or pg_catalog.to_regclass('public.student_curriculum_skill_progress') is not null
  then
    raise exception 'CURRICULUM:PRECONDITION_FAILED:TABLE_ALREADY_EXISTS';
  end if;
end;
$precondition$;

create table public.curriculum_releases (
  release_id text primary key,
  content_version text not null,
  curriculum_source_fingerprint text not null,
  generator_version text not null,
  deterministic_seed text not null,
  mastery_policy_version text not null,
  public_payload_sha256 text not null,
  private_solution_sha256 text not null,
  bundle_sha256 text not null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'ACTIVE', 'RETIRED')),
  activation_state text not null default 'INACTIVE'
    check (activation_state in ('INACTIVE', 'ACTIVE')),
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  retired_at timestamptz,
  unique (release_id, content_version),
  unique (
    release_id,
    content_version,
    curriculum_source_fingerprint,
    generator_version,
    deterministic_seed
  ),
  constraint curriculum_release_id_check check (
    release_id = btrim(release_id)
    and release_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(release_id) between 8 and 100
  ),
  constraint curriculum_release_version_check check (
    content_version = btrim(content_version)
    and content_version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{4,79}$'
  ),
  constraint curriculum_release_fingerprint_check check (
    curriculum_source_fingerprint ~ '^[0-9a-f]{64}$'
    and public_payload_sha256 ~ '^[0-9a-f]{64}$'
    and private_solution_sha256 ~ '^[0-9a-f]{64}$'
    and bundle_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint curriculum_release_generator_check check (
    generator_version = btrim(generator_version)
    and char_length(generator_version) between 4 and 80
    and deterministic_seed = btrim(deterministic_seed)
    and char_length(deterministic_seed) between 4 and 100
    and mastery_policy_version = btrim(mastery_policy_version)
    and char_length(mastery_policy_version) between 4 and 80
  ),
  constraint curriculum_release_activation_check check (
    (
      status = 'DRAFT'
      and activation_state = 'INACTIVE'
      and activated_at is null
      and retired_at is null
    )
    or (
      status = 'ACTIVE'
      and activation_state = 'ACTIVE'
      and activated_at is not null
      and retired_at is null
    )
    or (
      status = 'RETIRED'
      and activation_state = 'INACTIVE'
      and retired_at is not null
    )
  )
);

create unique index curriculum_releases_one_active_idx
  on public.curriculum_releases (activation_state)
  where status = 'ACTIVE' and activation_state = 'ACTIVE';

create table public.curriculum_release_units (
  release_id text not null
    references public.curriculum_releases(release_id) on delete restrict,
  unit_id text not null,
  grade smallint not null check (grade between 1 and 9),
  domain text not null check (
    domain in (
      'NUMBERS_AND_OPERATIONS',
      'ALGEBRA_AND_PREALGEBRA',
      'GEOMETRY',
      'MEASUREMENT',
      'STATISTICS_AND_PROBABILITY',
      'APPLIED_PROBLEM_SOLVING'
    )
  ),
  title text not null,
  description text not null,
  learning_goals jsonb not null,
  theory jsonb not null,
  worked_examples jsonb not null,
  official_outcome_ids text[] not null,
  skill_ids text[] not null,
  display_order smallint not null check (display_order between 1 and 500),
  total_questions smallint not null check (total_questions between 1 and 100),
  created_at timestamptz not null default now(),
  primary key (release_id, unit_id),
  unique (release_id, display_order),
  constraint curriculum_release_unit_id_check check (
    unit_id = lower(btrim(unit_id))
    and unit_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(unit_id) between 3 and 100
  ),
  constraint curriculum_release_unit_text_check check (
    title = btrim(title)
    and char_length(title) between 3 and 180
    and description = btrim(description)
    and char_length(description) between 10 and 1000
  ),
  constraint curriculum_release_unit_json_check check (
    jsonb_typeof(learning_goals) = 'array'
    and jsonb_array_length(learning_goals) > 0
    and jsonb_typeof(theory) = 'array'
    and jsonb_array_length(theory) > 0
    and jsonb_typeof(worked_examples) = 'array'
    and jsonb_array_length(worked_examples) > 0
  ),
  constraint curriculum_release_unit_mapping_check check (
    cardinality(official_outcome_ids) > 0
    and array_position(official_outcome_ids, null) is null
    and cardinality(skill_ids) > 0
    and array_position(skill_ids, null) is null
  )
);

create index curriculum_release_units_grade_order_idx
  on public.curriculum_release_units (release_id, grade, display_order);

create table public.curriculum_release_questions (
  release_id text not null,
  unit_id text not null,
  question_id text not null,
  display_order smallint not null check (display_order between 1 and 100),
  answer_type text not null
    check (answer_type in ('MULTIPLE_CHOICE', 'NUMBER_INPUT', 'TEXT_INPUT')),
  prompt text not null,
  options jsonb,
  visual jsonb not null,
  cognitive_level text not null
    check (cognitive_level in ('UNDERSTAND', 'APPLY', 'REASON')),
  official_outcome_ids text[] not null,
  official_outcome_titles text[] not null,
  skill_id text not null,
  skill_title text not null,
  question_payload_hash text not null,
  created_at timestamptz not null default now(),
  primary key (release_id, question_id),
  unique (release_id, unit_id, question_id),
  unique (release_id, unit_id, display_order),
  foreign key (release_id, unit_id)
    references public.curriculum_release_units(release_id, unit_id)
    on delete restrict,
  constraint curriculum_release_question_id_check check (
    question_id = lower(btrim(question_id))
    and question_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(question_id) between 3 and 120
  ),
  constraint curriculum_release_question_prompt_check check (
    prompt = btrim(prompt) and char_length(prompt) between 3 and 2000
  ),
  constraint curriculum_release_question_options_check check (
    (answer_type = 'MULTIPLE_CHOICE'
      and options is not null
      and jsonb_typeof(options) = 'array'
      and jsonb_array_length(options) = 4)
    or (answer_type <> 'MULTIPLE_CHOICE' and options is null)
  ),
  constraint curriculum_release_question_visual_check check (
    jsonb_typeof(visual) = 'object'
  ),
  constraint curriculum_release_question_mapping_check check (
    cardinality(official_outcome_ids) > 0
    and cardinality(official_outcome_ids)
      = cardinality(official_outcome_titles)
    and array_position(official_outcome_ids, null) is null
    and array_position(official_outcome_titles, null) is null
    and skill_id = btrim(skill_id)
    and char_length(skill_id) between 1 and 160
    and skill_title = btrim(skill_title)
    and char_length(skill_title) between 2 and 240
  ),
  constraint curriculum_release_question_hash_check check (
    question_payload_hash ~ '^[0-9a-f]{64}$'
  )
);

create index curriculum_release_questions_unit_order_idx
  on public.curriculum_release_questions (
    release_id,
    unit_id,
    display_order
  );

create table private.curriculum_release_solutions (
  release_id text not null,
  question_id text not null,
  normalized_correct_answer text not null,
  correct_answer text not null,
  solution_steps jsonb not null,
  feedback text not null,
  solution_payload_hash text not null,
  created_at timestamptz not null default now(),
  primary key (release_id, question_id),
  foreign key (release_id, question_id)
    references public.curriculum_release_questions(release_id, question_id)
    on delete restrict,
  constraint curriculum_release_solution_answer_check check (
    normalized_correct_answer = btrim(normalized_correct_answer)
    and char_length(normalized_correct_answer) between 1 and 200
    and correct_answer = btrim(correct_answer)
    and char_length(correct_answer) between 1 and 200
  ),
  constraint curriculum_release_solution_content_check check (
    jsonb_typeof(solution_steps) = 'array'
    and jsonb_array_length(solution_steps) > 0
    and feedback = btrim(feedback)
    and char_length(feedback) between 3 and 2000
  ),
  constraint curriculum_release_solution_hash_check check (
    solution_payload_hash ~ '^[0-9a-f]{64}$'
  )
);

create table public.curriculum_legacy_grade1_outcome_mappings (
  release_id text not null
    references public.curriculum_releases(release_id) on delete restrict,
  legacy_unit_slug text not null
    references public.learning_units(slug) on delete restrict,
  official_outcome_id text not null,
  official_outcome_title text not null,
  mapping_basis text not null
    check (mapping_basis = 'LEGACY_UNIT_ALIGNED_PRODUCT_MAPPING_V1'),
  primary key (release_id, legacy_unit_slug, official_outcome_id),
  constraint curriculum_legacy_mapping_grade1_slug_check check (
    legacy_unit_slug ~ '^grade-1-[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint curriculum_legacy_mapping_text_check check (
    official_outcome_id = btrim(official_outcome_id)
    and char_length(official_outcome_id) between 2 and 160
    and official_outcome_title = btrim(official_outcome_title)
    and char_length(official_outcome_title) between 3 and 1000
  )
);

create table public.curriculum_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null
    references public.student_profiles(user_id) on delete cascade,
  release_id text not null,
  content_version text not null,
  curriculum_source_fingerprint text not null,
  generator_version text not null,
  deterministic_seed text not null,
  unit_id text not null,
  start_idempotency_key uuid not null,
  question_sequence text[] not null,
  total_questions smallint not null check (total_questions between 1 and 100),
  current_position smallint not null default 1,
  status text not null default 'IN_PROGRESS'
    check (status in ('IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
  revision integer not null default 0 check (revision >= 0),
  answered_count smallint not null default 0,
  correct_count smallint not null default 0,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (student_id, start_idempotency_key),
  unique (id, release_id, unit_id),
  foreign key (
    release_id,
    content_version,
    curriculum_source_fingerprint,
    generator_version,
    deterministic_seed
  )
    references public.curriculum_releases(
      release_id,
      content_version,
      curriculum_source_fingerprint,
      generator_version,
      deterministic_seed
    )
    on delete restrict,
  foreign key (release_id, unit_id)
    references public.curriculum_release_units(release_id, unit_id)
    on delete restrict,
  constraint curriculum_attempt_binding_check check (
    curriculum_source_fingerprint ~ '^[0-9a-f]{64}$'
    and generator_version = btrim(generator_version)
    and deterministic_seed = btrim(deterministic_seed)
    and cardinality(question_sequence) = total_questions
    and array_position(question_sequence, null) is null
  ),
  constraint curriculum_attempt_counts_check check (
    answered_count between 0 and total_questions
    and correct_count between 0 and answered_count
    and current_position between 1 and total_questions + 1
  ),
  constraint curriculum_attempt_lifecycle_check check (
    (
      status = 'IN_PROGRESS'
      and completed_at is null
      and answered_count < total_questions
      and current_position = answered_count + 1
    )
    or (
      status = 'COMPLETED'
      and completed_at is not null
      and answered_count = total_questions
      and current_position = total_questions + 1
    )
    or (
      status = 'ABANDONED'
      and completed_at is not null
      and answered_count < total_questions
    )
  )
);

create unique index curriculum_attempts_one_active_unit_idx
  on public.curriculum_attempts (student_id, unit_id)
  where status = 'IN_PROGRESS';

create index curriculum_attempts_student_history_idx
  on public.curriculum_attempts (student_id, started_at desc, id);

create index curriculum_attempts_resume_idx
  on public.curriculum_attempts (
    student_id,
    unit_id,
    status,
    updated_at desc
  );

create table public.curriculum_answers (
  attempt_id uuid not null,
  release_id text not null,
  unit_id text not null,
  question_id text not null,
  submission_id uuid not null,
  expected_revision integer not null check (expected_revision >= 0),
  evidence_sequence smallint not null
    check (evidence_sequence between 1 and 100),
  normalized_answer text not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (attempt_id, question_id),
  unique (attempt_id, submission_id),
  unique (attempt_id, evidence_sequence),
  foreign key (attempt_id, release_id, unit_id)
    references public.curriculum_attempts(id, release_id, unit_id)
    on delete cascade,
  foreign key (release_id, unit_id, question_id)
    references public.curriculum_release_questions(
      release_id,
      unit_id,
      question_id
    )
    on delete restrict,
  constraint curriculum_answer_text_check check (
    normalized_answer = btrim(normalized_answer)
    and char_length(normalized_answer) between 1 and 200
  )
);

create index curriculum_answers_attempt_sequence_idx
  on public.curriculum_answers (attempt_id, evidence_sequence);

create table public.student_curriculum_unit_progress (
  student_id uuid not null
    references public.student_profiles(user_id) on delete cascade,
  release_id text not null,
  unit_id text not null,
  status text not null default 'IN_PROGRESS'
    check (status in ('IN_PROGRESS', 'COMPLETED')),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  correct_count integer not null default 0,
  completed_attempt_count integer not null default 0
    check (completed_attempt_count >= 0),
  best_score_percent numeric(5, 2),
  mastery_label text not null default 'IN_PROGRESS'
    check (
      mastery_label in (
        'IN_PROGRESS',
        'NEEDS_PRACTICE',
        'DEVELOPING',
        'PROFICIENT',
        'MASTERED'
      )
    ),
  mastery_policy_version text not null,
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (student_id, release_id, unit_id),
  foreign key (release_id, unit_id)
    references public.curriculum_release_units(release_id, unit_id)
    on delete restrict,
  constraint curriculum_unit_progress_counts_check check (
    correct_count between 0 and evidence_count
    and (
      best_score_percent is null
      or best_score_percent between 0 and 100
    )
  )
);

create index student_curriculum_unit_progress_activity_idx
  on public.student_curriculum_unit_progress (
    student_id,
    last_activity_at desc
  );

create table public.student_curriculum_outcome_progress (
  student_id uuid not null
    references public.student_profiles(user_id) on delete cascade,
  release_id text not null
    references public.curriculum_releases(release_id) on delete restrict,
  official_outcome_id text not null,
  official_outcome_title text not null,
  evidence_count integer not null default 0 check (evidence_count >= 0),
  correct_count integer not null default 0,
  recent_evidence boolean[] not null default array[]::boolean[],
  mastery_label text not null default 'DEVELOPING'
    check (
      mastery_label in (
        'NEEDS_PRACTICE',
        'DEVELOPING',
        'PROFICIENT',
        'MASTERED'
      )
    ),
  mastery_policy_version text not null,
  last_activity_at timestamptz not null default now(),
  primary key (student_id, release_id, official_outcome_id),
  constraint curriculum_outcome_progress_counts_check check (
    correct_count between 0 and evidence_count
    and cardinality(recent_evidence) between 0 and 5
  )
);

create index student_curriculum_outcome_progress_activity_idx
  on public.student_curriculum_outcome_progress (
    student_id,
    last_activity_at desc
  );

create table public.student_curriculum_skill_progress (
  student_id uuid not null
    references public.student_profiles(user_id) on delete cascade,
  release_id text not null
    references public.curriculum_releases(release_id) on delete restrict,
  skill_id text not null,
  skill_title text not null,
  evidence_count integer not null default 0 check (evidence_count >= 0),
  correct_count integer not null default 0,
  recent_evidence boolean[] not null default array[]::boolean[],
  mastery_label text not null default 'DEVELOPING'
    check (
      mastery_label in (
        'NEEDS_PRACTICE',
        'DEVELOPING',
        'PROFICIENT',
        'MASTERED'
      )
    ),
  mastery_policy_version text not null,
  last_activity_at timestamptz not null default now(),
  primary key (student_id, release_id, skill_id),
  constraint curriculum_skill_progress_counts_check check (
    correct_count between 0 and evidence_count
    and cardinality(recent_evidence) between 0 and 5
  )
);

create index student_curriculum_skill_progress_activity_idx
  on public.student_curriculum_skill_progress (
    student_id,
    last_activity_at desc
  );

create or replace function private.curriculum_normalize_answer(
  p_answer text,
  p_answer_type text
)
returns text
language plpgsql
immutable
strict
security invoker
set search_path = ''
as $$
declare
  v_normalized text;
begin
  if char_length(p_answer) not between 1 and 200 then
    raise exception using
      errcode = 'P0001',
      message = 'CURRICULUM:INVALID_ANSWER';
  end if;
  v_normalized := lower(
    replace(
      pg_catalog.regexp_replace(btrim(p_answer), '[[:space:]]+', '', 'g'),
      ',',
      '.'
    )
  );
  if
    v_normalized = ''
    or (
      p_answer_type = 'MULTIPLE_CHOICE'
      and upper(v_normalized) !~ '^[A-D]$'
    )
  then
    raise exception using
      errcode = 'P0001',
      message = 'CURRICULUM:INVALID_ANSWER';
  end if;
  return v_normalized;
end;
$$;

create or replace function private.curriculum_recent_append(
  p_recent boolean[],
  p_value boolean
)
returns boolean[]
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select case
    when cardinality(p_recent) < 5 then p_recent || p_value
    else p_recent[2:5] || p_value
  end
$$;

create or replace function private.curriculum_mastery_label(
  p_evidence_count integer,
  p_correct_count integer,
  p_recent_evidence boolean[]
)
returns text
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select case
    when p_evidence_count >= 6
      and p_correct_count::numeric / p_evidence_count >= 0.85
      and cardinality(p_recent_evidence) >= 3
      and (
        select count(*)
        from unnest(p_recent_evidence[
          greatest(1, cardinality(p_recent_evidence) - 2):
          cardinality(p_recent_evidence)
        ]) as evidence(value)
        where evidence.value
      ) = 3
      then 'MASTERED'
    when p_evidence_count >= 4
      and p_correct_count::numeric / p_evidence_count >= 0.75
      and (
        select count(*)
        from unnest(p_recent_evidence) as evidence(value)
        where evidence.value
      ) >= 2
      then 'PROFICIENT'
    when p_evidence_count >= 3
      and p_correct_count::numeric / p_evidence_count < 0.50
      then 'NEEDS_PRACTICE'
    else 'DEVELOPING'
  end
$$;

create or replace function private.build_curriculum_attempt_state(
  p_attempt_id uuid,
  p_feedback jsonb
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'attempt_id', attempt.id,
    'release_id', attempt.release_id,
    'content_version', attempt.content_version,
    'unit_id', attempt.unit_id,
    'unit_title', unit.title,
    'grade', unit.grade,
    'status', attempt.status,
    'revision', attempt.revision,
    'answered_count', attempt.answered_count,
    'correct_count', attempt.correct_count,
    'total_questions', attempt.total_questions,
    'started_at', attempt.started_at,
    'completed_at', attempt.completed_at,
    'current_question', case
      when question.question_id is null then null
      else pg_catalog.jsonb_build_object(
        'question_id', question.question_id,
        'position', attempt.current_position,
        'prompt', question.prompt,
        'answer_type', question.answer_type,
        'options', question.options,
        'visual', question.visual,
        'cognitive_level', question.cognitive_level
      )
    end,
    'feedback', p_feedback
  )
  from public.curriculum_attempts as attempt
  join public.curriculum_release_units as unit
    on unit.release_id = attempt.release_id
    and unit.unit_id = attempt.unit_id
  left join public.curriculum_release_questions as question
    on question.release_id = attempt.release_id
    and question.question_id = case
      when attempt.current_position <= attempt.total_questions
      then attempt.question_sequence[attempt.current_position]
      else null
    end
  where attempt.id = p_attempt_id
$$;

create or replace function public.start_or_resume_curriculum_unit(
  p_unit_slug text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_grade smallint;
  v_unit_slug text := lower(btrim(coalesce(p_unit_slug, '')));
  v_release public.curriculum_releases%rowtype;
  v_unit public.curriculum_release_units%rowtype;
  v_attempt_id uuid;
  v_idempotent_unit_id text;
  v_sequence text[];
begin
  begin
    if v_user_id is null then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:UNAUTHENTICATED';
    end if;
    if p_idempotency_key is null or v_unit_slug !~
      '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:INVALID_REQUEST';
    end if;

    select student.grade
    into v_grade
    from public.profiles as profile
    join public.student_profiles as student
      on student.user_id = profile.user_id
    where profile.user_id = v_user_id
      and profile.role = 'STUDENT'
      and profile.onboarding_completed;

    if v_grade is null or v_grade not between 1 and 9 then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:FORBIDDEN';
    end if;
    if v_grade = 1 then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:LEGACY_GRADE1_RUNTIME_REQUIRED';
    end if;

    perform pg_advisory_xact_lock(
      hashtextextended(v_user_id::text || ':' || v_unit_slug, 0)
    );

    select attempt.id, attempt.unit_id
    into v_attempt_id, v_idempotent_unit_id
    from public.curriculum_attempts as attempt
    join public.curriculum_release_units as unit
      on unit.release_id = attempt.release_id
      and unit.unit_id = attempt.unit_id
    where attempt.student_id = v_user_id
      and attempt.start_idempotency_key = p_idempotency_key
      and unit.grade = v_grade
    limit 1;
    if v_attempt_id is not null then
      if v_idempotent_unit_id <> v_unit_slug then
        raise exception using errcode = 'P0001',
          message = 'CURRICULUM:IDEMPOTENCY_CONFLICT';
      end if;
      return private.build_curriculum_attempt_state(v_attempt_id, null);
    end if;

    select attempt.id
    into v_attempt_id
    from public.curriculum_attempts as attempt
    join public.curriculum_release_units as unit
      on unit.release_id = attempt.release_id
      and unit.unit_id = attempt.unit_id
    where attempt.student_id = v_user_id
      and attempt.unit_id = v_unit_slug
      and attempt.status = 'IN_PROGRESS'
      and unit.grade = v_grade
    order by attempt.started_at desc, attempt.id desc
    limit 1
    for update of attempt;
    if v_attempt_id is not null then
      return private.build_curriculum_attempt_state(v_attempt_id, null);
    end if;

    select release.*
    into v_release
    from public.curriculum_releases as release
    where release.status = 'ACTIVE'
      and release.activation_state = 'ACTIVE';
    if not found then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:RELEASE_UNAVAILABLE';
    end if;

    select unit.*
    into v_unit
    from public.curriculum_release_units as unit
    where unit.release_id = v_release.release_id
      and unit.unit_id = v_unit_slug
      and unit.grade = v_grade;
    if not found then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:UNIT_UNAVAILABLE';
    end if;

    select array_agg(question.question_id order by question.display_order)
    into v_sequence
    from public.curriculum_release_questions as question
    join private.curriculum_release_solutions as solution
      on solution.release_id = question.release_id
      and solution.question_id = question.question_id
    where question.release_id = v_release.release_id
      and question.unit_id = v_unit.unit_id;
    if cardinality(v_sequence) <> v_unit.total_questions then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:INTEGRITY_FAILURE';
    end if;

    insert into public.curriculum_attempts (
      student_id,
      release_id,
      content_version,
      curriculum_source_fingerprint,
      generator_version,
      deterministic_seed,
      unit_id,
      start_idempotency_key,
      question_sequence,
      total_questions
    ) values (
      v_user_id,
      v_release.release_id,
      v_release.content_version,
      v_release.curriculum_source_fingerprint,
      v_release.generator_version,
      v_release.deterministic_seed,
      v_unit.unit_id,
      p_idempotency_key,
      v_sequence,
      v_unit.total_questions
    )
    returning id into v_attempt_id;

    insert into public.student_curriculum_unit_progress (
      student_id,
      release_id,
      unit_id,
      status,
      mastery_policy_version
    ) values (
      v_user_id,
      v_release.release_id,
      v_unit.unit_id,
      'IN_PROGRESS',
      v_release.mastery_policy_version
    )
    on conflict (student_id, release_id, unit_id)
    do update set
      status = 'IN_PROGRESS',
      last_activity_at = now();

    return private.build_curriculum_attempt_state(v_attempt_id, null);
  exception when others then
    if left(sqlerrm, 11) = 'CURRICULUM:' then raise; end if;
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:INTEGRITY_FAILURE';
  end;
end;
$$;

create or replace function public.get_curriculum_attempt_state(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:UNAUTHENTICATED';
  end if;
  select attempt.id into v_attempt_id
  from public.curriculum_attempts as attempt
  join public.profiles as profile on profile.user_id = attempt.student_id
  join public.student_profiles as student
    on student.user_id = attempt.student_id
  join public.curriculum_release_units as unit
    on unit.release_id = attempt.release_id
    and unit.unit_id = attempt.unit_id
  where attempt.id = p_attempt_id
    and attempt.student_id = v_user_id
    and profile.role = 'STUDENT'
    and profile.onboarding_completed
    and student.grade = unit.grade
    and student.grade between 2 and 9;
  if v_attempt_id is null then
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:ATTEMPT_NOT_FOUND';
  end if;
  return private.build_curriculum_attempt_state(v_attempt_id, null);
end;
$$;

create or replace function public.submit_curriculum_answer(
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
  v_user_id uuid := auth.uid();
  v_attempt public.curriculum_attempts%rowtype;
  v_existing public.curriculum_answers%rowtype;
  v_question public.curriculum_release_questions%rowtype;
  v_solution private.curriculum_release_solutions%rowtype;
  v_normalized text;
  v_is_correct boolean;
  v_recent boolean[];
  v_completed boolean;
  v_new_answered integer;
  v_new_correct integer;
  v_score numeric(5,2);
  v_feedback jsonb;
  v_index integer;
  v_outcome_id text;
  v_outcome_title text;
begin
  begin
    if v_user_id is null then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:UNAUTHENTICATED';
    end if;
    if
      p_attempt_id is null
      or p_idempotency_key is null
      or p_expected_revision is null
      or p_expected_revision < 0
      or p_question_id is null
      or p_answer is null
    then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:INVALID_REQUEST';
    end if;

    select answer.* into v_existing
    from public.curriculum_answers as answer
    join public.curriculum_attempts as attempt
      on attempt.id = answer.attempt_id
    join public.profiles as profile
      on profile.user_id = attempt.student_id
    join public.student_profiles as student
      on student.user_id = attempt.student_id
    join public.curriculum_release_units as unit
      on unit.release_id = attempt.release_id
      and unit.unit_id = attempt.unit_id
    where answer.attempt_id = p_attempt_id
      and answer.submission_id = p_idempotency_key
      and attempt.student_id = v_user_id
      and profile.role = 'STUDENT'
      and profile.onboarding_completed
      and student.grade = unit.grade
      and student.grade between 2 and 9;
    if found then
      if
        v_existing.question_id <> p_question_id
        or v_existing.expected_revision <> p_expected_revision
      then
        raise exception using errcode = 'P0001',
          message = 'CURRICULUM:IDEMPOTENCY_CONFLICT';
      end if;
      select attempt.* into v_attempt
      from public.curriculum_attempts as attempt
      where attempt.id = p_attempt_id and attempt.student_id = v_user_id;
      select question.*
      into v_question
      from public.curriculum_release_questions as question
      where question.release_id = v_existing.release_id
        and question.question_id = v_existing.question_id;
      select solution.*
      into v_solution
      from private.curriculum_release_solutions as solution
      where solution.release_id = v_existing.release_id
        and solution.question_id = v_existing.question_id;
      v_normalized := private.curriculum_normalize_answer(
        p_answer,
        v_question.answer_type
      );
      if v_normalized <> v_existing.normalized_answer then
        raise exception using errcode = 'P0001',
          message = 'CURRICULUM:IDEMPOTENCY_CONFLICT';
      end if;
      v_feedback := pg_catalog.jsonb_build_object(
        'question_id', v_existing.question_id,
        'is_correct', v_existing.is_correct,
        'correct_answer', v_solution.correct_answer,
        'solution_steps', v_solution.solution_steps,
        'feedback', v_solution.feedback
      );
      return private.build_curriculum_attempt_state(
        v_attempt.id,
        v_feedback
      );
    end if;

    select attempt.* into v_attempt
    from public.curriculum_attempts as attempt
    join public.profiles as profile on profile.user_id = attempt.student_id
    join public.student_profiles as student
      on student.user_id = attempt.student_id
    join public.curriculum_release_units as unit
      on unit.release_id = attempt.release_id
      and unit.unit_id = attempt.unit_id
    where attempt.id = p_attempt_id
      and attempt.student_id = v_user_id
      and profile.role = 'STUDENT'
      and profile.onboarding_completed
      and student.grade = unit.grade
      and student.grade between 2 and 9
    for update of attempt;
    if not found then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:ATTEMPT_NOT_FOUND';
    end if;
    if v_attempt.status <> 'IN_PROGRESS' then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:ATTEMPT_NOT_ACTIVE';
    end if;
    if v_attempt.revision <> p_expected_revision then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:REVISION_CONFLICT';
    end if;
    if
      v_attempt.current_position > v_attempt.total_questions
      or v_attempt.question_sequence[v_attempt.current_position]
        <> p_question_id
    then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:QUESTION_MISMATCH';
    end if;
    if exists (
      select 1 from public.curriculum_answers as answer
      where answer.attempt_id = v_attempt.id
        and answer.question_id = p_question_id
    ) then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:DUPLICATE_SUBMISSION';
    end if;

    select question.* into v_question
    from public.curriculum_release_questions as question
    where question.release_id = v_attempt.release_id
      and question.unit_id = v_attempt.unit_id
      and question.question_id = p_question_id;
    select solution.* into v_solution
    from private.curriculum_release_solutions as solution
    where solution.release_id = v_attempt.release_id
      and solution.question_id = p_question_id;
    if v_question.question_id is null or v_solution.question_id is null then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:INTEGRITY_FAILURE';
    end if;

    v_normalized := private.curriculum_normalize_answer(
      p_answer,
      v_question.answer_type
    );
    v_is_correct := v_normalized = v_solution.normalized_correct_answer;
    v_new_answered := v_attempt.answered_count + 1;
    v_new_correct := v_attempt.correct_count + case when v_is_correct then 1 else 0 end;
    v_completed := v_new_answered = v_attempt.total_questions;
    v_score := pg_catalog.round(
      100.0 * v_new_correct / v_attempt.total_questions,
      2
    );

    insert into public.curriculum_answers (
      attempt_id,
      release_id,
      unit_id,
      question_id,
      submission_id,
      expected_revision,
      evidence_sequence,
      normalized_answer,
      is_correct
    ) values (
      v_attempt.id,
      v_attempt.release_id,
      v_attempt.unit_id,
      p_question_id,
      p_idempotency_key,
      p_expected_revision,
      v_new_answered,
      v_normalized,
      v_is_correct
    );

    update public.curriculum_attempts as attempt
    set
      answered_count = v_new_answered,
      correct_count = v_new_correct,
      current_position = v_new_answered + 1,
      revision = revision + 1,
      status = case when v_completed then 'COMPLETED' else 'IN_PROGRESS' end,
      completed_at = case when v_completed then now() else null end,
      updated_at = now()
    where attempt.id = v_attempt.id
      and attempt.student_id = v_user_id
      and attempt.revision = p_expected_revision
      and attempt.status = 'IN_PROGRESS';
    if not found then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:REVISION_CONFLICT';
    end if;

    insert into public.student_curriculum_unit_progress (
      student_id,
      release_id,
      unit_id,
      status,
      evidence_count,
      correct_count,
      completed_attempt_count,
      best_score_percent,
      mastery_label,
      mastery_policy_version,
      last_activity_at,
      completed_at
    ) values (
      v_user_id,
      v_attempt.release_id,
      v_attempt.unit_id,
      case when v_completed then 'COMPLETED' else 'IN_PROGRESS' end,
      1,
      case when v_is_correct then 1 else 0 end,
      case when v_completed then 1 else 0 end,
      case when v_completed then v_score else null end,
      case
        when v_completed and v_score >= 85 then 'PROFICIENT'
        when v_completed and v_score < 50 then 'NEEDS_PRACTICE'
        when v_completed then 'DEVELOPING'
        else 'IN_PROGRESS'
      end,
      (
        select release.mastery_policy_version
        from public.curriculum_releases as release
        where release.release_id = v_attempt.release_id
      ),
      now(),
      case when v_completed then now() else null end
    )
    on conflict (student_id, release_id, unit_id)
    do update set
      status = excluded.status,
      evidence_count =
        student_curriculum_unit_progress.evidence_count + 1,
      correct_count =
        student_curriculum_unit_progress.correct_count
        + case when v_is_correct then 1 else 0 end,
      completed_attempt_count =
        student_curriculum_unit_progress.completed_attempt_count
        + case when v_completed then 1 else 0 end,
      best_score_percent = case
        when not v_completed then
          student_curriculum_unit_progress.best_score_percent
        else greatest(
          coalesce(student_curriculum_unit_progress.best_score_percent, 0),
          v_score
        )
      end,
      mastery_label = case
        when not v_completed then 'IN_PROGRESS'
        when v_score >= 85
          and student_curriculum_unit_progress.completed_attempt_count >= 1
          then 'MASTERED'
        when v_score >= 75 then 'PROFICIENT'
        when v_score < 50 then 'NEEDS_PRACTICE'
        else 'DEVELOPING'
      end,
      last_activity_at = now(),
      completed_at = case
        when v_completed then now()
        else student_curriculum_unit_progress.completed_at
      end;

    for v_index in 1..cardinality(v_question.official_outcome_ids) loop
      v_outcome_id := v_question.official_outcome_ids[v_index];
      v_outcome_title := v_question.official_outcome_titles[v_index];
      insert into public.student_curriculum_outcome_progress (
        student_id,
        release_id,
        official_outcome_id,
        official_outcome_title,
        evidence_count,
        correct_count,
        recent_evidence,
        mastery_label,
        mastery_policy_version,
        last_activity_at
      ) values (
        v_user_id,
        v_attempt.release_id,
        v_outcome_id,
        v_outcome_title,
        1,
        case when v_is_correct then 1 else 0 end,
        array[v_is_correct],
        'DEVELOPING',
        (
          select release.mastery_policy_version
          from public.curriculum_releases as release
          where release.release_id = v_attempt.release_id
        ),
        now()
      )
      on conflict (student_id, release_id, official_outcome_id)
      do update set
        official_outcome_title = excluded.official_outcome_title,
        evidence_count =
          student_curriculum_outcome_progress.evidence_count + 1,
        correct_count =
          student_curriculum_outcome_progress.correct_count
          + case when v_is_correct then 1 else 0 end,
        recent_evidence = private.curriculum_recent_append(
          student_curriculum_outcome_progress.recent_evidence,
          v_is_correct
        ),
        mastery_label = private.curriculum_mastery_label(
          student_curriculum_outcome_progress.evidence_count + 1,
          student_curriculum_outcome_progress.correct_count
            + case when v_is_correct then 1 else 0 end,
          private.curriculum_recent_append(
            student_curriculum_outcome_progress.recent_evidence,
            v_is_correct
          )
        ),
        last_activity_at = now();
    end loop;

    insert into public.student_curriculum_skill_progress (
      student_id,
      release_id,
      skill_id,
      skill_title,
      evidence_count,
      correct_count,
      recent_evidence,
      mastery_label,
      mastery_policy_version,
      last_activity_at
    ) values (
      v_user_id,
      v_attempt.release_id,
      v_question.skill_id,
      v_question.skill_title,
      1,
      case when v_is_correct then 1 else 0 end,
      array[v_is_correct],
      'DEVELOPING',
      (
        select release.mastery_policy_version
        from public.curriculum_releases as release
        where release.release_id = v_attempt.release_id
      ),
      now()
    )
    on conflict (student_id, release_id, skill_id)
    do update set
      skill_title = excluded.skill_title,
      evidence_count =
        student_curriculum_skill_progress.evidence_count + 1,
      correct_count =
        student_curriculum_skill_progress.correct_count
        + case when v_is_correct then 1 else 0 end,
      recent_evidence = private.curriculum_recent_append(
        student_curriculum_skill_progress.recent_evidence,
        v_is_correct
      ),
      mastery_label = private.curriculum_mastery_label(
        student_curriculum_skill_progress.evidence_count + 1,
        student_curriculum_skill_progress.correct_count
          + case when v_is_correct then 1 else 0 end,
        private.curriculum_recent_append(
          student_curriculum_skill_progress.recent_evidence,
          v_is_correct
        )
      ),
      last_activity_at = now();

    v_feedback := pg_catalog.jsonb_build_object(
      'question_id', p_question_id,
      'is_correct', v_is_correct,
      'correct_answer', v_solution.correct_answer,
      'solution_steps', v_solution.solution_steps,
      'feedback', v_solution.feedback
    );
    return private.build_curriculum_attempt_state(v_attempt.id, v_feedback);
  exception when others then
    if left(sqlerrm, 11) = 'CURRICULUM:' then raise; end if;
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:INTEGRITY_FAILURE';
  end;
end;
$$;

create or replace function public.get_student_curriculum_progress()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_grade smallint;
  v_release_id text;
  v_policy_version text := 'product-hypothesis-v1';
  v_units jsonb := '[]'::jsonb;
  v_outcomes jsonb := '[]'::jsonb;
  v_skills jsonb := '[]'::jsonb;
begin
  select student.grade into v_grade
  from public.profiles as profile
  join public.student_profiles as student on student.user_id = profile.user_id
  where profile.user_id = v_user_id
    and profile.role = 'STUDENT'
    and profile.onboarding_completed;
  if v_user_id is null then
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:UNAUTHENTICATED';
  end if;
  if v_grade is null then
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:FORBIDDEN';
  end if;

  select release.release_id, release.mastery_policy_version
  into v_release_id, v_policy_version
  from public.curriculum_releases as release
  order by
    (release.status = 'ACTIVE' and release.activation_state = 'ACTIVE') desc,
    release.created_at desc
  limit 1;

  if v_grade = 1 then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'unit_id', progress.unit_id,
        'title', progress.title,
        'status', progress.status,
        'evidence_count', progress.evidence_count,
        'correct_count', progress.correct_count,
        'best_score_percent', progress.best_score_percent,
        'mastery_label', progress.mastery_label,
        'last_activity_at', progress.last_activity_at,
        'source', 'LEGACY_GRADE1'
      ) order by progress.display_order
    ), '[]'::jsonb)
    into v_units
    from (
      select
        unit.slug as unit_id,
        unit.title,
        unit.display_order,
        case
          when bool_or(attempt.status = 'IN_PROGRESS') then 'IN_PROGRESS'
          when bool_or(attempt.status = 'COMPLETED') then 'COMPLETED'
          else 'NOT_STARTED'
        end as status,
        coalesce(sum(attempt.answered_count), 0) as evidence_count,
        coalesce(sum(attempt.correct_count), 0) as correct_count,
        max(
          case when attempt.status = 'COMPLETED'
            then round(100.0 * attempt.correct_count / attempt.total_questions, 2)
            else null
          end
        ) as best_score_percent,
        case
          when bool_or(attempt.status = 'COMPLETED')
            and max(100.0 * attempt.correct_count / attempt.total_questions) >= 85
            then 'PROFICIENT'
          when bool_or(attempt.status = 'COMPLETED')
            and max(100.0 * attempt.correct_count / attempt.total_questions) < 50
            then 'NEEDS_PRACTICE'
          when bool_or(attempt.status = 'COMPLETED') then 'DEVELOPING'
          when bool_or(attempt.status = 'IN_PROGRESS') then 'IN_PROGRESS'
          else 'NOT_STARTED'
        end as mastery_label,
        max(attempt.updated_at) as last_activity_at
      from public.learning_units as unit
      left join public.practice_attempts as attempt
        on attempt.unit_slug = unit.slug and attempt.student_id = v_user_id
      where unit.grade = 1 and unit.published
      group by unit.slug, unit.title, unit.display_order
    ) as progress;

    if v_release_id is not null then
      select coalesce(jsonb_agg(jsonb_build_object(
        'title', evidence.official_outcome_title,
        'evidence_count', evidence.evidence_count,
        'correct_count', evidence.correct_count,
        'mastery_label', private.curriculum_mastery_label(
          evidence.evidence_count::integer,
          evidence.correct_count::integer,
          evidence.recent_evidence
        ),
        'last_activity_at', evidence.last_activity_at,
        'evidence_basis', 'LEGACY_UNIT_ALIGNED'
      ) order by evidence.official_outcome_title), '[]'::jsonb)
      into v_outcomes
      from (
        select
          mapping.official_outcome_id,
          max(mapping.official_outcome_title) as official_outcome_title,
          count(*) as evidence_count,
          count(*) filter (where answer.is_correct) as correct_count,
          (array_agg(answer.is_correct order by answer.answered_at desc))[1:5]
            as recent_evidence,
          max(answer.answered_at) as last_activity_at
        from public.curriculum_legacy_grade1_outcome_mappings as mapping
        join public.practice_attempts as attempt
          on attempt.unit_slug = mapping.legacy_unit_slug
          and attempt.student_id = v_user_id
        join public.practice_answers as answer
          on answer.attempt_id = attempt.id
        where mapping.release_id = v_release_id
        group by mapping.official_outcome_id
      ) as evidence;
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
      'title', evidence.skill_title,
      'evidence_count', evidence.evidence_count,
      'correct_count', evidence.correct_count,
      'mastery_label', private.curriculum_mastery_label(
        evidence.evidence_count::integer,
        evidence.correct_count::integer,
        evidence.recent_evidence
      ),
      'last_activity_at', evidence.last_activity_at,
      'evidence_basis', 'LEGACY_QUESTION_SKILL'
    ) order by evidence.skill_title), '[]'::jsonb)
    into v_skills
    from (
      select
        question.skill_code,
        replace(initcap(replace(question.skill_code, '_', ' ')), 'To ', 'đến ')
          as skill_title,
        count(*) as evidence_count,
        count(*) filter (where answer.is_correct) as correct_count,
        (array_agg(answer.is_correct order by answer.answered_at desc))[1:5]
          as recent_evidence,
        max(answer.answered_at) as last_activity_at
      from public.practice_answers as answer
      join public.practice_attempts as attempt on attempt.id = answer.attempt_id
      join public.questions as question on question.code = answer.question_id
      where attempt.student_id = v_user_id
      group by question.skill_code
    ) as evidence;
  else
    select release.release_id, release.mastery_policy_version
    into v_release_id, v_policy_version
    from public.curriculum_releases as release
    where release.status = 'ACTIVE' and release.activation_state = 'ACTIVE';
    if v_release_id is null then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:RELEASE_UNAVAILABLE';
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
      'unit_id', unit.unit_id,
      'title', unit.title,
      'status', coalesce(progress.status, 'NOT_STARTED'),
      'evidence_count', coalesce(progress.evidence_count, 0),
      'correct_count', coalesce(progress.correct_count, 0),
      'best_score_percent', progress.best_score_percent,
      'mastery_label', coalesce(progress.mastery_label, 'NOT_STARTED'),
      'last_activity_at', progress.last_activity_at,
      'source', 'UNIVERSAL_CURRICULUM'
    ) order by unit.display_order), '[]'::jsonb)
    into v_units
    from public.curriculum_release_units as unit
    left join public.student_curriculum_unit_progress as progress
      on progress.release_id = unit.release_id
      and progress.unit_id = unit.unit_id
      and progress.student_id = v_user_id
    where unit.release_id = v_release_id and unit.grade = v_grade;

    select coalesce(jsonb_agg(jsonb_build_object(
      'title', progress.official_outcome_title,
      'evidence_count', progress.evidence_count,
      'correct_count', progress.correct_count,
      'mastery_label', progress.mastery_label,
      'last_activity_at', progress.last_activity_at,
      'evidence_basis', 'AUTHORITATIVE_QUESTION_MAPPING'
    ) order by progress.last_activity_at desc), '[]'::jsonb)
    into v_outcomes
    from public.student_curriculum_outcome_progress as progress
    where progress.student_id = v_user_id and progress.release_id = v_release_id;

    select coalesce(jsonb_agg(jsonb_build_object(
      'title', progress.skill_title,
      'evidence_count', progress.evidence_count,
      'correct_count', progress.correct_count,
      'mastery_label', progress.mastery_label,
      'last_activity_at', progress.last_activity_at,
      'evidence_basis', 'AUTHORITATIVE_QUESTION_MAPPING'
    ) order by progress.last_activity_at desc), '[]'::jsonb)
    into v_skills
    from public.student_curriculum_skill_progress as progress
    where progress.student_id = v_user_id and progress.release_id = v_release_id;
  end if;

  return jsonb_build_object(
    'grade', v_grade,
    'compatibility_mode', case
      when v_grade = 1 then 'LEGACY_GRADE1_AGGREGATED'
      else 'UNIVERSAL_CURRICULUM'
    end,
    'mastery_policy_version', v_policy_version,
    'mastery_explanation',
      'Nhãn dựa trên số câu đã làm, tỉ lệ đúng và kết quả gần đây. Một câu đúng không tạo mức Thành thạo.',
    'units', coalesce(v_units, '[]'::jsonb),
    'outcomes', coalesce(v_outcomes, '[]'::jsonb),
    'skills', coalesce(v_skills, '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_student_curriculum_history()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_grade smallint;
  v_history jsonb := '[]'::jsonb;
begin
  select student.grade into v_grade
  from public.profiles as profile
  join public.student_profiles as student on student.user_id = profile.user_id
  where profile.user_id = auth.uid()
    and profile.role = 'STUDENT'
    and profile.onboarding_completed;
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:UNAUTHENTICATED';
  end if;
  if v_grade is null then
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:FORBIDDEN';
  end if;

  if v_grade = 1 then
    select coalesce(jsonb_agg(jsonb_build_object(
      'attempt_id', attempt.id,
      'unit_id', attempt.unit_slug,
      'unit_title', unit.title,
      'status', attempt.status,
      'answered_count', attempt.answered_count,
      'correct_count', attempt.correct_count,
      'total_questions', attempt.total_questions,
      'started_at', attempt.started_at,
      'completed_at', attempt.completed_at,
      'source', 'LEGACY_GRADE1'
    ) order by attempt.started_at desc), '[]'::jsonb)
    into v_history
    from public.practice_attempts as attempt
    join public.learning_units as unit on unit.slug = attempt.unit_slug
    where attempt.student_id = v_user_id;
  else
    select coalesce(jsonb_agg(jsonb_build_object(
      'attempt_id', attempt.id,
      'unit_id', attempt.unit_id,
      'unit_title', unit.title,
      'status', attempt.status,
      'answered_count', attempt.answered_count,
      'correct_count', attempt.correct_count,
      'total_questions', attempt.total_questions,
      'started_at', attempt.started_at,
      'completed_at', attempt.completed_at,
      'source', 'UNIVERSAL_CURRICULUM'
    ) order by attempt.started_at desc), '[]'::jsonb)
    into v_history
    from public.curriculum_attempts as attempt
    join public.curriculum_release_units as unit
      on unit.release_id = attempt.release_id
      and unit.unit_id = attempt.unit_id
    where attempt.student_id = v_user_id;
  end if;
  return jsonb_build_object('grade', v_grade, 'attempts', v_history);
end;
$$;

alter table public.curriculum_releases enable row level security;
alter table public.curriculum_release_units enable row level security;
alter table public.curriculum_release_questions enable row level security;
alter table private.curriculum_release_solutions enable row level security;
alter table public.curriculum_legacy_grade1_outcome_mappings enable row level security;
alter table public.curriculum_attempts enable row level security;
alter table public.curriculum_answers enable row level security;
alter table public.student_curriculum_unit_progress enable row level security;
alter table public.student_curriculum_outcome_progress enable row level security;
alter table public.student_curriculum_skill_progress enable row level security;

alter table public.curriculum_releases force row level security;
alter table public.curriculum_release_units force row level security;
alter table public.curriculum_release_questions force row level security;
alter table private.curriculum_release_solutions force row level security;
alter table public.curriculum_legacy_grade1_outcome_mappings force row level security;
alter table public.curriculum_attempts force row level security;
alter table public.curriculum_answers force row level security;
alter table public.student_curriculum_unit_progress force row level security;
alter table public.student_curriculum_outcome_progress force row level security;
alter table public.student_curriculum_skill_progress force row level security;

create policy curriculum_attempts_select_own
on public.curriculum_attempts for select to authenticated
using (student_id = auth.uid());

create policy curriculum_answers_select_own
on public.curriculum_answers for select to authenticated
using (exists (
  select 1 from public.curriculum_attempts as attempt
  where attempt.id = curriculum_answers.attempt_id
    and attempt.student_id = auth.uid()
));

create policy curriculum_unit_progress_select_own
on public.student_curriculum_unit_progress for select to authenticated
using (student_id = auth.uid());

create policy curriculum_outcome_progress_select_own
on public.student_curriculum_outcome_progress for select to authenticated
using (student_id = auth.uid());

create policy curriculum_skill_progress_select_own
on public.student_curriculum_skill_progress for select to authenticated
using (student_id = auth.uid());

revoke all on table public.curriculum_releases from public, anon, authenticated;
revoke all on table public.curriculum_release_units from public, anon, authenticated;
revoke all on table public.curriculum_release_questions from public, anon, authenticated;
revoke all on table private.curriculum_release_solutions from public, anon, authenticated;
revoke all on table public.curriculum_legacy_grade1_outcome_mappings
  from public, anon, authenticated;
revoke all on table public.curriculum_attempts from public, anon, authenticated;
revoke all on table public.curriculum_answers from public, anon, authenticated;
revoke all on table public.student_curriculum_unit_progress
  from public, anon, authenticated;
revoke all on table public.student_curriculum_outcome_progress
  from public, anon, authenticated;
revoke all on table public.student_curriculum_skill_progress
  from public, anon, authenticated;

revoke all on function private.curriculum_normalize_answer(text, text)
  from public, anon, authenticated;
revoke all on function private.curriculum_recent_append(boolean[], boolean)
  from public, anon, authenticated;
revoke all on function private.curriculum_mastery_label(integer, integer, boolean[])
  from public, anon, authenticated;
revoke all on function private.build_curriculum_attempt_state(uuid, jsonb)
  from public, anon, authenticated;

revoke all on function public.start_or_resume_curriculum_unit(text, uuid)
  from public, anon;
revoke all on function public.get_curriculum_attempt_state(uuid)
  from public, anon;
revoke all on function public.submit_curriculum_answer(
  uuid, text, text, integer, uuid
) from public, anon;
revoke all on function public.get_student_curriculum_progress()
  from public, anon;
revoke all on function public.get_student_curriculum_history()
  from public, anon;

grant execute on function public.start_or_resume_curriculum_unit(text, uuid)
  to authenticated;
grant execute on function public.get_curriculum_attempt_state(uuid)
  to authenticated;
grant execute on function public.submit_curriculum_answer(
  uuid, text, text, integer, uuid
) to authenticated;
grant execute on function public.get_student_curriculum_progress()
  to authenticated;
grant execute on function public.get_student_curriculum_history()
  to authenticated;

do $static_validation$
declare
  v_table_count integer;
  v_function_count integer;
begin
  select count(*) into v_table_count
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where relation.relname in (
    'curriculum_releases',
    'curriculum_release_units',
    'curriculum_release_questions',
    'curriculum_release_solutions',
    'curriculum_legacy_grade1_outcome_mappings',
    'curriculum_attempts',
    'curriculum_answers',
    'student_curriculum_unit_progress',
    'student_curriculum_outcome_progress',
    'student_curriculum_skill_progress'
  );
  if v_table_count <> 10 then
    raise exception 'CURRICULUM:STATIC_VALIDATION:TABLE_COUNT';
  end if;

  select count(*) into v_function_count
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname in (
      'start_or_resume_curriculum_unit',
      'get_curriculum_attempt_state',
      'submit_curriculum_answer',
      'get_student_curriculum_progress',
      'get_student_curriculum_history'
    )
    and procedure.prosecdef
    and procedure.proconfig @> array['search_path=""']::text[];
  if v_function_count <> 5 then
    raise exception 'CURRICULUM:STATIC_VALIDATION:RPC_SECURITY';
  end if;

  if exists (
    select 1 from public.practice_attempts
    where student_id is null
  ) then
    raise exception 'CURRICULUM:STATIC_VALIDATION:LEGACY_GRADE1';
  end if;
end;
$static_validation$;

commit;
