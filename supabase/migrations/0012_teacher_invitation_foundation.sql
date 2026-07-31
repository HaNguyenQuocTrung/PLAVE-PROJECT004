begin;

alter table public.profiles
  drop constraint profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('STUDENT', 'PARENT', 'TEACHER'));

comment on constraint profiles_role_check on public.profiles is
  'Public accounts are limited to Student, Parent, or invite-gated Teacher. Teacher access remains disabled until activation.';

create table public.teacher_invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  code_hash bytea not null unique,
  status text not null default 'AVAILABLE'
    check (status in ('AVAILABLE', 'CLAIMED', 'REVOKED', 'EXPIRED')),
  expires_at timestamptz not null,
  teacher_user_id uuid
    references public.profiles(user_id) on delete restrict,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  revoked_at timestamptz,
  expired_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint teacher_invitations_code_hash_check
    check (octet_length(code_hash) = 32),
  constraint teacher_invitations_expiry_check
    check (expires_at > created_at),
  constraint teacher_invitations_lifecycle_check
    check (
      (
        status = 'AVAILABLE'
        and teacher_user_id is null
        and claimed_at is null
        and revoked_at is null
        and expired_at is null
      )
      or (
        status = 'CLAIMED'
        and teacher_user_id is not null
        and claimed_at is not null
        and claimed_at >= created_at
        and claimed_at <= expires_at
        and revoked_at is null
        and expired_at is null
      )
      or (
        status = 'REVOKED'
        and teacher_user_id is null
        and claimed_at is null
        and revoked_at is not null
        and revoked_at >= created_at
        and expired_at is null
      )
      or (
        status = 'EXPIRED'
        and teacher_user_id is null
        and claimed_at is null
        and revoked_at is null
        and expired_at is not null
        and expired_at >= expires_at
      )
    )
);

create index teacher_invitations_status_expiry_idx
on public.teacher_invitations (status, expires_at);

create table public.teacher_profiles (
  user_id uuid primary key
    references public.profiles(user_id) on delete cascade,
  full_name text not null,
  activation_status text not null default 'ACTIVE'
    check (activation_status = 'ACTIVE'),
  invitation_id uuid not null unique
    references public.teacher_invitations(id) on delete restrict,
  activated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_profiles_full_name_check
    check (
      full_name = btrim(full_name)
      and char_length(full_name) between 2 and 100
    )
);

create trigger teacher_invitations_set_updated_at
before update on public.teacher_invitations
for each row execute function private.set_updated_at();

create trigger teacher_profiles_set_updated_at
before update on public.teacher_profiles
for each row execute function private.set_updated_at();

create function private.enforce_teacher_invitation_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if
    new.id is distinct from old.id
    or new.code_hash is distinct from old.code_hash
    or new.created_at is distinct from old.created_at
    or new.expires_at is distinct from old.expires_at
  then
    raise exception 'Teacher invitation identity cannot change';
  end if;

  if old.status <> 'AVAILABLE' then
    if
      new.status is distinct from old.status
      or new.teacher_user_id is distinct from old.teacher_user_id
      or new.claimed_at is distinct from old.claimed_at
      or new.revoked_at is distinct from old.revoked_at
      or new.expired_at is distinct from old.expired_at
    then
      raise exception 'Teacher invitation decision cannot change';
    end if;

    return new;
  end if;

  if new.status in ('CLAIMED', 'REVOKED', 'EXPIRED') then
    return new;
  end if;

  if new.status = old.status then
    return new;
  end if;

  raise exception 'Invalid teacher invitation transition';
end;
$$;

revoke all
on function private.enforce_teacher_invitation_lifecycle()
from public;
revoke all
on function private.enforce_teacher_invitation_lifecycle()
from anon;
revoke all
on function private.enforce_teacher_invitation_lifecycle()
from authenticated;

create trigger teacher_invitations_enforce_lifecycle
before update on public.teacher_invitations
for each row
execute function private.enforce_teacher_invitation_lifecycle();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requested_role text;
  v_registration_grade smallint;
  v_registration_grade_text text;
begin
  v_requested_role := upper(
    coalesce(new.raw_user_meta_data ->> 'role', '')
  );

  if v_requested_role not in ('STUDENT', 'PARENT', 'TEACHER') then
    raise exception 'Unsupported public registration role';
  end if;

  if v_requested_role = 'STUDENT' then
    v_registration_grade_text := btrim(
      coalesce(new.raw_user_meta_data ->> 'grade', '')
    );

    if v_registration_grade_text !~ '^[1-9]$' then
      raise exception 'Invalid student registration grade';
    end if;

    v_registration_grade := v_registration_grade_text::smallint;
  end if;

  insert into public.profiles (
    user_id,
    role,
    registration_grade
  )
  values (
    new.id,
    v_requested_role,
    v_registration_grade
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;
revoke all on function public.handle_new_auth_user() from anon;
revoke all on function public.handle_new_auth_user() from authenticated;

create function private.issue_teacher_invitation(
  p_expires_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_code_hash bytea;
  v_attempt smallint;
begin
  if
    p_expires_at is null
    or p_expires_at <= now()
  then
    raise exception 'Teacher invitation expiry must be in the future';
  end if;

  update public.teacher_invitations as invitation
  set
    status = 'EXPIRED',
    expired_at = now()
  where
    invitation.status = 'AVAILABLE'
    and invitation.expires_at <= now();

  for v_attempt in 1..5 loop
    v_code :=
      'PLV-TCH-'
      || upper(encode(extensions.gen_random_bytes(16), 'hex'));
    v_code_hash := extensions.digest(v_code, 'sha256');

    begin
      insert into public.teacher_invitations (
        code_hash,
        expires_at
      )
      values (
        v_code_hash,
        p_expires_at
      );

      return v_code;
    exception
      when unique_violation then
        if v_attempt = 5 then
          raise;
        end if;
    end;
  end loop;

  raise exception 'Teacher invitation could not be issued';
end;
$$;

revoke all
on function private.issue_teacher_invitation(timestamptz)
from public;
revoke all
on function private.issue_teacher_invitation(timestamptz)
from anon;
revoke all
on function private.issue_teacher_invitation(timestamptz)
from authenticated;

create function private.revoke_teacher_invitation(
  p_invitation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_affected_count bigint := 0;
begin
  update public.teacher_invitations as invitation
  set
    status = 'EXPIRED',
    expired_at = now()
  where
    invitation.id = p_invitation_id
    and invitation.status = 'AVAILABLE'
    and invitation.expires_at <= now();

  update public.teacher_invitations as invitation
  set
    status = 'REVOKED',
    revoked_at = now()
  where
    invitation.id = p_invitation_id
    and invitation.status = 'AVAILABLE'
    and invitation.expires_at > now();

  get diagnostics v_affected_count = row_count;
  if v_affected_count = 1 then
    return true;
  end if;

  return exists (
    select 1
    from public.teacher_invitations as invitation
    where
      invitation.id = p_invitation_id
      and invitation.status in ('REVOKED', 'EXPIRED')
  );
end;
$$;

alter function private.issue_teacher_invitation(timestamptz)
owner to postgres;
alter function private.revoke_teacher_invitation(uuid)
owner to postgres;

revoke all
on function private.revoke_teacher_invitation(uuid)
from public;
revoke all
on function private.revoke_teacher_invitation(uuid)
from anon;
revoke all
on function private.revoke_teacher_invitation(uuid)
from authenticated;

create function public.activate_teacher_invitation(
  p_code text,
  p_full_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_normalized_code text;
  v_code_hash bytea;
  v_normalized_name text;
  v_profile_count bigint := 0;
  v_current_role text;
  v_onboarding_completed boolean := false;
  v_email_confirmed boolean := false;
  v_invitation_id uuid;
  v_invitation_status text;
  v_invitation_expires_at timestamptz;
  v_invitation_teacher_user_id uuid;
  v_existing_teacher_name text;
  v_affected_count bigint := 0;
begin
  if v_current_user_id is null then
    return jsonb_build_object('activated', false);
  end if;

  v_normalized_code := upper(btrim(coalesce(p_code, '')));
  v_normalized_name := btrim(
    regexp_replace(
      coalesce(p_full_name, ''),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );

  if
    v_normalized_code !~ '^PLV-TCH-[0-9A-F]{32}$'
    or char_length(v_normalized_name) not between 2 and 100
  then
    return jsonb_build_object('activated', false);
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'teacher-activation-user:' || v_current_user_id::text,
      0
    )
  );

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

  select exists (
    select 1
    from auth.users as auth_user
    where
      auth_user.id = v_current_user_id
      and auth_user.email_confirmed_at is not null
  )
  into v_email_confirmed;

  if
    v_profile_count <> 1
    or v_current_role <> 'TEACHER'
    or not v_email_confirmed
  then
    return jsonb_build_object('activated', false);
  end if;

  v_code_hash := extensions.digest(v_normalized_code, 'sha256');

  perform pg_advisory_xact_lock(
    hashtextextended(
      'teacher-invitation:'
      || encode(v_code_hash, 'hex'),
      0
    )
  );

  select
    invitation.id,
    invitation.status,
    invitation.expires_at,
    invitation.teacher_user_id
  into
    v_invitation_id,
    v_invitation_status,
    v_invitation_expires_at,
    v_invitation_teacher_user_id
  from public.teacher_invitations as invitation
  where invitation.code_hash = v_code_hash;

  if v_invitation_id is null then
    return jsonb_build_object('activated', false);
  end if;

  if
    v_invitation_status = 'CLAIMED'
    and v_invitation_teacher_user_id = v_current_user_id
    and v_onboarding_completed
  then
    select teacher.full_name
    into v_existing_teacher_name
    from public.teacher_profiles as teacher
    where
      teacher.user_id = v_current_user_id
      and teacher.invitation_id = v_invitation_id
      and teacher.activation_status = 'ACTIVE';

    if v_existing_teacher_name is not null then
      return jsonb_build_object(
        'activated',
        true,
        'full_name',
        v_existing_teacher_name
      );
    end if;
  end if;

  if
    v_invitation_status = 'AVAILABLE'
    and v_invitation_expires_at <= now()
  then
    update public.teacher_invitations as invitation
    set
      status = 'EXPIRED',
      expired_at = now()
    where
      invitation.id = v_invitation_id
      and invitation.status = 'AVAILABLE'
      and invitation.expires_at <= now();

    return jsonb_build_object('activated', false);
  end if;

  if
    v_invitation_status <> 'AVAILABLE'
    or v_invitation_expires_at <= now()
    or v_onboarding_completed
  then
    return jsonb_build_object('activated', false);
  end if;

  update public.teacher_invitations as invitation
  set
    status = 'CLAIMED',
    teacher_user_id = v_current_user_id,
    claimed_at = now()
  where
    invitation.id = v_invitation_id
    and invitation.status = 'AVAILABLE'
    and invitation.expires_at > now();

  get diagnostics v_affected_count = row_count;
  if v_affected_count <> 1 then
    return jsonb_build_object('activated', false);
  end if;

  insert into public.teacher_profiles (
    user_id,
    full_name,
    activation_status,
    invitation_id
  )
  values (
    v_current_user_id,
    v_normalized_name,
    'ACTIVE',
    v_invitation_id
  );

  update public.profiles as profile
  set
    full_name = v_normalized_name,
    onboarding_completed = true
  where
    profile.user_id = v_current_user_id
    and profile.role = 'TEACHER'
    and not profile.onboarding_completed;

  get diagnostics v_affected_count = row_count;
  if v_affected_count <> 1 then
    raise exception 'Teacher activation unavailable';
  end if;

  return jsonb_build_object(
    'activated',
    true,
    'full_name',
    v_normalized_name
  );
end;
$$;

create function public.get_my_teacher_profile()
returns jsonb
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
  v_teacher_profile jsonb;
begin
  if v_current_user_id is null then
    return null;
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
    or v_current_role <> 'TEACHER'
    or not v_onboarding_completed
  then
    return null;
  end if;

  select jsonb_build_object(
    'full_name', teacher.full_name,
    'activation_status', teacher.activation_status,
    'activated_at', teacher.activated_at
  )
  into v_teacher_profile
  from public.teacher_profiles as teacher
  where
    teacher.user_id = v_current_user_id
    and teacher.activation_status = 'ACTIVE';

  return v_teacher_profile;
end;
$$;

alter table public.teacher_invitations enable row level security;
alter table public.teacher_profiles enable row level security;

revoke all on table public.teacher_invitations from public;
revoke all on table public.teacher_invitations from anon;
revoke all on table public.teacher_invitations from authenticated;

revoke all on table public.teacher_profiles from public;
revoke all on table public.teacher_profiles from anon;
revoke all on table public.teacher_profiles from authenticated;

revoke all
on function public.activate_teacher_invitation(text, text)
from public;
revoke all
on function public.activate_teacher_invitation(text, text)
from anon;
revoke all
on function public.activate_teacher_invitation(text, text)
from authenticated;
grant execute
on function public.activate_teacher_invitation(text, text)
to authenticated;

revoke all
on function public.get_my_teacher_profile()
from public;
revoke all
on function public.get_my_teacher_profile()
from anon;
revoke all
on function public.get_my_teacher_profile()
from authenticated;
grant execute
on function public.get_my_teacher_profile()
to authenticated;

comment on table public.teacher_invitations is
  'One-time Teacher invitations. Only SHA-256 hashes are stored; plaintext is returned once by the private issuer.';
comment on table public.teacher_profiles is
  'Minimal activated Teacher profile. Classroom data is intentionally out of scope.';
comment on function private.issue_teacher_invitation(timestamptz) is
  'Postgres-owner-only issuer returning a 128-bit random plaintext code exactly once.';
comment on function private.revoke_teacher_invitation(uuid) is
  'Postgres-owner-only revocation for an unused Teacher invitation.';
comment on function public.activate_teacher_invitation(text, text) is
  'Authenticated Teacher activation; claims one valid invitation and creates the minimal Teacher profile atomically.';
comment on function public.get_my_teacher_profile() is
  'Returns only the authenticated activated Teacher display fields; invitation identifiers remain private.';

do $validation$
declare
  v_constraint_definition text;
  v_secure_function_count integer := 0;
  v_safe_path_function_count integer := 0;
  v_lifecycle_trigger_count integer := 0;
begin
  select pg_catalog.pg_get_constraintdef(constraint_definition.oid)
  into v_constraint_definition
  from pg_catalog.pg_constraint as constraint_definition
  where
    constraint_definition.conrelid = 'public.profiles'::regclass
    and constraint_definition.conname = 'profiles_role_check'
    and constraint_definition.contype = 'c'
    and constraint_definition.convalidated;

  if
    v_constraint_definition is null
    or position('TEACHER' in v_constraint_definition) = 0
  then
    raise exception 'Teacher role constraint validation failed';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where
      namespace.nspname = 'public'
      and relation.relname = 'teacher_invitations'
      and relation.relkind = 'r'
      and relation.relrowsecurity
  ) or not exists (
    select 1
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where
      namespace.nspname = 'public'
      and relation.relname = 'teacher_profiles'
      and relation.relkind = 'r'
      and relation.relrowsecurity
  ) then
    raise exception 'Teacher table RLS validation failed';
  end if;

  select count(*)
  into v_lifecycle_trigger_count
  from pg_catalog.pg_trigger as trigger_definition
  where
    trigger_definition.tgrelid =
      'public.teacher_invitations'::regclass
    and trigger_definition.tgname =
      'teacher_invitations_enforce_lifecycle'
    and not trigger_definition.tgisinternal
    and trigger_definition.tgenabled <> 'D'
    and trigger_definition.tgfoid =
      'private.enforce_teacher_invitation_lifecycle()'::regprocedure;

  if v_lifecycle_trigger_count <> 1 then
    raise exception 'Teacher invitation lifecycle trigger validation failed';
  end if;

  if
    pg_catalog.has_table_privilege(
      'authenticated',
      'public.teacher_invitations',
      'SELECT'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.teacher_invitations',
      'INSERT'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.teacher_invitations',
      'UPDATE'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.teacher_invitations',
      'DELETE'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.teacher_profiles',
      'SELECT'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.teacher_profiles',
      'INSERT'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.teacher_profiles',
      'UPDATE'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.teacher_profiles',
      'DELETE'
    )
  then
    raise exception 'Teacher direct table grant validation failed';
  end if;

  select
    count(*) filter (where procedure.prosecdef),
    count(*) filter (
      where coalesce(
        procedure.proconfig,
        array[]::text[]
      ) @> array['search_path=""']::text[]
    )
  into
    v_secure_function_count,
    v_safe_path_function_count
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where
    (
      namespace.nspname = 'private'
      and procedure.proname in (
        'issue_teacher_invitation',
        'revoke_teacher_invitation',
        'enforce_teacher_invitation_lifecycle'
      )
    )
    or (
      namespace.nspname = 'public'
      and procedure.proname in (
        'activate_teacher_invitation',
        'get_my_teacher_profile'
      )
    );

  if
    v_secure_function_count <> 5
    or v_safe_path_function_count <> 5
  then
    raise exception 'Teacher function security validation failed';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where
      namespace.nspname = 'private'
      and procedure.proname in (
        'issue_teacher_invitation',
        'revoke_teacher_invitation'
      )
      and pg_catalog.pg_get_userbyid(procedure.proowner) <> 'postgres'
  ) then
    raise exception 'Teacher invitation owner validation failed';
  end if;

  if
    pg_catalog.has_function_privilege(
      'authenticated',
      'private.issue_teacher_invitation(timestamptz)',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'authenticated',
      'private.revoke_teacher_invitation(uuid)',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'anon',
      'public.activate_teacher_invitation(text,text)',
      'EXECUTE'
    )
    or not pg_catalog.has_function_privilege(
      'authenticated',
      'public.activate_teacher_invitation(text,text)',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'anon',
      'public.get_my_teacher_profile()',
      'EXECUTE'
    )
    or not pg_catalog.has_function_privilege(
      'authenticated',
      'public.get_my_teacher_profile()',
      'EXECUTE'
    )
  then
    raise exception 'Teacher function grant validation failed';
  end if;

  if exists (
    select 1
    from public.teacher_invitations as invitation
    where
      (
        invitation.status = 'AVAILABLE'
        and (
          invitation.teacher_user_id is not null
          or invitation.claimed_at is not null
          or invitation.revoked_at is not null
          or invitation.expired_at is not null
        )
      )
      or (
        invitation.status = 'CLAIMED'
        and (
          invitation.teacher_user_id is null
          or invitation.claimed_at is null
          or invitation.revoked_at is not null
          or invitation.expired_at is not null
        )
      )
      or (
        invitation.status = 'REVOKED'
        and (
          invitation.teacher_user_id is not null
          or invitation.claimed_at is not null
          or invitation.revoked_at is null
          or invitation.expired_at is not null
        )
      )
      or (
        invitation.status = 'EXPIRED'
        and (
          invitation.teacher_user_id is not null
          or invitation.claimed_at is not null
          or invitation.revoked_at is not null
          or invitation.expired_at is null
        )
      )
  ) then
    raise exception 'Teacher invitation state validation failed';
  end if;
end;
$validation$;

commit;
