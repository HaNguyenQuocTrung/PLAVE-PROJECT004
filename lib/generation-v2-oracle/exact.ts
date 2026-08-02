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
