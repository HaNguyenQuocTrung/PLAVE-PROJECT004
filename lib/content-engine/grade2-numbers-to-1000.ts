import { validateSkillFamilyConfig } from "./config.ts";
import {
  gradeTwoNumbersTo1000DraftGovernance,
  gradeTwoNumbersTo1000SourceManifest,
} from "./grade2-numbers-to-1000-sources.ts";
import type {
  CurriculumOutcomeDefinition,
  EngineAnswerType,
  EngineQuestionOptions,
  GeneratedQuestionBundle,
  GeneratedQuestionSource,
  GeneratedUnitDraft,
  GradeSpecificUnitBlueprint,
  IdentifyPlaceSource,
  NeighborNumberSource,
  QuestionTemplateDefinition,
  ReadNumberSource,
  SkillFamilyConfig,
  ValidationResult,
} from "./types.ts";

export const GRADE_TWO_NUMBERS_TO_1000_UNIT_SLUG =
  "grade-2-numbers-to-1000";

export const gradeTwoNumbersTo1000Outcome: CurriculumOutcomeDefinition = {
  id: "G2-NUM-01",
  grade: 2,
  description:
    "Đếm, đọc, viết số; nhận biết cấu tạo hàng và số liền trước, liền sau trong phạm vi 1000.",
  sourceReference:
    "Chương trình GDPT môn Toán, phần yêu cầu cần đạt Lớp 2, trang PDF 12; Phụ lục hướng dẫn, trang 8.",
  evidenceStatus: "OFFICIAL_SOURCE_CONFIRMED",
};

export const gradeTwoNumbersTo1000Unit: GradeSpecificUnitBlueprint = {
  slug: GRADE_TWO_NUMBERS_TO_1000_UNIT_SLUG,
  title: "Các số trong phạm vi 1000",
  grade: 2,
  outcomeIds: [gradeTwoNumbersTo1000Outcome.id],
  skillFamilyIds: [
    "NUMBER_RECOGNITION_TO_1000",
    "READ_WRITE_TO_1000",
    "PLACE_VALUE_TO_1000",
    "SEQUENCE_TO_1000",
  ],
  prerequisiteSlugs: [],
  displayOrder: 1,
  governance: gradeTwoNumbersTo1000DraftGovernance,
};

const commonNumberConfig = {
  grade: 2 as const,
  domain: "NUMBER_AND_PLACE_VALUE" as const,
  minValue: 0,
  maxValue: 1000,
  digitCount: { minimum: 1, maximum: 4 },
  numberType: "WHOLE_NON_NEGATIVE" as const,
  carryMode: "NOT_APPLICABLE" as const,
  borrowMode: "NOT_APPLICABLE" as const,
  multiplicationTables: [],
  divisionTables: [],
  numberOfSteps: 2,
  difficulty: "MIXED" as const,
};

export const gradeTwoNumbersTo1000SkillFamilies: readonly SkillFamilyConfig[] =
  [
    {
      ...commonNumberConfig,
      id: "NUMBER_RECOGNITION_TO_1000",
      label: "Nhận biết và cấu tạo số đến 1000",
      allowedOperations: ["COUNT", "COMPOSE"],
      cognitiveLevel: "UNDERSTAND",
      answerType: ["MULTIPLE_CHOICE", "NUMBER_INPUT"],
      visualType: "PLACE_VALUE_CHART",
      accessibilityDescription:
        "Bảng giá trị hàng đọc lần lượt nghìn, trăm, chục và đơn vị bằng chữ và số.",
      misconceptionTags: ["PLACE_VALUE_ZERO", "PLACE_VALUE_ORDER"],
    },
    {
      ...commonNumberConfig,
      id: "READ_WRITE_TO_1000",
      label: "Đọc và viết số đến 1000",
      allowedOperations: ["READ", "WRITE"],
      cognitiveLevel: "UNDERSTAND",
      answerType: ["MULTIPLE_CHOICE"],
      visualType: "NUMBER_CARD",
      accessibilityDescription:
        "Thẻ số có chữ số lớn, độ tương phản rõ và mô tả đọc được bằng trình đọc màn hình.",
      misconceptionTags: ["NUMBER_WORD_ORDER", "PLACE_VALUE_ZERO"],
    },
    {
      ...commonNumberConfig,
      id: "PLACE_VALUE_TO_1000",
      label: "Hàng trăm, chục và đơn vị",
      allowedOperations: ["COMPOSE", "DECOMPOSE"],
      cognitiveLevel: "APPLY",
      answerType: ["MULTIPLE_CHOICE", "NUMBER_INPUT"],
      visualType: "PLACE_VALUE_CHART",
      accessibilityDescription:
        "Bảng giá trị hàng nêu rõ từng chữ số theo cột, không dùng màu sắc làm tín hiệu duy nhất.",
      misconceptionTags: ["PLACE_VALUE_ORDER", "PLACE_VALUE_ZERO"],
    },
    {
      ...commonNumberConfig,
      id: "SEQUENCE_TO_1000",
      label: "Số liền trước và số liền sau đến 1000",
      allowedOperations: ["COUNT", "ORDER"],
      cognitiveLevel: "APPLY",
      answerType: ["MULTIPLE_CHOICE", "NUMBER_INPUT"],
      visualType: "NUMBER_LINE",
      accessibilityDescription:
        "Tia số có các mốc tăng đều, mốc đang xét có đường viền và nhãn chữ tương đương.",
      misconceptionTags: ["OFF_BY_ONE", "PLACE_VALUE_ZERO"],
    },
  ];

export const gradeTwoNumbersTo1000Templates: readonly QuestionTemplateDefinition[] =
  [
    {
      id: "COMPOSE_NUMBER_MCQ",
      skillFamilyId: "NUMBER_RECOGNITION_TO_1000",
      answerType: "MULTIPLE_CHOICE",
      difficulty: "EASY",
      cognitiveLevel: "UNDERSTAND",
      visualType: "PLACE_VALUE_CHART",
      misconceptionTags: ["PLACE_VALUE_ZERO", "PLACE_VALUE_ORDER"],
    },
    {
      id: "COMPOSE_NUMBER_INPUT",
      skillFamilyId: "NUMBER_RECOGNITION_TO_1000",
      answerType: "NUMBER_INPUT",
      difficulty: "MEDIUM",
      cognitiveLevel: "APPLY",
      visualType: "PLACE_VALUE_CHART",
      misconceptionTags: ["PLACE_VALUE_ZERO", "PLACE_VALUE_ORDER"],
    },
    {
      id: "READ_NUMBER_MCQ",
      skillFamilyId: "READ_WRITE_TO_1000",
      answerType: "MULTIPLE_CHOICE",
      difficulty: "EASY",
      cognitiveLevel: "UNDERSTAND",
      visualType: "NUMBER_CARD",
      misconceptionTags: ["NUMBER_WORD_ORDER", "PLACE_VALUE_ZERO"],
    },
    {
      id: "IDENTIFY_PLACE_MCQ",
      skillFamilyId: "PLACE_VALUE_TO_1000",
      answerType: "MULTIPLE_CHOICE",
      difficulty: "EASY",
      cognitiveLevel: "UNDERSTAND",
      visualType: "PLACE_VALUE_CHART",
      misconceptionTags: ["PLACE_VALUE_ORDER", "PLACE_VALUE_ZERO"],
    },
    {
      id: "IDENTIFY_PLACE_INPUT",
      skillFamilyId: "PLACE_VALUE_TO_1000",
      answerType: "NUMBER_INPUT",
      difficulty: "MEDIUM",
      cognitiveLevel: "APPLY",
      visualType: "PLACE_VALUE_CHART",
      misconceptionTags: ["PLACE_VALUE_ORDER", "PLACE_VALUE_ZERO"],
    },
    {
      id: "NEIGHBOR_NUMBER_MCQ",
      skillFamilyId: "SEQUENCE_TO_1000",
      answerType: "MULTIPLE_CHOICE",
      difficulty: "EASY",
      cognitiveLevel: "UNDERSTAND",
      visualType: "NUMBER_LINE",
      misconceptionTags: ["OFF_BY_ONE", "PLACE_VALUE_ZERO"],
    },
    {
      id: "NEIGHBOR_NUMBER_INPUT",
      skillFamilyId: "SEQUENCE_TO_1000",
      answerType: "NUMBER_INPUT",
      difficulty: "MEDIUM",
      cognitiveLevel: "APPLY",
      visualType: "NUMBER_LINE",
      misconceptionTags: ["OFF_BY_ONE", "PLACE_VALUE_ZERO"],
    },
  ];

type PlaceValueSnapshot = Readonly<{
  thousands: number;
  hundreds: number;
  tens: number;
  ones: number;
}>;

const digitWords = [
  "không",
  "một",
  "hai",
  "ba",
  "bốn",
  "năm",
  "sáu",
  "bảy",
  "tám",
  "chín",
] as const;

export function decomposeWholeNumber(value: number): PlaceValueSnapshot {
  if (!Number.isInteger(value) || value < 0 || value > 1000) {
    throw new RangeError("Giá trị phải là số nguyên từ 0 đến 1000.");
  }
  return {
    thousands: Math.floor(value / 1000),
    hundreds: Math.floor((value % 1000) / 100),
    tens: Math.floor((value % 100) / 10),
    ones: value % 10,
  };
}

function readTwoDigits(value: number) {
  if (value < 10) return digitWords[value] ?? "";
  if (value === 10) return "mười";
  if (value < 20) {
    const ones = value % 10;
    return `mười ${
      ones === 5 ? "lăm" : (digitWords[ones] ?? "")
    }`;
  }

  const tens = Math.floor(value / 10);
  const ones = value % 10;
  if (ones === 0) return `${digitWords[tens]} mươi`;
  const onesWord =
    ones === 1
      ? "mốt"
      : ones === 4
        ? "tư"
        : ones === 5
          ? "lăm"
          : digitWords[ones];
  return `${digitWords[tens]} mươi ${onesWord}`;
}

export function numberToVietnameseWords(value: number): string {
  const snapshot = decomposeWholeNumber(value);
  if (value === 0) return "không";
  if (value === 1000) return "một nghìn";
  if (value < 100) return readTwoDigits(value);

  const remainder = value % 100;
  const prefix = `${digitWords[snapshot.hundreds]} trăm`;
  if (remainder === 0) return prefix;
  if (remainder < 10) {
    return `${prefix} linh ${digitWords[remainder]}`;
  }
  return `${prefix} ${readTwoDigits(remainder)}`;
}

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: string) {
  let state = hashSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInteger(
  random: () => number,
  minimum: number,
  maximum: number,
) {
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    const current = output[index];
    const replacement = output[target];
    if (current === undefined || replacement === undefined) continue;
    output[index] = replacement;
    output[target] = current;
  }
  return output;
}

function createDistinctNumericValues(
  correct: number,
  minimum: number,
  maximum: number,
  random: () => number,
) {
  const candidates = new Set<number>([correct]);
  const offsets = shuffle(
    [1, -1, 10, -10, 100, -100, 2, -2, 20, -20],
    random,
  );
  for (const offset of offsets) {
    const candidate = correct + offset;
    if (candidate >= minimum && candidate <= maximum) {
      candidates.add(candidate);
    }
    if (candidates.size === 4) break;
  }
  while (candidates.size < 4) {
    candidates.add(randomInteger(random, minimum, maximum));
  }
  return shuffle([...candidates], random);
}

function createOptions(
  displayValues: readonly string[],
  correctDisplay: string,
): Readonly<{ options: EngineQuestionOptions; correctKey: string }> {
  if (
    displayValues.length !== 4 ||
    new Set(displayValues).size !== 4 ||
    !displayValues.includes(correctDisplay)
  ) {
    throw new Error("Bốn lựa chọn phải khác nhau và chứa đúng đáp án.");
  }
  const keys = ["A", "B", "C", "D"] as const;
  const options: EngineQuestionOptions = {
    A: displayValues[0] ?? "",
    B: displayValues[1] ?? "",
    C: displayValues[2] ?? "",
    D: displayValues[3] ?? "",
  };
  const correctIndex = displayValues.indexOf(correctDisplay);
  return { options, correctKey: keys[correctIndex] ?? "A" };
}

function getPlaceLabel(place: IdentifyPlaceSource["place"]) {
  switch (place) {
    case "THOUSANDS":
      return "nghìn";
    case "HUNDREDS":
      return "trăm";
    case "TENS":
      return "chục";
    case "ONES":
      return "đơn vị";
  }
}

function getSourceExpectedAnswer(source: GeneratedQuestionSource) {
  switch (source.kind) {
    case "COMPOSE_NUMBER":
      return String(source.value);
    case "READ_NUMBER":
      return source.words;
    case "IDENTIFY_PLACE":
      return String(source.digit);
    case "NEIGHBOR_NUMBER":
      return String(source.answer);
  }
}

function getSourceValue(source: GeneratedQuestionSource) {
  return source.value;
}

function getPlaceValuePhrase(value: number) {
  const snapshot = decomposeWholeNumber(value);
  if (value === 0) return "0 đơn vị";
  const parts: string[] = [];
  if (snapshot.thousands > 0) {
    parts.push(`${snapshot.thousands} nghìn`);
  }
  if (snapshot.hundreds > 0 || snapshot.thousands > 0) {
    parts.push(`${snapshot.hundreds} trăm`);
  }
  if (
    snapshot.tens > 0 ||
    snapshot.hundreds > 0 ||
    snapshot.thousands > 0
  ) {
    parts.push(`${snapshot.tens} chục`);
  }
  parts.push(`${snapshot.ones} đơn vị`);
  if (parts.length === 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} và ${parts.at(-1)}`;
}

function createComposeSource(
  random: () => number,
  usedValues: Set<number>,
) {
  let value = randomInteger(random, 0, 1000);
  while (usedValues.has(value)) value = randomInteger(random, 0, 1000);
  usedValues.add(value);
  return { kind: "COMPOSE_NUMBER" as const, ...decomposeWholeNumber(value), value };
}

function createReadSource(
  random: () => number,
  usedValues: Set<number>,
): ReadNumberSource {
  let value = randomInteger(random, 0, 1000);
  while (usedValues.has(value)) value = randomInteger(random, 0, 1000);
  usedValues.add(value);
  return {
    kind: "READ_NUMBER",
    value,
    words: numberToVietnameseWords(value),
  };
}

function createPlaceSource(
  random: () => number,
  usedPrompts: Set<string>,
): IdentifyPlaceSource {
  const places: readonly IdentifyPlaceSource["place"][] = [
    "THOUSANDS",
    "HUNDREDS",
    "TENS",
    "ONES",
  ];
  while (true) {
    const value = randomInteger(random, 10, 1000);
    const snapshot = decomposeWholeNumber(value);
    const availablePlaces =
      value === 1000 ? places : places.slice(1);
    const place =
      availablePlaces[randomInteger(random, 0, availablePlaces.length - 1)] ??
      "ONES";
    const digit =
      place === "THOUSANDS"
        ? snapshot.thousands
        : place === "HUNDREDS"
          ? snapshot.hundreds
          : place === "TENS"
            ? snapshot.tens
            : snapshot.ones;
    const fingerprint = `${value}:${place}`;
    if (usedPrompts.has(fingerprint)) continue;
    usedPrompts.add(fingerprint);
    return { kind: "IDENTIFY_PLACE", value, place, digit };
  }
}

function createNeighborSource(
  random: () => number,
  direction: NeighborNumberSource["direction"],
  usedPrompts: Set<string>,
): NeighborNumberSource {
  while (true) {
    const value =
      direction === "PREVIOUS"
        ? randomInteger(random, 1, 1000)
        : randomInteger(random, 0, 999);
    const fingerprint = `${value}:${direction}`;
    if (usedPrompts.has(fingerprint)) continue;
    usedPrompts.add(fingerprint);
    return {
      kind: "NEIGHBOR_NUMBER",
      value,
      direction,
      answer: direction === "PREVIOUS" ? value - 1 : value + 1,
    };
  }
}

function createVisual(source: GeneratedQuestionSource) {
  const snapshot = decomposeWholeNumber(source.value);
  if (source.kind === "READ_NUMBER") {
    return {
      kind: "NUMBER_CARD" as const,
      value: source.value,
      description: `Một thẻ số lớn hiển thị ${source.value}.`,
    };
  }
  if (source.kind === "NEIGHBOR_NUMBER") {
    return {
      kind: "NUMBER_LINE" as const,
      start: Math.max(0, source.value - 2),
      end: Math.min(1000, source.value + 2),
      focusValue: source.value,
      description:
        `Tia số tăng từng một đơn vị; mốc ${source.value} được đóng khung bằng nét đậm.`,
    };
  }
  return {
    kind: "PLACE_VALUE_CHART" as const,
    ...snapshot,
    description:
      `Bảng giá trị hàng biểu diễn ${getPlaceValuePhrase(source.value)}.`,
  };
}

function createPrompt(source: GeneratedQuestionSource) {
  switch (source.kind) {
    case "COMPOSE_NUMBER":
      return `Số gồm ${getPlaceValuePhrase(source.value)} là số nào?`;
    case "READ_NUMBER":
      return `Cách đọc nào đúng cho số ${source.value}?`;
    case "IDENTIFY_PLACE":
      return `Trong số ${source.value}, chữ số hàng ${getPlaceLabel(source.place)} là mấy?`;
    case "NEIGHBOR_NUMBER":
      return source.direction === "PREVIOUS"
        ? `Số liền trước của ${source.value} là số nào?`
        : `Số liền sau của ${source.value} là số nào?`;
  }
}

function createSolutionSteps(source: GeneratedQuestionSource) {
  switch (source.kind) {
    case "COMPOSE_NUMBER":
      return [
        "Đọc lần lượt số nghìn, số trăm, số chục và số đơn vị trong bảng.",
        `Ghép các chữ số đúng vị trí để được số ${source.value}.`,
      ];
    case "READ_NUMBER":
      return [
        "Đọc từ hàng cao nhất có chữ số khác 0 rồi tiếp tục qua các hàng còn lại.",
        `Số ${source.value} được đọc là “${source.words}”.`,
      ];
    case "IDENTIFY_PLACE":
      return [
        `Tách số ${source.value} theo từng hàng trong bảng giá trị.`,
        `Chữ số ở hàng ${getPlaceLabel(source.place)} là ${source.digit}.`,
      ];
    case "NEIGHBOR_NUMBER":
      return [
        source.direction === "PREVIOUS"
          ? "Số liền trước đứng ngay bên trái và kém số đã cho 1 đơn vị."
          : "Số liền sau đứng ngay bên phải và hơn số đã cho 1 đơn vị.",
        `${source.value} ${
          source.direction === "PREVIOUS" ? "bớt" : "thêm"
        } 1 được ${source.answer}.`,
      ];
  }
}

function createDisplayOptions(
  source: GeneratedQuestionSource,
  random: () => number,
) {
  if (source.kind === "READ_NUMBER") {
    const values = createDistinctNumericValues(
      source.value,
      0,
      1000,
      random,
    );
    return values.map(numberToVietnameseWords);
  }
  const expected = Number.parseInt(getSourceExpectedAnswer(source), 10);
  const maximum = source.kind === "IDENTIFY_PLACE" ? 9 : 1000;
  return createDistinctNumericValues(expected, 0, maximum, random).map(String);
}

function createBundle(
  source: GeneratedQuestionSource,
  template: QuestionTemplateDefinition,
  displayOrder: number,
  seedFingerprint: string,
  random: () => number,
): GeneratedQuestionBundle {
  const expectedDisplayAnswer = getSourceExpectedAnswer(source);
  const optionResult =
    template.answerType === "MULTIPLE_CHOICE"
      ? createOptions(
          createDisplayOptions(source, random),
          expectedDisplayAnswer,
        )
      : null;
  const code = `g2-num1000-${seedFingerprint}-${String(displayOrder).padStart(2, "0")}`;
  const solutionSteps = createSolutionSteps(source);
  const distractorTagByOption: Partial<
    Record<keyof EngineQuestionOptions, (typeof template.misconceptionTags)[number]>
  > = {};
  if (optionResult) {
    const optionKeys = ["A", "B", "C", "D"] as const;
    let distractorIndex = 0;
    for (const optionKey of optionKeys) {
      if (optionKey === optionResult.correctKey) continue;
      const tag =
        template.misconceptionTags[
          distractorIndex % template.misconceptionTags.length
        ];
      if (!tag) {
        throw new Error(`${template.id}: thiếu misconception tag.`);
      }
      distractorTagByOption[optionKey] = tag;
      distractorIndex += 1;
    }
  }

  return {
    question: {
      code,
      unitSlug: GRADE_TWO_NUMBERS_TO_1000_UNIT_SLUG,
      templateId: template.id,
      skillFamilyId: template.skillFamilyId,
      questionType: template.answerType,
      prompt: createPrompt(source),
      options: optionResult?.options ?? null,
      visual: createVisual(source),
      difficulty: template.difficulty,
      displayOrder,
    },
    solution: {
      questionCode: code,
      correctAnswer:
        optionResult?.correctKey ?? expectedDisplayAnswer,
      solutionSteps,
      explanation: solutionSteps.join(" "),
      hint:
        source.kind === "NEIGHBOR_NUMBER"
          ? "Em hãy di chuyển đúng một bước trên tia số."
          : "Em hãy đọc các hàng từ trái sang phải.",
    },
    audit: {
      questionCode: code,
      source,
      expectedDisplayAnswer,
      distractorTagByOption,
    },
  };
}

const questionPlan = [
  ...Array.from({ length: 4 }, () => "COMPOSE_NUMBER_MCQ"),
  ...Array.from({ length: 2 }, () => "COMPOSE_NUMBER_INPUT"),
  ...Array.from({ length: 6 }, () => "READ_NUMBER_MCQ"),
  ...Array.from({ length: 4 }, () => "IDENTIFY_PLACE_MCQ"),
  ...Array.from({ length: 2 }, () => "IDENTIFY_PLACE_INPUT"),
  ...Array.from({ length: 2 }, () => "NEIGHBOR_NUMBER_MCQ"),
  ...Array.from({ length: 4 }, () => "NEIGHBOR_NUMBER_INPUT"),
] as const;

export function generateGradeTwoNumbersTo1000Draft(
  seed: string,
): GeneratedUnitDraft {
  if (
    seed.length < 1 ||
    seed.length > 64 ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(seed)
  ) {
    throw new Error("Seed phải là chuỗi an toàn dài 1–64 ký tự.");
  }
  const random = createSeededRandom(seed);
  const usedComposeValues = new Set<number>();
  const usedReadValues = new Set<number>();
  const usedPlacePrompts = new Set<string>();
  const usedNeighborPrompts = new Set<string>();
  let neighborIndex = 0;
  const templateById = new Map(
    gradeTwoNumbersTo1000Templates.map((template) => [template.id, template]),
  );
  const seedFingerprint = hashSeed(seed).toString(36);

  const bundles = questionPlan.map((templateId, index) => {
    const template = templateById.get(templateId);
    if (!template) throw new Error(`Thiếu template ${templateId}.`);
    let source: GeneratedQuestionSource;
    if (templateId.startsWith("COMPOSE_")) {
      source = createComposeSource(random, usedComposeValues);
    } else if (templateId === "READ_NUMBER_MCQ") {
      source = createReadSource(random, usedReadValues);
    } else if (templateId.startsWith("IDENTIFY_PLACE_")) {
      source = createPlaceSource(random, usedPlacePrompts);
    } else {
      const direction =
        neighborIndex % 2 === 0 ? "PREVIOUS" : "NEXT";
      neighborIndex += 1;
      source = createNeighborSource(
        random,
        direction,
        usedNeighborPrompts,
      );
    }
    return createBundle(
      source,
      template,
      index + 1,
      seedFingerprint,
      random,
    );
  });

  return {
    seed,
    unit: gradeTwoNumbersTo1000Unit,
    outcome: gradeTwoNumbersTo1000Outcome,
    skillFamilies: gradeTwoNumbersTo1000SkillFamilies,
    templates: gradeTwoNumbersTo1000Templates,
    bundles,
    generationStatus: "DRAFT_GENERATED",
    governance: gradeTwoNumbersTo1000DraftGovernance,
  };
}

function countPromptClauses(prompt: string) {
  const separators = prompt.match(/[,;:]|\b(?:và|rồi|sau đó)\b/gi);
  return 1 + (separators?.length ?? 0);
}

function validateVietnameseNumberHouseStyle(bundle: GeneratedQuestionBundle) {
  const errors: string[] = [];
  const source = bundle.audit.source;
  const reviewedText = [
    bundle.question.prompt,
    ...Object.values(bundle.question.options ?? {}),
    ...bundle.solution.solutionSteps,
    bundle.solution.explanation,
  ].join(" ");
  if (/\blẻ\b/i.test(reviewedText)) {
    errors.push(
      `${bundle.question.code}: house style PLAVE dùng “linh”, không sinh “lẻ”.`,
    );
  }
  if (
    source.kind === "READ_NUMBER" &&
    source.value >= 100 &&
    source.value < 1000 &&
    source.value % 100 > 0 &&
    source.value % 100 < 10 &&
    !/\blinh\b/.test(source.words)
  ) {
    errors.push(
      `${bundle.question.code}: cách đọc có hàng chục bằng 0 phải dùng “linh”.`,
    );
  }
  return errors;
}

function validateReadingLoad(bundle: GeneratedQuestionBundle) {
  const errors: string[] = [];
  const policy = gradeTwoNumbersTo1000SourceManifest.readingLoadPolicy;
  if (
    bundle.question.prompt.length > policy.maxPromptCharacters ||
    countPromptClauses(bundle.question.prompt) >
      policy.maxPromptClauses
  ) {
    errors.push(`${bundle.question.code}: prompt vượt reading-load policy.`);
  }
  if (bundle.solution.solutionSteps.length > policy.maxReasoningSteps) {
    errors.push(
      `${bundle.question.code}: lời giải vượt số bước của POC policy.`,
    );
  }
  if (
    Object.values(bundle.question.options ?? {}).some(
      (option) => option.length > policy.maxOptionCharacters,
    )
  ) {
    errors.push(`${bundle.question.code}: option vượt reading-load policy.`);
  }
  return errors;
}

function validateSource(
  source: GeneratedQuestionSource,
  expectedDisplayAnswer: string,
) {
  const errors: string[] = [];
  const value = getSourceValue(source);
  if (!Number.isInteger(value) || value < 0 || value > 1000) {
    errors.push("Giá trị nguồn nằm ngoài phạm vi 0–1000.");
  }
  if (getSourceExpectedAnswer(source) !== expectedDisplayAnswer) {
    errors.push("Đáp án audit không khớp dữ liệu nguồn.");
  }

  if (source.kind === "COMPOSE_NUMBER") {
    const recomposed =
      source.thousands * 1000 +
      source.hundreds * 100 +
      source.tens * 10 +
      source.ones;
    if (recomposed !== source.value) {
      errors.push("Cấu tạo hàng không ghép lại đúng giá trị.");
    }
  } else if (source.kind === "READ_NUMBER") {
    if (numberToVietnameseWords(source.value) !== source.words) {
      errors.push("Cách đọc số không khớp giá trị.");
    }
  } else if (source.kind === "IDENTIFY_PLACE") {
    const snapshot = decomposeWholeNumber(source.value);
    const expectedDigit =
      source.place === "THOUSANDS"
        ? snapshot.thousands
        : source.place === "HUNDREDS"
          ? snapshot.hundreds
          : source.place === "TENS"
            ? snapshot.tens
            : snapshot.ones;
    if (source.digit !== expectedDigit) {
      errors.push("Chữ số theo hàng không khớp giá trị.");
    }
  } else {
    const expected =
      source.direction === "PREVIOUS" ? source.value - 1 : source.value + 1;
    if (source.answer !== expected || expected < 0 || expected > 1000) {
      errors.push("Số liền trước hoặc liền sau không hợp lệ.");
    }
  }
  return errors;
}

function validateVisual(bundle: GeneratedQuestionBundle) {
  const { source } = bundle.audit;
  const { visual } = bundle.question;
  const errors: string[] = [];
  if (
    visual.description.trim().length < 12 ||
    /đáp án|correct|is_correct|<|>|https?:|data:/i.test(visual.description)
  ) {
    errors.push(`${bundle.question.code}: mô tả visual không an toàn.`);
  }
  if (source.kind === "READ_NUMBER") {
    if (visual.kind !== "NUMBER_CARD" || visual.value !== source.value) {
      errors.push(`${bundle.question.code}: thẻ số không khớp dữ liệu.`);
    }
  } else if (source.kind === "NEIGHBOR_NUMBER") {
    if (
      visual.kind !== "NUMBER_LINE" ||
      visual.focusValue !== source.value ||
      visual.start < 0 ||
      visual.end > 1000 ||
      visual.start >= visual.end
    ) {
      errors.push(`${bundle.question.code}: tia số không khớp dữ liệu.`);
    }
  } else {
    const snapshot = decomposeWholeNumber(source.value);
    if (
      visual.kind !== "PLACE_VALUE_CHART" ||
      visual.thousands !== snapshot.thousands ||
      visual.hundreds !== snapshot.hundreds ||
      visual.tens !== snapshot.tens ||
      visual.ones !== snapshot.ones
    ) {
      errors.push(
        `${bundle.question.code}: bảng giá trị hàng không khớp dữ liệu.`,
      );
    }
  }
  return errors;
}

export function validateGradeTwoNumbersTo1000Draft(
  draft: GeneratedUnitDraft,
): ValidationResult {
  const errors: string[] = [];
  if (
    draft.unit.slug !== GRADE_TWO_NUMBERS_TO_1000_UNIT_SLUG ||
    draft.unit.grade !== 2 ||
    draft.unit.governance.publicationStatus !== "DRAFT" ||
    draft.generationStatus !== "DRAFT_GENERATED" ||
    draft.governance.officialSourceValidation !== "VALIDATED" ||
    draft.governance.expertReview !== "OPTIONAL_NOT_OBTAINED" ||
    draft.governance.publicationStatus !== "DRAFT"
  ) {
    errors.push(
      "Unit POC phải là Grade 2 draft source-validated, chưa publication.",
    );
  }
  if (draft.outcome.id !== "G2-NUM-01") {
    errors.push("Unit POC không trace đúng outcome G2-NUM-01.");
  }
  if (draft.bundles.length !== 24) {
    errors.push("POC phải sinh đúng 24 câu để kiểm thử batch hiện tại.");
  }
  const mcqCount = draft.bundles.filter(
    ({ question }) => question.questionType === "MULTIPLE_CHOICE",
  ).length;
  const numberInputCount = draft.bundles.filter(
    ({ question }) => question.questionType === "NUMBER_INPUT",
  ).length;
  if (mcqCount !== 16 || numberInputCount !== 8) {
    errors.push("POC phải có 16 MCQ và 8 NUMBER_INPUT.");
  }
  const codes = draft.bundles.map(({ question }) => question.code);
  const prompts = draft.bundles.map(({ question }) => question.prompt);
  if (new Set(codes).size !== codes.length) {
    errors.push("Mã câu hỏi sinh ra bị trùng.");
  }
  if (new Set(prompts).size !== prompts.length) {
    errors.push("Prompt sinh ra bị trùng.");
  }

  const familyIds = new Set(
    draft.skillFamilies.map((family) => family.id),
  );
  for (const family of draft.skillFamilies) {
    const result = validateSkillFamilyConfig(family);
    errors.push(...result.errors.map((error) => `${family.id}: ${error}`));
    const familyCount = draft.bundles.filter(
      ({ question }) => question.skillFamilyId === family.id,
    ).length;
    if (familyCount !== 6) {
      errors.push(`${family.id}: cần đúng 6 câu trong POC.`);
    }
  }
  for (const template of draft.templates) {
    if (!familyIds.has(template.skillFamilyId)) {
      errors.push(`${template.id}: tham chiếu skill family không tồn tại.`);
    }
  }

  for (const bundle of draft.bundles) {
    const { question, solution, audit } = bundle;
    if (
      question.unitSlug !== draft.unit.slug ||
      solution.questionCode !== question.code ||
      audit.questionCode !== question.code
    ) {
      errors.push(`${question.code}: liên kết bundle không nhất quán.`);
    }
    errors.push(
      ...validateSource(
        audit.source,
        audit.expectedDisplayAnswer,
      ).map((error) => `${question.code}: ${error}`),
    );
    errors.push(...validateVisual(bundle));
    errors.push(...validateVietnameseNumberHouseStyle(bundle));
    errors.push(...validateReadingLoad(bundle));
    if (
      solution.solutionSteps.length < 2 ||
      solution.solutionSteps.some((step) => step.trim().length < 8)
    ) {
      errors.push(`${question.code}: lời giải cần ít nhất hai bước thực chất.`);
    }
    if (question.questionType === "MULTIPLE_CHOICE") {
      if (!question.options) {
        errors.push(`${question.code}: MCQ thiếu options.`);
      } else {
        const keys = Object.keys(question.options).sort().join(",");
        const values = Object.values(question.options);
        if (keys !== "A,B,C,D" || new Set(values).size !== 4) {
          errors.push(`${question.code}: MCQ phải có bốn đáp án A–D khác nhau.`);
        }
        const selected =
          question.options[
            solution.correctAnswer as keyof EngineQuestionOptions
          ];
        if (
          !/^[A-D]$/.test(solution.correctAnswer) ||
          selected !== audit.expectedDisplayAnswer
        ) {
          errors.push(`${question.code}: đáp án MCQ không khớp dữ liệu sinh.`);
        }
        const wrongKeys = (["A", "B", "C", "D"] as const).filter(
          (key) => key !== solution.correctAnswer,
        );
        if (
          Object.keys(audit.distractorTagByOption).length !== 3 ||
          wrongKeys.some(
            (key) => !audit.distractorTagByOption[key],
          ) ||
          solution.correctAnswer in audit.distractorTagByOption
        ) {
          errors.push(
            `${question.code}: mỗi distractor phải map đúng một misconception tag.`,
          );
        }
      }
    } else if (
      question.options !== null ||
      Object.keys(audit.distractorTagByOption).length !== 0 ||
      solution.correctAnswer !== audit.expectedDisplayAnswer ||
      !/^(?:0|[1-9][0-9]{0,3})$/.test(solution.correctAnswer) ||
      Number(solution.correctAnswer) > 1000
    ) {
      errors.push(`${question.code}: NUMBER_INPUT không hợp lệ.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateGradeTwoNumberBoundaries(
  values: readonly number[],
): ValidationResult {
  const errors: string[] = [];
  for (const value of values) {
    try {
      const snapshot = decomposeWholeNumber(value);
      const recomposed =
        snapshot.thousands * 1000 +
        snapshot.hundreds * 100 +
        snapshot.tens * 10 +
        snapshot.ones;
      if (
        recomposed !== value ||
        numberToVietnameseWords(value).trim().length === 0
      ) {
        errors.push(`Boundary ${value} không nhất quán.`);
      }
    } catch {
      errors.push(`Boundary ${value} nằm ngoài phạm vi.`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function getQuestionTypeCount(
  draft: GeneratedUnitDraft,
  answerType: EngineAnswerType,
) {
  return draft.bundles.filter(
    ({ question }) => question.questionType === answerType,
  ).length;
}
