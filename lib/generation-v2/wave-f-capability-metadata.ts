import type { ProductInteractionType, ProductVisual } from "./types.ts";
import type { WaveFCapabilityId } from "./wave-f-plan.ts";

export type WaveFProfile = "ARITHMETIC" | "MEASUREMENT" | "DATA" | "FINANCE" | "ALGEBRA" | "APPLIED";
export type WaveFCapabilityMetadata = Readonly<{
  profile: WaveFProfile;
  mathematicalRequirement: string;
  interactionTypes: readonly ProductInteractionType[];
  visualType: ProductVisual["type"];
  answerSemantics: string;
  misconceptionFamily: string;
}>;

const m = (
  profile: WaveFProfile,
  mathematicalRequirement: string,
  interactionTypes: readonly ProductInteractionType[],
  visualType: ProductVisual["type"],
  answerSemantics: string,
  misconceptionFamily: string,
): WaveFCapabilityMetadata => ({ profile, mathematicalRequirement, interactionTypes, visualType, answerSemantics, misconceptionFamily });

export const WAVE_F_CAPABILITY_METADATA = {
  TENS_ONES_STRUCTURE: m("ARITHMETIC", "identify tens, ones and exact multiples of ten within 100", ["MATCHING"], "DATA_TABLE", "one exact place-value mapping", "tens-ones or round-ten confusion"),
  MASS_COMPARISON_REASONING: m("MEASUREMENT", "order objects by an explicit common-unit mass", ["ORDERING"], "MEASUREMENT_MODEL", "one strict heaviest-to-lightest order", "heavier-lighter direction confusion"),
  UNIFORM_MOTION_REASONING: m("MEASUREMENT", "apply distance = speed × time with one exact unknown", ["INTEGER_INPUT"], "DATA_TABLE", "one exact positive integer with stated unit", "speed-distance-time operation confusion"),
  CROSS_CURRICULAR_STATISTICS_REASONING: m("DATA", "select the unique conclusion supported by a labelled cross-curricular dataset", ["SINGLE_CHOICE"], "DATA_TABLE", "one evidence-supported statistical conclusion", "unsupported inference or row-column confusion"),
  TAX_CALCULATION_REASONING: m("FINANCE", "calculate tax, price after tax or pre-tax price from an explicit simplified rate", ["INTEGER_INPUT"], "DATA_TABLE", "one exact nonnegative currency amount", "tax-rate base confusion"),
  RATIONAL_EXPRESSION_PROPERTY_REASONING: m("ALGEBRA", "apply equality, sign and nonzero multiplier properties of rational algebraic expressions", ["SINGLE_CHOICE"], "DATA_TABLE", "one symbolically valid property statement", "ignoring nonzero conditions or changing only one part"),
  RATIONAL_EXPRESSION_CONCEPT_REASONING: m("ALGEBRA", "connect definition, domain, value and equality for one rational algebraic expression", ["MATCHING"], "DATA_TABLE", "one exact concept-to-result mapping", "domain-value-equivalence confusion"),
  SCIENTIFIC_ALGEBRA_REASONING: m("APPLIED", "use a stated linear chemistry or biology relation to determine one exact unknown", ["INTEGER_INPUT"], "DATA_TABLE", "one exact integer satisfying the stated scientific relation", "coefficient-variable or inverse-operation confusion"),
} as const satisfies Record<WaveFCapabilityId, WaveFCapabilityMetadata>;
