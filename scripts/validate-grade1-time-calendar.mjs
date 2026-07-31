import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/0029_grade1_time_clock_calendar.sql",
);
const source = readFileSync(migrationPath, "utf8");

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function readTaggedJson(tag) {
  const marker = `$${tag}$`;
  const start = source.indexOf(marker);
  const end = source.indexOf(marker, start + marker.length);
  assertCondition(start >= 0 && end >= 0, `Không tìm thấy payload ${tag}.`);
  return JSON.parse(source.slice(start + marker.length, end));
}

function hasExactKeys(value, keys) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function isSafeText(value, minimum, maximum) {
  return (
    typeof value === "string" &&
    value === value.trim() &&
    value.length >= minimum &&
    value.length <= maximum &&
    !/[<>]/.test(value) &&
    !/(?:https?:|data:|javascript:|www\.)/i.test(value)
  );
}

function isIntegerInRange(value, minimum, maximum) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

const weekdays = [
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
  "Chủ nhật",
];
const eventIcons = new Set([
  "WAKE",
  "BREAKFAST",
  "SCHOOL",
  "LUNCH",
  "PLAY",
  "DINNER",
  "SLEEP",
]);
const skills = [
  "READ_WHOLE_HOURS",
  "ORDER_DAILY_EVENTS",
  "DAYS_OF_WEEK",
  "READ_SIMPLE_CALENDAR",
];
const expectedTypeDistribution = {
  READ_WHOLE_HOURS: { MULTIPLE_CHOICE: 2, NUMBER_INPUT: 4 },
  ORDER_DAILY_EVENTS: { MULTIPLE_CHOICE: 6, NUMBER_INPUT: 0 },
  DAYS_OF_WEEK: { MULTIPLE_CHOICE: 6, NUMBER_INPUT: 0 },
  READ_SIMPLE_CALENDAR: { MULTIPLE_CHOICE: 2, NUMBER_INPUT: 4 },
};

function validateNoUnsafeFields(value, path = "visual_spec") {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateNoUnsafeFields(item, `${path}[${index}]`),
    );
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    assertCondition(
      !/^(?:html|svg|script|url|src|href|dataUrl|on[A-Z]|is_correct|correct_answer)$/i.test(
        key,
      ),
      `${path}: field ${key} không được phép.`,
    );
    validateNoUnsafeFields(child, `${path}.${key}`);
  }
}

function validateAnalogClock(spec, code) {
  assertCondition(
    hasExactKeys(spec, [
      "description",
      "hour",
      "hourAngle",
      "kind",
      "minute",
      "minuteAngle",
    ]) &&
      isIntegerInRange(spec.hour, 1, 12) &&
      spec.minute === 0 &&
      spec.minuteAngle === 0 &&
      isIntegerInRange(spec.hourAngle, 0, 330) &&
      spec.hourAngle === (spec.hour % 12) * 30,
    `${code}: đồng hồ không biểu diễn một giờ đúng hợp lệ.`,
  );
}

function validateDailySequence(spec, code) {
  assertCondition(
    hasExactKeys(spec, ["description", "events", "kind"]) &&
      Array.isArray(spec.events) &&
      spec.events.length >= 3 &&
      spec.events.length <= 4,
    `${code}: chuỗi hoạt động sai contract.`,
  );

  const ids = new Set();
  const labels = new Set();
  spec.events.forEach((event, index) => {
    assertCondition(
      hasExactKeys(event, ["icon", "id", "label", "order"]) &&
        typeof event.id === "string" &&
        /^[a-z][a-z0-9-]{0,19}$/.test(event.id) &&
        !ids.has(event.id) &&
        isSafeText(event.label, 2, 28) &&
        !labels.has(event.label) &&
        event.order === index + 1 &&
        eventIcons.has(event.icon),
      `${code}: hoạt động thứ ${index + 1} không hợp lệ.`,
    );
    ids.add(event.id);
    labels.add(event.label);
  });
}

function isExactWeekdayList(value) {
  return (
    Array.isArray(value) &&
    value.length === weekdays.length &&
    value.every((day, index) => day === weekdays[index])
  );
}

function validateWeekdayStrip(spec, code) {
  assertCondition(
    hasExactKeys(spec, [
      "days",
      "description",
      "focusIndex",
      "focusLabel",
      "kind",
    ]) &&
      isExactWeekdayList(spec.days) &&
      isIntegerInRange(spec.focusIndex, 0, 6) &&
      ["Hôm nay", "Ngày được chọn"].includes(spec.focusLabel),
    `${code}: dải ngày trong tuần không hợp lệ.`,
  );
}

function validateCalendar(spec, code) {
  assertCondition(
    hasExactKeys(spec, [
      "dayCount",
      "description",
      "kind",
      "markedDay",
      "markLabel",
      "monthLabel",
      "startWeekday",
      "weekdayLabels",
    ]) &&
      isSafeText(spec.monthLabel, 5, 24) &&
      isExactWeekdayList(spec.weekdayLabels) &&
      isIntegerInRange(spec.startWeekday, 0, 6) &&
      isIntegerInRange(spec.dayCount, 28, 31) &&
      isIntegerInRange(spec.markedDay, 1, spec.dayCount) &&
      spec.markLabel === "Ngày được chọn" &&
      spec.startWeekday + spec.dayCount <= 37,
    `${code}: lịch bảy cột không hợp lệ.`,
  );
}

function validateVisualSpec(spec, code) {
  assertCondition(
    spec &&
      typeof spec === "object" &&
      !Array.isArray(spec) &&
      isSafeText(spec.description, 12, 240),
    `${code}: visual_spec hoặc mô tả accessibility không hợp lệ.`,
  );
  validateNoUnsafeFields(spec);
  assertCondition(
    !/(?:đáp án|đúng là|sai là|answer is|correct is)/i.test(spec.description),
    `${code}: mô tả visual làm lộ đáp án.`,
  );

  if (spec.kind === "ANALOG_CLOCK") {
    validateAnalogClock(spec, code);
  } else if (spec.kind === "DAILY_EVENT_SEQUENCE") {
    validateDailySequence(spec, code);
  } else if (spec.kind === "WEEKDAY_STRIP") {
    validateWeekdayStrip(spec, code);
  } else if (spec.kind === "SIMPLE_CALENDAR") {
    validateCalendar(spec, code);
  } else {
    throw new Error(`${code}: loại visual ngoài allowlist Sprint 5K.`);
  }
}

function eventById(question, id) {
  return question.visual_spec.events.find((event) => event.id === id);
}

function deriveExpectedAnswer(question) {
  const { check, visual_spec: spec } = question;
  assertCondition(
    check && typeof check.kind === "string",
    `${question.code}: thiếu phép kiểm tra deterministic.`,
  );

  if (check.kind === "READ_CLOCK") {
    assertCondition(
      spec.kind === "ANALOG_CLOCK" && check.hour === spec.hour,
      `${question.code}: đáp án giờ không khớp góc kim.`,
    );
    return question.question_type === "MULTIPLE_CHOICE"
      ? `${spec.hour} giờ`
      : spec.hour;
  }

  if (
    ["BEFORE", "AFTER", "FIRST", "LAST", "BETWEEN", "FULL_ORDER"].includes(
      check.kind,
    )
  ) {
    assertCondition(
      spec.kind === "DAILY_EVENT_SEQUENCE",
      `${question.code}: phép kiểm tra hoạt động dùng sai visual.`,
    );
    if (check.kind === "FULL_ORDER") {
      assertCondition(
        check.targets.join(",") ===
          spec.events.map((event) => event.id).join(","),
        `${question.code}: thứ tự hoạt động không khớp visual.`,
      );
      return spec.events.map((event) => event.label).join(", ");
    }

    const target = eventById(question, check.target);
    assertCondition(target, `${question.code}: không tìm thấy hoạt động đích.`);
    if (check.kind === "FIRST") {
      assertCondition(target.order === 1, `${question.code}: đích không ở đầu.`);
    } else if (check.kind === "LAST") {
      assertCondition(
        target.order === spec.events.length,
        `${question.code}: đích không ở cuối.`,
      );
    } else if (check.kind === "BEFORE" || check.kind === "AFTER") {
      const reference = eventById(question, check.reference);
      const offset = check.kind === "BEFORE" ? -1 : 1;
      assertCondition(
        reference && target.order === reference.order + offset,
        `${question.code}: quan hệ trước/sau không khớp.`,
      );
    } else {
      const before = eventById(question, check.before);
      const after = eventById(question, check.after);
      assertCondition(
        before &&
          after &&
          target.order === before.order + 1 &&
          target.order === after.order - 1,
        `${question.code}: quan hệ ở giữa không khớp.`,
      );
    }
    return target.label;
  }

  if (check.kind === "NEXT_WEEKDAY" || check.kind === "PREVIOUS_WEEKDAY") {
    assertCondition(
      spec.kind === "WEEKDAY_STRIP" &&
        check.focusIndex === spec.focusIndex,
      `${question.code}: ngày được chọn không khớp visual.`,
    );
    const offset = check.kind === "NEXT_WEEKDAY" ? 1 : -1;
    return weekdays[(spec.focusIndex + offset + 7) % 7];
  }

  assertCondition(
    spec.kind === "SIMPLE_CALENDAR",
    `${question.code}: phép kiểm tra lịch dùng sai visual.`,
  );
  if (check.kind === "MARKED_DAY") {
    assertCondition(
      check.day === spec.markedDay,
      `${question.code}: ngày được đánh dấu không khớp.`,
    );
    return question.question_type === "MULTIPLE_CHOICE"
      ? String(spec.markedDay)
      : spec.markedDay;
  }
  if (check.kind === "MARKED_WEEKDAY") {
    const weekdayIndex = (spec.startWeekday + spec.markedDay - 1) % 7;
    assertCondition(
      check.weekdayIndex === weekdayIndex,
      `${question.code}: cột thứ không khớp ô lịch.`,
    );
    return weekdays[weekdayIndex];
  }
  if (check.kind === "PREVIOUS_DATE") {
    assertCondition(
      spec.markedDay > 1 && check.day === spec.markedDay - 1,
      `${question.code}: ngày liền trước không khớp lịch.`,
    );
    return check.day;
  }
  if (check.kind === "NEXT_DATE") {
    assertCondition(
      spec.markedDay < spec.dayCount && check.day === spec.markedDay + 1,
      `${question.code}: ngày liền sau không khớp lịch.`,
    );
    return check.day;
  }
  if (check.kind === "WEEK_AFTER") {
    assertCondition(
      spec.markedDay + 7 <= spec.dayCount &&
        check.day === spec.markedDay + 7,
      `${question.code}: ô cùng cột ở hàng sau không khớp lịch.`,
    );
    return check.day;
  }
  throw new Error(`${question.code}: phép kiểm tra ${check.kind} không hỗ trợ.`);
}

const objectives = readTaggedJson("objectives");
const lesson = readTaggedJson("lesson");
const questions = readTaggedJson("questions");
const solutions = readTaggedJson("solutions");

assertCondition(
  Array.isArray(objectives) &&
    objectives.length === 4 &&
    objectives.every((objective) => isSafeText(objective, 20, 180)),
  "Mục tiêu học tập không hợp lệ.",
);
assertCondition(
  lesson.sections?.length === 6 &&
    lesson.worked_examples?.length === 2 &&
    lesson.sections.every(
      (section) =>
        isSafeText(section.code, 3, 48) &&
        isSafeText(section.title, 5, 80) &&
        Array.isArray(section.paragraphs) &&
        section.paragraphs.length >= 2 &&
        section.paragraphs.every((paragraph) =>
          isSafeText(paragraph, 20, 260),
        ),
    ) &&
    lesson.worked_examples.every(
      (example) =>
        isSafeText(example.title, 5, 100) &&
        Array.isArray(example.steps) &&
        example.steps.length >= 2 &&
        example.steps.every((step) => isSafeText(step, 15, 220)) &&
        isSafeText(example.answer, 10, 180),
    ),
  "Bài học phải có đúng 6 phần và 2 ví dụ từng bước.",
);

assertCondition(questions.length === 24, "Phải có đúng 24 câu hỏi.");
assertCondition(solutions.length === 24, "Phải có đúng 24 lời giải.");
assertCondition(
  questions.filter((question) => question.question_type === "MULTIPLE_CHOICE")
    .length === 16,
  "Phải có đúng 16 câu MULTIPLE_CHOICE.",
);
assertCondition(
  questions.filter((question) => question.question_type === "NUMBER_INPUT")
    .length === 8,
  "Phải có đúng 8 câu NUMBER_INPUT.",
);
assertCondition(
  new Set(questions.map((question) => question.code)).size === 24,
  "Question code bị trùng.",
);
assertCondition(
  new Set(questions.map((question) => question.prompt)).size === 24,
  "Prompt bị trùng.",
);

const solutionByQuestion = new Map(
  solutions.map((solution) => [solution.question_id, solution]),
);
for (const skill of skills) {
  const skillQuestions = questions.filter(
    (question) => question.skill_code === skill,
  );
  const expected = expectedTypeDistribution[skill];
  assertCondition(skillQuestions.length === 6, `${skill} phải có đúng 6 câu.`);
  for (const type of ["MULTIPLE_CHOICE", "NUMBER_INPUT"]) {
    assertCondition(
      skillQuestions.filter((question) => question.question_type === type)
        .length === expected[type],
      `${skill}: phân bố ${type} không đúng.`,
    );
  }
}

for (const question of questions) {
  assertCondition(
    skills.includes(question.skill_code) &&
      isSafeText(question.prompt, 10, 220) &&
      isIntegerInRange(question.display_order, 1, 24),
    `${question.code}: metadata câu hỏi không hợp lệ.`,
  );
  validateVisualSpec(question.visual_spec, question.code);

  const expectedAnswer = deriveExpectedAnswer(question);
  const solution = solutionByQuestion.get(question.code);
  assertCondition(solution, `${question.code}: thiếu solution.`);
  assertCondition(
    Array.isArray(solution.solution_steps) &&
      solution.solution_steps.length >= 2 &&
      solution.solution_steps.every((step) => isSafeText(step, 12, 240)) &&
      isSafeText(solution.explanation, 12, 240) &&
      isSafeText(solution.hint, 8, 180),
    `${question.code}: lời giải chưa đủ hai bước thực chất.`,
  );

  if (question.question_type === "MULTIPLE_CHOICE") {
    assertCondition(
      question.options &&
        hasExactKeys(question.options, ["A", "B", "C", "D"]) &&
        Object.values(question.options).every((option) =>
          isSafeText(option, 1, 100),
        ) &&
        new Set(Object.values(question.options)).size === 4 &&
        /^[A-D]$/.test(solution.correct_answer) &&
        question.options[solution.correct_answer] === expectedAnswer,
      `${question.code}: MCQ không có đúng một đáp án suy ra từ visual.`,
    );
  } else {
    assertCondition(
      question.options === null &&
        Number.isInteger(expectedAnswer) &&
        expectedAnswer >= 0 &&
        expectedAnswer <= 31 &&
        solution.correct_answer === String(expectedAnswer),
      `${question.code}: NUMBER_INPUT không khớp visual hoặc ngoài miền.`,
    );
  }
}

assertCondition(
  questions.every(
    (question, index) => question.display_order === index + 1,
  ),
  "display_order phải liên tục từ 1 đến 24.",
);
assertCondition(
  solutions.every((solution) => solutionByQuestion.has(solution.question_id)) &&
    new Set(solutions.map((solution) => solution.question_id)).size === 24,
  "Solution bị trùng hoặc không khớp question.",
);

const learnerFacingText = [
  ...lesson.sections.flatMap((section) => [
    section.title,
    ...section.paragraphs,
  ]),
  ...lesson.worked_examples.flatMap((example) => [
    example.title,
    ...example.steps,
    example.answer,
  ]),
  ...questions.map((question) => question.prompt),
].join(" ");
assertCondition(
  !/(?:giờ rưỡi|đồng hồ 24 giờ|đổi giờ sang phút|múi giờ|năm nhuận|vượt tháng|vượt năm)/i.test(
    learnerFacingText,
  ),
  "Nội dung vượt phạm vi bảo thủ của Sprint 5K.",
);

assertCondition(
  /^begin;\s/.test(source) &&
    /\scommit;\s*$/.test(source) &&
    (source.match(/\bbegin;/g) ?? []).length === 1 &&
    (source.match(/\bcommit;/g) ?? []).length === 1,
  "Migration phải có đúng một BEGIN và COMMIT.",
);
assertCondition(
  source.includes("'grade-1-time-clock-calendar'") &&
    source.includes("'grade-1-length-measurement'") &&
    source.includes("display_order = 12") &&
    source.includes("private.is_valid_time_visual_spec") &&
    source.includes("prerequisite_unit_slug") &&
    source.includes("start_or_resume_practice") &&
    source.includes("SECURITY DEFINER") === false,
  "Migration thiếu unit, prerequisite hoặc boundary dự kiến.",
);
assertCondition(
  !source.includes(
    "(https?:|www[.]|javascript:|data:|<|>|script|is_correct|correct_answer)",
  ),
  "SQL visual validator không được quét tên field hợp lệ bằng regex substring.",
);
assertCondition(
  !/grant\s+select\s+on\s+(?:table\s+)?public[.]question_solutions/i.test(
    source,
  ) &&
    !/grant\s+(?:insert|update|delete)[\s\S]*public[.](?:practice_attempts|practice_answers)/i.test(
      source,
    ) &&
    !/service[_-]?role/i.test(source),
  "Migration mở quyền dữ liệu practice hoặc chứa service-role.",
);

console.log(
  "Grade 1 time/clock/calendar content validation passed: 24 questions, 16 MCQ, 8 number inputs, 4 skills × 6, and 4 typed visual kinds.",
);
