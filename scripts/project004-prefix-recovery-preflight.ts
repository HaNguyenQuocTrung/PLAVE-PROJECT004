import {
  createAuditedRemoteIncidentRunner,
  type IncidentAuditCommandCounts,
} from "./project004-remote-dev-audited-runner.ts";
import {
  buildProject004ForeignObjectInspectionSql,
} from "./project004-remote-dev-baseline.ts";
import {
  RemoteDevGuardFailure,
  assertLocalIsolation,
  assertRemoteDevTarget,
  buildRemoteDatabaseEnvironment,
  createCanonicalRemoteDevCommandRunner,
  verifyProjectRecords,
  type RemoteDevPrivateConfig,
} from "./project004-remote-dev-guard.ts";
import {
  parseSafeForeignObjectInspection,
  type SafeForeignObjectInspection,
} from "./inspect-project004-remote-foreign-object.ts";
import {
  comparePrefixSemanticFingerprints,
  buildProject004PrefixSemanticFingerprintSql,
  parsePrefixSemanticFingerprint,
  type PrefixSemanticFingerprint,
} from "./project004-prefix-semantic-fingerprint.ts";
import {
  assessForwardRecoveryEligibility,
  buildForwardRecoveryPreconditionSql,
  classifyRecoveryExtraObject,
  loadPrefixSemanticManifest,
  parseForwardRecoveryPrecondition,
  semanticFingerprintFromManifest,
  type RecoveryExtraObjectClassification,
} from "./project004-prefix-recovery-contract.ts";
import {
  executeRemotePartialStateIncidentAudit,
  type RemotePartialStateAuditReport,
} from "./project004-remote-partial-state-audit.ts";
import { runCanonicalSupabaseCliAuthCheck } from "./project004-supabase-cli-auth.ts";
import type {
  RemoteDevCommandRunner,
} from "./project004-remote-dev-operations.ts";

export type PrefixRecoveryPreflightReport = {
  ok: boolean;
  rootFailureCode: string;
  currentRunMutationPerformed: "NO";
  preexistingRemoteApplicationState:
    | "YES"
    | "NO"
    | "NOT_RUN";
  incident: RemotePartialStateAuditReport | null;
  canonicalSemanticFingerprint:
    | "VERIFIED"
    | "UNVERIFIED";
  remoteSemanticFingerprint:
    | "MATCH"
    | "MISMATCH"
    | "NOT_RUN";
  semanticMismatchCount: number | "NOT_RUN";
  extraObjectClassification: RecoveryExtraObjectClassification;
  forwardPreconditions: "PASS" | "FAIL" | "NOT_RUN";
  migration0039FreshLocal: "PASS" | "UNVERIFIED";
  migration0040FreshLocal: "PASS" | "UNVERIFIED";
  partialStateRecoveryEligible: "YES" | "NO";
  effectiveExtraObjectCount: number | "NOT_RUN";
  commandCounts: IncidentAuditCommandCounts;
};

function configFromEnvironment(
  environment: NodeJS.ProcessEnv,
): RemoteDevPrivateConfig {
  return {
    projectName:
      environment.PLAVE_PROJECT004_REMOTE_TARGET_NAME ?? "",
    projectRef:
      environment.PLAVE_PROJECT004_REMOTE_PROJECT_REF ?? "",
    databasePassword:
      environment.PLAVE_PROJECT004_REMOTE_DB_PASSWORD ?? "",
    environmentClass:
      environment.PLAVE_PROJECT004_REMOTE_ENVIRONMENT_CLASS ?? "",
  };
}

function emptyCommandCounts(): IncidentAuditCommandCounts {
  return {
    projectList: 0,
    readOnlySql: 0,
    mutation: 0,
    unexpected: 0,
  };
}

function emptyReport(): PrefixRecoveryPreflightReport {
  return {
    ok: false,
    rootFailureCode: "PREFIX_RECOVERY_PREFLIGHT_NOT_RUN",
    currentRunMutationPerformed: "NO",
    preexistingRemoteApplicationState: "NOT_RUN",
    incident: null,
    canonicalSemanticFingerprint: "UNVERIFIED",
    remoteSemanticFingerprint: "NOT_RUN",
    semanticMismatchCount: "NOT_RUN",
    extraObjectClassification: "FOREIGN_OR_UNVERIFIED",
    forwardPreconditions: "NOT_RUN",
    migration0039FreshLocal: "UNVERIFIED",
    migration0040FreshLocal: "UNVERIFIED",
    partialStateRecoveryEligible: "NO",
    effectiveExtraObjectCount: "NOT_RUN",
    commandCounts: emptyCommandCounts(),
  };
}

function runReadOnlySql(
  sql: string,
  config: RemoteDevPrivateConfig,
  environment: NodeJS.ProcessEnv,
  runner: RemoteDevCommandRunner,
) {
  return runner(
    "psql",
    [
      "--no-psqlrc",
      "--quiet",
      "--tuples-only",
      "--no-align",
      "--set",
      "ON_ERROR_STOP=1",
      "--command",
      sql,
    ],
    buildRemoteDatabaseEnvironment(config, environment),
  );
}

function requireReadOnlyOutput(
  result: ReturnType<RemoteDevCommandRunner>,
  code: string,
) {
  if (!result.ok || !result.stdout.trim()) {
    throw new RemoteDevGuardFailure(code);
  }
  return result.stdout;
}

export function executePrefixRecoveryReadOnlyPreflight(options: {
  environment: NodeJS.ProcessEnv;
  candidateRoot?: string;
  runner?: RemoteDevCommandRunner;
}): PrefixRecoveryPreflightReport {
  const candidateRoot = options.candidateRoot ?? process.cwd();
  const environment = options.environment;
  const report = emptyReport();
  const delegate =
    options.runner ??
    createCanonicalRemoteDevCommandRunner(candidateRoot);
  const audited = createAuditedRemoteIncidentRunner(delegate);
  report.commandCounts = audited.counts;
  try {
    const { root, plan, manifest } =
      loadPrefixSemanticManifest(candidateRoot);
    report.canonicalSemanticFingerprint =
      manifest.canonicalCatalogStatus;
    report.migration0039FreshLocal =
      manifest.freshLocalIntegration.migration0039;
    report.migration0040FreshLocal =
      manifest.freshLocalIntegration.migration0040;

    const incident =
      executeRemotePartialStateIncidentAudit({
        environment,
        candidateRoot,
        runner: audited.runner,
      });
    report.incident = incident;
    report.preexistingRemoteApplicationState =
      incident.preexistingRemoteApplicationState;
    if (!incident.ok) {
      report.rootFailureCode = incident.rootFailureCode;
      return report;
    }

    const config = configFromEnvironment(environment);
    assertRemoteDevTarget(config);
    assertLocalIsolation(config, candidateRoot);
    const auth = runCanonicalSupabaseCliAuthCheck({
      environment,
      candidateRoot,
      runner: audited.runner,
    });
    verifyProjectRecords(auth.projects, config);

    let inspection: SafeForeignObjectInspection | null = null;
    if (
      (incident.baselineCounts?.foreignApplicationObjects ?? 0) >
      0
    ) {
      inspection = parseSafeForeignObjectInspection(
        requireReadOnlyOutput(
          runReadOnlySql(
            buildProject004ForeignObjectInspectionSql(root, plan),
            config,
            environment,
            audited.runner,
          ),
          "PREFIX_EXTRA_OBJECT_INSPECTION_FAILED",
        ),
      );
    }
    report.extraObjectClassification =
      classifyRecoveryExtraObject({
        extraObjectCount:
          incident.schema?.extraObjects ?? -1,
        inspection,
      });

    const canonical =
      semanticFingerprintFromManifest(manifest);
    let observed: PrefixSemanticFingerprint | null = null;
    let semanticMatches = false;
    let semanticMismatchCount = 0;
    if (canonical) {
      observed = parsePrefixSemanticFingerprint(
        requireReadOnlyOutput(
          runReadOnlySql(
            buildProject004PrefixSemanticFingerprintSql(
              candidateRoot,
              38,
            ),
            config,
            environment,
            audited.runner,
          ),
          "PREFIX_SEMANTIC_FINGERPRINT_FAILED",
        ),
      );
      const comparison = comparePrefixSemanticFingerprints(
        canonical,
        observed,
      );
      semanticMatches = comparison.matches;
      semanticMismatchCount = comparison.mismatchCount;
      report.remoteSemanticFingerprint = comparison.matches
        ? "MATCH"
        : "MISMATCH";
      report.semanticMismatchCount = comparison.mismatchCount;
    }

    const preconditions = parseForwardRecoveryPrecondition(
      requireReadOnlyOutput(
        runReadOnlySql(
          buildForwardRecoveryPreconditionSql(),
          config,
          environment,
          audited.runner,
        ),
        "FORWARD_PRECONDITION_INSPECTION_FAILED",
      ),
    );
    report.forwardPreconditions = preconditions.pass
      ? "PASS"
      : "FAIL";

    const eligibility = assessForwardRecoveryEligibility({
      incident,
      semanticFingerprintMatches: semanticMatches,
      semanticMismatchCount,
      extraObjectClassification:
        report.extraObjectClassification,
      forwardPreconditionsPass: preconditions.pass,
      migration0039FreshLocalPass:
        manifest.freshLocalIntegration.migration0039 === "PASS",
      migration0040FreshLocalPass:
        manifest.freshLocalIntegration.migration0040 === "PASS",
    });
    report.effectiveExtraObjectCount =
      eligibility.effectiveExtraObjectCount;
    report.partialStateRecoveryEligible =
      eligibility.eligible ? "YES" : "NO";
    report.ok =
      audited.counts.mutation === 0 &&
      audited.counts.unexpected === 0;
    report.rootFailureCode = eligibility.eligible
      ? "NONE"
      : canonical === null
        ? "CANONICAL_SEMANTIC_FINGERPRINT_UNVERIFIED"
        : observed && !semanticMatches
          ? "PREFIX_SEMANTIC_FINGERPRINT_MISMATCH"
          : report.extraObjectClassification ===
              "FOREIGN_OR_UNVERIFIED"
            ? "PREFIX_EXTRA_OBJECT_UNVERIFIED"
            : report.forwardPreconditions === "FAIL"
              ? "FORWARD_PRECONDITION_MISMATCH"
              : "FRESH_LOCAL_0039_0040_UNVERIFIED";
    return report;
  } catch (error) {
    report.rootFailureCode =
      error instanceof RemoteDevGuardFailure
        ? error.code
        : error instanceof Error
          ? error.message
          : "PREFIX_RECOVERY_PREFLIGHT_FAILED";
    return report;
  }
}
