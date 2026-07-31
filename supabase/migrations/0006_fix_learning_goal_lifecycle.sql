begin;

alter table public.learning_goals
  add column completed_at timestamptz,
  add column archived_at timestamptz;

-- Legacy ARCHIVED rows have no completion evidence. Restore them conservatively
-- instead of inventing a completion timestamp.
update public.learning_goals as lg
set
  status = 'ACTIVE',
  completed_at = null,
  archived_at = null
where lg.status = 'ARCHIVED';

-- Preserve legacy COMPLETED rows using the most recent timestamp already stored
-- on the row. No completed Student goal is moved back to ACTIVE.
update public.learning_goals as lg
set
  completed_at = lg.updated_at,
  archived_at = null
where lg.status = 'COMPLETED';

alter table public.learning_goals
  add constraint learning_goals_lifecycle_check
  check (
    (
      status = 'ACTIVE'
      and completed_at is null
      and archived_at is null
    )
    or (
      status = 'COMPLETED'
      and completed_at is not null
      and archived_at is null
    )
    or (
      status = 'ARCHIVED'
      and completed_at is not null
      and archived_at is not null
      and archived_at >= completed_at
    )
  );

create function private.enforce_learning_goal_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.student_id is distinct from old.student_id then
    raise exception 'Goal owner cannot change';
  end if;

  if
    old.completed_at is not null
    and new.completed_at is distinct from old.completed_at
  then
    raise exception 'Goal completion timestamp cannot change';
  end if;

  if old.status = new.status then
    return new;
  end if;

  if old.status = 'ACTIVE' and new.status = 'COMPLETED' then
    return new;
  end if;

  if old.status = 'COMPLETED' and new.status = 'ARCHIVED' then
    return new;
  end if;

  if old.status = 'ARCHIVED' and new.status = 'COMPLETED' then
    return new;
  end if;

  raise exception 'Invalid goal lifecycle transition';
end;
$$;

revoke all on function private.enforce_learning_goal_lifecycle() from public;
revoke all on function private.enforce_learning_goal_lifecycle() from anon;
revoke all on function private.enforce_learning_goal_lifecycle()
  from authenticated;

create trigger learning_goals_enforce_lifecycle
before update on public.learning_goals
for each row execute function private.enforce_learning_goal_lifecycle();

comment on function private.enforce_learning_goal_lifecycle() is
  'Allows ACTIVE to COMPLETED, COMPLETED to ARCHIVED, and ARCHIVED to COMPLETED while preserving owner and completion time.';
comment on column public.learning_goals.completed_at is
  'First completion time; immutable after completion.';
comment on column public.learning_goals.archived_at is
  'Archive time; present only after a completed goal is archived.';

do $validation$
declare
  v_lifecycle_constraint_count integer;
  v_lifecycle_trigger_count integer;
begin
  if not exists (
    select 1
    from pg_catalog.pg_attribute as a
    where
      a.attrelid = 'public.learning_goals'::regclass
      and a.attname = 'completed_at'
      and a.atttypid = 'timestamptz'::regtype
      and not a.attisdropped
  ) then
    raise exception 'completed_at column validation failed';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_attribute as a
    where
      a.attrelid = 'public.learning_goals'::regclass
      and a.attname = 'archived_at'
      and a.atttypid = 'timestamptz'::regtype
      and not a.attisdropped
  ) then
    raise exception 'archived_at column validation failed';
  end if;

  if exists (
    select 1
    from public.learning_goals as lg
    where
      (
        lg.status = 'ACTIVE'
        and (
          lg.completed_at is not null
          or lg.archived_at is not null
        )
      )
      or (
        lg.status = 'COMPLETED'
        and (
          lg.completed_at is null
          or lg.archived_at is not null
        )
      )
      or (
        lg.status = 'ARCHIVED'
        and (
          lg.completed_at is null
          or lg.archived_at is null
          or lg.archived_at < lg.completed_at
        )
      )
  ) then
    raise exception 'inconsistent learning goal lifecycle data detected';
  end if;

  if exists (
    select 1
    from public.learning_goals as lg
    where
      lg.archived_at is not null
      and lg.completed_at is null
  ) then
    raise exception 'archived goal without completion detected';
  end if;

  -- All legacy ARCHIVED rows lacked completion evidence and must have been
  -- restored before any new archive transition can occur.
  if exists (
    select 1
    from public.learning_goals as lg
    where lg.status = 'ARCHIVED'
  ) then
    raise exception 'legacy archived goal restoration validation failed';
  end if;

  select count(*)
  into v_lifecycle_constraint_count
  from pg_catalog.pg_constraint as c
  where
    c.conrelid = 'public.learning_goals'::regclass
    and c.conname = 'learning_goals_lifecycle_check'
    and c.contype = 'c'
    and c.convalidated;

  if v_lifecycle_constraint_count <> 1 then
    raise exception 'learning goal lifecycle constraint validation failed';
  end if;

  select count(*)
  into v_lifecycle_trigger_count
  from pg_catalog.pg_trigger as t
  where
    t.tgrelid = 'public.learning_goals'::regclass
    and t.tgname = 'learning_goals_enforce_lifecycle'
    and not t.tgisinternal
    and t.tgenabled <> 'D'
    and t.tgfoid =
      'private.enforce_learning_goal_lifecycle()'::regprocedure;

  if v_lifecycle_trigger_count <> 1 then
    raise exception 'learning goal lifecycle trigger validation failed';
  end if;
end;
$validation$;

commit;
