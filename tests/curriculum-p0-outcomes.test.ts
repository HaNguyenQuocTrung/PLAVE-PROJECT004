import assert from "node:assert/strict";
import test from "node:test";

import {
  checkPreviewAnswer,
  generatePreviewUnit,
} from "../lib/curriculum/engine.ts";
import {
  curriculumUnits,
} from "../lib/curriculum/registry.ts";
import {
  p0TargetOutcomeIds,
} from "../lib/curriculum/p0-outcome-expansion.ts";
import {
  validateCurriculumRegistry,
  validatePreviewUnit,
} from "../lib/curriculum/validation.ts";

const p0Units = curriculumUnits.filter(
  (unit) => unit.kind === "P0_OUTCOME_COMPLETION",
);

function parameter(
  audit: ReturnType<typeof generatePreviewUnit>["audits"][number],
  name: string,
) {
  const value = audit.parameters.find((candidate) => candidate.name === name)?.value;
  assert.notEqual(value, undefined, `${audit.questionCode}/${name}`);
  return value;
}

function answerLabel(
  draft: ReturnType<typeof generatePreviewUnit>,
  questionCode: string,
) {
  const question = draft.questions.find((candidate) => candidate.code === questionCode);
  const solution = draft.solutions.find(
    (candidate) => candidate.questionCode === questionCode,
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

function independentlyRecompute(
  outcomeId: string,
  audit: ReturnType<typeof generatePreviewUnit>["audits"][number],
) {
  const number = (name: string) => Number(parameter(audit, name));
  switch (outcomeId) {
    case "MOET2018-G1-NUM-P021-001":
    case "MOET2018-G2-NUM-P024-003":
      return String(number("value"));
    case "MOET2018-G1-NUM-P022-006":
      return [number("value0"), number("value1"), number("value2")]
        .sort((left, right) => left - right)
        .join(", ");
    case "MOET2018-G1-NUM-P022-010":
    case "MOET2018-G2-NUM-P025-013":
      return String(number("left") - number("right"));
    case "MOET2018-G1-NUM-P022-002":
      return String(number("start") - number("subtract") + number("add"));
    case "MOET2018-G1-GEO-P023-007":
      return "hình vuông";
    case "MOET2018-G1-GEO-P023-013":
    case "MOET2018-G2-GEO-P026-009":
      return String(number("end") - number("start"));
    case "MOET2018-G1-GEO-P023-006":
      return "lịch và đồng hồ";
    case "MOET2018-G2-NUM-P025-007":
      return Number(parameter(audit, "left")) < Number(parameter(audit, "right"))
        ? "<"
        : ">";
    case "MOET2018-G2-NUM-P025-008":
      return String(number("start") + 2 * number("step"));
    case "MOET2018-G2-NUM-P025-014":
      return [number("value0"), number("value1"), number("value2"), number("value3")]
        .sort((left, right) => left - right)
        .join(", ");
    case "MOET2018-G2-NUM-P025-005":
      return "tổng";
    case "MOET2018-G2-NUM-P025-011":
    case "MOET2018-G2-NUM-P025-012":
      return String(number("left") + number("right"));
    case "MOET2018-G2-NUM-P025-015":
      return String(number("start") + number("add") - number("subtract"));
    case "MOET2018-G2-NUM-P025-016":
      return String(number("groups") * number("itemsPerGroup"));
    case "MOET2018-G2-NUM-P025-019":
      return String(
        Math.max(number("value0"), number("value1"), number("value2")),
      );
    case "MOET2018-G2-GEO-P026-001":
      return "hình tam giác";
    case "MOET2018-G2-GEO-P026-006":
      return "hai hình tam giác";
    case "MOET2018-G2-GEO-P026-003":
      return `${number("end")} kg`;
    case "MOET2018-G2-GEO-P026-005":
      return `${number("end")} l`;
    case "MOET2018-G2-GEO-P027-016":
      return "cân";
    case "MOET2018-G2-GEO-P027-010":
      return `${number("hour")} giờ ${number("minute")} phút`;
    case "MOET2018-G2-GEO-P027-014":
      return "31 tháng 4";
    case "MOET2018-G2-GEO-P027-015":
      return `${number("value").toLocaleString("vi-VN")} đồng`;
    case "MOET2018-G2-GEO-P027-011":
      return String(number("end"));
    case "MOET2018-G2-GEO-P027-018":
      return ["2 m", "15 cm", "1 m"][number("estimateIndex")];
    case "MOET2018-G3-GEO-P032-021":
      return String(number("metres") * 100 + number("end"));
    case "MOET2018-G4-GEO-P038-013":
      return String(number("width") * 100);
    case "MOET2018-G5-NUM-P041-011":
      return ">";
    case "MOET2018-G5-NUM-P041-012": {
      const denominator = number("denominator");
      return `${denominator / 2 + 1}/${denominator}`;
    }
    case "MOET2018-G5-GEO-P044-017":
      return String(number("width") * number("height") * number("depth"));
    case "MOET2018-G6-NAA-P048-026":
      return String(number("left") * number("right"));
    case "MOET2018-G6-NAA-P049-040":
      return "1/2";
    case "MOET2018-G7-NAA-P057-019": {
      const value = number("rightBase") / number("scale");
      return Number.isInteger(value)
        ? String(value)
        : `${number("rightBase")}/${number("scale")}`;
    }
    default:
      assert.fail(`Missing independent recomputation for ${outcomeId}`);
  }
}

test("P0 source-locked target set is exhaustive, unique and grade bounded", () => {
  assert.equal(p0TargetOutcomeIds.length, 37);
  assert.equal(new Set(p0TargetOutcomeIds).size, 37);
  assert.equal(p0Units.length, 14);
  assert.deepEqual(validateCurriculumRegistry(), { valid: true, errors: [] });
  assert.deepEqual(
    [...p0Units.flatMap((unit) => unit.officialOutcomeIds)].sort(),
    [...p0TargetOutcomeIds].sort(),
  );
  for (const unit of p0Units) {
    assert.ok(unit.sourceReferenceIds.includes("MOET-MATH-2018"));
    assert.ok(
      unit.theory.every(
        (section) =>
          section.officialOutcomeIds?.every((id) =>
            unit.officialOutcomeIds.includes(id),
          ),
      ),
    );
    for (const outcomeId of unit.officialOutcomeIds) {
      assert.ok(
        unit.theory.some((section) =>
          section.officialOutcomeIds?.includes(outcomeId),
        ),
        `${unit.slug}/${outcomeId}/theory`,
      );
      assert.ok(
        unit.examples.some((example) =>
          example.officialOutcomeIds?.includes(outcomeId),
        ),
        `${unit.slug}/${outcomeId}`,
      );
    }
  }
});

test("every P0 outcome has diverse primary questions, feedback and separated solutions", () => {
  for (const unit of p0Units) {
    const draft = generatePreviewUnit(unit.slug);
    assert.deepEqual(validatePreviewUnit(draft), { valid: true, errors: [] });
    assert.deepEqual(
      generatePreviewUnit(unit.slug, "p0-semantic-evidence"),
      generatePreviewUnit(unit.slug, "p0-semantic-evidence"),
    );
    assert.notDeepEqual(
      draft.questions,
      generatePreviewUnit(unit.slug, "p0-semantic-variant").questions,
    );
    for (const outcomeId of unit.officialOutcomeIds) {
      const audits = draft.audits.filter(
        (audit) => audit.primaryOfficialOutcomeId === outcomeId,
      );
      const codes = new Set(audits.map((audit) => audit.questionCode));
      const questions = draft.questions.filter((question) => codes.has(question.code));
      const solutions = draft.solutions.filter((solution) =>
        codes.has(solution.questionCode),
      );
      assert.ok(audits.length >= 3, outcomeId);
      assert.ok(new Set(questions.map((question) => question.answerType)).size >= 2);
      assert.ok(new Set(audits.map((audit) => audit.evidenceForm)).size >= 2);
      assert.equal(solutions.length, audits.length);
      assert.ok(
        solutions.every(
          (solution) =>
            solution.steps.length >= 2 &&
            solution.feedback.length >= 24 &&
            checkPreviewAnswer(
              unit.slug,
              solution.questionCode,
              solution.correctAnswer,
            )?.correct,
        ),
      );
      for (const audit of audits) {
        assert.equal(
          answerLabel(draft, audit.questionCode),
          independentlyRecompute(outcomeId, audit),
          audit.questionCode,
        );
      }
    }
  }
});

test("P0 domain invariants reject ambiguity, invalid units and solution leaks", () => {
  for (const unit of p0Units) {
    const draft = generatePreviewUnit(unit.slug, "p0-domain-invariants");
    assert.ok(
      draft.questions.every(
        (question) =>
          !Object.hasOwn(question, "correctAnswer") &&
          !Object.hasOwn(question, "solutionSteps") &&
          (question.options === null ||
            (question.options.length === 4 &&
              new Set(question.options.map((option) => option.label)).size === 4)),
      ),
    );
    assert.ok(
      draft.audits.every(
        (audit) =>
          audit.primaryOfficialOutcomeId &&
          unit.officialOutcomeIds.includes(audit.primaryOfficialOutcomeId),
      ),
    );
    for (const audit of draft.audits) {
      const values = audit.parameters
        .map((item) => Number(String(item.value).replace(",", ".")))
        .filter(Number.isFinite);
      assert.ok(values.every((value) => Number.isFinite(value)));
      if (unit.domain === "MEASUREMENT" || unit.domain === "GEOMETRY") {
        assert.ok(values.every((value) => value >= 0), audit.questionCode);
      }
      if (unit.grade >= 5 && /fraction|integer/iu.test(unit.slug)) {
        const denominator = audit.parameters.find(
          (item) => item.name === "denominator",
        )?.value;
        if (denominator !== undefined) assert.notEqual(Number(denominator), 0);
      }
    }
  }
});
