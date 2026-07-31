import {
  adaptivePilotEnvironmentKeys,
  parseAdaptivePilotAllowlist,
  parseAdaptiveRuntimeFeatureFlags,
  type AdaptivePilotEnvironment,
} from "../lib/practice/adaptive-pilot.ts";

const environment: AdaptivePilotEnvironment = {
  PLAVE_ADAPTIVE_PILOT_USER_IDS:
    process.env.PLAVE_ADAPTIVE_PILOT_USER_IDS,
  PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED:
    process.env.PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED,
  PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED:
    process.env.PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED,
  PLAVE_CONTROLLED_PILOT_ENABLED:
    process.env.PLAVE_CONTROLLED_PILOT_ENABLED,
  PLAVE_RETENTION_RUNTIME_ENABLED:
    process.env.PLAVE_RETENTION_RUNTIME_ENABLED,
};

const allowlist = parseAdaptivePilotAllowlist(
  environment[adaptivePilotEnvironmentKeys.userIds],
);
const flags = parseAdaptiveRuntimeFeatureFlags(environment);
const modeArgument = process.argv
  .slice(2)
  .find((argument) => argument.startsWith("--mode="));
const mode = modeArgument?.slice("--mode=".length);
const allowlistConfigured =
  allowlist.status === "VALID" && allowlist.userIds.length === 1;

if (mode === "allowlist-count" && allowlistConfigured) {
  console.log("Controlled pilot allowlist: VALID");
  console.log("Pilot allowlist count: 1");
  console.log("Application flags: NOT_CHECKED_BY_THIS_MODE");
} else if (
  mode === "pre-activation" &&
  allowlistConfigured &&
  flags.status === "VALID" &&
  !flags.flags.GRADE2_NUMBERS_TO_1000_ENABLED &&
  !flags.flags.ADAPTIVE_PRACTICE_RUNTIME_ENABLED &&
  !flags.flags.CONTROLLED_PILOT_ENABLED &&
  !flags.flags.RETENTION_RUNTIME_ENABLED
) {
  console.log("Controlled pilot pre-activation environment: VALID");
  console.log("Pilot allowlist count: 1");
  console.log("PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED=false");
  console.log("PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED=false");
  console.log("PLAVE_CONTROLLED_PILOT_ENABLED=false");
  console.log("PLAVE_RETENTION_RUNTIME_ENABLED=false");
} else if (
  mode === "activation" &&
  allowlistConfigured &&
  flags.status === "VALID" &&
  flags.flags.GRADE2_NUMBERS_TO_1000_ENABLED &&
  flags.flags.ADAPTIVE_PRACTICE_RUNTIME_ENABLED &&
  flags.flags.CONTROLLED_PILOT_ENABLED &&
  !flags.flags.RETENTION_RUNTIME_ENABLED
) {
  console.log("Controlled pilot activation environment: VALID");
  console.log("Pilot allowlist count: 1");
  console.log("Intended activation flags: EXACT_MATCH");
  console.log("PLAVE_RETENTION_RUNTIME_ENABLED=false");
} else {
  console.error(
    "Controlled pilot environment: FAIL_CLOSED " +
      "(use --mode=allowlist-count, --mode=pre-activation, or --mode=activation; identity values hidden)",
  );
  process.exitCode = 1;
}
