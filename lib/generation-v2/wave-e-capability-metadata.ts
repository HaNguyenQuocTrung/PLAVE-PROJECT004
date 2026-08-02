import type { ProductInteractionType, ProductVisual } from "./types.ts";
import type { WaveECapabilityId } from "./wave-e-plan.ts";

export type WaveEProfile = "ARITHMETIC" | "DATA" | "PROBABILITY" | "ALGEBRA" | "GEOMETRY" | "MEASUREMENT" | "FINANCE" | "APPLIED";
export type WaveECapabilityMetadata = Readonly<{
  profile: WaveEProfile;
  mathematicalRequirement: string;
  interactionTypes: readonly ProductInteractionType[];
  visualType: ProductVisual["type"];
  answerSemantics: string;
  misconceptionFamily: string;
}>;
const m = (profile: WaveEProfile, mathematicalRequirement: string, interactionTypes: readonly ProductInteractionType[], visualType: ProductVisual["type"], answerSemantics: string, misconceptionFamily: string): WaveECapabilityMetadata => ({ profile, mathematicalRequirement, interactionTypes, visualType, answerSemantics, misconceptionFamily });

export const WAVE_E_CAPABILITY_METADATA = {
  DIVISION_FACT_APPLICATION: m("ARITHMETIC", "apply the grade-bounded multiplication/division fact family", ["INTEGER_INPUT", "MATCHING"], "OBJECT_GROUPS", "one exact nonnegative integer", "multiplication-division inverse confusion"),
  PICTOGRAPH_READ: m("DATA", "decode a pictograph key and one category count", ["INTEGER_INPUT", "TABLE_OR_CHART_RESPONSE"], "BAR_CHART", "one exact count", "ignored pictograph scale"),
  EVENT_CERTAINTY_LANGUAGE: m("PROBABILITY", "classify an explicit event as possible, certain or impossible", ["SINGLE_CHOICE"], "EXPERIMENT_TABLE", "one event-certainty class", "possible-certain-impossible confusion"),
  PICTOGRAPH_INFERENCE: m("DATA", "compare pictograph categories and state one supported inference", ["INTEGER_INPUT", "SINGLE_CHOICE"], "BAR_CHART", "one exact difference or supported claim", "comparison-direction error"),
  DATA_COLLECTION_CLASSIFICATION: m("DATA", "classify observations by an explicit criterion and count each class", ["MATCHING", "MULTI_SELECT"], "DATA_TABLE", "exact record-to-class mapping or selected set", "classification-criterion confusion"),
  PRACTICAL_MEASUREMENT_PLAN: m("MEASUREMENT", "select a suitable instrument, unit and bounded schedule step", ["MATCHING", "ORDERING"], "MEASUREMENT_MODEL", "canonical instrument/unit mapping or step order", "instrument-unit confusion"),
  TABLE_DATA_READ: m("DATA", "read an exact cell or total from a labelled table", ["TABLE_OR_CHART_RESPONSE", "INTEGER_INPUT"], "DATA_TABLE", "one exact table value", "row-column confusion"),
  TABLE_DATA_INFERENCE: m("DATA", "derive a supported comparison from a labelled table", ["INTEGER_INPUT", "SINGLE_CHOICE"], "DATA_TABLE", "one exact derived value or claim", "unsupported table inference"),
  SIMPLE_TRIAL_OUTCOMES: m("PROBABILITY", "enumerate the possible results of one simple trial", ["MULTI_SELECT", "ORDERING"], "EXPERIMENT_TABLE", "exact finite outcome set", "sample outcome omission"),
  ARITHMETIC_MEAN: m("DATA", "calculate the arithmetic mean from complete whole-number data", ["INTEGER_INPUT", "DECIMAL_INPUT"], "DATA_TABLE", "one exact or terminating mean", "sum-not-divided-by-count"),
  BAR_CHART_READ: m("DATA", "read category values from a labelled bar chart and scale", ["TABLE_OR_CHART_RESPONSE", "INTEGER_INPUT"], "BAR_CHART", "one exact chart value", "axis-scale error"),
  BAR_CHART_PROBLEM: m("DATA", "solve one or two operations from bar-chart evidence", ["INTEGER_INPUT", "TABLE_OR_CHART_RESPONSE"], "BAR_CHART", "one exact derived value", "wrong-category or operation error"),
  EXPERIMENT_FREQUENCY: m("PROBABILITY", "count repetitions of one outcome in repeated trials", ["INTEGER_INPUT", "TABLE_OR_CHART_RESPONSE"], "EXPERIMENT_TABLE", "one exact frequency", "frequency-total confusion"),
  BAR_CHART_PATTERN: m("DATA", "identify a trend or exact change supported by bar-chart data", ["SINGLE_CHOICE", "INTEGER_INPUT"], "BAR_CHART", "one supported pattern or exact change", "visual trend overclaim"),
  VOLUME_ESTIMATION: m("MEASUREMENT", "estimate a box volume using a stated unit cube and tolerance", ["INTEGER_INPUT", "SINGLE_CHOICE"], "MEASUREMENT_MODEL", "one bounded whole-unit estimate", "area-volume confusion"),
  RELATIVE_EXPERIMENT_FREQUENCY: m("PROBABILITY", "form and reduce favorable trials over total trials", ["FRACTION_INPUT", "DECIMAL_INPUT"], "EXPERIMENT_TABLE", "reduced fraction or equivalent controlled decimal", "favorable-total reversal"),
  PIE_CHART_READ: m("DATA", "read a labelled sector proportion from a pie chart", ["INTEGER_INPUT", "SINGLE_CHOICE"], "BAR_CHART", "one exact percentage or category", "sector-whole confusion"),
  PIE_CHART_PROBLEM: m("DATA", "derive a quantity or supported pattern from sector proportions", ["INTEGER_INPUT", "DECIMAL_INPUT"], "BAR_CHART", "one exact derived quantity", "wrong percentage base"),
  REPRESENTATION_SELECTION: m("DATA", "select a data representation compatible with variables and comparison goal", ["SINGLE_CHOICE", "MATCHING"], "DATA_TABLE", "one representation or exact mapping", "chart-purpose confusion"),
  SOFTWARE_GEOMETRY_CONSTRUCTION: m("GEOMETRY", "order deterministic geometry-tool actions for the required figure", ["ORDERING", "CONSTRUCTION_OR_VISUAL_SELECTION"], "SHAPE_DIAGRAM", "canonical construction sequence or unique tool choice", "invalid tool sequence"),
  MULTIFORM_DATA_READ: m("DATA", "read equivalent values across table, pictograph and single/double bar representations", ["TABLE_OR_CHART_RESPONSE", "INTEGER_INPUT"], "BAR_CHART", "one exact value", "legend or series confusion"),
  MULTIFORM_DATA_PROBLEM: m("DATA", "solve a bounded contextual problem from a complete data representation", ["INTEGER_INPUT", "DECIMAL_INPUT"], "BAR_CHART", "one exact derived statistic", "wrong series or operation"),
  PROBABILITY_MODEL: m("PROBABILITY", "identify sample outcomes and event conditions in a simple probability model", ["MULTI_SELECT", "SINGLE_CHOICE"], "EXPERIMENT_TABLE", "exact event set or model", "event-sample-space confusion"),
  DATA_REASONABLENESS: m("DATA", "test a numeric claim against totals, ranges or representativeness constraints", ["SINGLE_CHOICE", "MULTI_SELECT"], "DATA_TABLE", "one justified validity decision", "unchecked total or biased-sample claim"),
  MULTIFORM_DATA_PATTERN: m("DATA", "detect an exact trend or invariant across represented data", ["INTEGER_INPUT", "SINGLE_CHOICE"], "BAR_CHART", "one exact pattern parameter or claim", "coincidence treated as rule"),
  CROSS_CURRICULAR_DATA_READ: m("DATA", "interpret a labelled historical, geographical or science dataset without outside assumptions", ["TABLE_OR_CHART_RESPONSE", "SINGLE_CHOICE"], "DATA_TABLE", "one data-supported result", "outside-knowledge substitution"),
  CHART_DATA_INTERPRETATION: m("DATA", "read pie and line graph data", ["TABLE_OR_CHART_RESPONSE", "SINGLE_CHOICE"], "BAR_CHART", "one exact chart value", "chart-scale confusion"),
  PIE_LINE_CHART_PROBLEM: m("DATA", "derive a multi-step value from pie or line graph data", ["INTEGER_INPUT", "DECIMAL_INPUT"], "BAR_CHART", "one exact result", "percentage or interval error"),
  DATA_REPRESENTATION_EQUIVALENCE: m("DATA", "convert or compare two representations of the same dataset", ["MATCHING", "SINGLE_CHOICE"], "DATA_TABLE", "exact representation mapping", "non-equivalent scale"),
  PIE_LINE_PATTERN: m("DATA", "identify a supported change pattern in pie or line data", ["SINGLE_CHOICE", "INTEGER_INPUT"], "BAR_CHART", "one supported pattern or exact change", "trend-direction error"),
  THEORETICAL_PROBABILITY_RATIO: m("PROBABILITY", "count favorable and equally likely outcomes to form a probability ratio", ["FRACTION_INPUT", "DECIMAL_INPUT"], "EXPERIMENT_TABLE", "reduced exact probability", "favorable-over-total error"),
  PRACTICAL_DATA_REPRESENTATION: m("DATA", "complete a data representation from classified practical observations", ["TABLE_OR_CHART_RESPONSE", "MATCHING"], "DATA_TABLE", "exact cell or record mapping", "classification-to-chart mismatch"),
  LINEAR_FUNCTION_TABLE: m("ALGEBRA", "evaluate y=ax+b for exact integer inputs", ["TABLE_OR_CHART_RESPONSE", "MATCHING"], "DATA_TABLE", "exact input-output mapping", "slope-intercept substitution error"),
  TRIANGLE_MIDLINE_REASONING: m("GEOMETRY", "identify and apply the triangle midline parallel/half-length property", ["CONSTRUCTION_OR_VISUAL_SELECTION", "DECIMAL_INPUT"], "SHAPE_DIAGRAM", "one property or exact length", "midline-median confusion"),
  EXPERIMENTAL_PROBABILITY: m("PROBABILITY", "compare experimental and theoretical probability", ["FRACTION_INPUT", "DECIMAL_INPUT"], "EXPERIMENT_TABLE", "one reduced experimental probability", "experimental-theoretical equality assumption"),
  SOFTWARE_DATA_TOOL: m("DATA", "select or order software operations that produce the stated chart, frequency or simulation", ["ORDERING", "SINGLE_CHOICE"], "DATA_TABLE", "canonical tool sequence or unique command", "data-range or command-order error"),
  QUADRATIC_FUNCTION_TABLE_GRAPH: m("ALGEBRA", "evaluate y=ax² and identify symmetric graph points", ["MATCHING", "CONSTRUCTION_OR_VISUAL_SELECTION"], "COORDINATE_GRAPH", "exact input-output mapping or graph", "squaring-sign error"),
  FREQUENCY_COUNT: m("DATA", "count occurrences of one value in raw observations", ["INTEGER_INPUT", "TABLE_OR_CHART_RESPONSE"], "DATA_TABLE", "one exact frequency", "value-frequency confusion"),
  FREQUENCY_INTERPRETATION: m("DATA", "calculate or interpret absolute and relative frequency", ["FRACTION_INPUT", "DECIMAL_INPUT", "INTEGER_INPUT"], "DATA_TABLE", "exact frequency or reduced relative frequency", "absolute-relative frequency confusion"),
  GROUPED_FREQUENCY_TABLE: m("DATA", "group observations into disjoint intervals and calculate frequency or relative frequency", ["TABLE_OR_CHART_RESPONSE", "MATCHING"], "BAR_CHART", "exact grouped frequency mapping", "overlapping interval or denominator error"),
  SAMPLE_SPACE_RANDOM_TRIAL: m("PROBABILITY", "construct the finite sample space of a random trial", ["MULTI_SELECT", "ORDERING"], "EXPERIMENT_TABLE", "complete non-duplicate sample space", "outcome omission or duplication"),
  GROWTH_INVESTMENT: m("FINANCE", "calculate bounded one-period growth and compare an investment plan", ["INTEGER_INPUT", "DECIMAL_INPUT"], "DATA_TABLE", "exact currency amount under stated rate", "rate-base or principal-growth confusion"),
  INSURANCE_REASONING: m("FINANCE", "calculate premium, deductible or covered amount from an explicit simplified policy", ["INTEGER_INPUT", "SINGLE_CHOICE"], "DATA_TABLE", "one exact amount or valid decision", "premium-deductible-benefit confusion"),
  GEOMETRY_MEDIA_PLAN: m("GEOMETRY", "order mathematically accurate scenes for a geometry demonstration", ["ORDERING", "MULTI_SELECT"], "SHAPE_DIAGRAM", "canonical evidence sequence or property set", "decorative scene without geometric evidence"),
  SOLID_MEASUREMENT_APPLICATION: m("MEASUREMENT", "calculate practical cylinder, cone or sphere measure from complete dimensions", ["DECIMAL_INPUT", "INTEGER_INPUT"], "MEASUREMENT_MODEL", "controlled rounded area or volume", "radius-diameter or area-volume confusion"),
  CHEMICAL_EQUATION_SYSTEM: m("APPLIED", "solve exact two-species balance constraints with a linear system", ["MATCHING", "INTEGER_INPUT"], "DATA_TABLE", "positive integer coefficient pair", "unbalanced atom count"),
  TRIGONOMETRIC_FIELD_MEASUREMENT: m("MEASUREMENT", "apply one stated right-triangle ratio to an inaccessible distance", ["DECIMAL_INPUT", "INTEGER_INPUT"], "SHAPE_DIAGRAM", "controlled rounded distance", "opposite-adjacent or unit confusion"),
  GENETICS_PROBABILITY: m("PROBABILITY", "count equally likely genotype outcomes in a stated single-gene cross", ["FRACTION_INPUT", "SINGLE_CHOICE"], "EXPERIMENT_TABLE", "reduced exact probability", "genotype-phenotype or sample-space confusion"),
} as const satisfies Record<WaveECapabilityId, WaveECapabilityMetadata>;
