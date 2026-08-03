/**
 * Exact curriculum exceptions where an n/1 response remains pedagogically a
 * fraction/rational representation. This independent oracle policy is keyed
 * only by canonical outcome ID and does not import Generator contracts.
 */
export const DENOMINATOR_ONE_FRACTION_OUTCOME_EXCEPTIONS = {
  "MOET2018-G4-NUM-P037-025": "Solve a multi-step fraction-of-a-quantity task and report the reduced fractional quantity.",
  "MOET2018-G4-NUM-P037-026": "Perform multiplication or division of positive fractions and report a reduced fraction.",
  "MOET2018-G5-NUM-P041-006": "Solve a contextual fraction operation and report the reduced fractional result.",
  "MOET2018-G5-NUM-P041-012": "Perform the four fraction operations and preserve the exact rational representation.",
  "MOET2018-G5-NUM-P041-013": "Add or subtract fractions and report the reduced fraction.",
  "MOET2018-G6-NAA-P049-031": "Solve a practical fraction calculation and report an exact reduced fraction.",
  "MOET2018-G6-NAA-P049-040": "Perform rational-number operations in exact reduced fractional form.",
  "MOET2018-G7-NAA-P056-005": "Represent a signed rational change explicitly as a reduced fraction.",
  "MOET2018-G7-NAA-P056-007": "Evaluate rational operations with ordering and parentheses in exact fractional form.",
  "MOET2018-G7-NAA-P056-014": "Read a rational coordinate from a number line and report it as a reduced fraction.",
  "MOET2018-G7-NAA-P056-016": "Perform rational-number operations in exact reduced fractional form."
} as const;

export type DenominatorOneFractionExceptionOutcomeId = keyof typeof DENOMINATOR_ONE_FRACTION_OUTCOME_EXCEPTIONS;

export function denominatorOneFractionExceptionReason(outcomeId: string) {
  return DENOMINATOR_ONE_FRACTION_OUTCOME_EXCEPTIONS[
    outcomeId as DenominatorOneFractionExceptionOutcomeId
  ] ?? null;
}
