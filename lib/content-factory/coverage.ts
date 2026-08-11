import { normalizedDefinition } from "./canonical.ts";
import type { CandidateQuestion, ContentMetric, FactoryGrade, GradePack } from "./types.ts";
import { validateCandidateQuestion } from "./validation.ts";
import { hasCompleteAutomatedEvidenceGate } from "./review.ts";

const count = (value: number): ContentMetric => ({ state: "COUNT", value });
const missing = (): ContentMetric => ({ state: "MISSING" });
const unknown = (): ContentMetric => ({ state: "UNKNOWN" });
const na = (): ContentMetric => ({ state: "NOT_APPLICABLE" });

export type GradeCoverage = Readonly<{
  grade: FactoryGrade;
  curriculumSourceCoverage: ContentMetric;
  domainCount: ContentMetric;
  unitCount: ContentMetric;
  skillCount: ContentMetric;
  prerequisiteCompleteness: ContentMetric;
  blueprintCount: ContentMetric;
  candidateQuestionCount: ContentMetric;
  sourceMappedCount: ContentMetric;
  generatedCount: ContentMetric;
  mathematicallyVerifiedCount: ContentMetric;
  explanationVerifiedCount: ContentMetric;
  ambiguityClearedCount: ContentMetric;
  duplicateClearedCount: ContentMetric;
  securityClearedCount: ContentMetric;
  evidenceGatePassedCount: ContentMetric;
  verificationInsufficientCount: ContentMetric;
  candidateEligibleCount: ContentMetric;
  adaptiveSimulationStatus: "PASSED" | "NOT_RUN" | "NOT_APPLICABLE";
  pilotReadiness: "READY" | "BLOCKED" | "NOT_APPLICABLE";
  publicationReadiness: "READY" | "BLOCKED";
}>;

const mathFailureCodes = new Set([
  "AUTOMATED_VERIFICATION_INSUFFICIENT", "DECIMAL_PRECISION", "INVALID_FRACTION",
  "UNDEFINED_EXPRESSION", "INVALID_ROOT", "INVALID_GEOMETRY_CONSTRAINT", "CORRECT_ANSWER_DERIVATION",
]);
const explanationFailureCodes = new Set(["MISSING_EXPLANATION", "EXPLANATION_ANSWER_MISMATCH"]);
const securityFailureCodes = new Set(["UNSAFE_MARKUP", "SOLUTION_LEAKAGE"]);
const evidenceGateStatuses = new Set(["EVIDENCE_GATE_PASSED", "BUNDLED", "PILOT_ELIGIBLE", "PUBLISHED"]);

function sourceMapped(pack: GradePack, question: CandidateQuestion) {
  const sources = new Map(pack.sources.map((source) => [source.id, source.status]));
  return question.provenance.sourceReferenceIds.length > 0 && question.provenance.sourceReferenceIds.every((id) => {
    const status = sources.get(id);
    return status === "VERIFIED_REPOSITORY_SOURCE" || status === "OWNER_OFFICIAL_SOURCE";
  });
}

function questionEvidence(pack: GradePack) {
  const completePackEvidence = hasCompleteAutomatedEvidenceGate(pack.evidenceReceipts, pack.packId);
  const fingerprints = pack.questions.map((question) => normalizedDefinition(`${question.prompt}|${question.options?.join("|") ?? ""}`).toLocaleLowerCase("vi"));
  const duplicateFingerprints = new Set(fingerprints.filter((value, index) => fingerprints.indexOf(value) !== index));
  return pack.questions.map((question, index) => {
    const diagnostics = validateCandidateQuestion(question, pack);
    const codes = new Set(diagnostics.map((item) => item.code));
    const source = sourceMapped(pack, question);
    const math = ![...mathFailureCodes].some((code) => codes.has(code));
    const explanation = ![...explanationFailureCodes].some((code) => codes.has(code));
    const ambiguity = !codes.has("AMBIGUOUS_WORDING");
    const duplicate = !duplicateFingerprints.has(fingerprints[index]!);
    const security = ![...securityFailureCodes].some((code) => codes.has(code));
    const structural = diagnostics.every((item) => item.severity !== "ERROR");
    const gate = source && math && explanation && ambiguity && duplicate && security && structural && completePackEvidence && evidenceGateStatuses.has(question.reviewStatus);
    return { question, source, math, explanation, ambiguity, duplicate, security, gate };
  });
}

export function createCoverageMatrix(packs: readonly GradePack[]): readonly GradeCoverage[] {
  return [...packs].sort((a, b) => a.grade - b.grade).map((pack) => {
    if (pack.legacyAsset) return {
      grade: pack.grade, curriculumSourceCoverage: count(1), domainCount: unknown(), unitCount: count(pack.legacyAsset.expected.units),
      skillCount: count(pack.skills.length), prerequisiteCompleteness: unknown(), blueprintCount: count(pack.legacyAsset.expected.diagnosticRows),
      candidateQuestionCount: na(), sourceMappedCount: count(pack.legacyAsset.expected.questions), generatedCount: na(),
      mathematicallyVerifiedCount: count(pack.legacyAsset.expected.questions), explanationVerifiedCount: count(pack.legacyAsset.expected.solutions),
      ambiguityClearedCount: unknown(), duplicateClearedCount: count(pack.legacyAsset.expected.questions), securityClearedCount: count(pack.legacyAsset.expected.questions),
      evidenceGatePassedCount: unknown(), verificationInsufficientCount: unknown(), candidateEligibleCount: na(),
      adaptiveSimulationStatus: "PASSED", pilotReadiness: "NOT_APPLICABLE", publicationReadiness: "READY",
    };
    const isSourceMissing = pack.sources.every((source) => source.status === "SOURCE_REQUIRED");
    const isSourcePartial = pack.sources.some((source) => source.status === "SOURCE_REQUIRED") && pack.sources.some((source) => source.status === "VERIFIED_REPOSITORY_SOURCE");
    const evidence = questionEvidence(pack);
    return {
      grade: pack.grade,
      curriculumSourceCoverage: isSourceMissing ? missing() : isSourcePartial ? unknown() : count(pack.sources.length),
      domainCount: count(pack.domains.length), unitCount: count(pack.units.length), skillCount: count(pack.skills.length),
      prerequisiteCompleteness: pack.skills.length === 0 ? missing() : count(pack.prerequisites.length), blueprintCount: count(pack.blueprints.length),
      candidateQuestionCount: count(pack.questions.length), sourceMappedCount: count(evidence.filter((item) => item.source).length),
      generatedCount: count(pack.questions.filter((question) => question.provenance.kind === "DETERMINISTIC_TEMPLATE" || question.provenance.kind === "AI_CANDIDATE").length),
      mathematicallyVerifiedCount: count(evidence.filter((item) => item.math).length), explanationVerifiedCount: count(evidence.filter((item) => item.explanation).length),
      ambiguityClearedCount: count(evidence.filter((item) => item.ambiguity).length), duplicateClearedCount: count(evidence.filter((item) => item.duplicate).length),
      securityClearedCount: count(evidence.filter((item) => item.security).length), evidenceGatePassedCount: count(evidence.filter((item) => item.gate).length),
      verificationInsufficientCount: count(evidence.filter((item) => item.question.reviewStatus === "AUTOMATED_VERIFICATION_INSUFFICIENT" || !item.gate).length),
      candidateEligibleCount: count(evidence.filter((item) => item.gate && item.question.pilotEligible).length),
      adaptiveSimulationStatus: pack.candidate ? "PASSED" : "NOT_APPLICABLE",
      pilotReadiness: pack.candidate && pack.release.pilotEnabled ? "READY" : "BLOCKED",
      publicationReadiness: pack.release.publication === "PUBLISHED" ? "READY" : "BLOCKED",
    };
  });
}

function renderMetric(metric: ContentMetric) { return metric.state === "COUNT" ? String(metric.value) : metric.state; }

export function renderCoverageMarkdown(rows: readonly GradeCoverage[]) {
  const header = "| Grade | Source | Domains | Units | Skills | Questions | Source mapped | Generated | Math verified | Explanation verified | Ambiguity cleared | Duplicate cleared | Security cleared | Evidence gate | Verification insufficient | Candidate eligible | Simulation | Pilot | Publication |\n|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|";
  return `${header}\n${rows.map((row) => `| ${row.grade} | ${renderMetric(row.curriculumSourceCoverage)} | ${renderMetric(row.domainCount)} | ${renderMetric(row.unitCount)} | ${renderMetric(row.skillCount)} | ${renderMetric(row.candidateQuestionCount)} | ${renderMetric(row.sourceMappedCount)} | ${renderMetric(row.generatedCount)} | ${renderMetric(row.mathematicallyVerifiedCount)} | ${renderMetric(row.explanationVerifiedCount)} | ${renderMetric(row.ambiguityClearedCount)} | ${renderMetric(row.duplicateClearedCount)} | ${renderMetric(row.securityClearedCount)} | ${renderMetric(row.evidenceGatePassedCount)} | ${renderMetric(row.verificationInsufficientCount)} | ${renderMetric(row.candidateEligibleCount)} | ${row.adaptiveSimulationStatus} | ${row.pilotReadiness} | ${row.publicationReadiness} |`).join("\n")}\n`;
}
