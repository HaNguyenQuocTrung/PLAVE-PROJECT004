# SPRINT 8C.B — Generator V2 fractions, decimals, ratio and percentage

Ngày: 2026-08-02  
Roadmap: Milestone 1 `COMPLETE_OWNER_APPROVED`; Milestone 2 `IN_PROGRESS_RESUMED`; Milestone 3 `COMPLETE_OWNER_APPROVED_LOCAL_MVP`  
Trạng thái: `PASS_BROWSER_VALIDATED`  
Phạm vi: exact Wave B rows trong inventory 546 hiện hành

## Kết quả

Wave B có đúng 61 outcome IDs theo `artifacts/generator-v2-full-coverage/outcome-matrix.json`; số lượng không được đặt trước. Cả 61/61 đã có explicit typed contract, solver, validator, review sample và runtime mapping. Không còn `BLOCKED_MISSING_CONTRACT`, fallback, keyword routing hoặc mathematically unsolvable outcome trong Wave B.

| Gate | Kết quả |
|---|---:|
| Wave B outcomes | 61/61 |
| Newly implemented outcomes | 60 |
| Proven baseline preserved | 1 |
| Canonical capabilities | 30 |
| Grades represented | 2–7 |
| Samples | 3.660/3.660 |
| Independent solve + validation | 3.660/3.660 |
| Deterministic replay | PASS |
| Exact duplicates | 0 |
| Maximum near-duplicate pair rate | 0,010526 ≤ 0,12 |
| Fallback / keyword routing | 0 / 0 |
| Provenance | 8/8 trên 3.660 samples |
| Overall Generator V2 coverage | 167/546 |
| Remaining post-Wave-B outcomes | 379 |

`IMPLEMENTED_REVIEW_REQUIRED` không phải Owner approval và Milestone 2 không được auto-complete.

## Exact inventory đọc từ matrix

Inventory hiện hành có một số row được wave classifier trước đây gán vào B dù wording thuộc whole-number hoặc symmetry. Sprint không âm thầm đổi wave, bỏ row hoặc tạo alias; toàn bộ 61 exact IDs của matrix đều được triển khai. Artifact `artifacts/generator-v2-wave-b/outcome-matrix.json` giữ grade, official strand, domain, unit, prerequisites và contract mapping cho từng ID.

| Grade | Official strand | Domain trong source matrix | Count | Exact outcome IDs |
|---:|---|---|---:|---|
| 2 | SỐ VÀ PHÉP TÍNH | Số và cấu tạo thập phân của một số | 3 | `MOET2018-G2-NUM-P024-001`, `MOET2018-G2-NUM-P024-003`, `MOET2018-G2-NUM-P024-004` |
| 3 | SỐ VÀ PHÉP TÍNH | Phân số của nhóm | 1 | `MOET2018-G3-NUM-P031-024` |
| 3 | SỐ VÀ PHÉP TÍNH | Số và cấu tạo thập phân của một số | 12 | `MOET2018-G3-NUM-P029-001`, `MOET2018-G3-NUM-P029-002`, `MOET2018-G3-NUM-P029-003`, `MOET2018-G3-NUM-P029-005`, `MOET2018-G3-NUM-P029-006`, `MOET2018-G3-NUM-P029-007`, `MOET2018-G3-NUM-P029-008`, `MOET2018-G3-NUM-P029-009`, `MOET2018-G3-NUM-P029-011`, `MOET2018-G3-NUM-P030-015`, `MOET2018-G3-NUM-P030-017`, `MOET2018-G3-NUM-P030-018` |
| 4 | SỐ VÀ PHÉP TÍNH | Nội dung Yêu cầu cần đạt | 3 | `MOET2018-G4-NUM-P036-016`, `MOET2018-G4-NUM-P036-018`, `MOET2018-G4-NUM-P036-019` |
| 4 | SỐ VÀ PHÉP TÍNH | Số và cấu tạo thập phân của một số | 3 | `MOET2018-G4-NUM-P034-001`, `MOET2018-G4-NUM-P034-003`, `MOET2018-G4-NUM-P034-005` |
| 5 | MỘT SỐ YẾU TỐ THỐNG KÊ VÀ XÁC SUẤT | Một số yếu tố thống kê | 1 | `MOET2018-G5-STA-P045-007` |
| 5 | SỐ VÀ PHÉP TÍNH | Máy tính | 1 | `MOET2018-G5-NUM-P043-024` |
| 5 | SỐ VÀ PHÉP TÍNH | Phân số | 1 | `MOET2018-G5-NUM-P041-009` |
| 5 | SỐ VÀ PHÉP TÍNH | Số thập phân | 1 | `MOET2018-G5-NUM-P041-011` |
| 6 | HÌNH HỌC VÀ ĐO LƯỜNG | Số thập phân và các phép tính với số thập phân. Tỉ số và tỉ số phần trăm | 2 | `MOET2018-G6-GEO-P051-008`, `MOET2018-G6-GEO-P051-010` |
| 6 | SỐ VÀ ĐẠI SỐ | Số thập phân và các phép tính với số thập phân. Tỉ số và tỉ số phần trăm | 5 | `MOET2018-G6-NAA-P050-044`, `MOET2018-G6-NAA-P050-045`, `MOET2018-G6-NAA-P050-047`, `MOET2018-G6-NAA-P050-050`, `MOET2018-G6-NAA-P050-051` |
| 6 | SỐ VÀ ĐẠI SỐ | Số tự nhiên và tập hợp các số tự nhiên | 1 | `MOET2018-G6-NAA-P047-002` |
| 6 | SỐ VÀ ĐẠI SỐ | Fraction/operation-property source segment | 6 | `MOET2018-G6-NAA-P049-031`, `MOET2018-G6-NAA-P049-033`, `MOET2018-G6-NAA-P049-035`, `MOET2018-G6-NAA-P049-038`, `MOET2018-G6-NAA-P049-040`, `MOET2018-G6-NAA-P049-043` |
| 7 | HOẠT ĐỘNG THỰC HÀNH VÀ TRẢI NGHIỆM | Tìm hiểu kiến thức tài chính | 1 | `MOET2018-G7-EXP-P062-005` |
| 7 | SỐ VÀ ĐẠI SỐ | Số hữu tỉ và tập hợp các số hữu tỉ | 20 | `MOET2018-G7-NAA-P055-001`, `MOET2018-G7-NAA-P055-002`, `MOET2018-G7-NAA-P055-003`, `MOET2018-G7-NAA-P055-004`, `MOET2018-G7-NAA-P056-006`, `MOET2018-G7-NAA-P056-007`, `MOET2018-G7-NAA-P056-010`, `MOET2018-G7-NAA-P056-011`, `MOET2018-G7-NAA-P056-012`, `MOET2018-G7-NAA-P056-013`, `MOET2018-G7-NAA-P056-014`, `MOET2018-G7-NAA-P056-015`, `MOET2018-G7-NAA-P056-016`, `MOET2018-G7-NAA-P056-018`, `MOET2018-G7-NAA-P057-019`, `MOET2018-G7-NAA-P057-020`, `MOET2018-G7-NAA-P057-026`, `MOET2018-G7-NAA-P057-027`, `MOET2018-G7-NAA-P057-028`, `MOET2018-G7-NAA-P057-032` |

Grade distribution là G2=3, G3=13, G4=6, G5=4, G6=14 và G7=21.

## Contract và mathematical implementation

Mỗi mapping dùng `outcomeId → canonicalVariantId → wave-b-v2.1`. Contract type là `PLAVE_PRODUCT_ASSESSMENT_CONTRACT_V2`; runtime không đọc title, keyword, substring hoặc regex để chọn family. Unknown mapping tiếp tục trả `GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED`.

30 capabilities bao phủ representation/equivalence/compare/order/operations/application của fraction; scaled decimal comparison/operations/application; percentage of quantity, recover whole, percent change và statistical percent; ratio/equivalent ratio/direct/inverse proportion; rational number line, classification, opposite, powers, operation order và real-number order. Những exact matrix rows về whole number và symmetry có explicit capability riêng, không bị ép vào fraction fallback.

- Fraction dùng canonical `{numerator, denominator}`, GCD normalization và cross-product comparison; denominator 0 bị từ chối.
- Decimal dùng integer-scaled normalized model với scale 10/100/1000; không dùng uncontrolled floating-point equality.
- Ratio/percentage giữ base, whole, unit và missing-value role rõ; bảng visual chỉ chứa các đại lượng liên quan bằng tiếng Việt.
- EASY/MEDIUM/HARD thay đổi structure, steps, unknown role, representation và visual/interaction; không chỉ đổi label.
- Generator, mathematical solver và validator là boundary riêng. Validator kiểm tra prompt/model, visual/model, interaction/answer, grade/domain, uniqueness, distractors và public/private boundary.
- Negative controls từ chối prompt mismatch, solver mismatch, zero denominator và uncontrolled decimal scale trên mọi applicable new outcome.

Interaction thực tế gồm `SINGLE_CHOICE`, `MULTI_SELECT`, `INTEGER_INPUT`, `DECIMAL_INPUT`, `FRACTION_INPUT`, `ORDERING`, `TABLE_OR_CHART_RESPONSE` và `CONSTRUCTION_OR_VISUAL_SELECTION`. Fraction model, number line, data table, place-value chart và symmetry diagram đều sinh từ normalized model. Không fabricates `MATCHING` hoặc `SHORT_STRUCTURED_RESPONSE` khi Wave B contract không dùng chúng.

## Runtime, database và security

Local authenticated Student acceptance chạy fresh isolated disposable Supabase schema 0001–0042 và PLAVE loopback-only. 30 canonical capability representatives hoàn tất 31 attempts (thêm một concurrency attempt) và persist 372 immutable questions, private solutions và answers.

- `GENERATED_V2` discriminator và provenance 8/8: 372/372 rows.
- Same-process reload và Next process restart resume cùng snapshot, invocation count không tăng.
- Concurrent start idempotent; same-payload duplicate submit ghi một lần; different-payload idempotency và stale CAS trả conflict đúng contract.
- Progress, outcome, skill evidence và history cập nhật exactly once: 372/372; orphan rows 0.
- Injected transaction failure rollback PASS; post-completion submit bị từ chối.
- Student khác, Parent, Teacher, anonymous, direct table writes, private solution reads và legacy bypass đều bị chặn.
- Disposable stack cleanup PASS, không remote access/mutation và không còn listener/container thuộc harness.

## Local Playwright acceptance và screenshot review

Harness dùng local `playwright-core` 1.51.1 và Google Chrome/Chromium 150.0.7871.186 tại `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; không download browser và không dùng in-app Browser.

| Browser gate | Kết quả |
|---|---:|
| Required viewports | 390×844 và 1280×800, 2/2 PASS |
| Canonical capabilities | 30/30 |
| Grades | 2–7 |
| Difficulties | EASY/MEDIUM/HARD |
| Actual interaction types | 8/8 |
| Visual types | DATA_TABLE, FRACTION_MODEL, NUMBER_LINE, PLACE_VALUE_CHART, SHAPE_DIAGRAM, NONE |
| Console / hydration / page errors | 0 / 0 / 0 |
| Overflow / disabled controls / keyboard failures | 0 / 0 / 0 |
| Private leaks / prompt-visual mismatch | 0 / 0 |
| Screenshots created | 34 |
| Screenshots opened and reviewed | 34/34 |
| Critical/high issues in final run | 0 |
| Fixture cleanup | PASS |

Visual review found and fixed four high issues before the final clean rerun: fraction-opposite number-line marker used a non-rational path; center-symmetry diagram was not mathematically center-symmetric; ratio tables exposed irrelevant raw rows and clipped a mobile caption; one-digit ordering controls could be narrower than 44px. Assertions were not weakened. Final screenshots contain the fixes.

## Regression gates

| Suite | Kết quả |
|---|---:|
| Wave A | 8/8; 98/98 outcomes; 5.880/5.880 samples |
| Generator V2 + negative controls | 10/10 |
| Wave B | 8/8 |
| Full coverage inventory | 6/6; 167/546 |
| Persistence/database contracts | 10/10 plus live disposable proof |
| Practice | 550/550 |
| Practice visual readability | 3/3 |
| Curriculum | 9/9 |
| Universal curriculum | 21/21 |
| Competency | 10/10 |
| UI/UX | 13/13 |
| AI Tutor non-paid regression | 40/40 |
| Typecheck | PASS |
| Lint | PASS, 0 warning |
| Production build | PASS, 76/76 static pages |
| `npm audit` | BLOCKED: sandbox DNS không tới registry; escalation bị policy từ chối vì sẽ gửi dependency metadata ra npm registry |

Không claim `npm audit` PASS từ dữ liệu cũ. Sprint không đổi dependency hoặc lockfile.

## Artifacts và reproduction

- `artifacts/generator-v2-wave-b/report.json`
- `artifacts/generator-v2-wave-b/outcome-matrix.json`
- `artifacts/generator-v2-wave-b/diversity.json`
- `artifacts/generator-v2-wave-b/negative-controls.json`
- `artifacts/generator-v2-wave-b/review-manifest.json`
- `artifacts/generator-v2-wave-b/browser-acceptance.json`
- `artifacts/generator-v2-wave-b/screenshot-review.json`
- `artifacts/generator-v2-wave-b/screenshots/mobile/`
- `artifacts/generator-v2-wave-b/screenshots/desktop/`

Commands: `npm run --silent test:generation-v2-wave-b` và `npm run --silent acceptance:generator-v2-wave-b`.

## Boundaries

Không remote mutation, migration change, deployment, Git mutation, repository-default runtime enable, AI Tutor implementation change, generic fallback, synthetic coverage hoặc Wave C implementation. Milestone 2 vẫn `IN_PROGRESS_RESUMED`.

PLAVE GENERATOR V2 WAVE B COMPLETE — 61/61 FRACTION, DECIMAL, RATIO AND PERCENTAGE OUTCOMES BROWSER VALIDATED
