import { createElement, type ReactNode } from "react";

import type { PreviewVisualSpec } from "@/lib/curriculum/types";

type Props = Readonly<{
  spec: PreviewVisualSpec;
}>;

function svg(children: ReactNode, viewBox = "0 0 320 140") {
  return createElement(
    "svg",
    {
      "aria-hidden": true,
      focusable: "false",
      preserveAspectRatio: "xMidYMid meet",
      viewBox,
    },
    children,
  );
}

function renderVisual(spec: PreviewVisualSpec): ReactNode {
  switch (spec.type) {
    case "TEXT_ONLY":
      return null;
    case "COUNTER_ROW":
      return createElement(
        "div",
        { className: "curriculum-visual__counter-row", "aria-hidden": true },
        (spec.counts ??
          Array.from({ length: spec.groups }, () => spec.itemsPerGroup)).map(
          (count, groupIndex) =>
          createElement(
            "span",
            {
              className: "curriculum-visual__counter-group",
              key: groupIndex,
            },
            Array.from({ length: count }, (_, itemIndex) =>
              createElement("i", { key: itemIndex }),
            ),
          ),
        ),
      );
    case "PLACE_VALUE_CHART": {
      const digits = String(spec.value).padStart(4, "0").slice(-4).split("");
      return createElement(
        "table",
        { className: "curriculum-visual__table", "aria-hidden": true },
        createElement(
          "thead",
          null,
          createElement(
            "tr",
            null,
            ["Nghìn", "Trăm", "Chục", "Đơn vị"].map((label) =>
              createElement("th", { key: label }, label),
            ),
          ),
        ),
        createElement(
          "tbody",
          null,
          createElement(
            "tr",
            null,
            digits.map((digit, index) =>
              createElement("td", { key: index }, digit),
            ),
          ),
        ),
      );
    }
    case "FRACTION_BAR":
      return createElement(
        "div",
        { className: "curriculum-visual__fraction-bars", "aria-hidden": true },
        (spec.comparisons ?? [
          { numerator: spec.numerator, denominator: spec.denominator },
        ]).map((bar, barIndex) =>
          createElement(
            "div",
            {
              className: "curriculum-visual__fraction-bar",
              key: barIndex,
            },
            Array.from({ length: bar.denominator }, (_, index) =>
              createElement("span", {
                className:
                  index < bar.numerator
                    ? "curriculum-visual__fraction-part is-filled"
                    : "curriculum-visual__fraction-part",
                key: index,
              }),
            ),
          ),
        ),
      );
    case "DECIMAL_PLACE_VALUE_CHART":
      return createElement(
        "table",
        { className: "curriculum-visual__table", "aria-hidden": true },
        createElement(
          "thead",
          null,
          createElement(
            "tr",
            null,
            ["Số", "Phần nguyên", "Phần mười", "Phần trăm"].map((label) =>
              createElement("th", { key: label }, label),
            ),
          ),
        ),
        createElement(
          "tbody",
          null,
          spec.values.map((value) => {
            const [whole, fraction = ""] = value.split(",");
            return createElement(
              "tr",
              { key: value },
              createElement("td", null, value),
              createElement("td", null, whole),
              createElement("td", null, fraction[0] ?? "0"),
              createElement("td", null, fraction[1] ?? "0"),
            );
          }),
        ),
      );
    case "NUMBER_LINE": {
      const span = spec.maximum - spec.minimum;
      const ticks = Array.from(
        { length: Math.min(11, Math.floor(span) + 1) },
        (_, index) => spec.minimum + index * (span / Math.min(10, span)),
      );
      return svg([
        createElement("line", {
          key: "axis",
          x1: 24,
          x2: 296,
          y1: 70,
          y2: 70,
        }),
        ...ticks.flatMap((value, index) => {
          const x = 24 + ((value - spec.minimum) / span) * 272;
          return [
            createElement("line", {
              key: `tick-${index}`,
              x1: x,
              x2: x,
              y1: 62,
              y2: 78,
            }),
            createElement(
              "text",
              { key: `label-${index}`, x, y: 98, textAnchor: "middle" },
              Number(value.toFixed(1)).toString().replace(".", ","),
            ),
          ];
        }),
        ...spec.points.map((point, index) =>
          createElement("circle", {
            className: "curriculum-visual__point",
            cx: 24 + ((point - spec.minimum) / span) * 272,
            cy: 70,
            key: `point-${index}`,
            r: 6,
          }),
        ),
      ]);
    }
    case "RATIO_TABLE":
      return createElement(
        "table",
        { className: "curriculum-visual__table", "aria-hidden": true },
        createElement(
          "tbody",
          null,
          spec.rows.map((row, rowIndex) =>
            createElement(
              "tr",
              { key: rowIndex },
              row.map((value, columnIndex) =>
                createElement("td", { key: columnIndex }, value),
              ),
            ),
          ),
        ),
      );
    case "BALANCE_MODEL": {
      const variables = Array.from(
        { length: spec.variableBlocks },
        (_, index) =>
          createElement("rect", {
            className: "curriculum-visual__balance-block",
            height: 16,
            key: `variable-${index}`,
            width: 18,
            x: 45 + (index % 4) * 22,
            y: 82 - Math.floor(index / 4) * 20,
          }),
      );
      return svg([
        createElement("line", {
          key: "beam",
          x1: 55,
          x2: 265,
          y1: 100,
          y2: 100,
        }),
        createElement("path", {
          d: "M160 100 L135 132 L185 132 Z",
          key: "stand",
        }),
        ...variables,
        createElement(
          "text",
          { key: "left-units", x: 110, y: 78, textAnchor: "middle" },
          `${spec.leftUnits >= 0 ? "+" : "−"} ${Math.abs(spec.leftUnits)}`,
        ),
        createElement(
          "text",
          { key: "right-units", x: 230, y: 78, textAnchor: "middle" },
          spec.rightUnits,
        ),
      ]);
    }
    case "COORDINATE_PLANE":
      return svg([
        createElement("line", {
          key: "x-axis",
          x1: 20,
          x2: 300,
          y1: 70,
          y2: 70,
        }),
        createElement("line", {
          key: "y-axis",
          x1: 160,
          x2: 160,
          y1: 10,
          y2: 130,
        }),
        ...spec.points.map((point, index) =>
          createElement("circle", {
            className: "curriculum-visual__point",
            cx: 160 + point.x * 28,
            cy: 70 - point.y * 12,
            key: index,
            r: 6,
          }),
        ),
      ]);
    case "SHAPE_SCENE": {
      const shape =
        spec.shape === "CIRCLE"
          ? createElement("circle", { cx: 160, cy: 70, r: 46 })
          : spec.shape === "TRIANGLE"
            ? createElement("polygon", { points: "160,18 95,120 225,120" })
            : spec.shape === "SQUARE"
              ? createElement("rect", {
                  height: 92,
                  width: 92,
                  x: 114,
                  y: 24,
                })
              : createElement("rect", {
                  height: 72,
                  width: 150,
                  x: 85,
                  y: 34,
                });
      return svg(shape);
    }
    case "SOLID_NET": {
      if (spec.solid === "CYLINDER") {
        return svg([
          createElement("rect", {
            height: 72,
            key: "lateral",
            width: 126,
            x: 97,
            y: 34,
          }),
          createElement("circle", { cx: 70, cy: 70, key: "base-a", r: 27 }),
          createElement("circle", { cx: 250, cy: 70, key: "base-b", r: 27 }),
        ]);
      }
      const cells = [
        [120, 50],
        [160, 50],
        [200, 50],
        [80, 50],
        [120, 10],
        [120, 90],
      ];
      return svg(
        cells.map(([x, y], index) =>
          createElement("rect", {
            height: 40,
            key: index,
            width: spec.solid === "CUBE" ? 40 : index % 2 === 0 ? 52 : 40,
            x,
            y,
          }),
        ),
      );
    }
    case "MEASUREMENT_SCALE": {
      const length = spec.end - spec.start;
      const tickCount = length;
      const labelStep = length <= 12 ? 1 : Math.max(1, Math.ceil(length / 6));
      return svg([
        createElement("line", {
          key: "scale",
          x1: 24,
          x2: 296,
          y1: 80,
          y2: 80,
        }),
        ...Array.from({ length: tickCount + 1 }, (_, index) => {
          const x = 24 + (index / tickCount) * 272;
          const value = spec.start + (index / tickCount) * length;
          return createElement(
            "g",
            { key: index },
            createElement("line", { x1: x, x2: x, y1: 68, y2: 92 }),
            createElement(
              "text",
              { x, y: 112, textAnchor: "middle" },
              index === 0 || index === tickCount || index % labelStep === 0
                ? Number(value.toFixed(1)).toString()
                : "",
            ),
          );
        }),
        createElement("line", {
          className: "curriculum-visual__measurement",
          key: "measured",
          x1: 24,
          x2: 296,
          y1: 48,
          y2: 48,
        }),
        createElement(
          "text",
          { key: "unit", x: 160, y: 30, textAnchor: "middle" },
          spec.unit,
        ),
      ]);
    }
    case "ANGLE_DIAGRAM": {
      const radians = (spec.degrees * Math.PI) / 180;
      const endX = 90 + Math.cos(-radians) * 130;
      const endY = 112 + Math.sin(-radians) * 90;
      return svg([
        createElement("line", {
          key: "base",
          x1: 90,
          x2: 260,
          y1: 112,
          y2: 112,
        }),
        createElement("line", {
          key: "ray",
          x1: 90,
          x2: endX,
          y1: 112,
          y2: endY,
        }),
        createElement(
          "text",
          { key: "label", x: 125, y: 96, textAnchor: "middle" },
          `${spec.degrees}°`,
        ),
      ]);
    }
    case "AREA_MODEL": {
      const shape =
        spec.shape === "TRIANGLE"
          ? createElement("polygon", {
              key: "area-shape",
              points: "55,115 265,115 180,25",
            })
          : createElement("rect", {
              key: "area-shape",
              height: 90,
              width: 210,
              x: 55,
              y: 25,
            });
      return svg([
        shape,
        createElement(
          "text",
          { key: "width", x: 160, y: 135, textAnchor: "middle" },
          `${spec.width} cm`,
        ),
        createElement(
          "text",
          { key: "height", x: 285, y: 75, textAnchor: "middle" },
          `${spec.height} cm`,
        ),
      ]);
    }
    case "DATA_DISPLAY":
      return createElement(
        "div",
        { className: "curriculum-visual__data", "aria-hidden": true },
        spec.entries.map((entry) =>
          createElement(
            "div",
            { className: "curriculum-visual__data-row", key: entry.label },
            createElement("strong", null, entry.label),
            createElement(
              "span",
              null,
              entry.value ??
                Array.from({ length: entry.count }, (_, index) =>
                  createElement("i", { key: index }),
                ),
            ),
          ),
        ),
      );
    case "CLOCK_FACE": {
      const minuteAngle = (spec.minute / 60) * Math.PI * 2 - Math.PI / 2;
      const hourAngle =
        (((spec.hour % 12) + spec.minute / 60) / 12) * Math.PI * 2 -
        Math.PI / 2;
      const hand = (
        key: string,
        angle: number,
        length: number,
        width: number,
      ) =>
        createElement("line", {
          key,
          x1: 160,
          y1: 80,
          x2: 160 + Math.cos(angle) * length,
          y2: 80 + Math.sin(angle) * length,
          strokeWidth: width,
        });
      return svg([
        createElement("circle", {
          key: "face",
          cx: 160,
          cy: 80,
          r: 62,
        }),
        ...[12, 3, 6, 9].map((value, index) =>
          createElement(
            "text",
            {
              key: value,
              x: [160, 214, 160, 106][index],
              y: [28, 85, 140, 85][index],
              textAnchor: "middle",
            },
            String(value),
          ),
        ),
        hand("hour-hand", hourAngle, 32, 5),
        hand("minute-hand", minuteAngle, 48, 3),
        createElement("circle", {
          key: "pivot",
          cx: 160,
          cy: 80,
          r: 4,
        }),
      ]);
    }
  }
}

export function CurriculumVisual({ spec }: Props) {
  if (
    !spec ||
    typeof spec !== "object" ||
    !("type" in spec) ||
    ![
      "COUNTER_ROW",
      "TEXT_ONLY",
      "PLACE_VALUE_CHART",
      "FRACTION_BAR",
      "DECIMAL_PLACE_VALUE_CHART",
      "NUMBER_LINE",
      "RATIO_TABLE",
      "BALANCE_MODEL",
      "COORDINATE_PLANE",
      "SHAPE_SCENE",
      "SOLID_NET",
      "MEASUREMENT_SCALE",
      "ANGLE_DIAGRAM",
      "AREA_MODEL",
      "DATA_DISPLAY",
      "CLOCK_FACE",
    ].includes(spec.type)
  ) {
    return createElement(
      "p",
      { "data-visual-unsupported": true, role: "alert" },
      "Không thể hiển thị mô hình trực quan này.",
    );
  }

  if (spec.type === "TEXT_ONLY") return null;

  return createElement(
    "figure",
    {
      "aria-label": spec.description,
      className: `curriculum-visual curriculum-visual--${spec.type.toLowerCase()}`,
      role: "img",
    },
    createElement(
      "div",
      { className: "curriculum-visual__canvas" },
      renderVisual(spec),
    ),
    createElement("figcaption", null, spec.description),
  );
}
