import { buildDeterministicBundle } from "./bundle.ts";
import { normalizedDefinition } from "./canonical.ts";
import { gradeOneWaveFOracleRows } from "./grade1-wave-f.ts";
import { buildPrerequisiteGraph } from "./graph.ts";
import { createOfficialSourceMap } from "./official-source-map.ts";
import { simulateCombinedWaveABCDEFCandidate } from "./simulation.ts";
import { auditIndependentCandidatePack } from "./wave-a-independent-audit.ts";
import { combinedWaveABCDEGradePacks, waveEGradePacks } from "./wave-e-packs.ts";
import { combinedWaveABCDEFGradePacks, waveFGradePacks, waveFProgressionContracts } from "./wave-f-packs.ts";
import { waveFPlan } from "./wave-f-plan.ts";
import { validateCrossPackDuplicates, validateGradePack } from "./validation.ts";

function customOracleErrors(grade: number) {
  if (grade === 1) return gradeOneWaveFOracleRows
    .filter((row) => row.status === "PASSED" && (!row.answerMatches || !row.explanationMatches))
    .map((row) => `${row.questionId}:GRADE_ONE_ADDITION_ORACLE`);
  return [];
}

export function auditWaveF() {
  const rows = waveFGradePacks.map((pack) => {
    const plan = waveFPlan.find((entry) => entry.grade === pack.grade)!;
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
  const crossWaveDuplicates = validateCrossPackDuplicates(combinedWaveABCDEFGradePacks).map((entry) => `${entry.entityId}:${entry.code}`);
  const graph = buildPrerequisiteGraph(combinedWaveABCDEFGradePacks);
  const waveFSkills = new Set(waveFGradePacks.flatMap((pack) => pack.questions.map((question) => question.skillId)));
  const graphErrors = graph.diagnostics
    .filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING" || (entry.code === "ORPHAN_SKILL" && waveFSkills.has(entry.entityId)))
    .map((entry) => `${entry.entityId}:${entry.code}`);
  const simulations = combinedWaveABCDEFGradePacks.map((pack) => simulateCombinedWaveABCDEFCandidate(pack,
    waveFProgressionContracts.find((contract) => contract.grade === pack.grade)!));
  const waveFBundle = buildDeterministicBundle(waveFGradePacks);
  const combinedBundle = buildDeterministicBundle(combinedWaveABCDEFGradePacks);
  const frozen = { waveEBundleHash: buildDeterministicBundle(waveEGradePacks).bundleHash,
    combinedWaveABCDEBundleHash: buildDeterministicBundle(combinedWaveABCDEGradePacks).bundleHash };
  const frozenErrors = [
    frozen.waveEBundleHash === "5795d721a8a2a9249e6195bbb7bc61280f400ce57355874c91d4752ba130d25c" ? null : "FROZEN_WAVE_E_BUNDLE_DRIFT",
    frozen.combinedWaveABCDEBundleHash === "f123d7f658c692ee979a3132f1321a7dce039de7d5ef0914be33ccf14bf1e626" ? null : "FROZEN_COMBINED_WAVE_A_B_C_D_E_BUNDLE_DRIFT",
  ].filter((entry): entry is string => entry !== null);
  const canonicalFingerprints = combinedWaveABCDEFGradePacks.flatMap((pack) => pack.questions.map((question) =>
    normalizedDefinition(`${question.prompt}|${question.options?.join("|") ?? ""}`).toLocaleLowerCase("vi")));
  const errors = [...rows.flatMap((row) => [...row.independentlyAudited.errors, ...row.oracleErrors, ...row.sourceErrors, ...row.validationErrors]),
    ...crossWaveDuplicates, ...graphErrors, ...frozenErrors, ...(rows.every((row) => row.hidden) ? [] : ["CANDIDATE_RELEASE_NOT_HIDDEN"])];
  return { schemaVersion: "plave-grades-1-9-wave-f-audit-v1", rows,
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
    progression: { nodes: graph.nodes.length, edges: graph.edges.length, waveFSkills: waveFSkills.size,
      waveFOrphans: graphErrors.filter((entry) => entry.endsWith(":ORPHAN_SKILL")).length,
      cycles: graphErrors.filter((entry) => entry.endsWith(":PREREQUISITE_CYCLE")).length,
      missingReferences: graphErrors.filter((entry) => entry.endsWith(":MISSING_PREREQUISITE_REFERENCE")).length,
      forwardGradeDependencies: graphErrors.filter((entry) => entry.endsWith(":FORWARD_GRADE_REFERENCE")).length },
    simulations, frozen, waveFBundle, combinedBundle,
    coverageTruth: "Wave F is a bounded number/algebra slice per grade; no grade or curriculum is claimed complete.", errors } as const;
}
