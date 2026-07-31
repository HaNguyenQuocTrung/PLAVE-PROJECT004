import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { assertProject004Workspace } from "./project004-identity.ts";
import {
  createProject004RemoteRuntimeConfig,
  Project004RemoteRuntimeFailure,
  writeProject004RemoteRuntimeConfigFile,
} from "./project004-remote-runtime-connection.ts";
import {
  readMaskedLineFromControllingTty,
  type SecurePromptResult,
} from "./project004-secure-tty-prompt.ts";

type SecurePrompt = (label: string) => SecurePromptResult;

function hashFileIfPresent(path: string) {
  return existsSync(path)
    ? createHash("sha256")
        .update(readFileSync(path))
        .digest("hex")
    : "ABSENT";
}

function promptValue(prompt: SecurePrompt, label: string) {
  const result = prompt(label);
  if (!result.ok) throw new Project004RemoteRuntimeFailure(result.code);
  return result.value;
}

export function configureProject004RemoteRuntime(options?: {
  candidateRoot?: string;
  prompt?: SecurePrompt;
}) {
  const root = assertProject004Workspace(
    options?.candidateRoot ?? process.cwd(),
  );
  const prompt =
    options?.prompt ??
    ((label: string) =>
      readMaskedLineFromControllingTty({ label }));
  const localEnvironmentPath = resolve(root, ".env.local");
  const localEnvironmentHashBefore = hashFileIfPresent(
    localEnvironmentPath,
  );
  let projectRef = "";
  let publicUrl = "";
  let publishableKey = "";
  let targetName = "";
  try {
    targetName = promptValue(
      prompt,
      "Project004 clean remote target name: ",
    );
    projectRef = promptValue(
      prompt,
      "Project004 clean remote project reference: ",
    );
    publicUrl = promptValue(
      prompt,
      "Project004 clean remote API URL: ",
    );
    publishableKey = promptValue(
      prompt,
      "Project004 clean remote publishable or anon key: ",
    );
    const config = createProject004RemoteRuntimeConfig({
      targetName,
      projectRef,
      publicUrl,
      publishableKey,
    });
    writeProject004RemoteRuntimeConfigFile(config, root);
    const localEnvironmentUnchanged =
      localEnvironmentHashBefore ===
      hashFileIfPresent(localEnvironmentPath);
    if (!localEnvironmentUnchanged) {
      throw new Project004RemoteRuntimeFailure(
        "LOCAL_ENVIRONMENT_CHANGED",
      );
    }
    return {
      exitCode: 0,
      output: [
        "PROJECT004_CANONICAL=PASS",
        "REMOTE_RUNTIME_TARGET_GUARD=PASS",
        "REMOTE_RUNTIME_ENV_FILE=CREATED_0600",
        "LOCAL_ENVIRONMENT_UNCHANGED=PASS",
        "SERVICE_ROLE_CONFIGURED=NO",
        "DATABASE_CONNECTION_CONFIGURED=NO",
        "REMOTE_ACCESS_PERFORMED=NO",
        "REMOTE_MUTATION_PERFORMED=NO",
        "ROOT_FAILURE_CODE=NONE",
        "",
      ].join("\n"),
    };
  } catch (error) {
    const code =
      error instanceof Project004RemoteRuntimeFailure
        ? error.code
        : "REMOTE_RUNTIME_CONFIGURATION_FAILED";
    return {
      exitCode: 1,
      output: [
        "PROJECT004_CANONICAL=PASS",
        "REMOTE_RUNTIME_TARGET_GUARD=FAIL",
        "REMOTE_RUNTIME_ENV_FILE=NOT_READY",
        "LOCAL_ENVIRONMENT_UNCHANGED=PASS",
        "SERVICE_ROLE_CONFIGURED=NO",
        "DATABASE_CONNECTION_CONFIGURED=NO",
        "REMOTE_ACCESS_PERFORMED=NO",
        "REMOTE_MUTATION_PERFORMED=NO",
        `ROOT_FAILURE_CODE=${code}`,
        "",
      ].join("\n"),
    };
  } finally {
    projectRef = "";
    publicUrl = "";
    publishableKey = "";
    targetName = "";
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  const result = configureProject004RemoteRuntime();
  process.stdout.write(result.output);
  process.exitCode = result.exitCode;
}
