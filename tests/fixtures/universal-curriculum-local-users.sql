-- Synthetic local-only identities. This file intentionally uses .invalid
-- addresses and deterministic non-production UUIDs.

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
select
  format(
    '41000000-0000-4000-8000-%s',
    lpad(grade::text, 12, '0')
  )::uuid,
  'authenticated',
  'authenticated',
  format('student-grade-%s@plave.local.invalid', grade),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('role', 'STUDENT', 'grade', grade::text),
  now(),
  now()
from generate_series(1, 9) as grade;

update public.profiles as profile
set
  full_name = format('Học sinh thử Lớp %s', student.grade),
  onboarding_completed = true,
  registration_grade = student.grade
from (
  select
    format(
      '41000000-0000-4000-8000-%s',
      lpad(grade::text, 12, '0')
    )::uuid as user_id,
    grade
  from generate_series(1, 9) as grade
) as student
where profile.user_id = student.user_id;

insert into public.student_profiles (user_id, grade, student_code)
select
  format(
    '41000000-0000-4000-8000-%s',
    lpad(grade::text, 12, '0')
  )::uuid,
  grade,
  format('PLV-D%s', lpad(grade::text, 11, '0'))
from generate_series(1, 9) as grade;

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '42000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'parent@plave.local.invalid',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"role":"PARENT"}'::jsonb,
  now(),
  now()
), (
  '43000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'teacher@plave.local.invalid',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"role":"PARENT"}'::jsonb,
  now(),
  now()
);

update public.profiles
set full_name = 'Phụ huynh thử', onboarding_completed = true
where user_id = '42000000-0000-4000-8000-000000000001';

update public.profiles
set
  role = 'TEACHER',
  full_name = 'Giáo viên thử',
  onboarding_completed = true
where user_id = '43000000-0000-4000-8000-000000000001';
