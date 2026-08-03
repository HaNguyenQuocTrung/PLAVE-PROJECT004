import {
  GENERATOR_V2_OUTCOME_REGISTRY,
  getProductVariantByOutcome,
} from "./registry.ts";

export const generatorV2StudentEligibilityStates = [
  "INTERNAL_ONLY",
  "CORRECTNESS_REVIEW_REQUIRED",
  "STUDENT_RUNTIME_ELIGIBLE",
] as const;

export type GeneratorV2StudentEligibilityState =
  (typeof generatorV2StudentEligibilityStates)[number];

export const GENERATOR_V2_STUDENT_RUNTIME_SCHEMA = "0043" as const;
export const GENERATOR_V2_STUDENT_RUNTIME_RELEASE =
  "LOCAL_VERIFICATION" as const;

/**
 * Sprint 10B's bounded, directly reviewed integration set. These IDs are not
 * enabled by this declaration: repository defaults remain OFF and each local
 * process must explicitly allow both the outcome and its capability.
 */
export const GENERATOR_V2_STUDENT_RUNTIME_VERIFICATION_OUTCOMES = [
  "MOET2018-G2-NUM-P025-018",
  "MOET2018-G3-NUM-P029-004",
  "MOET2018-G4-NUM-P036-018",
  "MOET2018-G6-GEO-P051-003",
  "MOET2018-G7-STA-P061-001",
  "MOET2018-G9-NAA-P072-010",
] as const;

/**
 * Sprint 10C's independently-oracled source inventory. Eligibility remains
 * process-local and requires the explicit outcome/capability allowlists below;
 * the repository default global and release flags remain OFF.
 */
export const GENERATOR_V2_STUDENT_RUNTIME_CORRECTNESS_OUTCOMES =
  GENERATOR_V2_OUTCOME_REGISTRY.map((entry) => entry.outcomeId);
export const GENERATOR_V2_STUDENT_RUNTIME_CORRECTNESS_CAPABILITIES = [
  ...new Set(GENERATOR_V2_OUTCOME_REGISTRY.map((entry) => entry.variantId)),
].sort();

const correctnessOutcomeIds = new Set(
  GENERATOR_V2_STUDENT_RUNTIME_CORRECTNESS_OUTCOMES,
);
const correctnessCapabilityIds = new Set(
  GENERATOR_V2_STUDENT_RUNTIME_CORRECTNESS_CAPABILITIES,
);

type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

function parseExactList(value: string | undefined) {
  if (!value) return new Set<string>();
  const values = value.split(",").map((item) => item.trim()).filter(Boolean);
  return values.length === new Set(values).size
    ? new Set(values)
    : new Set<string>();
}

export type GeneratorV2StudentRuntimePolicy = Readonly<{
  globalEnabled: boolean;
  releaseEnabled: boolean;
  schemaCompatible: boolean;
  signingKeyConfigured: boolean;
  explicitlyEligibleOutcomeIds: ReadonlySet<string>;
  explicitlyEligibleCapabilityIds: ReadonlySet<string>;
}>;

export function readGeneratorV2StudentRuntimePolicy(
  environment: RuntimeEnvironment = process.env,
): GeneratorV2StudentRuntimePolicy {
  return {
    globalEnabled:
      environment.GENERATOR_V2_STUDENT_RUNTIME_ENABLED === "true",
    releaseEnabled:
      environment.GENERATOR_V2_STUDENT_RUNTIME_RELEASE ===
      GENERATOR_V2_STUDENT_RUNTIME_RELEASE,
    schemaCompatible:
      environment.GENERATOR_V2_STUDENT_RUNTIME_SCHEMA ===
      GENERATOR_V2_STUDENT_RUNTIME_SCHEMA,
    signingKeyConfigured: /^[0-9a-f]{64}$/u.test(
      environment.PLAVE_ON_DEMAND_GENERATION_SIGNING_KEY ?? "",
    ),
    explicitlyEligibleOutcomeIds: parseExactList(
      environment.GENERATOR_V2_STUDENT_RUNTIME_ELIGIBLE_OUTCOMES,
    ),
    explicitlyEligibleCapabilityIds: parseExactList(
      environment.GENERATOR_V2_STUDENT_RUNTIME_ELIGIBLE_CAPABILITIES,
    ),
  };
}

export function isLoopbackStudentRuntimeRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  return hostname === "127.0.0.1" || hostname === "localhost";
}

export function getGeneratorV2StudentEligibility(
  outcomeId: string,
  policy: GeneratorV2StudentRuntimePolicy,
): GeneratorV2StudentEligibilityState {
  const entry = getProductVariantByOutcome(outcomeId);
  if (!entry) return "INTERNAL_ONLY";
  if (
    correctnessOutcomeIds.has(outcomeId) &&
    correctnessCapabilityIds.has(entry.variantId) &&
    policy.explicitlyEligibleOutcomeIds.has(outcomeId) &&
    policy.explicitlyEligibleCapabilityIds.has(entry.variantId)
  ) {
    return "STUDENT_RUNTIME_ELIGIBLE";
  }
  return "CORRECTNESS_REVIEW_REQUIRED";
}

export function generatorV2StudentEligibilityInventory(
  policy: GeneratorV2StudentRuntimePolicy,
) {
  return GENERATOR_V2_OUTCOME_REGISTRY.map((entry) => ({
    outcomeId: entry.outcomeId,
    capabilityId: entry.variantId,
    status: getGeneratorV2StudentEligibility(entry.outcomeId, policy),
  }));
}

export type GeneratorV2StudentSelectionFailure =
  | "GENERATOR_V2_RUNTIME_DISABLED"
  | "GENERATOR_V2_LOOPBACK_REQUIRED"
  | "GENERATOR_V2_RELEASE_DISABLED"
  | "GENERATOR_V2_SCHEMA_INCOMPATIBLE"
  | "GENERATOR_V2_SIGNING_KEY_UNAVAILABLE"
  | "GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED"
  | "GENERATOR_V2_CORRECTNESS_REVIEW_REQUIRED";

export function validateGeneratorV2StudentRuntimePolicy(input: {
  request: Request;
  policy: GeneratorV2StudentRuntimePolicy;
}) {
  if (!input.policy.globalEnabled) {
    return "GENERATOR_V2_RUNTIME_DISABLED" as const;
  }
  if (!isLoopbackStudentRuntimeRequest(input.request)) {
    return "GENERATOR_V2_LOOPBACK_REQUIRED" as const;
  }
  if (!input.policy.releaseEnabled) {
    return "GENERATOR_V2_RELEASE_DISABLED" as const;
  }
  if (!input.policy.schemaCompatible) {
    return "GENERATOR_V2_SCHEMA_INCOMPATIBLE" as const;
  }
  if (!input.policy.signingKeyConfigured) {
    return "GENERATOR_V2_SIGNING_KEY_UNAVAILABLE" as const;
  }
  return null;
}
