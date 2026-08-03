export type LinearGraphPoint = Readonly<{ x: number; y: number }>;
export type LinearGraphWindow = Readonly<{
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}>;

export const DEFAULT_LINEAR_GRAPH_WINDOW: LinearGraphWindow = Object.freeze({
  xMin: -6,
  xMax: 6,
  yMin: -10,
  yMax: 10,
});

const within = (value: number, minimum: number, maximum: number) =>
  value >= minimum - 1e-9 && value <= maximum + 1e-9;

const rounded = (value: number) => Math.round(value * 1e9) / 1e9;

/**
 * Produces the visible segment of y=mx+b. This is presentation geometry, not
 * the Generator solver; the independent oracle recomputes the same equation
 * without importing this module.
 */
export function plotLinearEquation(
  slope: number,
  intercept: number,
  window: LinearGraphWindow = DEFAULT_LINEAR_GRAPH_WINDOW,
): readonly LinearGraphPoint[] {
  if (![slope, intercept, window.xMin, window.xMax, window.yMin, window.yMax].every(Number.isFinite)) {
    throw new Error("GENERATION_V2:INVALID_LINEAR_GRAPH");
  }
  if (window.xMin >= window.xMax || window.yMin >= window.yMax) {
    throw new Error("GENERATION_V2:INVALID_LINEAR_GRAPH_WINDOW");
  }

  const candidates: LinearGraphPoint[] = [];
  const add = (x: number, y: number) => {
    if (!within(x, window.xMin, window.xMax) || !within(y, window.yMin, window.yMax)) return;
    const point = { x: rounded(x), y: rounded(y) };
    if (!candidates.some((existing) => Math.abs(existing.x - point.x) < 1e-8 && Math.abs(existing.y - point.y) < 1e-8)) {
      candidates.push(point);
    }
  };

  add(window.xMin, slope * window.xMin + intercept);
  add(window.xMax, slope * window.xMax + intercept);
  if (slope !== 0) {
    add((window.yMin - intercept) / slope, window.yMin);
    add((window.yMax - intercept) / slope, window.yMax);
  }
  // The visible y-intercept is explicit evidence, not an inferred renderer
  // convention. It also catches the historical origin-only regression.
  add(0, intercept);

  const boundary = candidates
    .filter((point) =>
      Math.abs(point.x - window.xMin) < 1e-8 ||
      Math.abs(point.x - window.xMax) < 1e-8 ||
      Math.abs(point.y - window.yMin) < 1e-8 ||
      Math.abs(point.y - window.yMax) < 1e-8,
    )
    .sort((left, right) => left.x - right.x || left.y - right.y);
  if (boundary.length < 2) throw new Error("GENERATION_V2:LINE_OUTSIDE_GRAPH_WINDOW");
  const endpoints = [boundary[0]!, boundary.at(-1)!];
  const interceptPoint = candidates.find((point) => point.x === 0 && point.y === rounded(intercept));
  return interceptPoint && !endpoints.some((point) => point.x === interceptPoint.x && point.y === interceptPoint.y)
    ? [endpoints[0], interceptPoint, endpoints[1]]
    : endpoints;
}
