import { buildDeterministicBundle } from "./bundle.ts";
import { normalizedDefinition } from "./canonical.ts";
import { buildPrerequisiteGraph } from "./graph.ts";
import { createOfficialSourceMap } from "./official-source-map.ts";
import { auditIndependentCandidatePack } from "./wave-a-independent-audit.ts";
import { buildWaveIGradeAudit } from "./wave-i-remediation.ts";
import { combinedWaveABCDEFGHIJGradePacks } from "./wave-j-packs.ts";
import { buildWaveJDepthAudit } from "./wave-j-depth.ts";
import { auditWaveKInvocationBoundary } from "./wave-k-invocation.ts";
import { waveKInventory, waveKExpectedRemaining, waveKKnownExperiential } from "./wave-k-inventory.ts";
import { combinedWaveABCDEFGHIJKGradePacks, waveKGradePacks } from "./wave-k-packs.ts";
import { buildWaveKQuestions, verifyWaveKQuestionPools } from "./wave-k-questions.ts";
import { simulateWaveK } from "./wave-k-simulation.ts";
import { validateCrossPackDuplicates, validateGradePack } from "./validation.ts";
import { waveKGradeOneEvidenceCoverage } from "./wave-k-grade-one.ts";

export function auditWaveK() {
  const invocationBoundary = auditWaveKInvocationBoundary(); const questionPoolErrors = verifyWaveKQuestionPools();
  const built = buildWaveKQuestions(); const rows = waveKGradePacks.map((waveK) => {
    const combined = combinedWaveABCDEFGHIJKGradePacks.find((entry) => entry.grade === waveK.grade)!;
    const source = combinedWaveABCDEFGHIJGradePacks.find((entry) => entry.grade === waveK.grade)!;
    const inventoryRows = waveKInventory.rows.filter((entry) => entry.grade === waveK.grade);
    const sourceMapRows = waveK.grade === 1 ? [] : createOfficialSourceMap(waveK.grade);
    const uniqueSourceSkills = new Set(sourceMapRows.map((entry) => entry.skillId));
    const sourceBoundBefore = new Set(source.questions.map((question) => question.skillId).filter((skillId) => uniqueSourceSkills.has(skillId)));
    const producedSkillIds = [...new Set(waveK.questions.map((question) => question.skillId))].sort();
    const classifications = Object.fromEntries(["PRODUCIBLE_DETERMINISTIC", "ALREADY_COVERED_SEMANTICALLY",
      "AUTOMATED_VERIFICATION_INSUFFICIENT", "OPEN_ENDED_OR_EXPERIENTIAL", "VISUAL_EVIDENCE_REQUIRED", "UNKNOWN_SOURCE_MAPPING"]
      .map((classification) => [classification, inventoryRows.filter((entry) => entry.classification === classification).length]));
    const remainingProducible = inventoryRows.filter((entry) => entry.classification === "PRODUCIBLE_DETERMINISTIC"
      && !producedSkillIds.includes(entry.skillId));
    const independent = auditIndependentCandidatePack(combined, { expectedQuestions: combined.questions.length });
    const validationErrors = [...validateGradePack(waveK), ...validateGradePack(combined)]
      .filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING").map((entry) => `${entry.entityId}:${entry.code}`);
    const remediation = buildWaveIGradeAudit(combined); const simulation = simulateWaveK(combined);
    const errors = [...independent.errors, ...validationErrors,
      ...remainingProducible.map((entry) => `${entry.outcomeId}:PRODUCIBLE_GAP_REMAINS`),
      ...remediation.missingRemediationAfter.map((skillId) => `${skillId}:MISSING_REMEDIATION`),
      ...remediation.missingAdvanceAfter.map((skillId) => `${skillId}:MISSING_ADVANCE`),
      ...Object.entries(simulation.checks).filter(([key, passed]) => key === "schoolGradeMutation" || key === "entitlementGrant" ? passed !== false : !passed)
        .map(([check]) => `G${waveK.grade}:${check}`)];
    return { grade: waveK.grade, sourceMapRowsInitial: sourceMapRows.length, sourceSkillsInitial: uniqueSourceSkills.size,
      aJCoveredSkills: sourceBoundBefore.size, remainingSkillsBeforeK: waveK.grade === 1 ? 0 : waveKExpectedRemaining[waveK.grade],
      knownExperientialBeforeK: waveK.grade === 1 ? 0 : waveKKnownExperiential[waveK.grade], classifications,
      semanticallyAlreadyCovered: classifications.ALREADY_COVERED_SEMANTICALLY, newlyProducedSkills: producedSkillIds.length,
      generatedQuestions: waveK.questions.length, candidateEligibleQuestions: waveK.questions.length,
      sourceLimited: 0, verificationInsufficient: classifications.AUTOMATED_VERIFICATION_INSUFFICIENT,
      openEndedExperiential: classifications.OPEN_ENDED_OR_EXPERIENTIAL, visualRequired: classifications.VISUAL_EVIDENCE_REQUIRED,
      unknown: classifications.UNKNOWN_SOURCE_MAPPING, remainingProducible: remainingProducible.length,
      producedDomains: new Set(inventoryRows.filter((entry) => producedSkillIds.includes(entry.skillId)).map((entry) => entry.domain)).size,
      producedUnits: new Set(inventoryRows.filter((entry) => producedSkillIds.includes(entry.skillId)).flatMap((entry) => entry.unitIds)).size,
      candidate: waveK.candidate, combinedCandidate: combined.candidate, release: waveK.release,
      remediation: { skills: remediation.candidateSkillIds.length, entries: remediation.entrySkillIds.length,
        intermediates: remediation.intermediateSkillIds.length, terminals: remediation.terminalSkillIds.length,
        isolated: remediation.isolatedSkillIds.length, missingRemediation: remediation.missingRemediationAfter.length,
        missingAdvance: remediation.missingAdvanceAfter.length,
        edgeClassifications: Object.fromEntries(["SOURCE_EVIDENCED", "CONTRACT_DERIVED", "HYPOTHESIS_REQUIRES_EVIDENCE"].map((classification) =>
          [classification, remediation.prerequisiteEvidence.filter((entry) => entry.classification === classification).length])) },
      simulation, errors };
  });
  const graph = buildPrerequisiteGraph(combinedWaveABCDEFGHIJKGradePacks);
  const graphErrors = graph.diagnostics.filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING")
    .map((entry) => `${entry.entityId}:${entry.code}`);
  const duplicateErrors = validateCrossPackDuplicates(combinedWaveABCDEFGHIJKGradePacks).map((entry) => `${entry.entityId}:${entry.code}`);
  const depthRows = buildWaveJDepthAudit(combinedWaveABCDEFGHIJKGradePacks);
  const depthErrors = depthRows.filter((entry) => entry.classificationAfter !== "DEPTH_SUFFICIENT").map((entry) => `${entry.skillId}:DEPTH_INSUFFICIENT`);
  const allPublicForms = combinedWaveABCDEFGHIJKGradePacks.flatMap((pack) => pack.questions.map((question) =>
    normalizedDefinition(`${question.prompt}|${question.options?.join("|") ?? ""}`).toLocaleLowerCase("vi")));
  const frozen = { combinedAJBundleHash: buildDeterministicBundle(combinedWaveABCDEFGHIJGradePacks).bundleHash };
  const frozenErrors = frozen.combinedAJBundleHash === "22a4799ad423fd16a2b0568f64920be66dcf545dc1f62ee3d42cadbe9a814e33"
    ? [] : ["FROZEN_COMBINED_A_J_DRIFT"];
  const releaseErrors = rows.some((row) => row.release.publication !== "DRAFT" || row.release.visibility !== "HIDDEN"
    || row.release.pilotEnabled || row.release.runtimeEnabled || row.release.retentionEnabled) ? ["WAVE_K_RELEASE_NOT_HIDDEN"] : [];
  const gradeOneErrors = waveKGradeOneEvidenceCoverage.errors;
  const boundaryErrors = invocationBoundary.status === "PASS_WITH_RECORDED_INCIDENT"
    && invocationBoundary.waveKNetworkAttemptCount === 0 && invocationBoundary.bareNpxInvocations === 0
    && invocationBoundary.networkCapableNpmInvocations === 0 ? [] : ["OFFLINE_INVOCATION_BOUNDARY_FAILED"];
  const waveKBundle = buildDeterministicBundle(waveKGradePacks); const combinedBundle = buildDeterministicBundle(combinedWaveABCDEFGHIJKGradePacks);
  const errors = [...waveKInventory.errors, ...questionPoolErrors, ...rows.flatMap((row) => row.errors), ...graphErrors,
    ...duplicateErrors, ...depthErrors, ...frozenErrors, ...releaseErrors, ...gradeOneErrors, ...boundaryErrors];
  return { schemaVersion: "plave-grades-1-9-wave-k-final-curriculum-audit-v1", rows, inventory: waveKInventory,
    gradeOneEvidenceCoverage: waveKGradeOneEvidenceCoverage, depthRows,
    totals: { grades: rows.length, sourceSkills: rows.reduce((sum, row) => sum + row.sourceSkillsInitial, 0),
      auditedRemaining: waveKInventory.rows.length, reportedRemaining: Object.values(waveKExpectedRemaining).reduce((a, b) => a + b, 0),
      producibleSkills: rows.reduce((sum, row) => sum + row.newlyProducedSkills, 0), questions: built.length,
      candidateEligible: built.length, semanticallyAlreadyCovered: rows.reduce((sum, row) => sum + row.semanticallyAlreadyCovered, 0),
      verificationInsufficient: rows.reduce((sum, row) => sum + row.verificationInsufficient, 0),
      openEndedExperiential: rows.reduce((sum, row) => sum + row.openEndedExperiential, 0),
      visualRequired: rows.reduce((sum, row) => sum + row.visualRequired, 0), unknown: rows.reduce((sum, row) => sum + row.unknown, 0),
      remainingProducible: rows.reduce((sum, row) => sum + row.remainingProducible, 0),
      uniqueCanonicalPublicForms: new Set(allPublicForms).size, duplicate: duplicateErrors.length,
      simulationStates: rows.reduce((sum, row) => sum + row.simulation.visitedStates, 0),
      simulationTransitions: rows.reduce((sum, row) => sum + row.simulation.visitedTransitions, 0), errors: errors.length },
    graph: { nodes: graph.nodes.length, edges: graph.edges.length,
      cycles: graphErrors.filter((entry) => entry.endsWith(":PREREQUISITE_CYCLE")).length,
      missingReferences: graphErrors.filter((entry) => entry.endsWith(":MISSING_PREREQUISITE_REFERENCE")).length,
      forwardGradeDependencies: graphErrors.filter((entry) => entry.endsWith(":FORWARD_GRADE_REFERENCE")).length },
    frozen, invocationBoundary, waveKBundle, combinedBundle, duplicateErrors, questionPoolErrors, errors } as const;
}
