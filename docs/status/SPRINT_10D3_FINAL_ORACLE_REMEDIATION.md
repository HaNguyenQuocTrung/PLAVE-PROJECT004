# Sprint 10D.3 — Final Oracle interaction and numeric canonicalization remediation

Ngày kiểm chứng: 2026-08-03
Baseline: `b5eeabab22f0183ceef1bd64cc1d94d34e882cfd`
Phạm vi: chỉ F-005 interaction/answer representation và exact numeric canonicalization

## Kết luận

`F-005=RESOLVED_PENDING_INDEPENDENT_REAUDIT`

Hai failure của Sprint 10D.2 đã được tái hiện từ preserved evidence rồi được
khóa bằng regression:

- một đáp án đại số nguyên bị ép thành `FRACTION_INPUT` nay fail closed với
  `ORACLE_INTERACTION_ANSWER_TYPE_MISMATCH`;
- nghiệm nguyên được viết dưới dạng `n`, `n.0`, `n.00` hoặc exact rational được
  canonicalize về cùng reduced rational khi contract cho phép.

Milestone 2 không đóng lại trong sprint này:

`MILESTONE_2=REOPENED_AWAITING_SPRINT_10D4_REAUDIT`

## Thay đổi có giới hạn

- `parseExactNumeric` parse toàn bộ chuỗi bằng `BigInt` rational, không dùng
  JavaScript floating-point equality. Parser chuẩn hóa finite decimal, dấu âm,
  zero/negative zero và fraction syntax khi contract cho phép; malformed,
  trailing garbage, `NaN`, `Infinity`, mẫu số 0 và scientific notation không
  được phép đều bị từ chối.
- Oracle tự suy ra answer kind và kiểm tra interaction compatibility. Mẫu số 1
  mặc định yêu cầu `INTEGER_INPUT`/numeric input; `FRACTION_INPUT` chỉ được giữ
  cho 11 exact curriculum outcomes có lý do biểu diễn phân số được khai báo.
  Grade 7 algebra outcome từng fail không nằm trong exception.
- Numeric option matching và quadratic solution-set comparison dùng exact
  canonical key; missing, extraneous và representation-duplicate roots vẫn có
  typed diagnostics riêng.
- Dependency boundary giữ nguyên: Oracle không import Generator implementation,
  Generator solver hoặc runtime submit validator.

Không sửa graph, fraction color, Generator question content, AI Tutor,
Score/XP/Mastery, migration hay repository-default activation.

## Falsification và inventory

Audit matrix được suy ra trực tiếp từ records, không hard-code totals:

- attempted: 34;
- expected-invalid mutations killed: 16;
- valid exact equivalences accepted: 18;
- unexpected survivors/rejections: 0;
- existing mutation suite: 12/12;
- exact Oracle regressions: 3/3.

Full inventory 32.760 coordinates có 12.222 sample với canonical denominator 1.
Interaction distribution của nhóm này được ghi trong
`sprint-10d3-interaction-matrix.json`; invalid denominator-one
`FRACTION_INPUT` = 0. Có 126 sample thuộc 11 exact pedagogical exceptions và
mỗi exception đều có outcome ID, reason và observed count.

## Full correctness

Fresh deterministic run:

- outcomes: 546/546;
- capabilities: 198/198;
- difficulties × seeds: 3 × 20;
- attempted/oracle validated: 32.760/32.760;
- answer, interaction, ambiguity, prompt/visual, distractor và private-boundary
  failures: 0;
- fallback: 0;
- keyword routing: 0.

Canonical valid samples không bị suy giảm. Falsification được chạy riêng sau
canonical PASS để tránh coi self-consistency là đủ.

## Authenticated Student runtime

Disposable local schema 0001–0042 chạy qua public production-intended surface:

- `/api/curriculum-runtime/*` và `/curriculum-practice/[attemptId]`;
- authenticated public capability traceability 198/198;
- Grade 7 algebra có `INTEGER_INPUT`, correct/incorrect feedback và completion;
- quadratic family có integer repeated-root và ordered multi-root interactions;
- malformed fraction object ở public answer API bị từ chối `400 INVALID_REQUEST`;
- resume không regenerate, concurrent start, CAS, duplicate submit, rollback,
  exactly-once progress/history, role denial và provenance 8/8 PASS;
- internal proof/review routes used: 0;
- orphans: 0; private leaks: 0; cleanup: PASS.

Repository default Generator flag vẫn OFF. Local disposable eligibility không
thay đổi remote release state.

## Browser acceptance

Local Playwright Core 1.51.1 + installed Chrome 150 chạy năm viewport; targeted
review dùng 320×568, 390×844 và 1280×800. Mười một final screenshots được mở ở
original detail, bao phủ integer input, malformed-safe interaction surface,
incorrect/correct feedback, quadratic answer set, resume và completion.

- console/hydration/page errors: 0;
- horizontal/math overflow: 0;
- dead required controls/touch target failures: 0;
- prompt/visual mismatch: 0;
- private leaks: 0;
- critical/high visual issues: 0.

Quadratic `n.0` equivalence là Oracle answer-label contract; public Student UI
dùng typed integer/ordering controls và không nhận raw private solution state.

## Regression gates

PASS: Oracle dependency boundary, mutations 12/12, full correctness, authenticated
Student runtime, persistence contracts 7/7, Practice 550/550, curriculum 9/9 và
21/21, competency 10/10, role/API isolation, UI/UX 13/13, AI Tutor key-unset
40/40, typecheck, lint, production build 77/77, isolated secret canary, JSON
validation và npm audit (0 vulnerabilities, fresh 2026-08-03 query).

Một command Sprint 8C đã supersede (`audit:generator-v2-full-coverage`) vẫn
exit 0 nhưng in marker `FULL_COVERAGE=FAIL` cho một exact duplicate trong alternate
`sprint8c` seed namespace (`MOET2018-G6-STA-P054-009/HARD`). Canonical Sprint
10C/10D.3 coordinate set dùng `sprint10c` seeds không tái hiện duplicate đó.
Đây là evidence-command/content-diversity observation ngoài hai gap F-005 của
Sprint 10D.3; không bị che và cũng không được sửa vì ranh giới sprint cấm thay
Generator content/semantic-diversity. Sprint 10D.4 cần reconcile observation này.

No paid provider request, remote mutation, migration, deployment, Git
stage/commit/push hoặc default activation được thực hiện.

SPRINT 10D.3 COMPLETE — ORACLE INTERACTION AND EXACT NUMERIC CANONICALIZATION GAPS REMEDIATED
