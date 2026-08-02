import {
  existsSync,
  lstatSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, resolve } from "node:path";

export const OWNER_REVIEW_DECISIONS = [
  "APPROVE",
  "REJECT",
  "NEEDS_REVISION",
] as const;

export type OwnerReviewDecision =
  (typeof OWNER_REVIEW_DECISIONS)[number];

type SampleReview = Readonly<{
  decision: OwnerReviewDecision;
  note: string;
}>;

export type OwnerReviewFinalSubmission = Readonly<{
  overallDecision: OwnerReviewDecision;
  overallNote: string;
  decisions: Readonly<Record<string, SampleReview>>;
}>;

type ManifestSample = {
  sampleId: string;
  outcomeId: string;
  capabilityId: string;
  ownerDecision: OwnerReviewDecision | null;
  ownerNote: string;
  reviewState: string;
};

type OwnerReviewManifest = {
  schemaVersion: number;
  sampleCount: number;
  canonicalCapabilities: number;
  privateSolutionIncluded: boolean;
  ownerDecision: OwnerReviewDecision | null;
  ownerNotes: string | null;
  samples: ManifestSample[];
  [key: string]: unknown;
};

export class OwnerReviewResultError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

function fail(code: string): never {
  throw new OwnerReviewResultError(code);
}

function normalizedNote(value: unknown, label: string) {
  if (typeof value !== "string") fail(`${label}_INVALID`);
  const note = value.replace(/\0/gu, "").trim();
  if (note.length > 4_000) fail(`${label}_TOO_LONG`);
  return note;
}

function isDecision(value: unknown): value is OwnerReviewDecision {
  return OWNER_REVIEW_DECISIONS.some((decision) => decision === value);
}

function atomicWrite(path: string, contents: string) {
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) {
    fail("OWNER_REVIEW_DESTINATION_SYMLINK_REJECTED");
  }
  const temporary = `${path}.pending-${process.pid}`;
  try {
    writeFileSync(temporary, contents, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o644,
    });
    renameSync(temporary, path);
  } finally {
    if (existsSync(temporary)) rmSync(temporary);
  }
}

function decisionBlock(input: {
  decision: OwnerReviewDecision;
  recordedAt: string;
  reviewed: number;
  approved: number;
  rejected: number;
  needsRevision: number;
  impactedCapabilities: number;
  impactedOutcomes: number;
}) {
  return [
    "<!-- GENERATOR_V2_OWNER_REVIEW_DECISION_START -->",
    "## Owner usefulness decision",
    "",
    `- Decision: \`${input.decision}\`.`,
    `- Recorded at: \`${input.recordedAt}\`.`,
    `- Reviewed: ${input.reviewed}/198; approved: ${input.approved}; rejected: ${input.rejected}; needs revision: ${input.needsRevision}; unreviewed: 0.`,
    `- Impacted capabilities: ${input.impactedCapabilities}; impacted outcomes: ${input.impactedOutcomes}.`,
    "- Public-only decision evidence: `artifacts/generator-v2-owner-review/result.json`.",
    "<!-- GENERATOR_V2_OWNER_REVIEW_DECISION_END -->",
  ].join("\n");
}

function upsertDecisionBlock(source: string, block: string) {
  const pattern = /\n?<!-- GENERATOR_V2_OWNER_REVIEW_DECISION_START -->[\s\S]*?<!-- GENERATOR_V2_OWNER_REVIEW_DECISION_END -->\n?/u;
  const base = source.replace(pattern, "\n").trimEnd();
  return `${base}\n\n${block}\n`;
}

function milestoneState(decision: OwnerReviewDecision) {
  if (decision === "APPROVE") return "COMPLETE_OWNER_APPROVED";
  if (decision === "REJECT") return "IN_PROGRESS_OWNER_REJECTED";
  return "IN_PROGRESS_NEEDS_REVISION";
}

export function recordOwnerReviewDecision(
  submission: OwnerReviewFinalSubmission,
  candidateRoot = process.cwd(),
) {
  const root = resolve(candidateRoot);
  if (basename(root) !== "PLAVE-PROJECT004") {
    fail("OWNER_REVIEW_WORKSPACE_REJECTED");
  }
  if (!isDecision(submission?.overallDecision)) {
    fail("OWNER_REVIEW_OVERALL_DECISION_REQUIRED");
  }
  const overallNote = normalizedNote(
    submission.overallNote,
    "OWNER_REVIEW_OVERALL_NOTE",
  );
  if (!submission.decisions || typeof submission.decisions !== "object") {
    fail("OWNER_REVIEW_SAMPLE_DECISIONS_INVALID");
  }

  const manifestPath = resolve(
    root,
    "artifacts/generator-v2-owner-review/manifest.json",
  );
  if (!existsSync(manifestPath)) fail("OWNER_REVIEW_MANIFEST_MISSING");
  const manifest = JSON.parse(
    readFileSync(manifestPath, "utf8"),
  ) as OwnerReviewManifest;
  if (
    manifest.sampleCount !== 198 ||
    manifest.samples?.length !== 198 ||
    manifest.canonicalCapabilities !== 198 ||
    manifest.privateSolutionIncluded !== false
  ) {
    fail("OWNER_REVIEW_MANIFEST_CONTRACT_INVALID");
  }
  if (manifest.ownerDecision !== null) {
    fail("OWNER_REVIEW_ALREADY_FINALIZED");
  }

  const sampleIds = new Set(manifest.samples.map((sample) => sample.sampleId));
  const submittedIds = Object.keys(submission.decisions);
  if (
    submittedIds.length !== 198 ||
    submittedIds.some((sampleId) => !sampleIds.has(sampleId))
  ) {
    fail("OWNER_REVIEW_198_OF_198_REQUIRED");
  }

  let approved = 0;
  let rejected = 0;
  let needsRevision = 0;
  const notes: Array<{
    sampleId: string;
    outcomeId: string;
    capabilityId: string;
    decision: OwnerReviewDecision;
    note: string;
  }> = [];
  const impactedCapabilityIds = new Set<string>();
  const impactedOutcomeIds = new Set<string>();

  for (const sample of manifest.samples) {
    const review = submission.decisions[sample.sampleId];
    if (!review || !isDecision(review.decision)) {
      fail("OWNER_REVIEW_198_OF_198_REQUIRED");
    }
    const note = normalizedNote(review.note, "OWNER_REVIEW_SAMPLE_NOTE");
    sample.ownerDecision = review.decision;
    sample.ownerNote = note;
    sample.reviewState = review.decision;
    if (review.decision === "APPROVE") approved += 1;
    if (review.decision === "REJECT") rejected += 1;
    if (review.decision === "NEEDS_REVISION") needsRevision += 1;
    if (review.decision !== "APPROVE") {
      impactedCapabilityIds.add(sample.capabilityId);
      impactedOutcomeIds.add(sample.outcomeId);
    }
    if (note) {
      notes.push({
        sampleId: sample.sampleId,
        outcomeId: sample.outcomeId,
        capabilityId: sample.capabilityId,
        decision: review.decision,
        note,
      });
    }
  }

  const recordedAt = new Date().toISOString();
  manifest.ownerDecision = submission.overallDecision;
  manifest.ownerNotes = overallNote || null;
  const result = {
    schemaVersion: 1,
    recordedAt,
    productScope: manifest.productScope,
    reviewed: 198,
    approved,
    rejected,
    needsRevision,
    unreviewed: 0,
    ownerDecision: submission.overallDecision,
    ownerNote: overallNote || null,
    impactedCapabilityIds: [...impactedCapabilityIds].sort(),
    impactedOutcomeIds: [...impactedOutcomeIds].sort(),
    notes,
    privateSolutionIncluded: false,
  };

  const state = milestoneState(submission.overallDecision);
  const block = decisionBlock({
    decision: submission.overallDecision,
    recordedAt,
    reviewed: 198,
    approved,
    rejected,
    needsRevision,
    impactedCapabilities: impactedCapabilityIds.size,
    impactedOutcomes: impactedOutcomeIds.size,
  });
  const statusPath = resolve(
    root,
    "docs/status/SPRINT_8C_GENERATOR_V2_FULL_COVERAGE.md",
  );
  const roadmapPath = resolve(
    root,
    "docs/status/PLAVE_THREE_MILESTONE_ROADMAP.md",
  );
  const status = readFileSync(statusPath, "utf8").replace(
    /Milestone 2: `(?:IN_PROGRESS_AWAITING_OWNER_REVIEW|IN_PROGRESS_NEEDS_REVISION|IN_PROGRESS_OWNER_REJECTED|COMPLETE_OWNER_APPROVED)`/u,
    `Milestone 2: \`${state}\``,
  );
  const roadmap = readFileSync(roadmapPath, "utf8").replaceAll(
    "IN_PROGRESS_AWAITING_OWNER_REVIEW",
    state,
  );

  atomicWrite(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  atomicWrite(
    resolve(root, "artifacts/generator-v2-owner-review/result.json"),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  atomicWrite(statusPath, upsertDecisionBlock(status, block));
  atomicWrite(roadmapPath, upsertDecisionBlock(roadmap, block));
  return result;
}
