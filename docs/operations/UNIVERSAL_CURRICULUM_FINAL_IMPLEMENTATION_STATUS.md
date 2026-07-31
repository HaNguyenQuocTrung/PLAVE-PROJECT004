# Universal Curriculum Final Implementation Status

## Decision

`READY — GRADES 1–9 PERSISTENT LEARNING VERIFIED ON LOCAL SUPABASE`

The migration, materialized release bank, secure RPCs and synthetic Student
journeys have executed successfully on disposable local Supabase PostgreSQL.
No remote action was performed or authorized.

## Migration correction

Supabase CLI failed at statement 28 because PL/pgSQL does not allow two
composite record variables in one multi-item `INTO` target:

```text
SQLSTATE 42601
record variable cannot be part of multiple-item INTO list
```

The idempotent branch of `submit_curriculum_answer` now loads the public
question and private solution with two independent `SELECT ... INTO`
statements. The suspected row-variable array subscript compiled on both
PostgreSQL 16 and the matching Supabase PostgreSQL 17 image and was not
changed.

Fresh `supabase start` applied all 38 migrations, 0001 through 0038.
Migration 0038 SHA-256:
`9eee72dbdb6f3a8115fa6e92e73092b178b34d2dd6514ce3b307ba65f55bea8f`.

Migrations 0035–0037 remain byte-identical to their verified baselines.

## Release and database evidence

| Field | Verified value |
| --- | --- |
| Release | `plave-math-grades-1-9-v1` |
| Content version | `2026.07.30-draft.1` |
| Units | 171 |
| Public questions | 2,052 |
| Private solutions | 2,052 |
| Bundle SHA-256 | `3d5b1a60e4cbb30ea89b6a2018b4c70c49808aa18d584f623bf4bb93931696f4` |
| Final local state | `DRAFT/INACTIVE` |
| Remote state | `REMOTE_NOT_APPLIED / CONTENT_NOT_ACTIVATED` |

The local verification operation passed complete synthetic Grades 1–9
journeys. It covered start/resume, submit, authoritative correctness,
post-submit solution feedback, same-payload idempotency, idempotency conflict,
CAS conflict, completion, history, progress and mastery evidence.

Authorization coverage passed for wrong grade, cross-user, anonymous, Parent
and Teacher callers. Direct authoritative mutation and private-solution reads
were denied to `authenticated`.

Catalog evidence:

- RLS and FORCE RLS: 10/10 relations;
- authenticated secure RPCs with empty `search_path`: 5/5;
- authenticated private-solution SELECT: false;
- Grade 1 fixture: 18 attempts / 340 answers before and after;
- universal attempts after transactional verification rollback: 0.

## Grade 1 compatibility

Grade 1 stays on the existing fixed-practice runtime. Migration 0038 does not
alter or backfill legacy units, questions, solutions, attempts or answers.
Unified progress/history reads legacy evidence without duplicating universal
attempts.

The official-outcome grouping remains the documented
`LEGACY_UNIT_ALIGNED_PRODUCT_MAPPING_V1`. This is the single remaining MEDIUM
limitation and is not represented as question-authored expert evidence.

## Quality gates

| Gate | Result |
| --- | --- |
| Universal targeted tests | 20/20 PASS |
| Release validator | 171/2,052/2,052 PASS |
| Local database integration | PASS |
| Full sequential suite | 799/799 PASS; 0 fail; 0 skip |
| Lint | PASS |
| Typecheck | PASS |
| Production build | PASS; 61 static pages |
| Client solution-boundary scan | PASS; 0 marker hits |
| Application service-role/public-flag scan | PASS; 0 hit files |
| Migration 0035–0038 checksums | PASS |

The database regression executes the corrected idempotent replay branch and
asserts revision, feedback, solution and evidence stability. A source guard
also rejects reintroduction of the invalid multi-rowtype `INTO`.

## Cleanup and boundaries

- The verification transaction rolled back synthetic journey rows.
- The release was restored to `DRAFT/INACTIVE`; activation/retirement
  timestamps are null.
- Materialized rows remain locally for deterministic reproduction.
- The standalone diagnostic PostgreSQL container was removed.
- The runtime feature flag remains disabled/unset.
- No linked command, remote database URL, project ref, remote mutation,
  deployment, publication or activation was used.

## Findings

| Severity | Count | Detail |
| --- | ---: | --- |
| BLOCKER | 0 | None |
| HIGH | 0 | None |
| MEDIUM | 1 | Legacy Grade 1 outcome evidence is unit-aligned, not question-authored |

Conclusion: `READY`.
