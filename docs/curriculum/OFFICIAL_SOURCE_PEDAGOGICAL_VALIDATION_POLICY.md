# Official-source pedagogical validation policy

- Effective date: 2026-07-29
- Scope: content governance and controlled-pilot preparation
- Supersedes: mandatory Primary-Teacher Content Review as an absolute release
  blocker
- Database/publication effect: none

This policy does not delete prior Owner Approval or imply that an expert review
occurred. Historical review requests remain audit records and are marked
`SUPERSEDED_BY_OFFICIAL_SOURCE_VALIDATION_POLICY` where they conflict with this
policy.

## 1. Governing principle

```text
Official source determines curriculum scope.
PLAVE creates original learning content from that scope.
Automated validation verifies mathematical and technical correctness.
Owner controls pilot and publication decisions.
Expert review is optional additional evidence.
```

PLAVE does not claim to be certified or endorsed by the Ministry of Education
and Training, a teacher, or a textbook publisher. PLAVE does not replace
official teaching or school assessment.

## 2. Independent states

| Dimension | Values |
|---|---|
| `officialSourceValidation` | `NOT_STARTED`, `IN_PROGRESS`, `VALIDATED`, `NEEDS_CORRECTION` |
| `technicalValidation` | `NOT_RUN`, `PASSED`, `FAILED` |
| `expertReview` | `OPTIONAL_NOT_OBTAINED`, `EXPERT_REVIEWED`, `EXPERT_CHANGES_REQUESTED` |
| `ownerDecision` | `NOT_REVIEWED`, `APPROVED_FOR_CONTROLLED_PILOT`, `REVISION_REQUIRED` |
| `publicationStatus` | `DRAFT`, `PILOT_ELIGIBLE`, `PUBLISHED`, `RETIRED` |

`EXPERT_REVIEWED` may only be recorded with real reviewer, role, date, reviewed
content version, and result. `OPTIONAL_NOT_OBTAINED` is neutral evidence; it
does not mean the content is wrong.

Technical success never means `PUBLISHED`. Official-source validation never
means official endorsement. The engine, a validator, or an AI system cannot
publish content.

## 3. Source hierarchy

1. Current General Education Curriculum and its amendments/consolidations.
2. Mathematics subject curriculum and required learning outcomes.
3. Approved textbook list.
4. A selected approved textbook edition as implementation reference.
5. Official teacher guidance or training material.
6. PLAVE product decisions and original transformations.

Curriculum controls grade scope and outcome. A textbook may illustrate an
implementation but cannot replace the curriculum. PLAVE-specific sequencing,
unit split, wording, thresholds, and interaction remain clearly labelled
`PRODUCT_DECISION` or `PRODUCT_HYPOTHESIS`.

## 4. Typed source traceability

The runtime-neutral contract is defined at
`../../lib/content-engine/source-traceability.ts`. Every record contains:

- stable source ID and source type;
- issuing authority, title, document/approval number and version/edition;
- publication/access dates;
- a verified HTTPS source or a repository bibliographic reference for
  PLAVE-original material;
- applicable grades, domains, outcomes, and usage types;
- verification and copyright handling;
- notes describing exactly what is and is not inferred.

Empty/fake references, unapproved hostnames, missing outcome mappings, and
source-version mismatches fail closed. `SOURCE_REFERENCE_PENDING` is permitted
as an audit state but cannot support `officialSourceValidation = VALIDATED`.

## 5. Controlled-pilot eligibility

A draft is eligible to be moved manually to `PILOT_ELIGIBLE` only when:

```text
officialSourceValidation = VALIDATED
technicalValidation = PASSED
ownerDecision = APPROVED_FOR_CONTROLLED_PILOT
publicationStatus = DRAFT
```

Expert review is optional additional evidence. Eligibility evaluation only
returns a decision; it does not mutate state or publish. Publication remains a
separate Owner action.

A controlled pilot must use a content version, retain rollback capability,
offer a content-error reporting path, and explain that PLAVE results do not
replace official school assessment.

## 6. Copyright boundary

Allowed:

- mathematical knowledge and official curriculum outcomes;
- terminology required to teach the outcome;
- PLAVE-original prompts, explanations, distractors, and code-native visuals;
- source material used as `REFERENCE_ONLY`;
- short attributed quotations only when necessary.

Disallowed without an explicit licence:

- textbook scans or complete unlicensed PDFs;
- copied publisher page images or illustrations;
- bulk verbatim questions or page-by-page solutions;
- publisher assets presented as PLAVE runtime assets;
- branding that implies PLAVE is an official Ministry product.

Unknown assets remain `REFERENCE_ONLY` and do not enter runtime. The repository
must not scrape or store complete textbooks.

## 7. Policy audit of previous terms

| Previous location/term | Classification | Correction |
|---|---|---|
| `NEEDS_EXPERT_REVIEW` in historical Grade 1 decisions | Preserve audit history | Add supersession note; do not fabricate a review |
| Mandatory teacher gate in Grade 2 quality gates | Logic and wording change | Replace with official-source + technical + Owner gates |
| `NEEDS_EXPERT_REVIEW` in engine/review package | Logic change | Use independent governance states |
| Primary-teacher review form | Preserve audit history | Mark `SUPERSEDED`; optional expert evidence may use a new record |
| Teacher wording in adaptive/transition docs | Wording change | Treat thresholds and evidence sufficiency as product hypotheses |
| Owner Approval of Sprint 6D | Preserve | It approves direction/skill families, not publication |

## 8. Source references used by this policy

- [Thông tư 32/2018/TT-BGDĐT and legal lifecycle](https://vbpl.vn/TW/Pages/ivbpq-van-ban-goc.aspx?ItemID=146721)
- [Mathematics subject curriculum PDF](https://moet.gov.vn/content/vanban/Lists/VBDT/Attachments/1559/2.%20Ch%C6%B0%C6%A1ng%20tr%C3%ACnh%20m%C3%B4n%20To%C3%A1n.pdf)
- [Government notice about Decision 709/QĐ-BGDĐT approving Grade 2 textbooks](https://baochinhphu.vn/bo-gddt-phe-duyet-danh-muc-sach-giao-khoa-lop-2-lop-6-102287795.htm)
- [Official publisher metadata for Toán 2 — Kết nối tri thức](https://nxbgd.vn/bai-viet/gioi-thieu-sach-giao-khoa-lop-2-bo-sach-ket-noi-tri-thuc-voi-cuoc-song)
