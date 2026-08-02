# Generator V2 full Owner usefulness review — local only

## Gate và phạm vi

Technical audit đã PASS 546/546 outcomes và 198 canonical capabilities. Bước này
đã đánh giá usefulness thực tế; không deploy, publish hoặc bật repository-default
runtime.

Manifest `artifacts/generator-v2-owner-review/manifest.json` có đúng 198
public-only samples, một sample cho mỗi capability. Mỗi row trace tới outcome ID,
capability ID, grade, difficulty, seed, domain, interaction, expected skill và
review URL/state. Manifest có `privateSolutionIncluded=false` và quyết định thật
`ownerDecision=APPROVED`, source `OWNER_EXPLICIT_DECISION`.

`MILESTONE_2=COMPLETE_OWNER_APPROVED`

## Trạng thái package sau approval

Không chạy lại `build:generator-v2-owner-review` sau approval; builder fail closed
để không ghi đè quyết định Owner đã persist. Browser drafts/per-sample decisions
không được submit vào artifact, nên manifest/result ghi
`perSampleDecisionDataAvailable=false` và không tự tạo 198 individual approvals.

## Chạy review UI loopback

```bash
npm run --silent generator-v2:owner-review-start
```

Mở `http://127.0.0.1:3033/internal/generator-v2-owner-review`. Route/API fail
closed ngoài development, khi flag không bật hoặc host không phải loopback.
Launcher dùng đúng profile public/auth của `remote-dev:runtime-start`, chạy lại
exact target guard, chỉ forward Supabase public URL/publishable key và không load
service-role, database URL hoặc provider secret. Review flag chỉ tồn tại trong
child Next process; các runtime generated/remote release vẫn OFF.

Startup in URL chính xác và các diagnostics không chứa secret. Port 3033 phải
trống; nếu bị chiếm launcher báo PID/command/listener và không kill process khác.
Nhấn `Ctrl+C` để dừng toàn bộ process tree; expected exit code là 130, listener
và cache review tạm được cleanup.

## Review checklist

Với mỗi sample được chọn:

1. Xác nhận outcome, grade, skill và difficulty phù hợp prompt.
2. Kiểm tra phép toán, đáp án hợp lệ, units/precision và uniqueness.
3. Kiểm tra interaction thực sự đo đúng evidence cần thiết.
4. Với visual/table/chart, đối chiếu từng label/value với prompt và solver.
5. Xác nhận trước submit không có answer, solver receipt, seed hoặc private hash.
6. Mở cả correct và incorrect feedback; đánh giá misconception và next step.
7. Chọn đúng một state: `APPROVE`, `REJECT` hoặc `NEEDS_REVISION`; thêm notes cụ thể.

Review set đã được stratify theo Grades 1–9, năm domains, EASY/MEDIUM/HARD, cả
mười interaction types và các surface numeric, symbolic, diagram, table, chart,
multi-step. Owner có thể lọc theo grade/domain/difficulty/interaction/status,
đi Previous/Next, làm câu như Student và xem feedback đúng/sai. Progress hiển thị
reviewed, approved, rejected, needs revision và remaining. Draft decision/note
resume trong local browser sau refresh. Owner không cần xem 32.760 audit samples.

## Quyết định và handoff đã ghi nhận

Owner đã đưa ra quyết định thật:
`OWNER GENERATOR V2 USEFULNESS ACCEPTANCE: APPROVED`. Quyết định không được suy
ra từ majority hoặc technical PASS. Các file hiện hành:

- `artifacts/generator-v2-owner-review/manifest.json`;
- `artifacts/generator-v2-owner-review/result.json` (không chứa question/answer);
- `docs/status/SPRINT_8C_GENERATOR_V2_FULL_COVERAGE.md`;
- `docs/status/PLAVE_THREE_MILESTONE_ROADMAP.md`.

Result có `reviewedCount=198`, `totalCount=198`, scope
`GENERATOR_V2_FULL_COVERAGE`, outcome coverage 546/546 và capability coverage
198/198. Vì không có persisted per-sample submission, ba per-sample counts là
`null` và được giải thích rõ; không có private solution, answer key, token hoặc
PII.

Browser pre-handoff PASS bằng Playwright Core 1.51.1 + Chrome 150 tại 390×844 và
1280×800: navigation, filters, submit/feedback, decision/note, refresh/resume,
console/hydration/page/overflow/private-leak gates đều sạch. Hai screenshots đã
được mở review; critical/high = 0. Việc test giữ `ownerDecision=null` là evidence
lịch sử trước quyết định explicit hiện tại.

Milestone 2 hiện `COMPLETE_OWNER_APPROVED`. `npm audit` vẫn
`UNVERIFIED_ENVIRONMENT_BLOCKED`; last verified 0 vulnerabilities ngày
2026-08-01. Approval không deploy, activate remote hoặc chứng nhận production.
