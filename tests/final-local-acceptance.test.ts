import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { canonicalize } from "../lib/content-factory/canonical.ts";
import {
  buildFinalLocalAcceptance,
  FINAL_LOCAL_CHECKSUM_PATH,
  FINAL_LOCAL_DOCUMENTATION_MANIFEST_PATH,
  FINAL_LOCAL_MATRIX_PATH,
  FINAL_LOCAL_RECEIPT_PATH,
} from "../lib/release-integration/final-local-acceptance.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("canonical Grades 1-9 matrix separates local acceptance from hidden remote schema readiness", () => {
  const built = buildFinalLocalAcceptance();
  assert.equal(built.matrix.grades.length, 9);
  assert.equal(built.matrix.grades.every((row) => row.finalResult === "LOCAL_ACCEPTED"), true);
  assert.equal(built.matrix.grades[0]?.runtimeMode, "PUBLIC_FIXED");
  assert.equal(built.matrix.grades.slice(1).every((row) => row.runtimeMode === "LOCAL_PUBLIC_ADAPTIVE_AND_FIXED_SAFE"), true);
  assert.equal(built.matrix.remoteRelease, "SCHEMA_MATERIALIZED_HIDDEN_NOT_ACTIVATED");
  assert.equal(built.matrix.productionAvailabilityGradesTwoToNine, "NOT_YET_CLAIMED");
});

test("final receipt locks inventory, browser proof, release modes and current-turn boundaries", () => {
  const { receipt } = buildFinalLocalAcceptance();
  assert.deepEqual(receipt.inventory.gradesTwoToNine, {
    adaptiveSkills: 274, fixedSafeSkills: 13, grades: 8, questions: 2460,
    runtimeUnits: 128, skills: 287, solutions: 2460, units: 163, noQuestionSourceUnits: 35,
  });
  assert.equal(receipt.stableHashes.browserReceiptHash, "ff804a5893aae4d53a784e71f3443d99d0d1b6626623eb1b0704d489b6d54ec5");
  assert.equal(receipt.remoteState.migration0045, "APPLIED_AND_VERIFIED");
  assert.equal(
    receipt.remoteState.migration0046,
    "NOT_APPLIED_OWNER_AUTHORIZATION_REQUIRED",
  );
  assert.equal(receipt.remoteState.gradesTwoToNineActivation, "NOT_EXECUTED");
  assert.equal(receipt.remoteState.deployment, "NOT_EXECUTED");
  assert.equal(Object.values(receipt.receiptGenerationBoundary).every((value) => value === 0), true);
  assert.equal(
    receipt.historicalIncidents.includes(
      "FINAL_DELIVERY_REAL_WORKTREE_NEXT_ENV_DISCOVERY_RECORDED_NO_VALUE_OUTPUT_BUILD_ABORTED",
    ),
    true,
  );
});

test("generated final-local artifacts are canonical and reproducible", () => {
  const first = buildFinalLocalAcceptance();
  const second = buildFinalLocalAcceptance();
  assert.equal(canonicalize(first), canonicalize(second));
  for (const [path, value] of [
    [FINAL_LOCAL_MATRIX_PATH, first.matrix],
    [FINAL_LOCAL_DOCUMENTATION_MANIFEST_PATH, first.documentationManifest],
    [FINAL_LOCAL_CHECKSUM_PATH, first.checksumManifest],
    [FINAL_LOCAL_RECEIPT_PATH, first.receipt],
  ] as const) assert.equal(read(path), `${canonicalize(value)}\n`);
});

test("submission-facing documentation distinguishes applied schema from activation and deployment", () => {
  for (const path of ["README.md", "docs/final/PLAVE_FYP_COMPLETION.md", "docs/final/PLAVE_GRADES_1_9_LOCAL_ACCEPTANCE.md"]) {
    const text = read(path);
    assert.match(text, /Grades 2.?9/u);
    assert.match(text, /local/u);
    assert.match(text, /remote/u);
  }
  assert.match(read("README.md"), /database-backed adaptive and fixed-safe journeys/u);
  assert.match(read("docs/final/PLAVE_RELEASE_READINESS.md"), /APPLIED_AND_VERIFIED/u);
  assert.match(read("docs/final/PLAVE_RELEASE_READINESS.md"), /HIDDEN_NOT_ACTIVATED/u);
  assert.match(read("docs/final/PLAVE_REMOTE_RELEASE_HANDOFF.md"), /Owner authorization/u);
  assert.doesNotMatch(read("docs/final/PLAVE_FYP_COMPLETION.md"), /release integration remains unperformed/u);
});

test("stale submission claims are either corrected or explicitly historical", () => {
  for (const path of [
    "docs/curriculum/GRADES_1_TO_9_COVERAGE_MATRIX.md",
    "docs/curriculum/GRADES_1_TO_9_IMPLEMENTATION_STATUS.md",
    "docs/operations/GRADES_1_TO_9_STUDENT_EXPERIENCE_ACCEPTANCE.md",
    "docs/operations/LEARNING_PERSISTENCE_LOCAL_TESTS.md",
    "docs/operations/OWNER_LOCAL_DEMO_RUNBOOK.md",
    "docs/operations/PARENT_TEACHER_UNIVERSAL_LOCAL_RUNBOOK.md",
    "docs/operations/PLAVE_PRODUCT_COMPLETENESS_MATRIX.md",
    "docs/operations/UNIVERSAL_CURRICULUM_RELEASE_RUNBOOK.md",
    "docs/status/ACADEMIC_SUBMISSION_EVIDENCE_PACK.md",
  ]) {
    assert.match(read(path), /HISTORICAL \/ SUPERSEDED/u, path);
    assert.match(read(path), /PLAVE_GRADES_1_9_LOCAL_ACCEPTANCE\.md/u, path);
  }
  const archived = JSON.parse(read("docs/operations/FINAL_SUBMISSION_STATUS.json")) as { recordStatus: string; supersededBy: string };
  assert.equal(archived.recordStatus, "ARCHIVED_NON_OPERATIONAL");
  assert.equal(archived.supersededBy, FINAL_LOCAL_RECEIPT_PATH);
});
