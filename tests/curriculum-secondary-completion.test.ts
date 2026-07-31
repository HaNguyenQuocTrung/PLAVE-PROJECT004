import assert from "node:assert/strict";
import test from "node:test";

import {
  checkPreviewAnswer,
  generatePreviewUnit,
} from "../lib/curriculum/engine.ts";
import { curriculumUnits } from "../lib/curriculum/registry.ts";
import {
  grade7RemainingTargetOutcomeIds,
  grade8CompletionTargetOutcomeIds,
  grade9CompletionTargetOutcomeIds,
} from "../lib/curriculum/secondary-completion.ts";
import {
  validateCurriculumRegistry,
  validatePreviewUnit,
} from "../lib/curriculum/validation.ts";
import type {
  PreviewAudit,
  PreviewUnitDraft,
} from "../lib/curriculum/types.ts";

const targetByGrade = new Map([
  [7, grade7RemainingTargetOutcomeIds],
  [8, grade8CompletionTargetOutcomeIds],
  [9, grade9CompletionTargetOutcomeIds],
] as const);
const completionKinds = new Set([
  "GRADE7_OUTCOME_COMPLETION",
  "GRADE8_OUTCOME_COMPLETION",
  "GRADE9_OUTCOME_COMPLETION",
]);
const units = curriculumUnits.filter(
  (unit) =>
    unit.grade >= 7 &&
    completionKinds.has(unit.kind) &&
    unit.slug !== "grade-7-rational-number-foundations-p1",
);

function raw(audit: PreviewAudit, name: string) {
  const value = audit.parameters.find((item) => item.name === name)?.value;
  assert.notEqual(value, undefined, `${audit.questionCode}/${name}`);
  return value;
}

function numeric(audit: PreviewAudit, name: string) {
  return Number(raw(audit, name));
}

function answerLabel(draft: PreviewUnitDraft, audit: PreviewAudit) {
  const question = draft.questions.find(
    (candidate) => candidate.code === audit.questionCode,
  );
  const solution = draft.solutions.find(
    (candidate) => candidate.questionCode === audit.questionCode,
  );
  assert.ok(question);
  assert.ok(solution);
  if (!question.options) return solution.correctAnswer;
  const option = question.options.find(
    (candidate) => candidate.key === solution.correctAnswer,
  );
  assert.ok(option);
  return option.label;
}

function independentlyRecompute(audit: PreviewAudit) {
  const names = new Set(audit.parameters.map((item) => item.name));
  if (names.has("semanticRule")) {
    const rule = String(raw(audit, "semanticRule"));
    const conceptual: Readonly<Record<string, string>> = {
      POLYNOMIAL_ROOT: "có",
      NUMERICAL_EXPRESSION: "3²−5",
      ALGEBRAIC_EXPRESSION: "3x−5",
      IDENTITY: "(x+1)²=x²+2x+1",
      FUNCTION_DEFINITION: "mỗi đầu vào có đúng một đầu ra",
      VALID_TRIANGLE: "có",
      POINT_LINE_DISTANCE: "đoạn vuông góc từ A đến d",
      PARALLELOGRAM_DIAGONALS:
        "hai đường chéo cắt nhau tại trung điểm mỗi đường",
      RHOMBUS_DIAGONALS: "vuông góc và là phân giác các góc",
      SINE_3_4_5: "3/5",
      LINE_CIRCLE_TANGENT: "tiếp xúc",
      TWO_CIRCLES_EXTERNAL_TANGENT: "tiếp xúc ngoài",
      TANGENT_RADIUS: "90°",
      CHOOSE_COLUMN_CHART: "biểu đồ cột",
      DATA_COLLECTION_PROTOCOL:
        "ghi nguồn, tiêu chí phân loại và đủ từng câu trả lời",
      BANK_STATEMENT_NET: "tăng 380 000 đồng",
      INSURANCE_PREMIUM: "phí bảo hiểm",
      CHEMICAL_BALANCE_MODEL: "số nguyên tử H và O bằng nhau ở hai vế",
      MODELLING_ASSUMPTIONS: "nêu biến, đơn vị và giả định",
      CONE_ELEMENTS: "đỉnh, đường sinh, chiều cao, bán kính đáy",
      CYLINDER_ELEMENTS: "hai đáy tròn, bán kính, chiều cao, đường sinh",
      SPHERE_ELEMENTS: "tâm và bán kính",
      CUBOID_ELEMENTS: "8 đỉnh, 12 cạnh, 6 mặt",
    };
    if (rule.startsWith("DENOMINATOR_")) {
      return `x≠${rule.slice("DENOMINATOR_".length)}`;
    }
    if (rule.startsWith("INVALID_DATA_TOTAL_")) {
      const [, , , left, right] = rule.split("_");
      return `tổng bị sai vì ${left}+${right}=${Number(left) + Number(right)}`;
    }
    const expected = conceptual[rule];
    assert.notEqual(expected, undefined, `Unknown semantic rule ${rule}`);
    return expected;
  }
  if (names.has("radicand")) return String(numeric(audit, "root"));
  if (names.has("exponent")) {
    return String(numeric(audit, "base") ** numeric(audit, "exponent"));
  }
  if (names.has("degree")) return String(numeric(audit, "degree"));
  if (names.has("excluded")) return `x≠${numeric(audit, "excluded")}`;
  if (names.has("slope")) return String(numeric(audit, "slope"));
  if (names.has("coordinateX")) {
    return `(${numeric(audit, "coordinateX")};${numeric(audit, "coordinateY")})`;
  }
  if (names.has("systemX")) {
    return `x=${numeric(audit, "systemX")}, y=${numeric(audit, "systemY")}`;
  }
  if (names.has("quadraticRoot1")) {
    return `x=${numeric(audit, "quadraticRoot1")} hoặc x=${numeric(audit, "quadraticRoot2")}`;
  }
  if (names.has("left")) return "<";
  if (names.has("value")) return String(numeric(audit, "value"));
  if (names.has("part")) {
    return `${numeric(audit, "a") * numeric(audit, "part")} và ${
      numeric(audit, "b") * numeric(audit, "part")
    }`;
  }
  if (names.has("y")) return String(numeric(audit, "y"));
  if (names.has("root")) return String(numeric(audit, "root"));
  if (names.has("boundary")) return `x>${numeric(audit, "boundary")}`;
  if (names.has("volume")) return `${numeric(audit, "volume")} dm³`;
  if (names.has("coneVolumeFactor")) {
    return `${numeric(audit, "coneVolumeFactor")}π cm³`;
  }
  if (names.has("cylinderVolumeFactor")) {
    return `${numeric(audit, "cylinderVolumeFactor")}π cm³`;
  }
  if (names.has("sphereVolumeFactor")) {
    return `${numeric(audit, "sphereVolumeFactor")}π cm³`;
  }
  if (names.has("halfAngle")) return `${numeric(audit, "halfAngle")}°`;
  if (names.has("pythagoreanHypotenuse")) {
    return `${numeric(audit, "pythagoreanHypotenuse")} cm`;
  }
  if (names.has("quadrilateralAngle")) {
    return `${numeric(audit, "quadrilateralAngle")}°`;
  }
  if (names.has("centralAngle")) return `${numeric(audit, "centralAngle")}°`;
  if (names.has("arcLengthFactor")) {
    return `${numeric(audit, "arcLengthFactor")}π cm`;
  }
  if (names.has("angle")) return `${numeric(audit, "angle")}°`;
  if (names.has("large")) return `${numeric(audit, "large")} cm`;
  if (names.has("diameter")) return `${numeric(audit, "diameter")} cm`;
  if (names.has("frequency")) return String(numeric(audit, "frequency"));
  if (names.has("relativeFrequencyCount")) {
    return String(
      numeric(audit, "relativeFrequencyCount") /
        numeric(audit, "relativeFrequencyTotal"),
    ).replace(".", ",");
  }
  if (names.has("success")) {
    return String(
      numeric(audit, "success") / numeric(audit, "trials"),
    ).replace(".", ",");
  }
  if (names.has("interest")) return `${numeric(audit, "interest")} đồng`;
  if (names.has("tax")) return `${numeric(audit, "tax")} đồng`;
  if (names.has("trials")) {
    return "kiểm tra ràng buộc, nhãn và thang vẫn đúng";
  }
  if (names.has("time")) return `${numeric(audit, "time")} giờ`;
  assert.fail(`No independent recomputation contract for ${audit.questionCode}`);
}

test("Grades 7–9 map all 185 exact remaining official outcomes once", () => {
  assert.deepEqual(validateCurriculumRegistry(), { valid: true, errors: [] });
  assert.equal(grade7RemainingTargetOutcomeIds.length, 55);
  assert.equal(grade8CompletionTargetOutcomeIds.length, 61);
  assert.equal(grade9CompletionTargetOutcomeIds.length, 69);
  assert.equal(units.length, 50);
  for (const [grade, targetIds] of targetByGrade) {
    const gradeUnits = units.filter((unit) => unit.grade === grade);
    assert.deepEqual(
      gradeUnits.flatMap((unit) => unit.officialOutcomeIds).sort(),
      [...targetIds].sort(),
    );
    assert.equal(new Set(targetIds).size, targetIds.length);
  }
});

test("Every secondary outcome has direct teaching, example and diverse primary evidence", () => {
  let seedSensitive = 0;
  for (const unit of units) {
    assert.ok(unit.theory.length >= 4 && unit.theory.length <= 6);
    assert.ok(unit.examples.length >= 2);
    const draft = generatePreviewUnit(unit.slug);
    assert.deepEqual(validatePreviewUnit(draft), { valid: true, errors: [] });
    assert.deepEqual(draft, generatePreviewUnit(unit.slug));
    if (
      JSON.stringify(draft.questions) !==
      JSON.stringify(
        generatePreviewUnit(unit.slug, "secondary-semantic-variant").questions,
      )
    ) {
      seedSensitive += 1;
    }
    for (const outcomeId of unit.officialOutcomeIds) {
      assert.ok(
        unit.theory.some((section) =>
          section.officialOutcomeIds?.includes(outcomeId),
        ),
        `${outcomeId}/theory`,
      );
      assert.ok(
        unit.examples.some((example) =>
          example.officialOutcomeIds?.includes(outcomeId),
        ),
        `${outcomeId}/example`,
      );
      const audits = draft.audits.filter(
        (audit) => audit.primaryOfficialOutcomeId === outcomeId,
      );
      const codes = new Set(audits.map((audit) => audit.questionCode));
      const questions = draft.questions.filter((question) =>
        codes.has(question.code),
      );
      const solutions = draft.solutions.filter((solution) =>
        codes.has(solution.questionCode),
      );
      assert.ok(audits.length >= 3, `${outcomeId}/primary-questions`);
      assert.ok(
        new Set(audits.map((audit) => audit.evidenceForm)).size >= 2,
        `${outcomeId}/evidence-forms`,
      );
      assert.ok(
        new Set(questions.map((question) => question.answerType)).size >= 2,
        `${outcomeId}/answer-types`,
      );
      assert.equal(
        new Set(questions.map((question) => question.prompt)).size,
        questions.length,
        `${outcomeId}/prompt-collision`,
      );
      assert.ok(
        questions.every(
          (question) =>
            !Object.hasOwn(question, "correctAnswer") &&
            !Object.hasOwn(question, "solutionSteps"),
        ),
      );
      assert.ok(
        solutions.every(
          (solution) =>
            solution.steps.length >= 3 &&
            solution.feedback.length >= 20 &&
            checkPreviewAnswer(
              unit.slug,
              solution.questionCode,
              solution.correctAnswer,
            )?.correct,
        ),
      );
    }
  }
  assert.equal(seedSensitive, units.length);
});

test("All 600 new answers are independently recomputed from typed parameters", () => {
  let checked = 0;
  for (const unit of units) {
    const draft = generatePreviewUnit(unit.slug, "secondary-boundary-audit");
    for (const audit of draft.audits) {
      assert.equal(
        answerLabel(draft, audit),
        independentlyRecompute(audit),
        audit.questionCode,
      );
      const denominator = audit.parameters.find(
        (item) => /denominator|divisor/u.test(item.name),
      );
      if (denominator) assert.notEqual(Number(denominator.value), 0);
      checked += 1;
    }
  }
  assert.equal(checked, 600);
});

test("Anti-template audit finds no exact teaching, example or prompt collision", () => {
  const theory = units.flatMap((unit) =>
    unit.theory.map((section) =>
      `${section.title}|${section.explanation.join("|")}`.toLocaleLowerCase("vi"),
    ),
  );
  const examples = units.flatMap((unit) =>
    unit.examples.map((example) =>
      `${example.prompt}|${example.steps.join("|")}`.toLocaleLowerCase("vi"),
    ),
  );
  const prompts = units.flatMap((unit) =>
    generatePreviewUnit(unit.slug).questions.map((question) =>
      question.prompt.toLocaleLowerCase("vi"),
    ),
  );
  assert.equal(new Set(theory).size, theory.length);
  assert.equal(new Set(examples).size, examples.length);
  assert.equal(new Set(prompts).size, prompts.length);
});
