import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  DENOMINATOR_ONE_FRACTION_OUTCOME_EXCEPTIONS,
  denominatorOneFractionExceptionReason,
  evaluatePublicQuestion,
  parseExactNumeric,
  type OracleAnswer,
  type OracleCandidate,
  type OracleDiagnosticCode,
} from "../lib/generation-v2-oracle/index.ts";
import {
  GENERATOR_V2_OUTCOME_REGISTRY,
  generateQuestion,
  publicQuestionOnly,
  type GeneratedProductQuestion,
  type ProductDifficulty,
} from "../lib/generation-v2/index.ts";

const root = process.cwd();
if (!root.endsWith("/PLAVE-PROJECT004")) throw new Error("PROJECT004_ROOT_REQUIRED");
const output = resolve(root, "artifacts/remediation");
mkdirSync(output, { recursive: true });

function question(outcomeId: string, grade: number, seed: string, difficulty: ProductDifficulty = "MEDIUM") {
  return generateQuestion({ outcomeId, grade, difficulty, seed, locale: "vi-VN" });
}

function candidate(generated: GeneratedProductQuestion) {
  return structuredClone(publicQuestionOnly(generated)) as unknown as OracleCandidate;
}

type FalsificationRecord = Readonly<{
  id: string;
  category: "INTERACTION" | "NUMERIC" | "SOLUTION_SET";
  expected: "ACCEPT" | "REJECT";
  expectedDiagnostic?: OracleDiagnosticCode;
  accepted: boolean;
  diagnostics: readonly OracleDiagnosticCode[];
  result: "EXPECTED_ACCEPTED" | "EXPECTED_REJECTED" | "UNEXPECTED_SURVIVOR" | "UNEXPECTED_REJECTION";
}>;

function classify(
  id: string,
  category: FalsificationRecord["category"],
  expected: FalsificationRecord["expected"],
  accepted: boolean,
  diagnostics: readonly OracleDiagnosticCode[],
  expectedDiagnostic?: OracleDiagnosticCode,
): FalsificationRecord {
  const expectedBehavior = expected === "ACCEPT"
    ? accepted
    : !accepted && (expectedDiagnostic === undefined || diagnostics.includes(expectedDiagnostic));
  return {
    id,
    category,
    expected,
    ...(expectedDiagnostic ? { expectedDiagnostic } : {}),
    accepted,
    diagnostics,
    result: expectedBehavior
      ? expected === "ACCEPT" ? "EXPECTED_ACCEPTED" : "EXPECTED_REJECTED"
      : expected === "ACCEPT" ? "UNEXPECTED_REJECTION" : "UNEXPECTED_SURVIVOR",
  };
}

function evaluated(
  id: string,
  category: FalsificationRecord["category"],
  expected: FalsificationRecord["expected"],
  value: OracleCandidate,
  expectedDiagnostic?: OracleDiagnosticCode,
) {
  const result = evaluatePublicQuestion(value);
  return classify(id, category, expected, result.ok, result.diagnostics, expectedDiagnostic);
}

const grade7 = candidate(question(
  "MOET2018-G7-NAA-P057-030",
  7,
  "sprint10d3-grade7-integer-interaction",
));
if (grade7.interaction.type !== "INTEGER_INPUT") throw new Error("GRADE7_INTEGER_BASELINE_DRIFT");
const forcedFraction = structuredClone(grade7) as OracleCandidate & { interaction: { type: string; inputMode?: string } };
forcedFraction.interaction.type = "FRACTION_INPUT";
forcedFraction.interaction.inputMode = "text";

const nonIntegerFraction = candidate(question(
  "MOET2018-G4-NUM-P036-018",
  4,
  "sprint10d3-noninteger-fraction",
));
const forcedInteger = structuredClone(nonIntegerFraction) as OracleCandidate & { interaction: { type: string; inputMode?: string } };
forcedInteger.interaction.type = "INTEGER_INPUT";
forcedInteger.interaction.inputMode = "numeric";

const expression = candidate(question(
  "MOET2018-G8-NAA-P063-007",
  8,
  "sprint10d3-expression-interaction",
));
const expressionAsNumeric = structuredClone(expression) as OracleCandidate & { interaction: { type: string; inputMode?: string } };
expressionAsNumeric.interaction.type = "INTEGER_INPUT";
expressionAsNumeric.interaction.inputMode = "numeric";

const quadratic = candidate(question(
  "MOET2018-G9-NAA-P072-011",
  9,
  "sprint10d3-quadratic-set",
));
if (quadratic.interaction.type !== "ORDERING" || (quadratic.interaction.options?.length ?? 0) !== 2) throw new Error("QUADRATIC_SET_BASELINE_DRIFT");
const rootsAsSingleInput = structuredClone(quadratic) as OracleCandidate & { interaction: { type: string; inputMode?: string } };
rootsAsSingleInput.interaction.type = "INTEGER_INPUT";
rootsAsSingleInput.interaction.inputMode = "numeric";

const decimal = candidate(question(
  "MOET2018-G6-NAA-P050-048",
  6,
  "sprint10d3-decimal-interaction",
));
if (decimal.interaction.type !== "DECIMAL_INPUT") throw new Error("DECIMAL_BASELINE_DRIFT");
const decimalAsFraction = structuredClone(decimal) as OracleCandidate & { interaction: { type: string; inputMode?: string } };
decimalAsFraction.interaction.type = "FRACTION_INPUT";
decimalAsFraction.interaction.inputMode = "text";

const choice = candidate(question(
  "MOET2018-G2-NUM-P025-018",
  2,
  "sprint10d3-equivalent-choice",
));
const choiceResult = evaluatePublicQuestion(choice);
const correctChoiceId = typeof choiceResult.answerSet[0] === "string" ? choiceResult.answerSet[0] : null;
const correctChoice = choice.interaction.options?.find((option) => option.id === correctChoiceId);
const wrongChoice = choice.interaction.options?.find((option) => option.id !== correctChoiceId);
if (!correctChoice || !wrongChoice || !/^-?\d+$/u.test(correctChoice.label)) throw new Error("NUMERIC_CHOICE_BASELINE_DRIFT");
const equivalentChoice = structuredClone(choice) as OracleCandidate & { interaction: { options: Array<{ id: string; label: string }> } };
equivalentChoice.interaction.options = equivalentChoice.interaction.options.map((option) => option.id === wrongChoice.id
  ? { ...option, label: `${correctChoice.label}.0` }
  : option);

const interactionRecords: FalsificationRecord[] = [
  evaluated("INTEGER_TO_FRACTION_INPUT", "INTERACTION", "REJECT", forcedFraction, "ORACLE_INTERACTION_ANSWER_TYPE_MISMATCH"),
  evaluated("NONINTEGER_FRACTION_TO_INTEGER_INPUT", "INTERACTION", "REJECT", forcedInteger, "ORACLE_INTERACTION_ANSWER_TYPE_MISMATCH"),
  evaluated("EXPRESSION_TO_NUMERIC_INPUT", "INTERACTION", "REJECT", expressionAsNumeric, "ORACLE_INTERACTION_ANSWER_TYPE_MISMATCH"),
  evaluated("MULTI_ROOT_SET_TO_SINGLE_NUMERIC_INPUT", "INTERACTION", "REJECT", rootsAsSingleInput, "ORACLE_INTERACTION_ANSWER_TYPE_MISMATCH"),
  evaluated("DECIMAL_REQUIRED_TO_FRACTION_INPUT", "INTERACTION", "REJECT", decimalAsFraction, "ORACLE_INTERACTION_ANSWER_TYPE_MISMATCH"),
  evaluated("CHOICE_WITH_EQUIVALENT_CORRECT_OPTION", "INTERACTION", "REJECT", equivalentChoice, "ORACLE_DISTRACTOR_EQUIVALENT_TO_ANSWER"),
];

const numericInputs = [
  { id: "INTEGER", value: "5", allowFraction: true, allowScientific: false, expected: "5/1" },
  { id: "INTEGER_DOT_ZERO", value: "5.0", allowFraction: true, allowScientific: false, expected: "5/1" },
  { id: "INTEGER_TWO_ZEROS", value: "5.00", allowFraction: true, allowScientific: false, expected: "5/1" },
  { id: "INTEGER_OVER_ONE", value: "5/1", allowFraction: true, allowScientific: false, expected: "5/1" },
  { id: "EQUIVALENT_UNREDUCED_RATIONAL", value: "10/2", allowFraction: true, allowScientific: false, expected: "5/1" },
  { id: "FRACTION_SYNTAX_NOT_AUTHORIZED", value: "10/2", allowFraction: false, allowScientific: false, expected: null },
  { id: "REDUCED_RATIONAL", value: "1/2", allowFraction: true, allowScientific: false, expected: "1/2" },
  { id: "UNREDUCED_RATIONAL", value: "2/4", allowFraction: true, allowScientific: false, expected: "1/2" },
  { id: "NEGATIVE_INTEGER_DECIMAL", value: "-3.0", allowFraction: true, allowScientific: false, expected: "-3/1" },
  { id: "ZERO", value: "0", allowFraction: true, allowScientific: false, expected: "0/1" },
  { id: "NEGATIVE_ZERO_INTEGER", value: "-0", allowFraction: true, allowScientific: false, expected: "0/1" },
  { id: "NEGATIVE_ZERO", value: "-0.0", allowFraction: true, allowScientific: false, expected: "0/1" },
  { id: "WHITESPACE", value: "  5.00  ", allowFraction: true, allowScientific: false, expected: "5/1" },
  { id: "TRAILING_GARBAGE", value: "5tail", allowFraction: true, allowScientific: false, expected: null },
  { id: "NAN", value: "NaN", allowFraction: true, allowScientific: false, expected: null },
  { id: "INFINITY", value: "Infinity", allowFraction: true, allowScientific: false, expected: null },
  { id: "ZERO_DENOMINATOR", value: "1/0", allowFraction: true, allowScientific: false, expected: null },
  { id: "SCIENTIFIC_NOT_AUTHORIZED", value: "1e3", allowFraction: true, allowScientific: false, expected: null },
  { id: "SCIENTIFIC_EXPLICITLY_AUTHORIZED", value: "1.25e2", allowFraction: false, allowScientific: true, expected: "125/1" },
] as const;

const numericRecords = numericInputs.map((item) => {
  const parsed = parseExactNumeric(item.value, {
    allowFraction: item.allowFraction,
    allowScientific: item.allowScientific,
  });
  const accepted = item.expected === null
    ? parsed !== null
    : parsed?.key === item.expected;
  const diagnostics: OracleDiagnosticCode[] = parsed === null
    ? ["ORACLE_INVALID_SOLUTION_FORMAT"]
    : [];
  return classify(
    item.id,
    "NUMERIC",
    item.expected === null ? "REJECT" : "ACCEPT",
    accepted,
    diagnostics,
    item.expected === null ? "ORACLE_INVALID_SOLUTION_FORMAT" : undefined,
  );
});

function withRootLabels(transform: (label: string, index: number) => string) {
  const value = structuredClone(quadratic) as OracleCandidate & { interaction: { options: Array<{ id: string; label: string }> } };
  value.interaction.options = value.interaction.options.map((option, index) => ({ ...option, label: transform(option.label, index) }));
  return value;
}

const rootsDotZero = withRootLabels((label) => /^-?\d+$/u.test(label) ? `${label}.0` : label);
const rootsDotZeroZero = withRootLabels((label) => /^-?\d+$/u.test(label) ? `${label}.00` : label);
const rootsOverOne = withRootLabels((label) => /^-?\d+$/u.test(label) ? `${label}/1` : label);
const rootsWhitespace = withRootLabels((label) => `  ${label}  `);
const rootsMissing = structuredClone(quadratic) as OracleCandidate & { interaction: { options: Array<{ id: string; label: string }> } };
rootsMissing.interaction.options.pop();
const rootsExtraneous = structuredClone(quadratic) as OracleCandidate & { interaction: { options: Array<{ id: string; label: string }> } };
rootsExtraneous.interaction.options.push({ id: "audit-extra", label: "999" });
const rootsDuplicate = structuredClone(quadratic) as OracleCandidate & { interaction: { options: Array<{ id: string; label: string }> } };
rootsDuplicate.interaction.options.push({ id: "audit-duplicate", label: `${rootsDuplicate.interaction.options[0]!.label}.0` });
const rootsOutside = structuredClone(quadratic) as OracleCandidate & { interaction: { options: Array<{ id: string; label: string }> } };
rootsOutside.interaction.options[0] = { ...rootsOutside.interaction.options[0]!, label: `${Number(rootsOutside.interaction.options[0]!.label) + 0.1}` };

const solutionSetRecords: FalsificationRecord[] = [
  evaluated("ROOTS_EXACT_INTEGER", "SOLUTION_SET", "ACCEPT", quadratic),
  evaluated("ROOTS_INTEGER_DOT_ZERO", "SOLUTION_SET", "ACCEPT", rootsDotZero),
  evaluated("ROOTS_INTEGER_DOT_ZERO_ZERO", "SOLUTION_SET", "ACCEPT", rootsDotZeroZero),
  evaluated("ROOTS_INTEGER_OVER_ONE", "SOLUTION_SET", "ACCEPT", rootsOverOne),
  evaluated("ROOTS_WITH_WHITESPACE", "SOLUTION_SET", "ACCEPT", rootsWhitespace),
  evaluated("ROOTS_MISSING", "SOLUTION_SET", "REJECT", rootsMissing, "ORACLE_MISSING_SOLUTION"),
  evaluated("ROOTS_EXTRANEOUS", "SOLUTION_SET", "REJECT", rootsExtraneous, "ORACLE_EXTRANEOUS_SOLUTION"),
  evaluated("ROOTS_DUPLICATE_EQUIVALENT", "SOLUTION_SET", "REJECT", rootsDuplicate, "ORACLE_DUPLICATE_SOLUTION"),
  evaluated("ROOTS_DECIMAL_OUTSIDE_EXACT_CONTRACT", "SOLUTION_SET", "REJECT", rootsOutside, "ORACLE_EXTRANEOUS_SOLUTION"),
];

function denominatorOne(answer: OracleAnswer | undefined) {
  if (typeof answer === "number") return Number.isSafeInteger(answer);
  if (typeof answer === "string") return parseExactNumeric(answer, { allowFraction: true })?.value.denominator === 1n;
  if (answer && !Array.isArray(answer) && typeof answer === "object" && "denominator" in answer) return answer.denominator === 1;
  return false;
}

const difficulties: readonly ProductDifficulty[] = ["EASY", "MEDIUM", "HARD"];
let coordinates = 0;
let denominatorOneSamples = 0;
let denominatorOneFractionInput = 0;
let invalidDenominatorOneFractionInput = 0;
const interactionDistribution = new Map<string, number>();
const exceptionDistribution = new Map<string, number>();
for (const entry of GENERATOR_V2_OUTCOME_REGISTRY) {
  for (const difficulty of difficulties) {
    for (let seed = 1; seed <= 20; seed += 1) {
      coordinates += 1;
      const generated = question(
        entry.outcomeId,
        entry.grade,
        `sprint10c-${entry.outcomeId.toLowerCase()}-${difficulty.toLowerCase()}-${String(seed).padStart(2, "0")}`,
        difficulty,
      );
      const publicCandidate = candidate(generated);
      const result = evaluatePublicQuestion(publicCandidate);
      if (!result.ok) throw new Error(`CANONICAL_ORACLE_REGRESSION:${entry.outcomeId}:${difficulty}:${seed}:${result.diagnostics.join(",")}`);
      if (!denominatorOne(result.answerSet[0])) continue;
      denominatorOneSamples += 1;
      interactionDistribution.set(publicCandidate.interaction.type, (interactionDistribution.get(publicCandidate.interaction.type) ?? 0) + 1);
      if (publicCandidate.interaction.type !== "FRACTION_INPUT") continue;
      denominatorOneFractionInput += 1;
      const reason = denominatorOneFractionExceptionReason(entry.outcomeId);
      if (!reason) invalidDenominatorOneFractionInput += 1;
      else exceptionDistribution.set(entry.outcomeId, (exceptionDistribution.get(entry.outcomeId) ?? 0) + 1);
    }
  }
}

const records = [...interactionRecords, ...numericRecords, ...solutionSetRecords];
const unexpected = records.filter((item) => item.result === "UNEXPECTED_SURVIVOR" || item.result === "UNEXPECTED_REJECTION");
const acceptedEquivalences = records.filter((item) => item.result === "EXPECTED_ACCEPTED").length;
const killed = records.filter((item) => item.result === "EXPECTED_REJECTED").length;
const result = unexpected.length === 0 && invalidDenominatorOneFractionInput === 0 ? "PASS" : "FAIL";

const write = (name: string, value: unknown) => writeFileSync(
  resolve(output, name),
  `${JSON.stringify(value, null, 2)}\n`,
  { mode: 0o600 },
);

write("sprint-10d3-exact-regressions.json", {
  schemaVersion: 1,
  status: result,
  preFixEvidence: {
    forcedIntegerFractionInteractionAccepted: true,
    exactIntegerRootDotZeroRejected: true,
    source: "SPRINT_10D2_INDEPENDENT_REAUDIT",
  },
  postFix: {
    forcedInteraction: interactionRecords[0],
    exactIntegerRoots: solutionSetRecords.slice(0, 5),
  },
  privateAnswersIncluded: false,
});
write("sprint-10d3-interaction-matrix.json", {
  schemaVersion: 1,
  status: interactionRecords.every((item) => item.result === "EXPECTED_REJECTED") ? "PASS" : "FAIL",
  records: interactionRecords,
  inventory: {
    coordinates,
    denominatorOneSamples,
    interactionDistribution: Object.fromEntries([...interactionDistribution].sort()),
    denominatorOneFractionInput,
    invalidDenominatorOneFractionInput,
    explicitExceptions: Object.entries(DENOMINATOR_ONE_FRACTION_OUTCOME_EXCEPTIONS).map(([outcomeId, reason]) => ({
      outcomeId,
      reason,
      observedSamples: exceptionDistribution.get(outcomeId) ?? 0,
    })),
  },
  privateAnswersIncluded: false,
});
write("sprint-10d3-numeric-canonicalization.json", {
  schemaVersion: 1,
  status: numericRecords.every((item) => !item.result.startsWith("UNEXPECTED")) && solutionSetRecords.every((item) => !item.result.startsWith("UNEXPECTED")) ? "PASS" : "FAIL",
  exactParserRecords: numericInputs.map((item, index) => ({ ...item, result: numericRecords[index]!.result })),
  solutionSetRecords,
  floatingPointEqualityUsed: false,
  scientificNotationDefault: "REJECT",
  privateAnswersIncluded: false,
});
write("sprint-10d3-falsification.json", {
  schemaVersion: 1,
  status: result,
  attempted: records.length,
  killed,
  validEquivalenceAccepted: acceptedEquivalences,
  unexpectedSurvivors: unexpected.length,
  records,
  totalsDerivedFromRecords: killed + acceptedEquivalences === records.length,
  privateAnswersIncluded: false,
});

console.log(`SPRINT10D3_FALSIFICATION=${result}`);
console.log(`SPRINT10D3_MUTATIONS_ATTEMPTED=${records.length}`);
console.log(`SPRINT10D3_MUTATIONS_KILLED=${killed}`);
console.log(`SPRINT10D3_VALID_EQUIVALENCE_ACCEPTED=${acceptedEquivalences}`);
console.log(`SPRINT10D3_UNEXPECTED_SURVIVORS=${unexpected.length}`);
console.log(`SPRINT10D3_DENOMINATOR_ONE=${denominatorOneSamples}`);
console.log(`SPRINT10D3_INVALID_DENOMINATOR_ONE_FRACTION=${invalidDenominatorOneFractionInput}`);
if (result !== "PASS") process.exitCode = 1;
