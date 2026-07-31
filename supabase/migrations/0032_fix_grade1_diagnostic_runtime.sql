begin;

-- PostgreSQL implements COALESCE as SQL syntax rather than as a callable
-- pg_catalog function. Migration 0031 qualified five COALESCE expressions,
-- so the affected read RPCs compiled but failed when first executed.
-- Repair only those two function definitions and preserve all diagnostic data.
do $repair$
declare
  v_state_definition text;
  v_review_definition text;
  v_state_invalid_count integer := 0;
  v_review_invalid_count integer := 0;
begin
  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure(
      'public.get_grade1_diagnostic_state(uuid)'
    )
  )
  into v_state_definition;

  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure(
      'public.get_grade1_diagnostic_review(uuid)'
    )
  )
  into v_review_definition;

  if v_state_definition is null or v_review_definition is null then
    raise exception 'Grade 1 diagnostic repair preflight failed';
  end if;

  v_state_invalid_count := (
    pg_catalog.length(v_state_definition)
    - pg_catalog.length(
      pg_catalog.replace(
        v_state_definition,
        'pg_catalog.coalesce',
        ''
      )
    )
  ) / pg_catalog.length('pg_catalog.coalesce');

  v_review_invalid_count := (
    pg_catalog.length(v_review_definition)
    - pg_catalog.length(
      pg_catalog.replace(
        v_review_definition,
        'pg_catalog.coalesce',
        ''
      )
    )
  ) / pg_catalog.length('pg_catalog.coalesce');

  if v_state_invalid_count <> 2 or v_review_invalid_count <> 3 then
    raise exception 'Grade 1 diagnostic repair preflight failed';
  end if;

  execute pg_catalog.replace(
    v_state_definition,
    'pg_catalog.coalesce',
    'coalesce'
  );

  execute pg_catalog.replace(
    v_review_definition,
    'pg_catalog.coalesce',
    'coalesce'
  );
end;
$repair$;

revoke all on function public.get_grade1_diagnostic_state(uuid)
  from public;
revoke all on function public.get_grade1_diagnostic_state(uuid)
  from anon;
grant execute on function public.get_grade1_diagnostic_state(uuid)
  to authenticated;

revoke all on function public.get_grade1_diagnostic_review(uuid)
  from public;
revoke all on function public.get_grade1_diagnostic_review(uuid)
  from anon;
grant execute on function public.get_grade1_diagnostic_review(uuid)
  to authenticated;

do $validation$
declare
  v_state_definition text;
  v_review_definition text;
  v_secure_function_count bigint := 0;
begin
  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure(
      'public.get_grade1_diagnostic_state(uuid)'
    )
  )
  into v_state_definition;

  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure(
      'public.get_grade1_diagnostic_review(uuid)'
    )
  )
  into v_review_definition;

  if
    v_state_definition is null
    or v_review_definition is null
    or pg_catalog.strpos(
      v_state_definition,
      'pg_catalog.coalesce'
    ) <> 0
    or pg_catalog.strpos(
      v_review_definition,
      'pg_catalog.coalesce'
    ) <> 0
  then
    raise exception 'Grade 1 diagnostic runtime repair failed';
  end if;

  select count(*)
  into v_secure_function_count
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname in (
      'get_grade1_diagnostic_state',
      'get_grade1_diagnostic_review'
    )
    and procedure.prosecdef
    and procedure.proconfig @> array['search_path=""']::text[];

  if
    v_secure_function_count <> 2
    or not pg_catalog.has_function_privilege(
      'authenticated',
      'public.get_grade1_diagnostic_state(uuid)',
      'EXECUTE'
    )
    or not pg_catalog.has_function_privilege(
      'authenticated',
      'public.get_grade1_diagnostic_review(uuid)',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'anon',
      'public.get_grade1_diagnostic_state(uuid)',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'anon',
      'public.get_grade1_diagnostic_review(uuid)',
      'EXECUTE'
    )
  then
    raise exception 'Grade 1 diagnostic runtime security validation failed';
  end if;
end;
$validation$;

commit;
