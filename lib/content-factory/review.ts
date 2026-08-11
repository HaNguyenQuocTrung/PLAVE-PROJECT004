import type { AutomatedEvidenceReceipt, ReviewStatus } from "./types.ts";

export const requiredAutomatedEvidenceChecks = [
  "SOURCE_MAPPING", "MATHEMATICAL_ANSWER", "EXPLANATION_CONSISTENCY", "SKILL_PREREQUISITES", "GRADE_RANGE",
  "DUPLICATE_AMBIGUITY", "SOLUTION_LEAKAGE_SECURITY", "BUNDLE_DETERMINISM", "ADAPTIVE_SIMULATION", "REGRESSION_TESTS",
] as const satisfies readonly AutomatedEvidenceReceipt["check"][];

export function hasCompleteAutomatedEvidenceGate(
  receipts: readonly AutomatedEvidenceReceipt[],
  entityId: string,
) {
  const applicable = receipts.filter((receipt) => receipt.entityId === entityId);
  if (applicable.some((receipt) => receipt.status !== "PASSED")) return false;
  const passedChecks = new Set(applicable.map((receipt) => receipt.check));
  return requiredAutomatedEvidenceChecks.every((check) => passedChecks.has(check));
}

const transitions: Readonly<Record<ReviewStatus, readonly ReviewStatus[]>> = {
  SOURCE_REQUIRED: ["DRAFT"],
  DRAFT: ["GENERATED"],
  GENERATED: ["AUTOMATED_VALIDATION_FAILED", "AUTOMATED_VERIFICATION_INSUFFICIENT", "AUTOMATED_VALIDATION_PASSED"],
  AUTOMATED_VALIDATION_FAILED: ["DRAFT", "GENERATED"],
  AUTOMATED_VERIFICATION_INSUFFICIENT: ["DRAFT", "GENERATED"],
  AUTOMATED_VALIDATION_PASSED: ["EVIDENCE_GATE_PASSED"],
  EVIDENCE_GATE_PASSED: ["BUNDLED"],
  BUNDLED: ["PILOT_ELIGIBLE"],
  PILOT_ELIGIBLE: ["PUBLISHED", "RETIRED"],
  PUBLISHED: ["RETIRED"],
  RETIRED: [],
};

export function transitionReviewStatus(current: ReviewStatus, next: ReviewStatus, evidenceReceipts: readonly AutomatedEvidenceReceipt[]) {
  if (!transitions[current].includes(next)) throw new Error("INVALID_REVIEW_TRANSITION");
  if (evidenceReceipts.length === 0 || evidenceReceipts.some((item) => item.id.trim() === "")) throw new Error("AUTOMATED_EVIDENCE_REQUIRED");
  if (new Set(evidenceReceipts.map((item) => item.id)).size !== evidenceReceipts.length) throw new Error("DUPLICATE_AUTOMATED_EVIDENCE");
  if (next === "EVIDENCE_GATE_PASSED") {
    const entityIds = new Set(evidenceReceipts.map((item) => item.entityId));
    if (entityIds.size !== 1 || !hasCompleteAutomatedEvidenceGate(evidenceReceipts, evidenceReceipts[0]!.entityId)) throw new Error("AUTOMATED_EVIDENCE_GATE_INCOMPLETE");
  }
  return { status: next, evidenceReceiptIds: evidenceReceipts.map((item) => item.id) } as const;
}
