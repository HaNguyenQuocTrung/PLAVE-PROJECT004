# Universal Student Curriculum Runtime Architecture

**Status:** `CODE_IMPLEMENTED / LOCAL_DB_VERIFIED / READY`
**Scope:** authenticated Students in Grades 1–9
**Remote state:** `REMOTE_NOT_APPLIED / CONTENT_NOT_ACTIVATED`

## Decision

PLAVE uses a **materialized release bank** for the universal runtime.

- Public release tables hold immutable unit and question payloads.
- `private.curriculum_release_solutions` holds expected answers and solutions.
- Authenticated browser roles have no table mutation privilege and no private
  solution read privilege.
- Five JWT-bound `SECURITY DEFINER` RPCs perform start/resume, state, answer,
  progress and history transitions.
- Database code derives `auth.uid()`, verifies the Student role and registered
  grade, evaluates the answer against the private solution, applies CAS and
  idempotency, and updates evidence atomically.
- The Next.js server uses the same Student JWT as the existing Grade 1
  runtime. No service-role credential is introduced.

This design was selected because a server-only deterministic generator by
itself cannot make a JWT-callable persistence RPC authoritative: a browser
could bypass the Next.js server and forge any correctness boolean accepted by
that RPC. Keeping the expected answer inside the database removes that trust.

## Architecture audit answers

### 1. Existing contracts reused safely

- `profiles`, `student_profiles`, `auth.uid()`, SSR cookie/session handling and
  `getStudentLearningContext`.
- Same-origin API checks and no-store response conventions.
- Grade 1's private `question_solutions` pattern.
- Adaptive 0036's revision/CAS, idempotency, immutable content binding,
  transaction and safe-error conventions.
- 0037's database-enforced Student membership/role philosophy, but not its
  pilot flags or membership table.
- Existing curriculum registry, deterministic engine, official outcome
  inventory, student-facing titles/goals and visual payloads.

### 2. Grade 1 contracts kept untouched

Migration 0038 does not alter, insert, update or delete:

- `learning_units`;
- `questions`;
- `question_solutions`;
- `practice_attempts`;
- `practice_answers`;
- Grade 1 fixed-practice RPCs.

Grade 1 continues through `/practice/[attemptId]`. Its history is aggregated
read-only into the unified progress/history view.

### 3. Why current attempts/answers were not extended

The legacy tables bind only `unit_slug` and question codes. They do not bind a
release ID, content version, source fingerprint, generator version or payload
hash. Extending them would make generated and legacy evidence ambiguous and
would weaken the proof that existing Grade 1 history remains unchanged.

### 4. Why migration 0038 is required

The existing schema cannot represent:

- immutable release/version binding;
- materialized Grades 1–9 questions and private solutions;
- CAS and submission idempotency for fixed universal practice;
- official-outcome and skill evidence;
- an explicit versioned mastery policy;
- unified, no-duplication Grade 1 compatibility reads.

### 5. Reproduction after restart/version change

Each attempt permanently stores:

- `release_id`;
- `content_version`;
- `curriculum_source_fingerprint`;
- `generator_version`;
- `deterministic_seed`;
- `unit_id`;
- the exact `question_sequence`.

Question and solution payloads remain materialized and are protected by
per-row hashes plus release-level public/private/bundle SHA-256 hashes.
Start/resume first returns an existing in-progress attempt even if a later
release becomes active. It never silently regenerates that attempt.

### 6. Authoritative correctness

`submit_curriculum_answer`:

1. locks the owned attempt;
2. checks Student role/grade and exact current question;
3. checks expected revision and idempotency key;
4. normalizes the answer in a private helper;
5. reads the expected answer from the private solution table;
6. calculates correctness;
7. inserts one answer;
8. updates attempt, unit, outcome and skill evidence in one transaction;
9. returns feedback/solution only for the submitted question.

The browser never sends `is_correct`, score, mastery, expected answer,
solution, next question or completion.

### 7. Solution privacy

- The private solution table has RLS and FORCE RLS.
- `public`, `anon` and `authenticated` have no table privileges.
- There is no client import of the curriculum engine or release generator.
- State/start responses contain the current public question only.
- Submit returns one submitted question's feedback and solution.
- Production client chunks were scanned without finding release hashes,
  normalized answers, private-table names or registry/engine imports.

### 8. Grade 1 compatibility without duplication

The lower-risk compatibility approach is used:

- Grade 1 keeps the legacy runtime and legacy attempt IDs.
- Grades 2–9 use `curriculum_attempts` and `curriculum_answers`.
- Progress/history RPCs branch by registered grade.
- Grade 1 history returns legacy rows only; it never unions duplicated
  universal Grade 1 attempts.
- A local materialization includes an explicit
  `LEGACY_UNIT_ALIGNED_PRODUCT_MAPPING_V1` for official-outcome evidence.
- Historical Grade 1 skills come from legacy question skill codes.
- The verified 18-attempt/340-answer fixture is only read and is asserted
  unchanged by the disposable integration operation.

The legacy outcome mapping is a transparent product mapping, not a claim that
historical questions were originally authored at question-level outcome
granularity.

## Request flow

1. Student signs in through the existing Supabase SSR session.
2. `/learn` uses the registered `student_profiles.grade`.
3. Grade 1 uses the unchanged legacy catalog/runtime.
4. Grades 2–9 require the server-only runtime flag and an active materialized
   release.
5. Start/submit/state APIs validate same-origin, session, role and input, then
   call the JWT-bound RPC.
6. The database selects the current question and evaluates the answer.
7. Progress and history are loaded by read-only secure RPCs.

## Cross-grade policy

Persistent learning is restricted to the Student's registered grade. The
application never changes `schoolGrade`/`student_profiles.grade` silently.
Public `/curriculum-preview` remains separate and does not create persistent
evidence.

## Feature safety

`PLAVE_CURRICULUM_RUNTIME_ENABLED` is server-only:

- unset → disabled;
- `false` → disabled;
- `true` → enabled;
- any other value → disabled.

The application flag alone is insufficient. New attempts additionally require
an `ACTIVE/ACTIVE` database release. Adaptive/controlled-pilot flags are not
reused.

## Wave G offline content-production boundary

Wave G adds only hidden statistics/data/probability candidate artifacts. Its build and test entry points run an offline invocation audit before local execution: bare or programmatic `npx`, network-capable package operations, and missing local executables fail closed. The historical Wave F registry DNS attempt remains recorded as an immutable operational fact; Wave G introduces no new network attempt. These production artifacts do not alter publication, runtime, entitlement, scoring, mastery, migration or catalog-isolation contracts.
