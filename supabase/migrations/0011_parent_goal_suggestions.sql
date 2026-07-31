begin;

create table public.parent_goal_suggestions (
  id uuid primary key default extensions.gen_random_uuid(),
  connection_id uuid not null
    references public.parent_student_connections(id) on delete restrict,
  parent_user_id uuid not null
    references public.profiles(user_id) on delete restrict,
  student_user_id uuid not null
    references public.student_profiles(user_id) on delete restrict,
  kind text not null
    check (kind in ('NEW_GOAL', 'EXISTING_GOAL_COMMENT')),
  goal_id uuid
    references public.learning_goals(id) on delete restrict,
  proposed_title text,
  proposed_target_date date,
  message text,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN')),
  accepted_goal_id uuid
    references public.learning_goals(id) on delete restrict,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  withdrawn_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint parent_goal_suggestions_participants_check
    check (parent_user_id <> student_user_id),
  constraint parent_goal_suggestions_message_check
    check (
      message is null
      or (
        message = btrim(message)
        and char_length(message) between 2 and 300
      )
    ),
  constraint parent_goal_suggestions_kind_shape_check
    check (
      (
        kind = 'NEW_GOAL'
        and goal_id is null
        and proposed_title is not null
        and proposed_title = btrim(proposed_title)
        and char_length(proposed_title) between 3 and 120
      )
      or (
        kind = 'EXISTING_GOAL_COMMENT'
        and goal_id is not null
        and proposed_title is null
        and proposed_target_date is null
        and message is not null
      )
    ),
  constraint parent_goal_suggestions_lifecycle_check
    check (
      (
        status = 'PENDING'
        and responded_at is null
        and withdrawn_at is null
        and accepted_goal_id is null
      )
      or (
        status = 'ACCEPTED'
        and responded_at is not null
        and responded_at >= created_at
        and withdrawn_at is null
        and (
          (
            kind = 'NEW_GOAL'
            and accepted_goal_id is not null
          )
          or (
            kind = 'EXISTING_GOAL_COMMENT'
            and accepted_goal_id is null
          )
        )
      )
      or (
        status = 'DECLINED'
        and responded_at is not null
        and responded_at >= created_at
        and withdrawn_at is null
        and accepted_goal_id is null
      )
      or (
        status = 'WITHDRAWN'
        and responded_at is null
        and withdrawn_at is not null
        and withdrawn_at >= created_at
        and accepted_goal_id is null
      )
    )
);

create unique index parent_goal_suggestions_one_pending_target_idx
on public.parent_goal_suggestions (
  connection_id,
  kind,
  coalesce(
    goal_id,
    '00000000-0000-0000-0000-000000000000'::uuid
  )
)
where status = 'PENDING';

create index parent_goal_suggestions_parent_connection_created_idx
on public.parent_goal_suggestions (
  parent_user_id,
  connection_id,
  created_at desc
);

create index parent_goal_suggestions_student_status_created_idx
on public.parent_goal_suggestions (
  student_user_id,
  status,
  created_at desc
);

create trigger parent_goal_suggestions_set_updated_at
before update on public.parent_goal_suggestions
for each row execute function private.set_updated_at();

create function private.enforce_parent_goal_suggestion_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection_valid boolean := false;
  v_goal_valid boolean := false;
begin
  if tg_op = 'INSERT' then
    select exists (
      select 1
      from public.parent_student_connections as connection
      where
        connection.id = new.connection_id
        and connection.parent_user_id = new.parent_user_id
        and connection.student_user_id = new.student_user_id
        and connection.status = 'APPROVED'
    )
    into v_connection_valid;

    if not v_connection_valid then
      raise exception 'Goal suggestion unavailable';
    end if;

    if new.kind = 'EXISTING_GOAL_COMMENT' then
      select exists (
        select 1
        from public.learning_goals as goal
        where
          goal.id = new.goal_id
          and goal.student_id = new.student_user_id
          and goal.status = 'ACTIVE'
      )
      into v_goal_valid;

      if not v_goal_valid then
        raise exception 'Goal suggestion unavailable';
      end if;
    end if;

    if new.status <> 'PENDING' then
      raise exception 'New goal suggestion must be pending';
    end if;

    return new;
  end if;

  if
    new.connection_id is distinct from old.connection_id
    or new.parent_user_id is distinct from old.parent_user_id
    or new.student_user_id is distinct from old.student_user_id
    or new.kind is distinct from old.kind
    or new.goal_id is distinct from old.goal_id
    or new.proposed_title is distinct from old.proposed_title
    or new.proposed_target_date is distinct from old.proposed_target_date
    or new.message is distinct from old.message
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Goal suggestion content cannot change';
  end if;

  if old.status <> 'PENDING' then
    if
      new.status is distinct from old.status
      or new.responded_at is distinct from old.responded_at
      or new.withdrawn_at is distinct from old.withdrawn_at
      or new.accepted_goal_id is distinct from old.accepted_goal_id
    then
      raise exception 'Goal suggestion decision cannot change';
    end if;

    return new;
  end if;

  if new.status in ('ACCEPTED', 'DECLINED', 'WITHDRAWN') then
    return new;
  end if;

  if new.status = old.status then
    return new;
  end if;

  raise exception 'Invalid goal suggestion lifecycle transition';
end;
$$;

revoke all
on function private.enforce_parent_goal_suggestion_lifecycle()
from public;
revoke all
on function private.enforce_parent_goal_suggestion_lifecycle()
from anon;
revoke all
on function private.enforce_parent_goal_suggestion_lifecycle()
from authenticated;

create trigger parent_goal_suggestions_enforce_lifecycle
before insert or update on public.parent_goal_suggestions
for each row
execute function private.enforce_parent_goal_suggestion_lifecycle();

create function private.build_parent_goal_suggestion_item(
  p_suggestion_id uuid,
  p_include_accepted_goal boolean
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'suggestion_id', suggestion.id,
    'kind', suggestion.kind,
    'goal_id', suggestion.goal_id,
    'goal_title', existing_goal.title,
    'proposed_title', suggestion.proposed_title,
    'proposed_target_date', suggestion.proposed_target_date,
    'message', suggestion.message,
    'status', suggestion.status,
    'created_at', suggestion.created_at,
    'responded_at', suggestion.responded_at,
    'withdrawn_at', suggestion.withdrawn_at,
    'accepted_goal', case
      when p_include_accepted_goal and accepted_goal.id is not null
      then jsonb_build_object(
        'id', accepted_goal.id,
        'title', accepted_goal.title,
        'target_count', accepted_goal.target_count,
        'target_date', accepted_goal.target_date,
        'status', accepted_goal.status,
        'created_at', accepted_goal.created_at,
        'completed_at', accepted_goal.completed_at,
        'archived_at', accepted_goal.archived_at
      )
      else null
    end
  )
  from public.parent_goal_suggestions as suggestion
  left join public.learning_goals as existing_goal
    on existing_goal.id = suggestion.goal_id
  left join public.learning_goals as accepted_goal
    on accepted_goal.id = suggestion.accepted_goal_id
  where suggestion.id = p_suggestion_id
$$;

revoke all
on function private.build_parent_goal_suggestion_item(uuid, boolean)
from public;
revoke all
on function private.build_parent_goal_suggestion_item(uuid, boolean)
from anon;
revoke all
on function private.build_parent_goal_suggestion_item(uuid, boolean)
from authenticated;

create function public.get_parent_goal_suggestion_context(
  p_connection_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_parent_user_id uuid;
  v_student_user_id uuid;
  v_active_goals jsonb := '[]'::jsonb;
  v_suggestions jsonb := '[]'::jsonb;
begin
  v_parent_user_id := private.require_connection_actor('PARENT');

  select connection.student_user_id
  into v_student_user_id
  from public.parent_student_connections as connection
  where
    connection.id = p_connection_id
    and connection.parent_user_id = v_parent_user_id
    and connection.status = 'APPROVED';

  if v_student_user_id is null then
    raise exception 'Goal suggestion context unavailable';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'goal_id', goal.id,
        'title', goal.title,
        'target_date', goal.target_date
      )
      order by goal.created_at desc, goal.id desc
    ),
    '[]'::jsonb
  )
  into v_active_goals
  from public.learning_goals as goal
  where
    goal.student_id = v_student_user_id
    and goal.status = 'ACTIVE';

  select coalesce(
    jsonb_agg(
      private.build_parent_goal_suggestion_item(
        suggestion.id,
        false
      )
      order by suggestion.created_at desc, suggestion.id desc
    ),
    '[]'::jsonb
  )
  into v_suggestions
  from public.parent_goal_suggestions as suggestion
  where
    suggestion.connection_id = p_connection_id
    and suggestion.parent_user_id = v_parent_user_id
    and suggestion.student_user_id = v_student_user_id;

  return jsonb_build_object(
    'active_goals', v_active_goals,
    'suggestions', v_suggestions
  );
end;
$$;

create function public.send_parent_goal_suggestion(
  p_connection_id uuid,
  p_kind text,
  p_goal_id uuid,
  p_proposed_title text,
  p_proposed_target_date date,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent_user_id uuid;
  v_student_user_id uuid;
  v_kind text;
  v_goal_id uuid;
  v_proposed_title text;
  v_message text;
  v_existing_id uuid;
  v_existing_title text;
  v_existing_target_date date;
  v_existing_message text;
  v_suggestion_id uuid;
begin
  v_parent_user_id := private.require_connection_actor('PARENT');

  select connection.student_user_id
  into v_student_user_id
  from public.parent_student_connections as connection
  where
    connection.id = p_connection_id
    and connection.parent_user_id = v_parent_user_id
    and connection.status = 'APPROVED';

  if v_student_user_id is null then
    raise exception 'Goal suggestion unavailable';
  end if;

  v_kind := upper(btrim(coalesce(p_kind, '')));
  v_goal_id := p_goal_id;
  v_proposed_title := nullif(
    regexp_replace(
      btrim(coalesce(p_proposed_title, '')),
      '[[:space:]]+',
      ' ',
      'g'
    ),
    ''
  );
  v_message := nullif(
    regexp_replace(
      btrim(coalesce(p_message, '')),
      '[[:space:]]+',
      ' ',
      'g'
    ),
    ''
  );

  if v_kind = 'NEW_GOAL' then
    if
      v_goal_id is not null
      or v_proposed_title is null
      or char_length(v_proposed_title) not between 3 and 120
      or (
        v_message is not null
        and char_length(v_message) not between 2 and 300
      )
      or (
        p_proposed_target_date is not null
        and p_proposed_target_date <
          (now() at time zone 'Asia/Ho_Chi_Minh')::date
      )
    then
      raise exception 'Invalid goal suggestion';
    end if;
  elsif v_kind = 'EXISTING_GOAL_COMMENT' then
    if
      v_goal_id is null
      or v_proposed_title is not null
      or p_proposed_target_date is not null
      or v_message is null
      or char_length(v_message) not between 2 and 300
      or not exists (
        select 1
        from public.learning_goals as goal
        where
          goal.id = v_goal_id
          and goal.student_id = v_student_user_id
          and goal.status = 'ACTIVE'
      )
    then
      raise exception 'Invalid goal suggestion';
    end if;
  else
    raise exception 'Invalid goal suggestion';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'goal-suggestion-target:'
      || p_connection_id::text
      || ':'
      || v_kind
      || ':'
      || coalesce(v_goal_id::text, 'new'),
      0
    )
  );

  select
    suggestion.id,
    suggestion.proposed_title,
    suggestion.proposed_target_date,
    suggestion.message
  into
    v_existing_id,
    v_existing_title,
    v_existing_target_date,
    v_existing_message
  from public.parent_goal_suggestions as suggestion
  where
    suggestion.connection_id = p_connection_id
    and suggestion.parent_user_id = v_parent_user_id
    and suggestion.student_user_id = v_student_user_id
    and suggestion.kind = v_kind
    and suggestion.goal_id is not distinct from v_goal_id
    and suggestion.status = 'PENDING'
  limit 1;

  if v_existing_id is not null then
    if
      v_existing_title is not distinct from v_proposed_title
      and v_existing_target_date is not distinct from p_proposed_target_date
      and v_existing_message is not distinct from v_message
    then
      return private.build_parent_goal_suggestion_item(
        v_existing_id,
        false
      );
    end if;

    raise exception 'Pending goal suggestion already exists';
  end if;

  insert into public.parent_goal_suggestions (
    connection_id,
    parent_user_id,
    student_user_id,
    kind,
    goal_id,
    proposed_title,
    proposed_target_date,
    message
  )
  values (
    p_connection_id,
    v_parent_user_id,
    v_student_user_id,
    v_kind,
    v_goal_id,
    v_proposed_title,
    p_proposed_target_date,
    v_message
  )
  returning id into v_suggestion_id;

  return private.build_parent_goal_suggestion_item(
    v_suggestion_id,
    false
  );
end;
$$;

create function public.withdraw_parent_goal_suggestion(
  p_suggestion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent_user_id uuid;
  v_connection_id uuid;
  v_status text;
  v_affected_count bigint := 0;
begin
  v_parent_user_id := private.require_connection_actor('PARENT');

  perform pg_advisory_xact_lock(
    hashtextextended(
      'goal-suggestion:' || p_suggestion_id::text,
      0
    )
  );

  select
    suggestion.connection_id,
    suggestion.status
  into
    v_connection_id,
    v_status
  from public.parent_goal_suggestions as suggestion
  where
    suggestion.id = p_suggestion_id
    and suggestion.parent_user_id = v_parent_user_id;

  if
    v_connection_id is null
    or not exists (
      select 1
      from public.parent_student_connections as connection
      where
        connection.id = v_connection_id
        and connection.parent_user_id = v_parent_user_id
        and connection.status = 'APPROVED'
    )
  then
    raise exception 'Goal suggestion unavailable';
  end if;

  if v_status = 'WITHDRAWN' then
    return private.build_parent_goal_suggestion_item(
      p_suggestion_id,
      false
    );
  end if;

  if v_status <> 'PENDING' then
    raise exception 'Goal suggestion state conflict';
  end if;

  update public.parent_goal_suggestions as suggestion
  set
    status = 'WITHDRAWN',
    withdrawn_at = now()
  where
    suggestion.id = p_suggestion_id
    and suggestion.parent_user_id = v_parent_user_id
    and suggestion.status = 'PENDING';

  get diagnostics v_affected_count = row_count;
  if v_affected_count <> 1 then
    raise exception 'Goal suggestion state conflict';
  end if;

  return private.build_parent_goal_suggestion_item(
    p_suggestion_id,
    false
  );
end;
$$;

create function public.get_my_parent_goal_suggestions()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_student_user_id uuid;
  v_suggestions jsonb := '[]'::jsonb;
begin
  v_student_user_id := private.require_connection_actor('STUDENT');

  select coalesce(
    jsonb_agg(
      private.build_parent_goal_suggestion_item(
        suggestion.id,
        true
      )
      || jsonb_build_object(
        'parent_display_name',
        coalesce(parent_profile.full_name, 'Phụ huynh'),
        'connection_active',
        connection.status = 'APPROVED'
      )
      order by suggestion.created_at desc, suggestion.id desc
    ),
    '[]'::jsonb
  )
  into v_suggestions
  from public.parent_goal_suggestions as suggestion
  join public.parent_student_connections as connection
    on connection.id = suggestion.connection_id
  join public.profiles as parent_profile
    on parent_profile.user_id = suggestion.parent_user_id
  where suggestion.student_user_id = v_student_user_id;

  return jsonb_build_object('suggestions', v_suggestions);
end;
$$;

create function public.respond_parent_goal_suggestion(
  p_suggestion_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_user_id uuid;
  v_connection_id uuid;
  v_kind text;
  v_goal_id uuid;
  v_proposed_title text;
  v_proposed_target_date date;
  v_status text;
  v_target_status text;
  v_accepted_goal_id uuid;
  v_active_goal_count bigint := 0;
  v_affected_count bigint := 0;
begin
  v_student_user_id := private.require_connection_actor('STUDENT');
  v_target_status := upper(btrim(coalesce(p_decision, '')));

  if v_target_status not in ('ACCEPTED', 'DECLINED') then
    raise exception 'Invalid goal suggestion decision';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'goal-suggestion:' || p_suggestion_id::text,
      0
    )
  );

  select
    suggestion.connection_id,
    suggestion.kind,
    suggestion.goal_id,
    suggestion.proposed_title,
    suggestion.proposed_target_date,
    suggestion.status,
    suggestion.accepted_goal_id
  into
    v_connection_id,
    v_kind,
    v_goal_id,
    v_proposed_title,
    v_proposed_target_date,
    v_status,
    v_accepted_goal_id
  from public.parent_goal_suggestions as suggestion
  where
    suggestion.id = p_suggestion_id
    and suggestion.student_user_id = v_student_user_id;

  if
    v_connection_id is null
    or not exists (
      select 1
      from public.parent_student_connections as connection
      where
        connection.id = v_connection_id
        and connection.student_user_id = v_student_user_id
        and connection.status = 'APPROVED'
    )
  then
    raise exception 'Goal suggestion unavailable';
  end if;

  if v_status = v_target_status then
    return private.build_parent_goal_suggestion_item(
      p_suggestion_id,
      true
    );
  end if;

  if v_status <> 'PENDING' then
    raise exception 'Goal suggestion state conflict';
  end if;

  if v_target_status = 'DECLINED' then
    update public.parent_goal_suggestions as suggestion
    set
      status = 'DECLINED',
      responded_at = now()
    where
      suggestion.id = p_suggestion_id
      and suggestion.student_user_id = v_student_user_id
      and suggestion.status = 'PENDING';

    get diagnostics v_affected_count = row_count;
    if v_affected_count <> 1 then
      raise exception 'Goal suggestion state conflict';
    end if;

    return private.build_parent_goal_suggestion_item(
      p_suggestion_id,
      true
    );
  end if;

  if v_kind = 'NEW_GOAL' then
    perform pg_advisory_xact_lock(
      hashtextextended(
        'student-goals:' || v_student_user_id::text,
        0
      )
    );

    select count(*)
    into v_active_goal_count
    from public.learning_goals as goal
    where
      goal.student_id = v_student_user_id
      and goal.status = 'ACTIVE';

    if v_active_goal_count >= 10 then
      raise exception 'Active goal limit reached';
    end if;

    insert into public.learning_goals (
      student_id,
      title,
      target_count,
      target_date,
      status
    )
    values (
      v_student_user_id,
      v_proposed_title,
      1,
      v_proposed_target_date,
      'ACTIVE'
    )
    returning id into v_accepted_goal_id;
  elsif
    v_kind = 'EXISTING_GOAL_COMMENT'
    and not exists (
      select 1
      from public.learning_goals as goal
      where
        goal.id = v_goal_id
        and goal.student_id = v_student_user_id
        and goal.status = 'ACTIVE'
    )
  then
    raise exception 'Goal suggestion state conflict';
  end if;

  update public.parent_goal_suggestions as suggestion
  set
    status = 'ACCEPTED',
    responded_at = now(),
    accepted_goal_id = case
      when v_kind = 'NEW_GOAL' then v_accepted_goal_id
      else null
    end
  where
    suggestion.id = p_suggestion_id
    and suggestion.student_user_id = v_student_user_id
    and suggestion.status = 'PENDING';

  get diagnostics v_affected_count = row_count;
  if v_affected_count <> 1 then
    raise exception 'Goal suggestion state conflict';
  end if;

  return private.build_parent_goal_suggestion_item(
    p_suggestion_id,
    true
  );
end;
$$;

alter table public.parent_goal_suggestions enable row level security;

revoke all on table public.parent_goal_suggestions from public;
revoke all on table public.parent_goal_suggestions from anon;
revoke all on table public.parent_goal_suggestions from authenticated;

revoke all
on function public.get_parent_goal_suggestion_context(uuid)
from public;
revoke all
on function public.get_parent_goal_suggestion_context(uuid)
from anon;
revoke all
on function public.get_parent_goal_suggestion_context(uuid)
from authenticated;
grant execute
on function public.get_parent_goal_suggestion_context(uuid)
to authenticated;

revoke all
on function public.send_parent_goal_suggestion(
  uuid,
  text,
  uuid,
  text,
  date,
  text
)
from public;
revoke all
on function public.send_parent_goal_suggestion(
  uuid,
  text,
  uuid,
  text,
  date,
  text
)
from anon;
revoke all
on function public.send_parent_goal_suggestion(
  uuid,
  text,
  uuid,
  text,
  date,
  text
)
from authenticated;
grant execute
on function public.send_parent_goal_suggestion(
  uuid,
  text,
  uuid,
  text,
  date,
  text
)
to authenticated;

revoke all
on function public.withdraw_parent_goal_suggestion(uuid)
from public;
revoke all
on function public.withdraw_parent_goal_suggestion(uuid)
from anon;
revoke all
on function public.withdraw_parent_goal_suggestion(uuid)
from authenticated;
grant execute
on function public.withdraw_parent_goal_suggestion(uuid)
to authenticated;

revoke all
on function public.get_my_parent_goal_suggestions()
from public;
revoke all
on function public.get_my_parent_goal_suggestions()
from anon;
revoke all
on function public.get_my_parent_goal_suggestions()
from authenticated;
grant execute
on function public.get_my_parent_goal_suggestions()
to authenticated;

revoke all
on function public.respond_parent_goal_suggestion(uuid, text)
from public;
revoke all
on function public.respond_parent_goal_suggestion(uuid, text)
from anon;
revoke all
on function public.respond_parent_goal_suggestion(uuid, text)
from authenticated;
grant execute
on function public.respond_parent_goal_suggestion(uuid, text)
to authenticated;

comment on table public.parent_goal_suggestions is
  'Parent suggestions are consent requests only; Parents never mutate Student goals directly.';
comment on function public.respond_parent_goal_suggestion(uuid, text) is
  'Only the receiving Student can accept or decline; accepting a new-goal suggestion creates one ACTIVE Student-owned goal atomically.';

do $validation$
declare
  v_constraint_count integer := 0;
  v_index_count integer := 0;
  v_trigger_count integer := 0;
  v_public_function_count integer := 0;
  v_public_functions_secure boolean := false;
  v_public_functions_safe_path boolean := false;
begin
  if not exists (
    select 1
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where
      namespace.nspname = 'public'
      and relation.relname = 'parent_goal_suggestions'
      and relation.relkind = 'r'
      and relation.relrowsecurity
  ) then
    raise exception 'Parent goal suggestion RLS validation failed';
  end if;

  select count(*)
  into v_constraint_count
  from pg_catalog.pg_constraint as constraint_definition
  where
    constraint_definition.conrelid =
      'public.parent_goal_suggestions'::regclass
    and constraint_definition.conname in (
      'parent_goal_suggestions_kind_shape_check',
      'parent_goal_suggestions_lifecycle_check'
    )
    and constraint_definition.contype = 'c'
    and constraint_definition.convalidated;

  if v_constraint_count <> 2 then
    raise exception 'Parent goal suggestion constraint validation failed';
  end if;

  select count(*)
  into v_index_count
  from pg_catalog.pg_index as index_definition
  join pg_catalog.pg_class as index_relation
    on index_relation.oid = index_definition.indexrelid
  where
    index_definition.indrelid =
      'public.parent_goal_suggestions'::regclass
    and index_relation.relname =
      'parent_goal_suggestions_one_pending_target_idx'
    and index_definition.indisunique
    and index_definition.indpred is not null;

  if v_index_count <> 1 then
    raise exception 'Pending goal suggestion uniqueness validation failed';
  end if;

  select count(*)
  into v_trigger_count
  from pg_catalog.pg_trigger as trigger_definition
  where
    trigger_definition.tgrelid =
      'public.parent_goal_suggestions'::regclass
    and trigger_definition.tgname =
      'parent_goal_suggestions_enforce_lifecycle'
    and not trigger_definition.tgisinternal
    and trigger_definition.tgenabled <> 'D'
    and trigger_definition.tgfoid =
      'private.enforce_parent_goal_suggestion_lifecycle()'::regprocedure;

  if v_trigger_count <> 1 then
    raise exception 'Parent goal suggestion trigger validation failed';
  end if;

  if
    pg_catalog.has_table_privilege(
      'authenticated',
      'public.parent_goal_suggestions',
      'SELECT'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.parent_goal_suggestions',
      'INSERT'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.parent_goal_suggestions',
      'UPDATE'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.parent_goal_suggestions',
      'DELETE'
    )
  then
    raise exception 'Direct goal suggestion table grant validation failed';
  end if;

  select
    count(*),
    coalesce(bool_and(procedure.prosecdef), false),
    coalesce(
      bool_and(
        procedure.proconfig @> array['search_path=""']::text[]
      ),
      false
    )
  into
    v_public_function_count,
    v_public_functions_secure,
    v_public_functions_safe_path
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where
    namespace.nspname = 'public'
    and procedure.proname in (
      'get_parent_goal_suggestion_context',
      'send_parent_goal_suggestion',
      'withdraw_parent_goal_suggestion',
      'get_my_parent_goal_suggestions',
      'respond_parent_goal_suggestion'
    );

  if
    v_public_function_count <> 5
    or not v_public_functions_secure
    or not v_public_functions_safe_path
  then
    raise exception 'Goal suggestion RPC security validation failed';
  end if;

  if
    pg_catalog.has_function_privilege(
      'anon',
      'public.get_parent_goal_suggestion_context(uuid)',
      'EXECUTE'
    )
    or not pg_catalog.has_function_privilege(
      'authenticated',
      'public.get_parent_goal_suggestion_context(uuid)',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'anon',
      'public.send_parent_goal_suggestion(uuid,text,uuid,text,date,text)',
      'EXECUTE'
    )
    or not pg_catalog.has_function_privilege(
      'authenticated',
      'public.send_parent_goal_suggestion(uuid,text,uuid,text,date,text)',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'anon',
      'public.withdraw_parent_goal_suggestion(uuid)',
      'EXECUTE'
    )
    or not pg_catalog.has_function_privilege(
      'authenticated',
      'public.withdraw_parent_goal_suggestion(uuid)',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'anon',
      'public.get_my_parent_goal_suggestions()',
      'EXECUTE'
    )
    or not pg_catalog.has_function_privilege(
      'authenticated',
      'public.get_my_parent_goal_suggestions()',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'anon',
      'public.respond_parent_goal_suggestion(uuid,text)',
      'EXECUTE'
    )
    or not pg_catalog.has_function_privilege(
      'authenticated',
      'public.respond_parent_goal_suggestion(uuid,text)',
      'EXECUTE'
    )
  then
    raise exception 'Goal suggestion RPC grant validation failed';
  end if;
end;
$validation$;

commit;
