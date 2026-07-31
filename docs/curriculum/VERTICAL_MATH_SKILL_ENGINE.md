# Vertical Math Skill Engine

- Trạng thái: typed proof of concept
- Publication: không tự động
- POC đầu tiên: `grade-2-numbers-to-1000`
- Product direction: `ADAPTIVE` và unit/4 skill family đã được owner phê duyệt
- Governance: official source `VALIDATED`, expert `OPTIONAL_NOT_OBTAINED`,
  publication `DRAFT`

## 1. Bốn tầng tách biệt

```text
Curriculum outcome
└── Skill family
    └── Grade-specific unit
        └── Question template → generated variant
```

1. **Curriculum outcome** chứa mô tả, source reference và evidence status.
2. **Skill family** chứa invariant toán học và cấu hình typed.
3. **Grade-specific unit** chọn outcome, family, prerequisite, display order và
   trạng thái review/publication.
4. **Question template/generated variant** tạo prompt/visual và solution từ
   source data deterministic.

Một generated variant không được chuyển thành `PUBLISHED` chỉ vì validator pass.
Engine luôn xuất `DRAFT_GENERATED` với các trạng thái governance độc lập. Engine
không được tự thay expert review, Owner decision hoặc publication status.

## 2. Contract cấu hình typed

Contract tại `../../lib/content-engine/types.ts` bao phủ:

- `grade`, `domain`, `minValue`, `maxValue`, `digitCount`, `numberType`;
- `allowedOperations`, `carryMode`, `borrowMode`;
- `multiplicationTables`, `divisionTables`, `numberOfSteps`;
- `difficulty`, `cognitiveLevel`, `answerType`, `visualType`;
- `accessibilityDescription`, `misconceptionTags`.

Không dùng `any`, raw HTML, raw SVG, JavaScript hay JSON không allowlist. Runtime
validator từ chối range đảo ngược, grade ngoài 1–9, bảng nhân/chia sai, operation
không nhất quán, description không an toàn và danh sách cấu hình trùng.

## 3. Deterministic generation

POC dùng PRNG cục bộ từ seed:

- cùng seed tạo cùng question order, prompt, options, solution và visual;
- seed khác tạo biến thể khác;
- code câu chứa fingerprint ổn định của seed;
- không dùng `Math.random()` hoặc dữ liệu thời gian;
- không ghi seed hay draft vào Supabase.

Mỗi bundle giữ ba record tách biệt:

- `question`: payload không có correct answer, solution hoặc audit source;
- `solution`: correct answer và lời giải phía server/build;
- `audit`: dữ liệu cấu trúc để validator tính lại đáp án.

Việc tách record này mô phỏng boundary hiện hành giữa `questions` và
`question_solutions`; POC chưa thay thế grading RPC.

## 4. Validator

Validator POC kiểm tra:

- config typed và trace `G2-NUM-01`;
- range 0–1000, grade và unit boundary;
- deterministic seed và variation giữa nhiều seed;
- count/type/skill distribution của batch;
- option A–D duy nhất và không trùng;
- đáp án được tính lại từ source, không tin chuỗi hard-code;
- solution tối thiểu hai bước và khớp answer;
- place-value/number-card/number-line visual khớp source;
- accessibility description không lộ correct flag hay external content;
- generated question không chứa solution/audit source.

Validator pass là technical gate. Publication vẫn cần owner decision, content
review và teacher sample review theo
[GRADE2_CONTENT_QUALITY_GATES.md](./GRADE2_CONTENT_QUALITY_GATES.md).

Review package 5 seed và các phát hiện nội dung được ghi tại
[GRADE2_NUMBERS_TO_1000_CONTENT_REVIEW.md](./GRADE2_NUMBERS_TO_1000_CONTENT_REVIEW.md).
Adaptive planner POC và ranh giới giữa bank/review/attempt/mastery được ghi tại
[ADAPTIVE_PRACTICE_POLICY.md](./ADAPTIVE_PRACTICE_POLICY.md).

## 5. Ranh giới hiện tại

- Không seed hoặc publish Lớp 2 trong Sprint 6C.
- Không thay đổi schema/migration.
- Không mở multi-prerequisite.
- Không tạo Grade 2 diagnostic/completion/recommendation.
- Không cho Parent/Teacher truy cập thêm dữ liệu.
- Không sinh tự động các domain hình học, đo lường, tiền, dữ liệu hoặc xác suất
  bằng cách chỉ đổi range.

## 6. Đường phát hành dự kiến

1. Owner duyệt unit scope và product prerequisite.
2. Giáo viên tiểu học sample-review cấu hình, prompt, distractor và solution.
3. Chốt visual runtime allowlist cho place-value/number-line.
4. Freeze seed/content version được duyệt.
5. Tạo đúng một migration additive để seed bản đã review.
6. Chạy content/security/accessibility gate, apply thủ công và live smoke.

Engine không có đường gọi trực tiếp từ browser và không có API publication.
Owner approval không cho phép engine/AI tự publish generated content; validator
và review chuyên môn vẫn là gate bắt buộc.
