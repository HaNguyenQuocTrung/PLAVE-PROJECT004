# SPRINT 8C.A1 — Wave A local Playwright browser acceptance

Ngày: 2026-08-02  
Roadmap: Milestone 1 `COMPLETE_OWNER_APPROVED`; Milestone 2 `IN_PROGRESS_RESUMED`; Milestone 3 `COMPLETE_OWNER_APPROVED_LOCAL_MVP`  
Trạng thái implementation: `98/98 IMPLEMENTED_REVIEW_REQUIRED`  
Trạng thái browser: `PASS_LOCAL_PLAYWRIGHT_BROWSER_VALIDATED`

Kết quả sprint tổng thể là `PASS_BROWSER_VALIDATED`. Browser evidence dùng local Playwright/Chromium thật; in-app Browser không được dùng. Owner product review package vẫn sẵn sàng và Milestone 2 vẫn `IN_PROGRESS_RESUMED`.

## Kết quả

Wave A đã được chuyển từ 3 implemented + 95 `BLOCKED_MISSING_CONTRACT` thành 98 explicit product contracts. Mỗi mapping dùng `outcomeId → canonicalVariantId → wave-a-v2.1`; title, paraphrase, substring và regex không tham gia runtime routing. Unknown outcome tiếp tục fail closed bằng `GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED`.

Đây là quyết định thiết kế assessment của PLAVE, không phải tuyên bố Bộ GD&ĐT quy định generator parameters, solver hoặc distractor policy. Canonical outcome chính thức vẫn là nguồn của intent, grade, unit và prerequisites; parameter/evidence/interaction/difficulty/solver/validator là product contract do PLAVE author.

| Gate | Kết quả |
|---|---:|
| Wave A outcomes | 98/98 |
| Existing proven outcomes preserved | 3/3 |
| Newly implemented outcomes | 95/95 |
| Canonical capabilities | 39 |
| `BLOCKED_MISSING_CONTRACT` trong Wave A | 0 |
| Samples | 5.880/5.880 |
| Independent solver + validator | 5.880/5.880 |
| Deterministic replay | 5.880/5.880 |
| Exact duplicate rate | 0 |
| Maximum near-duplicate pair rate | 0,1000 ≤ 0,12 |
| Fallback count | 0 |
| Provenance | 8/8 trên mọi sample |
| Public/private boundary | PASS |
| Review samples | 294 public-only samples |

Overall Generator V2 coverage sau Wave A là 107/546: 98 Wave A outcomes cộng 9 proven mappings ngoài Wave A. 439 post-Wave-A outcomes vẫn chưa implement. Sprint này không tuyên bố 546/546 hoặc Milestone 2 hoàn tất.

## Contract và capability architecture

Contract type là `PLAVE_PRODUCT_ASSESSMENT_CONTRACT_V2`. Mỗi row chứa:

- measurable intent và permitted evidence forms;
- normalized problem model và grade-bounded parameters;
- accepted-answer/uniqueness/interaction/difficulty/variation policies;
- independent solver và independent validator;
- misconception, distractor, feedback, visual và prerequisite policies.

39 canonical capabilities bao phủ number representation, counting/sequences, place value, compose/decompose, compare/order, rounding/estimation, addition/subtraction, multiplication/division, mental/written/mixed arithmetic, operation components/properties, missing values, integers, rationals, fractions/percent, powers/roots, divisibility/factors/primes, numerical patterns, error detection, applied arithmetic và các exact baseline outcomes trước đây bị Wave A queue phân loại sai như solid recognition, data classification, algebraic/polynomial/radical/inequality evidence và bounded banking situations. Các outcome này được map lại theo normalized mathematics thật; không bị ép vào generic arithmetic.

Registry exhaustiveness được typecheck. Một capability phục vụ nhiều outcome chỉ khi explicit contract giữ outcome-specific grade/profile/intent. Product registry không gọi legacy proof variant hoặc generic fallback.

## Difficulty, diversity và correctness

EASY/MEDIUM/HARD dùng structural fingerprint khác nhau theo task, unknown position, representation, number domain, reasoning steps và interaction/visual form. Gate từ chối difficulty relabel không đổi cấu trúc.

Audit chạy 20 seeds × 3 difficulties cho từng outcome. Exact fingerprint gồm prompt, public model data, interaction và visual. Near-duplicate được định nghĩa là hai prompt giống nhau sau khi normalize numeric literals; pair rate phải ≤ 0,12 trong từng outcome/difficulty batch. Dominant-answer gate cho batch 20 mẫu là ≤ 0,60; maximum quan sát được là 0,55.

Validator tính lại đáp án độc lập từ normalized model, sau đó mới so với solver output và normalized accepted-answer set. Nó kiểm tra domain, division-by-zero, root validity, remainder, fraction denominator, grade bounds, prompt/model, visual/model, interaction/answer và distractor uniqueness. Negative-control suite từ chối wrong answer của từng capability mới cùng ambiguity, out-of-grade values, prompt mismatch, relabeled AST, unsupported interaction và difficulty relabel.

`PERIMETER_AREA` được sửa bằng variation thật trong context và L-shape presentation. Rerun 100 seeds mỗi difficulty:

| Difficulty | Exact duplicate | Near-duplicate pair rate |
|---|---:|---:|
| EASY | 0 | 0,0133 |
| MEDIUM | 0 | 0,0083 |
| HARD | 0 | 0,0158 |

HARD giảm từ 0,1316 xuống 0,0158; threshold không đổi và không sample nào bị loại.

## Runtime, persistence và review

Loopback local runtime nhận exact `outcomeId`, không còn chọn outcome đầu tiên theo shared variant ID. Nó hiển thị 98 Wave A outcomes, tạo sẵn immutable 12-question attempt, resume cùng snapshot, dùng revision/idempotency cho duplicate submit và giữ `GENERATED_V2` discriminator. Default runtime vẫn OFF.

Persistence adapter proof chạy cho 294 outcome/difficulty representatives với canonical curriculum unit ID, rich interaction envelope, public payload hash và private solution tách riêng. Browser database journey dùng fresh isolated local stack, apply đúng migration inventory 0001–0042, tạo 40 completed attempts và persist 480 immutable questions/answers. Cả 480 rows đều có provenance 8/8 và `GENERATED_V2`; orphan rows = 0. Resume sau process restart giữ nguyên snapshot; duplicate same-payload submit ghi database đúng một lần, different-payload idempotency conflict và stale-CAS conflict đều đúng contract. Fixture cleanup PASS; không apply migration hoặc mutate remote database.

Owner review UI có filters grade, unit, outcome, variant, difficulty, interaction và review status; decisions hợp lệ là `APPROVE`, `REJECT`, `NEEDS_REVISION`. Manifest có 294 samples, correct/incorrect feedback, visual/non-visual và không chứa private solution. Reject một variant buộc mọi dependent outcome về `NEEDS_REVISION`.

## Browser status

Local executable discovery đã resolve project-compatible `playwright-core` 1.51.1 và Google Chrome/Chromium 150.0.7871.186 tại `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. Không download browser mới; in-app Browser discovery và backend không tham gia.

Acceptance chạy real PLAVE application trên loopback ở 390×844 và 1280×800:

| Browser gate | Kết quả |
|---|---:|
| Browser executable resolved | PASS |
| Required viewports | 2/2 |
| Canonical capabilities represented | 39/39 |
| Grades | 1–9 |
| Difficulties | EASY/MEDIUM/HARD |
| Wave A interaction types | 8/8 |
| Console / hydration / page errors | 0 / 0 / 0 |
| Horizontal/math overflow | 0 |
| Disabled controls / keyboard failures | 0 / 0 |
| Collapsed text layouts | 0 |
| Private leaks | 0 |
| Prompt/visual mismatch | 0 |
| Screenshots created | 41 |
| Screenshots opened and visually reviewed | 41/41 |
| Screenshot critical/high issues | 0 |
| Fixture cleanup | PASS |
| Wave A harness listener after cleanup | none |

Evidence covers correct/incorrect feedback, refresh/process-restart resume, completion/results/history, all 18 major Wave A capability groups and every actual Wave A interaction: `SINGLE_CHOICE`, `INTEGER_INPUT`, `DECIMAL_INPUT`, `FRACTION_INPUT`, `ORDERING`, `MATCHING`, `MULTI_SELECT`, and `CONSTRUCTION_OR_VISUAL_SELECTION`. `SHORT_STRUCTURED_RESPONSE` is not enabled by Wave A contracts and is therefore not fabricated as coverage.

Visual review found issues in earlier runs and the final rerun contains the corrections: Grade 1 mixed arithmetic is addition/subtraction only; applied/data/finance wording is explicit; exact same-base powers and Grade 4 associative-property contracts align with outcomes; object-group and number-line visuals share normalized model data; mobile finance units, shape rendering, feedback copy and MATCH keys render correctly.

Không có mathematically unsolvable outcome: `[]`. Không còn browser blocker.

Post-run listener audit thấy một Next.js server khác trên `127.0.0.1:3002` (parent PID 88349, child PID 88350) đã chạy từ 2026-07-31, trước acceptance này. Nó không thuộc disposable Wave A process tree nên được giữ nguyên; harness listeners và disposable containers còn lại đều bằng 0.

## Regression gates

| Suite | Kết quả |
|---|---:|
| Generator V2 semantic | 10/10 |
| Wave A contracts | 8/8 |
| Full-coverage inventory | 6/6 |
| Database proof contracts | 3/3 |
| Generated persistence/schema contracts | 7/7 |
| Practice | 550/550 |
| Practice visual readability | 3/3 |
| Curriculum | 9/9 |
| Universal curriculum | 21/21 |
| Competency + UI | 10/10 |
| UI/UX contracts | 13/13 |
| AI Tutor core + quality + authenticated local runtime | 40/40 |
| Typecheck | PASS |
| Lint | PASS, 0 warning |
| Production build | PASS, 76/76 static pages |
| `npm audit` | Current rerun blocked by sandbox network policy; last recorded project gate was PASS, 0 vulnerabilities |

Lệnh audit hiện tại đã được chạy nhưng registry DNS bị sandbox chặn; escalation bị policy từ chối vì dependency metadata would be sent externally. Không có dependency hoặc lockfile change trong Sprint 8C.A1. Đây không phải browser/runtime blocker và không được ghi thành một false PASS.

## Artifacts

- `artifacts/generator-v2-wave-a/report.json`
- `artifacts/generator-v2-wave-a/outcome-contracts.json`
- `artifacts/generator-v2-wave-a/capability-registry.json`
- `artifacts/generator-v2-wave-a/diversity.json`
- `artifacts/generator-v2-wave-a/negative-controls.json`
- `artifacts/generator-v2-wave-a/review-manifest.json`
- `artifacts/generator-v2-wave-a/browser-acceptance.json`
- `artifacts/generator-v2-wave-a/screenshot-review.json`
- `artifacts/generator-v2-wave-a/checkpoints/`
- `artifacts/generator-v2-wave-a/screenshots/mobile/`
- `artifacts/generator-v2-wave-a/screenshots/desktop/`

Tái lập audit bằng `npm run --silent audit:generator-v2-wave-a`, tests bằng `npm run --silent test:generation-v2-wave-a`, và full local acceptance bằng `npm run --silent acceptance:generator-v2-wave-a`.

## Boundaries

Không remote mutation, migration, deployment, publication, Git mutation, repository-default runtime enable, AI Tutor implementation change, generic fallback hoặc synthetic coverage. Milestone 2 vẫn `IN_PROGRESS_RESUMED`; không auto Owner-approve.
