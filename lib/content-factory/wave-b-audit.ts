import { buildDeterministicBundle } from "./bundle.ts";
import { normalizedDefinition } from "./canonical.ts";
import { createOfficialSourceMap } from "./official-source-map.ts";
import { simulateCombinedWaveABCandidate } from "./simulation.ts";
import { auditIndependentCandidatePack } from "./wave-a-independent-audit.ts";
import { combinedWaveABGradePacks, waveBGradePacks, waveBProgressionContracts } from "./wave-b-packs.ts";
import { waveBPlan } from "./wave-b-plan.ts";
import { validateCrossPackDuplicates, validateGradePack } from "./validation.ts";

export function auditWaveB() {
  const rows = waveBGradePacks.map((pack) => {
    const plan = waveBPlan.find((entry) => entry.grade === pack.grade)!;
    const independent = auditIndependentCandidatePack(pack);
    const validationErrors = validateGradePack(pack).filter((entry) => entry.severity === "ERROR");
    const sourceMap = pack.grade === 1 ? [] : createOfficialSourceMap(pack.grade);
    const missingOutcomes = plan.sourceOutcomeIds.filter((outcomeId) => !sourceMap.some((row) => row.officialOutcomeId === outcomeId));
    return {
      grade: pack.grade,
      title: plan.title,
      sourceOutcomeIds: plan.sourceOutcomeIds,
      authoritativePages: plan.authoritativePages,
      candidate: pack.candidate,
      production: pack.production,
      independent,
      sourceErrors: missingOutcomes,
      validationErrors: validationErrors.map((entry) => `${entry.entityId}:${entry.code}`),
      hidden: pack.release.publication === "DRAFT" && pack.release.visibility === "HIDDEN" && !pack.release.pilotEnabled && !pack.release.runtimeEnabled && !pack.release.retentionEnabled,
    };
  });
  const crossWaveDuplicates = validateCrossPackDuplicates(combinedWaveABGradePacks).map((entry) => `${entry.entityId}:${entry.code}`);
  const canonicalFingerprints = combinedWaveABGradePacks.flatMap((pack) => pack.questions.map((question) => normalizedDefinition(`${question.prompt}|${question.options?.join("|") ?? ""}`).toLocaleLowerCase("vi")));
  const simulations = combinedWaveABGradePacks.map((pack) => simulateCombinedWaveABCandidate(
    pack,
    waveBProgressionContracts.find((contract) => contract.grade === pack.grade)!,
  ));
  const waveBBundle = buildDeterministicBundle(waveBGradePacks);
  const combinedBundle = buildDeterministicBundle(combinedWaveABGradePacks);
  const errors = [
    ...rows.flatMap((row) => [...row.independent.errors, ...row.sourceErrors, ...row.validationErrors]),
    ...crossWaveDuplicates,
    ...(rows.every((row) => row.hidden) ? [] : ["CANDIDATE_RELEASE_NOT_HIDDEN"]),
  ];
  return {
    schemaVersion: "plave-grades-1-9-wave-b-audit-v1",
    rows,
    totals: {
      candidates: rows.length,
      questions: rows.reduce((sum, row) => sum + row.independent.questions, 0),
      independentlyVerified: rows.reduce((sum, row) => sum + row.independent.independentlyVerified, 0),
      uniqueCanonicalPublicForms: new Set(canonicalFingerprints).size,
      errors: errors.length,
    },
    crossWaveDuplicates,
    simulations,
    waveBBundle,
    combinedBundle,
    coverageTruth: "Wave B is one bounded slice per grade; no grade or curriculum is claimed complete.",
    errors,
  } as const;
}
