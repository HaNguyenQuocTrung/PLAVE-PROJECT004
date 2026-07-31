import { createHash } from "node:crypto";

import inventoryJson from "../../docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json" with {
  type: "json",
};

import {
  ON_DEMAND_DIFFICULTY_POLICY_VERSION,
  ON_DEMAND_GENERATION_CONTRACT_VERSION,
  ON_DEMAND_QUESTION_COUNT,
  type OnDemandAttemptSnapshot,
  type OnDemandGenerationContract,
  type OnDemandSelectionReason,
} from "./on-demand-generation.ts";
import { getCurriculumUnit } from "./registry.ts";
import type {
  CurriculumGrade,
  PreviewCognitiveLevel,
  PreviewOption,
  PreviewVisualSpec,
} from "./types.ts";
import {
  buildUniversalCurriculumRelease,
  canonicalJson,
  normalizeCurriculumAnswer,
  sha256,
  UNIVERSAL_CURRICULUM_GENERATOR_VERSION,
  UNIVERSAL_CURRICULUM_RELEASE_ID,
} from "../curriculum-runtime/release.ts";
import type { Difficulty, OutcomeDescriptor } from "../generation-semantic/engine.ts";
import {
  buildOutcomeSemanticContract,
  generateVariantAst,
  OUTCOME_VARIANT_VERSION,
  renderVariantPrompt,
  solveVariantAst,
  validateOutcomeSemanticAlignment,
  type VariantAst,
} from "../generation-semantic/variant-engine.ts";

export const SEMANTIC_PILOT_GENERATION_VERSION =
  "plave-semantic-pilot-v1" as const;

type InventoryOutcome = Readonly<{
  id: string;
  grade: number;
  officialStrand: string;
  subdomain?: string;
  conciseParaphrase: string;
  mappedUnitIds: readonly string[];
  prerequisiteOutcomeIds?: readonly string[];
}>;

const inventory = inventoryJson as { outcomes: readonly InventoryOutcome[] };
const outcomesById = new Map(
  inventory.outcomes.map((outcome) => [outcome.id, outcome]),
);

export function getSemanticPilotOutcomeVariant(outcomeId: string) {
  const outcome = outcomesById.get(outcomeId);
  if (!outcome) return null;
  return buildOutcomeSemanticContract({
    id: outcome.id,
    grade: outcome.grade,
    strand: outcome.officialStrand,
    subdomain: outcome.subdomain ?? "",
    description: outcome.conciseParaphrase,
  }).expectedVariant;
}
const release = buildUniversalCurriculumRelease();
const releaseQuestionsByOutcome = new Map<
  string,
  (typeof release.questions)[number][]
>();
for (const question of release.questions) {
  for (const outcomeId of question.officialOutcomeIds) {
    releaseQuestionsByOutcome.set(outcomeId, [
      ...(releaseQuestionsByOutcome.get(outcomeId) ?? []),
      question,
    ]);
  }
}

function safeAttemptSeed(value: string) {
  return /^pilot-[0-9a-f]{48}$/u.test(value);
}

function difficultyForPosition(base: Difficulty, position: number): Difficulty {
  if (base === "EASY") return position >= 7 && position <= 10 ? "MEDIUM" : "EASY";
  if (base === "MEDIUM") {
    if (position === 1) return "EASY";
    return position >= 9 && position <= 10 ? "HARD" : "MEDIUM";
  }
  return position <= 2 || position === 9 ? "MEDIUM" : "HARD";
}

function cognitiveLevel(difficulty: Difficulty): PreviewCognitiveLevel {
  return difficulty === "EASY"
    ? "UNDERSTAND"
    : difficulty === "MEDIUM"
      ? "APPLY"
      : "REASON";
}

function evidenceForm(variant: string): OnDemandGenerationContract["evidenceForm"] {
  if (/ERROR/u.test(variant)) return "ERROR_ANALYSIS";
  if (/EXPLANATION|THEOREM|MODELING|RELATION/u.test(variant)) {
    return "REASON_EXPLAIN";
  }
  if (/RECOGNITION|REPRESENTATION|SHAPE_PROPERTIES|PLACE_VALUE/u.test(variant)) {
    return "RECOGNIZE_UNDERSTAND";
  }
  if (/CONTEXT|INFORMATION|MEASUREMENT|CONVERSION/u.test(variant)) return "APPLY";
  return "PERFORM";
}

function numericDistractors(answer: string, complexity: number) {
  const parsed = Number(answer);
  if (!Number.isFinite(parsed)) return null;
  const step = Math.max(1, complexity);
  return [
    String(parsed + step),
    String(parsed - step),
    String(parsed + step * 2),
  ];
}

function distractorValues(ast: VariantAst, answer: string) {
  const numeric = numericDistractors(answer, ast.complexity);
  if (numeric) return numeric;
  if (ast.kind === "NUMBER_STRUCTURE" && ast.variant === "NUMBER_ORDERING") {
    const ascending = [...ast.values].sort((a, b) => a - b);
    const swapped = [...ascending];
    [swapped[0], swapped[1]] = [swapped[1] ?? swapped[0] ?? 0, swapped[0] ?? 0];
    return [
      [...ascending].reverse().join("; "),
      [...ascending.slice(1), ascending[0]].join("; "),
      swapped.join("; "),
    ];
  }
  if (ast.kind === "GEOMETRIC_RELATION" && ast.variant === "COORDINATE") {
    const [x = 0, y = 0] = ast.parameters;
    return [`(${y}; ${x})`, `(${-x}; ${y})`, `(${x}; ${-y})`];
  }
  if (ast.kind === "ALGEBRA" && ast.variant === "INEQUALITY_SOLVING") {
    return [
      answer.replace(">", "<"),
      answer.replace(">", "="),
      answer.replace("x", "-x"),
    ];
  }
  if (answer === "true" || answer === "false") {
    return [answer === "true" ? "false" : "true", "Không xác định", "Không áp dụng"];
  }
  return [
    "Phát biểu đảo của quan hệ đã nêu",
    "Một quan hệ không suy ra từ dữ kiện",
    "Không đủ dữ kiện",
  ];
}

function buildOptions(ast: VariantAst, answer: string, seed: string) {
  const distractors = distractorValues(ast, answer).filter(
    (value, index, values) => value !== answer && values.indexOf(value) === index,
  );
  if (distractors.length !== 3) {
    throw new Error("SEMANTIC_PILOT_DISTRACTOR_INVALID");
  }
  const labels = [answer, ...distractors];
  const offset = Number.parseInt(sha256(seed).slice(0, 2), 16) % 4;
  const ordered = [...labels.slice(offset), ...labels.slice(0, offset)];
  const keys = ["A", "B", "C", "D"] as const;
  const options = ordered.map((label, index) => ({
    key: keys[index] ?? "A",
    label,
  })) satisfies PreviewOption[];
  const answerIndex = ordered.indexOf(answer);
  const correctKey = keys[answerIndex];
  if (!correctKey || new Set(ordered).size !== 4) {
    throw new Error("SEMANTIC_PILOT_UNIQUENESS_FAILED");
  }
  return { options, correctKey };
}

function visualForAst(
  ast: VariantAst,
  expectedVisual: string,
): PreviewVisualSpec {
  const description = "Hình minh họa chỉ thể hiện các dữ kiện đã nêu trong câu hỏi.";
  if (expectedVisual === "NONE") {
    return {
      type: "TEXT_ONLY",
      description: "Câu hỏi này cung cấp đầy đủ dữ kiện bằng văn bản.",
    };
  }
  switch (ast.kind) {
    case "NUMBER_STRUCTURE":
      if (ast.variant === "PLACE_VALUE") {
        return { type: "PLACE_VALUE_CHART", value: ast.value, description };
      }
      return {
        type: "NUMBER_LINE",
        minimum: Math.min(...ast.values),
        maximum: Math.max(...ast.values),
        points: ast.values,
        description,
      };
    case "RATIONAL":
      if (/FRACTION/u.test(ast.variant)) {
        return {
          type: "FRACTION_BAR",
          numerator: ast.numerators[0] ?? 1,
          denominator: ast.denominators[0] ?? 2,
          comparisons: [
            {
              numerator: ast.numerators[1] ?? 1,
              denominator: ast.denominators[1] ?? 2,
            },
          ],
          description,
        };
      }
      return {
        type: "DECIMAL_PLACE_VALUE_CHART",
        values: ast.numerators.map((value, index) =>
          String(value / (ast.denominators[index] ?? 1)),
        ) as [string, ...string[]],
        description,
      };
    case "ALGEBRA":
      return {
        type: "BALANCE_MODEL",
        variableBlocks: Math.max(1, ast.coefficient),
        leftUnits: ast.constant,
        rightUnits: ast.coefficient * ast.variableValue + ast.constant,
        description,
      };
    case "MEASURE":
      if (ast.variant === "AREA" || ast.variant === "PERIMETER") {
        return {
          type: "AREA_MODEL",
          shape: "RECTANGLE",
          width: ast.values[0] ?? 1,
          height: ast.values[1] ?? 1,
          description,
        };
      }
      if (ast.variant === "VOLUME") {
        return {
          type: "SOLID_NET",
          solid: "CUBOID",
          faceCount: 6,
          description,
        };
      }
      return {
        type: "MEASUREMENT_SCALE",
        start: 0,
        end: ast.values[0] ?? 1,
        unit: "cm",
        description,
      };
    case "GEOMETRIC_RELATION":
      if (ast.variant === "COORDINATE") {
        return {
          type: "COORDINATE_PLANE",
          points: [
            { x: ast.parameters[0] ?? 0, y: ast.parameters[1] ?? 0 },
          ],
          description,
        };
      }
      if (ast.variant === "ANGLE") {
        return {
          type: "ANGLE_DIAGRAM",
          degrees: Math.max(1, Math.min(179, ast.parameters[0] ?? 45)),
          description,
        };
      }
      return { type: "SHAPE_SCENE", shape: "TRIANGLE", description };
    case "DATA":
      return {
        type: "DATA_DISPLAY",
        entries: ast.values.map((count, index) => ({
          label: `Mục ${index + 1}`,
          count,
        })),
        description,
      };
    case "OPERATION":
    case "CONTEXT":
      return {
        type: "COUNTER_ROW",
        groups: Math.max(1, ast.complexity),
        itemsPerGroup:
          ast.kind === "OPERATION"
            ? Math.max(1, ast.operands[0] ?? 1)
            : Math.max(1, ast.quantities[0] ?? 1),
        description,
      };
    case "CONCEPT":
      return { type: "TEXT_ONLY", description: "Câu hỏi này cung cấp đầy đủ dữ kiện bằng văn bản." };
  }
}

const vietnameseVariantLabels: Partial<Record<VariantAst["variant"], string>> = {
  PLACE_VALUE: "giá trị theo hàng",
  NUMBER_REPRESENTATION: "biểu diễn số",
  NUMBER_COMPARISON: "so sánh số",
  NUMBER_ORDERING: "sắp xếp số",
  ADDITION_SUBTRACTION: "cộng và trừ",
  MULTIPLICATION_DIVISION: "nhân và chia",
  INTEGER_OPERATIONS: "phép tính với số nguyên",
  FRACTION_RECOGNITION: "nhận biết phân số",
  FRACTION_EQUIVALENCE: "phân số bằng nhau",
  FRACTION_COMPARISON: "so sánh phân số",
  FRACTION_OPERATIONS: "phép tính với phân số",
  DECIMAL_REPRESENTATION: "biểu diễn số thập phân",
  DECIMAL_COMPARISON: "so sánh số thập phân",
  DECIMAL_OPERATIONS: "phép tính với số thập phân",
  RATIO: "tỉ số",
  PERCENTAGE: "tỉ số phần trăm",
  DIVISIBILITY: "tính chia hết",
  POWER_ROOT: "lũy thừa và căn bậc hai",
  NUMERICAL_EXPRESSION: "tính giá trị biểu thức",
  MISSING_VALUE: "tìm giá trị chưa biết",
  SUBSTITUTION: "thay giá trị vào biểu thức",
  EXPRESSION_CONSTRUCTION: "lập biểu thức",
  LIKE_TERM_COMBINATION: "thu gọn hạng tử đồng dạng",
  ALGEBRAIC_TRANSFORMATION: "biến đổi biểu thức",
  EQUATION_SOLVING: "giải phương trình",
  INEQUALITY_SOLVING: "giải bất phương trình",
  SEQUENCE_RULE: "quy luật của dãy",
  FUNCTION_INPUT_OUTPUT: "giá trị của hàm số",
  RELATION_INTERPRETATION: "quan hệ giữa các đại lượng",
  DIRECT_MEASUREMENT: "đo trực tiếp",
  UNIT_CONVERSION: "đổi đơn vị đo",
  TIME_MONEY: "thời gian và tiền",
  PERIMETER: "chu vi",
  AREA: "diện tích",
  VOLUME: "thể tích",
  SHAPE_PROPERTIES: "tính chất của hình",
  ANGLE: "góc",
  COORDINATE: "tọa độ",
  GEOMETRIC_CONSTRUCTION: "dựng hình",
  GEOMETRIC_RELATION: "quan hệ hình học",
  THEOREM_APPLICATION: "vận dụng định lí",
  SPATIAL_REASONING: "suy luận không gian",
  TABLE_INTERPRETATION: "đọc bảng dữ liệu",
  CHART_INTERPRETATION: "đọc biểu đồ",
  FREQUENCY: "tần số",
  RELATIVE_FREQUENCY: "tần số tương đối",
  CENTRAL_TENDENCY: "số trung bình, trung vị hoặc mốt",
  DATA_COMPARISON: "so sánh dữ liệu",
  EXPERIMENTAL_PROBABILITY: "xác suất thực nghiệm",
  THEORETICAL_PROBABILITY: "xác suất của biến cố",
  SAMPLE_SPACE: "không gian mẫu",
  ONE_STEP_CONTEXT: "bài toán một bước",
  MULTI_STEP_CONTEXT: "bài toán nhiều bước",
  INFORMATION_SELECTION: "chọn dữ kiện cần thiết",
  INSUFFICIENT_INFORMATION: "nhận biết dữ kiện chưa đủ",
  ERROR_DETECTION: "phát hiện và sửa lỗi",
  MATHEMATICAL_MODELING: "mô hình hóa toán học",
  EXPLANATION_REASONING: "giải thích và suy luận",
  REPRESENTATION_CONSTRUCTION: "chọn cách biểu diễn phù hợp",
};

function vietnameseVariantLabel(ast: VariantAst) {
  return vietnameseVariantLabels[ast.variant] ?? "yêu cầu toán học";
}

function renderPilotPrompt(ast: VariantAst, position: number) {
  const technicalLabel = ast.variant.toLowerCase().replaceAll("_", " ");
  const prompt = renderVariantPrompt(ast).replaceAll(
    technicalLabel,
    vietnameseVariantLabel(ast),
  );
  if (ast.kind === "DATA") {
    return `Bộ dữ liệu ${position}: ${prompt}`;
  }
  if (ast.kind === "CONTEXT") {
    return `Tình huống ${position}: ${prompt}`;
  }
  if (ast.kind !== "CONCEPT") return prompt;
  const frames = [
    "Chọn phát biểu phù hợp nhất.",
    "Xác định mô tả đúng.",
    "Chọn cách diễn đạt chính xác.",
    "Đối chiếu yêu cầu rồi chọn phát biểu đúng.",
  ];
  return `${frames[(position - 1) % frames.length]} ${prompt} (Tình huống ${position})`;
}

function validatePublicPayload(value: unknown) {
  const serialized = canonicalJson(value);
  if (
    /correctAnswer|correctIndex|derivedResult|normalizedInputs|privateSolution|rawSeed|solutionSteps|solverReceiptHash|seedFingerprint|astHash|visualHash/u.test(
      serialized,
    )
  ) {
    throw new Error("SEMANTIC_PILOT_PRIVATE_PAYLOAD_LEAK");
  }
}

export function generateSemanticPilotAttemptSnapshot(input: Readonly<{
  grade: CurriculumGrade;
  unitId: string;
  outcomeId: string;
  attemptSeed: string;
  baseDifficulty: Difficulty;
  selectionReason: OnDemandSelectionReason;
}>) {
  if (!safeAttemptSeed(input.attemptSeed)) {
    throw new Error("SEMANTIC_PILOT_SEED_INVALID");
  }
  const outcome = outcomesById.get(input.outcomeId);
  const unit = getCurriculumUnit(input.unitId);
  const releaseQuestion =
    releaseQuestionsByOutcome
      .get(input.outcomeId)
      ?.find((question) => question.unitId === input.unitId) ??
    release.questions.find((question) => question.unitId === input.unitId);
  if (
    !outcome ||
    outcome.grade !== input.grade ||
    !outcome.mappedUnitIds.includes(input.unitId) ||
    !unit ||
    unit.grade !== input.grade ||
    !unit.officialOutcomeIds.includes(input.outcomeId) ||
    !releaseQuestion
  ) {
    throw new Error("SEMANTIC_PILOT_MAPPING_INVALID");
  }
  const descriptor: OutcomeDescriptor = {
    id: outcome.id,
    grade: outcome.grade,
    strand: outcome.officialStrand,
    subdomain: outcome.subdomain ?? "",
    description: outcome.conciseParaphrase,
  };
  const semanticContract = buildOutcomeSemanticContract(descriptor);
  const questions: OnDemandAttemptSnapshot["questions"][number][] = [];
  const solutions: OnDemandAttemptSnapshot["solutions"][number][] = [];
  const promptHashes = new Set<string>();
  for (let index = 0; index < ON_DEMAND_QUESTION_COUNT; index += 1) {
    const position = index + 1;
    const difficulty = difficultyForPosition(input.baseDifficulty, position);
    let questionSeed = "";
    let ast: VariantAst | null = null;
    let solved: ReturnType<typeof solveVariantAst> | null = null;
    let prompt = "";
    let promptHash = "";
    for (let retry = 0; retry < 16; retry += 1) {
      questionSeed = `pilot-${sha256(`${input.attemptSeed}:${position}:${retry}`).slice(0, 48)}`;
      const candidateAst = generateVariantAst(
        semanticContract,
        outcome.conciseParaphrase,
        input.grade,
        difficulty,
        questionSeed,
      );
      const candidateSolved = solveVariantAst(semanticContract, candidateAst);
      const validation = validateOutcomeSemanticAlignment(semanticContract, candidateAst, {
        variant: candidateSolved.variant,
        solver: candidateSolved.solverId,
      });
      if (!validation.ok || candidateSolved.uniquenessPolicy !== "EXACTLY_ONE") {
        throw new Error(validation.ok ? "SEMANTIC_PILOT_SOLVER_INVALID" : validation.code);
      }
      const candidatePrompt = renderPilotPrompt(candidateAst, position);
      const candidatePromptHash = sha256({ prompt: candidatePrompt, ast: candidateAst });
      if (promptHashes.has(candidatePromptHash)) continue;
      ast = candidateAst;
      solved = candidateSolved;
      prompt = candidatePrompt;
      promptHash = candidatePromptHash;
      break;
    }
    if (!ast || !solved || !questionSeed || !promptHash) {
      throw new Error("SEMANTIC_PILOT_PROMPT_COLLISION");
    }
    promptHashes.add(promptHash);
    const { options, correctKey } = buildOptions(ast, solved.derivedResult, questionSeed);
    const visual = visualForAst(ast, semanticContract.expectedVisual);
    const solverReceipt = {
      solverId: solved.solverId,
      solverVersion: solved.solverVersion,
      variant: solved.variant,
      normalizedInputs: solved.normalizedInputs,
      derivedResult: solved.derivedResult,
      uniquenessPolicy: solved.uniquenessPolicy,
      validationHash: solved.validationHash,
    };
    const provenance = {
      semanticVariantId: semanticContract.expectedVariant,
      semanticVariantVersion: OUTCOME_VARIANT_VERSION,
      solverVersion: semanticContract.expectedSolver,
      solverReceiptHash: sha256(solverReceipt),
      difficultyPolicyVersion: ON_DEMAND_DIFFICULTY_POLICY_VERSION,
      seedFingerprint: sha256(questionSeed).slice(0, 16),
      astHash: sha256(ast),
      visualHash: sha256(visual),
    };
    const contract: OnDemandGenerationContract = {
      contractVersion: ON_DEMAND_GENERATION_CONTRACT_VERSION,
      grade: input.grade,
      unitId: input.unitId,
      outcomeId: input.outcomeId,
      skillId: releaseQuestion.skillId,
      skillTitle: releaseQuestion.skillTitle,
      difficulty: cognitiveLevel(difficulty),
      evidenceForm: evidenceForm(semanticContract.expectedVariant),
      seed: questionSeed,
      generatorVersion: UNIVERSAL_CURRICULUM_GENERATOR_VERSION,
      releaseId: UNIVERSAL_CURRICULUM_RELEASE_ID,
      contentReleaseHash: release.hashes.bundleSha256,
    };
    const questionId = `pilot-${sha256(`${input.attemptSeed}:${position}:${input.outcomeId}`).slice(0, 32)}`;
    const publicPayload = {
      questionId,
      position,
      contract,
      prompt,
      answerType: "MULTIPLE_CHOICE" as const,
      options,
      visual,
      misconceptionTags: [`${semanticContract.expectedVariant}_MISCONCEPTION`],
      provenance,
    };
    validatePublicPayload({
      questionId,
      position,
      prompt,
      answerType: publicPayload.answerType,
      options,
      visual,
    });
    questions.push({ ...publicPayload, publicPayloadHash: sha256(publicPayload) });
    const privatePayload = {
      questionId,
      normalizedCorrectAnswer: normalizeCurriculumAnswer(correctKey),
      correctAnswer: correctKey,
      solutionSteps: [
        "Đọc các dữ kiện toán học trong câu hỏi.",
        "Thực hiện đúng phép biến đổi hoặc suy luận được yêu cầu.",
        `Kết quả tương ứng với lựa chọn ${correctKey}.`,
      ],
      feedback: "Em hãy đối chiếu từng dữ kiện với phép tính hoặc quan hệ vừa dùng.",
    };
    solutions.push({ ...privatePayload, privatePayloadHash: sha256(privatePayload) });
  }
  const immutable = {
    schemaVersion: 1 as const,
    releaseId: UNIVERSAL_CURRICULUM_RELEASE_ID as typeof UNIVERSAL_CURRICULUM_RELEASE_ID,
    contentReleaseHash: release.hashes.bundleSha256,
    generatorVersion:
      UNIVERSAL_CURRICULUM_GENERATOR_VERSION as typeof UNIVERSAL_CURRICULUM_GENERATOR_VERSION,
    grade: input.grade,
    unitId: input.unitId,
    attemptSeed: input.attemptSeed,
    selectionReason: input.selectionReason,
    questions,
    solutions,
  };
  return {
    ...immutable,
    snapshotHash: sha256(immutable),
  } satisfies OnDemandAttemptSnapshot;
}

export function deriveSemanticPilotAttemptSeed(input: Readonly<{
  studentId: string;
  idempotencyKey: string;
  signingKey: string;
}>) {
  const digest = createHash("sha256")
    .update(`${SEMANTIC_PILOT_GENERATION_VERSION}:${input.studentId}:${input.idempotencyKey}`)
    .update(input.signingKey)
    .digest("hex");
  return `pilot-${digest.slice(0, 48)}`;
}

export function semanticPilotDifficultyFromEvidence(input: Readonly<{
  evidenceCount: number;
  correctCount: number;
}>): Difficulty {
  if (input.evidenceCount < 3) return "EASY";
  const accuracy = input.correctCount / input.evidenceCount;
  return accuracy >= 0.85 ? "HARD" : accuracy >= 0.6 ? "MEDIUM" : "EASY";
}
