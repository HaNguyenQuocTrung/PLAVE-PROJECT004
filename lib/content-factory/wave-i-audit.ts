import { buildDeterministicBundle } from "./bundle.ts";
import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { buildPrerequisiteGraph } from "./graph.ts";
import { combinedWaveABCDEFGHGradePacks } from "./wave-h-packs.ts";
import { auditWaveIInvocationBoundary } from "./wave-i-invocation.ts";
import { combinedWaveABCDEFGHIGradePacks, waveIGradeAudits, waveIPolicyCandidates } from "./wave-i-packs.ts";
import { simulateWaveIRemediation } from "./wave-i-simulation.ts";
import { assertWaveITaxonomyComplete, waveIErrorCodes } from "./wave-i-taxonomy.ts";
import { auditIndependentCandidatePack } from "./wave-a-independent-audit.ts";
import { validateCrossPackDuplicates, validateGradePack } from "./validation.ts";

export function auditWaveI() {
  assertWaveITaxonomyComplete();
  const invocationBoundary = auditWaveIInvocationBoundary();
  const rows = combinedWaveABCDEFGHIGradePacks.map((pack) => {
    const audit = waveIGradeAudits.find((entry) => entry.grade === pack.grade)!;
    const policy = waveIPolicyCandidates.find((entry) => entry.grade === pack.grade)!;
    const validationErrors = validateGradePack(pack).filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING")
      .map((entry) => `${entry.entityId}:${entry.code}`);
    const independent = auditIndependentCandidatePack(pack, { expectedQuestions: pack.questions.length });
    const simulation = simulateWaveIRemediation(pack, audit);
    const edgeClassifications = Object.fromEntries(["SOURCE_EVIDENCED", "CONTRACT_DERIVED", "HYPOTHESIS_REQUIRES_EVIDENCE"].map((classification) =>
      [classification, audit.prerequisiteEvidence.filter((edge) => edge.classification === classification).length]));
    return { grade: pack.grade, questionCount: pack.questions.length, skillCount: audit.candidateSkillIds.length,
      entrySkillCount: audit.entrySkillIds.length, intermediateSkillCount: audit.intermediateSkillIds.length,
      terminalSkillCount: audit.terminalSkillIds.length, isolatedSkillCount: audit.isolatedSkillIds.length,
      edgeCount: audit.prerequisiteEvidence.length, edgeClassifications, missingRemediationBefore: audit.missingRemediationBefore.length,
      missingRemediationAfter: audit.missingRemediationAfter.length, missingAdvanceBefore: audit.missingAdvanceBefore.length,
      missingAdvanceAfter: audit.missingAdvanceAfter.length, broadErrorMappingsBefore: audit.broadErrorMappingsBefore,
      broadErrorMappingsAfter: audit.broadErrorMappingsAfter, bridgeQuestionCount: audit.bridgeQuestionIds.length,
      auditHash: audit.auditHash, policyCandidate: policy.candidate, combinedCandidate: pack.candidate, release: pack.release,
      validationErrors, independentAuditErrors: independent.errors, simulation };
  });
  const graph = buildPrerequisiteGraph(combinedWaveABCDEFGHIGradePacks);
  const graphErrors = graph.diagnostics.filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING")
    .map((entry) => `${entry.entityId}:${entry.code}`);
  const duplicateErrors = validateCrossPackDuplicates(combinedWaveABCDEFGHIGradePacks).map((entry) => `${entry.entityId}:${entry.code}`);
  const frozen = { combinedAHBundleHash: buildDeterministicBundle(combinedWaveABCDEFGHGradePacks).bundleHash };
  const frozenErrors = frozen.combinedAHBundleHash === "5e39cddd1c352409c02214902dac90bf95444c2ae0c80ffdb7b9d7090297cf2e" ? [] : ["FROZEN_COMBINED_A_H_DRIFT"];
  const policyBundleHash = sha256(canonicalize({ format: "plave-wave-i-policy-bundle-v1", candidates: waveIPolicyCandidates }));
  const combinedBundle = buildDeterministicBundle(combinedWaveABCDEFGHIGradePacks);
  const publicForms = combinedWaveABCDEFGHIGradePacks.flatMap((pack) => pack.questions.map((question) => normalizedDefinition(`${question.prompt}|${question.options?.join("|") ?? ""}`).toLocaleLowerCase("vi")));
  const boundaryErrors = invocationBoundary.status === "PASS" && invocationBoundary.waveGNetworkAttemptCount === 0
    && invocationBoundary.waveHNetworkAttemptCount === 0 && invocationBoundary.waveINetworkAttemptCount === 0 ? [] : ["OFFLINE_INVOCATION_BOUNDARY_FAILED"];
  const releaseErrors = [...waveIPolicyCandidates, ...combinedWaveABCDEFGHIGradePacks].some((entry) => entry.release.publication !== "DRAFT"
    || entry.release.visibility !== "HIDDEN" || entry.release.pilotEnabled || entry.release.runtimeEnabled || entry.release.retentionEnabled) ? ["WAVE_I_RELEASE_ISOLATION_FAILED"] : [];
  const errors = [...rows.flatMap((row) => [...row.validationErrors, ...row.independentAuditErrors]), ...graphErrors, ...duplicateErrors,
    ...frozenErrors, ...boundaryErrors, ...releaseErrors];
  return { schemaVersion: "plave-grades-1-9-wave-i-audit-v1", rows,
    totals: { grades: rows.length, questions: rows.reduce((sum, row) => sum + row.questionCount, 0),
      skills: rows.reduce((sum, row) => sum + row.skillCount, 0), edges: rows.reduce((sum, row) => sum + row.edgeCount, 0),
      sourceEvidencedEdges: rows.reduce((sum, row) => sum + Number(row.edgeClassifications.SOURCE_EVIDENCED), 0),
      contractDerivedEdges: rows.reduce((sum, row) => sum + Number(row.edgeClassifications.CONTRACT_DERIVED), 0),
      hypothesisEdges: rows.reduce((sum, row) => sum + Number(row.edgeClassifications.HYPOTHESIS_REQUIRES_EVIDENCE), 0),
      missingRemediationBefore: rows.reduce((sum, row) => sum + row.missingRemediationBefore, 0), missingRemediationAfter: 0,
      missingAdvanceBefore: rows.reduce((sum, row) => sum + row.missingAdvanceBefore, 0), missingAdvanceAfter: 0,
      broadErrorMappingsBefore: rows.reduce((sum, row) => sum + row.broadErrorMappingsBefore, 0), broadErrorMappingsAfter: 0,
      bridgeQuestions: rows.reduce((sum, row) => sum + row.bridgeQuestionCount, 0), taxonomyCodes: waveIErrorCodes.length,
      simulationStates: rows.reduce((sum, row) => sum + row.simulation.visitedStates, 0),
      simulationTransitions: rows.reduce((sum, row) => sum + row.simulation.visitedTransitions, 0),
      uniqueCanonicalPublicForms: new Set(publicForms).size, errors: errors.length },
    graph: { nodes: graph.nodes.length, edges: graph.edges.length, cycles: graphErrors.filter((entry) => entry.endsWith(":PREREQUISITE_CYCLE")).length,
      missingReferences: graphErrors.filter((entry) => entry.endsWith(":MISSING_PREREQUISITE_REFERENCE")).length,
      forwardGradeDependencies: graphErrors.filter((entry) => entry.endsWith(":FORWARD_GRADE_REFERENCE")).length },
    taxonomy: { version: "plave-wave-i-error-taxonomy-v1", codes: waveIErrorCodes }, duplicateErrors, frozen,
    invocationBoundary, policyBundleHash, combinedBundle, errors,
    coverageTruth: "Wave I maps only question-bearing A–H candidate skills; unproduced source skills remain outside graph completeness claims." } as const;
}
