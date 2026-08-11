import test from "node:test";
import assert from "node:assert/strict";
import { auditWaveLRuntimeIsolation } from "../lib/content-factory/wave-l-runtime-isolation.ts";
import { combinedWaveABCDEFGHIJKGradePacks } from "../lib/content-factory/wave-k-packs.ts";
import { adaptiveRuntimeFeatureFlags, gradeOneShadowPublicationState } from "../lib/practice/runtime-flags.ts";

test("Wave L runtime isolation denies roles, users, mismatches and disabled gates", () => {
  const audit = auditWaveLRuntimeIsolation(combinedWaveABCDEFGHIJKGradePacks);
  assert.deepEqual(audit.errors, []); assert.equal(audit.totals.grades, 9); assert.equal(audit.totals.cases, 189);
  assert.ok(audit.rows.every((row) => Object.values(row.cases).every(Boolean)));
});

test("Wave L keeps activation disabled and Grade 1 local-shadow-only", () => {
  assert.deepEqual(adaptiveRuntimeFeatureFlags, { ADAPTIVE_PRACTICE_RUNTIME_ENABLED: false,
    CONTROLLED_PILOT_ENABLED: false, RETENTION_RUNTIME_ENABLED: false });
  assert.equal(gradeOneShadowPublicationState.executionMode, "LOCAL_SHADOW_ONLY");
  assert.equal(gradeOneShadowPublicationState.publicationStatus, "DRAFT");
  assert.equal(gradeOneShadowPublicationState.studentVisibility, "HIDDEN");
});
