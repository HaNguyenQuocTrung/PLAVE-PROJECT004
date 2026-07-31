import {
  buildUniversalCurriculumRelease,
} from "../lib/curriculum-runtime/release.ts";
import {
  buildResolvedRemoteDatabaseEnvironment,
  resolveProject004RemoteDatabaseEndpoint,
  type ResolvedRemoteDatabaseEndpoint,
} from "./project004-remote-connectivity-resolver.ts";
import {
  assertLocalIsolation,
  assertRemoteDevTarget,
  createCanonicalRemoteDevCommandRunner,
  project004RemoteDevContract,
  type RemoteDevPrivateConfig,
} from "./project004-remote-dev-guard.ts";
import {
  runLocalRemoteDevPreflight,
  type RemoteDevCheckState,
  type RemoteDevCommandRunner,
} from "./project004-remote-dev-operations.ts";
import {
  buildProject004PrefixSemanticFingerprintSql,
  parsePrefixSemanticFingerprint,
} from "./project004-prefix-semantic-fingerprint.ts";
import { runCanonicalSupabaseCliAuthCheck } from "./project004-supabase-cli-auth.ts";
import { selectProject004ConnectivityProject } from "./project004-remote-connectivity-resolver.ts";
import {
  buildProject004UniversalActivationPsqlInvocation,
  parseProject004UniversalActivationResponse,
  type UniversalActivationFailedStatementClass,
  type UniversalActivationFailureStage,
  type UniversalActivationPreconditionId,
} from "./project004-universal-activation-execution.ts";

const release = buildUniversalCurriculumRelease();
const releaseRow = release.release;

export const project004UniversalActivationContract = {
  version: "PROJECT004_REMOTE_UNIVERSAL_ACTIVATION_V1",
  targetName: "plave-project004-dev-clean",
  environmentClass: "EMPTY_DEVELOPMENT",
  releaseId: releaseRow.releaseId,
  contentVersion: releaseRow.contentVersion,
  curriculumSourceFingerprint:
    releaseRow.curriculumSourceFingerprint,
  generatorVersion: releaseRow.generatorVersion,
  deterministicSeed: releaseRow.deterministicSeed,
  masteryPolicyVersion: releaseRow.masteryPolicyVersion,
  publicPayloadSha256: release.hashes.publicPayloadSha256,
  privateSolutionSha256:
    release.hashes.privateSolutionSha256,
  bundleSha256: release.hashes.bundleSha256,
  units: 171,
  publicQuestions: 2052,
  privateSolutions: 2052,
  officialOutcomes: 546,
  migrationCount: 40,
  migrationFirst: "0001",
  migrationLast: "0040",
  schemaSemanticFingerprintSha256:
    project004RemoteDevContract.schemaSemanticFingerprintSha256,
  cleanDisposableProofFingerprintSha256:
    "b84f19f47ff0e2fc6b2ca262d34e3d0eee2c8f595265b6d217541d66ce32dd50",
  activationAuthorizationStatus:
    "OWNER_APPROVED_FOR_ONE_TIME_ACTIVATION" as
      | "OWNER_PREFLIGHT_AND_APPROVAL_REQUIRED"
      | "OWNER_APPROVAL_REQUIRED_AFTER_CONSUMED_ATTEMPT"
      | "OWNER_APPROVED_FOR_ONE_TIME_ACTIVATION",
  activationApproval:
    "PROJECT004_CLEAN_REMOTE_UNIVERSAL_GRADES_1_9_ACTIVATE_ONCE",
  deactivationAuthorizationStatus:
    "OWNER_APPROVAL_REQUIRED" as
      | "OWNER_APPROVAL_REQUIRED"
      | "OWNER_APPROVED_FOR_ONE_TIME_DEACTIVATION",
  deactivationApproval:
    "PROJECT004_CLEAN_REMOTE_UNIVERSAL_DEACTIVATE_PRESERVE_HISTORY",
  grade1Compatibility: "LEGACY_FIXED_PRACTICE_PRESERVED",
  grades2To9Runtime: "UNIVERSAL_RELEASE_FIXED_PRACTICE",
  deactivationResumePolicy:
    "ALLOW_BOUND_ATTEMPT_RESUME_AND_SUBMIT_BLOCK_NEW_START",
} as const;

export type UniversalActivationState =
  | "DRAFT_INACTIVE"
  | "ACTIVE";

export type UniversalActivationCounts = {
  migrationCount: number;
  canonicalMigrationCount: number;
  migrationFirst: string;
  migrationLast: string;
  exactReleaseCount: number;
  otherReleaseCount: number;
  units: number;
  publicQuestions: number;
  privateSolutions: number;
  officialOutcomes: number;
  questionSolutionMismatchCount: number;
  contentHashShapeMismatchCount: number;
  perGradeBoundaryMismatchCount: number;
  legacyUnits: number;
  legacyQuestions: number;
  legacySolutions: number;
  legacyDiagnosticRows: number;
  adaptiveReleaseCount: number;
  adaptiveExactDisabledCount: number;
  adaptiveEnabledCount: number;
  rlsGapCount: number;
  privateGrantLeakCount: number;
  curriculumHistoryRowCount: number;
  releaseStatus: string;
  releaseActivationState: string;
  activatedAtState: "NULL" | "SET";
};

export type UniversalActivationPreflightReport = {
  ok: boolean;
  project004Canonical: RemoteDevCheckState;
  localMigrationChecksums: RemoteDevCheckState;
  cleanDisposableProof: RemoteDevCheckState;
  remoteIdentityGuard: RemoteDevCheckState;
  endpointMode:
    | "DIRECT"
    | "POOLER_SESSION"
    | "NOT_RUN";
  schemaFingerprint: RemoteDevCheckState;
  releaseContract: RemoteDevCheckState;
  grade1LegacyBoundary: RemoteDevCheckState;
  adaptivePilotDisabled: RemoteDevCheckState;
  rlsPrivateBoundary: RemoteDevCheckState;
  activationEligible: "YES" | "NO";
  counts: UniversalActivationCounts | null;
  resolvedEndpoint: ResolvedRemoteDatabaseEndpoint | null;
  config: RemoteDevPrivateConfig | null;
  rootFailureCode: string;
  currentRunMutationPerformed: "NO";
};

export type UniversalActivationOperationReport = {
  ok: boolean;
  preflight: UniversalActivationPreflightReport;
  activationAttempts: number;
  postActivationDiagnostic: RemoteDevCheckState;
  releaseState: "ACTIVE/ACTIVE" | "NOT_RUN";
  releaseBank: "171/2052/2052/546" | "NOT_RUN";
  adaptivePilot: "DISABLED" | "NOT_RUN";
  runtimeConfigurationRequired: "YES";
  activationSqlstate: string;
  activationFailureStage: UniversalActivationFailureStage;
  activationFailedStatementClass:
    UniversalActivationFailedStatementClass;
  activationPreconditionId:
    UniversalActivationPreconditionId;
  transactionRollback:
    | "PASS"
    | "NOT_RUN"
    | "NOT_APPLICABLE"
    | "UNVERIFIED";
  currentRunMutationPerformed: "NO" | "YES" | "POSSIBLE";
  rootFailureCode: string;
};

export type UniversalDeactivationOperationReport = {
  ok: boolean;
  preflight: UniversalActivationPreflightReport;
  deactivationAttempts: number;
  postDeactivationDiagnostic: RemoteDevCheckState;
  releaseState: "DRAFT/INACTIVE" | "NOT_RUN";
  historyPreserved: RemoteDevCheckState;
  resumePolicy:
    | typeof project004UniversalActivationContract.deactivationResumePolicy
    | "NOT_RUN";
  currentRunMutationPerformed: "NO" | "YES" | "POSSIBLE";
  rootFailureCode: string;
};

function sqlText(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function expectedStatus(state: UniversalActivationState) {
  return state === "ACTIVE"
    ? {
        status: "ACTIVE",
        activationState: "ACTIVE",
        activatedAtState: "SET",
      }
    : {
        status: "DRAFT",
        activationState: "INACTIVE",
        activatedAtState: "NULL",
      };
}

function releaseIdentityPredicate(
  alias: string,
  state: UniversalActivationState,
) {
  const expected = expectedStatus(state);
  return `
    ${alias}.release_id =
      ${sqlText(project004UniversalActivationContract.releaseId)}
    and ${alias}.content_version =
      ${sqlText(project004UniversalActivationContract.contentVersion)}
    and ${alias}.curriculum_source_fingerprint =
      ${sqlText(
        project004UniversalActivationContract.curriculumSourceFingerprint,
      )}
    and ${alias}.generator_version =
      ${sqlText(project004UniversalActivationContract.generatorVersion)}
    and ${alias}.deterministic_seed =
      ${sqlText(project004UniversalActivationContract.deterministicSeed)}
    and ${alias}.mastery_policy_version =
      ${sqlText(
        project004UniversalActivationContract.masteryPolicyVersion,
      )}
    and ${alias}.public_payload_sha256 =
      ${sqlText(project004UniversalActivationContract.publicPayloadSha256)}
    and ${alias}.private_solution_sha256 =
      ${sqlText(
        project004UniversalActivationContract.privateSolutionSha256,
      )}
    and ${alias}.bundle_sha256 =
      ${sqlText(project004UniversalActivationContract.bundleSha256)}
    and ${alias}.status = ${sqlText(expected.status)}
    and ${alias}.activation_state =
      ${sqlText(expected.activationState)}
    and ${alias}.activated_at is ${
      expected.activatedAtState === "NULL" ? "null" : "not null"
    }
    and ${alias}.retired_at is null`;
}

function canonicalStateCtes(state: UniversalActivationState) {
  return String.raw`
migration_state as (
  select
    count(*)::integer as total,
    count(*) filter (
      where version ~ '^(000[1-9]|00[12][0-9]|003[0-9]|0040)$'
    )::integer as canonical,
    coalesce(min(version), 'NONE') as first_version,
    coalesce(max(version), 'NONE') as last_version
  from supabase_migrations.schema_migrations
),
exact_release as (
  select release.release_id
  from public.curriculum_releases as release
  where ${releaseIdentityPredicate("release", state)}
),
release_counts as (
  select
    count(*) filter (
      where release.release_id in (
        select release_id from exact_release
      )
    )::integer as exact_count,
    count(*) filter (
      where release.release_id <>
        ${sqlText(project004UniversalActivationContract.releaseId)}
    )::integer as other_count
  from public.curriculum_releases as release
),
bank_counts as (
  select
    (
      select count(*) from public.curriculum_release_units
      where release_id =
        ${sqlText(project004UniversalActivationContract.releaseId)}
    )::integer as units,
    (
      select count(*) from public.curriculum_release_questions
      where release_id =
        ${sqlText(project004UniversalActivationContract.releaseId)}
    )::integer as questions,
    (
      select count(*) from private.curriculum_release_solutions
      where release_id =
        ${sqlText(project004UniversalActivationContract.releaseId)}
    )::integer as solutions,
    (
      select count(distinct expanded.outcome_id)
      from public.curriculum_release_units as unit
      cross join unnest(unit.official_outcome_ids)
        as expanded(outcome_id)
      where unit.release_id =
        ${sqlText(project004UniversalActivationContract.releaseId)}
    )::integer as outcomes
),
pairing_mismatch as (
  select count(*)::integer as value
  from (
    select question.question_id
    from public.curriculum_release_questions as question
    left join private.curriculum_release_solutions as solution
      on solution.release_id = question.release_id
      and solution.question_id = question.question_id
    where question.release_id =
      ${sqlText(project004UniversalActivationContract.releaseId)}
      and solution.question_id is null
    union all
    select solution.question_id
    from private.curriculum_release_solutions as solution
    left join public.curriculum_release_questions as question
      on question.release_id = solution.release_id
      and question.question_id = solution.question_id
    where solution.release_id =
      ${sqlText(project004UniversalActivationContract.releaseId)}
      and question.question_id is null
  ) as mismatch
),
hash_shape_mismatch as (
  select (
    (
      select count(*)
      from public.curriculum_release_questions
      where release_id =
        ${sqlText(project004UniversalActivationContract.releaseId)}
        and question_payload_hash !~ '^[0-9a-f]{64}$'
    )
    + (
      select count(*)
      from private.curriculum_release_solutions
      where release_id =
        ${sqlText(project004UniversalActivationContract.releaseId)}
        and solution_payload_hash !~ '^[0-9a-f]{64}$'
    )
  )::integer as value
),
per_grade_mismatch as (
  select count(*)::integer as value
  from generate_series(1, 9) as grade(grade)
  where not exists (
    select 1
    from public.curriculum_release_units as unit
    where unit.release_id =
      ${sqlText(project004UniversalActivationContract.releaseId)}
      and unit.grade = grade.grade
  )
  or exists (
    select 1
    from public.curriculum_release_units as unit
    where unit.release_id =
      ${sqlText(project004UniversalActivationContract.releaseId)}
      and unit.grade = grade.grade
      and (
        unit.total_questions <> 12
        or (
          select count(*)
          from public.curriculum_release_questions as question
          where question.release_id = unit.release_id
            and question.unit_id = unit.unit_id
        ) <> 12
      )
  )
),
legacy_counts as (
  select
    (select count(*) from public.learning_units)::integer as units,
    (select count(*) from public.questions)::integer as questions,
    (select count(*) from public.question_solutions)::integer as solutions,
    (
      select count(*) from public.grade1_diagnostic_blueprint
    )::integer as diagnostic_rows
),
adaptive_counts as (
  select
    count(*)::integer as total,
    count(*) filter (
      where
        unit_slug = 'grade-2-numbers-to-1000'
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
        and student_visibility = 'HIDDEN'
    )::integer as exact_disabled,
    count(*) filter (
      where runtime_enabled
        or controlled_pilot_enabled
        or retention_runtime_enabled
        or publication_status <> 'DRAFT'
        or student_visibility <> 'HIDDEN'
    )::integer as enabled
  from public.adaptive_practice_releases
),
rls_gaps as (
  select count(*)::integer as value
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname in ('public', 'private')
    and relation.relkind in ('r', 'p')
    and not relation.relrowsecurity
    and not exists (
      select 1
      from pg_catalog.pg_depend as dependency
      where dependency.classid = 'pg_class'::regclass
        and dependency.objid = relation.oid
        and dependency.deptype = 'e'
    )
),
private_grant_leaks as (
  select count(*)::integer as value
  from information_schema.role_table_grants
  where table_schema = 'private'
    and lower(grantee) in ('anon', 'authenticated', 'public')
    and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
),
curriculum_history as (
  select (
    (select count(*) from public.curriculum_attempts)
    + (select count(*) from public.curriculum_answers)
    + (select count(*) from public.curriculum_generated_questions)
    + (select count(*) from private.curriculum_generated_solutions)
    + (select count(*) from public.curriculum_generated_answers)
    + (select count(*) from public.student_curriculum_unit_progress)
    + (select count(*) from public.student_curriculum_outcome_progress)
    + (select count(*) from public.student_curriculum_skill_progress)
  )::integer as value
)`;
}

export function buildProject004UniversalActivationPreflightSql(
  state: UniversalActivationState = "DRAFT_INACTIVE",
) {
  const expected = expectedStatus(state);
  return String.raw`
begin read only;
set local statement_timeout = '30s';
with
${canonicalStateCtes(state)}
select concat_ws(
  '|',
  '${project004UniversalActivationContract.version}:PREFLIGHT',
  migration.total,
  migration.canonical,
  migration.first_version,
  migration.last_version,
  release_counts.exact_count,
  release_counts.other_count,
  bank.units,
  bank.questions,
  bank.solutions,
  bank.outcomes,
  pairing.value,
  hash_shape.value,
  per_grade.value,
  legacy.units,
  legacy.questions,
  legacy.solutions,
  legacy.diagnostic_rows,
  adaptive.total,
  adaptive.exact_disabled,
  adaptive.enabled,
  rls.value,
  private_grants.value,
  history.value,
  '${expected.status}',
  '${expected.activationState}',
  '${expected.activatedAtState}'
)
from migration_state as migration
cross join release_counts
cross join bank_counts as bank
cross join pairing_mismatch as pairing
cross join hash_shape_mismatch as hash_shape
cross join per_grade_mismatch as per_grade
cross join legacy_counts as legacy
cross join adaptive_counts as adaptive
cross join rls_gaps as rls
cross join private_grant_leaks as private_grants
cross join curriculum_history as history;
rollback;
`;
}

function integer(value: string | undefined) {
  if (!/^\d+$/u.test(value ?? "")) {
    throw new Error("UNIVERSAL_PREFLIGHT_PAYLOAD_INVALID");
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error("UNIVERSAL_PREFLIGHT_PAYLOAD_INVALID");
  }
  return parsed;
}

export function parseProject004UniversalActivationPreflight(
  output: string,
) {
  const rows = output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) =>
      line.startsWith(
        `${project004UniversalActivationContract.version}:PREFLIGHT|`,
      ),
    );
  if (rows.length !== 1) {
    throw new Error("UNIVERSAL_PREFLIGHT_PAYLOAD_INVALID");
  }
  const fields = rows[0]?.split("|") ?? [];
  if (fields.length !== 27) {
    throw new Error("UNIVERSAL_PREFLIGHT_PAYLOAD_INVALID");
  }
  const activatedAtState = fields[26];
  if (
    activatedAtState !== "NULL" &&
    activatedAtState !== "SET"
  ) {
    throw new Error("UNIVERSAL_PREFLIGHT_PAYLOAD_INVALID");
  }
  return {
    migrationCount: integer(fields[1]),
    canonicalMigrationCount: integer(fields[2]),
    migrationFirst: fields[3] ?? "",
    migrationLast: fields[4] ?? "",
    exactReleaseCount: integer(fields[5]),
    otherReleaseCount: integer(fields[6]),
    units: integer(fields[7]),
    publicQuestions: integer(fields[8]),
    privateSolutions: integer(fields[9]),
    officialOutcomes: integer(fields[10]),
    questionSolutionMismatchCount: integer(fields[11]),
    contentHashShapeMismatchCount: integer(fields[12]),
    perGradeBoundaryMismatchCount: integer(fields[13]),
    legacyUnits: integer(fields[14]),
    legacyQuestions: integer(fields[15]),
    legacySolutions: integer(fields[16]),
    legacyDiagnosticRows: integer(fields[17]),
    adaptiveReleaseCount: integer(fields[18]),
    adaptiveExactDisabledCount: integer(fields[19]),
    adaptiveEnabledCount: integer(fields[20]),
    rlsGapCount: integer(fields[21]),
    privateGrantLeakCount: integer(fields[22]),
    curriculumHistoryRowCount: integer(fields[23]),
    releaseStatus: fields[24] ?? "",
    releaseActivationState: fields[25] ?? "",
    activatedAtState,
  } satisfies UniversalActivationCounts;
}

export function verifyProject004UniversalActivationCounts(
  counts: UniversalActivationCounts,
  state: UniversalActivationState,
  options?: { allowExistingHistory?: boolean },
) {
  const expected = expectedStatus(state);
  const pass =
    counts.migrationCount === 40 &&
    counts.canonicalMigrationCount === 40 &&
    counts.migrationFirst === "0001" &&
    counts.migrationLast === "0040" &&
    counts.exactReleaseCount === 1 &&
    counts.otherReleaseCount === 0 &&
    counts.units === 171 &&
    counts.publicQuestions === 2052 &&
    counts.privateSolutions === 2052 &&
    counts.officialOutcomes === 546 &&
    counts.questionSolutionMismatchCount === 0 &&
    counts.contentHashShapeMismatchCount === 0 &&
    counts.perGradeBoundaryMismatchCount === 0 &&
    counts.legacyUnits === 14 &&
    counts.legacyQuestions === 336 &&
    counts.legacySolutions === 336 &&
    counts.legacyDiagnosticRows === 24 &&
    counts.adaptiveReleaseCount === 1 &&
    counts.adaptiveExactDisabledCount === 1 &&
    counts.adaptiveEnabledCount === 0 &&
    counts.rlsGapCount === 0 &&
    counts.privateGrantLeakCount === 0 &&
    (options?.allowExistingHistory ||
      counts.curriculumHistoryRowCount === 0) &&
    counts.releaseStatus === expected.status &&
    counts.releaseActivationState ===
      expected.activationState &&
    counts.activatedAtState === expected.activatedAtState;
  if (!pass) {
    throw new Error("UNIVERSAL_RELEASE_STATE_DRIFT");
  }
  return counts;
}

function assertionDoBlock(
  state: UniversalActivationState,
  options?: { requireZeroHistory?: boolean },
) {
  const historyAssertion =
    options?.requireZeroHistory === false
      ? ""
      : "or v_fields[23]::integer <> 0";
  return String.raw`
do $contract$
declare
  v_payload text;
  v_fields text[];
begin
  with
  ${canonicalStateCtes(state)}
  select concat_ws(
    '|',
    migration.total,
    migration.canonical,
    migration.first_version,
    migration.last_version,
    release_counts.exact_count,
    release_counts.other_count,
    bank.units,
    bank.questions,
    bank.solutions,
    bank.outcomes,
    pairing.value,
    hash_shape.value,
    per_grade.value,
    legacy.units,
    legacy.questions,
    legacy.solutions,
    legacy.diagnostic_rows,
    adaptive.total,
    adaptive.exact_disabled,
    adaptive.enabled,
    rls.value,
    private_grants.value,
    history.value
  )
  into v_payload
  from migration_state as migration
  cross join release_counts
  cross join bank_counts as bank
  cross join pairing_mismatch as pairing
  cross join hash_shape_mismatch as hash_shape
  cross join per_grade_mismatch as per_grade
  cross join legacy_counts as legacy
  cross join adaptive_counts as adaptive
  cross join rls_gaps as rls
  cross join private_grant_leaks as private_grants
  cross join curriculum_history as history;
  v_fields := string_to_array(v_payload, '|');
  if
    v_fields[1]::integer <> 40
    or v_fields[2]::integer <> 40
    or v_fields[3] <> '0001'
    or v_fields[4] <> '0040'
    or v_fields[5]::integer <> 1
    or v_fields[6]::integer <> 0
    or v_fields[7]::integer <> 171
    or v_fields[8]::integer <> 2052
    or v_fields[9]::integer <> 2052
    or v_fields[10]::integer <> 546
    or v_fields[11]::integer <> 0
    or v_fields[12]::integer <> 0
    or v_fields[13]::integer <> 0
    or v_fields[14]::integer <> 14
    or v_fields[15]::integer <> 336
    or v_fields[16]::integer <> 336
    or v_fields[17]::integer <> 24
    or v_fields[18]::integer <> 1
    or v_fields[19]::integer <> 1
    or v_fields[20]::integer <> 0
    or v_fields[21]::integer <> 0
    or v_fields[22]::integer <> 0
    ${historyAssertion}
  then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_ACTIVATION:CONTRACT_DRIFT';
  end if;
end;
$contract$;`;
}

export function buildProject004UniversalActivationSql() {
  return String.raw`
\set ON_ERROR_STOP on
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
select pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(
    'project004-clean-remote-universal-activation',
    0
  )
);
${assertionDoBlock("DRAFT_INACTIVE")}
do $updated$
declare
  v_affected integer;
begin
  update public.curriculum_releases
  set
    status = 'ACTIVE',
    activation_state = 'ACTIVE',
    activated_at = now(),
    retired_at = null
  where release_id =
      ${sqlText(project004UniversalActivationContract.releaseId)}
    and status = 'DRAFT'
    and activation_state = 'INACTIVE'
    and activated_at is null
    and retired_at is null;
  get diagnostics v_affected = row_count;
  if v_affected <> 1 then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_ACTIVATION:UPDATE_REJECTED';
  end if;
  if not exists (
    select 1 from public.curriculum_releases as release
    where ${releaseIdentityPredicate("release", "ACTIVE")}
  ) then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_ACTIVATION:POST_STATE_MISMATCH';
  end if;
  if exists (
    select 1 from public.adaptive_practice_releases
    where runtime_enabled
      or controlled_pilot_enabled
      or retention_runtime_enabled
      or publication_status <> 'DRAFT'
      or student_visibility <> 'HIDDEN'
  ) then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_ACTIVATION:ADAPTIVE_PILOT_DRIFT';
  end if;
end;
$updated$;
commit;
select '${project004UniversalActivationContract.version}:COMMIT|ACTIVE';
`;
}

export function buildProject004UniversalDeactivationSql() {
  return String.raw`
\set ON_ERROR_STOP on
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
select pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(
    'project004-clean-remote-universal-activation',
    0
  )
);
create temporary table activation_history_boundary on commit drop as
select
  (select count(*) from public.curriculum_attempts) as attempts,
  (select count(*) from public.curriculum_answers) as answers,
  (
    select count(*) from public.student_curriculum_unit_progress
  ) as unit_progress,
  (
    select count(*) from public.student_curriculum_outcome_progress
  ) as outcome_progress,
  (
    select count(*) from public.student_curriculum_skill_progress
  ) as skill_progress;
${assertionDoBlock("ACTIVE", {
    requireZeroHistory: false,
  })}
do $deactivated$
declare
  v_affected integer;
begin
  update public.curriculum_releases
  set
    status = 'DRAFT',
    activation_state = 'INACTIVE',
    activated_at = null,
    retired_at = null
  where release_id =
      ${sqlText(project004UniversalActivationContract.releaseId)}
    and status = 'ACTIVE'
    and activation_state = 'ACTIVE'
    and activated_at is not null
    and retired_at is null;
  get diagnostics v_affected = row_count;
  if v_affected <> 1 then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_DEACTIVATION:UPDATE_REJECTED';
  end if;
  if not exists (
    select 1 from public.curriculum_releases as release
    where ${releaseIdentityPredicate("release", "DRAFT_INACTIVE")}
  ) then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_DEACTIVATION:POST_STATE_MISMATCH';
  end if;
  if exists (
    select 1
    from activation_history_boundary as boundary
    where
      boundary.attempts <>
        (select count(*) from public.curriculum_attempts)
      or boundary.answers <>
        (select count(*) from public.curriculum_answers)
      or boundary.unit_progress <>
        (select count(*) from public.student_curriculum_unit_progress)
      or boundary.outcome_progress <>
        (select count(*) from public.student_curriculum_outcome_progress)
      or boundary.skill_progress <>
        (select count(*) from public.student_curriculum_skill_progress)
  ) then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_DEACTIVATION:HISTORY_MUTATED';
  end if;
  if exists (
    select 1 from public.adaptive_practice_releases
    where runtime_enabled
      or controlled_pilot_enabled
      or retention_runtime_enabled
      or publication_status <> 'DRAFT'
      or student_visibility <> 'HIDDEN'
  ) then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_DEACTIVATION:ADAPTIVE_PILOT_DRIFT';
  end if;
end;
$deactivated$;
commit;
select '${project004UniversalActivationContract.version}:COMMIT|INACTIVE';
`;
}

function command(
  runner: RemoteDevCommandRunner,
  sql: string,
  config: RemoteDevPrivateConfig,
  endpoint: ResolvedRemoteDatabaseEndpoint,
  environment: NodeJS.ProcessEnv,
) {
  const invocation =
    buildProject004UniversalActivationPsqlInvocation(sql);
  return runner(
    "psql",
    invocation.args,
    buildResolvedRemoteDatabaseEnvironment(
      config,
      endpoint,
      environment,
    ),
    invocation.input,
  );
}

function emptyPreflight(
  local = runLocalRemoteDevPreflight(),
): UniversalActivationPreflightReport {
  return {
    ok: false,
    project004Canonical: local.project004Canonical,
    localMigrationChecksums: local.localMigrationChecksums,
    cleanDisposableProof: local.cleanDisposableProof,
    remoteIdentityGuard: "NOT_RUN",
    endpointMode: "NOT_RUN",
    schemaFingerprint: "NOT_RUN",
    releaseContract: "NOT_RUN",
    grade1LegacyBoundary: "NOT_RUN",
    adaptivePilotDisabled: "NOT_RUN",
    rlsPrivateBoundary: "NOT_RUN",
    activationEligible: "NO",
    counts: null,
    resolvedEndpoint: null,
    config: null,
    rootFailureCode:
      local.failureCode ?? "UNIVERSAL_PREFLIGHT_NOT_RUN",
    currentRunMutationPerformed: "NO",
  };
}

export function executeProject004UniversalActivationPreflight(
  options: {
    environment: NodeJS.ProcessEnv;
    candidateRoot?: string;
    runner?: RemoteDevCommandRunner;
    semanticFingerprintVerifier?: (output: string) => boolean;
    expectedState?: UniversalActivationState;
    allowExistingHistory?: boolean;
  },
) {
  const candidateRoot = options.candidateRoot ?? process.cwd();
  const local = runLocalRemoteDevPreflight(candidateRoot);
  const report = emptyPreflight(local);
  if (!local.ok) return report;
  const runner =
    options.runner ??
    createCanonicalRemoteDevCommandRunner(candidateRoot);
  try {
    const config: RemoteDevPrivateConfig = {
      projectName:
        options.environment.PLAVE_PROJECT004_REMOTE_TARGET_NAME ??
        "",
      projectRef:
        options.environment.PLAVE_PROJECT004_REMOTE_PROJECT_REF ??
        "",
      databasePassword:
        options.environment.PLAVE_PROJECT004_REMOTE_DB_PASSWORD ??
        "",
      environmentClass:
        options.environment
          .PLAVE_PROJECT004_REMOTE_ENVIRONMENT_CLASS ?? "",
    };
    assertRemoteDevTarget(config);
    assertLocalIsolation(config, candidateRoot);
    const auth = runCanonicalSupabaseCliAuthCheck({
      environment: options.environment,
      candidateRoot,
      runner,
    });
    const project = selectProject004ConnectivityProject(
      auth.projects,
      config,
    );
    report.remoteIdentityGuard = "PASS";
    const resolution = resolveProject004RemoteDatabaseEndpoint({
      config,
      project,
      environment: options.environment,
      runner,
    });
    report.endpointMode = resolution.endpoint.mode;
    report.resolvedEndpoint = resolution.endpoint;
    report.config = config;

    const semanticResult = command(
      runner,
      buildProject004PrefixSemanticFingerprintSql(
        candidateRoot,
        40,
      ),
      config,
      resolution.endpoint,
      options.environment,
    );
    if (!semanticResult.ok) {
      throw new Error("REMOTE_SCHEMA_FINGERPRINT_QUERY_FAILED");
    }
    const semanticMatches =
      options.semanticFingerprintVerifier?.(
        semanticResult.stdout,
      ) ??
      (parsePrefixSemanticFingerprint(
        semanticResult.stdout,
      ).overallSha256 ===
        project004UniversalActivationContract
          .schemaSemanticFingerprintSha256);
    if (!semanticMatches) {
      throw new Error("REMOTE_SCHEMA_FINGERPRINT_MISMATCH");
    }
    report.schemaFingerprint = "PASS";

    const expectedState =
      options.expectedState ?? "DRAFT_INACTIVE";
    const stateResult = command(
      runner,
      buildProject004UniversalActivationPreflightSql(
        expectedState,
      ),
      config,
      resolution.endpoint,
      options.environment,
    );
    if (!stateResult.ok) {
      throw new Error("UNIVERSAL_RELEASE_PREFLIGHT_QUERY_FAILED");
    }
    const counts =
      parseProject004UniversalActivationPreflight(
        stateResult.stdout,
      );
    verifyProject004UniversalActivationCounts(
      counts,
      expectedState,
      {
        allowExistingHistory:
          options.allowExistingHistory ?? false,
      },
    );
    report.counts = counts;
    report.releaseContract = "PASS";
    report.grade1LegacyBoundary = "PASS";
    report.adaptivePilotDisabled = "PASS";
    report.rlsPrivateBoundary = "PASS";
    report.activationEligible = "YES";
    report.rootFailureCode = "NONE";
    report.ok = true;
    return report;
  } catch (error) {
    report.rootFailureCode =
      error instanceof Error
        ? error.message
        : "UNIVERSAL_ACTIVATION_PREFLIGHT_FAILED";
    return report;
  }
}

export function executeProject004UniversalActivationOnce(
  options: {
    environment: NodeJS.ProcessEnv;
    approval: string;
    candidateRoot?: string;
    runner?: RemoteDevCommandRunner;
    semanticFingerprintVerifier?: (output: string) => boolean;
  },
): UniversalActivationOperationReport {
  const preflight =
    executeProject004UniversalActivationPreflight({
      environment: options.environment,
      candidateRoot: options.candidateRoot,
      runner: options.runner,
      semanticFingerprintVerifier:
        options.semanticFingerprintVerifier,
    });
  const report: UniversalActivationOperationReport = {
    ok: false,
    preflight,
    activationAttempts: 0,
    postActivationDiagnostic: "NOT_RUN",
    releaseState: "NOT_RUN",
    releaseBank: "NOT_RUN",
    adaptivePilot: "NOT_RUN",
    runtimeConfigurationRequired: "YES",
    activationSqlstate: "NOT_RUN",
    activationFailureStage: "NONE",
    activationFailedStatementClass: "NONE",
    activationPreconditionId: "NONE",
    transactionRollback: "NOT_RUN",
    currentRunMutationPerformed: "NO",
    rootFailureCode: preflight.rootFailureCode,
  };
  if (!preflight.ok || !preflight.config || !preflight.resolvedEndpoint) {
    return report;
  }
  if (
    project004UniversalActivationContract
      .activationAuthorizationStatus !==
      "OWNER_APPROVED_FOR_ONE_TIME_ACTIVATION" ||
    options.approval !==
      project004UniversalActivationContract.activationApproval
  ) {
    report.rootFailureCode =
      "UNIVERSAL_ACTIVATION_OWNER_APPROVAL_REQUIRED";
    return report;
  }
  const runner =
    options.runner ??
    createCanonicalRemoteDevCommandRunner(
      options.candidateRoot ?? process.cwd(),
    );
  report.activationAttempts = 1;
  const result = command(
    runner,
    buildProject004UniversalActivationSql(),
    preflight.config,
    preflight.resolvedEndpoint,
    options.environment,
  );
  const transaction =
    parseProject004UniversalActivationResponse(
      result,
      `${project004UniversalActivationContract.version}:COMMIT|ACTIVE`,
    );
  report.activationSqlstate = transaction.sqlstate;
  report.activationFailureStage =
    transaction.failureStage;
  report.activationFailedStatementClass =
    transaction.failedStatementClass;
  report.activationPreconditionId =
    transaction.preconditionId;
  report.transactionRollback =
    transaction.transactionRollback;
  report.currentRunMutationPerformed = transaction.ok
    ? "YES"
    : "POSSIBLE";
  if (!transaction.ok) {
    const rollbackCheck =
      executeProject004UniversalActivationPreflight({
        environment: options.environment,
        candidateRoot: options.candidateRoot,
        runner,
        semanticFingerprintVerifier:
          options.semanticFingerprintVerifier,
        expectedState: "DRAFT_INACTIVE",
      });
    if (rollbackCheck.ok) {
      report.transactionRollback = "PASS";
      report.currentRunMutationPerformed = "NO";
    }
    report.rootFailureCode =
      transaction.parserFailureCode !== "NONE"
        ? transaction.parserFailureCode
        : "UNIVERSAL_ACTIVATION_TRANSACTION_FAILED";
    return report;
  }
  const post =
    executeProject004UniversalActivationPreflight({
      environment: options.environment,
      candidateRoot: options.candidateRoot,
      runner,
      semanticFingerprintVerifier:
        options.semanticFingerprintVerifier,
      expectedState: "ACTIVE",
      allowExistingHistory: true,
    });
  if (!post.ok) {
    report.rootFailureCode =
      "UNIVERSAL_ACTIVATION_POSTCHECK_FAILED";
    return report;
  }
  report.ok = true;
  report.postActivationDiagnostic = "PASS";
  report.releaseState = "ACTIVE/ACTIVE";
  report.releaseBank = "171/2052/2052/546";
  report.adaptivePilot = "DISABLED";
  report.activationSqlstate = "NONE";
  report.activationFailureStage = "NONE";
  report.activationFailedStatementClass = "NONE";
  report.activationPreconditionId = "NONE";
  report.transactionRollback = "NOT_APPLICABLE";
  report.rootFailureCode = "NONE";
  return report;
}

export function executeProject004UniversalDeactivationOnce(
  options: {
    environment: NodeJS.ProcessEnv;
    approval: string;
    candidateRoot?: string;
    runner?: RemoteDevCommandRunner;
    semanticFingerprintVerifier?: (output: string) => boolean;
  },
): UniversalDeactivationOperationReport {
  const preflight =
    executeProject004UniversalActivationPreflight({
      environment: options.environment,
      candidateRoot: options.candidateRoot,
      runner: options.runner,
      semanticFingerprintVerifier:
        options.semanticFingerprintVerifier,
      expectedState: "ACTIVE",
      allowExistingHistory: true,
    });
  const report: UniversalDeactivationOperationReport = {
    ok: false,
    preflight,
    deactivationAttempts: 0,
    postDeactivationDiagnostic: "NOT_RUN",
    releaseState: "NOT_RUN",
    historyPreserved: "NOT_RUN",
    resumePolicy: "NOT_RUN",
    currentRunMutationPerformed: "NO",
    rootFailureCode: preflight.rootFailureCode,
  };
  if (!preflight.ok || !preflight.config || !preflight.resolvedEndpoint) {
    return report;
  }
  if (
    project004UniversalActivationContract
      .deactivationAuthorizationStatus !==
      "OWNER_APPROVED_FOR_ONE_TIME_DEACTIVATION" ||
    options.approval !==
      project004UniversalActivationContract.deactivationApproval
  ) {
    report.rootFailureCode =
      "UNIVERSAL_DEACTIVATION_OWNER_APPROVAL_REQUIRED";
    return report;
  }
  const runner =
    options.runner ??
    createCanonicalRemoteDevCommandRunner(
      options.candidateRoot ?? process.cwd(),
    );
  report.deactivationAttempts = 1;
  const result = command(
    runner,
    buildProject004UniversalDeactivationSql(),
    preflight.config,
    preflight.resolvedEndpoint,
    options.environment,
  );
  report.currentRunMutationPerformed = result.ok
    ? "YES"
    : "POSSIBLE";
  if (
    !parseProject004UniversalActivationResponse(
      result,
      `${project004UniversalActivationContract.version}:COMMIT|INACTIVE`,
    ).ok
  ) {
    report.rootFailureCode =
      "UNIVERSAL_DEACTIVATION_TRANSACTION_FAILED";
    return report;
  }
  const post =
    executeProject004UniversalActivationPreflight({
      environment: options.environment,
      candidateRoot: options.candidateRoot,
      runner,
      semanticFingerprintVerifier:
        options.semanticFingerprintVerifier,
      expectedState: "DRAFT_INACTIVE",
      allowExistingHistory: true,
    });
  if (!post.ok) {
    report.rootFailureCode =
      "UNIVERSAL_DEACTIVATION_POSTCHECK_FAILED";
    return report;
  }
  report.ok = true;
  report.postDeactivationDiagnostic = "PASS";
  report.releaseState = "DRAFT/INACTIVE";
  report.historyPreserved = "PASS";
  report.resumePolicy =
    project004UniversalActivationContract.deactivationResumePolicy;
  report.rootFailureCode = "NONE";
  return report;
}
