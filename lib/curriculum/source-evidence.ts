import type {
  CurriculumDomain,
  CurriculumGrade,
} from "./types.ts";

export type SourceFormatStatus = "VALID_PDF" | "INVALID_NOT_PDF";

export type AmendmentApplicability =
  | Readonly<{
      status: "BASE_CURRICULUM_DOCUMENT";
      evidence: null;
    }>
  | Readonly<{
      status: "NOT_APPLICABLE_TO_MATHEMATICS";
      evidence: Readonly<{
        page: number;
        heading: string;
        conciseBasis: string;
      }>;
    }>;

export type SourceProvenanceDocument = Readonly<{
  id: string;
  documentTitle: string;
  issuingAuthority: "Bộ Giáo dục và Đào tạo";
  documentYear: number;
  localPath: string;
  sourceUrl: string;
  sha256: string;
  fileSizeBytes: number;
  mediaType: "application/pdf" | "text/html";
  formatStatus: SourceFormatStatus;
  pdfHeader: string | null;
  pageCount: number | null;
  attachmentEvidence: Readonly<{
    page: number;
    conciseBasis: string;
  }> | null;
  extractionMethod: string;
  extractionTimestamp: string;
  amendmentApplicability: AmendmentApplicability;
}>;

export type SourceProvenanceIncident = Readonly<{
  id: string;
  occurredAt: string;
  localPath: string;
  sha256: string;
  fileSizeBytes: number;
  mediaType: "text/html" | "application/pdf" | "unknown";
  disposition: "REJECTED_NOT_CURRENT_SOURCE";
  conciseBasis: string;
}>;

export type SourceProvenanceManifest = Readonly<{
  schemaVersion: 1;
  status: "READY" | "SOURCE_BLOCKED";
  documents: readonly SourceProvenanceDocument[];
  incidentHistory: readonly SourceProvenanceIncident[];
}>;

export type OutcomePageRange = Readonly<{
  start: number;
  end: number;
}>;

export type MathematicsOutcomeEvidence = Readonly<{
  id: string;
  grade: CurriculumGrade;
  domain: CurriculumDomain;
  subdomain: string;
  conciseParaphrase: string;
  sourceDocumentId: string;
  pages: OutcomePageRange;
  sectionHeading: string;
  sourceValidationStatus: "SOURCE_VALIDATED";
}>;

export type GapEvidenceStatus =
  | "NEEDS_SOURCE_VALIDATION"
  | "SOURCE_VALIDATED"
  | "BLUEPRINT_ONLY"
  | "TEACHABLE_IMPLEMENTED"
  | "NOT_APPLICABLE_BY_OFFICIAL_CURRICULUM";

export type NotApplicableByOfficialCurriculumEvidence = Readonly<{
  sourceDocumentId: string;
  sourceSha256: string;
  pages: OutcomePageRange;
  conciseReason: string;
  validatorEvidence: string;
}>;

export type GapEvidence = Readonly<{
  id: string;
  grade: CurriculumGrade;
  domain: CurriculumDomain;
  outcomeIds: readonly string[];
  status: GapEvidenceStatus;
  notApplicableEvidence?: NotApplicableByOfficialCurriculumEvidence;
}>;

export type MathematicsOutcomeIndex = Readonly<{
  schemaVersion: 1 | 2;
  status: "LOCKED" | "SOURCE_BLOCKED";
  primarySourceDocumentId: string;
  amendmentSourceDocumentId: string;
  lockedOutcomeCount: number;
  domainTaxonomy?: Readonly<{
    originallyRequestedCells: number;
    officiallyApplicableCells: number;
    notApplicableCells: number;
    implementedApplicableCells: number;
    remainingApplicableDomainGaps: number;
    applicableDomainCoverageComplete: boolean;
    baselineImplementedCellIds: readonly string[];
  }>;
  outcomes: readonly MathematicsOutcomeEvidence[];
  gaps: readonly GapEvidence[];
}>;

export type SourceEvidenceValidationResult = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;

type ActualSourceFile = Readonly<{
  localPath: string;
  sha256: string;
  fileSizeBytes: number;
  mediaType: "application/pdf" | "text/html" | "unknown";
  pdfHeader: string | null;
  pageCount: number | null;
}>;

function duplicateValues(values: readonly string[]) {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

function gapIdsFromCoverage(
  remainingGaps: Readonly<Record<string, readonly number[]>>,
) {
  const domainByCoverageKey: Readonly<Record<string, CurriculumDomain>> = {
    geometry: "GEOMETRY",
    measurement: "MEASUREMENT",
    statisticsAndProbability: "STATISTICS_AND_PROBABILITY",
    appliedProblemSolving: "APPLIED_PROBLEM_SOLVING",
    numbersAndOperations: "NUMBERS_AND_OPERATIONS",
    algebraAndPrealgebra: "ALGEBRA_AND_PREALGEBRA",
  };
  return Object.entries(remainingGaps).flatMap(([key, grades]) => {
    const domain = domainByCoverageKey[key];
    if (!domain) return [`UNKNOWN_COVERAGE_KEY_${key}`];
    return grades.map((grade) => `G${grade}_${domain}`);
  });
}

const officialNotApplicableCells = new Map<
  string,
  Readonly<{
    grade: CurriculumGrade;
    domain: CurriculumDomain;
    pages: OutcomePageRange;
    reasonIncludes: string;
  }>
>([
  [
    "G1_STATISTICS_AND_PROBABILITY",
    {
      grade: 1,
      domain: "STATISTICS_AND_PROBABILITY",
      pages: { start: 21, end: 24 },
      reasonIncludes: "Grade 2",
    },
  ],
  [
    "G8_NUMBERS_AND_OPERATIONS",
    {
      grade: 8,
      domain: "NUMBERS_AND_OPERATIONS",
      pages: { start: 18, end: 18 },
      reasonIncludes: "Grade 7",
    },
  ],
  [
    "G9_NUMBERS_AND_OPERATIONS",
    {
      grade: 9,
      domain: "NUMBERS_AND_OPERATIONS",
      pages: { start: 18, end: 18 },
      reasonIncludes: "Grade 7",
    },
  ],
]);

export function validateSourceEvidence(
  manifest: SourceProvenanceManifest,
  index: MathematicsOutcomeIndex,
  actualFiles: readonly ActualSourceFile[],
  remainingGaps: Readonly<Record<string, readonly number[]>>,
): SourceEvidenceValidationResult {
  const errors: string[] = [];
  const documentById = new Map(
    manifest.documents.map((document) => [document.id, document]),
  );
  const actualByPath = new Map(
    actualFiles.map((sourceFile) => [sourceFile.localPath, sourceFile]),
  );

  for (const id of duplicateValues(manifest.documents.map((item) => item.id))) {
    errors.push(`Duplicate source document ID: ${id}.`);
  }
  for (const document of manifest.documents) {
    if (
      !document.documentTitle.trim() ||
      !document.sourceUrl.trim() ||
      !document.extractionMethod.trim() ||
      !document.extractionTimestamp.trim()
    ) {
      errors.push(`Source provenance fields are incomplete: ${document.id}.`);
    }
    const actual = actualByPath.get(document.localPath);
    if (!actual) {
      errors.push(`Source file is missing: ${document.localPath}.`);
      continue;
    }
    if (actual.fileSizeBytes <= 0) {
      errors.push(`Source file is empty: ${document.localPath}.`);
    }
    if (actual.sha256 !== document.sha256) {
      errors.push(`Source fingerprint mismatch: ${document.id}.`);
    }
    if (actual.fileSizeBytes !== document.fileSizeBytes) {
      errors.push(`Source size mismatch: ${document.id}.`);
    }
    if (actual.mediaType !== document.mediaType) {
      errors.push(`Source media type mismatch: ${document.id}.`);
    }
    if (document.formatStatus !== "VALID_PDF") {
      errors.push(`Source is not a valid PDF: ${document.id}.`);
    } else {
      if (document.mediaType !== "application/pdf") {
        errors.push(`Valid PDF source has a non-PDF media type: ${document.id}.`);
      }
      if (!document.pdfHeader?.startsWith("%PDF-")) {
        errors.push(`Valid PDF source has an invalid PDF header: ${document.id}.`);
      }
      if (actual.pdfHeader !== document.pdfHeader) {
        errors.push(`Source PDF header mismatch: ${document.id}.`);
      }
      if (
        document.pageCount === null ||
        document.pageCount <= 0 ||
        actual.pageCount !== document.pageCount
      ) {
        errors.push(`Source page count mismatch: ${document.id}.`);
      }
    }
    if (document.attachmentEvidence) {
      if (
        document.pageCount === null ||
        document.attachmentEvidence.page <= 0 ||
        document.attachmentEvidence.page > document.pageCount ||
        !document.attachmentEvidence.conciseBasis.trim()
      ) {
        errors.push(`Attachment evidence is invalid: ${document.id}.`);
      }
    }
    if (
      document.amendmentApplicability.status ===
      "NOT_APPLICABLE_TO_MATHEMATICS"
    ) {
      const evidence = document.amendmentApplicability.evidence;
      if (
        document.pageCount === null ||
        evidence.page <= 0 ||
        evidence.page > document.pageCount ||
        !evidence.heading.trim() ||
        !evidence.conciseBasis.trim()
      ) {
        errors.push(`Amendment applicability evidence is invalid: ${document.id}.`);
      }
    }
  }

  for (const incident of manifest.incidentHistory) {
    if (
      !incident.id.trim() ||
      !incident.occurredAt.trim() ||
      !incident.localPath.trim() ||
      !/^[a-f0-9]{64}$/u.test(incident.sha256) ||
      incident.fileSizeBytes <= 0 ||
      !incident.conciseBasis.trim()
    ) {
      errors.push(`Source incident history is incomplete: ${incident.id}.`);
    }
    if (
      manifest.documents.some(
        (document) =>
          document.localPath === incident.localPath &&
          document.sha256 === incident.sha256,
      )
    ) {
      errors.push(`Rejected incident is still a current source: ${incident.id}.`);
    }
  }

  for (const id of duplicateValues(index.outcomes.map((item) => item.id))) {
    errors.push(`Duplicate outcome ID: ${id}.`);
  }
  const outcomeById = new Map(
    index.outcomes.map((outcome) => [outcome.id, outcome]),
  );
  for (const outcome of index.outcomes) {
    const document = documentById.get(outcome.sourceDocumentId);
    if (!document) {
      errors.push(`Outcome has no source document: ${outcome.id}.`);
      continue;
    }
    if (!outcome.grade || !outcome.domain) {
      errors.push(`Outcome is missing grade or domain: ${outcome.id}.`);
    }
    if (!outcome.subdomain.trim() || !outcome.conciseParaphrase.trim()) {
      errors.push(`Outcome paraphrase or subdomain is empty: ${outcome.id}.`);
    }
    if (!outcome.sectionHeading.trim()) {
      errors.push(`Outcome has a page/heading placeholder: ${outcome.id}.`);
    }
    if (
      !Number.isInteger(outcome.pages.start) ||
      !Number.isInteger(outcome.pages.end) ||
      outcome.pages.start <= 0 ||
      outcome.pages.end < outcome.pages.start
    ) {
      errors.push(`Outcome has an invalid page range: ${outcome.id}.`);
    } else if (
      document.pageCount === null ||
      outcome.pages.end > document.pageCount
    ) {
      errors.push(`Outcome page is outside source page count: ${outcome.id}.`);
    }
    if (
      document.formatStatus !== "VALID_PDF" ||
      outcome.sourceValidationStatus !== "SOURCE_VALIDATED"
    ) {
      errors.push(`Outcome is not locked to a valid PDF: ${outcome.id}.`);
    }
  }

  if (index.lockedOutcomeCount !== index.outcomes.length) {
    errors.push("Outcome index lockedOutcomeCount is inconsistent.");
  }
  for (const gap of index.gaps) {
    if (gap.status === "NEEDS_SOURCE_VALIDATION") {
      errors.push(`Gap has no source-validated outcome: ${gap.id}.`);
    }
    if (gap.status === "SOURCE_VALIDATED" && gap.outcomeIds.length === 0) {
      errors.push(`Source-validated gap has no locked outcome: ${gap.id}.`);
    }
    if (gap.status === "TEACHABLE_IMPLEMENTED" && gap.outcomeIds.length === 0) {
      errors.push(`Teachable gap has no locked outcome: ${gap.id}.`);
    }
    if (gap.status === "BLUEPRINT_ONLY" && gap.outcomeIds.length > 0) {
      errors.push(`BLUEPRINT_ONLY gap must not be called teachable: ${gap.id}.`);
    }
    if (gap.status === "NOT_APPLICABLE_BY_OFFICIAL_CURRICULUM") {
      const expected = officialNotApplicableCells.get(gap.id);
      const evidence = gap.notApplicableEvidence;
      const primaryDocument = documentById.get(index.primarySourceDocumentId);
      if (
        !expected ||
        expected.grade !== gap.grade ||
        expected.domain !== gap.domain
      ) {
        errors.push(`Applicable cell cannot be marked not applicable: ${gap.id}.`);
      }
      if (
        !evidence ||
        !primaryDocument ||
        evidence.sourceDocumentId !== primaryDocument.id ||
        evidence.sourceSha256 !== primaryDocument.sha256 ||
        evidence.pages.start <= 0 ||
        evidence.pages.end < evidence.pages.start ||
        evidence.pages.end > (primaryDocument.pageCount ?? 0) ||
        evidence.pages.start !== expected?.pages.start ||
        evidence.pages.end !== expected?.pages.end ||
        !evidence.conciseReason.includes(expected?.reasonIncludes ?? "") ||
        !evidence.validatorEvidence.trim()
      ) {
        errors.push(`Official N/A evidence is invalid: ${gap.id}.`);
      }
      if (gap.outcomeIds.length > 0) {
        errors.push(`Official N/A cell must not reference outcomes: ${gap.id}.`);
      }
    } else if (gap.notApplicableEvidence) {
      errors.push(`Applicable cell carries N/A evidence: ${gap.id}.`);
    }
    for (const outcomeId of gap.outcomeIds) {
      const outcome = outcomeById.get(outcomeId);
      if (!outcome) {
        errors.push(`Gap references unknown outcome: ${gap.id}/${outcomeId}.`);
      } else if (
        outcome.grade !== gap.grade ||
        outcome.domain !== gap.domain
      ) {
        errors.push(`Gap/outcome boundary mismatch: ${gap.id}/${outcomeId}.`);
      }
    }
  }

  const coverageIds = gapIdsFromCoverage(remainingGaps).sort();
  const indexGapIds = index.gaps.map((gap) => gap.id).sort();
  if (JSON.stringify(coverageIds) !== JSON.stringify(indexGapIds)) {
    errors.push("Source outcome index and coverage JSON gaps are inconsistent.");
  }
  const taxonomy = index.domainTaxonomy;
  const notApplicableIds = index.gaps
    .filter(
      (gap) =>
        gap.status === "NOT_APPLICABLE_BY_OFFICIAL_CURRICULUM",
    )
    .map((gap) => gap.id);
  const implementedExpansionIds = index.gaps
    .filter((gap) => gap.status === "TEACHABLE_IMPLEMENTED")
    .map((gap) => gap.id);
  if (index.schemaVersion === 2) {
    if (
      !taxonomy ||
      taxonomy.originallyRequestedCells !==
        taxonomy.baselineImplementedCellIds.length + index.gaps.length ||
      taxonomy.officiallyApplicableCells !==
        taxonomy.originallyRequestedCells - notApplicableIds.length ||
      taxonomy.notApplicableCells !== notApplicableIds.length ||
      taxonomy.implementedApplicableCells !==
        taxonomy.baselineImplementedCellIds.length +
          implementedExpansionIds.length ||
      taxonomy.remainingApplicableDomainGaps !==
        taxonomy.officiallyApplicableCells -
          taxonomy.implementedApplicableCells ||
      taxonomy.applicableDomainCoverageComplete !==
        (taxonomy.remainingApplicableDomainGaps === 0) ||
      taxonomy.originallyRequestedCells !== 40 ||
      taxonomy.officiallyApplicableCells !== 37 ||
      taxonomy.notApplicableCells !== 3
    ) {
      errors.push("Official domain taxonomy counts are inconsistent.");
    }
    if (
      notApplicableIds.length !== officialNotApplicableCells.size ||
      notApplicableIds.some((id) => !officialNotApplicableCells.has(id))
    ) {
      errors.push("Official N/A cell set is inconsistent.");
    }
  }
  if (index.status !== "LOCKED" || manifest.status !== "READY") {
    errors.push("Outcome lock is blocked by source provenance status.");
  }

  return { valid: errors.length === 0, errors };
}
