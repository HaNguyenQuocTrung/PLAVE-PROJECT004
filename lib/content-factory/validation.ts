import { assertNfc, assertStableId, normalizedDefinition } from "./canonical.ts";
import type { CandidateQuestion, GradePack, ValidationDiagnostic } from "./types.ts";
import { validateMathContract } from "./math.ts";
import { hasCompleteAutomatedEvidenceGate } from "./review.ts";

const AMBIGUOUS_MARKERS = ["có thể", "xấp xỉ"] as const;
const UNSAFE_CONTENT = /<\/?(?:script|iframe|object)|javascript:|\bon(?:load|error)\s*=/iu;
const LEAKAGE = /(?:correct[_ -]?answer|đáp\s*án\s*(?:đúng)?\s*[:=])/iu;

function diagnostic(code: string, severity: ValidationDiagnostic["severity"], entityId: string, message: string): ValidationDiagnostic {
  return { code, severity, entityId, message };
}

function fraction(value: string) {
  const match = /^(-?\d+)(?:\/([1-9]\d*))?$/u.exec(value.trim());
  if (!match) return null;
  const numerator = Number(match[1]);
  const denominator = Number(match[2] ?? 1);
  const gcd = (a: number, b: number): number => b === 0 ? Math.abs(a) : gcd(b, a % b);
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

export function validateCandidateQuestion(question: CandidateQuestion, pack: GradePack): readonly ValidationDiagnostic[] {
  const result: ValidationDiagnostic[] = [];
  try { assertStableId(question.id, "question id"); } catch { result.push(diagnostic("INVALID_ID", "ERROR", question.id, "Question ID is not stable ASCII kebab-case.")); }
  for (const value of [question.prompt, ...(question.options ?? [])]) {
    try { assertNfc(value); } catch { result.push(diagnostic("NON_NFC", "ERROR", question.id, "Vietnamese display text must be NFC.")); }
    if (UNSAFE_CONTENT.test(value)) result.push(diagnostic("UNSAFE_MARKUP", "ERROR", question.id, "Unsafe HTML/Markdown content detected."));
  }
  if (LEAKAGE.test(question.prompt)) result.push(diagnostic("SOLUTION_LEAKAGE", "ERROR", question.id, "Prompt appears to reveal the answer."));
  if (question.grade !== pack.grade) result.push(diagnostic("GRADE_MISMATCH", "ERROR", question.id, "Question grade differs from its pack."));
  if (!pack.skills.some((skill) => skill.id === question.skillId)) result.push(diagnostic("MISSING_SKILL", "ERROR", question.id, "Question references a missing skill."));
  if (!pack.blueprints.some((item) => item.id === question.blueprintId)) result.push(diagnostic("MISSING_BLUEPRINT", "ERROR", question.id, "Question references a missing blueprint."));
  if (question.published || question.pilotEligible) result.push(diagnostic("UNSAFE_CANDIDATE_DEFAULT", "ERROR", question.id, "Generated/candidate content must default hidden and ineligible."));
  if (question.options) {
    const normalized = question.options.map(normalizedDefinition);
    if (new Set(normalized).size !== normalized.length) result.push(diagnostic("DUPLICATE_OPTIONS", "ERROR", question.id, "Options must be distinct."));
    if (question.answer.type === "SINGLE_CHOICE") {
      const exact = normalizedDefinition(question.answer.exactValue ?? "");
      const keyedAnswer = /^[A-Z]$/u.test(exact) ? exact.charCodeAt(0) - 65 < normalized.length : false;
      if (!keyedAnswer && normalized.filter((value) => value === exact).length !== 1) result.push(diagnostic("SINGLE_CORRECT_ANSWER", "ERROR", question.id, "Single-choice question must contain exactly one correct option."));
    }
  }
  if (question.answer.type === "RATIONAL_INPUT" && !fraction(question.answer.exactValue ?? "")) result.push(diagnostic("INVALID_FRACTION", "ERROR", question.id, "Rational answer is invalid or has a zero denominator."));
  if (question.answer.type === "DECIMAL_INPUT") {
    const value = question.answer.exactValue ?? "";
    if (!/^-?\d+(?:\.\d+)?$/u.test(value) || (question.answer.decimalPlaces !== undefined && (value.split(".")[1]?.length ?? 0) > question.answer.decimalPlaces)) result.push(diagnostic("DECIMAL_PRECISION", "ERROR", question.id, "Decimal answer violates the precision contract."));
  }
  if (question.answer.type === "AUTOMATED_VERIFICATION_INSUFFICIENT") result.push(diagnostic("AUTOMATED_VERIFICATION_INSUFFICIENT", "ERROR", question.id, "This representation cannot be included until it has deterministic automated verification."));
  result.push(...validateMathContract(question.answer, question.id));
  if (AMBIGUOUS_MARKERS.some((marker) => question.prompt.toLocaleLowerCase("vi").includes(marker))) result.push(diagnostic("AMBIGUOUS_WORDING", "WARNING", question.id, "Wording contains an ambiguity marker."));
  const explanation = pack.explanations.find((item) => item.id === question.explanationId && item.questionId === question.id);
  if (!explanation) result.push(diagnostic("MISSING_EXPLANATION", "ERROR", question.id, "Explanation reference is missing."));
  else if (normalizedDefinition(explanation.finalAnswer).split(" ")[0] !== normalizedDefinition(question.answer.exactValue ?? "")) result.push(diagnostic("EXPLANATION_ANSWER_MISMATCH", "ERROR", question.id, "Explanation final answer differs from answer contract."));
  return result;
}

export function validateGradePack(pack: GradePack): readonly ValidationDiagnostic[] {
  const result: ValidationDiagnostic[] = [];
  if (pack.locale !== "vi-VN" || pack.unicodeNormalization !== "NFC") result.push(diagnostic("LOCALE_CONTRACT", "ERROR", pack.packId, "Pack must use vi-VN and NFC."));
  const ids = [...pack.sources, ...pack.domains, ...pack.units, ...pack.knowledgeNodes, ...pack.skills, ...pack.objectives, ...pack.blueprints, ...pack.questions, ...pack.explanations].map((item) => item.id);
  for (const id of ids) { try { assertStableId(id); } catch { result.push(diagnostic("INVALID_ID", "ERROR", id, "Entity ID is invalid.")); } }
  if (new Set(ids).size !== ids.length) result.push(diagnostic("DUPLICATE_ENTITY_ID", "ERROR", pack.packId, "Pack contains duplicate entity IDs."));
  const sourceIds = new Set(pack.sources.map((source) => source.id));
  for (const entity of [...pack.domains, ...pack.units, ...pack.knowledgeNodes, ...pack.skills, ...pack.objectives, ...pack.blueprints]) {
    if (entity.sourceReferenceIds.length === 0 || entity.sourceReferenceIds.some((id) => !sourceIds.has(id))) result.push(diagnostic("SOURCE_TRUTH_REQUIRED", "ERROR", entity.id, "Entity lacks valid source-truth evidence."));
  }
  for (const question of pack.questions) result.push(...validateCandidateQuestion(question, pack));
  const evidenceReceiptIds = new Set(pack.evidenceReceipts.map((receipt) => receipt.id));
  if (evidenceReceiptIds.size !== pack.evidenceReceipts.length) result.push(diagnostic("DUPLICATE_AUTOMATED_EVIDENCE_RECEIPT", "ERROR", pack.packId, "Automated evidence receipt IDs must be unique."));
  for (const explanation of pack.explanations) {
    if (explanation.evidenceReceiptIds.some((id) => !evidenceReceiptIds.has(id))) result.push(diagnostic("MISSING_AUTOMATED_EVIDENCE_RECEIPT", "ERROR", explanation.id, "Explanation references an unknown automated evidence receipt."));
  }
  const gatedStatuses = new Set(["EVIDENCE_GATE_PASSED", "BUNDLED", "PILOT_ELIGIBLE", "PUBLISHED"]);
  if (pack.questions.some((question) => gatedStatuses.has(question.reviewStatus)) && !hasCompleteAutomatedEvidenceGate(pack.evidenceReceipts, pack.packId)) {
    result.push(diagnostic("AUTOMATED_EVIDENCE_GATE_INCOMPLETE", "ERROR", pack.packId, "Bundled or eligible questions require every automated evidence check to pass for the pack."));
  }
  const fingerprints = new Map<string, string>();
  for (const question of pack.questions) {
    const fingerprint = normalizedDefinition(`${question.prompt}|${question.options?.join("|") ?? ""}`).toLocaleLowerCase("vi");
    const previous = fingerprints.get(fingerprint);
    if (previous) result.push(diagnostic("DUPLICATE_QUESTION", "ERROR", question.id, `Duplicate of ${previous}.`)); else fingerprints.set(fingerprint, question.id);
  }
  if (pack.immutableReference && pack.legacyAsset) {
    result.push({ code: "LEGACY_METADATA_GAP", severity: "INFO", entityId: pack.packId, classification: "MISSING_LEGACY_METADATA", message: "Per-question automated evidence receipts are absent from the legacy representation; source SQL remains authoritative." });
    result.push({ code: "LEGACY_REPRESENTATION", severity: "INFO", entityId: pack.packId, classification: "UNSUPPORTED_LEGACY_REPRESENTATION", message: "Legacy SQL content is referenced and digested, never silently rewritten." });
  }
  return result;
}

export function validateCrossPackDuplicates(packs: readonly GradePack[]) {
  const result: ValidationDiagnostic[] = [];
  const seen = new Map<string, string>();
  for (const pack of packs) for (const question of pack.questions.filter((item) => !item.fixtureOnly)) {
    const value = normalizedDefinition(question.prompt).toLocaleLowerCase("vi");
    const previous = seen.get(value);
    if (previous) result.push(diagnostic("CROSS_GRADE_DUPLICATE", "ERROR", question.id, `Duplicates ${previous}.`)); else seen.set(value, question.id);
  }
  return result;
}
