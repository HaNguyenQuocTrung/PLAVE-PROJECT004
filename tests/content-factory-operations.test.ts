import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

test("candidate operations are parameterized, atomic, drift-safe and keep publication hidden", () => {
  const activation = readFileSync("supabase/operations/candidate-controlled-pilot/ACTIVATE_CANDIDATE.sql", "utf8");
  const deactivation = readFileSync("supabase/operations/candidate-controlled-pilot/DEACTIVATE_CANDIDATE.sql", "utf8");
  const diagnostic = readFileSync("supabase/operations/candidate-controlled-pilot/DIAGNOSTIC_READONLY.sql", "utf8");
  for (const source of [activation, deactivation]) { assert.match(source, /begin;/iu); assert.match(source, /commit;/iu); assert.match(source, /for update of release/iu); assert.match(source, /bundle_hash/iu); assert.doesNotMatch(source, /grade-2|g2-numbers/iu); }
  assert.match(activation, /PUBLICATION_BOUNDARY_FAILED/u); assert.match(activation, /v_release[.]retention_runtime_enabled/iu);
  assert.match(activation, /not exists \(select 1 from public[.]questions/iu);
  assert.match(deactivation, /PAUSE_RESUME_PRESERVE_HISTORY/u); assert.match(deactivation, /QUESTION_PRECONDITION_FAILED/u); assert.match(deactivation, /PUBLICATION_BOUNDARY_FAILED/u); assert.doesNotMatch(deactivation, /delete\s+from/iu);
  assert.match(diagnostic, /begin read only/iu); assert.match(diagnostic, /rollback;/iu); assert.doesNotMatch(diagnostic, /\b(?:insert|update|delete|alter|create|drop)\b/iu);
});
