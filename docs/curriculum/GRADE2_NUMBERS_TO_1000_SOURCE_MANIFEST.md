# Source manifest — Các số trong phạm vi 1000

- Unit: `grade-2-numbers-to-1000`
- Content version: `poc-v1`
- `officialSourceValidation`: `VALIDATED`
- `technicalValidation`: `PASSED` for the five-seed review package
- `expertReview`: `OPTIONAL_NOT_OBTAINED`
- `ownerDecision`: `APPROVED_FOR_CONTROLLED_PILOT_PREPARATION`
- `publicationStatus`: `DRAFT`

This manifest validates traceability, not official endorsement. PLAVE has not
been certified by the Ministry, a teacher, or a publisher.

## 1. Source records

| Source ID | Role | Verified use | Boundary |
|---|---|---|---|
| `MOET-MATH-2018-G2` | Official Mathematics curriculum | Grade 2 number scope/outcomes on PDF page 12 | Paraphrase only; no copied lesson content |
| `VBPL-TT32-2018-LIFECYCLE` | Official legal lifecycle | Document number, effect/amendment cross-check | Does not replace the Mathematics appendix |
| `BGDDT-QD709-G2-TEXTBOOKS` | Approved-list metadata | Decision 709/QĐ-BGDĐT and Grade 2 textbook-list status | Does not establish a curriculum outcome |
| `NXBGD-TOAN2-KNTT-2021` | Approved-textbook metadata | Title, authors and Decision 709/QĐ-BGDĐT metadata | `CROSS_CHECK_ONLY`; no page-level alignment claim |
| `PLAVE-G2-NUM1000-POC-V1` | PLAVE original | Prompts, distractors, solutions, visuals, technical audit data | `ORIGINAL_TRANSFORMATION` |

The selected approved textbook is a cross-check reference. Its page content was
not imported into the repository and is not used to claim verbatim alignment.

## 2. Skill mapping

| Skill family | Official outcome/source | Approved-textbook reference | PLAVE transformation | Technical validators | Remaining hypotheses |
|---|---|---|---|---|---|
| `NUMBER_RECOGNITION_TO_1000` | Count and decimal composition to 1000; `MOET-MATH-2018-G2` | `NXBGD-TOAN2-KNTT-2021`, cross-check only | Seeded place-value chart and composition prompt | range, place-value visual, distractor map | prompt load; distractor difficulty |
| `READ_WRITE_TO_1000` | Read/write numbers to 1000; `MOET-MATH-2018-G2` | same cross-check | Seeded number card and PLAVE wording | number words, “linh” consistency, unique options | reading load |
| `PLACE_VALUE_TO_1000` | Hundreds, tens, ones; `MOET-MATH-2018-G2` | same cross-check | Code-native place-value chart | place value, visual equivalence, solution consistency | difficulty progression |
| `SEQUENCE_TO_1000` | Number order/number line within 1000; `MOET-MATH-2018-G2` | same cross-check | Seeded number line and adjacent-number prompt | line bounds, source answer, boundary checks | number-line span |

Comparison and ordering are confirmed within the official outcome but remain
outside this POC question-template subset. That is a `PRODUCT_DECISION`, not a
claim that the curriculum excludes them.

## 3. Vietnamese house style

`PRODUCT_DECISION` — generated PLAVE number words use “linh” when the tens digit
is zero in a three-digit number, for example “một trăm linh năm”. The validator
rejects generated “lẻ” to preserve internal consistency. PLAVE does not claim
that “lẻ” is linguistically wrong or disallowed by the curriculum.

## 4. Reading load and difficulty

The POC applies measurable limits:

- prompt: at most 160 characters and two clauses;
- solution: two reasoning steps in current templates;
- option: at most 48 characters;
- at most two introduced terms per question package.

All values are `PRODUCT_HYPOTHESIS`. They are configurable validation values,
not scientific or Ministry standards.

## 5. Distractors and misconceptions

Every wrong MCQ option maps to a typed misconception tag. No random distractor
is accepted without a mapping. Current tags cover place-value zero, place-value
order, number-word order, and off-by-one errors. The mathematical relationship
is technically validated; appropriateness of difficulty remains a product
hypothesis unless optional expert evidence is later obtained.

## 6. Visual and accessibility

`NUMBER_CARD`, `PLACE_VALUE_CHART`, and `NUMBER_LINE` are code-native,
PLAVE-original representations. Visual data and screen-reader descriptions are
validated against the same audit source. Client bundles contain neither
solution nor audit source.

No textbook scan, publisher illustration, raw SVG from a database, external
runtime image, or unlicensed asset is used.

## 7. Pilot eligibility

The unit is **not yet pilot-eligible**. Owner has approved release-candidate
preparation, not migration apply, Student visibility, controlled-pilot
activation or publication. The frozen candidate is documented in
[GRADE2_NUMBERS_TO_1000_RELEASE_CANDIDATE.md](./GRADE2_NUMBERS_TO_1000_RELEASE_CANDIDATE.md).

Optional expert review may be added later without rewriting the official-source
or technical evidence.

## 8. Manual verification boundary

Official curriculum scope and approved-textbook metadata are currently
verified. Manual page-level textbook verification is required only if PLAVE
later claims alignment to a specific textbook page/edition; this manifest makes
no such claim.
