begin;

create table public.parent_student_connections (
  id uuid primary key default extensions.gen_random_uuid(),
  parent_user_id uuid not null
    references public.profiles(user_id) on delete cascade,
  student_user_id uuid not null
    references public.student_profiles(user_id) on delete cascade,
  status text not null default 'PENDING'
    check (
      status in (
        'PENDING',
        'APPROVED',
        'REJECTED',
        'CANCELLED',
        'REVOKED'
      )
    ),
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parent_student_connections_distinct_users_check
    check (parent_user_id <> student_user_id),
  constraint parent_student_connections_lifecycle_check
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
        status = 'REVOKED'
        and responded_at is not null
        and responded_at >= requested_at
        and ended_at is not null
        and ended_at >= responded_at
      )
    )
);

create unique index parent_student_connections_one_active_pair_idx
on public.parent_student_connections (parent_user_id, student_user_id)
where status in ('PENDING', 'APPROVED');

create index parent_student_connections_parent_status_requested_idx
on public.parent_student_connections (
  parent_user_id,
  status,
  requested_at desc
);

create index parent_student_connections_student_status_requested_idx
on public.parent_student_connections (
  student_user_id,
  status,
  requested_at desc
);

-- Failed lookup records intentionally contain no student code or target data.
create table public.parent_student_lookup_failures (
  id bigint generated always as identity primary key,
  parent_user_id uuid not null
    references public.profiles(user_id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index parent_student_lookup_failures_parent_time_idx
on public.parent_student_lookup_failures (
  parent_user_id,
  attempted_at desc
);

create trigger parent_student_connections_set_updated_at
before update on public.parent_student_connections
for each row execute function private.set_updated_at();

create function private.require_connection_actor(
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
begin
  if v_current_user_id is null then
    raise exception 'Connection access unavailable';
  end if;

  select
    count(*),
    max(p.role),
    coalesce(bool_or(p.onboarding_completed), false)
  into
    v_profile_count,
    v_current_role,
    v_onboarding_completed
  from public.profiles as p
  where p.user_id = v_current_user_id;

  if
    v_profile_count <> 1
    or v_current_role not in ('STUDENT', 'PARENT')
    or not v_onboarding_completed
    or (
      p_expected_role is not null
      and v_current_role <> p_expected_role
    )
  then
    raise exception 'Connection access unavailable';
  end if;

  return v_current_user_id;
end;
$$;

create function private.mask_connection_name(p_full_name text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_normalized_name text;
  v_name_parts text[];
  v_part_count integer;
begin
  v_normalized_name := btrim(
    regexp_replace(coalesce(p_full_name, ''), '[[:space:]]+', ' ', 'g')
  );

  if v_normalized_name = '' then
    return 'Học sinh P***';
  end if;

  v_name_parts := regexp_split_to_array(v_normalized_name, '[[:space:]]+');
  v_part_count := coalesce(array_length(v_name_parts, 1), 0);

  if v_part_count <= 1 then
    return left(v_normalized_name, 1) || '***';
  end if;

  return
    v_name_parts[1]
    || ' '
    || left(v_name_parts[v_part_count], 1)
    || '***';
end;
$$;

create function private.resolve_student_code_for_parent(
  p_parent_user_id uuid,
  p_student_code text
)
returns table (
  student_user_id uuid,
  masked_student_name text,
  student_grade smallint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_normalized_code text;
  v_recent_failure_count bigint := 0;
  v_student_user_id uuid;
  v_masked_student_name text;
  v_student_grade smallint;
begin
  perform pg_advisory_xact_lock(
    hashtextextended('connection-lookup:' || p_parent_user_id::text, 0)
  );

  select count(*)
  into v_recent_failure_count
  from public.parent_student_lookup_failures as failure
  where
    failure.parent_user_id = p_parent_user_id
    and failure.attempted_at >= now() - interval '1 hour';

  if v_recent_failure_count >= 5 then
    return;
  end if;

  v_normalized_code := upper(btrim(coalesce(p_student_code, '')));

  if v_normalized_code !~ '^PLV-[0-9A-F]{12}$' then
    insert into public.parent_student_lookup_failures (parent_user_id)
    values (p_parent_user_id);
    return;
  end if;

  select
    sp.user_id,
    private.mask_connection_name(p.full_name),
    sp.grade
  into
    v_student_user_id,
    v_masked_student_name,
    v_student_grade
  from public.student_profiles as sp
  join public.profiles as p
    on p.user_id = sp.user_id
  where
    sp.student_code = v_normalized_code
    and p.role = 'STUDENT'
    and p.onboarding_completed
  limit 1;

  if
    v_student_user_id is null
    or v_student_user_id = p_parent_user_id
  then
    insert into public.parent_student_lookup_failures (parent_user_id)
    values (p_parent_user_id);
    return;
  end if;

  return query
  select
    v_student_user_id,
    v_masked_student_name,
    v_student_grade;
end;
$$;

create function private.enforce_parent_student_connection_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent_valid boolean := false;
  v_student_valid boolean := false;
begin
  if tg_op = 'INSERT' then
    select exists (
      select 1
      from public.profiles as parent_profile
      where
        parent_profile.user_id = new.parent_user_id
        and parent_profile.role = 'PARENT'
        and parent_profile.onboarding_completed
    )
    into v_parent_valid;

    select exists (
      select 1
      from public.profiles as student_profile
      join public.student_profiles as sp
        on sp.user_id = student_profile.user_id
      where
        student_profile.user_id = new.student_user_id
        and student_profile.role = 'STUDENT'
        and student_profile.onboarding_completed
    )
    into v_student_valid;

    if not v_parent_valid or not v_student_valid then
      raise exception 'Connection participants unavailable';
    end if;

    if new.status <> 'PENDING' then
      raise exception 'New connection must be pending';
    end if;

    return new;
  end if;

  if
    new.parent_user_id is distinct from old.parent_user_id
    or new.student_user_id is distinct from old.student_user_id
  then
    raise exception 'Connection participants cannot change';
  end if;

  if new.requested_at is distinct from old.requested_at then
    raise exception 'Connection request time cannot change';
  end if;

  if old.responded_at is not null
    and new.responded_at is distinct from old.responded_at
  then
    raise exception 'Connection response time cannot change';
  end if;

  if old.status = new.status then
    return new;
  end if;

  if old.status = 'PENDING'
    and new.status in ('APPROVED', 'REJECTED', 'CANCELLED')
  then
    return new;
  end if;

  if old.status = 'APPROVED' and new.status = 'REVOKED' then
    return new;
  end if;

  raise exception 'Invalid connection lifecycle transition';
end;
$$;

create trigger parent_student_connections_enforce_lifecycle
before insert or update on public.parent_student_connections
for each row
execute function private.enforce_parent_student_connection_lifecycle();

create function public.preview_student_connection(p_student_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent_user_id uuid;
  v_masked_student_name text;
  v_student_grade smallint;
begin
  v_parent_user_id := private.require_connection_actor('PARENT');

  select
    lookup.masked_student_name,
    lookup.student_grade
  into
    v_masked_student_name,
    v_student_grade
  from private.resolve_student_code_for_parent(
    v_parent_user_id,
    p_student_code
  ) as lookup
  limit 1;

  if v_masked_student_name is null or v_student_grade is null then
    return jsonb_build_object('found', false);
  end if;

  return jsonb_build_object(
    'found', true,
    'masked_student_name', v_masked_student_name,
    'grade', v_student_grade
  );
end;
$$;

create function public.send_parent_connection_request(p_student_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent_user_id uuid;
  v_student_user_id uuid;
  v_existing_status text;
begin
  v_parent_user_id := private.require_connection_actor('PARENT');

  select lookup.student_user_id
  into v_student_user_id
  from private.resolve_student_code_for_parent(
    v_parent_user_id,
    p_student_code
  ) as lookup
  limit 1;

  if v_student_user_id is null then
    return jsonb_build_object('created', false);
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'connection-pair:'
      || v_parent_user_id::text
      || ':'
      || v_student_user_id::text,
      0
    )
  );

  select connection.status
  into v_existing_status
  from public.parent_student_connections as connection
  where
    connection.parent_user_id = v_parent_user_id
    and connection.student_user_id = v_student_user_id
    and connection.status in ('PENDING', 'APPROVED')
  limit 1;

  if v_existing_status is not null then
    return jsonb_build_object(
      'created', true,
      'status', v_existing_status
    );
  end if;

  insert into public.parent_student_connections (
    parent_user_id,
    student_user_id
  )
  values (
    v_parent_user_id,
    v_student_user_id
  );

  return jsonb_build_object(
    'created', true,
    'status', 'PENDING'
  );
end;
$$;

create function public.get_my_parent_student_connections()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_current_user_id uuid;
  v_current_role text;
  v_connections jsonb := '[]'::jsonb;
begin
  v_current_user_id := private.require_connection_actor(null);

  select p.role
  into v_current_role
  from public.profiles as p
  where p.user_id = v_current_user_id;

  if v_current_role = 'PARENT' then
    select coalesce(
      jsonb_agg(parent_items.item order by parent_items.requested_at desc),
      '[]'::jsonb
    )
    into v_connections
    from (
      select
        connection.requested_at,
        jsonb_build_object(
          'connection_id', connection.id,
          'status', connection.status,
          'display_name', private.mask_connection_name(student_profile.full_name),
          'grade', sp.grade,
          'requested_at', connection.requested_at,
          'responded_at', connection.responded_at
        ) as item
      from public.parent_student_connections as connection
      join public.profiles as student_profile
        on student_profile.user_id = connection.student_user_id
      join public.student_profiles as sp
        on sp.user_id = connection.student_user_id
      where
        connection.parent_user_id = v_current_user_id
        and connection.status in ('PENDING', 'APPROVED')
    ) as parent_items;
  else
    select coalesce(
      jsonb_agg(student_items.item order by student_items.requested_at desc),
      '[]'::jsonb
    )
    into v_connections
    from (
      select
        connection.requested_at,
        jsonb_build_object(
          'connection_id', connection.id,
          'status', connection.status,
          'display_name', parent_profile.full_name,
          'grade', null,
          'requested_at', connection.requested_at,
          'responded_at', connection.responded_at
        ) as item
      from public.parent_student_connections as connection
      join public.profiles as parent_profile
        on parent_profile.user_id = connection.parent_user_id
      where
        connection.student_user_id = v_current_user_id
        and connection.status in ('PENDING', 'APPROVED')
    ) as student_items;
  end if;

  return jsonb_build_object(
    'viewer_role', v_current_role,
    'connections', v_connections
  );
end;
$$;

create function public.respond_parent_connection_request(
  p_connection_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_user_id uuid;
  v_target_status text;
  v_affected_count bigint := 0;
  v_current_status text;
begin
  v_student_user_id := private.require_connection_actor('STUDENT');
  v_target_status := upper(btrim(coalesce(p_decision, '')));

  if v_target_status not in ('APPROVED', 'REJECTED') then
    raise exception 'Invalid connection decision';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('connection:' || p_connection_id::text, 0)
  );

  update public.parent_student_connections as connection
  set
    status = v_target_status,
    responded_at = now(),
    ended_at = null
  where
    connection.id = p_connection_id
    and connection.student_user_id = v_student_user_id
    and connection.status = 'PENDING';

  get diagnostics v_affected_count = row_count;

  if v_affected_count = 1 then
    return jsonb_build_object('status', v_target_status);
  end if;

  select connection.status
  into v_current_status
  from public.parent_student_connections as connection
  where
    connection.id = p_connection_id
    and connection.student_user_id = v_student_user_id;

  if v_current_status = v_target_status then
    return jsonb_build_object('status', v_target_status);
  end if;

  raise exception 'Connection state unavailable';
end;
$$;

create function public.cancel_parent_connection_request(
  p_connection_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent_user_id uuid;
  v_affected_count bigint := 0;
  v_current_status text;
begin
  v_parent_user_id := private.require_connection_actor('PARENT');

  perform pg_advisory_xact_lock(
    hashtextextended('connection:' || p_connection_id::text, 0)
  );

  update public.parent_student_connections as connection
  set
    status = 'CANCELLED',
    ended_at = now()
  where
    connection.id = p_connection_id
    and connection.parent_user_id = v_parent_user_id
    and connection.status = 'PENDING';

  get diagnostics v_affected_count = row_count;

  if v_affected_count = 1 then
    return jsonb_build_object('status', 'CANCELLED');
  end if;

  select connection.status
  into v_current_status
  from public.parent_student_connections as connection
  where
    connection.id = p_connection_id
    and connection.parent_user_id = v_parent_user_id;

  if v_current_status = 'CANCELLED' then
    return jsonb_build_object('status', 'CANCELLED');
  end if;

  raise exception 'Connection state unavailable';
end;
$$;

create function public.revoke_parent_student_connection(
  p_connection_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid;
  v_affected_count bigint := 0;
  v_current_status text;
begin
  v_current_user_id := private.require_connection_actor(null);

  perform pg_advisory_xact_lock(
    hashtextextended('connection:' || p_connection_id::text, 0)
  );

  update public.parent_student_connections as connection
  set
    status = 'REVOKED',
    ended_at = now()
  where
    connection.id = p_connection_id
    and (
      connection.parent_user_id = v_current_user_id
      or connection.student_user_id = v_current_user_id
    )
    and connection.status = 'APPROVED';

  get diagnostics v_affected_count = row_count;

  if v_affected_count = 1 then
    return jsonb_build_object('status', 'REVOKED');
  end if;

  select connection.status
  into v_current_status
  from public.parent_student_connections as connection
  where
    connection.id = p_connection_id
    and (
      connection.parent_user_id = v_current_user_id
      or connection.student_user_id = v_current_user_id
    );

  if v_current_status = 'REVOKED' then
    return jsonb_build_object('status', 'REVOKED');
  end if;

  raise exception 'Connection state unavailable';
end;
$$;

alter table public.parent_student_connections enable row level security;
alter table public.parent_student_lookup_failures enable row level security;

revoke all on table public.parent_student_connections from public;
revoke all on table public.parent_student_connections from anon;
revoke all on table public.parent_student_connections from authenticated;
revoke all on table public.parent_student_lookup_failures from public;
revoke all on table public.parent_student_lookup_failures from anon;
revoke all on table public.parent_student_lookup_failures from authenticated;

revoke all on function private.require_connection_actor(text) from public;
revoke all on function private.require_connection_actor(text) from anon;
revoke all on function private.require_connection_actor(text)
  from authenticated;
revoke all on function private.mask_connection_name(text) from public;
revoke all on function private.mask_connection_name(text) from anon;
revoke all on function private.mask_connection_name(text)
  from authenticated;
revoke all on function private.resolve_student_code_for_parent(uuid, text)
  from public;
revoke all on function private.resolve_student_code_for_parent(uuid, text)
  from anon;
revoke all on function private.resolve_student_code_for_parent(uuid, text)
  from authenticated;
revoke all on function private.enforce_parent_student_connection_lifecycle()
  from public;
revoke all on function private.enforce_parent_student_connection_lifecycle()
  from anon;
revoke all on function private.enforce_parent_student_connection_lifecycle()
  from authenticated;

revoke all on function public.preview_student_connection(text) from public;
revoke all on function public.preview_student_connection(text) from anon;
revoke all on function public.preview_student_connection(text)
  from authenticated;
grant execute on function public.preview_student_connection(text)
  to authenticated;

revoke all on function public.send_parent_connection_request(text)
  from public;
revoke all on function public.send_parent_connection_request(text) from anon;
revoke all on function public.send_parent_connection_request(text)
  from authenticated;
grant execute on function public.send_parent_connection_request(text)
  to authenticated;

revoke all on function public.get_my_parent_student_connections()
  from public;
revoke all on function public.get_my_parent_student_connections() from anon;
revoke all on function public.get_my_parent_student_connections()
  from authenticated;
grant execute on function public.get_my_parent_student_connections()
  to authenticated;

revoke all on function public.respond_parent_connection_request(uuid, text)
  from public;
revoke all on function public.respond_parent_connection_request(uuid, text)
  from anon;
revoke all on function public.respond_parent_connection_request(uuid, text)
  from authenticated;
grant execute on function public.respond_parent_connection_request(uuid, text)
  to authenticated;

revoke all on function public.cancel_parent_connection_request(uuid)
  from public;
revoke all on function public.cancel_parent_connection_request(uuid)
  from anon;
revoke all on function public.cancel_parent_connection_request(uuid)
  from authenticated;
grant execute on function public.cancel_parent_connection_request(uuid)
  to authenticated;

revoke all on function public.revoke_parent_student_connection(uuid)
  from public;
revoke all on function public.revoke_parent_student_connection(uuid)
  from anon;
revoke all on function public.revoke_parent_student_connection(uuid)
  from authenticated;
grant execute on function public.revoke_parent_student_connection(uuid)
  to authenticated;

comment on table public.parent_student_connections is
  'Consent-based Parent-Student connection history. Learning data access is intentionally unchanged.';
comment on table public.parent_student_lookup_failures is
  'Per-Parent failed lookup timestamps for a five-per-hour anti-enumeration limit; no student code is stored.';
comment on function public.preview_student_connection(text) is
  'Returns only a masked Student name and grade after a rate-limited exact-code lookup.';
comment on function public.get_my_parent_student_connections() is
  'Returns active connection summaries without user IDs, email, birth date, student code, or learning data.';

do $validation$
declare
  v_public_function_count integer := 0;
  v_security_definer_count integer := 0;
  v_safe_search_path_count integer := 0;
  v_active_index_count integer := 0;
  v_lifecycle_trigger_count integer := 0;
begin
  if not exists (
    select 1
    from pg_catalog.pg_class as relation
    where
      relation.oid = 'public.parent_student_connections'::regclass
      and relation.relrowsecurity
  ) or not exists (
    select 1
    from pg_catalog.pg_class as relation
    where
      relation.oid = 'public.parent_student_lookup_failures'::regclass
      and relation.relrowsecurity
  ) then
    raise exception 'connection RLS validation failed';
  end if;

  select count(*)
  into v_active_index_count
  from pg_catalog.pg_index as index_definition
  join pg_catalog.pg_class as index_relation
    on index_relation.oid = index_definition.indexrelid
  where
    index_definition.indrelid =
      'public.parent_student_connections'::regclass
    and index_relation.relname =
      'parent_student_connections_one_active_pair_idx'
    and index_definition.indisunique
    and index_definition.indpred is not null;

  if v_active_index_count <> 1 then
    raise exception 'active connection uniqueness validation failed';
  end if;

  select count(*)
  into v_lifecycle_trigger_count
  from pg_catalog.pg_trigger as trigger_definition
  where
    trigger_definition.tgrelid =
      'public.parent_student_connections'::regclass
    and trigger_definition.tgname =
      'parent_student_connections_enforce_lifecycle'
    and not trigger_definition.tgisinternal
    and trigger_definition.tgenabled <> 'D';

  if v_lifecycle_trigger_count <> 1 then
    raise exception 'connection lifecycle trigger validation failed';
  end if;

  select
    count(*),
    count(*) filter (where function_definition.prosecdef),
    count(*) filter (
      where coalesce(
        function_definition.proconfig,
        array[]::text[]
      ) @> array['search_path=""']::text[]
    )
  into
    v_public_function_count,
    v_security_definer_count,
    v_safe_search_path_count
  from pg_catalog.pg_proc as function_definition
  where
    function_definition.pronamespace = 'public'::regnamespace
    and function_definition.proname in (
      'preview_student_connection',
      'send_parent_connection_request',
      'get_my_parent_student_connections',
      'respond_parent_connection_request',
      'cancel_parent_connection_request',
      'revoke_parent_student_connection'
    );

  if
    v_public_function_count <> 6
    or v_security_definer_count <> 6
    or v_safe_search_path_count <> 6
  then
    raise exception 'public connection function validation failed';
  end if;

  if
    not has_function_privilege(
      'authenticated',
      'public.preview_student_connection(text)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.send_parent_connection_request(text)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.get_my_parent_student_connections()',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.respond_parent_connection_request(uuid,text)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.cancel_parent_connection_request(uuid)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.revoke_parent_student_connection(uuid)',
      'EXECUTE'
    )
  then
    raise exception 'authenticated connection execute validation failed';
  end if;

  if
    has_table_privilege(
      'authenticated',
      'public.parent_student_connections',
      'SELECT'
    )
    or has_table_privilege(
      'authenticated',
      'public.parent_student_connections',
      'INSERT'
    )
    or has_table_privilege(
      'authenticated',
      'public.parent_student_connections',
      'UPDATE'
    )
    or has_table_privilege(
      'authenticated',
      'public.parent_student_connections',
      'DELETE'
    )
    or has_table_privilege(
      'authenticated',
      'public.parent_student_lookup_failures',
      'SELECT'
    )
  then
    raise exception 'direct connection table privilege detected';
  end if;

  if exists (
    select 1
    from public.parent_student_connections as connection
    where
      connection.status in ('PENDING', 'APPROVED')
    group by
      connection.parent_user_id,
      connection.student_user_id
    having count(*) > 1
  ) then
    raise exception 'duplicate active connection detected';
  end if;
end;
$validation$;

commit;
