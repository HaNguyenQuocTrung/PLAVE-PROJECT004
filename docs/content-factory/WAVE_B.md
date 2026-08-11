# Grades 1–9 Wave B

Wave B is a bounded, source-traceable production increment. It preserves every Wave A artifact and creates separate immutable Wave B plus derived A+B candidate bindings. It does not replace later Waves C–N and does not claim curriculum completion.

## Slices

| Grade | Bounded slice | Candidate behavior |
|---:|---|---|
| 1 | Immutable evidence overlay for addition within 10 | Existing source bytes only; 24 independently verified questions |
| 2 | Addition and subtraction fluency | Original deterministic integer questions |
| 3 | Multiplication tables and one-digit multiplication/division | Original deterministic integer questions |
| 4 | Fraction recognition, equivalence and comparison | Exact reduced-rational verification |
| 5 | Fraction reduction, comparison and operations | Exact rational verification |
| 6 | Factors, primes, factorization, GCD and LCM | Independent number-theory verification |
| 7 | Finite-sample probability | Exact sample-space ratios |
| 8 | Structured Pythagorean problems | Exact integer-triangle invariants |
| 9 | Frequency, relative frequency and finite probability | Exact counts and ratios |

Every candidate is `DRAFT/HIDDEN`; publication, pilot, runtime and retention flags are false. No entitlement is present by default. Combined A+B candidates exist only for local simulation and coverage.

## Reproduction

```text
npm run content:wave-b
npm run test:wave-b
```

The build writes deterministic candidates, checksums, coverage, independent-audit and simulation receipts under `content/grade-packs/generated/`. Generation is credential-free and performs no database or network operation.

Grade 1 reports zero generated questions because its Wave B work is a non-mutating evidence overlay. Its 24 eligible questions retain their source identities and bytes. The original Grade 1 shadow tuple remains an immutable historical artifact.

Automated verification insufficiency causes quarantine and candidate exclusion. It never becomes a mandatory human-review dependency. Owner authorization remains necessary only for future remote mutation, pilot activation, publication or deployment.
