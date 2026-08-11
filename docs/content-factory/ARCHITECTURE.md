# Grades 1–9 content factory

## Truth and state boundaries

The factory never equates generated structure with curriculum truth. Every domain, unit, skill, objective and blueprint must point to `VERIFIED_REPOSITORY_SOURCE`, `OWNER_OFFICIAL_SOURCE`, `SOURCE_REQUIRED`, `PRODUCT_HYPOTHESIS`, or `POC_ONLY` evidence. The lifecycle separately represents structural draft, generated content, automated validation failure or insufficiency, automated validation success, evidence-gate success, bundling, pilot eligibility, publication and retirement. Automated evidence receipts are mandatory for every transition and become checksum-protected when serialized into a deterministic bundle.

Grade 1 is an immutable reference to its canonical SQL release: 13 units, 312 questions, 312 protected solutions and 24 diagnostic rows. The adapter hashes source files before and after commands and runs the existing validator. Missing per-question legacy automated-evidence metadata is reported as `MISSING_LEGACY_METADATA`; the factory does not rewrite it. Grade 2 adapts the existing frozen candidate without changing its ID, version, hash or policy. Grades 3–9 are zero-content scaffolds that reference existing repository curriculum evidence while retaining an explicit `SOURCE_REQUIRED` gate for candidate completion.

## Shared pipeline

`content:validate`, `content:coverage`, `content:bundle`, and `content:simulate` accept `--grades=1-9`, ranges or lists. Canonical serialization sorts object keys and grade manifests. Production bundles reject test-only packs/questions, record a per-pack hash and aggregate hash, and perform no database mutation. Coverage uses explicit `COUNT`, `MISSING`, `UNKNOWN`, and `NOT_APPLICABLE` values.

Generated JSON and Markdown receipts are stored under `content/grade-packs/generated` so the Owner can inspect the exact merged output. They are derived artifacts and never replace source evidence.

The deterministic validator checks IDs, NFC, references, exact derived arithmetic, rational normalization, decimal precision, invalid division/root/geometry domains, answer/explanation consistency, duplicate options/questions, ambiguity signals, unsafe markup, and solution leakage. Unsupported representations must declare `AUTOMATED_VERIFICATION_INSUFFICIENT` and are excluded from candidate bundles.

The prerequisite graph accepts same- and cross-grade edges, checks cycles, missing references, forward-grade edges and orphans. The existing Grade 1 → Grade 2 edge is deliberately a `HYPOTHESIS_REQUIRES_EVIDENCE`, not an official curriculum claim.

## Pilot and release isolation

`PLAVE_ADAPTIVE_PILOT_ENTITLEMENTS` is server-only versioned JSON. Each record binds canonical user UUID, grade, candidate ID, candidate version, bundle SHA-256 and policy version. Empty configuration denies all; malformed or duplicate records fail closed. No identity is logged. Application runtime/pilot flags and exact database release, runtime and membership checks are all required.

General catalog queries remain published-only. Hidden candidates are reachable only after the server verifies authenticated Student grade, exact entitlement and the database availability RPC. Start requests additionally bind the requested unit. Grade 1 stays fixed-practice only.

Candidate operations are parameterized and candidate-scoped. Activation locks the exact unit, questions and release, detects drift, preserves unpublished unit/questions and touches only runtime/pilot flags. Deactivation requires `PAUSE_RESUME_PRESERVE_HISTORY`: new starts and resume pause until reactivation, and no history is deleted. Diagnostics are read-only. These are operations, not migrations, and were not executed remotely.

## Simulation and parallel validation

The pure simulation adapter exercises idempotency, duplicate submission, CAS rejection, termination, remediation and deterministic scoring/XP/mastery/level/streak/goal/achievement projections. It proves software behavior only. Test-only Grade 3 and Grade 6 packs are unmistakably `POC_ONLY` and production-bundle rejected.

The Grade 1 shadow adapter compares fixed and deterministically proposed selection with no runtime hook, writes or pedagogical claim. It is not an activation path.

`content-factory-ci.ts` runs five grade shards concurrently and then runs cross-grade validation and a merged coverage report. `ci/content-factory-shards.json` keeps remote CI disabled for Owner review.

## Next content-production sprint

Parallel workstreams should source-map one domain slice per grade, then author objectives/skills/edges and a deliberately small blueprint set. Each slice must pass source mapping, deterministic mathematics, explanation consistency, reference, grade-range, duplicate, ambiguity, leakage, security, bundle, simulation and regression gates. Any unresolved automated-verification insufficiency excludes the item from a candidate bundle. Grade 2 remains the only pilot candidate until separately authorized; no scaffold gains candidate or release state merely because files exist.

The Sprint 6K1 policy correction removed reviewer-specific fields from canonical grade-pack serialization, changing the initial derived hash from `881f7133954f9f0db8a34b57585c902887d45499b04c6f6ee3b3d1543773cf63` to `351f7b6654e3e949059752748f4f48476d847d5605b941b7aa9472dbc576c1d7`. The Sprint 6K2 technical audit then made all ten required automated evidence receipts explicit in the Grade 2 adapter, producing the audited final merged hash `8d1ee9411efe2f3f303803d78c97f95385536d7e534b25a661be43118b97548e`. The independently frozen Grade 2 candidate ID, version, bundle hash and policy version did not change.
