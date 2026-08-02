import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Planned = readonly [string, string, string, readonly string[], readonly string[]];
const p = (...value: Planned) => value;

// Product-design inventory only. Runtime routing is authored separately and must
// match this exact outcome-id set; no title/keyword inference is used here.
const PLAN = [
  p("MOET2018-G3-NUM-P030-019", "MIXED_ARITHMETIC_EXPRESSION", "NUMERIC_EXPRESSION_PARENTHESES", ["INTEGER_INPUT"], ["operation order", "whole-number arithmetic"]),
  p("MOET2018-G3-NUM-P030-020", "MIXED_ARITHMETIC_EXPRESSION", "NUMERIC_EXPRESSION_ORDER", ["INTEGER_INPUT"], ["whole-number arithmetic"]),
  p("MOET2018-G4-NUM-P035-006", "ALGEBRAIC_SUBSTITUTION", "MULTIVARIABLE_SUBSTITUTION", ["INTEGER_INPUT"], ["numeric expressions", "variable notation"]),
  p("MOET2018-G4-NUM-P036-020", "RATIONAL_COMPARE_ORDER", "FRACTION_COMPARE_ORDER", ["ORDERING"], ["fraction representation"]),
  p("MOET2018-G4-NUM-P036-021", "FRACTION_COMMON_DENOMINATOR", "COMMON_DENOMINATOR", ["INTEGER_INPUT"], ["fraction equivalence"]),
  p("MOET2018-G4-NUM-P036-022", "FRACTION_EQUIVALENCE", "FRACTION_SIMPLIFY", ["FRACTION_INPUT"], ["factors", "fraction representation"]),
  p("MOET2018-G4-NUM-P036-023", "NUMERIC_OPERATION_PROPERTIES", "DISTRIBUTIVE_PROPERTY", ["SINGLE_CHOICE"], ["multiplication", "addition"]),
  p("MOET2018-G4-NUM-P036-024", "RATIONAL_COMPARE_ORDER", "FRACTION_EXTREME", ["SINGLE_CHOICE"], ["fraction comparison"]),
  p("MOET2018-G4-NUM-P037-025", "FRACTION_APPLICATION", "FRACTION_MULTI_STEP_APPLICATION", ["FRACTION_INPUT", "INTEGER_INPUT"], ["fraction operations", "fraction of a quantity"]),
  p("MOET2018-G4-NUM-P037-026", "RATIONAL_OPERATIONS", "FRACTION_MULTIPLY_DIVIDE", ["FRACTION_INPUT"], ["fraction representation"]),
  p("MOET2018-G4-STA-P038-001", "DATA_SEQUENCE_RECOGNITION", "STATISTICAL_SEQUENCE", ["ORDERING"], ["whole-number comparison"]),
  p("MOET2018-G4-EXP-P040-003", "DATA_INVESTIGATION", "DATA_COLLECTION_ANALYSIS", ["TABLE_OR_CHART_RESPONSE"], ["statistical sequences", "addition"]),
  p("MOET2018-G5-NUM-P041-005", "DECIMAL_REPRESENTATION", "DECIMAL_READ_WRITE", ["DECIMAL_INPUT"], ["place value"]),
  p("MOET2018-G5-NUM-P041-006", "FRACTION_APPLICATION", "FRACTION_MULTI_STEP_APPLICATION", ["FRACTION_INPUT"], ["fraction operations"]),
  p("MOET2018-G5-NUM-P041-007", "MIXED_DECIMAL_FRACTION_REPRESENTATION", "DECIMAL_FRACTION_MIXED_NUMBER", ["FRACTION_INPUT"], ["mixed numbers", "powers of ten"]),
  p("MOET2018-G5-NUM-P041-008", "DECIMAL_REPRESENTATION", "DECIMAL_PLACE_VALUE", ["INTEGER_INPUT", "DECIMAL_INPUT"], ["whole-number place value"]),
  p("MOET2018-G5-NUM-P041-010", "FRACTION_EQUIVALENCE", "FRACTION_SIMPLIFY", ["FRACTION_INPUT"], ["factors"]),
  p("MOET2018-G5-NUM-P041-012", "RATIONAL_OPERATIONS", "FRACTION_FOUR_OPERATIONS", ["FRACTION_INPUT"], ["common denominators"]),
  p("MOET2018-G5-NUM-P041-013", "RATIONAL_OPERATIONS", "FRACTION_ADD_SUB_PRODUCT_DENOMINATOR", ["FRACTION_INPUT"], ["fraction equivalence"]),
  p("MOET2018-G5-NUM-P042-014", "PERCENTAGE_REASONING", "PERCENT_OF_AND_RATE", ["DECIMAL_INPUT", "INTEGER_INPUT"], ["fractions", "division"]),
  p("MOET2018-G5-NUM-P042-015", "DECIMAL_APPLICATION", "DECIMAL_MULTI_STEP_APPLICATION", ["DECIMAL_INPUT"], ["decimal operations"]),
  p("MOET2018-G5-NUM-P042-016", "DECIMAL_ROUNDING", "DECIMAL_ROUND_TO_PLACE", ["DECIMAL_INPUT"], ["decimal place value"]),
  p("MOET2018-G5-NUM-P042-017", "SCALE_REASONING", "MAP_SCALE", ["INTEGER_INPUT", "DECIMAL_INPUT"], ["ratio", "unit conversion"]),
  p("MOET2018-G5-NUM-P042-018", "DECIMAL_OPERATIONS", "DECIMAL_DIVISION", ["DECIMAL_INPUT"], ["division", "decimal place value"]),
  p("MOET2018-G5-NUM-P042-019", "DECIMAL_OPERATIONS", "DECIMAL_ADD_SUBTRACT", ["DECIMAL_INPUT"], ["decimal place value"]),
  p("MOET2018-G5-NUM-P042-020", "DECIMAL_OPERATIONS", "DECIMAL_MULTIPLICATION", ["DECIMAL_INPUT"], ["multiplication", "decimal place value"]),
  p("MOET2018-G5-NUM-P042-021", "DECIMAL_SCALE_OPERATION", "DECIMAL_POWER_OF_TEN", ["DECIMAL_INPUT"], ["decimal place value"]),
  p("MOET2018-G5-NUM-P042-022", "DECIMAL_COMPARE_ORDER", "DECIMAL_COMPARE_ORDER", ["ORDERING"], ["decimal place value"]),
  p("MOET2018-G5-NUM-P042-023", "NUMERIC_OPERATION_PROPERTIES", "DECIMAL_OPERATION_PROPERTY", ["SINGLE_CHOICE"], ["decimal operations"]),
  p("MOET2018-G5-EXP-P046-002", "DATA_INVESTIGATION", "DATA_COLLECTION_ANALYSIS", ["TABLE_OR_CHART_RESPONSE"], ["statistics", "decimal operations"]),
  p("MOET2018-G6-NAA-P049-036", "SIGNED_FRACTION_REPRESENTATION", "SIGNED_FRACTION", ["FRACTION_INPUT"], ["integers", "fraction representation"]),
  p("MOET2018-G7-NAA-P057-024", "RATIO_PROPORTION", "EQUAL_RATIO_SEQUENCE", ["TABLE_OR_CHART_RESPONSE"], ["equivalent ratios"]),
  p("MOET2018-G7-NAA-P057-030", "ALGEBRAIC_SUBSTITUTION", "ALGEBRAIC_EXPRESSION_VALUE", ["FRACTION_INPUT", "INTEGER_INPUT"], ["rational operations", "variable notation"]),
  p("MOET2018-G7-NAA-P057-031", "PROPORTIONAL_REASONING", "DIVIDE_IN_GIVEN_RATIO", ["TABLE_OR_CHART_RESPONSE", "INTEGER_INPUT"], ["equal ratio sequences"]),
  p("MOET2018-G8-NAA-P063-001", "ALGEBRAIC_IDENTITY", "NOTABLE_IDENTITIES", ["MATCHING"], ["polynomial multiplication"]),
  p("MOET2018-G8-NAA-P063-003", "ALGEBRAIC_IDENTITY", "IDENTITY_RECOGNITION", ["SINGLE_CHOICE"], ["algebraic expressions"]),
  p("MOET2018-G8-NAA-P063-007", "POLYNOMIAL_SIMPLIFICATION", "COMBINE_LIKE_TERMS", ["SHORT_STRUCTURED_RESPONSE"], ["monomials", "polynomials"]),
  p("MOET2018-G8-NAA-P064-012", "FUNCTION_GRAPH_RECOGNITION", "FUNCTION_GRAPH", ["CONSTRUCTION_OR_VISUAL_SELECTION"], ["coordinates", "function relation"]),
  p("MOET2018-G8-NAA-P064-018", "FUNCTION_EVALUATION", "FUNCTION_VALUE", ["INTEGER_INPUT", "FRACTION_INPUT"], ["algebraic substitution"]),
  p("MOET2018-G8-NAA-P064-019", "POLYNOMIAL_FACTORIZATION", "IDENTITY_FACTORIZATION", ["SHORT_STRUCTURED_RESPONSE", "SINGLE_CHOICE"], ["notable identities", "common factors"]),
  p("MOET2018-G9-NAA-P071-001", "QUADRATIC_MODELING", "QUADRATIC_APPLICATION", ["INTEGER_INPUT", "DECIMAL_INPUT"], ["quadratic functions", "graph interpretation"]),
  p("MOET2018-G9-NAA-P071-004", "QUADRATIC_GRAPH_SYMMETRY", "QUADRATIC_AXIS", ["DECIMAL_INPUT", "SINGLE_CHOICE"], ["quadratic graph"]),
  p("MOET2018-G9-NAA-P071-006", "RADICAL_TRANSFORMATION", "RADICAL_SIMPLIFICATION", ["SHORT_STRUCTURED_RESPONSE", "SINGLE_CHOICE"], ["square roots", "algebraic expressions"]),
  p("MOET2018-G9-NAA-P072-010", "LINEAR_SYSTEM", "LINEAR_SYSTEM_SOLVE", ["MATCHING", "INTEGER_INPUT"], ["linear equations"]),
  p("MOET2018-G9-NAA-P072-011", "QUADRATIC_EQUATION_SOLVING", "QUADRATIC_SOLVE", ["ORDERING", "INTEGER_INPUT"], ["factoring", "square roots"]),
  p("MOET2018-G9-NAA-P072-012", "RATIONAL_EQUATION_SOLVING", "RATIONAL_EQUATION", ["FRACTION_INPUT", "INTEGER_INPUT"], ["linear equations", "domain restrictions"]),
  p("MOET2018-G9-NAA-P072-013", "PRODUCT_EQUATION_SOLVING", "PRODUCT_EQUATION", ["ORDERING"], ["zero-product property", "linear equations"]),
  p("MOET2018-G9-NAA-P072-014", "LINEAR_SYSTEM_MODELING", "LINEAR_SYSTEM_APPLICATION", ["MATCHING", "INTEGER_INPUT"], ["linear systems", "word-problem modeling"]),
  p("MOET2018-G9-NAA-P072-016", "INEQUALITY_PROPERTY", "INEQUALITY_PROPERTIES", ["SINGLE_CHOICE"], ["number order", "signed multiplication"]),
  p("MOET2018-G9-NAA-P072-017", "LINEAR_SYSTEM_SOLUTION_CHECK", "SYSTEM_SOLUTION_CONCEPT", ["SINGLE_CHOICE"], ["ordered pairs", "linear equations"]),
  p("MOET2018-G9-NAA-P072-018", "QUADRATIC_EQUATION_RECOGNITION", "QUADRATIC_DEFINITION", ["SINGLE_CHOICE"], ["polynomials"]),
  p("MOET2018-G9-NAA-P072-019", "LINEAR_SYSTEM_RECOGNITION", "LINEAR_SYSTEM_DEFINITION", ["SINGLE_CHOICE"], ["linear equations in two variables"]),
  p("MOET2018-G9-NAA-P072-020", "LINEAR_SYSTEM", "LINEAR_SYSTEM_CALCULATOR", ["MATCHING", "INTEGER_INPUT"], ["linear systems"]),
  p("MOET2018-G9-NAA-P072-021", "QUADRATIC_EQUATION_SOLVING", "QUADRATIC_CALCULATOR", ["ORDERING", "INTEGER_INPUT"], ["quadratic equations"]),
  p("MOET2018-G9-NAA-P072-022", "QUADRATIC_MODELING", "QUADRATIC_EQUATION_APPLICATION", ["INTEGER_INPUT", "DECIMAL_INPUT"], ["quadratic equations", "word-problem modeling"]),
  p("MOET2018-G9-NAA-P073-023", "LINEAR_INEQUALITY_SOLVING", "LINEAR_INEQUALITY", ["SHORT_STRUCTURED_RESPONSE", "SINGLE_CHOICE"], ["linear equations", "inequality properties"]),
  p("MOET2018-G9-NAA-P073-025", "LINEAR_INEQUALITY_RECOGNITION", "LINEAR_INEQUALITY_CONCEPT", ["SINGLE_CHOICE"], ["inequalities", "linear expressions"]),
] as const;

const root = process.cwd();
if (!root.endsWith("/PLAVE-PROJECT004")) throw new Error("PROJECT004_ROOT_REQUIRED");
const full = JSON.parse(readFileSync(resolve(root, "artifacts/generator-v2-full-coverage/outcome-matrix.json"), "utf8")) as { rows: { outcomeId: string; wave: string; implementationStatus: string; canonicalVariant: string | null }[] };
const official = JSON.parse(readFileSync(resolve(root, "docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json"), "utf8")) as { outcomes: { id: string; grade: number; officialStrand: string; subdomain: string; conciseParaphrase: string; prerequisiteOutcomeIds: string[]; mappedUnitIds: string[]; pages: { start: number; end: number } }[] };
const officialById = new Map(official.outcomes.map((row) => [row.id, row]));
const currentRows = full.rows.filter((row) => row.wave === "C");
const currentIds = currentRows.map((row) => row.outcomeId).sort();
const plannedIds = PLAN.map(([id]) => id).sort();
if (currentIds.length !== 57 || new Set(currentIds).size !== 57) throw new Error(`WAVE_C_TAXONOMY_COUNT_INVALID:${currentIds.length}`);
if (JSON.stringify(currentIds) !== JSON.stringify(plannedIds)) throw new Error("WAVE_C_PLAN_DOES_NOT_MATCH_LOCKED_TAXONOMY");

const rows = PLAN.map(([outcomeId, capability, taskKind, interactionTypes, dependencies]) => {
  const source = officialById.get(outcomeId);
  const current = currentRows.find((row) => row.outcomeId === outcomeId);
  if (!source || !current) throw new Error(`WAVE_C_SOURCE_MISSING:${outcomeId}`);
  return {
    outcomeId,
    grade: source.grade,
    strand: source.officialStrand,
    domain: source.subdomain,
    curriculumDescription: source.conciseParaphrase,
    sourcePages: source.pages,
    unitIds: source.mappedUnitIds,
    prerequisiteOutcomeIds: source.prerequisiteOutcomeIds,
    existingImplementationState: current.implementationStatus,
    existingCanonicalVariant: current.canonicalVariant,
    missingCapabilityOrContract: current.canonicalVariant ? null : capability,
    plannedCanonicalCapability: capability,
    plannedTaskKind: taskKind,
    interactionTypes,
    mathematicalDependencies: dependencies,
    sharedCapabilityGradeBounds: `Explicit Grade ${source.grade} bounds in outcome contract; sharing is allowed only for identical normalized mathematics.`,
    metadataSufficiency: "SUFFICIENT_FOR_SAFE_PRODUCT_CONTRACT",
    implementationStatus: current.canonicalVariant ? "IMPLEMENTED_REVIEW_REQUIRED" : "BLOCKED_MISSING_CONTRACT",
  };
});

const output = resolve(root, "artifacts/generator-v2-wave-c");
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, "outcome-matrix.json"), `${JSON.stringify({
  schemaVersion: 1,
  sprint: "8C.C",
  taxonomySource: "artifacts/generator-v2-full-coverage/outcome-matrix.json",
  taxonomyBoundary: "EXPLICIT_WAVE_C_FIELD_NO_REPARTITION",
  WAVE_C_OUTCOMES: rows.length,
  existingBaselineOutcomes: rows.filter((row) => row.existingCanonicalVariant !== null).length,
  missingContractsBeforeImplementation: rows.filter((row) => row.missingCapabilityOrContract !== null).length,
  canonicalCapabilitiesPlanned: new Set(rows.map((row) => row.plannedCanonicalCapability)).size,
  metadataInsufficientOutcomes: [],
  rows,
}, null, 2)}\n`);

console.log(`WAVE_C_OUTCOMES=${rows.length}`);
console.log(`WAVE_C_PLANNED_CAPABILITIES=${new Set(rows.map((row) => row.plannedCanonicalCapability)).size}`);
console.log("WAVE_C_METADATA_INSUFFICIENT=0");
