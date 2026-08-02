# PLAVE Product Roadmap — Three Non-Negotiable Milestones

Ngày cập nhật: 2026-08-02  
Phạm vi sản phẩm: Toán lớp 1–9  
Active remediation: Sprint 10A — critical secret containment, reproducibility and baseline recovery

`MILESTONE_1=COMPLETE_OWNER_APPROVED`  
`MILESTONE_2=REOPENED_CRITICAL_REMEDIATION`  
`MILESTONE_3=REOPENED_SECURITY_AND_REPRODUCIBILITY_REMEDIATION`

Các quyết định Owner trước re-audit vẫn được giữ nguyên như historical decisions.
Active status phản ánh findings của complete project re-audit, không xóa hoặc
viết lại lịch sử acceptance.

## Product gates

PLAVE chỉ có đúng ba primary milestones, theo thứ tự bắt buộc:

| Thứ tự | Milestone | Trạng thái hiện tại | Gate để được bắt đầu/hoàn tất |
|---|---|---|---|
| 1 | Complete the Grades 1–9 UI/UX overhaul across the entire website | `COMPLETE_OWNER_APPROVED` | Technical browser evidence, sitewide propagation và Owner visual acceptance đều hoàn tất |
| 2 | Repair and complete Grades 1–9 question generation for genuinely useful real Student practice | `REOPENED_CRITICAL_REMEDIATION` | Historical Owner approval được giữ; active gate mở lại sau findings reproducibility và audit evidence |
| 3 | Add a safe, grounded and grade-appropriate AI Tutor for Grades 1–9 | `REOPENED_SECURITY_AND_REPRODUCIBILITY_REMEDIATION` | Historical local-MVP approval được giữ; active gate mở lại cho secret boundary và baseline recovery |

Unit tests, proof counts và generator coverage metrics không thể tự hoàn tất bất
kỳ milestone nào. Definition of done của mỗi milestone phải có rendered browser
evidence, real user journeys, representative manual review, mathematical
correctness, product usefulness và Owner acceptance.

## Milestone 1 — Grades 1–9 UI/UX overhaul

Current state: `REOPENED_CRITICAL_REMEDIATION`.

Historical Owner status trước complete re-audit: `COMPLETE_OWNER_APPROVED`.
Sprint 10A không sửa Generator correctness hoặc Student runtime integration;
những finding đó vẫn được theo dõi riêng và không bị che bởi remediation này.

### Acceptance criteria

- Toàn bộ website có hierarchy, navigation, state và wording nhất quán cho sản
  phẩm Toán lớp 1–9 trên mobile và desktop.
- Public, auth, Student, Parent, Teacher, lesson, practice, result/history,
  competency/recommendation, account/legal và recovery journeys chạy bằng browser
  local thật.
- Bảy viewport bắt buộc không có horizontal overflow, header overlap, broken CTA
  hoặc math visual overflow.
- Keyboard/focus, semantic DOM, labels, reduced motion, touch targets và zoom 200%
  đạt acceptance thực tế.
- Console, hydration, same-origin request và private-solution gates sạch.
- Screenshot artifacts thật được mở và review thủ công; không còn visual issue
  severity critical/high.
- Owner hoàn tất visual review và chấp nhận sản phẩm.

### Completed evidence

- Previous V2 visual acceptance is explicitly invalidated. Owner evidence found
  a critical zero-width lesson content column that the old review missed; the old
  `CRITICAL_HIGH_VISUAL_ISSUES=0` claim is not accepted as evidence.
- The defect was reproduced before editing at `/lessons` in Chromium: a 968px
  card computed to `0px 897.812px`, title width 0px/21 lines and card height
  2405px. After the semantic-card fix it computes to `739.281px 158.531px`, title
  width 739.281px/1 line and card height 185.656px.

- Local Playwright 1.51.1 với Chromium 150.0.7871.186; in-app Browser không được
  sử dụng.
- Seven-viewports acceptance: 7/7 PASS tại 320×568, 360×800, 390×844,
  768×1024, 1024×768, 1280×800 và 1440×900.
- Owner đã duyệt phong cách PLAVE V2 và cho phép sitewide propagation.
- 51 sitewide screenshots, seven `/lessons` viewport screenshots và sanitized
  before/after evidence đã được mở tại original resolution. Không còn
  critical/high issue trong technical review cuối.
- Anonymous, Student zero-progress, Returning Student, Parent, Teacher và local
  generated-runtime control journeys PASS.
- Console errors 0, hydration errors 0, page errors 0, failed same-origin
  requests 0, private-solution leaks 0.
- UI/UX + collapsed-layout contracts 13/13, practice 550/550, visual readability 3/3, universal curriculum
  21/21, Grades 1–9 curriculum 9/9, competency/recommendation 10/10,
  Parent/Teacher 14/14, security 6/6, typecheck, lint và 67-route production build
  đều PASS.
- V2 representative screens: landing, auth/role selection, Student Dashboard,
  `/lessons`, lesson detail, practice states, results, Parent và Teacher.
- Sitewide evidence: 29 route/route-template browser rows, route propagation còn
  thiếu 0, fixture teardown PASS, screenshot identifier masking PASS.
- Evidence chi tiết: `docs/status/SPRINT_7B_VISUAL_REDESIGN.md`,
  `docs/design/PLAVE_VISUAL_SYSTEM_V2.md` và
  `artifacts/uiux-v2-sitewide/report.json`.

### Remaining blocker

None. Owner granted full Milestone 1 visual acceptance on 2026-08-01.

## Milestone 2 — Grades 1–9 question generation

Current state: `COMPLETE_OWNER_APPROVED`.

Sprint 8A đã chứng minh generator cũ không usable ở mức sản phẩm. Sprint 8B đã
thay phần lõi của vertical slice bằng một canonical typed pipeline và kiểm chứng
12 representative variants bằng local Chromium. Waves A–F sau đó hoàn tất full
coverage, và Owner đã chấp nhận usefulness của Generator V2.

### Acceptance criteria

- Generated questions chạy trong real Student practice cho lớp 1–9, không chỉ ở
  proof harness hoặc test fixtures.
- Câu hỏi đa dạng, có chiều sâu ngữ nghĩa, phù hợp lớp, không lặp hời hợt và không
  biến mọi outcome thành cùng một template.
- Prompt, đáp án, đơn vị, diagram/table/chart/geometry renderer và lời giải đúng
  toán học, đọc được trên mobile/desktop và không leak private solution.
- Representative manual review bao phủ các grade bands, domains, difficulty và
  visual families; các lỗi usefulness được sửa và browser-check lại.
- Real Student journey bao gồm start, render, answer, feedback, next, completion,
  history, competency và recommendation update.
- Owner review generated question samples và chấp nhận product usefulness.

Các con số như 546/546 outcomes, 1638/1638 proof hoặc test PASS chỉ là technical
evidence. Nếu câu hỏi thực tế lặp, nông, sai renderer, yếu ngữ nghĩa, không phù hợp
lớp hoặc không dùng được trong Student practice thì Milestone 2 vẫn incomplete.

### Completed evidence trong Sprint 8B

- Canonical entry point và typed registry cho 12 outcomes thật trải trên lớp 1–9.
- Generator, solver, validator, renderer, feedback và provenance có boundary rõ;
  unknown mapping fail closed, không generic fallback.
- 3.600 deterministic samples; exact duplicate 0, diversity/difficulty gates và
  11 negative controls PASS.
- Local Playwright 1.51.1 + Chromium 150.0.7871.186 tại 390×844 và 1280×800.
- 12/12 variants chạy render, đúng/sai, feedback, next, refresh/resume,
  duplicate submit và completion; 60 screenshots đã review.
- Console 0, hydration 0, overflow 0, private leaks 0, visual/prompt mismatch 0.
- Chi tiết: `docs/architecture/PLAVE_GENERATOR_V2.md`,
  `docs/status/SPRINT_8B_GENERATOR_V2_VERTICAL_SLICE.md` và
  `artifacts/generator-v2-vertical-slice/report.json`.

### Sprint 8B.1/8B.2 database evidence và remaining blockers

- Migration 0042 sửa deferred-trigger 42501 bằng internal `SECURITY DEFINER`, owner
  `postgres`, empty search path và revoked direct EXECUTE; không cấp table privilege,
  disable trigger hoặc làm yếu provenance/RLS.
- Fresh isolated stack apply 42/42 migrations; upgrade 0041 → 0042, checksum
  preservation, transaction rollback, search-path shadowing và cleanup đều PASS.
- Authenticated Student canonical API/RPC chạy 12/12 variants: 13 completed attempts,
  156 immutable questions/solutions/answers và provenance 8/8.
- Resume/reconnect không regenerate; concurrent start, duplicate submit, stale CAS,
  exactly-once progress/history và injected rollback đều PASS.
- Student B, Parent, Teacher và anonymous bị chặn đúng contract; private solution và
  direct table access không mở.
- Chromium 390×844 và 1280×800: 60 final screenshots đã mở ở original resolution;
  console/hydration/overflow/private leak/prompt-visual mismatch đều 0.
- Owner review package 108 public samples đã sẵn sàng; Owner chưa review usefulness.
- Evidence: `docs/status/SPRINT_8B1_GENERATOR_V2_DATABASE_PROOF.md`,
  `docs/status/SPRINT_8B2_PROVENANCE_TRIGGER_FIX.md` và
  `artifacts/generator-v2-database-proof/report.json`.

### Sprint 8C full-coverage technical gate

- Waves A–F hiện map explicit đúng 546/546 canonical official outcome IDs qua
  198 canonical capabilities. Wave totals: 98 + 61 + 57 + 232 + 86 + 12 = 546.
- Reconciliation có 546 unique IDs; missing/duplicate/conflicting/synthetic
  assignments đều rỗng; fallback và keyword routing = 0; unknown outcome vẫn
  fail closed bằng `GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED`.
- Full audit đã thực thi lại 32.760/32.760 deterministic samples; independent
  solver/validator, duplicate, diversity, difficulty, grade, visual, ambiguity,
  private-boundary và provenance 8/8 gates đều PASS.
- Wave F hoàn tất đúng mười final outcomes (600/600 samples) cộng hai baseline đã
  có trong taxonomy Wave F; không có remaining technical outcome blocker.
- Full authenticated local schema 0001–0042 và browser matrix đại diện 198/198
  capabilities, Grades 1–9, ba difficulties và mười interaction types. 2.388
  immutable questions được persisted; resume/restart, CAS/idempotency,
  exactly-once, rollback, RLS/role isolation, no-orphan và cleanup đều PASS.
- Playwright Core 1.51.1 + Chrome 150 tại 390×844 và 1280×800; console,
  hydration, page, overflow, accessibility, private leak và prompt/visual
  mismatch = 0. 86/86 final screenshots đã mở ở original detail; hai lỗi HIGH
  được tìm và sửa trước clean rerun; final critical/high = 0.
- Regression: Practice 550/550, curriculum 9/9 + 21/21, competency 10/10,
  UI/UX 13/13, AI Tutor 40/40, typecheck, lint và build 77/77 PASS sau khi thêm
  loopback Owner decision route.
- `npm audit` là `UNVERIFIED_ENVIRONMENT_BLOCKED`; last verified 0
  vulnerabilities ngày 2026-08-01, không claim current PASS.
- Owner usefulness manifest có 198 public-only samples và quyết định explicit:
  `OWNER GENERATOR V2 USEFULNESS ACCEPTANCE: APPROVED`. Manifest/result ghi
  `ownerDecision=APPROVED`, source `OWNER_EXPLICIT_DECISION` và
  `perSampleDecisionDataAvailable=false`; không tự tạo 198 individual approvals.
- Sprint 8C.G đã làm review package launchable bằng
  `npm run --silent generator-v2:owner-review-start` tại loopback URL
  `http://127.0.0.1:3033/internal/generator-v2-owner-review`. Playwright 390×844
  và 1280×800 đã xác nhận filters, navigation, submit/feedback, decision/note và
  refresh-resume; errors/overflow/private leak = 0. Test không tạo Owner decision,
  cleanup listener/cache PASS; quyết định sau đó đến trực tiếp từ Owner.
- Evidence: `docs/status/SPRINT_8CF_FINAL_COVERAGE.md`,
  `docs/status/SPRINT_8C_GENERATOR_V2_FULL_COVERAGE.md`,
  `artifacts/generator-v2-full-coverage/report.json` và
  `artifacts/generator-v2-owner-review/manifest.json`.

## Milestone 3 — Grades 1–9 AI Tutor

Current state: `REOPENED_SECURITY_AND_REPRODUCIBILITY_REMEDIATION`.

Historical Owner status trước complete re-audit:
`COMPLETE_OWNER_APPROVED_LOCAL_MVP`. Phạm vi local MVP không được diễn giải là
deployment hoặc production certification.

Sprint 9A đã implement Tutor MVP, authenticated Student API, streaming UI và
local browser/security acceptance. Sprint 9B đã sửa first response bị Owner
reject vì chậm, chung chung và kết thúc giữa câu. Owner đã review lại và ghi nhận
quyết định rõ ràng: `OWNER AI TUTOR QUALITY ACCEPTANCE: APPROVED`. Quyết định này
hoàn tất Milestone 3 ở phạm vi local MVP và resume Milestone 2.

### Acceptance criteria

- Tutor an toàn, grounded vào curriculum, bài học, câu hỏi và evidence được phép
  dùng cho đúng lớp 1–9 của Student.
- Câu trả lời đúng toán học, phù hợp độ tuổi, không bịa kiến thức/evidence, không
  phán xét học sinh và biết từ chối khi ngoài phạm vi.
- Hint/scaffolding hỗ trợ suy nghĩ thay vì lộ private solution hoặc làm bài hộ
  trước khi Student submit.
- Privacy, authorization, role/grade isolation, observability và safe recovery có
  browser evidence.
- Real Student journeys và representative manual conversation review PASS.
- Product usefulness và Owner acceptance được ghi nhận.

### Completed evidence trong Sprint 9A

- Typed OPENAI/GOOGLE/DEEPSEEK interface; official OpenAI Responses và Google
  Gemini streaming adapters hoàn chỉnh, DeepSeek fail closed.
- `/tutor`, PLAVE V2 chat, suggestions, Stop/Retry/Regenerate/Copy/New/Clear và
  accessible recovery states.
- Auth/role/cross-user, injection, XSS, size/rate/concurrency/duplicate controls
  có automated evidence.
- Local Playwright 1.51.1 + Chromium 150.0.7871.186 tại 390×844 và 1280×800;
  console/hydration/overflow/secret leak/XSS đều 0.
- 9 final screenshots đã mở ở original resolution; critical/high issues tìm thấy
  trong self-review đã sửa.
- Sprint 9A.1 chuyển active provider sang Google, dùng official `@google/genai`
  và stable model `gemini-3.5-flash`; local Google-configured Playwright PASS.
- Sprint 9B bounded real-provider benchmark 6 requests chọn
  `gemini-3.6-flash`; finish reason/completeness guard, thinking tiers, response
  modes và latency telemetry đã PASS automated gates.

### Owner decision và remaining enhancements

Không còn blocker cho local MVP. Owner decision:
`OWNER AI TUTOR QUALITY ACCEPTANCE: APPROVED`.

Các enhancement không chặn completion:

- Conversation persistence.
- Deployment configuration.
- Optional DeepSeek/OpenAI providers.
- Production monitoring and cost controls.

## Prohibited premature work

- Milestone 2 chỉ hoàn tất nhờ cả technical integrated PASS và explicit Owner
  usefulness acceptance; không diễn giải riêng unit/proof counts thành approval.
- Không diễn giải Sprint 9A mock/browser PASS là real-provider hoặc production
  acceptance.
- Không dùng unit tests/proof counts để tuyên bố product usefulness hoặc milestone
  completion.
- Không mở rộng coverage claim ra ngoài 546 canonical outcomes của inventory hiện
  hành hoặc diễn giải approval này thành production certification.
- Không mở rộng AI Tutor sang provider chưa triển khai hoặc persistence schema
  khi chưa có review riêng.
- Không remote mutation, migration, activation/publication, deploy hoặc global
  generated-runtime enablement.
- Preserve unrelated legacy runtime controls.
- Không enable, mở rộng, redesign hoặc xóa legacy mechanisms trong current UI
  milestone trừ khi chúng trực tiếp phá trải nghiệm universal Grades 1–9.

Legacy technical debt sẽ được đưa vào một read-only audit sau này để đánh giá khả
năng xóa an toàn. Audit đó không phải primary milestone và không thay đổi thứ tự
ba milestone ở trên.

## Final three-milestone status

| Milestone | Final status | Approved scope |
|---|---|---|
| Milestone 1 — Grades 1–9 UI/UX | `COMPLETE_OWNER_APPROVED` | Sitewide UI/UX product scope |
| Milestone 2 — Generator V2 | `REOPENED_CRITICAL_REMEDIATION` | Historical approval retained; active remediation open |
| Milestone 3 — AI Tutor | `REOPENED_SECURITY_AND_REPRODUCIBILITY_REMEDIATION` | Historical local-MVP approval retained; active remediation open |

Các product milestones đã hoàn tất trong phạm vi được duyệt. Điều này không đồng
nghĩa deployed, remotely activated hoặc production certified. `npm audit` hiện
vẫn `UNVERIFIED_ENVIRONMENT_BLOCKED`; last verified 0 vulnerabilities ngày
2026-08-01.

MILESTONE 1 — PLAVE GRADES 1–9 UI/UX COMPLETE — OWNER APPROVED

MILESTONE 2 — PLAVE GENERATOR V2 COMPLETE — OWNER APPROVED

MILESTONE 3 — PLAVE AI TUTOR MVP COMPLETE — OWNER APPROVED
