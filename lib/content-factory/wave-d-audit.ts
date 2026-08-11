import { buildDeterministicBundle } from "./bundle.ts";
import { normalizedDefinition } from "./canonical.ts";
import { gradeOneWaveDOracleRows } from "./grade1-wave-d.ts";
import { gradeTwoWaveDOracleRows } from "./grade2-wave-d.ts";
import { verifyGradeSevenWaveDRootOracle } from "./grade7-wave-d.ts";
import { verifyGradeEightWaveDSlopeOracle } from "./grade8-wave-d.ts";
import { verifyGradeNineWaveDCircleAngleOracle } from "./grade9-wave-d.ts";
import { buildPrerequisiteGraph } from "./graph.ts";
import { createOfficialSourceMap } from "./official-source-map.ts";
import { simulateCombinedWaveABCDCandidate } from "./simulation.ts";
import { auditIndependentCandidatePack } from "./wave-a-independent-audit.ts";
import { combinedWaveABCGradePacks, waveCGradePacks } from "./wave-c-packs.ts";
import { combinedWaveABCDGradePacks, waveDGradePacks, waveDProgressionContracts } from "./wave-d-packs.ts";
import { waveDPlan } from "./wave-d-plan.ts";
import { validateCrossPackDuplicates, validateGradePack } from "./validation.ts";

function customOracleErrors(grade: number) {
  if (grade === 1) return gradeOneWaveDOracleRows
    .filter((row) => !row.answerMatches || !row.explanationMatches || row.status !== "PASSED")
    .map((row) => `${row.questionId}:GRADE_ONE_NUMBER_SENSE_ORACLE`);
  if (grade === 2) return gradeTwoWaveDOracleRows
    .filter((row) => !row.answerMatches || !row.explanationMatches)
    .map((row) => `${row.questionId}:GRADE_TWO_ONE_STEP_ORACLE`);
  if (grade === 7) return verifyGradeSevenWaveDRootOracle().map((id) => `${id}:GRADE_SEVEN_POLYNOMIAL_ORACLE`);
  if (grade === 8) return verifyGradeEightWaveDSlopeOracle().map((id) => `${id}:GRADE_EIGHT_SLOPE_ORACLE`);
  if (grade === 9) return verifyGradeNineWaveDCircleAngleOracle().map((id) => `${id}:GRADE_NINE_CIRCLE_ANGLE_ORACLE`);
  const pack = waveDGradePacks.find((entry) => entry.grade === grade)!;
  return pack.questions.filter((question) => !question.answer.derivation && !question.answer.comparison && !question.answer.geometry)
    .map((question) => `${question.id}:INDEPENDENT_DERIVATION_REQUIRED`);
}

export function auditWaveD() {
  const rows = waveDGradePacks.map((pack) => {
    const plan = waveDPlan.find((entry) => entry.grade === pack.grade)!;
    const independent = auditIndependentCandidatePack(pack);
    const oracleErrors = customOracleErrors(pack.grade);
    const validationErrors = validateGradePack(pack).filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING");
    const sourceMap = pack.grade === 1 ? [] : createOfficialSourceMap(pack.grade);
    const sourceErrors = plan.sourceOutcomeIds.filter((outcomeId) => !sourceMap.some((row) => row.officialOutcomeId === outcomeId));
    return {
      grade: pack.grade,
      title: plan.title,
      selectionReason: plan.selectionReason,
      prerequisiteGapClosed: plan.prerequisiteGapClosed,
      sourceOutcomeIds: plan.sourceOutcomeIds,
      authoritativePages: plan.authoritativePages,
      candidate: pack.candidate,
      production: pack.production,
      independent,
      oracleErrors,
      sourceErrors,
      validationErrors: validationErrors.map((entry) => `${entry.entityId}:${entry.code}`),
      hidden: pack.release.publication === "DRAFT" && pack.release.visibility === "HIDDEN" && !pack.release.pilotEnabled && !pack.release.runtimeEnabled && !pack.release.retentionEnabled,
    };
  });
  const crossWaveDuplicates = validateCrossPackDuplicates(combinedWaveABCDGradePacks).map((entry) => `${entry.entityId}:${entry.code}`);
  const graph = buildPrerequisiteGraph(combinedWaveABCDGradePacks);
  const waveDSkills = new Set(waveDGradePacks.flatMap((pack) => pack.questions.map((question) => question.skillId)));
  const graphErrors = graph.diagnostics
    .filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING" || (entry.code === "ORPHAN_SKILL" && waveDSkills.has(entry.entityId)))
    .map((entry) => `${entry.entityId}:${entry.code}`);
  const simulations = combinedWaveABCDGradePacks.map((pack) => simulateCombinedWaveABCDCandidate(
    pack,
    waveDProgressionContracts.find((contract) => contract.grade === pack.grade)!,
  ));
  const waveDBundle = buildDeterministicBundle(waveDGradePacks);
  const combinedBundle = buildDeterministicBundle(combinedWaveABCDGradePacks);
  const frozen = {
    waveCBundleHash: buildDeterministicBundle(waveCGradePacks).bundleHash,
    combinedWaveABCBundleHash: buildDeterministicBundle(combinedWaveABCGradePacks).bundleHash,
  };
  const frozenErrors = [
    frozen.waveCBundleHash === "7e3da6e3b5377e18364263280eb6810dcb5dec0479ecb1f1ab26aef9427c9cd4" ? null : "FROZEN_WAVE_C_BUNDLE_DRIFT",
    frozen.combinedWaveABCBundleHash === "0e5832b27b3fc235e853d14d8ef84565c9b454037c9308fbf5f8193c38962986" ? null : "FROZEN_COMBINED_WAVE_A_B_C_BUNDLE_DRIFT",
  ].filter((entry): entry is string => entry !== null);
  const canonicalFingerprints = combinedWaveABCDGradePacks.flatMap((pack) => pack.questions.map((question) => normalizedDefinition(`${question.prompt}|${question.options?.join("|") ?? ""}`).toLocaleLowerCase("vi")));
  const errors = [
    ...rows.flatMap((row) => [...row.independent.errors, ...row.oracleErrors, ...row.sourceErrors, ...row.validationErrors]),
    ...crossWaveDuplicates,
    ...graphErrors,
    ...frozenErrors,
    ...(rows.every((row) => row.hidden) ? [] : ["CANDIDATE_RELEASE_NOT_HIDDEN"]),
  ];
  return {
    schemaVersion: "plave-grades-1-9-wave-d-audit-v1",
    rows,
    totals: {
      candidates: rows.length,
      questions: rows.reduce((sum, row) => sum + row.independent.questions, 0),
      independentlyVerified: rows.reduce((sum, row) => sum + row.independent.independentlyVerified - row.oracleErrors.length, 0),
      generated: rows.reduce((sum, row) => sum + (row.production?.generated ?? 0), 0),
      repaired: rows.reduce((sum, row) => sum + (row.production?.repaired ?? 0), 0),
      verificationInsufficient: rows.reduce((sum, row) => sum + (row.production?.verificationInsufficient ?? 0), 0),
      rejected: rows.reduce((sum, row) => sum + (row.production?.rejected ?? 0), 0),
      duplicate: rows.reduce((sum, row) => sum + (row.production?.duplicate ?? 0), 0),
      candidateEligible: rows.reduce((sum, row) => sum + (row.production?.candidateEligible ?? 0), 0),
      uniqueCanonicalPublicForms: new Set(canonicalFingerprints).size,
      errors: errors.length,
    },
    crossWaveDuplicates,
    progression: {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      waveDSkills: waveDSkills.size,
      waveDOrphans: graphErrors.filter((entry) => entry.endsWith(":ORPHAN_SKILL")).length,
      cycles: graphErrors.filter((entry) => entry.endsWith(":PREREQUISITE_CYCLE")).length,
      missingReferences: graphErrors.filter((entry) => entry.endsWith(":MISSING_PREREQUISITE_REFERENCE")).length,
      forwardGradeDependencies: graphErrors.filter((entry) => entry.endsWith(":FORWARD_GRADE_REFERENCE")).length,
    },
    simulations,
    frozen,
    waveDBundle,
    combinedBundle,
    coverageTruth: "Wave D is one bounded source-verified slice per grade; no grade or curriculum is claimed complete.",
    errors,
  } as const;
}
