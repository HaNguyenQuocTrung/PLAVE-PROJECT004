import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  DisposableMigrationWorkspaceFailure,
  cleanupPreparedDisposableMigrationWorkspace,
  clearDisposableMigrationWorkspaceSmokeMarker,
  prepareDisposableMigrationWorkspace,
  writeDisposableMigrationWorkspaceSmokeMarker,
  type DisposableMigrationWorkspaceReport,
  type PreparedDisposableMigrationWorkspace,
} from "./project004-disposable-migration-workspace.ts";
import type { DisposablePorts } from "./project004-disposable-port-reservation.ts";
import { assertProject004Workspace } from "./project004-identity.ts";

const smokePorts: DisposablePorts = {
  api: 61001,
  database: 61002,
  shadow: 61003,
  pooler: 61004,
  studio: 61005,
  mail: 61006,
  analytics: 61007,
};

export type DisposableMigrationWorkspaceSmokeResult = {
  report?: DisposableMigrationWorkspaceReport;
  cleanup: "PASS" | "FAIL";
  rootFailureCode: string;
};

export function runDisposableMigrationWorkspaceSmoke(
  candidateRoot = process.cwd(),
): DisposableMigrationWorkspaceSmokeResult {
  const root = assertProject004Workspace(candidateRoot);
  clearDisposableMigrationWorkspaceSmokeMarker(root);
  let prepared:
    | PreparedDisposableMigrationWorkspace
    | undefined;
  try {
    prepared = prepareDisposableMigrationWorkspace({
      candidateRoot: root,
      projectId:
        "plave-project004-clean-proof-000000000000",
      ports: smokePorts,
    });
    const cleanup =
      cleanupPreparedDisposableMigrationWorkspace(prepared)
        ? "PASS"
        : "FAIL";
    if (cleanup !== "PASS") {
      return {
        report: prepared.report,
        cleanup,
        rootFailureCode:
          "DISPOSABLE_WORKSPACE_SMOKE_CLEANUP_FAILED",
      };
    }
    writeDisposableMigrationWorkspaceSmokeMarker(root);
    return {
      report: prepared.report,
      cleanup,
      rootFailureCode: "NONE",
    };
  } catch (error) {
    const cleanup =
      prepared === undefined ||
      cleanupPreparedDisposableMigrationWorkspace(prepared)
        ? "PASS"
        : "FAIL";
    return {
      report:
        error instanceof DisposableMigrationWorkspaceFailure
          ? error.report
          : undefined,
      cleanup,
      rootFailureCode:
        error instanceof DisposableMigrationWorkspaceFailure
          ? error.code
          : "DISPOSABLE_WORKSPACE_SMOKE_UNCLASSIFIED",
    };
  }
}

export function renderDisposableMigrationWorkspaceSmoke(
  result: DisposableMigrationWorkspaceSmokeResult,
) {
  const report = result.report;
  const workspacePass =
    report?.workspacePreparation === "PASS" &&
    result.cleanup === "PASS" &&
    result.rootFailureCode === "NONE";
  return [
    "PROJECT004_CANONICAL=PASS",
    `SOURCE_DISCOVERED_COUNT=${report?.sourceDiscoveredCount ?? "NOT_RUN"}`,
    `SOURCE_PARSED_COUNT=${report?.sourceParsedCount ?? "NOT_RUN"}`,
    `SOURCE_FIRST_LAST=${
      report
        ? `${report.sourceFirst}/${report.sourceLast}`
        : "NOT_RUN/NOT_RUN"
    }`,
    `SOURCE_CHECKSUMS=${report?.sourceChecksums ?? "NOT_RUN"}`,
    `TEMP_COPY_COUNT=${report?.tempCopyCount ?? "NOT_RUN"}`,
    `TEMP_PARSED_COUNT=${report?.tempParsedCount ?? "NOT_RUN"}`,
    `TEMP_FIRST_LAST=${
      report
        ? `${report.tempFirst}/${report.tempLast}`
        : "NOT_RUN/NOT_RUN"
    }`,
    `TEMP_CHECKSUM_MISMATCH_COUNT=${
      report?.tempChecksumMismatchCount ?? "NOT_RUN"
    }`,
    `EXPECTED_BOUNDARY=${report?.expectedBoundary ?? "40/0001/0040"}`,
    `ACTUAL_BOUNDARY=${report?.actualBoundary ?? "NOT_RUN/NOT_RUN/NOT_RUN"}`,
    `FAILED_BOUNDARY_SUBCONDITION=${
      report?.failedBoundarySubconditions.length
        ? report.failedBoundarySubconditions.join(",")
        : "NONE"
    }`,
    `WORKSPACE_PREPARATION=${workspacePass ? "PASS" : "FAIL"}`,
    `TEMP_WORKSPACE_CLEANUP=${result.cleanup}`,
    "MIGRATION_EXECUTION_STARTED=NO",
    "DOCKER_EXECUTION_PERFORMED=NO",
    "SUPABASE_EXECUTION_PERFORMED=NO",
    "REMOTE_ACCESS_PERFORMED=NO",
    "REMOTE_MUTATION_PERFORMED=NO",
    "PROJECT003=FROZEN_UNTOUCHED",
    `ROOT_FAILURE_CODE=${result.rootFailureCode}`,
  ].join("\n") + "\n";
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  const result = runDisposableMigrationWorkspaceSmoke();
  process.stdout.write(
    renderDisposableMigrationWorkspaceSmoke(result),
  );
  process.exitCode =
    result.rootFailureCode === "NONE" ? 0 : 1;
}
