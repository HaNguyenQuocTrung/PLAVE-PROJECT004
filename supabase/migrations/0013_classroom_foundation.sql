begin;

create table public.classrooms (
  id uuid primary key default extensions.gen_random_uuid(),
  teacher_id uuid not null
    references public.teacher_profiles(user_id) on delete cascade,
  creation_request_id uuid not null,
  name text not null,
  grade smallint not null check (grade between 1 and 9),
  class_code text not null unique,
  status text not null default 'ACTIVE'
    check (status = 'ACTIVE'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classrooms_name_check
    check (
      name = btrim(name)
      and char_length(name) between 2 and 80
    ),
  constraint classrooms_code_check
    check (
      class_code ~
        '^PLV-CLS-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$'
    ),
  constraint classrooms_teacher_request_unique
    unique (teacher_id, creation_request_id)
);

create index classrooms_teacher_status_created_idx
on public.classrooms (teacher_id, status, created_at desc);

create table public.classroom_memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  classroom_id uuid not null
    references public.classrooms(id) on delete cascade,
  student_id uuid not null
    references public.student_profiles(user_id) on delete cascade,
  status text not null default 'PENDING'
    check (
      status in (
        'PENDING',
        'APPROVED',
        'REJECTED',
        'CANCELLED',
        'LEFT',
        'REMOVED'
      )
    ),
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_memberships_lifecycle_check
    check (
      (
        status = 'PENDING'
        and responded_at is null
        and ended_at is null
      )
      or (
        status = 'APPROVED'
        and responded_at is not null
        and responded_at >= requested_at
        and ended_at is null
      )
      or (
        status = 'REJECTED'
        and responded_at is not null
        and responded_at >= requested_at
        and ended_at is null
      )
      or (
        status = 'CANCELLED'
        and responded_at is null
        and ended_at is not null
        and ended_at >= requested_at
      )
      or (
        status in ('LEFT', 'REMOVED')
        and responded_at is not null
        and responded_at >= requested_at
        and ended_at is not null
        and ended_at >= responded_at
      )
    )
);

create unique index classroom_memberships_one_active_pair_idx
on public.classroom_memberships (classroom_id, student_id)
where status in ('PENDING', 'APPROVED');

create index classroom_memberships_classroom_status_requested_idx
on public.classroom_memberships (
  classroom_id,
  status,
  requested_at desc
);

create index classroom_memberships_student_status_requested_idx
on public.classroom_memberships (
  student_id,
  status,
  requested_at desc
);

create trigger classrooms_set_updated_at
before update on public.classrooms
for each row execute function private.set_updated_at();

create trigger classroom_memberships_set_updated_at
before update on public.classroom_memberships
for each row execute function private.set_updated_at();

create function private.require_classroom_actor(
  p_expected_role text default null
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_profile_count bigint := 0;
  v_current_role text;
  v_onboarding_completed boolean := false;
  v_role_profile_present boolean := false;
begin
  if
    p_expected_role is not null
    and p_expected_role not in ('STUDENT', 'TEACHER')
  then
    raise exception 'Classroom access unavailable';
  end if;

  if v_current_user_id is null then
    raise exception 'Classroom access unavailable';
  end if;

  select
    count(*),
    max(profile.role),
    coalesce(bool_or(profile.onboarding_completed), false)
  into
    v_profile_count,
    v_current_role,
    v_onboarding_completed
  from public.profiles as profile
  where profile.user_id = v_current_user_id;

  if
    v_profile_count <> 1
    or v_current_role not in ('STUDENT', 'TEACHER')
    or not v_onboarding_completed
    or (
      p_expected_role is not null
      and v_current_role <> p_expected_role
    )
  then
    raise exception 'Classroom access unavailable';
  end if;

  if v_current_role = 'TEACHER' then
    select exists (
      select 1
      from public.teacher_profiles as teacher
      where
        teacher.user_id = v_current_user_id
        and teacher.activation_status = 'ACTIVE'
    )
    into v_role_profile_present;
  else
    select exists (
      select 1
      from public.student_profiles as student
      where
        student.user_id = v_current_user_id
        and student.grade between 1 and 9
    )
    into v_role_profile_present;
  end if;

  if not v_role_profile_present then
    raise exception 'Classroom access unavailable';
  end if;

  return v_current_user_id;
end;
$$;

create function private.generate_classroom_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text :=
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_random_bytes bytea := extensions.gen_random_bytes(10);
  v_code_body text := '';
  v_index integer;
begin
  for v_index in 0..9 loop
    v_code_body :=
      v_code_body
      || substr(
        v_alphabet,
        (get_byte(v_random_bytes, v_index) % 32) + 1,
        1
      );
  end loop;

  return 'PLV-CLS-' || v_code_body;
end;
$$;

create function private.enforce_classroom_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher_valid boolean := false;
begin
  if tg_op = 'INSERT' then
    select exists (
      select 1
      from public.teacher_profiles as teacher
      join public.profiles as profile
        on profile.user_id = teacher.user_id
      where
        teacher.user_id = new.teacher_id
        and teacher.activation_status = 'ACTIVE'
        and profile.role = 'TEACHER'
        and profile.onboarding_completed
    )
    into v_teacher_valid;

    if not v_teacher_valid or new.status <> 'ACTIVE' then
      raise exception 'Classroom owner unavailable';
    end if;

    return new;
  end if;

  if
    new.id is distinct from old.id
    or new.teacher_id is distinct from old.teacher_id
    or new.creation_request_id is distinct from old.creation_request_id
    or new.class_code is distinct from old.class_code
    or new.grade is distinct from old.grade
    or new.created_at is distinct from old.created_at
    or new.status is distinct from old.status
  then
    raise exception 'Classroom identity cannot change';
  end if;

  return new;
end;
$$;

create function private.enforce_classroom_membership_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_participants_valid boolean := false;
begin
  if tg_op = 'INSERT' then
    select exists (
      select 1
      from public.classrooms as classroom
      join public.student_profiles as student
        on student.user_id = new.student_id
      join public.profiles as profile
        on profile.user_id = student.user_id
      where
        classroom.id = new.classroom_id
        and classroom.status = 'ACTIVE'
        and classroom.grade = student.grade
        and profile.role = 'STUDENT'
        and profile.onboarding_completed
    )
    into v_participants_valid;

    if not v_participants_valid or new.status <> 'PENDING' then
      raise exception 'Classroom membership unavailable';
    end if;

    return new;
  end if;

  if
    new.id is distinct from old.id
    or new.classroom_id is distinct from old.classroom_id
    or new.student_id is distinct from old.student_id
    or new.requested_at is distinct from old.requested_at
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Classroom membership identity cannot change';
  end if;

  if
    old.responded_at is not null
    and new.responded_at is distinct from old.responded_at
  then
    raise exception 'Classroom response time cannot change';
  end if;

  if
    old.ended_at is not null
    and new.ended_at is distinct from old.ended_at
  then
    raise exception 'Classroom end time cannot change';
  end if;

  if old.status = new.status then
    return new;
  end if;

  if
    old.status = 'PENDING'
    and new.status in ('APPROVED', 'REJECTED', 'CANCELLED')
  then
    return new;
  end if;

  if
    old.status = 'APPROVED'
    and new.status in ('LEFT', 'REMOVED')
  then
    return new;
  end if;

  raise exception 'Invalid classroom membership transition';
end;
$$;

create trigger classrooms_enforce_integrity
before insert or update on public.classrooms
for each row
execute function private.enforce_classroom_integrity();

create trigger classroom_memberships_enforce_lifecycle
before insert or update on public.classroom_memberships
for each row
execute function private.enforce_classroom_membership_lifecycle();

create function public.create_teacher_classroom(
  p_name text,
  p_grade smallint,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_normalized_name text;
  v_classroom_id uuid;
  v_class_code text;
  v_created_at timestamptz;
  v_existing_name text;
  v_existing_grade smallint;
  v_attempt smallint;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');
  v_normalized_name := btrim(
    regexp_replace(
      coalesce(p_name, ''),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );

  if
    p_request_id is null
    or char_length(v_normalized_name) not between 2 and 80
    or p_grade is null
    or p_grade not between 1 and 9
  then
    raise exception 'Classroom request unavailable';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'classroom-create:'
      || v_teacher_user_id::text
      || ':'
      || p_request_id::text,
      0
    )
  );

  select
    classroom.id,
    classroom.name,
    classroom.grade,
    classroom.class_code,
    classroom.created_at
  into
    v_classroom_id,
    v_existing_name,
    v_existing_grade,
    v_class_code,
    v_created_at
  from public.classrooms as classroom
  where
    classroom.teacher_id = v_teacher_user_id
    and classroom.creation_request_id = p_request_id;

  if v_classroom_id is not null then
    return jsonb_build_object(
      'classroom_id', v_classroom_id,
      'name', v_existing_name,
      'grade', v_existing_grade,
      'class_code', v_class_code,
      'status', 'ACTIVE',
      'created_at', v_created_at
    );
  end if;

  for v_attempt in 1..5 loop
    v_class_code := private.generate_classroom_code();

    begin
      insert into public.classrooms (
        teacher_id,
        creation_request_id,
        name,
        grade,
        class_code
      )
      values (
        v_teacher_user_id,
        p_request_id,
        v_normalized_name,
        p_grade,
        v_class_code
      )
      returning
        id,
        created_at
      into
        v_classroom_id,
        v_created_at;

      return jsonb_build_object(
        'classroom_id', v_classroom_id,
        'name', v_normalized_name,
        'grade', p_grade,
        'class_code', v_class_code,
        'status', 'ACTIVE',
        'created_at', v_created_at
      );
    exception
      when unique_violation then
        if v_attempt = 5 then
          raise;
        end if;
    end;
  end loop;

  raise exception 'Classroom creation unavailable';
end;
$$;

create function public.get_my_teacher_classrooms()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_classrooms jsonb := '[]'::jsonb;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');

  select coalesce(
    jsonb_agg(items.item order by items.created_at desc, items.classroom_id),
    '[]'::jsonb
  )
  into v_classrooms
  from (
    select
      classroom.id as classroom_id,
      classroom.created_at,
      jsonb_build_object(
        'classroom_id', classroom.id,
        'name', classroom.name,
        'grade', classroom.grade,
        'class_code', classroom.class_code,
        'status', classroom.status,
        'created_at', classroom.created_at,
        'pending_count', count(membership.id)
          filter (where membership.status = 'PENDING'),
        'approved_count', count(membership.id)
          filter (where membership.status = 'APPROVED')
      ) as item
    from public.classrooms as classroom
    left join public.classroom_memberships as membership
      on membership.classroom_id = classroom.id
      and membership.status in ('PENDING', 'APPROVED')
    where
      classroom.teacher_id = v_teacher_user_id
      and classroom.status = 'ACTIVE'
    group by classroom.id
  ) as items;

  return jsonb_build_object('classrooms', v_classrooms);
end;
$$;

create function public.get_teacher_classroom(
  p_classroom_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_classroom jsonb;
  v_memberships jsonb := '[]'::jsonb;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');

  select jsonb_build_object(
    'classroom_id', classroom.id,
    'name', classroom.name,
    'grade', classroom.grade,
    'class_code', classroom.class_code,
    'status', classroom.status,
    'created_at', classroom.created_at
  )
  into v_classroom
  from public.classrooms as classroom
  where
    classroom.id = p_classroom_id
    and classroom.teacher_id = v_teacher_user_id
    and classroom.status = 'ACTIVE';

  if v_classroom is null then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'membership_id', membership.id,
        'status', membership.status,
        'student_display_name', profile.full_name,
        'grade', student.grade,
        'requested_at', membership.requested_at,
        'responded_at', membership.responded_at
      )
      order by membership.requested_at desc, membership.id
    ),
    '[]'::jsonb
  )
  into v_memberships
  from public.classroom_memberships as membership
  join public.student_profiles as student
    on student.user_id = membership.student_id
  join public.profiles as profile
    on profile.user_id = membership.student_id
  where
    membership.classroom_id = p_classroom_id
    and membership.status in ('PENDING', 'APPROVED');

  return jsonb_build_object(
    'classroom', v_classroom,
    'memberships', v_memberships
  );
end;
$$;

create function public.preview_classroom_by_code(
  p_class_code text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_student_user_id uuid;
  v_student_grade smallint;
  v_normalized_code text;
  v_classroom_id uuid;
  v_classroom_name text;
  v_classroom_grade smallint;
  v_teacher_display_name text;
  v_membership_status text;
begin
  v_student_user_id := private.require_classroom_actor('STUDENT');

  select student.grade
  into v_student_grade
  from public.student_profiles as student
  where student.user_id = v_student_user_id;

  v_normalized_code := upper(btrim(coalesce(p_class_code, '')));
  if
    v_normalized_code !~
      '^PLV-CLS-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$'
  then
    return jsonb_build_object('found', false);
  end if;

  select
    classroom.id,
    classroom.name,
    classroom.grade,
    teacher.full_name
  into
    v_classroom_id,
    v_classroom_name,
    v_classroom_grade,
    v_teacher_display_name
  from public.classrooms as classroom
  join public.teacher_profiles as teacher
    on teacher.user_id = classroom.teacher_id
  where
    classroom.class_code = v_normalized_code
    and classroom.status = 'ACTIVE'
    and classroom.grade = v_student_grade;

  if v_classroom_id is null then
    return jsonb_build_object('found', false);
  end if;

  select membership.status
  into v_membership_status
  from public.classroom_memberships as membership
  where
    membership.classroom_id = v_classroom_id
    and membership.student_id = v_student_user_id
  order by membership.created_at desc, membership.id desc
  limit 1;

  return jsonb_build_object(
    'found', true,
    'classroom_name', v_classroom_name,
    'grade', v_classroom_grade,
    'teacher_display_name', v_teacher_display_name,
    'membership_status', v_membership_status
  );
end;
$$;

create function public.request_classroom_membership(
  p_class_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_user_id uuid;
  v_student_grade smallint;
  v_normalized_code text;
  v_classroom_id uuid;
  v_existing_status text;
begin
  v_student_user_id := private.require_classroom_actor('STUDENT');

  select student.grade
  into v_student_grade
  from public.student_profiles as student
  where student.user_id = v_student_user_id;

  v_normalized_code := upper(btrim(coalesce(p_class_code, '')));
  if
    v_normalized_code !~
      '^PLV-CLS-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$'
  then
    return jsonb_build_object('created', false);
  end if;

  select classroom.id
  into v_classroom_id
  from public.classrooms as classroom
  where
    classroom.class_code = v_normalized_code
    and classroom.status = 'ACTIVE'
    and classroom.grade = v_student_grade;

  if v_classroom_id is null then
    return jsonb_build_object('created', false);
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'classroom-membership-pair:'
      || v_classroom_id::text
      || ':'
      || v_student_user_id::text,
      0
    )
  );

  select membership.status
  into v_existing_status
  from public.classroom_memberships as membership
  where
    membership.classroom_id = v_classroom_id
    and membership.student_id = v_student_user_id
    and membership.status in ('PENDING', 'APPROVED')
  limit 1;

  if v_existing_status is not null then
    return jsonb_build_object(
      'created', true,
      'status', v_existing_status
    );
  end if;

  insert into public.classroom_memberships (
    classroom_id,
    student_id
  )
  values (
    v_classroom_id,
    v_student_user_id
  );

  return jsonb_build_object(
    'created', true,
    'status', 'PENDING'
  );
end;
$$;

create function public.get_my_classroom_memberships()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_student_user_id uuid;
  v_memberships jsonb := '[]'::jsonb;
begin
  v_student_user_id := private.require_classroom_actor('STUDENT');

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'membership_id', membership.id,
        'classroom_name', classroom.name,
        'grade', classroom.grade,
        'teacher_display_name', teacher.full_name,
        'status', membership.status,
        'requested_at', membership.requested_at,
        'responded_at', membership.responded_at
      )
      order by membership.requested_at desc, membership.id
    ),
    '[]'::jsonb
  )
  into v_memberships
  from public.classroom_memberships as membership
  join public.classrooms as classroom
    on classroom.id = membership.classroom_id
  join public.teacher_profiles as teacher
    on teacher.user_id = classroom.teacher_id
  where
    membership.student_id = v_student_user_id
    and membership.status in ('PENDING', 'APPROVED')
    and classroom.status = 'ACTIVE';

  return jsonb_build_object('memberships', v_memberships);
end;
$$;

create function public.respond_classroom_membership(
  p_membership_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_target_status text;
  v_affected_count bigint := 0;
  v_current_status text;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');
  v_target_status := upper(btrim(coalesce(p_decision, '')));

  if v_target_status not in ('APPROVED', 'REJECTED') then
    raise exception 'Classroom decision unavailable';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('classroom-membership:' || p_membership_id::text, 0)
  );

  update public.classroom_memberships as membership
  set
    status = v_target_status,
    responded_at = now(),
    ended_at = null
  from public.classrooms as classroom
  where
    membership.id = p_membership_id
    and membership.classroom_id = classroom.id
    and classroom.teacher_id = v_teacher_user_id
    and classroom.status = 'ACTIVE'
    and membership.status = 'PENDING';

  get diagnostics v_affected_count = row_count;
  if v_affected_count = 1 then
    return jsonb_build_object('status', v_target_status);
  end if;

  select membership.status
  into v_current_status
  from public.classroom_memberships as membership
  join public.classrooms as classroom
    on classroom.id = membership.classroom_id
  where
    membership.id = p_membership_id
    and classroom.teacher_id = v_teacher_user_id;

  if v_current_status = v_target_status then
    return jsonb_build_object('status', v_target_status);
  end if;

  raise exception 'Classroom membership state unavailable';
end;
$$;

create function public.cancel_classroom_membership_request(
  p_membership_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_user_id uuid;
  v_affected_count bigint := 0;
  v_current_status text;
begin
  v_student_user_id := private.require_classroom_actor('STUDENT');

  perform pg_advisory_xact_lock(
    hashtextextended('classroom-membership:' || p_membership_id::text, 0)
  );

  update public.classroom_memberships as membership
  set
    status = 'CANCELLED',
    ended_at = now()
  where
    membership.id = p_membership_id
    and membership.student_id = v_student_user_id
    and membership.status = 'PENDING';

  get diagnostics v_affected_count = row_count;
  if v_affected_count = 1 then
    return jsonb_build_object('status', 'CANCELLED');
  end if;

  select membership.status
  into v_current_status
  from public.classroom_memberships as membership
  where
    membership.id = p_membership_id
    and membership.student_id = v_student_user_id;

  if v_current_status = 'CANCELLED' then
    return jsonb_build_object('status', 'CANCELLED');
  end if;

  raise exception 'Classroom membership state unavailable';
end;
$$;

create function public.leave_classroom(
  p_membership_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_user_id uuid;
  v_affected_count bigint := 0;
  v_current_status text;
begin
  v_student_user_id := private.require_classroom_actor('STUDENT');

  perform pg_advisory_xact_lock(
    hashtextextended('classroom-membership:' || p_membership_id::text, 0)
  );

  update public.classroom_memberships as membership
  set
    status = 'LEFT',
    ended_at = now()
  where
    membership.id = p_membership_id
    and membership.student_id = v_student_user_id
    and membership.status = 'APPROVED';

  get diagnostics v_affected_count = row_count;
  if v_affected_count = 1 then
    return jsonb_build_object('status', 'LEFT');
  end if;

  select membership.status
  into v_current_status
  from public.classroom_memberships as membership
  where
    membership.id = p_membership_id
    and membership.student_id = v_student_user_id;

  if v_current_status = 'LEFT' then
    return jsonb_build_object('status', 'LEFT');
  end if;

  raise exception 'Classroom membership state unavailable';
end;
$$;

create function public.remove_classroom_student(
  p_membership_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_affected_count bigint := 0;
  v_current_status text;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');

  perform pg_advisory_xact_lock(
    hashtextextended('classroom-membership:' || p_membership_id::text, 0)
  );

  update public.classroom_memberships as membership
  set
    status = 'REMOVED',
    ended_at = now()
  from public.classrooms as classroom
  where
    membership.id = p_membership_id
    and membership.classroom_id = classroom.id
    and classroom.teacher_id = v_teacher_user_id
    and classroom.status = 'ACTIVE'
    and membership.status = 'APPROVED';

  get diagnostics v_affected_count = row_count;
  if v_affected_count = 1 then
    return jsonb_build_object('status', 'REMOVED');
  end if;

  select membership.status
  into v_current_status
  from public.classroom_memberships as membership
  join public.classrooms as classroom
    on classroom.id = membership.classroom_id
  where
    membership.id = p_membership_id
    and classroom.teacher_id = v_teacher_user_id;

  if v_current_status = 'REMOVED' then
    return jsonb_build_object('status', 'REMOVED');
  end if;

  raise exception 'Classroom membership state unavailable';
end;
$$;

alter table public.classrooms enable row level security;
alter table public.classroom_memberships enable row level security;

revoke all on table public.classrooms from public;
revoke all on table public.classrooms from anon;
revoke all on table public.classrooms from authenticated;
revoke all on table public.classroom_memberships from public;
revoke all on table public.classroom_memberships from anon;
revoke all on table public.classroom_memberships from authenticated;

revoke all on function private.require_classroom_actor(text) from public;
revoke all on function private.require_classroom_actor(text) from anon;
revoke all on function private.require_classroom_actor(text)
  from authenticated;
revoke all on function private.generate_classroom_code() from public;
revoke all on function private.generate_classroom_code() from anon;
revoke all on function private.generate_classroom_code()
  from authenticated;
revoke all on function private.enforce_classroom_integrity() from public;
revoke all on function private.enforce_classroom_integrity() from anon;
revoke all on function private.enforce_classroom_integrity()
  from authenticated;
revoke all
on function private.enforce_classroom_membership_lifecycle()
from public;
revoke all
on function private.enforce_classroom_membership_lifecycle()
from anon;
revoke all
on function private.enforce_classroom_membership_lifecycle()
from authenticated;

revoke all
on function public.create_teacher_classroom(text, smallint, uuid)
from public;
revoke all
on function public.create_teacher_classroom(text, smallint, uuid)
from anon;
revoke all
on function public.create_teacher_classroom(text, smallint, uuid)
from authenticated;
grant execute
on function public.create_teacher_classroom(text, smallint, uuid)
to authenticated;

revoke all on function public.get_my_teacher_classrooms() from public;
revoke all on function public.get_my_teacher_classrooms() from anon;
revoke all
on function public.get_my_teacher_classrooms()
from authenticated;
grant execute
on function public.get_my_teacher_classrooms()
to authenticated;

revoke all on function public.get_teacher_classroom(uuid) from public;
revoke all on function public.get_teacher_classroom(uuid) from anon;
revoke all
on function public.get_teacher_classroom(uuid)
from authenticated;
grant execute
on function public.get_teacher_classroom(uuid)
to authenticated;

revoke all on function public.preview_classroom_by_code(text) from public;
revoke all on function public.preview_classroom_by_code(text) from anon;
revoke all
on function public.preview_classroom_by_code(text)
from authenticated;
grant execute
on function public.preview_classroom_by_code(text)
to authenticated;

revoke all
on function public.request_classroom_membership(text)
from public;
revoke all
on function public.request_classroom_membership(text)
from anon;
revoke all
on function public.request_classroom_membership(text)
from authenticated;
grant execute
on function public.request_classroom_membership(text)
to authenticated;

revoke all
on function public.get_my_classroom_memberships()
from public;
revoke all
on function public.get_my_classroom_memberships()
from anon;
revoke all
on function public.get_my_classroom_memberships()
from authenticated;
grant execute
on function public.get_my_classroom_memberships()
to authenticated;

revoke all
on function public.respond_classroom_membership(uuid, text)
from public;
revoke all
on function public.respond_classroom_membership(uuid, text)
from anon;
revoke all
on function public.respond_classroom_membership(uuid, text)
from authenticated;
grant execute
on function public.respond_classroom_membership(uuid, text)
to authenticated;

revoke all
on function public.cancel_classroom_membership_request(uuid)
from public;
revoke all
on function public.cancel_classroom_membership_request(uuid)
from anon;
revoke all
on function public.cancel_classroom_membership_request(uuid)
from authenticated;
grant execute
on function public.cancel_classroom_membership_request(uuid)
to authenticated;

revoke all on function public.leave_classroom(uuid) from public;
revoke all on function public.leave_classroom(uuid) from anon;
revoke all on function public.leave_classroom(uuid) from authenticated;
grant execute on function public.leave_classroom(uuid) to authenticated;

revoke all
on function public.remove_classroom_student(uuid)
from public;
revoke all
on function public.remove_classroom_student(uuid)
from anon;
revoke all
on function public.remove_classroom_student(uuid)
from authenticated;
grant execute
on function public.remove_classroom_student(uuid)
to authenticated;

comment on table public.classrooms is
  'Teacher-owned active classrooms with random non-personal class codes.';
comment on table public.classroom_memberships is
  'Consent-based Student classroom membership history; rows are never hard-deleted by classroom RPCs.';
comment on function public.preview_classroom_by_code(text) is
  'Returns only safe class preview fields for an authenticated same-grade Student.';
comment on function public.get_teacher_classroom(uuid) is
  'Returns one owned classroom and its active roster without participant IDs or private learning data.';

do $validation$
declare
  v_public_function_count integer := 0;
  v_security_definer_count integer := 0;
  v_safe_search_path_count integer := 0;
  v_active_index_count integer := 0;
  v_trigger_count integer := 0;
begin
  if not exists (
    select 1
    from pg_catalog.pg_class as relation
    where
      relation.oid = 'public.classrooms'::regclass
      and relation.relrowsecurity
  ) or not exists (
    select 1
    from pg_catalog.pg_class as relation
    where
      relation.oid = 'public.classroom_memberships'::regclass
      and relation.relrowsecurity
  ) then
    raise exception 'Classroom RLS validation failed';
  end if;

  select count(*)
  into v_active_index_count
  from pg_catalog.pg_index as index_definition
  join pg_catalog.pg_class as index_relation
    on index_relation.oid = index_definition.indexrelid
  where
    index_definition.indrelid =
      'public.classroom_memberships'::regclass
    and index_relation.relname =
      'classroom_memberships_one_active_pair_idx'
    and index_definition.indisunique
    and index_definition.indpred is not null;

  if v_active_index_count <> 1 then
    raise exception 'Classroom active membership index validation failed';
  end if;

  select count(*)
  into v_trigger_count
  from pg_catalog.pg_trigger as trigger_definition
  where
    not trigger_definition.tgisinternal
    and trigger_definition.tgenabled <> 'D'
    and (
      (
        trigger_definition.tgrelid = 'public.classrooms'::regclass
        and trigger_definition.tgname =
          'classrooms_enforce_integrity'
      )
      or (
        trigger_definition.tgrelid =
          'public.classroom_memberships'::regclass
        and trigger_definition.tgname =
          'classroom_memberships_enforce_lifecycle'
      )
    );

  if v_trigger_count <> 2 then
    raise exception 'Classroom lifecycle trigger validation failed';
  end if;

  select
    count(*),
    count(*) filter (where procedure.prosecdef),
    count(*) filter (
      where coalesce(
        procedure.proconfig,
        array[]::text[]
      ) @> array['search_path=""']::text[]
    )
  into
    v_public_function_count,
    v_security_definer_count,
    v_safe_search_path_count
  from pg_catalog.pg_proc as procedure
  where
    procedure.pronamespace = 'public'::regnamespace
    and procedure.proname in (
      'create_teacher_classroom',
      'get_my_teacher_classrooms',
      'get_teacher_classroom',
      'preview_classroom_by_code',
      'request_classroom_membership',
      'get_my_classroom_memberships',
      'respond_classroom_membership',
      'cancel_classroom_membership_request',
      'leave_classroom',
      'remove_classroom_student'
    );

  if
    v_public_function_count <> 10
    or v_security_definer_count <> 10
    or v_safe_search_path_count <> 10
  then
    raise exception 'Classroom function security validation failed';
  end if;

  if
    has_table_privilege(
      'authenticated',
      'public.classrooms',
      'SELECT'
    )
    or has_table_privilege(
      'authenticated',
      'public.classrooms',
      'INSERT'
    )
    or has_table_privilege(
      'authenticated',
      'public.classrooms',
      'UPDATE'
    )
    or has_table_privilege(
      'authenticated',
      'public.classrooms',
      'DELETE'
    )
    or has_table_privilege(
      'authenticated',
      'public.classroom_memberships',
      'SELECT'
    )
    or has_table_privilege(
      'authenticated',
      'public.classroom_memberships',
      'INSERT'
    )
    or has_table_privilege(
      'authenticated',
      'public.classroom_memberships',
      'UPDATE'
    )
    or has_table_privilege(
      'authenticated',
      'public.classroom_memberships',
      'DELETE'
    )
  then
    raise exception 'Direct classroom table privilege detected';
  end if;

  if
    not has_function_privilege(
      'authenticated',
      'public.create_teacher_classroom(text,smallint,uuid)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.get_my_teacher_classrooms()',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.get_teacher_classroom(uuid)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.preview_classroom_by_code(text)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.request_classroom_membership(text)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.get_my_classroom_memberships()',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.respond_classroom_membership(uuid,text)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.cancel_classroom_membership_request(uuid)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.leave_classroom(uuid)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.remove_classroom_student(uuid)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.create_teacher_classroom(text,smallint,uuid)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.preview_classroom_by_code(text)',
      'EXECUTE'
    )
  then
    raise exception 'Classroom execute grant validation failed';
  end if;

  if exists (
    select 1
    from public.classrooms as classroom
    left join public.teacher_profiles as teacher
      on teacher.user_id = classroom.teacher_id
    where
      teacher.user_id is null
      or teacher.activation_status <> 'ACTIVE'
      or classroom.grade not between 1 and 9
      or classroom.class_code !~
        '^PLV-CLS-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$'
  ) then
    raise exception 'Invalid classroom data detected';
  end if;

  if exists (
    select 1
    from public.classroom_memberships as membership
    where
      (
        membership.status = 'PENDING'
        and (
          membership.responded_at is not null
          or membership.ended_at is not null
        )
      )
      or (
        membership.status in ('APPROVED', 'REJECTED')
        and (
          membership.responded_at is null
          or membership.ended_at is not null
        )
      )
      or (
        membership.status = 'CANCELLED'
        and (
          membership.responded_at is not null
          or membership.ended_at is null
        )
      )
      or (
        membership.status in ('LEFT', 'REMOVED')
        and (
          membership.responded_at is null
          or membership.ended_at is null
        )
      )
  ) then
    raise exception 'Invalid classroom membership data detected';
  end if;

  if exists (
    select 1
    from public.classroom_memberships as membership
    where membership.status in ('PENDING', 'APPROVED')
    group by membership.classroom_id, membership.student_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate active classroom membership detected';
  end if;
end;
$validation$;

commit;
