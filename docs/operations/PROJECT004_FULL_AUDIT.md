# PROJECT004 targeted remediation re-audit

> **ARCHIVED_NON_OPERATIONAL:** Historical audit snapshot. Current operational
> identity is PROJECT004 only; comparison and transfer notes are not commands.

Re-audit date: 2026-07-30
Scope: PROJECT004 local source and tests only
Remote actions performed: false

## Decision

`PROMOTE_PROJECT004_TO_PRIMARY`

All three HIGH findings from the 2026-07-30 audit are closed with code and test evidence. The final source state has zero BLOCKER, zero HIGH, 717/717 local tests passing, lint PASS, typecheck PASS and production build PASS.

This decision means PROJECT004 is suitable to become the primary development tree. It does not authorize a directory rename, copy, deployment, remote SQL, activation or publication in this run.

## Closed HIGH findings

### H1 — Grade 5 decimal-comparison teaching

Status: CLOSED.

The comparison method now:

1. aligns decimal places by adding zeroes only at the right end of the fractional part;
2. compares integer parts first;
3. compares tenths, hundredths and later places only when integer parts are equal;
4. explicitly rejects deciding by written length or digit count.

The worked example now states:

- write 2 as 2,0;
- compare integer parts, `1 < 2`;
- conclude `1,9 < 2,0`, therefore `1,9 < 2`.

Semantic tests cover:

- 1,9 and 2;
- 2 and 2,0;
- 2,05 and 2,5;
- 0,9 and 0,89;
- 10,01 and 9,99;
- 3,140 and 3,14;
- consistency across theory, worked example, feedback and solution;
- deterministic generation;
- absence of digit-count/length heuristics.

Targeted result: 4/4 PASS.

### H2 — Required visual rendering

Status: CLOSED.

The old `type + description` question shape was replaced by a typed discriminated visual payload. The renderer uses internal HTML/CSS/SVG; it does not parse prompt text, use remote images, add a dependency or use `dangerouslySetInnerHTML`.

Every visual includes a real rendered model, an accessible figure label and a caption. Unsupported kinds fail closed with an alert rather than being guessed.

| Visual kind | Grades / units |
| --- | --- |
| `COUNTER_ROW` | G1 numbers; G2/G3 multiplication and division |
| `PLACE_VALUE_CHART` | G2 numbers to 1000; G4 whole-number operations |
| `FRACTION_BAR` | G3 unit fractions; G4/G5 fraction units |
| `DECIMAL_PLACE_VALUE_CHART` | G5 decimal operations |
| `NUMBER_LINE` | G6 integers and fractions |
| `RATIO_TABLE` | G7 ratio and proportion |
| `BALANCE_MODEL` | G8 linear equations |
| `COORDINATE_PLANE` | G8 linear functions; G9 functions and systems |

Counter groups, fractional points and ratio tables preserve typed question parameters. Solution fields are absent from the visual contract. The practice client receives solutions only in the POST response after submission.

Targeted rendered-markup/contract result: 6/6 PASS.

The local server still cannot bind a port in this sandbox (`listen EPERM`). Therefore no screenshot or live-browser PASS is claimed for 360px, 768px or 1440px. Rendered-markup tests and responsive CSS contract tests verify bounded width, mobile rules and overflow containment.

### H3 — Aggregate test suite

Status: CLOSED.

The two backup suites no longer require a real `.env.local`. They inject a mode-0600 public-environment fixture and also prove that missing or malformed fixtures fail closed without creating artifacts or printing credentials.

The RLS remediation test now asserts the exact canonical 0037 filename and the exact sorted set of 28 repository-created public tables. No assertion was removed or skipped.

Former-failure targeted result: 32/32 PASS.
Final aggregate result: 717/717 PASS.

## Curriculum integrity recheck

- Grades represented end-to-end: 9/9.
- Preview units: exactly 16.
- Deterministic preview questions: exactly 192.
- Solution mappings: exactly 192.
- Theory sections: exactly 4 per unit.
- Worked examples: at least 2 per unit.
- Skill families: at least 3 per unit.
- Deep recheck sample: 48 questions, three from every unit.
- Feedback/solution availability: after POST submission.
- Preview solution preload/static marker scan: PASS.
- Grade 1 regression: 550/550 PASS.
- Grade 1 validator: 13 units, 312 questions and 312 solutions PASS.
- Frozen Grade 2 release validation: PASS; bundle remains DRAFT/HIDDEN.
- Frozen bundle SHA-256: `1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530`.

The preview remains a vertical slice, not a complete Grades 1–9 curriculum. The coverage registry still reports exactly 40 grade/domain gaps.

## Final quality gates

| Gate | Result |
| --- | --- |
| Decimal semantic tests | PASS — 4/4 |
| Visual renderer/contract tests | PASS — 6/6 |
| Former failing backup/RLS group | PASS — 32/32 |
| Curriculum/API tests | PASS — 9/9 |
| Curriculum validator | PASS — 16 units / 192 questions / 40 gaps |
| Grade 1 regression | PASS — 550/550 |
| Grade 1 validator | PASS |
| Grade 2 frozen tests and validators | PASS |
| Adaptive practice/runtime/database/API/pilot | PASS |
| Registration tests | PASS — 5/5 |
| Full suite | PASS — 717/717 |
| ESLint | PASS |
| Typecheck | PASS |
| Production build | PASS |
| Local HTTP/browser viewport smoke | BLOCKED_BY_ENVIRONMENT — `listen EPERM` |
| npm audit | NOT_RUN — network boundary |

## Security and integrity

- Secret-shaped credential scan: PASS.
- PII review: only test fixtures and form labels; no real PII observed.
- Service-role credential: none observed.
- Direct `question_solutions`/`teacher_question_solutions` application query scan: PASS.
- Unsafe typing scan for `any`, `as any`, `<any>`, `@ts-ignore`, `@ts-expect-error`: PASS.
- Curriculum `dangerouslySetInnerHTML` scan: PASS.
- Preview static-client marker scan: PASS.
- Package/lockfile consistency: PASS.
- Migration divergence: none.
- Migration checksums:
  - 0035: `67bef151f4a8744c107835ce98ab5a5c30372cf76ff0328e02c1ca8649c7f206`
  - 0036: `d88b21c866c5d19708dc544faaa2c5828e3127844c50f0d7e76a3716c07fc6f1`
  - 0037: `91e2a4bb918bf894903f313d65d93bd80d8be98fad4fa2a1ca7c59cbbfe1b070`

## Remaining non-HIGH limitations

- Forty grade/domain coverage gaps remain.
- Outcome source locations are not yet page-granular.
- PROJECT003 and PROJECT004 are untracked directories in a parent Git repository, so filesystem promotion requires an Owner-controlled backup/checksum rollback plan.
- Package/document identity cleanup should occur as part of the eventual promotion procedure, not this remediation.
- Live browser viewport smoke and npm audit remain unrun due environment/network boundaries.

## Files created

- `app/curriculum-preview/CurriculumVisual.ts`
- `lib/curriculum/visual.ts`
- `tests/curriculum-visual.test.ts`
- `tests/grade5-decimal-comparison.test.ts`

## Files modified

- `app/curriculum-preview/CurriculumPreviewRunner.tsx`
- `app/curriculum-preview/page.tsx`
- `app/globals.css`
- `lib/curriculum/engine.ts`
- `lib/curriculum/registry.ts`
- `lib/curriculum/types.ts`
- `scripts/backup-supabase-dev-readonly.sh`
- `tests/backup-credential-handling.test.mjs`
- `tests/backup-lifecycle.test.mjs`
- `tests/remote-rls-drift-remediation.test.mjs`
- `docs/operations/PROJECT004_FULL_AUDIT.md`
- `docs/operations/PROJECT_PRIMARY_DECISION.md`
- `docs/operations/PROJECT_PRIMARY_DECISION.json`

No curriculum status artifact was changed because the counts and 40 declared gaps did not change.
