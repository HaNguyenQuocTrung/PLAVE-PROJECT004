import type {
  CurriculumUnit,
  PreviewAudit,
  VisualRequirement,
} from "./types.ts";
import {
  buildCompletionArtifacts,
  generateCompletionQuestionSpecs,
  type CompletionOutcomeSpec,
  type CompletionQuestionCore,
  type CompletionRandom,
  type CompletionUnitGroup,
} from "./completion-framework.ts";

const E = (
  id: string,
  title: string,
  concept: string,
  why: string,
  method: string,
  error: string,
  prompt: string,
  steps: readonly [string, string, string],
  answer: string,
): CompletionOutcomeSpec => ({
  id,
  title,
  concept,
  why,
  method,
  error,
  example: { prompt, steps, answer },
});

const specs = [
  E(
    "MOET2018-G7-NAA-P055-001",
    "Biểu diễn số hữu tỉ trên trục số",
    "Số hữu tỉ a/b với b khác 0 được đặt tại điểm có tọa độ a/b; chia mỗi đơn vị thành |b| phần bằng nhau rồi đếm theo dấu.",
    "Các phần chia bằng nhau biến tỉ số a/b thành một khoảng cách có hướng tính từ 0.",
    "Chuẩn hóa mẫu dương, xác định hai số nguyên kề, chia đơn vị theo mẫu và đếm tử số sang phải hoặc trái.",
    "Không đặt số âm bên phải 0 và không chia các đoạn đơn vị thành các phần không bằng nhau.",
    "Đặt −3/4 trên trục số.",
    [
      "−3/4 nằm giữa −1 và 0.",
      "Chia đoạn từ −1 đến 0 thành bốn phần bằng nhau.",
      "Điểm cần tìm cách 0 ba phần về bên trái.",
    ],
    "Tọa độ −3/4.",
  ),
  E(
    "MOET2018-G7-NAA-P055-002",
    "Số đối của số hữu tỉ",
    "Số đối của x là −x; hai số đối có tổng bằng 0 và nằm đối xứng qua 0 trên trục số.",
    "Phép cộng x+(−x)=0 xác nhận duy nhất số đối và giữ nguyên khoảng cách tới gốc.",
    "Chuẩn hóa phân số, đổi đúng một dấu rồi kiểm tra tổng bằng 0.",
    "Không đảo tử và mẫu; đó là nghịch đảo, không phải số đối.",
    "Tìm số đối của −5/7.",
    [
      "Giữ tử số và mẫu số.",
      "Đổi dấu âm thành dương.",
      "Kiểm tra −5/7+5/7=0.",
    ],
    "5/7.",
  ),
  E(
    "MOET2018-G7-NAA-P055-003",
    "Nhận biết và nêu ví dụ số hữu tỉ",
    "Số hữu tỉ là số viết được dưới dạng a/b với a, b là số nguyên và b khác 0; số nguyên và số thập phân hữu hạn đều là số hữu tỉ.",
    "Dạng phân số cung cấp một tiêu chuẩn kiểm chứng thay vì chỉ dựa vào cách viết bề ngoài.",
    "Biến đổi số đã cho về phân số có mẫu khác 0 hoặc nêu trực tiếp tử và mẫu nguyên.",
    "Không dùng mẫu 0 và không kết luận một số không hữu tỉ chỉ vì nó viết dưới dạng thập phân.",
    "Vì sao −1,25 là số hữu tỉ?",
    [
      "−1,25=−125/100.",
      "Rút gọn được −5/4.",
      "Tử, mẫu nguyên và mẫu 4 khác 0.",
    ],
    "Vì −1,25=−5/4.",
  ),
  E(
    "MOET2018-G7-NAA-P055-004",
    "Tập hợp các số hữu tỉ",
    "Tập hợp Q gồm mọi số a/b với a, b thuộc Z và b khác 0; N là tập con của Z và Z là tập con của Q.",
    "Quan hệ bao hàm giải thích vì sao 0, số tự nhiên và số nguyên đều là số hữu tỉ.",
    "Kiểm tra dạng a/b, điều kiện mẫu rồi dùng kí hiệu thuộc hoặc không thuộc Q.",
    "Không coi Q chỉ gồm phân số không nguyên hoặc cho phép biểu thức có mẫu bằng 0.",
    "0, −3 và 7/5 có thuộc Q không?",
    [
      "0=0/1.",
      "−3=−3/1.",
      "7/5 có mẫu 5 khác 0.",
    ],
    "Cả ba đều thuộc Q.",
  ),
] as const;

const ids = specs.map((spec) => spec.id);
const groups: readonly CompletionUnitGroup[] = [
  {
    slug: "grade-7-rational-number-foundations-p1",
    title: "Số hữu tỉ, số đối và trục số",
    code: "G7-P1-NAA-A",
    domain: "NUMBERS_AND_OPERATIONS",
    visual: "NUMBER_LINE",
    prerequisiteSlugs: ["grade-6-signed-fraction-representation-p1"],
    outcomeIds: ids,
  },
] as const;

const artifacts = buildCompletionArtifacts({
  grade: 7,
  kind: "GRADE7_OUTCOME_COMPLETION",
  specs,
  groups,
  restrictions: [
    "Mẫu của phân số luôn khác 0 và được chuẩn hóa dương.",
    "Trục số có gốc, chiều dương và các khoảng chia bằng nhau.",
    "Phân biệt số đối với nghịch đảo và kiểm tra kết quả bằng tổng bằng 0.",
  ],
});

export const grade7CompletionOutcomes = artifacts.outcomes;
export const grade7CompletionUnitSeeds = artifacts.unitSeeds;
export const grade7CompletionTargetOutcomeIds = ids;

const p = (name: string, value: string | number) => ({ name, value });
const t = (
  prompt: string,
  answer: string,
  distractors: readonly [string, string, string],
  steps: readonly string[],
  feedback: string,
  parameters: PreviewAudit["parameters"],
  visualRequirement?: VisualRequirement,
): CompletionQuestionCore => ({
  prompt,
  answer,
  distractors,
  steps,
  feedback,
  inputType: "TEXT_INPUT",
  parameters,
  visualRequirement,
});

function scenario(
  id: string,
  occurrence: number,
  random: CompletionRandom,
): CompletionQuestionCore {
  const index = ids.indexOf(id);
  switch (index) {
    case 0: {
      const denominator = [4, 5, 6][occurrence % 3];
      const numerator = -random.integer(1, denominator - 1);
      return t(
        `Điểm biểu diễn ${numerator}/${denominator} nằm ở đâu so với 0?`,
        `bên trái 0, cách 0 ${Math.abs(numerator)}/${denominator} đơn vị`,
        [
          `bên phải 0, cách 0 ${Math.abs(numerator)}/${denominator} đơn vị`,
          "tại 0",
          `bên trái 0, cách 0 ${denominator}/${Math.abs(numerator)} đơn vị`,
        ],
        [
          "Mẫu dương cho số phần bằng nhau của một đơn vị.",
          "Tử âm xác định chiều về bên trái.",
          "Khoảng cách tới 0 là giá trị tuyệt đối của phân số.",
        ],
        "Lỗi biểu diễn thường do đặt sai phía hoặc đảo tử và mẫu.",
        [p("numerator", numerator), p("denominator", denominator)],
        "NUMBER_LINE",
      );
    }
    case 1: {
      const denominator = random.integer(3, 9);
      const numerator = -random.integer(1, denominator - 1);
      return t(
        `Số đối của ${numerator}/${denominator} là gì?`,
        `${-numerator}/${denominator}`,
        [
          `${denominator}/${-numerator}`,
          `${numerator}/${denominator}`,
          "0",
        ],
        [
          "Giữ độ lớn của phân số.",
          "Đổi đúng một dấu.",
          "Cộng hai số để kiểm tra tổng bằng 0.",
        ],
        "Không đảo tử và mẫu khi tìm số đối.",
        [p("numerator", numerator), p("denominator", denominator)],
        "NUMBER_LINE",
      );
    }
    case 2: {
      const denominator = random.integer(2, 8);
      const numerator = -random.integer(1, 12);
      return t(
        `${numerator}/${denominator} có phải là số hữu tỉ không?`,
        "có",
        ["không", "chỉ khi tử dương", "chỉ khi phân số nhỏ hơn 1"],
        [
          "Tử và mẫu đều là số nguyên.",
          `Mẫu ${denominator} khác 0.`,
          "Do đó số đã cho có dạng a/b hợp lệ.",
        ],
        "Dấu âm không làm mất tính hữu tỉ; điều kiện quyết định là mẫu khác 0.",
        [p("numerator", numerator), p("denominator", denominator)],
      );
    }
    case 3: {
      const integer = random.integer(-8, 8);
      return t(
        `${integer} có thuộc tập Q không?`,
        "có",
        ["không", "chỉ thuộc Z", "chỉ thuộc Q khi số dương"],
        [
          `Viết ${integer}=${integer}/1.`,
          "Tử và mẫu là số nguyên, mẫu 1 khác 0.",
          "Kết luận số đó thuộc Q.",
        ],
        "Mọi số nguyên đều là số hữu tỉ vì có thể dùng mẫu 1.",
        [p("integer", integer), p("denominator", 1)],
      );
    }
    default:
      throw new Error(`No Grade 7 semantic strategy for ${id}.`);
  }
}

export function generateGrade7QuestionSpecs(
  unit: CurriculumUnit,
  seed: string,
) {
  return generateCompletionQuestionSpecs({
    unit,
    seed,
    kind: "GRADE7_OUTCOME_COMPLETION",
    scenario,
  });
}
