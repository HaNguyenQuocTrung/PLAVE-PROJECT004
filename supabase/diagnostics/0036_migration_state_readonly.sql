-- READ-ONLY MANUAL DIAGNOSTIC. Do not run as an application mutation.
-- SQL Editor application in this project may not populate
-- supabase_migrations.schema_migrations, so object/content checks are also
-- included. No user rows or PII are selected.

select
  to_regclass('public.adaptive_practice_releases')
    as adaptive_release_table,
  to_regclass('public.adaptive_practice_attempts')
    as adaptive_attempt_table,
  to_regclass('public.adaptive_practice_answers')
    as adaptive_answer_table,
  to_regprocedure(
    'public.start_or_resume_adaptive_practice(text,uuid)'
  ) as adaptive_start_rpc,
  to_regprocedure(
    'public.submit_adaptive_practice_answer(uuid,text,text,integer,uuid)'
  ) as adaptive_submit_rpc;

select
  count(*) filter (
    where unit.slug = 'grade-2-numbers-to-1000'
  ) as grade2_candidate_unit_rows,
  count(*) filter (
    where unit.slug = 'grade-2-numbers-to-1000'
      and unit.published
  ) as grade2_candidate_published_rows
from public.learning_units as unit;

select
  count(*) filter (
    where question.unit_slug = 'grade-2-numbers-to-1000'
  ) as grade2_candidate_question_rows,
  count(*) filter (
    where question.unit_slug = 'grade-2-numbers-to-1000'
      and question.published
  ) as grade2_candidate_published_question_rows
from public.questions as question;

select
  to_regprocedure('public.start_or_resume_practice(text)')
    as fixed_start_rpc,
  to_regprocedure(
    'public.submit_practice_answer(uuid,text,text)'
  ) as fixed_submit_rpc;
