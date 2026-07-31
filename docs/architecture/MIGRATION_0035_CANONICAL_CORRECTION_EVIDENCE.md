# Migration 0035 canonical correction evidence

Status: **REMOTE APPLIED/VERIFIED; CANONICAL SOURCE CORRECTED; REMOTE MUST NOT
RERUN**

Date: 2026-07-30

## Checksum provenance

| Artifact | SHA-256 | Meaning |
| --- | --- | --- |
| Remote-executed migration 0035 | `911816c87723b8e762c1a1d7470d49b616cfbb95495ddf28e166fd1d536c55f8` | The exact old artifact executed on controlled dev/staging |
| Canonical corrected migration 0035 | `67bef151f4a8744c107835ce98ab5a5c30372cf76ff0328e02c1ca8649c7f206` | The artifact for future clean environments |
| Historical migration 0036 snapshot | `806f4c2474bd80771d900684c854e65fcf60cebac8ce7792b7c0e71bd8b8ecdf` | Later failed remotely and was superseded by the corrected canonical checksum |
| Frozen candidate bundle | `1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530` | Unchanged release-candidate identity |

The corrected checksum is not represented as the checksum executed remotely.
The independent remote read-only diagnostic showed that the remote state
matches the intended canonical state. Migration 0035 must not be rerun there.
Current migration 0036 status and checksum provenance are recorded in
`MIGRATION_0036_FAILED_APPLY_CORRECTION_EVIDENCE.md` and the remote-operation
ledger.

## Root cause

The old source created `grade2_numbers_release_seed` as a temporary table with
`ON COMMIT DROP`. It loaded the frozen JSON bank into that table and referenced
the table from the question insert and solution insert. Its validation block
and final `COMMIT` followed those inserts.

The old checksum itself contained no statement after its final `COMMIT`.
Therefore the failing post-commit reporting query was not part of the
checksummed canonical SQL. The observed `42P01` is consistent with a
reporting/batch layer attempting to resolve the session-scoped seed relation
after commit had dropped it. The subsequent independent diagnostic proved
that the intended transaction had committed.

The correction removes the temporary relation completely. One PL/pgSQL `DO`
statement stores the unchanged release-bank JSON in a local typed variable and
performs both inserts from that variable. All candidate validation remains
before the single final `COMMIT`, and `COMMIT` is the last statement.

## Remote diagnostic evidence supplied by Owner

- Grade 1: 13 units, 312 questions and 312 solution mappings.
- Grade 2: one unit, 24 questions and 24 solution mappings.
- Distribution: 16 `MULTIPLE_CHOICE`, 8 `NUMBER_INPUT`, four skills with six
  questions each.
- Unit and questions remain unpublished.
- Grade 2 practice attempts: zero.
- Existing practice history: 18 attempts and 340 answers.
- Existing diagnostic history: one attempt and 24 answers.
- Migration 0036 schema: absent.
- Remote RLS drift objects: absent.
- Browser direct `SELECT` grants on `question_solutions`: zero.

## Two clean local database runs

Two project-scoped disposable Supabase/PostgreSQL databases were created
without remote link metadata:

| Run | Project ID | Database target |
| --- | --- | --- |
| A | `plave-0035-corrected-a` | `127.0.0.1:58422/postgres` |
| B | `plave-0035-corrected-b` | `127.0.0.1:58522/postgres` |

For each run:

1. Migrations `0001` through `0034` were applied from a clean database.
2. A local-only synthetic aggregate fixture created the locked pre-migration
   history counts: practice `18/340` and diagnostic `1/24`.
3. The corrected migration 0035 applied with `ON_ERROR_STOP=1`.
4. The post-apply read-only diagnostic returned `PASS` for all 23 metrics.
5. Grade 1 remained `13/312/312`.
6. Practice remained `18/340`; diagnostic remained `1/24`.
7. Migration 0036 then applied successfully, creating the expected three
   adaptive tables without changing those baselines.

No identity, answer value or solution payload was included in the evidence.
Both disposable stacks, their project-specific containers/volumes and
temporary logs were removed. The unrelated
`plave-backend-postgres-1` container was not modified.

## Release integrity

The release-candidate validator still reports:

- candidate `g2-numbers-to-1000-rc1`;
- content version `g2n1000-1.0.0-rc.1`;
- seed `g2-review-number-language`;
- score `100/100`;
- bundle SHA-256 unchanged;
- publication `DRAFT`;
- Student visibility `HIDDEN`.

No candidate content, question ID, answer, solution, visual, source manifest or
feature flag changed.

## Operational boundary

- No remote query or mutation was performed during the correction.
- Migration 0035 was not rerun remotely.
- Migration 0036 was not applied remotely.
- Grade 2 was not published.
- All four runtime/pilot/retention feature flags remain false.
