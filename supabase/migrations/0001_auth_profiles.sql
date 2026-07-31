create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('STUDENT', 'PARENT')),
  full_name text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_check check (
    full_name is null
    or (
      full_name = btrim(full_name)
      and char_length(full_name) between 2 and 100
    )
  )
);

create table if not exists public.student_profiles (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  grade smallint not null check (grade between 1 and 9),
  birth_date date,
  student_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_profiles_birth_date_check check (
    birth_date is null or birth_date <= current_date
  ),
  constraint student_profiles_code_check check (
    student_code ~ '^PLV-[0-9A-F]{12}$'
  )
);

create table if not exists public.learning_goals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null
    references public.student_profiles(user_id) on delete cascade,
  title text not null,
  target_count integer not null,
  target_date date,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'COMPLETED', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_goals_title_check check (
    title = btrim(title)
    and char_length(title) between 3 and 120
  ),
  constraint learning_goals_target_count_check check (
    target_count between 1 and 500
  )
);

create index if not exists learning_goals_student_status_created_idx
  on public.learning_goals (student_id, status, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

drop trigger if exists student_profiles_set_updated_at on public.student_profiles;
create trigger student_profiles_set_updated_at
before update on public.student_profiles
for each row execute function private.set_updated_at();

drop trigger if exists learning_goals_set_updated_at on public.learning_goals;
create trigger learning_goals_set_updated_at
before update on public.learning_goals
for each row execute function private.set_updated_at();

create or replace function private.generate_student_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'PLV-' || upper(encode(extensions.gen_random_bytes(6), 'hex'));
$$;

revoke all on function private.generate_student_code() from public;
revoke all on function private.set_updated_at() from public;

comment on function private.generate_student_code() is
  'Generates a non-sequential student code without personal information; not exposed through the API.';

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
begin
  requested_role := upper(coalesce(new.raw_user_meta_data ->> 'role', ''));

  -- Fail closed: public metadata can never create a privileged role.
  if requested_role not in ('STUDENT', 'PARENT') then
    raise exception 'Unsupported public registration role';
  end if;

  insert into public.profiles (user_id, role)
  values (new.id, requested_role)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;
revoke all on function public.handle_new_auth_user() from anon;
revoke all on function public.handle_new_auth_user() from authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.complete_onboarding(
  p_full_name text,
  p_grade smallint default null,
  p_birth_date date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_role text;
  normalized_name text;
  insert_attempt smallint;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  normalized_name := btrim(
    regexp_replace(coalesce(p_full_name, ''), '[[:space:]]+', ' ', 'g')
  );

  if char_length(normalized_name) not between 2 and 100 then
    raise exception 'Invalid full name';
  end if;

  if p_birth_date is not null and p_birth_date > current_date then
    raise exception 'Invalid birth date';
  end if;

  select role
    into current_role
    from public.profiles
    where user_id = current_user_id
    for update;

  if not found or current_role not in ('STUDENT', 'PARENT') then
    raise exception 'Profile unavailable';
  end if;

  if current_role = 'STUDENT' then
    if p_grade is null or p_grade not between 1 and 9 then
      raise exception 'Invalid grade';
    end if;

    update public.student_profiles
      set grade = p_grade,
          birth_date = p_birth_date
      where user_id = current_user_id;

    if not found then
      for insert_attempt in 1..5 loop
        begin
          insert into public.student_profiles (
            user_id,
            grade,
            birth_date,
            student_code
          )
          values (
            current_user_id,
            p_grade,
            p_birth_date,
            private.generate_student_code()
          );
          exit;
        exception
          when unique_violation then
            if insert_attempt = 5 then
              raise;
            end if;
        end;
      end loop;
    end if;
  elsif p_grade is not null or p_birth_date is not null then
    raise exception 'Parent onboarding does not accept student fields';
  end if;

  update public.profiles
    set full_name = normalized_name,
        onboarding_completed = true
    where user_id = current_user_id;
end;
$$;

comment on function public.complete_onboarding(text, smallint, date) is
  'Completes only auth.uid() onboarding and never accepts or changes a role.';

revoke all on function public.complete_onboarding(text, smallint, date)
  from public;
revoke all on function public.complete_onboarding(text, smallint, date)
  from anon;
grant execute on function public.complete_onboarding(text, smallint, date)
  to authenticated;

alter table public.profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.learning_goals enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.student_profiles from anon;
revoke all on table public.learning_goals from anon;

revoke all on table public.profiles from authenticated;
revoke all on table public.student_profiles from authenticated;
revoke all on table public.learning_goals from authenticated;

grant select on table public.profiles to authenticated;
grant select on table public.student_profiles to authenticated;
grant select, insert, update, delete on table public.learning_goals
  to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (user_id = (select auth.uid()));

-- Profile mutation is intentionally available only through complete_onboarding().
drop policy if exists student_profiles_select_own on public.student_profiles;
create policy student_profiles_select_own
on public.student_profiles
for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles
    where profiles.user_id = (select auth.uid())
      and profiles.role = 'STUDENT'
  )
);

drop policy if exists learning_goals_select_own on public.learning_goals;
create policy learning_goals_select_own
on public.learning_goals
for select
to authenticated
using (
  student_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles
    where profiles.user_id = (select auth.uid())
      and profiles.role = 'STUDENT'
  )
);

drop policy if exists learning_goals_insert_own on public.learning_goals;
create policy learning_goals_insert_own
on public.learning_goals
for insert
to authenticated
with check (
  student_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles
    where profiles.user_id = (select auth.uid())
      and profiles.role = 'STUDENT'
  )
);

drop policy if exists learning_goals_update_own on public.learning_goals;
create policy learning_goals_update_own
on public.learning_goals
for update
to authenticated
using (student_id = (select auth.uid()))
with check (
  student_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles
    where profiles.user_id = (select auth.uid())
      and profiles.role = 'STUDENT'
  )
);

drop policy if exists learning_goals_delete_own on public.learning_goals;
create policy learning_goals_delete_own
on public.learning_goals
for delete
to authenticated
using (
  student_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles
    where profiles.user_id = (select auth.uid())
      and profiles.role = 'STUDENT'
  )
);

comment on table public.profiles is
  'Private application roles; clients cannot update roles directly.';
comment on table public.student_profiles is
  'Private student data. Parents receive no access before Sprint 1B.2 linking.';
comment on column public.student_profiles.birth_date is
  'Optional private data; never exposed by a public policy.';
comment on table public.learning_goals is
  'Student-owned goals protected by auth.uid()-scoped RLS.';
