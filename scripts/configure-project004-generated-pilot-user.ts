import {
  chmodSync,
  existsSync,
  lstatSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { parseGeneratedPracticePilotAllowlist } from "../lib/curriculum/generated-practice-pilot.ts";
import { assertProject004Workspace } from "./project004-identity.ts";
import { project004GeneratedPilotRuntimeContract } from "./project004-generated-pilot-runtime.ts";
import {
  readMaskedLineFromControllingTty,
  type SecurePromptResult,
} from "./project004-secure-tty-prompt.ts";

type SecurePrompt = (label: string) => SecurePromptResult;

export class GeneratedPilotConfigurationFailure extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export function configureProject004GeneratedPilotUser(options?: Readonly<{
  candidateRoot?: string;
  prompt?: SecurePrompt;
}>) {
  const root = assertProject004Workspace(options?.candidateRoot ?? process.cwd());
  const prompt = options?.prompt ?? ((label: string) =>
    readMaskedLineFromControllingTty({ label, maxBytes: 64 }));
  const entered = prompt("Project004 generated-practice test Student UUID: ");
  if (!entered.ok) throw new GeneratedPilotConfigurationFailure(entered.code);
  const parsed = parseGeneratedPracticePilotAllowlist(entered.value);
  if (!parsed.valid || parsed.count !== 1) {
    throw new GeneratedPilotConfigurationFailure("GENERATED_PILOT_STUDENT_UUID_INVALID");
  }
  const destination = resolve(root, project004GeneratedPilotRuntimeContract.allowlistFile);
  if (existsSync(destination) && lstatSync(destination).isSymbolicLink()) {
    throw new GeneratedPilotConfigurationFailure("GENERATED_PILOT_ALLOWLIST_SYMLINK_REJECTED");
  }
  const temporary = `${destination}.pending-${process.pid}`;
  try {
    writeFileSync(
      temporary,
      `${project004GeneratedPilotRuntimeContract.allowlistKey}=${entered.value.trim().toLowerCase()}\n`,
      { encoding: "utf8", mode: 0o600, flag: "wx" },
    );
    chmodSync(temporary, 0o600);
    renameSync(temporary, destination);
    chmodSync(destination, 0o600);
  } finally {
    if (existsSync(temporary)) rmSync(temporary);
  }
  return [
    "PROJECT004_CANONICAL=PASS",
    "GENERATED_PILOT_ALLOWLIST_VALID=PASS",
    "GENERATED_PILOT_ALLOWLIST_COUNT=1",
    "GENERATED_PILOT_ALLOWLIST_FILE_MODE=0600",
    "GENERATED_PILOT_IDENTITY_LOGGED=NO",
    "",
  ].join("\n");
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  try {
    process.stdout.write(configureProject004GeneratedPilotUser());
  } catch (error) {
    process.stdout.write([
      "GENERATED_PILOT_ALLOWLIST_CONFIGURATION=FAIL",
      `ROOT_FAILURE_CODE=${error instanceof GeneratedPilotConfigurationFailure ? error.code : "GENERATED_PILOT_CONFIGURATION_FAILED"}`,
      "",
    ].join("\n"));
    process.exitCode = 1;
  }
}
