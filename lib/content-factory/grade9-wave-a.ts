import { binary, buildExactWaveAPack, value, waveDifficulty } from "./wave-a-exact.ts";
import type { ExactQuestionSeed } from "./wave-a-exact.ts";

const systemSolveSkill = "moet2018-g9-naa-p072-010";
const appliedSystemSkill = "moet2018-g9-naa-p072-014";
const systemConceptSkill = "moet2018-g9-naa-p072-019";
const systemSolutionMeaningSkill = "moet2018-g9-naa-p072-017";
const gradeEightEquationSkill = "moet2018-g8-naa-p065-024";
const sourceId = "grade-9-moet-2018-source-locked";

const purpose = (index: number): ExactQuestionSeed["instructionalPurpose"] => {
  const withinBand = index % 8;
  if (withinBand < 2) return "FOUNDATION";
  if (withinBand < 4) return "STANDARD_APPLICATION";
  if (withinBand < 6) return "MISCONCEPTION_TARGETING";
  if (withinBand === 6) return "REMEDIATION";
  return "TRANSFER_APPLICATION";
};

function questionSeed(index: number): ExactQuestionSeed {
  const number = index + 1;
  const suffix = String(number).padStart(2, "0");
  const difficulty = waveDifficulty(index);
  const x = (index % 2 === 0 ? 1 : -1) * (2 + index);
  const y = (index % 3 === 0 ? -1 : 1) * (1 + (index % 9));
  const family = index % 4;
  const blueprintTier = difficulty === "FOUNDATIONAL"
    ? "foundational"
    : difficulty === "CORE"
      ? "core"
      : "extension";
  const common = {
    id: `g9-wave-a-system-q${suffix}`,
    blueprintId: family === 3
      ? `g9-wave-a-applied-${blueprintTier}`
      : `g9-wave-a-system-${blueprintTier}`,
    answerType: "INTEGER_INPUT" as const,
    difficulty,
    deterministicSeed: `g9-wave-a-system-${number}`,
    instructionalPurpose: purpose(index),
  };

  if (family === 0) {
    const sum = x + y;
    const difference = x - y;
    return {
      ...common,
      skillId: systemSolveSkill,
      prompt: `Cho hệ x + y = ${sum} và x - y = ${difference}. Tính x.`,
      derivation: binary("DIVIDE", binary("ADD", value(sum), value(difference)), value(2)),
      explanationSteps: [
        "Cộng hai phương trình để khử y.",
        "Chia kết quả cho 2 rồi thế x vào cả hai phương trình để kiểm tra.",
      ],
    };
  }

  if (family === 1) {
    const firstCoefficient = 2 + (index % 4);
    const secondCoefficient = 1 + (index % 3);
    const firstRight = firstCoefficient * x + y;
    const secondRight = secondCoefficient * x - y;
    return {
      ...common,
      skillId: systemSolveSkill,
      prompt: `Cho hệ ${firstCoefficient}x + y = ${firstRight} và ${secondCoefficient}x - y = ${secondRight}. Tính x.`,
      derivation: binary(
        "DIVIDE",
        binary("ADD", value(firstRight), value(secondRight)),
        value(firstCoefficient + secondCoefficient),
      ),
      explanationSteps: [
        "Cộng hai phương trình để hai hạng tử y triệt tiêu.",
        `Chia cho ${firstCoefficient + secondCoefficient} rồi thế x trở lại để kiểm tra y.`,
      ],
    };
  }

  if (family === 2) {
    const firstCoefficient = 2 + (index % 3);
    const secondCoefficient = 1 + (index % 4);
    const firstRight = x + firstCoefficient * y;
    const secondRight = x - secondCoefficient * y;
    return {
      ...common,
      skillId: systemSolveSkill,
      prompt: `Cho hệ x + ${firstCoefficient}y = ${firstRight} và x - ${secondCoefficient}y = ${secondRight}. Tính y.`,
      derivation: binary(
        "DIVIDE",
        binary("SUBTRACT", value(firstRight), value(secondRight)),
        value(firstCoefficient + secondCoefficient),
      ),
      explanationSteps: [
        "Lấy phương trình thứ nhất trừ phương trình thứ hai để khử x.",
        `Chia cho ${firstCoefficient + secondCoefficient} rồi thế y vào cả hai phương trình.`,
      ],
    };
  }

  const totalItems = Math.abs(x) + Math.abs(y) + 12;
  const firstPrice = 2 + (index % 4);
  const secondPrice = firstPrice + 3 + (index % 3);
  const firstCount = 3 + (index % 7);
  const secondCount = totalItems - firstCount;
  const totalValue = firstPrice * firstCount + secondPrice * secondCount;
  return {
    ...common,
    skillId: appliedSystemSkill,
    prompt: `Có ${totalItems} món gồm loại ${firstPrice} điểm và loại ${secondPrice} điểm, tổng cộng ${totalValue} điểm. Có bao nhiêu món loại ${firstPrice} điểm?`,
    derivation: binary(
      "DIVIDE",
      binary("SUBTRACT", value(secondPrice * totalItems), value(totalValue)),
      value(secondPrice - firstPrice),
    ),
    explanationSteps: [
      `Gọi số món loại ${firstPrice} điểm là x; loại còn lại là ${totalItems} - x.`,
      "Lập hệ từ tổng số món và tổng điểm, khử một ẩn rồi kiểm tra cả hai tổng.",
    ],
  };
}

const questions = Array.from({ length: 24 }, (_, index) => questionSeed(index));

export const gradeNineWaveAPack = buildExactWaveAPack({
  grade: 9,
  packId: "grade-9-linear-systems-wave-a",
  packVersion: "g9-linear-systems-1.0.0-wave-a",
  candidateId: "g9-linear-systems-wave-a-rc1",
  policyVersion: "g9-linear-systems-policy-1.0.0-wave-a",
  selectedSliceId: "g9-two-variable-linear-systems",
  selectionBasis: [
    "Official source-locked outcomes cover solving and applying two-variable linear systems.",
    "Four elimination and application structures have exact integer invariants.",
    "Text-only prompts avoid diagram interpretation and subjective free-text grading.",
  ],
  blueprints: [
    { id: "g9-wave-a-system-foundational", grade: 9, skillId: systemSolveSkill, difficulty: "FOUNDATIONAL", questionType: "INTEGER_INPUT", templateId: "g9-wave-a-system-template-v2", targetCount: 6, sourceReferenceIds: [sourceId] },
    { id: "g9-wave-a-system-core", grade: 9, skillId: systemSolveSkill, difficulty: "CORE", questionType: "INTEGER_INPUT", templateId: "g9-wave-a-system-template-v2", targetCount: 6, sourceReferenceIds: [sourceId] },
    { id: "g9-wave-a-system-extension", grade: 9, skillId: systemSolveSkill, difficulty: "EXTENSION", questionType: "INTEGER_INPUT", templateId: "g9-wave-a-system-template-v2", targetCount: 6, sourceReferenceIds: [sourceId] },
    { id: "g9-wave-a-applied-foundational", grade: 9, skillId: appliedSystemSkill, difficulty: "FOUNDATIONAL", questionType: "INTEGER_INPUT", templateId: "g9-wave-a-applied-template-v2", targetCount: 2, sourceReferenceIds: [sourceId] },
    { id: "g9-wave-a-applied-core", grade: 9, skillId: appliedSystemSkill, difficulty: "CORE", questionType: "INTEGER_INPUT", templateId: "g9-wave-a-applied-template-v2", targetCount: 2, sourceReferenceIds: [sourceId] },
    { id: "g9-wave-a-applied-extension", grade: 9, skillId: appliedSystemSkill, difficulty: "EXTENSION", questionType: "INTEGER_INPUT", templateId: "g9-wave-a-applied-template-v2", targetCount: 2, sourceReferenceIds: [sourceId] },
  ],
  questionSeeds: questions,
  prerequisites: [
    { fromSkillId: gradeEightEquationSkill, toSkillId: systemConceptSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: systemConceptSkill, toSkillId: systemSolutionMeaningSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: systemSolutionMeaningSkill, toSkillId: systemSolveSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: systemSolveSkill, toSkillId: appliedSystemSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ],
});
