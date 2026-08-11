import inventoryJson from "../../docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json" with { type: "json" };
import { canonicalize, sha256 } from "./canonical.ts";
import { officialSourceReferenceId } from "./official-source-map.ts";
import { waveKClassificationsG2G4 } from "./wave-k-classifications-g2-g4.ts";
import { waveKClassificationsG5G6 } from "./wave-k-classifications-g5-g6.ts";
import { waveKClassificationsG7G9 } from "./wave-k-classifications-g7-g9.ts";
import { combinedWaveABCDEFGHIJGradePacks } from "./wave-j-packs.ts";
import type { WaveKClassificationDecision, WaveKInventoryRow } from "./wave-k-types.ts";

type ProductionGrade = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type OfficialOutcome = Readonly<{
  id: string;
  grade: number;
  officialStrand: string;
  subdomain: string;
  conciseParaphrase: string;
  sourceDocumentId: string;
  sourceSha256: string;
  pages: Readonly<{ start: number; end: number }>;
  statuses: readonly string[];
  mappedUnitIds: readonly string[];
}>;

const inventory = inventoryJson as Readonly<{
  source: Readonly<{ documentId: string; sha256: string; pageCount: number }>;
  outcomes: readonly OfficialOutcome[];
}>;

export const waveKExpectedRemaining = Object.freeze({ 2: 22, 3: 29, 4: 34, 5: 34, 6: 66, 7: 50, 8: 50, 9: 60 } as const);
export const waveKKnownExperiential = Object.freeze({ 2: 2, 3: 2, 4: 3, 5: 3, 6: 6, 7: 7, 8: 9, 9: 9 } as const);

const decisions: readonly WaveKClassificationDecision[] = [
  ...waveKClassificationsG2G4,
  ...waveKClassificationsG5G6,
  ...waveKClassificationsG7G9,
];

function retainedOutcomes(grade: ProductionGrade) {
  return inventory.outcomes.filter((outcome) => outcome.grade === grade
    && outcome.sourceDocumentId === inventory.source.documentId
    && outcome.sourceSha256 === inventory.source.sha256
    && outcome.statuses.includes("OFFICIAL_SOURCE_LOCKED")
    && outcome.statuses.includes("VALIDATOR_PASSED")
    && outcome.mappedUnitIds.length > 0);
}

export function buildWaveKInventory() {
  const rows: WaveKInventoryRow[] = [];
  const errors: string[] = [];
  for (const grade of [2, 3, 4, 5, 6, 7, 8, 9] as const) {
    const pack = combinedWaveABCDEFGHIJGradePacks.find((entry) => entry.grade === grade);
    if (!pack) throw new Error(`WAVE_K_AJ_PACK_MISSING:G${grade}`);
    const covered = new Set(pack.questions.map((question) => question.skillId));
    const gradeOutcomes = retainedOutcomes(grade);
    const remaining = gradeOutcomes.filter((outcome) => !covered.has(outcome.id.toLowerCase()));
    const gradeDecisions = decisions.filter((decision) => decision.grade === grade);
    const byId = new Map(gradeDecisions.map((decision) => [decision.outcomeId, decision]));
    if (byId.size !== gradeDecisions.length) errors.push(`G${grade}:DUPLICATE_CLASSIFICATION_DECISION`);
    const reportedRemaining = remaining.filter((outcome) => !outcome.officialStrand.startsWith("HOẠT ĐỘNG"));
    if (reportedRemaining.length !== waveKExpectedRemaining[grade]) errors.push(`G${grade}:REPORTED_REMAINING_COUNT_DRIFT`);
    if (remaining.length - reportedRemaining.length !== waveKKnownExperiential[grade]) errors.push(`G${grade}:EXPERIENTIAL_COUNT_DRIFT`);
    for (const outcome of remaining) {
      const decision = byId.get(outcome.id);
      if (!decision) { errors.push(`${outcome.id}:CLASSIFICATION_MISSING`); continue; }
      if (decision.classification === "PRODUCIBLE_DETERMINISTIC" && !decision.templateFamily) errors.push(`${outcome.id}:TEMPLATE_FAMILY_MISSING`);
      if (decision.classification !== "ALREADY_COVERED_SEMANTICALLY" && decision.semanticAliasTargetSkillId) errors.push(`${outcome.id}:UNJUSTIFIED_ALIAS_TARGET`);
      rows.push({ ...decision, skillId: outcome.id.toLowerCase(), domain: outcome.officialStrand,
        subdomain: outcome.subdomain, objective: outcome.conciseParaphrase, unitIds: [...outcome.mappedUnitIds].sort(),
        pages: outcome.pages, sourceDocumentId: outcome.sourceDocumentId, sourceSha256: outcome.sourceSha256,
        sourceReferenceId: officialSourceReferenceId(grade), coveredBeforeK: false, sourceMapRowCount: outcome.mappedUnitIds.length });
    }
    for (const decision of gradeDecisions) if (!remaining.some((outcome) => outcome.id === decision.outcomeId)) {
      errors.push(`${decision.outcomeId}:CLASSIFICATION_NOT_IN_REMAINING_INVENTORY`);
    }
  }
  const ordered = rows.sort((left, right) => `${left.grade}:${left.outcomeId}`.localeCompare(`${right.grade}:${right.outcomeId}`));
  return { schemaVersion: "plave-wave-k-canonical-gap-inventory-v1", source: inventory.source,
    rows: ordered, inventoryHash: sha256(canonicalize(ordered)), errors } as const;
}

export const waveKInventory = buildWaveKInventory();
if (waveKInventory.errors.length) throw new Error(`WAVE_K_INVENTORY_INVALID:${waveKInventory.errors.join(",")}`);

