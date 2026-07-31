begin;

-- LOCAL-ONLY DRAFT. This additive migration keeps migrations 0001-0039
-- unchanged. Generated content is accepted only when an authenticated
-- Student-bound snapshot is signed by the local application process.

alter table public.curriculum_attempts
  add column generation_mode text not null default 'MATERIALIZED'
    check (generation_mode in ('MATERIALIZED', 'ON_DEMAND')),
  add column generation_seed text,
  add column generation_contract_version text,
  add column content_release_hash text,
  add column selection_reason text,
  add column snapshot_hash text,
  add constraint curriculum_attempt_generation_binding_check check (
    (
      generation_mode = 'MATERIALIZED'
      and generation_seed is null
      and generation_contract_version is null
      and content_release_hash is null
      and selection_reason is null
      and snapshot_hash is null
    )
    or (
      generation_mode = 'ON_DEMAND'
      and generation_seed ~ '^[a-z0-9][a-z0-9-]{2,80}$'
      and generation_contract_version = 'on-demand-curriculum-v1'
      and content_release_hash ~ '^[0-9a-f]{64}$'
      and selection_reason in (
        'NO_EVIDENCE',
        'FREQUENT_ERRORS',
        'WEAK_RECENT_EVIDENCE',
        'PREREQUISITE_NOT_SECURE',
        'RETENTION_DUE',
        'TEACHER_DETERMINISTIC',
        'STUDENT_UNIT_CHOICE'
      )
      and snapshot_hash ~ '^[0-9a-f]{64}$'
    )
  );

create table private.curriculum_generation_runtime_secret (
  singleton boolean primary key default true check (singleton),
  signing_key_hex text not null check (signing_key_hex ~ '^[0-9a-f]{64}$'),
  key_version integer not null default 1 check (key_version > 0),
  configured_at timestamptz not null default now()
);

create table public.curriculum_generated_questions (
  attempt_id uuid not null,
  release_id text not null,
  unit_id text not null,
  question_id text not null,
  position smallint not null check (position between 1 and 100),
  contract_version text not null
    check (contract_version = 'on-demand-curriculum-v1'),
  grade smallint not null check (grade between 1 and 9),
  official_outcome_id text not null,
  official_outcome_title text not null,
  skill_id text not null,
  skill_title text not null,
  difficulty text not null
    check (difficulty in ('UNDERSTAND', 'APPLY', 'REASON')),
  evidence_form text not null check (
    evidence_form in (
      'RECOGNIZE_UNDERSTAND',
      'PERFORM',
      'REASON_EXPLAIN',
      'APPLY',
      'ERROR_ANALYSIS'
    )
  ),
  question_seed text not null,
  generator_version text not null,
  content_release_hash text not null,
  prompt text not null,
  answer_type text not null
    check (answer_type in ('MULTIPLE_CHOICE', 'NUMBER_INPUT', 'TEXT_INPUT')),
  options jsonb,
  visual jsonb not null,
  misconception_tags text[] not null,
  public_payload_hash text not null,
  created_at timestamptz not null default now(),
  primary key (attempt_id, question_id),
  unique (attempt_id, position),
  foreign key (attempt_id, release_id, unit_id)
    references public.curriculum_attempts(id, release_id, unit_id)
    on delete cascade,
  constraint curriculum_generated_question_id_check check (
    question_id = lower(btrim(question_id))
    and question_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(question_id) between 3 and 140
  ),
  constraint curriculum_generated_question_mapping_check check (
    official_outcome_id = btrim(official_outcome_id)
    and char_length(official_outcome_id) between 2 and 160
    and official_outcome_title = btrim(official_outcome_title)
    and char_length(official_outcome_title) between 2 and 1000
    and skill_id = btrim(skill_id)
    and char_length(skill_id) between 1 and 160
    and skill_title = btrim(skill_title)
    and char_length(skill_title) between 2 and 1000
  ),
  constraint curriculum_generated_question_content_check check (
    prompt = btrim(prompt)
    and char_length(prompt) between 3 and 2000
    and jsonb_typeof(visual) = 'object'
    and cardinality(misconception_tags) > 0
    and (
      (
        answer_type = 'MULTIPLE_CHOICE'
        and options is not null
        and jsonb_typeof(options) = 'array'
        and jsonb_array_length(options) = 4
      )
      or (answer_type <> 'MULTIPLE_CHOICE' and options is null)
    )
  ),
  constraint curriculum_generated_question_hash_check check (
    content_release_hash ~ '^[0-9a-f]{64}$'
    and public_payload_hash ~ '^[0-9a-f]{64}$'
    and question_seed ~ '^[a-z0-9][a-z0-9-]{2,80}$'
  )
);

create index curriculum_generated_questions_attempt_position_idx
  on public.curriculum_generated_questions (attempt_id, position);

create table private.curriculum_generated_solutions (
  attempt_id uuid not null,
  question_id text not null,
  normalized_correct_answer text not null,
  correct_answer text not null,
  solution_steps jsonb not null,
  feedback text not null,
  private_payload_hash text not null,
  created_at timestamptz not null default now(),
  primary key (attempt_id, question_id),
  foreign key (attempt_id, question_id)
    references public.curriculum_generated_questions(attempt_id, question_id)
    on delete cascade,
  constraint curriculum_generated_solution_content_check check (
    normalized_correct_answer = btrim(normalized_correct_answer)
    and char_length(normalized_correct_answer) between 1 and 200
    and correct_answer = btrim(correct_answer)
    and char_length(correct_answer) between 1 and 200
    and jsonb_typeof(solution_steps) = 'array'
    and jsonb_array_length(solution_steps) > 0
    and feedback = btrim(feedback)
    and char_length(feedback) between 3 and 2000
    and private_payload_hash ~ '^[0-9a-f]{64}$'
  )
);

create table public.curriculum_generated_answers (
  attempt_id uuid not null,
  question_id text not null,
  submission_id uuid not null,
  expected_revision integer not null check (expected_revision >= 0),
  evidence_sequence smallint not null check (evidence_sequence between 1 and 100),
  normalized_answer text not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (attempt_id, question_id),
  unique (attempt_id, submission_id),
  unique (attempt_id, evidence_sequence),
  foreign key (attempt_id, question_id)
    references public.curriculum_generated_questions(attempt_id, question_id)
    on delete cascade,
  constraint curriculum_generated_answer_text_check check (
    normalized_answer = btrim(normalized_answer)
    and char_length(normalized_answer) between 1 and 200
  )
);

create or replace function private.build_generated_curriculum_attempt_state(
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
        'cognitive_level', question.difficulty
      )
    end,
    'feedback', p_feedback
  )
  from public.curriculum_attempts as attempt
  join public.curriculum_release_units as unit
    on unit.release_id = attempt.release_id
    and unit.unit_id = attempt.unit_id
  left join public.curriculum_generated_questions as question
    on question.attempt_id = attempt.id
    and question.question_id = case
      when attempt.current_position <= attempt.total_questions
      then attempt.question_sequence[attempt.current_position]
      else null
    end
  where attempt.id = p_attempt_id
    and attempt.generation_mode = 'ON_DEMAND'
$$;

create or replace function private.verify_curriculum_snapshot_signature(
  p_user_id uuid,
  p_idempotency_key uuid,
  p_snapshot_hash text,
  p_signature text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    pg_catalog.encode(
      extensions.hmac(
        pg_catalog.convert_to(
          p_user_id::text || ':' || p_idempotency_key::text || ':' ||
            p_snapshot_hash,
          'UTF8'
        ),
        pg_catalog.decode(secret.signing_key_hex, 'hex'),
        'sha256'
      ),
      'hex'
    ) = lower(p_signature),
    false
  )
  from private.curriculum_generation_runtime_secret as secret
  where secret.singleton
$$;

create or replace function public.start_or_resume_generated_curriculum(
  p_snapshot jsonb,
  p_signature text,
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
  v_release public.curriculum_releases%rowtype;
  v_unit public.curriculum_release_units%rowtype;
  v_attempt_id uuid;
  v_existing_mode text;
  v_unit_id text := lower(btrim(coalesce(p_snapshot ->> 'unitId', '')));
  v_snapshot_grade smallint;
  v_snapshot_hash text := lower(coalesce(p_snapshot ->> 'snapshotHash', ''));
  v_seed text := lower(btrim(coalesce(p_snapshot ->> 'attemptSeed', '')));
  v_reason text := coalesce(p_snapshot ->> 'selectionReason', '');
  v_questions jsonb := p_snapshot -> 'questions';
  v_solutions jsonb := p_snapshot -> 'solutions';
  v_sequence text[];
  v_question jsonb;
  v_solution jsonb;
  v_contract jsonb;
  v_position integer;
  v_question_id text;
  v_outcome_id text;
  v_skill_id text;
begin
  begin
    if
      v_user_id is null
      or p_idempotency_key is null
      or p_snapshot is null
      or p_signature is null
      or p_signature !~ '^[0-9a-f]{64}$'
      or v_snapshot_hash !~ '^[0-9a-f]{64}$'
      or not private.verify_curriculum_snapshot_signature(
        v_user_id,
        p_idempotency_key,
        v_snapshot_hash,
        p_signature
      )
    then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:INVALID_GENERATION_SIGNATURE';
    end if;

    select student.grade into v_grade
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

    if
      coalesce((p_snapshot ->> 'schemaVersion')::integer, 0) <> 1
      or coalesce(p_snapshot ->> 'releaseId', '') <>
        'plave-math-grades-1-9-v1'
      or coalesce(p_snapshot ->> 'generatorVersion', '') <>
        'vertical-preview-v1'
      or coalesce(p_snapshot ->> 'generationContractVersion',
        'on-demand-curriculum-v1') <> 'on-demand-curriculum-v1'
      or v_unit_id !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      or v_seed !~ '^[a-z0-9][a-z0-9-]{2,80}$'
      or v_reason not in (
        'NO_EVIDENCE',
        'FREQUENT_ERRORS',
        'WEAK_RECENT_EVIDENCE',
        'PREREQUISITE_NOT_SECURE',
        'RETENTION_DUE',
        'TEACHER_DETERMINISTIC',
        'STUDENT_UNIT_CHOICE'
      )
      or jsonb_typeof(v_questions) <> 'array'
      or jsonb_array_length(v_questions) <> 12
      or jsonb_typeof(v_solutions) <> 'array'
      or jsonb_array_length(v_solutions) <> 12
    then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:INVALID_GENERATED_SNAPSHOT';
    end if;

    begin
      v_snapshot_grade := (p_snapshot ->> 'grade')::smallint;
    exception when others then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:INVALID_GENERATED_SNAPSHOT';
    end;
    if v_snapshot_grade <> v_grade then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:GRADE_MISMATCH';
    end if;

    perform pg_advisory_xact_lock(
      hashtextextended(v_user_id::text || ':' || v_unit_id, 0)
    );

    select attempt.id, attempt.generation_mode
    into v_attempt_id, v_existing_mode
    from public.curriculum_attempts as attempt
    where attempt.student_id = v_user_id
      and attempt.start_idempotency_key = p_idempotency_key
    limit 1;
    if v_attempt_id is not null then
      if
        v_existing_mode <> 'ON_DEMAND'
        or not exists (
          select 1 from public.curriculum_attempts as attempt
          where attempt.id = v_attempt_id
            and attempt.unit_id = v_unit_id
            and attempt.snapshot_hash = v_snapshot_hash
        )
      then
        raise exception using errcode = 'P0001',
          message = 'CURRICULUM:IDEMPOTENCY_CONFLICT';
      end if;
      return private.build_generated_curriculum_attempt_state(
        v_attempt_id,
        null
      );
    end if;

    select attempt.id, attempt.generation_mode
    into v_attempt_id, v_existing_mode
    from public.curriculum_attempts as attempt
    where attempt.student_id = v_user_id
      and attempt.unit_id = v_unit_id
      and attempt.status = 'IN_PROGRESS'
    order by attempt.started_at desc, attempt.id desc
    limit 1
    for update;
    if v_attempt_id is not null then
      if v_existing_mode <> 'ON_DEMAND' then
        raise exception using errcode = 'P0001',
          message = 'CURRICULUM:PRACTICE_UNAVAILABLE';
      end if;
      return private.build_generated_curriculum_attempt_state(
        v_attempt_id,
        null
      );
    end if;

    select release.* into v_release
    from public.curriculum_releases as release
    where release.release_id = p_snapshot ->> 'releaseId'
      and release.status = 'ACTIVE'
      and release.activation_state = 'ACTIVE'
      and release.bundle_sha256 = p_snapshot ->> 'contentReleaseHash'
      and release.generator_version = p_snapshot ->> 'generatorVersion';
    if not found then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:RELEASE_UNAVAILABLE';
    end if;

    select unit.* into v_unit
    from public.curriculum_release_units as unit
    where unit.release_id = v_release.release_id
      and unit.unit_id = v_unit_id
      and unit.grade = v_grade;
    if not found then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:UNIT_UNAVAILABLE';
    end if;

    v_sequence := array[]::text[];
    for v_question, v_position in
      select item.value, item.ordinality::integer
      from jsonb_array_elements(v_questions)
        with ordinality as item(value, ordinality)
      order by item.ordinality
    loop
      v_contract := v_question -> 'contract';
      v_question_id := lower(coalesce(v_question ->> 'questionId', ''));
      v_outcome_id := coalesce(v_contract ->> 'outcomeId', '');
      v_skill_id := coalesce(v_contract ->> 'skillId', '');
      if
        coalesce((v_question ->> 'position')::integer, 0) <> v_position
        or v_question_id !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
        or coalesce(v_contract ->> 'contractVersion', '') <>
          'on-demand-curriculum-v1'
        or coalesce((v_contract ->> 'grade')::smallint, 0) <> v_grade
        or coalesce(v_contract ->> 'unitId', '') <> v_unit_id
        or coalesce(v_contract ->> 'releaseId', '') <> v_release.release_id
        or coalesce(v_contract ->> 'generatorVersion', '') <>
          v_release.generator_version
        or coalesce(v_contract ->> 'contentReleaseHash', '') <>
          v_release.bundle_sha256
        or not (v_outcome_id = any(v_unit.official_outcome_ids))
        or not (v_skill_id = any(v_unit.skill_ids))
        or char_length(btrim(coalesce(v_contract ->> 'skillTitle', '')))
          not between 2 and 1000
        or coalesce(v_contract ->> 'difficulty', '') not in
          ('UNDERSTAND', 'APPLY', 'REASON')
        or coalesce(v_contract ->> 'evidenceForm', '') not in (
          'RECOGNIZE_UNDERSTAND',
          'PERFORM',
          'REASON_EXPLAIN',
          'APPLY',
          'ERROR_ANALYSIS'
        )
        or coalesce(v_question ->> 'publicPayloadHash', '') !~
          '^[0-9a-f]{64}$'
      then
        raise exception using errcode = 'P0001',
          message = 'CURRICULUM:INVALID_GENERATED_SNAPSHOT';
      end if;
      v_solution := (
        select item.value
        from jsonb_array_elements(v_solutions) as item(value)
        where item.value ->> 'questionId' = v_question_id
        limit 1
      );
      if
        v_solution is null
        or coalesce(v_solution ->> 'normalizedCorrectAnswer', '') = ''
        or coalesce(v_solution ->> 'correctAnswer', '') = ''
        or jsonb_typeof(v_solution -> 'solutionSteps') <> 'array'
        or jsonb_array_length(v_solution -> 'solutionSteps') = 0
        or coalesce(v_solution ->> 'feedback', '') = ''
        or coalesce(v_solution ->> 'privatePayloadHash', '') !~
          '^[0-9a-f]{64}$'
      then
        raise exception using errcode = 'P0001',
          message = 'CURRICULUM:INVALID_GENERATED_SNAPSHOT';
      end if;
      v_sequence := v_sequence || v_question_id;
    end loop;
    if cardinality(v_sequence) <> 12 or cardinality(v_sequence) <>
      cardinality(array(select distinct unnest(v_sequence)))
    then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:INVALID_GENERATED_SNAPSHOT';
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
      total_questions,
      generation_mode,
      generation_seed,
      generation_contract_version,
      content_release_hash,
      selection_reason,
      snapshot_hash
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
      12,
      'ON_DEMAND',
      v_seed,
      'on-demand-curriculum-v1',
      v_release.bundle_sha256,
      v_reason,
      v_snapshot_hash
    )
    returning id into v_attempt_id;

    for v_question, v_position in
      select item.value, item.ordinality::integer
      from jsonb_array_elements(v_questions)
        with ordinality as item(value, ordinality)
      order by item.ordinality
    loop
      v_contract := v_question -> 'contract';
      v_question_id := lower(v_question ->> 'questionId');
      v_solution := (
        select item.value
        from jsonb_array_elements(v_solutions) as item(value)
        where item.value ->> 'questionId' = v_question_id
        limit 1
      );
      insert into public.curriculum_generated_questions (
        attempt_id, release_id, unit_id, question_id, position,
        contract_version, grade, official_outcome_id,
        official_outcome_title, skill_id, difficulty, evidence_form,
        skill_title,
        question_seed, generator_version, content_release_hash,
        prompt, answer_type, options, visual, misconception_tags,
        public_payload_hash
      ) values (
        v_attempt_id, v_release.release_id, v_unit.unit_id,
        v_question_id, v_position, v_contract ->> 'contractVersion',
        v_grade, v_contract ->> 'outcomeId',
        coalesce(
          (
            select question.official_outcome_titles[
              array_position(
                question.official_outcome_ids,
                v_contract ->> 'outcomeId'
              )
            ]
            from public.curriculum_release_questions as question
            where question.release_id = v_release.release_id
              and question.unit_id = v_unit.unit_id
              and v_contract ->> 'outcomeId' =
                any(question.official_outcome_ids)
            limit 1
          ),
          'Mục tiêu học tập của bài'
        ),
        v_contract ->> 'skillId', v_contract ->> 'difficulty',
        v_contract ->> 'evidenceForm', v_contract ->> 'skillTitle',
        v_contract ->> 'seed',
        v_contract ->> 'generatorVersion',
        v_contract ->> 'contentReleaseHash',
        v_question ->> 'prompt', v_question ->> 'answerType',
        v_question -> 'options', v_question -> 'visual',
        array(
          select jsonb_array_elements_text(
            v_question -> 'misconceptionTags'
          )
        ),
        v_question ->> 'publicPayloadHash'
      );
      insert into private.curriculum_generated_solutions (
        attempt_id, question_id, normalized_correct_answer,
        correct_answer, solution_steps, feedback, private_payload_hash
      ) values (
        v_attempt_id, v_question_id,
        v_solution ->> 'normalizedCorrectAnswer',
        v_solution ->> 'correctAnswer',
        v_solution -> 'solutionSteps',
        v_solution ->> 'feedback',
        v_solution ->> 'privatePayloadHash'
      );
    end loop;

    insert into public.student_curriculum_unit_progress (
      student_id, release_id, unit_id, status, mastery_policy_version
    ) values (
      v_user_id, v_release.release_id, v_unit.unit_id, 'IN_PROGRESS',
      v_release.mastery_policy_version
    )
    on conflict (student_id, release_id, unit_id)
    do update set status = 'IN_PROGRESS', last_activity_at = now();

    return private.build_generated_curriculum_attempt_state(
      v_attempt_id,
      null
    );
  exception when others then
    if left(sqlerrm, 11) = 'CURRICULUM:' then raise; end if;
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:INTEGRITY_FAILURE';
  end;
end;
$$;

create or replace function public.get_generated_curriculum_attempt_state(
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
    and attempt.generation_mode = 'ON_DEMAND'
    and profile.role = 'STUDENT'
    and profile.onboarding_completed
    and student.grade = unit.grade
    and student.grade between 1 and 9;
  if v_attempt_id is null then
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:ATTEMPT_NOT_FOUND';
  end if;
  return private.build_generated_curriculum_attempt_state(
    v_attempt_id,
    null
  );
end;
$$;

create or replace function public.submit_generated_curriculum_answer(
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
  v_existing public.curriculum_generated_answers%rowtype;
  v_question public.curriculum_generated_questions%rowtype;
  v_solution private.curriculum_generated_solutions%rowtype;
  v_release public.curriculum_releases%rowtype;
  v_normalized text;
  v_is_correct boolean;
  v_completed boolean;
  v_new_answered integer;
  v_new_correct integer;
  v_score numeric(5,2);
  v_feedback jsonb;
begin
  begin
    if
      v_user_id is null
      or p_attempt_id is null
      or p_question_id is null
      or p_answer is null
      or p_expected_revision is null
      or p_expected_revision < 0
      or p_idempotency_key is null
    then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:INVALID_REQUEST';
    end if;

    select answer.* into v_existing
    from public.curriculum_generated_answers as answer
    join public.curriculum_attempts as attempt
      on attempt.id = answer.attempt_id
    where answer.attempt_id = p_attempt_id
      and answer.submission_id = p_idempotency_key
      and attempt.student_id = v_user_id
      and attempt.generation_mode = 'ON_DEMAND';
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
      select question.* into v_question
      from public.curriculum_generated_questions as question
      where question.attempt_id = p_attempt_id
        and question.question_id = p_question_id;
      select solution.* into v_solution
      from private.curriculum_generated_solutions as solution
      where solution.attempt_id = p_attempt_id
        and solution.question_id = p_question_id;
      v_normalized := private.curriculum_normalize_answer(
        p_answer,
        v_question.answer_type
      );
      if v_normalized <> v_existing.normalized_answer then
        raise exception using errcode = 'P0001',
          message = 'CURRICULUM:IDEMPOTENCY_CONFLICT';
      end if;
      v_feedback := jsonb_build_object(
        'question_id', v_existing.question_id,
        'is_correct', v_existing.is_correct,
        'correct_answer', v_solution.correct_answer,
        'solution_steps', v_solution.solution_steps,
        'feedback', v_solution.feedback
      );
      return private.build_generated_curriculum_attempt_state(
        p_attempt_id,
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
      and attempt.generation_mode = 'ON_DEMAND'
      and profile.role = 'STUDENT'
      and profile.onboarding_completed
      and student.grade = unit.grade
      and student.grade between 1 and 9
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
      or v_attempt.question_sequence[v_attempt.current_position] <>
        p_question_id
    then
      raise exception using errcode = 'P0001',
        message = 'CURRICULUM:QUESTION_MISMATCH';
    end if;

    select question.* into v_question
    from public.curriculum_generated_questions as question
    where question.attempt_id = p_attempt_id
      and question.question_id = p_question_id;
    select solution.* into v_solution
    from private.curriculum_generated_solutions as solution
    where solution.attempt_id = p_attempt_id
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
    v_new_correct := v_attempt.correct_count +
      case when v_is_correct then 1 else 0 end;
    v_completed := v_new_answered = v_attempt.total_questions;
    v_score := round(
      100.0 * v_new_correct / v_attempt.total_questions,
      2
    );

    insert into public.curriculum_generated_answers (
      attempt_id, question_id, submission_id, expected_revision,
      evidence_sequence, normalized_answer, is_correct
    ) values (
      v_attempt.id, p_question_id, p_idempotency_key,
      p_expected_revision, v_new_answered, v_normalized, v_is_correct
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

    select release.* into v_release
    from public.curriculum_releases as release
    where release.release_id = v_attempt.release_id;

    insert into public.student_curriculum_unit_progress (
      student_id, release_id, unit_id, status, evidence_count,
      correct_count, completed_attempt_count, best_score_percent,
      mastery_label, mastery_policy_version, last_activity_at, completed_at
    ) values (
      v_user_id, v_attempt.release_id, v_attempt.unit_id,
      case when v_completed then 'COMPLETED' else 'IN_PROGRESS' end,
      1, case when v_is_correct then 1 else 0 end,
      case when v_completed then 1 else 0 end,
      case when v_completed then v_score else null end,
      case
        when v_completed and v_score >= 85 then 'PROFICIENT'
        when v_completed and v_score < 50 then 'NEEDS_PRACTICE'
        when v_completed then 'DEVELOPING'
        else 'IN_PROGRESS'
      end,
      v_release.mastery_policy_version, now(),
      case when v_completed then now() else null end
    )
    on conflict (student_id, release_id, unit_id)
    do update set
      status = excluded.status,
      evidence_count =
        student_curriculum_unit_progress.evidence_count + 1,
      correct_count =
        student_curriculum_unit_progress.correct_count +
          case when v_is_correct then 1 else 0 end,
      completed_attempt_count =
        student_curriculum_unit_progress.completed_attempt_count +
          case when v_completed then 1 else 0 end,
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
        when v_score >= 85 and
          student_curriculum_unit_progress.completed_attempt_count >= 1
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

    insert into public.student_curriculum_outcome_progress (
      student_id, release_id, official_outcome_id,
      official_outcome_title, evidence_count, correct_count,
      recent_evidence, mastery_label, mastery_policy_version,
      last_activity_at
    ) values (
      v_user_id, v_attempt.release_id, v_question.official_outcome_id,
      v_question.official_outcome_title, 1,
      case when v_is_correct then 1 else 0 end,
      array[v_is_correct], 'DEVELOPING',
      v_release.mastery_policy_version, now()
    )
    on conflict (student_id, release_id, official_outcome_id)
    do update set
      official_outcome_title = excluded.official_outcome_title,
      evidence_count =
        student_curriculum_outcome_progress.evidence_count + 1,
      correct_count =
        student_curriculum_outcome_progress.correct_count +
          case when v_is_correct then 1 else 0 end,
      recent_evidence = private.curriculum_recent_append(
        student_curriculum_outcome_progress.recent_evidence,
        v_is_correct
      ),
      mastery_label = private.curriculum_mastery_label(
        student_curriculum_outcome_progress.evidence_count + 1,
        student_curriculum_outcome_progress.correct_count +
          case when v_is_correct then 1 else 0 end,
        private.curriculum_recent_append(
          student_curriculum_outcome_progress.recent_evidence,
          v_is_correct
        )
      ),
      last_activity_at = now();

    insert into public.student_curriculum_skill_progress (
      student_id, release_id, skill_id, skill_title, evidence_count,
      correct_count, recent_evidence, mastery_label,
      mastery_policy_version, last_activity_at
    ) values (
      v_user_id, v_attempt.release_id, v_question.skill_id,
      v_question.skill_title, 1, case when v_is_correct then 1 else 0 end,
      array[v_is_correct], 'DEVELOPING',
      v_release.mastery_policy_version, now()
    )
    on conflict (student_id, release_id, skill_id)
    do update set
      skill_title = excluded.skill_title,
      evidence_count =
        student_curriculum_skill_progress.evidence_count + 1,
      correct_count =
        student_curriculum_skill_progress.correct_count +
          case when v_is_correct then 1 else 0 end,
      recent_evidence = private.curriculum_recent_append(
        student_curriculum_skill_progress.recent_evidence,
        v_is_correct
      ),
      mastery_label = private.curriculum_mastery_label(
        student_curriculum_skill_progress.evidence_count + 1,
        student_curriculum_skill_progress.correct_count +
          case when v_is_correct then 1 else 0 end,
        private.curriculum_recent_append(
          student_curriculum_skill_progress.recent_evidence,
          v_is_correct
        )
      ),
      last_activity_at = now();

    v_feedback := jsonb_build_object(
      'question_id', p_question_id,
      'is_correct', v_is_correct,
      'correct_answer', v_solution.correct_answer,
      'solution_steps', v_solution.solution_steps,
      'feedback', v_solution.feedback
    );
    return private.build_generated_curriculum_attempt_state(
      v_attempt.id,
      v_feedback
    );
  exception when unique_violation then
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:DUPLICATE_SUBMISSION';
  when others then
    if left(sqlerrm, 11) = 'CURRICULUM:' then raise; end if;
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:INTEGRITY_FAILURE';
  end;
end;
$$;

create or replace function public.get_my_generated_curriculum_evidence()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_grade smallint;
  v_units jsonb := '[]'::jsonb;
  v_outcomes jsonb := '[]'::jsonb;
  v_skills jsonb := '[]'::jsonb;
  v_attempts jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:UNAUTHENTICATED';
  end if;
  select student.grade into v_grade
  from public.profiles as profile
  join public.student_profiles as student
    on student.user_id = profile.user_id
  where profile.user_id = v_user_id
    and profile.role = 'STUDENT'
    and profile.onboarding_completed
    and student.grade between 1 and 9;
  if v_grade is null then
    raise exception using errcode = 'P0001',
      message = 'CURRICULUM:FORBIDDEN';
  end if;

  if v_grade = 1 then
    select coalesce(jsonb_agg(jsonb_build_object(
      'unit_id', history.unit_id,
      'title', history.title,
      'status', history.status,
      'evidence_count', history.evidence_count,
      'correct_count', history.correct_count,
      'best_score_percent', history.best_score_percent,
      'mastery_label', history.mastery_label,
      'last_activity_at', history.last_activity_at,
      'source', 'UNIVERSAL_CURRICULUM'
    ) order by history.display_order), '[]'::jsonb)
    into v_units
    from (
      select
        unit.unit_id,
        unit.title,
        unit.display_order,
        case
          when bool_or(attempt.status = 'IN_PROGRESS') then 'IN_PROGRESS'
          when bool_or(attempt.status = 'COMPLETED') then 'COMPLETED'
          else 'NOT_STARTED'
        end as status,
        sum(attempt.answered_count)::integer as evidence_count,
        sum(attempt.correct_count)::integer as correct_count,
        max(
          case when attempt.status = 'COMPLETED'
            then round(
              100.0 * attempt.correct_count
                / greatest(attempt.total_questions, 1),
              2
            )
            else null
          end
        ) as best_score_percent,
        case
          when bool_or(attempt.status = 'COMPLETED')
            and max(
              100.0 * attempt.correct_count
                / greatest(attempt.total_questions, 1)
            ) >= 85 then 'PROFICIENT'
          when bool_or(attempt.status = 'COMPLETED')
            and max(
              100.0 * attempt.correct_count
                / greatest(attempt.total_questions, 1)
            ) < 50 then 'NEEDS_PRACTICE'
          when bool_or(attempt.status = 'COMPLETED') then 'DEVELOPING'
          else 'IN_PROGRESS'
        end as mastery_label,
        max(attempt.updated_at) as last_activity_at
      from public.curriculum_attempts as attempt
      join public.curriculum_release_units as unit
        on unit.release_id = attempt.release_id
        and unit.unit_id = attempt.unit_id
        and unit.grade = 1
      where attempt.student_id = v_user_id
        and attempt.generation_mode = 'ON_DEMAND'
      group by unit.unit_id, unit.title, unit.display_order
    ) as history;

    select coalesce(jsonb_agg(jsonb_build_object(
      'title', evidence.title,
      'evidence_count', evidence.evidence_count,
      'correct_count', evidence.correct_count,
      'mastery_label', private.curriculum_mastery_label(
        evidence.evidence_count,
        evidence.correct_count,
        evidence.recent_evidence
      ),
      'last_activity_at', evidence.last_activity_at,
      'evidence_basis', 'AUTHORITATIVE_QUESTION_MAPPING'
    ) order by evidence.last_activity_at desc), '[]'::jsonb)
    into v_outcomes
    from (
      select
        question.official_outcome_id,
        max(question.official_outcome_title) as title,
        count(*)::integer as evidence_count,
        count(*) filter (where answer.is_correct)::integer as correct_count,
        (array_agg(
          answer.is_correct order by answer.answered_at desc
        ))[1:5] as recent_evidence,
        max(answer.answered_at) as last_activity_at
      from public.curriculum_generated_answers as answer
      join public.curriculum_attempts as attempt
        on attempt.id = answer.attempt_id
      join public.curriculum_generated_questions as question
        on question.attempt_id = answer.attempt_id
        and question.question_id = answer.question_id
      where attempt.student_id = v_user_id
        and attempt.generation_mode = 'ON_DEMAND'
      group by question.official_outcome_id
    ) as evidence;

    select coalesce(jsonb_agg(jsonb_build_object(
      'title', evidence.title,
      'evidence_count', evidence.evidence_count,
      'correct_count', evidence.correct_count,
      'mastery_label', private.curriculum_mastery_label(
        evidence.evidence_count,
        evidence.correct_count,
        evidence.recent_evidence
      ),
      'last_activity_at', evidence.last_activity_at,
      'evidence_basis', 'AUTHORITATIVE_QUESTION_MAPPING'
    ) order by evidence.last_activity_at desc), '[]'::jsonb)
    into v_skills
    from (
      select
        question.skill_id,
        max(question.skill_title) as title,
        count(*)::integer as evidence_count,
        count(*) filter (where answer.is_correct)::integer as correct_count,
        (array_agg(
          answer.is_correct order by answer.answered_at desc
        ))[1:5] as recent_evidence,
        max(answer.answered_at) as last_activity_at
      from public.curriculum_generated_answers as answer
      join public.curriculum_attempts as attempt
        on attempt.id = answer.attempt_id
      join public.curriculum_generated_questions as question
        on question.attempt_id = answer.attempt_id
        and question.question_id = answer.question_id
      where attempt.student_id = v_user_id
        and attempt.generation_mode = 'ON_DEMAND'
      group by question.skill_id
    ) as evidence;

    select coalesce(jsonb_agg(jsonb_build_object(
      'attempt_id', history.id,
      'unit_id', history.unit_id,
      'unit_title', history.unit_title,
      'status', history.status,
      'answered_count', history.answered_count,
      'correct_count', history.correct_count,
      'total_questions', history.total_questions,
      'started_at', history.started_at,
      'completed_at', history.completed_at,
      'source', 'UNIVERSAL_CURRICULUM'
    ) order by history.started_at desc), '[]'::jsonb)
    into v_attempts
    from (
      select
        attempt.id,
        attempt.unit_id,
        unit.title as unit_title,
        attempt.status,
        attempt.answered_count,
        attempt.correct_count,
        attempt.total_questions,
        attempt.started_at,
        attempt.completed_at
      from public.curriculum_attempts as attempt
      join public.curriculum_release_units as unit
        on unit.release_id = attempt.release_id
        and unit.unit_id = attempt.unit_id
      where attempt.student_id = v_user_id
        and attempt.generation_mode = 'ON_DEMAND'
      order by attempt.started_at desc
      limit 50
    ) as history;
  end if;

  return jsonb_build_object(
    'grade', v_grade,
    'units', v_units,
    'outcomes', v_outcomes,
    'skills', v_skills,
    'attempts', v_attempts
  );
end;
$$;

create or replace function public.get_parent_child_generated_curriculum_progress(
  p_connection_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_parent_user_id uuid;
  v_student_user_id uuid;
  v_grade smallint;
  v_attempt_count bigint := 0;
  v_completed_attempt_count bigint := 0;
  v_started_unit_count bigint := 0;
  v_completed_unit_count bigint := 0;
  v_total_answered bigint := 0;
  v_total_correct bigint := 0;
  v_last_activity_at timestamptz;
  v_recent boolean[] := array[]::boolean[];
  v_mastery_label text;
  v_units jsonb := '[]'::jsonb;
  v_outcomes jsonb := '[]'::jsonb;
  v_skills jsonb := '[]'::jsonb;
  v_attempts jsonb := '[]'::jsonb;
begin
  v_parent_user_id := private.require_connection_actor('PARENT');
  select connection.student_user_id, student.grade
  into v_student_user_id, v_grade
  from public.parent_student_connections as connection
  join public.profiles as profile
    on profile.user_id = connection.student_user_id
    and profile.role = 'STUDENT'
    and profile.onboarding_completed
  join public.student_profiles as student
    on student.user_id = connection.student_user_id
    and student.grade between 1 and 9
  where connection.id = p_connection_id
    and connection.parent_user_id = v_parent_user_id
    and connection.status = 'APPROVED';
  if v_student_user_id is null or v_grade is null then
    raise exception using errcode = 'P0001',
      message = 'PARENT_PROGRESS:FORBIDDEN';
  end if;

  if v_grade = 1 then
    select
      count(*),
      count(*) filter (where history.status = 'COMPLETED'),
      count(distinct history.unit_id),
      count(distinct history.unit_id)
        filter (where history.status = 'COMPLETED'),
      max(history.updated_at)
    into
      v_attempt_count,
      v_completed_attempt_count,
      v_started_unit_count,
      v_completed_unit_count,
      v_last_activity_at
    from (
      select
        attempt.unit_slug as unit_id,
        attempt.status,
        attempt.updated_at
      from public.practice_attempts as attempt
      where attempt.student_id = v_student_user_id
      union all
      select
        attempt.unit_id,
        attempt.status,
        attempt.updated_at
      from public.curriculum_attempts as attempt
      where attempt.student_id = v_student_user_id
        and attempt.generation_mode = 'ON_DEMAND'
    ) as history;

    select
      count(*),
      count(*) filter (where evidence.is_correct),
      coalesce(
        (array_agg(
          evidence.is_correct order by evidence.answered_at desc
        ))[1:5],
        array[]::boolean[]
      )
    into v_total_answered, v_total_correct, v_recent
    from (
      select answer.is_correct, answer.answered_at
      from public.practice_answers as answer
      join public.practice_attempts as attempt
        on attempt.id = answer.attempt_id
      where attempt.student_id = v_student_user_id
      union all
      select answer.is_correct, answer.answered_at
      from public.curriculum_generated_answers as answer
      join public.curriculum_attempts as attempt
        on attempt.id = answer.attempt_id
      where attempt.student_id = v_student_user_id
        and attempt.generation_mode = 'ON_DEMAND'
    ) as evidence;

    select coalesce(jsonb_agg(jsonb_build_object(
      'unit_id', history.unit_id,
      'title', history.title,
      'status', history.status,
      'evidence_count', history.evidence_count,
      'correct_count', history.correct_count,
      'accuracy_percent', case
        when history.evidence_count = 0 then null
        else round(
          history.correct_count::numeric * 100 / history.evidence_count,
          1
        )
      end,
      'mastery_label', history.mastery_label,
      'last_activity_at', history.last_activity_at,
      'source', 'ON_DEMAND_CURRICULUM'
    ) order by history.display_order), '[]'::jsonb)
    into v_units
    from (
      select
        unit.unit_id,
        unit.title,
        unit.display_order,
        case
          when bool_or(attempt.status = 'IN_PROGRESS') then 'IN_PROGRESS'
          when bool_or(attempt.status = 'COMPLETED') then 'COMPLETED'
          else 'NOT_STARTED'
        end as status,
        sum(attempt.answered_count)::integer as evidence_count,
        sum(attempt.correct_count)::integer as correct_count,
        case
          when bool_or(attempt.status = 'COMPLETED')
            and max(
              100.0 * attempt.correct_count
                / greatest(attempt.total_questions, 1)
            ) >= 85 then 'PROFICIENT'
          when bool_or(attempt.status = 'COMPLETED')
            and max(
              100.0 * attempt.correct_count
                / greatest(attempt.total_questions, 1)
            ) < 50 then 'NEEDS_PRACTICE'
          when bool_or(attempt.status = 'COMPLETED') then 'DEVELOPING'
          else 'IN_PROGRESS'
        end as mastery_label,
        max(attempt.updated_at) as last_activity_at
      from public.curriculum_attempts as attempt
      join public.curriculum_release_units as unit
        on unit.release_id = attempt.release_id
        and unit.unit_id = attempt.unit_id
        and unit.grade = 1
      where attempt.student_id = v_student_user_id
        and attempt.generation_mode = 'ON_DEMAND'
      group by unit.unit_id, unit.title, unit.display_order
    ) as history;

    select coalesce(jsonb_agg(jsonb_build_object(
      'title', evidence.title,
      'evidence_count', evidence.evidence_count,
      'correct_count', evidence.correct_count,
      'accuracy_percent', round(
        evidence.correct_count::numeric * 100 / evidence.evidence_count,
        1
      ),
      'mastery_label', private.curriculum_mastery_label(
        evidence.evidence_count,
        evidence.correct_count,
        evidence.recent_evidence
      ),
      'last_activity_at', evidence.last_activity_at,
      'source', 'ON_DEMAND_CURRICULUM'
    ) order by evidence.last_activity_at desc), '[]'::jsonb)
    into v_outcomes
    from (
      select
        question.official_outcome_id,
        max(question.official_outcome_title) as title,
        count(*)::integer as evidence_count,
        count(*) filter (where answer.is_correct)::integer as correct_count,
        (array_agg(
          answer.is_correct order by answer.answered_at desc
        ))[1:5] as recent_evidence,
        max(answer.answered_at) as last_activity_at
      from public.curriculum_generated_answers as answer
      join public.curriculum_attempts as attempt
        on attempt.id = answer.attempt_id
      join public.curriculum_generated_questions as question
        on question.attempt_id = answer.attempt_id
        and question.question_id = answer.question_id
      where attempt.student_id = v_student_user_id
        and attempt.generation_mode = 'ON_DEMAND'
      group by question.official_outcome_id
    ) as evidence;

    select coalesce(jsonb_agg(jsonb_build_object(
      'title', evidence.title,
      'evidence_count', evidence.evidence_count,
      'correct_count', evidence.correct_count,
      'accuracy_percent', round(
        evidence.correct_count::numeric * 100 / evidence.evidence_count,
        1
      ),
      'mastery_label', private.curriculum_mastery_label(
        evidence.evidence_count,
        evidence.correct_count,
        evidence.recent_evidence
      ),
      'last_activity_at', evidence.last_activity_at,
      'source', 'ON_DEMAND_CURRICULUM'
    ) order by evidence.last_activity_at desc), '[]'::jsonb)
    into v_skills
    from (
      select
        question.skill_id,
        max(question.skill_title) as title,
        count(*)::integer as evidence_count,
        count(*) filter (where answer.is_correct)::integer as correct_count,
        (array_agg(
          answer.is_correct order by answer.answered_at desc
        ))[1:5] as recent_evidence,
        max(answer.answered_at) as last_activity_at
      from public.curriculum_generated_answers as answer
      join public.curriculum_attempts as attempt
        on attempt.id = answer.attempt_id
      join public.curriculum_generated_questions as question
        on question.attempt_id = answer.attempt_id
        and question.question_id = answer.question_id
      where attempt.student_id = v_student_user_id
        and attempt.generation_mode = 'ON_DEMAND'
      group by question.skill_id
    ) as evidence;

    select coalesce(jsonb_agg(jsonb_build_object(
      'attempt_id', history.id,
      'unit_title', history.unit_title,
      'status', history.status,
      'answered_count', history.answered_count,
      'correct_count', history.correct_count,
      'total_questions', history.total_questions,
      'started_at', history.started_at,
      'completed_at', history.completed_at,
      'source', 'UNIVERSAL_CURRICULUM'
    ) order by history.started_at desc), '[]'::jsonb)
    into v_attempts
    from (
      select
        attempt.id,
        unit.title as unit_title,
        attempt.status,
        attempt.answered_count,
        attempt.correct_count,
        attempt.total_questions,
        attempt.started_at,
        attempt.completed_at
      from public.curriculum_attempts as attempt
      join public.curriculum_release_units as unit
        on unit.release_id = attempt.release_id
        and unit.unit_id = attempt.unit_id
      where attempt.student_id = v_student_user_id
        and attempt.generation_mode = 'ON_DEMAND'
      order by attempt.started_at desc
      limit 50
    ) as history;
  else
    select
      count(*),
      count(*) filter (where attempt.status = 'COMPLETED'),
      count(distinct attempt.unit_id),
      count(distinct attempt.unit_id)
        filter (where attempt.status = 'COMPLETED'),
      max(attempt.updated_at)
    into
      v_attempt_count,
      v_completed_attempt_count,
      v_started_unit_count,
      v_completed_unit_count,
      v_last_activity_at
    from public.curriculum_attempts as attempt
    where attempt.student_id = v_student_user_id;

    select
      count(*),
      count(*) filter (where evidence.is_correct),
      coalesce(
        (array_agg(
          evidence.is_correct order by evidence.answered_at desc
        ))[1:5],
        array[]::boolean[]
      )
    into v_total_answered, v_total_correct, v_recent
    from (
      select answer.is_correct, answer.answered_at
      from public.curriculum_answers as answer
      join public.curriculum_attempts as attempt
        on attempt.id = answer.attempt_id
      where attempt.student_id = v_student_user_id
      union all
      select answer.is_correct, answer.answered_at
      from public.curriculum_generated_answers as answer
      join public.curriculum_attempts as attempt
        on attempt.id = answer.attempt_id
      where attempt.student_id = v_student_user_id
        and attempt.generation_mode = 'ON_DEMAND'
    ) as evidence;
  end if;

  v_mastery_label := case
    when v_total_answered = 0 and v_attempt_count = 0 then 'NOT_STARTED'
    when v_total_answered < 3 then 'IN_PROGRESS'
    else private.curriculum_mastery_label(
      v_total_answered::integer,
      v_total_correct::integer,
      v_recent
    )
  end;

  return jsonb_build_object(
    'grade', v_grade,
    'combined_summary', jsonb_build_object(
      'attempt_count', v_attempt_count,
      'completed_attempt_count', v_completed_attempt_count,
      'started_unit_count', v_started_unit_count,
      'completed_unit_count', v_completed_unit_count,
      'total_answered', v_total_answered,
      'total_correct', v_total_correct,
      'accuracy_percent', case
        when v_total_answered = 0 then null
        else round(v_total_correct::numeric * 100 / v_total_answered, 1)
      end,
      'last_activity_at', v_last_activity_at,
      'mastery_label', v_mastery_label
    ),
    'grade_one_generated', jsonb_build_object(
      'units', v_units,
      'outcomes', v_outcomes,
      'skills', v_skills,
      'attempts', v_attempts
    )
  );
end;
$$;

alter table private.curriculum_generation_runtime_secret
  enable row level security;
alter table public.curriculum_generated_questions enable row level security;
alter table private.curriculum_generated_solutions enable row level security;
alter table public.curriculum_generated_answers enable row level security;
alter table private.curriculum_generation_runtime_secret
  force row level security;
alter table public.curriculum_generated_questions force row level security;
alter table private.curriculum_generated_solutions force row level security;
alter table public.curriculum_generated_answers force row level security;

create policy curriculum_generated_answers_select_own
on public.curriculum_generated_answers for select to authenticated
using (exists (
  select 1 from public.curriculum_attempts as attempt
  where attempt.id = curriculum_generated_answers.attempt_id
    and attempt.student_id = auth.uid()
));

revoke all on table private.curriculum_generation_runtime_secret
  from public, anon, authenticated;
revoke all on table public.curriculum_generated_questions
  from public, anon, authenticated;
revoke all on table private.curriculum_generated_solutions
  from public, anon, authenticated;
revoke all on table public.curriculum_generated_answers
  from public, anon, authenticated;
revoke all on function private.build_generated_curriculum_attempt_state(
  uuid, jsonb
) from public, anon, authenticated;
revoke all on function private.verify_curriculum_snapshot_signature(
  uuid, uuid, text, text
) from public, anon, authenticated;
revoke all on function public.start_or_resume_generated_curriculum(
  jsonb, text, uuid
) from public, anon;
revoke all on function public.get_generated_curriculum_attempt_state(uuid)
  from public, anon;
revoke all on function public.submit_generated_curriculum_answer(
  uuid, text, text, integer, uuid
) from public, anon;
revoke all on function public.get_parent_child_generated_curriculum_progress(
  uuid
) from public, anon;
revoke all on function public.get_my_generated_curriculum_evidence()
  from public, anon;

grant execute on function public.start_or_resume_generated_curriculum(
  jsonb, text, uuid
) to authenticated;
grant execute on function public.get_generated_curriculum_attempt_state(uuid)
  to authenticated;
grant execute on function public.submit_generated_curriculum_answer(
  uuid, text, text, integer, uuid
) to authenticated;
grant execute on function public.get_parent_child_generated_curriculum_progress(
  uuid
) to authenticated;
grant execute on function public.get_my_generated_curriculum_evidence()
  to authenticated;

commit;
