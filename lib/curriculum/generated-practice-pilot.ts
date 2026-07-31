import {
  parseGeneratedPracticeRuntimeConfiguration,
  type GeneratedPracticeMode,
} from "./generated-practice-feature-flag.ts";

export const GENERATED_PRACTICE_PILOT_TARGET =
  "plave-project004-dev-clean" as const;
export const GENERATED_PRACTICE_PILOT_LOOPBACK_HOST =
  "127.0.0.1" as const;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type GeneratedPracticePilotAllowlist = Readonly<{
  valid: boolean;
  count: number;
  userIds: ReadonlySet<string>;
}>;

export type GeneratedPracticePilotConfiguration = Readonly<{
  mode: GeneratedPracticeMode;
  runtimeEnabled: boolean;
  allowlistValid: boolean;
  allowlistCount: number;
  loopbackOnly: boolean;
  targetValid: boolean;
  ownerStarted: boolean;
  sessionValid: boolean;
  enabled: boolean;
  userIds: ReadonlySet<string>;
}>;

export function parseGeneratedPracticePilotAllowlist(
  raw: string | undefined,
): GeneratedPracticePilotAllowlist {
  if (raw === undefined || raw.trim() === "") {
    return { valid: true, count: 0, userIds: new Set<string>() };
  }
  if (/[^0-9a-f,\s-]/iu.test(raw)) {
    return { valid: false, count: 0, userIds: new Set<string>() };
  }
  const values = raw.split(",").map((value) => value.trim().toLowerCase());
  if (
    values.some((value) => !uuidPattern.test(value)) ||
    values.some((value) => value === "")
  ) {
    return { valid: false, count: 0, userIds: new Set<string>() };
  }
  const userIds = new Set(values);
  return { valid: true, count: userIds.size, userIds };
}

export function getGeneratedPracticePilotConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): GeneratedPracticePilotConfiguration {
  const runtime = parseGeneratedPracticeRuntimeConfiguration({
    enabled: environment.PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED,
    mode: environment.PLAVE_GENERATED_PRACTICE_MODE,
  });
  const allowlist = parseGeneratedPracticePilotAllowlist(
    environment.PLAVE_GENERATED_PRACTICE_PILOT_USER_IDS,
  );
  const loopbackOnly =
    environment.PLAVE_GENERATED_PRACTICE_BIND_HOST ===
    GENERATED_PRACTICE_PILOT_LOOPBACK_HOST;
  const targetValid =
    environment.PLAVE_PROJECT004_REMOTE_TARGET_NAME ===
    GENERATED_PRACTICE_PILOT_TARGET;
  const ownerStarted =
    environment.PLAVE_GENERATED_PRACTICE_PILOT_OWNER_STARTED === "true";
  const sessionValid =
    /^[0-9a-f]{64}$/u.test(
      environment.PLAVE_GENERATED_PRACTICE_PILOT_SESSION ?? "",
    );
  const enabled =
    runtime.enabled &&
    runtime.mode === "PILOT_LIVE" &&
    allowlist.valid &&
    allowlist.count === 1 &&
    loopbackOnly &&
    targetValid &&
    ownerStarted &&
    sessionValid;
  return {
    mode: runtime.mode,
    runtimeEnabled: runtime.enabled,
    allowlistValid: allowlist.valid,
    allowlistCount: allowlist.count,
    loopbackOnly,
    targetValid,
    ownerStarted,
    sessionValid,
    enabled,
    userIds: allowlist.userIds,
  };
}

export function evaluateGeneratedPracticePilotEligibility(input: Readonly<{
  configuration: GeneratedPracticePilotConfiguration;
  userId: string;
  role: string;
  schoolGrade: number;
}>) {
  const normalizedUserId = input.userId.toLowerCase();
  const eligible =
    input.configuration.enabled &&
    input.role === "STUDENT" &&
    Number.isInteger(input.schoolGrade) &&
    input.schoolGrade >= 1 &&
    input.schoolGrade <= 9 &&
    uuidPattern.test(normalizedUserId) &&
    input.configuration.userIds.has(normalizedUserId);
  return {
    eligible,
    allowlistValid: input.configuration.allowlistValid,
    allowlistCount: input.configuration.allowlistCount,
  } as const;
}

export function getCurrentGeneratedPracticePilotEligibility(input: Readonly<{
  userId: string;
  role: string;
  schoolGrade: number;
}>) {
  return evaluateGeneratedPracticePilotEligibility({
    configuration: getGeneratedPracticePilotConfiguration(),
    ...input,
  });
}
