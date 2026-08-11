import { binary, buildExactWaveAPack, value, waveDifficulty } from "./wave-a-exact.ts";
import type { ExactQuestionSeed } from "./wave-a-exact.ts";

const operationSkill = "moet2018-g7-naa-p056-016";
const orderSkill = "moet2018-g7-naa-p056-007";
const sourceId = "grade-7-moet-2018-source-locked";

const additions = [
  [1, 2, 1, 3], [2, 3, -1, 4], [-3, 5, 1, 2], [5, 6, -2, 9],
  [7, 8, 1, 12], [-4, 7, -2, 5], [3, 10, 11, 15], [-5, 12, 7, 18],
] as const;
const subtractions = [
  [3, 4, 1, 6], [-2, 3, 1, 5], [7, 10, -3, 8], [-5, 6, -1, 4],
  [11, 12, 5, 9], [2, 7, 9, 14], [-1, 3, 5, 12], [13, 15, -2, 5],
] as const;
const productsAndQuotients = [
  ["MULTIPLY", 2, 3, -9, 10], ["DIVIDE", -3, 4, 5, 8],
  ["MULTIPLY", -7, 12, -6, 5], ["DIVIDE", 5, 9, -10, 27],
  ["MULTIPLY", 11, 14, 7, 22], ["DIVIDE", -4, 15, -8, 25],
  ["MULTIPLY", -9, 16, 8, 27], ["DIVIDE", 13, 18, -26, 45],
] as const;

const questions: ExactQuestionSeed[] = [
  ...additions.map(([a, b, c, d], index) => ({
    id: `g7-wave-a-rational-q${String(index + 1).padStart(2, "0")}`,
    blueprintId: "g7-wave-a-rational-foundational",
    skillId: operationSkill,
    prompt: `Tính và viết kết quả tối giản: ${a}/${b} + (${c}/${d}).`,
    answerType: "RATIONAL_INPUT" as const,
    derivation: binary("ADD", value(a, b), value(c, d)),
    explanationSteps: ["Quy đồng hai phân số.", "Cộng các tử số rồi rút gọn phân số nhận được."],
    difficulty: waveDifficulty(index),
    deterministicSeed: `g7-wave-a-add-${index + 1}`,
  })),
  ...subtractions.map(([a, b, c, d], index) => ({
    id: `g7-wave-a-rational-q${String(index + 9).padStart(2, "0")}`,
    blueprintId: "g7-wave-a-rational-core",
    skillId: operationSkill,
    prompt: `Tính và viết kết quả tối giản: ${a}/${b} - (${c}/${d}).`,
    answerType: "RATIONAL_INPUT" as const,
    derivation: binary("SUBTRACT", value(a, b), value(c, d)),
    explanationSteps: ["Quy đồng hai phân số.", "Trừ các tử số theo đúng thứ tự rồi rút gọn."],
    difficulty: waveDifficulty(index + 8),
    deterministicSeed: `g7-wave-a-subtract-${index + 1}`,
  })),
  ...productsAndQuotients.map(([op, a, b, c, d], index) => ({
    id: `g7-wave-a-rational-q${String(index + 17).padStart(2, "0")}`,
    blueprintId: "g7-wave-a-rational-extension",
    skillId: operationSkill,
    prompt: op === "MULTIPLY"
      ? `Tính và viết kết quả tối giản: ${a}/${b} × ${c}/${d}.`
      : `Tính và viết kết quả tối giản: ${a}/${b} : ${c}/${d}.`,
    answerType: "RATIONAL_INPUT" as const,
    derivation: binary(op, value(a, b), value(c, d)),
    explanationSteps: op === "MULTIPLY"
      ? ["Nhân tử với tử và mẫu với mẫu.", "Rút gọn phân số kết quả."]
      : ["Nhân phân số thứ nhất với nghịch đảo của phân số thứ hai.", "Rút gọn phân số kết quả."],
    difficulty: waveDifficulty(index + 16),
    deterministicSeed: `g7-wave-a-${op.toLowerCase()}-${index + 1}`,
  })),
];

export const gradeSevenWaveAPack = buildExactWaveAPack({
  grade: 7,
  packId: "grade-7-rational-operations-wave-a",
  packVersion: "g7-rational-operations-1.0.0-wave-a",
  candidateId: "g7-rational-operations-wave-a-rc1",
  policyVersion: "g7-rational-operations-policy-1.0.0-wave-a",
  selectedSliceId: "g7-rational-number-operations",
  selectionBasis: [
    "Official source-locked outcomes on rational-number order and operations.",
    "Exact rational arithmetic supports an independent derivation invariant.",
    "Text-only prompts avoid diagram and subjective free-text dependencies.",
  ],
  blueprints: [
    { id: "g7-wave-a-rational-foundational", grade: 7, skillId: operationSkill, difficulty: "FOUNDATIONAL", questionType: "RATIONAL_INPUT", templateId: "g7-wave-a-rational-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
    { id: "g7-wave-a-rational-core", grade: 7, skillId: operationSkill, difficulty: "CORE", questionType: "RATIONAL_INPUT", templateId: "g7-wave-a-rational-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
    { id: "g7-wave-a-rational-extension", grade: 7, skillId: operationSkill, difficulty: "EXTENSION", questionType: "RATIONAL_INPUT", templateId: "g7-wave-a-rational-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  ],
  questionSeeds: questions,
  prerequisites: [
    { fromSkillId: "moet2018-g6-naa-p049-040", toSkillId: operationSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: orderSkill, toSkillId: operationSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ],
});
