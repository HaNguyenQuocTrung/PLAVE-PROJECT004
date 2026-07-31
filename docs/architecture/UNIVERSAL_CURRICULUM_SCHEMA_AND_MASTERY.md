# Universal Curriculum Schema and Mastery Hypothesis

## Schema

Migration: `0038_universal_curriculum_runtime_draft.sql`

| Relation | Responsibility |
|---|---|
| `curriculum_releases` | Immutable release identity, content/source/generator/policy versions and activation |
| `curriculum_release_units` | Grade-bound theory, examples, official outcomes and skills |
| `curriculum_release_questions` | Public question payload, deterministic position and payload hash |
| `private.curriculum_release_solutions` | Private expected answer, feedback, solution and payload hash |
| `curriculum_legacy_grade1_outcome_mappings` | Explicit read-only mapping for legacy Grade 1 evidence |
| `curriculum_attempts` | Owner, release/version/unit/sequence binding, revision and completion |
| `curriculum_answers` | One authoritative answer per attempt/question plus submission idempotency |
| `student_curriculum_unit_progress` | Unit completion, evidence and best score |
| `student_curriculum_outcome_progress` | Official-outcome evidence and recent evidence |
| `student_curriculum_skill_progress` | Skill evidence and recent evidence |

All authoritative runtime/progress tables use RLS and FORCE RLS. Student-owned
select policies exist, but browser table privileges are revoked. Mutations are
available only through authenticated secure RPCs.

## Required invariants

- Grade is 1–9.
- Release ID/content version is immutable on an attempt.
- Source fingerprint, generator version and deterministic seed must match the
  same release row through a composite foreign key.
- Question identity is unique inside a release.
- An answer's release/unit/question tuple must match one materialized question
  and its attempt's release/unit tuple.
- Question position is unique inside a release/unit.
- Question sequence length equals attempt total.
- One active attempt per Student/unit.
- Start idempotency is unique per Student.
- Submission idempotency and evidence sequence are unique per attempt; replay
  must match the original question, normalized answer and expected revision.
- Answer question/release/unit belongs to the bound attempt.
- Revision is nonnegative and advances once per new answer.
- Evidence counts are nonnegative; correct count never exceeds evidence.
- Completion requires every bound question to be answered.
- Release status/activation timestamps are mutually consistent.

## Mastery policy

**Classification:** `PRODUCT_HYPOTHESIS`
**Version:** `product-hypothesis-v1`

These labels explain product evidence; they are not a scientifically validated
latent “student level.”

| Label | Deterministic rule |
|---|---|
| `NOT_STARTED` | No unit attempt/evidence |
| `IN_PROGRESS` | Unit has an active attempt |
| `NEEDS_PRACTICE` | At least 3 evidence items and accuracy below 50% |
| `DEVELOPING` | Some evidence, but no stronger threshold |
| `PROFICIENT` | At least 4 evidence items, accuracy at least 75%, and at least 2 recent correct items |
| `MASTERED` | At least 6 evidence items, accuracy at least 85%, and the last 3 items correct |

One correct answer therefore remains `DEVELOPING`; it can never produce
`MASTERED`.

Unit completion is separate from outcome/skill mastery:

- completing a unit records a completed attempt and best score;
- a first completion at 75% or more can be `PROFICIENT`;
- unit `MASTERED` requires a prior completed attempt plus another score of at
  least 85%;
- recent evidence is used for official-outcome and skill labels.

Diagnostic results remain separate. Migration 0038 does not combine diagnostic
evidence with ongoing mastery.

## Grade 1 evidence basis

Legacy Grade 1 unit/skill evidence is preserved without rewriting rows.
Official-outcome grouping uses the versioned
`LEGACY_UNIT_ALIGNED_PRODUCT_MAPPING_V1` materialized mapping. UI text does not
show internal IDs or imply that this historical mapping is question-level
expert review.
