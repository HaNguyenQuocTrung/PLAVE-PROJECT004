-- Read-only partial-state check for a failed 0004 execution.
-- Dynamic statements passed to query_to_xml are fixed SELECT count(*) queries.
with object_state as (
  select
    pg_catalog.to_regclass('public.learning_units')
      is not null as learning_units_exists,
    pg_catalog.to_regclass('public.questions')
      is not null as questions_exists,
    pg_catalog.to_regclass('public.question_solutions')
      is not null as question_solutions_exists,
    pg_catalog.to_regclass('public.practice_attempts')
      is not null as practice_attempts_exists,
    pg_catalog.to_regclass('public.practice_answers')
      is not null as practice_answers_exists,
    pg_catalog.to_regprocedure(
      'public.start_or_resume_practice(text)'
    ) is not null as start_or_resume_practice_exists,
    pg_catalog.to_regprocedure(
      'public.submit_practice_answer(uuid,text,text)'
    ) is not null as submit_practice_answer_exists,
    pg_catalog.to_regprocedure(
      'public.get_practice_review(uuid)'
    ) is not null as get_practice_review_exists
),
seed_counts as (
  select
    case
      when state.learning_units_exists then (
        (
          pg_catalog.xpath(
            '/table/row/seed_count/text()',
            pg_catalog.query_to_xml(
              'select count(*) as seed_count
                 from public.learning_units
                where slug = ''grade-1-numbers-to-10''',
              false,
              false,
              ''
            )
          )
        )[1]::text
      )::bigint
      else null
    end as learning_unit_seed_count,
    case
      when state.questions_exists then (
        (
          pg_catalog.xpath(
            '/table/row/seed_count/text()',
            pg_catalog.query_to_xml(
              'select count(*) as seed_count
                 from public.questions
                where unit_slug = ''grade-1-numbers-to-10''',
              false,
              false,
              ''
            )
          )
        )[1]::text
      )::bigint
      else null
    end as question_seed_count,
    case
      when
        state.question_solutions_exists
        and state.questions_exists
      then (
        (
          pg_catalog.xpath(
            '/table/row/seed_count/text()',
            pg_catalog.query_to_xml(
              'select count(*) as seed_count
                 from public.question_solutions as s
                 join public.questions as q on q.code = s.question_id
                where q.unit_slug = ''grade-1-numbers-to-10''',
              false,
              false,
              ''
            )
          )
        )[1]::text
      )::bigint
      else null
    end as solution_seed_count
  from object_state as state
)
select
  pg_catalog.jsonb_build_object(
    'learning_units', state.learning_units_exists,
    'questions', state.questions_exists,
    'question_solutions', state.question_solutions_exists,
    'practice_attempts', state.practice_attempts_exists,
    'practice_answers', state.practice_answers_exists
  ) as tables_exist,
  pg_catalog.jsonb_build_object(
    'start_or_resume_practice',
      state.start_or_resume_practice_exists,
    'submit_practice_answer',
      state.submit_practice_answer_exists,
    'get_practice_review',
      state.get_practice_review_exists
  ) as rpcs_exist,
  pg_catalog.jsonb_build_object(
    'learning_units', counts.learning_unit_seed_count,
    'questions', counts.question_seed_count,
    'question_solutions', counts.solution_seed_count
  ) as seed_counts
from object_state as state
cross join seed_counts as counts;
