import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  checkPreviewAnswer,
  generatePreviewUnit,
} from "../lib/curriculum/engine.ts";
import {
  curriculumOutcomes,
  curriculumUnits,
  domainCoverage,
} from "../lib/curriculum/registry.ts";
import {
  validateAllPreviewUnits,
  validateCurriculumRegistry,
  validatePreviewUnit,
} from "../lib/curriculum/validation.ts";
import type { CurriculumUnit } from "../lib/curriculum/types.ts";

test("registry covers Grades 1–9 with source-mapped representative units", () => {
  const result = validateCurriculumRegistry();
  assert.deepEqual(result, { valid: true, errors: [] });
  assert.deepEqual(
    [...new Set(curriculumUnits.map((unit) => unit.grade))],
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  assert.equal(curriculumOutcomes.length, curriculumUnits.length);
  assert.equal(domainCoverage.length, 54);
  assert.equal(
    domainCoverage.filter(
      (entry) =>
        entry.status === "NOT_APPLICABLE_BY_OFFICIAL_CURRICULUM",
    ).length,
    3,
    "applicable domain-cell completion must preserve the three exact official N/A cells",
  );
});

test("registry rejects duplicate slugs, grade-boundary errors and cycles", () => {
  const first = curriculumUnits[0];
  const second = curriculumUnits[1];
  const duplicateSlug = [
    first,
    { ...second, slug: first.slug },
    ...curriculumUnits.slice(2),
  ] satisfies readonly CurriculumUnit[];
  assert.equal(validateCurriculumRegistry(duplicateSlug).valid, false);

  const wrongBoundary = [
    { ...first, grade: 2 as const },
    ...curriculumUnits.slice(1),
  ] satisfies readonly CurriculumUnit[];
  assert.equal(validateCurriculumRegistry(wrongBoundary).valid, false);

  const cyclic = curriculumUnits.map((unit, index) =>
    index === 0
      ? { ...unit, prerequisiteSlugs: [curriculumUnits[1].slug] }
      : index === 1
        ? { ...unit, prerequisiteSlugs: [curriculumUnits[0].slug] }
        : unit,
  );
  const cycleResult = validateCurriculumRegistry(cyclic);
  assert.equal(cycleResult.valid, false);
  assert.ok(cycleResult.errors.some((error) => error.includes("cycle")));
});

test("each Grade 1–9 unit is teachable, accessible and solution-consistent", () => {
  assert.deepEqual(validateAllPreviewUnits(), { valid: true, errors: [] });
  for (const unit of curriculumUnits) {
    const draft = generatePreviewUnit(unit.slug);
    assert.equal(draft.generationStatus, "DRAFT_GENERATED");
    assert.ok(unit.theory.length >= 4);
    assert.ok(unit.examples.length >= 2);
    assert.equal(draft.questions.length, 12);
    assert.ok(
      new Set(draft.questions.map((item) => item.skillFamily)).size >= 3,
    );
    assert.ok(
      draft.questions.every(
        (question) => question.visual.description.trim().length >= 24,
      ),
    );

    for (const solution of draft.solutions) {
      const checked = checkPreviewAnswer(
        unit.slug,
        solution.questionCode,
        solution.correctAnswer,
      );
      assert.equal(checked?.correct, true, solution.questionCode);
      assert.deepEqual(checked?.steps, solution.steps);
    }
  }
});

test("generation is deterministic and seed-sensitive", () => {
  for (const unit of curriculumUnits) {
    const first = generatePreviewUnit(unit.slug, "deterministic-seed-a");
    const repeated = generatePreviewUnit(unit.slug, "deterministic-seed-a");
    const variant = generatePreviewUnit(unit.slug, "deterministic-seed-b");
    assert.deepEqual(first, repeated);
    assert.notDeepEqual(first.questions, variant.questions);
  }
});

test("invalid configuration and unsafe seeds fail closed", () => {
  assert.throws(
    () => generatePreviewUnit("missing-unit"),
    /Unknown curriculum preview unit/,
  );
  assert.throws(
    () => generatePreviewUnit(curriculumUnits[0].slug, "../../unsafe"),
    /Seed must be/,
  );

  const draft = generatePreviewUnit(curriculumUnits[0].slug);
  const invalid = {
    ...draft,
    questions: draft.questions.slice(0, 3),
  };
  const result = validatePreviewUnit(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("at least 12")));
});

test("multiple-choice options are unique and correct keys resolve", () => {
  for (const unit of curriculumUnits) {
    const draft = generatePreviewUnit(unit.slug);
    for (const question of draft.questions) {
      if (!question.options) continue;
      assert.equal(question.options.length, 4);
      assert.equal(
        new Set(question.options.map((option) => option.label)).size,
        4,
      );
      const solution = draft.solutions.find(
        (candidate) => candidate.questionCode === question.code,
      );
      assert.ok(solution);
      assert.ok(
        question.options.some(
          (option) => option.key === solution.correctAnswer,
        ),
      );
    }
  }
});

test("public preview client does not contain answer or solution data", () => {
  const clientSource = readFileSync(
    new URL(
      "../app/curriculum-preview/CurriculumPreviewRunner.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(clientSource, /generatePreviewUnit|checkPreviewAnswer/);
  assert.doesNotMatch(clientSource, /correctAnswer\s*:\s*["'`]/);
  assert.match(clientSource, /method:\s*"POST"/);
  assert.doesNotMatch(clientSource, /password|service[_-]?role|supabase/i);
  assert.doesNotMatch(clientSource, /question\.skillFamily/);

  const pageSource = readFileSync(
    new URL("../app/curriculum-preview/page.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(pageSource, /draft\.solutions|draft\.audits/);
  assert.doesNotMatch(
    pageSource,
    /DRAFT_GENERATED|skill families|vertical teaching|source fingerprint|outcome ID/i,
  );
  assert.match(pageSource, /bắt đầu học|Mục tiêu học|Đang học/i);
});
