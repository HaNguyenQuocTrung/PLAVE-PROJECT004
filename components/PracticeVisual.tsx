import type {
  AnalogClockVisualSpec,
  DailyEventSequenceVisualSpec,
  EqualUnitMeasurementVisualSpec,
  LengthComparisonVisualSpec,
  NumberCardVisualSpec,
  NumberLineVisualSpec,
  PlaceValueChartVisualSpec,
  PracticeVisualItem,
  PracticeVisualSpec,
  ShapeSceneVisualSpec,
  SimpleCalendarVisualSpec,
  SimpleRulerVisualSpec,
  SolidSceneVisualSpec,
  PracticeSolidItem,
  WeekdayStripVisualSpec,
} from "@/lib/practice/visual";
import { getReadableLabelStep } from "@/lib/practice/visual";

type PracticeVisualProps = {
  spec: PracticeVisualSpec;
  compact?: boolean;
};

const shapeLabels: Record<PracticeVisualItem["shape"], string> = {
  CIRCLE: "hình tròn",
  TRIANGLE: "hình tam giác",
  SQUARE: "hình vuông",
  RECTANGLE: "hình chữ nhật",
};

function getTrianglePoints(item: PracticeVisualItem) {
  const middleX = item.x + item.width / 2;
  return `${middleX},${item.y} ${item.x + item.width},${
    item.y + item.height
  } ${item.x},${item.y + item.height}`;
}

function VisualShape({ item }: { item: PracticeVisualItem }) {
  const commonProps = {
    className: "practice-visual__shape",
    vectorEffect: "non-scaling-stroke" as const,
  };

  if (item.shape === "CIRCLE") {
    return (
      <circle
        {...commonProps}
        cx={item.x + item.width / 2}
        cy={item.y + item.height / 2}
        r={item.width / 2}
      />
    );
  }

  if (item.shape === "TRIANGLE") {
    return <polygon {...commonProps} points={getTrianglePoints(item)} />;
  }

  return (
    <rect
      {...commonProps}
      x={item.x}
      y={item.y}
      width={item.width}
      height={item.height}
      rx={item.shape === "RECTANGLE" ? 2 : 1}
    />
  );
}

function ShapeSceneVisual({ spec }: { spec: ShapeSceneVisualSpec }) {
  return (
    <>
      {spec.items.map((item) => (
        <g key={item.id}>
          <VisualShape item={item} />
          <text
            className="practice-visual__label"
            x={item.x + item.width / 2}
            y={item.y + item.height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            aria-hidden="true"
          >
            {item.label}
          </text>
        </g>
      ))}
    </>
  );
}

function LengthComparisonVisual({
  spec,
}: {
  spec: LengthComparisonVisualSpec;
}) {
  return (
    <>
      {spec.items.map((item) => (
        <g key={item.id}>
          <text
            className="practice-visual__object-label"
            x={item.startX - 2}
            y={item.y + 1.5}
            textAnchor="end"
          >
            {item.label}
          </text>
          <line
            className={`practice-visual__length practice-visual__length--${item.pattern.toLowerCase()}`}
            x1={item.startX}
            x2={item.startX + item.length}
            y1={item.y}
            y2={item.y}
            vectorEffect="non-scaling-stroke"
          />
          {item.pattern === "DOUBLE" ? (
            <line
              className="practice-visual__length practice-visual__length--double"
              x1={item.startX}
              x2={item.startX + item.length}
              y1={item.y + 3}
              y2={item.y + 3}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          <line
            className="practice-visual__endpoint"
            x1={item.startX}
            x2={item.startX}
            y1={item.y - 5}
            y2={item.y + 5}
            vectorEffect="non-scaling-stroke"
          />
          <line
            className="practice-visual__endpoint"
            x1={item.startX + item.length}
            x2={item.startX + item.length}
            y1={item.y - 5}
            y2={item.y + 5}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </>
  );
}

function EqualUnitMeasurementVisual({
  spec,
}: {
  spec: EqualUnitMeasurementVisualSpec;
}) {
  const unitCount = (spec.endX - spec.startX) / spec.unitWidth;

  return (
    <>
      <text
        className="practice-visual__object-label"
        x={spec.startX}
        y={spec.y - 9}
      >
        {spec.objectLabel}
      </text>
      <line
        className="practice-visual__measured-object"
        x1={spec.startX}
        x2={spec.endX}
        y1={spec.y}
        y2={spec.y}
        vectorEffect="non-scaling-stroke"
      />
      {Array.from({ length: unitCount }, (_, index) => {
        const x = spec.startX + index * spec.unitWidth;
        return (
          <g key={`${spec.objectLabel}-${index + 1}`}>
            <rect
              className="practice-visual__unit"
              x={x}
              y={spec.y + 10}
              width={spec.unitWidth}
              height={12}
              vectorEffect="non-scaling-stroke"
            />
            <text
              className="practice-visual__unit-label"
              x={x + spec.unitWidth / 2}
              y={spec.y + 18}
              textAnchor="middle"
            >
              {index + 1}
            </text>
          </g>
        );
      })}
      <text
        className="practice-visual__unit-name"
        x={(spec.startX + spec.endX) / 2}
        y={spec.y + 31}
        textAnchor="middle"
      >
        Các {spec.unitLabel} bằng nhau
      </text>
    </>
  );
}

function SimpleRulerVisual({ spec }: { spec: SimpleRulerVisualSpec }) {
  const rulerStartX = 10;
  const rulerWidth = 80;
  const rulerEndX = rulerStartX + rulerWidth;
  const objectEndX =
    rulerStartX + (spec.endValue / spec.maxValue) * rulerWidth;
  const labelStep = getReadableLabelStep(spec.maxValue);

  return (
    <>
      <text
        className="practice-visual__object-label"
        x={rulerStartX}
        y={27}
      >
        {spec.objectLabel}
      </text>
      <line
        className="practice-visual__measured-object"
        x1={rulerStartX}
        x2={objectEndX}
        y1={36}
        y2={36}
        vectorEffect="non-scaling-stroke"
      />
      <line
        className="practice-visual__measurement-guide"
        x1={rulerStartX}
        x2={rulerStartX}
        y1={31}
        y2={72}
        vectorEffect="non-scaling-stroke"
      />
      <line
        className="practice-visual__measurement-guide"
        x1={objectEndX}
        x2={objectEndX}
        y1={31}
        y2={72}
        vectorEffect="non-scaling-stroke"
      />
      <line
        className="practice-visual__ruler"
        x1={rulerStartX}
        x2={rulerEndX}
        y1={66}
        y2={66}
        vectorEffect="non-scaling-stroke"
      />
      {Array.from({ length: spec.maxValue + 1 }, (_, value) => {
        const x = rulerStartX + (value / spec.maxValue) * rulerWidth;
        return (
          <g key={value}>
            <line
              className="practice-visual__tick"
              x1={x}
              x2={x}
              y1={60}
              y2={72}
              vectorEffect="non-scaling-stroke"
            />
            <text
              className="practice-visual__tick-label"
              x={x}
              y={81}
              textAnchor="middle"
            >
              {value === 0 || value === spec.maxValue || value % labelStep === 0
                ? value
                : ""}
            </text>
          </g>
        );
      })}
      <text
        className="practice-visual__unit-name"
        x={rulerEndX + 3}
        y={66}
        textAnchor="start"
      >
        {spec.unitLabel}
      </text>
      <text className="practice-visual__unit-legend" x={84} y={73}>
        đơn vị
      </text>
    </>
  );
}

function getClockPoint(angle: number, length: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: 50 + Math.cos(radians) * length,
    y: 50 + Math.sin(radians) * length,
  };
}

function AnalogClockVisual({ spec }: { spec: AnalogClockVisualSpec }) {
  const hourPoint = getClockPoint(spec.hourAngle, 21);
  const minutePoint = getClockPoint(spec.minuteAngle, 31);

  return (
    <>
      <circle className="practice-visual__clock-face" cx={50} cy={50} r={40} />
      {Array.from({ length: 12 }, (_, index) => {
        const hour = index + 1;
        const point = getClockPoint(hour * 30, 32);
        return (
          <text
            className="practice-visual__clock-number"
            key={hour}
            x={point.x}
            y={point.y}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {hour}
          </text>
        );
      })}
      <line
        className="practice-visual__clock-hand practice-visual__clock-hand--hour"
        x1={50}
        y1={50}
        x2={hourPoint.x}
        y2={hourPoint.y}
        vectorEffect="non-scaling-stroke"
      />
      <line
        className="practice-visual__clock-hand practice-visual__clock-hand--minute"
        x1={50}
        y1={50}
        x2={minutePoint.x}
        y2={minutePoint.y}
        vectorEffect="non-scaling-stroke"
      />
      <circle className="practice-visual__clock-center" cx={50} cy={50} r={2.5} />
    </>
  );
}

function DailyEventIcon({
  icon,
  x,
  y,
}: {
  icon: DailyEventSequenceVisualSpec["events"][number]["icon"];
  x: number;
  y: number;
}) {
  if (icon === "WAKE") {
    return <circle className="practice-visual__event-symbol" cx={x} cy={y} r={6} />;
  }
  if (icon === "SCHOOL") {
    return (
      <>
        <rect
          className="practice-visual__event-symbol"
          x={x - 7}
          y={y - 6}
          width={14}
          height={12}
          rx={1}
        />
        <line
          className="practice-visual__event-detail"
          x1={x}
          y1={y - 6}
          x2={x}
          y2={y + 6}
        />
      </>
    );
  }
  if (icon === "PLAY") {
    return (
      <>
        <circle className="practice-visual__event-symbol" cx={x} cy={y} r={7} />
        <path
          className="practice-visual__event-detail"
          d={`M ${x - 6} ${y} Q ${x} ${y - 5} ${x + 6} ${y}`}
        />
      </>
    );
  }
  if (icon === "SLEEP") {
    return (
      <path
        className="practice-visual__event-symbol"
        d={`M ${x + 5} ${y - 7} A 8 8 0 1 0 ${x + 5} ${y + 7} A 6 6 0 0 1 ${x + 5} ${y - 7}`}
      />
    );
  }
  return (
    <>
      <path
        className="practice-visual__event-symbol"
        d={`M ${x - 8} ${y} Q ${x} ${y + 10} ${x + 8} ${y}`}
      />
      <line
        className="practice-visual__event-detail"
        x1={x - 8}
        y1={y}
        x2={x + 8}
        y2={y}
      />
    </>
  );
}

function DailyEventSequenceVisual({
  spec,
}: {
  spec: DailyEventSequenceVisualSpec;
}) {
  const cardWidth = 84 / spec.events.length;

  return (
    <>
      {spec.events.map((event, index) => {
        const x = 8 + index * cardWidth;
        const centerX = x + cardWidth / 2;
        return (
          <g key={event.id}>
            <rect
              className="practice-visual__event-card"
              x={x}
              y={20}
              width={cardWidth - 3}
              height={58}
              rx={5}
            />
            <circle
              className="practice-visual__event-order"
              cx={centerX}
              cy={28}
              r={6}
            />
            <text
              className="practice-visual__event-order-label"
              x={centerX}
              y={28}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {event.order}
            </text>
            <DailyEventIcon icon={event.icon} x={centerX} y={48} />
            <text
              className="practice-visual__event-label"
              x={centerX}
              y={68}
              textAnchor="middle"
            >
              {event.label}
            </text>
            {index < spec.events.length - 1 ? (
              <text
                className="practice-visual__sequence-arrow"
                x={x + cardWidth - 1.5}
                y={50}
                textAnchor="middle"
                aria-hidden="true"
              >
                →
              </text>
            ) : null}
          </g>
        );
      })}
    </>
  );
}

const weekdayAbbreviations = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function WeekdayStripVisual({ spec }: { spec: WeekdayStripVisualSpec }) {
  const width = 12.5;
  return (
    <>
      {spec.days.map((day, index) => {
        const x = 6 + index * 13.4;
        const focused = index === spec.focusIndex;
        return (
          <g key={day}>
            <rect
              className={`practice-visual__weekday ${
                focused ? "practice-visual__weekday--focused" : ""
              }`}
              x={x}
              y={29}
              width={width}
              height={29}
              rx={3}
            />
            <text
              className="practice-visual__weekday-label"
              x={x + width / 2}
              y={44}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {weekdayAbbreviations[index]}
            </text>
            {focused ? (
              <text
                className="practice-visual__weekday-focus"
                x={x + width / 2}
                y={69}
                textAnchor="middle"
              >
                {spec.focusLabel}
              </text>
            ) : null}
          </g>
        );
      })}
    </>
  );
}

function SimpleCalendarVisual({ spec }: { spec: SimpleCalendarVisualSpec }) {
  const cellWidth = 12;
  const cellHeight = 9;
  const startX = 8;
  const startY = 34;

  return (
    <>
      <text
        className="practice-visual__calendar-title"
        x={50}
        y={13}
        textAnchor="middle"
      >
        {spec.monthLabel}
      </text>
      {weekdayAbbreviations.map((label, index) => (
        <text
          className="practice-visual__calendar-weekday"
          key={label}
          x={startX + index * cellWidth + cellWidth / 2}
          y={26}
          textAnchor="middle"
        >
          {label}
        </text>
      ))}
      {Array.from({ length: spec.dayCount }, (_, index) => {
        const day = index + 1;
        const cellIndex = spec.startWeekday + index;
        const column = cellIndex % 7;
        const row = Math.floor(cellIndex / 7);
        const x = startX + column * cellWidth;
        const y = startY + row * cellHeight;
        const marked = day === spec.markedDay;
        return (
          <g key={day}>
            <rect
              className={`practice-visual__calendar-cell ${
                marked ? "practice-visual__calendar-cell--marked" : ""
              }`}
              x={x}
              y={y}
              width={cellWidth - 1}
              height={cellHeight - 1}
              rx={1}
            />
            <text
              className="practice-visual__calendar-day"
              x={x + (cellWidth - 1) / 2}
              y={y + (cellHeight - 1) / 2}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {day}
            </text>
          </g>
        );
      })}
      <text className="practice-visual__calendar-mark-key" x={50} y={94} textAnchor="middle">
        Khung kép: {spec.markLabel}
      </text>
    </>
  );
}

const solidAppearanceLabels: Record<
  PracticeSolidItem["appearance"],
  string
> = {
  PLAIN: "khối nét liền",
  BLOCK: "khối xếp hình",
  DICE: "con xúc xắc",
  GIFT_BOX: "hộp quà",
  BOOK: "quyển sách",
  BRICK: "viên gạch đồ chơi",
  SHOEBOX: "hộp đựng giày",
};

function SolidItemVisual({ item }: { item: PracticeSolidItem }) {
  const centerX = 10 + (item.column - 1) * 20;
  const frontY = item.row === 1 ? 24 : 62;
  const frontX = centerX - item.frontWidth / 2;
  const offsetX = item.depth;
  const offsetY = -item.depth * 0.65;
  const topPoints = [
    `${frontX},${frontY}`,
    `${frontX + offsetX},${frontY + offsetY}`,
    `${frontX + item.frontWidth + offsetX},${frontY + offsetY}`,
    `${frontX + item.frontWidth},${frontY}`,
  ].join(" ");
  const sidePoints = [
    `${frontX + item.frontWidth},${frontY}`,
    `${frontX + item.frontWidth + offsetX},${frontY + offsetY}`,
    `${frontX + item.frontWidth + offsetX},${frontY + item.frontHeight + offsetY}`,
    `${frontX + item.frontWidth},${frontY + item.frontHeight}`,
  ].join(" ");

  return (
    <g>
      <polygon
        className="practice-visual__solid-face practice-visual__solid-face--top"
        points={topPoints}
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        className="practice-visual__solid-face practice-visual__solid-face--side"
        points={sidePoints}
        vectorEffect="non-scaling-stroke"
      />
      <rect
        className="practice-visual__solid-face practice-visual__solid-face--front"
        x={frontX}
        y={frontY}
        width={item.frontWidth}
        height={item.frontHeight}
        rx={1}
        vectorEffect="non-scaling-stroke"
      />
      {item.appearance === "DICE" ? (
        <>
          <circle
            className="practice-visual__solid-detail"
            cx={frontX + item.frontWidth * 0.3}
            cy={frontY + item.frontHeight * 0.3}
            r={1.1}
          />
          <circle
            className="practice-visual__solid-detail"
            cx={frontX + item.frontWidth * 0.7}
            cy={frontY + item.frontHeight * 0.7}
            r={1.1}
          />
        </>
      ) : null}
      {item.appearance === "GIFT_BOX" ? (
        <>
          <line
            className="practice-visual__solid-line"
            x1={frontX + item.frontWidth / 2}
            x2={frontX + item.frontWidth / 2}
            y1={frontY}
            y2={frontY + item.frontHeight}
          />
          <line
            className="practice-visual__solid-line"
            x1={frontX}
            x2={frontX + item.frontWidth}
            y1={frontY + item.frontHeight / 2}
            y2={frontY + item.frontHeight / 2}
          />
        </>
      ) : null}
      {["BOOK", "BRICK", "SHOEBOX"].includes(item.appearance) ? (
        <line
          className="practice-visual__solid-line"
          x1={frontX + 2}
          x2={frontX + item.frontWidth - 2}
          y1={frontY + 3}
          y2={frontY + 3}
        />
      ) : null}
      <text
        className="practice-visual__solid-label"
        x={centerX + offsetX / 2}
        y={frontY + item.frontHeight + 7}
        textAnchor="middle"
      >
        {item.label}
      </text>
    </g>
  );
}

function SolidSceneVisual({ spec }: { spec: SolidSceneVisualSpec }) {
  return (
    <>
      {spec.items.map((item) => (
        <SolidItemVisual key={item.id} item={item} />
      ))}
    </>
  );
}

function NumberCardVisual({ spec }: { spec: NumberCardVisualSpec }) {
  return (
    <>
      <rect
        className="practice-visual__number-card"
        x={20}
        y={18}
        width={60}
        height={64}
        rx={8}
      />
      <text
        className="practice-visual__number-card-value"
        x={50}
        y={50}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {spec.value}
      </text>
    </>
  );
}

const placeValueLabels = ["Nghìn", "Trăm", "Chục", "Đơn vị"] as const;

function PlaceValueChartVisual({
  spec,
}: {
  spec: PlaceValueChartVisualSpec;
}) {
  const digits = [
    spec.thousands,
    spec.hundreds,
    spec.tens,
    spec.ones,
  ] as const;
  return (
    <>
      {digits.map((digit, index) => {
        const x = 6 + index * 22;
        return (
          <g key={placeValueLabels[index]}>
            <rect
              className="practice-visual__place-cell"
              x={x}
              y={24}
              width={20}
              height={52}
              rx={3}
            />
            <text
              className="practice-visual__place-label"
              x={x + 10}
              y={38}
              textAnchor="middle"
            >
              {placeValueLabels[index]}
            </text>
            <text
              className="practice-visual__place-digit"
              x={x + 10}
              y={61}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {digit}
            </text>
          </g>
        );
      })}
    </>
  );
}

function NumberLineVisual({ spec }: { spec: NumberLineVisualSpec }) {
  const markerId = `number-line-arrow-${spec.start}-${spec.end}-${spec.focusValue}`;
  const values = Array.from(
    { length: spec.end - spec.start + 1 },
    (_, index) => spec.start + index,
  );
  const positionFor = (value: number) =>
    10 + ((value - spec.start) / (spec.end - spec.start)) * 80;
  const labelStep = getReadableLabelStep(spec.end - spec.start);
  return (
    <>
      <line
        className="practice-visual__number-line"
        x1={8}
        x2={94}
        y1={52}
        y2={52}
        markerEnd={`url(#${markerId})`}
      />
      <defs>
        <marker
          id={markerId}
          markerWidth="5"
          markerHeight="5"
          refX="4"
          refY="2.5"
          orient="auto"
        >
          <path className="practice-visual__number-line-arrow" d="M0,0 L5,2.5 L0,5 Z" />
        </marker>
      </defs>
      {values.map((value) => {
        const x = positionFor(value);
        const focused = value === spec.focusValue;
        return (
          <g key={value}>
            {focused ? (
              <rect
                className="practice-visual__number-line-focus"
                x={x - 7}
                y={20}
                width={14}
                height={22}
                rx={3}
              />
            ) : null}
            <line
              className="practice-visual__number-line-tick"
              x1={x}
              x2={x}
              y1={46}
              y2={58}
            />
            <text
              className="practice-visual__number-line-label"
              x={x}
              y={35}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {value === spec.start || value === spec.end ||
              (value - spec.start) % labelStep === 0
                ? value
                : ""}
            </text>
          </g>
        );
      })}
    </>
  );
}

function VisualContent({ spec }: { spec: PracticeVisualSpec }) {
  if (spec.kind === "SHAPE_SCENE") {
    return <ShapeSceneVisual spec={spec} />;
  }
  if (spec.kind === "LENGTH_COMPARISON") {
    return <LengthComparisonVisual spec={spec} />;
  }
  if (spec.kind === "EQUAL_UNIT_MEASUREMENT") {
    return <EqualUnitMeasurementVisual spec={spec} />;
  }
  if (spec.kind === "SIMPLE_RULER") {
    return <SimpleRulerVisual spec={spec} />;
  }
  if (spec.kind === "ANALOG_CLOCK") {
    return <AnalogClockVisual spec={spec} />;
  }
  if (spec.kind === "DAILY_EVENT_SEQUENCE") {
    return <DailyEventSequenceVisual spec={spec} />;
  }
  if (spec.kind === "WEEKDAY_STRIP") {
    return <WeekdayStripVisual spec={spec} />;
  }
  if (spec.kind === "SIMPLE_CALENDAR") {
    return <SimpleCalendarVisual spec={spec} />;
  }
  if (spec.kind === "NUMBER_CARD") {
    return <NumberCardVisual spec={spec} />;
  }
  if (spec.kind === "PLACE_VALUE_CHART") {
    return <PlaceValueChartVisual spec={spec} />;
  }
  if (spec.kind === "NUMBER_LINE") {
    return <NumberLineVisual spec={spec} />;
  }
  return <SolidSceneVisual spec={spec} />;
}

function getVisualCaption(spec: PracticeVisualSpec) {
  if (spec.kind === "SHAPE_SCENE") {
    return `Minh họa gồm ${spec.items.length} hình có nhãn.`;
  }
  if (spec.kind === "LENGTH_COMPARISON") {
    return `Minh họa gồm ${spec.items.length} vật có điểm đầu và điểm cuối rõ ràng.`;
  }
  if (spec.kind === "EQUAL_UNIT_MEASUREMENT") {
    return "Vật được đặt trên các đơn vị bằng nhau, liên tiếp và không có khoảng trống.";
  }
  if (spec.kind === "SIMPLE_RULER") {
    return "Vật được đặt từ vạch 0 trên thước có đơn vị xăng-ti-mét.";
  }
  if (spec.kind === "ANALOG_CLOCK") {
    return "Mặt đồng hồ có đủ số từ 1 đến 12; kim giờ ngắn hơn kim phút.";
  }
  if (spec.kind === "DAILY_EVENT_SEQUENCE") {
    return "Các hoạt động được đánh số và nối bằng mũi tên theo thứ tự.";
  }
  if (spec.kind === "WEEKDAY_STRIP") {
    return "Dải bảy ngày dùng khung kép và nhãn chữ để đánh dấu một ngày.";
  }
  if (spec.kind === "SIMPLE_CALENDAR") {
    return "Tờ lịch bảy cột dùng khung kép và nhãn chữ để đánh dấu ngày cần quan sát.";
  }
  if (spec.kind === "NUMBER_CARD") {
    return "Thẻ số có chữ số lớn và đường viền tương phản rõ.";
  }
  if (spec.kind === "PLACE_VALUE_CHART") {
    return "Bảng giá trị hàng có nhãn chữ và chữ số trong từng cột.";
  }
  if (spec.kind === "NUMBER_LINE") {
    return "Tia số có các mốc tăng từng một đơn vị; mốc cần quan sát có khung đậm.";
  }
  return `Minh họa gồm ${spec.items.length} vật hoặc khối tách rời, có nhãn chữ và đường viền rõ.`;
}

function AccessibleVisualDetails({ spec }: { spec: PracticeVisualSpec }) {
  if (spec.kind === "SHAPE_SCENE") {
    return (
      <ul className="sr-only">
        {spec.items.map((item) => (
          <li key={item.id}>
            Nhãn {item.label}: {shapeLabels[item.shape]}, vị trí ngang {item.x},
            vị trí dọc {item.y}.
          </li>
        ))}
      </ul>
    );
  }

  if (spec.kind === "LENGTH_COMPARISON") {
    return (
      <ul className="sr-only">
        {spec.items.map((item) => (
          <li key={item.id}>
            {item.label} bắt đầu tại {item.startX} và kéo dài {item.length} đơn
            vị minh họa.
          </li>
        ))}
      </ul>
    );
  }

  if (spec.kind === "EQUAL_UNIT_MEASUREMENT") {
    return (
      <p className="sr-only">
        {spec.objectLabel} bắt đầu tại {spec.startX}, kết thúc tại {spec.endX};
        mỗi {spec.unitLabel} rộng {spec.unitWidth} đơn vị minh họa.
      </p>
    );
  }

  if (spec.kind === "SIMPLE_RULER") {
    return (
      <p className="sr-only">
        {spec.objectLabel} bắt đầu ở vạch {spec.startValue} và kết thúc tại vạch{" "}
        {spec.endValue} trên thước {spec.unitLabel}.
      </p>
    );
  }

  if (spec.kind === "ANALOG_CLOCK") {
    return (
      <p className="sr-only">
        Đồng hồ có kim phút dài chỉ số 12 và kim giờ ngắn chỉ số {spec.hour}.
      </p>
    );
  }

  if (spec.kind === "DAILY_EVENT_SEQUENCE") {
    return (
      <ol className="sr-only">
        {spec.events.map((event) => (
          <li key={event.id}>
            Bước {event.order}: {event.label}.
          </li>
        ))}
      </ol>
    );
  }

  if (spec.kind === "WEEKDAY_STRIP") {
    return (
      <p className="sr-only">
        Thứ tự các ngày là {spec.days.join(", ")}. {spec.focusLabel}:{" "}
        {spec.days[spec.focusIndex]}.
      </p>
    );
  }

  if (spec.kind === "SIMPLE_CALENDAR") {
    return (
      <p className="sr-only">
        {spec.monthLabel} có {spec.dayCount} ngày, bắt đầu vào{" "}
        {spec.weekdayLabels[spec.startWeekday]}. {spec.markLabel}: ngày{" "}
        {spec.markedDay}.
      </p>
    );
  }

  if (spec.kind === "NUMBER_CARD") {
    return <p className="sr-only">Thẻ số hiển thị số {spec.value}.</p>;
  }

  if (spec.kind === "PLACE_VALUE_CHART") {
    return (
      <p className="sr-only">
        Bảng có {spec.thousands} nghìn, {spec.hundreds} trăm, {spec.tens} chục
        và {spec.ones} đơn vị.
      </p>
    );
  }

  if (spec.kind === "NUMBER_LINE") {
    return (
      <p className="sr-only">
        Tia số từ {spec.start} đến {spec.end}, tăng từng một đơn vị; mốc{" "}
        {spec.focusValue} được đóng khung.
      </p>
    );
  }

  return (
    <ul className="sr-only">
      {spec.items.map((item) => (
        <li key={item.id}>
          Nhãn {item.label}: {solidAppearanceLabels[item.appearance]}, ở hàng{" "}
          {item.row}, cột {item.column}; mặt trước rộng {item.frontWidth} và
          cao {item.frontHeight} theo tỉ lệ minh họa.
        </li>
      ))}
    </ul>
  );
}

export function PracticeVisual({ spec, compact = false }: PracticeVisualProps) {
  return (
    <figure
      className={`practice-visual practice-visual--${spec.kind.toLowerCase()} ${
        compact ? "practice-visual--compact" : ""
      }`}
    >
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={spec.description}
        preserveAspectRatio="xMidYMid meet"
      >
        <title>{spec.description}</title>
        <VisualContent spec={spec} />
      </svg>
      <figcaption>{getVisualCaption(spec)}</figcaption>
      <AccessibleVisualDetails spec={spec} />
    </figure>
  );
}
