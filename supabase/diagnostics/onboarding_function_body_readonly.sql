-- READ-ONLY diagnostic for the exact live onboarding overload.
-- Returns function source only; no table row or user data is queried.

with
target_function as (
  select
    to_regprocedure(
      'public.complete_onboarding(text,smallint,date)'
    ) as function_oid
),
live_definition as (
  select
    t.function_oid,
    p.oid is not null as function_found,
    pg_get_functiondef(p.oid) as full_function_definition,
    p.prosrc as source_body
  from target_function as t
  left join pg_proc as p
    on p.oid = t.function_oid
),
source_lines as (
  select
    line.ordinality::integer as line_number,
    line.line_text
  from live_definition as d
  cross join lateral regexp_split_to_table(
    d.source_body,
    E'\\n'
  ) with ordinality as line(line_text, ordinality)
),
source_summary as (
  select
    string_agg(
      lpad(line_number::text, 4, '0') || ': ' || line_text,
      E'\n'
      order by line_number
    ) as numbered_source,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'line_number', line_number,
          'character_in_line', strpos(line_text, 'Profile unavailable'),
          'line_text', line_text
        )
        order by line_number
      ) filter (
        where strpos(line_text, 'Profile unavailable') > 0
      ),
      '[]'::jsonb
    ) as profile_unavailable_locations
  from source_lines
)
select
  'public.complete_onboarding(text,smallint,date)'::text
    as target_overload,
  d.function_found,
  md5(d.full_function_definition) as definition_md5,
  md5(d.source_body) as source_body_md5,
  d.full_function_definition,
  s.numbered_source,
  case
    when d.source_body is null then 0
    else (
      length(d.source_body)
      - length(replace(d.source_body, 'Profile unavailable', ''))
    ) / length('Profile unavailable')
  end as profile_unavailable_occurrence_count,
  s.profile_unavailable_locations
from live_definition as d
cross join source_summary as s;
