# Content Expansion Track

- Trạng thái: documentation baseline
- Phạm vi: ghi lại các content sprint đã triển khai và quyết định kế tiếp
- Không thay thế roadmap sản phẩm lịch sử trong
  [SPRINT_PLAN.md](../SPRINT_PLAN.md)

## 1. Quy ước tên

`docs/SPRINT_PLAN.md` dùng tên **Sprint 5 — Parent linking** trong roadmap sản
phẩm ban đầu. Tên đó được giữ nguyên như lịch sử.

Các Sprint **5A–5O** dưới đây thuộc **Content Expansion Track**, là luồng công
việc khác. Roadmap mới phải luôn ghi đầy đủ tiền tố “Content Expansion” để tránh
nhầm với Sprint 5 lịch sử.

## 2. Lịch sử Content Expansion 5A–5O

| Content sprint | Migration | Unit | Prerequisite trong repository | Trạng thái được ghi nhận |
|---|---|---|---|---|
| 5A | `0018` | Phép cộng trong phạm vi 10 | `grade-1-numbers-to-10` | User-confirmed live smoke pass |
| 5B | `0019` | Phép trừ trong phạm vi 10 | `grade-1-addition-within-10` | User-confirmed live smoke pass |
| 5C | `0020` | Các số trong phạm vi 20 | `grade-1-subtraction-within-10` | User-confirmed live smoke pass |
| 5D | `0021` | Phép cộng trong phạm vi 20 không nhớ | `grade-1-numbers-to-20` | User-confirmed live smoke pass |
| Technical support | `0022` | Không tạo unit; mở rộng NUMBER_INPUT dùng chung | Không áp dụng | Đã được dùng bởi các unit sau |
| 5E | `0023` | Phép trừ trong phạm vi 20 không mượn | `grade-1-addition-within-20-no-carry` | User-confirmed live smoke pass |
| 5F | `0024` | Các số trong phạm vi 100 | `grade-1-subtraction-within-20-no-borrow` | User-confirmed live smoke pass |
| 5G | `0025` | Phép cộng trong phạm vi 100 không nhớ | `grade-1-numbers-to-100` | User-confirmed live smoke pass |
| 5H | `0026` | Phép trừ trong phạm vi 100 không mượn | `grade-1-addition-within-100-no-carry` | User-confirmed live smoke pass |
| 5I | `0027` | Hình học và vị trí cơ bản | `grade-1-subtraction-within-100-no-borrow` | User-confirmed live smoke pass |
| 5J | `0028` | Đo độ dài và so sánh độ dài | `grade-1-basic-geometry-and-position` | User-confirmed live smoke pass |
| 5K | `0029` | Thời gian, đồng hồ và lịch | `grade-1-length-measurement` | User-confirmed live smoke pass |
| 5L | `0030` | Khối lập phương và khối hộp chữ nhật | `grade-1-basic-geometry-and-position` | User-confirmed live smoke pass |

`PRODUCT_DECISION` — chữ cái sprint, tên unit, bốn skill và chuỗi prerequisite
là cách PLAVE tổ chức content; không phải cấu trúc do Bộ GDĐT ban hành.

Các sprint ổn định/tổng hợp tiếp theo không tạo learning unit:

| Content sprint | Migration | Phạm vi | Trạng thái được ghi nhận |
|---|---|---|---|
| 5M | `0031`, hotfix `0032` | Diagnostic và recommendation Lớp 1 | User-confirmed live retest pass |
| 5N | Không có | Lộ trình học cá nhân Lớp 1 | User-confirmed live smoke pass |
| 5O | `0033` | Grade 1 Completion Gate | User-confirmed live smoke pass |

Live smoke kỹ thuật không tự động tạo source validation, expert review hoặc
publication.

## 3. Grade 2 planning

Sprint 6A là audit documentation-only. Không có migration Grade 2 được giữ chỗ.

- Nguồn: [GRADE2_OFFICIAL_SOURCES.md](./GRADE2_OFFICIAL_SOURCES.md)
- Outcome: [GRADE2_OUTCOME_MATRIX.md](./GRADE2_OUTCOME_MATRIX.md)
- Unit blueprint: [GRADE2_UNIT_BLUEPRINT.md](./GRADE2_UNIT_BLUEPRINT.md)
- Dependency/release:
  [GRADE2_DEPENDENCY_AND_RELEASE_PLAN.md](./GRADE2_DEPENDENCY_AND_RELEASE_PLAN.md)
- Grade transition:
  [GRADE_TRANSITION_POLICY.md](./GRADE_TRANSITION_POLICY.md)
- Content gates:
  [GRADE2_CONTENT_QUALITY_GATES.md](./GRADE2_CONTENT_QUALITY_GATES.md)

Vertical slice được audit khuyến nghị là **Các số trong phạm vi 1000**. Trạng
thái: Owner đã chọn làm slice Lớp 2 đầu tiên sau nền tảng; source mapping đã
`VALIDATED`, technical review package đã pass, expert
`OPTIONAL_NOT_OBTAINED`, content vẫn `DRAFT` và chưa được seed/publish.

Các sprint nền tảng đa khối:

| Sprint | Migration | Phạm vi | Trạng thái |
|---|---|---|---|
| 6B | `0034` | Runtime multi-grade, tổng câu động và Grade 2 empty state | User-confirmed live smoke pass |
| 6C | Không có | Typed vertical skill engine và POC draft “Các số trong phạm vi 1000” | Technical POC; chưa publication |
| 6D | Không có | Review package 5 seed, adaptive practice contract và grade-transition readiness | Owner đã duyệt product direction; teacher-hard-blocker đã được policy 6E-A supersede; chưa publication |
| 6E-A | Không có | Official-source validation policy và typed source traceability | Policy correction hoàn tất; không publication |
| 6E-B | Draft `0035`, chưa apply | Frozen release candidate và publication preflight cho `grade-2-numbers-to-1000` | Frozen candidate đã được Owner duyệt cho runtime integration; DRAFT/HIDDEN, chưa publication |
| 6F | Draft `0036`, chưa apply | Typed adaptive runtime adapter, lifecycle, remediation, retention preparation và persistence design | Tất cả feature flag tắt; `0035`/`0036` chưa apply; chưa controlled pilot |
| 6G-A | Sửa draft `0036`, chưa apply | Atomic RPC contract, revision/idempotency, ADR và threat model | Chỉ sẵn sàng cho isolated-database test; chưa chứng minh PostgreSQL runtime, chưa publication |

- Audit tái sử dụng:
  [GRADE1_VERTICAL_SKILL_REUSE_AUDIT.md](./GRADE1_VERTICAL_SKILL_REUSE_AUDIT.md)
- Engine:
  [VERTICAL_MATH_SKILL_ENGINE.md](./VERTICAL_MATH_SKILL_ENGINE.md)
- Batch blueprint:
  [GRADE2_BATCH_CONTENT_BLUEPRINT.md](./GRADE2_BATCH_CONTENT_BLUEPRINT.md)
- POC content review:
  [GRADE2_NUMBERS_TO_1000_CONTENT_REVIEW.md](./GRADE2_NUMBERS_TO_1000_CONTENT_REVIEW.md)
- Adaptive policy:
  [ADAPTIVE_PRACTICE_POLICY.md](./ADAPTIVE_PRACTICE_POLICY.md)

## 4. Quyết định về “Tiền Việt Nam”

`OFFICIAL_SOURCE_CONFIRMED` — phần Môn Toán Lớp 2, mục Đo lường, trang 11
của [Phụ lục 1 hướng dẫn chính thức của Bộ GDĐT](https://moet.gov.vn/content/vanban/Lists/VBDH/Attachments/3010/Ph%E1%BB%A5%20l%E1%BB%A5c%201.pdf)
đặt yêu cầu nhận biết tiền Việt Nam qua hình ảnh một số tờ tiền.

Phần Lớp 1 ở trang 5–7 không có outcome này. Do đó:

- “Tiền Việt Nam” là `OUT_OF_GRADE_SCOPE` đối với Content Expansion Grade 1.
- Nội dung được chuyển sang future Grade 2 content roadmap.
- Chương trình không cung cấp trong đoạn outcome này một danh sách mệnh giá
  bắt buộc cho product; danh sách denomination là `PRODUCT_DECISION_REQUIRED`.
- Không dùng thiết kế bài trong sách thương mại làm chuẩn.

## 5. Governance cho content mới

Mỗi unit mới phải tách bốn lớp quyết định:

1. `OFFICIAL_SOURCE_CONFIRMED`: outcome và grade từ nguồn chính thức.
2. `TECHNICAL_DECOMPOSITION`: outcome ID, contract, validator và test.
3. `PRODUCT_DECISION`: unit split, slug, prerequisite, loại câu hỏi và UX.
4. `OFFICIAL_SOURCE_PEDAGOGICAL_VALIDATION`: source mapping, technical
   validation, optional expert evidence và Owner decision là các trạng thái
   độc lập.

Live smoke kỹ thuật không tự động tạo `EXPERT_REVIEWED`, official endorsement
hoặc publication. Xem
[policy hiện hành](./OFFICIAL_SOURCE_PEDAGOGICAL_VALIDATION_POLICY.md).
