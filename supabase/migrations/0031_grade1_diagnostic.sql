begin;

create or replace function private.is_valid_diagnostic_question_order(
  p_question_order text[]
)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select
    pg_catalog.cardinality(p_question_order) = 24
    and pg_catalog.array_position(p_question_order, null) is null
    and (
      select pg_catalog.count(distinct question_id)
      from pg_catalog.unnest(p_question_order) as question_id
    ) = 24;
$$;

revoke all on function private.is_valid_diagnostic_question_order(text[])
  from public;
revoke all on function private.is_valid_diagnostic_question_order(text[])
  from anon;
revoke all on function private.is_valid_diagnostic_question_order(text[])
  from authenticated;

create table public.grade1_diagnostic_blueprint (
  blueprint_version smallint not null default 1
    check (blueprint_version = 1),
  position smallint not null check (position between 1 and 24),
  domain text not null check (
    domain in (
      'NUMBER_SENSE',
      'ARITHMETIC',
      'GEOMETRY',
      'MEASUREMENT_TIME'
    )
  ),
  question_id text not null
    references public.questions(code) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (blueprint_version, position),
  unique (blueprint_version, question_id)
);

create table public.diagnostic_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null
    references public.student_profiles(user_id) on delete restrict,
  blueprint_version smallint not null default 1
    check (blueprint_version = 1),
  status text not null default 'IN_PROGRESS'
    check (status in ('IN_PROGRESS', 'COMPLETED')),
  question_order text[] not null,
  total_questions smallint not null default 24
    check (total_questions = 24),
  answered_count smallint not null default 0
    check (answered_count between 0 and 24),
  correct_count smallint not null default 0,
  recommendation_unit_slug text
    references public.learning_units(slug) on delete restrict,
  recommendation_reason_code text check (
    recommendation_reason_code is null
    or recommendation_reason_code in (
      'REVIEW_NUMBER_SENSE',
      'REVIEW_ARITHMETIC',
      'REVIEW_GEOMETRY',
      'REVIEW_MEASUREMENT_TIME',
      'NEXT_UNCOMPLETED_UNIT',
      'GRADE1_CURRENT_SCOPE_MASTERED'
    )
  ),
  recommendation_explanation text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint diagnostic_attempts_question_order_check check (
    private.is_valid_diagnostic_question_order(question_order)
  ),
  constraint diagnostic_attempts_score_check check (
    correct_count between 0 and answered_count
  ),
  constraint diagnostic_attempts_recommendation_explanation_check check (
    recommendation_explanation is null
    or (
      recommendation_explanation = btrim(recommendation_explanation)
      and char_length(recommendation_explanation) between 10 and 300
    )
  ),
  constraint diagnostic_attempts_lifecycle_check check (
    (
      status = 'IN_PROGRESS'
      and answered_count < 24
      and completed_at is null
      and recommendation_unit_slug is null
      and recommendation_reason_code is null
      and recommendation_explanation is null
    )
    or (
      status = 'COMPLETED'
      and answered_count = 24
      and completed_at is not null
      and recommendation_reason_code is not null
      and recommendation_explanation is not null
      and (
        (
          recommendation_reason_code = 'GRADE1_CURRENT_SCOPE_MASTERED'
          and recommendation_unit_slug is null
        )
        or (
          recommendation_reason_code <> 'GRADE1_CURRENT_SCOPE_MASTERED'
          and recommendation_unit_slug is not null
        )
      )
    )
  )
);

create table public.diagnostic_answers (
  attempt_id uuid not null
    references public.diagnostic_attempts(id) on delete restrict,
  question_id text not null
    references public.questions(code) on delete restrict,
  normalized_answer text not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (attempt_id, question_id),
  constraint diagnostic_answers_normalized_answer_check check (
    normalized_answer = upper(btrim(normalized_answer))
    and char_length(normalized_answer) between 1 and 20
  )
);

create unique index diagnostic_attempts_one_in_progress_idx
  on public.diagnostic_attempts (student_id)
  where status = 'IN_PROGRESS';

create index diagnostic_attempts_student_started_idx
  on public.diagnostic_attempts (student_id, started_at desc);

create index diagnostic_answers_attempt_answered_idx
  on public.diagnostic_answers (attempt_id, answered_at);

create trigger diagnostic_attempts_set_updated_at
before update on public.diagnostic_attempts
for each row execute function private.set_updated_at();

insert into public.grade1_diagnostic_blueprint (
  blueprint_version,
  position,
  domain,
  question_id
)
values
  (1, 1, 'NUMBER_SENSE', 'g1-n20-q01'),
  (1, 2, 'NUMBER_SENSE', 'g1-n20-q07'),
  (1, 3, 'NUMBER_SENSE', 'g1-num100-q13'),
  (1, 4, 'NUMBER_SENSE', 'g1-num100-q19'),
  (1, 5, 'NUMBER_SENSE', 'g1-n20-q05'),
  (1, 6, 'NUMBER_SENSE', 'g1-num100-q17'),

  (1, 7, 'ARITHMETIC', 'g1-add-q01'),
  (1, 8, 'ARITHMETIC', 'g1-sub-q07'),
  (1, 9, 'ARITHMETIC', 'g1-add100-q07'),
  (1, 10, 'ARITHMETIC', 'g1-sub100-q19'),
  (1, 11, 'ARITHMETIC', 'g1-add-q11'),
  (1, 12, 'ARITHMETIC', 'g1-sub100-q11'),

  (1, 13, 'GEOMETRY', 'g1-geo-q01'),
  (1, 14, 'GEOMETRY', 'g1-geo-q13'),
  (1, 15, 'GEOMETRY', 'g1-solid-q07'),
  (1, 16, 'GEOMETRY', 'g1-solid-q13'),
  (1, 17, 'GEOMETRY', 'g1-geo-q21'),
  (1, 18, 'GEOMETRY', 'g1-solid-q21'),

  (1, 19, 'MEASUREMENT_TIME', 'g1-len-q01'),
  (1, 20, 'MEASUREMENT_TIME', 'g1-len-q13'),
  (1, 21, 'MEASUREMENT_TIME', 'g1-time-q01'),
  (1, 22, 'MEASUREMENT_TIME', 'g1-time-q19'),
  (1, 23, 'MEASUREMENT_TIME', 'g1-len-q23'),
  (1, 24, 'MEASUREMENT_TIME', 'g1-time-q21');

alter table public.grade1_diagnostic_blueprint enable row level security;
alter table public.diagnostic_attempts enable row level security;
alter table public.diagnostic_answers enable row level security;

revoke all on table public.grade1_diagnostic_blueprint from public;
revoke all on table public.grade1_diagnostic_blueprint from anon;
revoke all on table public.grade1_diagnostic_blueprint from authenticated;

revoke all on table public.diagnostic_attempts from public;
revoke all on table public.diagnostic_attempts from anon;
revoke all on table public.diagnostic_attempts from authenticated;
grant select on table public.diagnostic_attempts to authenticated;

revoke all on table public.diagnostic_answers from public;
revoke all on table public.diagnostic_answers from anon;
revoke all on table public.diagnostic_answers from authenticated;

create policy diagnostic_attempts_select_own
on public.diagnostic_attempts
for select
to authenticated
using (
  student_id = auth.uid()
  and exists (
    select 1
    from public.profiles as profile
    join public.student_profiles as student
      on student.user_id = profile.user_id
    where profile.user_id = auth.uid()
      and profile.role = 'STUDENT'
      and profile.onboarding_completed
      and student.grade = 1
  )
);

create or replace function public.start_or_resume_grade1_diagnostic()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_student_count bigint := 0;
  v_blueprint_count bigint := 0;
  v_attempt_id uuid;
  v_question_order text[];
  v_answered_count smallint;
  v_started_at timestamptz;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select count(*)
  into v_student_count
  from public.profiles as profile
  join public.student_profiles as student
    on student.user_id = profile.user_id
  where profile.user_id = v_current_user_id
    and profile.role = 'STUDENT'
    and profile.onboarding_completed
    and student.grade = 1;

  if v_student_count <> 1 then
    raise exception 'Student access required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_current_user_id::text || ':grade1-diagnostic',
      31
    )
  );

  select
    attempt.id,
    attempt.question_order,
    attempt.answered_count,
    attempt.started_at
  into
    v_attempt_id,
    v_question_order,
    v_answered_count,
    v_started_at
  from public.diagnostic_attempts as attempt
  where attempt.student_id = v_current_user_id
    and attempt.status = 'IN_PROGRESS'
  order by attempt.started_at desc, attempt.id desc
  limit 1;

  if v_attempt_id is null then
    select count(*)
    into v_blueprint_count
    from public.grade1_diagnostic_blueprint as blueprint
    join public.questions as question
      on question.code = blueprint.question_id
    join public.question_solutions as solution
      on solution.question_id = question.code
    join public.learning_units as unit
      on unit.slug = question.unit_slug
    where blueprint.blueprint_version = 1
      and question.published
      and unit.published
      and unit.grade = 1;

    if v_blueprint_count <> 24 then
      raise exception 'Diagnostic unavailable';
    end if;

    select pg_catalog.array_agg(
      blueprint.question_id order by pg_catalog.random()
    )
    into v_question_order
    from public.grade1_diagnostic_blueprint as blueprint
    where blueprint.blueprint_version = 1;

    if not private.is_valid_diagnostic_question_order(v_question_order) then
      raise exception 'Diagnostic unavailable';
    end if;

    v_attempt_id := extensions.gen_random_uuid();
    v_answered_count := 0;
    v_started_at := now();

    insert into public.diagnostic_attempts (
      id,
      student_id,
      blueprint_version,
      status,
      question_order,
      total_questions,
      answered_count,
      correct_count,
      started_at
    )
    values (
      v_attempt_id,
      v_current_user_id,
      1,
      'IN_PROGRESS',
      v_question_order,
      24,
      0,
      0,
      v_started_at
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'attempt_id', v_attempt_id,
    'status', 'IN_PROGRESS',
    'question_order', pg_catalog.to_jsonb(v_question_order),
    'total_questions', 24,
    'answered_count', v_answered_count,
    'started_at', v_started_at
  );
end;
$$;

revoke all on function public.start_or_resume_grade1_diagnostic()
  from public;
revoke all on function public.start_or_resume_grade1_diagnostic()
  from anon;
grant execute on function public.start_or_resume_grade1_diagnostic()
  to authenticated;

create or replace function public.get_grade1_diagnostic_state(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_student_count bigint := 0;
  v_status text;
  v_blueprint_version smallint;
  v_question_order text[];
  v_answered_count smallint;
  v_started_at timestamptz;
  v_completed_at timestamptz;
  v_questions jsonb;
  v_answered_question_ids jsonb;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'Diagnostic unavailable';
  end if;

  select count(*)
  into v_student_count
  from public.profiles as profile
  join public.student_profiles as student
    on student.user_id = profile.user_id
  where profile.user_id = v_current_user_id
    and profile.role = 'STUDENT'
    and profile.onboarding_completed
    and student.grade = 1;

  if v_student_count <> 1 then
    raise exception 'Student access required';
  end if;

  select
    attempt.status,
    attempt.blueprint_version,
    attempt.question_order,
    attempt.answered_count,
    attempt.started_at,
    attempt.completed_at
  into
    v_status,
    v_blueprint_version,
    v_question_order,
    v_answered_count,
    v_started_at,
    v_completed_at
  from public.diagnostic_attempts as attempt
  where attempt.id = p_attempt_id
    and attempt.student_id = v_current_user_id;

  if v_status is null then
    raise exception 'Diagnostic unavailable';
  end if;

  select pg_catalog.coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'code', question.code,
        'unit_slug', question.unit_slug,
        'unit_title', unit.title,
        'question_type', question.question_type,
        'prompt', question.prompt,
        'options', question.options,
        'visual_spec', question.visual_spec,
        'skill_code', question.skill_code,
        'difficulty', question.difficulty,
        'display_order', blueprint.position,
        'domain', blueprint.domain
      )
      order by pg_catalog.array_position(v_question_order, question.code)
    ),
    '[]'::jsonb
  )
  into v_questions
  from public.grade1_diagnostic_blueprint as blueprint
  join public.questions as question
    on question.code = blueprint.question_id
  join public.learning_units as unit
    on unit.slug = question.unit_slug
  where blueprint.blueprint_version = v_blueprint_version
    and question.code = any(v_question_order)
    and question.published
    and unit.published
    and unit.grade = 1;

  select pg_catalog.coalesce(
    pg_catalog.jsonb_agg(
      answer.question_id
      order by pg_catalog.array_position(v_question_order, answer.question_id)
    ),
    '[]'::jsonb
  )
  into v_answered_question_ids
  from public.diagnostic_answers as answer
  where answer.attempt_id = p_attempt_id;

  if pg_catalog.jsonb_array_length(v_questions) <> 24 then
    raise exception 'Diagnostic unavailable';
  end if;

  return pg_catalog.jsonb_build_object(
    'attempt_id', p_attempt_id,
    'status', v_status,
    'question_order', pg_catalog.to_jsonb(v_question_order),
    'total_questions', 24,
    'answered_count', v_answered_count,
    'answered_question_ids', v_answered_question_ids,
    'started_at', v_started_at,
    'completed_at', v_completed_at,
    'questions', v_questions
  );
end;
$$;

revoke all on function public.get_grade1_diagnostic_state(uuid)
  from public;
revoke all on function public.get_grade1_diagnostic_state(uuid)
  from anon;
grant execute on function public.get_grade1_diagnostic_state(uuid)
  to authenticated;

create or replace function public.submit_grade1_diagnostic_answer(
  p_attempt_id uuid,
  p_question_id text,
  p_answer text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_student_count bigint := 0;
  v_status text;
  v_question_order text[];
  v_blueprint_version smallint;
  v_question_type text;
  v_correct_answer text;
  v_normalized_answer text;
  v_existing_answer text;
  v_expected_question_id text;
  v_is_correct boolean;
  v_answered_count bigint := 0;
  v_correct_count bigint := 0;
  v_completed boolean := false;
  v_weak_domain text;
  v_recommendation_unit_slug text;
  v_recommendation_reason_code text;
  v_recommendation_explanation text;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'Diagnostic unavailable';
  end if;

  select count(*)
  into v_student_count
  from public.profiles as profile
  join public.student_profiles as student
    on student.user_id = profile.user_id
  where profile.user_id = v_current_user_id
    and profile.role = 'STUDENT'
    and profile.onboarding_completed
    and student.grade = 1;

  if v_student_count <> 1 then
    raise exception 'Student access required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_attempt_id::text, 32)
  );

  select
    attempt.status,
    attempt.blueprint_version,
    attempt.question_order
  into
    v_status,
    v_blueprint_version,
    v_question_order
  from public.diagnostic_attempts as attempt
  where attempt.id = p_attempt_id
    and attempt.student_id = v_current_user_id;

  if v_status is null then
    raise exception 'Diagnostic unavailable';
  end if;

  select answer.normalized_answer
  into v_existing_answer
  from public.diagnostic_answers as answer
  where answer.attempt_id = p_attempt_id
    and answer.question_id = p_question_id;

  select
    question.question_type,
    solution.correct_answer
  into
    v_question_type,
    v_correct_answer
  from public.grade1_diagnostic_blueprint as blueprint
  join public.questions as question
    on question.code = blueprint.question_id
  join public.question_solutions as solution
    on solution.question_id = question.code
  where blueprint.blueprint_version = v_blueprint_version
    and blueprint.question_id = p_question_id
    and p_question_id = any(v_question_order)
    and question.published;

  if v_question_type is null then
    raise exception 'Question unavailable';
  end if;

  if p_answer is null or char_length(p_answer) not between 1 and 20 then
    raise exception 'Invalid answer';
  end if;

  if v_question_type = 'MULTIPLE_CHOICE' then
    v_normalized_answer := upper(btrim(p_answer));
    if v_normalized_answer !~ '^[A-D]$' then
      raise exception 'Invalid answer';
    end if;
  elsif v_question_type = 'NUMBER_INPUT' then
    v_normalized_answer := btrim(p_answer);
    if
      v_normalized_answer !~ '^(0|[1-9][0-9]?|100)$'
      or v_normalized_answer::integer not between 0 and 100
    then
      raise exception 'Invalid answer';
    end if;
    v_normalized_answer := v_normalized_answer::integer::text;
  else
    raise exception 'Question unavailable';
  end if;

  if v_existing_answer is not null then
    if v_existing_answer <> v_normalized_answer then
      raise exception 'Answer already submitted';
    end if;

    select
      count(*),
      count(*) filter (where answer.is_correct)
    into
      v_answered_count,
      v_correct_count
    from public.diagnostic_answers as answer
    where answer.attempt_id = p_attempt_id;

    return pg_catalog.jsonb_build_object(
      'answered_count', v_answered_count,
      'total_questions', 24,
      'completed', v_status = 'COMPLETED'
    );
  end if;

  if v_status <> 'IN_PROGRESS' then
    raise exception 'Diagnostic unavailable';
  end if;

  select ordered.question_id
  into v_expected_question_id
  from pg_catalog.unnest(v_question_order)
    with ordinality as ordered(question_id, position)
  where not exists (
    select 1
    from public.diagnostic_answers as answer
    where answer.attempt_id = p_attempt_id
      and answer.question_id = ordered.question_id
  )
  order by ordered.position
  limit 1;

  if v_expected_question_id is null
    or p_question_id <> v_expected_question_id
  then
    raise exception 'Question unavailable';
  end if;

  v_is_correct := v_normalized_answer = v_correct_answer;

  insert into public.diagnostic_answers (
    attempt_id,
    question_id,
    normalized_answer,
    is_correct
  )
  values (
    p_attempt_id,
    p_question_id,
    v_normalized_answer,
    v_is_correct
  );

  select
    count(*),
    count(*) filter (where answer.is_correct)
  into
    v_answered_count,
    v_correct_count
  from public.diagnostic_answers as answer
  where answer.attempt_id = p_attempt_id;

  v_completed := v_answered_count = 24;

  if v_completed then
    with domain_statistics as (
      select
        blueprint.domain,
        count(*) as answered_count,
        count(*) filter (where answer.is_correct) as correct_count
      from public.diagnostic_answers as answer
      join public.grade1_diagnostic_blueprint as blueprint
        on blueprint.blueprint_version = v_blueprint_version
        and blueprint.question_id = answer.question_id
      where answer.attempt_id = p_attempt_id
      group by blueprint.domain
    ),
    domain_recommendations(domain, unit_slug, priority) as (
      values
        ('NUMBER_SENSE', 'grade-1-numbers-to-10', 1),
        ('ARITHMETIC', 'grade-1-addition-within-10', 2),
        ('GEOMETRY', 'grade-1-basic-geometry-and-position', 10),
        ('MEASUREMENT_TIME', 'grade-1-length-measurement', 11)
    )
    select
      statistics.domain,
      recommendation.unit_slug
    into
      v_weak_domain,
      v_recommendation_unit_slug
    from domain_statistics as statistics
    join domain_recommendations as recommendation
      on recommendation.domain = statistics.domain
    where
      statistics.answered_count = 6
      and (
        statistics.correct_count::numeric
        / statistics.answered_count::numeric
      ) < 0.70
    order by recommendation.priority
    limit 1;

    if v_weak_domain = 'NUMBER_SENSE' then
      v_recommendation_reason_code := 'REVIEW_NUMBER_SENSE';
      v_recommendation_explanation :=
        'Kết quả cho thấy em nên ôn lại số và cấu tạo số từ bài nền tảng.';
    elsif v_weak_domain = 'ARITHMETIC' then
      v_recommendation_reason_code := 'REVIEW_ARITHMETIC';
      v_recommendation_explanation :=
        'Kết quả cho thấy em nên ôn lại phép cộng và phép trừ từ bài nền tảng.';
    elsif v_weak_domain = 'GEOMETRY' then
      v_recommendation_reason_code := 'REVIEW_GEOMETRY';
      v_recommendation_explanation :=
        'Kết quả cho thấy em nên ôn lại hình học và vị trí cơ bản.';
    elsif v_weak_domain = 'MEASUREMENT_TIME' then
      v_recommendation_reason_code := 'REVIEW_MEASUREMENT_TIME';
      v_recommendation_explanation :=
        'Kết quả cho thấy em nên ôn lại đo lường và thời gian từ bài phù hợp.';
    else
      select unit.slug
      into v_recommendation_unit_slug
      from public.learning_units as unit
      where unit.grade = 1
        and unit.published
        and not exists (
          select 1
          from public.practice_attempts as practice_attempt
          where practice_attempt.student_id = v_current_user_id
            and practice_attempt.unit_slug = unit.slug
            and practice_attempt.status = 'COMPLETED'
        )
      order by unit.display_order, unit.slug
      limit 1;

      if v_recommendation_unit_slug is null then
        v_recommendation_reason_code :=
          'GRADE1_CURRENT_SCOPE_MASTERED';
        v_recommendation_explanation :=
          'Em đã hoàn thành tốt nội dung hiện tại của Lớp 1.';
      else
        v_recommendation_reason_code := 'NEXT_UNCOMPLETED_UNIT';
        v_recommendation_explanation :=
          'Các miền kiến thức đều đạt từ 70%; đây là bài chưa hoàn thành sớm nhất trong lộ trình.';
      end if;
    end if;
  end if;

  update public.diagnostic_attempts as attempt
  set
    answered_count = v_answered_count::smallint,
    correct_count = v_correct_count::smallint,
    status = case
      when v_completed then 'COMPLETED'
      else 'IN_PROGRESS'
    end,
    completed_at = case
      when v_completed then now()
      else null
    end,
    recommendation_unit_slug = case
      when v_completed then v_recommendation_unit_slug
      else null
    end,
    recommendation_reason_code = case
      when v_completed then v_recommendation_reason_code
      else null
    end,
    recommendation_explanation = case
      when v_completed then v_recommendation_explanation
      else null
    end
  where attempt.id = p_attempt_id
    and attempt.student_id = v_current_user_id;

  return pg_catalog.jsonb_build_object(
    'answered_count', v_answered_count,
    'total_questions', 24,
    'completed', v_completed
  );
end;
$$;

revoke all on function public.submit_grade1_diagnostic_answer(
  uuid,
  text,
  text
) from public;
revoke all on function public.submit_grade1_diagnostic_answer(
  uuid,
  text,
  text
) from anon;
grant execute on function public.submit_grade1_diagnostic_answer(
  uuid,
  text,
  text
) to authenticated;

create or replace function public.get_grade1_diagnostic_review(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_student_count bigint := 0;
  v_status text;
  v_blueprint_version smallint;
  v_question_order text[];
  v_answered_count smallint;
  v_correct_count smallint;
  v_started_at timestamptz;
  v_completed_at timestamptz;
  v_recommendation_unit_slug text;
  v_recommendation_unit_title text;
  v_recommendation_reason_code text;
  v_recommendation_explanation text;
  v_domain_results jsonb;
  v_unit_results jsonb;
  v_skill_results jsonb;
  v_review_items jsonb;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'Diagnostic unavailable';
  end if;

  select count(*)
  into v_student_count
  from public.profiles as profile
  join public.student_profiles as student
    on student.user_id = profile.user_id
  where profile.user_id = v_current_user_id
    and profile.role = 'STUDENT'
    and profile.onboarding_completed
    and student.grade = 1;

  if v_student_count <> 1 then
    raise exception 'Student access required';
  end if;

  select
    attempt.status,
    attempt.blueprint_version,
    attempt.question_order,
    attempt.answered_count,
    attempt.correct_count,
    attempt.started_at,
    attempt.completed_at,
    attempt.recommendation_unit_slug,
    unit.title,
    attempt.recommendation_reason_code,
    attempt.recommendation_explanation
  into
    v_status,
    v_blueprint_version,
    v_question_order,
    v_answered_count,
    v_correct_count,
    v_started_at,
    v_completed_at,
    v_recommendation_unit_slug,
    v_recommendation_unit_title,
    v_recommendation_reason_code,
    v_recommendation_explanation
  from public.diagnostic_attempts as attempt
  left join public.learning_units as unit
    on unit.slug = attempt.recommendation_unit_slug
  where attempt.id = p_attempt_id
    and attempt.student_id = v_current_user_id;

  if v_status is null then
    raise exception 'Diagnostic unavailable';
  end if;

  if v_status <> 'COMPLETED' then
    raise exception 'Diagnostic incomplete';
  end if;

  with domain_order(domain, position) as (
    values
      ('NUMBER_SENSE', 1),
      ('ARITHMETIC', 2),
      ('GEOMETRY', 3),
      ('MEASUREMENT_TIME', 4)
  ),
  domain_statistics as (
    select
      blueprint.domain,
      count(*) as answered_count,
      count(*) filter (where answer.is_correct) as correct_count
    from public.diagnostic_answers as answer
    join public.grade1_diagnostic_blueprint as blueprint
      on blueprint.blueprint_version = v_blueprint_version
      and blueprint.question_id = answer.question_id
    where answer.attempt_id = p_attempt_id
    group by blueprint.domain
  )
  select pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'domain', domain_order.domain,
      'answered_count', statistics.answered_count,
      'correct_count', statistics.correct_count,
      'accuracy_percent',
        pg_catalog.round(
          100.0 * statistics.correct_count / statistics.answered_count,
          1
        ),
      'level', case
        when 100.0 * statistics.correct_count / statistics.answered_count
          < 70
        then 'REVIEW'
        else 'DOING_WELL'
      end
    )
    order by domain_order.position
  )
  into v_domain_results
  from domain_order
  join domain_statistics as statistics
    on statistics.domain = domain_order.domain;

  select pg_catalog.coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'unit_slug', result.unit_slug,
        'unit_title', result.unit_title,
        'answered_count', result.answered_count,
        'correct_count', result.correct_count,
        'accuracy_percent',
          pg_catalog.round(
            100.0 * result.correct_count / result.answered_count,
            1
          )
      )
      order by result.display_order, result.unit_slug
    ),
    '[]'::jsonb
  )
  into v_unit_results
  from (
    select
      question.unit_slug,
      unit.title as unit_title,
      unit.display_order,
      count(*) as answered_count,
      count(*) filter (where answer.is_correct) as correct_count
    from public.diagnostic_answers as answer
    join public.questions as question
      on question.code = answer.question_id
    join public.learning_units as unit
      on unit.slug = question.unit_slug
    where answer.attempt_id = p_attempt_id
    group by question.unit_slug, unit.title, unit.display_order
  ) as result;

  select pg_catalog.coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'skill_code', result.skill_code,
        'answered_count', result.answered_count,
        'correct_count', result.correct_count,
        'accuracy_percent',
          pg_catalog.round(
            100.0 * result.correct_count / result.answered_count,
            1
          )
      )
      order by result.skill_code
    ),
    '[]'::jsonb
  )
  into v_skill_results
  from (
    select
      question.skill_code,
      count(*) as answered_count,
      count(*) filter (where answer.is_correct) as correct_count
    from public.diagnostic_answers as answer
    join public.questions as question
      on question.code = answer.question_id
    where answer.attempt_id = p_attempt_id
    group by question.skill_code
  ) as result;

  select pg_catalog.coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'question_id', question.code,
        'question_type', question.question_type,
        'prompt', question.prompt,
        'options', question.options,
        'visual_spec', question.visual_spec,
        'domain', blueprint.domain,
        'unit_slug', question.unit_slug,
        'unit_title', unit.title,
        'skill_code', question.skill_code,
        'student_answer', answer.normalized_answer,
        'is_correct', answer.is_correct,
        'correct_answer', solution.correct_answer,
        'solution_steps', solution.solution_steps,
        'explanation', solution.explanation,
        'hint', solution.hint,
        'answered_at', answer.answered_at
      )
      order by pg_catalog.array_position(v_question_order, question.code)
    ),
    '[]'::jsonb
  )
  into v_review_items
  from public.diagnostic_answers as answer
  join public.grade1_diagnostic_blueprint as blueprint
    on blueprint.blueprint_version = v_blueprint_version
    and blueprint.question_id = answer.question_id
  join public.questions as question
    on question.code = answer.question_id
  join public.question_solutions as solution
    on solution.question_id = answer.question_id
  join public.learning_units as unit
    on unit.slug = question.unit_slug
  where answer.attempt_id = p_attempt_id;

  return pg_catalog.jsonb_build_object(
    'attempt_id', p_attempt_id,
    'status', v_status,
    'total_questions', 24,
    'answered_count', v_answered_count,
    'correct_count', v_correct_count,
    'accuracy_percent',
      pg_catalog.round(100.0 * v_correct_count / 24.0, 1),
    'started_at', v_started_at,
    'completed_at', v_completed_at,
    'domains', v_domain_results,
    'units', v_unit_results,
    'skills', v_skill_results,
    'recommendation', pg_catalog.jsonb_build_object(
      'unit_slug', v_recommendation_unit_slug,
      'unit_title', v_recommendation_unit_title,
      'reason_code', v_recommendation_reason_code,
      'explanation', v_recommendation_explanation
    ),
    'answers', v_review_items
  );
end;
$$;

revoke all on function public.get_grade1_diagnostic_review(uuid)
  from public;
revoke all on function public.get_grade1_diagnostic_review(uuid)
  from anon;
grant execute on function public.get_grade1_diagnostic_review(uuid)
  to authenticated;

create or replace function public.get_parent_child_grade1_diagnostic(
  p_connection_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_parent_count bigint := 0;
  v_student_user_id uuid;
  v_attempt_id uuid;
  v_correct_count smallint;
  v_completed_at timestamptz;
  v_blueprint_version smallint;
  v_recommendation_unit_title text;
  v_recommendation_reason_code text;
  v_recommendation_explanation text;
  v_domain_results jsonb;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select count(*)
  into v_parent_count
  from public.profiles as profile
  where profile.user_id = v_current_user_id
    and profile.role = 'PARENT'
    and profile.onboarding_completed;

  if v_parent_count <> 1 then
    raise exception 'Access denied';
  end if;

  select connection.student_user_id
  into v_student_user_id
  from public.parent_student_connections as connection
  where connection.id = p_connection_id
    and connection.parent_user_id = v_current_user_id
    and connection.status = 'APPROVED';

  if v_student_user_id is null then
    raise exception 'Learning summary unavailable';
  end if;

  select
    attempt.id,
    attempt.correct_count,
    attempt.completed_at,
    attempt.blueprint_version,
    unit.title,
    attempt.recommendation_reason_code,
    attempt.recommendation_explanation
  into
    v_attempt_id,
    v_correct_count,
    v_completed_at,
    v_blueprint_version,
    v_recommendation_unit_title,
    v_recommendation_reason_code,
    v_recommendation_explanation
  from public.diagnostic_attempts as attempt
  left join public.learning_units as unit
    on unit.slug = attempt.recommendation_unit_slug
  where attempt.student_id = v_student_user_id
    and attempt.status = 'COMPLETED'
  order by attempt.completed_at desc, attempt.id desc
  limit 1;

  if v_attempt_id is null then
    return pg_catalog.jsonb_build_object('has_result', false);
  end if;

  with domain_order(domain, position) as (
    values
      ('NUMBER_SENSE', 1),
      ('ARITHMETIC', 2),
      ('GEOMETRY', 3),
      ('MEASUREMENT_TIME', 4)
  ),
  domain_statistics as (
    select
      blueprint.domain,
      count(*) as answered_count,
      count(*) filter (where answer.is_correct) as correct_count
    from public.diagnostic_answers as answer
    join public.grade1_diagnostic_blueprint as blueprint
      on blueprint.blueprint_version = v_blueprint_version
      and blueprint.question_id = answer.question_id
    where answer.attempt_id = v_attempt_id
    group by blueprint.domain
  )
  select pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'domain', domain_order.domain,
      'answered_count', statistics.answered_count,
      'correct_count', statistics.correct_count,
      'accuracy_percent',
        pg_catalog.round(
          100.0 * statistics.correct_count / statistics.answered_count,
          1
        ),
      'level', case
        when 100.0 * statistics.correct_count / statistics.answered_count
          < 70
        then 'REVIEW'
        else 'DOING_WELL'
      end
    )
    order by domain_order.position
  )
  into v_domain_results
  from domain_order
  join domain_statistics as statistics
    on statistics.domain = domain_order.domain;

  return pg_catalog.jsonb_build_object(
    'has_result', true,
    'total_questions', 24,
    'correct_count', v_correct_count,
    'accuracy_percent',
      pg_catalog.round(100.0 * v_correct_count / 24.0, 1),
    'completed_at', v_completed_at,
    'domains', v_domain_results,
    'recommendation', pg_catalog.jsonb_build_object(
      'unit_title', v_recommendation_unit_title,
      'reason_code', v_recommendation_reason_code,
      'explanation', v_recommendation_explanation
    )
  );
end;
$$;

revoke all on function public.get_parent_child_grade1_diagnostic(uuid)
  from public;
revoke all on function public.get_parent_child_grade1_diagnostic(uuid)
  from anon;
grant execute on function public.get_parent_child_grade1_diagnostic(uuid)
  to authenticated;

do $validation$
declare
  v_blueprint_count bigint := 0;
  v_domain_count bigint := 0;
  v_invalid_domain_count bigint := 0;
  v_duplicate_question_count bigint := 0;
  v_mcq_count bigint := 0;
  v_number_count bigint := 0;
  v_invalid_question_count bigint := 0;
  v_grade1_unit_count bigint := 0;
  v_secure_function_count bigint := 0;
begin
  select count(*)
  into v_blueprint_count
  from public.grade1_diagnostic_blueprint
  where blueprint_version = 1;

  select count(*)
  into v_domain_count
  from (
    select domain
    from public.grade1_diagnostic_blueprint
    where blueprint_version = 1
    group by domain
    having count(*) = 6
  ) as valid_domain;

  select count(*)
  into v_invalid_domain_count
  from (
    values
      ('NUMBER_SENSE'),
      ('ARITHMETIC'),
      ('GEOMETRY'),
      ('MEASUREMENT_TIME')
  ) as required_domain(domain)
  where not exists (
    select 1
    from public.grade1_diagnostic_blueprint as blueprint
    where blueprint.blueprint_version = 1
      and blueprint.domain = required_domain.domain
    group by blueprint.domain
    having count(*) = 6
  );

  select count(*) - count(distinct question_id)
  into v_duplicate_question_count
  from public.grade1_diagnostic_blueprint
  where blueprint_version = 1;

  select
    count(*) filter (where question.question_type = 'MULTIPLE_CHOICE'),
    count(*) filter (where question.question_type = 'NUMBER_INPUT'),
    count(*) filter (
      where not question.published
        or not unit.published
        or unit.grade <> 1
        or solution.question_id is null
    )
  into
    v_mcq_count,
    v_number_count,
    v_invalid_question_count
  from public.grade1_diagnostic_blueprint as blueprint
  join public.questions as question
    on question.code = blueprint.question_id
  join public.learning_units as unit
    on unit.slug = question.unit_slug
  left join public.question_solutions as solution
    on solution.question_id = question.code
  where blueprint.blueprint_version = 1;

  select count(*)
  into v_grade1_unit_count
  from public.learning_units
  where grade = 1
    and published;

  select count(*)
  into v_secure_function_count
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname in (
      'start_or_resume_grade1_diagnostic',
      'get_grade1_diagnostic_state',
      'submit_grade1_diagnostic_answer',
      'get_grade1_diagnostic_review',
      'get_parent_child_grade1_diagnostic'
    )
    and procedure.prosecdef
    and procedure.proconfig @> array['search_path=""']::text[];

  if
    v_blueprint_count <> 24
    or v_domain_count <> 4
    or v_invalid_domain_count <> 0
    or v_duplicate_question_count <> 0
    or v_mcq_count <> 16
    or v_number_count <> 8
    or v_invalid_question_count <> 0
    or v_grade1_unit_count <> 13
    or v_secure_function_count <> 5
  then
    raise exception 'Grade 1 diagnostic content validation failed';
  end if;

  if
    not pg_catalog.has_table_privilege(
      'authenticated',
      'public.diagnostic_attempts',
      'SELECT'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.diagnostic_attempts',
      'INSERT'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.diagnostic_attempts',
      'UPDATE'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.diagnostic_attempts',
      'DELETE'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.diagnostic_answers',
      'SELECT'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.diagnostic_answers',
      'INSERT'
    )
    or pg_catalog.has_table_privilege(
      'anon',
      'public.diagnostic_attempts',
      'SELECT'
    )
    or pg_catalog.has_table_privilege(
      'anon',
      'public.diagnostic_answers',
      'SELECT'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.question_solutions',
      'SELECT'
    )
  then
    raise exception 'Grade 1 diagnostic privilege validation failed';
  end if;

  if not pg_catalog.has_function_privilege(
    'authenticated',
    'public.start_or_resume_grade1_diagnostic()',
    'EXECUTE'
  )
  or not pg_catalog.has_function_privilege(
    'authenticated',
    'public.get_grade1_diagnostic_state(uuid)',
    'EXECUTE'
  )
  or not pg_catalog.has_function_privilege(
    'authenticated',
    'public.submit_grade1_diagnostic_answer(uuid,text,text)',
    'EXECUTE'
  )
  or not pg_catalog.has_function_privilege(
    'authenticated',
    'public.get_grade1_diagnostic_review(uuid)',
    'EXECUTE'
  )
  or not pg_catalog.has_function_privilege(
    'authenticated',
    'public.get_parent_child_grade1_diagnostic(uuid)',
    'EXECUTE'
  )
  or pg_catalog.has_function_privilege(
    'anon',
    'public.start_or_resume_grade1_diagnostic()',
    'EXECUTE'
  )
  then
    raise exception 'Grade 1 diagnostic RPC validation failed';
  end if;
end;
$validation$;

comment on table public.grade1_diagnostic_blueprint is
  'Fixed Grade 1 diagnostic blueprint referencing published questions without copying solutions.';
comment on table public.diagnostic_attempts is
  'Student-owned Grade 1 diagnostic attempts, separate from ordinary practice progress.';
comment on table public.diagnostic_answers is
  'Immutable-by-API diagnostic answers graded only inside security-definer RPCs.';

commit;
