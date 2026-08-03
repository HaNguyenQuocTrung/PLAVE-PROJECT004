# PLAVE Score, XP and Mastery

Ngày: 2026-08-03
Policy: `PLAVE_SCORING_POLICY_V1`
Database boundary: local-only migration `0043_score_xp_mastery_foundation.sql`

## Source of truth trước Sprint 11A

| Dữ liệu | Source of truth | Ghi chú |
|---|---|---|
| Attempt và immutable question set | `curriculum_attempts`, release questions hoặc generated questions đã persist | Static `MATERIALIZED` và Generator `ON_DEMAND` dùng chung attempt |
| Terminal answer | `curriculum_answers` hoặc `curriculum_generated_answers` | Một row duy nhất cho mỗi persisted question; CAS và idempotency thuộc database |
| Legacy unit progress/history | `student_curriculum_unit_progress` và các projection/RPC 0038–0042 | Trước 0043 là unweighted presentation/compatibility data, không phải XP hoặc outcome mastery V1 |
| Generator correctness/difficulty | Immutable generated snapshot/provenance | Client không được cung cấp difficulty, seed hoặc correctness |
| Static difficulty/outcome | Immutable release question | Dùng `cognitive_level` và exact official outcome mapping |
| Grade 1 legacy practice | `practice_attempts`/legacy progress | Không có đủ official outcome + immutable difficulty evidence để retroactively tạo V1 XP/mastery |

Không có XP ledger hoặc latest-10 outcome mastery đáng tin trước Sprint 11A.
Các số điểm cũ chỉ được hiển thị như legacy score/accuracy. Không backfill XP giả,
không dùng client score và không có pipeline Score/XP thứ hai.

## Product contract V1

### Attempt Score

Score chỉ phản ánh một completed attempt:

- `EASY=1`, `MEDIUM=2`, `HARD=3` weighted point;
- `earnedWeight` là tổng weight của terminal correct answers;
- `possibleWeight` là tổng weight của toàn bộ immutable questions;
- `scorePercent=roundHalfUp(earnedWeight/possibleWeight×100)`;
- unanswered khi attempt complete nhận 0 earned weight;
- final fields chỉ được database ghi khi chuyển sang `COMPLETED`;
- reload, replay và duplicate submit không đổi score;
- lesson completion khác outcome mastery và không yêu cầu score 100.

### XP

XP là append-only learning progression, độc lập với Score:

- first terminal correct của persisted question: `EASY=10`, `MEDIUM=15`,
  `HARD=20` XP;
- incorrect, replay, reload và duplicate submit: 0 additional XP;
- unique key là `Student × attempt × persisted question × policy`;
- V1 dùng persisted question ID làm anti-farming boundary. Canonical learning-cycle
  identity chưa có contract đủ an toàn, nên không dùng heuristic theo prompt/hash;
- không speed/perfect/streak/daily bonus, multiplier, negative hoặc purchased XP.

Runtime 0038–0042 hiện coi mỗi submission là terminal và chuyển sang question kế
tiếp. Nếu một future interaction cho phép retry cùng persisted question, unique
ledger key vẫn chỉ cho first correct một XP event.

### Outcome mastery

Evidence là terminal answer của một distinct persisted question có exact official
outcome mapping. Projection dùng latest 10 evidence rows cho
`Student × outcome × policy`:

- weight: `EASY=1.00`, `MEDIUM=1.25`, `HARD=1.50`;
- `masteryPercent=roundHalfUp(correctWeight/allWeight×100)`;
- `NOT_STARTED`: không có projection/evidence;
- `IN_PROGRESS`: 1–4 evidence;
- `DEVELOPING`: ≥5 evidence và <60;
- `PROFICIENT`: ≥5 evidence và 60–79, hoặc chưa đủ điều kiện MASTERED;
- `MASTERED`: ≥8 evidence, ≥80 và ≥2 correct MEDIUM/HARD;
- `NEEDS_REVIEW`: từng MASTERED nhưng weighted latest 5 <60.

EASY-only evidence không thể tạo `MASTERED`. Projection giữ evidence count,
correct count, percent, status, last time, policy version, ever-mastered bit và
private active-window traceability. Public payload không chứa evidence IDs,
answer rows hoặc provenance nội bộ.

## Database ownership

Migration 0043 là additive, atomic và không sửa 0001–0042:

- thêm nullable/final scoring snapshot và accumulated attempt XP vào
  `curriculum_attempts`;
- tạo append-only `private.student_xp_ledger`;
- tạo immutable `private.student_mastery_evidence`;
- tạo server-maintained `private.student_outcome_mastery`;
- RLS bật trên cả ba bảng; `anon`/`authenticated` không có direct table write;
- SECURITY DEFINER functions đều có `search_path=''` và private implementation
  RPC không được grant trực tiếp;
- foreign keys ràng buộc Student ownership/attempt; checks ràng buộc difficulty,
  XP amount, policy version và projection counts;
- static/generated answer triggers gọi cùng `record_scoring_evidence_v1`;
- attempt completion trigger recompute score từ immutable database questions và
  persisted terminal answers.

Các trigger chạy trong cùng submit/completion transaction. Lỗi sau answer, XP,
mastery hoặc progress làm rollback toàn bộ; không có orphan ledger/evidence.

## Server transaction and public contract

`/api/curriculum-runtime/answer` chỉ nhận attempt ID, question ID, typed answer,
expected revision và idempotency key. Exact-key request parsing reject mọi field
giả như XP, score, difficulty, mastery, correctness hoặc policy version.

Public static/generated RPC wrappers:

1. gọi implementation 0042 để auth, ownership, answer validation, CAS,
   idempotency, progress/history và completion;
2. answer insert trigger ghi XP/mastery exactly once;
3. completion trigger finalize weighted score exactly once;
4. trả `scoring` đã sanitize gồm final score, attempt XP delta/total, lesson
   completion và public mastery changes.

Replay trả `xpDelta=0`, nên UI không phát lại animation/announcement. Resume trả
same snapshot và `xpDelta=0`. Generator private solution, seed, solver receipt,
hash và private evidence window không đi qua client.

## Read models and roles

- Student: `get_my_score_xp_mastery()` cho own total/recent XP, mastery summary,
  public outcomes và attempt result history.
- Parent: `get_parent_child_score_xp_mastery(connectionId)` chỉ cho approved
  linked Student.
- Teacher: `get_teacher_student_score_xp_mastery(studentId)` chỉ cho approved
  classroom membership.
- Anonymous, wrong role, unrelated Parent/Teacher và direct table mutation fail
  closed.

Dashboard, Practice, Results, Progress/History và bounded Parent summary phân biệt
rõ Score, XP, mastery và lesson completion. Status luôn có text, không chỉ màu;
XP motion tắt dưới `prefers-reduced-motion`.

## Legacy and future work

- V1 chỉ kích hoạt trên attempts tạo sau local migration 0043.
- Curriculum attempts cũ có thể hiển thị legacy accuracy khi reconstructable,
  nhưng không nhận retroactive XP/mastery.
- Grade 1 legacy attempts là `NOT_RECONSTRUCTABLE` cho V1 nếu thiếu official
  outcome/difficulty snapshot.
- Không destructive rewrite hoặc remote backfill.
- Learning-cycle anti-farming, Level, Streak, Achievements, badges, leaderboard
  và adaptive recommendation thuộc Sprint 11B/Future Work, không có trong V1.

Repository Generator default vẫn OFF. Migration 0043 chưa được apply remote và
tài liệu này không phải deployment/production activation claim.
