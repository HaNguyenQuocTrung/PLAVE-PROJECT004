import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  executeProject004UniversalActivationPreflight,
  type UniversalActivationPreflightReport,
} from "./project004-remote-universal-activation.ts";
import { project004RemoteDevContract } from "./project004-remote-dev-guard.ts";
import { runLocalRemoteDevPreflight } from "./project004-remote-dev-operations.ts";
import {
  readMaskedLineFromControllingTty,
  type SecurePromptResult,
} from "./project004-secure-tty-prompt.ts";

type SecurePrompt = (label: string) => SecurePromptResult;

function safePreflightFailure(
  rootFailureCode: string,
  candidateRoot = process.cwd(),
): UniversalActivationPreflightReport {
  const local = runLocalRemoteDevPreflight(candidateRoot);
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
    rootFailureCode,
    currentRunMutationPerformed: "NO",
  };
}

export function renderProject004UniversalActivationPreflight(
  report: UniversalActivationPreflightReport,
  options?: { includeTerminalFields?: boolean },
) {
  const counts = report.counts;
  return [
    `PROJECT004_CANONICAL=${report.project004Canonical}`,
    `LOCAL_MIGRATION_CHECKSUMS=${report.localMigrationChecksums}`,
    `CLEAN_DISPOSABLE_PROOF=${report.cleanDisposableProof}`,
    `REMOTE_IDENTITY_GUARD=${report.remoteIdentityGuard}`,
    `REMOTE_DATABASE_ENDPOINT_MODE=${report.endpointMode}`,
    `MIGRATIONS_APPLIED=${
      counts ? `${counts.migrationCount}/40` : "NOT_RUN"
    }`,
    `MIGRATION_FIRST_LAST=${
      counts
        ? `${counts.migrationFirst}/${counts.migrationLast}`
        : "NOT_RUN"
    }`,
    `SCHEMA_SEMANTIC_FINGERPRINT=${report.schemaFingerprint}`,
    `RELEASE_CONTRACT=${report.releaseContract}`,
    `RELEASE_BANK=${
      counts
        ? `${counts.units}/${counts.publicQuestions}/${counts.privateSolutions}/${counts.officialOutcomes}`
        : "NOT_RUN"
    }`,
    `UNIVERSAL_RELEASE=${
      counts
        ? `${counts.releaseStatus}/${counts.releaseActivationState}`
        : "NOT_RUN"
    }`,
    `GRADE1_LEGACY_BOUNDARY=${report.grade1LegacyBoundary}`,
    `GRADE2_CONTROLLED_ADAPTIVE_PILOT=${
      report.adaptivePilotDisabled === "PASS"
        ? "DISABLED"
        : "NOT_RUN"
    }`,
    `RLS_AND_PRIVATE_SOLUTION_BOUNDARY=${report.rlsPrivateBoundary}`,
    `PREEXISTING_CURRICULUM_HISTORY_ROWS=${
      counts?.curriculumHistoryRowCount ?? "NOT_RUN"
    }`,
    `ACTIVATION_ELIGIBLE=${report.activationEligible}`,
    ...(options?.includeTerminalFields === false
      ? []
      : [
          `CURRENT_RUN_MUTATION_PERFORMED=${report.currentRunMutationPerformed}`,
          `ROOT_FAILURE_CODE=${report.rootFailureCode}`,
          `PROJECT004_UNIVERSAL_ACTIVATION_PREFLIGHT=${
            report.ok ? "PASS" : "FAIL"
          }`,
          "",
        ]),
  ].join("\n");
}

export function promptProject004UniversalRemoteEnvironment(
  options?: {
    environment?: NodeJS.ProcessEnv;
    prompt?: SecurePrompt;
  },
) {
  const environment = {
    ...(options?.environment ?? process.env),
  };
  const prompt =
    options?.prompt ??
    ((label: string) =>
      readMaskedLineFromControllingTty({ label }));
  const projectRef = prompt(
    "Project004 clean remote project reference: ",
  );
  if (!projectRef.ok) {
    return { ok: false as const, code: projectRef.code };
  }
  const databasePassword = prompt(
    "Project004 clean remote database password: ",
  );
  if (!databasePassword.ok) {
    return {
      ok: false as const,
      code: databasePassword.code,
    };
  }
  environment.PLAVE_PROJECT004_REMOTE_TARGET_NAME =
    project004RemoteDevContract.projectName;
  environment.PLAVE_PROJECT004_REMOTE_PROJECT_REF =
    projectRef.value;
  environment.PLAVE_PROJECT004_REMOTE_DB_PASSWORD =
    databasePassword.value;
  environment.PLAVE_PROJECT004_REMOTE_ENVIRONMENT_CLASS =
    project004RemoteDevContract.environmentClass;
  return {
    ok: true as const,
    environment,
    clear() {
      environment.PLAVE_PROJECT004_REMOTE_PROJECT_REF = "";
      environment.PLAVE_PROJECT004_REMOTE_DB_PASSWORD = "";
    },
  };
}

export function runProject004UniversalActivationPreflightCommand(
  options?: {
    environment?: NodeJS.ProcessEnv;
    candidateRoot?: string;
    prompt?: SecurePrompt;
    execute?: typeof executeProject004UniversalActivationPreflight;
  },
) {
  const candidateRoot = options?.candidateRoot ?? process.cwd();
  // This archived operation is valid only for its frozen 0001-0040 workspace.
  // A modern 0001-0044 checkout must fail before prompting or remote access.
  const localMigrationCount = readdirSync(resolve(candidateRoot, "supabase/migrations"))
    .filter((filename) => /^[0-9]{4}_.+[.]sql$/u.test(filename)).length;
  if (localMigrationCount !== project004RemoteDevContract.migrationCount) {
    const report = safePreflightFailure("LOCAL_CHECKSUM_MISMATCH", candidateRoot);
    return { exitCode: 1, report, output: renderProject004UniversalActivationPreflight(report) };
  }
  const local = runLocalRemoteDevPreflight(candidateRoot);
  if (!local.ok) {
    const report = safePreflightFailure(
      local.failureCode ?? "LOCAL_PREFLIGHT_FAILED",
      candidateRoot,
    );
    return {
      exitCode: 1,
      report,
      output:
        renderProject004UniversalActivationPreflight(report),
    };
  }
  const prompted = promptProject004UniversalRemoteEnvironment(
    options,
  );
  if (!prompted.ok) {
    const report = safePreflightFailure(
      prompted.code,
      candidateRoot,
    );
    return {
      exitCode: 1,
      report,
      output:
        renderProject004UniversalActivationPreflight(report),
    };
  }
  try {
    const report = (
      options?.execute ??
      executeProject004UniversalActivationPreflight
    )({
      environment: prompted.environment,
      candidateRoot,
    });
    return {
      exitCode: report.ok ? 0 : 1,
      report,
      output:
        renderProject004UniversalActivationPreflight(report),
    };
  } finally {
    prompted.clear();
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  const result =
    runProject004UniversalActivationPreflightCommand();
  process.stdout.write(result.output);
  process.exitCode = result.exitCode;
}
