import { RemoteDevGuardFailure } from "./project004-remote-dev-guard.ts";

export type Project004PostTransactionValidationId =
  | "V001_MIGRATION_HISTORY"
  | "V002_RELEASE_SCOPED_COUNTS"
  | "V003_RELEASE_STATE"
  | "V004_LEGACY_BASELINE"
  | "V005_PHYSICAL_TABLE_TOTALS"
  | "V006_ADAPTIVE_RUNTIME_PILOT"
  | "V007_IDENTITY_HISTORY_RUNTIME_EMPTY"
  | "V008_RLS_PRIVATE_BOUNDARY"
  | "V009_SCHEMA_FUNCTION_AUTH_BOUNDARY";

export const project004PostTransactionValidationIds:
  readonly Project004PostTransactionValidationId[] = [
    "V001_MIGRATION_HISTORY",
    "V002_RELEASE_SCOPED_COUNTS",
    "V003_RELEASE_STATE",
    "V004_LEGACY_BASELINE",
    "V005_PHYSICAL_TABLE_TOTALS",
    "V006_ADAPTIVE_RUNTIME_PILOT",
    "V007_IDENTITY_HISTORY_RUNTIME_EMPTY",
    "V008_RLS_PRIVATE_BOUNDARY",
    "V009_SCHEMA_FUNCTION_AUTH_BOUNDARY",
  ];

export type Project004PostTransactionCounts = {
  migrationRows: number;
  canonicalMigrationRows: number;
  migrationFirst: string;
  migrationLast: string;
  releases: number;
  canonicalReleaseRows: number;
  draftInactiveReleases: number;
  activeReleases: number;
  units: number;
  publicQuestions: number;
  privateSolutions: number;
  officialOutcomes: number;
  foreignReleaseContentRows: number;
  legacyLearningUnits: number;
  publishedLearningUnits: number;
  legacyQuestions: number;
  publishedQuestions: number;
  legacySolutions: number;
  diagnosticBlueprintRows: number;
  legacyNonCanonicalRows: number;
  physicalUnitRows: number;
  physicalQuestionRows: number;
  physicalSolutionRows: number;
  authUsers: number;
  storageObjects: number;
  syntheticUserRows: number;
  adaptiveReleaseRows: number;
  adaptiveExactDisabledRows: number;
  adaptiveEnabledRows: number;
  adaptivePilotRows: number;
  runtimeSecretRows: number;
  onDemandRuntimeRows: number;
  rlsGaps: number;
  privateGrantLeaks: number;
  requiredTables: number;
  requiredFunctions: number;
  authTriggers: number;
  pgcryptoExtensions: number;
};

export type Project004PostTransactionValidationFailure = {
  id: Project004PostTransactionValidationId;
  observed: string;
  expected: string;
};

export class Project004PostTransactionValidationError extends RemoteDevGuardFailure {
  readonly validationId: Project004PostTransactionValidationId;
  readonly observed: string;
  readonly expected: string;

  constructor(
    failure: Project004PostTransactionValidationFailure,
  ) {
    super("POST_APPLY_DIAGNOSTIC_MISMATCH");
    this.validationId = failure.id;
    this.observed = failure.observed;
    this.expected = failure.expected;
  }
}

function aggregate(...values: Array<string | number>) {
  return values.join("/");
}

export function firstProject004PostTransactionValidationFailure(
  counts: Project004PostTransactionCounts,
): Project004PostTransactionValidationFailure | null {
  if (
    counts.migrationRows !== 40 ||
    counts.canonicalMigrationRows !== 40 ||
    counts.migrationFirst !== "0001" ||
    counts.migrationLast !== "0040"
  ) {
    return {
      id: "V001_MIGRATION_HISTORY",
      observed: aggregate(
        counts.migrationRows,
        counts.canonicalMigrationRows,
        counts.migrationFirst,
        counts.migrationLast,
      ),
      expected: "40/40/0001/0040",
    };
  }
  if (
    counts.canonicalReleaseRows !== 1 ||
    counts.units !== 171 ||
    counts.publicQuestions !== 2052 ||
    counts.privateSolutions !== 2052 ||
    counts.officialOutcomes !== 546
  ) {
    return {
      id: "V002_RELEASE_SCOPED_COUNTS",
      observed: aggregate(
        counts.canonicalReleaseRows,
        counts.units,
        counts.publicQuestions,
        counts.privateSolutions,
        counts.officialOutcomes,
      ),
      expected: "1/171/2052/2052/546",
    };
  }
  if (
    counts.releases !== 1 ||
    counts.draftInactiveReleases !== 1 ||
    counts.activeReleases !== 0
  ) {
    return {
      id: "V003_RELEASE_STATE",
      observed: aggregate(
        counts.releases,
        counts.draftInactiveReleases,
        counts.activeReleases,
      ),
      expected: "1/1/0",
    };
  }
  const draftUnits =
    counts.legacyLearningUnits -
    counts.publishedLearningUnits;
  const draftQuestions =
    counts.legacyQuestions - counts.publishedQuestions;
  if (
    counts.legacyLearningUnits !== 14 ||
    counts.publishedLearningUnits !== 13 ||
    draftUnits !== 1 ||
    counts.legacyQuestions !== 336 ||
    counts.publishedQuestions !== 312 ||
    draftQuestions !== 24 ||
    counts.legacySolutions !== 336 ||
    counts.diagnosticBlueprintRows !== 24 ||
    counts.legacyNonCanonicalRows !== 0
  ) {
    return {
      id: "V004_LEGACY_BASELINE",
      observed: aggregate(
        counts.legacyLearningUnits,
        counts.publishedLearningUnits,
        draftUnits,
        counts.legacyQuestions,
        counts.publishedQuestions,
        draftQuestions,
        counts.legacySolutions,
        counts.diagnosticBlueprintRows,
        counts.legacyNonCanonicalRows,
      ),
      expected: "14/13/1/336/312/24/336/24/0",
    };
  }
  if (
    counts.physicalUnitRows !== 185 ||
    counts.physicalQuestionRows !== 2388 ||
    counts.physicalSolutionRows !== 2388 ||
    counts.foreignReleaseContentRows !== 0
  ) {
    return {
      id: "V005_PHYSICAL_TABLE_TOTALS",
      observed: aggregate(
        counts.physicalUnitRows,
        counts.physicalQuestionRows,
        counts.physicalSolutionRows,
        counts.foreignReleaseContentRows,
      ),
      expected: "185/2388/2388/0",
    };
  }
  if (
    counts.adaptiveReleaseRows !== 1 ||
    counts.adaptiveExactDisabledRows !== 1 ||
    counts.adaptiveEnabledRows !== 0 ||
    counts.adaptivePilotRows !== 0
  ) {
    return {
      id: "V006_ADAPTIVE_RUNTIME_PILOT",
      observed: aggregate(
        counts.adaptiveReleaseRows,
        counts.adaptiveExactDisabledRows,
        counts.adaptiveEnabledRows,
        counts.adaptivePilotRows,
      ),
      expected: "1/1/0/0",
    };
  }
  if (
    counts.authUsers !== 0 ||
    counts.storageObjects !== 0 ||
    counts.syntheticUserRows !== 0 ||
    counts.runtimeSecretRows !== 0 ||
    counts.onDemandRuntimeRows !== 0
  ) {
    return {
      id: "V007_IDENTITY_HISTORY_RUNTIME_EMPTY",
      observed: aggregate(
        counts.authUsers,
        counts.storageObjects,
        counts.syntheticUserRows,
        counts.runtimeSecretRows,
        counts.onDemandRuntimeRows,
      ),
      expected: "0/0/0/0/0",
    };
  }
  if (
    counts.rlsGaps !== 0 ||
    counts.privateGrantLeaks !== 0
  ) {
    return {
      id: "V008_RLS_PRIVATE_BOUNDARY",
      observed: aggregate(
        counts.rlsGaps,
        counts.privateGrantLeaks,
      ),
      expected: "0/0",
    };
  }
  if (
    counts.requiredTables !== 23 ||
    counts.requiredFunctions !== 18 ||
    counts.authTriggers !== 1 ||
    counts.pgcryptoExtensions !== 1
  ) {
    return {
      id: "V009_SCHEMA_FUNCTION_AUTH_BOUNDARY",
      observed: aggregate(
        counts.requiredTables,
        counts.requiredFunctions,
        counts.authTriggers,
        counts.pgcryptoExtensions,
      ),
      expected: "23/18/1/1",
    };
  }
  return null;
}

export function verifyProject004PostTransactionCounts(
  counts: Project004PostTransactionCounts,
) {
  const failure =
    firstProject004PostTransactionValidationFailure(counts);
  if (failure) {
    throw new Project004PostTransactionValidationError(
      failure,
    );
  }
  return counts;
}
