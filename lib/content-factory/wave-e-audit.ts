import { buildDeterministicBundle } from "./bundle.ts";
import { normalizedDefinition } from "./canonical.ts";
import { gradeOneWaveEOracleRows } from "./grade1-wave-e.ts";
import { gradeTwoWaveEOracleRows } from "./grade2-wave-e.ts";
import { verifyGradeSevenWaveEOracle } from "./grade7-wave-e.ts";
import { verifyGradeEightWaveEOracle } from "./grade8-wave-e.ts";
import { verifyGradeNineWaveEOracle } from "./grade9-wave-e.ts";
import { buildPrerequisiteGraph } from "./graph.ts";
import { createOfficialSourceMap } from "./official-source-map.ts";
import { simulateCombinedWaveABCDECandidate } from "./simulation.ts";
import { auditIndependentCandidatePack } from "./wave-a-independent-audit.ts";
import { combinedWaveABCDGradePacks, waveDGradePacks } from "./wave-d-packs.ts";
import { combinedWaveABCDEGradePacks, waveEGradePacks, waveEProgressionContracts } from "./wave-e-packs.ts";
import { waveEPlan } from "./wave-e-plan.ts";
import { validateCrossPackDuplicates, validateGradePack } from "./validation.ts";

function customOracleErrors(grade: number) {
  if (grade === 1) return gradeOneWaveEOracleRows
    .filter((row) => row.status === "PASSED" && (!row.answerMatches || !row.explanationMatches))
    .map((row) => `${row.questionId}:GRADE_ONE_WEEKDAY_ORACLE`);
  if (grade === 2) return gradeTwoWaveEOracleRows
    .filter((row) => !row.answerMatches || !row.explanationMatches)
    .map((row) => `${row.questionId}:GRADE_TWO_LENGTH_ORACLE`);
  if (grade === 7) return verifyGradeSevenWaveEOracle().map((id) => `${id}:GRADE_SEVEN_PRISM_ORACLE`);
  if (grade === 8) return verifyGradeEightWaveEOracle().map((id) => `${id}:GRADE_EIGHT_PYRAMID_ORACLE`);
  if (grade === 9) return verifyGradeNineWaveEOracle().map((id) => `${id}:GRADE_NINE_ROUND_SOLID_ORACLE`);
  const pack = waveEGradePacks.find((entry) => entry.grade === grade)!;
  return pack.questions.filter((question) => !question.answer.derivation && !question.answer.comparison && !question.answer.geometry)
    .map((question) => `${question.id}:INDEPENDENT_DERIVATION_REQUIRED`);
}

export function auditWaveE() {
  const rows = waveEGradePacks.map((pack) => {
    const plan = waveEPlan.find((entry) => entry.grade === pack.grade)!;
    const independent = auditIndependentCandidatePack(pack, { expectedQuestions: pack.questions.length });
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
  const crossWaveDuplicates = validateCrossPackDuplicates(combinedWaveABCDEGradePacks).map((entry) => `${entry.entityId}:${entry.code}`);
  const graph = buildPrerequisiteGraph(combinedWaveABCDEGradePacks);
  const waveESkills = new Set(waveEGradePacks.flatMap((pack) => pack.questions.map((question) => question.skillId)));
  const graphErrors = graph.diagnostics
    .filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING" || (entry.code === "ORPHAN_SKILL" && waveESkills.has(entry.entityId)))
    .map((entry) => `${entry.entityId}:${entry.code}`);
  const simulations = combinedWaveABCDEGradePacks.map((pack) => simulateCombinedWaveABCDECandidate(pack,
    waveEProgressionContracts.find((contract) => contract.grade === pack.grade)!));
  const waveEBundle = buildDeterministicBundle(waveEGradePacks);
  const combinedBundle = buildDeterministicBundle(combinedWaveABCDEGradePacks);
  const frozen = { waveDBundleHash: buildDeterministicBundle(waveDGradePacks).bundleHash,
    combinedWaveABCDBundleHash: buildDeterministicBundle(combinedWaveABCDGradePacks).bundleHash };
  const frozenErrors = [
    frozen.waveDBundleHash === "8395b56d061f84f34cf9c7de90d2cd8fcd78071bbd906abc14b2a664a0a3e052" ? null : "FROZEN_WAVE_D_BUNDLE_DRIFT",
    frozen.combinedWaveABCDBundleHash === "d574cc67e9d45fdd25bf2e55f4a2af899ba7acecc4a85b80435a47f7e21e53dd" ? null : "FROZEN_COMBINED_WAVE_A_B_C_D_BUNDLE_DRIFT",
  ].filter((entry): entry is string => entry !== null);
  const canonicalFingerprints = combinedWaveABCDEGradePacks.flatMap((pack) => pack.questions.map((question) =>
    normalizedDefinition(`${question.prompt}|${question.options?.join("|") ?? ""}`).toLocaleLowerCase("vi")));
  const errors = [...rows.flatMap((row) => [...row.independentlyAudited.errors, ...row.oracleErrors, ...row.sourceErrors, ...row.validationErrors]),
    ...crossWaveDuplicates, ...graphErrors, ...frozenErrors, ...(rows.every((row) => row.hidden) ? [] : ["CANDIDATE_RELEASE_NOT_HIDDEN"])];
  return { schemaVersion: "plave-grades-1-9-wave-e-audit-v1", rows,
    totals: { candidates: rows.length, questions: rows.reduce((sum, row) => sum + row.independentlyAudited.questions, 0),
      independentlyVerified: rows.reduce((sum, row) => sum + row.independentlyAudited.independentlyVerified - row.oracleErrors.length, 0),
      generated: rows.reduce((sum, row) => sum + (row.production?.generated ?? 0), 0),
      repaired: rows.reduce((sum, row) => sum + (row.production?.repaired ?? 0), 0),
      verificationInsufficient: rows.reduce((sum, row) => sum + (row.production?.verificationInsufficient ?? 0), 0),
      rejected: rows.reduce((sum, row) => sum + (row.production?.rejected ?? 0), 0),
      quarantined: rows.reduce((sum, row) => sum + row.quarantinedQuestionIds.length, 0),
      duplicate: rows.reduce((sum, row) => sum + (row.production?.duplicate ?? 0), 0),
      candidateEligible: rows.reduce((sum, row) => sum + (row.production?.candidateEligible ?? 0), 0),
      uniqueCanonicalPublicForms: new Set(canonicalFingerprints).size, errors: errors.length },
    crossWaveDuplicates,
    progression: { nodes: graph.nodes.length, edges: graph.edges.length, waveESkills: waveESkills.size,
      waveEOrphans: graphErrors.filter((entry) => entry.endsWith(":ORPHAN_SKILL")).length,
      cycles: graphErrors.filter((entry) => entry.endsWith(":PREREQUISITE_CYCLE")).length,
      missingReferences: graphErrors.filter((entry) => entry.endsWith(":MISSING_PREREQUISITE_REFERENCE")).length,
      forwardGradeDependencies: graphErrors.filter((entry) => entry.endsWith(":FORWARD_GRADE_REFERENCE")).length },
    simulations, frozen, waveEBundle, combinedBundle,
    coverageTruth: "Wave E is a bounded measurement/geometry slice per grade; no grade or curriculum is claimed complete.", errors } as const;
}
