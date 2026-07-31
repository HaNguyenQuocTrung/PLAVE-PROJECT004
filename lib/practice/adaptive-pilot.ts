import {
  adaptiveRuntimeFeatureFlags,
  gradeTwoNumbersTo1000PublicationState,
  resolveAdaptiveRuntimeGate,
  type AdaptiveRuntimeFeatureFlags,
  type AdaptiveRuntimeGate,
  type ControlledPilotEligibility,
} from "./runtime-flags.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CONTROLLED_PILOT_USERS = 20;

export const adaptivePilotEnvironmentKeys = {
  userIds: "PLAVE_ADAPTIVE_PILOT_USER_IDS",
  gradeTwoUnit: "PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED",
  adaptiveRuntime: "PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED",
  controlledPilot: "PLAVE_CONTROLLED_PILOT_ENABLED",
  retentionRuntime: "PLAVE_RETENTION_RUNTIME_ENABLED",
} as const;

export type AdaptivePilotEnvironment = Readonly<
  Partial<Record<(typeof adaptivePilotEnvironmentKeys)[keyof typeof adaptivePilotEnvironmentKeys], string>>
>;

export type ParsedPilotAllowlist =
  | Readonly<{
      status: "NOT_CONFIGURED";
      userIds: readonly [];
    }>
  | Readonly<{
      status: "MALFORMED_CONFIGURATION";
      userIds: readonly [];
    }>
  | Readonly<{
      status: "VALID";
      userIds: readonly string[];
    }>;

export type ParsedAdaptiveFeatureFlags = Readonly<{
  status: "VALID" | "MALFORMED_CONFIGURATION";
  flags: AdaptiveRuntimeFeatureFlags;
}>;

export type AdaptivePilotAvailability = Readonly<{
  available: true;
  unitSlug: string;
  releaseCandidateId: string;
  contentVersion: string;
  bundleSha256: string;
  policyVersion: string;
}>;

function parseBoolean(value: string | undefined) {
  if (value === undefined || value.trim() === "") {
    return { valid: true, value: false } as const;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return { valid: true, value: true } as const;
  }
  if (normalized === "false") {
    return { valid: true, value: false } as const;
  }
  return { valid: false, value: false } as const;
}

export function parseAdaptivePilotAllowlist(
  rawValue: string | undefined,
): ParsedPilotAllowlist {
  if (rawValue === undefined || rawValue.trim() === "") {
    return { status: "NOT_CONFIGURED", userIds: [] };
  }

  const rawItems = rawValue.split(",");
  if (
    rawItems.length > MAX_CONTROLLED_PILOT_USERS ||
    rawItems.some((item) => item.trim() === "")
  ) {
    return { status: "MALFORMED_CONFIGURATION", userIds: [] };
  }

  const normalized = rawItems.map((item) => item.trim().toLowerCase());
  if (normalized.some((item) => !UUID_PATTERN.test(item))) {
    return { status: "MALFORMED_CONFIGURATION", userIds: [] };
  }

  return {
    status: "VALID",
    userIds: [...new Set(normalized)],
  };
}

export function parseAdaptiveRuntimeFeatureFlags(
  environment: AdaptivePilotEnvironment,
): ParsedAdaptiveFeatureFlags {
  const gradeTwoUnit = parseBoolean(
    environment[adaptivePilotEnvironmentKeys.gradeTwoUnit],
  );
  const adaptiveRuntime = parseBoolean(
    environment[adaptivePilotEnvironmentKeys.adaptiveRuntime],
  );
  const controlledPilot = parseBoolean(
    environment[adaptivePilotEnvironmentKeys.controlledPilot],
  );
  const retentionRuntime = parseBoolean(
    environment[adaptivePilotEnvironmentKeys.retentionRuntime],
  );
  const values = [
    gradeTwoUnit,
    adaptiveRuntime,
    controlledPilot,
    retentionRuntime,
  ];

  if (values.some((item) => !item.valid)) {
    return {
      status: "MALFORMED_CONFIGURATION",
      flags: adaptiveRuntimeFeatureFlags,
    };
  }

  return {
    status: "VALID",
    flags: {
      GRADE2_NUMBERS_TO_1000_ENABLED: gradeTwoUnit.value,
      ADAPTIVE_PRACTICE_RUNTIME_ENABLED: adaptiveRuntime.value,
      CONTROLLED_PILOT_ENABLED: controlledPilot.value,
      RETENTION_RUNTIME_ENABLED: retentionRuntime.value,
    },
  };
}

export function resolveControlledPilotEligibility(
  userId: string,
  allowlist: ParsedPilotAllowlist,
): ControlledPilotEligibility {
  if (allowlist.status === "NOT_CONFIGURED") {
    return { status: "NOT_CONFIGURED" };
  }
  if (
    allowlist.status === "MALFORMED_CONFIGURATION" ||
    !UUID_PATTERN.test(userId)
  ) {
    return { status: "MALFORMED_CONFIGURATION" };
  }
  return allowlist.userIds.includes(userId.toLowerCase())
    ? { status: "ELIGIBLE" }
    : { status: "NOT_ELIGIBLE" };
}

export function resolveConfiguredAdaptivePilotGate(
  userId: string,
  environment: AdaptivePilotEnvironment,
): AdaptiveRuntimeGate {
  const flags = parseAdaptiveRuntimeFeatureFlags(environment);
  const allowlist = parseAdaptivePilotAllowlist(
    environment[adaptivePilotEnvironmentKeys.userIds],
  );
  const eligibility =
    flags.status === "MALFORMED_CONFIGURATION"
      ? ({ status: "MALFORMED_CONFIGURATION" } as const)
      : resolveControlledPilotEligibility(userId, allowlist);

  return resolveAdaptiveRuntimeGate(
    gradeTwoNumbersTo1000PublicationState.unitSlug,
    eligibility,
    flags.flags,
    gradeTwoNumbersTo1000PublicationState,
  );
}

export function parseAdaptivePilotAvailability(
  value: unknown,
): AdaptivePilotAvailability | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const expectedKeys = [
    "available",
    "bundle_sha256",
    "content_version",
    "policy_version",
    "release_candidate_id",
    "unit_slug",
  ];
  if (
    Object.keys(record).sort().join("|") !==
      expectedKeys.sort().join("|") ||
    record.available !== true ||
    record.unit_slug !== gradeTwoNumbersTo1000PublicationState.unitSlug ||
    record.release_candidate_id !==
      gradeTwoNumbersTo1000PublicationState.releaseCandidateId ||
    record.content_version !==
      gradeTwoNumbersTo1000PublicationState.contentVersion ||
    record.bundle_sha256 !==
      gradeTwoNumbersTo1000PublicationState.bundleSha256 ||
    record.policy_version !==
      gradeTwoNumbersTo1000PublicationState.policyVersion
  ) {
    return null;
  }
  return {
    available: true,
    unitSlug: record.unit_slug,
    releaseCandidateId: record.release_candidate_id,
    contentVersion: record.content_version,
    bundleSha256: record.bundle_sha256,
    policyVersion: record.policy_version,
  };
}
