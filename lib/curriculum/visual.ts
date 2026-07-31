import type {
  PreviewAudit,
  PreviewVisualSpec,
  VisualRequirement,
} from "./types.ts";

type VisualParameter = PreviewAudit["parameters"][number];

type CreateVisualInput = Readonly<{
  type: VisualRequirement;
  description: string;
  identity: string;
  parameters?: readonly VisualParameter[];
}>;

function stableOrdinal(identity: string) {
  let state = 0;
  for (const character of identity) {
    state = (Math.imul(state, 31) + character.charCodeAt(0)) >>> 0;
  }
  return state;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function numericParameters(parameters: readonly VisualParameter[]) {
  return parameters.flatMap((parameter) => {
    const value =
      typeof parameter.value === "number"
        ? parameter.value
        : Number(String(parameter.value).replace(",", "."));
    return Number.isFinite(value)
      ? [{ name: parameter.name, value }]
      : [];
  });
}

function parameterValue(
  parameters: readonly ReturnType<typeof numericParameters>[number][],
  pattern: RegExp,
) {
  return parameters.find((parameter) => pattern.test(parameter.name))?.value;
}

function displayDecimal(value: number) {
  return Number(value.toFixed(2)).toString().replace(".", ",");
}

export function createCurriculumVisualSpec({
  type,
  description,
  identity,
  parameters = [],
}: CreateVisualInput): PreviewVisualSpec {
  const ordinal = stableOrdinal(identity);
  const numeric = numericParameters(parameters);
  const first = numeric[0]?.value;

  switch (type) {
    case "TEXT_ONLY":
      return { type, description };
    case "COUNTER_ROW":
      {
        const explicitGroups = parameterValue(numeric, /^groups$|^divisor$/u);
        const explicitItems = parameterValue(
          numeric,
          /itemsPerGroup/u,
        );
        const dividend = parameterValue(numeric, /^dividend$/u);
        const groups = clamp(
          Math.abs(Math.round(explicitGroups ?? 1)),
          1,
          10,
        );
        const itemsPerGroup = clamp(
          Math.abs(
            Math.round(
              explicitItems ??
                (dividend && explicitGroups
                  ? dividend / explicitGroups
                  : first ?? (ordinal % 10) + 1),
            ),
          ),
          1,
          10,
        );
        const left = parameterValue(numeric, /^left$|^start$/u);
        const right = parameterValue(numeric, /^right$|^change$/u);
        const counts =
          left !== undefined && right !== undefined
            ? [
                clamp(Math.abs(Math.round(left)), 0, 20),
                clamp(Math.abs(Math.round(right)), 0, 20),
              ]
            : undefined;
      return {
        type,
        description,
          groups,
          itemsPerGroup,
          ...(counts ? { counts } : {}),
      };
      }
    case "PLACE_VALUE_CHART":
      return {
        type,
        description,
        value: clamp(
          Math.abs(Math.round(first ?? (ordinal % 999) + 1)),
          0,
          9_999,
        ),
      };
    case "FRACTION_BAR": {
      const denominator = clamp(
        Math.abs(
          Math.round(
            parameterValue(numeric, /denominator/u) ?? (ordinal % 7) + 3,
          ),
        ),
        2,
        12,
      );
      const explicitNumerator = parameterValue(numeric, /numerator|count/u);
      const numerator = clamp(
        Math.abs(
          Math.round(
            explicitNumerator ??
              (parameterValue(numeric, /denominator/u) !== undefined
                ? 1
                : numeric.find(
                    (parameter) =>
                      parameter.name !== "denominator" &&
                      parameter.value > 0,
                  )?.value ??
                  (ordinal % (denominator - 1)) + 1),
          ),
        ),
        1,
        denominator,
      );
      const leftDenominator = parameterValue(numeric, /leftDenominator/u);
      const rightDenominator = parameterValue(numeric, /rightDenominator/u);
      const numeratorValues = numeric.filter((parameter) =>
        /numerator/u.test(parameter.name),
      );
      const comparisons =
        leftDenominator && rightDenominator
          ? [
              { numerator: 1, denominator: leftDenominator },
              { numerator: 1, denominator: rightDenominator },
            ]
          : numeratorValues.length > 1
            ? numeratorValues.map((parameter) => ({
                numerator: parameter.value,
                denominator,
              }))
            : undefined;
      return {
        type,
        description,
        numerator,
        denominator,
        ...(comparisons ? { comparisons } : {}),
      };
    }
    case "DECIMAL_PLACE_VALUE_CHART": {
      const selected = numeric
        .filter((parameter) => /value|left|right/u.test(parameter.name))
        .slice(0, 2)
        .map((parameter) => displayDecimal(parameter.value));
      const values =
        selected.length > 0
          ? selected
          : [displayDecimal(((ordinal % 900) + 100) / 100)];
      return {
        type,
        description,
        values: values as [string, ...string[]],
      };
    }
    case "NUMBER_LINE": {
      const denominator = parameterValue(numeric, /denominator/u);
      const numeratorValues = numeric
        .filter((parameter) => /numerator/iu.test(parameter.name))
        .map(({ value }) => value);
      const requestedOperation = parameters.find(
        (parameter) => parameter.name === "operation",
      )?.value;
      const left = parameterValue(numeric, /^left$/u);
      const right = parameterValue(numeric, /^right$/u);
      const operationResult =
        left !== undefined &&
        right !== undefined &&
        (requestedOperation === "ADD" || requestedOperation === "SUBTRACT")
          ? requestedOperation === "ADD"
            ? left + right
            : left - right
          : undefined;
      const values =
        denominator && numeratorValues.length > 0
          ? numeratorValues.map((numerator) => numerator / denominator)
          : operationResult !== undefined
            ? [left as number, operationResult]
          : numeric.slice(0, 3).map(({ value }) => value);
      const points =
        values.length > 0
          ? [...new Set(values)]
          : [Number(((ordinal % 81) / 10 - 4).toFixed(1))];
      const minimum = Math.floor(Math.min(...points, 0)) - 1;
      const maximum = Math.ceil(Math.max(...points, 0)) + 1;
      return {
        type,
        description,
        minimum,
        maximum: maximum === minimum ? minimum + 2 : maximum,
        points,
      };
    }
    case "RATIO_TABLE": {
      const leftBase = parameterValue(numeric, /leftBase/u);
      const rightBase = parameterValue(numeric, /rightBase/u);
      const scale = parameterValue(numeric, /^scale$/u);
      const unitValue = parameterValue(numeric, /unitValue/u);
      const knownCount = parameterValue(numeric, /knownCount/u);
      const sourceUnits = parameterValue(numeric, /sourceUnits/u);
      const sourceValue = parameterValue(numeric, /sourceValue/u);
      const capital = parameterValue(numeric, /capital/u);
      const rate = parameterValue(numeric, /rate/u);
      if (capital && rate) {
        return {
          type,
          description,
          rows: [
            [100, capital],
            [rate, (capital * rate) / 100],
          ],
        };
      }
      if (leftBase && rightBase && scale) {
        return {
          type,
          description,
          rows: [
            [leftBase, rightBase],
            [leftBase * scale, rightBase * scale],
          ],
        };
      }
      if (unitValue && knownCount) {
        return {
          type,
          description,
          rows: [
            [1, unitValue],
            [knownCount, knownCount * unitValue],
          ],
        };
      }
      if (sourceUnits && sourceValue) {
        return {
          type,
          description,
          rows: [
            [1, sourceValue / sourceUnits],
            [sourceUnits, sourceValue],
          ],
        };
      }
      const base = clamp(
        Math.abs(Math.round(first ?? (ordinal % 5) + 1)),
        1,
        20,
      );
      const factor = (ordinal % 4) + 2;
      return {
        type,
        description,
        rows: [
          [base, base * factor],
          [base + 1, (base + 1) * factor],
        ],
      };
    }
    case "BALANCE_MODEL": {
      const coefficient = clamp(
        Math.abs(
          Math.round(
            parameterValue(numeric, /coefficient/u) ?? (ordinal % 4) + 2,
          ),
        ),
        1,
        8,
      );
      const constant = Math.round(
        parameterValue(numeric, /constant/u) ?? 0,
      );
      const explicitResult = parameterValue(numeric, /result/u);
      const solution = parameterValue(numeric, /solution/u);
      return {
        type,
        description,
        variableBlocks: coefficient,
        leftUnits: constant,
        rightUnits: Math.round(
          explicitResult ??
            (solution === undefined
              ? coefficient
              : coefficient * solution + constant),
        ),
      };
    }
    case "COORDINATE_PLANE": {
      const coordinates = numeric.slice(0, 4).map(({ value }) =>
        clamp(Math.round(value), -4, 4),
      );
      const explicitX = parameterValue(numeric, /^x$/u);
      const coefficient = parameterValue(numeric, /^a$/u);
      const explicitY =
        parameterValue(numeric, /^y$/u) ??
        (explicitX !== undefined && coefficient !== undefined
          ? coefficient * explicitX * explicitX
          : undefined);
      const x = clamp(
        Math.round(explicitX ?? coordinates[0] ?? (ordinal % 7) - 3),
        -4,
        4,
      );
      const y = clamp(
        Math.round(explicitY ?? coordinates[1] ?? ((ordinal >>> 3) % 7) - 3),
        -4,
        4,
      );
      const secondX = coordinates[2] ?? clamp(x + 2, -4, 4);
      const secondY = coordinates[3] ?? clamp(y + 1, -4, 4);
      return {
        type,
        description,
        points:
          explicitX !== undefined && explicitY !== undefined
            ? [{ x, y }]
            : [{ x, y }, { x: secondX, y: secondY }],
      };
    }
    case "SHAPE_SCENE": {
      const requested = parameters.find(
        (parameter) => parameter.name === "shape",
      )?.value;
      const shapes = ["CIRCLE", "TRIANGLE", "SQUARE", "RECTANGLE"] as const;
      const shape =
        typeof requested === "string" &&
        shapes.includes(requested as (typeof shapes)[number])
          ? (requested as (typeof shapes)[number])
          : shapes[ordinal % shapes.length];
      return { type, description, shape };
    }
    case "SOLID_NET": {
      const requested = parameters.find(
        (parameter) => parameter.name === "solid",
      )?.value;
      const solids = ["CUBE", "CUBOID", "CYLINDER"] as const;
      const solid =
        typeof requested === "string" &&
        solids.includes(requested as (typeof solids)[number])
          ? (requested as (typeof solids)[number])
          : solids[ordinal % solids.length];
      return {
        type,
        description,
        solid,
        faceCount: solid === "CYLINDER" ? 3 : 6,
      };
    }
    case "MEASUREMENT_SCALE": {
      const start = clamp(
        Math.round(parameterValue(numeric, /^start$/u) ?? 0),
        0,
        90,
      );
      const requestedEnd =
        parameterValue(numeric, /^end$/u) ??
        start + Math.abs(Math.round(first ?? (ordinal % 10) + 1));
      return {
        type,
        description,
        start,
        end: clamp(Math.max(start + 1, Math.round(requestedEnd)), 1, 100),
        unit: "cm",
      };
    }
    case "ANGLE_DIAGRAM":
      return {
        type,
        description,
        degrees: clamp(
          Math.round(parameterValue(numeric, /degrees|angle/u) ?? 90),
          10,
          170,
        ),
      };
    case "AREA_MODEL": {
      const requested = parameters.find(
        (parameter) => parameter.name === "shape",
      )?.value;
      const distributiveFactor = parameterValue(numeric, /^a$/u);
      const distributiveLeft = parameterValue(numeric, /^b$/u);
      const distributiveRight = parameterValue(numeric, /^c$/u);
      return {
        type,
        description,
        shape: requested === "TRIANGLE" ? "TRIANGLE" : "RECTANGLE",
        width: clamp(
          Math.abs(
            Math.round(
              distributiveLeft !== undefined &&
                distributiveRight !== undefined
                ? distributiveLeft + distributiveRight
                : parameterValue(numeric, /width|base/u) ?? 6,
            ),
          ),
          1,
          50,
        ),
        height: clamp(
          Math.abs(
            Math.round(
              distributiveFactor ??
                parameterValue(numeric, /height/u) ??
                4,
            ),
          ),
          1,
          50,
        ),
      };
    }
    case "DATA_DISPLAY": {
      const bill = parameterValue(numeric, /^bill$/u);
      const paid = parameterValue(numeric, /^paid$/u);
      if (bill !== undefined && paid !== undefined) {
        return {
          type,
          description,
          entries: [
            {
              label: "Hóa đơn",
              count: 0,
              value: `${bill.toLocaleString("vi-VN")} đồng`,
            },
            {
              label: "Đã trả",
              count: 0,
              value: `${paid.toLocaleString("vi-VN")} đồng`,
            },
          ],
        };
      }
      return {
        type,
        description,
        entries: [
          {
            label: "Nhóm A",
            count: clamp(
              Math.round(parameterValue(numeric, /countA/u) ?? 3),
              0,
              10,
            ),
          },
          {
            label: "Nhóm B",
            count: clamp(
              Math.round(parameterValue(numeric, /countB/u) ?? 2),
              0,
              10,
            ),
          },
        ],
      };
    }
    case "CLOCK_FACE": {
      const rawHour = Math.round(
        parameterValue(numeric, /^hour$/u) ?? (ordinal % 12) + 1,
      );
      const rawMinute = Math.round(
        parameterValue(numeric, /^minute$/u) ?? 0,
      );
      const minute = [0, 15, 30, 45].reduce(
        (nearest, candidate) =>
          Math.abs(candidate - rawMinute) < Math.abs(nearest - rawMinute)
            ? candidate
            : nearest,
        0,
      ) as 0 | 15 | 30 | 45;
      return {
        type,
        description,
        hour: ((rawHour - 1 + 12) % 12) + 1,
        minute,
      };
    }
  }
}
