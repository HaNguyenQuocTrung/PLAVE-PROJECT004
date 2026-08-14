import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import {
  AiTutorLocalRuntimeFailure,
  aiTutorLocalRuntimeContract,
  assertAiTutorLocalPortAvailable,
  loadAiTutorLocalConfiguration,
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
  }>,
) {
  const root = assertProject004Workspace(candidateRoot);
  loadProject004RemoteRuntimeConfigFile(root);
  const tutor = loadAiTutorLocalConfiguration(root);
  await assertAiTutorLocalPortAvailable(
    aiTutorLocalRuntimeContract.loopbackHost,
    aiTutorLocalRuntimeContract.loopbackPort,
    options?.inspectPort,
    options?.probePort,
  );
  return { provider: tutor.provider, model: tutor.model };
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  try {
    const result = await preflightAiTutorLocal();
    process.stdout.write(
      [
        "AI_TUTOR_LOCAL_PREFLIGHT=PASS",
        "AI_TUTOR_LOCAL_CREDENTIAL_VALIDATION=PASS",
        "AI_TUTOR_LOCAL_SECRET_LOGGED=NO",
        `AI_TUTOR_LOCAL_PROVIDER=${result.provider}`,
        `AI_TUTOR_LOCAL_MODEL=${result.model}`,
        "AI_TUTOR_LOCAL_PORT_AVAILABLE=PASS",
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
