import assert from "node:assert/strict";
import test from "node:test";

import {
  checkPreviewAnswer,
  generatePreviewUnit,
} from "../lib/curriculum/engine.ts";
import { grade6CompletionTargetOutcomeIds } from "../lib/curriculum/grade6-completion.ts";
import { curriculumUnits } from "../lib/curriculum/registry.ts";
import {
  validateCurriculumRegistry,
  validatePreviewUnit,
} from "../lib/curriculum/validation.ts";

const units = curriculumUnits.filter(
  (unit) => unit.kind === "GRADE6_OUTCOME_COMPLETION",
);
type Draft = ReturnType<typeof generatePreviewUnit>;
type Audit = Draft["audits"][number];

function raw(audit: Audit, name: string) {
  const value = audit.parameters.find((item) => item.name === name)?.value;
  assert.notEqual(value, undefined, `${audit.questionCode}/${name}`);
  return value as string | number;
}
const num = (audit: Audit, name: string) => Number(raw(audit, name));

function answerLabel(draft: Draft, audit: Audit) {
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

const conceptualAnswers: Readonly<Record<string, string>> = {
  "MOET2018-G6-NAA-P047-006": "có",
  "MOET2018-G6-NAA-P047-014": "có",
  "MOET2018-G6-NAA-P049-037": "có",
  "MOET2018-G6-GEO-P050-001": "6",
  "MOET2018-G6-GEO-P051-005": "có",
  "MOET2018-G6-GEO-P051-006": "trục đối xứng",
  "MOET2018-G6-GEO-P051-007": "giao điểm hai đường chéo",
  "MOET2018-G6-GEO-P051-008": "phản chiếu họa tiết qua đường đó",
  "MOET2018-G6-GEO-P051-009": "",
  "MOET2018-G6-GEO-P051-010": "các phần tương ứng lặp lại có quy luật",
  "MOET2018-G6-GEO-P052-014": "ba điểm thẳng hàng",
  "MOET2018-G6-GEO-P052-016": "tia Oz nằm giữa hai cạnh Ox và Oy",
  "MOET2018-G6-GEO-P052-019": "gốc O và một điểm X khác O",
  "MOET2018-G6-GEO-P052-020": "một",
  "MOET2018-G6-GEO-P052-021":
    "kéo A hoặc B và kiểm tra M thuộc AB, AM=MB",
  "MOET2018-G6-GEO-P052-022":
    "các cạnh bằng nhau và hai cạnh kề vuông góc",
  "MOET2018-G6-STA-P053-004": "biểu đồ cột kép",
  "MOET2018-G6-STA-P053-005": "đơn vị nhiệt độ và ngày đo",
  "MOET2018-G6-EXP-P055-002":
    "căng dây qua vị trí cây đầu và cây cuối rồi đặt cây giữa trên dây",
  "MOET2018-G6-EXP-P055-003": "trục đối xứng",
};

function expected(outcomeId: string, audit: Audit): string {
  switch (outcomeId) {
    case "MOET2018-G6-NAA-P047-001": {
      const map: Readonly<Record<number, string>> = {
        14: "XIV",
        19: "XIX",
        24: "XXIV",
        29: "XXIX",
      };
      return map[num(audit, "value")];
    }
    case "MOET2018-G6-NAA-P047-002":
      return String(
        num(audit, "tenThousands") * 10_000 +
          num(audit, "hundreds") * 100 +
          num(audit, "ones"),
      );
    case "MOET2018-G6-NAA-P047-003": {
      const value = num(audit, "value");
      return [2, 3, 5, 9].filter((divisor) => value % divisor === 0).join(", ");
    }
    case "MOET2018-G6-NAA-P047-005":
      return num(audit, "left") < num(audit, "right") ? "<" : ">";
    case "MOET2018-G6-NAA-P047-007":
      return num(audit, "value") >= 0 ? "có" : "không";
    case "MOET2018-G6-NAA-P047-010":
      return `{${Array.from(
        { length: num(audit, "limit") },
        (_, index) => index,
      ).join(",")}}`;
    case "MOET2018-G6-NAA-P047-011":
      return String(
        num(audit, "dividend") / num(audit, "divisor") +
          num(audit, "add"),
      );
    case "MOET2018-G6-NAA-P047-015":
      return String(
        5 +
          num(audit, "base") ** num(audit, "exponent") *
            2,
      );
    case "MOET2018-G6-NAA-P047-016":
      return String(
        num(audit, "a") * (num(audit, "b") + num(audit, "c")),
      );
    case "MOET2018-G6-NAA-P048-017":
      return String(num(audit, "value"));
    case "MOET2018-G6-NAA-P048-020":
      return String(-num(audit, "value"));
    case "MOET2018-G6-NAA-P048-018":
      return [21, 33].includes(num(audit, "value"))
        ? "hợp số"
        : "nguyên tố";
    case "MOET2018-G6-NAA-P048-019":
      return `${num(audit, "quotient")} dư ${num(audit, "remainder")}`;
    case "MOET2018-G6-NAA-P048-021":
      return `${num(audit, "value")} °C`;
    case "MOET2018-G6-NAA-P048-024":
      return `${num(audit, "left")} > ${num(audit, "right")}`;
    case "MOET2018-G6-NAA-P048-027": {
      const map: Readonly<Record<number, string>> = {
        60: "2²×3×5",
        84: "2²×3×7",
        90: "2×3²×5",
      };
      return map[num(audit, "value")];
    }
    case "MOET2018-G6-NAA-P048-028":
      return String(num(audit, "total") / num(audit, "perGroup"));
    case "MOET2018-G6-NAA-P048-029":
      return String(
        num(audit, "a") - (num(audit, "b") + num(audit, "c")),
      );
    case "MOET2018-G6-NAA-P048-030": {
      const a = num(audit, "a");
      const b = num(audit, "b");
      let left = a;
      let right = b;
      while (right !== 0) [left, right] = [right, left % right];
      return String(Math.abs(a * b) / Math.abs(left));
    }
    case "MOET2018-G6-NAA-P049-031": {
      const a = num(audit, "a");
      const b = num(audit, "b");
      const c = num(audit, "c");
      const d = num(audit, "d");
      const common = num(audit, "common");
      return `${a * (common / b) + c * (common / d)}/${common}`;
    }
    case "MOET2018-G6-NAA-P049-032":
      return String(num(audit, "gain") - num(audit, "loss"));
    case "MOET2018-G6-NAA-P049-033": {
      const scale = num(audit, "scale");
      return `${3 * scale}/${5 * scale}`;
    }
    case "MOET2018-G6-NAA-P049-034":
      return `${
        num(audit, "whole") * num(audit, "denominator") +
        num(audit, "numerator")
      }/${num(audit, "denominator")}`;
    case "MOET2018-G6-NAA-P049-036":
      return `−${num(audit, "numerator")}/${Math.abs(
        num(audit, "denominator"),
      )}`;
    case "MOET2018-G6-NAA-P049-038":
      return `${-num(audit, "numerator")}/${num(audit, "denominator")}`;
    case "MOET2018-G6-NAA-P049-042":
      return String(
        (num(audit, "partValue") / num(audit, "numerator")) *
          num(audit, "denominator"),
      );
    case "MOET2018-G6-NAA-P049-043":
      return "3/7";
    case "MOET2018-G6-NAA-P050-044":
      return String(
        (num(audit, "total") * num(audit, "percent")) / 100,
      );
    case "MOET2018-G6-NAA-P050-045":
      return String(-num(audit, "scaledHundredths"));
    case "MOET2018-G6-NAA-P050-046":
      return `${num(audit, "leftHundredths")} < ${num(
        audit,
        "rightHundredths",
      )}`;
    case "MOET2018-G6-NAA-P050-047":
      assert.notEqual(num(audit, "divisorHundredths"), 0);
      return String(
        num(audit, "dividendHundredths") /
          num(audit, "divisorHundredths"),
      );
    case "MOET2018-G6-NAA-P050-048":
      return String(num(audit, "rounded"));
    case "MOET2018-G6-NAA-P050-049":
      return String(
        (num(audit, "part") * 100) / num(audit, "percent"),
      );
    case "MOET2018-G6-NAA-P050-050":
      return String(
        (num(audit, "part") / num(audit, "total")) * 100,
      );
    case "MOET2018-G6-NAA-P050-051":
      return String(10 * num(audit, "cHundredths"));
    case "MOET2018-G6-GEO-P051-009": {
      const map: Readonly<Record<string, string>> = {
        "hình vuông": "4",
        "hình chữ nhật": "2",
        "tam giác đều": "3",
      };
      return map[String(raw(audit, "shape"))];
    }
    case "MOET2018-G6-GEO-P051-011":
      return String(num(audit, "hexagons") * 6);
    case "MOET2018-G6-GEO-P052-012":
      return String(num(audit, "lengthCm") / 2);
    case "MOET2018-G6-GEO-P052-015":
      return String(num(audit, "abCm") + num(audit, "bcCm"));
    case "MOET2018-G6-GEO-P052-017":
      return num(audit, "commonPointCount") === 0 ? "song song" : "cắt nhau";
    case "MOET2018-G6-STA-P053-002":
      return String(num(audit, "a") - num(audit, "b"));
    case "MOET2018-G6-STA-P053-003": {
      const map: Readonly<Record<string, string>> = {
        "tung đồng xu": "sấp hoặc ngửa",
        "rút một thẻ từ {đỏ, xanh, vàng}": "đỏ, xanh hoặc vàng",
        "gieo một xúc xắc": "1, 2, 3, 4, 5 hoặc 6",
      };
      return map[String(raw(audit, "experiment"))];
    }
    case "MOET2018-G6-STA-P053-006":
      return num(audit, "ageYears") === 12 ? "có" : "không";
    case "MOET2018-G6-STA-P053-008":
      return String(num(audit, "rainy") + num(audit, "dry"));
    case "MOET2018-G6-EXP-P054-001":
      return String(
        (num(audit, "capital") * num(audit, "ratePercent")) / 100,
      );
    case "MOET2018-G6-STA-P054-011":
      return String(num(audit, "success") / num(audit, "trials")).replace(
        ".",
        ",",
      );
    case "MOET2018-G6-EXP-P054-002":
      return String(num(audit, "paid") - num(audit, "bill"));
    case "MOET2018-G6-EXP-P054-003":
      return String(num(audit, "a") - num(audit, "b"));
    case "MOET2018-G6-EXP-P055-001":
      return String(
        num(audit, "lengthDm") *
          num(audit, "widthDm") *
          num(audit, "heightDm"),
      );
    default: {
      const answer = conceptualAnswers[outcomeId];
      assert.notEqual(answer, undefined, `Missing recomputation: ${outcomeId}`);
      return answer;
    }
  }
}

test("Grade 6 completion maps all 68 exact source outcomes", () => {
  assert.equal(units.length, 18);
  assert.equal(grade6CompletionTargetOutcomeIds.length, 68);
  assert.equal(new Set(grade6CompletionTargetOutcomeIds).size, 68);
  assert.deepEqual(validateCurriculumRegistry(), { valid: true, errors: [] });
  assert.deepEqual(
    units.flatMap((unit) => unit.officialOutcomeIds).sort(),
    [...grade6CompletionTargetOutcomeIds].sort(),
  );
  for (const unit of units) {
    assert.equal(unit.grade, 6);
    assert.ok(unit.theory.length >= 4 && unit.theory.length <= 6);
    assert.ok(unit.examples.length >= 2);
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
        `${outcomeId}/worked-example`,
      );
    }
  }
});

test("Grade 6 evidence is deterministic, diverse and solution-separated", () => {
  let seedSensitiveUnits = 0;
  for (const unit of units) {
    const draft = generatePreviewUnit(unit.slug);
    assert.deepEqual(validatePreviewUnit(draft), { valid: true, errors: [] });
    assert.deepEqual(draft, generatePreviewUnit(unit.slug));
    if (
      JSON.stringify(draft.questions) !==
      JSON.stringify(generatePreviewUnit(unit.slug, "grade6-variant").questions)
    ) {
      seedSensitiveUnits += 1;
    }
    for (const outcomeId of unit.officialOutcomeIds) {
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
      assert.ok(audits.length >= 3, outcomeId);
      assert.ok(new Set(audits.map((audit) => audit.evidenceForm)).size >= 2);
      assert.ok(new Set(questions.map((question) => question.answerType)).size >= 2);
      assert.equal(
        new Set(questions.map((question) => question.prompt)).size,
        questions.length,
        `${outcomeId}/prompt-collision`,
      );
      assert.equal(solutions.length, audits.length);
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
            solution.feedback.length >= 28 &&
            checkPreviewAnswer(
              unit.slug,
              solution.questionCode,
              solution.correctAnswer,
            )?.correct,
        ),
      );
    }
  }
  assert.ok(seedSensitiveUnits >= 10);
});

test("Grade 6 answers independently recompute across every official outcome", () => {
  for (const unit of units) {
    const draft = generatePreviewUnit(unit.slug, "grade6-semantic-boundaries");
    for (const audit of draft.audits) {
      assert.ok(audit.primaryOfficialOutcomeId);
      assert.equal(
        answerLabel(draft, audit),
        expected(audit.primaryOfficialOutcomeId, audit),
        audit.questionCode,
      );
      const question = draft.questions.find(
        (candidate) => candidate.code === audit.questionCode,
      );
      assert.ok(question);
      assert.equal(
        question.visual.type,
        audit.visualRequirement ?? unit.requiredVisual,
      );
      assert.ok(
        question.options === null ||
          new Set(question.options.map((option) => option.label)).size === 4,
      );
    }
  }
});

test("Grade 6 boundary contracts cover signs, domains, rounding, units and probability", () => {
  const drafts = units.map((unit) =>
    generatePreviewUnit(unit.slug, "grade6-boundary-contracts"),
  );
  const audits = drafts.flatMap((draft) => draft.audits);
  for (const audit of audits) {
    for (const parameter of audit.parameters) {
      if (
        parameter.name === "divisor" ||
        parameter.name === "divisorHundredths" ||
        parameter.name === "denominator" ||
        parameter.name === "trials"
      ) {
        assert.notEqual(Number(parameter.value), 0, audit.questionCode);
      }
    }
  }
  const probabilities = audits.filter(
    (audit) =>
      audit.primaryOfficialOutcomeId === "MOET2018-G6-STA-P054-011",
  );
  for (const audit of probabilities) {
    const value = num(audit, "success") / num(audit, "trials");
    assert.ok(value >= 0 && value <= 1);
  }
  const rounding = audits.filter(
    (audit) =>
      audit.primaryOfficialOutcomeId === "MOET2018-G6-NAA-P050-048",
  );
  for (const audit of rounding) {
    const value = num(audit, "value");
    const scale = num(audit, "scale");
    assert.equal(
      num(audit, "rounded"),
      -Math.round(Math.abs(value) / scale) * scale,
    );
  }
});
