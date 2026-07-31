import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  analyzeBootstrapFailure,
  renderBootstrapDiagnostic,
  runBootstrapOnlyDiagnostic,
} from "./project004-supabase-bootstrap-diagnostic.ts";

function renderSmoke() {
  const result = analyzeBootstrapFailure({
    cliOutput:
      "failed to start docker container: health check failed",
    containers: [
      {
        service: "DATABASE",
        state: "exited",
        exitCode: 1,
        health: "unhealthy",
        logCategory: "PERMISSION_DENIED",
        imageAvailable: true,
      },
    ],
  });
  if (
    result.firstServiceFailed !== "DATABASE" ||
    result.serviceHealthCategory !== "PERMISSION_DENIED" ||
    result.rootCauseConfidence !== "HIGH"
  ) {
    throw new Error("BOOTSTRAP_DIAGNOSTIC_SMOKE_FAILED");
  }
  return (
    "BOOTSTRAP_DIAGNOSTIC_SMOKE=PASS\n" +
    "MIGRATION_SQL_EXECUTION_STARTED=NO\n" +
    "REMOTE_ACCESS_PERFORMED=NO\n" +
    "REMOTE_MUTATION_PERFORMED=NO\n"
  );
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  if (process.argv.includes("--smoke")) {
    try {
      process.stdout.write(renderSmoke());
    } catch {
      process.stdout.write(
        "BOOTSTRAP_DIAGNOSTIC_SMOKE=FAIL\n" +
          "MIGRATION_SQL_EXECUTION_STARTED=NO\n" +
          "REMOTE_ACCESS_PERFORMED=NO\n" +
          "REMOTE_MUTATION_PERFORMED=NO\n",
      );
      process.exitCode = 1;
    }
  } else {
    try {
      process.stdout.write(
        renderBootstrapDiagnostic(
          await runBootstrapOnlyDiagnostic(),
        ),
      );
    } catch {
      process.stdout.write(
        "DOCKER_DAEMON=FAIL\n" +
          "DOCKER_RESOURCE_STATE=UNKNOWN\n" +
          "HOST_ARCHITECTURE=OTHER\n" +
          "SUPABASE_CLI_VERSION=NOT_RUN\n" +
          "SUPABASE_CLI_VERSION_COMPATIBILITY=FAIL\n" +
          "TEMP_CONFIG_VALIDATION=NOT_RUN\n" +
          "DISPOSABLE_PORT_SET=NOT_RUN\n" +
          "FIRST_SERVICE_FAILED=CLI\n" +
          "SERVICE_EXIT_CATEGORY=NOT_AVAILABLE\n" +
          "SERVICE_HEALTH_CATEGORY=UNRECOGNIZED\n" +
          "IMAGE_STATE=UNKNOWN\n" +
          "BOOTSTRAP_TIMEOUT_STAGE=NONE\n" +
          "BASELINE_STACK_READY=FAIL\n" +
          "FIRST_MIGRATION_FAILED=NOT_RUN\n" +
          "MIGRATION_SQL_EXECUTION_STARTED=NO\n" +
          "DISPOSABLE_CLEANUP=NOT_RUN\n" +
          "ROOT_FAILURE_CODE=BOOTSTRAP_DIAGNOSTIC_UNCLASSIFIED_FAILURE\n" +
          "ROOT_CAUSE_CONFIDENCE=LOW\n" +
          "REMOTE_ACCESS_PERFORMED=NO\n" +
          "REMOTE_MUTATION_PERFORMED=NO\n" +
          "PROJECT003=FROZEN_UNTOUCHED\n",
      );
      process.exitCode = 1;
    }
  }
}
