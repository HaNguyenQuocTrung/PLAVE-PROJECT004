begin transaction read only;

select
  check_name,
  case when passed then 'PASS' else 'FAIL' end as status,
  observed_count,
  expected
from (
  values
    (
      'transaction_read_only',
      current_setting('transaction_read_only') = 'on',
      null::bigint,
      'on'
    ),
    (
      'pilot_member_count_1_to_5',
      (select count(*)
        from public.adaptive_practice_pilot_members as member
        where member.unit_slug = 'grade-2-numbers-to-1000'
          and member.enabled) between 1 and 5,
      (select count(*)
        from public.adaptive_practice_pilot_members as member
        where member.unit_slug = 'grade-2-numbers-to-1000'
          and member.enabled),
      '1..5'
    ),
    (
      'release_active_draft_hidden',
      (select count(*)
        from public.adaptive_practice_releases as release
        where release.unit_slug = 'grade-2-numbers-to-1000'
          and release.release_candidate_id = 'g2-numbers-to-1000-rc1'
          and release.content_version = 'g2n1000-1.0.0-rc.1'
          and release.bundle_sha256 =
            '1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530'
          and release.policy_version =
            'g2n1000-adaptive-policy-1.0.0-pilot'
          and release.runtime_enabled
          and release.controlled_pilot_enabled
          and not release.retention_runtime_enabled
          and release.publication_status = 'DRAFT'
          and release.student_visibility = 'HIDDEN') = 1,
      (select count(*)
        from public.adaptive_practice_releases as release
        where release.unit_slug = 'grade-2-numbers-to-1000'
          and release.runtime_enabled
          and release.controlled_pilot_enabled),
      '1'
    ),
    (
      'grade2_unit_unpublished',
      (select count(*)
        from public.learning_units as unit
        where unit.slug = 'grade-2-numbers-to-1000'
          and not unit.published) = 1,
      (select count(*)
        from public.learning_units as unit
        where unit.slug = 'grade-2-numbers-to-1000'
          and not unit.published),
      '1'
    ),
    (
      'grade2_questions_unpublished',
      (select count(*)
        from public.questions as question
        where question.unit_slug = 'grade-2-numbers-to-1000'
          and not question.published) = 24,
      (select count(*)
        from public.questions as question
        where question.unit_slug = 'grade-2-numbers-to-1000'
          and not question.published),
      '24'
    ),
    (
      'grade1_units',
      (select count(*) from public.learning_units as unit
        where unit.grade = 1 and unit.published) = 13,
      (select count(*) from public.learning_units as unit
        where unit.grade = 1 and unit.published),
      '13'
    ),
    (
      'grade1_questions',
      (select count(*) from public.questions as question
        join public.learning_units as unit
          on unit.slug = question.unit_slug
        where unit.grade = 1 and question.published) = 312,
      (select count(*) from public.questions as question
        join public.learning_units as unit
          on unit.slug = question.unit_slug
        where unit.grade = 1 and question.published),
      '312'
    ),
    (
      'grade1_solutions',
      (select count(*) from public.question_solutions as solution
        join public.questions as question
          on question.code = solution.question_id
        join public.learning_units as unit
          on unit.slug = question.unit_slug
        where unit.grade = 1) = 312,
      (select count(*) from public.question_solutions as solution
        join public.questions as question
          on question.code = solution.question_id
        join public.learning_units as unit
          on unit.slug = question.unit_slug
        where unit.grade = 1),
      '312'
    ),
    (
      'browser_pilot_table_grants',
      (select count(*)
        from information_schema.role_table_grants as table_grant
        where table_grant.table_schema = 'public'
          and table_grant.table_name =
            'adaptive_practice_pilot_members'
          and table_grant.grantee in (
            'PUBLIC',
            'anon',
            'authenticated'
          )) = 0,
      (select count(*)
        from information_schema.role_table_grants as table_grant
        where table_grant.table_schema = 'public'
          and table_grant.table_name =
            'adaptive_practice_pilot_members'
          and table_grant.grantee in (
            'PUBLIC',
            'anon',
            'authenticated'
          )),
      '0'
    ),
    (
      'browser_solution_select',
      not has_table_privilege(
        'anon',
        'public.question_solutions',
        'SELECT'
      ) and not has_table_privilege(
        'authenticated',
        'public.question_solutions',
        'SELECT'
      ),
      null::bigint,
      'false/false'
    )
) as checks(check_name, passed, observed_count, expected)
order by check_name;

rollback;
