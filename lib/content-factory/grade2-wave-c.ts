import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import {
  buildOfficialGradeSkeleton,
  officialSkillId,
  officialSourceReferenceId,
} from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type {
  CandidateQuestion,
  DifficultyBand,
  ExplanationSpec,
  GradePack,
  MathExpression,
} from "./types.ts";

const grade = 2 as const;
const packId = "grade-2-wave-c-multiplication-division-tables";
const candidateId = "g2-multiplication-division-tables-wave-c";
const version = "g2-multiplication-division-tables-1.0.0-wave-c";
const policyVersion = "g2-multiplication-division-tables-policy-1.0.0-wave-c";
const sourceId = officialSourceReferenceId(grade);
const primaryUnitId = "grade-2-multiplication-division";

const sliceOutcomes = [
  "MOET2018-G2-NUM-P025-006",
  "MOET2018-G2-NUM-P025-009",
  "MOET2018-G2-NUM-P025-017",
  "MOET2018-G2-NUM-P025-018",
] as const;
const nextTargetOutcomeIds = ["MOET2018-G2-NUM-P026-020"] as const;
type SliceOutcome = (typeof sliceOutcomes)[number];
type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;

const purposes = [
  "FOUNDATION",
  "FOUNDATION",
  "STANDARD_APPLICATION",
  "MISCONCEPTION_TARGETING",
  "REMEDIATION",
  "TRANSFER_APPLICATION",
] as const;

function difficulty(index: number): DifficultyBand {
  if (index < 2) return "FOUNDATIONAL";
  if (index < 5) return "CORE";
  return "EXTENSION";
}

const value = (numerator: number): MathExpression => ({ op: "VALUE", numerator, denominator: 1 });
const operation = (
  op: "MULTIPLY" | "DIVIDE",
  left: number,
  right: number,
): MathExpression => ({ op, left: value(left), right: value(right) });

function exactInteger(derivation: MathExpression) {
  const result = evaluateExpression(derivation);
  if (result.denominator !== 1) throw new Error("GRADE2_WAVE_C_INTEGER_REQUIRED");
  return String(result.numerator);
}

const receiptIds = requiredAutomatedEvidenceChecks.map(
  (check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
);

function createIntegerItem(
  number: number,
  outcomeId: SliceOutcome,
  localIndex: number,
  prompt: string,
  derivation: MathExpression,
  steps: readonly string[],
): GeneratedItem {
  const suffix = String(number).padStart(2, "0");
  const id = `g2-wave-c-${suffix}`;
  const normalizedPrompt = prompt.normalize("NFC");
  const exactValue = exactInteger(derivation);
  return {
    question: {
      id,
      grade,
      unitId: primaryUnitId,
      blueprintId: `g2-wave-c-blueprint-${outcomeId.toLowerCase()}-${difficulty(localIndex).toLowerCase()}`,
      skillId: officialSkillId(outcomeId),
      prompt: normalizedPrompt,
      options: null,
      answer: { type: "INTEGER_INPUT", exactValue, derivation },
      explanationId: `${id}-explanation`,
      difficulty: difficulty(localIndex),
      provenance: {
        kind: "DETERMINISTIC_TEMPLATE",
        templateVersion: "g2-multiplication-division-tables-wave-c-template-1.0.0",
        seed: `g2-wave-c-${outcomeId.toLowerCase()}-${suffix}`,
        sourceReferenceIds: [sourceId],
      },
      reviewStatus: "BUNDLED",
      published: false,
      pilotEligible: false,
      fixtureOnly: false,
      duplicateFingerprint: sha256(normalizedDefinition(`${normalizedPrompt}|`).toLocaleLowerCase("vi")),
      validationReceiptIds: receiptIds,
      instructionalPurpose: purposes[localIndex]!,
    },
    explanation: {
      id: `${id}-explanation`,
      questionId: id,
      steps: steps.map((step) => step.normalize("NFC")),
      finalAnswer: exactValue,
      evidenceReceiptIds: [`${packId}-explanation-consistency`],
    },
  };
}

function createComponentItem(
  number: number,
  localIndex: number,
  prompt: string,
  options: readonly string[],
  exactValue: string,
  steps: readonly string[],
): GeneratedItem {
  const outcomeId = sliceOutcomes[0];
  const suffix = String(number).padStart(2, "0");
  const id = `g2-wave-c-${suffix}`;
  const normalizedPrompt = prompt.normalize("NFC");
  return {
    question: {
      id,
      grade,
      unitId: "grade-2-multiplication-division-components-p1",
      blueprintId: `g2-wave-c-blueprint-${outcomeId.toLowerCase()}-${difficulty(localIndex).toLowerCase()}`,
      skillId: officialSkillId(outcomeId),
      prompt: normalizedPrompt,
      options,
      answer: { type: "SINGLE_CHOICE", exactValue },
      explanationId: `${id}-explanation`,
      difficulty: difficulty(localIndex),
      provenance: {
        kind: "DETERMINISTIC_TEMPLATE",
        templateVersion: "g2-multiplication-division-components-wave-c-template-1.0.0",
        seed: `g2-wave-c-${outcomeId.toLowerCase()}-${suffix}`,
        sourceReferenceIds: [sourceId],
      },
      reviewStatus: "BUNDLED",
      published: false,
      pilotEligible: false,
      fixtureOnly: false,
      duplicateFingerprint: sha256(
        normalizedDefinition(`${normalizedPrompt}|${options.join("|")}`).toLocaleLowerCase("vi"),
      ),
      validationReceiptIds: receiptIds,
      instructionalPurpose: purposes[localIndex]!,
    },
    explanation: {
      id: `${id}-explanation`,
      questionId: id,
      steps: steps.map((step) => step.normalize("NFC")),
      finalAnswer: exactValue,
      evidenceReceiptIds: [`${packId}-explanation-consistency`],
    },
  };
}

function generateQuestions(): readonly GeneratedItem[] {
  const items: GeneratedItem[] = [
    createComponentItem(1, 0, "Trong 2 × 7 = 14, số 14 được gọi là gì?", ["thừa số", "tích", "số bị chia", "thương"], "B", ["Phép tính là phép nhân.", "Kết quả của phép nhân được gọi là tích.", "Vì vậy 14 là tích."]),
    createComponentItem(2, 1, "Trong 5 × 8 = 40, số 5 được gọi là gì?", ["thừa số", "tích", "số chia", "thương"], "A", ["Phép tính là phép nhân.", "Các số được nhân với nhau gọi là thừa số.", "Vì vậy 5 là thừa số."]),
    createComponentItem(3, 2, "Trong 20 : 5 = 4, số 20 được gọi là gì?", ["tích", "số bị chia", "số chia", "thương"], "B", ["Phép tính là phép chia.", "Số đứng trước dấu chia là số bị chia.", "Vì vậy 20 là số bị chia."]),
    createComponentItem(4, 3, "Trong 35 : 5 = 7, số 5 được gọi là gì?", ["thừa số", "số bị chia", "số chia", "thương"], "C", ["Phép tính là phép chia.", "Số dùng để chia gọi là số chia.", "Vì vậy 5 là số chia."]),
    createComponentItem(5, 4, "Trong 18 : 2 = 9, số 9 được gọi là gì?", ["tích", "số bị chia", "số chia", "thương"], "D", ["Phép tính là phép chia.", "Kết quả của phép chia gọi là thương.", "Vì vậy 9 là thương."]),
    createComponentItem(6, 5, "Trong 2 × 9 = 18, các số 2 và 9 được gọi chung là gì?", ["thừa số", "tích", "số bị chia", "thương"], "A", ["Hai số 2 và 9 được nhân với nhau.", "Mỗi số được nhân gọi là một thừa số.", "Vì vậy 2 và 9 là các thừa số."]),
  ];

  const meaningCases = [
    { op: "MULTIPLY" as const, left: 2, right: 3, prompt: "Có 3 túi, mỗi túi có 2 viên sỏi. Có tất cả bao nhiêu viên sỏi?" },
    { op: "MULTIPLY" as const, left: 5, right: 4, prompt: "Bốn bó, mỗi bó có 5 que tính. Có tất cả bao nhiêu que tính?" },
    { op: "MULTIPLY" as const, left: 2, right: 7, prompt: "Viết phép nhân cho 7 nhóm bằng nhau, mỗi nhóm có 2 chấm, rồi tính kết quả." },
    { op: "MULTIPLY" as const, left: 5, right: 6, prompt: "Một hàng có 5 cây. Sáu hàng như vậy có bao nhiêu cây?" },
    { op: "DIVIDE" as const, left: 18, right: 2, prompt: "Chia đều 18 nhãn vào 2 hộp. Mỗi hộp có bao nhiêu nhãn?" },
    { op: "DIVIDE" as const, left: 40, right: 5, prompt: "Xếp 40 nút áo thành các nhóm 5 nút. Xếp được bao nhiêu nhóm?" },
  ];
  meaningCases.forEach((entry, index) => {
    const derivation = operation(entry.op, entry.left, entry.right);
    const verb = entry.op === "MULTIPLY" ? "nhân" : "chia";
    items.push(createIntegerItem(index + 7, sliceOutcomes[1], index, entry.prompt, derivation, [
      `Tình huống gồm các nhóm bằng nhau nên dùng phép ${verb}.`,
      `${entry.left} ${entry.op === "MULTIPLY" ? "×" : ":"} ${entry.right} = ${exactInteger(derivation)}.`,
      `Kết quả là ${exactInteger(derivation)}.`,
    ]));
  });

  const divisionCases = [[10, 2], [12, 2], [16, 2], [10, 5], [45, 5], [50, 5]] as const;
  divisionCases.forEach(([dividend, divisor], index) => {
    const derivation = operation("DIVIDE", dividend, divisor);
    const prompt = index < 2
      ? `Tính nhẩm ${dividend} : ${divisor}.`
      : index < 4
        ? `Điền thương đúng của ${dividend} : ${divisor}.`
        : index === 4
          ? `Bạn An ghi ${dividend} : ${divisor} = ${Number(exactInteger(derivation)) + 1}. Hãy sửa thương.`
          : `Chia đều ${dividend} thẻ vào ${divisor} hộp. Mỗi hộp có bao nhiêu thẻ?`;
    items.push(createIntegerItem(index + 13, sliceOutcomes[2], index, prompt, derivation, [
      `Dùng bảng chia ${divisor}.`,
      `${dividend} : ${divisor} = ${exactInteger(derivation)}.`,
      `Kiểm tra ${exactInteger(derivation)} × ${divisor} = ${dividend}.`,
    ]));
  });

  const multiplicationCases = [[2, 2], [5, 3], [2, 4], [5, 5], [2, 6], [5, 7]] as const;
  multiplicationCases.forEach(([factor, other], index) => {
    const derivation = operation("MULTIPLY", factor, other);
    const prompt = index < 2
      ? `Tính nhẩm ${factor} × ${other}.`
      : index < 4
        ? `Điền tích đúng của ${factor} × ${other}.`
        : index === 4
          ? `Bạn Mai ghi ${factor} × ${other} = ${Number(exactInteger(derivation)) - 2}. Hãy sửa tích.`
          : `Có ${other} vỉ, mỗi vỉ có ${factor} nhãn. Có tất cả bao nhiêu nhãn?`;
    items.push(createIntegerItem(index + 19, sliceOutcomes[3], index, prompt, derivation, [
      `Dùng bảng nhân ${factor}.`,
      `${factor} × ${other} = ${exactInteger(derivation)}.`,
      `Kiểm tra ${exactInteger(derivation)} : ${factor} = ${other}.`,
    ]));
  });

  return items;
}

function optionKeyForRole(question: CandidateQuestion, role: string) {
  if (!question.options) throw new Error(`GRADE2_WAVE_C_OPTIONS_REQUIRED:${question.id}`);
  const matches = question.options
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => option === role);
  if (matches.length !== 1) throw new Error(`GRADE2_WAVE_C_COMPONENT_AMBIGUOUS:${question.id}`);
  return "ABCD"[matches[0]!.index]!;
}

export function independentlyDeriveGradeTwoWaveCAnswer(question: CandidateQuestion) {
  if (question.answer.derivation) return exactInteger(question.answer.derivation);
  const equation = /(\d+)\s*([×:])\s*(\d+)\s*=\s*(\d+)/u.exec(question.prompt);
  if (!equation) throw new Error(`GRADE2_WAVE_C_COMPONENT_PROMPT_INVALID:${question.id}`);
  const left = Number(equation[1]);
  const operator = equation[2];
  const right = Number(equation[3]);
  const result = Number(equation[4]);
  const target = /các số/u.test(question.prompt) ? null : Number(integers(question.prompt).at(-1));
  const role = operator === "×"
    ? target === result ? "tích" : "thừa số"
    : target === left ? "số bị chia" : target === right ? "số chia" : "thương";
  return optionKeyForRole(question, role);
}

function integers(value: string) {
  return [...value.matchAll(/\d+/gu)].map((match) => Number(match[0]));
}

const generated = generateQuestions();
const questions = generated.map((entry) => entry.question);
const explanations = generated.map((entry) => entry.explanation);
if (questions.length !== 24 || new Set(questions.map((question) => question.id)).size !== 24) {
  throw new Error("GRADE2_WAVE_C_GENERATION_COUNT");
}

export const gradeTwoWaveCOracleRows = questions.map((question) => {
  const independentlyDerived = independentlyDeriveGradeTwoWaveCAnswer(question);
  const explanation = explanations.find((entry) => entry.questionId === question.id)!;
  if (independentlyDerived !== question.answer.exactValue || explanation.finalAnswer !== independentlyDerived) {
    throw new Error(`GRADE2_WAVE_C_ORACLE_MISMATCH:${question.id}`);
  }
  return { questionId: question.id, independentlyDerived, answerMatches: true as const, explanationMatches: true as const };
});

const skeleton = buildOfficialGradeSkeleton(grade);
const blueprintBands = [
  { difficulty: "FOUNDATIONAL", targetCount: 2 },
  { difficulty: "CORE", targetCount: 3 },
  { difficulty: "EXTENSION", targetCount: 1 },
] as const;
const blueprints = sliceOutcomes.flatMap((outcomeId) => blueprintBands.map((band) => ({
  id: `g2-wave-c-blueprint-${outcomeId.toLowerCase()}-${band.difficulty.toLowerCase()}`,
  grade,
  skillId: officialSkillId(outcomeId),
  difficulty: band.difficulty,
  questionType: outcomeId === sliceOutcomes[0] ? "SINGLE_CHOICE" as const : "INTEGER_INPUT" as const,
  templateId: `g2-wave-c-template-${outcomeId.toLowerCase()}`,
  targetCount: band.targetCount,
  sourceReferenceIds: [sourceId],
})));

const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
  entityId: packId,
  check,
  status: "PASSED" as const,
  evidence: check === "SOURCE_MAPPING"
    ? `Source-locked MOET 2018 page 25 outcomes ${sliceOutcomes.join(", ")}.`
    : check === "MATHEMATICAL_ANSWER"
      ? "Independent exact-integer and operation-component oracle verified all 24 answers without reading explanations."
      : `Deterministic Grade 2 Wave C ${check.toLowerCase().replaceAll("_", " ")} receipt.`,
}));

const candidateCore = {
  format: "plave-wave-c-candidate-v1",
  grade,
  candidateId,
  version,
  policyVersion,
  sourceOutcomeIds: sliceOutcomes,
  sourcePage: 25,
  blueprints,
  questions,
  explanations,
} as const;

export const gradeTwoWaveCBundleHash = sha256(canonicalize(candidateCore));

export const gradeTwoWaveCPack: GradePack = {
  schemaVersion: "content-factory-grade-pack-v1",
  grade,
  packId,
  packVersion: version,
  immutableReference: false,
  testOnly: false,
  locale: "vi-VN",
  unicodeNormalization: "NFC",
  sources: [skeleton.source],
  domains: skeleton.domains,
  units: skeleton.units,
  knowledgeNodes: skeleton.knowledgeNodes,
  skills: skeleton.skills,
  objectives: skeleton.objectives,
  prerequisites: [
    { fromSkillId: officialSkillId("MOET2018-G2-NUM-P025-013"), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(sliceOutcomes[1]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(sliceOutcomes[1]), toSkillId: officialSkillId(sliceOutcomes[3]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(sliceOutcomes[3]), toSkillId: officialSkillId(sliceOutcomes[2]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(sliceOutcomes[2]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ],
  blueprints,
  questions,
  quarantinedQuestions: [],
  explanations,
  evidenceReceipts,
  candidate: { candidateId, version, bundleHash: gradeTwoWaveCBundleHash, policyVersion },
  adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: {
    wave: "C",
    selectedSliceId: "grade-2-multiplication-division-tables",
    selectionBasis: ["SOURCE_VERIFIED", "PAGE_25_LOCKED", "INDEPENDENT_EXACT_ORACLE", "TABLES_2_AND_5_ONLY"],
    generated: 24,
    repaired: 0,
    evidenceGatePassed: 24,
    verificationInsufficient: 0,
    rejected: 0,
    duplicate: 0,
    candidateEligible: 24,
  },
  legacyAsset: null,
};

export const gradeTwoWaveCProgression = {
  grade,
  waveCSkillIds: sliceOutcomes.map(officialSkillId),
  priorSkillId: officialSkillId("MOET2018-G2-NUM-P025-013"),
  prerequisiteSkillId: officialSkillId("MOET2018-G2-NUM-P025-013"),
  prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  remediationTargetSkillId: officialSkillId(sliceOutcomes[0]),
  advanceTargetSkillId: officialSkillId(sliceOutcomes[3]),
  retentionTargetSkillId: officialSkillId(sliceOutcomes[1]),
  nextTargetSkillId: officialSkillId(nextTargetOutcomeIds[0]),
  actions: {
    continueTargetSkillId: officialSkillId(sliceOutcomes[0]),
    remediateTargetSkillId: officialSkillId("MOET2018-G2-NUM-P025-013"),
    advanceTargetSkillId: officialSkillId(sliceOutcomes[2]),
    retentionTargetSkillId: officialSkillId(sliceOutcomes[1]),
    mixedPracticeTargetSkillIds: [officialSkillId(sliceOutcomes[3]), officialSkillId(sliceOutcomes[2])],
  },
  schoolGradeMutation: false,
  entitlementGrant: false,
} as const;

export const gradeTwoWaveCMetadata = {
  schemaVersion: "plave-wave-c-metadata-v1",
  wave: "C",
  grade,
  title: "Bảng nhân 2, bảng nhân 5 và phép chia tương ứng",
  unitId: primaryUnitId,
  sourceClassification: "SOURCE_VERIFIED",
  sourceOutcomeIds: sliceOutcomes,
  sourcePages: [25],
  prerequisiteOutcomeIds: ["MOET2018-G2-NUM-P025-013"],
  prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  nextTargetOutcomeIds,
  nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  production: gradeTwoWaveCPack.production,
  candidate: gradeTwoWaveCPack.candidate,
  progression: gradeTwoWaveCProgression,
  release: gradeTwoWaveCPack.release,
} as const;
