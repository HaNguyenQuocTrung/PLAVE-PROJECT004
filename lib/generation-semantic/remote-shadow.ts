import { createHash } from "node:crypto";

import type {
  Difficulty,
  Family,
  OutcomeDescriptor,
} from "./engine.ts";
import {
  buildOutcomeSemanticContract,
  generateVariantAst,
  OUTCOME_SEMANTIC_VARIANTS,
  OUTCOME_VARIANT_VERSION,
  renderVariantPrompt,
  solverForOutcomeVariant,
  solveVariantAst,
  validateOutcomeSemanticAlignment,
  type OutcomeSemanticContract,
  type Variant,
} from "./variant-engine.ts";

export const REMOTE_GENERATED_SHADOW_POLICY_VERSION =
  "PROJECT004_REMOTE_GENERATED_SHADOW_V1" as const;
export const REMOTE_GENERATED_SHADOW_SAMPLE_LIMIT = 1_638;
export const REMOTE_GENERATED_SHADOW_DURATION_LIMIT_MS = 120_000;
export const REMOTE_GENERATED_SHADOW_DIFFICULTY_POLICY =
  "HEURISTIC_DIFFICULTY_V1" as const;

export type RemoteShadowOutcome = Readonly<{
  id: string;
  grade: number;
  officialStrand: string;
  subdomain?: string;
  conciseParaphrase: string;
  mappedUnitIds: readonly string[];
  prerequisiteOutcomeIds?: readonly string[];
}>;

export type RemoteShadowFailure = Readonly<{
  outcomeId: string;
  variantId: string;
  difficulty: Difficulty | "NOT_RUN";
  failureClass: string;
}>;

export type RemoteShadowSampleReceipt = Readonly<{
  grade: number;
  outcomeId: string;
  unitId: string;
  family: string;
  variantId: Variant;
  difficulty: Difficulty;
  solverId: string;
  astHash: string;
  publicPayloadHash: string;
  privatePayloadHash: string;
  solverReceiptHash: string;
  visualHash: string;
  seedFingerprint: string;
  validationStatus: "PASS";
}>;

export type RemoteShadowVariantProbeReceipt = Readonly<{
  variantId: Variant;
  family: Family;
  solverId: string;
  astHash: string;
  validationStatus: "PASS";
}>;

export type RemoteShadowCoverageResult = Readonly<{
  ok: boolean;
  policyVersion: typeof REMOTE_GENERATED_SHADOW_POLICY_VERSION;
  sampleLimit: number;
  durationLimitMs: number;
  durationMs: number;
  grades: number;
  outcomes: number;
  variants: number;
  variantProbeCount: number;
  requested: number;
  generated: number;
  independentlySolved: number;
  familyCorrect: number;
  outcomeCorrect: number;
  difficultyCorrect: number;
  uniqueAnswerPolicyPass: number;
  publicPrivateBoundaryPass: number;
  provenanceComplete: number;
  visualContractPass: number;
  fallbackCount: number;
  privateSolutionLeaks: number;
  samples: readonly RemoteShadowSampleReceipt[];
  variantProbes: readonly RemoteShadowVariantProbeReceipt[];
  failures: readonly RemoteShadowFailure[];
  coverageHash: string;
}>;

const difficulties: readonly Difficulty[] = [
  "EASY",
  "MEDIUM",
  "HARD",
];

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

function sha256(value: unknown) {
  return createHash("sha256")
    .update(canonicalJson(value))
    .digest("hex");
}

function safeFailureClass(error: unknown) {
  const raw = error instanceof Error ? error.message.split(":")[0] : "";
  return /^[A-Z][A-Z0-9_]{2,100}$/u.test(raw)
    ? raw
    : "SHADOW_VALIDATION_FAILED";
}

function difficultyComplexity(difficulty: Difficulty) {
  return difficulty === "EASY" ? 1 : difficulty === "MEDIUM" ? 2 : 3;
}

function deterministicOptions(answer: string, seedHash: string) {
  const distractors = [`${answer}0`, `-${answer}`, `${answer}1`].filter(
    (value, index, values) =>
      value !== answer && values.indexOf(value) === index,
  );
  if (distractors.length !== 3) {
    throw new Error("SHADOW_DISTRACTOR_UNIQUENESS_FAILED");
  }
  const values = [answer, ...distractors];
  const offset = Number.parseInt(seedHash.slice(0, 2), 16) % values.length;
  return [...values.slice(offset), ...values.slice(0, offset)];
}

function visualForShadow(input: Readonly<{
  expectedVisual: string;
  ast: ReturnType<typeof generateVariantAst>;
  prompt: string;
}>) {
  if (input.expectedVisual === "NONE") return null;
  const compatible =
    (/PLACE_VALUE|NUMBER/.test(input.expectedVisual) &&
      input.ast.kind === "NUMBER_STRUCTURE") ||
    (/MEASUREMENT|UNIT|TIME_MONEY|PERIMETER|AREA|VOLUME/.test(
      input.expectedVisual,
    ) && input.ast.kind === "MEASURE") ||
    (/SHAPE|ANGLE|COORDINATE|GEOMETRIC|THEOREM|SPATIAL/.test(
      input.expectedVisual,
    ) && input.ast.kind === "GEOMETRIC_RELATION") ||
    (/TABLE|CHART|DATA/.test(input.expectedVisual) &&
      input.ast.kind === "DATA");
  if (!compatible) {
    throw new Error("SHADOW_VISUAL_AST_MISMATCH");
  }
  return {
    type: input.expectedVisual,
    factsHash: sha256(input.ast),
    accessibleDescriptionHash: sha256(input.prompt),
  };
}

function familyForVariant(variant: Variant): Family {
  if (
    /PLACE_VALUE|NUMBER_REPRESENTATION|NUMBER_COMPARISON|NUMBER_ORDERING|ADDITION_SUBTRACTION|MULTIPLICATION_DIVISION|INTEGER_OPERATIONS/u.test(
      variant,
    )
  ) {
    return "INTEGER_ARITHMETIC";
  }
  if (/FRACTION/.test(variant)) return "FRACTION";
  if (/DECIMAL/.test(variant)) return "DECIMAL";
  if (/RATIO|PERCENTAGE/.test(variant)) return "RATIO_PERCENT";
  if (variant === "DIVISIBILITY") return "DIVISIBILITY";
  if (variant === "POWER_ROOT") return "POWER_ROOT";
  if (
    /SUBSTITUTION|EXPRESSION|LIKE_TERM|ALGEBRAIC_TRANSFORMATION/.test(
      variant,
    )
  ) {
    return "EXPRESSION";
  }
  if (/MISSING_VALUE|EQUATION_SOLVING/.test(variant)) return "EQUATION";
  if (variant === "INEQUALITY_SOLVING") return "INEQUALITY";
  if (/SEQUENCE_RULE|FUNCTION_INPUT_OUTPUT|RELATION_INTERPRETATION/.test(variant)) {
    return "FUNCTION";
  }
  if (
    /DIRECT_MEASUREMENT|UNIT_CONVERSION|TIME_MONEY|PERIMETER|AREA|VOLUME/.test(
      variant,
    )
  ) {
    return "MEASUREMENT";
  }
  if (variant === "COORDINATE") return "COORDINATE";
  if (
    /SHAPE|ANGLE|GEOMETRIC|THEOREM|SPATIAL/.test(variant)
  ) {
    return "GEOMETRY";
  }
  if (/TABLE|CHART|FREQUENCY|CENTRAL|DATA/.test(variant)) {
    return "STATISTICS";
  }
  if (/PROBABILITY|SAMPLE_SPACE/.test(variant)) return "PROBABILITY";
  if (
    /CONTEXT|INFORMATION|ERROR|MODELING|EXPLANATION|REPRESENTATION/.test(
      variant,
    )
  ) {
    return "WORD_PROBLEM";
  }
  throw new Error("SHADOW_VARIANT_FAMILY_UNMAPPED");
}

function visualForVariant(variant: Variant) {
  return /PLACE_VALUE|MEASUREMENT|PERIMETER|AREA|VOLUME|SHAPE|ANGLE|COORDINATE|CHART|TABLE/.test(
    variant,
  )
    ? variant
    : "NONE";
}

function validateAllVariantImplementations() {
  const receipts: RemoteShadowVariantProbeReceipt[] = [];
  for (const variant of OUTCOME_SEMANTIC_VARIANTS) {
    const contract: OutcomeSemanticContract = {
      outcomeId: `remote-shadow-variant-${variant.toLowerCase()}`,
      expectedFamily: familyForVariant(variant),
      expectedVariant: variant,
      expectedEvidenceForm: variant.toLowerCase().replaceAll("_", "-"),
      expectedAnswerType: "SINGLE_CHOICE",
      expectedSolver: solverForOutcomeVariant(variant),
      expectedVisual: visualForVariant(variant),
      expectedDifficultyDimensions: [
        "complexity",
        "operand-or-premise-count",
        "representation-depth",
      ],
      prerequisiteBounds: ["schoolGrade=9"],
    };
    const ast = generateVariantAst(
      contract,
      `Kiểm chứng cấu trúc ${variant}`,
      9,
      "MEDIUM",
      `remote-shadow-variant-probe:${variant}`,
    );
    const solved = solveVariantAst(contract, ast);
    const alignment = validateOutcomeSemanticAlignment(contract, ast, {
      variant: solved.variant,
      solver: solved.solverId,
    });
    if (
      !alignment.ok ||
      ast.family !== contract.expectedFamily ||
      ast.variant !== variant ||
      solved.solverId !== contract.expectedSolver
    ) {
      throw new Error("SHADOW_VARIANT_IMPLEMENTATION_MISMATCH");
    }
    const prompt = renderVariantPrompt(ast);
    visualForShadow({
      expectedVisual: contract.expectedVisual,
      ast,
      prompt,
    });
    receipts.push({
      variantId: variant,
      family: contract.expectedFamily,
      solverId: solved.solverId,
      astHash: sha256(ast),
      validationStatus: "PASS",
    });
  }
  return receipts;
}

function assertPublicPrivateBoundary(publicPayload: unknown) {
  const serialized = canonicalJson(publicPayload);
  const forbiddenKeys = [
    "correctAnswer",
    "correctIndex",
    "derivedResult",
    "normalizedInputs",
    "privateSolution",
    "rawSeed",
    "solutionSteps",
  ];
  if (forbiddenKeys.some((key) => serialized.includes(`\"${key}\"`))) {
    throw new Error("SHADOW_PRIVATE_SOLUTION_LEAK");
  }
}

function assertProvenance(provenance: Record<string, string>) {
  const expectedKeys = [
    "semanticVariantId",
    "semanticVariantVersion",
    "solverVersion",
    "solverReceiptHash",
    "difficultyPolicyVersion",
    "seedFingerprint",
    "astHash",
    "visualHash",
  ];
  if (
    Object.keys(provenance).length !== 8 ||
    expectedKeys.some((key) => !provenance[key]) ||
    !/^[A-Z][A-Z0-9_]{2,79}$/u.test(provenance.semanticVariantId ?? "") ||
    !/^[a-z0-9]+(?:-[a-z0-9]+){1,7}$/u.test(
      provenance.semanticVariantVersion ?? "",
    ) ||
    !/^[A-Z][A-Z0-9_]{2,79}$/u.test(provenance.solverVersion ?? "") ||
    provenance.difficultyPolicyVersion !==
      REMOTE_GENERATED_SHADOW_DIFFICULTY_POLICY ||
    !/^[0-9a-f]{64}$/u.test(provenance.solverReceiptHash ?? "") ||
    !/^[0-9a-f]{16}$/u.test(provenance.seedFingerprint ?? "") ||
    !/^[0-9a-f]{64}$/u.test(provenance.astHash ?? "") ||
    !/^[0-9a-f]{64}$/u.test(provenance.visualHash ?? "")
  ) {
    throw new Error("SHADOW_PROVENANCE_INCOMPLETE");
  }
}

export function validateRemoteGeneratedShadowCoverage(
  outcomes: readonly RemoteShadowOutcome[],
  options?: Readonly<{
    now?: () => number;
    durationLimitMs?: number;
  }>,
): RemoteShadowCoverageResult {
  const now = options?.now ?? (() => performance.now());
  const durationLimitMs =
    options?.durationLimitMs ??
    REMOTE_GENERATED_SHADOW_DURATION_LIMIT_MS;
  const startedAt = now();
  const samples: RemoteShadowSampleReceipt[] = [];
  const failures: RemoteShadowFailure[] = [];
  const grades = new Set<number>();
  let independentlySolved = 0;
  let familyCorrect = 0;
  let outcomeCorrect = 0;
  let difficultyCorrect = 0;
  let uniqueAnswerPolicyPass = 0;
  let publicPrivateBoundaryPass = 0;
  let provenanceComplete = 0;
  let visualContractPass = 0;

  if (outcomes.length !== 546) {
    throw new Error("SHADOW_OUTCOME_BASELINE_DRIFT");
  }

  for (const outcome of outcomes) {
    let variantId = "NOT_RUN";
    let currentDifficulty: Difficulty | "NOT_RUN" = "NOT_RUN";
    try {
      if (
        !Number.isInteger(outcome.grade) ||
        outcome.grade < 1 ||
        outcome.grade > 9 ||
        outcome.mappedUnitIds.length === 0 ||
        !outcome.id
      ) {
        throw new Error("SHADOW_CANONICAL_MAPPING_INVALID");
      }
      const descriptor: OutcomeDescriptor = {
        id: outcome.id,
        grade: outcome.grade,
        strand: outcome.officialStrand,
        subdomain: outcome.subdomain ?? "",
        description: outcome.conciseParaphrase,
      };
      const contract = buildOutcomeSemanticContract(descriptor);
      variantId = contract.expectedVariant;
      grades.add(outcome.grade);
      if (
        !contract.prerequisiteBounds.includes(
          `schoolGrade=${outcome.grade}`,
        )
      ) {
        throw new Error("SHADOW_GRADE_PREREQUISITE_UNSAFE");
      }

      for (const difficulty of difficulties) {
        currentDifficulty = difficulty;
        if (samples.length >= REMOTE_GENERATED_SHADOW_SAMPLE_LIMIT) {
          throw new Error("SHADOW_SAMPLE_LIMIT_EXCEEDED");
        }
        if (now() - startedAt > durationLimitMs) {
          throw new Error("SHADOW_DURATION_LIMIT_EXCEEDED");
        }
        const rawSeed =
          `${REMOTE_GENERATED_SHADOW_POLICY_VERSION}:` +
          `${outcome.id}:${difficulty}`;
        const seedHash = sha256(rawSeed);
        const ast = generateVariantAst(
          contract,
          outcome.conciseParaphrase,
          outcome.grade,
          difficulty,
          rawSeed,
        );
        const solverReceipt = solveVariantAst(contract, ast);
        independentlySolved += 1;
        const alignment = validateOutcomeSemanticAlignment(
          contract,
          ast,
          {
            variant: solverReceipt.variant,
            solver: solverReceipt.solverId,
          },
        );
        if (!alignment.ok) throw new Error(alignment.code);
        if (ast.family !== contract.expectedFamily) {
          throw new Error("SHADOW_FAMILY_MISMATCH");
        }
        familyCorrect += 1;
        if (
          ast.variant !== contract.expectedVariant ||
          contract.outcomeId !== outcome.id
        ) {
          throw new Error("SHADOW_OUTCOME_MISMATCH");
        }
        outcomeCorrect += 1;
        if (ast.complexity !== difficultyComplexity(difficulty)) {
          throw new Error("SHADOW_DIFFICULTY_MISMATCH");
        }
        difficultyCorrect += 1;
        if (
          solverReceipt.uniquenessPolicy !== "EXACTLY_ONE" ||
          solverReceipt.solverId !== contract.expectedSolver
        ) {
          throw new Error("SHADOW_SOLVER_OR_UNIQUENESS_MISMATCH");
        }
        const options = deterministicOptions(
          solverReceipt.derivedResult,
          seedHash,
        );
        if (
          new Set(options).size !== 4 ||
          options.filter(
            (option) => option === solverReceipt.derivedResult,
          ).length !== 1
        ) {
          throw new Error("SHADOW_UNIQUE_ANSWER_POLICY_FAILED");
        }
        uniqueAnswerPolicyPass += 1;
        const prompt = renderVariantPrompt(ast);
        const visual = visualForShadow({
          expectedVisual: contract.expectedVisual,
          ast,
          prompt,
        });
        visualContractPass += 1;
        const publicPayload = {
          grade: outcome.grade,
          unitId: outcome.mappedUnitIds[0],
          outcomeId: outcome.id,
          family: contract.expectedFamily,
          variant: contract.expectedVariant,
          difficulty,
          prompt,
          answerType: contract.expectedAnswerType,
          options,
          visual,
        };
        const privatePayload = {
          correctAnswer: solverReceipt.derivedResult,
          solverReceipt,
        };
        assertPublicPrivateBoundary(publicPayload);
        publicPrivateBoundaryPass += 1;
        const astHash = sha256(ast);
        const visualHash = sha256(visual);
        const solverReceiptHash = sha256(solverReceipt);
        const provenance = {
          semanticVariantId: contract.expectedVariant,
          semanticVariantVersion: OUTCOME_VARIANT_VERSION,
          solverVersion: contract.expectedSolver,
          solverReceiptHash,
          difficultyPolicyVersion:
            REMOTE_GENERATED_SHADOW_DIFFICULTY_POLICY,
          seedFingerprint: seedHash.slice(0, 16),
          astHash,
          visualHash,
        };
        assertProvenance(provenance);
        provenanceComplete += 1;
        samples.push({
          grade: outcome.grade,
          outcomeId: outcome.id,
          unitId: outcome.mappedUnitIds[0] ?? "",
          family: contract.expectedFamily,
          variantId: contract.expectedVariant,
          difficulty,
          solverId: contract.expectedSolver,
          astHash,
          publicPayloadHash: sha256(publicPayload),
          privatePayloadHash: sha256(privatePayload),
          solverReceiptHash,
          visualHash,
          seedFingerprint: seedHash.slice(0, 16),
          validationStatus: "PASS",
        });
      }
    } catch (error) {
      failures.push({
        outcomeId: outcome.id || "UNREADABLE_OUTCOME",
        variantId,
        difficulty: currentDifficulty,
        failureClass: safeFailureClass(error),
      });
    }
  }

  const durationMs = Math.max(0, now() - startedAt);
  let variantProbes: readonly RemoteShadowVariantProbeReceipt[] = [];
  try {
    variantProbes = validateAllVariantImplementations();
  } catch (error) {
    failures.push({
      outcomeId: "VARIANT_REGISTRY",
      variantId: "NOT_RUN",
      difficulty: "NOT_RUN",
      failureClass: safeFailureClass(error),
    });
  }
  const implementedVariants = new Set(
    variantProbes.map((receipt) => receipt.variantId),
  );
  const variantCoverageComplete =
    implementedVariants.size === OUTCOME_SEMANTIC_VARIANTS.length &&
    OUTCOME_SEMANTIC_VARIANTS.every((variant) =>
      implementedVariants.has(variant),
    );
  const exact = outcomes.length * difficulties.length;
  const ok =
    failures.length === 0 &&
    grades.size === 9 &&
    variantCoverageComplete &&
    exact === REMOTE_GENERATED_SHADOW_SAMPLE_LIMIT &&
    samples.length === exact &&
    independentlySolved === exact &&
    familyCorrect === exact &&
    outcomeCorrect === exact &&
    difficultyCorrect === exact &&
    uniqueAnswerPolicyPass === exact &&
    publicPrivateBoundaryPass === exact &&
    provenanceComplete === exact &&
    visualContractPass === exact;
  const summary = {
    policyVersion: REMOTE_GENERATED_SHADOW_POLICY_VERSION,
    grades: grades.size,
    outcomes: outcomes.length,
    variants: implementedVariants.size,
    variantProbeCount: implementedVariants.size,
    requested: exact,
    generated: samples.length,
    independentlySolved,
    familyCorrect,
    outcomeCorrect,
    difficultyCorrect,
    uniqueAnswerPolicyPass,
    publicPrivateBoundaryPass,
    provenanceComplete,
    visualContractPass,
    fallbackCount: 0,
    privateSolutionLeaks: 0,
    samples,
    variantProbes,
    failures,
  };
  return {
    ok,
    ...summary,
    sampleLimit: REMOTE_GENERATED_SHADOW_SAMPLE_LIMIT,
    durationLimitMs,
    durationMs,
    coverageHash: sha256(summary),
  };
}
