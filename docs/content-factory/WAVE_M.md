# Wave M — Complete learning journey, progress and history

Wave M closes the local software proof for learning continuity across the frozen combined A–K Grades 1–9 inventory. It adds no production curriculum questions, does not mutate A–K candidates, and does not activate hidden content.

## Frozen inputs

- Combined A–K bundle: `de5cff15605c2fd4d09bf06740db9475a9918d20396e9d06f5ec27200b362b1e`.
- Wave L compatibility: `ffbe617c9790a74cad0e0a9093da077e5f18428b3c529610bf482b9a72be5932`.
- Inventory: 2,772 questions, 338 question-bearing skills and 176 units.
- Grade 1 remains fixed runtime with `LOCAL_SHADOW_ONLY` comparison. No runtime hook was added.
- Migrations remain exactly `0001–0044`.

## Pool-limited resolution

The thirteen Wave L pool-limited skills contain six or eight source-bound questions but only one normalized reasoning structure. Wave M does not relabel those pools as adaptive-ready.

All thirteen resolve to `FIXED_SAFE_SUPPORTED`:

- The existing deterministic sequence may be used for fixed practice.
- Adaptive mastery is not claimed.
- Structural retry is not claimed.
- Completion routes to another eligible same-grade skill or future path.
- No school-grade mutation or entitlement grant occurs.

The corrective overlay contains zero questions because a new production item was not necessary to preserve a complete product journey. Its deterministic hash is recorded separately from A–K.

## Progress and history

Progress is derived from immutable, owner-scoped history and server inventory. Client totals are not accepted. The completion denominator is explicitly `QUESTION_BEARING_CANDIDATE_SKILLS`; no percentage of the entire curriculum is claimed.

History retains candidate ID, version, bundle hash and policy version. Appends are CAS-safe and exactly-once by idempotency key. Reads use deterministic ordering and cursor pagination. Duplicate submissions, policy changes and candidate deactivation do not rewrite or delete prior records.

History records expose outcomes only after submission and contain no exact answer, explanation or solution field.

## Stakeholder boundaries

- Student reads and mutates only their own learning state.
- Parent reads an approved Student summary only; Parent cannot start or submit an attempt.
- Teacher reads only authorized Student progress/history and cannot mutate mastery/history through this contract.
- Anonymous, cross-user, unapproved Parent and unauthorized Teacher access fail closed.
- Stakeholder projections contain no hidden question content or solution.

## Product journey proof

Pure deterministic fixtures prove for Grades 1–9:

- start/resume, presentation, submit and feedback;
- progress, score, XP, mastery, level, streak, goal and achievement projection;
- exactly-once history append and restart-safe read;
- mastery, remediation-return, retention, mixed practice and maximum termination;
- fixed-safe pool fallback and grade-complete future path;
- CAS, duplicate submit, deactivation preservation and role isolation;
- continuous same-grade next action without entitlement grant.

The proof is software-behavior evidence. It is not expert pedagogical validation.

## Definition of done

The matrix evaluates `CAN_LEARN`, `CAN_SHOW_PROGRESS`, `HAS_CLEAR_PATH`, `HAS_REVIEWABLE_HISTORY` and `HAS_CONTINUOUS_NEXT_ACTION` for every grade. Grade 1 `CAN_LEARN` is `PARTIAL` solely because adaptive execution stays shadow-only; its fixed journey remains operational. Every other cell is `PASS`; no cell is `FAIL`.

## Safe execution

Wave M inherits the Wave L offline and credential-safe boundary. Static repository metadata and clearly synthetic fixtures are audited inside a disposable workspace. Real environment files and credential values are not opened, inherited, logged, hashed, measured or compared. The Wave F and Wave K incident records remain preserved without rewriting.

No remote access, registry fallback, package installation, publication, activation, flag enablement, default entitlement, deployment or port 3000 operation is part of Wave M.
