import { buildDeterministicBundle } from "./bundle.ts";
import { normalizedDefinition } from "./canonical.ts";
import { gradeOneWaveCOracleRows } from "./grade1-wave-c.ts";
import { gradeTwoWaveCOracleRows } from "./grade2-wave-c.ts";
import { gradeThreeWaveCOracleRows } from "./grade3-wave-c.ts";
import { verifyGradeEightWaveCIndependentOracle } from "./grade8-wave-c.ts";
import { buildPrerequisiteGraph } from "./graph.ts";
import { createOfficialSourceMap } from "./official-source-map.ts";
import { simulateCombinedWaveABCCandidate } from "./simulation.ts";
import { auditIndependentCandidatePack } from "./wave-a-independent-audit.ts";
import { combinedWaveABGradePacks, waveBGradePacks } from "./wave-b-packs.ts";
import { combinedWaveABCGradePacks, waveCGradePacks, waveCProgressionContracts } from "./wave-c-packs.ts";
import { waveCPlan } from "./wave-c-plan.ts";
import { validateCrossPackDuplicates, validateGradePack } from "./validation.ts";

function customOracleErrors(grade: number) {
  if (grade === 1) return gradeOneWaveCOracleRows
    .filter((row) => !row.answerMatches || !row.explanationMatches || row.status !== "PASSED")
    .map((row) => `${row.questionId}:GRADE_ONE_SUBTRACTION_ORACLE`);
  if (grade === 2) return gradeTwoWaveCOracleRows
    .filter((row) => !row.answerMatches || !row.explanationMatches)
    .map((row) => `${row.questionId}:GRADE_TWO_TABLE_ORACLE`);
  if (grade === 3) return gradeThreeWaveCOracleRows
    .filter((row) => !row.answerMatches || !row.explanationMatches)
    .map((row) => `${row.questionId}:GRADE_THREE_UNIT_FRACTION_ORACLE`);
  if (grade === 8) return verifyGradeEightWaveCIndependentOracle().map((id) => `${id}:GRADE_EIGHT_POLYNOMIAL_ORACLE`);
  const pack = waveCGradePacks.find((entry) => entry.grade === grade)!;
  return pack.questions.filter((question) => !question.answer.derivation && !question.answer.comparison)
    .map((question) => `${question.id}:INDEPENDENT_DERIVATION_REQUIRED`);
}

export function auditWaveC() {
  const rows = waveCGradePacks.map((pack) => {
    const plan = waveCPlan.find((entry) => entry.grade === pack.grade)!;
    const independent = auditIndependentCandidatePack(pack);
    const oracleErrors = customOracleErrors(pack.grade);
    const validationErrors = validateGradePack(pack).filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING");
    const sourceMap = pack.grade === 1 ? [] : createOfficialSourceMap(pack.grade);
    const sourceErrors = plan.sourceOutcomeIds.filter((outcomeId) => !sourceMap.some((row) => row.officialOutcomeId === outcomeId));
    return {
      grade: pack.grade,
      title: plan.title,
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
  const crossWaveDuplicates = validateCrossPackDuplicates(combinedWaveABCGradePacks).map((entry) => `${entry.entityId}:${entry.code}`);
  const graph = buildPrerequisiteGraph(combinedWaveABCGradePacks);
  const waveCSkills = new Set(waveCGradePacks.flatMap((pack) => pack.questions.map((question) => question.skillId)));
  const graphErrors = graph.diagnostics
    .filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING" || (entry.code === "ORPHAN_SKILL" && waveCSkills.has(entry.entityId)))
    .map((entry) => `${entry.entityId}:${entry.code}`);
  const simulations = combinedWaveABCGradePacks.map((pack) => simulateCombinedWaveABCCandidate(
    pack,
    waveCProgressionContracts.find((contract) => contract.grade === pack.grade)!,
  ));
  const waveCBundle = buildDeterministicBundle(waveCGradePacks);
  const combinedBundle = buildDeterministicBundle(combinedWaveABCGradePacks);
  const frozen = {
    waveBBundleHash: buildDeterministicBundle(waveBGradePacks).bundleHash,
    combinedWaveABBundleHash: buildDeterministicBundle(combinedWaveABGradePacks).bundleHash,
  };
  const frozenErrors = [
    frozen.waveBBundleHash === "36f6b6201c8b9cf9e57d68267421df77b1569cc0b3330e77a29e38ce1667e5a2" ? null : "FROZEN_WAVE_B_BUNDLE_DRIFT",
    frozen.combinedWaveABBundleHash === "93ef241fc04cd395caf9b7bcd5447506223214db4e36411988907096456898f3" ? null : "FROZEN_COMBINED_WAVE_A_B_BUNDLE_DRIFT",
  ].filter((entry): entry is string => entry !== null);
  const canonicalFingerprints = combinedWaveABCGradePacks.flatMap((pack) => pack.questions.map((question) => normalizedDefinition(`${question.prompt}|${question.options?.join("|") ?? ""}`).toLocaleLowerCase("vi")));
  const errors = [
    ...rows.flatMap((row) => [...row.independent.errors, ...row.oracleErrors, ...row.sourceErrors, ...row.validationErrors]),
    ...crossWaveDuplicates,
    ...graphErrors,
    ...frozenErrors,
    ...(rows.every((row) => row.hidden) ? [] : ["CANDIDATE_RELEASE_NOT_HIDDEN"]),
  ];
  return {
    schemaVersion: "plave-grades-1-9-wave-c-audit-v1",
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
      waveCSkills: waveCSkills.size,
      waveCOrphans: graphErrors.filter((entry) => entry.endsWith(":ORPHAN_SKILL")).length,
      cycles: graphErrors.filter((entry) => entry.endsWith(":PREREQUISITE_CYCLE")).length,
      missingReferences: graphErrors.filter((entry) => entry.endsWith(":MISSING_PREREQUISITE_REFERENCE")).length,
      forwardGradeDependencies: graphErrors.filter((entry) => entry.endsWith(":FORWARD_GRADE_REFERENCE")).length,
    },
    simulations,
    frozen,
    waveCBundle,
    combinedBundle,
    coverageTruth: "Wave C is one bounded source-verified slice per grade; no grade or curriculum is claimed complete.",
    errors,
  } as const;
}
