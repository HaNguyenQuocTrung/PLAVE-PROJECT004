import type { ContentGovernanceState } from "./types.ts";
import type {
  ContentAssetRecord,
  UnitSourceTraceabilityManifest,
} from "./source-traceability.ts";

export const GRADE_TWO_NUMBERS_TO_1000_CONTENT_VERSION = "poc-v1";

export const gradeTwoNumbersTo1000DraftGovernance: ContentGovernanceState =
  {
    officialSourceValidation: "VALIDATED",
    technicalValidation: "NOT_RUN",
    expertReview: "OPTIONAL_NOT_OBTAINED",
    ownerDecision: "NOT_REVIEWED",
    publicationStatus: "DRAFT",
  };

const officialMathVersion =
  "Bản 2018; đối chiếu sửa đổi đến Thông tư 17/2025/TT-BGDĐT";
const textbookMetadataVersion =
  "Danh mục phê duyệt theo Quyết định 709/QĐ-BGDĐT; metadata truy cập 2026-07-29";

export const gradeTwoNumbersTo1000SourceManifest: UnitSourceTraceabilityManifest =
  {
    unitSlug: "grade-2-numbers-to-1000",
    contentVersion: GRADE_TWO_NUMBERS_TO_1000_CONTENT_VERSION,
    outcomeIds: ["G2-NUM-01"],
    skillFamilyIds: [
      "NUMBER_RECOGNITION_TO_1000",
      "READ_WRITE_TO_1000",
      "PLACE_VALUE_TO_1000",
      "SEQUENCE_TO_1000",
    ],
    sourceRecords: [
      {
        sourceId: "MOET-MATH-2018-G2",
        sourceType: "OFFICIAL_SUBJECT_CURRICULUM",
        authority: "Bộ Giáo dục và Đào tạo",
        title: "Chương trình giáo dục phổ thông môn Toán",
        documentNumberOrApprovalDecision:
          "Thông tư 32/2018/TT-BGDĐT, phụ lục môn Toán",
        versionOrEdition: officialMathVersion,
        publicationDate: "2018-12-26",
        sourceUrlOrBibliographicReference:
          "https://moet.gov.vn/content/vanban/Lists/VBDT/Attachments/1559/2.%20Ch%C6%B0%C6%A1ng%20tr%C3%ACnh%20m%C3%B4n%20To%C3%A1n.pdf",
        accessedAt: "2026-07-29",
        applicableGrades: [2],
        applicableDomains: ["NUMBER_AND_PLACE_VALUE"],
        applicableOutcomeIds: ["G2-NUM-01"],
        usageTypes: [
          "CURRICULUM_SCOPE",
          "LEARNING_OUTCOME",
          "TERMINOLOGY",
          "TEACHING_SEQUENCE",
        ],
        verificationStatus: "CONTENT_VERIFIED",
        copyrightHandling: "REFERENCE_ONLY",
        notes:
          "Trang PDF 12 xác nhận số đến 1000, cấu tạo thập phân, so sánh, sắp xếp và tia số; PLAVE chỉ diễn giải outcome.",
      },
      {
        sourceId: "VBPL-TT32-2018-LIFECYCLE",
        sourceType: "OFFICIAL_CURRICULUM",
        authority:
          "Cơ sở dữ liệu quốc gia về văn bản pháp luật",
        title:
          "Thông tư ban hành Chương trình giáo dục phổ thông và lược đồ hiệu lực",
        documentNumberOrApprovalDecision: "32/2018/TT-BGDĐT",
        versionOrEdition:
          "Lược đồ hiệu lực và sửa đổi truy cập 2026-07-29",
        publicationDate: "2018-12-26",
        sourceUrlOrBibliographicReference:
          "https://vbpl.vn/TW/Pages/ivbpq-van-ban-goc.aspx?ItemID=146721",
        accessedAt: "2026-07-29",
        applicableGrades: [2],
        applicableDomains: ["NUMBER_AND_PLACE_VALUE"],
        applicableOutcomeIds: ["G2-NUM-01"],
        usageTypes: ["CURRICULUM_SCOPE", "CROSS_CHECK_ONLY"],
        verificationStatus: "CONTENT_VERIFIED",
        copyrightHandling: "REFERENCE_ONLY",
        notes:
          "Dùng để đối chiếu số văn bản, trạng thái hiệu lực một phần và lịch sử sửa đổi; không thay thế phụ lục môn Toán.",
      },
      {
        sourceId: "BGDDT-QD709-G2-TEXTBOOKS",
        sourceType: "APPROVED_TEXTBOOK",
        authority: "Bộ Giáo dục và Đào tạo",
        title: "Danh mục sách giáo khoa Lớp 2 được phê duyệt",
        documentNumberOrApprovalDecision:
          "Quyết định 709/QĐ-BGDĐT ngày 09/02/2021",
        versionOrEdition:
          "Danh mục phê duyệt công bố ngày 11/02/2021",
        publicationDate: "2021-02-11",
        sourceUrlOrBibliographicReference:
          "https://baochinhphu.vn/bo-gddt-phe-duyet-danh-muc-sach-giao-khoa-lop-2-lop-6-102287795.htm",
        accessedAt: "2026-07-29",
        applicableGrades: [2],
        applicableDomains: ["NUMBER_AND_PLACE_VALUE"],
        applicableOutcomeIds: ["G2-NUM-01"],
        usageTypes: ["CROSS_CHECK_ONLY"],
        verificationStatus: "METADATA_VERIFIED",
        copyrightHandling: "REFERENCE_ONLY",
        notes:
          "Xác minh quyết định phê duyệt và việc danh mục có ba sách Toán 2; không dùng làm nguồn outcome hay nội dung câu hỏi.",
      },
      {
        sourceId: "NXBGD-TOAN2-KNTT-2021",
        sourceType: "APPROVED_TEXTBOOK",
        authority: "Nhà xuất bản Giáo dục Việt Nam",
        title:
          "Toán 2 — Bộ sách Kết nối tri thức với cuộc sống",
        documentNumberOrApprovalDecision:
          "Quyết định 709/QĐ-BGDĐT ngày 09/02/2021",
        versionOrEdition: textbookMetadataVersion,
        publicationDate: "2021-03-16",
        sourceUrlOrBibliographicReference:
          "https://nxbgd.vn/bai-viet/gioi-thieu-sach-giao-khoa-lop-2-bo-sach-ket-noi-tri-thuc-voi-cuoc-song",
        accessedAt: "2026-07-29",
        applicableGrades: [2],
        applicableDomains: ["NUMBER_AND_PLACE_VALUE"],
        applicableOutcomeIds: ["G2-NUM-01"],
        usageTypes: ["CROSS_CHECK_ONLY"],
        verificationStatus: "METADATA_VERIFIED",
        copyrightHandling: "REFERENCE_ONLY",
        notes:
          "Đã xác minh tên sách, nhóm tác giả và quyết định phê duyệt; chưa dùng để khẳng định alignment theo trang hay sao chép nội dung.",
      },
      {
        sourceId: "PLAVE-G2-NUM1000-POC-V1",
        sourceType: "PRODUCT_ORIGINAL",
        authority: "PLAVE",
        title:
          "Bộ mẫu nguyên bản Các số trong phạm vi 1000",
        documentNumberOrApprovalDecision:
          "Content Review Manifest POC",
        versionOrEdition: GRADE_TWO_NUMBERS_TO_1000_CONTENT_VERSION,
        publicationDate: "2026-07-29",
        sourceUrlOrBibliographicReference:
          "repository:lib/content-engine/grade2-numbers-to-1000.ts",
        accessedAt: "2026-07-29",
        applicableGrades: [2],
        applicableDomains: ["NUMBER_AND_PLACE_VALUE"],
        applicableOutcomeIds: ["G2-NUM-01"],
        usageTypes: [
          "REPRESENTATION_METHOD",
          "MISCONCEPTION_REFERENCE",
          "ASSESSMENT_REFERENCE",
        ],
        verificationStatus: "CONTENT_VERIFIED",
        copyrightHandling: "ORIGINAL_TRANSFORMATION",
        notes:
          "Prompt, distractor, lời giải và visual do PLAVE tạo; không sao chép câu hỏi hay hình minh họa của nhà xuất bản.",
      },
    ],
    skillMappings: [
      {
        skillFamilyId: "NUMBER_RECOGNITION_TO_1000",
        officialOutcome:
          "Đếm và nhận biết cấu tạo thập phân của số trong phạm vi 1000.",
        officialSourceIds: ["MOET-MATH-2018-G2"],
        approvedTextbookSourceIds: ["NXBGD-TOAN2-KNTT-2021"],
        plaveTransformation:
          "PLAVE tạo bảng giá trị hàng và câu ghép số nguyên bản từ dữ liệu seed.",
        technicalValidatorIds: [
          "VALIDATE_RANGE",
          "VALIDATE_PLACE_VALUE_VISUAL",
          "VALIDATE_DISTRACTOR_MAPPING",
        ],
        unresolvedProductHypotheses: [
          "Ngưỡng tải đọc của prompt",
          "Mức độ khó của distractor",
        ],
        expectedSourceVersions: {
          "MOET-MATH-2018-G2": officialMathVersion,
          "NXBGD-TOAN2-KNTT-2021": textbookMetadataVersion,
        },
      },
      {
        skillFamilyId: "READ_WRITE_TO_1000",
        officialOutcome:
          "Đọc và viết số trong phạm vi 1000 theo cấu tạo thập phân.",
        officialSourceIds: ["MOET-MATH-2018-G2"],
        approvedTextbookSourceIds: ["NXBGD-TOAN2-KNTT-2021"],
        plaveTransformation:
          "PLAVE sinh thẻ số và cách đọc theo house style “linh”, không sao chép wording sách.",
        technicalValidatorIds: [
          "VALIDATE_NUMBER_WORDS",
          "VALIDATE_LINH_HOUSE_STYLE",
          "VALIDATE_UNIQUE_OPTIONS",
        ],
        unresolvedProductHypotheses: [
          "Tải đọc tối đa phù hợp từng học sinh",
        ],
        expectedSourceVersions: {
          "MOET-MATH-2018-G2": officialMathVersion,
          "NXBGD-TOAN2-KNTT-2021": textbookMetadataVersion,
        },
      },
      {
        skillFamilyId: "PLACE_VALUE_TO_1000",
        officialOutcome:
          "Nhận biết giá trị hàng trăm, chục và đơn vị trong số đến 1000.",
        officialSourceIds: ["MOET-MATH-2018-G2"],
        approvedTextbookSourceIds: ["NXBGD-TOAN2-KNTT-2021"],
        plaveTransformation:
          "PLAVE tạo bảng hàng code-native và câu xác định chữ số theo hàng.",
        technicalValidatorIds: [
          "VALIDATE_PLACE_VALUE",
          "VALIDATE_VISUAL_ACCESSIBILITY",
          "VALIDATE_SOLUTION_CONSISTENCY",
        ],
        unresolvedProductHypotheses: [
          "Trình tự mức độ khó giữa nhận biết và áp dụng",
        ],
        expectedSourceVersions: {
          "MOET-MATH-2018-G2": officialMathVersion,
          "NXBGD-TOAN2-KNTT-2021": textbookMetadataVersion,
        },
      },
      {
        skillFamilyId: "SEQUENCE_TO_1000",
        officialOutcome:
          "Nhận biết thứ tự số và vị trí số trên tia số trong phạm vi 1000.",
        officialSourceIds: ["MOET-MATH-2018-G2"],
        approvedTextbookSourceIds: ["NXBGD-TOAN2-KNTT-2021"],
        plaveTransformation:
          "PLAVE tạo tia số code-native và câu liền trước, liền sau từ seed xác định.",
        technicalValidatorIds: [
          "VALIDATE_NUMBER_LINE",
          "VALIDATE_BOUNDARIES",
          "VALIDATE_ANSWER_SOURCE",
        ],
        unresolvedProductHypotheses: [
          "Khoảng mốc tối ưu trên visual tia số",
        ],
        expectedSourceVersions: {
          "MOET-MATH-2018-G2": officialMathVersion,
          "NXBGD-TOAN2-KNTT-2021": textbookMetadataVersion,
        },
      },
    ],
    officialSourceValidation: "VALIDATED",
    vietnameseNumberHouseStyle: {
      zeroTensConnector: "LINH",
      generatedForm: "linh",
      decisionLabel: "PRODUCT_DECISION",
      variationNote:
        "PLAVE dùng nhất quán “linh”; không tuyên bố “lẻ” là sai khi nguồn hoặc vùng miền chấp nhận biến thể.",
    },
    readingLoadPolicy: {
      maxPromptCharacters: 160,
      maxPromptClauses: 2,
      maxReasoningSteps: 2,
      maxNewTermsPerQuestion: 2,
      maxOptionCharacters: 48,
      decisionLabel: "PRODUCT_HYPOTHESIS",
    },
    nonEndorsementNotice:
      "Source validation không đồng nghĩa PLAVE được Bộ GDĐT chứng nhận hoặc phê duyệt.",
  };

export const gradeTwoNumbersTo1000Assets: readonly ContentAssetRecord[] =
  [
    {
      assetId: "PLAVE-NUMBER-CARD-V1",
      origin: "CODE_NATIVE",
      reference:
        "repository:lib/content-engine/grade2-numbers-to-1000.ts",
      copyrightHandling: "ORIGINAL_TRANSFORMATION",
    },
    {
      assetId: "PLAVE-PLACE-VALUE-CHART-V1",
      origin: "CODE_NATIVE",
      reference:
        "repository:lib/content-engine/grade2-numbers-to-1000.ts",
      copyrightHandling: "ORIGINAL_TRANSFORMATION",
    },
    {
      assetId: "PLAVE-NUMBER-LINE-V1",
      origin: "CODE_NATIVE",
      reference:
        "repository:lib/content-engine/grade2-numbers-to-1000.ts",
      copyrightHandling: "ORIGINAL_TRANSFORMATION",
    },
  ];
