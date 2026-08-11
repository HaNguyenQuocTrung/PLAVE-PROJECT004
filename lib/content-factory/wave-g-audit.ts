import { buildDeterministicBundle } from "./bundle.ts";
import { normalizedDefinition } from "./canonical.ts";
import { gradeOneWaveGOracleRows } from "./grade1-wave-g.ts";
import { gradeTwoWaveGOracleRows } from "./grade2-wave-g.ts";
import { gradeThreeWaveGOracleRows } from "./grade3-wave-g.ts";
import { verifyGradeFourWaveGMalformedDataGuards } from "./grade4-wave-g.ts";
import { verifyGradeFiveWaveGMalformedDataGuards } from "./grade5-wave-g.ts";
import { verifyGradeSixWaveGMalformedDataGuards } from "./grade6-wave-g.ts";
import { verifyGradeSevenWaveGOracle } from "./grade7-wave-g.ts";
import { buildPrerequisiteGraph } from "./graph.ts";
import { createOfficialSourceMap } from "./official-source-map.ts";
import { auditOfflineInvocationBoundary } from "./offline-invocation.ts";
import { simulateCombinedWaveABCDEFGCandidate } from "./simulation.ts";
import { auditIndependentCandidatePack, type WaveAAuditRow } from "./wave-a-independent-audit.ts";
import { combinedWaveABCDEFGradePacks, waveFGradePacks } from "./wave-f-packs.ts";
import { combinedWaveABCDEFGGradePacks, waveGGradePacks, waveGProgressionContracts } from "./wave-g-packs.ts";
import { waveGPlan } from "./wave-g-plan.ts";
import { validateCrossPackDuplicates, validateGradePack } from "./validation.ts";

function emptyIndependentAudit(candidateId: string): WaveAAuditRow {
  return { grade: 1, candidateId, questions: 0, independentlyVerified: 0, uniqueFingerprints: 0, uniqueAnswers: 0,
    promptStructures: 0, skillCount: 0, difficulty: {}, instructionalPurpose: {}, optionPatternCount: 0, errors: [] };
}

function customOracleErrors(grade: number) {
  if (grade === 1) return gradeOneWaveGOracleRows.length === 6 && gradeOneWaveGOracleRows.every((row) =>
    row.status === "AUTOMATED_VERIFICATION_INSUFFICIENT" && !row.answerMatches && !row.explanationMatches) ? [] : ["GRADE_ONE_FAIL_CLOSED_ORACLE"];
  if (grade === 2) return gradeTwoWaveGOracleRows.filter((row) => !row.answerMatches || !row.explanationMatches || !row.publicDatasetPresent).map((row) => `${row.questionId}:GRADE_TWO_DATA_ORACLE`);
  if (grade === 3) return gradeThreeWaveGOracleRows.filter((row) => !row.answerMatches || !row.explanationMatches || !row.publicDatasetPresent).map((row) => `${row.questionId}:GRADE_THREE_DATA_ORACLE`);
  if (grade === 4) return verifyGradeFourWaveGMalformedDataGuards();
  if (grade === 5) return verifyGradeFiveWaveGMalformedDataGuards();
  if (grade === 6) return verifyGradeSixWaveGMalformedDataGuards();
  if (grade === 7) return [...verifyGradeSevenWaveGOracle()];
  return [];
}

export function auditWaveG() {
  const invocationBoundary = auditOfflineInvocationBoundary();
  const rows = waveGGradePacks.map((pack) => {
    const plan = waveGPlan.find((entry) => entry.grade === pack.grade)!;
    const independent = pack.grade === 1 ? emptyIndependentAudit(pack.candidate!.candidateId)
      : auditIndependentCandidatePack(pack, { expectedQuestions: pack.questions.length });
    const oracleErrors = customOracleErrors(pack.grade);
    const validationErrors = validateGradePack(pack).filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING");
    const sourceMap = pack.grade === 1 ? [] : createOfficialSourceMap(pack.grade);
    const sourceErrors = plan.sourceOutcomeIds.filter((outcomeId) => !sourceMap.some((row) => row.officialOutcomeId === outcomeId));
    return { grade: pack.grade, title: plan.title, selectionReason: plan.selectionReason,
      prerequisiteGapClosed: plan.prerequisiteGapClosed, deferredGap: plan.deferredGap,
      sourceOutcomeIds: plan.sourceOutcomeIds, authoritativePages: plan.authoritativePages,
      candidate: pack.candidate, production: pack.production, independentlyAudited: independent,
      quarantinedQuestionIds: (pack.quarantinedQuestions ?? []).map((question) => question.id),
      oracleErrors, sourceErrors, validationErrors: validationErrors.map((entry) => `${entry.entityId}:${entry.code}`),
      hidden: pack.release.publication === "DRAFT" && pack.release.visibility === "HIDDEN" && !pack.release.pilotEnabled && !pack.release.runtimeEnabled && !pack.release.retentionEnabled };
  });
  const crossWaveDuplicates = validateCrossPackDuplicates(combinedWaveABCDEFGGradePacks).map((entry) => `${entry.entityId}:${entry.code}`);
  const graph = buildPrerequisiteGraph(combinedWaveABCDEFGGradePacks);
  const waveGSkills = new Set(waveGProgressionContracts.flatMap((contract) => contract.waveGSkillIds));
  const graphErrors = graph.diagnostics
    .filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING" || (entry.code === "ORPHAN_SKILL" && waveGSkills.has(entry.entityId)))
    .map((entry) => `${entry.entityId}:${entry.code}`);
  const simulations = combinedWaveABCDEFGGradePacks.map((pack) => simulateCombinedWaveABCDEFGCandidate(pack,
    waveGProgressionContracts.find((contract) => contract.grade === pack.grade)!));
  const waveGBundle = buildDeterministicBundle(waveGGradePacks);
  const combinedBundle = buildDeterministicBundle(combinedWaveABCDEFGGradePacks);
  const frozen = { waveFBundleHash: buildDeterministicBundle(waveFGradePacks).bundleHash,
    combinedWaveABCDEFBundleHash: buildDeterministicBundle(combinedWaveABCDEFGradePacks).bundleHash };
  const frozenErrors = [
    frozen.waveFBundleHash === "bf725bf649e3985394cd5fd874c6d949d0621bd815c65982a2bc045a622039de" ? null : "FROZEN_WAVE_F_BUNDLE_DRIFT",
    frozen.combinedWaveABCDEFBundleHash === "e52d19b8cb77960ac0f861f072917c8af2c1a8e300c31d603ffb2a57ffca7f09" ? null : "FROZEN_COMBINED_WAVE_A_B_C_D_E_F_BUNDLE_DRIFT",
  ].filter((entry): entry is string => entry !== null);
  const canonicalFingerprints = combinedWaveABCDEFGGradePacks.flatMap((pack) => pack.questions.map((question) =>
    normalizedDefinition(`${question.prompt}|${question.options?.join("|") ?? ""}`).toLocaleLowerCase("vi")));
  const boundaryErrors = invocationBoundary.status === "PASS" && invocationBoundary.waveGNetworkAttemptCount === 0 ? [] : ["OFFLINE_INVOCATION_BOUNDARY_FAILED"];
  const errors = [...rows.flatMap((row) => [...row.independentlyAudited.errors, ...row.oracleErrors, ...row.sourceErrors, ...row.validationErrors]),
    ...crossWaveDuplicates, ...graphErrors, ...frozenErrors, ...boundaryErrors, ...(rows.every((row) => row.hidden) ? [] : ["CANDIDATE_RELEASE_NOT_HIDDEN"])];
  return { schemaVersion: "plave-grades-1-9-wave-g-audit-v1", rows,
    totals: { candidates: rows.length, questions: rows.reduce((sum, row) => sum + row.independentlyAudited.questions, 0),
      independentlyVerified: rows.reduce((sum, row) => sum + row.independentlyAudited.independentlyVerified - row.oracleErrors.length, 0),
      generated: rows.reduce((sum, row) => sum + (row.production?.generated ?? 0), 0), repaired: rows.reduce((sum, row) => sum + (row.production?.repaired ?? 0), 0),
      verificationInsufficient: rows.reduce((sum, row) => sum + (row.production?.verificationInsufficient ?? 0), 0), rejected: rows.reduce((sum, row) => sum + (row.production?.rejected ?? 0), 0),
      quarantined: rows.reduce((sum, row) => sum + row.quarantinedQuestionIds.length, 0), duplicate: rows.reduce((sum, row) => sum + (row.production?.duplicate ?? 0), 0),
      candidateEligible: rows.reduce((sum, row) => sum + (row.production?.candidateEligible ?? 0), 0), uniqueCanonicalPublicForms: new Set(canonicalFingerprints).size, errors: errors.length },
    crossWaveDuplicates, progression: { nodes: graph.nodes.length, edges: graph.edges.length, waveGSkills: waveGSkills.size,
      waveGOrphans: graphErrors.filter((entry) => entry.endsWith(":ORPHAN_SKILL")).length,
      cycles: graphErrors.filter((entry) => entry.endsWith(":PREREQUISITE_CYCLE")).length,
      missingReferences: graphErrors.filter((entry) => entry.endsWith(":MISSING_PREREQUISITE_REFERENCE")).length,
      forwardGradeDependencies: graphErrors.filter((entry) => entry.endsWith(":FORWARD_GRADE_REFERENCE")).length },
    simulations, frozen, invocationBoundary, waveGBundle, combinedBundle,
    coverageTruth: "Wave G is a bounded statistics/data/probability slice per grade; no grade or curriculum is claimed complete.", errors } as const;
}
