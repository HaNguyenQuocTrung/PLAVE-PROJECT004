# PLAVE Generator V2 — canonical product architecture

Ngày: 2026-08-02  
Phạm vi: canonical core Sprint 8B và coverage audit Sprint 8C  
Trạng thái coverage lịch sử: 546/546 explicit outcome mappings và 198 canonical
capabilities đã được technical + Owner usefulness approved. Active Milestone 2
sau complete-project re-audit là `REOPENED_CRITICAL_REMEDIATION`; approval cũ
được giữ như historical decision, không phải active completion hoặc production
activation.

## Mục tiêu kiến trúc

Generator V2 thay việc suy family bằng chuỗi/regex bằng một registry typed, fail-closed. Prompt, visual và solver đều được tạo từ cùng một normalized problem model. Generator, solver, validator, renderer và feedback có trách nhiệm tách biệt.

Entry point duy nhất của slice:

```ts
generateQuestion({
  outcomeId,
  grade,
  difficulty,
  seed,
  interactionType,
  locale,
})
```

`outcomeId` không có trong registry dừng bằng code/message chính xác `GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED`. Sai lớp, locale không hỗ trợ hoặc interaction không thuộc policy cũng dừng bằng `GenerationV2Error` có code cụ thể. V2 không có generic arithmetic fallback.

## Inventory pipeline

| Phân loại | Thành phần | Trách nhiệm hiện tại |
|---|---|---|
| `PRODUCT_RUNTIME` | static Grade 1 practice và materialized universal curriculum | Luồng Student mặc định hiện hành; giữ nguyên trong Sprint 8B |
| `PRODUCT_RUNTIME` | `lib/generation-v2/` | Canonical generator mới cho 12-variant vertical slice |
| `LEGACY_STATIC` | question bank và frozen release questions | Fallback có provenance riêng cho outcomes ngoài slice; không được giả làm V2 |
| `PROOF_ONLY` | semantic proof generator và các proof scripts trước Sprint 8B | Bằng chứng kỹ thuật, không được tính là product coverage |
| `DEAD_OR_DUPLICATED` | các V1/semantic handlers trùng trách nhiệm với canonical slice | Chưa xóa trong sprint này; không được dùng làm implementation mới của 12 variant |

59 legacy variant đã được phân loại trong `artifacts/generator-v2-vertical-slice/variant-migration-map.json`. Chín variant không có outcome thật được đánh dấu `SYNTHETIC_WITHOUT_OUTCOME`, không tính coverage và không đi vào runtime V2.

## Canonical pipeline

```text
outcomeId + grade + difficulty + seed + interaction + locale
  -> typed outcome registry lookup
  -> exact productFamilyId / variantId / version / policies
  -> deterministic parameter generation
  -> normalized mathematical problem model
       |-> independent solver -> correct response + solver receipt
       |-> prompt builder      -> publicPrompt/publicData
       |-> visual builder      -> visual from the same model
       |-> distractor engine   -> family misconception candidates
       `-> validator
             - mathematical constraints
             - uniqueness
             - grade bounds
             - interaction validity
             - prompt/model integrity
             - visual/model integrity
             - distractor validity
  -> immutable public snapshot + private solution + provenance hashes
  -> server-only response boundary
  -> interaction-specific submit validation
  -> response-aware pedagogical feedback
```

Renderer chỉ nhận public snapshot đã validated. Correct response, accepted responses, raw seed, solver receipt, normalized model/hash và private validation không được gửi trước submit.

## Typed registry của vertical slice

| Grade | Outcome ID | Canonical variant | Domain | Interactions |
|---:|---|---|---|---|
| 1 | `MOET2018-G1-NUM-P022-004` | `ADD_SUB_MEANING` | Số học | integer input, single choice |
| 2 | `MOET2018-G2-NUM-P025-018` | `MULTIPLY_DIVIDE_FACTS` | Số học | single choice, integer input |
| 3 | `MOET2018-G3-NUM-P029-004` | `PLACE_VALUE_COMPARE` | Giá trị hàng | single choice, ordering |
| 4 | `MOET2018-G4-NUM-P036-018` | `FRACTION_PART_WHOLE` | Phân số | fraction input, visual selection |
| 9 | `MOET2018-G9-NAA-P072-010` | `LINEAR_SYSTEM` | Đại số | matching, integer input |
| 3 | `MOET2018-G3-GEO-P031-004` | `GEOMETRY_PROPERTIES` | Hình học | multi-select, visual selection |
| 5 | `MOET2018-G5-GEO-P044-013` | `UNIT_CONVERSION` | Đo lường | integer input, decimal input |
| 6 | `MOET2018-G6-GEO-P051-003` | `PERIMETER_AREA` | Hình học/đo lường | integer input, single choice |
| 7 | `MOET2018-G7-STA-P061-001` | `CHART_DATA_INTERPRETATION` | Thống kê | chart response, single choice |
| 8 | `MOET2018-G8-STA-P069-011` | `EXPERIMENTAL_PROBABILITY` | Xác suất | fraction input |
| 3 | `MOET2018-G3-NUM-P030-013` | `APPLIED_TWO_STEP` | Toán ứng dụng | integer input, single choice |
| 9 | `MOET2018-G9-STA-P076-008` | `DATA_ERROR_REASONING` | Lập luận | single choice, multi-select |

Registry lưu explicit `productFamilyId`, `variantVersion`, parameter policy, difficulty policy, interaction policy, solver, validator, visual contract và feedback strategy. Không field nào được suy từ title/description.

## Contracts và private boundary

Mỗi `GeneratedProductQuestion` gồm bốn miền dữ liệu:

1. `publicSnapshot`: prompt, public data, interaction, visual và accessibility alternative.
2. `privateSolution`: correct/accepted responses, misconception map và solution steps.
3. `solverReceipt` + `validation`: receipt độc lập và các gate đã chạy.
4. `provenance`: generator/solver/policy/variant versions và các fingerprint/hash.

`publicQuestionOnly()` là boundary dùng trước submit. `validateStudentResponse()` chạy server-side, sau đó mới trả `FeedbackContract` gồm đúng/sai, giải thích liên quan response, steps, next step và misconception khi xác định được.

Các interaction contract mà core hỗ trợ:

- `SINGLE_CHOICE`
- `MULTI_SELECT`
- `INTEGER_INPUT`
- `DECIMAL_INPUT`
- `FRACTION_INPUT`
- `ORDERING`
- `MATCHING`
- `TABLE_OR_CHART_RESPONSE`
- `CONSTRUCTION_OR_VISUAL_SELECTION`

Không phải mọi registry entry phải dùng mọi interaction. Policy của outcome quyết định tập interaction hợp lệ.

## Correctness và negative controls

Solver tính đáp án lại từ normalized inputs; validator không tin một answer do generator gắn sẵn. Integrity suite từ chối:

- prompt bị đổi nhưng model/solver input giữ nguyên;
- hai đáp án hợp lệ;
- chia cho 0;
- phân số chưa chuẩn hóa;
- unit mismatch;
- geometry visual lệch dữ kiện;
- chart labels lệch dataset;
- difficulty relabel nhưng cấu trúc không đổi;
- AST/family relabel;
- parameter vượt grade bound;
- distractor trùng hoặc cũng đúng.

Visual hash thuộc immutable snapshot. `OBJECT_GROUPS`, place-value chart, fraction model, shape diagram, measurement/area model, chart và experiment/data table đều nhận data từ normalized model dùng bởi solver.

## Diversity và difficulty gate

Vertical slice giữ audit 100 seeds/variant/difficulty. Wave A dùng policy bắt buộc 20 seeds × 3 difficulties cho từng outcome, tổng 5.880 samples:

- exact duplicate rate bằng 0 trong từng outcome/difficulty batch;
- near-duplicate pair rate không quá 0,12 sau khi chuẩn hóa numeric literals trong prompt;
- dominant answer không quá 0,60 cho bounded batch 20 mẫu;
- EASY/MEDIUM/HARD có structural fingerprint tách biệt;
- cùng seed tái tạo cùng immutable snapshot.

Difficulty signature dùng interaction, số bước, unknown position, representation, visual/task shape và policy-specific structure; không chỉ tăng số.

## Local-only product slice

`/internal/generator-v2` chỉ tồn tại khi:

- `NODE_ENV=development`;
- `PLAVE_GENERATOR_V2_LOCAL=true`;
- request đi qua `localhost` hoặc `127.0.0.1`.

API start/state/answer dùng server-only immutable in-memory session để kiểm tra presentation và interaction. Session tạo sẵn 12 snapshot, resume đọc cùng snapshot, submit dùng revision và idempotency key, completion tăng đúng một lần. Browser không nhận private solution trước submit.

Runtime nhận exact outcome ID, không chọn outcome đầu tiên theo shared variant ID. Trang local liệt kê 98 Wave A outcomes; default runtime vẫn OFF. Đây là preview product runtime để chứng minh core + renderer + interaction, không thay thế authenticated Student database runtime.

## 0041/0042 persistence contract

`to0041Question()` cung cấp adapter rõ ràng từ V2 sang ba transport mà schema 0041 hỗ trợ (`MULTIPLE_CHOICE`, `NUMBER_INPUT`, `TEXT_INPUT`). Rich V2 interaction vẫn nằm trong public visual envelope; không silently downgrade semantics. Adapter đã có contract test.

Migration 0041 thêm tám provenance fields, deferred constraint trigger và signed semantic RPC. Trigger ban đầu là `SECURITY INVOKER`; khi chạy deferred tại PostgREST commit, nó nhận role `authenticated` và không thể self-read generated-question table đã bị revoke, gây PostgreSQL 42501.

Migration 0042 giữ trigger deferred/fail-closed nhưng chuyển function nội bộ sang owner `postgres`, `SECURITY DEFINER`, `search_path=''`, đồng thời revoke direct execute khỏi `PUBLIC`, `anon`, `authenticated`. Không có table grant mới. Public signed RPC giữ nguyên signature, lấy advisory transaction lock trước khi delegate vào hidden implementation 0041. Guard mutation chỉ cho phép transition nội bộ `PENDING_SEMANTIC_V1` → `SEMANTIC_GENERATED_V1`; sau lock, public snapshot/provenance/visual đều immutable.

Authenticated local disposable proof đã xác nhận:

- fresh migrations 42/42 và upgrade 0041 → 0042;
- 12/12 variants, 13 completed attempts, 156 immutable questions;
- provenance 8/8, resume không regenerate, CAS/idempotency và exactly-once progress/history;
- actor RLS/private-solution boundary;
- Chromium 390×844 và 1280×800, 60 reviewed screenshots.

Chi tiết security contract: `docs/status/SPRINT_8B2_PROVENANCE_TRIGGER_FIX.md`. Đây vẫn là local-only vertical-slice proof; repository-default generated runtime không được bật và product usefulness vẫn cần Owner review.

## Quy tắc tích hợp tiếp theo

- Outcome có registry V2: đi qua canonical entry point, solver, validator và provenance V2.
- Outcome chưa có registry V2: giữ nguồn static hiện tại với source `STATIC`; không fallback sang generic generator.
- Không trộn `STATIC` và `GENERATED_V2` nếu snapshot/provenance không chỉ rõ source.
- Mở rộng tiếp bằng outcome thật và manual product review; không tối ưu cho con số 59.
- Giữ database-backed V2 ở local/disposable mode cho đến khi Owner usefulness review hoàn tất và có quyết định rollout riêng.
- AI Tutor nằm ngoài phạm vi Sprint 8C; không có implementation change nào đối với Tutor.

## Sprint 8C.A — Wave A implementation

Canonical denominator là 546 official IDs. Current explicit lookup có 107 outcomes:

```text
546 official outcomes
  -> exact typed lookup
     -> Wave A: 98/98 IMPLEMENTED_REVIEW_REQUIRED
     -> proven mappings outside Wave A: 9
     -> post-Wave-A missing contracts: 439
     -> unknown mapping: GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED
```

Wave A dùng `PLAVE_PRODUCT_ASSESSMENT_CONTRACT_V2` và `wave-a-v2.1`. 98 outcome IDs map explicit vào 39 canonical capabilities; 3 proven implementations được giữ, 95 implementations mới dùng Wave A engine. Contract chứa measurable intent, evidence, normalized model, grade bounds, answer/uniqueness/interaction/difficulty/variation, independent solver/validator, misconception/distractor/feedback/visual/prerequisite policies.

Validator Wave A tự tính lại canonical answer từ normalized model, normalize equivalent numeric/fraction representations rồi đối chiếu solver output. Public prompt chứa presentation/context selected by the model; visual/table/number-line data dùng cùng model. Negative controls chạy theo capability và từ chối wrong answer, ambiguity, prompt mismatch, out-of-grade parameter, relabeled AST, unsupported interaction và difficulty relabel.

5.880/5.880 Wave A samples PASS; exact duplicate 0, maximum near-duplicate 0,1000 và fallback 0. `PERIMETER_AREA/HARD` được sửa bằng context/diagram presentation variation thật, rerun 100 seeds đạt 0,0158 thay cho 0,1316.

Local runtime và Owner review dùng outcome ID làm identity. Review UI lọc theo grade, unit, outcome, variant, difficulty, interaction và status; manifest có 294 public-only representative samples. Database proof runtime tìm canonical curriculum unit bằng official outcome mapping trước khi tạo immutable persistence envelope.

Full audit hiện chạy 6.420/32.760 samples cho 107 mappings; 439 outcomes còn lại không được generate. Full coverage vẫn incomplete và repository-default runtime vẫn OFF. Chi tiết: `docs/status/SPRINT_8CA_WAVE_A_NUMBERS_ARITHMETIC.md` và `artifacts/generator-v2-wave-a/report.json`.
