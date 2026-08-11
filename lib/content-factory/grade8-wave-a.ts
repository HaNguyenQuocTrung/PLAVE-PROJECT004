import { binary, buildExactWaveAPack, value, waveDifficulty } from "./wave-a-exact.ts";
import type { ExactQuestionSeed } from "./wave-a-exact.ts";

const equationSkill = "moet2018-g8-naa-p065-024";
const appliedEquationSkill = "moet2018-g8-naa-p065-023";
const algebraPropertiesSkill = "moet2018-g8-naa-p064-020";
const gradeSevenOperationsSkill = "moet2018-g7-naa-p056-016";
const sourceId = "grade-8-moet-2018-source-locked";

const signedTerm = (valueToFormat: number) =>
  valueToFormat < 0 ? `- ${Math.abs(valueToFormat)}` : `+ ${valueToFormat}`;

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
  const family = index % 4;
  const x = family === 3 ? 3 + index : (index % 2 === 0 ? 1 : -1) * (3 + index);
  const blueprintTier = difficulty === "FOUNDATIONAL"
    ? "foundational"
    : difficulty === "CORE"
      ? "core"
      : "extension";
  const common = {
    id: `g8-wave-a-linear-q${suffix}`,
    blueprintId: family === 3
      ? `g8-wave-a-applied-${blueprintTier}`
      : `g8-wave-a-linear-${blueprintTier}`,
    answerType: "INTEGER_INPUT" as const,
    difficulty,
    deterministicSeed: `g8-wave-a-linear-${number}`,
    instructionalPurpose: purpose(index),
  };

  if (family === 0) {
    const coefficient = 2 + (index % 5);
    const constant = 3 - (index % 7);
    const right = coefficient * x + constant;
    return {
      ...common,
      skillId: equationSkill,
      prompt: `Giải phương trình ${coefficient}x ${signedTerm(constant)} = ${right}.`,
      derivation: binary(
        "DIVIDE",
        binary("SUBTRACT", value(right), value(constant)),
        value(coefficient),
      ),
      explanationSteps: [
        `Dùng phép tính ngược để tách ${coefficient}x khỏi hằng số ${constant}.`,
        `Chia hai vế cho ${coefficient}, rồi thế nghiệm vào phương trình ban đầu để kiểm tra.`,
      ],
    };
  }

  if (family === 1) {
    const leftCoefficient = 5 + (index % 4);
    const rightCoefficient = 1 + (index % 3);
    const leftConstant = 2 - (index % 6);
    const rightConstant = (leftCoefficient - rightCoefficient) * x + leftConstant;
    return {
      ...common,
      skillId: equationSkill,
      prompt: `Giải phương trình ${leftCoefficient}x ${signedTerm(leftConstant)} = ${rightCoefficient}x ${signedTerm(rightConstant)}.`,
      derivation: binary(
        "DIVIDE",
        binary("SUBTRACT", value(rightConstant), value(leftConstant)),
        value(leftCoefficient - rightCoefficient),
      ),
      explanationSteps: [
        "Chuyển các hạng tử chứa x về một vế và các hằng số về vế còn lại.",
        `Chia cho hệ số ${leftCoefficient - rightCoefficient} của x, rồi kiểm tra hai vế bằng phép thế.`,
      ],
    };
  }

  if (family === 2) {
    const outside = 2 + (index % 4);
    const inside = 1 - (index % 5);
    const right = outside * (x + inside);
    return {
      ...common,
      skillId: equationSkill,
      prompt: `Giải phương trình ${outside}(x ${signedTerm(inside)}) = ${right}.`,
      derivation: binary(
        "SUBTRACT",
        binary("DIVIDE", value(right), value(outside)),
        value(inside),
      ),
      explanationSteps: [
        `Chia hai vế cho ${outside} để tìm giá trị của biểu thức trong ngoặc.`,
        `Dùng phép tính ngược với ${inside}, rồi thế nghiệm vào biểu thức ban đầu.`,
      ],
    };
  }

  const boxes = 2 + (index % 5);
  const fixed = 4 + (index % 6);
  const total = boxes * x + fixed;
  return {
    ...common,
    skillId: appliedEquationSkill,
    prompt: `${boxes} hộp có cùng số thẻ. Thêm ${fixed} thẻ rời thì có ${total} thẻ. Mỗi hộp có bao nhiêu thẻ?`,
    derivation: binary(
      "DIVIDE",
      binary("SUBTRACT", value(total), value(fixed)),
      value(boxes),
    ),
    explanationSteps: [
      `Bớt ${fixed} thẻ rời khỏi tổng ${total} để tìm số thẻ trong các hộp.`,
      `Chia đều phần còn lại cho ${boxes} hộp và kiểm tra bằng ${boxes}x + ${fixed} = ${total}.`,
    ],
  };
}

const questions = Array.from({ length: 24 }, (_, index) => questionSeed(index));

export const gradeEightWaveAPack = buildExactWaveAPack({
  grade: 8,
  packId: "grade-8-linear-equations-wave-a",
  packVersion: "g8-linear-equations-1.0.0-wave-a",
  candidateId: "g8-linear-equations-wave-a-rc1",
  policyVersion: "g8-linear-equations-policy-1.0.0-wave-a",
  selectedSliceId: "g8-first-degree-equations",
  selectionBasis: [
    "Official source-locked outcomes for first-degree equations and deterministic applied problems.",
    "Four equation structures are independently checked by inverse operations and substitution.",
    "Text-only integer equations avoid unsupported visual and free-text grading.",
  ],
  blueprints: [
    { id: "g8-wave-a-linear-foundational", grade: 8, skillId: equationSkill, difficulty: "FOUNDATIONAL", questionType: "INTEGER_INPUT", templateId: "g8-wave-a-linear-template-v2", targetCount: 6, sourceReferenceIds: [sourceId] },
    { id: "g8-wave-a-linear-core", grade: 8, skillId: equationSkill, difficulty: "CORE", questionType: "INTEGER_INPUT", templateId: "g8-wave-a-linear-template-v2", targetCount: 6, sourceReferenceIds: [sourceId] },
    { id: "g8-wave-a-linear-extension", grade: 8, skillId: equationSkill, difficulty: "EXTENSION", questionType: "INTEGER_INPUT", templateId: "g8-wave-a-linear-template-v2", targetCount: 6, sourceReferenceIds: [sourceId] },
    { id: "g8-wave-a-applied-foundational", grade: 8, skillId: appliedEquationSkill, difficulty: "FOUNDATIONAL", questionType: "INTEGER_INPUT", templateId: "g8-wave-a-applied-template-v2", targetCount: 2, sourceReferenceIds: [sourceId] },
    { id: "g8-wave-a-applied-core", grade: 8, skillId: appliedEquationSkill, difficulty: "CORE", questionType: "INTEGER_INPUT", templateId: "g8-wave-a-applied-template-v2", targetCount: 2, sourceReferenceIds: [sourceId] },
    { id: "g8-wave-a-applied-extension", grade: 8, skillId: appliedEquationSkill, difficulty: "EXTENSION", questionType: "INTEGER_INPUT", templateId: "g8-wave-a-applied-template-v2", targetCount: 2, sourceReferenceIds: [sourceId] },
  ],
  questionSeeds: questions,
  prerequisites: [
    { fromSkillId: gradeSevenOperationsSkill, toSkillId: equationSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: algebraPropertiesSkill, toSkillId: equationSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: equationSkill, toSkillId: appliedEquationSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ],
});
