import { auditAppliedEquivalentQuestions } from "./applied-reasoning.ts";
import { buildDeterministicBundle } from "./bundle.ts";
import { normalizedDefinition } from "./canonical.ts";
import { buildPrerequisiteGraph } from "./graph.ts";
import { combinedWaveABCDEFGHIGradePacks, waveIGradeAudits } from "./wave-i-packs.ts";
import { auditWaveJInvocationBoundary } from "./wave-j-invocation.ts";
import { combinedWaveABCDEFGHIJGradePacks, waveJGradePacks } from "./wave-j-packs.ts";
import { buildWaveJDepthAudit, buildWaveJDifficultyEvidence, waveJGapSkillIds, waveJStructureFingerprint } from "./wave-j-depth.ts";
import { buildWaveJQuestions, verifyWaveJQuestionOracle, waveJSeeds } from "./wave-j-questions.ts";
import { simulateWaveJAdaptiveDepth } from "./wave-j-simulation.ts";
import { auditIndependentCandidatePack } from "./wave-a-independent-audit.ts";
import { validateCrossPackDuplicates, validateGradePack } from "./validation.ts";

export function auditWaveJ() {
  const invocationBoundary = auditWaveJInvocationBoundary();
  const depthRows = buildWaveJDepthAudit(combinedWaveABCDEFGHIGradePacks);
  const builtQuestions = buildWaveJQuestions(combinedWaveABCDEFGHIGradePacks);
  const oracleErrors = verifyWaveJQuestionOracle(combinedWaveABCDEFGHIGradePacks);
  const rows = waveJGradePacks.map((waveJ) => {
    const combined = combinedWaveABCDEFGHIJGradePacks.find((entry) => entry.grade === waveJ.grade)!;
    const beforeRows = depthRows.filter((entry) => entry.grade === waveJ.grade);
    const independent = auditIndependentCandidatePack(combined, { expectedQuestions: combined.questions.length });
    const validationErrors = [...validateGradePack(waveJ), ...validateGradePack(combined)]
      .filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING").map((entry) => `${entry.entityId}:${entry.code}`);
    const additions = builtQuestions.filter((entry) => entry.seed.grade === waveJ.grade);
    const difficultyEvidence = additions.map((entry) => buildWaveJDifficultyEvidence(entry.seed, entry.question));
    const simulation = simulateWaveJAdaptiveDepth(combined, beforeRows, waveIGradeAudits.find((entry) => entry.grade === waveJ.grade)!,
      (question) => waveJStructureFingerprint(question.prompt));
    return { grade: waveJ.grade, beforeQuestions: combinedWaveABCDEFGHIGradePacks.find((entry) => entry.grade === waveJ.grade)!.questions.length,
      addedQuestions: waveJ.questions.length, afterQuestions: combined.questions.length,
      skills: beforeRows.length, gapSkillsBefore: beforeRows.filter((entry) => entry.classificationBefore !== "DEPTH_SUFFICIENT").length,
      gapSkillsAfter: beforeRows.filter((entry) => entry.classificationAfter !== "DEPTH_SUFFICIENT").length,
      gapClassificationsBefore: Object.fromEntries([...new Set(beforeRows.map((entry) => entry.classificationBefore))].sort()
        .map((classification) => [classification, beforeRows.filter((entry) => entry.classificationBefore === classification).length])),
      gapClassificationsAfter: Object.fromEntries([...new Set(beforeRows.map((entry) => entry.classificationAfter))].sort()
        .map((classification) => [classification, beforeRows.filter((entry) => entry.classificationAfter === classification).length])),
      targetedSkillIds: beforeRows.filter((entry) => entry.addedQuestions > 0).map((entry) => entry.skillId),
      sourcePages: waveJ.grade === 4 ? [36] : waveJ.grade === 5 ? [41, 42] : waveJ.grade === 6 ? [47, 48] : waveJ.grade === 7 ? [57] : [],
      structureTags: additions.map((entry) => entry.seed.structureTag),
      difficultyEvidence, candidate: waveJ.candidate, combinedCandidate: combined.candidate, release: waveJ.release,
      independentErrors: independent.errors, validationErrors, simulation };
  });
  const graph = buildPrerequisiteGraph(combinedWaveABCDEFGHIJGradePacks);
  const graphErrors = graph.diagnostics.filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING")
    .map((entry) => `${entry.entityId}:${entry.code}`);
  const duplicateErrors = validateCrossPackDuplicates(combinedWaveABCDEFGHIJGradePacks).map((entry) => `${entry.entityId}:${entry.code}`);
  const appliedEquivalentErrors = auditAppliedEquivalentQuestions(waveJGradePacks);
  const structuralForms = builtQuestions.map((entry) => `${entry.seed.skillId}|${entry.seed.structureTag}`);
  const structuralErrors = structuralForms.length === new Set(structuralForms).size ? [] : ["WAVE_J_STRUCTURE_TAG_COLLISION"];
  const publicForms = combinedWaveABCDEFGHIJGradePacks.flatMap((pack) => pack.questions.map((question) =>
    normalizedDefinition(`${question.prompt}|${question.options?.join("|") ?? ""}`).toLocaleLowerCase("vi")));
  const frozen = { combinedAIBundleHash: buildDeterministicBundle(combinedWaveABCDEFGHIGradePacks).bundleHash };
  const frozenErrors = frozen.combinedAIBundleHash === "12b4acc67db62701dc50b210e11d8db09fabe176647e325849e33620f109cb7c"
    ? [] : ["FROZEN_COMBINED_A_I_DRIFT"];
  const waveJBundle = buildDeterministicBundle(waveJGradePacks);
  const combinedBundle = buildDeterministicBundle(combinedWaveABCDEFGHIJGradePacks);
  const boundaryErrors = invocationBoundary.status === "PASS" && invocationBoundary.waveJNetworkAttemptCount === 0 ? [] : ["OFFLINE_INVOCATION_BOUNDARY_FAILED"];
  const difficultyErrors = rows.flatMap((row) => row.difficultyEvidence.filter((entry) => !entry.machineVerified).map((entry) => `${entry.questionId}:UNJUSTIFIED_DIFFICULTY_LABEL`));
  const gapErrors = rows.flatMap((row) => row.gapSkillsAfter ? [`G${row.grade}:DEPTH_GAP_REMAINS`] : []);
  const releaseErrors = rows.some((row) => row.release.publication !== "DRAFT" || row.release.visibility !== "HIDDEN"
    || row.release.pilotEnabled || row.release.runtimeEnabled || row.release.retentionEnabled) ? ["WAVE_J_RELEASE_NOT_HIDDEN"] : [];
  const errors = [...rows.flatMap((row) => [...row.independentErrors, ...row.validationErrors,
    ...Object.entries(row.simulation.checks).filter(([, passed]) => !passed).map(([check]) => `G${row.grade}:${check}`)]),
    ...oracleErrors, ...duplicateErrors, ...appliedEquivalentErrors, ...structuralErrors, ...graphErrors, ...frozenErrors,
    ...boundaryErrors, ...difficultyErrors, ...gapErrors, ...releaseErrors];
  return { schemaVersion: "plave-grades-1-9-wave-j-audit-v1", rows, depthRows,
    totals: { grades: rows.length, skills: depthRows.length, gapSkillsBefore: rows.reduce((sum, row) => sum + row.gapSkillsBefore, 0),
      gapSkillsAfter: rows.reduce((sum, row) => sum + row.gapSkillsAfter, 0), addedQuestions: waveJSeeds.length,
      generated: waveJSeeds.length, passed: waveJSeeds.length - oracleErrors.length, rejected: 0, repaired: 0,
      quarantined: 0, duplicate: duplicateErrors.length + appliedEquivalentErrors.length,
      uniqueCanonicalPublicForms: new Set(publicForms).size, difficultyEvidence: rows.reduce((sum, row) => sum + row.difficultyEvidence.length, 0),
      simulationStates: rows.reduce((sum, row) => sum + row.simulation.visitedStates, 0),
      simulationTransitions: rows.reduce((sum, row) => sum + row.simulation.visitedTransitions, 0), errors: errors.length },
    gapSkillIds: waveJGapSkillIds, graph: { nodes: graph.nodes.length, edges: graph.edges.length,
      cycles: graphErrors.filter((entry) => entry.endsWith(":PREREQUISITE_CYCLE")).length,
      missingReferences: graphErrors.filter((entry) => entry.endsWith(":MISSING_PREREQUISITE_REFERENCE")).length,
      forwardGradeDependencies: graphErrors.filter((entry) => entry.endsWith(":FORWARD_GRADE_REFERENCE")).length },
    frozen, invocationBoundary, waveJBundle, combinedBundle, duplicateErrors, appliedEquivalentErrors, oracleErrors,
    coverageTruth: "Wave J closes only source-backed structural gaps proven inside question-bearing A–H skills; it does not claim curriculum completeness or pedagogical superiority.", errors } as const;
}
