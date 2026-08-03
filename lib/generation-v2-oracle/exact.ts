import type { OracleFraction } from "./types.ts";

function integerGcd(a: bigint, b: bigint): bigint {
  let left = a < 0n ? -a : a;
  let right = b < 0n ? -b : b;
  while (right !== 0n) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }
  return left || 1n;
}

export class ExactRational {
  readonly numerator: bigint;
  readonly denominator: bigint;

  constructor(numerator: bigint, denominator: bigint = 1n) {
    if (denominator === 0n) throw new Error("ORACLE_ZERO_DENOMINATOR");
    const sign = denominator < 0n ? -1n : 1n;
    const divisor = integerGcd(numerator, denominator);
    this.numerator = (numerator / divisor) * sign;
    this.denominator = (denominator / divisor) * sign;
  }

  add(other: ExactRational) {
    return new ExactRational(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator,
    );
  }

  subtract(other: ExactRational) {
    return new ExactRational(
      this.numerator * other.denominator - other.numerator * this.denominator,
      this.denominator * other.denominator,
    );
  }

  multiply(other: ExactRational) {
    return new ExactRational(
      this.numerator * other.numerator,
      this.denominator * other.denominator,
    );
  }

  divide(other: ExactRational) {
    if (other.numerator === 0n) throw new Error("ORACLE_DIVISION_BY_ZERO");
    return new ExactRational(
      this.numerator * other.denominator,
      this.denominator * other.numerator,
    );
  }

  compare(other: ExactRational) {
    const delta = this.numerator * other.denominator - other.numerator * this.denominator;
    return delta < 0n ? -1 : delta > 0n ? 1 : 0;
  }

  toFraction(): OracleFraction {
    const numerator = Number(this.numerator);
    const denominator = Number(this.denominator);
    if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
      throw new Error("ORACLE_UNSAFE_INTEGER");
    }
    return { numerator, denominator };
  }

  toNumber() {
    return Number(this.numerator) / Number(this.denominator);
  }

  toKey() {
    return `${this.numerator}/${this.denominator}`;
  }
}

export type ExactNumericParseOptions = Readonly<{
  allowFraction?: boolean;
  allowCommaDecimal?: boolean;
  allowScientific?: boolean;
}>;

export type ParsedExactNumeric = Readonly<{
  value: ExactRational;
  key: string;
  representation: "INTEGER" | "DECIMAL" | "FRACTION" | "SCIENTIFIC";
}>;

function decimalRational(sign: string, whole: string, decimal: string) {
  const digits = `${whole}${decimal}`.replace(/^0+(?=\d)/u, "") || "0";
  const numerator = BigInt(digits) * (sign === "-" ? -1n : 1n);
  return new ExactRational(numerator, 10n ** BigInt(decimal.length));
}

/** Parses the complete input into an exact rational; no floating-point equality is used. */
export function parseExactNumeric(
  input: string,
  options: ExactNumericParseOptions = {},
): ParsedExactNumeric | null {
  const trimmed = input.normalize("NFKC").replaceAll("−", "-").trim();
  if (!trimmed) return null;
  const normalized = options.allowCommaDecimal === false ? trimmed : trimmed.replaceAll(",", ".");

  if (options.allowFraction) {
    const match = normalized.match(/^([+-]?\d+)\/([+-]?\d+)$/u);
    if (match) {
      const denominator = BigInt(match[2]!);
      if (denominator === 0n) return null;
      const value = new ExactRational(BigInt(match[1]!), denominator);
      return { value, key: value.toKey(), representation: "FRACTION" };
    }
  }

  const decimal = normalized.match(/^([+-]?)(\d+)(?:\.(\d+))?$/u);
  if (decimal) {
    const value = decimalRational(decimal[1]!, decimal[2]!, decimal[3] ?? "");
    return {
      value,
      key: value.toKey(),
      representation: decimal[3] === undefined ? "INTEGER" : "DECIMAL",
    };
  }

  if (options.allowScientific) {
    const scientific = normalized.match(/^([+-]?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/u);
    if (scientific) {
      const decimalPart = scientific[3] ?? "";
      const exponent = Number(scientific[4]);
      if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 1_000) return null;
      const base = decimalRational(scientific[1]!, scientific[2]!, decimalPart);
      const shift = exponent;
      const value = shift >= 0
        ? new ExactRational(base.numerator * 10n ** BigInt(shift), base.denominator)
        : new ExactRational(base.numerator, base.denominator * 10n ** BigInt(-shift));
      return { value, key: value.toKey(), representation: "SCIENTIFIC" };
    }
  }

  return null;
}

export function rational(numerator: number, denominator = 1) {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
    throw new Error("ORACLE_NON_INTEGER_RATIONAL_PART");
  }
  return new ExactRational(BigInt(numerator), BigInt(denominator));
}

export function roundDecimal(value: number, places: number) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function canonicalNumber(value: number) {
  if (!Number.isFinite(value)) throw new Error("ORACLE_NON_FINITE_NUMBER");
  return Number(value.toFixed(8));
}
