# Review package — Các số trong phạm vi 1000

- Unit: `grade-2-numbers-to-1000`
- Unit/skill-family status: `PRODUCT_DECISION`
- Official-source validation: `VALIDATED`
- Technical validation: `PASSED`
- Expert review: `OPTIONAL_NOT_OBTAINED`
- Publication: `DRAFT`
- Publication/database: chưa thực hiện
- Review sample size: `PRODUCT_HYPOTHESIS`
- Owner preparation approval: 2026-07-29

Owner đã phê duyệt unit này làm vertical slice Lớp 2 đầu tiên, bốn skill
family và việc chuẩn bị release candidate. Approval này không cho phép apply
migration, controlled pilot, Student visibility hoặc publication.
Teacher-hard-blocker cũ được đánh dấu
`SUPERSEDED_BY_OFFICIAL_SOURCE_VALIDATION_POLICY`; chưa có expert review thật.

Source mapping versioned nằm tại
[GRADE2_NUMBERS_TO_1000_SOURCE_MANIFEST.md](./GRADE2_NUMBERS_TO_1000_SOURCE_MANIFEST.md).
Release candidate đóng băng nằm tại
[GRADE2_NUMBERS_TO_1000_RELEASE_CANDIDATE.md](./GRADE2_NUMBERS_TO_1000_RELEASE_CANDIDATE.md).

## 1. Bộ seed cố định

Review package tạo 24 sample cho mỗi seed, tổng 120 sample kỹ thuật:

1. `g2-review-place-value`
2. `g2-review-zero-boundaries`
3. `g2-review-number-language`
4. `g2-review-sequence`
5. `g2-review-accessibility`

Mỗi sample giữ riêng prompt, answer type, skill family, cognitive level,
difficulty, visual, accessibility description, misconception tags, correct
answer, solution steps và audit source. Correct answer/audit source chỉ nằm
trong review artifact; client question bundle không chứa các trường này.

## 2. Coverage trên mỗi seed

- 24 câu;
- 16 `MULTIPLE_CHOICE`, 8 `NUMBER_INPUT`;
- 4 family × 6 câu:
  - `NUMBER_RECOGNITION_TO_1000`;
  - `READ_WRITE_TO_1000`;
  - `PLACE_VALUE_TO_1000`;
  - `SEQUENCE_TO_1000`.

Đây là release review sample, không phải bằng chứng rằng một attempt phải có 24
câu.

## 3. Kiểm tra tự động

Validator:

- tính lại đáp án từ audit source trong phạm vi 0–1000;
- từ chối cộng/trừ, nhân/chia, so sánh/sắp xếp ngoài scope POC;
- từ chối wording mơ hồ hoặc hàng 0 dẫn đầu không tự nhiên;
- kiểm tra MCQ A–D, option duy nhất và đúng một canonical answer;
- parse `NUMBER_INPUT` nhất quán;
- đối chiếu number card, place-value chart và number line với audit source;
- yêu cầu visual description tương đương, không URL/HTML/correct flag;
- yêu cầu misconception tag và ít nhất hai bước lời giải;
- xác nhận cùng seed deterministic và nhiều seed tạo biến thể.

## 4. Lỗi đã phát hiện và sửa

1. Generator ban đầu có thể tạo câu kiểu “0 nghìn, 0 trăm...” ở giá trị nhỏ.
   Wording đã được chuẩn hóa để bỏ hàng 0 dẫn đầu, nhưng vẫn giữ hàng 0 ở giữa
   khi cần giải thích cấu tạo số.
2. Một số text UI dùng “24 câu” như mô tả chung. Text chung đã chuyển sang tổng
   câu động hoặc ngôn ngữ không gắn số. Grade 1 diagnostic vẫn giữ 24 câu vì đó
   là blueprint riêng đã xác minh, không phải invariant của practice.

## 5. Product hypotheses và optional expert evidence

- House style PLAVE dùng “linh” nhất quán; không khẳng định “lẻ” là sai.
- Bốn skill family có phản ánh đủ outcome mở đầu hay cần tách comparison/order.
- Mức tải đọc của prompt và lời giải với học sinh đầu Lớp 2.
- Distractor theo lỗi lệch 1, lệch 10, lệch 100 và đảo thứ tự chữ số.
- Phân loại difficulty/cognitive level của sample.
- Thiết kế runtime cuối cho number card, place-value chart và number line.
- Các threshold adaptive, bằng chứng mastery và lịch retention.

Comparison/order được giữ ngoài POC hiện tại; việc đưa vào cùng unit hay unit kế
tiếp là `PRODUCT_DECISION`.

Engine/validator không có quyền tự chuyển draft thành published content. Mọi
release vẫn cần official-source validation, technical pass, Owner action và
manual publication gate. Expert review là evidence bổ sung tùy chọn.

## 6. Lệnh kiểm tra

```text
npm run validate:grade2-engine-poc
npm run test:content-engine
npm run test:adaptive-practice
npm run test:source-policy
```
