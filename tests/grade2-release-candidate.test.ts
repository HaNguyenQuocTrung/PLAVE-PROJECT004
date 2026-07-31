import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  canonicalJson,
  createGradeTwoReleaseArtifacts,
  createGradeTwoReleaseManifest,
  gradeTwoNumbersTo1000PilotFlags,
  selectRecommendedGradeTwoReleaseCandidate,
  validateGradeTwoReleaseCandidate,
} from "../lib/content-engine/grade2-numbers-to-1000-release.ts";
import { evaluateControlledPilotEligibility } from "../lib/content-engine/source-traceability.ts";
import { parsePracticeVisualSpec } from "../lib/practice/visual.ts";
import type { ContentGovernanceState } from "../lib/content-engine/types.ts";

const selection = selectRecommendedGradeTwoReleaseCandidate();
const artifacts = createGradeTwoReleaseArtifacts(
  selection.recommended.seed,
);
const manifest = createGradeTwoReleaseManifest(
  selection.recommended.seed,
  artifacts,
);

test("Sprint 6E-B 1. Five reviewed seeds are scored deterministically", () => {
  const repeated = selectRecommendedGradeTwoReleaseCandidate();
  assert.equal(selection.label, "RECOMMENDED_RELEASE_CANDIDATE");
  assert.equal(selection.evaluations.length, 5);
  assert.deepEqual(repeated, selection);
  assert.equal(selection.recommended.seed, "g2-review-number-language");
  assert.equal(selection.recommended.score, 100);
  assert.equal(selection.recommended.eligible, true);
});

test("Sprint 6E-B 2. Frozen machine manifest exactly matches release artifacts", () => {
  const stored: unknown = JSON.parse(
    readFileSync(
      new URL(
        "../content/releases/grade-2-numbers-to-1000/g2-numbers-to-1000-rc1/manifest.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.equal(canonicalJson(stored), canonicalJson(manifest));
  const result = validateGradeTwoReleaseCandidate(manifest, artifacts);
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(manifest.questionCount, 24);
  assert.equal(Object.keys(manifest.questionHashes).length, 24);
  assert.equal(Object.keys(manifest.solutionHashes).length, 24);
});

test("Sprint 6E-B 3. Content version and artifact hashes fail closed", () => {
  const duplicateVersion = validateGradeTwoReleaseCandidate(
    manifest,
    artifacts,
    [manifest.contentVersion],
  );
  assert.equal(duplicateVersion.valid, false);
  assert.match(duplicateVersion.errors.join("\n"), /Content version/);

  const firstQuestion = artifacts.publicQuestions[0];
  assert.ok(firstQuestion);
  const tamperedArtifacts = {
    ...artifacts,
    publicQuestions: [
      {
        ...firstQuestion,
        prompt: `${firstQuestion.prompt} `,
      },
      ...artifacts.publicQuestions.slice(1),
    ],
  };
  const tampered = validateGradeTwoReleaseCandidate(
    manifest,
    tamperedArtifacts,
  );
  assert.equal(tampered.valid, false);
  assert.match(tampered.errors.join("\n"), /hash/);
});

test("Sprint 6E-B 4. Client bundle has no solution, audit or scoring key", () => {
  for (const question of artifacts.publicQuestions) {
    const serialized = canonicalJson(question);
    assert.equal("correctAnswer" in question, false);
    assert.equal("solutionSteps" in question, false);
    assert.equal("source" in question, false);
    assert.doesNotMatch(
      serialized,
      /"(?:correctAnswer|solutionSteps|explanation|hint|source|expectedDisplayAnswer|distractorTagByOption)"/,
    );
  }
});

test("Sprint 6E-B 5. Owner preparation approval does not publish or enable a pilot", () => {
  const governance: ContentGovernanceState = {
    officialSourceValidation: manifest.officialSourceValidation,
    technicalValidation: manifest.technicalValidation,
    expertReview: manifest.expertReview,
    ownerDecision: manifest.ownerDecision,
    publicationStatus: manifest.publicationStatus,
  };
  const eligibility = evaluateControlledPilotEligibility(governance);
  assert.equal(eligibility.eligible, false);
  assert.equal(eligibility.targetStatus, null);
  assert.equal(manifest.publicationStatus, "DRAFT");
  assert.equal(manifest.studentVisibility, "HIDDEN");
  assert.equal(gradeTwoNumbersTo1000PilotFlags.controlledPilotEnabled, false);
});

test("Sprint 6E-B 6. Grade 2 visuals parse through the allowlisted runtime contract", () => {
  for (const question of artifacts.publicQuestions) {
    const parsed = parsePracticeVisualSpec(question.visual);
    assert.ok(parsed, question.questionId);
    assert.equal(parsed.description, question.accessibilityDescription);
  }
  assert.equal(
    parsePracticeVisualSpec({
      kind: "NUMBER_CARD",
      value: 1001,
      description: "Thẻ số có giá trị vượt phạm vi.",
    }),
    null,
  );
  assert.equal(
    parsePracticeVisualSpec({
      kind: "PLACE_VALUE_CHART",
      thousands: 1,
      hundreds: 1,
      tens: 0,
      ones: 0,
      description: "Bảng hàng tạo số lớn hơn một nghìn.",
    }),
    null,
  );
  assert.equal(
    parsePracticeVisualSpec({
      kind: "NUMBER_LINE",
      start: 10,
      end: 30,
      focusValue: 20,
      description: "Tia số có khoảng hiển thị quá rộng.",
    }),
    null,
  );
});

test("Sprint 6E-B 7. Question, solution and audit records remain one-to-one", () => {
  const publicIds = artifacts.publicQuestions
    .map((question) => question.questionId)
    .sort();
  const solutionIds = artifacts.serverSolutions
    .map((solution) => solution.questionId)
    .sort();
  const auditIds = artifacts.privateAudit
    .map((audit) => audit.questionId)
    .sort();
  assert.deepEqual(solutionIds, publicIds);
  assert.deepEqual(auditIds, publicIds);
  assert.equal(new Set(publicIds).size, 24);
});
