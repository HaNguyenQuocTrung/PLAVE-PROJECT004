import { strict as assert } from "node:assert";
import test from "node:test";

import {
  generateGradeTwoNumbersTo1000Draft,
  numberToVietnameseWords,
} from "../lib/content-engine/grade2-numbers-to-1000.ts";
import {
  gradeTwoNumbersTo1000Assets,
  gradeTwoNumbersTo1000SourceManifest,
} from "../lib/content-engine/grade2-numbers-to-1000-sources.ts";
import {
  evaluateControlledPilotEligibility,
  validateContentAssets,
  validateSourceTraceabilityRecord,
  validateUnitSourceTraceabilityManifest,
} from "../lib/content-engine/source-traceability.ts";
import type {
  ContentAssetRecord,
  SourceTraceabilityRecord,
  UnitSourceTraceabilityManifest,
} from "../lib/content-engine/source-traceability.ts";
import type { ContentGovernanceState } from "../lib/content-engine/types.ts";

test("Sprint 6E-A 1. Official-source manifest maps every approved skill family", () => {
  const result = validateUnitSourceTraceabilityManifest(
    gradeTwoNumbersTo1000SourceManifest,
  );
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(
    gradeTwoNumbersTo1000SourceManifest.skillMappings.length,
    4,
  );
  assert.deepEqual(
    gradeTwoNumbersTo1000SourceManifest.skillMappings.map(
      (mapping) => mapping.skillFamilyId,
    ),
    gradeTwoNumbersTo1000SourceManifest.skillFamilyIds,
  );
  for (const mapping of gradeTwoNumbersTo1000SourceManifest.skillMappings) {
    assert.ok(mapping.officialSourceIds.length > 0);
    assert.ok(mapping.approvedTextbookSourceIds.length > 0);
    assert.ok(mapping.technicalValidatorIds.length > 0);
  }
});

test("Sprint 6E-A 2. Missing source IDs and outcome mappings fail closed", () => {
  const source = gradeTwoNumbersTo1000SourceManifest.sourceRecords[0];
  assert.ok(source);
  const missingId: SourceTraceabilityRecord = {
    ...source,
    sourceId: "",
  };
  assert.equal(validateSourceTraceabilityRecord(missingId).valid, false);

  const brokenManifest: UnitSourceTraceabilityManifest = {
    ...gradeTwoNumbersTo1000SourceManifest,
    outcomeIds: [],
  };
  assert.equal(
    validateUnitSourceTraceabilityManifest(brokenManifest).valid,
    false,
  );
});

test("Sprint 6E-A 3. Fake, empty and mismatched source versions are rejected", () => {
  const source = gradeTwoNumbersTo1000SourceManifest.sourceRecords[0];
  assert.ok(source);
  for (const reference of [
    "",
    "https://example.com/fake.pdf",
    "http://moet.gov.vn/not-https",
  ]) {
    const broken: SourceTraceabilityRecord = {
      ...source,
      sourceUrlOrBibliographicReference: reference,
    };
    assert.equal(validateSourceTraceabilityRecord(broken).valid, false);
  }

  const mapping = gradeTwoNumbersTo1000SourceManifest.skillMappings[0];
  assert.ok(mapping);
  const sourceId = mapping.officialSourceIds[0];
  assert.ok(sourceId);
  const brokenManifest: UnitSourceTraceabilityManifest = {
    ...gradeTwoNumbersTo1000SourceManifest,
    skillMappings: [
      {
        ...mapping,
        expectedSourceVersions: {
          ...mapping.expectedSourceVersions,
          [sourceId]: "wrong-version",
        },
      },
      ...gradeTwoNumbersTo1000SourceManifest.skillMappings.slice(1),
    ],
  };
  const result = validateUnitSourceTraceabilityManifest(brokenManifest);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /version mismatch/);
});

const eligibleBase: ContentGovernanceState = {
  officialSourceValidation: "VALIDATED",
  technicalValidation: "PASSED",
  expertReview: "OPTIONAL_NOT_OBTAINED",
  ownerDecision: "APPROVED_FOR_CONTROLLED_PILOT",
  publicationStatus: "DRAFT",
};

test("Sprint 6E-A 4. Optional expert review does not block a controlled pilot", () => {
  const decision = evaluateControlledPilotEligibility(eligibleBase);
  assert.equal(decision.eligible, true);
  assert.equal(decision.targetStatus, "PILOT_ELIGIBLE");
  assert.deepEqual(decision.reasons, []);
});

test("Sprint 6E-A 5. Source, technical and owner gates remain independent", () => {
  const cases: readonly ContentGovernanceState[] = [
    {
      ...eligibleBase,
      officialSourceValidation: "IN_PROGRESS",
    },
    { ...eligibleBase, technicalValidation: "FAILED" },
    { ...eligibleBase, ownerDecision: "NOT_REVIEWED" },
  ];
  for (const state of cases) {
    const decision = evaluateControlledPilotEligibility(state);
    assert.equal(decision.eligible, false);
    assert.equal(decision.targetStatus, null);
    assert.ok(decision.reasons.length > 0);
  }
});

test("Sprint 6E-A 6. Owner approval never auto-publishes or fabricates expert review", () => {
  const decision = evaluateControlledPilotEligibility(eligibleBase);
  assert.equal(decision.targetStatus, "PILOT_ELIGIBLE");
  assert.notEqual(decision.targetStatus, "PUBLISHED");
  assert.equal(eligibleBase.expertReview, "OPTIONAL_NOT_OBTAINED");
  assert.equal(eligibleBase.publicationStatus, "DRAFT");
});

test("Sprint 6E-A 7. Source validation is explicitly not official endorsement", () => {
  assert.equal(
    gradeTwoNumbersTo1000SourceManifest.officialSourceValidation,
    "VALIDATED",
  );
  assert.match(
    gradeTwoNumbersTo1000SourceManifest.nonEndorsementNotice,
    /không đồng nghĩa.*Bộ GDĐT.*chứng nhận|không đồng nghĩa.*chứng nhận/i,
  );
  assert.doesNotMatch(
    gradeTwoNumbersTo1000SourceManifest.nonEndorsementNotice,
    /^PLAVE được Bộ GDĐT chứng nhận/i,
  );
});

test("Sprint 6E-A 8. Client question bundle contains no solution or audit source", () => {
  const draft = generateGradeTwoNumbersTo1000Draft("source-policy-client");
  for (const bundle of draft.bundles) {
    const serialized = JSON.stringify(bundle.question);
    assert.equal("correctAnswer" in bundle.question, false);
    assert.equal("solutionSteps" in bundle.question, false);
    assert.equal("audit" in bundle.question, false);
    assert.doesNotMatch(serialized, /correctAnswer|solutionSteps|auditSource/);
  }
});

test("Sprint 6E-A 9. Visual/accessibility values and distractor evidence stay consistent", () => {
  const draft = generateGradeTwoNumbersTo1000Draft("source-policy-visual");
  for (const bundle of draft.bundles) {
    assert.ok(bundle.question.visual.description.length >= 12);
    assert.doesNotMatch(
      bundle.question.visual.description,
      /đáp án|correct|https?:|data:/i,
    );
    if (bundle.question.questionType === "MULTIPLE_CHOICE") {
      assert.equal(
        Object.keys(bundle.audit.distractorTagByOption).length,
        3,
      );
      assert.equal(
        bundle.solution.correctAnswer in
          bundle.audit.distractorTagByOption,
        false,
      );
    }
  }
});

test("Sprint 6E-A 10. Vietnamese number generation follows the PLAVE linh house style", () => {
  assert.equal(numberToVietnameseWords(101), "một trăm linh một");
  assert.equal(numberToVietnameseWords(205), "hai trăm linh năm");
  assert.doesNotMatch(numberToVietnameseWords(909), /\blẻ\b/);
  assert.equal(
    gradeTwoNumbersTo1000SourceManifest.vietnameseNumberHouseStyle
      .decisionLabel,
    "PRODUCT_DECISION",
  );
  assert.match(
    gradeTwoNumbersTo1000SourceManifest.vietnameseNumberHouseStyle
      .variationNote,
    /không tuyên bố.*“lẻ”.*sai/i,
  );
});

test("Sprint 6E-A 11. Copyright guard accepts code-native assets and rejects unsafe copies", () => {
  const valid = validateContentAssets(gradeTwoNumbersTo1000Assets);
  assert.equal(valid.valid, true, valid.errors.join("\n"));
  const unsafeAssets: readonly ContentAssetRecord[] = [
    {
      assetId: "UNLICENSED-TEXTBOOK-PDF",
      origin: "THIRD_PARTY",
      reference: "textbook-scan.pdf",
      copyrightHandling: "REFERENCE_ONLY",
    },
    {
      assetId: "EXTERNAL-RUNTIME-ASSET",
      origin: "THIRD_PARTY",
      reference: "https://publisher.invalid/page.png",
      copyrightHandling: "LICENSED_ASSET",
    },
  ];
  const invalid = validateContentAssets(unsafeAssets);
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join("\n"), /bị cấm|LICENSED_ASSET/);
});
