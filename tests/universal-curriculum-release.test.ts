import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildUniversalCurriculumRelease,
  buildUniversalCurriculumReleaseManifest,
  canonicalJson,
  sha256,
} from "../lib/curriculum-runtime/release.ts";
import { getLessonPath } from "../lib/practice/catalog.ts";

test("release is deterministic and covers all 171 units", () => {
  const first = buildUniversalCurriculumRelease();
  const second = buildUniversalCurriculumRelease();
  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.equal(first.units.length, 171);
  assert.equal(first.questions.length, 2052);
  assert.equal(first.solutions.length, 2052);
  assert.deepEqual(
    [...new Set(first.units.map((unit) => unit.grade))],
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  assert.equal(
    first.units.every(
      (unit) =>
        getLessonPath(unit.unitId) !== "/learn" &&
        unit.totalQuestions === 12,
    ),
    true,
  );
});

test("attempt reproduction metadata and payload hashes are complete", () => {
  const release = buildUniversalCurriculumRelease();
  const manifest = buildUniversalCurriculumReleaseManifest(release);
  assert.match(manifest.releaseId, /^[a-z0-9-]+$/);
  assert.match(manifest.curriculumSourceFingerprint, /^[0-9a-f]{64}$/);
  assert.match(manifest.publicPayloadSha256, /^[0-9a-f]{64}$/);
  assert.match(manifest.privateSolutionSha256, /^[0-9a-f]{64}$/);
  assert.match(manifest.bundleSha256, /^[0-9a-f]{64}$/);
  assert.equal(manifest.status, "DRAFT");
  assert.equal(manifest.activationState, "INACTIVE");
  assert.equal(
    release.questions.every(
      (question) =>
        question.officialOutcomeIds.length > 0 &&
        question.officialOutcomeTitles.length ===
          question.officialOutcomeIds.length &&
        question.skillTitle.length > 0,
    ),
    true,
  );
});

test("content hashes remain stable when only activation state changes", () => {
  const release = buildUniversalCurriculumRelease();
  const immutableBinding = {
    releaseId: release.release.releaseId,
    contentVersion: release.release.contentVersion,
    curriculumSourceFingerprint:
      release.release.curriculumSourceFingerprint,
    generatorVersion: release.release.generatorVersion,
    deterministicSeed: release.release.deterministicSeed,
    masteryPolicyVersion: release.release.masteryPolicyVersion,
  };
  assert.equal(
    release.hashes.publicPayloadSha256,
    sha256({
      release: immutableBinding,
      units: release.units,
      questions: release.questions,
    }),
  );
  assert.notEqual(
    release.hashes.publicPayloadSha256,
    sha256({
      release: {
        ...release.release,
        status: "ACTIVE",
        activationState: "ACTIVE",
      },
      units: release.units,
      questions: release.questions,
    }),
  );
});

test("public release payload contains no expected answer or solution", () => {
  const release = buildUniversalCurriculumRelease();
  const publicPayload = JSON.stringify({
    release: release.release,
    units: release.units,
    questions: release.questions,
  });
  assert.equal(publicPayload.includes("correctAnswer"), false);
  assert.equal(publicPayload.includes("normalizedCorrectAnswer"), false);
  assert.equal(publicPayload.includes("solutionSteps"), false);
  assert.equal(publicPayload.includes("privateSolutionSha256"), false);
});

test("checked manifest matches the generated release", () => {
  const checked = JSON.parse(
    readFileSync(
      new URL(
        "../docs/curriculum/UNIVERSAL_CURRICULUM_RELEASE_MANIFEST.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.equal(
    canonicalJson(checked),
    canonicalJson(buildUniversalCurriculumReleaseManifest()),
  );
});
