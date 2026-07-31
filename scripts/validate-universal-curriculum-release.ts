import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildUniversalCurriculumRelease,
  buildUniversalCurriculumReleaseManifest,
  canonicalJson,
} from "../lib/curriculum-runtime/release.ts";
import type { UniversalCurriculumReleaseManifest } from "../lib/curriculum-runtime/release.ts";

const manifestPath = new URL(
  "../docs/curriculum/UNIVERSAL_CURRICULUM_RELEASE_MANIFEST.json",
  import.meta.url,
);
const expected = JSON.parse(
  readFileSync(manifestPath, "utf8"),
) as UniversalCurriculumReleaseManifest;
const release = buildUniversalCurriculumRelease();
const actual = buildUniversalCurriculumReleaseManifest(release);

assert.equal(release.units.length, 171);
assert.equal(release.questions.length, 2052);
assert.equal(release.solutions.length, 2052);
assert.deepEqual(actual.grades, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
assert.equal(new Set(release.units.map((unit) => unit.unitId)).size, 171);
assert.equal(
  new Set(release.questions.map((question) => question.questionId)).size,
  2052,
);
assert.equal(
  new Set(release.solutions.map((solution) => solution.questionId)).size,
  2052,
);
assert.equal(
  release.questions.every((question) =>
    release.solutions.some(
      (solution) => solution.questionId === question.questionId,
    ),
  ),
  true,
);
assert.equal(
  release.questions.every(
    (question) =>
      question.officialOutcomeIds.length > 0 &&
      question.officialOutcomeTitles.length ===
        question.officialOutcomeIds.length &&
      question.skillId.length > 0 &&
      question.skillTitle.length > 0 &&
      /^[0-9a-f]{64}$/.test(question.questionPayloadHash),
  ),
  true,
);
assert.equal(
  release.solutions.every(
    (solution) =>
      solution.correctAnswer.trim().length > 0 &&
      solution.normalizedCorrectAnswer.length > 0 &&
      solution.solutionSteps.length > 0 &&
      /^[0-9a-f]{64}$/.test(solution.solutionPayloadHash),
  ),
  true,
);
assert.equal(canonicalJson(actual), canonicalJson(expected));

console.log("Universal curriculum release validation: PASS");
console.log(
  `${actual.unitCount} units / ${actual.questionCount} questions / ${actual.solutionCount} private solutions`,
);
console.log(`Bundle SHA-256: ${actual.bundleSha256}`);
