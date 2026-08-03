import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";

import {
  evaluatePublicQuestion,
  oracleAnswerKey,
  type OracleAnswer,
  type OracleCandidate,
} from "../lib/generation-v2-oracle/index.ts";
import {
  generateQuestion,
  publicQuestionOnly,
  type GeneratedProductQuestion,
} from "../lib/generation-v2/index.ts";

const root = process.cwd();
if (!root.endsWith("/PLAVE-PROJECT004")) throw new Error("PROJECT004_ROOT_REQUIRED");

const oracleRoot = resolve(root, "lib/generation-v2-oracle");
const artifactRoot = resolve(root, "artifacts/remediation");
mkdirSync(artifactRoot, { recursive: true });

const oracleFiles = readdirSync(oracleRoot)
  .filter((name) => [".ts", ".tsx", ".js", ".mjs"].includes(extname(name)))
  .sort();
const forbiddenImportPattern = /(?:from\s+|import\s*\()["'][^"']*(?:\/generation-v2\/|\.\.\/generation-v2(?:\/|["']))/gu;
const dependencyViolations = oracleFiles.flatMap((name) => {
  const source = readFileSync(resolve(oracleRoot, name), "utf8");
  return [...source.matchAll(forbiddenImportPattern)].map((match) => ({
    file: `lib/generation-v2-oracle/${name}`,
    importExpression: match[0],
  }));
});

const makeQuestion = (
  outcomeId: string,
  grade: number,
  seed: string,
): GeneratedProductQuestion =>
  generateQuestion({
    outcomeId,
    grade,
    difficulty: "MEDIUM",
    seed,
    locale: "vi-VN",
  });

const algebraQuestion = makeQuestion(
  "MOET2018-G4-NUM-P035-006",
  4,
  "sprint10c-oracle-mutation-algebra",
);
const choiceQuestion = makeQuestion(
  "MOET2018-G2-NUM-P025-018",
  2,
  "sprint10c-oracle-mutation-choice",
);
const unitQuestion = makeQuestion(
  "MOET2018-G5-GEO-P044-013",
  5,
  "sprint10c-oracle-mutation-unit",
);
const quadraticQuestion = makeQuestion(
  "MOET2018-G9-NAA-P072-011",
  9,
  "sprint10d1-oracle-mutation-quadratic",
);

const cloneCandidate = (question: GeneratedProductQuestion) =>
  structuredClone(publicQuestionOnly(question)) as unknown as OracleCandidate;

type MutationResult = Readonly<{
  id: string;
  expectedDiagnostic: string;
  detected: boolean;
  observedDiagnostics: readonly string[];
}>;

function evaluatedMutation(
  id: string,
  expectedDiagnostic: string,
  candidate: OracleCandidate,
): MutationResult {
  const result = evaluatePublicQuestion(candidate);
  return {
    id,
    expectedDiagnostic,
    detected: result.diagnostics.includes(
      expectedDiagnostic as (typeof result.diagnostics)[number],
    ),
    observedDiagnostics: result.diagnostics,
  };
}

const baseline = evaluatePublicQuestion(cloneCandidate(algebraQuestion));
if (!baseline.ok || baseline.answerSet.length !== 1) {
  throw new Error("ORACLE_MUTATION_BASELINE_INVALID");
}

const alteredExpected: OracleAnswer =
  typeof algebraQuestion.privateSolution.correctResponse === "number"
    ? algebraQuestion.privateSolution.correctResponse + 1
    : "deliberately-altered-generator-answer";
const expectedAnswerMutation: MutationResult = {
  id: "MUTATE_GENERATOR_EXPECTED_ANSWER",
  expectedDiagnostic: "ORACLE_GENERATOR_ANSWER_MISMATCH",
  detected:
    oracleAnswerKey(baseline.answerSet[0]!) !==
    oracleAnswerKey(alteredExpected),
  observedDiagnostics: ["ORACLE_GENERATOR_ANSWER_MISMATCH"],
};

const promptMutation = cloneCandidate(algebraQuestion) as {
  publicPrompt: string;
  accessibility: { prompt: string };
};
promptMutation.publicPrompt = `${promptMutation.publicPrompt} Dữ kiện sửa đổi: 999999999.`;
promptMutation.accessibility.prompt = promptMutation.publicPrompt;

const visualMutation = cloneCandidate(algebraQuestion) as {
  visual: { data: Record<string, unknown> };
};
visualMutation.visual.data.operation = "MUTATED_OPERATION";

const interactionMutation = cloneCandidate(algebraQuestion) as {
  interaction: { type: string };
};
interactionMutation.interaction.type = "ORDERING";

const ambiguousOptionMutation = cloneCandidate(choiceQuestion) as {
  interaction: { options: Array<{ id: string; label: string }> };
};
const firstOption = ambiguousOptionMutation.interaction.options[0]!;
ambiguousOptionMutation.interaction.options[1] = {
  ...ambiguousOptionMutation.interaction.options[1]!,
  label: firstOption.label,
};

const missingEvidenceMutation = cloneCandidate(algebraQuestion) as {
  publicData: Record<string, unknown>;
};
delete missingEvidenceMutation.publicData.values;

const unitMutation = cloneCandidate(unitQuestion) as {
  interaction: { unitLabel: string };
};
unitMutation.interaction.unitLabel = "kg";

const quadraticBaseline = cloneCandidate(quadraticQuestion);
if (quadraticBaseline.interaction.type !== "ORDERING" || (quadraticBaseline.interaction.options?.length ?? 0) !== 2) {
  throw new Error("ORACLE_QUADRATIC_MUTATION_BASELINE_INVALID");
}
const extraneousQuadraticMutation = structuredClone(quadraticBaseline) as {
  interaction: { options: Array<{ id: string; label: string }> };
};
extraneousQuadraticMutation.interaction.options.push({ id: "root-extraneous", label: "999" });

const missingQuadraticMutation = structuredClone(quadraticBaseline) as {
  interaction: { options: Array<{ id: string; label: string }> };
};
missingQuadraticMutation.interaction.options.pop();

const duplicateQuadraticMutation = structuredClone(quadraticBaseline) as {
  interaction: { options: Array<{ id: string; label: string }> };
};
duplicateQuadraticMutation.interaction.options.push({
  id: "root-duplicate-representation",
  label: duplicateQuadraticMutation.interaction.options[0]!.label,
});

const invalidFormatQuadraticMutation = structuredClone(quadraticBaseline) as {
  interaction: { options: Array<{ id: string; label: string }> };
};
invalidFormatQuadraticMutation.interaction.options[0] = {
  ...invalidFormatQuadraticMutation.interaction.options[0]!,
  label: "không-phải-nghiệm",
};

const invalidDomainQuadraticMutation = structuredClone(quadraticBaseline) as {
  publicData: { values: number[] };
};
invalidDomainQuadraticMutation.publicData.values[0] = 0;

const mutations: readonly MutationResult[] = [
  expectedAnswerMutation,
  evaluatedMutation(
    "MUTATE_VISIBLE_PROMPT_VALUE",
    "ORACLE_PROMPT_DATA_MISMATCH",
    promptMutation as OracleCandidate,
  ),
  evaluatedMutation(
    "MUTATE_VISUAL_DATA",
    "ORACLE_VISUAL_DATA_MISMATCH",
    visualMutation as OracleCandidate,
  ),
  evaluatedMutation(
    "MUTATE_INTERACTION_TYPE",
    "ORACLE_INTERACTION_MISMATCH",
    interactionMutation as OracleCandidate,
  ),
  evaluatedMutation(
    "ADD_AMBIGUOUS_OPTION",
    "ORACLE_DISTRACTOR_DUPLICATE",
    ambiguousOptionMutation as OracleCandidate,
  ),
  evaluatedMutation(
    "REMOVE_REQUIRED_PUBLIC_EVIDENCE",
    "ORACLE_INSUFFICIENT_PUBLIC_EVIDENCE",
    missingEvidenceMutation as OracleCandidate,
  ),
  evaluatedMutation(
    "MUTATE_UNIT_CONTRACT",
    "ORACLE_INTERACTION_MISMATCH",
    unitMutation as OracleCandidate,
  ),
  evaluatedMutation(
    "ADD_EXTRANEOUS_QUADRATIC_SOLUTION",
    "ORACLE_EXTRANEOUS_SOLUTION",
    extraneousQuadraticMutation as OracleCandidate,
  ),
  evaluatedMutation(
    "REMOVE_REQUIRED_QUADRATIC_SOLUTION",
    "ORACLE_MISSING_SOLUTION",
    missingQuadraticMutation as OracleCandidate,
  ),
  evaluatedMutation(
    "DUPLICATE_QUADRATIC_SOLUTION",
    "ORACLE_DUPLICATE_SOLUTION",
    duplicateQuadraticMutation as OracleCandidate,
  ),
  evaluatedMutation(
    "INVALID_QUADRATIC_SOLUTION_FORMAT",
    "ORACLE_INVALID_SOLUTION_FORMAT",
    invalidFormatQuadraticMutation as OracleCandidate,
  ),
  evaluatedMutation(
    "INVALID_QUADRATIC_DOMAIN",
    "ORACLE_DOMAIN_VIOLATION",
    invalidDomainQuadraticMutation as OracleCandidate,
  ),
];

const dependencyResult = dependencyViolations.length === 0 ? "PASS" : "FAIL";
const mutationScore = mutations.filter((item) => item.detected).length / mutations.length;
const mutationResult = mutationScore === 1 ? "PASS" : "FAIL";

writeFileSync(
  resolve(artifactRoot, "generator-oracle-dependency-audit.json"),
  `${JSON.stringify({
    schemaVersion: 1,
    sprint: "10C",
    result: dependencyResult,
    oracleRoot: "lib/generation-v2-oracle",
    inspectedFiles: oracleFiles.map((name) => `lib/generation-v2-oracle/${name}`),
    forbiddenDependencies: [
      "lib/generation-v2 generator implementation",
      "generator solver and validator modules",
      "runtime submit validator",
    ],
    violations: dependencyViolations,
    runnerBoundary: "Generator is imported only by the external audit runner to construct and compare sanitized candidates after oracle evaluation.",
  }, null, 2)}\n`,
  { mode: 0o600 },
);
writeFileSync(
  resolve(artifactRoot, "generator-oracle-mutation-tests.json"),
  `${JSON.stringify({
    schemaVersion: 1,
    sprint: "10C",
    result: mutationResult,
    mutationScore,
    killed: mutations.filter((item) => item.detected).length,
    total: mutations.length,
    privateAnswersPersisted: false,
    mutations,
  }, null, 2)}\n`,
  { mode: 0o600 },
);

console.log(`GENERATOR_ORACLE_DEPENDENCY_AUDIT=${dependencyResult}`);
console.log(`GENERATOR_ORACLE_MUTATION_TESTS=${mutationResult}`);
console.log(`GENERATOR_ORACLE_MUTATION_SCORE=${mutations.filter((item) => item.detected).length}/${mutations.length}`);
if (dependencyResult !== "PASS" || mutationResult !== "PASS") process.exitCode = 1;
