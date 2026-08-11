import { canonicalize, sha256 } from "./canonical.ts";
import type { FactoryGrade } from "./types.ts";
import type { proveWaveMAllGradeJourneys } from "./wave-m-journey.ts";
import type { auditWaveMRouteAccessibility } from "./wave-m-route-audit.ts";

export type WaveMDodCriterion = "CAN_LEARN" | "CAN_SHOW_PROGRESS" | "HAS_CLEAR_PATH" | "HAS_REVIEWABLE_HISTORY" | "HAS_CONTINUOUS_NEXT_ACTION";
export type WaveMDodResult = "PASS" | "PARTIAL" | "FAIL";

const evidence: Record<WaveMDodCriterion, Readonly<{ artifact: string; testIds: readonly string[] }>> = {
  CAN_LEARN: { artifact: "wave-m-student-journey-report.json", testIds: ["WM-JOURNEY-START-RESUME", "WM-JOURNEY-SUBMIT"] },
  CAN_SHOW_PROGRESS: { artifact: "wave-m-progress-contract.json", testIds: ["WM-PROGRESS-HISTORY-DERIVED", "WM-PROGRESS-NO-CLIENT-TOTALS"] },
  HAS_CLEAR_PATH: { artifact: "wave-m-pool-resolution-report.json", testIds: ["WM-POOL-FIXED-SAFE", "WM-PATH-NO-GRADE-JUMP"] },
  HAS_REVIEWABLE_HISTORY: { artifact: "wave-m-history-integrity-report.json", testIds: ["WM-HISTORY-EXACTLY-ONCE", "WM-HISTORY-STABLE-PAGINATION"] },
  HAS_CONTINUOUS_NEXT_ACTION: { artifact: "wave-m-definition-of-done.json", testIds: ["WM-NEXT-ACTION-TOTAL", "WM-GRADE-COMPLETE-FUTURE-PATH"] },
};

export function buildWaveMDefinitionOfDone(input: Readonly<{
  journeys: ReturnType<typeof proveWaveMAllGradeJourneys>;
  routeAudit: ReturnType<typeof auditWaveMRouteAccessibility>;
}>) {
  const grades = input.journeys.proofs.map((proof) => {
    const journeyPass = proof.invariantViolations.length === 0;
    const rows = (Object.keys(evidence) as WaveMDodCriterion[]).map((criterion) => {
      const gradeOneAdaptiveDistinction = proof.grade === 1 && criterion === "CAN_LEARN";
      const result: WaveMDodResult = !journeyPass || input.routeAudit.status !== "PASSED" ? "FAIL"
        : gradeOneAdaptiveDistinction ? "PARTIAL" : "PASS";
      const reason = result === "PARTIAL" ? "GRADE_ONE_FIXED_RUNTIME_WORKS_ADAPTIVE_REMAINS_LOCAL_SHADOW_ONLY"
        : result === "PASS" ? "DETERMINISTIC_PRODUCT_JOURNEY_EVIDENCE_PASSED" : "PRODUCT_JOURNEY_EVIDENCE_FAILED";
      return { criterion, result, reason, evidenceArtifact: evidence[criterion].artifact, testIds: evidence[criterion].testIds };
    });
    return { grade: proof.grade as FactoryGrade, rows };
  });
  const flattened = grades.flatMap((grade) => grade.rows); const totals = { pass: flattened.filter((row) => row.result === "PASS").length,
    partial: flattened.filter((row) => row.result === "PARTIAL").length, fail: flattened.filter((row) => row.result === "FAIL").length };
  const core = { schemaVersion: "plave-wave-m-product-definition-of-done-v1", grades, totals,
    successRule: "NO_GRADE_FAIL_PARTIAL_ONLY_GRADE_ONE_ADAPTIVE_DISTINCTION_OR_NON_DETERMINISTIC_SOURCE_OUTCOME",
    noJourneyDeadEnd: input.journeys.proofs.every((proof) => proof.checks.noJourneyDeadEnd),
    authorizationIntegrity: input.journeys.proofs.every((proof) => proof.checks.parentApprovedRead && proof.checks.parentUnapprovedDenied
      && proof.checks.teacherAuthorizedRead && proof.checks.teacherUnauthorizedDenied && proof.checks.crossUserAndAnonymousDenied),
    historyIntegrity: input.journeys.proofs.every((proof) => proof.checks.historyExactlyOnce && proof.checks.historyMutationConflictDenied
      && proof.checks.deactivationPreservesHistory) } as const;
  return { ...core, matrixHash: sha256(canonicalize(core)), status: totals.fail === 0 && core.noJourneyDeadEnd
      && core.authorizationIntegrity && core.historyIntegrity ? "PASSED" as const : "FAILED" as const };
}
