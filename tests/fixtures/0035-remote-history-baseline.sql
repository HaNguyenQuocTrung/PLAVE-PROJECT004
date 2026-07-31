begin;

insert into auth.users (
  id,
  aud,
  role,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '30000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"role":"STUDENT","grade":"1"}'::jsonb,
  now(),
  now()
);

update public.profiles
set
  full_name = 'Local verification fixture',
  onboarding_completed = true,
  registration_grade = 1
where user_id = '30000000-0000-4000-8000-000000000001';

insert into public.student_profiles (
  user_id,
  grade,
  student_code
)
values (
  '30000000-0000-4000-8000-000000000001',
  1,
  'PLV-C00000000001'
);

with first_unit_questions as (
  select
    array_agg(question.code order by question.display_order) as question_order
  from public.questions as question
  where question.unit_slug = 'grade-1-numbers-to-10'
)
insert into public.practice_attempts (
  id,
  student_id,
  unit_slug,
  status,
  question_order,
  total_questions,
  answered_count,
  correct_count,
  completed_at
)
select
  format(
    '31000000-0000-4000-8000-%s',
    lpad(attempt_number::text, 12, '0')
  )::uuid,
  '30000000-0000-4000-8000-000000000001'::uuid,
  'grade-1-numbers-to-10',
  case when attempt_number <= 14 then 'COMPLETED' else 'IN_PROGRESS' end,
  question_order,
  24,
  case when attempt_number <= 14 then 24 else 4 end,
  case when attempt_number <= 14 then 20 else 3 end,
  case when attempt_number <= 14 then now() else null end
from pg_catalog.generate_series(1, 15) as attempt_number
cross join first_unit_questions;

insert into public.practice_attempts (
  id,
  student_id,
  unit_slug,
  status,
  question_order,
  total_questions,
  answered_count,
  correct_count
)
select
  format(
    '31000000-0000-4000-8000-%s',
    lpad((unit.display_order + 14)::text, 12, '0')
  )::uuid,
  '30000000-0000-4000-8000-000000000001'::uuid,
  unit.slug,
  'IN_PROGRESS',
  array_agg(question.code order by question.display_order),
  24,
  0,
  0
from public.learning_units as unit
join public.questions as question
  on question.unit_slug = unit.slug
where unit.grade = 1 and unit.display_order between 2 and 4
group by unit.slug, unit.display_order;

insert into public.practice_answers (
  attempt_id,
  question_id,
  normalized_answer,
  is_correct
)
select
  attempt.id,
  question_id,
  '0',
  false
from public.practice_attempts as attempt
cross join lateral pg_catalog.unnest(attempt.question_order) as question_id
where attempt.status = 'COMPLETED';

insert into public.practice_answers (
  attempt_id,
  question_id,
  normalized_answer,
  is_correct
)
select
  attempt.id,
  question_id,
  '0',
  false
from public.practice_attempts as attempt
cross join lateral pg_catalog.unnest(
  attempt.question_order[1:4]
) as question_id
where attempt.id = '31000000-0000-4000-8000-000000000015';

with diagnostic_order as (
  select array_agg(
    blueprint.question_id order by blueprint.position
  ) as question_order
  from public.grade1_diagnostic_blueprint as blueprint
  where blueprint.blueprint_version = 1
)
insert into public.diagnostic_attempts (
  id,
  student_id,
  blueprint_version,
  status,
  question_order,
  total_questions,
  answered_count,
  correct_count,
  recommendation_reason_code,
  recommendation_explanation,
  completed_at
)
select
  '32000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  1,
  'COMPLETED',
  question_order,
  24,
  24,
  18,
  'GRADE1_CURRENT_SCOPE_MASTERED',
  'Local-only aggregate verification fixture.',
  now()
from diagnostic_order;

insert into public.diagnostic_answers (
  attempt_id,
  question_id,
  normalized_answer,
  is_correct
)
select
  '32000000-0000-4000-8000-000000000001',
  question_id,
  '0',
  false
from public.diagnostic_attempts as attempt
cross join lateral pg_catalog.unnest(attempt.question_order) as question_id
where attempt.id = '32000000-0000-4000-8000-000000000001';

commit;
