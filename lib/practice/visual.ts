export const practiceVisualShapes = [
  "CIRCLE",
  "TRIANGLE",
  "SQUARE",
  "RECTANGLE",
] as const;

export type PracticeVisualShape = (typeof practiceVisualShapes)[number];

export type PracticeVisualItem = {
  id: string;
  shape: PracticeVisualShape;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
};

export type ShapeSceneVisualSpec = {
  kind: "SHAPE_SCENE";
  description: string;
  items: PracticeVisualItem[];
};

export const practiceLengthPatterns = [
  "SOLID",
  "DASHED",
  "DOUBLE",
] as const;

export type PracticeLengthPattern =
  (typeof practiceLengthPatterns)[number];

export type PracticeLengthItem = {
  id: string;
  label: string;
  startX: number;
  y: number;
  length: number;
  pattern: PracticeLengthPattern;
};

export type LengthComparisonVisualSpec = {
  kind: "LENGTH_COMPARISON";
  description: string;
  items: PracticeLengthItem[];
};

export type EqualUnitMeasurementVisualSpec = {
  kind: "EQUAL_UNIT_MEASUREMENT";
  description: string;
  objectLabel: string;
  unitLabel: string;
  startX: number;
  endX: number;
  y: number;
  unitWidth: number;
};

export type SimpleRulerVisualSpec = {
  kind: "SIMPLE_RULER";
  description: string;
  objectLabel: string;
  unitLabel: "cm";
  startValue: 0;
  endValue: number;
  maxValue: number;
};

/** Pick a label cadence that leaves enough room for readable tick text. */
export function getReadableLabelStep(maxValue: number) {
  if (maxValue <= 12) return 1;
  return Math.max(1, Math.ceil(maxValue / 6));
}

export type AnalogClockVisualSpec = {
  kind: "ANALOG_CLOCK";
  description: string;
  hour: number;
  minute: 0;
  hourAngle: number;
  minuteAngle: 0;
};

export const practiceDailyEventIcons = [
  "WAKE",
  "BREAKFAST",
  "SCHOOL",
  "LUNCH",
  "PLAY",
  "DINNER",
  "SLEEP",
] as const;

export type PracticeDailyEventIcon =
  (typeof practiceDailyEventIcons)[number];

export type PracticeDailyEvent = {
  id: string;
  label: string;
  order: number;
  icon: PracticeDailyEventIcon;
};

export type DailyEventSequenceVisualSpec = {
  kind: "DAILY_EVENT_SEQUENCE";
  description: string;
  events: PracticeDailyEvent[];
};

export const practiceWeekdays = [
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
  "Chủ nhật",
] as const;

export type PracticeWeekday = (typeof practiceWeekdays)[number];

export type WeekdayStripVisualSpec = {
  kind: "WEEKDAY_STRIP";
  description: string;
  days: [
    PracticeWeekday,
    PracticeWeekday,
    PracticeWeekday,
    PracticeWeekday,
    PracticeWeekday,
    PracticeWeekday,
    PracticeWeekday,
  ];
  focusIndex: number;
  focusLabel: "Hôm nay" | "Ngày được chọn";
};

export type SimpleCalendarVisualSpec = {
  kind: "SIMPLE_CALENDAR";
  description: string;
  monthLabel: string;
  weekdayLabels: [
    PracticeWeekday,
    PracticeWeekday,
    PracticeWeekday,
    PracticeWeekday,
    PracticeWeekday,
    PracticeWeekday,
    PracticeWeekday,
  ];
  startWeekday: number;
  dayCount: number;
  markedDay: number;
  markLabel: "Ngày được chọn";
};

export const practiceSolidAppearances = [
  "PLAIN",
  "BLOCK",
  "DICE",
  "GIFT_BOX",
  "BOOK",
  "BRICK",
  "SHOEBOX",
] as const;

export type PracticeSolidAppearance =
  (typeof practiceSolidAppearances)[number];

export type PracticeSolidItem = {
  id: string;
  label: string;
  row: number;
  column: number;
  frontWidth: number;
  frontHeight: number;
  depth: number;
  appearance: PracticeSolidAppearance;
};

export type SolidSceneVisualSpec = {
  kind: "SOLID_SCENE";
  description: string;
  items: PracticeSolidItem[];
};

export type NumberCardVisualSpec = {
  kind: "NUMBER_CARD";
  description: string;
  value: number;
};

export type PlaceValueChartVisualSpec = {
  kind: "PLACE_VALUE_CHART";
  description: string;
  thousands: number;
  hundreds: number;
  tens: number;
  ones: number;
};

export type NumberLineVisualSpec = {
  kind: "NUMBER_LINE";
  description: string;
  start: number;
  end: number;
  focusValue: number;
};

export type PracticeVisualSpec =
  | ShapeSceneVisualSpec
  | LengthComparisonVisualSpec
  | EqualUnitMeasurementVisualSpec
  | SimpleRulerVisualSpec
  | AnalogClockVisualSpec
  | DailyEventSequenceVisualSpec
  | WeekdayStripVisualSpec
  | SimpleCalendarVisualSpec
  | SolidSceneVisualSpec
  | NumberCardVisualSpec
  | PlaceValueChartVisualSpec
  | NumberLineVisualSpec;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
) {
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...allowedKeys].sort();
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === expectedKeys[index])
  );
}

function isSafeText(
  value: unknown,
  minimum: number,
  maximum: number,
): value is string {
  return (
    typeof value === "string" &&
    value === value.trim() &&
    value.length >= minimum &&
    value.length <= maximum &&
    !/[<>]/.test(value) &&
    !/(?:https?:|data:|javascript:|www\.)/i.test(value)
  );
}

function isIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function isPracticeVisualShape(
  value: unknown,
): value is PracticeVisualShape {
  return practiceVisualShapes.some((shape) => shape === value);
}

function parseShapeItem(value: unknown): PracticeVisualItem | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "height",
      "id",
      "label",
      "shape",
      "width",
      "x",
      "y",
    ]) ||
    typeof value.id !== "string" ||
    !/^[a-z][a-z0-9-]{0,19}$/.test(value.id) ||
    !isPracticeVisualShape(value.shape) ||
    !isIntegerInRange(value.x, 0, 88) ||
    !isIntegerInRange(value.y, 0, 88) ||
    !isIntegerInRange(value.width, 12, 32) ||
    !isIntegerInRange(value.height, 12, 32) ||
    value.x + value.width > 100 ||
    value.y + value.height > 100 ||
    !isSafeText(value.label, 1, 20)
  ) {
    return null;
  }

  if (
    (value.shape === "CIRCLE" ||
      value.shape === "TRIANGLE" ||
      value.shape === "SQUARE") &&
    value.width !== value.height
  ) {
    return null;
  }
  if (value.shape === "RECTANGLE" && value.width === value.height) {
    return null;
  }

  return {
    id: value.id,
    shape: value.shape,
    x: value.x,
    y: value.y,
    width: value.width,
    height: value.height,
    label: value.label,
  };
}

function parseShapeSceneVisualSpec(
  value: Record<string, unknown>,
): ShapeSceneVisualSpec | null {
  if (
    !hasOnlyKeys(value, ["description", "items", "kind"]) ||
    value.kind !== "SHAPE_SCENE" ||
    !isSafeText(value.description, 12, 240) ||
    !Array.isArray(value.items) ||
    value.items.length < 1 ||
    value.items.length > 8
  ) {
    return null;
  }

  const items: PracticeVisualItem[] = [];
  for (const item of value.items) {
    const parsed = parseShapeItem(item);
    if (!parsed) return null;
    items.push(parsed);
  }

  if (new Set(items.map((item) => item.id)).size !== items.length) {
    return null;
  }

  return {
    kind: "SHAPE_SCENE",
    description: value.description,
    items,
  };
}

function isPracticeLengthPattern(
  value: unknown,
): value is PracticeLengthPattern {
  return practiceLengthPatterns.some((pattern) => pattern === value);
}

function parseLengthItem(value: unknown): PracticeLengthItem | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "id",
      "label",
      "length",
      "pattern",
      "startX",
      "y",
    ]) ||
    typeof value.id !== "string" ||
    !/^[a-z][a-z0-9-]{0,19}$/.test(value.id) ||
    !isSafeText(value.label, 1, 24) ||
    !isIntegerInRange(value.startX, 5, 70) ||
    !isIntegerInRange(value.y, 10, 82) ||
    !isIntegerInRange(value.length, 10, 80) ||
    value.startX + value.length > 95 ||
    !isPracticeLengthPattern(value.pattern)
  ) {
    return null;
  }

  return {
    id: value.id,
    label: value.label,
    startX: value.startX,
    y: value.y,
    length: value.length,
    pattern: value.pattern,
  };
}

function parseLengthComparisonVisualSpec(
  value: Record<string, unknown>,
): LengthComparisonVisualSpec | null {
  if (
    !hasOnlyKeys(value, ["description", "items", "kind"]) ||
    value.kind !== "LENGTH_COMPARISON" ||
    !isSafeText(value.description, 12, 240) ||
    !Array.isArray(value.items) ||
    value.items.length < 2 ||
    value.items.length > 4
  ) {
    return null;
  }

  const items: PracticeLengthItem[] = [];
  for (const item of value.items) {
    const parsed = parseLengthItem(item);
    if (!parsed) return null;
    items.push(parsed);
  }

  if (
    new Set(items.map((item) => item.id)).size !== items.length ||
    new Set(items.map((item) => item.label)).size !== items.length ||
    new Set(items.map((item) => item.startX)).size !== 1
  ) {
    return null;
  }

  return {
    kind: "LENGTH_COMPARISON",
    description: value.description,
    items,
  };
}

function parseEqualUnitMeasurementVisualSpec(
  value: Record<string, unknown>,
): EqualUnitMeasurementVisualSpec | null {
  if (
    !hasOnlyKeys(value, [
      "description",
      "endX",
      "kind",
      "objectLabel",
      "startX",
      "unitLabel",
      "unitWidth",
      "y",
    ]) ||
    value.kind !== "EQUAL_UNIT_MEASUREMENT" ||
    !isSafeText(value.description, 12, 240) ||
    !isSafeText(value.objectLabel, 1, 32) ||
    !isSafeText(value.unitLabel, 1, 20) ||
    !isIntegerInRange(value.startX, 5, 30) ||
    !isIntegerInRange(value.endX, 30, 95) ||
    value.endX <= value.startX ||
    !isIntegerInRange(value.y, 20, 65) ||
    !isIntegerInRange(value.unitWidth, 5, 15) ||
    (value.endX - value.startX) % value.unitWidth !== 0 ||
    (value.endX - value.startX) / value.unitWidth < 2 ||
    (value.endX - value.startX) / value.unitWidth > 10
  ) {
    return null;
  }

  return {
    kind: "EQUAL_UNIT_MEASUREMENT",
    description: value.description,
    objectLabel: value.objectLabel,
    unitLabel: value.unitLabel,
    startX: value.startX,
    endX: value.endX,
    y: value.y,
    unitWidth: value.unitWidth,
  };
}

function parseSimpleRulerVisualSpec(
  value: Record<string, unknown>,
): SimpleRulerVisualSpec | null {
  if (
    !hasOnlyKeys(value, [
      "description",
      "endValue",
      "kind",
      "maxValue",
      "objectLabel",
      "startValue",
      "unitLabel",
    ]) ||
    value.kind !== "SIMPLE_RULER" ||
    !isSafeText(value.description, 12, 240) ||
    !isSafeText(value.objectLabel, 1, 32) ||
    value.unitLabel !== "cm" ||
    value.startValue !== 0 ||
    !isIntegerInRange(value.endValue, 1, 10) ||
    !isIntegerInRange(value.maxValue, 5, 10) ||
    value.endValue > value.maxValue
  ) {
    return null;
  }

  return {
    kind: "SIMPLE_RULER",
    description: value.description,
    objectLabel: value.objectLabel,
    unitLabel: "cm",
    startValue: 0,
    endValue: value.endValue,
    maxValue: value.maxValue,
  };
}

function parseAnalogClockVisualSpec(
  value: Record<string, unknown>,
): AnalogClockVisualSpec | null {
  if (
    !hasOnlyKeys(value, [
      "description",
      "hour",
      "hourAngle",
      "kind",
      "minute",
      "minuteAngle",
    ]) ||
    value.kind !== "ANALOG_CLOCK" ||
    !isSafeText(value.description, 12, 240) ||
    !isIntegerInRange(value.hour, 1, 12) ||
    value.minute !== 0 ||
    value.minuteAngle !== 0 ||
    !isIntegerInRange(value.hourAngle, 0, 330) ||
    value.hourAngle !== (value.hour % 12) * 30
  ) {
    return null;
  }

  return {
    kind: "ANALOG_CLOCK",
    description: value.description,
    hour: value.hour,
    minute: 0,
    hourAngle: value.hourAngle,
    minuteAngle: 0,
  };
}

function isPracticeDailyEventIcon(
  value: unknown,
): value is PracticeDailyEventIcon {
  return practiceDailyEventIcons.some((icon) => icon === value);
}

function parseDailyEvent(value: unknown): PracticeDailyEvent | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["icon", "id", "label", "order"]) ||
    typeof value.id !== "string" ||
    !/^[a-z][a-z0-9-]{0,19}$/.test(value.id) ||
    !isSafeText(value.label, 2, 28) ||
    !isIntegerInRange(value.order, 1, 4) ||
    !isPracticeDailyEventIcon(value.icon)
  ) {
    return null;
  }

  return {
    id: value.id,
    label: value.label,
    order: value.order,
    icon: value.icon,
  };
}

function parseDailyEventSequenceVisualSpec(
  value: Record<string, unknown>,
): DailyEventSequenceVisualSpec | null {
  if (
    !hasOnlyKeys(value, ["description", "events", "kind"]) ||
    value.kind !== "DAILY_EVENT_SEQUENCE" ||
    !isSafeText(value.description, 12, 240) ||
    !Array.isArray(value.events) ||
    value.events.length < 3 ||
    value.events.length > 4
  ) {
    return null;
  }

  const events: PracticeDailyEvent[] = [];
  for (const event of value.events) {
    const parsed = parseDailyEvent(event);
    if (!parsed) return null;
    events.push(parsed);
  }

  const expectedOrders = events.map((_, index) => index + 1);
  const actualOrders = events.map((event) => event.order);
  if (
    new Set(events.map((event) => event.id)).size !== events.length ||
    new Set(events.map((event) => event.label)).size !== events.length ||
    actualOrders.some((order, index) => order !== expectedOrders[index])
  ) {
    return null;
  }

  return {
    kind: "DAILY_EVENT_SEQUENCE",
    description: value.description,
    events,
  };
}

function isExactWeekdayList(
  value: unknown,
): value is WeekdayStripVisualSpec["days"] {
  return (
    Array.isArray(value) &&
    value.length === practiceWeekdays.length &&
    value.every((day, index) => day === practiceWeekdays[index])
  );
}

function parseWeekdayStripVisualSpec(
  value: Record<string, unknown>,
): WeekdayStripVisualSpec | null {
  if (
    !hasOnlyKeys(value, [
      "days",
      "description",
      "focusIndex",
      "focusLabel",
      "kind",
    ]) ||
    value.kind !== "WEEKDAY_STRIP" ||
    !isSafeText(value.description, 12, 240) ||
    !isExactWeekdayList(value.days) ||
    !isIntegerInRange(value.focusIndex, 0, 6) ||
    (value.focusLabel !== "Hôm nay" &&
      value.focusLabel !== "Ngày được chọn")
  ) {
    return null;
  }

  return {
    kind: "WEEKDAY_STRIP",
    description: value.description,
    days: value.days,
    focusIndex: value.focusIndex,
    focusLabel: value.focusLabel,
  };
}

function parseSimpleCalendarVisualSpec(
  value: Record<string, unknown>,
): SimpleCalendarVisualSpec | null {
  if (
    !hasOnlyKeys(value, [
      "dayCount",
      "description",
      "kind",
      "markedDay",
      "markLabel",
      "monthLabel",
      "startWeekday",
      "weekdayLabels",
    ]) ||
    value.kind !== "SIMPLE_CALENDAR" ||
    !isSafeText(value.description, 12, 240) ||
    !isSafeText(value.monthLabel, 5, 24) ||
    !isExactWeekdayList(value.weekdayLabels) ||
    !isIntegerInRange(value.startWeekday, 0, 6) ||
    !isIntegerInRange(value.dayCount, 28, 31) ||
    !isIntegerInRange(value.markedDay, 1, 31) ||
    value.markedDay > value.dayCount ||
    value.markLabel !== "Ngày được chọn"
  ) {
    return null;
  }

  return {
    kind: "SIMPLE_CALENDAR",
    description: value.description,
    monthLabel: value.monthLabel,
    weekdayLabels: value.weekdayLabels,
    startWeekday: value.startWeekday,
    dayCount: value.dayCount,
    markedDay: value.markedDay,
    markLabel: "Ngày được chọn",
  };
}

function isPracticeSolidAppearance(
  value: unknown,
): value is PracticeSolidAppearance {
  return practiceSolidAppearances.some(
    (appearance) => appearance === value,
  );
}

function parseSolidItem(value: unknown): PracticeSolidItem | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "appearance",
      "column",
      "depth",
      "frontHeight",
      "frontWidth",
      "id",
      "label",
      "row",
    ]) ||
    typeof value.id !== "string" ||
    !/^[a-z][a-z0-9-]{0,19}$/.test(value.id) ||
    !isSafeText(value.label, 1, 16) ||
    !isIntegerInRange(value.row, 1, 2) ||
    !isIntegerInRange(value.column, 1, 5) ||
    !isIntegerInRange(value.frontWidth, 10, 16) ||
    !isIntegerInRange(value.frontHeight, 10, 18) ||
    !isIntegerInRange(value.depth, 4, 6) ||
    !isPracticeSolidAppearance(value.appearance)
  ) {
    return null;
  }

  if (
    ["DICE", "GIFT_BOX"].includes(value.appearance) &&
    value.frontWidth !== value.frontHeight
  ) {
    return null;
  }
  if (
    ["BOOK", "BRICK", "SHOEBOX"].includes(value.appearance) &&
    value.frontWidth === value.frontHeight
  ) {
    return null;
  }

  return {
    id: value.id,
    label: value.label,
    row: value.row,
    column: value.column,
    frontWidth: value.frontWidth,
    frontHeight: value.frontHeight,
    depth: value.depth,
    appearance: value.appearance,
  };
}

function parseSolidSceneVisualSpec(
  value: Record<string, unknown>,
): SolidSceneVisualSpec | null {
  if (
    !hasOnlyKeys(value, ["description", "items", "kind"]) ||
    value.kind !== "SOLID_SCENE" ||
    !isSafeText(value.description, 12, 240) ||
    !Array.isArray(value.items) ||
    value.items.length < 1 ||
    value.items.length > 10
  ) {
    return null;
  }

  const items: PracticeSolidItem[] = [];
  for (const item of value.items) {
    const parsed = parseSolidItem(item);
    if (!parsed) return null;
    items.push(parsed);
  }

  if (
    new Set(items.map((item) => item.id)).size !== items.length ||
    new Set(items.map((item) => item.label)).size !== items.length ||
    new Set(items.map((item) => `${item.row}:${item.column}`)).size !==
      items.length
  ) {
    return null;
  }

  return {
    kind: "SOLID_SCENE",
    description: value.description,
    items,
  };
}

function parseNumberCardVisualSpec(
  value: Record<string, unknown>,
): NumberCardVisualSpec | null {
  if (
    !hasOnlyKeys(value, ["description", "kind", "value"]) ||
    value.kind !== "NUMBER_CARD" ||
    !isSafeText(value.description, 12, 240) ||
    !isIntegerInRange(value.value, 0, 1000)
  ) {
    return null;
  }
  return {
    kind: "NUMBER_CARD",
    description: value.description,
    value: value.value,
  };
}

function parsePlaceValueChartVisualSpec(
  value: Record<string, unknown>,
): PlaceValueChartVisualSpec | null {
  if (
    !hasOnlyKeys(value, [
      "description",
      "hundreds",
      "kind",
      "ones",
      "tens",
      "thousands",
    ]) ||
    value.kind !== "PLACE_VALUE_CHART" ||
    !isSafeText(value.description, 12, 240) ||
    !isIntegerInRange(value.thousands, 0, 1) ||
    !isIntegerInRange(value.hundreds, 0, 9) ||
    !isIntegerInRange(value.tens, 0, 9) ||
    !isIntegerInRange(value.ones, 0, 9)
  ) {
    return null;
  }
  const composedValue =
    value.thousands * 1000 +
    value.hundreds * 100 +
    value.tens * 10 +
    value.ones;
  if (composedValue > 1000) return null;
  return {
    kind: "PLACE_VALUE_CHART",
    description: value.description,
    thousands: value.thousands,
    hundreds: value.hundreds,
    tens: value.tens,
    ones: value.ones,
  };
}

function parseNumberLineVisualSpec(
  value: Record<string, unknown>,
): NumberLineVisualSpec | null {
  if (
    !hasOnlyKeys(value, [
      "description",
      "end",
      "focusValue",
      "kind",
      "start",
    ]) ||
    value.kind !== "NUMBER_LINE" ||
    !isSafeText(value.description, 12, 240) ||
    !isIntegerInRange(value.start, 0, 1000) ||
    !isIntegerInRange(value.end, 0, 1000) ||
    !isIntegerInRange(value.focusValue, 0, 1000) ||
    value.start >= value.end ||
    value.end - value.start > 10 ||
    value.focusValue < value.start ||
    value.focusValue > value.end
  ) {
    return null;
  }
  return {
    kind: "NUMBER_LINE",
    description: value.description,
    start: value.start,
    end: value.end,
    focusValue: value.focusValue,
  };
}

export function parsePracticeVisualSpec(
  value: unknown,
): PracticeVisualSpec | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;

  if (value.kind === "SHAPE_SCENE") {
    return parseShapeSceneVisualSpec(value);
  }
  if (value.kind === "LENGTH_COMPARISON") {
    return parseLengthComparisonVisualSpec(value);
  }
  if (value.kind === "EQUAL_UNIT_MEASUREMENT") {
    return parseEqualUnitMeasurementVisualSpec(value);
  }
  if (value.kind === "SIMPLE_RULER") {
    return parseSimpleRulerVisualSpec(value);
  }
  if (value.kind === "ANALOG_CLOCK") {
    return parseAnalogClockVisualSpec(value);
  }
  if (value.kind === "DAILY_EVENT_SEQUENCE") {
    return parseDailyEventSequenceVisualSpec(value);
  }
  if (value.kind === "WEEKDAY_STRIP") {
    return parseWeekdayStripVisualSpec(value);
  }
  if (value.kind === "SIMPLE_CALENDAR") {
    return parseSimpleCalendarVisualSpec(value);
  }
  if (value.kind === "SOLID_SCENE") {
    return parseSolidSceneVisualSpec(value);
  }
  if (value.kind === "NUMBER_CARD") {
    return parseNumberCardVisualSpec(value);
  }
  if (value.kind === "PLACE_VALUE_CHART") {
    return parsePlaceValueChartVisualSpec(value);
  }
  if (value.kind === "NUMBER_LINE") {
    return parseNumberLineVisualSpec(value);
  }
  return null;
}
