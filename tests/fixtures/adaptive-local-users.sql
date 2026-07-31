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
values
  (
    '10000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"STUDENT","grade":"2"}'::jsonb,
    now(),
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"STUDENT","grade":"2"}'::jsonb,
    now(),
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"PARENT"}'::jsonb,
    now(),
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"PARENT"}'::jsonb,
    now(),
    now()
  );

update public.profiles
set
  full_name = case user_id
    when '10000000-0000-4000-8000-000000000001'
      then 'Fixture Student A'
    when '10000000-0000-4000-8000-000000000002'
      then 'Fixture Student B'
    when '10000000-0000-4000-8000-000000000003'
      then 'Fixture Parent'
    else 'Fixture Teacher'
  end,
  onboarding_completed = true,
  registration_grade = case
    when user_id in (
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002'
    ) then 2
    else null
  end
where user_id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004'
);

update public.profiles
set role = 'TEACHER'
where user_id = '10000000-0000-4000-8000-000000000004';

insert into public.student_profiles (
  user_id,
  grade,
  student_code
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    2,
    'PLV-A00000000001'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    2,
    'PLV-B00000000002'
  );

commit;
