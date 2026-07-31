import { strict as assert } from "node:assert";
import test from "node:test";

import {
  isSupportedGrade,
  validateSkillFamilyConfig,
} from "../lib/content-engine/config.ts";
import {
  decomposeWholeNumber,
  generateGradeTwoNumbersTo1000Draft,
  getQuestionTypeCount,
  gradeTwoNumbersTo1000SkillFamilies,
  numberToVietnameseWords,
  validateGradeTwoNumberBoundaries,
  validateGradeTwoNumbersTo1000Draft,
} from "../lib/content-engine/grade2-numbers-to-1000.ts";

test("Sprint 6C 1. Skill-family configuration is typed and valid", () => {
  assert.equal(gradeTwoNumbersTo1000SkillFamilies.length, 4);
  for (const family of gradeTwoNumbersTo1000SkillFamilies) {
    const result = validateSkillFamilyConfig(family);
    assert.equal(result.valid, true, result.errors.join("\n"));
    assert.equal(family.grade, 2);
    assert.equal(family.minValue, 0);
    assert.equal(family.maxValue, 1000);
  }
});

test("Sprint 6C 2. Invalid numeric configurations fail closed", () => {
  const base = gradeTwoNumbersTo1000SkillFamilies[0];
  assert.ok(base);
  const reversedRange = {
    ...base,
    minValue: 1000,
    maxValue: 0,
  };
  const missingOperation = {
    ...base,
    allowedOperations: [],
  };
  const unsafeDescription = {
    ...base,
    accessibilityDescription: "<script>answer</script>",
  };

  assert.equal(validateSkillFamilyConfig(reversedRange).valid, false);
  assert.equal(validateSkillFamilyConfig(missingOperation).valid, false);
  assert.equal(validateSkillFamilyConfig(unsafeDescription).valid, false);
  assert.equal(isSupportedGrade(0), false);
  assert.equal(isSupportedGrade(1), true);
  assert.equal(isSupportedGrade(2), true);
  assert.equal(isSupportedGrade(9), true);
  assert.equal(isSupportedGrade(10), false);
});

test("Sprint 6C 3. Required 0–1000 boundaries remain exact", () => {
  const boundaries = [0, 9, 10, 99, 100, 999, 1000] as const;
  const result = validateGradeTwoNumberBoundaries(boundaries);
  assert.equal(result.valid, true, result.errors.join("\n"));
  for (const boundary of boundaries) {
    const places = decomposeWholeNumber(boundary);
    assert.equal(
      places.thousands * 1000 +
        places.hundreds * 100 +
        places.tens * 10 +
        places.ones,
      boundary,
    );
    assert.notEqual(numberToVietnameseWords(boundary), "");
  }
  assert.equal(numberToVietnameseWords(0), "không");
  assert.equal(numberToVietnameseWords(10), "mười");
  assert.equal(numberToVietnameseWords(100), "một trăm");
  assert.equal(numberToVietnameseWords(1000), "một nghìn");
  assert.throws(() => decomposeWholeNumber(-1));
  assert.throws(() => decomposeWholeNumber(1001));
});

test("Sprint 6C 4. The same seed generates the same reviewed draft candidate", () => {
  const first = generateGradeTwoNumbersTo1000Draft("stable-seed");
  const second = generateGradeTwoNumbersTo1000Draft("stable-seed");
  assert.deepEqual(first, second);
});

test("Sprint 6C 5. Different seeds produce genuine variants", () => {
  const first = generateGradeTwoNumbersTo1000Draft("seed-alpha");
  const second = generateGradeTwoNumbersTo1000Draft("seed-beta");
  assert.notDeepEqual(
    first.bundles.map(({ question }) => question.prompt),
    second.bundles.map(({ question }) => question.prompt),
  );
});

test("Sprint 6C 6. POC produces 24 draft questions with the expected batch distribution", () => {
  const draft = generateGradeTwoNumbersTo1000Draft("distribution-seed");
  const validation = validateGradeTwoNumbersTo1000Draft(draft);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(draft.bundles.length, 24);
  assert.equal(getQuestionTypeCount(draft, "MULTIPLE_CHOICE"), 16);
  assert.equal(getQuestionTypeCount(draft, "NUMBER_INPUT"), 8);
  for (const family of draft.skillFamilies) {
    assert.equal(
      draft.bundles.filter(
        ({ question }) => question.skillFamilyId === family.id,
      ).length,
      6,
    );
  }
  assert.equal(draft.generationStatus, "DRAFT_GENERATED");
  assert.equal(
    draft.governance.officialSourceValidation,
    "VALIDATED",
  );
  assert.equal(
    draft.governance.expertReview,
    "OPTIONAL_NOT_OBTAINED",
  );
  assert.equal(draft.governance.publicationStatus, "DRAFT");
});

test("Sprint 6C 7. MCQ variants have four unique options and one canonical answer", () => {
  const draft = generateGradeTwoNumbersTo1000Draft("unique-option-seed");
  for (const bundle of draft.bundles) {
    if (bundle.question.questionType !== "MULTIPLE_CHOICE") continue;
    const options = bundle.question.options;
    assert.ok(options);
    assert.deepEqual(Object.keys(options).sort(), ["A", "B", "C", "D"]);
    assert.equal(new Set(Object.values(options)).size, 4);
    assert.equal(
      options[
        bundle.solution.correctAnswer as keyof typeof options
      ],
      bundle.audit.expectedDisplayAnswer,
    );
    const wrongKeys = (["A", "B", "C", "D"] as const).filter(
      (key) => key !== bundle.solution.correctAnswer,
    );
    assert.equal(
      Object.keys(bundle.audit.distractorTagByOption).length,
      3,
    );
    for (const key of wrongKeys) {
      assert.ok(bundle.audit.distractorTagByOption[key]);
    }
  }
});

test("Sprint 6C 8. Duplicate options are rejected by the validator", () => {
  const draft = generateGradeTwoNumbersTo1000Draft("duplicate-guard");
  const original = draft.bundles.find(
    ({ question }) => question.questionType === "MULTIPLE_CHOICE",
  );
  assert.ok(original);
  const options = original.question.options;
  assert.ok(options);
  const broken = {
    ...draft,
    bundles: draft.bundles.map((bundle) =>
      bundle.question.code === original.question.code
        ? {
            ...bundle,
            question: {
              ...bundle.question,
              options: {
                ...options,
                B: options.A,
              },
            },
          }
        : bundle,
    ),
  };
  const validation = validateGradeTwoNumbersTo1000Draft(broken);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /bốn đáp án A–D khác nhau/);
});

test("Sprint 6C 9. Answer and solution consistency errors are detected", () => {
  const draft = generateGradeTwoNumbersTo1000Draft("answer-guard");
  const original = draft.bundles.find(
    ({ question }) => question.questionType === "MULTIPLE_CHOICE",
  );
  assert.ok(original);
  const wrongKey =
    original.solution.correctAnswer === "A" ? "B" : "A";
  const broken = {
    ...draft,
    bundles: draft.bundles.map((bundle) =>
      bundle.question.code === original.question.code
        ? {
            ...bundle,
            solution: {
              ...bundle.solution,
              correctAnswer: wrongKey,
            },
          }
        : bundle,
    ),
  };
  const validation = validateGradeTwoNumbersTo1000Draft(broken);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /đáp án MCQ không khớp/);
});

test("Sprint 6C 10. Visual data and accessibility descriptions stay consistent", () => {
  const draft = generateGradeTwoNumbersTo1000Draft("visual-guard");
  const validation = validateGradeTwoNumbersTo1000Draft(draft);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  for (const { question } of draft.bundles) {
    assert.ok(question.visual.description.length >= 12);
    assert.doesNotMatch(
      question.visual.description,
      /đáp án|correct|is_correct|https?:|data:/i,
    );
  }
});

test("Sprint 6C 11. Browser question records never contain solutions or audit source", () => {
  const draft = generateGradeTwoNumbersTo1000Draft("answer-boundary");
  for (const { question } of draft.bundles) {
    assert.equal("correctAnswer" in question, false);
    assert.equal("solutionSteps" in question, false);
    assert.equal("source" in question, false);
  }
});

test("Sprint 6C 12. Generated content cannot leave Grade 2 or the approved unit scope", () => {
  const draft = generateGradeTwoNumbersTo1000Draft("grade-boundary");
  assert.equal(draft.unit.grade, 2);
  assert.deepEqual(draft.unit.outcomeIds, ["G2-NUM-01"]);
  assert.deepEqual(draft.unit.prerequisiteSlugs, []);
  for (const bundle of draft.bundles) {
    assert.equal(bundle.question.unitSlug, "grade-2-numbers-to-1000");
    const sourceValue = bundle.audit.source.value;
    assert.ok(sourceValue >= 0 && sourceValue <= 1000);
    assert.doesNotMatch(
      bundle.question.prompt,
      /[+\-×÷]|phép cộng|phép trừ|phép nhân|phép chia/i,
    );
  }
});
