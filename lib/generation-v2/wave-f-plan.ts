// Explicit Wave F product-authoring plan. Runtime routing uses outcome IDs only.
// The two already-proven Wave F baseline outcomes remain in the canonical matrix,
// but are intentionally not duplicated by this final-outcome engine.
export const WAVE_F_CAPABILITY_OUTCOMES = {
  TENS_ONES_STRUCTURE: ["MOET2018-G1-NUM-P022-003"],
  MASS_COMPARISON_REASONING: ["MOET2018-G2-GEO-P026-004"],
  UNIFORM_MOTION_REASONING: ["MOET2018-G5-GEO-P044-008"],
  CROSS_CURRICULAR_STATISTICS_REASONING: [
    "MOET2018-G6-STA-P053-005",
    "MOET2018-G7-STA-P061-005",
    "MOET2018-G8-STA-P069-010",
  ],
  TAX_CALCULATION_REASONING: ["MOET2018-G7-EXP-P062-002"],
  RATIONAL_EXPRESSION_PROPERTY_REASONING: ["MOET2018-G8-NAA-P064-010"],
  RATIONAL_EXPRESSION_CONCEPT_REASONING: ["MOET2018-G8-NAA-P064-011"],
  SCIENTIFIC_ALGEBRA_REASONING: ["MOET2018-G8-EXP-P070-008"],
} as const;

export type WaveFCapabilityId = keyof typeof WAVE_F_CAPABILITY_OUTCOMES;

const entries = Object.entries(WAVE_F_CAPABILITY_OUTCOMES) as readonly [WaveFCapabilityId, readonly string[]][];
export const WAVE_F_OUTCOME_CAPABILITY = new Map(
  entries.flatMap(([capability, outcomeIds]) => outcomeIds.map((outcomeId) => [outcomeId, capability] as const)),
);

if (entries.length !== 8) throw new Error("WAVE_F_NEW_CAPABILITY_COUNT_INVALID");
if (WAVE_F_OUTCOME_CAPABILITY.size !== 10) throw new Error("WAVE_F_FINAL_OUTCOME_PLAN_COUNT_INVALID");
