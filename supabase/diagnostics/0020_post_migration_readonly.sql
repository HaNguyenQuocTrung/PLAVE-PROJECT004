-- Read-only verification for the Grade 1 numbers-to-20 unit.
-- This statement does not call application RPCs or return learner data.
with expected_skills(skill_code) as (
  values
    ('COUNT_READ_WRITE_TO_20'::text),
    ('SEQUENCE_TO_20'::text),
    ('COMPARE_ORDER_TO_20'::text),
    ('TENS_ONES_TO_20'::text)
),
unit_metrics as (
  select
    count(*) filter (
      where unit.slug = 'grade-1-numbers-to-10'
    ) as foundation_unit_count,
    count(*) filter (
      where unit.slug = 'grade-1-addition-within-10'
    ) as addition_unit_count,
    count(*) filter (
      where unit.slug = 'grade-1-subtraction-within-10'
    ) as subtraction_unit_count,
    count(*) filter (
      where unit.slug = 'grade-1-numbers-to-20'
    ) as numbers_to_20_unit_count,
    count(*) filter (
      where
        unit.slug = 'grade-1-numbers-to-20'
        and unit.grade = 1
        and unit.published
        and unit.display_order = 4
        and unit.total_questions = 24
        and unit.prerequisite_unit_slug =
          'grade-1-subtraction-within-10'
        and jsonb_typeof(unit.lesson_content -> 'sections') = 'array'
        and jsonb_array_length(
          unit.lesson_content -> 'sections'
        ) = 6
        and jsonb_typeof(
          unit.lesson_content -> 'worked_examples'
        ) = 'array'
        and jsonb_array_length(
          unit.lesson_content -> 'worked_examples'
        ) >= 2
    ) as valid_numbers_to_20_unit_count
  from public.learning_units as unit
  where unit.slug in (
    'grade-1-numbers-to-10',
    'grade-1-addition-within-10',
    'grade-1-subtraction-within-10',
    'grade-1-numbers-to-20'
  )
),
question_metrics as (
  select
    count(*) as question_count,
    count(*) filter (
      where question.question_type = 'MULTIPLE_CHOICE'
    ) as multiple_choice_count,
    count(*) filter (
      where question.question_type = 'NUMBER_INPUT'
    ) as number_input_count,
    count(*) filter (
      where question.published
    ) as published_count,
    count(*) - count(distinct question.code) as duplicate_code_count,
    count(*) - count(distinct question.prompt)
      as duplicate_prompt_count
  from public.questions as question
  where question.unit_slug = 'grade-1-numbers-to-20'
),
solution_metrics as (
  select
    count(solution.question_id) as solution_count,
    count(*) filter (
      where solution.question_id is null
    ) as missing_solution_count,
    count(*) filter (
      where
        solution.question_id is not null
        and (
          jsonb_typeof(solution.solution_steps) <> 'array'
          or jsonb_array_length(solution.solution_steps) < 2
          or btrim(solution.explanation) = ''
          or btrim(solution.hint) = ''
          or (
            question.question_type = 'MULTIPLE_CHOICE'
            and (
              solution.correct_answer !~ '^[A-D]$'
              or not (question.options ? solution.correct_answer)
            )
          )
          or (
            question.question_type = 'NUMBER_INPUT'
            and solution.correct_answer
              !~ '^(0|[1-9]|1[0-9]|20)$'
          )
        )
    ) as invalid_solution_count
  from public.questions as question
  left join public.question_solutions as solution
    on solution.question_id = question.code
  where question.unit_slug = 'grade-1-numbers-to-20'
),
option_metrics as (
  select
    count(*) filter (
      where
        question.question_type = 'MULTIPLE_CHOICE'
        and (
          question.options is null
          or jsonb_typeof(question.options) <> 'object'
          or not (
            question.options ?& array['A', 'B', 'C', 'D']
          )
          or (
            question.options
            - array['A', 'B', 'C', 'D']::text[]
          ) <> '{}'::jsonb
          or jsonb_typeof(question.options -> 'A') <> 'string'
          or jsonb_typeof(question.options -> 'B') <> 'string'
          or jsonb_typeof(question.options -> 'C') <> 'string'
          or jsonb_typeof(question.options -> 'D') <> 'string'
          or btrim(question.options ->> 'A') = ''
          or btrim(question.options ->> 'B') = ''
          or btrim(question.options ->> 'C') = ''
          or btrim(question.options ->> 'D') = ''
        )
    ) as invalid_mcq_options_count,
    count(*) filter (
      where
        question.question_type = 'NUMBER_INPUT'
        and question.options is not null
    ) as invalid_number_options_count
  from public.questions as question
  where question.unit_slug = 'grade-1-numbers-to-20'
),
skill_metrics as (
  select
    expected.skill_code,
    (
      select count(*)
      from public.questions as question
      where
        question.unit_slug = 'grade-1-numbers-to-20'
        and question.skill_code = expected.skill_code
    ) as question_count
  from expected_skills as expected
),
skill_summary as (
  select
    jsonb_object_agg(
      skill.skill_code,
      skill.question_count
      order by skill.skill_code
    ) as skill_counts,
    bool_and(skill.question_count = 6) as skills_valid
  from skill_metrics as skill
),
constraint_state as (
  select
    count(*) = 1 as skill_constraint_valid
  from pg_catalog.pg_constraint as constraint_row
  where
    constraint_row.conrelid = 'public.questions'::regclass
    and constraint_row.conname = 'questions_skill_code_check'
    and constraint_row.contype = 'c'
    and pg_catalog.pg_get_constraintdef(constraint_row.oid)
      like '%COUNT_READ_WRITE_TO_20%'
    and pg_catalog.pg_get_constraintdef(constraint_row.oid)
      like '%SEQUENCE_TO_20%'
    and pg_catalog.pg_get_constraintdef(constraint_row.oid)
      like '%COMPARE_ORDER_TO_20%'
    and pg_catalog.pg_get_constraintdef(constraint_row.oid)
      like '%TENS_ONES_TO_20%'
),
function_state as (
  select
    count(*) = 1
    and bool_and(routine.prosecdef)
    and bool_and(
      pg_catalog.pg_get_functiondef(routine.oid)
        like '%prerequisite_unit_slug%'
    )
    and bool_and(
      pg_catalog.pg_get_functiondef(routine.oid)
        like '%Prerequisite required%'
    ) as prerequisite_guard_valid
  from pg_catalog.pg_proc as routine
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = routine.pronamespace
  where
    namespace.nspname = 'public'
    and routine.proname = 'start_or_resume_practice'
    and pg_catalog.pg_get_function_identity_arguments(routine.oid)
      = 'p_unit_slug text'
),
permission_state as (
  select
    not pg_catalog.has_table_privilege(
      'anon',
      'public.question_solutions',
      'SELECT'
    )
    and not pg_catalog.has_table_privilege(
      'authenticated',
      'public.question_solutions',
      'SELECT'
    )
    and pg_catalog.has_function_privilege(
      'authenticated',
      'public.start_or_resume_practice(text)',
      'EXECUTE'
    )
    and not pg_catalog.has_function_privilege(
      'anon',
      'public.start_or_resume_practice(text)',
      'EXECUTE'
    ) as answer_boundary_valid
)
select
  unit.foundation_unit_count,
  unit.addition_unit_count,
  unit.subtraction_unit_count,
  unit.numbers_to_20_unit_count,
  question.question_count,
  solution.solution_count,
  question.multiple_choice_count,
  question.number_input_count,
  skill.skill_counts,
  (
    unit.foundation_unit_count = 1
    and unit.addition_unit_count = 1
    and unit.subtraction_unit_count = 1
    and unit.numbers_to_20_unit_count = 1
    and unit.valid_numbers_to_20_unit_count = 1
    and question.question_count = 24
    and question.multiple_choice_count = 16
    and question.number_input_count = 8
    and question.published_count = 24
    and question.duplicate_code_count = 0
    and question.duplicate_prompt_count = 0
    and solution.solution_count = 24
    and solution.missing_solution_count = 0
    and solution.invalid_solution_count = 0
    and option.invalid_mcq_options_count = 0
    and option.invalid_number_options_count = 0
    and skill.skills_valid
    and constraint_state.skill_constraint_valid
    and function_state.prerequisite_guard_valid
    and permission.answer_boundary_valid
  ) as all_checks_pass
from unit_metrics as unit
cross join question_metrics as question
cross join solution_metrics as solution
cross join option_metrics as option
cross join skill_summary as skill
cross join constraint_state
cross join function_state
cross join permission_state as permission;
