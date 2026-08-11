# Grades 1–9 content factory Wave C

Wave C is an additive, bounded production slice. It does not alter Wave A, Wave B, Grade 1 SQL/runtime, the Grade 1 shadow tuple, or the frozen Grade 2 tuple. It creates separate Wave C and derived A+B+C candidates; all remain `DRAFT/HIDDEN` with pilot, runtime, and retention flags disabled.

## Retained source boundary

| Grade | Slice | Retained outcome rows | Pages |
|---:|---|---|---|
| 1 | Immutable subtraction-within-10 evidence overlay | Legacy repository SQL only | N/A |
| 2 | Multiplication/division tables 2 and 5 | `P025-006/009/017/018` | 25 |
| 3 | Unit fractions and equal groups | `P031-023/024` | 31 |
| 4 | Common denominators and fraction reduction | `P036-021/022` | 36 |
| 5 | Decimal representation, place value, comparison, addition/subtraction | `P041-005/008/011`, `P042-019` | 41–42 |
| 6 | Fraction arithmetic | `P049-040` | 49 |
| 7 | Ratios and proportional relationships | `P057-019/020/024/028/031/032` | 57 |
| 8 | Algebraic identities and factorization | `P063-001/003`, `P064-019` | 63–64 |
| 9 | Grouped-frequency tables and charts | `P077-016/019` | 77 |

Grade 1 produces no replacement questions. Its public-prompt subtraction oracle verifies the existing question, answer, and explanation triples and records immutable source hashes. Any non-verifiable row would remain outside the candidate as `AUTOMATED_VERIFICATION_INSUFFICIENT`; this slice has zero such rows.

Grades 2–9 each contain 24 deterministic, source-bound questions. Exact integer, rational and decimal derivations use an independent bigint oracle; Grade 8 additionally uses an independent polynomial parser and coefficient-expansion oracle. No textbook exercise is copied and no curriculum completion claim is made.

## Reproduction

```sh
npm run content:wave-c
npm run test:wave-c
npm run test:wave-b
npm run typecheck
npm run lint
npm run build
git diff --check
```

`test:wave-c-shards` runs nine local grade processes concurrently, then the Wave C tests perform cross-grade source, duplicate/equivalence, progression, simulation, frozen-artifact, bundle, release, and report reconciliation checks. Simulations prove software behavior only. Prerequisite edges not asserted by retained source evidence remain explicit `HYPOTHESIS_REQUIRES_EVIDENCE` records.
