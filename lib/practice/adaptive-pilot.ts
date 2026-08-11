import {
  adaptiveCandidateRegistry,
  adaptiveRuntimeFeatureFlags,
  resolveAdaptiveRuntimeGate,
  type AdaptiveRuntimeFeatureFlags,
  type AdaptiveRuntimeGate,
  type CandidatePublicationState,
} from "./runtime-flags.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const TOKEN_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/u;
const MAX_ENTITLEMENTS = 100;

export const adaptivePilotEnvironmentKeys = {
  entitlements: "PLAVE_ADAPTIVE_PILOT_ENTITLEMENTS",
  adaptiveRuntime: "PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED",
  controlledPilot: "PLAVE_CONTROLLED_PILOT_ENABLED",
  retentionRuntime: "PLAVE_RETENTION_RUNTIME_ENABLED",
} as const;
export type AdaptivePilotEnvironment = Readonly<Partial<Record<(typeof adaptivePilotEnvironmentKeys)[keyof typeof adaptivePilotEnvironmentKeys], string>>>;
export type PilotEntitlement = Readonly<{ userId: string; grade: number; candidateId: string; candidateVersion: string; bundleHash: string; policyVersion: string }>;
export type ParsedPilotEntitlements =
  | Readonly<{ status: "NOT_CONFIGURED" | "MALFORMED_CONFIGURATION"; entitlements: readonly [] }>
  | Readonly<{ status: "VALID"; entitlements: readonly PilotEntitlement[] }>;
export type ParsedAdaptiveFeatureFlags = Readonly<{ status: "VALID" | "MALFORMED_CONFIGURATION"; flags: AdaptiveRuntimeFeatureFlags }>;
export type AdaptivePilotAvailability = Readonly<{ available: true; unitSlug: string; releaseCandidateId: string; contentVersion: string; bundleSha256: string; policyVersion: string }>;

function parseBoolean(value: string | undefined) {
  if (value === undefined || value.trim() === "") return { valid: true, value: false } as const;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" ? { valid: true, value: true } as const : normalized === "false" ? { valid: true, value: false } as const : { valid: false, value: false } as const;
}

export function parseAdaptivePilotEntitlements(raw: string | undefined): ParsedPilotEntitlements {
  if (raw === undefined || raw.trim() === "") return { status: "NOT_CONFIGURED", entitlements: [] };
  let value: unknown; try { value = JSON.parse(raw); } catch { return { status: "MALFORMED_CONFIGURATION", entitlements: [] }; }
  if (!value || typeof value !== "object" || Array.isArray(value)) return { status: "MALFORMED_CONFIGURATION", entitlements: [] };
  const root = value as Record<string, unknown>;
  if (Object.keys(root).sort().join("|") !== "entitlements|version" || root.version !== 1 || !Array.isArray(root.entitlements) || root.entitlements.length > MAX_ENTITLEMENTS) return { status: "MALFORMED_CONFIGURATION", entitlements: [] };
  const entitlements: PilotEntitlement[] = [];
  const keys = ["bundleHash", "candidateId", "candidateVersion", "grade", "policyVersion", "userId"];
  for (const item of root.entitlements) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return { status: "MALFORMED_CONFIGURATION", entitlements: [] };
    const record = item as Record<string, unknown>;
    if (Object.keys(record).sort().join("|") !== keys.join("|") || typeof record.userId !== "string" || !UUID_PATTERN.test(record.userId) || !Number.isInteger(record.grade) || Number(record.grade) < 1 || Number(record.grade) > 9 || typeof record.candidateId !== "string" || !TOKEN_PATTERN.test(record.candidateId) || typeof record.candidateVersion !== "string" || !TOKEN_PATTERN.test(record.candidateVersion) || typeof record.bundleHash !== "string" || !HASH_PATTERN.test(record.bundleHash) || typeof record.policyVersion !== "string" || !TOKEN_PATTERN.test(record.policyVersion)) return { status: "MALFORMED_CONFIGURATION", entitlements: [] };
    entitlements.push({ userId: record.userId, grade: Number(record.grade), candidateId: record.candidateId, candidateVersion: record.candidateVersion, bundleHash: record.bundleHash, policyVersion: record.policyVersion });
  }
  const unique = new Set(entitlements.map((item) => `${item.userId}|${item.grade}|${item.candidateId}|${item.candidateVersion}|${item.bundleHash}|${item.policyVersion}`));
  if (unique.size !== entitlements.length) return { status: "MALFORMED_CONFIGURATION", entitlements: [] };
  return { status: "VALID", entitlements: [...entitlements].sort((a, b) => `${a.grade}:${a.candidateId}:${a.userId}`.localeCompare(`${b.grade}:${b.candidateId}:${b.userId}`)) };
}

export function parseAdaptiveRuntimeFeatureFlags(environment: AdaptivePilotEnvironment): ParsedAdaptiveFeatureFlags {
  const adaptive = parseBoolean(environment[adaptivePilotEnvironmentKeys.adaptiveRuntime]);
  const pilot = parseBoolean(environment[adaptivePilotEnvironmentKeys.controlledPilot]);
  const retention = parseBoolean(environment[adaptivePilotEnvironmentKeys.retentionRuntime]);
  if (![adaptive, pilot, retention].every((item) => item.valid)) return { status: "MALFORMED_CONFIGURATION", flags: adaptiveRuntimeFeatureFlags };
  return { status: "VALID", flags: { ADAPTIVE_PRACTICE_RUNTIME_ENABLED: adaptive.value, CONTROLLED_PILOT_ENABLED: pilot.value, RETENTION_RUNTIME_ENABLED: retention.value } };
}

function matchingCandidate(entitlement: PilotEntitlement, unitSlug?: string): CandidatePublicationState | null {
  const entry = adaptiveCandidateRegistry.find(({ grade, candidate }) => grade === entitlement.grade && (!unitSlug || candidate.unitSlug === unitSlug) && candidate.releaseCandidateId === entitlement.candidateId && candidate.contentVersion === entitlement.candidateVersion && candidate.bundleSha256 === entitlement.bundleHash && candidate.policyVersion === entitlement.policyVersion);
  return entry?.candidate ?? null;
}

export function resolveConfiguredAdaptivePilotAccess(userId: string, grade: number, environment: AdaptivePilotEnvironment, unitSlug?: string): Readonly<{ gate: AdaptiveRuntimeGate; entitlement: PilotEntitlement | null; candidate: CandidatePublicationState | null }> {
  const flags = parseAdaptiveRuntimeFeatureFlags(environment);
  const parsed = parseAdaptivePilotEntitlements(environment[adaptivePilotEnvironmentKeys.entitlements]);
  if (flags.status !== "VALID" || parsed.status === "MALFORMED_CONFIGURATION") return { gate: { kind: "DENIED", reason: "PILOT_ELIGIBILITY_CONFIGURATION_INVALID" }, entitlement: null, candidate: null };
  if (parsed.status === "NOT_CONFIGURED") return { gate: { kind: "DENIED", reason: "PILOT_ELIGIBILITY_NOT_CONFIGURED" }, entitlement: null, candidate: null };
  if (!UUID_PATTERN.test(userId)) return { gate: { kind: "DENIED", reason: "PILOT_ELIGIBILITY_CONFIGURATION_INVALID" }, entitlement: null, candidate: null };
  const matches = parsed.entitlements.filter((item) => item.userId === userId.toLowerCase() && item.grade === grade && matchingCandidate(item, unitSlug));
  if (matches.length !== 1) return { gate: { kind: "DENIED", reason: matches.length === 0 ? "PILOT_NOT_ELIGIBLE" : "PILOT_ELIGIBILITY_CONFIGURATION_INVALID" }, entitlement: null, candidate: null };
  const entitlement = matches[0]!; const candidate = matchingCandidate(entitlement, unitSlug)!;
  return { gate: resolveAdaptiveRuntimeGate(candidate.unitSlug, { status: "ELIGIBLE" }, flags.flags, candidate), entitlement, candidate };
}

export function parseAdaptivePilotAvailability(value: unknown, expected: CandidatePublicationState): AdaptivePilotAvailability | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>; const keys = ["available", "bundle_sha256", "content_version", "policy_version", "release_candidate_id", "unit_slug"];
  if (Object.keys(record).sort().join("|") !== keys.join("|") || record.available !== true || record.unit_slug !== expected.unitSlug || record.release_candidate_id !== expected.releaseCandidateId || record.content_version !== expected.contentVersion || record.bundle_sha256 !== expected.bundleSha256 || record.policy_version !== expected.policyVersion) return null;
  return { available: true, unitSlug: record.unit_slug as string, releaseCandidateId: record.release_candidate_id as string, contentVersion: record.content_version as string, bundleSha256: record.bundle_sha256 as string, policyVersion: record.policy_version as string };
}
