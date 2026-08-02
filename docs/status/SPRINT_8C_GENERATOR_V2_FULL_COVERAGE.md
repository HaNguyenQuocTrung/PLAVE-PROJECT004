# Sprint 8C — Generator V2 full canonical coverage

Ngày cập nhật: 2026-08-02  
Historical technical/Owner state: `COMPLETE_OWNER_APPROVED`  
Milestone 2 active: `REOPENED_CRITICAL_REMEDIATION`

`MILESTONE_2=REOPENED_CRITICAL_REMEDIATION`

Owner approval remains recorded. Complete project re-audit reopened the active
status for critical remediation and reproducibility; no historical decision was
deleted or rewritten.

## Canonical coverage

Generator V2 có đúng 546 explicit official outcome mappings và 198 canonical
capabilities:

| Wave | Outcomes | Technical state |
|---|---:|---|
| A — Numbers and arithmetic | 98 | COMPLETE_BROWSER_VALIDATED |
| B — Fractions, decimals, ratio and percentage | 61 | COMPLETE_BROWSER_VALIDATED |
| C — Algebra | 57 | COMPLETE_BROWSER_VALIDATED |
| D — Geometry and measurement | 232 | COMPLETE_BROWSER_VALIDATED |
| E — Statistics, probability and applied domains | 86 | COMPLETE_BROWSER_VALIDATED |
| F — Final reconciliation taxonomy | 12 | COMPLETE_BROWSER_VALIDATED |
| **Total** | **546** | **TECHNICALLY_COMPLETE** |

Wave F chứa hai baseline đã có trước Sprint 8C.F và mười final outcomes mới. Vì
vậy A–E cộng 534, pre-implementation coverage là 536 và final coverage là 546.

Canonical reconciliation:

- inventory total = unique IDs = 546;
- missing, duplicates, conflicting wave/capability assignments,
  completed-but-unmapped và synthetic coverage = `[]`;
- generic fallback = 0; keyword routing = 0;
- unknown mapping fail closed bằng `GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED`;
- source discriminator `GENERATED_V2`; provenance 8/8.

## Generation and correctness audit

Audit tích hợp chạy lại đủ 32.760 samples: 546 outcomes × 3 difficulties × 20
deterministic seeds. Không dùng tổng report cũ để thay cho execution.

- Independently solved and validated: 32.760/32.760.
- Exact duplicate = 0; mọi outcome/difficulty near-duplicate rate ≤ 0,12.
- Fallback/keyword routing = 0.
- Invalid/ambiguous mathematics, prompt-answer-visual mismatch và private leak = 0.
- Deterministic replay và provenance 8/8 PASS.
- Negative controls reject unsupported outcome, malformed model, invalid domain,
  ambiguous answer, wrong solver, invalid unit/precision, impossible visual,
  grade violation, mismatch, leak và duplicate violations.

## Integrated authenticated runtime/database/browser audit

Fresh disposable local schema 0001–0042 và authenticated Student path chạy
198/198 canonical capabilities, Grades 1–9, EASY/MEDIUM/HARD và mười interaction
types.

- 199 completed attempts; 2.388 immutable questions, private solutions và
  exactly-once evidence rows; complete provenance rows 2.388; orphans 0.
- Concurrent start, resume qua process restart không regenerate, correct/incorrect
  submit, CAS conflict, duplicate submit, completion, rollback, RLS/role isolation
  và cleanup đều PASS.
- Student khác/Parent/Teacher bị 403; anonymous 401; direct table writes 403;
  private solution read 404; legacy RPC bypass 403.
- Playwright Core 1.51.1 + Chrome 150.0.7871.186 tại 390×844 và 1280×800;
  in-app Browser không dùng và browser mới không được download.
- Console, hydration, page errors, overflow, required-control/focus/accessibility
  blockers, private leaks và prompt/visual mismatch = 0.
- 86/86 final screenshots mở ở original detail. Hai lỗi HIGH tìm trong review đầu
  đã sửa (place-value column mapping và RECOVER_WHOLE percentage table), sau đó
  rerun toàn bộ matrix. Final critical/high = 0.

## Regression gates

- Generator V2 core, Waves A–F, full coverage, persistence/security: PASS.
- Practice 550/550.
- Curriculum 9/9 và 21/21.
- Competency 10/10.
- UI/UX 13/13.
- AI Tutor 40/40.
- Typecheck PASS; lint 0 errors/0 warnings.
- Production build 77/77 pages after adding the loopback Owner decision route.
- `npm audit`: `UNVERIFIED_ENVIRONMENT_BLOCKED` do ENOTFOUND trong sandbox và
  policy từ chối dependency-metadata egress khi escalation. Không claim current
  PASS; last verified 0 vulnerabilities ngày 2026-08-01.

## Owner usefulness acceptance

Bounded package có 198 public-only samples, một sample cho mỗi canonical
capability. Traceability bao gồm outcome, capability, grade, difficulty, seed,
domain, interaction, expected skill và screenshot/review state. Owner đã đưa ra
quyết định thật: `OWNER GENERATOR V2 USEFULNESS ACCEPTANCE: APPROVED`.

`ownerDecision=APPROVED`; `ownerDecisionSource=OWNER_EXPLICIT_DECISION`.
Phạm vi review là 198/198 samples/capabilities. Không có browser draft hoặc
per-sample decision submission được persist, nên
`perSampleDecisionDataAvailable=false`; các count approved/rejected/needsRevision
theo từng sample là `null`, không được suy diễn thành 198 individual approvals.

Sprint 8C.G đã mở review operation bằng một command loopback-only:
`npm run --silent generator-v2:owner-review-start`, URL
`http://127.0.0.1:3033/internal/generator-v2-owner-review`. Launcher tái sử dụng
validated remote-development Supabase public/auth profile và exact target guard,
không forward service-role/database/provider secrets, không mutate remote state
và không bật repository defaults.

Review UI có đủ grade/domain/difficulty/interaction/status filters,
Previous/Next, Student answer + correct/incorrect feedback, per-sample
`APPROVE`/`REJECT`/`NEEDS_REVISION`, notes, progress breakdown và refresh-resume
local draft. Overall decision hiện được ghi từ quyết định Owner explicit, không
suy ra từ majority. Manifest, public-only result JSON và status documents đã
được cập nhật.

Playwright Core 1.51.1 + Chrome 150 PASS tại 390×844 và 1280×800. Navigation,
filters, submit, feedback, decision/note và draft resume đều PASS; console,
hydration, page errors, overflow và private leaks = 0. Hai screenshots đã mở
review; critical/high = 0. Browser test đã xóa draft và không gọi final-decision
endpoint; đó là evidence lịch sử trước approval. Quyết định hiện hành nằm trong
result artifact; Ctrl+C exit 130 và remaining listener/cache = none.

Milestone 2 hoàn tất theo phạm vi sản phẩm được duyệt: 546/546 outcomes trong
inventory hiện hành, 198 capabilities, integrated technical audit PASS và Owner
usefulness acceptance APPROVED. `npm audit` vẫn
`UNVERIFIED_ENVIRONMENT_BLOCKED`; last verified 0 vulnerabilities ngày
2026-08-01. Không có deployment, publication, remote activation hoặc production
certification trong quyết định này.

## Evidence

- `docs/status/SPRINT_8CF_FINAL_COVERAGE.md`
- `docs/operations/GENERATOR_V2_FULL_OWNER_USEFULNESS_REVIEW.md`
- `artifacts/generator-v2-full-coverage/canonical-reconciliation.json`
- `artifacts/generator-v2-full-coverage/report.json`
- `artifacts/generator-v2-full-coverage/diversity.json`
- `artifacts/generator-v2-full-coverage/database-proof.json`
- `artifacts/generator-v2-full-coverage/browser-acceptance.json`
- `artifacts/generator-v2-full-coverage/screenshot-review.json`
- `artifacts/generator-v2-full-coverage/regression-evidence.json`
- `artifacts/generator-v2-owner-review/manifest.json`
- `artifacts/generator-v2-owner-review/browser-acceptance.json`
- `artifacts/generator-v2-owner-review/result.json`

MILESTONE 2 — PLAVE GENERATOR V2 COMPLETE — OWNER APPROVED
