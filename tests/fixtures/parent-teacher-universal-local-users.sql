-- Synthetic, local-only identities. All addresses use the reserved .invalid
-- suffix and all UUIDs are deterministic test values.

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
select
  format(
    '51000000-0000-4000-8000-%s',
    lpad(grade::text, 12, '0')
  )::uuid,
  'authenticated',
  'authenticated',
  format('collaboration-student-grade-%s@plave.local.invalid', grade),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('role', 'STUDENT', 'grade', grade::text),
  now(),
  now()
from generate_series(1, 9) as grade;

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  email_confirmed_at, created_at, updated_at
) values
(
  '52000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'collaboration-parent-1@plave.local.invalid',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"role":"PARENT"}'::jsonb,
  now(),
  now(),
  now()
),
(
  '52000000-0000-4000-8000-000000000002',
  'authenticated',
  'authenticated',
  'collaboration-parent-2@plave.local.invalid',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"role":"PARENT"}'::jsonb,
  now(),
  now(),
  now()
),
(
  '53000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'collaboration-teacher-1@plave.local.invalid',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"role":"TEACHER"}'::jsonb,
  now(),
  now(),
  now()
),
(
  '53000000-0000-4000-8000-000000000002',
  'authenticated',
  'authenticated',
  'collaboration-teacher-2@plave.local.invalid',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"role":"TEACHER"}'::jsonb,
  now(),
  now(),
  now()
);

update public.profiles as profile
set
  full_name = format('Học sinh synthetic Lớp %s', student.grade),
  onboarding_completed = true,
  registration_grade = student.grade
from (
  select
    format(
      '51000000-0000-4000-8000-%s',
      lpad(grade::text, 12, '0')
  )::uuid as user_id,
    grade
  from generate_series(1, 9) as grade
) as student
where profile.user_id = student.user_id;

insert into public.student_profiles (user_id, grade, student_code)
values
  ('51000000-0000-4000-8000-000000000001', 1, 'PLV-510000000001'),
  ('51000000-0000-4000-8000-000000000002', 2, 'PLV-510000000002'),
  ('51000000-0000-4000-8000-000000000003', 3, 'PLV-510000000003'),
  ('51000000-0000-4000-8000-000000000004', 4, 'PLV-510000000004'),
  ('51000000-0000-4000-8000-000000000005', 5, 'PLV-510000000005'),
  ('51000000-0000-4000-8000-000000000006', 6, 'PLV-510000000006'),
  ('51000000-0000-4000-8000-000000000007', 7, 'PLV-510000000007'),
  ('51000000-0000-4000-8000-000000000008', 8, 'PLV-510000000008'),
  ('51000000-0000-4000-8000-000000000009', 9, 'PLV-510000000009');

update public.profiles
set full_name = 'Phụ huynh synthetic 1', onboarding_completed = true
where user_id = '52000000-0000-4000-8000-000000000001';
update public.profiles
set full_name = 'Phụ huynh synthetic 2', onboarding_completed = true
where user_id = '52000000-0000-4000-8000-000000000002';

insert into public.teacher_invitations (
  id, code_hash, status, expires_at, created_at
) values
(
  '53100000-0000-4000-8000-000000000001',
  extensions.digest(
    'PLV-TCH-51000000000000000000000000000001',
    'sha256'
  ),
  'AVAILABLE',
  now() + interval '1 day',
  now() - interval '1 minute'
),
(
  '53100000-0000-4000-8000-000000000002',
  extensions.digest(
    'PLV-TCH-51000000000000000000000000000002',
    'sha256'
  ),
  'AVAILABLE',
  now() + interval '1 day',
  now() - interval '1 minute'
);

do $activate_synthetic_teachers$
declare
  v_result jsonb;
begin
  perform set_config(
    'request.jwt.claim.sub',
    '53000000-0000-4000-8000-000000000001',
    true
  );
  v_result := public.activate_teacher_invitation(
    'PLV-TCH-51000000000000000000000000000001',
    'Giáo viên synthetic 1'
  );
  if not coalesce((v_result ->> 'activated')::boolean, false) then
    raise exception 'FIXTURE:TEACHER_1_ACTIVATION_FAILED';
  end if;
  perform set_config('request.jwt.claim.sub', '', true);

  perform set_config(
    'request.jwt.claim.sub',
    '53000000-0000-4000-8000-000000000002',
    true
  );
  v_result := public.activate_teacher_invitation(
    'PLV-TCH-51000000000000000000000000000002',
    'Giáo viên synthetic 2'
  );
  if not coalesce((v_result ->> 'activated')::boolean, false) then
    raise exception 'FIXTURE:TEACHER_2_ACTIVATION_FAILED';
  end if;
  perform set_config('request.jwt.claim.sub', '', true);
exception when others then
  perform set_config('request.jwt.claim.sub', '', true);
  raise;
end;
$activate_synthetic_teachers$;

insert into public.parent_student_connections (
  id, parent_user_id, student_user_id, status
)
select
  format(
    '52100000-0000-4000-8000-%s',
    lpad(grade::text, 12, '0')
  )::uuid,
  case when grade % 2 = 1
    then '52000000-0000-4000-8000-000000000001'::uuid
    else '52000000-0000-4000-8000-000000000002'::uuid
  end,
  format(
    '51000000-0000-4000-8000-%s',
    lpad(grade::text, 12, '0')
  )::uuid,
  'PENDING'
from generate_series(1, 9) as grade;

insert into public.parent_student_connections (
  id, parent_user_id, student_user_id, status
) values
  (
    '52100000-0000-4000-8000-000000000010',
    '52000000-0000-4000-8000-000000000002',
    '51000000-0000-4000-8000-000000000009',
    'PENDING'
  ),
  (
    '52100000-0000-4000-8000-000000000011',
    '52000000-0000-4000-8000-000000000001',
    '51000000-0000-4000-8000-000000000002',
    'PENDING'
  ),
  (
    '52100000-0000-4000-8000-000000000012',
    '52000000-0000-4000-8000-000000000002',
    '51000000-0000-4000-8000-000000000001',
    'PENDING'
  );

do $transition_synthetic_parent_connections$
declare
  v_grade smallint;
  v_result jsonb;
begin
  for v_grade in 1..9 loop
    perform set_config(
      'request.jwt.claim.sub',
      format(
        '51000000-0000-4000-8000-%s',
        lpad(v_grade::text, 12, '0')
      ),
      true
    );
    v_result := public.respond_parent_connection_request(
      format(
        '52100000-0000-4000-8000-%s',
        lpad(v_grade::text, 12, '0')
      )::uuid,
      'APPROVED'
    );
    if v_result ->> 'status' <> 'APPROVED' then
      raise exception 'FIXTURE:PARENT_CONNECTION_APPROVAL_FAILED';
    end if;
    perform set_config('request.jwt.claim.sub', '', true);
  end loop;

  perform set_config(
    'request.jwt.claim.sub',
    '51000000-0000-4000-8000-000000000002',
    true
  );
  v_result := public.respond_parent_connection_request(
    '52100000-0000-4000-8000-000000000011',
    'REJECTED'
  );
  if v_result ->> 'status' <> 'REJECTED' then
    raise exception 'FIXTURE:PARENT_CONNECTION_REJECTION_FAILED';
  end if;
  perform set_config('request.jwt.claim.sub', '', true);

  perform set_config(
    'request.jwt.claim.sub',
    '51000000-0000-4000-8000-000000000001',
    true
  );
  v_result := public.respond_parent_connection_request(
    '52100000-0000-4000-8000-000000000012',
    'APPROVED'
  );
  if v_result ->> 'status' <> 'APPROVED' then
    raise exception 'FIXTURE:PARENT_CONNECTION_PRE_REVOKE_FAILED';
  end if;
  perform set_config('request.jwt.claim.sub', '', true);

  perform set_config(
    'request.jwt.claim.sub',
    '52000000-0000-4000-8000-000000000002',
    true
  );
  v_result := public.revoke_parent_student_connection(
    '52100000-0000-4000-8000-000000000012'
  );
  if v_result ->> 'status' <> 'REVOKED' then
    raise exception 'FIXTURE:PARENT_CONNECTION_REVOKE_FAILED';
  end if;
  perform set_config('request.jwt.claim.sub', '', true);
exception when others then
  perform set_config('request.jwt.claim.sub', '', true);
  raise;
end;
$transition_synthetic_parent_connections$;

insert into public.classrooms (
  id, teacher_id, creation_request_id, name, grade, class_code
)
select
  format(
    '54000000-0000-4000-8000-%s',
    lpad(grade::text, 12, '0')
  )::uuid,
  case when grade <= 5
    then '53000000-0000-4000-8000-000000000001'::uuid
    else '53000000-0000-4000-8000-000000000002'::uuid
  end,
  format(
    '54100000-0000-4000-8000-%s',
    lpad(grade::text, 12, '0')
  )::uuid,
  format('Lớp synthetic %s', grade),
  grade,
  class_code
from unnest(
  array[1, 2, 3, 4, 5, 6, 7, 8, 9],
  array[
    'PLV-CLS-AAAAAAAAA2',
    'PLV-CLS-AAAAAAAAA3',
    'PLV-CLS-AAAAAAAAA4',
    'PLV-CLS-AAAAAAAAA5',
    'PLV-CLS-AAAAAAAAA6',
    'PLV-CLS-AAAAAAAAA7',
    'PLV-CLS-AAAAAAAAA8',
    'PLV-CLS-AAAAAAAABA',
    'PLV-CLS-AAAAAAAABB'
  ]
) as classroom_data(grade, class_code);

insert into public.classroom_memberships (
  id, classroom_id, student_id, status
)
select
  format(
    '54200000-0000-4000-8000-%s',
    lpad(grade::text, 12, '0')
  )::uuid,
  format(
    '54000000-0000-4000-8000-%s',
    lpad(grade::text, 12, '0')
  )::uuid,
  format(
    '51000000-0000-4000-8000-%s',
    lpad(grade::text, 12, '0')
  )::uuid,
  'PENDING'
from generate_series(1, 9) as grade;

do $transition_synthetic_classroom_memberships$
declare
  v_grade smallint;
  v_result jsonb;
begin
  for v_grade in 1..9 loop
    perform set_config(
      'request.jwt.claim.sub',
      case when v_grade <= 5
        then '53000000-0000-4000-8000-000000000001'
        else '53000000-0000-4000-8000-000000000002'
      end,
      true
    );
    v_result := public.respond_classroom_membership(
      format(
        '54200000-0000-4000-8000-%s',
        lpad(v_grade::text, 12, '0')
      )::uuid,
      'APPROVED'
    );
    if v_result ->> 'status' <> 'APPROVED' then
      raise exception 'FIXTURE:CLASSROOM_MEMBERSHIP_APPROVAL_FAILED';
    end if;
    perform set_config('request.jwt.claim.sub', '', true);
  end loop;
exception when others then
  perform set_config('request.jwt.claim.sub', '', true);
  raise;
end;
$transition_synthetic_classroom_memberships$;
