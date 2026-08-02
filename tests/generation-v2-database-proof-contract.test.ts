import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("database proof runtime is local-only, authenticated and private-field guarded", () => {
  const runtime = read("lib/generation-v2/database-proof-runtime.ts");
  const start = read("app/api/internal/generator-v2-database/start/route.ts");
  const answer = read("app/api/internal/generator-v2-database/answer/route.ts");
  assert.match(runtime, /PLAVE_GENERATOR_V2_DATABASE_PROOF/u);
  assert.match(runtime, /getStudentLearningContext/u);
  assert.match(runtime, /start_or_resume_semantic_generated_curriculum/u);
  assert.match(runtime, /submit_generated_curriculum_answer/u);
  assert.match(runtime, /get_my_generated_curriculum_evidence/u);
  assert.match(runtime, /access[.]grade !== 1[\s\S]*get_student_curriculum_history/u);
  assert.match(runtime, /deriveGeneratorV2DatabaseProofAttemptSeed/u);
  assert.match(start, /assertNoPrivateGeneratorV2Fields/u);
  assert.match(answer, /assertNoPrivateGeneratorV2Fields/u);
  assert.doesNotMatch(start, /serviceRole|SERVICE_ROLE/u);
  assert.doesNotMatch(answer, /serviceRole|SERVICE_ROLE/u);
});

test("owner usefulness manifest has one public-only sample for all 198 canonical capabilities", () => {
  const manifest = JSON.parse(read("artifacts/generator-v2-owner-review/manifest.json")) as {
    sampleCount: number;
    canonicalCapabilities: number;
    grades: number[];
    difficulties: string[];
    interactionTypes: string[];
    privateSolutionIncluded: boolean;
    ownerDecision: "APPROVED";
    overallDecisionSource: "OWNER_EXPLICIT_DECISION";
    perSampleDecisionDataAvailable: false;
    samples: {
      capabilityId: string;
      ownerDecision?: never;
      ownerNote?: never;
    }[];
  };
  assert.equal(manifest.sampleCount, 198);
  assert.equal(manifest.canonicalCapabilities, 198);
  assert.deepEqual(manifest.grades, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(manifest.difficulties, ["EASY", "HARD", "MEDIUM"]);
  assert.equal(manifest.interactionTypes.length, 10);
  assert.equal(manifest.privateSolutionIncluded, false);
  assert.equal(manifest.ownerDecision, "APPROVED");
  assert.equal(manifest.overallDecisionSource, "OWNER_EXPLICIT_DECISION");
  assert.equal(manifest.perSampleDecisionDataAvailable, false);
  assert.equal(manifest.samples.length, 198);
  assert.equal(new Set(manifest.samples.map((sample) => sample.capabilityId)).size, 198);
  assert.equal(
    manifest.samples.every(
      (sample) =>
        sample.ownerDecision === undefined && sample.ownerNote === undefined,
    ),
    true,
  );
  const serialized = JSON.stringify(manifest.samples);
  for (const field of ["correctResponse", "solverReceipt", "privateSolution", "rawSeed", "acceptedResponses", "postSubmitFeedback", "\"solution\":"]) {
    assert.equal(serialized.includes(field), false, field);
  }
});

test("0042 resolves the deferred trigger blocker without weakening grants", () => {
  const migration0041 = read("supabase/migrations/0041_generated_practice_semantic_provenance.sql");
  const migration0042 = read("supabase/migrations/0042_fix_generated_question_provenance_trigger_security.sql");
  const migration0040 = read("supabase/migrations/0040_deterministic_on_demand_curriculum.sql");
  const report = JSON.parse(read("artifacts/generator-v2-database-proof/report.json")) as {
    status: string;
    disposable: { migrationsApplied: number; freshInstall: string; cleanup: string };
    finalCounts: { attempts: number; questions: number; answers: number; completeProvenanceRows: number; orphanRows: number };
    consoleErrors: number;
    hydrationErrors: number;
    privateLeaks: number;
  };
  assert.match(migration0041, /create constraint trigger curriculum_generated_question_provenance_complete[\s\S]*deferrable initially deferred/u);
  assert.match(migration0041, /function private[.]enforce_generated_question_provenance[\s\S]*security invoker/u);
  assert.match(migration0042, /alter function private[.]enforce_generated_question_provenance\(\)[\s\S]*security definer/u);
  assert.match(migration0042, /revoke all on function private[.]enforce_generated_question_provenance\(\)[\s\S]*from public, anon, authenticated/u);
  assert.match(migration0040, /revoke all on table public[.]curriculum_generated_questions/u);
  assert.equal(report.status, "PASS");
  assert.equal(report.disposable.migrationsApplied, 42);
  assert.equal(report.disposable.freshInstall, "PASS");
  assert.equal(report.disposable.cleanup, "PASS");
  assert.deepEqual(report.finalCounts, { attempts: 13, completedAttempts: 13, questions: 156, privateSolutions: 156, answers: 156, unitEvidence: 156, outcomeEvidence: 156, skillEvidence: 156, completeProvenanceRows: 156, generatedV2DiscriminatorRows: 156, orphanRows: 0 });
  assert.equal(report.consoleErrors, 0);
  assert.equal(report.hydrationErrors, 0);
  assert.equal(report.privateLeaks, 0);
});
