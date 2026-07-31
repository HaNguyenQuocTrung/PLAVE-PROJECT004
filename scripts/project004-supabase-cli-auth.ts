import { createHash } from "node:crypto";

import {
  RemoteDevGuardFailure,
  buildSupabaseCliEnvironment,
  parseProjectsListOutput,
  type ProjectRecord,
  type SafeCommandResult,
} from "./project004-remote-dev-guard.ts";
import { assertProject004Workspace } from "./project004-identity.ts";

type CommandRunner = (
  command: string,
  args: string[],
  environment: NodeJS.ProcessEnv,
) => SafeCommandResult;

export type CanonicalCliAuthContext = {
  executable: "supabase";
  cwdFingerprint: string;
  environmentFingerprint: string;
  tokenDiscovery: "INHERITED_SESSION" | "NATIVE_CLI_STORE";
  childEnvironment: NodeJS.ProcessEnv;
};

const authContextKeys = [
  "HOME",
  "XDG_CONFIG_HOME",
  "SUPABASE_CONFIG_HOME",
  "SUPABASE_CONFIG_DIR",
  "PATH",
] as const;

function fingerprint(values: readonly string[]) {
  return createHash("sha256")
    .update(values.join("\n"))
    .digest("hex");
}

export function buildCanonicalCliAuthContext(
  environment: NodeJS.ProcessEnv,
  candidateRoot = process.cwd(),
): CanonicalCliAuthContext {
  const root = assertProject004Workspace(candidateRoot);
  const childEnvironment =
    buildSupabaseCliEnvironment(environment);
  for (const key of authContextKeys) {
    if (
      (environment[key] ?? "") !==
      (childEnvironment[key] ?? "")
    ) {
      throw new RemoteDevGuardFailure(
        "CLI_AUTH_CONTEXT_MISMATCH",
      );
    }
  }
  const environmentFingerprint = fingerprint([
    ...authContextKeys.map(
      (key) => `${key}=${childEnvironment[key] ?? ""}`,
    ),
    `SUPABASE_ACCESS_TOKEN_SHA256=${fingerprint([
      childEnvironment.SUPABASE_ACCESS_TOKEN ?? "",
    ])}`,
  ]);
  return {
    executable: "supabase",
    cwdFingerprint: fingerprint([root]),
    environmentFingerprint,
    tokenDiscovery: childEnvironment.SUPABASE_ACCESS_TOKEN
      ? "INHERITED_SESSION"
      : "NATIVE_CLI_STORE",
    childEnvironment,
  };
}

function combinedOutput(result: SafeCommandResult) {
  return `${result.stdout}\n${result.stderr}`;
}

export function classifyCliAuthCommandFailure(
  result: SafeCommandResult,
) {
  const output = combinedOutput(result);
  if (
    /(?:access token|refresh token|cli session|session).{0,80}(?:expired|invalid|revoked)|(?:expired|invalid|revoked).{0,80}(?:access token|refresh token|cli session|session)|\b(?:401|unauthorized)\b/iu.test(
      output,
    )
  ) {
    return "CLI_SESSION_EXPIRED";
  }
  if (
    /(?:not logged in|must be logged in|access token not provided|missing (?:an? )?access token|run (?:npx )?supabase login)/iu.test(
      output,
    )
  ) {
    return "CLI_NOT_AUTHENTICATED";
  }
  return "CLI_AUTH_OUTPUT_UNRECOGNIZED";
}

export function runCanonicalSupabaseCliAuthCheck(options: {
  environment: NodeJS.ProcessEnv;
  candidateRoot?: string;
  runner: CommandRunner;
}) {
  const context = buildCanonicalCliAuthContext(
    options.environment,
    options.candidateRoot,
  );
  const beforeFingerprint = context.environmentFingerprint;
  const result = options.runner(
    context.executable,
    ["projects", "list", "--output", "json"],
    context.childEnvironment,
  );
  const afterContext = buildCanonicalCliAuthContext(
    context.childEnvironment,
    options.candidateRoot,
  );
  if (
    beforeFingerprint !== afterContext.environmentFingerprint ||
    context.cwdFingerprint !== afterContext.cwdFingerprint
  ) {
    throw new RemoteDevGuardFailure(
      "CLI_AUTH_CONTEXT_MISMATCH",
    );
  }
  if (!result.ok) {
    throw new RemoteDevGuardFailure(
      classifyCliAuthCommandFailure(result),
    );
  }
  let projects: ProjectRecord[];
  try {
    projects = parseProjectsListOutput(result.stdout);
  } catch {
    throw new RemoteDevGuardFailure(
      "CLI_AUTH_OUTPUT_UNRECOGNIZED",
    );
  }
  return {
    projects,
    contextFingerprint: fingerprint([
      context.executable,
      context.cwdFingerprint,
      context.environmentFingerprint,
    ]),
  };
}
