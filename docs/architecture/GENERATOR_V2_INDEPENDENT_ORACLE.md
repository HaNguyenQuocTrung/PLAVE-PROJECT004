# Generator V2 Independent Oracle

Updated: 2026-08-02
Status: implemented for Sprint 10C; independent re-audit still required

## Purpose

The Sprint 8C full-coverage audit proved deterministic self-consistency, but it
could not prove independent correctness because several validators reused the
same solve path as generation. Sprint 10C adds a separate package at
`lib/generation-v2-oracle/`. The oracle evaluates the Student-visible problem
contract and never acts as a runtime generator or answer service.

The boundary is:

```text
Generator V2
  -> public prompt + public structured/visual data + interaction schema
  -> sanitized oracle candidate
  -> independent parse/model/solve/ambiguity/interaction/visual/grade checks
  -> diagnostics only
```

The external audit runner may import both packages to construct a sanitized
candidate and compare results. Code under `lib/generation-v2-oracle/` does not
import `lib/generation-v2/`, runtime submit validation, generated expected
answers, worked solutions, distractor correctness flags, or hidden branch state.

## Public candidate contract

The oracle receives only evidence available from the Student problem surface:

- outcome ID, grade, difficulty and declared capability identity from canonical
  curriculum metadata;
- public Vietnamese prompt and response instruction;
- public structured values that are rendered to the Student;
- public diagram, chart, table or number-line data;
- the typed interaction and public option labels;
- curriculum outcome metadata needed for grade/domain bounds.

It must not receive the correct answer, worked solution, private validation
receipt, private hash, solution flag or generator-only parameter. Audit artifacts
store answer cardinality and diagnostic codes, not the answer itself.

## Independent representations

The package owns its parsing and mathematical representation:

- integer work uses exact integer arithmetic and `BigInt` where required;
- fractions and ratios are reduced with an oracle-owned rational representation;
- decimals use controlled integer scaling and explicit rounding;
- algebra uses oracle-owned parsing and symbolic/numeric constraints;
- geometry recomputes quantities from visible dimensions and units;
- statistics recomputes results from the visible dataset;
- probability enumerates the visible finite sample space;
- visual validators compare rendered public data with prompt evidence;
- interaction validators recompute answer cardinality and option equivalence.

The implementation is organized in `exact.ts`, `types.ts`, `oracle.ts` and
`index.ts`. Diagnostic errors are typed so insufficiency, ambiguity, prompt-data
mismatch, visual mismatch, interaction mismatch, invalid distractors and answer
mismatch are distinguishable.

## Independence proof

`scripts/audit-generator-v2-oracle-independence.ts` performs two gates:

1. a dependency scan rejects imports from Generator implementations, Generator
   solvers/validators and runtime submit validation;
2. seven mutation controls must be killed with their expected diagnostic:
   generated expected-answer mutation, visible prompt mutation, visual mutation,
   interaction mutation, ambiguous option insertion, required-evidence removal,
   and unit-contract mutation.

The result is recorded in:

- `artifacts/remediation/generator-oracle-dependency-audit.json`;
- `artifacts/remediation/generator-oracle-mutation-tests.json`.

## Full correctness audit

`npm run --silent audit:generator-v2-independent-oracle` enumerates the canonical
546-outcome inventory, all three difficulties and 20 deterministic seeds. The
expected 32,760 coordinate keys must be unique and complete. Any failed sample,
missing or duplicate coordinate, generic fallback, keyword routing, provenance
gap, exact duplicate, or near-duplicate batch above 0.12 makes the process exit
non-zero.

Each stored sample result is sanitized and contains only traceability, pass/fail,
diagnostic codes, answer cardinality, and interaction/visual/curriculum/product
flags. Private answers are not written to the public remediation artifact.

## Eligibility promotion

Oracle PASS alone is insufficient. The finalizer promotes a capability to
`STUDENT_RUNTIME_ELIGIBLE` only when all of these hold:

- every mapped outcome and all 60 samples per outcome pass the independent oracle;
- dependency and mutation controls pass;
- interaction, visual and language contracts pass;
- one public-only representative sample is developer-reviewed;
- authenticated `/api/curriculum-runtime/*` persistence proof passes for that
  capability without internal proof/review routes;
- browser and screenshot review have no critical/high issue or private leak.

Promotion is all-or-nothing per capability. Repository default remains OFF and
the eligibility set is activated only by explicit local/disposable Sprint 10C
configuration. Unknown or ineligible outcomes continue to fail closed with
`GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED` or the typed runtime eligibility error.

## Adding a future outcome safely

An additional canonical outcome must have an explicit registry mapping and a
publicly sufficient product contract. The developer must add or extend an oracle
family without importing Generator solve code, add negative/mutation coverage,
run the 60-sample outcome gate, review the public product sample, and prove the
real Student runtime/persistence journey. Eligibility must remain fail closed
until every gate passes.

## Scope limits

The automated oracle cannot by itself establish natural language usefulness.
Sprint 10C therefore includes a 198-capability developer product review, but it
does not create a new Owner approval. Sprint 10D must independently re-audit the
implementation and evidence before Milestone 2 can be reconsidered.
