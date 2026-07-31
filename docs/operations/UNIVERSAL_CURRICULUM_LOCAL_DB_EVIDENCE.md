# Universal Curriculum Local Database Evidence

**Date:** 2026-07-30
**State:** `LOCAL_DB_VERIFIED / READY`
**Boundary:** local disposable Supabase only; no linked/remote action

## Root cause and correction

Supabase CLI 2.110.0 applied migrations 0001–0037 and failed while creating
statement 28, `public.submit_curriculum_answer`.

The same migration was applied through `psql` with verbose diagnostics on the
matching Supabase PostgreSQL 17.6.1.143 image. PostgreSQL returned:

```text
SQLSTATE: 42601
message: record variable cannot be part of multiple-item INTO list
line: into v_question, v_solution
parser location: read_into_target, pl_gram.y:3554
detail: none
hint: none
```

The invalid statement selected two composite rows into two `%rowtype`
variables in one PL/pgSQL `INTO` list. Migration 0038 now loads
`question.*` and `solution.*` with separate `SELECT ... INTO` statements.

The suspected row-variable array syntax compiled successfully on both
PostgreSQL 16 and the matching Supabase PostgreSQL 17 image. It was not the
root cause and was not changed speculatively.

## Fresh migration execution

- Clean local stack: `supabase stop --no-backup` then `supabase start`.
- Applied migration count: 38.
- Applied range: 0001 through 0038.
- Catalog maximum migration: 0038.
- `submit_curriculum_answer(uuid,text,text,integer,uuid)` exists.
- Release rows immediately after schema migration: 0.
- Result: PASS.

Migration 0038 SHA-256:
`9eee72dbdb6f3a8115fa6e92e73092b178b34d2dd6514ce3b307ba65f55bea8f`.

Migrations 0035–0037 remained byte-identical:

- 0035:
  `67bef151f4a8744c107835ce98ab5a5c30372cf76ff0328e02c1ca8649c7f206`
- 0036:
  `d88b21c866c5d19708dc544faaa2c5828e3127844c50f0d7e76a3716c07fc6f1`
- 0037:
  `91e2a4bb918bf894903f313d65d93bd80d8be98fad4fa2a1ca7c59cbbfe1b070`

## Materialization evidence

The deterministic release was materialized and activated only for the local
integration transaction:

| Relation | Actual count |
| --- | ---: |
| `curriculum_release_units` | 171 |
| `curriculum_release_questions` | 2,052 |
| `private.curriculum_release_solutions` | 2,052 |

Bundle SHA-256:
`3d5b1a60e4cbb30ea89b6a2018b4c70c49808aa18d584f623bf4bb93931696f4`.

## Database integration evidence

`supabase/operations/verify_0038_universal_curriculum_local.sql` completed
with:

```text
Universal curriculum disposable DB integration: PASS
```

The transactional operation executed:

- one complete persistent journey for synthetic Students Grades 1–9;
- unchanged legacy Grade 1 start/submit plus unified progress/history;
- universal start, resume and exact question sequencing for Grades 2–9;
- wrong answer feedback and solution delivery only after submit;
- correct answer evaluation against the private solution table;
- same-payload idempotent replay through the corrected `%rowtype` branch;
- idempotency payload conflict and CAS revision conflict;
- completion, history, unit progress, official-outcome evidence, skill
  evidence and mastery labels;
- wrong-grade, cross-user, anonymous, Parent and Teacher denial;
- authenticated direct-answer/direct-progress mutation denial;
- authenticated private-solution read denial.

Live catalog evidence:

- RLS plus FORCE RLS: 10/10 new relations;
- authenticated `SECURITY DEFINER` RPCs with empty `search_path`: 5/5;
- authenticated private-solution SELECT privilege: false;
- universal attempts after transactional rollback: 0;
- legacy fixture after verification: 18 attempts / 340 answers, unchanged.

## Regression and quality gates

The regression consists of:

- a source guard rejecting the invalid multi-rowtype `SELECT ... INTO`;
- an executable database assertion that replays the same submission and
  validates returned attempt revision, feedback, solution and evidence count.

Measured results:

| Gate | Result |
| --- | --- |
| Universal targeted tests | 20/20 PASS; 0 fail; 0 skip |
| Universal release validator | 171/2,052/2,052 PASS |
| Full sequential suite | 799/799 PASS; 0 fail; 0 skip |
| Typecheck | PASS |
| Lint | PASS |
| Production build | PASS; 61/61 static pages |
| Client artifact solution-boundary scan | PASS; 0 marker hits |
| Application service-role/public-runtime-flag scan | PASS; 0 hit files |
| Migration checksums | 0035–0038 PASS |

Supabase CLI creates generated runtime code below `supabase/.temp`; ESLint now
ignores that CLI-owned directory and continues to lint all repository source.
No file content in the local start-secret directory was inspected.

## Cleanup

- Synthetic journey data was rolled back by the verification transaction.
- The local release was restored to `DRAFT/INACTIVE`.
- `activated_at` and `retired_at` are null.
- Materialized counts remain 171/2,052/2,052 for reproducibility.
- The separate diagnostic PostgreSQL container was removed.
- The application runtime flag remains disabled/unset.
- Remote mutation, linking, deployment, publication and activation: none.

## Remaining findings

- BLOCKER: 0.
- HIGH: 0.
- MEDIUM: 1 — legacy Grade 1 official-outcome evidence remains an explicitly
  labelled unit-aligned product mapping, not question-authored evidence.

Local acceptance conclusion: `READY`.
