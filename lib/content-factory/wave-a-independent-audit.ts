import { createGradeTwoReleaseArtifacts } from "../content-engine/grade2-numbers-to-1000-release.ts";
import { normalizedDefinition, sha256 } from "./canonical.ts";
import type { CandidateQuestion, GradePack, MathExpression } from "./types.ts";

type Fraction = Readonly<{ numerator: bigint; denominator: bigint }>;
export type WaveAAuditRow = Readonly<{
  grade: number;
  candidateId: string;
  questions: number;
  independentlyVerified: number;
  uniqueFingerprints: number;
  uniqueAnswers: number;
  promptStructures: number;
  skillCount: number;
  difficulty: Readonly<Record<string, number>>;
  instructionalPurpose: Readonly<Record<string, number>>;
  optionPatternCount: number;
  errors: readonly string[];
}>;

const gcd = (left: bigint, right: bigint): bigint => right === 0n ? (left < 0n ? -left : left) : gcd(right, left % right);
function fraction(numerator: bigint, denominator: bigint): Fraction {
  if (denominator === 0n) throw new Error("DIVISION_BY_ZERO");
  const sign = denominator < 0n ? -1n : 1n;
  const divisor = gcd(numerator, denominator);
  return { numerator: sign * numerator / divisor, denominator: sign * denominator / divisor };
}

// This evaluator intentionally shares no code with the generator's number-based evaluator.
function independentlyEvaluate(expression: MathExpression): Fraction {
  if (expression.op === "VALUE") return fraction(BigInt(expression.numerator), BigInt(expression.denominator));
  if (expression.op === "SQRT") {
    const operand = independentlyEvaluate(expression.value);
    if (operand.numerator < 0n) throw new Error("INVALID_ROOT");
    const numerator = BigInt(Math.sqrt(Number(operand.numerator)));
    const denominator = BigInt(Math.sqrt(Number(operand.denominator)));
    if (numerator * numerator !== operand.numerator || denominator * denominator !== operand.denominator) throw new Error("IRRATIONAL_ROOT");
    return fraction(numerator, denominator);
  }
  const left = independentlyEvaluate(expression.left);
  const right = independentlyEvaluate(expression.right);
  if (expression.op === "ADD") return fraction(left.numerator * right.denominator + right.numerator * left.denominator, left.denominator * right.denominator);
  if (expression.op === "SUBTRACT") return fraction(left.numerator * right.denominator - right.numerator * left.denominator, left.denominator * right.denominator);
  if (expression.op === "MULTIPLY") return fraction(left.numerator * right.numerator, left.denominator * right.denominator);
  return fraction(left.numerator * right.denominator, left.denominator * right.numerator);
}

function parseDeclared(value: string): Fraction | null {
  const match = /^(-?\d+)(?:\.(\d+))?(?:\/([1-9]\d*))?$/u.exec(value.trim());
  if (!match) return null;
  if (match[3]) return fraction(BigInt(match[1]!), BigInt(match[3]));
  const decimals = match[2] ?? "";
  return fraction(BigInt(`${match[1]}${decimals}`), 10n ** BigInt(decimals.length));
}

function compare(left: Fraction, right: Fraction) {
  const difference = left.numerator * right.denominator - right.numerator * left.denominator;
  return difference < 0n ? "<" : difference > 0n ? ">" : "=";
}

function normalizeStructure(prompt: string) {
  return normalizedDefinition(prompt)
    .toLocaleLowerCase("vi")
    .replace(/-?\d+(?:[.,]\d+)?/gu, "#")
    .replace(/\s+/gu, " ");
}

function independentQuestionErrors(question: CandidateQuestion, pack: GradePack) {
  const errors: string[] = [];
  const exact = question.answer.exactValue ?? "";
  const explanation = pack.explanations.find((entry) => entry.id === question.explanationId && entry.questionId === question.id);
  const blueprint = pack.blueprints.find((entry) => entry.id === question.blueprintId);
  if (!explanation || normalizedDefinition(explanation.finalAnswer).split(" ")[0] !== normalizedDefinition(exact)) errors.push("EXPLANATION_CONCLUSION");
  if (!blueprint || blueprint.grade !== question.grade || blueprint.skillId !== question.skillId || blueprint.difficulty !== question.difficulty || blueprint.questionType !== question.answer.type) errors.push("BLUEPRINT_BINDING");
  if (!pack.skills.some((entry) => entry.id === question.skillId)) errors.push("SKILL_REFERENCE");
  if (question.grade !== pack.grade) errors.push("GRADE_BINDING");
  if (question.answer.derivation) {
    const calculated = independentlyEvaluate(question.answer.derivation);
    const declared = parseDeclared(exact);
    if (!declared || calculated.numerator !== declared.numerator || calculated.denominator !== declared.denominator) errors.push("ANSWER_DERIVATION");
  }
  if (question.answer.comparison) {
    const relation = compare(independentlyEvaluate(question.answer.comparison.left), independentlyEvaluate(question.answer.comparison.right));
    if (relation !== question.answer.comparison.relation || exact !== question.answer.comparison.exactAnswer) errors.push("COMPARISON_DERIVATION");
  }
  if (question.answer.geometry?.kind === "TRIANGLE_SIDES") {
    const sides = [...question.answer.geometry.sides].sort((left, right) => left - right);
    if (sides.some((side) => !Number.isFinite(side) || side <= 0) || sides[0]! ** 2 + sides[1]! ** 2 !== sides[2]! ** 2) errors.push("PYTHAGOREAN_INVARIANT");
  }
  if (question.options) {
    const options = question.options.map(normalizedDefinition);
    if (new Set(options).size !== options.length) errors.push("OPTION_UNIQUENESS");
    const answer = normalizedDefinition(exact);
    const keyed = /^[A-Z]$/u.test(answer) && answer.charCodeAt(0) - 65 < options.length;
    if (!keyed && options.filter((option) => option === answer).length !== 1) errors.push("EXACTLY_ONE_CORRECT");
  }
  const expectedFingerprint = sha256(normalizedDefinition(`${question.prompt}|${question.options?.join("|") ?? ""}`).toLocaleLowerCase("vi"));
  if (question.duplicateFingerprint !== expectedFingerprint) errors.push("FINGERPRINT");
  if (/<\/?(?:script|iframe|object)|javascript:|correct[_ -]?answer|đáp\s*án\s*(?:đúng)?\s*[:=]/iu.test(`${question.prompt}\n${question.options?.join("\n") ?? ""}`)) errors.push("UNSAFE_OR_SOLUTION_LEAKAGE");
  if (question.published || question.pilotEligible || question.fixtureOnly) errors.push("CANDIDATE_ISOLATION");
  return errors;
}

const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"] as const;
function readUnderHundred(value: number, full: boolean) {
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  const result: string[] = [];
  if (tens === 0 && full && ones) result.push("lẻ");
  else if (tens === 1) result.push("mười");
  else if (tens > 1) result.push(digits[tens]!, "mươi");
  if (ones) result.push(ones === 1 && tens > 1 ? "mốt" : ones === 4 && tens > 1 ? "tư" : ones === 5 && tens > 0 ? "lăm" : digits[ones]!);
  return result.join(" ");
}
function readVietnameseNumber(value: number) {
  if (value === 1000) return "một nghìn";
  if (value < 100) return readUnderHundred(value, false);
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  return `${digits[hundreds]} trăm${remainder ? ` ${readUnderHundred(remainder, true)}` : ""}`;
}

function auditFrozenGradeTwo(pack: GradePack) {
  const artifacts = createGradeTwoReleaseArtifacts("g2-review-number-language");
  const publicById = new Map(artifacts.publicQuestions.map((entry) => [entry.questionId.toLowerCase().replaceAll("_", "-"), entry]));
  const solutionById = new Map(artifacts.serverSolutions.map((entry) => [entry.questionId.toLowerCase().replaceAll("_", "-"), entry]));
  const auditById = new Map(artifacts.privateAudit.map((entry) => [entry.questionId.toLowerCase().replaceAll("_", "-"), entry]));
  const errors: string[] = [];
  for (const question of pack.questions) {
    const client = publicById.get(question.id);
    const solution = solutionById.get(question.id);
    const audit = auditById.get(question.id);
    if (!client || !solution || !audit) { errors.push(`${question.id}:FROZEN_MAPPING`); continue; }
    const source = audit.source;
    const independentlyDerived = source.kind === "COMPOSE_NUMBER"
      ? String(source.thousands * 1000 + source.hundreds * 100 + source.tens * 10 + source.ones)
      : source.kind === "READ_NUMBER"
        ? readVietnameseNumber(source.value)
        : source.kind === "IDENTIFY_PLACE"
          ? String(Math.floor(source.value / ({ THOUSANDS: 1000, HUNDREDS: 100, TENS: 10, ONES: 1 } as const)[source.place]) % 10)
          : String(source.value + (source.direction === "NEXT" ? 1 : -1));
    const solutionValue = /^[A-D]$/u.test(solution.correctAnswer)
      ? client.options?.[solution.correctAnswer as keyof NonNullable<typeof client.options>]
      : solution.correctAnswer;
    if (independentlyDerived !== audit.expectedDisplayAnswer || independentlyDerived !== solutionValue) errors.push(`${question.id}:FROZEN_ORACLE`);
    errors.push(...independentQuestionErrors(question, pack).map((code) => `${question.id}:${code}`));
  }
  return errors;
}

function countBy(values: readonly string[]) {
  return Object.fromEntries([...new Set(values)].sort().map((value) => [value, values.filter((entry) => entry === value).length]));
}

export function auditWaveACandidates(packs: readonly GradePack[]): readonly WaveAAuditRow[] {
  return packs.filter((pack) => pack.grade >= 2 && pack.candidate).map((pack) => auditIndependentCandidatePack(pack, {
    frozenGradeTwo: pack.candidate?.candidateId === "g2-numbers-to-1000-rc1",
  }));
}

export function auditIndependentCandidatePack(
  pack: GradePack,
  options: Readonly<{ frozenGradeTwo?: boolean; expectedQuestions?: number }> = {},
): WaveAAuditRow {
    const errors = options.frozenGradeTwo
      ? auditFrozenGradeTwo(pack)
      : pack.questions.flatMap((question) => independentQuestionErrors(question, pack).map((code) => `${question.id}:${code}`));
    const structures = new Set(pack.questions.map((question) => normalizeStructure(question.prompt)));
    const purposes = pack.questions.map((question) => question.instructionalPurpose ?? "LEGACY_FROZEN_NOT_CLASSIFIED");
    if (pack.questions.length !== (options.expectedQuestions ?? 24)) errors.push(`${pack.packId}:QUESTION_COUNT`);
    if (new Set(pack.questions.map((question) => question.duplicateFingerprint)).size !== pack.questions.length) errors.push(`${pack.packId}:DUPLICATE_FINGERPRINT`);
    if (structures.size < 4) errors.push(`${pack.packId}:INSUFFICIENT_STRUCTURE_DIVERSITY`);
    if (pack.grade >= 3 && new Set(purposes).size < 5) errors.push(`${pack.packId}:INSTRUCTIONAL_PURPOSE_DIVERSITY`);
    return {
      grade: pack.grade,
      candidateId: pack.candidate!.candidateId,
      questions: pack.questions.length,
      independentlyVerified: pack.questions.length - new Set(errors.map((error) => error.split(":")[0]).filter((id) => pack.questions.some((question) => question.id === id))).size,
      uniqueFingerprints: new Set(pack.questions.map((question) => question.duplicateFingerprint)).size,
      uniqueAnswers: new Set(pack.questions.map((question) => normalizedDefinition(question.answer.exactValue ?? ""))).size,
      promptStructures: structures.size,
      skillCount: new Set(pack.questions.map((question) => question.skillId)).size,
      difficulty: countBy(pack.questions.map((question) => question.difficulty)),
      instructionalPurpose: countBy(purposes),
      optionPatternCount: new Set(pack.questions.filter((question) => question.options).map((question) => question.options!.map(normalizedDefinition).join("|"))).size,
      errors,
    };
}
