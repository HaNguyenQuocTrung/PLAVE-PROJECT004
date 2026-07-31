-- Reviewed recovery for the optional Supabase RLS helper.
--
-- DO NOT RUN during remediation preparation. This file exists only as an
-- explicit recovery artifact if a later Owner decision requires restoration.

begin;

do $precondition$
begin
  if exists (
    select 1
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'rls_auto_enable'
  )
  or exists (
    select 1
    from pg_catalog.pg_event_trigger as event_trigger
    where event_trigger.evtname = 'ensure_rls'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'PLAVE_RLS_RECOVERY:TARGET_NOT_ABSENT';
  end if;
end;
$precondition$;

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

alter function public.rls_auto_enable() owner to postgres;
grant execute on function public.rls_auto_enable() to public;

create event trigger ensure_rls
on ddl_command_end
when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
execute function public.rls_auto_enable();

alter event trigger ensure_rls enable;

do $postcondition$
declare
  v_function_oid oid;
begin
  select procedure.oid
  into v_function_oid
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'rls_auto_enable'
    and pg_catalog.pg_get_function_identity_arguments(procedure.oid) = '';

  if v_function_oid is null
    or (
      select pg_catalog.md5(
        pg_catalog.pg_get_functiondef(v_function_oid)
      )
    ) <> '6998ea6b4c2480f5d2e34b5dcf3f8d36'
    or (
      select pg_catalog.md5(
        pg_catalog.regexp_replace(
          pg_catalog.lower(
            pg_catalog.pg_get_functiondef(v_function_oid)
          ),
          '\s+',
          ' ',
          'g'
        )
      )
    ) <> '685bfb43070e3afbcc764020048aaa0c'
    or not exists (
      select 1
      from pg_catalog.pg_event_trigger as event_trigger
      where event_trigger.evtname = 'ensure_rls'
        and event_trigger.evtfoid = v_function_oid
        and event_trigger.evtenabled = 'O'
        and event_trigger.evtevent = 'ddl_command_end'
        and pg_catalog.cardinality(event_trigger.evttags) = 3
        and event_trigger.evttags @> array[
          'CREATE TABLE',
          'CREATE TABLE AS',
          'SELECT INTO'
        ]::text[]
        and event_trigger.evttags <@ array[
          'CREATE TABLE',
          'CREATE TABLE AS',
          'SELECT INTO'
        ]::text[]
    ) then
    raise exception using
      errcode = 'P0001',
      message = 'PLAVE_RLS_RECOVERY:POSTCONDITION_FAILED';
  end if;
end;
$postcondition$;

select
  'PLAVE_RLS_RECOVERY_PREPARED_OBJECTS_RESTORED'::text as result,
  'public.rls_auto_enable()'::text as function_name,
  'ensure_rls'::text as event_trigger_name;

commit;
