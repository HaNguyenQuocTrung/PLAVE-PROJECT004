-- Run only against the verified local disposable restore target.
-- This query returns aggregate counts only and never selects identifiers,
-- personal data, answers, prompts, correct answers or solution payloads.

begin transaction read only;

select *
from (
  select
    'auth_users'::text as metric,
    count(*)::bigint as exact_count,
    5::bigint as expected_count
  from auth.users

  union all

  select 'profiles', count(*)::bigint, 5::bigint
  from public.profiles

  union all

  select 'student_profiles', count(*)::bigint, 3::bigint
  from public.student_profiles

  union all

  select 'teacher_profiles', count(*)::bigint, 1::bigint
  from public.teacher_profiles

  union all

  select 'parent_student_connections', count(*)::bigint, 3::bigint
  from public.parent_student_connections

  union all

  select 'practice_attempts', count(*)::bigint, 18::bigint
  from public.practice_attempts

  union all

  select 'practice_answers', count(*)::bigint, 340::bigint
  from public.practice_answers

  union all

  select 'diagnostic_attempts', count(*)::bigint, 1::bigint
  from public.diagnostic_attempts

  union all

  select 'diagnostic_answers', count(*)::bigint, 24::bigint
  from public.diagnostic_answers

  union all

  select 'grade1_units', count(*)::bigint, 13::bigint
  from public.learning_units
  where grade = 1

  union all

  select 'questions', count(*)::bigint, 312::bigint
  from public.questions

  union all

  select 'question_solutions', count(*)::bigint, 312::bigint
  from public.question_solutions
) as aggregate_counts
order by metric;

rollback;
