import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import {
  AiTutorLocalRuntimeFailure,
  aiTutorLocalRuntimeContract,
  assertAiTutorLocalProductionBuild,
  assertAiTutorLocalPortAvailable,
  parseAiTutorLocalPortArguments,
  resolveAiTutorServerRuntimeConfiguration,
} from "./start-ai-tutor-local.ts";
import {
  loadProject004RemoteRuntimeConfigFile,
  Project004RemoteRuntimeFailure,
} from "./project004-remote-runtime-connection.ts";
import { assertProject004Workspace } from "./project004-identity.ts";

export async function preflightAiTutorLocal(
  candidateRoot = process.cwd(),
  options?: Readonly<{
    inspectPort?: Parameters<typeof assertAiTutorLocalPortAvailable>[2];
    probePort?: Parameters<typeof assertAiTutorLocalPortAvailable>[3];
    port?: number;
    environment?: Readonly<Record<string, string | undefined>>;
  }>,
) {
  const root = assertProject004Workspace(candidateRoot);
  loadProject004RemoteRuntimeConfigFile(root);
  const tutor = resolveAiTutorServerRuntimeConfiguration(
    root,
    options?.environment ?? process.env,
  );
  const port = options?.port ?? aiTutorLocalRuntimeContract.loopbackPort;
  await assertAiTutorLocalPortAvailable(
    aiTutorLocalRuntimeContract.loopbackHost,
    port,
    options?.inspectPort,
    options?.probePort,
  );
  let buildBinding = "REBUILD_ON_START" as "PASS" | "REBUILD_ON_START";
  try {
    assertAiTutorLocalProductionBuild(root);
    buildBinding = "PASS";
  } catch (error) {
    if (
      error instanceof AiTutorLocalRuntimeFailure &&
      error.code === "AI_TUTOR_LOCAL_CACHE_SYMLINK_REJECTED"
    ) {
      throw error;
    }
  }
  return {
    provider: tutor.provider,
    model: tutor.model,
    port,
    buildBinding,
  };
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  try {
    const port = parseAiTutorLocalPortArguments(process.argv.slice(2));
    const result = await preflightAiTutorLocal(process.cwd(), { port });
    process.stdout.write(
      [
        "AI_TUTOR_LOCAL_PREFLIGHT=PASS",
        "AI_TUTOR_LOCAL_CREDENTIAL_VALIDATION=PASS",
        "AI_TUTOR_LOCAL_SECRET_LOGGED=NO",
        `AI_TUTOR_LOCAL_PROVIDER=${result.provider}`,
        `AI_TUTOR_LOCAL_MODEL=${result.model}`,
        "AI_TUTOR_LOCAL_PORT_AVAILABLE=PASS",
        `AI_TUTOR_LOCAL_BUILD_BINDING=${result.buildBinding}`,
        `AI_TUTOR_LOCAL_CLIENT_SECRET_BOUNDARY=${result.buildBinding === "PASS" ? "PASS" : "REVERIFY_AFTER_BUILD"}`,
        `AI_TUTOR_LOCAL_URL=http://localhost:${String(result.port)}/tutor`,
        "",
      ].join("\n"),
    );
  } catch (error) {
    const code =
      error instanceof AiTutorLocalRuntimeFailure ||
      error instanceof Project004RemoteRuntimeFailure
        ? error.code
        : "AI_TUTOR_LOCAL_PREFLIGHT_FAILED";
    process.stdout.write(
      [
        "AI_TUTOR_LOCAL_PREFLIGHT=FAIL",
        `ROOT_FAILURE_CODE=${code}`,
        "AI_TUTOR_LOCAL_SECRET_LOGGED=NO",
        "",
      ].join("\n"),
    );
    process.exitCode = 1;
  }
}
