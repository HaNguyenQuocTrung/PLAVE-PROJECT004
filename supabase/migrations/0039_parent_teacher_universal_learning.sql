begin;

-- LOCAL-ONLY DRAFT. This migration is additive and must not be applied
-- remotely without a separate Owner approval. It does not activate a
-- curriculum release, publish an assignment, or alter legacy Grade 1 data.

do $precondition$
begin
  if
    pg_catalog.to_regclass('public.curriculum_releases') is null
    or pg_catalog.to_regclass('public.curriculum_release_units') is null
    or pg_catalog.to_regclass('public.curriculum_release_questions') is null
    or pg_catalog.to_regclass('private.curriculum_release_solutions') is null
    or pg_catalog.to_regclass('public.teacher_assignments') is null
    or pg_catalog.to_regclass('public.parent_student_connections') is null
  then
    raise exception 'UNIVERSAL_COLLABORATION:PRECONDITION_FAILED';
  end if;
end;
$precondition$;

alter table public.teacher_questions
  add column if not exists content_source text not null default 'AUTHORED',
  add column if not exists source_release_id text,
  add column if not exists source_unit_id text,
  add column if not exists source_question_id text,
  add column if not exists source_question_payload_hash text,
  add column if not exists source_solution_payload_hash text,
  add column if not exists official_outcome_ids text[],
  add column if not exists official_outcome_titles text[],
  add column if not exists skill_id text,
  add column if not exists skill_title text,
  add column if not exists visual jsonb,
  add column if not exists cognitive_level text;

alter table public.teacher_questions
  drop constraint if exists teacher_questions_question_type_check;
alter table public.teacher_questions
  add constraint teacher_questions_question_type_check
  check (question_type in ('MULTIPLE_CHOICE', 'NUMBER_INPUT', 'TEXT_INPUT'));
alter table public.teacher_questions
  drop constraint if exists teacher_questions_prompt_check;
alter table public.teacher_questions
  add constraint teacher_questions_prompt_check
  check (
    prompt = btrim(prompt)
    and char_length(prompt) between 3 and 2000
  );
alter table public.teacher_questions
  drop constraint if exists teacher_questions_options_check;
alter table public.teacher_questions
  add constraint teacher_questions_options_check
  check (
    (
      question_type = 'MULTIPLE_CHOICE'
      and options is not null
      and jsonb_typeof(options) = 'object'
      and options ?& array['A', 'B', 'C', 'D']
      and (options - array['A', 'B', 'C', 'D']::text[]) = '{}'::jsonb
      and jsonb_typeof(options -> 'A') = 'string'
      and jsonb_typeof(options -> 'B') = 'string'
      and jsonb_typeof(options -> 'C') = 'string'
      and jsonb_typeof(options -> 'D') = 'string'
      and btrim(options ->> 'A') <> ''
      and btrim(options ->> 'B') <> ''
      and btrim(options ->> 'C') <> ''
      and btrim(options ->> 'D') <> ''
      and char_length(options ->> 'A') <= 500
      and char_length(options ->> 'B') <= 500
      and char_length(options ->> 'C') <= 500
      and char_length(options ->> 'D') <= 500
    )
    or (
      question_type in ('NUMBER_INPUT', 'TEXT_INPUT')
      and options is null
    )
  );

alter table public.teacher_questions
  drop constraint if exists teacher_questions_content_source_check;
alter table public.teacher_questions
  add constraint teacher_questions_content_source_check
  check (
    (
      content_source = 'AUTHORED'
      and source_release_id is null
      and source_unit_id is null
      and source_question_id is null
      and source_question_payload_hash is null
      and source_solution_payload_hash is null
      and official_outcome_ids is null
      and official_outcome_titles is null
      and skill_id is null
      and skill_title is null
      and visual is null
      and cognitive_level is null
    )
    or (
      content_source = 'CURRICULUM_SNAPSHOT'
      and source_release_id is not null
      and source_unit_id is not null
      and source_question_id is not null
      and source_question_payload_hash ~ '^[0-9a-f]{64}$'
      and source_solution_payload_hash ~ '^[0-9a-f]{64}$'
      and cardinality(official_outcome_ids) > 0
      and cardinality(official_outcome_ids) = cardinality(official_outcome_titles)
      and array_position(official_outcome_ids, null) is null
      and array_position(official_outcome_titles, null) is null
      and skill_id is not null
      and skill_title is not null
      and jsonb_typeof(visual) = 'object'
      and cognitive_level in ('UNDERSTAND', 'APPLY', 'REASON')
    )
  );
alter table public.teacher_questions
  drop constraint if exists teacher_questions_source_question_fk;
alter table public.teacher_questions
  add constraint teacher_questions_source_question_fk
  foreign key (
    source_release_id, source_unit_id, source_question_id
  ) references public.curriculum_release_questions(
    release_id, unit_id, question_id
  ) on delete restrict;

alter table public.teacher_question_solutions
  add column if not exists display_correct_answer text,
  add column if not exists feedback text,
  add column if not exists solution_payload_hash text;

update public.teacher_question_solutions
set
  display_correct_answer = coalesce(display_correct_answer, correct_answer),
  feedback = coalesce(feedback, explanation)
where display_correct_answer is null or feedback is null;

alter table public.teacher_question_solutions
  drop constraint if exists teacher_question_solutions_answer_check;
alter table public.teacher_question_solutions
  add constraint teacher_question_solutions_answer_check
  check (
    correct_answer = btrim(correct_answer)
    and char_length(correct_answer) between 1 and 200
    and display_correct_answer = btrim(display_correct_answer)
    and char_length(display_correct_answer) between 1 and 200
  );
alter table public.teacher_question_solutions
  drop constraint if exists teacher_question_solutions_explanation_check;
alter table public.teacher_question_solutions
  add constraint teacher_question_solutions_explanation_check
  check (
    explanation = btrim(explanation)
    and char_length(explanation) between 3 and 2000
    and feedback = btrim(feedback)
    and char_length(feedback) between 3 and 2000
  );
alter table public.teacher_question_solutions
  drop constraint if exists teacher_question_solutions_steps_check;
alter table public.teacher_question_solutions
  add constraint teacher_question_solutions_steps_check
  check (private.is_nonempty_text_array(solution_steps, 1, 12, 1000));
alter table public.teacher_question_solutions
  drop constraint if exists teacher_question_solutions_snapshot_hash_check;
alter table public.teacher_question_solutions
  add constraint teacher_question_solutions_snapshot_hash_check
  check (
    solution_payload_hash is null
    or solution_payload_hash ~ '^[0-9a-f]{64}$'
  );

alter table public.teacher_assignments
  add column if not exists content_source text not null default 'AUTHORED',
  add column if not exists source_draft_id uuid,
  add column if not exists snapshot_release_id text,
  add column if not exists snapshot_content_version text,
  add column if not exists snapshot_generator_version text,
  add column if not exists snapshot_seed text,
  add column if not exists snapshot_hash text,
  add column if not exists selection_mode text;

alter table public.teacher_assignments
  drop constraint if exists teacher_assignments_content_source_check;
alter table public.teacher_assignments
  add constraint teacher_assignments_content_source_check
  check (
    (
      content_source = 'AUTHORED'
      and source_draft_id is null
      and snapshot_release_id is null
      and snapshot_content_version is null
      and snapshot_generator_version is null
      and snapshot_seed is null
      and snapshot_hash is null
      and selection_mode is null
    )
    or (
      content_source = 'CURRICULUM_SNAPSHOT'
      and source_draft_id is not null
      and snapshot_release_id is not null
      and snapshot_content_version is not null
      and snapshot_generator_version is not null
      and snapshot_seed is not null
      and snapshot_hash ~ '^[0-9a-f]{64}$'
      and selection_mode in ('DETERMINISTIC', 'MANUAL')
    )
  );
alter table public.teacher_assignments
  drop constraint if exists teacher_assignments_snapshot_release_fk;
alter table public.teacher_assignments
  add constraint teacher_assignments_snapshot_release_fk
  foreign key (snapshot_release_id)
  references public.curriculum_releases(release_id)
  on delete restrict;

alter table public.assignment_submissions
  add column if not exists revision integer not null default 0
    check (revision >= 0);

alter table public.assignment_answers
  drop constraint if exists assignment_answers_value_check;
alter table public.assignment_answers
  add constraint assignment_answers_value_check
  check (
    normalized_answer = btrim(normalized_answer)
    and char_length(normalized_answer) between 1 and 200
  );

create table if not exists public.teacher_curriculum_assignment_drafts (
  id uuid primary key default extensions.gen_random_uuid(),
  teacher_id uuid not null
    references public.teacher_profiles(user_id) on delete cascade,
  classroom_id uuid not null
    references public.classrooms(id) on delete restrict,
  creation_request_id uuid not null,
  release_id text not null
    references public.curriculum_releases(release_id) on delete restrict,
  content_version text not null,
  generator_version text not null,
  deterministic_seed text not null,
  grade smallint not null check (grade between 1 and 9),
  title text not null,
  instructions text,
  due_at timestamptz,
  selection_mode text not null
    check (selection_mode in ('DETERMINISTIC', 'MANUAL')),
  selection_spec jsonb not null,
  snapshot_hash text not null check (snapshot_hash ~ '^[0-9a-f]{64}$'),
  item_count smallint not null check (item_count between 1 and 50),
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'PUBLISHED', 'DISCARDED')),
  published_assignment_id uuid
    references public.teacher_assignments(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (teacher_id, creation_request_id),
  constraint teacher_curriculum_draft_title_check check (
    title = btrim(title) and char_length(title) between 3 and 120
  ),
  constraint teacher_curriculum_draft_instructions_check check (
    instructions is null
    or (
      instructions = btrim(instructions)
      and char_length(instructions) between 1 and 1000
    )
  ),
  constraint teacher_curriculum_draft_state_check check (
    (status = 'DRAFT' and published_assignment_id is null and published_at is null)
    or (
      status = 'PUBLISHED'
      and published_assignment_id is not null
      and published_at is not null
    )
    or (
      status = 'DISCARDED'
      and published_assignment_id is null
      and published_at is null
    )
  )
);

create table if not exists public.teacher_curriculum_assignment_draft_items (
  draft_id uuid not null
    references public.teacher_curriculum_assignment_drafts(id) on delete restrict,
  release_id text not null,
  unit_id text not null,
  question_id text not null,
  display_order smallint not null check (display_order between 1 and 50),
  question_payload_hash text not null check (
    question_payload_hash ~ '^[0-9a-f]{64}$'
  ),
  solution_payload_hash text not null check (
    solution_payload_hash ~ '^[0-9a-f]{64}$'
  ),
  created_at timestamptz not null default now(),
  primary key (draft_id, question_id),
  unique (draft_id, display_order),
  foreign key (release_id, unit_id, question_id)
    references public.curriculum_release_questions(
      release_id, unit_id, question_id
    ) on delete restrict
);

alter table public.teacher_assignments
  drop constraint if exists teacher_assignments_source_draft_fk;
alter table public.teacher_assignments
  add constraint teacher_assignments_source_draft_fk
  foreign key (source_draft_id)
  references public.teacher_curriculum_assignment_drafts(id)
  on delete restrict;

create table if not exists private.assignment_submission_mutations (
  submission_id uuid not null
    references public.assignment_submissions(id) on delete cascade,
  idempotency_key uuid not null,
  mutation_kind text not null check (mutation_kind in ('SAVE', 'SUBMIT')),
  question_id uuid,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  resulting_revision integer not null check (resulting_revision > 0),
  result_payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (submission_id, idempotency_key),
  constraint assignment_submission_mutation_shape_check check (
    (mutation_kind = 'SAVE' and question_id is not null)
    or (mutation_kind = 'SUBMIT' and question_id is null)
  )
);

create table if not exists public.student_assignment_outcome_progress (
  student_id uuid not null
    references public.student_profiles(user_id) on delete cascade,
  assignment_id uuid not null
    references public.teacher_assignments(id) on delete restrict,
  official_outcome_id text not null,
  official_outcome_title text not null,
  evidence_count integer not null check (evidence_count > 0),
  correct_count integer not null check (
    correct_count between 0 and evidence_count
  ),
  last_activity_at timestamptz not null,
  primary key (student_id, assignment_id, official_outcome_id)
);

create table if not exists public.student_assignment_skill_progress (
  student_id uuid not null
    references public.student_profiles(user_id) on delete cascade,
  assignment_id uuid not null
    references public.teacher_assignments(id) on delete restrict,
  skill_id text not null,
  skill_title text not null,
  evidence_count integer not null check (evidence_count > 0),
  correct_count integer not null check (
    correct_count between 0 and evidence_count
  ),
  last_activity_at timestamptz not null,
  primary key (student_id, assignment_id, skill_id)
);

create index if not exists teacher_curriculum_drafts_owner_status_idx
  on public.teacher_curriculum_assignment_drafts(
    teacher_id, status, updated_at desc
  );
create index if not exists teacher_curriculum_drafts_classroom_idx
  on public.teacher_curriculum_assignment_drafts(
    classroom_id, status, updated_at desc
  );
create index if not exists assignment_mutations_submission_created_idx
  on private.assignment_submission_mutations(
    submission_id, created_at desc
  );
create index if not exists student_assignment_outcome_activity_idx
  on public.student_assignment_outcome_progress(
    student_id, last_activity_at desc
  );
create index if not exists student_assignment_skill_activity_idx
  on public.student_assignment_skill_progress(
    student_id, last_activity_at desc
  );

create or replace function private.enforce_teacher_question_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher_active boolean := false;
begin
  if tg_op = 'INSERT' then
    select exists (
      select 1
      from public.teacher_profiles as teacher
      join public.profiles as profile on profile.user_id = teacher.user_id
      where teacher.user_id = new.teacher_id
        and teacher.activation_status = 'ACTIVE'
        and profile.role = 'TEACHER'
        and profile.onboarding_completed
    ) into v_teacher_active;

    if not v_teacher_active or new.status <> 'ACTIVE' then
      raise exception 'Question owner unavailable';
    end if;
    if new.content_source = 'AUTHORED' and new.question_type = 'TEXT_INPUT' then
      raise exception 'Question source unavailable';
    end if;
    return new;
  end if;

  if
    new.id is distinct from old.id
    or new.teacher_id is distinct from old.teacher_id
    or new.creation_request_id is distinct from old.creation_request_id
    or new.grade is distinct from old.grade
    or new.question_type is distinct from old.question_type
    or new.prompt is distinct from old.prompt
    or new.options is distinct from old.options
    or new.created_at is distinct from old.created_at
    or new.content_source is distinct from old.content_source
    or new.source_release_id is distinct from old.source_release_id
    or new.source_unit_id is distinct from old.source_unit_id
    or new.source_question_id is distinct from old.source_question_id
    or new.source_question_payload_hash is distinct from old.source_question_payload_hash
    or new.source_solution_payload_hash is distinct from old.source_solution_payload_hash
    or new.official_outcome_ids is distinct from old.official_outcome_ids
    or new.official_outcome_titles is distinct from old.official_outcome_titles
    or new.skill_id is distinct from old.skill_id
    or new.skill_title is distinct from old.skill_title
    or new.visual is distinct from old.visual
    or new.cognitive_level is distinct from old.cognitive_level
  then
    raise exception 'Question content cannot change';
  end if;

  if old.status = new.status then return new; end if;
  if
    old.status = 'ACTIVE'
    and new.status = 'ARCHIVED'
    and new.archived_at is not null
  then
    return new;
  end if;
  raise exception 'Invalid question transition';
end;
$$;

create or replace function private.enforce_teacher_question_solution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_question_type text;
  v_content_source text;
  v_normalized_answer text;
begin
  if tg_op <> 'INSERT' then
    raise exception 'Question solution cannot change';
  end if;

  select question.question_type, question.content_source
  into v_question_type, v_content_source
  from public.teacher_questions as question
  where question.id = new.question_id;

  if v_question_type is null then
    raise exception 'Question solution unavailable';
  end if;

  new.display_correct_answer :=
    coalesce(new.display_correct_answer, new.correct_answer);
  new.feedback := coalesce(new.feedback, new.explanation);

  if v_content_source = 'CURRICULUM_SNAPSHOT' then
    v_normalized_answer := private.curriculum_normalize_answer(
      new.display_correct_answer,
      v_question_type
    );
    if
      new.correct_answer <> v_normalized_answer
      or new.solution_payload_hash is null
    then
      raise exception 'Question solution unavailable';
    end if;
  else
    v_normalized_answer := private.normalize_assignment_answer(
      v_question_type,
      new.correct_answer
    );
    if
      new.correct_answer <> v_normalized_answer
      or new.display_correct_answer <> new.correct_answer
      or new.solution_payload_hash is not null
    then
      raise exception 'Question solution unavailable';
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.enforce_teacher_assignment_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_valid boolean := false;
begin
  if tg_op = 'INSERT' then
    select exists (
      select 1
      from public.classrooms as classroom
      join public.teacher_profiles as teacher
        on teacher.user_id = classroom.teacher_id
      join public.profiles as profile on profile.user_id = teacher.user_id
      where classroom.id = new.classroom_id
        and classroom.teacher_id = new.teacher_id
        and classroom.status = 'ACTIVE'
        and teacher.activation_status = 'ACTIVE'
        and profile.role = 'TEACHER'
        and profile.onboarding_completed
    ) into v_owner_valid;

    if not v_owner_valid or new.status <> 'PUBLISHED' then
      raise exception 'Assignment owner unavailable';
    end if;
    return new;
  end if;

  if
    new.id is distinct from old.id
    or new.teacher_id is distinct from old.teacher_id
    or new.classroom_id is distinct from old.classroom_id
    or new.creation_request_id is distinct from old.creation_request_id
    or new.title is distinct from old.title
    or new.instructions is distinct from old.instructions
    or new.total_count is distinct from old.total_count
    or new.published_at is distinct from old.published_at
    or new.created_at is distinct from old.created_at
    or new.content_source is distinct from old.content_source
    or new.source_draft_id is distinct from old.source_draft_id
    or new.snapshot_release_id is distinct from old.snapshot_release_id
    or new.snapshot_content_version is distinct from old.snapshot_content_version
    or new.snapshot_generator_version is distinct from old.snapshot_generator_version
    or new.snapshot_seed is distinct from old.snapshot_seed
    or new.snapshot_hash is distinct from old.snapshot_hash
    or new.selection_mode is distinct from old.selection_mode
  then
    raise exception 'Published assignment cannot change';
  end if;

  if old.status = new.status then
    if
      (new.status = 'PUBLISHED' and new.closed_at is not null)
      or (
        new.status = 'CLOSED'
        and new.closed_at is distinct from old.closed_at
      )
    then
      raise exception 'Invalid assignment state';
    end if;
    return new;
  end if;
  if
    old.status = 'PUBLISHED'
    and new.status = 'CLOSED'
    and new.closed_at is not null
  then
    return new;
  end if;
  if
    old.status = 'CLOSED'
    and new.status = 'PUBLISHED'
    and new.closed_at is null
  then
    return new;
  end if;
  raise exception 'Invalid assignment transition';
end;
$$;

create or replace function private.enforce_assignment_answer_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission_status text;
  v_question_type text;
  v_content_source text;
  v_normalized_answer text;
begin
  if tg_op = 'DELETE' then
    raise exception 'Assignment answer cannot be deleted';
  end if;

  select submission.status, question.question_type, question.content_source
  into v_submission_status, v_question_type, v_content_source
  from public.assignment_submissions as submission
  join public.teacher_assignment_items as item
    on item.assignment_id = submission.assignment_id
  join public.teacher_questions as question on question.id = item.question_id
  where submission.id = new.submission_id
    and item.question_id = new.question_id;

  if v_submission_status is null or v_question_type is null then
    raise exception 'Assignment answer unavailable';
  end if;
  if tg_op = 'UPDATE' and v_submission_status <> 'IN_PROGRESS' then
    raise exception 'Submitted assignment cannot change';
  end if;
  if
    tg_op = 'UPDATE'
    and (
      new.submission_id is distinct from old.submission_id
      or new.question_id is distinct from old.question_id
    )
  then
    raise exception 'Assignment answer identity cannot change';
  end if;

  v_normalized_answer := case
    when v_content_source = 'CURRICULUM_SNAPSHOT'
      then private.curriculum_normalize_answer(
        new.normalized_answer, v_question_type
      )
    else private.normalize_assignment_answer(
      v_question_type, new.normalized_answer
    )
  end;
  if new.normalized_answer <> v_normalized_answer then
    raise exception 'Assignment answer unavailable';
  end if;
  if tg_op = 'INSERT' and (
    new.is_correct is not null or new.graded_at is not null
  ) then
    raise exception 'Draft assignment cannot be graded';
  end if;
  return new;
end;
$$;

create or replace function public.get_my_teacher_questions()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_questions jsonb := '[]'::jsonb;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');
  select coalesce(jsonb_agg(jsonb_build_object(
    'question_id', question.id,
    'grade', question.grade,
    'question_type', question.question_type,
    'prompt', question.prompt,
    'options', question.options,
    'correct_answer', solution.correct_answer,
    'solution_steps', solution.solution_steps,
    'explanation', solution.explanation,
    'status', question.status,
    'created_at', question.created_at
  ) order by question.created_at desc, question.id), '[]'::jsonb)
  into v_questions
  from public.teacher_questions as question
  join public.teacher_question_solutions as solution
    on solution.question_id = question.id
  where question.teacher_id = v_teacher_user_id
    and question.content_source = 'AUTHORED';
  return jsonb_build_object('questions', v_questions);
end;
$$;

create or replace function public.get_teacher_curriculum_catalog(
  p_classroom_id uuid,
  p_unit_id text default null,
  p_domain text default null,
  p_outcome_id text default null,
  p_skill_id text default null,
  p_limit integer default 24,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_grade smallint;
  v_release_id text;
  v_units jsonb := '[]'::jsonb;
  v_questions jsonb := '[]'::jsonb;
  v_total bigint := 0;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');
  if
    p_limit not between 1 and 50
    or p_offset not between 0 and 5000
  then
    raise exception 'Curriculum catalog unavailable';
  end if;

  select classroom.grade into v_grade
  from public.classrooms as classroom
  where classroom.id = p_classroom_id
    and classroom.teacher_id = v_teacher_user_id
    and classroom.status = 'ACTIVE';
  if v_grade is null then
    raise exception 'Curriculum catalog unavailable';
  end if;

  select release.release_id into v_release_id
  from public.curriculum_releases as release
  where release.status = 'ACTIVE'
    and release.activation_state = 'ACTIVE';
  if v_release_id is null then
    raise exception 'Curriculum release unavailable';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'unit_id', unit.unit_id,
    'title', unit.title,
    'domain', unit.domain,
    'official_outcome_ids', unit.official_outcome_ids,
    'skill_ids', unit.skill_ids,
    'total_questions', unit.total_questions
  ) order by unit.display_order), '[]'::jsonb)
  into v_units
  from public.curriculum_release_units as unit
  where unit.release_id = v_release_id and unit.grade = v_grade;

  select count(*) into v_total
  from public.curriculum_release_questions as question
  join public.curriculum_release_units as unit
    on unit.release_id = question.release_id
    and unit.unit_id = question.unit_id
  where question.release_id = v_release_id
    and unit.grade = v_grade
    and (p_unit_id is null or question.unit_id = p_unit_id)
    and (p_domain is null or unit.domain = p_domain)
    and (
      p_outcome_id is null
      or p_outcome_id = any(question.official_outcome_ids)
    )
    and (p_skill_id is null or question.skill_id = p_skill_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'question_id', page.question_id,
    'unit_id', page.unit_id,
    'unit_title', page.unit_title,
    'domain', page.domain,
    'answer_type', page.answer_type,
    'prompt', page.prompt,
    'options', page.options,
    'visual', page.visual,
    'cognitive_level', page.cognitive_level,
    'official_outcome_ids', page.official_outcome_ids,
    'official_outcome_titles', page.official_outcome_titles,
    'skill_id', page.skill_id,
    'skill_title', page.skill_title
  ) order by page.unit_order, page.question_order), '[]'::jsonb)
  into v_questions
  from (
    select
      question.question_id,
      question.unit_id,
      unit.title as unit_title,
      unit.domain,
      question.answer_type,
      question.prompt,
      question.options,
      question.visual,
      question.cognitive_level,
      question.official_outcome_ids,
      question.official_outcome_titles,
      question.skill_id,
      question.skill_title,
      unit.display_order as unit_order,
      question.display_order as question_order
    from public.curriculum_release_questions as question
    join public.curriculum_release_units as unit
      on unit.release_id = question.release_id
      and unit.unit_id = question.unit_id
    where question.release_id = v_release_id
      and unit.grade = v_grade
      and (p_unit_id is null or question.unit_id = p_unit_id)
      and (p_domain is null or unit.domain = p_domain)
      and (
        p_outcome_id is null
        or p_outcome_id = any(question.official_outcome_ids)
      )
      and (p_skill_id is null or question.skill_id = p_skill_id)
    order by unit.display_order, question.display_order
    limit p_limit offset p_offset
  ) as page;

  return jsonb_build_object(
    'release_id', v_release_id,
    'grade', v_grade,
    'units', v_units,
    'questions', v_questions,
    'total_questions', v_total,
    'limit', p_limit,
    'offset', p_offset
  );
end;
$$;

create or replace function public.create_teacher_curriculum_assignment_draft(
  p_classroom_id uuid,
  p_title text,
  p_instructions text,
  p_due_at timestamptz,
  p_selection_mode text,
  p_unit_id text,
  p_outcome_id text,
  p_skill_id text,
  p_question_ids text[],
  p_question_count smallint,
  p_deterministic_seed text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_grade smallint;
  v_release public.curriculum_releases%rowtype;
  v_title text;
  v_instructions text;
  v_mode text;
  v_seed text;
  v_draft_id uuid;
  v_item_count integer;
  v_snapshot_hash text;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');
  v_title := btrim(regexp_replace(coalesce(p_title, ''), '[[:space:]]+', ' ', 'g'));
  v_instructions := nullif(
    btrim(regexp_replace(coalesce(p_instructions, ''), '[[:space:]]+', ' ', 'g')),
    ''
  );
  v_mode := upper(btrim(coalesce(p_selection_mode, '')));
  v_seed := btrim(coalesce(p_deterministic_seed, ''));

  if
    p_request_id is null
    or char_length(v_title) not between 3 and 120
    or (
      v_instructions is not null
      and char_length(v_instructions) > 1000
    )
    or v_mode not in ('DETERMINISTIC', 'MANUAL')
    or p_question_count not between 1 and 50
    or p_due_at is not null and p_due_at <= now()
  then
    raise exception 'Curriculum draft unavailable';
  end if;

  select classroom.grade into v_grade
  from public.classrooms as classroom
  where classroom.id = p_classroom_id
    and classroom.teacher_id = v_teacher_user_id
    and classroom.status = 'ACTIVE';
  if v_grade is null then
    raise exception 'Curriculum draft unavailable';
  end if;

  select release.* into v_release
  from public.curriculum_releases as release
  where release.status = 'ACTIVE'
    and release.activation_state = 'ACTIVE';
  if v_release.release_id is null then
    raise exception 'Curriculum release unavailable';
  end if;

  if v_mode = 'MANUAL' then
    if
      p_question_ids is null
      or cardinality(p_question_ids) <> p_question_count
      or array_position(p_question_ids, null) is not null
      or (
        select count(distinct value)
        from unnest(p_question_ids) as value
      ) <> cardinality(p_question_ids)
    then
      raise exception 'Curriculum draft unavailable';
    end if;
    v_seed := coalesce(nullif(v_seed, ''), 'manual-selection-v1');
  else
    if
      p_question_ids is not null
      or (
        p_unit_id is null
        and p_outcome_id is null
        and p_skill_id is null
      )
      or char_length(v_seed) not between 4 and 100
    then
      raise exception 'Curriculum draft unavailable';
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'teacher-curriculum-draft:' || v_teacher_user_id::text
      || ':' || p_request_id::text,
    0
  ));

  select draft.id into v_draft_id
  from public.teacher_curriculum_assignment_drafts as draft
  where draft.teacher_id = v_teacher_user_id
    and draft.creation_request_id = p_request_id;
  if v_draft_id is not null then
    return (
      select jsonb_build_object(
        'draft_id', draft.id,
        'status', draft.status,
        'classroom_id', draft.classroom_id,
        'grade', draft.grade,
        'title', draft.title,
        'item_count', draft.item_count,
        'selection_mode', draft.selection_mode,
        'snapshot_hash', draft.snapshot_hash,
        'published_assignment_id', draft.published_assignment_id
      )
      from public.teacher_curriculum_assignment_drafts as draft
      where draft.id = v_draft_id
    );
  end if;

  insert into public.teacher_curriculum_assignment_drafts (
    teacher_id, classroom_id, creation_request_id, release_id,
    content_version, generator_version, deterministic_seed, grade,
    title, instructions, due_at, selection_mode, selection_spec,
    snapshot_hash, item_count
  ) values (
    v_teacher_user_id, p_classroom_id, p_request_id, v_release.release_id,
    v_release.content_version, v_release.generator_version, v_seed, v_grade,
    v_title, v_instructions, p_due_at, v_mode,
    jsonb_build_object(
      'unit_id', p_unit_id,
      'outcome_id', p_outcome_id,
      'skill_id', p_skill_id,
      'question_count', p_question_count,
      'algorithm', case
        when v_mode = 'DETERMINISTIC'
          then 'SHA256_RELEASE_QUESTION_SEED_ORDER_V1'
        else 'MANUAL_ORDER_V1'
      end
    ),
    repeat('0', 64), p_question_count
  ) returning id into v_draft_id;

  if v_mode = 'MANUAL' then
    insert into public.teacher_curriculum_assignment_draft_items (
      draft_id, release_id, unit_id, question_id, display_order,
      question_payload_hash, solution_payload_hash
    )
    select
      v_draft_id, question.release_id, question.unit_id,
      question.question_id, selected.ordinality::smallint,
      question.question_payload_hash, solution.solution_payload_hash
    from unnest(p_question_ids) with ordinality
      as selected(question_id, ordinality)
    join public.curriculum_release_questions as question
      on question.release_id = v_release.release_id
      and question.question_id = selected.question_id
    join public.curriculum_release_units as unit
      on unit.release_id = question.release_id
      and unit.unit_id = question.unit_id
      and unit.grade = v_grade
    join private.curriculum_release_solutions as solution
      on solution.release_id = question.release_id
      and solution.question_id = question.question_id;
  else
    insert into public.teacher_curriculum_assignment_draft_items (
      draft_id, release_id, unit_id, question_id, display_order,
      question_payload_hash, solution_payload_hash
    )
    select
      v_draft_id, selected.release_id, selected.unit_id,
      selected.question_id,
      row_number() over (order by selected.selection_hash, selected.question_id)::smallint,
      selected.question_payload_hash, selected.solution_payload_hash
    from (
      select
        question.release_id,
        question.unit_id,
        question.question_id,
        question.question_payload_hash,
        solution.solution_payload_hash,
        encode(extensions.digest(
          question.release_id || ':' || question.question_id || ':' || v_seed,
          'sha256'
        ), 'hex') as selection_hash
      from public.curriculum_release_questions as question
      join public.curriculum_release_units as unit
        on unit.release_id = question.release_id
        and unit.unit_id = question.unit_id
      join private.curriculum_release_solutions as solution
        on solution.release_id = question.release_id
        and solution.question_id = question.question_id
      where question.release_id = v_release.release_id
        and unit.grade = v_grade
        and (p_unit_id is null or question.unit_id = p_unit_id)
        and (
          p_outcome_id is null
          or p_outcome_id = any(question.official_outcome_ids)
        )
        and (p_skill_id is null or question.skill_id = p_skill_id)
      order by selection_hash, question.question_id
      limit p_question_count
    ) as selected;
  end if;

  select count(*), encode(extensions.digest(
    string_agg(
      item.question_payload_hash || ':' || item.solution_payload_hash,
      '|' order by item.display_order
    ),
    'sha256'
  ), 'hex')
  into v_item_count, v_snapshot_hash
  from public.teacher_curriculum_assignment_draft_items as item
  where item.draft_id = v_draft_id;

  if v_item_count <> p_question_count or v_snapshot_hash is null then
    raise exception 'Curriculum draft selection unavailable';
  end if;

  update public.teacher_curriculum_assignment_drafts
  set snapshot_hash = v_snapshot_hash
  where id = v_draft_id;

  return jsonb_build_object(
    'draft_id', v_draft_id,
    'status', 'DRAFT',
    'classroom_id', p_classroom_id,
    'grade', v_grade,
    'title', v_title,
    'item_count', v_item_count,
    'selection_mode', v_mode,
    'snapshot_hash', v_snapshot_hash,
    'published_assignment_id', null
  );
end;
$$;

create or replace function public.publish_teacher_curriculum_assignment_draft(
  p_draft_id uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_draft public.teacher_curriculum_assignment_drafts%rowtype;
  v_assignment_id uuid;
  v_question_id uuid;
  v_item record;
  v_options jsonb;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');
  if p_draft_id is null or p_request_id is null then
    raise exception 'Curriculum publish unavailable';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'teacher-curriculum-draft:' || p_draft_id::text, 0
  ));
  select draft.* into v_draft
  from public.teacher_curriculum_assignment_drafts as draft
  join public.classrooms as classroom
    on classroom.id = draft.classroom_id
  where draft.id = p_draft_id
    and draft.teacher_id = v_teacher_user_id
    and classroom.teacher_id = v_teacher_user_id
    and classroom.status = 'ACTIVE'
    and classroom.grade = draft.grade;
  if v_draft.id is null then
    raise exception 'Curriculum publish unavailable';
  end if;
  if v_draft.status = 'PUBLISHED' then
    return jsonb_build_object(
      'assignment_id', v_draft.published_assignment_id,
      'draft_id', v_draft.id,
      'status', 'PUBLISHED',
      'title', v_draft.title,
      'total_count', v_draft.item_count,
      'published_at', v_draft.published_at
    );
  end if;
  if v_draft.status <> 'DRAFT' then
    raise exception 'Curriculum publish unavailable';
  end if;
  if not exists (
    select 1 from public.curriculum_releases as release
    where release.release_id = v_draft.release_id
      and release.content_version = v_draft.content_version
      and release.generator_version = v_draft.generator_version
      and release.status = 'ACTIVE'
      and release.activation_state = 'ACTIVE'
  ) then
    raise exception 'Curriculum release unavailable';
  end if;
  if v_draft.due_at is not null and v_draft.due_at <= now() then
    raise exception 'Curriculum publish unavailable';
  end if;

  insert into public.teacher_assignments (
    teacher_id, classroom_id, creation_request_id, title, instructions,
    due_at, total_count, published_at, content_source, source_draft_id,
    snapshot_release_id, snapshot_content_version,
    snapshot_generator_version, snapshot_seed, snapshot_hash,
    selection_mode
  ) values (
    v_teacher_user_id, v_draft.classroom_id, p_request_id,
    v_draft.title, v_draft.instructions, v_draft.due_at,
    v_draft.item_count, now(), 'CURRICULUM_SNAPSHOT', v_draft.id,
    v_draft.release_id, v_draft.content_version,
    v_draft.generator_version, v_draft.deterministic_seed,
    v_draft.snapshot_hash, v_draft.selection_mode
  ) returning id into v_assignment_id;

  for v_item in
    select
      item.display_order,
      question.*,
      solution.normalized_correct_answer,
      solution.correct_answer as display_correct_answer,
      solution.solution_steps,
      solution.feedback,
      solution.solution_payload_hash
    from public.teacher_curriculum_assignment_draft_items as item
    join public.curriculum_release_questions as question
      on question.release_id = item.release_id
      and question.unit_id = item.unit_id
      and question.question_id = item.question_id
      and question.question_payload_hash = item.question_payload_hash
    join private.curriculum_release_solutions as solution
      on solution.release_id = item.release_id
      and solution.question_id = item.question_id
      and solution.solution_payload_hash = item.solution_payload_hash
    where item.draft_id = v_draft.id
    order by item.display_order
  loop
    select case
      when v_item.options is null then null
      else coalesce(jsonb_object_agg(
        option.value ->> 'key',
        option.value -> 'label'
      ), '{}'::jsonb)
    end
    into v_options
    from jsonb_array_elements(
      coalesce(v_item.options, '[]'::jsonb)
    ) as option(value);

    insert into public.teacher_questions (
      teacher_id, creation_request_id, grade, question_type,
      prompt, options, content_source, source_release_id,
      source_unit_id, source_question_id, source_question_payload_hash,
      source_solution_payload_hash, official_outcome_ids,
      official_outcome_titles, skill_id, skill_title, visual,
      cognitive_level
    ) values (
      v_teacher_user_id, extensions.gen_random_uuid(), v_draft.grade,
      v_item.answer_type, v_item.prompt, v_options,
      'CURRICULUM_SNAPSHOT', v_item.release_id, v_item.unit_id,
      v_item.question_id, v_item.question_payload_hash,
      v_item.solution_payload_hash, v_item.official_outcome_ids,
      v_item.official_outcome_titles, v_item.skill_id,
      v_item.skill_title, v_item.visual, v_item.cognitive_level
    ) returning id into v_question_id;

    insert into public.teacher_question_solutions (
      question_id, correct_answer, display_correct_answer,
      solution_steps, explanation, feedback, solution_payload_hash
    ) values (
      v_question_id, v_item.normalized_correct_answer,
      v_item.display_correct_answer, v_item.solution_steps,
      v_item.feedback, v_item.feedback, v_item.solution_payload_hash
    );

    insert into public.teacher_assignment_items (
      assignment_id, question_id, display_order
    ) values (
      v_assignment_id, v_question_id, v_item.display_order
    );
  end loop;

  if (
    select count(*) from public.teacher_assignment_items
    where assignment_id = v_assignment_id
  ) <> v_draft.item_count then
    raise exception 'Curriculum snapshot unavailable';
  end if;

  update public.teacher_curriculum_assignment_drafts
  set
    status = 'PUBLISHED',
    published_assignment_id = v_assignment_id,
    published_at = now()
  where id = v_draft.id and status = 'DRAFT';

  return jsonb_build_object(
    'assignment_id', v_assignment_id,
    'draft_id', v_draft.id,
    'status', 'PUBLISHED',
    'title', v_draft.title,
    'total_count', v_draft.item_count,
    'published_at', now()
  );
end;
$$;

create or replace function public.get_my_teacher_curriculum_drafts()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_drafts jsonb := '[]'::jsonb;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');
  select coalesce(jsonb_agg(jsonb_build_object(
    'draft_id', draft.id,
    'classroom_id', draft.classroom_id,
    'classroom_name', classroom.name,
    'grade', draft.grade,
    'title', draft.title,
    'instructions', draft.instructions,
    'due_at', draft.due_at,
    'selection_mode', draft.selection_mode,
    'item_count', draft.item_count,
    'status', draft.status,
    'created_at', draft.created_at,
    'published_assignment_id', draft.published_assignment_id
  ) order by draft.updated_at desc, draft.id), '[]'::jsonb)
  into v_drafts
  from public.teacher_curriculum_assignment_drafts as draft
  join public.classrooms as classroom on classroom.id = draft.classroom_id
  where draft.teacher_id = v_teacher_user_id;
  return jsonb_build_object('drafts', v_drafts);
end;
$$;

create or replace function public.get_assignment_submission_state(
  p_assignment_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_student_user_id uuid;
  v_now timestamptz := now();
  v_submission_id uuid;
  v_submission_status text;
  v_revision integer;
  v_assignment jsonb;
  v_questions jsonb := '[]'::jsonb;
  v_answered_count smallint;
  v_total_count smallint;
begin
  v_student_user_id := private.require_classroom_actor('STUDENT');
  select
    submission.id,
    submission.status,
    submission.revision,
    submission.answered_count,
    submission.total_count,
    jsonb_build_object(
      'assignment_id', assignment.id,
      'classroom_name', classroom.name,
      'teacher_display_name', teacher.full_name,
      'title', assignment.title,
      'instructions', assignment.instructions,
      'due_at', assignment.due_at,
      'status', assignment.status,
      'effective_state', case
        when assignment.status = 'CLOSED' then 'CLOSED'
        when assignment.due_at is not null and assignment.due_at <= v_now
          then 'OVERDUE'
        else 'OPEN'
      end,
      'closed_at', assignment.closed_at,
      'server_now', v_now,
      'total_count', assignment.total_count,
      'published_at', assignment.published_at
    )
  into
    v_submission_id,
    v_submission_status,
    v_revision,
    v_answered_count,
    v_total_count,
    v_assignment
  from public.assignment_submissions as submission
  join public.teacher_assignments as assignment
    on assignment.id = submission.assignment_id
  join public.classrooms as classroom on classroom.id = assignment.classroom_id
  join public.teacher_profiles as teacher
    on teacher.user_id = assignment.teacher_id
  join public.classroom_memberships as membership
    on membership.classroom_id = assignment.classroom_id
    and membership.student_id = v_student_user_id
    and membership.status = 'APPROVED'
  where submission.assignment_id = p_assignment_id
    and submission.student_id = v_student_user_id;

  if v_submission_id is null then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'question_id', question.id,
    'display_order', item.display_order,
    'question_type', question.question_type,
    'prompt', question.prompt,
    'options', question.options,
    'visual', question.visual,
    'draft_answer', answer.normalized_answer
  ) order by item.display_order), '[]'::jsonb)
  into v_questions
  from public.teacher_assignment_items as item
  join public.teacher_questions as question on question.id = item.question_id
  left join public.assignment_answers as answer
    on answer.submission_id = v_submission_id
    and answer.question_id = question.id
  where item.assignment_id = p_assignment_id;

  return jsonb_build_object(
    'submission_id', v_submission_id,
    'submission_status', v_submission_status,
    'revision', v_revision,
    'answered_count', v_answered_count,
    'total_count', v_total_count,
    'assignment', v_assignment,
    'questions', v_questions
  );
end;
$$;

create or replace function public.save_assignment_draft_answer_v2(
  p_submission_id uuid,
  p_question_id uuid,
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
  v_student_user_id uuid;
  v_assignment_id uuid;
  v_status text;
  v_revision integer;
  v_question_type text;
  v_content_source text;
  v_normalized_answer text;
  v_request_hash text;
  v_existing_hash text;
  v_existing_result jsonb;
  v_answered_count smallint;
  v_total_count smallint;
  v_result jsonb;
begin
  v_student_user_id := private.require_classroom_actor('STUDENT');
  if
    p_submission_id is null
    or p_question_id is null
    or p_idempotency_key is null
    or p_expected_revision is null
    or p_expected_revision < 0
  then
    raise exception using errcode = 'P0001',
      message = 'ASSIGNMENT:INVALID_REQUEST';
  end if;

  select submission.assignment_id into v_assignment_id
  from public.assignment_submissions as submission
  where submission.id = p_submission_id
    and submission.student_id = v_student_user_id;
  if v_assignment_id is null then
    raise exception using errcode = 'P0001',
      message = 'ASSIGNMENT:FORBIDDEN';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'assignment-submission:' || p_submission_id::text, 0
  ));

  select
    submission.status,
    submission.revision,
    submission.total_count,
    question.question_type,
    question.content_source
  into
    v_status,
    v_revision,
    v_total_count,
    v_question_type,
    v_content_source
  from public.assignment_submissions as submission
  join public.teacher_assignments as assignment
    on assignment.id = submission.assignment_id
  join public.classroom_memberships as membership
    on membership.classroom_id = assignment.classroom_id
    and membership.student_id = v_student_user_id
    and membership.status = 'APPROVED'
  join public.teacher_assignment_items as item
    on item.assignment_id = assignment.id
    and item.question_id = p_question_id
  join public.teacher_questions as question on question.id = item.question_id
  where submission.id = p_submission_id
    and submission.student_id = v_student_user_id
    and assignment.status = 'PUBLISHED'
    and (assignment.due_at is null or assignment.due_at > now());

  if
    v_status is null
    or v_status <> 'IN_PROGRESS'
    or v_question_type is null
  then
    raise exception using errcode = 'P0001',
      message = 'ASSIGNMENT:UNAVAILABLE';
  end if;

  v_normalized_answer := case
    when v_content_source = 'CURRICULUM_SNAPSHOT'
      then private.curriculum_normalize_answer(p_answer, v_question_type)
    else private.normalize_assignment_answer(v_question_type, p_answer)
  end;
  v_request_hash := encode(extensions.digest(
    p_question_id::text || ':' || v_normalized_answer,
    'sha256'
  ), 'hex');

  select mutation.request_hash, mutation.result_payload
  into v_existing_hash, v_existing_result
  from private.assignment_submission_mutations as mutation
  where mutation.submission_id = p_submission_id
    and mutation.idempotency_key = p_idempotency_key;
  if v_existing_result is not null then
    if v_existing_hash <> v_request_hash then
      raise exception using errcode = 'P0001',
        message = 'ASSIGNMENT:IDEMPOTENCY_CONFLICT';
    end if;
    return v_existing_result || jsonb_build_object('replayed', true);
  end if;

  if v_revision <> p_expected_revision then
    raise exception using errcode = 'P0001',
      message = 'ASSIGNMENT:STATE_CONFLICT';
  end if;

  insert into public.assignment_answers (
    submission_id, question_id, normalized_answer
  ) values (
    p_submission_id, p_question_id, v_normalized_answer
  )
  on conflict (submission_id, question_id)
  do update set
    normalized_answer = excluded.normalized_answer,
    saved_at = now(),
    is_correct = null,
    graded_at = null;

  select count(*)::smallint into v_answered_count
  from public.assignment_answers as answer
  where answer.submission_id = p_submission_id;

  update public.assignment_submissions as submission
  set
    answered_count = v_answered_count,
    revision = submission.revision + 1
  where submission.id = p_submission_id
    and submission.student_id = v_student_user_id
    and submission.status = 'IN_PROGRESS'
    and submission.revision = p_expected_revision
  returning submission.revision into v_revision;
  if v_revision is null then
    raise exception using errcode = 'P0001',
      message = 'ASSIGNMENT:STATE_CONFLICT';
  end if;

  v_result := jsonb_build_object(
    'submission_id', p_submission_id,
    'question_id', p_question_id,
    'normalized_answer', v_normalized_answer,
    'saved', true,
    'answered_count', v_answered_count,
    'total_count', v_total_count,
    'revision', v_revision,
    'replayed', false
  );
  insert into private.assignment_submission_mutations (
    submission_id, idempotency_key, mutation_kind, question_id,
    request_hash, resulting_revision, result_payload
  ) values (
    p_submission_id, p_idempotency_key, 'SAVE', p_question_id,
    v_request_hash, v_revision, v_result
  );
  return v_result;
end;
$$;

create or replace function public.submit_assignment_submission_v2(
  p_submission_id uuid,
  p_expected_revision integer,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_user_id uuid;
  v_assignment_id uuid;
  v_status text;
  v_revision integer;
  v_total_count smallint;
  v_answered_count smallint;
  v_correct_count smallint;
  v_score_percent numeric(5, 2);
  v_submitted_at timestamptz;
  v_request_hash text;
  v_existing_hash text;
  v_existing_result jsonb;
  v_result jsonb;
begin
  v_student_user_id := private.require_classroom_actor('STUDENT');
  if
    p_submission_id is null
    or p_idempotency_key is null
    or p_expected_revision is null
    or p_expected_revision < 0
  then
    raise exception using errcode = 'P0001',
      message = 'ASSIGNMENT:INVALID_REQUEST';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'assignment-submission:' || p_submission_id::text, 0
  ));
  select
    submission.assignment_id,
    submission.status,
    submission.revision,
    submission.total_count,
    submission.answered_count,
    submission.correct_count,
    submission.score_percent,
    submission.submitted_at
  into
    v_assignment_id,
    v_status,
    v_revision,
    v_total_count,
    v_answered_count,
    v_correct_count,
    v_score_percent,
    v_submitted_at
  from public.assignment_submissions as submission
  where submission.id = p_submission_id
    and submission.student_id = v_student_user_id;
  if v_assignment_id is null then
    raise exception using errcode = 'P0001',
      message = 'ASSIGNMENT:FORBIDDEN';
  end if;

  v_request_hash := encode(extensions.digest(
    p_submission_id::text || ':SUBMIT',
    'sha256'
  ), 'hex');
  select mutation.request_hash, mutation.result_payload
  into v_existing_hash, v_existing_result
  from private.assignment_submission_mutations as mutation
  where mutation.submission_id = p_submission_id
    and mutation.idempotency_key = p_idempotency_key;
  if v_existing_result is not null then
    if v_existing_hash <> v_request_hash then
      raise exception using errcode = 'P0001',
        message = 'ASSIGNMENT:IDEMPOTENCY_CONFLICT';
    end if;
    return v_existing_result || jsonb_build_object('replayed', true);
  end if;

  if v_status = 'SUBMITTED' then
    return jsonb_build_object(
      'status', v_status,
      'correct_count', v_correct_count,
      'total_count', v_total_count,
      'score_percent', v_score_percent,
      'submitted_at', v_submitted_at,
      'revision', v_revision,
      'replayed', true
    );
  end if;
  if v_revision <> p_expected_revision then
    raise exception using errcode = 'P0001',
      message = 'ASSIGNMENT:STATE_CONFLICT';
  end if;
  if not exists (
    select 1
    from public.teacher_assignments as assignment
    join public.classroom_memberships as membership
      on membership.classroom_id = assignment.classroom_id
      and membership.student_id = v_student_user_id
      and membership.status = 'APPROVED'
    where assignment.id = v_assignment_id
      and assignment.status = 'PUBLISHED'
      and (assignment.due_at is null or assignment.due_at > now())
  ) then
    raise exception using errcode = 'P0001',
      message = 'ASSIGNMENT:UNAVAILABLE';
  end if;

  select count(*)::smallint into v_answered_count
  from public.assignment_answers as answer
  where answer.submission_id = p_submission_id;
  if v_answered_count <> v_total_count then
    raise exception using errcode = 'P0001',
      message = 'ASSIGNMENT:ANSWERS_INCOMPLETE';
  end if;

  v_submitted_at := now();
  update public.assignment_answers as answer
  set
    is_correct = (answer.normalized_answer = solution.correct_answer),
    graded_at = v_submitted_at
  from public.teacher_question_solutions as solution
  where answer.submission_id = p_submission_id
    and solution.question_id = answer.question_id
    and answer.is_correct is null;

  select count(*) filter (where answer.is_correct)::smallint
  into v_correct_count
  from public.assignment_answers as answer
  where answer.submission_id = p_submission_id;
  v_score_percent := round(
    (v_correct_count::numeric * 100) / v_total_count,
    2
  );

  insert into public.student_assignment_outcome_progress (
    student_id, assignment_id, official_outcome_id,
    official_outcome_title, evidence_count, correct_count,
    last_activity_at
  )
  select
    v_student_user_id,
    v_assignment_id,
    mapped.outcome_id,
    max(mapped.outcome_title),
    count(*)::integer,
    count(*) filter (where mapped.is_correct)::integer,
    v_submitted_at
  from (
    select
      answer.is_correct,
      outcome.outcome_id,
      question.official_outcome_titles[outcome.ordinality]
        as outcome_title
    from public.assignment_answers as answer
    join public.teacher_questions as question
      on question.id = answer.question_id
    cross join lateral unnest(question.official_outcome_ids)
      with ordinality as outcome(outcome_id, ordinality)
    where answer.submission_id = p_submission_id
      and question.content_source = 'CURRICULUM_SNAPSHOT'
  ) as mapped
  group by mapped.outcome_id
  on conflict (student_id, assignment_id, official_outcome_id)
  do nothing;

  insert into public.student_assignment_skill_progress (
    student_id, assignment_id, skill_id, skill_title,
    evidence_count, correct_count, last_activity_at
  )
  select
    v_student_user_id,
    v_assignment_id,
    question.skill_id,
    max(question.skill_title),
    count(*)::integer,
    count(*) filter (where answer.is_correct)::integer,
    v_submitted_at
  from public.assignment_answers as answer
  join public.teacher_questions as question on question.id = answer.question_id
  where answer.submission_id = p_submission_id
    and question.content_source = 'CURRICULUM_SNAPSHOT'
  group by question.skill_id
  on conflict (student_id, assignment_id, skill_id)
  do nothing;

  update public.assignment_submissions as submission
  set
    status = 'SUBMITTED',
    answered_count = v_total_count,
    correct_count = v_correct_count,
    score_percent = v_score_percent,
    submitted_at = v_submitted_at,
    revision = submission.revision + 1
  where submission.id = p_submission_id
    and submission.student_id = v_student_user_id
    and submission.status = 'IN_PROGRESS'
    and submission.revision = p_expected_revision
  returning submission.revision into v_revision;
  if v_revision is null then
    raise exception using errcode = 'P0001',
      message = 'ASSIGNMENT:STATE_CONFLICT';
  end if;

  v_result := jsonb_build_object(
    'status', 'SUBMITTED',
    'correct_count', v_correct_count,
    'total_count', v_total_count,
    'score_percent', v_score_percent,
    'submitted_at', v_submitted_at,
    'revision', v_revision,
    'replayed', false
  );
  insert into private.assignment_submission_mutations (
    submission_id, idempotency_key, mutation_kind, question_id,
    request_hash, resulting_revision, result_payload
  ) values (
    p_submission_id, p_idempotency_key, 'SUBMIT', null,
    v_request_hash, v_revision, v_result
  );
  return v_result;
end;
$$;

create or replace function public.get_assignment_submission_review(
  p_assignment_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_student_user_id uuid;
  v_submission_id uuid;
  v_assignment jsonb;
  v_correct_count smallint;
  v_total_count smallint;
  v_score_percent numeric(5, 2);
  v_submitted_at timestamptz;
  v_answers jsonb := '[]'::jsonb;
begin
  v_student_user_id := private.require_classroom_actor('STUDENT');
  select
    submission.id,
    submission.correct_count,
    submission.total_count,
    submission.score_percent,
    submission.submitted_at,
    jsonb_build_object(
      'assignment_id', assignment.id,
      'classroom_name', classroom.name,
      'teacher_display_name', teacher.full_name,
      'title', assignment.title,
      'instructions', assignment.instructions,
      'due_at', assignment.due_at,
      'published_at', assignment.published_at
    )
  into
    v_submission_id,
    v_correct_count,
    v_total_count,
    v_score_percent,
    v_submitted_at,
    v_assignment
  from public.assignment_submissions as submission
  join public.teacher_assignments as assignment
    on assignment.id = submission.assignment_id
  join public.classrooms as classroom on classroom.id = assignment.classroom_id
  join public.teacher_profiles as teacher
    on teacher.user_id = assignment.teacher_id
  join public.classroom_memberships as membership
    on membership.classroom_id = assignment.classroom_id
    and membership.student_id = v_student_user_id
    and membership.status = 'APPROVED'
  where submission.assignment_id = p_assignment_id
    and submission.student_id = v_student_user_id
    and submission.status = 'SUBMITTED';
  if v_submission_id is null then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'display_order', item.display_order,
    'question_type', question.question_type,
    'prompt', question.prompt,
    'options', question.options,
    'visual', question.visual,
    'student_answer', answer.normalized_answer,
    'is_correct', answer.is_correct,
    'correct_answer', solution.display_correct_answer,
    'solution_steps', solution.solution_steps,
    'explanation', solution.feedback
  ) order by item.display_order), '[]'::jsonb)
  into v_answers
  from public.teacher_assignment_items as item
  join public.teacher_questions as question on question.id = item.question_id
  join public.teacher_question_solutions as solution
    on solution.question_id = item.question_id
  join public.assignment_answers as answer
    on answer.submission_id = v_submission_id
    and answer.question_id = item.question_id
  where item.assignment_id = p_assignment_id;

  return jsonb_build_object(
    'assignment', v_assignment,
    'correct_count', v_correct_count,
    'total_count', v_total_count,
    'score_percent', v_score_percent,
    'submitted_at', v_submitted_at,
    'answers', v_answers
  );
end;
$$;

create or replace function public.get_teacher_assignment_curriculum_evidence(
  p_assignment_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_outcomes jsonb := '[]'::jsonb;
  v_skills jsonb := '[]'::jsonb;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');
  if not exists (
    select 1
    from public.teacher_assignments as assignment
    join public.classrooms as classroom on classroom.id = assignment.classroom_id
    where assignment.id = p_assignment_id
      and assignment.teacher_id = v_teacher_user_id
      and classroom.teacher_id = v_teacher_user_id
  ) then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'title', evidence.official_outcome_title,
    'evidence_count', evidence.evidence_count,
    'correct_count', evidence.correct_count,
    'accuracy_percent', case
      when evidence.evidence_count = 0 then null
      else round(evidence.correct_count::numeric * 100 / evidence.evidence_count, 1)
    end
  ) order by evidence.official_outcome_title), '[]'::jsonb)
  into v_outcomes
  from (
    select
      progress.official_outcome_id,
      max(progress.official_outcome_title) as official_outcome_title,
      sum(progress.evidence_count)::integer as evidence_count,
      sum(progress.correct_count)::integer as correct_count
    from public.student_assignment_outcome_progress as progress
    where progress.assignment_id = p_assignment_id
    group by progress.official_outcome_id
  ) as evidence;

  select coalesce(jsonb_agg(jsonb_build_object(
    'title', evidence.skill_title,
    'evidence_count', evidence.evidence_count,
    'correct_count', evidence.correct_count,
    'accuracy_percent', case
      when evidence.evidence_count = 0 then null
      else round(evidence.correct_count::numeric * 100 / evidence.evidence_count, 1)
    end
  ) order by evidence.skill_title), '[]'::jsonb)
  into v_skills
  from (
    select
      progress.skill_id,
      max(progress.skill_title) as skill_title,
      sum(progress.evidence_count)::integer as evidence_count,
      sum(progress.correct_count)::integer as correct_count
    from public.student_assignment_skill_progress as progress
    where progress.assignment_id = p_assignment_id
    group by progress.skill_id
  ) as evidence;

  return jsonb_build_object(
    'assignment_id', p_assignment_id,
    'evidence_source', 'TEACHER_ASSIGNMENT',
    'mastery_claim', false,
    'outcomes', v_outcomes,
    'skills', v_skills
  );
end;
$$;

create or replace function public.get_parent_child_universal_progress(
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
  v_student_name text;
  v_grade smallint;
  v_release_id text;
  v_attempt_count bigint := 0;
  v_completed_attempt_count bigint := 0;
  v_total_answered bigint := 0;
  v_total_correct bigint := 0;
  v_started_unit_count bigint := 0;
  v_completed_unit_count bigint := 0;
  v_last_activity_at timestamptz;
  v_recent boolean[] := array[]::boolean[];
  v_units jsonb := '[]'::jsonb;
  v_outcomes jsonb := '[]'::jsonb;
  v_skills jsonb := '[]'::jsonb;
  v_attempts jsonb := '[]'::jsonb;
  v_assignment_outcomes jsonb := '[]'::jsonb;
  v_assignment_skills jsonb := '[]'::jsonb;
  v_assignment_attempt_count bigint := 0;
  v_assignment_completed_count bigint := 0;
  v_assignment_answered bigint := 0;
  v_assignment_correct bigint := 0;
  v_assignment_last_activity_at timestamptz;
  v_mastery_label text;
  v_strengths jsonb := '[]'::jsonb;
  v_needs_practice jsonb := '[]'::jsonb;
begin
  v_parent_user_id := private.require_connection_actor('PARENT');
  select
    connection.student_user_id,
    coalesce(nullif(btrim(profile.full_name), ''), 'Học sinh'),
    student.grade
  into v_student_user_id, v_student_name, v_grade
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
      count(*) filter (where attempt.status = 'COMPLETED'),
      count(distinct attempt.unit_slug),
      count(distinct attempt.unit_slug)
        filter (where attempt.status = 'COMPLETED'),
      max(attempt.updated_at)
    into
      v_attempt_count,
      v_completed_attempt_count,
      v_started_unit_count,
      v_completed_unit_count,
      v_last_activity_at
    from public.practice_attempts as attempt
    where attempt.student_id = v_student_user_id;

    select
      count(*),
      count(*) filter (where answer.is_correct),
      coalesce(
        (array_agg(answer.is_correct order by answer.answered_at desc))[1:5],
        array[]::boolean[]
      )
    into v_total_answered, v_total_correct, v_recent
    from public.practice_answers as answer
    join public.practice_attempts as attempt on attempt.id = answer.attempt_id
    where attempt.student_id = v_student_user_id;

    select coalesce(jsonb_agg(jsonb_build_object(
      'unit_id', progress.unit_id,
      'title', progress.title,
      'status', progress.status,
      'evidence_count', progress.evidence_count,
      'correct_count', progress.correct_count,
      'accuracy_percent', progress.accuracy_percent,
      'mastery_label', progress.mastery_label,
      'last_activity_at', progress.last_activity_at,
      'source', 'LEGACY_GRADE1'
    ) order by progress.display_order), '[]'::jsonb)
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
        coalesce(sum(attempt.answered_count), 0)::integer as evidence_count,
        coalesce(sum(attempt.correct_count), 0)::integer as correct_count,
        case
          when coalesce(sum(attempt.answered_count), 0) = 0 then null
          else round(
            sum(attempt.correct_count)::numeric * 100
              / sum(attempt.answered_count),
            1
          )
        end as accuracy_percent,
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
          when bool_or(attempt.status = 'IN_PROGRESS') then 'IN_PROGRESS'
          else 'NOT_STARTED'
        end as mastery_label,
        max(attempt.updated_at) as last_activity_at
      from public.learning_units as unit
      left join public.practice_attempts as attempt
        on attempt.unit_slug = unit.slug
        and attempt.student_id = v_student_user_id
      where unit.grade = 1 and unit.published
      group by unit.slug, unit.title, unit.display_order
    ) as progress;

    select release.release_id into v_release_id
    from public.curriculum_releases as release
    order by
      (release.status = 'ACTIVE' and release.activation_state = 'ACTIVE') desc,
      release.created_at desc
    limit 1;

    if v_release_id is not null then
      select coalesce(jsonb_agg(jsonb_build_object(
        'title', evidence.official_outcome_title,
        'evidence_count', evidence.evidence_count,
        'correct_count', evidence.correct_count,
        'accuracy_percent', round(
          evidence.correct_count::numeric * 100 / evidence.evidence_count, 1
        ),
        'mastery_label', private.curriculum_mastery_label(
          evidence.evidence_count,
          evidence.correct_count,
          evidence.recent_evidence
        ),
        'last_activity_at', evidence.last_activity_at,
        'source', 'LEGACY_UNIT_ALIGNED'
      ) order by evidence.official_outcome_title), '[]'::jsonb)
      into v_outcomes
      from (
        select
          mapping.official_outcome_id,
          max(mapping.official_outcome_title) as official_outcome_title,
          count(*)::integer as evidence_count,
          count(*) filter (where answer.is_correct)::integer
            as correct_count,
          (array_agg(
            answer.is_correct order by answer.answered_at desc
          ))[1:5] as recent_evidence,
          max(answer.answered_at) as last_activity_at
        from public.curriculum_legacy_grade1_outcome_mappings as mapping
        join public.practice_attempts as attempt
          on attempt.unit_slug = mapping.legacy_unit_slug
          and attempt.student_id = v_student_user_id
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
      'accuracy_percent', round(
        evidence.correct_count::numeric * 100 / evidence.evidence_count, 1
      ),
      'mastery_label', private.curriculum_mastery_label(
        evidence.evidence_count,
        evidence.correct_count,
        evidence.recent_evidence
      ),
      'last_activity_at', evidence.last_activity_at,
      'source', 'LEGACY_QUESTION_SKILL'
    ) order by evidence.skill_title), '[]'::jsonb)
    into v_skills
    from (
      select
        question.skill_code,
        replace(initcap(replace(question.skill_code, '_', ' ')), 'To ', 'đến ')
          as skill_title,
        count(*)::integer as evidence_count,
        count(*) filter (where answer.is_correct)::integer as correct_count,
        (array_agg(
          answer.is_correct order by answer.answered_at desc
        ))[1:5] as recent_evidence,
        max(answer.answered_at) as last_activity_at
      from public.practice_answers as answer
      join public.practice_attempts as attempt on attempt.id = answer.attempt_id
      join public.questions as question on question.code = answer.question_id
      where attempt.student_id = v_student_user_id
      group by question.skill_code
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
      'source', 'LEGACY_GRADE1'
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
      from public.practice_attempts as attempt
      join public.learning_units as unit on unit.slug = attempt.unit_slug
      where attempt.student_id = v_student_user_id
      order by attempt.started_at desc
      limit 50
    ) as history;
  else
    select attempt.release_id into v_release_id
    from public.curriculum_attempts as attempt
    where attempt.student_id = v_student_user_id
    order by attempt.updated_at desc
    limit 1;
    if v_release_id is null then
      select release.release_id into v_release_id
      from public.curriculum_releases as release
      order by
        (release.status = 'ACTIVE' and release.activation_state = 'ACTIVE') desc,
        release.created_at desc
      limit 1;
    end if;

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
      count(*) filter (where answer.is_correct),
      coalesce(
        (array_agg(answer.is_correct order by answer.answered_at desc))[1:5],
        array[]::boolean[]
      )
    into v_total_answered, v_total_correct, v_recent
    from public.curriculum_answers as answer
    join public.curriculum_attempts as attempt
      on attempt.id = answer.attempt_id
    where attempt.student_id = v_student_user_id;

    select coalesce(jsonb_agg(jsonb_build_object(
      'unit_id', unit.unit_id,
      'title', unit.title,
      'status', coalesce(progress.status, 'NOT_STARTED'),
      'evidence_count', coalesce(progress.evidence_count, 0),
      'correct_count', coalesce(progress.correct_count, 0),
      'accuracy_percent', case
        when coalesce(progress.evidence_count, 0) = 0 then null
        else round(
          progress.correct_count::numeric * 100 / progress.evidence_count, 1
        )
      end,
      'mastery_label', coalesce(progress.mastery_label, 'NOT_STARTED'),
      'last_activity_at', progress.last_activity_at,
      'source', 'UNIVERSAL_CURRICULUM'
    ) order by unit.display_order), '[]'::jsonb)
    into v_units
    from public.curriculum_release_units as unit
    left join public.student_curriculum_unit_progress as progress
      on progress.release_id = unit.release_id
      and progress.unit_id = unit.unit_id
      and progress.student_id = v_student_user_id
    where unit.release_id = v_release_id and unit.grade = v_grade;

    select coalesce(jsonb_agg(jsonb_build_object(
      'title', progress.official_outcome_title,
      'evidence_count', progress.evidence_count,
      'correct_count', progress.correct_count,
      'accuracy_percent', round(
        progress.correct_count::numeric * 100 / progress.evidence_count, 1
      ),
      'mastery_label', progress.mastery_label,
      'last_activity_at', progress.last_activity_at,
      'source', 'UNIVERSAL_CURRICULUM'
    ) order by progress.last_activity_at desc), '[]'::jsonb)
    into v_outcomes
    from public.student_curriculum_outcome_progress as progress
    where progress.student_id = v_student_user_id
      and progress.release_id = v_release_id;

    select coalesce(jsonb_agg(jsonb_build_object(
      'title', progress.skill_title,
      'evidence_count', progress.evidence_count,
      'correct_count', progress.correct_count,
      'accuracy_percent', round(
        progress.correct_count::numeric * 100 / progress.evidence_count, 1
      ),
      'mastery_label', progress.mastery_label,
      'last_activity_at', progress.last_activity_at,
      'source', 'UNIVERSAL_CURRICULUM'
    ) order by progress.last_activity_at desc), '[]'::jsonb)
    into v_skills
    from public.student_curriculum_skill_progress as progress
    where progress.student_id = v_student_user_id
      and progress.release_id = v_release_id;

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
      order by attempt.started_at desc
      limit 50
    ) as history;
  end if;

  select
    count(*),
    count(*) filter (where submission.status = 'SUBMITTED'),
    coalesce(sum(submission.answered_count), 0),
    coalesce(sum(submission.correct_count), 0),
    max(submission.updated_at)
  into
    v_assignment_attempt_count,
    v_assignment_completed_count,
    v_assignment_answered,
    v_assignment_correct,
    v_assignment_last_activity_at
  from public.assignment_submissions as submission
  where submission.student_id = v_student_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'title', evidence.official_outcome_title,
    'evidence_count', evidence.evidence_count,
    'correct_count', evidence.correct_count,
    'accuracy_percent', round(
      evidence.correct_count::numeric * 100 / evidence.evidence_count, 1
    ),
    'source', 'TEACHER_ASSIGNMENT'
  ) order by evidence.official_outcome_title), '[]'::jsonb)
  into v_assignment_outcomes
  from (
    select
      progress.official_outcome_id,
      max(progress.official_outcome_title) as official_outcome_title,
      sum(progress.evidence_count)::integer as evidence_count,
      sum(progress.correct_count)::integer as correct_count
    from public.student_assignment_outcome_progress as progress
    where progress.student_id = v_student_user_id
    group by progress.official_outcome_id
  ) as evidence;

  select coalesce(jsonb_agg(jsonb_build_object(
    'title', evidence.skill_title,
    'evidence_count', evidence.evidence_count,
    'correct_count', evidence.correct_count,
    'accuracy_percent', round(
      evidence.correct_count::numeric * 100 / evidence.evidence_count, 1
    ),
    'source', 'TEACHER_ASSIGNMENT'
  ) order by evidence.skill_title), '[]'::jsonb)
  into v_assignment_skills
  from (
    select
      progress.skill_id,
      max(progress.skill_title) as skill_title,
      sum(progress.evidence_count)::integer as evidence_count,
      sum(progress.correct_count)::integer as correct_count
    from public.student_assignment_skill_progress as progress
    where progress.student_id = v_student_user_id
    group by progress.skill_id
  ) as evidence;

  v_mastery_label := case
    when v_total_answered = 0 and v_attempt_count = 0 then 'NOT_STARTED'
    when v_total_answered < 3 then 'IN_PROGRESS'
    else private.curriculum_mastery_label(
      v_total_answered::integer,
      v_total_correct::integer,
      v_recent
    )
  end;

  select coalesce(jsonb_agg(item order by item ->> 'title'), '[]'::jsonb)
  into v_strengths
  from jsonb_array_elements(v_outcomes || v_skills) as item
  where item ->> 'mastery_label' in ('PROFICIENT', 'MASTERED');
  select coalesce(jsonb_agg(item order by item ->> 'title'), '[]'::jsonb)
  into v_needs_practice
  from jsonb_array_elements(v_outcomes || v_skills) as item
  where item ->> 'mastery_label' = 'NEEDS_PRACTICE';

  return jsonb_build_object(
    'student', jsonb_build_object(
      'display_name', v_student_name,
      'grade', v_grade
    ),
    'compatibility_mode', case
      when v_grade = 1 then 'LEGACY_GRADE1_AGGREGATED'
      else 'UNIVERSAL_CURRICULUM'
    end,
    'mastery_policy_version', 'product-hypothesis-v1',
    'mastery_explanation',
      'Nhãn sản phẩm dựa trên số câu đã làm, tỷ lệ đúng và kết quả gần đây; đây không phải chẩn đoán khoa học.',
    'summary', jsonb_build_object(
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
    'units', v_units,
    'outcomes', v_outcomes,
    'skills', v_skills,
    'attempts', v_attempts,
    'strengths', v_strengths,
    'needs_practice', v_needs_practice,
    'assignment_summary', jsonb_build_object(
      'attempt_count', v_assignment_attempt_count,
      'completed_count', v_assignment_completed_count,
      'answered_count', v_assignment_answered,
      'correct_count', v_assignment_correct,
      'accuracy_percent', case
        when v_assignment_answered = 0 then null
        else round(
          v_assignment_correct::numeric * 100 / v_assignment_answered, 1
        )
      end,
      'last_activity_at', v_assignment_last_activity_at,
      'evidence_source', 'TEACHER_ASSIGNMENT'
    ),
    'assignment_outcomes', v_assignment_outcomes,
    'assignment_skills', v_assignment_skills
  );
end;
$$;

alter table public.teacher_curriculum_assignment_drafts
  enable row level security;
alter table public.teacher_curriculum_assignment_draft_items
  enable row level security;
alter table private.assignment_submission_mutations
  enable row level security;
alter table public.student_assignment_outcome_progress
  enable row level security;
alter table public.student_assignment_skill_progress
  enable row level security;

alter table public.teacher_curriculum_assignment_drafts
  force row level security;
alter table public.teacher_curriculum_assignment_draft_items
  force row level security;
alter table private.assignment_submission_mutations
  force row level security;
alter table public.student_assignment_outcome_progress
  force row level security;
alter table public.student_assignment_skill_progress
  force row level security;
alter table public.teacher_questions force row level security;
alter table public.teacher_question_solutions force row level security;
alter table public.teacher_assignments force row level security;
alter table public.teacher_assignment_items force row level security;
alter table public.assignment_submissions force row level security;
alter table public.assignment_answers force row level security;

revoke all on table public.teacher_curriculum_assignment_drafts
  from public, anon, authenticated;
revoke all on table public.teacher_curriculum_assignment_draft_items
  from public, anon, authenticated;
revoke all on table private.assignment_submission_mutations
  from public, anon, authenticated;
revoke all on table public.student_assignment_outcome_progress
  from public, anon, authenticated;
revoke all on table public.student_assignment_skill_progress
  from public, anon, authenticated;

revoke all on function public.get_teacher_curriculum_catalog(
  uuid, text, text, text, text, integer, integer
) from public, anon;
revoke all on function public.create_teacher_curriculum_assignment_draft(
  uuid, text, text, timestamptz, text, text, text, text,
  text[], smallint, text, uuid
) from public, anon;
revoke all on function public.publish_teacher_curriculum_assignment_draft(
  uuid, uuid
) from public, anon;
revoke all on function public.get_my_teacher_curriculum_drafts()
  from public, anon;
revoke all on function public.save_assignment_draft_answer_v2(
  uuid, uuid, text, integer, uuid
) from public, anon;
revoke all on function public.submit_assignment_submission_v2(
  uuid, integer, uuid
) from public, anon;
revoke execute on function public.save_assignment_draft_answer(
  uuid, uuid, text
) from authenticated;
revoke execute on function public.submit_assignment_submission(uuid)
  from authenticated;
revoke all on function public.get_teacher_assignment_curriculum_evidence(uuid)
  from public, anon;
revoke all on function public.get_parent_child_universal_progress(uuid)
  from public, anon;

grant execute on function public.get_teacher_curriculum_catalog(
  uuid, text, text, text, text, integer, integer
) to authenticated;
grant execute on function public.create_teacher_curriculum_assignment_draft(
  uuid, text, text, timestamptz, text, text, text, text,
  text[], smallint, text, uuid
) to authenticated;
grant execute on function public.publish_teacher_curriculum_assignment_draft(
  uuid, uuid
) to authenticated;
grant execute on function public.get_my_teacher_curriculum_drafts()
  to authenticated;
grant execute on function public.save_assignment_draft_answer_v2(
  uuid, uuid, text, integer, uuid
) to authenticated;
grant execute on function public.submit_assignment_submission_v2(
  uuid, integer, uuid
) to authenticated;
grant execute on function public.get_teacher_assignment_curriculum_evidence(uuid)
  to authenticated;
grant execute on function public.get_parent_child_universal_progress(uuid)
  to authenticated;

revoke all on function private.enforce_teacher_question_integrity()
  from public, anon, authenticated;
revoke all on function private.enforce_teacher_question_solution()
  from public, anon, authenticated;
revoke all on function private.enforce_teacher_assignment_integrity()
  from public, anon, authenticated;
revoke all on function private.enforce_assignment_answer_integrity()
  from public, anon, authenticated;

comment on function public.get_parent_child_universal_progress(uuid) is
  'Read-only linked-child progress. Grade 1 uses legacy evidence; Grades 2-9 use universal evidence; assignment evidence remains separately labelled.';
comment on function public.create_teacher_curriculum_assignment_draft(
  uuid, text, text, timestamptz, text, text, text, text,
  text[], smallint, text, uuid
) is
  'Creates an immutable deterministic or manual selection manifest from the active materialized curriculum bank without returning solutions.';
comment on function public.submit_assignment_submission_v2(
  uuid, integer, uuid
) is
  'JWT-bound authoritative grading with CAS, idempotency and assignment-specific outcome/skill evidence.';

commit;
