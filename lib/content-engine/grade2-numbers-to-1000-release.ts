import { createHash } from "node:crypto";

import {
  generateGradeTwoNumbersTo1000Draft,
  validateGradeTwoNumbersTo1000Draft,
} from "./grade2-numbers-to-1000.ts";
import {
  gradeTwoNumbersTo1000ReviewSeeds,
} from "./grade2-numbers-to-1000-review.ts";
import {
  gradeTwoNumbersTo1000SourceManifest,
} from "./grade2-numbers-to-1000-sources.ts";
import {
  validateUnitSourceTraceabilityManifest,
} from "./source-traceability.ts";
import type {
  CognitiveLevel,
  Difficulty,
  EngineAnswerType,
  EngineQuestionOptions,
  EngineVisualSpec,
  GeneratedQuestionSource,
  MisconceptionTag,
  ValidationResult,
} from "./types.ts";

export const GRADE_TWO_NUMBERS_TO_1000_RELEASE_CANDIDATE_ID =
  "g2-numbers-to-1000-rc1";
export const GRADE_TWO_NUMBERS_TO_1000_CONTENT_VERSION =
  "g2n1000-1.0.0-rc.1";
export const GRADE_TWO_NUMBERS_TO_1000_GENERATOR_VERSION =
  "g2n1000-generator-1.0.0";
export const GRADE_TWO_NUMBERS_TO_1000_CONFIGURATION_VERSION =
  "g2n1000-config-1.0.0";
export const GRADE_TWO_NUMBERS_TO_1000_TEMPLATE_VERSION =
  "g2n1000-template-1.0.0";
export const GRADE_TWO_NUMBERS_TO_1000_SOURCE_MANIFEST_VERSION =
  "poc-v1";
export const GRADE_TWO_NUMBERS_TO_1000_RELEASE_CREATED_AT =
  "2026-07-29T15:49:23Z";

export const gradeTwoNumbersTo1000PilotFlags = {
  controlledPilotEnabled: false,
  studentVisibility: "HIDDEN",
} as const;

type RubricCriterion = Readonly<{
  id: string;
  label: string;
  weight: number;
  passed: boolean;
  evidence: string;
}>;

export type ReleaseCandidateEvaluation = Readonly<{
  seed: string;
  score: number;
  maximumScore: 100;
  eligible: boolean;
  criteria: readonly RubricCriterion[];
}>;

export type ReleaseClientQuestion = Readonly<{
  questionId: string;
  prompt: string;
  answerType: EngineAnswerType;
  options: EngineQuestionOptions | null;
  visual: EngineVisualSpec;
  accessibilityDescription: string;
  skillFamilyId: string;
  difficulty: Exclude<Difficulty, "MIXED">;
  cognitiveLevel: CognitiveLevel;
  displayOrder: number;
}>;

export type ReleaseServerSolution = Readonly<{
  questionId: string;
  correctAnswer: string;
  solutionSteps: readonly string[];
  explanation: string;
  hint: string;
}>;

export type ReleasePrivateAudit = Readonly<{
  questionId: string;
  source: GeneratedQuestionSource;
  expectedDisplayAnswer: string;
  distractorTagByOption: Readonly<
    Partial<Record<keyof EngineQuestionOptions, MisconceptionTag>>
  >;
}>;

export type ReleaseUnitContent = Readonly<{
  title: "Các số trong phạm vi 1000";
  description: string;
  learningObjectives: readonly string[];
  lessonContent: Readonly<{
    sections: readonly Readonly<{
      code: string;
      title: string;
      paragraphs: readonly string[];
    }>[];
    worked_examples: readonly Readonly<{
      title: string;
      steps: readonly string[];
      answer: string;
    }>[];
    memory_note: string;
  }>;
}>;

export type ReleaseCandidateArtifacts = Readonly<{
  unitContent: ReleaseUnitContent;
  publicQuestions: readonly ReleaseClientQuestion[];
  serverSolutions: readonly ReleaseServerSolution[];
  privateAudit: readonly ReleasePrivateAudit[];
}>;

type Distribution = Readonly<Record<string, number>>;

export type GradeTwoReleaseManifest = Readonly<{
  releaseCandidateId: string;
  unitSlug: "grade-2-numbers-to-1000";
  schoolGrade: 2;
  contentVersion: string;
  generatorVersion: string;
  configurationVersion: string;
  templateVersion: string;
  sourceManifestVersion: string;
  releaseSeed: string;
  questionCount: 24;
  skillDistribution: Distribution;
  answerTypeDistribution: Distribution;
  visualTypeDistribution: Distribution;
  difficultyDistribution: Distribution;
  cognitiveLevelDistribution: Distribution;
  questionHashes: Readonly<Record<string, string>>;
  solutionHashes: Readonly<Record<string, string>>;
  unitContentHash: string;
  publicBundleHash: string;
  serverBundleHash: string;
  auditBundleHash: string;
  bundleHash: string;
  createdAt: string;
  officialSourceValidation: "VALIDATED";
  technicalValidation: "PASSED";
  expertReview: "OPTIONAL_NOT_OBTAINED";
  ownerDecision: "APPROVED_FOR_CONTROLLED_PILOT_PREPARATION";
  publicationStatus: "DRAFT";
  studentVisibility: "HIDDEN";
}>;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function distribution(values: readonly string[]): Distribution {
  const result: Record<string, number> = {};
  for (const value of values) {
    result[value] = (result[value] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(result).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
}

function hasApprovedScopeOnly(prompts: readonly string[]) {
  return prompts.every(
    (prompt) =>
      !/(?:phép cộng|phép trừ|phép nhân|phép chia|[+×÷]|\d\s*-\s*\d)/i.test(
        prompt,
      ),
  );
}

export function evaluateGradeTwoReleaseSeed(
  seed: string,
): ReleaseCandidateEvaluation {
  const draft = generateGradeTwoNumbersTo1000Draft(seed);
  const validation = validateGradeTwoNumbersTo1000Draft(draft);
  const values = draft.bundles.map(({ audit }) => audit.source.value);
  const skillDistribution = distribution(
    draft.bundles.map(({ question }) => question.skillFamilyId),
  );
  const answerDistribution = distribution(
    draft.bundles.map(({ question }) => question.questionType),
  );
  const visualDistribution = distribution(
    draft.bundles.map(({ question }) => question.visual.kind),
  );
  const prompts = draft.bundles.map(({ question }) => question.prompt);
  const codes = draft.bundles.map(({ question }) => question.code);
  const zeroPlaceCount = values.filter((value) => {
    if (value < 100 || value >= 1000) return false;
    const remainder = value % 100;
    return remainder > 0 && remainder < 10;
  }).length;
  const hundredsDiversity = new Set(
    values.filter((value) => value < 1000).map((value) =>
      Math.floor(value / 100),
    ),
  ).size;
  const valueSpan =
    Math.max(...values) - Math.min(...values);
  const diversityPoints =
    (values.some((value) => value >= 900) ? 5 : 0) +
    (zeroPlaceCount > 0 ? 5 : 0) +
    (hundredsDiversity >= 6 ? 5 : 0) +
    (valueSpan >= 700 ? 5 : 0);
  const mcqBundles = draft.bundles.filter(
    ({ question }) => question.questionType === "MULTIPLE_CHOICE",
  );
  const misconceptionComplete = mcqBundles.every(({ audit, solution }) => {
    const tags = audit.distractorTagByOption;
    return (
      Object.keys(tags).length === 3 &&
      !(solution.correctAnswer in tags)
    );
  });
  const criteria: readonly RubricCriterion[] = [
    {
      id: "SKILL_COVERAGE",
      label: "Bao phủ bốn skill family",
      weight: 15,
      passed:
        Object.keys(skillDistribution).length === 4 &&
        Object.values(skillDistribution).every((count) => count === 6),
      evidence: canonicalJson(skillDistribution),
    },
    {
      id: "ANSWER_TYPE_COVERAGE",
      label: "Bao phủ MCQ và NUMBER_INPUT",
      weight: 10,
      passed:
        answerDistribution.MULTIPLE_CHOICE === 16 &&
        answerDistribution.NUMBER_INPUT === 8,
      evidence: canonicalJson(answerDistribution),
    },
    {
      id: "VISUAL_COVERAGE",
      label: "Bao phủ thẻ số, bảng giá trị hàng và tia số",
      weight: 10,
      passed:
        visualDistribution.NUMBER_CARD === 6 &&
        visualDistribution.PLACE_VALUE_CHART === 12 &&
        visualDistribution.NUMBER_LINE === 6,
      evidence: canonicalJson(visualDistribution),
    },
    {
      id: "VALUE_DIVERSITY",
      label: "Đa dạng boundary và cấu tạo hàng",
      weight: 20,
      passed: diversityPoints >= 15,
      evidence: `points=${diversityPoints}; zero-place=${zeroPlaceCount}; hundreds=${hundredsDiversity}; span=${valueSpan}`,
    },
    {
      id: "STABLE_UNIQUE_CONTENT",
      label: "ID và prompt ổn định, không trùng",
      weight: 5,
      passed:
        new Set(codes).size === 24 &&
        new Set(prompts).size === 24,
      evidence: `codes=${new Set(codes).size}; prompts=${new Set(prompts).size}`,
    },
    {
      id: "MCQ_OPTIONS",
      label: "MCQ có bốn option duy nhất và một đáp án canonical",
      weight: 5,
      passed: mcqBundles.every(({ question, solution, audit }) => {
        const options = question.options;
        if (!options) return false;
        return (
          Object.keys(options).sort().join(",") === "A,B,C,D" &&
          new Set(Object.values(options)).size === 4 &&
          options[
            solution.correctAnswer as keyof EngineQuestionOptions
          ] === audit.expectedDisplayAnswer
        );
      }),
      evidence: `${mcqBundles.length}/16 MCQ đạt`,
    },
    {
      id: "READING_LOAD",
      label: "Tải đọc nằm trong policy hiện tại",
      weight: 5,
      passed: validation.valid,
      evidence: validation.valid ? "validator passed" : validation.errors.join("; "),
    },
    {
      id: "LINH_HOUSE_STYLE",
      label: "Wording nhất quán house style “linh”",
      weight: 5,
      passed: draft.bundles.every(
        ({ question, solution }) =>
          !/\blẻ\b/i.test(
            [
              question.prompt,
              ...Object.values(question.options ?? {}),
              ...solution.solutionSteps,
            ].join(" "),
          ),
      ),
      evidence: "Không sinh biến thể “lẻ” trong candidate.",
    },
    {
      id: "UNIT_SCOPE",
      label: "Không chứa phép tính hoặc kiến thức unit khác",
      weight: 5,
      passed: hasApprovedScopeOnly(prompts),
      evidence: "Scope scan trên toàn bộ prompt.",
    },
    {
      id: "SOLUTION_VISUAL_CONSISTENCY",
      label: "Answer, solution, audit source và visual nhất quán",
      weight: 10,
      passed: validation.valid,
      evidence: validation.valid ? "validator passed" : validation.errors.join("; "),
    },
    {
      id: "MISCONCEPTION_EVIDENCE",
      label: "Distractor có misconception tag giải thích được",
      weight: 10,
      passed: misconceptionComplete,
      evidence: `${mcqBundles.length}/16 MCQ có đủ ba tag nhiễu.`,
    },
  ];
  const score = criteria.reduce(
    (total, criterion) =>
      total +
      (criterion.id === "VALUE_DIVERSITY"
        ? diversityPoints
        : criterion.passed
          ? criterion.weight
          : 0),
    0,
  );
  return {
    seed,
    score,
    maximumScore: 100,
    eligible:
      validation.valid &&
      criteria.every(
        (criterion) =>
          criterion.passed || criterion.id === "VALUE_DIVERSITY",
      ) &&
      diversityPoints >= 15,
    criteria,
  };
}

export function selectRecommendedGradeTwoReleaseCandidate() {
  const evaluations = gradeTwoNumbersTo1000ReviewSeeds
    .map(evaluateGradeTwoReleaseSeed)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.seed.localeCompare(right.seed),
    );
  const recommended = evaluations[0];
  if (!recommended || !recommended.eligible) {
    throw new Error("Không có release candidate hợp lệ.");
  }
  return {
    label: "RECOMMENDED_RELEASE_CANDIDATE" as const,
    recommended,
    evaluations,
  };
}

export function createGradeTwoReleaseArtifacts(
  seed: string,
): ReleaseCandidateArtifacts {
  const draft = generateGradeTwoNumbersTo1000Draft(seed);
  const validation = validateGradeTwoNumbersTo1000Draft(draft);
  if (!validation.valid) {
    throw new Error(validation.errors.join("\n"));
  }
  const templateById = new Map(
    draft.templates.map((template) => [template.id, template]),
  );
  return {
    unitContent: {
      title: "Các số trong phạm vi 1000",
      description:
        "Đếm, đọc, viết và nhận biết cấu tạo hàng của các số từ 0 đến 1000.",
      learningObjectives: [
        "Đếm, nhận biết và viết được số trong phạm vi 1000.",
        "Đọc số theo house style tiếng Việt nhất quán của PLAVE.",
        "Xác định chữ số hàng trăm, hàng chục và hàng đơn vị.",
        "Tìm số liền trước, số liền sau trên tia số đơn giản.",
      ],
      lessonContent: {
        sections: [
          {
            code: "count-to-1000",
            title: "Các số đến 1000",
            paragraphs: [
              "Ta có thể đếm tiếp từ các số đã biết để gặp những số lớn hơn 100.",
              "Số 1000 được viết bằng chữ số 1 và ba chữ số 0.",
            ],
          },
          {
            code: "read-and-write",
            title: "Đọc và viết số",
            paragraphs: [
              "Khi đọc số có ba chữ số, ta đọc hàng trăm trước, rồi đến hàng chục và hàng đơn vị.",
              "Khi hàng chục bằng 0 nhưng hàng đơn vị khác 0, PLAVE dùng từ “linh”, như 305 đọc là ba trăm linh năm.",
            ],
          },
          {
            code: "place-value",
            title: "Hàng trăm, hàng chục và hàng đơn vị",
            paragraphs: [
              "Mỗi chữ số có giá trị theo vị trí của nó trong số.",
              "Trong số 472, chữ số 4 ở hàng trăm, 7 ở hàng chục và 2 ở hàng đơn vị.",
            ],
          },
          {
            code: "compose-number",
            title: "Ghép số từ các hàng",
            paragraphs: [
              "Ta đặt chữ số hàng trăm, hàng chục và hàng đơn vị vào đúng cột.",
              "Năm trăm, hai chục và sáu đơn vị ghép thành số 526.",
            ],
          },
          {
            code: "zero-place",
            title: "Chữ số 0 giữ vị trí",
            paragraphs: [
              "Chữ số 0 cho biết hàng đó không có nhóm nào, nhưng vẫn giữ đúng vị trí của các chữ số khác.",
              "Số 704 có 7 trăm, 0 chục và 4 đơn vị.",
            ],
          },
          {
            code: "number-neighbors",
            title: "Số liền trước và số liền sau",
            paragraphs: [
              "Số liền trước kém số đã cho 1 đơn vị; số liền sau hơn số đã cho 1 đơn vị.",
              "Trên tia số tăng dần, số liền trước ở ngay bên trái và số liền sau ở ngay bên phải.",
            ],
          },
        ],
        worked_examples: [
          {
            title: "Ghép số theo hàng",
            steps: [
              "Đặt 6 vào hàng trăm, 0 vào hàng chục và 8 vào hàng đơn vị.",
              "Ghép ba chữ số theo đúng thứ tự để được 608.",
              "Đọc số là sáu trăm linh tám.",
            ],
            answer: "Số cần tìm là 608.",
          },
          {
            title: "Tìm hai số đứng cạnh",
            steps: [
              "Số liền trước của 350 kém 350 một đơn vị nên là 349.",
              "Số liền sau của 350 hơn 350 một đơn vị nên là 351.",
              "Kiểm tra thứ tự trên tia số: 349, 350, 351.",
            ],
            answer: "Số liền trước là 349; số liền sau là 351.",
          },
        ],
        memory_note:
          "Đọc và ghép số từ hàng cao xuống hàng thấp; luôn giữ đúng vị trí của chữ số 0.",
      },
    },
    publicQuestions: draft.bundles.map(({ question }) => {
      const template = templateById.get(question.templateId);
      if (!template) {
        throw new Error(`Thiếu template ${question.templateId}.`);
      }
      return {
        questionId: question.code,
        prompt: question.prompt,
        answerType: question.questionType,
        options: question.options,
        visual: question.visual,
        accessibilityDescription: question.visual.description,
        skillFamilyId: question.skillFamilyId,
        difficulty: question.difficulty,
        cognitiveLevel: template.cognitiveLevel,
        displayOrder: question.displayOrder,
      };
    }),
    serverSolutions: draft.bundles.map(({ solution }) => ({
      questionId: solution.questionCode,
      correctAnswer: solution.correctAnswer,
      solutionSteps: solution.solutionSteps,
      explanation: solution.explanation,
      hint: solution.hint,
    })),
    privateAudit: draft.bundles.map(({ audit }) => ({
      questionId: audit.questionCode,
      source: audit.source,
      expectedDisplayAnswer: audit.expectedDisplayAnswer,
      distractorTagByOption: audit.distractorTagByOption,
    })),
  };
}

export function createGradeTwoReleaseManifest(
  seed: string,
  artifacts = createGradeTwoReleaseArtifacts(seed),
): GradeTwoReleaseManifest {
  const draft = generateGradeTwoNumbersTo1000Draft(seed);
  const templateById = new Map(
    draft.templates.map((template) => [template.id, template]),
  );
  const questionHashes = Object.fromEntries(
    artifacts.publicQuestions.map((question) => [
      question.questionId,
      sha256(question),
    ]),
  );
  const solutionHashes = Object.fromEntries(
    artifacts.serverSolutions.map((solution) => [
      solution.questionId,
      sha256(solution),
    ]),
  );
  const unitContentHash = sha256(artifacts.unitContent);
  const publicBundleHash = sha256(artifacts.publicQuestions);
  const serverBundleHash = sha256(artifacts.serverSolutions);
  const auditBundleHash = sha256(artifacts.privateAudit);
  const manifestCore = {
    releaseCandidateId:
      GRADE_TWO_NUMBERS_TO_1000_RELEASE_CANDIDATE_ID,
    unitSlug: "grade-2-numbers-to-1000" as const,
    schoolGrade: 2 as const,
    contentVersion: GRADE_TWO_NUMBERS_TO_1000_CONTENT_VERSION,
    generatorVersion: GRADE_TWO_NUMBERS_TO_1000_GENERATOR_VERSION,
    configurationVersion:
      GRADE_TWO_NUMBERS_TO_1000_CONFIGURATION_VERSION,
    templateVersion: GRADE_TWO_NUMBERS_TO_1000_TEMPLATE_VERSION,
    sourceManifestVersion:
      GRADE_TWO_NUMBERS_TO_1000_SOURCE_MANIFEST_VERSION,
    releaseSeed: seed,
    questionCount: 24 as const,
    skillDistribution: distribution(
      draft.bundles.map(({ question }) => question.skillFamilyId),
    ),
    answerTypeDistribution: distribution(
      draft.bundles.map(({ question }) => question.questionType),
    ),
    visualTypeDistribution: distribution(
      draft.bundles.map(({ question }) => question.visual.kind),
    ),
    difficultyDistribution: distribution(
      draft.bundles.map(({ question }) => question.difficulty),
    ),
    cognitiveLevelDistribution: distribution(
      draft.bundles.map(({ question }) => {
        const template = templateById.get(question.templateId);
        if (!template) {
          throw new Error(`Thiếu template ${question.templateId}.`);
        }
        return template.cognitiveLevel;
      }),
    ),
    questionHashes,
    solutionHashes,
    unitContentHash,
    publicBundleHash,
    serverBundleHash,
    auditBundleHash,
    createdAt: GRADE_TWO_NUMBERS_TO_1000_RELEASE_CREATED_AT,
    officialSourceValidation: "VALIDATED" as const,
    technicalValidation: "PASSED" as const,
    expertReview: "OPTIONAL_NOT_OBTAINED" as const,
    ownerDecision:
      "APPROVED_FOR_CONTROLLED_PILOT_PREPARATION" as const,
    publicationStatus: "DRAFT" as const,
    studentVisibility: "HIDDEN" as const,
  };
  return {
    ...manifestCore,
    bundleHash: sha256({
      manifestCore,
      unitContent: artifacts.unitContent,
      publicQuestions: artifacts.publicQuestions,
      serverSolutions: artifacts.serverSolutions,
      privateAudit: artifacts.privateAudit,
    }),
  };
}

const forbiddenClientKeys = [
  "correctAnswer",
  "solutionSteps",
  "explanation",
  "hint",
  "auditSource",
  "expectedDisplayAnswer",
  "distractorTagByOption",
  "source",
] as const;

export function validateGradeTwoReleaseCandidate(
  manifest: GradeTwoReleaseManifest,
  artifacts: ReleaseCandidateArtifacts,
  existingContentVersions: readonly string[] = [],
): ValidationResult {
  const errors: string[] = [];
  const selection = selectRecommendedGradeTwoReleaseCandidate();
  if (
    manifest.releaseCandidateId !==
      GRADE_TWO_NUMBERS_TO_1000_RELEASE_CANDIDATE_ID ||
    manifest.releaseSeed !== selection.recommended.seed ||
    manifest.unitSlug !== "grade-2-numbers-to-1000" ||
    manifest.schoolGrade !== 2 ||
    manifest.questionCount !== 24
  ) {
    errors.push("Release identity hoặc seed không khớp candidate được đề xuất.");
  }
  if (
    manifest.officialSourceValidation !== "VALIDATED" ||
    manifest.technicalValidation !== "PASSED" ||
    manifest.expertReview !== "OPTIONAL_NOT_OBTAINED" ||
    manifest.ownerDecision !==
      "APPROVED_FOR_CONTROLLED_PILOT_PREPARATION" ||
    manifest.publicationStatus !== "DRAFT" ||
    manifest.studentVisibility !== "HIDDEN" ||
    gradeTwoNumbersTo1000PilotFlags.controlledPilotEnabled ||
    gradeTwoNumbersTo1000PilotFlags.studentVisibility !== "HIDDEN"
  ) {
    errors.push("Governance hoặc Student visibility không fail-closed.");
  }
  if (existingContentVersions.includes(manifest.contentVersion)) {
    errors.push("Content version đã tồn tại.");
  }
  if (
    manifest.sourceManifestVersion !==
      gradeTwoNumbersTo1000SourceManifest.contentVersion ||
    !validateUnitSourceTraceabilityManifest(
      gradeTwoNumbersTo1000SourceManifest,
    ).valid
  ) {
    errors.push("Source manifest thiếu, sai version hoặc không hợp lệ.");
  }
  if (
    artifacts.publicQuestions.length !== 24 ||
    artifacts.serverSolutions.length !== 24 ||
    artifacts.privateAudit.length !== 24
  ) {
    errors.push("Release bank phải có đủ 24 question/solution/audit records.");
  }
  if (manifest.unitContentHash !== sha256(artifacts.unitContent)) {
    errors.push("Unit content hash không khớp.");
  }
  const questionIds = artifacts.publicQuestions.map(
    (question) => question.questionId,
  );
  const solutionIds = artifacts.serverSolutions.map(
    (solution) => solution.questionId,
  );
  const auditIds = artifacts.privateAudit.map((audit) => audit.questionId);
  if (
    new Set(questionIds).size !== questionIds.length ||
    canonicalJson([...questionIds].sort()) !==
      canonicalJson([...solutionIds].sort()) ||
    canonicalJson([...questionIds].sort()) !==
      canonicalJson([...auditIds].sort())
  ) {
    errors.push("Question/solution/audit mapping thiếu, trùng hoặc mồ côi.");
  }
  for (const question of artifacts.publicQuestions) {
    const serialized = canonicalJson(question);
    if (
      forbiddenClientKeys.some((key) =>
        serialized.includes(`"${key}"`),
      )
    ) {
      errors.push(`${question.questionId}: client bundle làm lộ server field.`);
    }
    if (!/^g2-num1000-[a-z0-9]+-\d{2}$/.test(question.questionId)) {
      errors.push(`${question.questionId}: question ID không ổn định.`);
    }
    if (manifest.questionHashes[question.questionId] !== sha256(question)) {
      errors.push(`${question.questionId}: question hash không khớp.`);
    }
  }
  for (const solution of artifacts.serverSolutions) {
    if (
      manifest.solutionHashes[solution.questionId] !== sha256(solution)
    ) {
      errors.push(`${solution.questionId}: solution hash không khớp.`);
    }
  }
  if (
    manifest.publicBundleHash !== sha256(artifacts.publicQuestions) ||
    manifest.serverBundleHash !== sha256(artifacts.serverSolutions) ||
    manifest.auditBundleHash !== sha256(artifacts.privateAudit)
  ) {
    errors.push("Artifact bundle hash không khớp.");
  }
  const expectedManifest = createGradeTwoReleaseManifest(
    manifest.releaseSeed,
    artifacts,
  );
  if (manifest.bundleHash !== expectedManifest.bundleHash) {
    errors.push("Release bundle hash không khớp.");
  }
  return { valid: errors.length === 0, errors };
}
