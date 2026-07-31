export const project004LegacyPublishedUnitSlugs = [
  "grade-1-numbers-to-10",
  "grade-1-addition-within-10",
  "grade-1-subtraction-within-10",
  "grade-1-numbers-to-20",
  "grade-1-addition-within-20-no-carry",
  "grade-1-subtraction-within-20-no-borrow",
  "grade-1-numbers-to-100",
  "grade-1-addition-within-100-no-carry",
  "grade-1-subtraction-within-100-no-borrow",
  "grade-1-basic-geometry-and-position",
  "grade-1-length-measurement",
  "grade-1-time-clock-calendar",
  "grade-1-cube-and-cuboid",
] as const;

export const project004LegacyDraftUnitSlug =
  "grade-2-numbers-to-1000";

export const project004CanonicalLegacyBaseline = {
  learningUnits: 14,
  publishedLearningUnits: 13,
  draftLearningUnits: 1,
  questions: 336,
  publishedQuestions: 312,
  draftQuestions: 24,
  solutions: 336,
  diagnosticBlueprintRows: 24,
  nonCanonicalRows: 0,
} as const;

export type Project004ContentPreconditionId =
  | "PC001_REQUIRED_SCHEMA"
  | "PC002_MIGRATION_HISTORY"
  | "PC003_RELEASE_TABLES_EMPTY"
  | "PC004_LEGACY_CURRICULUM_BASELINE"
  | "PC005_SYNTHETIC_HISTORY_EMPTY"
  | "PC006_ADAPTIVE_RUNTIME_BASELINE"
  | "PC007_ADAPTIVE_PILOT_EMPTY"
  | "PC008_ON_DEMAND_RUNTIME_EMPTY";

export const project004ContentPreconditionIds:
  readonly Project004ContentPreconditionId[] = [
    "PC001_REQUIRED_SCHEMA",
    "PC002_MIGRATION_HISTORY",
    "PC003_RELEASE_TABLES_EMPTY",
    "PC004_LEGACY_CURRICULUM_BASELINE",
    "PC005_SYNTHETIC_HISTORY_EMPTY",
    "PC006_ADAPTIVE_RUNTIME_BASELINE",
    "PC007_ADAPTIVE_PILOT_EMPTY",
    "PC008_ON_DEMAND_RUNTIME_EMPTY",
  ];

export type Project004ContentBaselineObservation = {
  requiredSchema: {
    observed: number;
    expected: number;
  };
  migrationHistory: {
    total: number;
    canonical: number;
    first: string;
    last: string;
  };
  releaseTables: {
    releases: number;
    units: number;
    questions: number;
    solutions: number;
    legacyMappings: number;
  };
  legacyCurriculum: {
    learningUnits: number;
    publishedLearningUnits: number;
    draftLearningUnits: number;
    questions: number;
    publishedQuestions: number;
    draftQuestions: number;
    solutions: number;
    diagnosticBlueprintRows: number;
    nonCanonicalRows: number;
  };
  syntheticHistoryRows: number;
  adaptiveRuntime: {
    releases: number;
    exactDisabledDraftReleases: number;
  };
  adaptivePilotRows: number;
  onDemandRuntimeRows: number;
};

export function exactProject004ContentBaselineObservation(): Project004ContentBaselineObservation {
  return {
    requiredSchema: {
      observed: 13,
      expected: 13,
    },
    migrationHistory: {
      total: 40,
      canonical: 40,
      first: "0001",
      last: "0040",
    },
    releaseTables: {
      releases: 0,
      units: 0,
      questions: 0,
      solutions: 0,
      legacyMappings: 0,
    },
    legacyCurriculum: {
      ...project004CanonicalLegacyBaseline,
    },
    syntheticHistoryRows: 0,
    adaptiveRuntime: {
      releases: 1,
      exactDisabledDraftReleases: 1,
    },
    adaptivePilotRows: 0,
    onDemandRuntimeRows: 0,
  };
}

export function firstProject004ContentPreconditionFailure(
  observation: Project004ContentBaselineObservation,
): Project004ContentPreconditionId | null {
  if (
    observation.requiredSchema.observed !==
    observation.requiredSchema.expected
  ) {
    return "PC001_REQUIRED_SCHEMA";
  }
  if (
    observation.migrationHistory.total !== 40 ||
    observation.migrationHistory.canonical !== 40 ||
    observation.migrationHistory.first !== "0001" ||
    observation.migrationHistory.last !== "0040"
  ) {
    return "PC002_MIGRATION_HISTORY";
  }
  if (
    Object.values(observation.releaseTables).some(
      (count) => count !== 0,
    )
  ) {
    return "PC003_RELEASE_TABLES_EMPTY";
  }
  if (
    Object.entries(project004CanonicalLegacyBaseline).some(
      ([field, expected]) =>
        observation.legacyCurriculum[
          field as keyof typeof observation.legacyCurriculum
        ] !== expected,
    )
  ) {
    return "PC004_LEGACY_CURRICULUM_BASELINE";
  }
  if (observation.syntheticHistoryRows !== 0) {
    return "PC005_SYNTHETIC_HISTORY_EMPTY";
  }
  if (
    observation.adaptiveRuntime.releases !== 1 ||
    observation.adaptiveRuntime
      .exactDisabledDraftReleases !== 1
  ) {
    return "PC006_ADAPTIVE_RUNTIME_BASELINE";
  }
  if (observation.adaptivePilotRows !== 0) {
    return "PC007_ADAPTIVE_PILOT_EMPTY";
  }
  if (observation.onDemandRuntimeRows !== 0) {
    return "PC008_ON_DEMAND_RUNTIME_EMPTY";
  }
  return null;
}

function sqlText(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

export function buildProject004ContentPreconditionSql() {
  const publishedSlugs = project004LegacyPublishedUnitSlugs
    .map(sqlText)
    .join(",");
  const legacyExpected = [
    project004CanonicalLegacyBaseline.learningUnits,
    project004CanonicalLegacyBaseline.publishedLearningUnits,
    project004CanonicalLegacyBaseline.draftLearningUnits,
    project004CanonicalLegacyBaseline.questions,
    project004CanonicalLegacyBaseline.publishedQuestions,
    project004CanonicalLegacyBaseline.draftQuestions,
    project004CanonicalLegacyBaseline.solutions,
    project004CanonicalLegacyBaseline.diagnosticBlueprintRows,
    project004CanonicalLegacyBaseline.nonCanonicalRows,
  ].join("/");
  return String.raw`
do $precondition$
declare
  v_required_schema integer := 0;
  v_migration_total integer := 0;
  v_migration_canonical integer := 0;
  v_migration_first text := 'NONE';
  v_migration_last text := 'NONE';
  v_release_rows integer := 0;
  v_release_unit_rows integer := 0;
  v_release_question_rows integer := 0;
  v_release_solution_rows integer := 0;
  v_legacy_mapping_rows integer := 0;
  v_legacy_units integer := 0;
  v_legacy_published_units integer := 0;
  v_legacy_draft_units integer := 0;
  v_legacy_questions integer := 0;
  v_legacy_published_questions integer := 0;
  v_legacy_draft_questions integer := 0;
  v_legacy_solutions integer := 0;
  v_blueprint_rows integer := 0;
  v_legacy_noncanonical_rows integer := 0;
  v_synthetic_history_rows bigint := 0;
  v_adaptive_releases integer := 0;
  v_adaptive_exact_disabled integer := 0;
  v_adaptive_pilot_rows bigint := 0;
  v_on_demand_runtime_rows bigint := 0;
begin
  select count(*) into v_required_schema
  from unnest(array[
    'public.curriculum_releases',
    'public.curriculum_release_units',
    'public.curriculum_release_questions',
    'private.curriculum_release_solutions',
    'public.curriculum_legacy_grade1_outcome_mappings',
    'public.learning_units',
    'public.questions',
    'public.question_solutions',
    'public.grade1_diagnostic_blueprint',
    'public.adaptive_practice_releases',
    'public.adaptive_practice_pilot_members',
    'private.curriculum_generation_runtime_secret',
    'supabase_migrations.schema_migrations'
  ]) as required(name)
  where pg_catalog.to_regclass(required.name) is not null;
  if v_required_schema <> 13 then
    raise exception
      'REMOTE_CONTENT:PRECONDITION:PC001_REQUIRED_SCHEMA:OBSERVED:%/13:EXPECTED:13/13',
      v_required_schema;
  end if;

  select
    count(*)::integer,
    count(*) filter (
      where version ~ '^(000[1-9]|00[12][0-9]|003[0-9]|0040)$'
    )::integer,
    coalesce(min(version), 'NONE'),
    coalesce(max(version), 'NONE')
  into
    v_migration_total,
    v_migration_canonical,
    v_migration_first,
    v_migration_last
  from supabase_migrations.schema_migrations;
  if
    v_migration_total <> 40
    or v_migration_canonical <> 40
    or v_migration_first <> '0001'
    or v_migration_last <> '0040'
  then
    raise exception
      'REMOTE_CONTENT:PRECONDITION:PC002_MIGRATION_HISTORY:OBSERVED:%/%/%/%:EXPECTED:40/40/0001/0040',
      v_migration_total, v_migration_canonical,
      v_migration_first, v_migration_last;
  end if;

  select count(*) into v_release_rows
  from public.curriculum_releases;
  select count(*) into v_release_unit_rows
  from public.curriculum_release_units;
  select count(*) into v_release_question_rows
  from public.curriculum_release_questions;
  select count(*) into v_release_solution_rows
  from private.curriculum_release_solutions;
  select count(*) into v_legacy_mapping_rows
  from public.curriculum_legacy_grade1_outcome_mappings;
  if
    v_release_rows <> 0
    or v_release_unit_rows <> 0
    or v_release_question_rows <> 0
    or v_release_solution_rows <> 0
    or v_legacy_mapping_rows <> 0
  then
    raise exception
      'REMOTE_CONTENT:PRECONDITION:PC003_RELEASE_TABLES_EMPTY:OBSERVED:%/%/%/%/%:EXPECTED:0/0/0/0/0',
      v_release_rows, v_release_unit_rows,
      v_release_question_rows, v_release_solution_rows,
      v_legacy_mapping_rows;
  end if;

  select count(*) into v_legacy_units
  from public.learning_units;
  select count(*) into v_legacy_published_units
  from public.learning_units
  where
    grade = 1
    and published
    and total_questions = 24
    and slug = any(array[${publishedSlugs}]::text[]);
  select count(*) into v_legacy_draft_units
  from public.learning_units
  where
    slug = ${sqlText(project004LegacyDraftUnitSlug)}
    and grade = 2
    and not published
    and total_questions = 24;
  select count(*) into v_legacy_questions
  from public.questions;
  select count(*) into v_legacy_published_questions
  from public.questions as question
  join public.learning_units as unit
    on unit.slug = question.unit_slug
  where
    unit.grade = 1
    and unit.published
    and question.published
    and unit.slug = any(array[${publishedSlugs}]::text[]);
  select count(*) into v_legacy_draft_questions
  from public.questions
  where
    unit_slug = ${sqlText(project004LegacyDraftUnitSlug)}
    and not published;
  select count(*) into v_legacy_solutions
  from public.question_solutions;
  select count(*) into v_blueprint_rows
  from public.grade1_diagnostic_blueprint;
  select count(*) into v_legacy_noncanonical_rows
  from (
    select unit.slug
    from public.learning_units as unit
    where not (
      (
        unit.grade = 1
        and unit.published
        and unit.total_questions = 24
        and unit.slug = any(array[${publishedSlugs}]::text[])
      )
      or (
        unit.slug = ${sqlText(project004LegacyDraftUnitSlug)}
        and unit.grade = 2
        and not unit.published
        and unit.total_questions = 24
      )
    )
    union all
    select question.code
    from public.questions as question
    left join public.learning_units as unit
      on unit.slug = question.unit_slug
    where
      question.display_order not between 1 and 24
      or unit.slug is null
      or not (
        (
          unit.grade = 1
          and unit.published
          and question.published
          and unit.slug = any(array[${publishedSlugs}]::text[])
        )
        or (
          unit.slug = ${sqlText(project004LegacyDraftUnitSlug)}
          and unit.grade = 2
          and not unit.published
          and not question.published
        )
      )
    union all
    select grouped.unit_slug
    from (
      select question.unit_slug, count(*) as value
      from public.questions as question
      group by question.unit_slug
    ) as grouped
    where grouped.value <> 24
    union all
    select question.code
    from public.questions as question
    left join public.question_solutions as solution
      on solution.question_id = question.code
    where solution.question_id is null
  ) as noncanonical;
  if
    v_legacy_units <>
      ${project004CanonicalLegacyBaseline.learningUnits}
    or v_legacy_published_units <>
      ${project004CanonicalLegacyBaseline.publishedLearningUnits}
    or v_legacy_draft_units <>
      ${project004CanonicalLegacyBaseline.draftLearningUnits}
    or v_legacy_questions <>
      ${project004CanonicalLegacyBaseline.questions}
    or v_legacy_published_questions <>
      ${project004CanonicalLegacyBaseline.publishedQuestions}
    or v_legacy_draft_questions <>
      ${project004CanonicalLegacyBaseline.draftQuestions}
    or v_legacy_solutions <>
      ${project004CanonicalLegacyBaseline.solutions}
    or v_blueprint_rows <>
      ${project004CanonicalLegacyBaseline.diagnosticBlueprintRows}
    or v_legacy_noncanonical_rows <> 0
  then
    raise exception
      'REMOTE_CONTENT:PRECONDITION:PC004_LEGACY_CURRICULUM_BASELINE:OBSERVED:%/%/%/%/%/%/%/%/%:EXPECTED:${legacyExpected}',
      v_legacy_units, v_legacy_published_units,
      v_legacy_draft_units, v_legacy_questions,
      v_legacy_published_questions, v_legacy_draft_questions,
      v_legacy_solutions, v_blueprint_rows,
      v_legacy_noncanonical_rows;
  end if;

  select (
    (select count(*) from auth.users)
    + (select count(*) from storage.objects)
    + (select count(*) from public.profiles)
    + (select count(*) from public.student_profiles)
    + (select count(*) from public.learning_goals)
    + (select count(*) from public.parent_student_connections)
    + (select count(*) from public.parent_student_lookup_failures)
    + (select count(*) from public.parent_goal_suggestions)
    + (select count(*) from public.teacher_invitations)
    + (select count(*) from public.teacher_profiles)
    + (select count(*) from public.classrooms)
    + (select count(*) from public.classroom_memberships)
    + (select count(*) from public.teacher_questions)
    + (select count(*) from public.teacher_question_solutions)
    + (select count(*) from public.teacher_assignments)
    + (select count(*) from public.teacher_assignment_items)
    + (select count(*) from public.assignment_submissions)
    + (select count(*) from public.assignment_answers)
    + (select count(*) from public.practice_attempts)
    + (select count(*) from public.practice_answers)
    + (select count(*) from public.diagnostic_attempts)
    + (select count(*) from public.diagnostic_answers)
    + (select count(*) from public.curriculum_attempts)
    + (select count(*) from public.curriculum_answers)
    + (
      select count(*)
      from public.student_curriculum_unit_progress
    )
    + (
      select count(*)
      from public.student_curriculum_outcome_progress
    )
    + (
      select count(*)
      from public.student_curriculum_skill_progress
    )
    + (select count(*) from public.adaptive_practice_attempts)
    + (select count(*) from public.adaptive_practice_answers)
    + (
      select count(*)
      from public.teacher_curriculum_assignment_drafts
    )
    + (
      select count(*)
      from public.teacher_curriculum_assignment_draft_items
    )
    + (
      select count(*)
      from private.assignment_submission_mutations
    )
    + (
      select count(*)
      from public.student_assignment_outcome_progress
    )
    + (
      select count(*)
      from public.student_assignment_skill_progress
    )
  ) into v_synthetic_history_rows;
  if v_synthetic_history_rows <> 0 then
    raise exception
      'REMOTE_CONTENT:PRECONDITION:PC005_SYNTHETIC_HISTORY_EMPTY:OBSERVED:%:EXPECTED:0',
      v_synthetic_history_rows;
  end if;

  select count(*) into v_adaptive_releases
  from public.adaptive_practice_releases;
  select count(*) into v_adaptive_exact_disabled
  from public.adaptive_practice_releases
  where
    unit_slug = ${sqlText(project004LegacyDraftUnitSlug)}
    and release_candidate_id = 'g2-numbers-to-1000-rc1'
    and content_version = 'g2n1000-1.0.0-rc.1'
    and bundle_sha256 =
      '1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530'
    and policy_version =
      'g2n1000-adaptive-policy-1.0.0-pilot'
    and not runtime_enabled
    and not controlled_pilot_enabled
    and not retention_runtime_enabled
    and publication_status = 'DRAFT'
    and student_visibility = 'HIDDEN';
  if
    v_adaptive_releases <> 1
    or v_adaptive_exact_disabled <> 1
  then
    raise exception
      'REMOTE_CONTENT:PRECONDITION:PC006_ADAPTIVE_RUNTIME_BASELINE:OBSERVED:%/%:EXPECTED:1/1',
      v_adaptive_releases, v_adaptive_exact_disabled;
  end if;

  select count(*) into v_adaptive_pilot_rows
  from public.adaptive_practice_pilot_members;
  if v_adaptive_pilot_rows <> 0 then
    raise exception
      'REMOTE_CONTENT:PRECONDITION:PC007_ADAPTIVE_PILOT_EMPTY:OBSERVED:%:EXPECTED:0',
      v_adaptive_pilot_rows;
  end if;

  select (
    (select count(*) from private.curriculum_generation_runtime_secret)
    + (select count(*) from public.curriculum_generated_questions)
    + (select count(*) from private.curriculum_generated_solutions)
    + (select count(*) from public.curriculum_generated_answers)
  ) into v_on_demand_runtime_rows;
  if v_on_demand_runtime_rows <> 0 then
    raise exception
      'REMOTE_CONTENT:PRECONDITION:PC008_ON_DEMAND_RUNTIME_EMPTY:OBSERVED:%:EXPECTED:0',
      v_on_demand_runtime_rows;
  end if;
end;
$precondition$;
`;
}
