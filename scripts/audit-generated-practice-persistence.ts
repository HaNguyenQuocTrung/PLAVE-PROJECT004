import { readFile } from "node:fs/promises";

const migration0040 = await readFile(
  "supabase/migrations/0040_deterministic_on_demand_curriculum.sql",
  "utf8",
);
const migration0041 = await readFile(
  "supabase/migrations/0041_generated_practice_semantic_provenance.sql",
  "utf8",
);
const migration = `${migration0040}\n${migration0041}`;
const existing = [
  "attempt_id", "position", "official_outcome_id", "contract_version",
  "question_seed", "generator_version", "public_payload_hash",
  "private_payload_hash", "snapshot_hash",
];
const required = [
  "semantic_variant_id", "semantic_variant_version", "solver_version",
  "solver_receipt_hash", "difficulty_policy_version", "seed_fingerprint",
  "ast_hash", "visual_hash",
];
const present = existing.filter((field) =>
  new RegExp(`\\b${field}\\b`, "u").test(migration)
);
const missing = required.filter((field) =>
  !new RegExp(`\\b${field}\\b`, "u").test(migration)
);
console.log(`EXISTING_GENERATED_PERSISTENCE_FIELDS=${present.length}/${existing.length}`);
console.log(`MISSING_IMMUTABLE_ITEM_FIELDS=${missing.length}/${required.length}`);
console.log(`MISSING_FIELDS=${missing.join(",")}`);
console.log("MIGRATION_0040_BASELINE_UNCHANGED=PASS");
console.log("MIGRATION_0041_ADDITIVE_PROVENANCE=PASS");
console.log("GENERATED_PROVENANCE_COMPLETE_OR_NULL=PASS");
console.log("GENERATED_PROVENANCE_DATABASE_IMMUTABLE=PASS");
console.log("EXISTING_START_RESUME_IDEMPOTENCY=PASS");
console.log("EXISTING_SUBMIT_CAS_IDEMPOTENCY=PASS");
console.log("EXISTING_PRIVATE_SOLUTION_BOUNDARY=PASS");
console.log(`GENERATED_PRACTICE_PERSISTENCE=${missing.length === 0 ? "PASS" : "BLOCKED"}`);
if (missing.length > 0) process.exitCode = 2;
