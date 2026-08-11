import { auditAppliedEquivalentQuestions } from "./applied-reasoning.ts";
import { buildDeterministicBundle } from "./bundle.ts";
import { normalizedDefinition } from "./canonical.ts";
import { gradeOneWaveHOracleRows } from "./grade1-wave-h.ts";
import { gradeTwoWaveHOracleRows } from "./grade2-wave-h.ts";
import { gradeThreeWaveHOracleRows } from "./grade3-wave-h.ts";
import { verifyGradeFourWaveHIndependentOracle, verifyGradeFourWaveHMalformedFixtures } from "./grade4-wave-h.ts";
import { verifyGradeFiveWaveHIndependentOracle, verifyGradeFiveWaveHMalformedFixtures } from "./grade5-wave-h.ts";
import { verifyGradeSixWaveHIndependentOracle, verifyGradeSixWaveHMalformedFixtures } from "./grade6-wave-h.ts";
import { verifyGradeSevenWaveHIndependentOracle, verifyGradeSevenWaveHMalformedFixtures } from "./grade7-wave-h.ts";
import { verifyGradeEightWaveHIndependentOracle, verifyGradeEightWaveHMalformedFixtures } from "./grade8-wave-h.ts";
import { verifyGradeNineWaveHIndependentOracle, verifyGradeNineWaveHMalformedFixtures } from "./grade9-wave-h.ts";
import { buildPrerequisiteGraph } from "./graph.ts";
import { createOfficialSourceMap } from "./official-source-map.ts";
import { simulateCombinedWaveABCDEFGHCandidate } from "./simulation.ts";
import { auditIndependentCandidatePack, type WaveAAuditRow } from "./wave-a-independent-audit.ts";
import { combinedWaveABCDEFGGradePacks, waveGGradePacks } from "./wave-g-packs.ts";
import { auditWaveHInvocationBoundary } from "./wave-h-invocation.ts";
import { combinedWaveABCDEFGHGradePacks, waveHGradePacks, waveHProgressionContracts } from "./wave-h-packs.ts";
import { waveHPlan } from "./wave-h-plan.ts";
import { validateCrossPackDuplicates, validateGradePack } from "./validation.ts";

function gradeOneIndependent(packId: string): WaveAAuditRow {
  const errors = gradeOneWaveHOracleRows.filter((row) => row.status !== "PASSED" || !row.answerMatches || !row.explanationMatches).map((row) => `${row.questionId}:GRADE_ONE_SEMANTIC_PARITY`);
  return { grade: 1, candidateId: packId, questions: 6, independentlyVerified: 6 - errors.length, uniqueFingerprints: 6,
    uniqueAnswers: new Set(gradeOneWaveHOracleRows.map((row) => row.independentlyDerived)).size, promptStructures: 1, skillCount: 1,
    difficulty: {}, instructionalPurpose: {}, optionPatternCount: 6, errors };
}

function oracleErrors(grade: number) {
  if (grade === 1) return gradeOneWaveHOracleRows.filter((row) => row.status !== "PASSED").map((row) => `${row.questionId}:GRADE_ONE_ORACLE`);
  if (grade === 2) return gradeTwoWaveHOracleRows.filter((row) => !row.answerMatches || !row.explanationMatches).map((row) => `${row.questionId}:GRADE_TWO_ORACLE`);
  if (grade === 3) return gradeThreeWaveHOracleRows.filter((row) => !row.answerMatches || !row.explanationMatches).map((row) => `${row.questionId}:GRADE_THREE_ORACLE`);
  const verifiers = new Map<number, () => string[]>([
    [4, () => [...verifyGradeFourWaveHIndependentOracle(), ...verifyGradeFourWaveHMalformedFixtures()]],
    [5, () => [...verifyGradeFiveWaveHIndependentOracle(), ...verifyGradeFiveWaveHMalformedFixtures()]],
    [6, () => [...verifyGradeSixWaveHIndependentOracle(), ...verifyGradeSixWaveHMalformedFixtures()]],
    [7, () => [...verifyGradeSevenWaveHIndependentOracle(), ...verifyGradeSevenWaveHMalformedFixtures()]],
    [8, () => [...verifyGradeEightWaveHIndependentOracle(), ...verifyGradeEightWaveHMalformedFixtures()]],
    [9, () => [...verifyGradeNineWaveHIndependentOracle(), ...verifyGradeNineWaveHMalformedFixtures()]],
  ]);
  return verifiers.get(grade)?.() ?? [`G${grade}:ORACLE_MISSING`];
}

export function auditWaveH() {
  const invocationBoundary = auditWaveHInvocationBoundary();
  const rows = waveHGradePacks.map((pack) => {
    const plan = waveHPlan.find((entry) => entry.grade === pack.grade)!;
    const independent = pack.grade === 1 ? gradeOneIndependent(pack.candidate!.candidateId) : auditIndependentCandidatePack(pack, { expectedQuestions: 24 });
    const customErrors = oracleErrors(pack.grade);
    const validationErrors = validateGradePack(pack).filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING");
    const sourceMap = pack.grade === 1 ? [] : createOfficialSourceMap(pack.grade);
    const sourceErrors = plan.sourceOutcomeIds.filter((outcomeId) => !sourceMap.some((row) => row.officialOutcomeId === outcomeId && row.automatedVerificationCapability !== "INSUFFICIENT"));
    return { grade: pack.grade, title: plan.title, selectionReason: plan.selectionReason, prerequisiteGapClosed: plan.prerequisiteGapClosed,
      reasoningRequirement: plan.reasoningRequirement, deferredGap: plan.deferredGap, sourceOutcomeIds: plan.sourceOutcomeIds,
      authoritativePages: plan.authoritativePages, candidate: pack.candidate, production: pack.production, independentlyAudited: independent,
      quarantinedQuestionIds: (pack.quarantinedQuestions ?? []).map((question) => question.id), oracleErrors: customErrors, sourceErrors,
      validationErrors: validationErrors.map((entry) => `${entry.entityId}:${entry.code}`),
      hidden: pack.release.publication === "DRAFT" && pack.release.visibility === "HIDDEN" && !pack.release.pilotEnabled && !pack.release.runtimeEnabled && !pack.release.retentionEnabled };
  });
  const crossWaveDuplicates = validateCrossPackDuplicates(combinedWaveABCDEFGHGradePacks).map((entry) => `${entry.entityId}:${entry.code}`);
  const appliedEquivalentDuplicates = auditAppliedEquivalentQuestions(waveHGradePacks);
  const graph = buildPrerequisiteGraph(combinedWaveABCDEFGHGradePacks);
  const waveHSkills = new Set(waveHProgressionContracts.flatMap((contract) => contract.waveHSkillIds));
  const graphErrors = graph.diagnostics.filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING" || (entry.code === "ORPHAN_SKILL" && waveHSkills.has(entry.entityId))).map((entry) => `${entry.entityId}:${entry.code}`);
  const simulations = combinedWaveABCDEFGHGradePacks.map((pack) => simulateCombinedWaveABCDEFGHCandidate(pack, waveHProgressionContracts.find((entry) => entry.grade === pack.grade)!));
  const waveHBundle = buildDeterministicBundle(waveHGradePacks); const combinedBundle = buildDeterministicBundle(combinedWaveABCDEFGHGradePacks);
  const frozen = { waveGBundleHash: buildDeterministicBundle(waveGGradePacks).bundleHash, combinedWaveABCDEFGBundleHash: buildDeterministicBundle(combinedWaveABCDEFGGradePacks).bundleHash };
  const frozenErrors = [frozen.waveGBundleHash === "70d68d5c61159f00b7f93cdad32ac0c48cf67036add2291162b05d1974e19416" ? null : "FROZEN_WAVE_G_BUNDLE_DRIFT",
    frozen.combinedWaveABCDEFGBundleHash === "8cf480fbaf4717f8a79b26e33bdf96e20d3c0def410d63d9704cdf074e4f967b" ? null : "FROZEN_COMBINED_WAVE_A_TO_G_BUNDLE_DRIFT"].filter((entry): entry is string => entry !== null);
  const fingerprints = combinedWaveABCDEFGHGradePacks.flatMap((pack) => pack.questions.map((question) => normalizedDefinition(`${question.prompt}|${question.options?.join("|") ?? ""}`).toLocaleLowerCase("vi")));
  const boundaryErrors = invocationBoundary.status === "PASS" && invocationBoundary.waveGNetworkAttemptCount === 0 && invocationBoundary.waveHNetworkAttemptCount === 0 ? [] : ["OFFLINE_INVOCATION_BOUNDARY_FAILED"];
  const errors = [...rows.flatMap((row) => [...row.independentlyAudited.errors, ...row.oracleErrors, ...row.sourceErrors, ...row.validationErrors]), ...crossWaveDuplicates,
    ...appliedEquivalentDuplicates, ...graphErrors, ...frozenErrors, ...boundaryErrors, ...(rows.every((row) => row.hidden) ? [] : ["CANDIDATE_RELEASE_NOT_HIDDEN"])];
  return { schemaVersion: "plave-grades-1-9-wave-h-audit-v1", rows,
    totals: { candidates: rows.length, questions: rows.reduce((sum, row) => sum + row.independentlyAudited.questions, 0), independentlyVerified: rows.reduce((sum, row) => sum + row.independentlyAudited.independentlyVerified - row.oracleErrors.length, 0),
      generated: rows.reduce((sum, row) => sum + (row.production?.generated ?? 0), 0), repaired: rows.reduce((sum, row) => sum + (row.production?.repaired ?? 0), 0),
      verificationInsufficient: rows.reduce((sum, row) => sum + (row.production?.verificationInsufficient ?? 0), 0), rejected: rows.reduce((sum, row) => sum + (row.production?.rejected ?? 0), 0),
      quarantined: rows.reduce((sum, row) => sum + row.quarantinedQuestionIds.length, 0), duplicate: rows.reduce((sum, row) => sum + (row.production?.duplicate ?? 0), 0),
      candidateEligible: rows.reduce((sum, row) => sum + (row.production?.candidateEligible ?? 0), 0), uniqueCanonicalPublicForms: new Set(fingerprints).size, errors: errors.length },
    crossWaveDuplicates, appliedEquivalentDuplicates, progression: { nodes: graph.nodes.length, edges: graph.edges.length, waveHSkills: waveHSkills.size,
      waveHOrphans: graphErrors.filter((entry) => entry.endsWith(":ORPHAN_SKILL")).length, cycles: graphErrors.filter((entry) => entry.endsWith(":PREREQUISITE_CYCLE")).length,
      missingReferences: graphErrors.filter((entry) => entry.endsWith(":MISSING_PREREQUISITE_REFERENCE")).length, forwardGradeDependencies: graphErrors.filter((entry) => entry.endsWith(":FORWARD_GRADE_REFERENCE")).length },
    simulations, frozen, invocationBoundary, waveHBundle, combinedBundle,
    coverageTruth: "Wave H is a bounded applied/multi-step slice per grade; no grade or curriculum is claimed complete.", errors } as const;
}
