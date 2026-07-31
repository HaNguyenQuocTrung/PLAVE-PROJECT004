import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  executeProject004UniversalDeactivationOnce,
  project004UniversalActivationContract,
} from "./project004-remote-universal-activation.ts";
import {
  promptProject004UniversalRemoteEnvironment,
} from "./run-project004-remote-universal-preflight.ts";
import type { SecurePromptResult } from "./project004-secure-tty-prompt.ts";
import {
  project004RemoteRuntimeContract,
  setProject004RemoteRuntimeUniversalFlag,
} from "./project004-remote-runtime-connection.ts";

export function runProject004UniversalDeactivationCommand(
  options?: {
    environment?: NodeJS.ProcessEnv;
    prompt?: (label: string) => SecurePromptResult;
    execute?: typeof executeProject004UniversalDeactivationOnce;
  },
) {
  if (
    project004UniversalActivationContract
      .deactivationAuthorizationStatus !==
    "OWNER_APPROVED_FOR_ONE_TIME_DEACTIVATION"
  ) {
    return {
      exitCode: 1,
      output: [
        "PROJECT004_CANONICAL=PASS",
        "DEACTIVATION_ATTEMPTS=0",
        "HISTORY_PRESERVED=NOT_RUN",
        "CURRENT_RUN_MUTATION_PERFORMED=NO",
        "ROOT_FAILURE_CODE=UNIVERSAL_DEACTIVATION_OWNER_APPROVAL_REQUIRED",
        "PROJECT004_UNIVERSAL_DEACTIVATION=FAIL",
        "",
      ].join("\n"),
    };
  }
  const prompted = promptProject004UniversalRemoteEnvironment(
    options,
  );
  if (!prompted.ok) {
    return {
      exitCode: 1,
      output: [
        "DEACTIVATION_ATTEMPTS=0",
        "CURRENT_RUN_MUTATION_PERFORMED=NO",
        `ROOT_FAILURE_CODE=${prompted.code}`,
        "PROJECT004_UNIVERSAL_DEACTIVATION=FAIL",
        "",
      ].join("\n"),
    };
  }
  try {
    const report = (
      options?.execute ??
      executeProject004UniversalDeactivationOnce
    )({
      environment: prompted.environment,
      approval:
        project004UniversalActivationContract.deactivationApproval,
    });
    let localRuntimeProfile:
      | "DISABLED"
      | "NOT_CONFIGURED"
      | "UPDATE_FAILED" = "NOT_CONFIGURED";
    if (report.ok) {
      const path = resolve(
        process.cwd(),
        project004RemoteRuntimeContract.environmentFile,
      );
      if (existsSync(path)) {
        try {
          setProject004RemoteRuntimeUniversalFlag(false);
          localRuntimeProfile = "DISABLED";
        } catch {
          localRuntimeProfile = "UPDATE_FAILED";
        }
      }
    }
    const localUpdateFailed =
      report.ok && localRuntimeProfile === "UPDATE_FAILED";
    return {
      exitCode: report.ok && !localUpdateFailed ? 0 : 1,
      output: [
        `DEACTIVATION_ATTEMPTS=${report.deactivationAttempts}`,
        `POST_DEACTIVATION_DIAGNOSTIC=${report.postDeactivationDiagnostic}`,
        `UNIVERSAL_RELEASE_AFTER=${report.releaseState}`,
        `HISTORY_PRESERVED=${report.historyPreserved}`,
        `RESUME_POLICY=${report.resumePolicy}`,
        `LOCAL_RUNTIME_PROFILE=${localRuntimeProfile}`,
        `CURRENT_RUN_MUTATION_PERFORMED=${report.currentRunMutationPerformed}`,
        `ROOT_FAILURE_CODE=${
          localUpdateFailed
            ? "REMOTE_DEACTIVATED_LOCAL_RUNTIME_PROFILE_UPDATE_FAILED"
            : report.rootFailureCode
        }`,
        `PROJECT004_UNIVERSAL_DEACTIVATION=${
          report.ok && !localUpdateFailed ? "PASS" : "FAIL"
        }`,
        "",
      ].join("\n"),
    };
  } finally {
    prompted.clear();
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  const result = runProject004UniversalDeactivationCommand();
  process.stdout.write(result.output);
  process.exitCode = result.exitCode;
}
