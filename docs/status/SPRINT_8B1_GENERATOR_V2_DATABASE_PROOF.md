# Sprint 8B.1 — Generator V2 authenticated database persistence proof

Ngày: 2026-08-01  
Phạm vi: 12 Generator V2 product variants trên local disposable stack  
Trạng thái: `PASS_AFTER_MIGRATION_0042_OWNER_USEFULNESS_REVIEW_REQUIRED`

## Kết luận

Blocker PostgreSQL 42501 của migration 0041 đã được sửa bằng migration 0042 mà không mở direct table privilege. Stack isolated đã apply `0001` → `0042`, fixture `TEST_ONLY` dùng Supabase Auth thật, và authenticated Student đã hoàn tất canonical V2 runtime qua API/RPC/database/browser.

12/12 variants persist immutable snapshot và provenance 8/8; resume/reconnect không regenerate; CAS, duplicate submit, exactly-once progress/history, rollback và actor isolation đều PASS. Stack và fixture đã cleanup hoàn toàn. Remote access/mutation: NO/NO.

Đây là persistence readiness của vertical slice, không phải tuyên bố toàn bộ generator lớp 1–9 hoàn tất hoặc hữu ích. Owner usefulness review vẫn bắt buộc.

## Canonical runtime đã chứng minh

```text
Supabase Auth Student fixture
  → Student UI local
  → authenticated start API
  → Generator V2 generate / independent solve / validate
  → signed immutable snapshot
  → public.start_or_resume_semantic_generated_curriculum (0042 wrapper)
  → private 0041 implementation + 0040 signed persistence
  → deferred provenance trigger at commit
  → public state without private solution
  → interaction-specific submit + CAS
  → feedback
  → exactly-once evidence/history
  → refresh/reconnect/resume persisted snapshot
```

Không gọi database helper để bỏ qua API, không mock auth/persistence, không service-role Student runtime và không regenerate snapshot khi resume.

## Database evidence

Initial counts đều 0. Final counts:

| Relation/evidence | Count |
|---|---:|
| Attempts / completed attempts | 13 / 13 |
| Generated questions | 156 |
| Private solutions | 156 |
| Answers | 156 |
| Unit evidence | 156 |
| Outcome evidence | 156 |
| Skill evidence | 156 |
| Complete provenance rows | 156 |
| Generated V2 discriminator rows | 156 |
| Orphan rows | 0 |

Mỗi attempt có đúng 12 items. Resume/reconnect không tăng question/evidence count. Duplicate submit không tăng answer/progress/history. 13 completions tạo đúng 13 completed history rows. Injected transaction failure rollback sạch, không orphan.

Evidence: `artifacts/generator-v2-database-proof/database-counts.json`.

## Concurrency và idempotency

- Hai start đồng thời cùng Student + unit: một attempt, idempotent result.
- Start rồi reconnect và reconnect process mới: cùng persisted attempt/snapshot.
- Concurrent exact submit: một database write; exact retries trả idempotent result.
- Duplicate payload khác: `IDEMPOTENCY_CONFLICT`.
- Stale expected revision: `REVISION_CONFLICT`.
- Submit sau completion: rejected.
- Refresh giữa start/submit và resume: PASS.

Evidence: `artifacts/generator-v2-database-proof/idempotency-cas.json`.

## Security, provenance và private boundary

- Provenance đủ 8/8 trên 156 questions.
- Missing từng field: 8/8 rejected.
- Invalid hash, invalid typed provenance và mismatched discriminator: rejected.
- Public snapshot, provenance và visual immutable sau lock.
- Student B không đọc/submit attempt A; Parent/Teacher/anonymous không dùng Student RPC.
- Direct table insert/update và private solution read bị từ chối.
- Legacy RPC không bypass signed semantic contract.
- Public API/HTML/browser state không có correct response trước submit, raw seed, solver receipt hoặc private hash.

Privilege fix và audit chi tiết: `docs/status/SPRINT_8B2_PROVENANCE_TRIGGER_FIX.md` và `artifacts/generator-v2-database-proof/privilege-audit.json`.

## Browser evidence

- Engine: Chromium 150.0.7871.186.
- Playwright: 1.51.1 (`playwright-core`).
- Strategy: local Playwright; in-app Browser không dùng.
- Viewports: 390×844 và 1280×800.
- Variants: 12/12; 60 final screenshots.
- Correct/incorrect feedback, resume, completion và history: PASS.
- Console/hydration errors 0; overflow 0; private leaks 0; prompt/visual mismatch 0.

Toàn bộ 60 ảnh cuối đã được mở ở original resolution. Screenshot directory: `artifacts/generator-v2-database-proof/screenshots/`.

## Owner usefulness review package

Manifest public-only có 108 samples: 12 variants × EASY/MEDIUM/HARD × 3 deterministic seeds. `privateSolutionIncluded=false`. Owner có thể ghi `APPROVE`, `REJECT`, `NEEDS_REVISION` và note từng sample.

- Manifest: `artifacts/generator-v2-owner-review/manifest.json`.
- Runbook + exact command/URL: `docs/operations/GENERATOR_V2_OWNER_USEFULNESS_REVIEW.md`.

Owner review chưa diễn ra. Milestone 2 tiếp tục `IN_PROGRESS`; AI Tutor `NOT_STARTED`.

## Quality gates

| Gate | Kết quả |
|---|---|
| Migration 0042 security contracts | 4/4 PASS |
| Fresh migrations | 42/42 PASS |
| Upgrade 0041 → 0042 | PASS |
| Generator V2 core/negative controls | 10/10 PASS |
| Authenticated persistence/RPC | 12/12 PASS |
| RLS/private-solution security | PASS |
| Practice regression | 550/550 PASS |
| Universal curriculum | 21/21 PASS |
| Competency/recommendation | PASS |
| Role isolation | PASS |
| UI regression | PASS |
| Typecheck / lint / production build | PASS / PASS / PASS |
| Local Playwright database acceptance | PASS |

## Exact remaining blocker

`OWNER_USEFULNESS_REVIEW_108_SAMPLES`.

Không mở rộng coverage, không bật repository-default runtime, không remote mutation/deploy/publication và không bắt đầu AI Tutor.

PLAVE GENERATOR V2 VERTICAL SLICE PERSISTENCE READY — OWNER USEFULNESS REVIEW REQUIRED
