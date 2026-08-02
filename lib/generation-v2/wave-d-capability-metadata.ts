import type { ProductInteractionType, ProductVisual } from "./types.ts";
import type { WaveDCapabilityId } from "./wave-d-plan.ts";

export type WaveDProfile =
  | "ARITHMETIC"
  | "MEASUREMENT"
  | "GEOMETRY_2D"
  | "GEOMETRY_3D"
  | "COORDINATE"
  | "ALGEBRA"
  | "FINANCE"
  | "TIME";

export type WaveDCapabilityMetadata = Readonly<{
  profile: WaveDProfile;
  mathematicalRequirement: string;
  interactionTypes: readonly ProductInteractionType[];
  visualType: ProductVisual["type"];
  answerSemantics: string;
  misconceptionFamily: string;
}>;

const m = (
  profile: WaveDProfile,
  mathematicalRequirement: string,
  interactionTypes: readonly ProductInteractionType[],
  visualType: ProductVisual["type"],
  answerSemantics: string,
  misconceptionFamily: string,
): WaveDCapabilityMetadata => ({ profile, mathematicalRequirement, interactionTypes, visualType, answerSemantics, misconceptionFamily });

export const WAVE_D_CAPABILITY_METADATA = {
  ANGLE_MEASUREMENT: m("GEOMETRY_2D", "classify or determine an angle from exact degree data", ["SINGLE_CHOICE", "INTEGER_INPUT"], "SHAPE_DIAGRAM", "angle class or integer degrees", "angle class and supplementary-angle confusion"),
  APPLIED_GEOMETRY_MEASUREMENT: m("GEOMETRY_2D", "select and apply one measurable property of a represented shape", ["SINGLE_CHOICE", "INTEGER_INPUT"], "SHAPE_DIAGRAM", "property selection or exact measure", "shape-property selection"),
  APPLIED_MEASUREMENT_MODEL: m("MEASUREMENT", "choose the relevant quantity, unit and bounded calculation", ["INTEGER_INPUT", "DECIMAL_INPUT"], "MEASUREMENT_MODEL", "scaled exact measure", "irrelevant quantity or unit confusion"),
  APPLIED_RATIONAL_REASONING: m("ARITHMETIC", "model a signed rational measurement or rate exactly", ["FRACTION_INPUT"], "NUMBER_LINE", "reduced rational", "sign and rational-operation error"),
  AREA_PERIMETER: m("GEOMETRY_2D", "distinguish boundary from covered region and calculate from dimensions", ["DECIMAL_INPUT"], "AREA_MODEL", "exact length or square-unit measure", "perimeter-area confusion"),
  CIRCLE_ANGLE_RELATION: m("GEOMETRY_2D", "apply exact central, inscribed and intercepted-arc relations", ["INTEGER_INPUT", "SINGLE_CHOICE"], "SHAPE_DIAGRAM", "integer angle or relation", "central-versus-inscribed factor"),
  CIRCLE_INSCRIBED_CIRCUMSCRIBED: m("GEOMETRY_2D", "identify or calculate centers and radii from triangle/quadrilateral constraints", ["SINGLE_CHOICE", "DECIMAL_INPUT"], "SHAPE_DIAGRAM", "unique center relation or controlled radius", "incenter-circumcenter confusion"),
  CIRCLE_MEASURE: m("GEOMETRY_2D", "calculate circumference, arc, sector, annulus or circle-based application", ["DECIMAL_INPUT"], "AREA_MODEL", "controlled rounded measure", "radius-diameter and sector fraction error"),
  CIRCLE_RELATION: m("GEOMETRY_2D", "classify tangent/chord/symmetry or relative-position constraints", ["MULTI_SELECT"], "SHAPE_DIAGRAM", "unique relation classification", "secant-tangent and chord confusion"),
  COORDINATE_POINT: m("COORDINATE", "read or place an ordered pair on Cartesian axes", ["MATCHING", "CONSTRUCTION_OR_VISUAL_SELECTION"], "COORDINATE_GRAPH", "ordered pair", "coordinate-order and sign error"),
  DIRECT_MEASUREMENT_ESTIMATION: m("MEASUREMENT", "read a bounded instrument/model or choose a plausible estimate", ["INTEGER_INPUT", "SINGLE_CHOICE"], "MEASUREMENT_MODEL", "exact reading or unique plausible estimate", "scale and unit error"),
  DIVISION_REMAINDER: m("ARITHMETIC", "reconstruct dividend = divisor × quotient + remainder", ["MATCHING", "INTEGER_INPUT"], "DATA_TABLE", "quotient/remainder pair", "remainder-domain error"),
  EARLY_ARITHMETIC_APPLICATION: m("ARITHMETIC", "count and combine concrete classroom quantities", ["INTEGER_INPUT", "SINGLE_CHOICE"], "OBJECT_GROUPS", "nonnegative whole number", "counting or operation-selection error"),
  FUNCTION_MODEL_RECOGNITION: m("ALGEBRA", "distinguish functional from non-functional input-output relations", ["SINGLE_CHOICE"], "DATA_TABLE", "unique relation classification", "repeated-input function error"),
  GEOMETRIC_CONSTRUCTION_PLAN: m("GEOMETRY_2D", "order or select deterministic construction steps and tools", ["ORDERING", "CONSTRUCTION_OR_VISUAL_SELECTION"], "SHAPE_DIAGRAM", "canonical step order or construction", "invalid tool or construction order"),
  GEOMETRIC_PROOF_REASONING: m("GEOMETRY_2D", "order premises, justified deductions and conclusion", ["ORDERING"], "SHAPE_DIAGRAM", "canonical proof sequence", "unsupported conclusion"),
  GEOMETRY_PROPERTIES: m("GEOMETRY_2D", "identify polygon and circle elements", ["MULTI_SELECT", "CONSTRUCTION_OR_VISUAL_SELECTION"], "SHAPE_DIAGRAM", "property set", "shape-property confusion"),
  LINEAR_EQUATION_MODEL: m("ALGEBRA", "form or solve an exact first-degree equation", ["INTEGER_INPUT", "SHORT_STRUCTURED_RESPONSE"], "DATA_TABLE", "unique integer solution or canonical equation", "inverse-operation error"),
  LINEAR_FUNCTION_MODEL: m("ALGEBRA", "evaluate or interpret a linear real-world function", ["INTEGER_INPUT", "DECIMAL_INPUT"], "COORDINATE_GRAPH", "exact function value", "slope-intercept confusion"),
  LINEAR_GRAPH_CONSTRUCTION: m("COORDINATE", "select the line through two exact points", ["CONSTRUCTION_OR_VISUAL_SELECTION"], "COORDINATE_GRAPH", "unique graph choice", "slope or intercept error"),
  LINEAR_GRAPH_RELATION: m("COORDINATE", "use exact slopes to classify two lines", ["SINGLE_CHOICE"], "COORDINATE_GRAPH", "slope or line relation", "parallel-intersection confusion"),
  LINE_RELATION: m("GEOMETRY_2D", "classify intersecting, parallel or perpendicular lines from exact constraints", ["SINGLE_CHOICE"], "SHAPE_DIAGRAM", "unique line relation", "parallel-perpendicular confusion"),
  MONEY_FINANCE: m("FINANCE", "read denominations/transactions and calculate bounded balance, change or simple interest", ["SINGLE_CHOICE", "INTEGER_INPUT", "DECIMAL_INPUT", "TABLE_OR_CHART_RESPONSE"], "DATA_TABLE", "exact currency amount", "income-expense and rate error"),
  NATURAL_NUMBER_STRUCTURE: m("ARITHMETIC", "identify decimal place structure or successor/predecessor properties", ["INTEGER_INPUT"], "PLACE_VALUE_CHART", "whole number or ordering", "place-value confusion"),
  NUMBER_LINE_PLACEMENT: m("ARITHMETIC", "determine a missing whole-number tick", ["INTEGER_INPUT"], "NUMBER_LINE", "whole number", "tick-interval error"),
  PERIMETER_AREA: m("GEOMETRY_2D", "solve a contextual perimeter or area problem", ["INTEGER_INPUT", "SINGLE_CHOICE"], "AREA_MODEL", "exact length or area", "perimeter-area confusion"),
  POINT_LINE_RELATION: m("GEOMETRY_2D", "classify point, segment, ray, collinearity, betweenness or incidence", ["SINGLE_CHOICE", "CONSTRUCTION_OR_VISUAL_SELECTION"], "SHAPE_DIAGRAM", "unique incidence relation", "segment-ray-line confusion"),
  POLYGON_PROPERTIES: m("GEOMETRY_2D", "identify, construct or infer polygon sides, angles, diagonals and sufficient conditions", ["SINGLE_CHOICE", "MULTI_SELECT", "CONSTRUCTION_OR_VISUAL_SELECTION"], "SHAPE_DIAGRAM", "property set, construction or integer angle", "insufficient quadrilateral condition"),
  POLYLINE_PERIMETER: m("MEASUREMENT", "sum every explicitly labelled polyline segment", ["INTEGER_INPUT"], "MEASUREMENT_MODEL", "whole-number length", "omitted-segment error"),
  POLYNOMIAL_REASONING: m("ALGEBRA", "evaluate, test a root, or combine one-variable polynomial coefficients", ["INTEGER_INPUT", "SHORT_STRUCTURED_RESPONSE"], "DATA_TABLE", "exact integer or canonical coefficient string", "term/sign error"),
  PYTHAGORE_APPLICATION: m("GEOMETRY_2D", "recompute a right-triangle side from integer-square data", ["INTEGER_INPUT", "DECIMAL_INPUT"], "SHAPE_DIAGRAM", "exact integer or controlled decimal length", "leg-hypotenuse confusion"),
  QUADRATIC_GRAPH_CONSTRUCTION: m("COORDINATE", "select a parabola from exact vertex and symmetric points", ["CONSTRUCTION_OR_VISUAL_SELECTION"], "COORDINATE_GRAPH", "unique graph choice", "axis or concavity error"),
  RIGHT_TRIANGLE_TRIGONOMETRY: m("GEOMETRY_2D", "apply bounded sine/cosine/tangent ratios in a right triangle", ["DECIMAL_INPUT", "SINGLE_CHOICE"], "SHAPE_DIAGRAM", "controlled rounded ratio or length", "opposite-adjacent-hypotenuse confusion"),
  SHAPE_CLASSIFICATION: m("GEOMETRY_2D", "classify a shape from visible defining properties", ["SINGLE_CHOICE", "CONSTRUCTION_OR_VISUAL_SELECTION"], "SHAPE_DIAGRAM", "unique shape class", "appearance versus defining-property error"),
  SIMILARITY_THALES: m("GEOMETRY_2D", "solve or classify proportional segments and similar triangles", ["INTEGER_INPUT", "DECIMAL_INPUT", "SINGLE_CHOICE"], "SHAPE_DIAGRAM", "exact proportional length or relation", "corresponding-side error"),
  SOLID_NET: m("GEOMETRY_3D", "select a valid net for a named solid", ["CONSTRUCTION_OR_VISUAL_SELECTION"], "SHAPE_DIAGRAM", "unique net choice", "invalid face adjacency"),
  SOLID_PROPERTIES: m("GEOMETRY_3D", "identify exact faces, edges, vertices or named solid elements", ["SINGLE_CHOICE"], "SHAPE_DIAGRAM", "property count or set", "face-edge-vertex confusion"),
  SOLID_SURFACE_VOLUME: m("GEOMETRY_3D", "calculate surface area or volume from complete dimensions", ["DECIMAL_INPUT"], "MEASUREMENT_MODEL", "exact or controlled rounded measure", "surface-volume and formula error"),
  SPATIAL_POSITION: m("GEOMETRY_2D", "determine relative orientation from an explicit scene", ["SINGLE_CHOICE"], "SHAPE_DIAGRAM", "unique spatial relation", "left-right or above-below reversal"),
  SPEED_DISTANCE_TIME: m("MEASUREMENT", "interpret or compute speed, distance and time with explicit units", ["INTEGER_INPUT", "DECIMAL_INPUT"], "DATA_TABLE", "exact rate or distance", "rate-unit confusion"),
  SYMMETRY_REGULARITY: m("GEOMETRY_2D", "identify symmetry axes/centers or rotational order of regular figures", ["SINGLE_CHOICE", "CONSTRUCTION_OR_VISUAL_SELECTION"], "SHAPE_DIAGRAM", "integer order or unique symmetry class", "reflection-rotation confusion"),
  TIME_CALENDAR: m("TIME", "read a clock/calendar or convert bounded time units", ["INTEGER_INPUT"], "MEASUREMENT_MODEL", "time value or ordered day/month", "hour-minute and calendar-order error"),
  TRIANGLE_CONGRUENCE: m("GEOMETRY_2D", "identify congruence from corresponding exact data", ["SINGLE_CHOICE"], "SHAPE_DIAGRAM", "valid congruence case or correspondence", "congruence-similarity confusion"),
  TRIANGLE_PROPERTIES: m("GEOMETRY_2D", "apply angle sum, isosceles or side-inequality constraints", ["INTEGER_INPUT", "SINGLE_CHOICE"], "SHAPE_DIAGRAM", "unique angle/length or truth value", "triangle inequality and angle-sum error"),
  TRIANGLE_SPECIAL_LINES: m("GEOMETRY_2D", "identify or construct altitude, median, bisector or perpendicular bisector", ["SINGLE_CHOICE", "CONSTRUCTION_OR_VISUAL_SELECTION"], "SHAPE_DIAGRAM", "unique special-line class", "special-line definition confusion"),
  UNIT_CONVERSION: m("MEASUREMENT", "convert volume or time dimensions exactly", ["INTEGER_INPUT", "DECIMAL_INPUT"], "MEASUREMENT_MODEL", "exact converted measure", "unit-factor error"),
  UNIT_CONVERSION_MEASUREMENT: m("MEASUREMENT", "read or convert an explicit length, mass, capacity, area, temperature or time unit", ["DECIMAL_INPUT"], "MEASUREMENT_MODEL", "exact scaled measure", "unit-dimension or scale error"),
  UNIT_FRACTION_MODEL: m("ARITHMETIC", "identify a unit fraction from equal parts", ["FRACTION_INPUT", "CONSTRUCTION_OR_VISUAL_SELECTION"], "FRACTION_MODEL", "reduced unit fraction", "numerator-denominator confusion"),
  VIETE_RELATION: m("ALGEBRA", "reconstruct integer roots from exact sum and product", ["MATCHING"], "DATA_TABLE", "ordered root pair", "sum-product sign error"),
  VISUAL_OPERATION_MODEL: m("ARITHMETIC", "select or evaluate the operation represented by object groups", ["SINGLE_CHOICE", "INTEGER_INPUT"], "OBJECT_GROUPS", "whole-number result or operation", "operation-selection error"),
} as const satisfies Record<WaveDCapabilityId, WaveDCapabilityMetadata>;
