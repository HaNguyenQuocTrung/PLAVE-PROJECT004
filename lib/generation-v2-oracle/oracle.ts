import { canonicalNumber, rational, roundDecimal } from "./exact.ts";
import {
  GeneratorOracleError,
  type OracleAnswer,
  type OracleCandidate,
  type OracleDiagnosticCode,
  type OracleFraction,
  type OracleOption,
  type OracleResult,
} from "./types.ts";

type PublicModel = Readonly<{
  task: string;
  operation: string;
  values: readonly number[];
  fractions: readonly OracleFraction[];
  labels: readonly string[];
  scale: number;
  meta: Readonly<Record<string, unknown>>;
}>;

const forbiddenPublicKeys = [
  "correctResponse",
  "acceptedResponses",
  "privateSolution",
  "solverReceipt",
  "answerKey",
  "correctness",
  "rawSeed",
  "seedFingerprint",
] as const;

function record(value: unknown): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GeneratorOracleError("ORACLE_PUBLIC_DATA_INVALID");
  }
  return value as Readonly<Record<string, unknown>>;
}

function finiteNumbers(value: unknown): readonly number[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new GeneratorOracleError("ORACLE_PUBLIC_DATA_INVALID");
  }
  const output = value.map(Number);
  if (output.some((item) => !Number.isFinite(item))) {
    throw new GeneratorOracleError("ORACLE_PUBLIC_DATA_INVALID");
  }
  return output;
}

function collectPublicNumbers(value: unknown, output: number[] = []): readonly number[] {
  if (typeof value === "number" && Number.isFinite(value)) {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPublicNumbers(item, output);
    return output;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Readonly<Record<string, unknown>>)) {
      collectPublicNumbers(item, output);
    }
  }
  return output;
}

function strings(value: unknown): readonly string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new GeneratorOracleError("ORACLE_PUBLIC_DATA_INVALID");
  }
  return value;
}

function fractions(value: unknown): readonly OracleFraction[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new GeneratorOracleError("ORACLE_PUBLIC_DATA_INVALID");
  }
  return value.map((item) => {
    const candidate = record(item);
    const numerator = Number(candidate.numerator);
    const denominator = Number(candidate.denominator);
    if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator === 0) {
      throw new GeneratorOracleError("ORACLE_MATHEMATICAL_DOMAIN_INVALID");
    }
    return rational(numerator, denominator).toFraction();
  });
}

function publicModel(candidate: OracleCandidate): PublicModel {
  const data = record(candidate.publicData);
  const meta = data.meta === undefined
    ? data.modelEvidence === undefined
      ? {}
      : record(data.modelEvidence)
    : record(data.meta);
  return {
    task: String(data.task ?? data.taskMode ?? ""),
    operation: String(data.operation ?? data.query ?? ""),
    values: finiteNumbers(data.values),
    fractions: fractions(data.fractions ?? data.rationals),
    labels: strings(data.labels),
    scale: Number(data.scale ?? 1),
    meta,
  };
}

function normalizedText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("vi")
    .replaceAll("−", "-")
    .replaceAll("×", "*")
    .replaceAll(",", ".")
    .replace(/\s+/gu, " ")
    .trim();
}

function exactNumericLabelKey(value: string) {
  const compact = normalizedText(value).replace(/\s/gu, "");
  const fractionMatch = compact.match(/^(-?\d+)\/(-?\d+)$/u);
  if (fractionMatch) {
    const denominator = Number(fractionMatch[2]);
    if (denominator === 0) return null;
    const reduced = rational(Number(fractionMatch[1]), denominator).toFraction();
    return `${reduced.numerator}/${reduced.denominator}`;
  }
  const decimalMatch = compact.match(/^(-?\d+)(?:\.(\d+))?$/u);
  if (!decimalMatch) return null;
  const decimalPlaces = decimalMatch[2]?.length ?? 0;
  const denominator = 10 ** decimalPlaces;
  const numerator = Number(`${decimalMatch[1]}${decimalMatch[2] ?? ""}`);
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) return null;
  const reduced = rational(numerator, denominator).toFraction();
  return `${reduced.numerator}/${reduced.denominator}`;
}

function isOracleFraction(value: OracleAnswer): value is Readonly<{
  numerator: number;
  denominator: number;
}> {
  return !Array.isArray(value) && typeof value === "object";
}

function normalizeAnswer(value: OracleAnswer): string {
  if (typeof value === "number") return `n:${canonicalNumber(value)}`;
  if (typeof value === "string") return `s:${normalizedText(value).replace(/\s/gu, "")}`;
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === "string")) return `a:${value.join("|")}`;
    return `m:${[...value]
      .map((item) => `${item.leftId}=${item.rightId}`)
      .sort()
      .join("|")}`;
  }
  if (!isOracleFraction(value)) {
    throw new GeneratorOracleError("ORACLE_PUBLIC_DATA_INVALID");
  }
  const reduced = rational(value.numerator, value.denominator).toFraction();
  return `f:${reduced.numerator}/${reduced.denominator}`;
}

function optionByLabel(options: readonly OracleOption[] | undefined, label: string) {
  const normalized = normalizedText(label);
  const matches = (options ?? []).filter((option) => normalizedText(option.label) === normalized);
  if (matches.length !== 1) throw new GeneratorOracleError("ORACLE_AMBIGUOUS_ANSWER");
  return matches[0]!.id;
}

function optionById(options: readonly OracleOption[] | undefined, id: string) {
  const matches = (options ?? []).filter((option) => option.id === id);
  if (matches.length !== 1) throw new GeneratorOracleError("ORACLE_AMBIGUOUS_ANSWER");
  return matches[0]!.id;
}

function orderedIdsByNumericLabels(candidate: OracleCandidate, descending: boolean) {
  const options = candidate.interaction.options ?? [];
  if (options.length < 2) throw new GeneratorOracleError("ORACLE_INSUFFICIENT_PUBLIC_EVIDENCE");
  const rows = options.map((option) => {
    const match = option.label.match(/-?\d+(?:[.,]\d+)?/u);
    if (!match) throw new GeneratorOracleError("ORACLE_PUBLIC_DATA_INVALID");
    return { id: option.id, value: Number(match[0].replace(",", ".")) };
  });
  if (new Set(rows.map((row) => row.value)).size !== rows.length) {
    throw new GeneratorOracleError("ORACLE_AMBIGUOUS_ANSWER");
  }
  return rows.sort((left, right) => descending ? right.value - left.value : left.value - right.value).map((row) => row.id);
}

function orderedIdsByRationalLabels(candidate: OracleCandidate, descending: boolean) {
  const options = candidate.interaction.options ?? [];
  if (options.length < 2) throw new GeneratorOracleError("ORACLE_INSUFFICIENT_PUBLIC_EVIDENCE");
  const rows = options.map((option) => {
    const match = normalizedText(option.label).match(/^(-?\d+)\s*\/\s*(-?\d+)$/u);
    if (!match) throw new GeneratorOracleError("ORACLE_PUBLIC_DATA_INVALID");
    const value = rational(Number(match[1]), Number(match[2]));
    return { id: option.id, value };
  });
  const canonical = rows.map(({ value }) => `${value.toFraction().numerator}/${value.toFraction().denominator}`);
  if (new Set(canonical).size !== rows.length) throw new GeneratorOracleError("ORACLE_AMBIGUOUS_ANSWER");
  return rows
    .sort((left, right) => {
      const comparison = left.value.compare(right.value);
      return descending ? -comparison : comparison;
    })
    .map((row) => row.id);
}

function isPrime(value: number) {
  if (!Number.isInteger(value) || value < 2) return false;
  for (let divisor = 2; divisor * divisor <= value; divisor += 1) {
    if (value % divisor === 0) return false;
  }
  return true;
}

function roman(value: number) {
  const table = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]] as const;
  let remaining = value;
  let output = "";
  for (const [amount, symbol] of table) {
    while (remaining >= amount) {
      output += symbol;
      remaining -= amount;
    }
  }
  return output;
}

function solveBaseline(candidate: OracleCandidate): OracleAnswer | null {
  const data = candidate.publicData;
  switch (candidate.variantId) {
    case "ADD_SUB_MEANING": {
      const initial = Number(data.initial);
      const change = Number(data.change);
      if (!Number.isFinite(initial) || !Number.isFinite(change)) return null;
      const answer = data.action === "REMOVE" ? initial - change : initial + change;
      return candidate.interaction.type === "SINGLE_CHOICE"
        ? optionByLabel(candidate.interaction.options, String(answer))
        : answer;
    }
    case "MULTIPLY_DIVIDE_FACTS": {
      const groups = Number(data.groups);
      const perGroup = Number(data.perGroup);
      const total = Number(data.total);
      const unknown = String(data.unknown);
      const answer = unknown === "MULTIPLY" ? groups * perGroup : total / perGroup;
      return candidate.interaction.type === "SINGLE_CHOICE"
        ? optionByLabel(candidate.interaction.options, String(answer))
        : answer;
    }
    case "PLACE_VALUE_COMPARE":
      if (String(data.task) === "DIGIT_VALUE") {
        const answer = Math.floor(Number((data.values as number[])[0]) / 1_000) % 10;
        return candidate.interaction.type === "SINGLE_CHOICE" ? optionByLabel(candidate.interaction.options, String(answer)) : answer;
      }
      if (String(data.task) === "MAXIMUM") {
        const answer = Math.max(...finiteNumbers(data.values));
        return candidate.interaction.type === "SINGLE_CHOICE" ? optionByLabel(candidate.interaction.options, String(answer)) : answer;
      }
      return orderedIdsByNumericLabels(candidate, false);
    case "FRACTION_PART_WHOLE": {
      const answer = rational(Number(data.selectedParts), Number(data.totalParts)).toFraction();
      return candidate.interaction.type === "CONSTRUCTION_OR_VISUAL_SELECTION"
        ? optionByLabel(candidate.interaction.options, `${answer.numerator}/${answer.denominator}`)
        : answer;
    }
    case "LINEAR_SYSTEM": {
      const equations = data.equations;
      if (!Array.isArray(equations) || equations.length !== 2) return null;
      const first = record(equations[0]);
      const second = record(equations[1]);
      const a = Number(first.x); const b = Number(first.y); const m = Number(first.value);
      const c = Number(second.x); const d = Number(second.y); const n = Number(second.value);
      const determinant = a * d - b * c;
      if (determinant === 0) throw new GeneratorOracleError("ORACLE_AMBIGUOUS_ANSWER");
      return [{ leftId: "x", rightId: String((m * d - b * n) / determinant) }, { leftId: "y", rightId: String((a * n - m * c) / determinant) }];
    }
    case "GEOMETRY_PROPERTIES": {
      const shape = String(data.shape);
      const ids = shape === "CIRCLE" ? ["radius", "diameter"] : shape === "SQUARE" ? ["four-equal-sides", "four-right-angles"] : ["opposite-equal", "four-right-angles"];
      return ids.map((id) => optionById(candidate.interaction.options, id));
    }
    case "UNIT_CONVERSION": {
      const value = Number(data.value);
      const visual = candidate.visual.data;
      const factor = Number(visual.factor);
      const remainder = Number(data.remainder ?? 0);
      return remainder ? value + remainder / 60 : value * factor;
    }
    case "PERIMETER_AREA": {
      const width = Number(data.width); const height = Number(data.height);
      const task = String(data.task);
      const answer = task === "RECTANGLE_PERIMETER" ? 2 * (width + height)
        : task === "L_SHAPE_AREA" ? width * height - Number(data.cutWidth) * Number(data.cutHeight)
          : width * height;
      return candidate.interaction.type === "SINGLE_CHOICE" ? optionByLabel(candidate.interaction.options, String(answer)) : answer;
    }
    case "CHART_DATA_INTERPRETATION": {
      const chartValues = finiteNumbers(data.values);
      const query = String(data.query);
      const answer = query === "READ_VALUE" ? chartValues[0]!
        : query === "COMPARE_DIFFERENCE" ? Math.abs(chartValues[3]! - chartValues[0]!)
          : chartValues.reduce((sum, value) => sum + value, 0);
      return candidate.interaction.type === "SINGLE_CHOICE" ? optionByLabel(candidate.interaction.options, String(answer)) : answer;
    }
    case "EXPERIMENTAL_PROBABILITY": {
      if (Array.isArray(data.experiments)) {
        const rows = data.experiments.map((item) => record(item));
        const favorable = rows.reduce((sum, row) => sum + Number(row.favorable), 0);
        const trials = rows.reduce((sum, row) => sum + Number(row.total), 0);
        return rational(favorable, trials).toFraction();
      }
      const favorable = Number(data.favorable);
      const trials = Number(data.trials);
      const extraFavorable = Number(data.extraFavorable ?? 0);
      const extraTrials = Number(data.extraTrials ?? 0);
      return rational(favorable + extraFavorable, trials + extraTrials).toFraction();
    }
    case "APPLIED_TWO_STEP": {
      if (Array.isArray(data.quantities)) {
        const quantities = finiteNumbers(data.quantities);
        const relation = String(data.relation);
        const answer = relation === "ADD_ONE_STEP" ? quantities[0]! + quantities[1]!
          : relation === "ADD_THEN_SUBTRACT" ? quantities[0]! + quantities[1]! - quantities[2]!
            : quantities[0]! + (quantities[0]! + quantities[1]!) + quantities[2]!;
        return candidate.interaction.type === "SINGLE_CHOICE" ? optionByLabel(candidate.interaction.options, String(answer)) : answer;
      }
      const initial = Number(data.groupA ?? data.initial);
      const change = Number(data.difference ?? data.change);
      const finalChange = Number(data.used ?? data.finalChange ?? 0);
      const task = String(data.task ?? data.operation);
      if (task === "ADD_ONE_STEP") return initial + change;
      if (task === "ADD_THEN_SUBTRACT") return initial + change - finalChange;
      return initial + (initial + change) + finalChange;
    }
    case "DATA_ERROR_REASONING":
      return optionById(candidate.interaction.options, "reported-total");
    default:
      return null;
  }
}

function solveWaveA(candidate: OracleCandidate, model: PublicModel): OracleAnswer | null {
  const v = model.values;
  const task = model.task;
  const operation = model.operation;
  switch (candidate.variantId) {
    case "NUMBER_RECOGNITION_REPRESENTATION":
    case "PLACE_VALUE_COMPOSE":
      return operation === "PLACE_VALUE" && task === "DIGIT_VALUE" ? v[2]! * v[1]! : v[0]!;
    case "ADD_SUB_CALCULATION":
    case "MENTAL_ARITHMETIC":
    case "WRITTEN_ARITHMETIC":
    case "MULTIPLY_DIVIDE":
    case "MISSING_COMPONENT":
    case "INTEGER_OPERATION":
    case "MIXED_ARITHMETIC_EXPRESSION": {
      if (task === "MISSING_OPERAND" || operation === "+-UNKNOWN") return v[0]!;
      if (task === "INVERSE_CHECK") return v[2]!;
      if (operation === "+-") return v[0]! + v[1]! - v[2]!;
      if (operation === "-+") return v[0]! - v[1]! + v[2]!;
      if (operation === "*+") return v[0]! * v[1]! + v[2]!;
      if (operation === "PARENTHESIZED") return (v[0]! + v[1]!) * v[2]!;
      if (operation === "+") return v[0]! + v[1]!;
      if (operation === "-") return v[0]! - v[1]!;
      if (operation === "*") return v[0]! * v[1]!;
      if (operation === "/") return v[0]! / v[1]!;
      return null;
    }
    case "COMPARE_ORDER":
    case "COMPARE_ORDER_ESTIMATE":
      return task === "ESTIMATE_TENS" || operation === "ROUND_TO_10"
        ? Math.round(v[0]! / 10) * 10
        : orderedIdsByNumericLabels(candidate, operation === "DESC");
    case "ROUND_ESTIMATE":
      return canonicalNumber(Math.round(v[0]! / v[1]!) * v[1]!);
    case "OPERATION_COMPONENTS":
      return model.labels.map((_, index) => ({ leftId: `role-${index}`, rightId: `value-${index}-${String(v[index])}` }));
    case "INTEGER_NUMBER_LINE":
      return task === "READ_MARK" ? v[0]! : task === "OPPOSITE" ? v[1]! : v[2]!;
    case "RATIONAL_NUMBER_REASONING":
      if (task === "COMPARE_FRACTIONS") {
        const relation = v[0]! * v[3]! < v[2]! * v[1]! ? "less" : v[0]! * v[3]! > v[2]! * v[1]! ? "greater" : "equal";
        return optionById(candidate.interaction.options, relation);
      }
      return task === "RECOVER_WHOLE" ? v[2]! : v[2]! * v[0]! / v[1]!;
    case "FRACTION_PERCENT_VALUE":
      return task === "RECOVER_WHOLE" ? v[2]! : v[2]! * v[0]! / v[1]!;
    case "POWER_AND_ROOT":
      if (operation === "SQRT") return Math.sqrt(v[0]!);
      if (operation === "CBRT") return Math.cbrt(v[0]!);
      if (task === "EVALUATE_POWER") return v[0]! ** v[1]!;
      if (task === "MULTIPLY_SAME_BASE") return v[0]! ** (v[1]! + v[2]!);
      return v[0]! ** (v[1]! - v[2]!);
    case "DIVISIBILITY_RULE":
    case "FACTOR_MULTIPLE": {
      const divisor = v[0]!;
      const options = candidate.interaction.options ?? [];
      return options.filter((option) => {
        const value = Number(option.label);
        return task === "SELECT_FACTORS" || task === "SELECT_COMMON_FACTORS" ? divisor % value === 0 : value % divisor === 0;
      }).map((option) => option.id);
    }
    case "PRIME_COMPOSITE":
      return optionById(candidate.interaction.options, isPrime(v[0]!) ? "prime" : "composite");
    case "PRIME_FACTORIZATION":
      return optionById(candidate.interaction.options, "factor-correct");
    case "OPERATION_PROPERTY":
    case "ARITHMETIC_ERROR_DETECTION":
      if (task === "WHOLE_OPERATION_PROPERTY") return null;
      return optionById(candidate.interaction.options, "property-correct");
    case "NUMERICAL_PATTERN":
    case "COUNTING_SEQUENCE":
      return task === "NEXT" ? v[4]! : task === "PREVIOUS" ? v[0]! - v[1]! : v[3]!;
    case "APPLIED_ARITHMETIC":
      return task === "SIGNED_CONTEXT" ? v[0]! - v[1]! + v[2]! : task === "ONE_STEP" ? v[0]! + v[1]! : v[0]! + v[1]! - v[2]!;
    case "ROMAN_NUMERAL":
      if (task === "ROMAN_NATURAL") return null;
      return task === "ROMAN_TO_NATURAL" ? v[0]! : optionByLabel(candidate.interaction.options, roman(v[0]!));
    case "SET_MEMBERSHIP":
      return (candidate.interaction.options ?? []).filter((option) => operation === "MULTIPLES_OF_3" ? Number(option.label) % 3 === 0 : Number(option.label) % 2 === 0).map((option) => option.id);
    case "SHAPE_RECOGNITION":
      return optionByLabel(candidate.interaction.options, String(model.meta.shape) === "CYLINDER" ? "Khối trụ" : "Khối cầu");
    case "DATA_CLASSIFICATION":
    case "DATA_RELATION_REASONING":
      if (task.includes("ORDER")) return orderedIdsByNumericLabels(candidate, false);
      if (task === "SELECT_ABOVE_THRESHOLD") {
        const threshold = Math.round(v.reduce((sum, value) => sum + value, 0) / v.length);
        return (candidate.interaction.options ?? []).filter((option) => Number(option.label.match(/-?\d+/u)?.[0]) > threshold).map((option) => option.id);
      }
      return task === "MISSING_FROM_TOTAL" ? v[0]! + v[1]! + v[2]! : Math.abs(v[1]! - v[0]!);
    case "ALGEBRAIC_EXPRESSION_RECOGNITION":
      return optionById(candidate.interaction.options, "algebra-correct");
    case "RATIONAL_EXPRESSION_OPERATION": {
      const left = rational(v[0]!, v[2]! + v[1]!);
      const right = rational(v[1]!, v[2]! + v[0]!);
      return (task === "EVALUATE_RATIONAL_PRODUCT" ? left.multiply(right) : left.add(right)).toFraction();
    }
    case "POLYNOMIAL_OPERATION":
      if (task === "EVALUATE") return v[0]! * v[6]! ** 2 + v[1]! * v[6]! + v[2]!;
      return optionById(candidate.interaction.options, "polynomial-correct");
    case "RADICAL_EXPRESSION":
      return optionById(candidate.interaction.options, "radical-correct");
    case "INEQUALITY_PROPERTY":
      return optionById(candidate.interaction.options, "inequality-correct");
    case "BANKING_FINANCE":
      if (task === "TRANSACTION_BALANCE") return v[0]! - v[3]!;
      if (task === "FIND_PRINCIPAL") return v[0]!;
      return v[0]! * v[1]! * v[2]! / 100;
    case "MIXED_NUMBER_REPRESENTATION":
      return rational(v[0]! * v[2]! + v[1]!, v[2]!).toFraction();
    case "DIVISION_WITH_REMAINDER":
      return task === "EXACT_DIVISION" ? v[2]! : task === "FIND_REMAINDER" ? v[3]! : v[0]!;
    default:
      return null;
  }
}

function solveWaveB(candidate: OracleCandidate, model: PublicModel): OracleAnswer | null {
  const [a, b, c, d] = model.values;
  const [f1, f2, f3] = model.fractions.map((item) => rational(item.numerator, item.denominator));
  const task = model.task;
  const operation = model.operation;
  switch (candidate.variantId) {
    case "FRACTION_UNIT_QUANTITY":
    case "FRACTION_REPRESENTATION": return f1!.toFraction();
    case "FRACTION_EQUIVALENCE": return f1!.toFraction();
    case "RATIONAL_COMPARE_ORDER": return candidate.interaction.options ? orderedIdsByRationalLabels(candidate, operation === "DESC") : null;
    case "DECIMAL_COMPARE_ORDER": return orderedIdsByNumericLabels(candidate, operation === "DESC");
    case "PERCENTAGE_REASONING": {
      if (task === "PERCENT_OF_QUANTITY") return operation === "RECOVER_WHOLE" ? a! : a! * b! / 100;
      if (task === "STATISTICAL_PERCENT") return c! / a! * 100;
      return operation === "DISCOUNT" ? a! * (100 - b!) / 100 : operation === "INCREASE" ? a! * (100 + b!) / 100 : a! * (100 - b!) / 100 * (100 + b!) / 100;
    }
    case "FRACTION_APPLICATION":
      if (task === "FRACTION_APPLICATION") return (operation === "ADD" ? f1!.add(f2!) : operation === "SUBTRACT" ? f1!.subtract(f2!) : f1!.add(f2!).subtract(f3!)).toFraction();
      return null;
    case "OPPOSITE_NUMBER":
      return f1 ? rational(-f1.toFraction().numerator, f1.toFraction().denominator).toFraction() : -a! / model.scale;
    case "RATIONAL_OPERATIONS":
      return (operation === "ADD" ? f1!.add(f2!) : operation === "SUBTRACT" ? f1!.subtract(f2!) : operation === "MULTIPLY" ? f1!.multiply(f2!) : f1!.divide(f2!)).toFraction();
    case "RATIONAL_OPERATION_ORDER": return f1!.add(f2!).multiply(f3!).toFraction();
    case "DECIMAL_APPLICATION": return operation === "ADD" ? (a! + b!) / model.scale : operation === "SUBTRACT" ? (a! - b!) / model.scale : (a! + b! - c!) / model.scale;
    case "DECIMAL_OPERATIONS": return operation === "ADD" ? (a! + b!) / model.scale : operation === "SUBTRACT" ? (a! - b!) / model.scale : operation === "MULTIPLY_INTEGER" ? a! * c! / model.scale : a! / c! / model.scale;
    case "RATIO_PROPORTION": return task === "PROPORTION_PROPERTY" || operation === "EQUIVALENT_RATIO" ? d! : operation === "PERCENT_RATIO" ? a! / b! * 100 : a! * 100 / b!;
    case "PROPORTIONAL_REASONING": return d!;
    case "RATIONAL_NUMBER_LINE": return f1!.toFraction();
    case "NUMBER_SET_CLASSIFICATION": {
      const expected: Readonly<Record<string, string>> = { RATIONAL_RECOGNITION: "Số hữu tỉ", RATIONAL_SET: "Thuộc ℚ", DECIMAL_CLASSIFICATION: "Số thập phân vô hạn tuần hoàn", REAL_NUMBER_CLASSIFICATION: "Số vô tỉ và là số thực" };
      return optionByLabel(candidate.interaction.options, expected[operation]!);
    }
    case "RATIONAL_POWER": {
      const exponent = operation === "POWER_OF_POWER" ? a! * b! : a!;
      return rational(f1!.toFraction().numerator ** exponent, f1!.toFraction().denominator ** exponent).toFraction();
    }
    case "REAL_NUMBER_ORDER": return task === "ABSOLUTE_VALUE" ? Math.abs(a! / model.scale) : orderedIdsByNumericLabels(candidate, operation === "DESC");
    case "PARITY_CLASSIFICATION": return (candidate.interaction.options ?? []).filter((option) => Number(option.label) % 2 === (operation === "SELECT_EVEN" ? 0 : 1)).map((option) => option.id);
    case "DECIMAL_REPRESENTATION": return a! / model.scale;
    case "DECIMAL_ROUNDING": return canonicalNumber(Math.round(a! / b!) * b! / model.scale);
    case "DECIMAL_SCALE_OPERATION": return operation === "MULTIPLY" ? a! * c! / model.scale : a! / c! / model.scale;
    case "SIGNED_FRACTION_REPRESENTATION": return f1!.toFraction();
    case "SYMMETRY_RECOGNITION": {
      const symmetry = String(model.meta.symmetry);
      return optionById(candidate.interaction.options, symmetry === "VERTICAL_AXIS" ? "vertical" : symmetry === "HORIZONTAL_AXIS" ? "horizontal" : "center");
    }
    case "NUMERIC_OPERATION_PROPERTIES":
      return optionById(candidate.interaction.options, "correct");
    case "OPERATION_PROPERTY":
      return optionById(candidate.interaction.options, "correct");
    case "ROMAN_NUMERAL":
      if (task !== "ROMAN_NATURAL") return null;
      return operation === "ROMAN_TO_NATURAL"
        ? candidate.interaction.type === "SINGLE_CHOICE" ? optionByLabel(candidate.interaction.options, String(a)) : a!
        : optionByLabel(candidate.interaction.options, roman(a!));
    default:
      return null;
  }
}

function solveWaveC(candidate: OracleCandidate, model: PublicModel): OracleAnswer | null {
  const v = model.values;
  const r = model.fractions.map((item) => rational(item.numerator, item.denominator));
  const operation = model.operation;
  const task = model.task;
  let semantic: OracleAnswer | null = null;
  switch (candidate.variantId) {
    case "MIXED_ARITHMETIC_EXPRESSION":
      if (!task.startsWith("NUMERIC_EXPRESSION")) return null;
      semantic = operation === "ADD_THEN_MULTIPLY_PAREN" ? (v[0]! + v[1]!) * v[2]!
        : operation === "SUBTRACT_THEN_DIVIDE_PAREN" ? (v[0]! - v[1]!) / v[2]!
          : operation === "MULTIPLY_THEN_ADD_PAREN" ? v[0]! * (v[1]! + v[2]!)
            : operation === "MULTIPLY_THEN_ADD" ? v[0]! + v[1]! * v[2]!
              : operation === "DIVIDE_THEN_SUBTRACT" ? v[0]! / v[1]! - v[2]!
                : v[0]! * v[1]! - v[2]!;
      break;
    case "ALGEBRAIC_SUBSTITUTION": {
      const count = model.labels.length;
      if (count < 1 || v.length < count * 2 + 1) {
        throw new GeneratorOracleError("ORACLE_INSUFFICIENT_PUBLIC_EVIDENCE");
      }
      const assignments = v.slice(count, count * 2);
      semantic = v.slice(0, count).reduce((sum, coefficient, index) => sum + coefficient * assignments[index]!, v[count * 2] ?? 0);
      break;
    }
    case "RATIONAL_COMPARE_ORDER": {
      if (!task.includes("RATIONAL") && !task.includes("FRACTION")) return null;
      const rows = r.map((value, index) => ({ value, label: model.labels[index]! })).sort((a, b) => a.value.compare(b.value));
      if (operation === "MAX" || operation === "MIN") {
        const chosen = operation === "MAX" ? rows.at(-1)! : rows[0]!;
        return optionByLabel(candidate.interaction.options, `${chosen.value.toFraction().numerator}/${chosen.value.toFraction().denominator}`);
      }
      semantic = (operation === "DESC" ? rows.reverse() : rows).map((row) => row.label);
      break;
    }
    case "FRACTION_COMMON_DENOMINATOR": semantic = v[3]!; break;
    case "FRACTION_EQUIVALENCE":
      if (r.length < 2) return null;
      semantic = r[1]!.toFraction(); break;
    case "NUMERIC_OPERATION_PROPERTIES": {
      if (task !== "DISTRIBUTIVE_PROPERTY" && task !== "DECIMAL_OPERATION_PROPERTY") return null;
      const [a, b, c] = v; const text = (n: number) => model.scale === 1 ? String(n) : String(n / model.scale).replace(".", ",");
      semantic = operation === "DISTRIBUTIVE"
        ? `${text(a!)}×(${text(b!)}+${text(c!)}) = ${text(a!)}×${text(b!)} + ${text(a!)}×${text(c!)}`
        : `(${text(a!)}+${text(b!)})+${text(c!)} = ${text(a!)}+(${text(b!)}+${text(c!)})`;
      break;
    }
    case "FRACTION_APPLICATION": {
      if (!task.startsWith("FRACTION_MULTI_STEP")) return null;
      const whole = rational(v[0]!, 1);
      const computed = operation === "FRACTION_OF_QUANTITY" ? whole.multiply(r[0]!)
        : operation === "FRACTION_REMAINING" ? whole.multiply(rational(1, 1).subtract(r[0]!))
          : r[0]!.add(r[1]!).subtract(rational(1, 10));
      semantic = computed.toFraction();
      break;
    }
    case "RATIONAL_OPERATIONS":
      if (!task.includes("RATIONAL_OPERATION") && !task.includes("FRACTION_OPERATION")) return null;
      semantic = (operation === "ADD" ? r[0]!.add(r[1]!) : operation === "SUBTRACT" ? r[0]!.subtract(r[1]!) : operation === "MULTIPLY" ? r[0]!.multiply(r[1]!) : r[0]!.divide(r[1]!)).toFraction();
      break;
    case "DATA_SEQUENCE_RECOGNITION": semantic = v.map((value, index) => ({ value, label: model.labels[index]! })).sort((a, b) => operation === "DESC" ? b.value - a.value : a.value - b.value).map((row) => row.label); break;
    case "DATA_INVESTIGATION": semantic = operation === "TOTAL" ? v.reduce((sum, value) => sum + value, 0) : operation === "RANGE" ? Math.max(...v) - Math.min(...v) : v[0]! + v[1]! - v[2]! - v[3]!; break;
    case "DECIMAL_REPRESENTATION":
      if (!task.startsWith("DECIMAL_")) return null;
      semantic = operation === "DIGIT_AT_PLACE" ? Math.floor(v[0]! / (model.scale / 10 ** v[1]!)) % 10 : roundDecimal(v[0]! / model.scale, Math.log10(model.scale)); break;
    case "MIXED_DECIMAL_FRACTION_REPRESENTATION": semantic = r[0]!.toFraction(); break;
    case "PERCENTAGE_REASONING":
      if (!task.startsWith("PERCENT_OF_AND_RATE")) return null;
      semantic = operation === "PERCENT_OF_WHOLE" ? v[2]! : operation === "RATE_FROM_PART" ? v[2]! * 100 / v[0]! : v[2]! * 100 / v[1]!; break;
    case "DECIMAL_APPLICATION":
      if (!task.startsWith("DECIMAL_APPLICATION")) return null;
      semantic = roundDecimal((operation === "ADD" ? v[0]! + v[1]! : operation === "SUBTRACT" ? v[0]! - v[1]! : v[0]! + v[1]! - v[2]!) / model.scale, Math.log10(model.scale)); break;
    case "DECIMAL_ROUNDING": {
      if (!task.startsWith("DECIMAL_ROUND")) return null;
      const unit = model.scale / v[1]!;
      semantic = roundDecimal(Math.round(v[0]! / unit) * unit / model.scale, Math.log10(v[1]!)); break;
    }
    case "SCALE_REASONING": semantic = operation === "MAP_FROM_REAL" ? v[0]! : v[2]!; break;
    case "DECIMAL_OPERATIONS": {
      if (!task.startsWith("DECIMAL_")) return null;
      if (task === "DECIMAL_OPERATIONS") return null;
      if (operation === "ADD") semantic = (v[0]! + v[1]!) / model.scale;
      else if (operation === "SUBTRACT") semantic = (v[0]! - v[1]!) / model.scale;
      else if (operation === "MULTIPLY") semantic = v[0]! * v[1]! / (model.scale * model.scale);
      else semantic = v[0]! / v[1]!;
      semantic = roundDecimal(semantic as number, 4); break;
    }
    case "DECIMAL_SCALE_OPERATION": semantic = operation === "MULTIPLY" ? v[0]! / model.scale * v[1]! : v[0]! / model.scale / v[1]!; break;
    case "DECIMAL_COMPARE_ORDER":
      if (!task.startsWith("DECIMAL_COMPARE")) return null;
      semantic = v.map((value, index) => ({ value, label: model.labels[index]! })).sort((a, b) => operation === "DESC" ? b.value - a.value : a.value - b.value).map((row) => row.label); break;
    case "SIGNED_FRACTION_REPRESENTATION": semantic = r[1]!.toFraction(); break;
    case "RATIO_PROPORTION":
      if (!task.startsWith("EQUAL_RATIO")) return null;
      semantic = v[3]!; break;
    case "PROPORTIONAL_REASONING":
      if (!task.startsWith("PROPORTIONAL_") && task !== "DIVIDE_IN_GIVEN_RATIO") return null;
      semantic = operation === "RIGHT_PART" ? v[4]! : v[3]!; break;
    case "ALGEBRAIC_IDENTITY":
      semantic = operation === "MATCH_IDENTITIES"
        ? [{ leftId: "square-sum", rightId: "r1" }, { leftId: "square-difference", rightId: "r2" }, { leftId: "difference-squares", rightId: "r3" }]
        : "(x+3)² = x²+6x+9 với mọi x";
      break;
    case "POLYNOMIAL_SIMPLIFICATION": {
      const coefficient = v[0]! + v[2]!;
      const constant = v[1]! + v[3]!;
      const variable = operation === "LINEAR" ? "x" : "x^2";
      const variableTerm = coefficient === 0
        ? ""
        : `${coefficient < 0 ? "-" : ""}${Math.abs(coefficient) === 1 ? "" : Math.abs(coefficient)}${variable}`;
      semantic = variableTerm === ""
        ? String(constant)
        : constant === 0
          ? variableTerm
          : `${variableTerm}${constant > 0 ? "+" : ""}${constant}`;
      break;
    }
    case "FUNCTION_GRAPH_RECOGNITION": semantic = `Đường thẳng y=${v[0]}x${v[1]! >= 0 ? "+" : ""}${v[1]}`; break;
    case "FUNCTION_EVALUATION": semantic = operation === "QUADRATIC_FUNCTION" ? v[0]! * v[2]! ** 2 + v[1]! : v[0]! * v[2]! + v[1]!; break;
    case "POLYNOMIAL_FACTORIZATION": semantic = operation === "COMMON_FACTOR" ? `${v[0]}(x+${v[1]})` : operation === "DIFFERENCE_SQUARES" ? `(x-${v[1]})(x+${v[1]})` : `(x+${v[1]})^2`; break;
    case "QUADRATIC_MODELING": semantic = v[1]!; break;
    case "QUADRATIC_GRAPH_SYMMETRY": semantic = v[3]!; break;
    case "RADICAL_TRANSFORMATION": semantic = operation === "RATIONALIZE_SIMPLE" ? `sqrt(${v[1]})/${v[1]}` : `${v[0]}sqrt(${v[1]})`; break;
    case "LINEAR_SYSTEM": case "LINEAR_SYSTEM_MODELING": {
      if (v.length < 6) return null;
      const determinant = v[0]! * v[4]! - v[1]! * v[3]!;
      if (determinant === 0) throw new GeneratorOracleError("ORACLE_AMBIGUOUS_ANSWER");
      semantic = [{ leftId: "x", rightId: String((v[2]! * v[4]! - v[1]! * v[5]!) / determinant) }, { leftId: "y", rightId: String((v[0]! * v[5]! - v[2]! * v[3]!) / determinant) }]; break;
    }
    case "LINEAR_SYSTEM_SOLUTION_CHECK": {
      const determinant = v[0]! * v[4]! - v[1]! * v[3]!;
      const x = (v[2]! * v[4]! - v[1]! * v[5]!) / determinant; const y = (v[0]! * v[5]! - v[2]! * v[3]!) / determinant;
      semantic = `(${x}; ${y})`; break;
    }
    case "QUADRATIC_EQUATION_SOLVING": {
      const discriminant = v[1]! ** 2 - 4 * v[0]! * v[2]!; if (discriminant < 0) throw new GeneratorOracleError("ORACLE_MATHEMATICAL_DOMAIN_INVALID");
      const root = Math.sqrt(discriminant); const roots = [(-v[1]! - root) / (2 * v[0]!), (-v[1]! + root) / (2 * v[0]!)].sort((a, b) => a - b);
      semantic = roots[0] === roots[1] && candidate.interaction.type === "INTEGER_INPUT" ? roots[0]! : roots.map((value) => String(value)); break;
    }
    case "RATIONAL_EQUATION_SOLVING": semantic = v[1]!; break;
    case "PRODUCT_EQUATION_SOLVING": semantic = [v[4]!, v[5]!].sort((a, b) => a - b).map(String); break;
    case "INEQUALITY_PROPERTY":
      if (task !== "INEQUALITY_PROPERTIES") return null;
      semantic = operation === "MULTIPLY_NEGATIVE" ? `${v[0]! * v[2]!} > ${v[1]! * v[2]!}` : `${v[0]! * v[2]!} < ${v[1]! * v[2]!}`; break;
    case "QUADRATIC_EQUATION_RECOGNITION": semantic = `${v[0]}x² ${v[1]! >= 0 ? "+" : "−"} ${Math.abs(v[1]!)}x ${v[2]! >= 0 ? "+" : "−"} ${Math.abs(v[2]!)} = 0`; break;
    case "LINEAR_SYSTEM_RECOGNITION": semantic = `{ ${v[0]}x ${v[1]! >= 0 ? "+" : "−"} ${Math.abs(v[1]!)}y = ${v[2]}; x−y=1 }`; break;
    case "LINEAR_INEQUALITY_SOLVING": {
      const inverse: Readonly<Record<string, string>> = { "<": ">", "<=": ">=", ">": "<", ">=": "<=" };
      const relation = String(model.meta.relation); const finalRelation = v[0]! < 0 ? inverse[relation]! : relation;
      semantic = `x${finalRelation}${(v[2]! - v[1]!) / v[0]!}`; break;
    }
    case "LINEAR_INEQUALITY_RECOGNITION": semantic = `${v[0]}x−${v[1]}<0`; break;
  }
  if (semantic === null) return null;
  // Wave C's numeric table response keeps the canonical numeric value; its
  // public inputMode is numeric rather than Wave E's textual table grammar.
  if (candidate.interaction.type === "TABLE_OR_CHART_RESPONSE") return semantic;
  return semanticToAnswer(candidate, semantic);
}

const oracleShapeLabels: Readonly<Record<string, string>> = {
  CIRCLE: "hình tròn", SQUARE: "hình vuông", RECTANGLE: "hình chữ nhật", TRIANGLE: "hình tam giác", QUADRILATERAL: "hình tứ giác",
  TRAPEZOID: "hình thang", PARALLELOGRAM: "hình bình hành", RHOMBUS: "hình thoi", REGULAR_HEXAGON: "hình lục giác đều", ISOSCELES_TRAPEZOID: "hình thang cân",
  ACUTE_TRIANGLE: "tam giác nhọn", RIGHT_TRIANGLE: "tam giác vuông", OBTUSE_TRIANGLE: "tam giác tù", EQUILATERAL_TRIANGLE: "tam giác đều",
  CUBE: "hình lập phương", RECTANGULAR_PRISM: "hình hộp chữ nhật", TRIANGULAR_PRISM: "lăng trụ tam giác", QUADRILATERAL_PRISM: "lăng trụ tứ giác",
  TRIANGULAR_PYRAMID: "hình chóp tam giác", SQUARE_PYRAMID: "hình chóp tứ giác đều", CONE: "hình nón", CYLINDER: "hình trụ", SPHERE: "hình cầu",
};

function solveWaveD(candidate: OracleCandidate, model: PublicModel): OracleAnswer | null {
  const v = model.values; const op = model.operation; const meta = model.meta;
  let semantic: OracleAnswer | null = null;
  switch (candidate.variantId) {
    case "ANGLE_MEASUREMENT": semantic = op === "READ_ANGLE" ? v[0]! : v[0]! < 90 ? "góc nhọn" : v[0] === 90 ? "góc vuông" : v[0]! < 180 ? "góc tù" : "góc bẹt"; break;
    case "APPLIED_GEOMETRY_MEASUREMENT": semantic = op === "RECTANGLE_PERIMETER" ? 2 * (v[0]! + v[1]!) : v[0]! * v[1]!; break;
    case "APPLIED_MEASUREMENT_MODEL": semantic = op === "SELECT_MEASURE" ? v[0]! : op === "COMBINE_MEASURES" ? v[0]! + v[1]! : roundDecimal((v[0]! + v[1]!) / v[2]!, 3); break;
    case "APPLIED_RATIONAL_REASONING": semantic = rational(v[0]!, v[1]!).toFraction(); break;
    case "AREA_PERIMETER": semantic = op === "RECTANGLE_AREA" ? v[0]! * v[1]! : op === "TRIANGLE_AREA" ? v[0]! * v[1]! / 2 : (v[0]! + v[2]!) * v[1]! / 2; break;
    case "CIRCLE_ANGLE_RELATION": semantic = op === "IDENTIFY_CIRCLE_ANGLE" ? "góc nội tiếp" : op === "CENTRAL_FROM_INSCRIBED" ? v[0]! * 2 : v[0]! / 2; break;
    case "CIRCLE_INSCRIBED_CIRCUMSCRIBED":
      semantic = op === "INCENTER_DEFINITION" ? "giao điểm các đường phân giác" : op === "CIRCUMCENTER_DEFINITION" ? "giao điểm các đường trung trực" : op === "CYCLIC_QUADRILATERAL_ANGLE" ? 180 - v[1]! : op === "EQUILATERAL_INRADIUS" ? roundDecimal(v[0]! * Math.sqrt(3) / 6, 2) : roundDecimal(v[0]! / 2, 2); break;
    case "CIRCLE_MEASURE": {
      const exact = op === "CIRCUMFERENCE" ? 2 * 3.14 * v[0]!
        : op === "CIRCLE_AREA" ? 3.14 * v[0]! ** 2
          : op === "ARC_LENGTH" ? 2 * 3.14 * v[0]! * v[1]! / 360
            : op === "SECTOR_AREA" ? 3.14 * v[0]! ** 2 * v[1]! / 360
              : 3.14 * (v[0]! ** 2 - v[2]! ** 2);
      semantic = roundDecimal(exact, 2); break;
    }
    case "CIRCLE_RELATION":
      semantic = op === "TANGENT_PROPERTY" ? ["bán kính vuông góc tiếp tuyến", "hai tiếp tuyến từ một điểm bằng nhau"] : op === "CIRCLE_SYMMETRY" ? ["tâm là tâm đối xứng", "mọi đường kính là trục đối xứng"] : op === "CHORD_DIAMETER_COMPARE" ? "đường kính không ngắn hơn mọi dây" : op === "LINE_CIRCLE_POSITION" ? (v[2]! < v[0]! ? "cắt nhau" : v[2] === v[0] ? "tiếp xúc" : "không giao nhau") : (v[2] === v[0]! + v[1]! || v[2] === Math.abs(v[0]! - v[1]!) ? "tiếp xúc" : v[2]! > v[0]! + v[1]! ? "không giao nhau" : "cắt nhau"); break;
    case "COORDINATE_POINT": semantic = [{ leftId: "x", rightId: String(v[0]) }, { leftId: "y", rightId: String(v[1]) }]; break;
    case "DIRECT_MEASUREMENT_ESTIMATION": semantic = v[0]!; break;
    case "DIVISION_REMAINDER": { const quotient = Math.floor(v[0]! / v[1]!); const remainder = v[0]! % v[1]!; semantic = candidate.interaction.type === "MATCHING" ? [{ leftId: "q", rightId: String(quotient) }, { leftId: "r", rightId: String(remainder) }] : remainder; break; }
    case "EARLY_ARITHMETIC_APPLICATION": semantic = op === "COUNT" ? v[0]! : v[0]! + v[1]!; break;
    case "FUNCTION_MODEL_RECOGNITION": semantic = Boolean(meta.repeatedInput) ? "không phải hàm số" : "là hàm số"; break;
    case "GEOMETRIC_CONSTRUCTION_PLAN": semantic = ["Xác định dữ kiện và dụng cụ", "Tạo điểm hoặc đường chuẩn", "Dựng quan hệ hình học cần có", "Kiểm tra hình bằng định nghĩa"]; break;
    case "GEOMETRIC_PROOF_REASONING": semantic = ["Ghi giả thiết", "Nêu định nghĩa hoặc định lí dùng", "Suy ra quan hệ trung gian", "Kết luận điều cần chứng minh"]; break;
    case "LINEAR_EQUATION_MODEL": semantic = (v[2]! - v[1]!) / v[0]!; break;
    case "LINEAR_FUNCTION_MODEL": semantic = v[0]! * v[2]! + v[1]!; break;
    case "LINEAR_GRAPH_CONSTRUCTION": semantic = "đồ thị qua (0; b) và (2; 2a+b)"; break;
    case "LINEAR_GRAPH_RELATION": semantic = op === "READ_SLOPE" ? v[0]! : v[0] === v[2] ? "song song" : "cắt nhau"; break;
    case "LINE_RELATION": semantic = String(meta.relation) === "PARALLEL" ? "song song" : String(meta.relation) === "PERPENDICULAR" ? "vuông góc" : "cắt nhau"; break;
    case "MONEY_FINANCE": {
      if (op === "DENOMINATION") semantic = `${v[0]!.toLocaleString("vi-VN")} đồng`;
      else if (op === "CHANGE") semantic = v[2]! - v[0]! * v[1]!;
      else if (op === "PURCHASE_TOTAL") semantic = v[0]! * v[1]!;
      else if (op === "MAX_QUANTITY") semantic = Math.floor(v[0]! / v[1]!);
      else if (op === "PROFIT_OR_LOSS") semantic = v[1]! - v[0]!;
      else if (op === "SIMPLE_INTEREST") semantic = roundDecimal(v[0]! * v[1]! / 100, 0);
      else if (op === "INTEREST_RATE") semantic = roundDecimal(v[1]! / v[0]! * 100, 2);
      else if (op === "DEBT_BALANCE") semantic = v[0]! - v[1]!;
      else if (op === "TRANSACTION_BALANCE" || op === "BANK_STATEMENT_BALANCE") semantic = v[0]! + v[1]! - v[2]!;
      else if (op === "PAYMENT_METHOD") {
        const situation = normalizedText(candidate.publicPrompt);
        semantic = situation.includes("tiền mặt") || situation.includes("chợ nhỏ") ? "tiền mặt" : situation.includes("quẹt thẻ") ? "thẻ ngân hàng" : situation.includes("đơn hàng trực tuyến") || situation.includes("đặt vé tàu") ? "thẻ hoặc ví điện tử có xác thực" : "chuyển khoản ngân hàng";
      }
      break;
    }
    case "NATURAL_NUMBER_STRUCTURE": semantic = op === "SUCCESSOR" ? v[0]! + 1 : Math.floor(v[0]! / v[1]!) % 10 * v[1]!; break;
    case "NUMBER_LINE_PLACEMENT": semantic = v[0]! + v[1]! * v[2]!; break;
    case "POINT_LINE_RELATION": semantic = String(meta.relation).toUpperCase() === "MIDPOINT" ? "trung điểm" : ({ COLLINEAR: "thẳng hàng", BETWEEN: "nằm giữa", RAY: "tia", INCIDENT: "thuộc đường thẳng" } as Readonly<Record<string, string>>)[String(meta.relation)] ?? null; break;
    case "POLYGON_PROPERTIES": {
      const shape = String(meta.shape); const name = oracleShapeLabels[shape] ?? shape;
      const properties: Readonly<Record<string, string>> = { TRIANGLE: "có 3 cạnh", EQUILATERAL_TRIANGLE: "3 cạnh bằng nhau", QUADRILATERAL: "có 4 cạnh", TRAPEZOID: "có một cặp cạnh đối song song", SQUARE: "4 cạnh bằng nhau và 4 góc vuông", RECTANGLE: "4 góc vuông và hai cặp cạnh đối bằng nhau", RHOMBUS: "4 cạnh bằng nhau", PARALLELOGRAM: "hai cặp cạnh đối song song", REGULAR_HEXAGON: "6 cạnh bằng nhau", ISOSCELES_TRAPEZOID: "hai đường chéo bằng nhau" };
      semantic = op === "SELECT_GRID_DRAWING" ? `${name} có các đỉnh đúng trên giao điểm lưới` : op === "SELECT_HEXAGON_ASSEMBLY" ? "ghép 6 tam giác đều quanh một đỉnh chung" : op === "QUADRILATERAL_ANGLE_SUM" ? "tổng bốn góc bằng 360°" : op === "IDENTIFY_SUFFICIENT_CONDITION" ? String(meta.sufficientCondition) : properties[shape]!; break;
    }
    case "POLYLINE_PERIMETER": semantic = v.reduce((sum, value) => sum + value, 0); break;
    case "POLYNOMIAL_REASONING": { const value = v[0]! * v[3]! ** 2 + v[1]! * v[3]! + v[2]!; semantic = op === "TEST_POLYNOMIAL_ROOT" ? (value === 0 ? "là nghiệm" : "không là nghiệm") : op === "COMBINE_POLYNOMIALS" ? `${v[0]}x²${v[1]! >= 0 ? "+" : ""}${v[1]}x${v[2]! >= 0 ? "+" : ""}${v[2]}` : value; break; }
    case "PYTHAGORE_APPLICATION": semantic = op === "FIND_HYPOTENUSE" ? roundDecimal(Math.sqrt(v[0]! ** 2 + v[1]! ** 2), 8) : roundDecimal(Math.sqrt(v[1]! ** 2 - v[0]! ** 2), 8); break;
    case "QUADRATIC_GRAPH_CONSTRUCTION": semantic = "parabol có đỉnh và chiều mở đúng"; break;
    case "RIGHT_TRIANGLE_TRIGONOMETRY": semantic = op === "SINE_RATIO" ? rational(v[0]!, v[2]!).toFraction() : op === "COSINE_RATIO" ? rational(v[1]!, v[2]!).toFraction() : roundDecimal(Math.sqrt(v[1]! ** 2 - v[0]! ** 2), 8); break;
    case "SHAPE_CLASSIFICATION": semantic = oracleShapeLabels[String(meta.shape)]!; break;
    case "SIMILARITY_THALES": semantic = op === "SIMILARITY_RATIO" ? v[1]! / v[0]! : v[3]! * v[2]! / v[0]!; break;
    case "SOLID_NET": semantic = `hình khai triển hợp lệ của ${oracleShapeLabels[String(meta.shape)]}`; break;
    case "SOLID_PROPERTIES": semantic = ({ CUBE: "6 mặt vuông, 12 cạnh, 8 đỉnh", RECTANGULAR_PRISM: "6 mặt, 12 cạnh, 8 đỉnh", TRIANGULAR_PRISM: "2 đáy tam giác song song", QUADRILATERAL_PRISM: "2 đáy tứ giác song song", TRIANGULAR_PYRAMID: "đáy tam giác và 3 mặt bên", SQUARE_PYRAMID: "đáy vuông và 4 mặt bên", CONE: "một đáy tròn và một đỉnh", CYLINDER: "hai đáy tròn song song", SPHERE: "mọi điểm trên mặt cầu cách tâm bằng bán kính" } as Readonly<Record<string, string>>)[String(meta.shape)]!; break;
    case "SOLID_SURFACE_VOLUME": {
      const [a, b, c, d] = v; const shape = String(meta.shape);
      semantic = op === "VOLUME"
        ? shape === "CYLINDER" ? roundDecimal(3.14 * a! ** 2 * b!, 2)
          : shape === "CONE" ? roundDecimal(3.14 * a! ** 2 * b! / 3, 2)
            : shape === "SPHERE" ? roundDecimal(4 * 3.14 * a! ** 3 / 3, 2)
              : shape === "SQUARE_PYRAMID" ? roundDecimal(a! ** 2 * b! / 3, 2)
                : shape === "TRIANGULAR_PRISM" ? roundDecimal(a! * b! * c! / 2, 2)
                  : a! * b! * c!
        : shape === "CYLINDER" ? roundDecimal(2 * 3.14 * a! * (a! + b!), 2)
          : shape === "CONE" ? roundDecimal(3.14 * a! * (a! + c!), 2)
            : shape === "SPHERE" ? roundDecimal(4 * 3.14 * a! ** 2, 2)
              : shape === "SQUARE_PYRAMID" ? roundDecimal(a! ** 2 + 2 * a! * c!, 2)
                : shape === "TRIANGULAR_PRISM" ? roundDecimal(a! * b! + (a! + b! + d!) * c!, 2)
                  : 2 * (a! * b! + b! * c! + a! * c!); break;
    }
    case "SPATIAL_POSITION": semantic = ({ ABOVE: "ở trên", BELOW: "ở dưới", LEFT: "bên trái", RIGHT: "bên phải", BETWEEN: "ở giữa", IN_FRONT: "ở trước" } as Readonly<Record<string, string>>)[String(meta.relation)]!; break;
    case "SPEED_DISTANCE_TIME": semantic = op === "READ_SPEED_UNIT" ? "km/h" : v[0]! * v[1]!; break;
    case "SYMMETRY_REGULARITY": semantic = v[0]!; break;
    case "TIME_CALENDAR": semantic = op === "READ_CLOCK" ? `${v[0]}:${String(v[1]).padStart(2, "0")}` : op === "WEEKDAY_SEQUENCE" || op === "WEEKDAY_OFFSET" ? (v[0]! - 1 + v[1]!) % 7 + 1 : op === "MONTH_DAYS" ? (v[0] === 2 ? 28 : [4, 6, 9, 11].includes(v[0]!) ? 30 : 31) : op === "MONTH_SEQUENCE" ? (v[0]! - 1 + v[1]!) % 12 + 1 : op === "HOUR_DAY_RELATION" ? v[0]! * v[1]! : v[0]! * 100; break;
    case "TRIANGLE_CONGRUENCE": semantic = String(meta.criterion); break;
    case "TRIANGLE_PROPERTIES": semantic = op === "TRIANGLE_ANGLE_SUM" ? 180 - v[0]! - v[1]! : op === "TRIANGLE_INEQUALITY" ? "tạo được tam giác" : op === "ISOSCELES_BASE_ANGLE" ? (180 - v[0]!) / 2 : "đoạn vuông góc"; break;
    case "TRIANGLE_SPECIAL_LINES": semantic = ({ ALTITUDE: "đường cao", PERPENDICULAR_BISECTOR: "đường trung trực", MEDIAN: "đường trung tuyến", ANGLE_BISECTOR: "đường phân giác", ANGLE_BISECTOR_CONSTRUCTION: "dựng tia phân giác bằng hai cung tròn", SOFTWARE_CONSTRUCTION: "dựng và kiểm tra đường đặc biệt bằng công cụ hình học", INTERNAL_ANGLE_BISECTOR_THEOREM: "đường phân giác chia cạnh đối diện theo tỉ lệ hai cạnh kề" } as Readonly<Record<string, string>>)[String(meta.line)]!; break;
    case "UNIT_CONVERSION_MEASUREMENT": semantic = op === "READ_CENTIMETER_MEASURE" ? v[0]! : op === "MULTIPLY_UNIT_FACTOR" ? v[0]! * v[1]! : roundDecimal(v[0]! / v[1]!, 4); break;
    case "UNIT_FRACTION_MODEL": semantic = rational(1, v[1]!).toFraction(); break;
    case "VIETE_RELATION": { const sum = v[0]!, product = v[1]!, discriminant = sum ** 2 - 4 * product; if (discriminant < 0) throw new GeneratorOracleError("ORACLE_MATHEMATICAL_DOMAIN_INVALID"); const root = Math.sqrt(discriminant); semantic = [{ leftId: "x1", rightId: String(Math.min((sum - root) / 2, (sum + root) / 2)) }, { leftId: "x2", rightId: String(Math.max((sum - root) / 2, (sum + root) / 2)) }]; break; }
    case "VISUAL_OPERATION_MODEL": semantic = op === "ADD" ? v[0]! + v[1]! : op === "SUBTRACT" ? v[0]! - v[1]! : op === "MULTIPLY" ? v[0]! * v[1]! : v[0]! / v[1]!; break;
  }
  return semantic === null ? null : semanticToAnswer(candidate, semantic);
}

function semanticToAnswer(candidate: OracleCandidate, semantic: OracleAnswer): OracleAnswer {
  const type = candidate.interaction.type;
  const asLabel = (value: OracleAnswer): string => {
    if (typeof value === "number" || typeof value === "string") return String(value);
    if (Array.isArray(value)) return value.every((item) => typeof item === "string")
      ? value.join(" → ")
      : value.map((item) => `${item.leftId}=${item.rightId}`).join("; ");
    if (!isOracleFraction(value)) {
      throw new GeneratorOracleError("ORACLE_PUBLIC_DATA_INVALID");
    }
    const reduced = rational(value.numerator, value.denominator).toFraction();
    return `${reduced.numerator}/${reduced.denominator}`;
  };
  if (type === "SINGLE_CHOICE" || type === "CONSTRUCTION_OR_VISUAL_SELECTION") {
    return optionByLabel(candidate.interaction.options, asLabel(semantic));
  }
  if (type === "MULTI_SELECT") {
    const labels = Array.isArray(semantic) && semantic.every((item) => typeof item === "string") ? semantic : [asLabel(semantic)];
    return labels.map((label) => (candidate.interaction.options ?? []).some((option) => option.id === label)
      ? optionById(candidate.interaction.options, label)
      : optionByLabel(candidate.interaction.options, label));
  }
  if (type === "ORDERING") {
    if (!Array.isArray(semantic) || !semantic.every((item) => typeof item === "string")) {
      throw new GeneratorOracleError("ORACLE_INTERACTION_MISMATCH");
    }
    return semantic.map((label) => (candidate.interaction.options ?? []).some((option) => option.id === label)
      ? optionById(candidate.interaction.options, label)
      : optionByLabel(candidate.interaction.options, label));
  }
  if (type === "MATCHING") {
    if (Array.isArray(semantic) && semantic.every((item) => typeof item !== "string")) return semantic;
    return [{ leftId: "result", rightId: asLabel(semantic) }];
  }
  if (type === "FRACTION_INPUT") {
    if (typeof semantic === "number") return rational(semantic, 1).toFraction();
    if (typeof semantic === "string" && /^-?\d+$/u.test(semantic)) return rational(Number(semantic), 1).toFraction();
  }
  if ((type === "INTEGER_INPUT" || type === "DECIMAL_INPUT") && typeof semantic === "string") {
    const numeric = Number(semantic.replace(",", "."));
    if (Number.isFinite(numeric)) return numeric;
  }
  if ((type === "INTEGER_INPUT" || type === "DECIMAL_INPUT") && isOracleFraction(semantic)) {
    return semantic.numerator / semantic.denominator;
  }
  if (type === "SHORT_STRUCTURED_RESPONSE" && typeof semantic !== "string") return asLabel(semantic);
  if (type === "TABLE_OR_CHART_RESPONSE") return asLabel(semantic);
  return semantic;
}

function solveWaveE(candidate: OracleCandidate, model: PublicModel): OracleAnswer | null {
  const v = model.values;
  const operation = model.operation;
  let semantic: OracleAnswer | null = null;
  switch (operation) {
    case "DIVIDE_FACT": semantic = v[2]!; break;
    case "CERTAIN": semantic = "chắc chắn"; break;
    case "POSSIBLE": semantic = "có thể"; break;
    case "IMPOSSIBLE": semantic = "không thể"; break;
    case "CLASSIFY_RECORDS": semantic = [{ leftId: "quả táo", rightId: "đồ ăn" }, { leftId: "quả cam", rightId: "đồ ăn" }, { leftId: "bút chì", rightId: "đồ dùng học tập" }, { leftId: "quyển vở", rightId: "đồ dùng học tập" }]; break;
    case "MATCH_INSTRUMENT": semantic = [{ leftId: "độ dài bàn", rightId: "thước mét" }, { leftId: "khối lượng cặp", rightId: "cân" }, { leftId: "dung tích chai", rightId: "ca chia vạch" }]; break;
    case "COIN_SPACE": case "DIE_SPACE": case "TWO_COIN_SPACE":
    case "GEOMETRY_TOOL_SEQUENCE": case "DATA_TOOL_SEQUENCE": case "MEDIA_EVIDENCE_SEQUENCE": semantic = [...model.labels]; break;
    case "COMPARE_CATEGORIES": semantic = "biểu đồ cột"; break;
    case "SHOW_CHANGE": semantic = "biểu đồ đoạn thẳng"; break;
    case "SHOW_PART_WHOLE": semantic = "biểu đồ hình quạt tròn"; break;
    case "LIST_VALUES": semantic = "bảng số liệu"; break;
    case "EVEN_DIE_EVENT": semantic = ["2", "4", "6"]; break;
    case "VALID_TOTAL": semantic = "hợp lí"; break;
    case "INVALID_TOTAL": semantic = "không hợp lí"; break;
    case "MATCH_REPRESENTATIONS": semantic = model.labels.map((label, index) => ({ leftId: label, rightId: String(v[index]) })); break;
    case "LINEAR_TABLE": { const [a, b, ...xs] = v; semantic = xs.map((x) => ({ leftId: String(x), rightId: String(a! * x + b!) })); break; }
    case "QUADRATIC_TABLE": { const [a, ...xs] = v; semantic = xs.map((x) => ({ leftId: String(x), rightId: String(a! * x * x) })); break; }
    case "MIDLINE_DEFINITION": semantic = "đoạn thẳng nối trung điểm của hai cạnh tam giác"; break;
    case "MIDLINE_LENGTH": semantic = v[1]!; break;
    case "GROUPED_FREQUENCY": semantic = model.labels.map((label, index) => `${label}:${v[index]}`).join("; "); break;
    case "ONE_PERIOD_GROWTH": case "COMPARE_PLAN": semantic = Math.round(v[0]! * (1 + v[1]! / 100)); break;
    case "RECOVER_PRINCIPAL": semantic = Math.round(v[0]! / (1 + v[1]! / 100)); break;
    case "COVERED_AMOUNT": semantic = v[0]! - v[1]!; break;
    case "CYLINDER_VOLUME": semantic = roundDecimal(Math.PI * v[0]! * v[0]! * v[1]!, 2); break;
    case "CONE_VOLUME": semantic = roundDecimal(Math.PI * v[0]! * v[0]! * v[1]! / 3, 2); break;
    case "SPHERE_VOLUME": semantic = roundDecimal(4 * Math.PI * v[0]! ** 3 / 3, 2); break;
    case "BALANCE_WATER": semantic = [{ leftId: "hệ số x", rightId: "2" }, { leftId: "hệ số y", rightId: "2" }]; break;
    case "BALANCE_AMMONIA": semantic = [{ leftId: "hệ số x", rightId: "3" }, { leftId: "hệ số y", rightId: "2" }]; break;
    case "BALANCE_IRON_OXIDE": semantic = [{ leftId: "hệ số x", rightId: "4" }, { leftId: "hệ số y", rightId: "2" }]; break;
    case "TANGENT_DISTANCE": semantic = roundDecimal(v[1]! * Math.tan(v[0]! * Math.PI / 180), 2); break;
    case "AA_X_AA_RECESSIVE": semantic = rational(1, 4).toFraction(); break;
    case "AA_X_AA_DOMINANT": semantic = rational(3, 4).toFraction(); break;
    case "BOX_UNIT_CUBES": semantic = v[0]! * v[1]! * v[2]!; break;
    case "FAVORABLE_OVER_TOTAL": case "EXPERIMENTAL_RATIO": case "RELATIVE_FREQUENCY": semantic = rational(v[0]!, v[1]!).toFraction(); break;
    case "ABSOLUTE_FREQUENCY": semantic = v[0]!; break;
    case "FREQUENCY_ROLE": semantic = "cho biết một giá trị xuất hiện bao nhiêu lần"; break;
    case "RELATIVE_FREQUENCY_ROLE": semantic = "cho biết tỉ lệ số lần xuất hiện so với tổng số quan sát"; break;
    case "COUNT_TARGET": semantic = v.slice(1).filter((value) => value === v[0]).length; break;
    case "READ_CATEGORY": semantic = v[0]! * model.scale; break;
    case "CATEGORY_DIFFERENCE": semantic = Math.abs(v[2]! - v[0]!); break;
    case "CATEGORY_TOTAL": semantic = v.reduce((sum, value) => sum + value, 0); break;
    case "MEAN": semantic = v.reduce((sum, value) => sum + value, 0) / v.length; break;
    case "MAX_CATEGORY": semantic = model.labels[v.indexOf(Math.max(...v))]!; break;
    case "PIE_PERCENT": semantic = v[0]!; break;
    case "PIE_QUANTITY": semantic = v[4]! * v[0]! / 100; break;
  }
  return semantic === null ? null : semanticToAnswer(candidate, semantic);
}

function solveWaveF(candidate: OracleCandidate, model: PublicModel): OracleAnswer | null {
  const v = model.values;
  const operation = model.operation;
  let semantic: OracleAnswer | null = null;
  switch (operation) {
    case "ROUND_TEN_STRUCTURE": case "TENS_ONES_STRUCTURE": {
      const tens = Math.floor(v[0]! / 10); const ones = v[0]! % 10;
      semantic = [{ leftId: "số chục", rightId: String(tens) }, { leftId: "số đơn vị", rightId: String(ones) }, { leftId: "phân loại", rightId: ones === 0 ? "số tròn chục" : "không phải số tròn chục" }]; break;
    }
    case "ORDER_HEAVIEST_TO_LIGHTEST": semantic = model.labels.map((label, index) => ({ label, value: v[index]! })).sort((a, b) => b.value - a.value).map((item) => item.label); break;
    case "FIND_DISTANCE": semantic = v[0]! * v[1]!; break;
    case "FIND_SPEED": case "FIND_TIME": semantic = v[0]! / v[1]!; break;
    case "SUPPORTED_MAXIMUM": { const i = v.indexOf(Math.max(...v)); semantic = `${model.labels[i]} có ${v[i]} ${String(model.meta.unit)}, lớn nhất trong bảng`; break; }
    case "SUPPORTED_MINIMUM": { const i = v.indexOf(Math.min(...v)); semantic = `${model.labels[i]} có ${v[i]} ${String(model.meta.unit)}, nhỏ nhất trong bảng`; break; }
    case "SUPPORTED_DIFFERENCE": semantic = `chênh lệch lớn nhất là ${Math.max(...v) - Math.min(...v)} ${String(model.meta.unit)}`; break;
    case "SUPPORTED_RANGE": semantic = `các số liệu nằm từ ${Math.min(...v)} đến ${Math.max(...v)} ${String(model.meta.unit)}`; break;
    case "FIND_TAX": semantic = v[0]! * v[1]! / 100; break;
    case "FIND_TOTAL_AFTER_TAX": semantic = v[0]! * (100 + v[1]!) / 100; break;
    case "FIND_PRE_TAX_PRICE": semantic = v[0]! * 100 / (100 + v[1]!); break;
    case "MULTIPLY_BOTH_NONZERO": semantic = `Nhân cả tử và mẫu với ${v[2]} (khác 0) thì được phân thức bằng phân thức đã cho.`; break;
    case "COMMON_SIGN_CHANGE": semantic = `Với ví dụ ${v[0]}/${v[1]}, đổi dấu đồng thời cả tử thức và mẫu thức thì giá trị phân thức không đổi.`; break;
    case "CANCEL_COMMON_FACTOR_DOMAIN": semantic = `Có thể rút gọn nhân tử chung ${v[2]} khác 0 và vẫn phải giữ điều kiện xác định của phân thức ban đầu.`; break;
    case "MATCH_RATIONAL_CONCEPTS": {
      const [a, b, c, x0, k] = v; const numerator = `${a}x ${b! >= 0 ? "+" : "−"} ${Math.abs(b!)}`; const denominator = `x − ${c}`;
      semantic = [{ leftId: "điều kiện xác định", rightId: `x ≠ ${c}` }, { leftId: `giá trị tại x = ${x0}`, rightId: String((a! * x0! + b!) / (x0! - c!)) }, { leftId: "phân thức bằng nhau", rightId: `(${k}(${numerator}))/(${k}(${denominator}))` }]; break;
    }
    case "ATOM_TOTAL": case "BIOLOGY_GROWTH": semantic = v[0]! * v[1]!; break;
    case "FIND_SAMPLE_COUNT": semantic = v[0]! / v[1]!; break;
  }
  return semantic === null ? null : semanticToAnswer(candidate, semantic);
}

function validatePublicSurface(candidate: OracleCandidate, model: PublicModel) {
  const diagnostics: OracleDiagnosticCode[] = [];
  const serialized = JSON.stringify({ publicData: candidate.publicData, interaction: candidate.interaction, visual: candidate.visual });
  if (forbiddenPublicKeys.some((key) => serialized.includes(key))) diagnostics.push("ORACLE_PRIVATE_ANSWER_HINT");
  if (candidate.interaction.orderedItemIds !== undefined) diagnostics.push("ORACLE_PRIVATE_ANSWER_HINT");
  if (candidate.accessibility.prompt !== candidate.publicPrompt) diagnostics.push("ORACLE_PROMPT_DATA_MISMATCH");
  if (candidate.accessibility.visualAlternative !== candidate.visual.description) diagnostics.push("ORACLE_VISUAL_DATA_MISMATCH");
  if (
    candidate.publicPrompt.trim().length < 24 ||
    /theo yêu cầu|phép toán giữa|đúng chiều|bề mặt được yêu cầu|màu màu|phần còn lại hoặc kết quả|x−-|undefined|null|todo|placeholder/iu.test(candidate.publicPrompt)
  ) diagnostics.push("ORACLE_LANGUAGE_CONTRACT_INVALID");

  const options = candidate.interaction.options ?? [];
  if (new Set(options.map((option) => option.id)).size !== options.length || new Set(options.map((option) => normalizedText(option.label))).size !== options.length) diagnostics.push("ORACLE_DISTRACTOR_DUPLICATE");

  if (
    candidate.interaction.unitLabel &&
    !(
      normalizedText(candidate.publicPrompt).includes(
        normalizedText(candidate.interaction.unitLabel),
      ) ||
      (candidate.interaction.unitLabel === "%" &&
        normalizedText(candidate.publicPrompt).includes("phần trăm"))
    )
  ) {
    diagnostics.push("ORACLE_INTERACTION_MISMATCH");
  }

  const visualOperation = candidate.visual.data.operation;
  if (visualOperation !== undefined && model.operation && String(visualOperation) !== model.operation) diagnostics.push("ORACLE_VISUAL_DATA_MISMATCH");

  const promptNumbers = [...candidate.publicPrompt.matchAll(/-?\d+(?:[.,]\d+)?/gu)].map((match) => Number(match[0].replace(",", ".")));
  const recursivelyPublicNumbers = [
    ...collectPublicNumbers(candidate.publicData),
    ...collectPublicNumbers(candidate.visual.data),
  ];
  const scaledNumbers = model.scale > 1
    ? recursivelyPublicNumbers.map((value) => value / model.scale)
    : [];
  const evidenceNumbers = new Set<number>([
    ...recursivelyPublicNumbers,
    ...scaledNumbers,
    ...model.fractions.flatMap((value) => [value.numerator, value.denominator]),
  ].map(canonicalNumber));
  // Ordinary constants (for example 2 in a perimeter formula or 100 in a
  // percentage) are legitimate prompt language. A very large, unexplained
  // value is retained as a strict mutation tripwire without treating scaled
  // decimal storage as a prompt mismatch.
  if (promptNumbers.some((value) => !evidenceNumbers.has(canonicalNumber(value)) && Math.abs(value) > 10_000_000)) diagnostics.push("ORACLE_PROMPT_DATA_MISMATCH");
  if (candidate.grade < 1 || candidate.grade > 9) diagnostics.push("ORACLE_GRADE_BOUND_INVALID");
  return [...new Set(diagnostics)];
}

function interactionDiagnostics(candidate: OracleCandidate, answer: OracleAnswer) {
  const diagnostics: OracleDiagnosticCode[] = [];
  const type = candidate.interaction.type;
  if (type === "INTEGER_INPUT" && (typeof answer !== "number" || !Number.isInteger(answer))) diagnostics.push("ORACLE_INTERACTION_MISMATCH");
  if (type === "DECIMAL_INPUT" && typeof answer !== "number") diagnostics.push("ORACLE_INTERACTION_MISMATCH");
  if (type === "FRACTION_INPUT" && (typeof answer !== "object" || Array.isArray(answer))) diagnostics.push("ORACLE_INTERACTION_MISMATCH");
  if ((type === "SINGLE_CHOICE" || type === "CONSTRUCTION_OR_VISUAL_SELECTION") && (typeof answer !== "string" || !(candidate.interaction.options ?? []).some((option) => option.id === answer))) diagnostics.push("ORACLE_INTERACTION_MISMATCH");
  if (
    (type === "SINGLE_CHOICE" || type === "CONSTRUCTION_OR_VISUAL_SELECTION") &&
    candidate.interaction.choiceCount !== undefined &&
    candidate.interaction.choiceCount !== 1
  ) diagnostics.push("ORACLE_INTERACTION_MISMATCH");
  if (type === "SINGLE_CHOICE" && typeof answer === "string") {
    const options = candidate.interaction.options ?? [];
    const correct = options.find((option) => option.id === answer);
    const correctKey = correct ? exactNumericLabelKey(correct.label) : null;
    if (
      correctKey &&
      options.some(
        (option) =>
          option.id !== answer && exactNumericLabelKey(option.label) === correctKey,
      )
    ) diagnostics.push("ORACLE_DISTRACTOR_EQUIVALENT_TO_ANSWER");
  }
  if ((type === "MULTI_SELECT" || type === "ORDERING") && (!Array.isArray(answer) || !answer.every((item) => typeof item === "string"))) diagnostics.push("ORACLE_INTERACTION_MISMATCH");
  if (type === "MATCHING" && (!Array.isArray(answer) || !answer.every((item) => typeof item === "object"))) diagnostics.push("ORACLE_INTERACTION_MISMATCH");
  return diagnostics;
}

export function evaluatePublicQuestion(candidate: OracleCandidate): OracleResult {
  let model: PublicModel;
  try {
    model = publicModel(candidate);
  } catch (error) {
    const code = error instanceof GeneratorOracleError ? error.code : "ORACLE_PUBLIC_DATA_INVALID";
    return { ok: false, oracleFamily: candidate.variantId, answerSet: [], answerCardinality: 0, diagnostics: [code], checks: [] };
  }
  const diagnostics = validatePublicSurface(candidate, model);
  let answer: OracleAnswer | null = null;
  try {
    answer = solveBaseline(candidate) ?? solveWaveC(candidate, model) ?? solveWaveD(candidate, model) ?? solveWaveE(candidate, model) ?? solveWaveF(candidate, model) ?? solveWaveA(candidate, model) ?? solveWaveB(candidate, model);
  } catch (error) {
    diagnostics.push(error instanceof GeneratorOracleError ? error.code : "ORACLE_MATHEMATICAL_DOMAIN_INVALID");
  }
  if (typeof answer === "number" && !Number.isFinite(answer)) {
    diagnostics.push("ORACLE_MATHEMATICAL_DOMAIN_INVALID");
    answer = null;
  }
  if (answer === null) diagnostics.push("ORACLE_UNSUPPORTED_CAPABILITY");
  else diagnostics.push(...interactionDiagnostics(candidate, answer));
  const answerSet = answer === null ? [] : [answer];
  return {
    ok: diagnostics.length === 0,
    oracleFamily: candidate.variantId,
    answerSet,
    answerCardinality: answerSet.length,
    diagnostics: [...new Set(diagnostics)],
    checks: answer === null ? [] : [
      "PUBLIC_EVIDENCE_ONLY",
      "EXACT_OR_BOUNDED_MATH",
      "ANSWER_SET_RECOMPUTED",
      "INTERACTION_COMPATIBILITY",
      "PROMPT_VISUAL_CROSS_CHECK",
    ],
  };
}

export function oracleAnswerKey(answer: OracleAnswer) {
  return normalizeAnswer(answer);
}
