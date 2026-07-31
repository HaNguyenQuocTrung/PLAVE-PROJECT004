# Release candidate — Các số trong phạm vi 1000

## 1. Trạng thái quản trị

- Release candidate: `g2-numbers-to-1000-rc1`
- Unit: `grade-2-numbers-to-1000`
- Content version: `g2n1000-1.0.0-rc.1`
- Label: `RECOMMENDED_RELEASE_CANDIDATE`
- Official source validation: `VALIDATED`
- Technical validation: `PASSED`
- Expert review: `OPTIONAL_NOT_OBTAINED`
- Release-manifest owner decision:
  `APPROVED_FOR_CONTROLLED_PILOT_PREPARATION`
- Subsequent runtime-integration decision:
  `APPROVED_FOR_RUNTIME_INTEGRATION`
- Publication: `DRAFT`
- Student visibility: `HIDDEN`

Owner đã phê duyệt đúng frozen candidate/hash để chuẩn bị runtime integration.
Approval này không cho phép apply migration, publication, Student visibility
hoặc controlled-pilot activation. PLAVE không tuyên bố nội dung được giáo viên
hoặc Bộ GDĐT chứng nhận.

Machine-readable manifest:
[manifest.json](../../content/releases/grade-2-numbers-to-1000/g2-numbers-to-1000-rc1/manifest.json).

## 2. Publication architecture audit

Schema hiện tại đã đủ để chứa candidate mà không thêm bảng:

- `learning_units.published = false` giữ unit ngoài catalog, lesson và
  recommendation;
- `questions.published = false` giữ question ngoài browser policy;
- `question_solutions` tách answer/solution và không có direct browser
  `SELECT`;
- RPC `start_or_resume_practice` hiện yêu cầu unit published, đúng grade,
  Student onboarding, ownership và prerequisite;
- diagnostic Lớp 1 dùng blueprint riêng, không chọn Grade 2 draft;
- review lịch sử vẫn dựa trên ownership của attempt thật.

Database insert vẫn cần thiết để một lần apply sau này có thể stage đúng
unit/question/solution. Vì vậy migration draft `0035` là additive content
migration, không phải schema publication system. Nó không publish và không
thêm feature flag production.

## 3. Candidate selection

Năm seed được chấm bằng rubric deterministic 100 điểm:

| Seed | Điểm | Kết quả |
|---|---:|---|
| `g2-review-number-language` | 100 | Được đề xuất theo tie-break ổn định |
| `g2-review-place-value` | 100 | Hợp lệ |
| `g2-review-sequence` | 100 | Hợp lệ |
| `g2-review-zero-boundaries` | 100 | Hợp lệ |
| `g2-review-accessibility` | 95 | Hợp lệ; thiếu mẫu hàng chục bằng 0 |

Rubric kiểm tra bốn skill family, answer type, visual type, boundary/place-value
diversity, ID/prompt, MCQ option, tải đọc, house style “linh”, scope,
answer/solution/visual consistency và misconception tag. Tie-break sắp theo
seed để cùng input luôn cho cùng candidate.

Release seed được đóng băng: `g2-review-number-language`.

## 4. Frozen release

- Generator: `g2n1000-generator-1.0.0`
- Configuration: `g2n1000-config-1.0.0`
- Templates: `g2n1000-template-1.0.0`
- Source manifest: `poc-v1`
- Created at: `2026-07-29T15:49:23Z`
- Question bank: 24
- Public bundle SHA-256:
  `b82fe7af0c4c114fdedccc492ed6f6a9d9fa8d2edcb2fc1c05ab3b33e02d419d`
- Server solution bundle SHA-256:
  `c3278345c73129582267bbf2c7f4f2b3f0ff2b9224c8ade53ece9f7624359369`
- Private audit bundle SHA-256:
  `385991e533437b9f5362b3594784c24510c3a9d85f51390b7980f7cf88f726a9`
- Unit content SHA-256:
  `ae95103da0687c28de37f2789437a93a790fed53bd03541a2bbc6a6471329ac2`
- Full release bundle SHA-256:
  `1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530`

Nếu generator, config, template, source mapping, lesson, question, solution hoặc
audit artifact thay đổi, hash validation fail. Candidate mới phải có ID/version
mới và candidate cũ được ghi `SUPERSEDED`; không được sửa âm thầm.

## 5. Distribution

- Skill: 4 × 6 câu.
- Answer type: 16 `MULTIPLE_CHOICE`, 8 `NUMBER_INPUT`.
- Visual: 12 `PLACE_VALUE_CHART`, 6 `NUMBER_CARD`, 6 `NUMBER_LINE`.
- Difficulty: 16 `EASY`, 8 `MEDIUM`.
- Cognitive level: 16 `UNDERSTAND`, 8 `APPLY`.

Unit content có sáu phần lý thuyết, hai ví dụ từng bước và ghi nhớ. Tải đọc,
difficulty, distractor và adaptive threshold tiếp tục là
`PRODUCT_HYPOTHESIS`.

## 6. Client/server boundary

Public question artifact chỉ gồm ID, prompt, answer type, public MCQ options,
visual, accessibility description, skill metadata, difficulty, cognitive level
và display order.

Server solution artifact giữ correct answer, steps, explanation và hint.
Private audit artifact giữ source để tính lại đáp án và misconception mapping.
Không có direct application query đến `question_solutions`.

## 7. Draft migration

File:
`supabase/migrations/0035_grade2_numbers_to_1000_release_candidate_draft.sql`.

Migration:

- dùng đúng một `BEGIN`/`COMMIT`;
- fail nếu slug đã tồn tại;
- mở rộng allowlist bốn skill và ba visual mới, giữ toàn bộ giá trị cũ;
- insert unit và questions với `published = false`;
- giữ solutions trong bảng server-only;
- không mutation Grade 1, practice, diagnostic, attempt, answer hoặc history;
- validation trước commit kiểm tra count, distribution, mapping, RLS/grant,
  hidden status, RPC published boundary và baseline Grade 1.

Migration chưa được phép apply ở Sprint 6E-B.

Sprint 6F giữ nguyên file và hash `0035`. Persistence adaptive được tách thành
draft `0036_adaptive_practice_runtime_draft.sql`; cả hai đều chưa apply.
Feature flags Grade 2, adaptive runtime, controlled pilot và retention đều
mặc định `false`.

## 8. Verification plan sau một Owner approval riêng

Nếu Owner sau này cho phép apply, chạy read-only verification:

1. Unit Grade 2 tồn tại đúng một, `published = false`, total 24.
2. Có 24 hidden questions và 24 solutions; type `16 + 8`; skill `6 × 4`.
3. `anon` và `authenticated` không direct-select được solution.
4. Student `/learn`, `/lessons`, recommendation và diagnostic không thấy unit.
5. RPC start từ chối slug vì unit chưa published.
6. Grade 1 vẫn có 13 published unit, 312 published questions và lịch sử cũ.

Không tạo Student attempt trong bước verification.

## 9. Rollback plan

Rollback content chỉ được cân nhắc khi unit vẫn hidden và không có bất kỳ
attempt nào:

1. Bắt đầu transaction.
2. Assert unit/questions đều unpublished và attempt count bằng 0.
3. Xóa solutions theo question IDs của đúng unit.
4. Xóa questions của đúng unit.
5. Xóa đúng learning unit slug.
6. Commit và chạy lại baseline Grade 1.

Nếu có attempt/history, rollback phải dừng; không được xóa dữ liệu học sinh.
Các visual/skill allowlist additive có thể giữ lại an toàn. Sprint này không
chạy rollback hay bất kỳ mutation Supabase nào.
