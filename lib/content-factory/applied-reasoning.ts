import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import type { CandidateQuestion, GradePack, MathExpression } from "./types.ts";

export type AppliedReasoningFixture = Readonly<{
  publicDataComplete: boolean;
  necessaryDataCount: number;
  publicDataCount: number;
  intermediateSteps: readonly Readonly<{ expected: string; actual: string; prerequisiteSkillId: string }>[];
  declaredAnswer: string;
  independentlyDerivedAnswer: string;
  declaredUnit: string | null;
  expectedUnit: string | null;
  domainValid: boolean;
  contextValid: boolean;
  exactlyOneAcceptedAnswer: boolean;
  explanationHiddenBeforeSubmit: boolean;
  requiresRounding: boolean;
  roundingRulePublic: boolean;
  completeStatisticalSample?: boolean;
  completeGeometryConstraints?: boolean;
  safeSyntheticContext: boolean;
}>;

export function validateAppliedReasoningFixture(fixture: AppliedReasoningFixture) {
  const errors: string[] = [];
  if (!fixture.publicDataComplete || fixture.publicDataCount < fixture.necessaryDataCount) errors.push("APPLIED_PUBLIC_DATA_INSUFFICIENT");
  fixture.intermediateSteps.forEach((step, index) => { if (step.expected !== step.actual) errors.push(`APPLIED_INTERMEDIATE_STEP_${index + 1}_INVALID:${step.prerequisiteSkillId}`); });
  if (fixture.declaredAnswer !== fixture.independentlyDerivedAnswer) errors.push("APPLIED_FINAL_ANSWER_INVALID");
  if (fixture.declaredUnit !== fixture.expectedUnit) errors.push("APPLIED_UNIT_MISMATCH");
  if (!fixture.domainValid) errors.push("APPLIED_DOMAIN_INVALID");
  if (!fixture.contextValid) errors.push("APPLIED_CONTEXT_INVALID");
  if (!fixture.exactlyOneAcceptedAnswer) errors.push("APPLIED_ANSWER_NOT_UNIQUE");
  if (!fixture.explanationHiddenBeforeSubmit) errors.push("APPLIED_SOLUTION_LEAK");
  if (fixture.requiresRounding && !fixture.roundingRulePublic) errors.push("APPLIED_ROUNDING_RULE_MISSING");
  if (fixture.completeStatisticalSample === false) errors.push("APPLIED_SAMPLE_INSUFFICIENT");
  if (fixture.completeGeometryConstraints === false) errors.push("APPLIED_GEOMETRY_CONSTRAINTS_INSUFFICIENT");
  if (!fixture.safeSyntheticContext) errors.push("APPLIED_UNSAFE_CONTEXT");
  return { status: errors.length ? "AUTOMATED_VERIFICATION_INSUFFICIENT" as const : "PASSED" as const, errors };
}

function normalizeExpression(expression: MathExpression): unknown {
  if (expression.op === "VALUE") return { op: expression.op, numerator: expression.numerator, denominator: expression.denominator };
  if (expression.op === "SQRT") return { op: expression.op, value: normalizeExpression(expression.value) };
  const operands = [normalizeExpression(expression.left), normalizeExpression(expression.right)];
  if (expression.op === "ADD" || expression.op === "MULTIPLY") operands.sort((left, right) => canonicalize(left).localeCompare(canonicalize(right)));
  return { op: expression.op, left: operands[0], right: operands[1] };
}

export function appliedReasoningSignature(question: CandidateQuestion) {
  const derivation = question.answer.derivation ? normalizeExpression(question.answer.derivation) : null;
  const comparison = question.answer.comparison ? {
    left: normalizeExpression(question.answer.comparison.left), relation: question.answer.comparison.relation,
    right: normalizeExpression(question.answer.comparison.right), exactAnswer: normalizedDefinition(question.answer.comparison.exactAnswer),
  } : null;
  const hasMathematicalContract = question.answer.derivation || question.answer.comparison || question.answer.geometry;
  if (!hasMathematicalContract) return sha256(canonicalize({ grade: question.grade, skillId: question.skillId, publicFingerprint: question.duplicateFingerprint }));
  const valueOnlyStructure = question.answer.derivation?.op === "VALUE"
    ? normalizedDefinition(question.prompt).toLocaleLowerCase("vi").replace(/-?\d+(?:[.,]\d+)?/gu, "#").replace(/\s+/gu, " ") : null;
  return sha256(canonicalize({ grade: question.grade, skillId: question.skillId, answerType: question.answer.type,
    exactAnswer: normalizedDefinition(question.answer.exactValue ?? ""), derivation, comparison,
    geometry: question.answer.geometry ?? null, valueOnlyStructure }));
}

export function auditAppliedEquivalentQuestions(packs: readonly GradePack[]) {
  const firstBySignature = new Map<string, string>();
  const duplicates: string[] = [];
  for (const question of packs.flatMap((pack) => pack.questions)) {
    const signature = appliedReasoningSignature(question);
    const first = firstBySignature.get(signature);
    if (first) duplicates.push(`${question.id}:APPLIED_EQUIVALENT_OF:${first}`);
    else firstBySignature.set(signature, question.id);
  }
  return duplicates;
}

export function simulateAppliedReasoningFailures(prerequisiteSkillId: string) {
  const base: AppliedReasoningFixture = { publicDataComplete: true, necessaryDataCount: 3, publicDataCount: 3,
    intermediateSteps: [{ expected: "12", actual: "12", prerequisiteSkillId }, { expected: "20", actual: "20", prerequisiteSkillId }],
    declaredAnswer: "20", independentlyDerivedAnswer: "20", declaredUnit: "m", expectedUnit: "m", domainValid: true,
    contextValid: true, exactlyOneAcceptedAnswer: true, explanationHiddenBeforeSubmit: true, requiresRounding: false,
    roundingRulePublic: false, completeStatisticalSample: true, completeGeometryConstraints: true, safeSyntheticContext: true };
  const intermediate = validateAppliedReasoningFixture({ ...base, intermediateSteps: [base.intermediateSteps[0]!, { ...base.intermediateSteps[1]!, actual: "19" }] });
  const invalidDerivation = validateAppliedReasoningFixture({ ...base, intermediateSteps: [{ ...base.intermediateSteps[0]!, actual: "11" }, base.intermediateSteps[1]!], declaredAnswer: "20", independentlyDerivedAnswer: "20" });
  const unitMismatch = validateAppliedReasoningFixture({ ...base, declaredUnit: "cm" });
  const insufficientData = validateAppliedReasoningFixture({ ...base, publicDataComplete: false, publicDataCount: 2 });
  return { intermediate, invalidDerivation, unitMismatch, insufficientData } as const;
}
