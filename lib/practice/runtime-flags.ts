export type AdaptiveRuntimeFeatureFlags = Readonly<{
  ADAPTIVE_PRACTICE_RUNTIME_ENABLED: boolean;
  CONTROLLED_PILOT_ENABLED: boolean;
  RETENTION_RUNTIME_ENABLED: boolean;
}>;

// These are server-owned release controls. They are intentionally not read
// from NEXT_PUBLIC_* variables and cannot be enabled by a browser bundle.
export const adaptiveRuntimeFeatureFlags: AdaptiveRuntimeFeatureFlags = {
  ADAPTIVE_PRACTICE_RUNTIME_ENABLED: false,
  CONTROLLED_PILOT_ENABLED: false,
  RETENTION_RUNTIME_ENABLED: false,
};

export type PracticeRuntimeAccess =
  | Readonly<{ kind: "FIXED_RUNTIME" }>
  | Readonly<{ kind: "ADAPTIVE_RUNTIME" }>
  | Readonly<{
      kind: "HIDDEN_RELEASE_CANDIDATE";
      reason:
        | "FEATURE_DISABLED"
        | "CONTROLLED_PILOT_DISABLED"
        | "NOT_PUBLISHED";
    }>;

export type CandidatePublicationState = Readonly<{
  unitSlug: string;
  releaseCandidateId: string;
  contentVersion: string;
  bundleSha256: string;
  policyVersion: string;
  publicationStatus: "DRAFT" | "PUBLISHED" | "RETIRED";
  studentVisibility: "HIDDEN" | "VISIBLE";
}>;

export const gradeTwoNumbersTo1000PublicationState: CandidatePublicationState =
  {
    unitSlug: "grade-2-numbers-to-1000",
    releaseCandidateId: "g2-numbers-to-1000-rc1",
    contentVersion: "g2n1000-1.0.0-rc.1",
    bundleSha256:
      "1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530",
    policyVersion: "g2n1000-adaptive-policy-1.0.0-pilot",
    publicationStatus: "DRAFT",
    studentVisibility: "HIDDEN",
  };

export const adaptiveCandidateRegistry: readonly Readonly<{
  grade: number;
  candidate: CandidatePublicationState;
}>[] = [{ grade: 2, candidate: gradeTwoNumbersTo1000PublicationState }];

export function findAdaptiveCandidate(unitSlug: string) {
  return adaptiveCandidateRegistry.find((entry) => entry.candidate.unitSlug === unitSlug) ?? null;
}

export type ControlledPilotEligibility =
  | Readonly<{ status: "NOT_CONFIGURED" }>
  | Readonly<{ status: "MALFORMED_CONFIGURATION" }>
  | Readonly<{ status: "NOT_ELIGIBLE" }>
  | Readonly<{ status: "ELIGIBLE" }>;

// There is intentionally no browser-controlled eligibility input. Runtime
// callers replace this deny-all default only with the server-owned exact
// candidate entitlement resolver before any adaptive RPC is called.
export const controlledPilotEligibility: ControlledPilotEligibility = {
  status: "NOT_CONFIGURED",
};

export type AdaptiveRuntimeGate =
  | Readonly<{
      kind: "DENIED";
      reason:
        | "UNIT_NOT_ADAPTIVE"
        | "CANDIDATE_NOT_VISIBLE"
        | "APPLICATION_FEATURE_DISABLED"
        | "CONTROLLED_PILOT_DISABLED"
        | "PILOT_ELIGIBILITY_NOT_CONFIGURED"
        | "PILOT_ELIGIBILITY_CONFIGURATION_INVALID"
        | "PILOT_NOT_ELIGIBLE";
    }>
  | Readonly<{
      kind: "RPC_ALLOWED";
      visibilityMode:
        | "CONTROLLED_PILOT_HIDDEN"
        | "PUBLISHED_VISIBLE";
      databaseReleaseActivation: "ENFORCED_BY_RPC";
      databaseRuntimeActivation: "ENFORCED_BY_RPC";
      databasePilotMembership: "ENFORCED_BY_RPC";
    }>;

export function resolvePracticeRuntimeAccess(
  unitSlug: string,
  flags: AdaptiveRuntimeFeatureFlags = adaptiveRuntimeFeatureFlags,
  candidate: CandidatePublicationState | null = findAdaptiveCandidate(unitSlug)?.candidate ?? null,
): PracticeRuntimeAccess {
  if (!candidate || unitSlug !== candidate.unitSlug) {
    return { kind: "FIXED_RUNTIME" };
  }
  if (
    candidate.publicationStatus !== "PUBLISHED" ||
    candidate.studentVisibility !== "VISIBLE"
  ) {
    return {
      kind: "HIDDEN_RELEASE_CANDIDATE",
      reason: "NOT_PUBLISHED",
    };
  }
  if (
    !flags.ADAPTIVE_PRACTICE_RUNTIME_ENABLED
  ) {
    return {
      kind: "HIDDEN_RELEASE_CANDIDATE",
      reason: "FEATURE_DISABLED",
    };
  }
  if (!flags.CONTROLLED_PILOT_ENABLED) {
    return {
      kind: "HIDDEN_RELEASE_CANDIDATE",
      reason: "CONTROLLED_PILOT_DISABLED",
    };
  }
  return { kind: "ADAPTIVE_RUNTIME" };
}

export function resolveAdaptiveRuntimeGate(
  unitSlug: string,
  eligibility: ControlledPilotEligibility = controlledPilotEligibility,
  flags: AdaptiveRuntimeFeatureFlags = adaptiveRuntimeFeatureFlags,
  candidate: CandidatePublicationState | null =
    findAdaptiveCandidate(unitSlug)?.candidate ?? null,
): AdaptiveRuntimeGate {
  if (!candidate || unitSlug !== candidate.unitSlug) {
    return { kind: "DENIED", reason: "UNIT_NOT_ADAPTIVE" };
  }
  const isPublishedVisible =
    candidate.publicationStatus === "PUBLISHED" &&
    candidate.studentVisibility === "VISIBLE";
  const isControlledPilotHidden =
    candidate.publicationStatus === "DRAFT" &&
    candidate.studentVisibility === "HIDDEN";
  if (!isPublishedVisible && !isControlledPilotHidden) {
    return { kind: "DENIED", reason: "CANDIDATE_NOT_VISIBLE" };
  }
  if (
    !flags.ADAPTIVE_PRACTICE_RUNTIME_ENABLED
  ) {
    return {
      kind: "DENIED",
      reason: "APPLICATION_FEATURE_DISABLED",
    };
  }
  if (!flags.CONTROLLED_PILOT_ENABLED) {
    return { kind: "DENIED", reason: "CONTROLLED_PILOT_DISABLED" };
  }
  if (eligibility.status === "NOT_CONFIGURED") {
    return {
      kind: "DENIED",
      reason: "PILOT_ELIGIBILITY_NOT_CONFIGURED",
    };
  }
  if (eligibility.status === "MALFORMED_CONFIGURATION") {
    return {
      kind: "DENIED",
      reason: "PILOT_ELIGIBILITY_CONFIGURATION_INVALID",
    };
  }
  if (eligibility.status === "NOT_ELIGIBLE") {
    return { kind: "DENIED", reason: "PILOT_NOT_ELIGIBLE" };
  }
  return {
    kind: "RPC_ALLOWED",
    visibilityMode: isControlledPilotHidden
      ? "CONTROLLED_PILOT_HIDDEN"
      : "PUBLISHED_VISIBLE",
    databaseReleaseActivation: "ENFORCED_BY_RPC",
    databaseRuntimeActivation: "ENFORCED_BY_RPC",
    databasePilotMembership: "ENFORCED_BY_RPC",
  };
}
