# Sprint 8C.F — Final coverage and integrated Generator V2 audit

Ngày chốt technical evidence: 2026-08-02  
Kết quả historical: `COMPLETE_OWNER_APPROVED`  
Milestone 2 active: `REOPENED_CRITICAL_REMEDIATION`

`MILESTONE_2=REOPENED_CRITICAL_REMEDIATION`

Owner usefulness approval vẫn được giữ như historical decision. Complete project
re-audit ngày 2026-08-02 mở lại active milestone cho critical remediation và
reproducibility; sprint này không thay đổi quyết định Owner.

## Phạm vi Wave F đã khóa

Canonical reconciliation xác nhận Wave F taxonomy có 12 outcomes. Hai outcomes
đã được triển khai từ baseline trước đó (`APPLIED_TWO_STEP` và
`DATA_ERROR_REASONING`); đúng mười outcomes còn lại được implement trong Sprint
8C.F:

| Outcome ID | Lớp | Capability |
|---|---:|---|
| `MOET2018-G1-NUM-P022-003` | 1 | `TENS_ONES_STRUCTURE` |
| `MOET2018-G2-GEO-P026-004` | 2 | `MASS_COMPARISON_REASONING` |
| `MOET2018-G5-GEO-P044-008` | 5 | `UNIFORM_MOTION_REASONING` |
| `MOET2018-G6-STA-P053-005` | 6 | `CROSS_CURRICULAR_STATISTICS_REASONING` |
| `MOET2018-G7-STA-P061-005` | 7 | `CROSS_CURRICULAR_STATISTICS_REASONING` |
| `MOET2018-G7-EXP-P062-002` | 7 | `TAX_CALCULATION_REASONING` |
| `MOET2018-G8-NAA-P064-010` | 8 | `RATIONAL_EXPRESSION_PROPERTY_REASONING` |
| `MOET2018-G8-NAA-P064-011` | 8 | `RATIONAL_EXPRESSION_CONCEPT_REASONING` |
| `MOET2018-G8-STA-P069-010` | 8 | `CROSS_CURRICULAR_STATISTICS_REASONING` |
| `MOET2018-G8-EXP-P070-008` | 8 | `SCIENTIFIC_ALGEBRA_REASONING` |

`WAVE_F_OUTCOMES=10`, pre-implementation coverage là 536 và post-implementation
coverage là 546. Mười mappings dùng tám capability mới, explicit outcome IDs và
typed contracts; không keyword routing, synthetic alias, generic fallback hoặc
runtime LLM solving.

## Wave F gates

- 10/10 final outcomes implemented; blocker và metadata-insufficient list đều rỗng.
- 600/600 deterministic samples được independent solver/validator kiểm tra.
- Exact duplicates = 0; maximum near-duplicate pair rate = 0,005263 ≤ 0,12.
- Fallback = 0; keyword routing = 0; provenance = 8/8.
- Negative controls bao phủ cả tám family và unknown outcome trả đúng
  `GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED`.
- Authenticated local database proof trên fresh disposable schema 0001–0042 PASS:
  concurrent start, resume không regenerate, correct/incorrect submit, CAS,
  duplicate submit, exactly-once progress/history, rollback, RLS/role isolation,
  completion và cleanup.
- Playwright Core 1.51.1 + Chrome 150.0.7871.186 chạy tại 390×844 và 1280×800.
  10/10 Wave F taxonomy capabilities, các grade/difficulty/interaction liên quan,
  correct/incorrect feedback, resume và completion đều PASS.
- 19/19 Wave F screenshots được mở ở original detail; final critical/high = 0.

## Canonical reconciliation 546 outcomes

Wave totals chuẩn hóa: A 98 + B 61 + C 57 + D 232 + E 86 + F 12 = 546.
Hai baseline trong Wave F giải thích vì sao coverage trước Sprint là 536 dù tổng
A–E là 534.

Reconciliation PASS:

- Canonical total = 546; unique outcome IDs = 546.
- Missing IDs, duplicate IDs/wave assignments, conflicting capability mappings,
  completed-but-unmapped outcomes và synthetic/non-curriculum coverage đều `[]`.
- Generic fallback = 0; keyword routing = 0.
- Unknown mapping fail closed bằng `GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED`.

## Full integrated technical audit

- 546/546 explicit mappings và 198 canonical capabilities.
- 32.760/32.760 samples được chạy lại trực tiếp theo 546 × 3 difficulties × 20
  seeds; report không cộng ghép các audit Wave cũ.
- Independent solve/validation 32.760/32.760; exact duplicate, invalid/ambiguous
  math, prompt/answer/visual mismatch và private leak đều 0; mọi near-duplicate
  batch ≤ 0,12; provenance 8/8.
- Full authenticated browser/database matrix persist 2.388 immutable generated
  questions trong 199 completed attempts, đại diện đủ 198/198 capabilities,
  Grades 1–9, EASY/MEDIUM/HARD và 10 interaction types.
- Concurrent start, process-restart resume, CAS/idempotency, exactly-once evidence,
  RLS, role isolation, rollback, source `GENERATED_V2`, orphans = 0 và cleanup đều PASS.
- Console, hydration, page error, overflow, disabled control, focus, accessibility
  blocker, private leak và prompt/visual mismatch đều 0.
- 86/86 integrated screenshots được mở ở original detail. Review đầu phát hiện
  hai lỗi HIGH (place-value digit columns và RECOVER_WHOLE percentage field), cả
  hai đã sửa rồi rerun toàn bộ 198-capability browser matrix. Final critical/high = 0.

## Full regressions

Generator core/Waves A–F/full coverage và persistence/security PASS. Practice
550/550, curriculum 9/9 và 21/21, competency 10/10, UI/UX 13/13, AI Tutor 40/40,
typecheck, lint sạch và production build 77/77 đều PASS.

`npm audit` hiện là `UNVERIFIED_ENVIRONMENT_BLOCKED`: sandbox trả `ENOTFOUND`
cho registry.npmjs.org và escalation bị policy từ chối dependency-metadata
egress. Không claim current PASS; last verified result là 0 vulnerabilities ngày
2026-08-01.

## Owner usefulness acceptance

Manifest bounded có 198 public-only samples, một sample cho mỗi canonical
capability, bao phủ Grades 1–9, toàn bộ domain, EASY/MEDIUM/HARD, mười interaction
types và visual/feedback representative. Owner đã đưa ra quyết định thật:
`OWNER GENERATOR V2 USEFULNESS ACCEPTANCE: APPROVED`.

`ownerDecision=APPROVED`; source là `OWNER_EXPLICIT_DECISION`. Browser draft và
198 per-sample decisions không được persist, vì vậy artifact ghi rõ
`perSampleDecisionDataAvailable=false` và không tự tạo individual approvals hay
counts. Quyết định tổng thể đóng Milestone 2 nhưng không phải tuyên bố production
readiness, deployment hoặc remote activation.

Evidence chính:

- `artifacts/generator-v2-wave-f/report.json`
- `artifacts/generator-v2-full-coverage/canonical-reconciliation.json`
- `artifacts/generator-v2-full-coverage/report.json`
- `artifacts/generator-v2-full-coverage/regression-evidence.json`
- `artifacts/generator-v2-owner-review/manifest.json`
- `artifacts/generator-v2-owner-review/result.json`

Historical marker: MILESTONE 2 — PLAVE GENERATOR V2 COMPLETE — OWNER APPROVED
