# Sprint 8B.2 — Generated question provenance trigger privilege contract

Ngày: 2026-08-01  
Phạm vi: migration 0042 và Generator V2 vertical slice trên stack local disposable  
Trạng thái: `PASS_LOCAL_ONLY_OWNER_USEFULNESS_REVIEW_REQUIRED`

## Kết luận

Migration `0042_fix_generated_question_provenance_trigger_security.sql` sửa đúng PostgreSQL 42501 mà không cấp quyền bảng cho Student. Deferred provenance trigger vẫn `DEFERRABLE INITIALLY DEFERRED`, vẫn fail closed, nhưng function nội bộ chạy dưới owner `postgres`, `SECURITY DEFINER`, `search_path=''` và không thể được `PUBLIC`, `anon` hoặc `authenticated` gọi trực tiếp.

Fresh isolated install `0001` → `0042`, upgrade `0041` → `0042`, authenticated RPC, persistence, resume, CAS/exactly-once, RLS và Chromium đều PASS. Không truy cập hoặc thay đổi remote.

Milestone 2 vẫn `IN_PROGRESS`: Owner chưa đánh giá usefulness của 108 mẫu review.

## Audit migration 0041 trước khi sửa

`private.enforce_generated_question_provenance()` có contract sau:

- owner: `postgres`;
- language: `plpgsql`;
- volatility: `VOLATILE` (`provolatile='v'`);
- parallel: `UNSAFE` (`proparallel='u'`);
- `prosecdef=false`, tức `SECURITY INVOKER`;
- `proconfig=["search_path=\"\""]`;
- ACL chỉ có `postgres=X/postgres`; `PUBLIC`, `anon`, `authenticated` đều không có `EXECUTE`.

Function tự đọc lại row bằng exact statement:

```sql
select question.* into v_current
from public.curriculum_generated_questions as question
where question.attempt_id = new.attempt_id
  and question.question_id = new.question_id;
```

Sau đó function dùng `pg_catalog.current_setting('plave.semantic_provenance_write', true)` và kiểm tra discriminator/provenance. Không gọi operator hoặc relation không fully-qualified ngoài các operator built-in đã được resolve khi function được tạo; relation và `current_setting` đều explicit.

Constraint trigger:

```text
AFTER INSERT OR UPDATE
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION private.enforce_generated_question_provenance()
```

RPC `public.start_or_resume_semantic_generated_curriculum(jsonb,text,uuid)` ở 0041 do `postgres` sở hữu, là `SECURITY DEFINER`, `search_path=''`, và chỉ mở `EXECUTE` cho `authenticated`. RPC xác minh shape/hash của đủ tám provenance field, gọi signed 0040 start RPC, rồi chuyển row `PENDING_SEMANTIC_V1` sang `SEMANTIC_GENERATED_V1` và lock provenance.

PostgREST giữ transaction role `authenticated` đến commit. Vì trigger deferred chỉ chạy khi transaction commit và trigger function là `SECURITY INVOKER`, câu `SELECT public.curriculum_generated_questions` ở trên nhận quyền của `authenticated`. Migration 0040 đã revoke direct `SELECT`, nên exact failure là `42501: permission denied for table curriculum_generated_questions`. Việc RPC là `SECURITY DEFINER` không kéo dài privilege context sang deferred trigger tại commit.

Baseline audit machine-readable: `artifacts/generator-v2-database-proof/privilege-audit-0041-baseline.json`.

## Contract migration 0042

Migration mới không sửa 0001–0041 và chạy trong một transaction:

1. Chuyển `private.enforce_generated_question_provenance()` sang owner `postgres`, `SECURITY DEFINER`, `search_path=''`.
2. Revoke toàn bộ direct `EXECUTE` khỏi `PUBLIC`, `anon`, `authenticated`; trigger nội bộ vẫn gọi được.
3. Fully-qualified relation/function references của body 0041 được giữ nguyên; authenticated search-path shadow không thể thay dependency.
4. Không cấp `SELECT/INSERT/UPDATE/DELETE` trên generated question, private solution hoặc provenance table.
5. Giữ deferred trigger và toàn bộ 8/8 provenance constraints.
6. Củng cố `private.prevent_generated_provenance_mutation()` để chỉ cho phép một transition nội bộ `PENDING` → `SEMANTIC` với mọi base snapshot field không đổi; sau lock, bất kỳ mutation nào cũng bị từ chối.
7. Đưa implementation RPC 0041 vào schema `private`, revoke direct execution, và đặt một public signed wrapper cùng signature. Wrapper lấy advisory transaction lock theo Student + unit trước khi delegate, loại race hai concurrent starts mà không mở rộng public contract.

Checksum migration 0042: `c3adecf481c8eb8b50872a4b165ea29539598f568f91cdd5f7993b3cc04662d7`.

## Security assertions

| Assertion | Kết quả |
|---|---|
| `PUBLIC` / `anon` / `authenticated` gọi trigger function trực tiếp | DENIED |
| Direct generated-question INSERT/UPDATE/DELETE/SELECT | DENIED |
| Direct private-solution SELECT | DENIED |
| Search-path shadowing với table trùng tên | DENIED/PASS |
| Legacy RPC bypass signed semantic path | HTTP 403 |
| Missing từng field trong provenance 8/8 | 8/8 REJECTED |
| Invalid provenance hashes | REJECTED bởi 0041 RPC regex + table check |
| Mismatched source discriminator/provenance state | REJECTED bởi deferred trigger |
| Post-lock provenance/public snapshot/visual mutation | REJECTED |
| Crafted direct SQL tạo row dưới Student role | DENIED |
| Student B đọc/submit attempt A | HTTP 403/403 |
| Parent/Teacher/anonymous dùng Student route | 403/403/401 |
| Private field trong Student response/HTML/browser state | 0 |

Không có trigger disable, table grant, RLS weakening hoặc service-role runtime workaround.

## Disposable verification

- Fresh isolated install: migrations `42/42`, range `0001` → `0042`.
- Baseline checksum drift 0001–0041: 0; digest `6667db45c0fa6f2fcaca571da968d2b04402146d97302cb0b79451775e7293c4`.
- Upgrade path `0041` → `0042`: PASS.
- Transaction-wrapped apply và failure rollback: PASS.
- Migration history: exact 42 entries; không re-apply để che lỗi.
- Disposable fixture/service cleanup: PASS.
- Remote access/mutation: NO/NO.

Evidence: `artifacts/generator-v2-database-proof/privilege-audit.json`.

## Generator V2 database proof

Command cuối:

```bash
npm run proof:generator-v2-database
```

Kết quả:

- Playwright 1.51.1, Chromium 150.0.7871.186; in-app Browser: NO.
- 12/12 variants qua authenticated Student API/RPC thật.
- 13 attempts hoàn tất, 156 generated questions, 156 private solutions, 156 answers.
- 156 unit evidence, 156 outcome evidence, 156 skill evidence; orphan rows 0.
- provenance 8/8 trên 156 rows; source canonical `GENERATED_V2`, physical 0041 discriminator `SEMANTIC_GENERATED_V1`.
- resume/reconnect giữ nguyên snapshot/hash và không tăng generator/question count.
- concurrent start, exact retry, different-payload conflict, stale CAS, submit-after-completion và transaction rollback: PASS.
- duplicate submit không tăng answer/progress/history; 13 completions tạo 13 history transitions.

Counts: `artifacts/generator-v2-database-proof/database-counts.json`.  
Concurrency: `artifacts/generator-v2-database-proof/idempotency-cas.json`.  
Security: `artifacts/generator-v2-database-proof/security-boundary.json`.

## Browser acceptance và visual review

Chromium chạy tại 390×844 và 1280×800 cho mỗi variant: start, render persisted question, correct/incorrect submit, feedback, refresh/resume, completion và history. Console errors 0, hydration errors 0, overflow 0, private leaks 0, regeneration-on-resume 0 và prompt/visual mismatch 0.

60 ảnh cuối đã được mở ở original resolution. Các lỗi phát hiện và sửa trước lần proof cuối:

- fraction prompt từng nêu shape không khớp segmented-bar visual;
- mixed-time visual từng bỏ phần giây;
- `APPLIED_TWO_STEP` từng bỏ Group A khỏi phép tính tổng;
- area visual từng thiếu nhãn kích thước phần khuyết;
- place-value renderer từng chỉ hiển thị 2/4 số.

Không còn issue critical/high trong bộ ảnh cuối. Screenshot directory: `artifacts/generator-v2-database-proof/screenshots/`.

## Gates

- Migration 0042 contract: 4/4 PASS.
- Generator V2 core/negative controls: 10/10 PASS.
- 0041/0042 provenance and persistence proof: PASS, 42/42.
- Auth/RLS/private solution: PASS.
- Practice: 550/550 PASS.
- Universal curriculum: 21/21 PASS.
- Competency/recommendation and role isolation: PASS.
- UI regression, typecheck, lint, production build: PASS.

## Remaining blocker

Chỉ còn `OWNER_USEFULNESS_REVIEW_108_SAMPLES`. Package giữ 108 public-only samples, 12 variants × 3 difficulty × 3 seeds; `privateSolutionIncluded=false`. Exact command/URL nằm trong `docs/operations/GENERATOR_V2_OWNER_USEFULNESS_REVIEW.md`.

Migration 0042 chỉ được kiểm chứng local disposable; không apply remote, deploy, publish, thay active release hoặc bật generated runtime mặc định. Milestone 2 chưa hoàn tất và AI Tutor chưa bắt đầu.

PLAVE GENERATOR V2 VERTICAL SLICE PERSISTENCE READY — MIGRATION 0042 LOCAL-ONLY AND OWNER USEFULNESS REVIEW REQUIRED
