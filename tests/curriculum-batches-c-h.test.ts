import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  batchGapCounts,
  batchesCHUnitSeeds,
} from "../lib/curriculum/batches-c-h.ts";
import { generatePreviewUnit } from "../lib/curriculum/engine.ts";
import {
  curriculumUnits,
  domainCoverage,
} from "../lib/curriculum/registry.ts";
import type { MathematicsOutcomeIndex } from "../lib/curriculum/source-evidence.ts";
import { validatePreviewUnit } from "../lib/curriculum/validation.ts";

const outcomeIndex = JSON.parse(
  readFileSync(
    new URL(
      "../docs/curriculum/sources/MATHEMATICS_OUTCOME_INDEX_1_TO_9.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as MathematicsOutcomeIndex;

const implementedGapIds = new Set(
  outcomeIndex.gaps
    .filter((gap) => gap.status === "TEACHABLE_IMPLEMENTED")
    .map((gap) => gap.id),
);

test("batches C-H implement every applicable source-valid gap and preserve three exact official N/A cells", () => {
  assert.deepEqual(batchGapCounts, { C: 6, D: 3, E: 4, F: 2, G: 5, H: 4 });
  assert.equal(batchesCHUnitSeeds.length, 24);
  assert.equal(implementedGapIds.size, 24);

  for (const seed of batchesCHUnitSeeds) {
    const gapId = `G${seed.grade}_${seed.domain}`;
    assert.ok(implementedGapIds.has(gapId), gapId);
    const gap = outcomeIndex.gaps.find((candidate) => candidate.id === gapId);
    assert.ok(gap?.outcomeIds.includes(seed.outcomeId), gapId);
  }

  assert.deepEqual(
    outcomeIndex.gaps
      .filter(
        (gap) =>
          gap.status === "NOT_APPLICABLE_BY_OFFICIAL_CURRICULUM",
      )
      .map((gap) => gap.id),
    [
      "G1_STATISTICS_AND_PROBABILITY",
      "G8_NUMBERS_AND_OPERATIONS",
      "G9_NUMBERS_AND_OPERATIONS",
    ],
  );
  assert.deepEqual(
    domainCoverage
      .filter(
        (entry) =>
          entry.status === "NOT_APPLICABLE_BY_OFFICIAL_CURRICULUM",
      )
      .map((entry) => `G${entry.grade}_${entry.domain}`),
    [
      "G1_STATISTICS_AND_PROBABILITY",
      "G8_NUMBERS_AND_OPERATIONS",
      "G9_NUMBERS_AND_OPERATIONS",
    ],
  );
  assert.equal(
    outcomeIndex.domainTaxonomy?.remainingApplicableDomainGaps,
    0,
  );
});

test("every batch C-H unit is deterministic, teachable and solution-separated", () => {
  for (const seed of batchesCHUnitSeeds) {
    const first = generatePreviewUnit(seed.slug, "batch-semantic-a");
    const repeated = generatePreviewUnit(seed.slug, "batch-semantic-a");
    const variant = generatePreviewUnit(seed.slug, "batch-semantic-b");
    assert.deepEqual(validatePreviewUnit(first), { valid: true, errors: [] });
    assert.deepEqual(first, repeated);
    assert.notDeepEqual(first.questions, variant.questions);
    assert.equal(first.questions.length, 12);
    assert.equal(first.solutions.length, 12);
    assert.equal(first.audits.length, 12);
    assert.equal(new Set(first.questions.map((item) => item.skillFamily)).size, 3);
    assert.ok(
      first.questions.every(
        (question) =>
          !Object.hasOwn(question, "correctAnswer") &&
          !Object.hasOwn(question, "solutionSteps"),
      ),
    );
  }
});

test("Batch C uses secondary geometry and solid-measurement semantics", () => {
  const geometry = generatePreviewUnit("grade-8-pythagorean-reasoning");
  assert.ok(
    geometry.questions.some((question) => /cạnh huyền|Pythagore/u.test(question.prompt)),
  );
  const pythagoreanCodes = new Set(
    geometry.questions
      .filter((question) => question.skillFamily !== "G8_IDENTIFY_HYPOTENUSE")
      .map((question) => question.code),
  );
  assert.ok(
    geometry.solutions
      .filter((solution) => pythagoreanCodes.has(solution.questionCode))
      .every((solution) => solution.steps.some((step) => /²|căn/u.test(step))),
  );

  const prism = generatePreviewUnit("grade-7-prism-measurement");
  const pyramid = generatePreviewUnit("grade-8-pyramid-measurement");
  const roundSolids = generatePreviewUnit("grade-9-round-solids-measurement");
  assert.ok(prism.questions.some((question) => /lăng trụ/iu.test(question.prompt)));
  assert.ok(pyramid.questions.every((question) => /hình chóp/iu.test(question.prompt)));
  assert.ok(roundSolids.questions.some((question) => /hình trụ|hình nón/iu.test(question.prompt)));
});

test("Batches D-E respect the grade-specific probability boundary", () => {
  const grade3 = generatePreviewUnit("grade-3-data-and-probability");
  assert.ok(
    grade3.solutions
      .filter((solution) => /có thể|không thể/u.test(solution.correctAnswer))
      .every((solution) => !solution.correctAnswer.includes("/")),
  );

  for (const grade of [4, 5, 6, 7, 8, 9] as const) {
    const draft = generatePreviewUnit(`grade-${grade}-data-and-probability`);
    assert.ok(
      draft.questions.some((question) => /tần suất thực nghiệm/u.test(question.prompt)),
    );
    assert.ok(draft.questions.every((question) => question.visual.type === "DATA_DISPLAY"));
  }
});

test("Batch F and applied batches exercise their locked mathematical models", () => {
  const powers = generatePreviewUnit("grade-6-powers-and-order");
  assert.ok(powers.questions.some((question) => question.prompt.includes("^")));
  assert.ok(powers.solutions.some((solution) => /số mũ|luỹ thừa/u.test(solution.feedback)));

  const rationals = generatePreviewUnit("grade-7-rational-number-operations");
  assert.ok(rationals.questions.some((question) => question.prompt.includes("/")));

  const grade1 = generatePreviewUnit("grade-1-applied-problem-solving");
  const grade8 = generatePreviewUnit("grade-8-applied-problem-solving");
  const grade9 = generatePreviewUnit("grade-9-applied-problem-solving");
  assert.ok(grade1.questions.some((question) => /thêm|bớt/u.test(question.prompt)));
  assert.ok(grade8.questions.every((question) => /x/u.test(question.prompt)));
  assert.ok(grade9.questions.every((question) => /tổng|hiệu/u.test(question.prompt)));
});

test("source page evidence stays within exact Grade 1-9 sections", () => {
  const sourceValidated = outcomeIndex.outcomes;
  assert.equal(sourceValidated.length, 24);
  assert.equal(outcomeIndex.lockedOutcomeCount, 24);
  for (const outcome of sourceValidated) {
    assert.equal(outcome.sourceDocumentId, "MOET-MATH-2018");
    assert.equal(outcome.sourceValidationStatus, "SOURCE_VALIDATED");
    assert.ok(outcome.pages.start >= 21 && outcome.pages.end <= 77);
    assert.ok(outcome.sectionHeading.includes(`Lớp ${outcome.grade}`));
  }
  assert.equal(
    curriculumUnits.filter((unit) =>
      implementedGapIds.has(`G${unit.grade}_${unit.domain}`),
    ).length >= 24,
    true,
  );
});
