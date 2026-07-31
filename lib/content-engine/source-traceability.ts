import type {
  ContentGovernanceState,
  Grade,
  MathDomain,
  ValidationResult,
} from "./types.ts";

export const sourceTypes = [
  "OFFICIAL_CURRICULUM",
  "OFFICIAL_SUBJECT_CURRICULUM",
  "APPROVED_TEXTBOOK",
  "OFFICIAL_TEACHER_GUIDANCE",
  "OFFICIAL_ASSESSMENT_GUIDANCE",
  "PRODUCT_ORIGINAL",
] as const;
export type SourceType = (typeof sourceTypes)[number];

export const sourceUsageTypes = [
  "CURRICULUM_SCOPE",
  "LEARNING_OUTCOME",
  "TERMINOLOGY",
  "TEACHING_SEQUENCE",
  "REPRESENTATION_METHOD",
  "MISCONCEPTION_REFERENCE",
  "ASSESSMENT_REFERENCE",
  "CROSS_CHECK_ONLY",
] as const;
export type SourceUsageType = (typeof sourceUsageTypes)[number];

export const copyrightHandlingValues = [
  "REFERENCE_ONLY",
  "ORIGINAL_TRANSFORMATION",
  "SHORT_ATTRIBUTED_QUOTATION",
  "LICENSED_ASSET",
] as const;
export type CopyrightHandling =
  (typeof copyrightHandlingValues)[number];

export type SourceVerificationStatus =
  | "SOURCE_REFERENCE_PENDING"
  | "METADATA_VERIFIED"
  | "CONTENT_VERIFIED"
  | "REJECTED";

export type SourceTraceabilityRecord = Readonly<{
  sourceId: string;
  sourceType: SourceType;
  authority: string;
  title: string;
  documentNumberOrApprovalDecision: string;
  versionOrEdition: string;
  publicationDate: string;
  sourceUrlOrBibliographicReference: string;
  accessedAt: string;
  applicableGrades: readonly Grade[];
  applicableDomains: readonly MathDomain[];
  applicableOutcomeIds: readonly string[];
  usageTypes: readonly SourceUsageType[];
  verificationStatus: SourceVerificationStatus;
  copyrightHandling: CopyrightHandling;
  notes: string;
}>;

export type SkillSourceMapping = Readonly<{
  skillFamilyId: string;
  officialOutcome: string;
  officialSourceIds: readonly string[];
  approvedTextbookSourceIds: readonly string[];
  plaveTransformation: string;
  technicalValidatorIds: readonly string[];
  unresolvedProductHypotheses: readonly string[];
  expectedSourceVersions: Readonly<Record<string, string>>;
}>;

export type VietnameseNumberHouseStyle = Readonly<{
  zeroTensConnector: "LINH";
  generatedForm: "linh";
  decisionLabel: "PRODUCT_DECISION";
  variationNote: string;
}>;

export type ReadingLoadPolicy = Readonly<{
  maxPromptCharacters: number;
  maxPromptClauses: number;
  maxReasoningSteps: number;
  maxNewTermsPerQuestion: number;
  maxOptionCharacters: number;
  decisionLabel: "PRODUCT_HYPOTHESIS";
}>;

export type UnitSourceTraceabilityManifest = Readonly<{
  unitSlug: string;
  contentVersion: string;
  outcomeIds: readonly string[];
  skillFamilyIds: readonly string[];
  sourceRecords: readonly SourceTraceabilityRecord[];
  skillMappings: readonly SkillSourceMapping[];
  officialSourceValidation:
    | "NOT_STARTED"
    | "IN_PROGRESS"
    | "VALIDATED"
    | "NEEDS_CORRECTION";
  vietnameseNumberHouseStyle: VietnameseNumberHouseStyle;
  readingLoadPolicy: ReadingLoadPolicy;
  nonEndorsementNotice: string;
}>;

export type ContentAssetRecord = Readonly<{
  assetId: string;
  origin: "CODE_NATIVE" | "OWNER_SUPPLIED" | "THIRD_PARTY";
  reference: string;
  copyrightHandling: CopyrightHandling;
}>;

const validHttpsHosts = new Set([
  "vbpl.vn",
  "moet.gov.vn",
  "www.moet.gov.vn",
  "baochinhphu.vn",
  "chinhphu.vn",
  "nxbgd.vn",
  "www.nxbgd.vn",
  "taphuan.nxbgd.vn",
]);

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function hasUniqueValues<T extends string | number>(
  values: readonly T[],
) {
  return new Set(values).size === values.length;
}

function validateReference(record: SourceTraceabilityRecord) {
  const reference = record.sourceUrlOrBibliographicReference.trim();
  if (record.sourceType === "PRODUCT_ORIGINAL") {
    return /^repository:[A-Za-z0-9_./-]+$/.test(reference);
  }
  try {
    const url = new URL(reference);
    return (
      url.protocol === "https:" &&
      validHttpsHosts.has(url.hostname.toLowerCase()) &&
      !/(?:example|localhost|\.invalid)/i.test(url.hostname)
    );
  } catch {
    return false;
  }
}

export function validateSourceTraceabilityRecord(
  record: SourceTraceabilityRecord,
): ValidationResult {
  const errors: string[] = [];
  if (!/^[A-Z0-9][A-Z0-9._-]{2,95}$/.test(record.sourceId)) {
    errors.push("sourceId phải ổn định, không rỗng và dùng ký tự an toàn.");
  }
  for (const [field, value] of [
    ["authority", record.authority],
    ["title", record.title],
    [
      "documentNumberOrApprovalDecision",
      record.documentNumberOrApprovalDecision,
    ],
    ["versionOrEdition", record.versionOrEdition],
    ["notes", record.notes],
  ] as const) {
    if (value.trim().length < 3) {
      errors.push(`${record.sourceId || "source"}: ${field} không hợp lệ.`);
    }
  }
  if (
    !isIsoDate(record.publicationDate) ||
    !isIsoDate(record.accessedAt)
  ) {
    errors.push(`${record.sourceId || "source"}: ngày không hợp lệ.`);
  }
  if (!validateReference(record)) {
    errors.push(
      `${record.sourceId || "source"}: URL/reference chưa xác minh hoặc không an toàn.`,
    );
  }
  if (
    record.applicableGrades.length === 0 ||
    !hasUniqueValues(record.applicableGrades) ||
    record.applicableDomains.length === 0 ||
    !hasUniqueValues(record.applicableDomains) ||
    record.applicableOutcomeIds.length === 0 ||
    !hasUniqueValues(record.applicableOutcomeIds) ||
    record.usageTypes.length === 0 ||
    !hasUniqueValues(record.usageTypes)
  ) {
    errors.push(
      `${record.sourceId || "source"}: mapping grade/domain/outcome/usage phải đầy đủ và không trùng.`,
    );
  }
  if (
    record.sourceType === "PRODUCT_ORIGINAL" &&
    record.copyrightHandling !== "ORIGINAL_TRANSFORMATION"
  ) {
    errors.push(
      `${record.sourceId}: nội dung PLAVE phải dùng ORIGINAL_TRANSFORMATION.`,
    );
  }
  if (
    record.sourceType !== "PRODUCT_ORIGINAL" &&
    record.copyrightHandling === "ORIGINAL_TRANSFORMATION"
  ) {
    errors.push(
      `${record.sourceId}: nguồn ngoài PLAVE không thể nhận nhãn ORIGINAL_TRANSFORMATION.`,
    );
  }
  if (
    record.verificationStatus === "CONTENT_VERIFIED" &&
    record.sourceType !== "PRODUCT_ORIGINAL"
  ) {
    try {
      const host = new URL(
        record.sourceUrlOrBibliographicReference,
      ).hostname.toLowerCase();
      if (!validHttpsHosts.has(host)) {
        errors.push(
          `${record.sourceId}: CONTENT_VERIFIED phải dùng host chính thức cho phép.`,
        );
      }
    } catch {
      errors.push(`${record.sourceId}: CONTENT_VERIFIED cần URL HTTPS.`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateUnitSourceTraceabilityManifest(
  manifest: UnitSourceTraceabilityManifest,
): ValidationResult {
  const errors: string[] = [];
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.unitSlug) ||
    !/^[a-z0-9][a-z0-9._-]{1,31}$/.test(manifest.contentVersion)
  ) {
    errors.push("Unit slug hoặc content version không hợp lệ.");
  }
  if (
    manifest.outcomeIds.length === 0 ||
    !hasUniqueValues(manifest.outcomeIds) ||
    manifest.skillFamilyIds.length === 0 ||
    !hasUniqueValues(manifest.skillFamilyIds)
  ) {
    errors.push("Manifest phải có outcome và skill family duy nhất.");
  }
  const recordById = new Map<string, SourceTraceabilityRecord>();
  for (const record of manifest.sourceRecords) {
    const validation = validateSourceTraceabilityRecord(record);
    errors.push(...validation.errors);
    if (recordById.has(record.sourceId)) {
      errors.push(`Source ID ${record.sourceId} bị trùng.`);
    }
    recordById.set(record.sourceId, record);
  }
  const mappings = new Map(
    manifest.skillMappings.map((mapping) => [
      mapping.skillFamilyId,
      mapping,
    ]),
  );
  for (const skillFamilyId of manifest.skillFamilyIds) {
    const mapping = mappings.get(skillFamilyId);
    if (!mapping) {
      errors.push(`${skillFamilyId}: thiếu source mapping.`);
      continue;
    }
    if (
      mapping.officialOutcome.trim().length < 12 ||
      mapping.officialSourceIds.length === 0 ||
      mapping.approvedTextbookSourceIds.length === 0 ||
      mapping.plaveTransformation.trim().length < 12 ||
      mapping.technicalValidatorIds.length === 0
    ) {
      errors.push(`${skillFamilyId}: source mapping chưa đầy đủ.`);
    }
    for (const sourceId of [
      ...mapping.officialSourceIds,
      ...mapping.approvedTextbookSourceIds,
    ]) {
      const source = recordById.get(sourceId);
      if (!source) {
        errors.push(`${skillFamilyId}: không tìm thấy source ${sourceId}.`);
        continue;
      }
      const expectedVersion = mapping.expectedSourceVersions[sourceId];
      if (
        !expectedVersion ||
        expectedVersion !== source.versionOrEdition
      ) {
        errors.push(`${skillFamilyId}: version mismatch cho ${sourceId}.`);
      }
    }
    for (const sourceId of mapping.officialSourceIds) {
      const source = recordById.get(sourceId);
      if (
        source &&
        !(
          source.sourceType === "OFFICIAL_CURRICULUM" ||
          source.sourceType === "OFFICIAL_SUBJECT_CURRICULUM"
        )
      ) {
        errors.push(`${skillFamilyId}: ${sourceId} không phải nguồn chương trình.`);
      }
      if (
        source &&
        source.verificationStatus !== "CONTENT_VERIFIED"
      ) {
        errors.push(`${skillFamilyId}: ${sourceId} chưa CONTENT_VERIFIED.`);
      }
    }
    for (const sourceId of mapping.approvedTextbookSourceIds) {
      const source = recordById.get(sourceId);
      if (
        source &&
        (source.sourceType !== "APPROVED_TEXTBOOK" ||
          !source.usageTypes.includes("CROSS_CHECK_ONLY") ||
          !["METADATA_VERIFIED", "CONTENT_VERIFIED"].includes(
            source.verificationStatus,
          ))
      ) {
        errors.push(
          `${skillFamilyId}: ${sourceId} không phải textbook cross-check đã xác minh.`,
        );
      }
    }
  }
  if (
    mappings.size !== manifest.skillFamilyIds.length ||
    [...mappings.keys()].some(
      (skillFamilyId) =>
        !manifest.skillFamilyIds.includes(skillFamilyId),
    )
  ) {
    errors.push("Skill mapping phải khớp đúng danh sách skill của unit.");
  }
  if (
    manifest.vietnameseNumberHouseStyle.zeroTensConnector !== "LINH" ||
    manifest.vietnameseNumberHouseStyle.generatedForm !== "linh" ||
    manifest.vietnameseNumberHouseStyle.decisionLabel !==
      "PRODUCT_DECISION" ||
    manifest.vietnameseNumberHouseStyle.variationNote.trim().length <
      20
  ) {
    errors.push("House style tiếng Việt chưa hợp lệ.");
  }
  const load = manifest.readingLoadPolicy;
  if (
    load.decisionLabel !== "PRODUCT_HYPOTHESIS" ||
    load.maxPromptCharacters < 40 ||
    load.maxPromptClauses < 1 ||
    load.maxReasoningSteps < 2 ||
    load.maxNewTermsPerQuestion < 1 ||
    load.maxOptionCharacters < 8
  ) {
    errors.push("Reading-load policy chưa hợp lệ.");
  }
  if (
    !/không (?:được|phải|đồng nghĩa).*(?:chứng nhận|phê duyệt)/i.test(
      manifest.nonEndorsementNotice,
    )
  ) {
    errors.push("Manifest thiếu tuyên bố không chứng nhận.");
  }
  if (
    manifest.officialSourceValidation === "VALIDATED" &&
    manifest.sourceRecords.some(
      (record) =>
        record.sourceType !== "PRODUCT_ORIGINAL" &&
        record.verificationStatus === "SOURCE_REFERENCE_PENDING",
    )
  ) {
    errors.push(
      "Không được gắn VALIDATED khi official source còn SOURCE_REFERENCE_PENDING.",
    );
  }
  if (
    manifest.officialSourceValidation === "VALIDATED" &&
    errors.length > 0
  ) {
    errors.push(
      "Không được gắn VALIDATED khi source traceability còn lỗi.",
    );
  }
  return { valid: errors.length === 0, errors };
}

export type PilotEligibilityDecision = Readonly<{
  eligible: boolean;
  targetStatus: "PILOT_ELIGIBLE" | null;
  reasons: readonly string[];
}>;

export function evaluateControlledPilotEligibility(
  governance: ContentGovernanceState,
): PilotEligibilityDecision {
  const reasons: string[] = [];
  if (governance.officialSourceValidation !== "VALIDATED") {
    reasons.push("Official-source validation chưa đạt.");
  }
  if (governance.technicalValidation !== "PASSED") {
    reasons.push("Technical validation chưa đạt.");
  }
  if (
    governance.ownerDecision !== "APPROVED_FOR_CONTROLLED_PILOT"
  ) {
    reasons.push("Owner chưa phê duyệt controlled pilot.");
  }
  if (governance.publicationStatus !== "DRAFT") {
    reasons.push("Chỉ content DRAFT mới được đánh giá pilot eligibility.");
  }
  const eligible = reasons.length === 0;
  return {
    eligible,
    targetStatus: eligible ? "PILOT_ELIGIBLE" : null,
    reasons,
  };
}

export function validateContentAssets(
  assets: readonly ContentAssetRecord[],
): ValidationResult {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const asset of assets) {
    if (!/^[A-Z0-9][A-Z0-9._-]{2,95}$/.test(asset.assetId)) {
      errors.push("Asset ID không hợp lệ.");
    }
    if (seen.has(asset.assetId)) errors.push(`${asset.assetId}: bị trùng.`);
    seen.add(asset.assetId);
    if (
      /^(?:https?:|data:)/i.test(asset.reference) ||
      /\.(?:pdf|epub|docx?)$/i.test(asset.reference)
    ) {
      errors.push(`${asset.assetId}: runtime asset/reference bị cấm.`);
    }
    if (
      asset.origin === "CODE_NATIVE" &&
      (!/^repository:[A-Za-z0-9_./-]+$/.test(asset.reference) ||
        asset.copyrightHandling !== "ORIGINAL_TRANSFORMATION")
    ) {
      errors.push(`${asset.assetId}: code-native asset không hợp lệ.`);
    }
    if (
      asset.origin === "THIRD_PARTY" &&
      asset.copyrightHandling !== "LICENSED_ASSET"
    ) {
      errors.push(`${asset.assetId}: third-party asset cần LICENSED_ASSET.`);
    }
  }
  return { valid: errors.length === 0, errors };
}
