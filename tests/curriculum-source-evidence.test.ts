import assert from "node:assert/strict";
import { test } from "node:test";

import {
  validateSourceEvidence,
  type MathematicsOutcomeIndex,
  type SourceProvenanceManifest,
} from "../lib/curriculum/source-evidence.ts";

const readyManifest: SourceProvenanceManifest = {
  schemaVersion: 1,
  status: "READY",
  documents: [
    {
      id: "MATH",
      documentTitle: "Mathematics curriculum",
      issuingAuthority: "Bộ Giáo dục và Đào tạo",
      documentYear: 2018,
      localPath: "math.pdf",
      sourceUrl: "https://example.invalid/math.pdf",
      sha256: "a".repeat(64),
      fileSizeBytes: 100,
      mediaType: "application/pdf",
      formatStatus: "VALID_PDF",
      pdfHeader: "%PDF-1.7",
      pageCount: 20,
      attachmentEvidence: {
        page: 1,
        conciseBasis: "Issued as an attachment to the governing circular.",
      },
      extractionMethod: "PDF text and visual extraction",
      extractionTimestamp: "2026-07-30T15:50:23+07:00",
      amendmentApplicability: {
        status: "BASE_CURRICULUM_DOCUMENT",
        evidence: null,
      },
    },
    {
      id: "AMENDMENT",
      documentTitle: "Amendment",
      issuingAuthority: "Bộ Giáo dục và Đào tạo",
      documentYear: 2025,
      localPath: "amendment.pdf",
      sourceUrl: "https://example.invalid/amendment.pdf",
      sha256: "b".repeat(64),
      fileSizeBytes: 50,
      mediaType: "application/pdf",
      formatStatus: "VALID_PDF",
      pdfHeader: "%PDF-1.7",
      pageCount: 2,
      attachmentEvidence: null,
      extractionMethod: "PDF text and visual extraction",
      extractionTimestamp: "2026-07-30T15:50:23+07:00",
      amendmentApplicability: {
        status: "NOT_APPLICABLE_TO_MATHEMATICS",
        evidence: {
          page: 1,
          heading: "Article 1",
          conciseBasis: "The exhaustive amended-subject list excludes Mathematics.",
        },
      },
    },
  ],
  incidentHistory: [],
};

const readyIndex: MathematicsOutcomeIndex = {
  schemaVersion: 1,
  status: "LOCKED",
  primarySourceDocumentId: "MATH",
  amendmentSourceDocumentId: "AMENDMENT",
  lockedOutcomeCount: 1,
  outcomes: [
    {
      id: "G7_GEOMETRY_01",
      grade: 7,
      domain: "GEOMETRY",
      subdomain: "Triangles",
      conciseParaphrase: "Use angle relations in a triangle.",
      sourceDocumentId: "MATH",
      pages: { start: 10, end: 11 },
      sectionHeading: "Grade 7 — Geometry and measurement",
      sourceValidationStatus: "SOURCE_VALIDATED",
    },
  ],
  gaps: [
    {
      id: "G7_GEOMETRY",
      grade: 7,
      domain: "GEOMETRY",
      outcomeIds: ["G7_GEOMETRY_01"],
      status: "TEACHABLE_IMPLEMENTED",
    },
  ],
};

const actualFiles = [
  {
    localPath: "math.pdf",
    sha256: "a".repeat(64),
    fileSizeBytes: 100,
    mediaType: "application/pdf" as const,
    pdfHeader: "%PDF-1.7",
    pageCount: 20,
  },
  {
    localPath: "amendment.pdf",
    sha256: "b".repeat(64),
    fileSizeBytes: 50,
    mediaType: "application/pdf" as const,
    pdfHeader: "%PDF-1.7",
    pageCount: 2,
  },
];

test("source evidence validator accepts locked outcome-level evidence", () => {
  assert.deepEqual(
    validateSourceEvidence(readyManifest, readyIndex, actualFiles, {
      geometry: [7],
    }),
    { valid: true, errors: [] },
  );
});

test("source evidence validator fails closed on invalid source and unlocked state", () => {
  const blockedManifest: SourceProvenanceManifest = {
    ...readyManifest,
    status: "SOURCE_BLOCKED",
    documents: [
      {
        ...readyManifest.documents[0],
        mediaType: "text/html",
        formatStatus: "INVALID_NOT_PDF",
        pageCount: null,
      },
      readyManifest.documents[1],
    ],
  };
  const blockedIndex: MathematicsOutcomeIndex = {
    ...readyIndex,
    status: "SOURCE_BLOCKED",
    lockedOutcomeCount: 0,
    outcomes: [],
    gaps: [
      {
        ...readyIndex.gaps[0],
        outcomeIds: [],
        status: "NEEDS_SOURCE_VALIDATION",
      },
    ],
  };
  const result = validateSourceEvidence(
    blockedManifest,
    blockedIndex,
    [
      {
        ...actualFiles[0],
        mediaType: "text/html",
        pdfHeader: null,
        pageCount: null,
      },
      actualFiles[1],
    ],
    { geometry: [7] },
  );
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("Source is not a valid PDF: MATH."));
  assert.ok(
    result.errors.includes("Outcome lock is blocked by source provenance status."),
  );
});

test("source evidence validator rejects bad pages, duplicate IDs and unsourced gaps", () => {
  const invalidIndex: MathematicsOutcomeIndex = {
    ...readyIndex,
    lockedOutcomeCount: 2,
    outcomes: [
      {
        ...readyIndex.outcomes[0],
        pages: { start: 21, end: 22 },
        conciseParaphrase: "",
      },
      readyIndex.outcomes[0],
    ],
    gaps: [
      {
        ...readyIndex.gaps[0],
        outcomeIds: [],
      },
    ],
  };
  const result = validateSourceEvidence(
    readyManifest,
    invalidIndex,
    actualFiles,
    { geometry: [7] },
  );
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("Duplicate outcome ID")));
  assert.ok(result.errors.some((error) => error.includes("outside source page count")));
  assert.ok(result.errors.some((error) => error.includes("paraphrase")));
  assert.ok(result.errors.some((error) => error.includes("no locked outcome")));
});
