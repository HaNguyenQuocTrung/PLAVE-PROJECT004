# Sprint 10B — Generator V2 Student runtime integration

Ngày kiểm chứng: 2026-08-02
Checkpoint nền: `c5c46f69227f`
Kết luận: **PASS trong phạm vi bounded local integration**

## Kết luận điều hành

Finding F-002 (Generator V2 tách khỏi Student practice thật) đã được xử lý tại
đúng public runtime: `/lessons` → lesson detail →
`/api/curriculum-runtime/*` → `/curriculum-practice/[attemptId]` → progress và
history. Evidence không gọi internal proof route, Owner review route hay test-only
generation endpoint.

Repository default vẫn `OFF`. Local verification chỉ cho phép 6 outcome/capability
được kiểm tra trực tiếp; 540/546 outcome còn lại fail closed với correctness
eligibility chưa đạt. Sprint này không tuyên bố full correctness, production
readiness, remote activation hoặc Milestone 2 completion.

Active status sau Sprint 10B:

- Milestone 1: `COMPLETE_OWNER_APPROVED`;
- Milestone 2: `REOPENED_CORRECTNESS_REMEDIATION`;
- Milestone 3: `REOPENED_SECURITY_AND_REPRODUCIBILITY_REMEDIATION`.

## Runtime contract đã nối

Browser chỉ gửi `unitSlug` và `idempotencyKey`. Server xác thực Student, grade,
prerequisite và release unit, rồi map rõ ràng:

`lesson/unit -> official outcome ID -> exact canonical capability`.

`GENERATED_V2` chỉ hoạt động khi global flag, local release, schema 0042, signing
key, loopback, outcome allowlist, capability allowlist và eligibility state cùng
PASS. Client-supplied mode, outcome, capability, seed hoặc correctness bị reject.
Không có keyword routing, generic generation hay silent generated fallback.

Static practice giữ nguyên contract và tiếp tục chạy khi repository-default
Generator V2 Student runtime là OFF.

## Bounded eligibility

| Grade | Outcome | Capability | Unit |
|---:|---|---|---|
| 2 | `MOET2018-G2-NUM-P025-018` | `MULTIPLY_DIVIDE_FACTS` | `grade-2-multiplication-division` |
| 3 | `MOET2018-G3-NUM-P029-004` | `PLACE_VALUE_COMPARE` | `grade-3-number-sense-to-100000-p1` |
| 4 | `MOET2018-G4-NUM-P036-018` | `FRACTION_PART_WHOLE` | `grade-4-fraction-foundations` |
| 6 | `MOET2018-G6-GEO-P051-003` | `PERIMETER_AREA` | `grade-6-area-measurement` |
| 7 | `MOET2018-G7-STA-P061-001` | `CHART_DATA_INTERPRETATION` | `grade-7-data-and-probability` |
| 9 | `MOET2018-G9-NAA-P072-010` | `LINEAR_SYSTEM` | `grade-9-linear-systems` |

Đây là 6/546 outcome, không phải tuyên bố cả registry Student-runtime eligible.

## Authenticated database proof

Disposable local schema 0001–0042 tạo 7 generated attempts và hoàn tất 7/7.
Database ghi 84 immutable generated questions, 84 private solutions, 84 answers
và 84 rows provenance đủ 8/8; orphan count bằng 0.

Các contract PASS:

- authenticated ownership và role isolation;
- concurrent start trả cùng attempt;
- resume không regenerate và snapshot hash không đổi;
- duplicate submit là one-write/idempotent;
- CAS chỉ có một winner;
- progress/history exactly once;
- injected failure rollback không tạo partial write;
- completion/results/history đọc lại persisted content;
- cleanup stack/listener/temp fixture hoàn chỉnh.

## Browser acceptance

Local Playwright Core 1.51.1 + Chrome 150 chạy qua authenticated public Student
surface tại 320×568, 390×844 và 1280×800. Sáu capability đại diện numeric,
multiple choice, fraction, ordering, matching/equation, diagram và chart/table;
bao phủ EASY/MEDIUM/HARD, incorrect/correct feedback, next, refresh/resume,
completion, progress và history.

24/24 final screenshots đã được mở ở original detail và review thủ công.
Console, hydration, page, overflow, private leak, dead control và final
prompt/visual/answer mismatch đều bằng 0. Critical/high visual issues còn lại bằng
0. Trong review, lỗi feedback dùng option của câu kế tiếp đã được phát hiện và
sửa; ảnh cuối xác nhận correct answer, prompt và solution của câu vừa submit cùng
một immutable question.

Negative matrix PASS: anonymous 401, wrong Student 404, Parent/Teacher 403,
forged routing 400, cross-grade 403, correctness-review-required 503, release OFF
503 và global OFF 503. Direct URLs không hiển thị generated question cho role sai.

## Regression và operations gates

| Gate | Result |
|---|---:|
| Generator V2 Student runtime | 8/8 PASS |
| Static Practice | 550/550 PASS |
| Generator V2 core/persistence/security | 34/34 PASS |
| Curriculum | 9/9 + 21/21 PASS |
| Competency | 10/10 PASS |
| UI/UX | 13/13 PASS |
| AI Tutor | 40/40 PASS; provider requests 0 |
| Canonical typecheck | PASS |
| Lint | PASS; 0 warnings |
| Clean-room production build | PASS; 77/77 pages |
| Clean-room secret-boundary canary | PASS; occurrence 0; real key unused |
| npm audit | `UNVERIFIED_ENVIRONMENT_BLOCKED` (`ENOTFOUND registry.npmjs.org`) |

Last verified npm audit remains 0 vulnerabilities on 2026-08-01; this sprint does
not convert the blocked current audit into a PASS.

## Reproducibility và boundaries

An isolated key-unset clean-room copy was created from checkpoint
`c5c46f69227f` plus the exact intended Sprint 10B working-tree delta. Generated
`.next*` caches, `.env.local`, artifacts and local secrets were excluded. The
copy passed production build and secret-boundary scan, then was deleted.

The checkpoint alone does not contain Sprint 10B until a future authorized Git
checkpoint. In this sprint: Git stage/commit/push = 0, remote mutations = 0,
migration changes = 0, paid requests = 0. The pre-existing Owner AI Tutor listener
at `127.0.0.1:3001` was preserved; all Sprint 10B listeners, containers and temp
directories were removed.

## Remaining gate

Sprint 10C must remediate and directly review correctness contracts before
eligibility expands. Milestone 2 remains reopened; 546/546 must not be described
as usable in Student runtime yet.

**SPRINT 10B COMPLETE — GENERATOR V2 CONNECTED TO REAL STUDENT RUNTIME, FULL CORRECTNESS REMEDIATION REQUIRED**
