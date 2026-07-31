import {
  getCurriculumUnit,
} from "./registry.ts";
import type {
  CurriculumUnit,
  PreviewAnswerType,
  PreviewAudit,
  PreviewCognitiveLevel,
  PreviewOption,
  PreviewQuestion,
  PreviewSolution,
  PreviewUnitDraft,
} from "./types.ts";
import { createCurriculumVisualSpec } from "./visual.ts";
import { studentUnitTitle } from "./student-facing.ts";
import { generateP0QuestionSpecs } from "./p0-outcome-expansion.ts";
import { generateGrade3QuestionSpecs } from "./grade3-completion.ts";
import { generateGrade4QuestionSpecs } from "./grade4-completion.ts";
import { generateGrade5QuestionSpecs } from "./grade5-completion.ts";
import { generateGrade6QuestionSpecs } from "./grade6-completion.ts";
import {
  generateGrade7QuestionSpecs,
  grade7CompletionTargetOutcomeIds,
} from "./grade7-completion.ts";
import {
  generateGrade7RemainingQuestionSpecs,
  generateGrade8QuestionSpecs,
  generateGrade9QuestionSpecs,
} from "./secondary-completion.ts";

type DraftParts = Readonly<{
  question: PreviewQuestion;
  solution: PreviewSolution;
  audit: PreviewAudit;
}>;

type QuestionInput = Readonly<{
  skillFamily: string;
  prompt: string;
  answer: string;
  distractors: readonly [string, string, string];
  steps: readonly string[];
  feedback: string;
  inputType: Extract<PreviewAnswerType, "NUMBER_INPUT" | "TEXT_INPUT">;
  cognitiveLevel: PreviewCognitiveLevel;
  parameters: readonly Readonly<{
    name: string;
    value: string | number;
  }>[];
  primaryOfficialOutcomeId?: string;
  supportingOfficialOutcomeIds?: readonly string[];
  evidenceForm?: PreviewAudit["evidenceForm"];
  visualRequirement?: CurriculumUnit["requiredVisual"];
}>;

function seedToState(seed: string) {
  let state = 2166136261;
  for (const character of seed) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return state >>> 0;
}

function createRandom(seed: string) {
  let state = seedToState(seed) || 1;
  return {
    integer(minimum: number, maximum: number) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      const fraction = (state >>> 0) / 4_294_967_296;
      return minimum + Math.floor(fraction * (maximum - minimum + 1));
    },
  };
}

function greatestCommonDivisor(left: number, right: number) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

function decimal(value: number) {
  return Number(value.toFixed(2)).toString();
}

function displayDecimal(value: number | string) {
  return String(value).replace(".", ",");
}

type DecimalComparison = Readonly<{
  relation: "<" | "=" | ">";
  steps: readonly string[];
  feedback: string;
}>;

function decimalParts(input: number | string) {
  const raw = String(input).trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/u.test(raw)) {
    throw new Error("Decimal comparison accepts non-negative decimal values.");
  }
  const [wholeRaw, fraction = ""] = raw.split(".");
  const whole = wholeRaw.replace(/^0+(?=\d)/u, "");
  return { whole, fraction };
}

export function explainDecimalComparison(
  leftInput: number | string,
  rightInput: number | string,
): DecimalComparison {
  const left = decimalParts(leftInput);
  const right = decimalParts(rightInput);
  const scale = Math.max(left.fraction.length, right.fraction.length, 1);
  const leftFraction = left.fraction.padEnd(scale, "0");
  const rightFraction = right.fraction.padEnd(scale, "0");
  const leftAligned = `${left.whole},${leftFraction}`;
  const rightAligned = `${right.whole},${rightFraction}`;
  const leftWhole = Number(left.whole);
  const rightWhole = Number(right.whole);
  const relation =
    leftWhole < rightWhole
      ? "<"
      : leftWhole > rightWhole
        ? ">"
        : leftFraction < rightFraction
          ? "<"
          : leftFraction > rightFraction
            ? ">"
            : "=";
  const steps = [
    `Viết hai số với cùng số chữ số thập phân: ${leftAligned} và ${rightAligned}. Chỉ thêm số 0 tận cùng bên phải phần thập phân nên giá trị không đổi.`,
    leftWhole === rightWhole
      ? `Phần nguyên bằng nhau: ${left.whole} = ${right.whole}.`
      : `So sánh phần nguyên trước: ${left.whole} ${leftWhole < rightWhole ? "<" : ">"} ${right.whole}.`,
    leftWhole === rightWhole
      ? leftFraction === rightFraction
        ? `Các hàng thập phân cũng bằng nhau: ${leftFraction} = ${rightFraction}.`
        : `So sánh lần lượt từ hàng phần mười sang phải: ${leftFraction} ${leftFraction < rightFraction ? "<" : ">"} ${rightFraction}.`
      : "Không cần dùng độ dài cách viết để quyết định; phần nguyên đã cho biết thứ tự.",
    `Kết luận ${leftAligned} ${relation} ${rightAligned}.`,
  ];
  return {
    relation,
    steps,
    feedback:
      "So sánh phần nguyên trước; chỉ khi phần nguyên bằng nhau mới so sánh lần lượt các hàng thập phân. Số 0 tận cùng bên phải phần thập phân không làm đổi giá trị.",
  };
}

function makeOptions(
  answer: string,
  distractors: readonly [string, string, string],
  rotation: number,
): readonly PreviewOption[] {
  const values = [answer];
  const fallbacks = [
    ...distractors,
    "Không đủ dữ kiện",
    "Không xác định",
    "Không có đáp án phù hợp",
  ];
  for (const candidate of fallbacks) {
    if (!values.includes(candidate)) values.push(candidate);
    if (values.length === 4) break;
  }
  if (values.length !== 4) {
    throw new Error("Unable to build four unique question options.");
  }
  const rotated = values.map((_, index) => values[(index + rotation) % 4]);
  return rotated.map((label, index) => ({
    key: (["A", "B", "C", "D"] as const)[index],
    label,
  }));
}

function makeDraftParts(
  unit: CurriculumUnit,
  index: number,
  input: QuestionInput,
): DraftParts {
  const code = `${unit.slug}-q${String(index + 1).padStart(2, "0")}`;
  const answerType: PreviewAnswerType =
    index % 2 === 0 ? "MULTIPLE_CHOICE" : input.inputType;
  const options =
    answerType === "MULTIPLE_CHOICE"
      ? makeOptions(input.answer, input.distractors, index % 4)
      : null;
  const correctAnswer =
    options?.find((option) => option.label === input.answer)?.key ??
    input.answer;
  const description = `${studentUnitTitle(unit)}: hình minh hoạ các dữ kiện đã cho.`;

  return {
    question: {
      code,
      unitSlug: unit.slug,
      skillFamily: input.skillFamily,
      answerType,
      prompt: input.prompt.replace(/\s+/gu, " ").trim(),
      options,
      cognitiveLevel: input.cognitiveLevel,
      visual: createCurriculumVisualSpec({
        type: input.visualRequirement ?? unit.requiredVisual,
        description,
        identity: code,
        parameters: input.parameters,
      }),
      misconceptionTags: [
        unit.misconceptionTags[index % unit.misconceptionTags.length],
      ],
    },
    solution: {
      questionCode: code,
      correctAnswer,
      steps: input.steps,
      feedback: input.feedback,
    },
    audit: {
      questionCode: code,
      generatorVersion: "vertical-preview-v1",
      sourceReferenceIds: unit.sourceReferenceIds,
      parameters: input.parameters,
      primaryOfficialOutcomeId: input.primaryOfficialOutcomeId,
      supportingOfficialOutcomeIds: input.supportingOfficialOutcomeIds,
      evidenceForm: input.evidenceForm,
      visualRequirement: input.visualRequirement,
    },
  };
}

function numberDistractors(answer: number): [string, string, string] {
  const delta = answer === 0 ? 2 : 1;
  return [
    String(answer + delta),
    String(answer - delta),
    String(answer + delta + 1),
  ];
}

function wholeNumbersTo10(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    if (group === 0) {
      const count = random.integer(1, 10);
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `Một hàng có ${count} chấm tròn. Hàng đó có bao nhiêu chấm?`,
        answer: String(count),
        distractors: numberDistractors(count),
        steps: ["Chỉ vào từng chấm đúng một lần.", `Đếm lần lượt đến ${count}.`, `Số cuối cùng là ${count}.`],
        feedback: "Đếm từng đồ vật một lần giúp tránh bỏ sót hoặc đếm lặp.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "UNDERSTAND",
        parameters: [{ name: "count", value: count }],
      });
    }
    if (group === 1) {
      const left = random.integer(0, 9);
      const right = left + random.integer(1, 10 - left);
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[1],
        prompt: `Trong hai số ${left} và ${right}, số nào lớn hơn?`,
        answer: String(right),
        distractors: [String(left), String(Math.max(0, right - 1)), String(Math.min(10, left + 1))],
        steps: [`Biểu diễn ${left} và ${right} bằng hai hàng chấm.`, `Hàng của ${right} có nhiều chấm hơn.`, `${right} lớn hơn ${left}.`],
        feedback: "Số ứng với nhóm nhiều đồ vật hơn là số lớn hơn.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "UNDERSTAND",
        parameters: [{ name: "left", value: left }, { name: "right", value: right }],
      });
    }
    const left = random.integer(1, 7);
    const right = random.integer(1, 10 - left);
    const answer = left + right;
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt: `Có ${left} khối, thêm ${right} khối. Có tất cả bao nhiêu khối?`,
      answer: String(answer),
      distractors: numberDistractors(answer),
      steps: [`Bắt đầu từ ${left}.`, `Đếm thêm ${right} bước.`, `${left} + ${right} = ${answer}.`],
      feedback: "Phép cộng gộp hai nhóm; tổng không vượt quá 10 trong chủ đề này.",
      inputType: "NUMBER_INPUT",
      cognitiveLevel: "APPLY",
      parameters: [{ name: "left", value: left }, { name: "right", value: right }],
    });
  });
}

function grade1NumberOperationsTo100(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    if (group === 0) {
      const tens = random.integer(1, 9);
      const ones = random.integer(0, 9);
      const value = tens * 10 + ones;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `Số ${value} gồm bao nhiêu chục và bao nhiêu đơn vị? Hãy nhập số chục.`,
        answer: String(tens),
        distractors: [
          String(tens === 9 ? 8 : tens + 1),
          String(tens <= 2 ? tens + 2 : tens - 2),
          String(value),
        ],
        steps: [
          `Đặt ${value} vào bảng Chục–Đơn vị.`,
          `Chữ số ${tens} ở hàng chục.`,
          `Vậy ${value} có ${tens} chục và ${ones} đơn vị.`,
        ],
        feedback:
          "Chữ số bên trái của số có hai chữ số cho biết số chục; chữ số bên phải cho biết số đơn vị.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "UNDERSTAND",
        parameters: [
          { name: "value", value },
          { name: "tens", value: tens },
          { name: "ones", value: ones },
        ],
      });
    }
    if (group === 1) {
      const subtract = index % 2 === 1;
      const rightTens = random.integer(1, 4);
      const rightOnes = random.integer(0, 4);
      const resultTens = random.integer(1, 4);
      const resultOnes = random.integer(0, 4);
      const right = rightTens * 10 + rightOnes;
      const result = resultTens * 10 + resultOnes;
      const left = subtract
        ? right + result
        : result;
      const second = subtract ? right : right;
      const answer = subtract ? result : left + second;
      const prompt = subtract
        ? `Tính ${left} − ${second}. Phép trừ này không cần mượn.`
        : `Tính ${left} + ${second}. Phép cộng này không cần nhớ.`;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[1],
        prompt,
        answer: String(answer),
        distractors: subtract
          ? [
              String(answer + 1),
              String(Math.max(0, answer - 1)),
              String(left + second),
            ]
          : [
              String(answer - 1),
              String(answer + 1),
              String(Math.abs(left - second)),
            ],
        steps: subtract
          ? [
              `Trừ đơn vị: ${left % 10} − ${second % 10} = ${answer % 10}.`,
              `Trừ chục: ${Math.floor(left / 10)} − ${Math.floor(second / 10)} = ${Math.floor(answer / 10)}.`,
              `${left} − ${second} = ${answer}.`,
            ]
          : [
              `Cộng đơn vị: ${left % 10} + ${second % 10} = ${answer % 10}, chưa đến 10.`,
              `Cộng chục: ${Math.floor(left / 10)} + ${Math.floor(second / 10)} = ${Math.floor(answer / 10)}.`,
              `${left} + ${second} = ${answer}.`,
            ],
        feedback:
          "Căn thẳng hàng chục và hàng đơn vị, rồi chỉ cộng hoặc trừ các chữ số cùng hàng.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "APPLY",
        parameters: [
          { name: "value", value: left },
          { name: "left", value: left },
          { name: "right", value: second },
        ],
      });
    }
    const subtract = index % 2 === 1;
    const leftTens = random.integer(subtract ? 4 : 1, subtract ? 9 : 5);
    const rightTens = random.integer(1, subtract ? leftTens - 1 : 9 - leftTens);
    const left = leftTens * 10;
    const right = rightTens * 10;
    const answer = subtract ? left - right : left + right;
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt: `Tính nhẩm ${left} ${subtract ? "−" : "+"} ${right}.`,
      answer: String(answer),
      distractors: subtract
        ? [
            String(answer + 10),
            String(Math.max(0, answer - 10)),
            String(left + right),
          ]
        : [
            String(answer + 10),
            String(answer - 10),
            String(Math.abs(left - right)),
          ],
      steps: [
        `${left} là ${leftTens} chục; ${right} là ${rightTens} chục.`,
        `${subtract ? "Trừ" : "Cộng"} số chục: ${leftTens} ${subtract ? "−" : "+"} ${rightTens} = ${answer / 10}.`,
        `${answer / 10} chục là ${answer}.`,
      ],
      feedback:
        "Với số tròn chục, tính trên số bó mười rồi viết 0 ở hàng đơn vị.",
      inputType: "NUMBER_INPUT",
      cognitiveLevel: "APPLY",
      parameters: [
        { name: "value", value: answer },
        { name: "left", value: left },
        { name: "right", value: right },
      ],
    });
  });
}

function placeValueTo1000(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    const hundreds = random.integer(1, 9);
    const tens = random.integer(0, 9);
    const ones = random.integer(0, 9);
    const value = hundreds * 100 + tens * 10 + ones;
    if (group === 0) {
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `${hundreds} trăm, ${tens} chục và ${ones} đơn vị tạo thành số nào?`,
        answer: String(value),
        distractors: [String(hundreds * 100 + ones * 10 + tens), String(hundreds * 100 + tens + ones), String(value + 100)],
        steps: [`${hundreds} trăm = ${hundreds * 100}.`, `${tens} chục = ${tens * 10}.`, `Cộng các hàng được ${value}.`],
        feedback: "Giữ đúng vị trí trăm, chục và đơn vị; hàng trống phải dùng chữ số 0.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "APPLY",
        parameters: [{ name: "hundreds", value: hundreds }, { name: "tens", value: tens }, { name: "ones", value: ones }],
      });
    }
    if (group === 1) {
      const place = index % 2 === 0 ? "hàng chục" : "hàng trăm";
      const answer = index % 2 === 0 ? tens : hundreds;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[1],
        prompt: `Trong số ${value}, chữ số ở ${place} là chữ số nào?`,
        answer: String(answer),
        distractors: [String(ones), String(index % 2 === 0 ? hundreds : tens), String((answer + 1) % 10)],
        steps: ["Viết số vào bảng giá trị hàng.", `Tìm cột ${place}.`, `Chữ số trong cột đó là ${answer}.`],
        feedback: "Tên hàng nói về vị trí; giá trị của chữ số còn phụ thuộc vị trí đó.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "UNDERSTAND",
        parameters: [{ name: "value", value }, { name: "place", value: place }],
      });
    }
    const direction = index % 2 === 0 ? -1 : 1;
    const answer = value + direction;
    const label = direction === -1 ? "liền trước" : "liền sau";
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt: `Số ${label} của ${value} là số nào?`,
      answer: String(answer),
      distractors: [String(value - direction), String(value + direction * 10), String(value)],
      steps: [`Số ${label} ${direction === -1 ? "kém" : "hơn"} ${value} một đơn vị.`, `Tính ${value} ${direction === -1 ? "-" : "+"} 1.`, `Kết quả là ${answer}.`],
      feedback: "Hai số liền nhau trên tia số hơn kém nhau đúng một đơn vị.",
      inputType: "NUMBER_INPUT",
      cognitiveLevel: "APPLY",
      parameters: [{ name: "value", value }, { name: "direction", value: label }],
    });
  });
}

function unitFractions(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    const denominator = random.integer(2, 9);
    if (group === 0) {
      const answer = `1/${denominator}`;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `Một thanh được chia thành ${denominator} phần bằng nhau và tô 1 phần. Phần tô màu biểu diễn phân số nào?`,
        answer,
        distractors: [`${denominator}/1`, `1/${denominator + 1}`, `2/${denominator}`],
        steps: [`Có ${denominator} phần bằng nhau nên mẫu số là ${denominator}.`, "Có 1 phần được tô nên tử số là 1.", `Viết ${answer}.`],
        feedback: "Chỉ dùng phân số khi các phần của toàn thể bằng nhau.",
        inputType: "TEXT_INPUT",
        cognitiveLevel: "UNDERSTAND",
        parameters: [{ name: "denominator", value: denominator }],
      });
    }
    if (group === 1) {
      const perGroup = random.integer(2, 6);
      const total = denominator * perGroup;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[1],
        prompt: `Tìm 1/${denominator} của ${total} đồ vật.`,
        answer: String(perGroup),
        distractors: [String(total - perGroup), String(denominator), String(perGroup + 1)],
        steps: [`Chia ${total} đồ vật thành ${denominator} nhóm bằng nhau.`, `${total} ÷ ${denominator} = ${perGroup}.`, "Lấy một nhóm."],
        feedback: "Mẫu số cho biết số nhóm bằng nhau cần chia.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "APPLY",
        parameters: [{ name: "denominator", value: denominator }, { name: "total", value: total }],
      });
    }
    let other = random.integer(2, 9);
    if (other === denominator) other = denominator === 9 ? 8 : denominator + 1;
    const answer = denominator < other ? ">" : "<";
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt: `Điền dấu thích hợp: 1/${denominator} □ 1/${other}.`,
      answer,
      distractors: [answer === ">" ? "<" : ">", "=", "Không xác định"],
      steps: ["Hai phân số đều có tử số 1.", "Mẫu số lớn hơn nghĩa là toàn thể bị chia thành nhiều phần nhỏ hơn.", `Vì vậy 1/${denominator} ${answer} 1/${other}.`],
      feedback: "Với phân số đơn vị của cùng một toàn thể, mẫu càng lớn thì mỗi phần càng nhỏ.",
      inputType: "TEXT_INPUT",
      cognitiveLevel: "REASON",
      parameters: [{ name: "leftDenominator", value: denominator }, { name: "rightDenominator", value: other }],
    });
  });
}

function fractionOperations(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    const denominator = random.integer(4, 10);
    if (group === 0) {
      const numerator = random.integer(1, denominator - 1);
      const scale = random.integer(2, 4);
      const answer = numerator * scale;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `Điền tử số còn thiếu: ${numerator}/${denominator} = □/${denominator * scale}.`,
        answer: String(answer),
        distractors: [String(numerator + scale), String(numerator), String(answer + scale)],
        steps: [`Mẫu số được nhân với ${scale}.`, `Nhân tử số với cùng ${scale}.`, `${numerator} × ${scale} = ${answer}.`],
        feedback: "Muốn tạo phân số tương đương, nhân cả tử và mẫu với cùng một số khác 0.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "APPLY",
        parameters: [{ name: "numerator", value: numerator }, { name: "denominator", value: denominator }, { name: "scale", value: scale }],
      });
    }
    if (group === 1) {
      const left = random.integer(1, denominator - 2);
      const right = random.integer(left + 1, denominator - 1);
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[1],
        prompt: `Điền dấu thích hợp: ${left}/${denominator} □ ${right}/${denominator}.`,
        answer: "<",
        distractors: [">", "=", "Không xác định"],
        steps: [`Hai phân số cùng mẫu ${denominator}.`, `So sánh tử số: ${left} < ${right}.`, `Vì vậy ${left}/${denominator} < ${right}/${denominator}.`],
        feedback: "Khi mẫu số bằng nhau, chỉ cần so sánh tử số.",
        inputType: "TEXT_INPUT",
        cognitiveLevel: "UNDERSTAND",
        parameters: [{ name: "leftNumerator", value: left }, { name: "rightNumerator", value: right }, { name: "denominator", value: denominator }],
      });
    }
    const left = random.integer(1, Math.max(1, denominator - 3));
    const right = random.integer(1, denominator - left - 1);
    const sum = left + right;
    const answer = `${sum}/${denominator}`;
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt: `Tính ${left}/${denominator} + ${right}/${denominator}. Giữ kết quả cùng mẫu số.`,
      answer,
      distractors: [`${sum}/${denominator * 2}`, `${left * right}/${denominator}`, `${sum + 1}/${denominator}`],
      steps: [`Hai phân số cùng mẫu ${denominator}.`, `Cộng tử số: ${left} + ${right} = ${sum}.`, `Giữ mẫu số và được ${answer}.`],
      feedback: "Cộng tử số và giữ nguyên mẫu số khi hai phân số cùng mẫu.",
      inputType: "TEXT_INPUT",
      cognitiveLevel: "APPLY",
      parameters: [{ name: "leftNumerator", value: left }, { name: "rightNumerator", value: right }, { name: "denominator", value: denominator }],
    });
  });
}

function decimalOperations(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    const whole = random.integer(1, 9);
    const tenths = random.integer(1, 9);
    const hundredths = random.integer(0, 9);
    const value = decimal(whole + tenths / 10 + hundredths / 100);
    if (group === 0) {
      const place = index % 2 === 0 ? "phần mười" : "phần trăm";
      const answer = index % 2 === 0 ? tenths : hundredths;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `Trong số ${displayDecimal(value)}, chữ số ở hàng ${place} là chữ số nào?`,
        answer: String(answer),
        distractors: [String(whole), String(index % 2 === 0 ? hundredths : tenths), String((answer + 1) % 10)],
        steps: ["Đặt số vào bảng giá trị hàng.", "Đọc các hàng từ dấu phẩy sang phải.", `Chữ số hàng ${place} là ${answer}.`],
        feedback: "Chữ số đầu sau dấu phẩy là phần mười; chữ số thứ hai là phần trăm.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "UNDERSTAND",
        parameters: [{ name: "value", value }, { name: "place", value: place }],
      });
    }
    if (group === 1) {
      const left = whole + tenths / 10;
      const right = whole + (tenths + 1) / 10;
      const comparison = explainDecimalComparison(
        decimal(left),
        decimal(right),
      );
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[1],
        prompt: `Điền dấu thích hợp: ${displayDecimal(decimal(left))} □ ${displayDecimal(decimal(right))}.`,
        answer: comparison.relation,
        distractors: [">", "=", "Không xác định"],
        steps: comparison.steps,
        feedback: comparison.feedback,
        inputType: "TEXT_INPUT",
        cognitiveLevel: "REASON",
        parameters: [{ name: "left", value: decimal(left) }, { name: "right", value: decimal(right) }],
      });
    }
    const left = random.integer(10, 80) / 10;
    const right = random.integer(10, 80) / 10;
    const useAddition = index % 2 === 0;
    const larger = Math.max(left, right);
    const smaller = Math.min(left, right);
    const answer = decimal(useAddition ? left + right : larger - smaller);
    const operator = useAddition ? "+" : "−";
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt: `Tính ${displayDecimal(decimal(useAddition ? left : larger))} ${operator} ${displayDecimal(decimal(useAddition ? right : smaller))}.`,
      answer,
      distractors: [decimal(Number(answer) + 0.1), decimal(Math.abs(left - right)), decimal(Number(answer) + 1)],
      steps: ["Viết các số sao cho dấu phẩy thẳng cột.", "Tính theo từng hàng từ phải sang trái.", `Kết quả là ${displayDecimal(answer)}.`],
      feedback: "Căn thẳng dấu phẩy trước khi cộng hoặc trừ số thập phân.",
      inputType: "NUMBER_INPUT",
      cognitiveLevel: "APPLY",
      parameters: [{ name: "left", value: left }, { name: "right", value: right }, { name: "operation", value: operator }],
    });
  });
}

function integerOperations(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    const left = random.integer(-20, 20);
    let right = random.integer(-20, 20);
    if (right === left) right = left === 20 ? 19 : left + 1;
    if (group === 0) {
      const answer = left > right ? left : right;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `Trong hai số ${left} và ${right}, số nào lớn hơn?`,
        answer: String(answer),
        distractors: [String(answer === left ? right : left), String(-answer), "0"],
        steps: [`Đánh dấu ${left} và ${right} trên trục số.`, `Số ${answer} nằm bên phải.`, "Số nằm bên phải lớn hơn."],
        feedback: "Vị trí trên trục số quyết định thứ tự, kể cả với số âm.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "UNDERSTAND",
        parameters: [{ name: "left", value: left }, { name: "right", value: right }],
      });
    }
    if (group === 1) {
      const answer = left + right;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[1],
        prompt: `Tính ${left} + (${right}).`,
        answer: String(answer),
        distractors: [String(left - right), String(Math.abs(left) + Math.abs(right)), String(-answer)],
        steps: [`Bắt đầu tại ${left} trên trục số.`, `${right >= 0 ? "Đi sang phải" : "Đi sang trái"} ${Math.abs(right)} đơn vị.`, `Dừng tại ${answer}.`],
        feedback: "Cộng số dương dịch phải; cộng số âm dịch trái trên trục số.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "APPLY",
        parameters: [
          { name: "left", value: left },
          { name: "right", value: right },
          { name: "operation", value: "ADD" },
        ],
      });
    }
    const answer = left - right;
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt: `Tính ${left} − (${right}).`,
      answer: String(answer),
      distractors: [String(left + right), String(right - left), String(-answer)],
      steps: [`Số đối của ${right} là ${-right}.`, `Đổi thành ${left} + (${-right}).`, `Kết quả là ${answer}.`],
      feedback: "Trừ một số bằng cộng với số đối của số đó.",
      inputType: "NUMBER_INPUT",
      cognitiveLevel: "REASON",
      parameters: [
        { name: "left", value: left },
        { name: "right", value: right },
        { name: "operation", value: "SUBTRACT" },
      ],
    });
  });
}

function multiplicationDivision(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  const tables = unit.grade === 2 ? [2, 5] : [3, 4, 6, 7, 8, 9];
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    const factor = tables[random.integer(0, tables.length - 1)];
    const groups = random.integer(2, unit.grade === 2 ? 5 : 10);
    const product = factor * groups;
    if (group === 0) {
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `Có ${groups} nhóm, mỗi nhóm ${factor} đồ vật. Có tất cả bao nhiêu đồ vật?`,
        answer: String(product),
        distractors: [String(groups + factor), String(product - factor), String(product + groups)],
        steps: [`Viết cộng lặp ${factor} đúng ${groups} lần.`, `Viết gọn thành ${groups} × ${factor}.`, `Tích là ${product}.`],
        feedback: "Số nhóm nhân với số đồ vật trong mỗi nhóm cho tổng số đồ vật.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "UNDERSTAND",
        parameters: [{ name: "groups", value: groups }, { name: "itemsPerGroup", value: factor }],
      });
    }
    if (group === 1) {
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[1],
        prompt: `Chia đều ${product} đồ vật vào ${groups} nhóm. Mỗi nhóm có bao nhiêu?`,
        answer: String(factor),
        distractors: [String(groups), String(product - groups), String(factor + 1)],
        steps: [`Tìm số nhân với ${groups} được ${product}.`, `${groups} × ${factor} = ${product}.`, `Vậy ${product} ÷ ${groups} = ${factor}.`],
        feedback: "Dùng phép nhân ngược để kiểm tra phép chia.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "APPLY",
        parameters: [{ name: "dividend", value: product }, { name: "divisor", value: groups }],
      });
    }
    const findGroups = index % 2 === 0;
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt: findGroups
        ? `${product} thẻ được xếp, mỗi nhóm ${factor} thẻ. Có bao nhiêu nhóm?`
        : `${groups} bạn chia đều ${product} nhãn dán. Mỗi bạn nhận bao nhiêu?`,
      answer: String(findGroups ? groups : factor),
      distractors: [String(findGroups ? factor : groups), String(product), String(Math.abs(groups - factor))],
      steps: [
        findGroups
          ? `Cần tìm số nhóm: ${product} ÷ ${factor}.`
          : `Cần tìm số phần mỗi bạn: ${product} ÷ ${groups}.`,
        `Dùng fact family ${groups} × ${factor} = ${product}.`,
        `Kết quả là ${findGroups ? groups : factor}.`,
      ],
      feedback: "Đọc câu hỏi để xác định cần tìm số nhóm hay số đồ vật trong mỗi nhóm.",
      inputType: "NUMBER_INPUT",
      cognitiveLevel: "REASON",
      parameters: [{ name: "groups", value: groups }, { name: "itemsPerGroup", value: factor }, { name: "product", value: product }],
    });
  });
}

function wholeNumberOperations(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    if (group === 0) {
      const left = random.integer(1200, 9000);
      const right = random.integer(500, 5000);
      const addition = index % 2 === 0;
      const larger = Math.max(left, right);
      const smaller = Math.min(left, right);
      const answer = addition ? left + right : larger - smaller;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `Tính ${addition ? `${left} + ${right}` : `${larger} − ${smaller}`}.`,
        answer: String(answer),
        distractors: [String(answer + 100), String(Math.abs(left - right)), String(answer + 10)],
        steps: ["Đặt các chữ số cùng hàng thẳng cột.", "Tính từ hàng đơn vị sang trái.", `Kết quả là ${answer}.`],
        feedback: "Căn đúng hàng đơn vị, chục, trăm và nghìn trước khi tính.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "APPLY",
        parameters: [{ name: "left", value: left }, { name: "right", value: right }, { name: "operation", value: addition ? "ADD" : "SUBTRACT" }],
      });
    }
    if (group === 1) {
      const divisor = random.integer(2, 9);
      const quotient = random.integer(12, 99);
      const product = divisor * quotient;
      const multiplication = index % 2 === 0;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[1],
        prompt: multiplication
          ? `Tính ${divisor} × ${quotient}.`
          : `Tính ${product} ÷ ${divisor}.`,
        answer: String(multiplication ? product : quotient),
        distractors: [String(divisor + quotient), String(product - divisor), String(quotient + divisor)],
        steps: multiplication
          ? [`Tách ${quotient} theo giá trị hàng.`, `Nhân ${divisor} với từng phần rồi cộng.`, `Kết quả là ${product}.`]
          : [`Tìm số nhân với ${divisor} được ${product}.`, `${divisor} × ${quotient} = ${product}.`, `Thương là ${quotient}.`],
        feedback: "Dùng quan hệ phép nhân–chia để kiểm tra kết quả.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "APPLY",
        parameters: [{ name: "divisor", value: divisor }, { name: "quotient", value: quotient }],
      });
    }
    const multiplier = random.integer(2, 9);
    const multiplicand = random.integer(2, 9);
    const addend = random.integer(5, 30);
    const answer = addend + multiplier * multiplicand;
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt: `Tính ${addend} + ${multiplier} × ${multiplicand}.`,
      answer: String(answer),
      distractors: [String((addend + multiplier) * multiplicand), String(addend + multiplier + multiplicand), String(answer - multiplicand)],
      steps: [`Làm phép nhân trước: ${multiplier} × ${multiplicand} = ${multiplier * multiplicand}.`, `Sau đó cộng ${addend}.`, `Kết quả là ${answer}.`],
      feedback: "Trong biểu thức không có ngoặc, nhân và chia được thực hiện trước cộng và trừ.",
      inputType: "NUMBER_INPUT",
      cognitiveLevel: "REASON",
      parameters: [{ name: "addend", value: addend }, { name: "multiplier", value: multiplier }, { name: "multiplicand", value: multiplicand }],
    });
  });
}

function ratioAndProportion(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    if (group === 0) {
      const leftBase = random.integer(1, 6);
      let rightBase = random.integer(2, 8);
      if (rightBase === leftBase) rightBase += 1;
      const common = greatestCommonDivisor(leftBase, rightBase);
      const a = leftBase / common;
      const b = rightBase / common;
      const scale = random.integer(2, 8);
      const answer = `${a}:${b}`;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `Rút gọn tỉ số ${a * scale}:${b * scale}.`,
        answer,
        distractors: [`${b}:${a}`, `${a * scale - 1}:${b * scale}`, `${a + 1}:${b + 1}`],
        steps: [`Cả hai số cùng chia hết cho ${scale}.`, `Chia từng số cho ${scale}.`, `Nhận được ${answer}.`],
        feedback: "Rút gọn tỉ số bằng cách chia cả hai thành phần cho cùng một ước chung.",
        inputType: "TEXT_INPUT",
        cognitiveLevel: "APPLY",
        parameters: [{ name: "leftBase", value: a }, { name: "rightBase", value: b }, { name: "scale", value: scale }],
      });
    }
    if (group === 1) {
      const unitValue = random.integer(2, 12);
      const knownCount = random.integer(2, 6);
      const targetCount = knownCount + random.integer(1, 5);
      const answer = unitValue * targetCount;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[1],
        prompt: `${knownCount} phần bằng nhau có giá trị ${unitValue * knownCount}. ${targetCount} phần như vậy có giá trị bao nhiêu?`,
        answer: String(answer),
        distractors: [String(unitValue + targetCount), String(unitValue * knownCount + targetCount), String(answer - unitValue)],
        steps: [`Một phần có giá trị ${unitValue * knownCount} ÷ ${knownCount} = ${unitValue}.`, `Nhân ${unitValue} với ${targetCount}.`, `Kết quả là ${answer}.`],
        feedback: "Đại lượng tỉ lệ thuận giữ nguyên giá trị của một đơn vị.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "APPLY",
        parameters: [{ name: "unitValue", value: unitValue }, { name: "knownCount", value: knownCount }, { name: "targetCount", value: targetCount }],
      });
    }
    const sourceUnits = random.integer(2, 6);
    const unitValue = random.integer(2, 12);
    const targetUnits = sourceUnits + random.integer(2, 6);
    const sourceValue = sourceUnits * unitValue;
    const answer = targetUnits * unitValue;
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt: `${sourceUnits} phần có giá trị ${sourceValue}. Theo cùng tỉ lệ, ${targetUnits} phần có giá trị bao nhiêu?`,
      answer: String(answer),
      distractors: [String(sourceValue + targetUnits), String(sourceValue + unitValue), String(targetUnits * sourceUnits)],
      steps: [`Một phần có giá trị ${sourceValue} ÷ ${sourceUnits} = ${unitValue}.`, `Nhân ${unitValue} với ${targetUnits}.`, `Kết quả là ${answer}.`],
      feedback: "Cùng một quan hệ tỉ lệ thuận phải giữ nguyên giá trị của một đơn vị.",
      inputType: "NUMBER_INPUT",
      cognitiveLevel: "REASON",
      parameters: [{ name: "sourceUnits", value: sourceUnits }, { name: "sourceValue", value: sourceValue }, { name: "targetUnits", value: targetUnits }],
    });
  });
}

function linearFunctions(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    const a = random.integer(1, 5) * (random.integer(0, 1) === 0 ? -1 : 1);
    const b = random.integer(-6, 6);
    const x = random.integer(-4, 4);
    const y = a * x + b;
    if (group === 0) {
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `Tính giá trị của ${a}x ${b < 0 ? "−" : "+"} ${Math.abs(b)} khi x = ${x}.`,
        answer: String(y),
        distractors: [String(a + x + b), String(a * (x + b)), String(-y)],
        steps: [`Thay x = ${x}.`, `Tính ${a} × (${x}) ${b < 0 ? "−" : "+"} ${Math.abs(b)}.`, `Kết quả là ${y}.`],
        feedback: "Thay biến bằng cả giá trị có dấu rồi thực hiện phép nhân trước phép cộng.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "APPLY",
        parameters: [{ name: "a", value: a }, { name: "b", value: b }, { name: "x", value: x }],
      });
    }
    if (group === 1) {
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[1],
        prompt: `Với y = ${a}x ${b < 0 ? "−" : "+"} ${Math.abs(b)}, tìm y khi x = ${x}.`,
        answer: String(y),
        distractors: [String(y + a), String(a + x + b), String(-y)],
        steps: [`Thay x = ${x} vào quy tắc.`, `Tính ${a} × (${x}) = ${a * x}.`, `Cộng ${b} và được y = ${y}.`],
        feedback: "Một đầu vào x được quy tắc hàm số gán cho một đầu ra y.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "APPLY",
        parameters: [{ name: "a", value: a }, { name: "b", value: b }, { name: "x", value: x }],
      });
    }
    const askSlope = index % 2 === 0;
    const answer = askSlope ? a : b;
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt: `Trong y = ${a}x ${b < 0 ? "−" : "+"} ${Math.abs(b)}, ${askSlope ? "hệ số a" : "giá trị b"} bằng bao nhiêu?`,
      answer: String(answer),
      distractors: [String(askSlope ? b : a), String(-answer), String(answer + 1)],
      steps: ["So sánh quy tắc với dạng y = ax + b.", askSlope ? "Hệ số đứng trước x là a." : "Số hạng không chứa x là b.", `Giá trị cần tìm là ${answer}.`],
      feedback: "a là hệ số của x; b là tung độ khi x bằng 0.",
      inputType: "NUMBER_INPUT",
      cognitiveLevel: "UNDERSTAND",
      parameters: [{ name: "a", value: a }, { name: "b", value: b }, { name: "requested", value: askSlope ? "a" : "b" }],
    });
  });
}

function linearEquations(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    const solution = random.integer(-9, 12);
    const coefficient = random.integer(2, 7);
    const constant = random.integer(-12, 12);
    const result = coefficient * solution + constant;
    if (group === 0) {
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `${coefficient}x = ${coefficient * solution}. Tìm x.`,
        answer: String(solution),
        distractors: [String(coefficient * solution - coefficient), String(solution + coefficient), String(-solution)],
        steps: [`Chia cả hai vế cho ${coefficient}.`, `x = ${coefficient * solution} ÷ ${coefficient}.`, `x = ${solution}.`],
        feedback: "Chia hai vế cho cùng một số khác 0 giữ phương trình tương đương.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "UNDERSTAND",
        parameters: [{ name: "coefficient", value: coefficient }, { name: "solution", value: solution }],
      });
    }
    if (group === 1) {
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[1],
        prompt: `Giải ${coefficient}x ${constant < 0 ? "−" : "+"} ${Math.abs(constant)} = ${result}.`,
        answer: String(solution),
        distractors: [String(result - constant), String(solution + constant), String(-solution)],
        steps: [`${constant < 0 ? "Cộng" : "Trừ"} ${Math.abs(constant)} ở cả hai vế để được ${coefficient}x = ${coefficient * solution}.`, `Chia hai vế cho ${coefficient}.`, `x = ${solution}.`],
        feedback: "Thực hiện cùng một phép biến đổi ở cả hai vế, rồi kiểm tra nghiệm.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "APPLY",
        parameters: [{ name: "coefficient", value: coefficient }, { name: "constant", value: constant }, { name: "result", value: result }],
      });
    }
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt: `Một số được nhân ${coefficient}, rồi ${constant < 0 ? "bớt" : "thêm"} ${Math.abs(constant)}, kết quả là ${result}. Số đó là bao nhiêu?`,
      answer: String(solution),
      distractors: [String(result / coefficient), String(result - constant), String(solution + 1)],
      steps: ["Gọi số cần tìm là x.", `Lập phương trình ${coefficient}x ${constant < 0 ? "−" : "+"} ${Math.abs(constant)} = ${result}.`, `Giải và nhận x = ${solution}.`],
      feedback: "Xác định đúng đại lượng chưa biết trước khi lập phương trình.",
      inputType: "NUMBER_INPUT",
      cognitiveLevel: "REASON",
      parameters: [{ name: "coefficient", value: coefficient }, { name: "constant", value: constant }, { name: "solution", value: solution }],
    });
  });
}

function linearSystems(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    const x = random.integer(1, 12);
    const y = random.integer(1, 12);
    const sum = x + y;
    const difference = x - y;
    if (group === 0) {
      const valid = index % 2 === 0;
      const candidateY = valid ? y : y + 1;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `Cặp (${x};${candidateY}) có đồng thời thỏa x + y = ${sum} và x − y = ${difference} không? Nhập 1 cho Có, 0 cho Không.`,
        answer: valid ? "1" : "0",
        distractors: valid ? ["0", "2", "-1"] : ["1", "2", "-1"],
        steps: [`Thay vào phương trình thứ nhất: ${x} + ${candidateY} = ${x + candidateY}.`, `Thay vào phương trình thứ hai: ${x} − ${candidateY} = ${x - candidateY}.`, valid ? "Cả hai đẳng thức đúng." : "Ít nhất một đẳng thức không đúng."],
        feedback: "Một cặp chỉ là nghiệm khi thỏa mãn cả hai phương trình.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "UNDERSTAND",
        parameters: [{ name: "x", value: x }, { name: "candidateY", value: candidateY }, { name: "valid", value: valid ? 1 : 0 }],
      });
    }
    if (group === 1) {
      const askX = index % 2 === 0;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[1],
        prompt: `Cho hệ x + y = ${sum}, x − y = ${difference}. Tìm ${askX ? "x" : "y"}.`,
        answer: String(askX ? x : y),
        distractors: [String(askX ? y : x), String(sum), String(Math.abs(difference))],
        steps: [`Cộng hai phương trình được 2x = ${2 * x}.`, `Suy ra x = ${x}; thế vào x + y = ${sum}.`, `Nhận y = ${y}.`],
        feedback: "Cộng hai phương trình khử y; sau đó thế lại để tìm ẩn còn lại.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "APPLY",
        parameters: [{ name: "sum", value: sum }, { name: "difference", value: difference }, { name: "requested", value: askX ? "x" : "y" }],
      });
    }
    const totalItems = x + y;
    const totalValue = x + 2 * y;
    const askDouble = index % 2 === 0;
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt: `Có ${totalItems} món gồm loại A giá 1 đơn vị và loại B giá 2 đơn vị, tổng giá ${totalValue}. Có bao nhiêu món loại ${askDouble ? "B" : "A"}?`,
      answer: String(askDouble ? y : x),
      distractors: [String(askDouble ? x : y), String(totalItems), String(totalValue - totalItems)],
      steps: ["Gọi số món loại A là x, loại B là y.", `Lập x + y = ${totalItems} và x + 2y = ${totalValue}.`, `Trừ hai phương trình được y = ${y}, rồi x = ${x}.`],
      feedback: "Hai quan hệ độc lập tạo thành một hệ; nghiệm phải phù hợp cả số lượng và tổng giá.",
      inputType: "NUMBER_INPUT",
      cognitiveLevel: "REASON",
      parameters: [{ name: "typeA", value: x }, { name: "typeB", value: y }, { name: "totalValue", value: totalValue }],
    });
  });
}

function quadraticFunctions(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    const root = random.integer(2, 10);
    if (group === 0) {
      const square = root * root;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `Căn bậc hai số học của ${square} là bao nhiêu?`,
        answer: String(root),
        distractors: [String(-root), String(square / 2), String(root + 1)],
        steps: [`Tìm số không âm có bình phương bằng ${square}.`, `${root} × ${root} = ${square}.`, `Căn bậc hai số học là ${root}.`],
        feedback: "Căn bậc hai số học là giá trị không âm.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "UNDERSTAND",
        parameters: [
          { name: "shape", value: "RECTANGLE" },
          { name: "width", value: root },
          { name: "height", value: root },
        ],
        visualRequirement: "AREA_MODEL",
      });
    }
    const a = random.integer(1, 4) * (random.integer(0, 1) === 0 ? -1 : 1);
    const x = random.integer(-5, 5);
    const y = a * x * x;
    if (group === 1) {
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[1],
        prompt: `Với y = ${a}x², tìm y khi x = ${x}.`,
        answer: String(y),
        distractors: [String(a * 2 * x), String(a * x), String(-y)],
        steps: [`Bình phương x: (${x})² = ${x * x}.`, `Nhân ${x * x} với ${a}.`, `y = ${y}.`],
        feedback: "Bình phương giá trị của x trước, kể cả khi x âm.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "APPLY",
        parameters: [{ name: "a", value: a }, { name: "x", value: x }],
      });
    }
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt: `Điểm (${x}; ${y}) có thuộc đồ thị y = ${a}x² không? Nhập 1 cho Có, 0 cho Không.`,
      answer: "1",
      distractors: ["0", "2", "-1"],
      steps: [`Thay x = ${x}: ${a} × (${x})² = ${y}.`, `Giá trị tính được bằng tung độ ${y}.`, "Điểm thuộc đồ thị."],
      feedback: "Một điểm thuộc đồ thị khi tọa độ của nó thỏa mãn đúng quy tắc hàm số.",
      inputType: "NUMBER_INPUT",
      cognitiveLevel: "REASON",
      parameters: [{ name: "a", value: a }, { name: "x", value: x }, { name: "y", value: y }],
    });
  });
}

const geometryShapes = [
  { code: "CIRCLE", label: "hình tròn", sides: 0, corners: 0 },
  { code: "TRIANGLE", label: "hình tam giác", sides: 3, corners: 3 },
  { code: "SQUARE", label: "hình vuông", sides: 4, corners: 4 },
  { code: "RECTANGLE", label: "hình chữ nhật", sides: 4, corners: 4 },
] as const;

function geometryPractice(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    const shape = geometryShapes[random.integer(0, geometryShapes.length - 1)];
    const parameters = [
      { name: "shape", value: shape.code },
      { name: "sides", value: shape.sides },
      { name: "corners", value: shape.corners },
    ];
    if (group === 0) {
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: "Quan sát mô hình. Đây là hình gì?",
        answer: shape.label,
        distractors: geometryShapes
          .filter((candidate) => candidate.code !== shape.code)
          .map((candidate) => candidate.label) as [string, string, string],
        steps: [
          "Quan sát đường bao thay vì dựa vào kích thước hoặc hướng đặt.",
          `Mô hình có ${shape.sides} cạnh thẳng và ${shape.corners} đỉnh.`,
          `Các đặc điểm đó cho biết đây là ${shape.label}.`,
        ],
        feedback:
          "Tên hình dựa vào đường bao, số cạnh và số đỉnh; xoay hình không làm đổi tên.",
        inputType: "TEXT_INPUT",
        cognitiveLevel: "UNDERSTAND",
        parameters,
      });
    }
    const asksSides = group === 1;
    const answer = asksSides ? shape.sides : shape.corners;
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[group],
      prompt: `Mô hình ${shape.label} có bao nhiêu ${asksSides ? "cạnh thẳng" : "đỉnh"}?`,
      answer: String(answer),
      distractors: [
        String(answer + 1),
        String(answer === 0 ? 2 : answer - 1),
        String(answer + 2),
      ],
      steps: [
        asksSides
          ? "Đi theo đường bao và chỉ đếm các đoạn thẳng."
          : "Chỉ vào từng nơi hai cạnh thẳng gặp nhau.",
        `Đếm mỗi ${asksSides ? "cạnh" : "đỉnh"} đúng một lần.`,
        `${shape.label} có ${answer} ${asksSides ? "cạnh thẳng" : "đỉnh"}.`,
      ],
      feedback: asksSides
        ? "Cạnh là đoạn thẳng trên đường bao; đường cong của hình tròn không phải cạnh thẳng."
        : "Đỉnh là nơi hai cạnh thẳng gặp nhau; không đếm một đỉnh hai lần.",
      inputType: "NUMBER_INPUT",
      cognitiveLevel: group === 1 ? "APPLY" : "REASON",
      parameters,
    });
  });
}

function measurementPractice(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    const maximum = unit.grade === 1 ? 10 : unit.grade === 2 ? 30 : 50;
    const start = random.integer(0, unit.grade === 1 ? 0 : 8);
    const length = random.integer(1, maximum - start);
    const end = start + length;
    const parameters = [
      { name: "start", value: start },
      { name: "end", value: end },
      { name: "length", value: length },
    ];
    if (group === 0) {
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `Đoạn thẳng bắt đầu ở vạch ${start} và kết thúc ở vạch ${end}. Độ dài là bao nhiêu xăng-ti-mét?`,
        answer: String(length),
        distractors: [String(end), String(length + 1), String(Math.max(0, length - 1))],
        steps: [
          `Xác định vạch đầu ${start} và vạch cuối ${end}.`,
          `Tính khoảng cách: ${end} − ${start} = ${length}.`,
          `Ghi kết quả ${length} cm.`,
        ],
        feedback:
          "Độ dài là số khoảng giữa hai vạch, bằng số cuối trừ số đầu.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "UNDERSTAND",
        parameters,
      });
    }
    if (group === 1) {
      const extra = random.integer(1, 9);
      const answer = length + extra;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[1],
        prompt: `Đoạn trong hình dài ${length} cm. Nối thêm đoạn ${extra} cm thì tổng dài bao nhiêu xăng-ti-mét?`,
        answer: String(answer),
        distractors: [String(Math.abs(length - extra)), String(answer + 1), String(length)],
        steps: [
          "Hai đoạn nối tiếp nên cộng độ dài.",
          `Tính ${length} + ${extra} = ${answer}.`,
          `Tổng độ dài là ${answer} cm.`,
        ],
        feedback:
          "Khi các đoạn nối tiếp tạo thành toàn bộ, cộng các độ dài cùng đơn vị.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "APPLY",
        parameters,
      });
    }
    const removed = random.integer(1, length);
    const answer = length - removed;
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt: `Đoạn trong hình dài ${length} cm. Cắt bớt ${removed} cm thì còn lại bao nhiêu xăng-ti-mét?`,
      answer: String(answer),
      distractors: [String(length + removed), String(removed), String(answer + 1)],
      steps: [
        "Phần còn lại bằng toàn bộ trừ phần đã cắt.",
        `Tính ${length} − ${removed} = ${answer}.`,
        `Còn lại ${answer} cm.`,
      ],
      feedback:
        "Tìm phần còn lại bằng phép trừ và giữ nguyên đơn vị đo.",
      inputType: "NUMBER_INPUT",
      cognitiveLevel: "REASON",
      parameters,
    });
  });
}

function anglePractice(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  const angleValues = [30, 45, 60, 70, 90, 110, 120, 135, 150] as const;
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    const degrees = angleValues[random.integer(0, angleValues.length - 1)];
    const parameters = [{ name: "degrees", value: degrees }];
    if (group === 0) {
      const answer =
        degrees < 90 ? "góc nhọn" : degrees === 90 ? "góc vuông" : "góc tù";
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `Góc ${degrees}° thuộc loại nào?`,
        answer,
        distractors: ["góc nhọn", "góc vuông", "góc tù"].filter(
          (candidate) => candidate !== answer,
        ).concat("góc bẹt") as [string, string, string],
        steps: [
          `So sánh ${degrees}° với mốc 90° và 180°.`,
          degrees < 90
            ? `${degrees}° nhỏ hơn 90°.`
            : degrees === 90
              ? `${degrees}° bằng 90°.`
              : `${degrees}° lớn hơn 90° và nhỏ hơn 180°.`,
          `Vì vậy đây là ${answer}.`,
        ],
        feedback:
          "Phân loại góc theo số đo, không theo độ dài của hai tia.",
        inputType: "TEXT_INPUT",
        cognitiveLevel: "UNDERSTAND",
        parameters,
      });
    }
    if (group === 1 || unit.grade === 4) {
      const answer = 180 - degrees;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[group],
        prompt: `Góc ${degrees}° và góc chưa biết kề nhau trên một đường thẳng. Góc chưa biết bằng bao nhiêu độ?`,
        answer: String(answer),
        distractors: [String(360 - degrees), String(degrees), String(answer + 10)],
        steps: [
          "Hai góc kề trên một đường thẳng có tổng 180°.",
          `Tính 180° − ${degrees}° = ${answer}°.`,
          `Góc chưa biết bằng ${answer}°.`,
        ],
        feedback:
          "Góc bẹt là 180°; không lấy 360° vì hình chỉ biểu diễn một đường thẳng.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: group === 1 ? "APPLY" : "REASON",
        parameters,
      });
    }
    const first = random.integer(30, 80);
    const second = random.integer(30, Math.min(80, 170 - first));
    const answer = 180 - first - second;
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt: `Tam giác có hai góc ${first}° và ${second}°. Góc còn lại bằng bao nhiêu độ?`,
      answer: String(answer),
      distractors: [String(first + second), String(360 - first - second), String(answer + 10)],
      steps: [
        "Tổng ba góc trong tam giác bằng 180°.",
        `Cộng hai góc đã biết: ${first}° + ${second}° = ${first + second}°.`,
        `Lấy 180° − ${first + second}° = ${answer}°.`,
      ],
      feedback:
        "Dùng tổng 180° của ba góc trong tam giác, rồi kiểm tra kết quả dương.",
      inputType: "NUMBER_INPUT",
      cognitiveLevel: "REASON",
      parameters: [{ name: "angle", value: answer }],
    });
  });
}

function areaMeasurementPractice(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    const width = random.integer(3, 12);
    const height = random.integer(2, 10);
    const area = width * height;
    if (group === 0) {
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `Hình chữ nhật dài ${width} cm và rộng ${height} cm. Diện tích bằng bao nhiêu xăng-ti-mét vuông?`,
        answer: String(area),
        distractors: [String(2 * (width + height)), String(width + height), String(area + width)],
        steps: [
          "Hai kích thước cùng đơn vị cm.",
          `Diện tích = ${width} × ${height} = ${area}.`,
          `Kết quả là ${area} cm².`,
        ],
        feedback:
          "Diện tích hình chữ nhật bằng chiều dài nhân chiều rộng và dùng đơn vị vuông.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "UNDERSTAND",
        parameters: [{ name: "shape", value: "RECTANGLE" }, { name: "width", value: width }, { name: "height", value: height }],
      });
    }
    if (group === 1) {
      const perimeter = 2 * (width + height);
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[1],
        prompt: `Hình chữ nhật dài ${width} cm, rộng ${height} cm. Chu vi bằng bao nhiêu xăng-ti-mét?`,
        answer: String(perimeter),
        distractors: [String(area), String(width + height), String(perimeter + 2)],
        steps: [
          "Chu vi là tổng bốn cạnh.",
          `Tính 2 × (${width} + ${height}) = ${perimeter}.`,
          `Kết quả là ${perimeter} cm.`,
        ],
        feedback:
          "Chu vi đo đường bao nên dùng cm, không dùng cm².",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "APPLY",
        parameters: [{ name: "shape", value: "RECTANGLE" }, { name: "width", value: width }, { name: "height", value: height }],
      });
    }
    if (unit.grade >= 5) {
      const doubledArea = width * height;
      const adjustedHeight = doubledArea % 2 === 0 ? height : height + 1;
      const answer = (width * adjustedHeight) / 2;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[2],
        prompt: `Tam giác có đáy ${width} cm và chiều cao ${adjustedHeight} cm. Diện tích bằng bao nhiêu xăng-ti-mét vuông?`,
        answer: String(answer),
        distractors: [String(width * adjustedHeight), String(width + adjustedHeight), String(answer + width)],
        steps: [
          `Nhân đáy với chiều cao: ${width} × ${adjustedHeight} = ${width * adjustedHeight}.`,
          "Chia 2 vì tam giác bằng nửa hình chữ nhật cùng đáy và chiều cao.",
          `Diện tích là ${answer} cm².`,
        ],
        feedback:
          "Chiều cao phải vuông góc với đáy; công thức tam giác có phép chia 2.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "REASON",
        parameters: [{ name: "shape", value: "TRIANGLE" }, { name: "base", value: width }, { name: "height", value: adjustedHeight }],
      });
    }
    const answer = height;
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt: `Hình chữ nhật có diện tích ${area} cm² và chiều dài ${width} cm. Chiều rộng bằng bao nhiêu xăng-ti-mét?`,
      answer: String(answer),
      distractors: [String(area - width), String(width), String(answer + 1)],
      steps: [
        "Diện tích bằng chiều dài nhân chiều rộng.",
        `Lấy ${area} ÷ ${width} = ${answer}.`,
        `Kiểm tra ${width} × ${answer} = ${area}.`,
      ],
      feedback:
        "Tìm một cạnh bằng diện tích chia cho cạnh đã biết.",
      inputType: "NUMBER_INPUT",
      cognitiveLevel: "REASON",
      parameters: [{ name: "shape", value: "RECTANGLE" }, { name: "width", value: width }, { name: "height", value: height }],
    });
  });
}

function grade2DataChance(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    const countA = random.integer(1, 8);
    let countB = random.integer(1, 8);
    if (countB === countA) countB = countA === 8 ? 7 : countA + 1;
    const parameters = [
      { name: "countA", value: countA },
      { name: "countB", value: countB },
    ];
    if (group === 0) {
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `Bảng có ${countA} quan sát ở Nhóm A và ${countB} ở Nhóm B. Có tất cả bao nhiêu quan sát?`,
        answer: String(countA + countB),
        distractors: [String(Math.abs(countA - countB)), String(countA), String(countA + countB + 1)],
        steps: ["Mỗi quan sát thuộc đúng một nhóm.", `Cộng ${countA} + ${countB} = ${countA + countB}.`, "Tổng tần số bằng tổng số quan sát."],
        feedback: "Cộng tần số của các nhóm và không đếm một biểu tượng hai lần.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "UNDERSTAND",
        parameters,
      });
    }
    if (group === 1) {
      const answer = countA > countB ? "Nhóm A" : "Nhóm B";
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[1],
        prompt: "Mỗi biểu tượng là một quan sát. Nhóm nào có nhiều quan sát hơn?",
        answer,
        distractors: [answer === "Nhóm A" ? "Nhóm B" : "Nhóm A", "Hai nhóm bằng nhau", "Không đủ dữ kiện"],
        steps: [`Nhóm A có ${countA}, Nhóm B có ${countB}.`, `So sánh ${countA} và ${countB}.`, `${answer} có nhiều quan sát hơn.`],
        feedback: "Đọc chú giải rồi so sánh số biểu tượng của từng nhóm.",
        inputType: "TEXT_INPUT",
        cognitiveLevel: "APPLY",
        parameters,
      });
    }
    const eventIndex = index % 3;
    const answer = eventIndex === 0 ? "chắc chắn" : eventIndex === 1 ? "không thể" : "có thể";
    const prompt = eventIndex === 0
      ? "Túi chỉ có thẻ tròn. Lấy một thẻ tròn là sự kiện gì?"
      : eventIndex === 1
        ? "Túi chỉ có thẻ tròn và vuông. Lấy một thẻ tam giác là sự kiện gì?"
        : "Túi có thẻ tròn và vuông. Lấy một thẻ tròn là sự kiện gì?";
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt,
      answer,
      distractors: ["có thể", "chắc chắn", "không thể"].filter((item) => item !== answer).concat("không xác định") as [string, string, string],
      steps: ["Liệt kê các loại thẻ có thể lấy.", eventIndex === 0 ? "Mọi kết quả đều là thẻ tròn." : eventIndex === 1 ? "Không có thẻ tam giác trong túi." : "Có kết quả là tròn và cũng có kết quả là vuông.", `Vì vậy sự kiện là ${answer}.`],
      feedback: "Chắc chắn nghĩa là mọi kết quả phù hợp; không thể nghĩa là không có kết quả phù hợp.",
      inputType: "TEXT_INPUT",
      cognitiveLevel: "REASON",
      parameters,
    });
  });
}

function secondaryGeometry(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  const triples = [
    [3, 4, 5],
    [5, 12, 13],
    [8, 15, 17],
  ] as const;
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    if (unit.grade === 7) {
      const first = random.integer(35, 75);
      const second = random.integer(35, 75);
      const remaining = 180 - first - second;
      if (group === 0) {
        return makeDraftParts(unit, index, {
          skillFamily: unit.skillFamilies[0],
          prompt: `Tam giác có hai góc ${first}° và ${second}°. Góc còn lại bằng bao nhiêu?`,
          answer: String(remaining),
          distractors: [String(first + second), String(180 - first), String(360 - first - second)],
          steps: [`Tổng ba góc của tam giác là 180°.`, `Cộng ${first}° + ${second}° = ${first + second}°.`, `Lấy 180° - ${first + second}° = ${remaining}°.`],
          feedback: "Dùng tổng 180° của ba góc trong tam giác, không dùng tổng 360°.",
          inputType: "NUMBER_INPUT",
          cognitiveLevel: "APPLY",
          parameters: [{ name: "degrees", value: remaining }],
        });
      }
      if (group === 1) {
        const vertex = random.integer(30, 100);
        const base = (180 - vertex) / 2;
        const adjustedVertex = Number.isInteger(base) ? vertex : vertex + 1;
        const adjustedBase = (180 - adjustedVertex) / 2;
        return makeDraftParts(unit, index, {
          skillFamily: unit.skillFamilies[1],
          prompt: `Tam giác cân có góc ở đỉnh ${adjustedVertex}°. Mỗi góc ở đáy bằng bao nhiêu?`,
          answer: String(adjustedBase),
          distractors: [String(180 - adjustedVertex), String(adjustedVertex), String(90 - adjustedVertex / 2)],
          steps: ["Hai góc ở đáy của tam giác cân bằng nhau.", `Tổng hai góc ở đáy là 180° - ${adjustedVertex}° = ${180 - adjustedVertex}°.`, `Chia đôi được ${adjustedBase}°.`],
          feedback: "Sau khi trừ góc ở đỉnh, phải chia phần còn lại đều cho hai góc ở đáy.",
          inputType: "NUMBER_INPUT",
          cognitiveLevel: "REASON",
          parameters: [{ name: "degrees", value: adjustedBase }],
        });
      }
      const side = random.integer(4, 15);
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[2],
        prompt: `Hai tam giác bằng nhau có hai cạnh tương ứng, một cạnh dài ${side} cm. Cạnh tương ứng còn lại dài bao nhiêu?`,
        answer: String(side),
        distractors: [String(side + 1), String(side * 2), String(Math.max(1, side - 1))],
        steps: ["Hai tam giác bằng nhau có các cạnh tương ứng bằng nhau.", `Cạnh đã biết dài ${side} cm.`, `Cạnh tương ứng cũng dài ${side} cm.`],
        feedback: "Chỉ so sánh đúng cặp cạnh tương ứng của hai tam giác bằng nhau.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "UNDERSTAND",
        parameters: [{ name: "width", value: side }, { name: "height", value: side }],
      });
    }

    const [a, b, c] = triples[random.integer(0, triples.length - 1)];
    if (unit.grade === 8) {
      if (group === 0) {
        return makeDraftParts(unit, index, {
          skillFamily: unit.skillFamilies[0],
          prompt: `Trong tam giác vuông có các cạnh ${a}, ${b}, ${c}, cạnh nào là cạnh huyền?`,
          answer: String(c),
          distractors: [String(a), String(b), String(a + b)],
          steps: ["Cạnh huyền đối diện góc vuông.", "Cạnh huyền là cạnh dài nhất.", `Trong ba số đã cho, ${c} lớn nhất.`],
          feedback: "Xác định cạnh huyền trước khi viết hệ thức Pythagore.",
          inputType: "NUMBER_INPUT",
          cognitiveLevel: "UNDERSTAND",
          parameters: [{ name: "shape", value: "TRIANGLE" }, { name: "base", value: a }, { name: "height", value: b }],
        });
      }
      const answer = group === 1 ? c : b;
      const prompt = group === 1
        ? `Tam giác vuông có hai cạnh góc vuông ${a} cm và ${b} cm. Tìm cạnh huyền.`
        : `Tam giác vuông có cạnh huyền ${c} cm và một cạnh góc vuông ${a} cm. Tìm cạnh còn lại.`;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[group],
        prompt,
        answer: String(answer),
        distractors: [String(a + b), String(Math.abs(b - a)), String(answer + 1)],
        steps: group === 1
          ? [`Lập c² = ${a}² + ${b}².`, `Tính c² = ${a * a + b * b}.`, `Lấy căn dương được c = ${c} cm.`]
          : [`Lập b² = ${c}² - ${a}².`, `Tính b² = ${c * c - a * a}.`, `Lấy căn dương được b = ${b} cm.`],
        feedback: "Bình phương cạnh huyền bằng tổng bình phương hai cạnh góc vuông.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: group === 1 ? "APPLY" : "REASON",
        parameters: [{ name: "shape", value: "TRIANGLE" }, { name: "base", value: a }, { name: "height", value: b }],
      });
    }

    const ratio =
      group === 0 ? `${a}/${c}` : group === 1 ? `${b}/${c}` : `${a}/${b}`;
    const name = group === 0 ? "sin" : group === 1 ? "cos" : "tan";
    const relationship =
      group === 0 ? "đối/huyền" : group === 1 ? "kề/huyền" : "đối/kề";
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[group],
      prompt: `Với góc A, cạnh đối dài ${a}, cạnh kề dài ${b}, cạnh huyền dài ${c}. ${name} A bằng bao nhiêu?`,
      answer: ratio,
      distractors: [`${c}/${a}`, `${b}/${a}`, `${a}/${a + b}`],
      steps: [`${name} dùng tỉ số ${relationship}.`, `Thay các độ dài tương ứng.`, `Nhận ${name} A = ${ratio}.`],
      feedback: "Tên cạnh đối và cạnh kề phụ thuộc vào góc đang xét; cạnh huyền luôn đối diện góc vuông.",
      inputType: "TEXT_INPUT",
      cognitiveLevel: group === 2 ? "REASON" : "APPLY",
      parameters: [{ name: "degrees", value: random.integer(25, 65) }],
    });
  });
}

function secondaryMeasurement(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    const baseArea = random.integer(6, 20) * (unit.grade === 8 ? 3 : 1);
    const height = random.integer(3, 10) * (unit.grade === 8 ? 3 : 1);
    const perimeter = random.integer(10, 24);
    if (unit.grade === 7) {
      const answer = group === 1 ? perimeter * height : baseArea * height;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[group],
        prompt: group === 1
          ? `Lăng trụ đứng có chu vi đáy ${perimeter} cm và chiều cao ${height} cm. Tính diện tích xung quanh.`
          : `Lăng trụ đứng có diện tích đáy ${baseArea} cm² và chiều cao ${height} cm. Tính thể tích.`,
        answer: String(answer),
        distractors: [String(answer + height), String(baseArea + height), String(Math.max(1, answer - height))],
        steps: group === 1
          ? ["Dùng Sxq = Pđáy × h.", `Tính ${perimeter} × ${height} = ${answer}.`, "Ghi đơn vị cm²."]
          : ["Dùng V = Sđáy × h.", `Tính ${baseArea} × ${height} = ${answer}.`, "Ghi đơn vị cm³."],
        feedback: group === 1 ? "Diện tích xung quanh dùng chu vi đáy, không dùng diện tích đáy." : "Thể tích lăng trụ bằng diện tích đáy nhân chiều cao.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: group === 2 ? "REASON" : "APPLY",
        parameters: [{ name: "width", value: baseArea }, { name: "height", value: height }],
      });
    }
    if (unit.grade === 8) {
      const answer = (baseArea * height) / 3;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[group],
        prompt: `Hình chóp đều có diện tích đáy ${baseArea} cm² và chiều cao ${height} cm. Tính thể tích.`,
        answer: String(answer),
        distractors: [String(baseArea * height), String(answer * 2), String(baseArea + height)],
        steps: ["Dùng V = Sđáy × h ÷ 3.", `Tính ${baseArea} × ${height} ÷ 3.`, `Kết quả là ${answer} cm³.`],
        feedback: "Thể tích hình chóp có hệ số một phần ba; không dùng trung đoạn mặt bên thay chiều cao.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: group === 2 ? "REASON" : "APPLY",
        parameters: [{ name: "width", value: baseArea }, { name: "height", value: height }],
      });
    }
    const radius = random.integer(2, 6);
    const solidHeight = random.integer(3, 9);
    const cylinder = Number((3.14 * radius * radius * solidHeight).toFixed(2));
    const answer = group === 1 ? Number((cylinder / 3).toFixed(2)) : cylinder;
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[group],
      prompt: group === 1
        ? `Hình nón có bán kính ${radius} cm, chiều cao ${solidHeight * 3} cm. Lấy π = 3,14. Tính thể tích.`
        : `Hình trụ có bán kính ${radius} cm, chiều cao ${solidHeight} cm. Lấy π = 3,14. Tính thể tích.`,
      answer: decimal(answer),
      distractors: [decimal(answer * 3), decimal(answer + radius), decimal(Math.max(1, answer - radius))],
      steps: group === 1
        ? ["Dùng V = πr²h ÷ 3.", `Thay r = ${radius}, h = ${solidHeight * 3}, π = 3,14.`, `Kết quả là ${displayDecimal(answer)} cm³.`]
        : ["Dùng V = πr²h.", `Thay r = ${radius}, h = ${solidHeight}, π = 3,14.`, `Kết quả là ${displayDecimal(answer)} cm³.`],
      feedback: "Bình phương bán kính trước và giữ đúng hệ số một phần ba của hình nón.",
      inputType: "NUMBER_INPUT",
      cognitiveLevel: group === 2 ? "REASON" : "APPLY",
      parameters: [{ name: "width", value: radius }, { name: "height", value: solidHeight }],
    });
  });
}

function dataAndProbability(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    const countA = random.integer(2, 9);
    let countB = random.integer(1, 8);
    if (countB === countA) countB = countA === 9 ? 8 : countA + 1;
    const parameters = [{ name: "countA", value: countA }, { name: "countB", value: countB }];
    if (group === 0) {
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `Dữ liệu có Nhóm A: ${countA} quan sát và Nhóm B: ${countB} quan sát. Tổng số quan sát là bao nhiêu?`,
        answer: String(countA + countB),
        distractors: [String(Math.abs(countA - countB)), String(countA), String(countA + countB + 1)],
        steps: ["Mỗi quan sát thuộc đúng một nhóm.", `Cộng ${countA} + ${countB} = ${countA + countB}.`, "Đối chiếu tổng với hai tần số thành phần."],
        feedback: "Tổng số quan sát bằng tổng các tần số.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "UNDERSTAND",
        parameters,
      });
    }
    if (group === 1) {
      const answer = countA > countB ? "Nhóm A" : "Nhóm B";
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[1],
        prompt: "Nhóm nào có tần số lớn hơn?",
        answer,
        distractors: [answer === "Nhóm A" ? "Nhóm B" : "Nhóm A", "Hai nhóm bằng nhau", "Không đủ dữ kiện"],
        steps: [`Nhóm A có ${countA}, Nhóm B có ${countB}.`, `So sánh ${countA} với ${countB}.`, `${answer} có tần số lớn hơn.`],
        feedback: "So sánh tần số sau khi đọc đúng nhãn nhóm.",
        inputType: "TEXT_INPUT",
        cognitiveLevel: "APPLY",
        parameters,
      });
    }
    if (unit.grade === 3) {
      const possible = index % 2 === 0;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[2],
        prompt: possible
          ? "Túi có thẻ đỏ và xanh. Lấy một thẻ đỏ là sự kiện gì?"
          : "Túi chỉ có thẻ đỏ và xanh. Lấy một thẻ vàng là sự kiện gì?",
        answer: possible ? "có thể" : "không thể",
        distractors: possible ? ["không thể", "chắc chắn", "không xác định"] : ["có thể", "chắc chắn", "không xác định"],
        steps: ["Liệt kê các màu có trong túi.", possible ? "Màu đỏ nằm trong các kết quả có thể." : "Màu vàng không nằm trong các kết quả.", `Kết luận sự kiện ${possible ? "có thể" : "không thể"} xảy ra.`],
        feedback: "Mô tả khả năng dựa trên tập kết quả được nêu, không dựa vào cảm giác.",
        inputType: "TEXT_INPUT",
        cognitiveLevel: "REASON",
        parameters,
      });
    }
    const total = countA + countB;
    const divisor = greatestCommonDivisor(countA, total);
    const answer = `${countA / divisor}/${total / divisor}`;
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt: `Trong ${total} lần thử, biến cố A xảy ra ${countA} lần. Tỉ số mô tả tần suất thực nghiệm của A là bao nhiêu?`,
      answer,
      distractors: [`${countB}/${total}`, `${total}/${countA}`, `${countA}/${countB}`],
      steps: [`Tử số là số lần A xảy ra: ${countA}.`, `Mẫu số là tổng số lần thử: ${total}.`, `Rút gọn ${countA}/${total} được ${answer}.`],
      feedback: "Xác suất thực nghiệm dùng tổng số lần thử ở mẫu số.",
      inputType: "TEXT_INPUT",
      cognitiveLevel: "REASON",
      parameters,
    });
  });
}

function rationalNumberOperations(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    const denominator = random.integer(3, 9);
    const left = random.integer(1, denominator - 1);
    const right = random.integer(1, denominator - 1);
    if (group === 0) {
      const numerator = left + right;
      const divisor = greatestCommonDivisor(numerator, denominator);
      const answer = `${numerator / divisor}/${denominator / divisor}`;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `Tính ${left}/${denominator} + ${right}/${denominator}.`,
        answer,
        distractors: [`${left + right}/${denominator * 2}`, `${Math.abs(left - right)}/${denominator}`, `${left * right}/${denominator}`],
        steps: [`Hai phân số cùng mẫu ${denominator}.`, `Cộng tử số: ${left} + ${right} = ${numerator}.`, `Rút gọn được ${answer}.`],
        feedback: "Phân số cùng mẫu được cộng tử và giữ mẫu, sau đó rút gọn.",
        inputType: "TEXT_INPUT",
        cognitiveLevel: "APPLY",
        parameters: [{ name: "leftNumerator", value: left }, { name: "rightNumerator", value: right }, { name: "denominator", value: denominator }],
      });
    }
    if (group === 1) {
      const answerNumerator = left * right;
      const answerDenominator = denominator * (right + 1);
      const divisor = greatestCommonDivisor(answerNumerator, answerDenominator);
      const answer = `${answerNumerator / divisor}/${answerDenominator / divisor}`;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[1],
        prompt: `Tính ${left}/${denominator} × ${right}/${right + 1}.`,
        answer,
        distractors: [`${left + right}/${denominator + right + 1}`, `${left * right}/${denominator + right + 1}`, `${left}/${denominator}`],
        steps: ["Nhân tử với tử, mẫu với mẫu.", `Nhận ${answerNumerator}/${answerDenominator}.`, `Rút gọn được ${answer}.`],
        feedback: "Phép nhân phân số không cần quy đồng; luôn rút gọn kết quả.",
        inputType: "TEXT_INPUT",
        cognitiveLevel: "APPLY",
        parameters: [{ name: "numerator", value: answerNumerator }, { name: "denominator", value: answerDenominator }],
      });
    }
    const whole = random.integer(2, 7);
    const answer = whole * 2 + 1;
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt: `Tính ${whole} + 1/2 × 2 theo đúng thứ tự phép tính.`,
      answer: String(answer),
      distractors: [String((whole + 0.5) * 2), String(whole + 1), String(whole * 2)],
      steps: ["Thực hiện phép nhân trước: 1/2 × 2 = 1.", `Sau đó tính ${whole} + 1.`, `Kết quả là ${answer}.`],
      feedback: "Nhân và chia được thực hiện trước cộng và trừ khi không có ngoặc.",
      inputType: "NUMBER_INPUT",
      cognitiveLevel: "REASON",
      parameters: [{ name: "value", value: whole }],
    });
  });
}

function prealgebraPowers(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    const base = random.integer(2, 5);
    const exponent = random.integer(2, 4);
    const power = base ** exponent;
    if (group === 0) {
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[0],
        prompt: `Tính ${base}^${exponent}.`,
        answer: String(power),
        distractors: [String(base * exponent), String(base + exponent), String(base ** (exponent - 1))],
        steps: [`Viết ${base}^${exponent} là tích của ${exponent} thừa số ${base}.`, `Thực hiện phép nhân lặp.`, `Kết quả là ${power}.`],
        feedback: "Số mũ cho biết số thừa số bằng cơ số, không phải phép nhân cơ số với số mũ.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "UNDERSTAND",
        parameters: [{ name: "value", value: power }],
      });
    }
    if (group === 1) {
      const secondExponent = random.integer(1, 3);
      const answer = exponent + secondExponent;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[1],
        prompt: `Điền số mũ: ${base}^${exponent} × ${base}^${secondExponent} = ${base}^□.`,
        answer: String(answer),
        distractors: [String(exponent * secondExponent), String(Math.abs(exponent - secondExponent)), String(answer + 1)],
        steps: ["Hai luỹ thừa có cùng cơ số.", "Khi nhân, cộng các số mũ.", `${exponent} + ${secondExponent} = ${answer}.`],
        feedback: "Chỉ cộng số mũ khi nhân các luỹ thừa cùng cơ số.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: "APPLY",
        parameters: [{ name: "value", value: answer }],
      });
    }
    const addend = random.integer(2, 10);
    const answer = addend + power;
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[2],
      prompt: `Tính ${addend} + ${base}^${exponent}.`,
      answer: String(answer),
      distractors: [String((addend + base) ** exponent), String(addend + base * exponent), String(power)],
      steps: ["Tính luỹ thừa trước.", `${base}^${exponent} = ${power}.`, `Cộng ${addend} + ${power} = ${answer}.`],
      feedback: "Luỹ thừa được thực hiện trước phép cộng khi không có ngoặc.",
      inputType: "NUMBER_INPUT",
      cognitiveLevel: "REASON",
      parameters: [{ name: "value", value: answer }],
    });
  });
}

function appliedProblemSolving(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const random = createRandom(`${seed}:${unit.slug}`);
  return Array.from({ length: 12 }, (_, index) => {
    const group = Math.floor(index / 4);
    const grade = unit.grade;
    if (grade <= 2) {
      const start = random.integer(5, grade === 1 ? 10 : 20);
      const change = random.integer(1, Math.max(1, start - 1));
      const add = group !== 1;
      const answer = add ? start + change : start - change;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[group],
        prompt: `Có ${start} đồ vật, ${add ? "thêm" : "bớt"} ${change} đồ vật. Có ${add ? "tất cả" : "còn lại"} bao nhiêu đồ vật?`,
        answer: String(answer),
        distractors: [String(add ? start - change : start + change), String(start), String(answer + 1)],
        steps: [`Từ "${add ? "thêm" : "bớt"}" cho biết dùng phép ${add ? "cộng" : "trừ"}.`, `Tính ${start} ${add ? "+" : "-"} ${change} = ${answer}.`, `Trả lời ${answer} đồ vật.`],
        feedback: "Chọn phép tính từ quan hệ trong tình huống rồi viết câu trả lời đầy đủ.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: group === 2 ? "REASON" : "APPLY",
        parameters: [
          { name: "start", value: start },
          { name: "change", value: change },
          { name: "operation", value: add ? "ADD" : "SUBTRACT" },
        ],
      });
    }
    if (grade <= 7) {
      const groups = random.integer(2, 8);
      const each = random.integer(3, 12);
      const used = random.integer(1, Math.max(1, groups * each - 1));
      const answer = group === 0 ? groups * each : groups * each - used;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[group],
        prompt: group === 0
          ? `Có ${groups} nhóm, mỗi nhóm ${each} sản phẩm. Có tất cả bao nhiêu sản phẩm?`
          : `Có ${groups} nhóm, mỗi nhóm ${each} sản phẩm; đã dùng ${used}. Còn bao nhiêu sản phẩm?`,
        answer: String(answer),
        distractors: [String(groups + each), String(groups * each + used), String(Math.max(0, answer - 1))],
        steps: group === 0
          ? ["Tổng bằng số nhóm nhân số mỗi nhóm.", `Tính ${groups} × ${each} = ${answer}.`, "Ghi câu trả lời theo đơn vị sản phẩm."]
          : [`Tính tổng ban đầu ${groups} × ${each} = ${groups * each}.`, `Trừ số đã dùng: ${groups * each} - ${used} = ${answer}.`, "Thay lại để kiểm tra phần còn và phần đã dùng."],
        feedback: "Mô hình hóa toàn bộ trước, sau đó mới thực hiện bước thay đổi nếu có.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: group === 2 ? "REASON" : "APPLY",
        parameters: [{ name: "leftBase", value: groups }, { name: "rightBase", value: each }, { name: "scale", value: 2 }],
      });
    }
    if (grade === 8) {
      const coefficient = random.integer(2, 6);
      const solution = random.integer(2, 12);
      const constant = random.integer(1, 9);
      const result = coefficient * solution + constant;
      return makeDraftParts(unit, index, {
        skillFamily: unit.skillFamilies[group],
        prompt: `Một đại lượng x thỏa ${coefficient}x + ${constant} = ${result}. Tìm x và kiểm tra trong mô hình.`,
        answer: String(solution),
        distractors: [String(result - constant), String(solution + constant), String(Math.max(0, solution - 1))],
        steps: [`Trừ ${constant} ở hai vế: ${coefficient}x = ${result - constant}.`, `Chia hai vế cho ${coefficient}: x = ${solution}.`, `Kiểm tra ${coefficient} × ${solution} + ${constant} = ${result}.`],
        feedback: "Mỗi biến đổi phương trình phải giữ hai vế tương đương và kết quả cần được thay lại.",
        inputType: "NUMBER_INPUT",
        cognitiveLevel: group === 2 ? "REASON" : "APPLY",
        parameters: [{ name: "coefficient", value: coefficient }, { name: "constant", value: constant }, { name: "solution", value: solution }],
      });
    }
    const left = random.integer(3, 10);
    const right = random.integer(1, left - 1);
    const sum = left + right;
    const difference = left - right;
    const askLeft = index % 2 === 0;
    const answer = askLeft ? left : right;
    return makeDraftParts(unit, index, {
      skillFamily: unit.skillFamilies[group],
      prompt: `Hai đại lượng có tổng ${sum} và hiệu ${difference}. Tìm ${askLeft ? "đại lượng lớn" : "đại lượng nhỏ"}.`,
      answer: String(answer),
      distractors: [String(sum - difference), String(askLeft ? right : left), String(answer + 1)],
      steps: [`Lập x + y = ${sum} và x - y = ${difference}.`, `Cộng hai phương trình: 2x = ${sum + difference}, nên x = ${left}.`, `Thế lại được y = ${right}; chọn ${askLeft ? "x" : "y"} = ${answer}.`],
      feedback: "Nghiệm của hệ phải đồng thời thỏa cả quan hệ tổng và quan hệ hiệu.",
      inputType: "NUMBER_INPUT",
      cognitiveLevel: "REASON",
      parameters: [{ name: "coefficient", value: 1 }, { name: "constant", value: right }, { name: "solution", value: answer }],
    });
  });
}

function p0OutcomeCompletion(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  return generateP0QuestionSpecs(unit, seed).map((input, index) =>
    makeDraftParts(unit, index, input),
  );
}

function grade3OutcomeCompletion(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  return generateGrade3QuestionSpecs(unit, seed).map((input, index) =>
    makeDraftParts(unit, index, input),
  );
}

function grade4OutcomeCompletion(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  return generateGrade4QuestionSpecs(unit, seed).map((input, index) =>
    makeDraftParts(unit, index, input),
  );
}

function grade5OutcomeCompletion(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  return generateGrade5QuestionSpecs(unit, seed).map((input, index) =>
    makeDraftParts(unit, index, input),
  );
}

function grade6OutcomeCompletion(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  return generateGrade6QuestionSpecs(unit, seed).map((input, index) =>
    makeDraftParts(unit, index, input),
  );
}

function grade7OutcomeCompletion(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  const generator = unit.officialOutcomeIds.every((outcomeId) =>
    grade7CompletionTargetOutcomeIds.includes(outcomeId),
  )
    ? generateGrade7QuestionSpecs
    : generateGrade7RemainingQuestionSpecs;
  return generator(unit, seed).map((input, index) =>
    makeDraftParts(unit, index, input),
  );
}

function grade8OutcomeCompletion(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  return generateGrade8QuestionSpecs(unit, seed).map((input, index) =>
    makeDraftParts(unit, index, input),
  );
}

function grade9OutcomeCompletion(
  unit: CurriculumUnit,
  seed: string,
): readonly DraftParts[] {
  return generateGrade9QuestionSpecs(unit, seed).map((input, index) =>
    makeDraftParts(unit, index, input),
  );
}

const generators: Readonly<
  Record<
    CurriculumUnit["kind"],
    (unit: CurriculumUnit, seed: string) => readonly DraftParts[]
  >
> = {
  WHOLE_NUMBERS_TO_10: wholeNumbersTo10,
  GRADE1_NUMBER_OPERATIONS_TO_100: grade1NumberOperationsTo100,
  PLACE_VALUE_TO_1000: placeValueTo1000,
  UNIT_FRACTIONS: unitFractions,
  FRACTION_OPERATIONS: fractionOperations,
  DECIMAL_OPERATIONS: decimalOperations,
  INTEGER_OPERATIONS: integerOperations,
  MULTIPLICATION_DIVISION: multiplicationDivision,
  WHOLE_NUMBER_OPERATIONS: wholeNumberOperations,
  RATIO_AND_PROPORTION: ratioAndProportion,
  LINEAR_EQUATIONS: linearEquations,
  LINEAR_SYSTEMS: linearSystems,
  LINEAR_FUNCTIONS: linearFunctions,
  QUADRATIC_FUNCTIONS: quadraticFunctions,
  GEOMETRY_PRACTICE: geometryPractice,
  MEASUREMENT_PRACTICE: measurementPractice,
  ANGLE_PRACTICE: anglePractice,
  AREA_MEASUREMENT_PRACTICE: areaMeasurementPractice,
  GRADE2_DATA_CHANCE: grade2DataChance,
  SECONDARY_GEOMETRY: secondaryGeometry,
  SECONDARY_MEASUREMENT: secondaryMeasurement,
  DATA_AND_PROBABILITY: dataAndProbability,
  RATIONAL_NUMBER_OPERATIONS: rationalNumberOperations,
  PREALGEBRA_POWERS: prealgebraPowers,
  P0_OUTCOME_COMPLETION: p0OutcomeCompletion,
  P1_OUTCOME_COMPLETION: p0OutcomeCompletion,
  GRADE3_OUTCOME_COMPLETION: grade3OutcomeCompletion,
  GRADE4_OUTCOME_COMPLETION: grade4OutcomeCompletion,
  GRADE5_OUTCOME_COMPLETION: grade5OutcomeCompletion,
  GRADE6_OUTCOME_COMPLETION: grade6OutcomeCompletion,
  GRADE7_OUTCOME_COMPLETION: grade7OutcomeCompletion,
  GRADE8_OUTCOME_COMPLETION: grade8OutcomeCompletion,
  GRADE9_OUTCOME_COMPLETION: grade9OutcomeCompletion,
  APPLIED_PROBLEM_SOLVING: appliedProblemSolving,
};

export function generatePreviewUnit(
  unitSlug: string,
  seed = "plave-curriculum-preview-v1",
): PreviewUnitDraft {
  const unit = getCurriculumUnit(unitSlug);
  if (!unit) {
    throw new Error("Unknown curriculum preview unit.");
  }
  if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(seed)) {
    throw new Error("Seed must be a short lowercase safe identifier.");
  }
  const parts = generators[unit.kind](unit, seed);
  return {
    seed,
    unit,
    questions: parts.map((part) => part.question),
    solutions: parts.map((part) => part.solution),
    audits: parts.map((part) => part.audit),
    generationStatus: "DRAFT_GENERATED",
  };
}

export function normalizePreviewAnswer(answer: string) {
  return answer
    .trim()
    .replace(",", ".")
    .replace(/\s+/g, "")
    .toLocaleLowerCase("vi");
}

export function checkPreviewAnswer(
  unitSlug: string,
  questionCode: string,
  answer: string,
) {
  const draft = generatePreviewUnit(unitSlug);
  const solution = draft.solutions.find(
    (candidate) => candidate.questionCode === questionCode,
  );
  if (!solution) return null;
  return {
    correct:
      normalizePreviewAnswer(answer) ===
      normalizePreviewAnswer(solution.correctAnswer),
    correctAnswer: solution.correctAnswer,
    steps: solution.steps,
    feedback: solution.feedback,
  };
}
