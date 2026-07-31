import type {
  CurriculumDomain,
  CurriculumOutcome,
  CurriculumUnit,
  PreviewAnswerType,
  PreviewAudit,
  PreviewCognitiveLevel,
  TheorySection,
  VerticalUnitKind,
  VisualRequirement,
  WorkedExample,
} from "./types.ts";

export type CompletionQuestionCore = Readonly<{
  prompt: string;
  answer: string;
  distractors: readonly [string, string, string];
  steps: readonly string[];
  feedback: string;
  inputType: Extract<PreviewAnswerType, "NUMBER_INPUT" | "TEXT_INPUT">;
  parameters: PreviewAudit["parameters"];
  visualRequirement?: VisualRequirement;
}>;

export type CompletionOutcomeSpec = Readonly<{
  id: string;
  title: string;
  concept: string;
  why: string;
  method: string;
  error: string;
  example: Readonly<{
    prompt: string;
    steps: readonly [string, string, string];
    answer: string;
  }>;
}>;

export type CompletionUnitGroup = Readonly<{
  slug: string;
  title: string;
  code: string;
  domain: CurriculumDomain;
  visual: VisualRequirement;
  prerequisiteSlugs: readonly string[];
  outcomeIds: readonly string[];
}>;

export type CompletionUnitSeed = Readonly<{
  slug: string;
  title: string;
  grade: CurriculumUnit["grade"];
  domain: CurriculumDomain;
  outcomeId: string;
  officialOutcomeIds: readonly string[];
  skills: readonly [string, string, string, ...string[]];
  prerequisiteSlugs: readonly string[];
  restrictions: readonly string[];
  visual: VisualRequirement;
  answers: readonly PreviewAnswerType[];
  levels: readonly PreviewCognitiveLevel[];
  misconceptions: readonly string[];
  kind: VerticalUnitKind;
  theory: readonly TheorySection[];
  examples: readonly WorkedExample[];
}>;

export type CompletionQuestionSpec = Readonly<{
  skillFamily: string;
  prompt: string;
  answer: string;
  distractors: readonly [string, string, string];
  steps: readonly string[];
  feedback: string;
  inputType: Extract<PreviewAnswerType, "NUMBER_INPUT" | "TEXT_INPUT">;
  cognitiveLevel: PreviewCognitiveLevel;
  parameters: PreviewAudit["parameters"];
  primaryOfficialOutcomeId: string;
  supportingOfficialOutcomeIds: readonly string[];
  evidenceForm: NonNullable<PreviewAudit["evidenceForm"]>;
  visualRequirement?: VisualRequirement;
}>;

export type CompletionRandom = Readonly<{
  integer(minimum: number, maximum: number): number;
}>;

function skill(outcomeId: string) {
  return outcomeId.replace("MOET2018-", "").replaceAll("-", "_");
}

export function buildCompletionArtifacts(input: Readonly<{
  grade: CurriculumUnit["grade"];
  kind: VerticalUnitKind;
  specs: readonly CompletionOutcomeSpec[];
  groups: readonly CompletionUnitGroup[];
  restrictions: readonly string[];
}>) {
  const specById = new Map(input.specs.map((spec) => [spec.id, spec]));
  const outcomes: readonly CurriculumOutcome[] = input.groups.map((group) => ({
    id: `PLAVE-MOET2018-${group.code}`,
    grade: input.grade,
    domain: group.domain,
    summary: group.title,
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  }));
  const unitSeeds: readonly CompletionUnitSeed[] = input.groups.map((group) => {
    const outcomeSpecs = group.outcomeIds.map((id) => {
      const spec = specById.get(id);
      if (!spec) throw new Error(`Missing completion teaching spec: ${id}.`);
      return spec;
    });
    const theory: TheorySection[] = outcomeSpecs.map((spec, index) => ({
      id: `${group.slug}-s${index + 1}`,
      title: spec.title,
      explanation: [
        spec.concept,
        `Vì sao: ${spec.why}`,
        `Cách thực hiện: ${spec.method}`,
        `Lỗi cần tránh: ${spec.error}`,
      ],
      visualDescription: `${group.title}: mô hình trực tiếp cho ${spec.title.toLocaleLowerCase("vi")}.`,
      officialOutcomeIds: [spec.id],
    }));
    if (theory.length === 3) {
      const domainCheck =
        group.domain === "GEOMETRY"
          ? "Nêu giả thiết, dùng đúng định nghĩa hoặc định lí, rồi kết luận; hình vẽ chỉ minh hoạ và không thay thế lập luận."
          : group.domain === "STATISTICS_AND_PROBABILITY"
            ? "Kiểm tra tổng tần số, thang biểu đồ, không gian mẫu và giới hạn xác suất trước khi kết luận."
            : group.domain === "APPLIED_PROBLEM_SOLVING"
              ? "Xác định biến, đơn vị và giả định; giải mô hình rồi diễn giải, kiểm tra tính hợp lí trong ngữ cảnh."
              : "Kiểm tra miền xác định, thứ tự phép tính và thay kết quả trở lại dữ kiện ban đầu.";
      theory.push({
        id: `${group.slug}-s4`,
        title: `Kiểm chứng trong ${group.title.toLocaleLowerCase("vi")}`,
        explanation: [
          domainCheck,
          "Phân loại lỗi thành khái niệm, tính toán, biểu diễn, lập luận hoặc đơn vị để sửa đúng nguyên nhân.",
        ],
        visualDescription: `${group.title}: bảng kiểm điều kiện và tính hợp lí.`,
        officialOutcomeIds: group.outcomeIds,
      });
    }
    return {
      slug: group.slug,
      title: group.title,
      grade: input.grade,
      domain: group.domain,
      outcomeId: `PLAVE-MOET2018-${group.code}`,
      officialOutcomeIds: group.outcomeIds,
      skills: group.outcomeIds.map(skill) as [
        string,
        string,
        string,
        ...string[],
      ],
      prerequisiteSlugs: group.prerequisiteSlugs,
      restrictions: input.restrictions,
      visual: group.visual,
      answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"],
      levels: ["UNDERSTAND", "APPLY", "REASON"],
      misconceptions: outcomeSpecs.map((spec) =>
        spec.error
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/gu, "")
          .replace(/[^\p{L}\p{N}]+/gu, "_")
          .toUpperCase()
          .slice(0, 64),
      ),
      kind: input.kind,
      theory,
      examples: outcomeSpecs.map((spec, index) => ({
        id: `${group.slug}-e${index + 1}`,
        title: `Ví dụ: ${spec.title}`,
        prompt: spec.example.prompt,
        steps: spec.example.steps,
        answer: spec.example.answer,
        visualDescription: `${group.title}: dữ kiện và phép kiểm tra cho ${spec.title.toLocaleLowerCase("vi")}.`,
        officialOutcomeIds: [spec.id],
      })),
    };
  });
  return { outcomes, unitSeeds };
}

function seedToState(seed: string) {
  let state = 2166136261;
  for (const character of seed) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return state >>> 0;
}

export function completionRandom(seed: string): CompletionRandom {
  let state = seedToState(seed) || 1;
  return {
    integer(minimum: number, maximum: number) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (
        minimum +
        Math.floor(
          ((state >>> 0) / 4_294_967_296) * (maximum - minimum + 1),
        )
      );
    },
  };
}

export function numberDistractors(answer: number): [string, string, string] {
  const delta = Math.max(1, Math.round(Math.abs(answer) * 0.1));
  return [
    String(answer + delta),
    String(answer - delta),
    String(answer + delta + 1),
  ];
}

function wrapQuestion(
  unit: CurriculumUnit,
  outcomeId: string,
  occurrence: number,
  core: CompletionQuestionCore,
): CompletionQuestionSpec {
  const form =
    occurrence % 4 === 0
      ? "RECOGNIZE_UNDERSTAND"
      : occurrence % 4 === 1
        ? "PERFORM"
        : occurrence % 4 === 2
          ? "ERROR_ANALYSIS"
          : "APPLY";
  const category =
    form === "ERROR_ANALYSIS"
      ? "Lỗi biểu diễn hoặc lập luận"
      : unit.domain === "MEASUREMENT"
        ? "Lỗi khái niệm hoặc đơn vị"
        : form === "PERFORM"
          ? "Lỗi tính toán"
          : "Lỗi khái niệm";
  return {
    ...core,
    skillFamily: skill(outcomeId),
    primaryOfficialOutcomeId: outcomeId,
    supportingOfficialOutcomeIds: [],
    evidenceForm: form,
    cognitiveLevel:
      occurrence % 3 === 0
        ? "UNDERSTAND"
        : occurrence % 3 === 1
          ? "APPLY"
          : "REASON",
    prompt:
      form === "ERROR_ANALYSIS"
        ? `Một học sinh chọn “${core.distractors[0]}”. ${core.prompt} Hãy sửa lựa chọn và chỉ ra điều kiện bị vi phạm.`
        : form === "APPLY"
          ? `Vận dụng trong tình huống mới: ${core.prompt}`
          : form === "PERFORM"
            ? `Thực hiện theo quy trình đã học: ${core.prompt}`
            : core.prompt,
    steps:
      form === "ERROR_ANALYSIS"
        ? [
            ...core.steps,
            `Loại “${core.distractors[0]}” vì không thỏa điều kiện của bài.`,
          ]
        : core.steps,
    feedback: `${category}: ${core.feedback}`,
  };
}

export function generateCompletionQuestionSpecs(input: Readonly<{
  unit: CurriculumUnit;
  seed: string;
  kind: VerticalUnitKind;
  scenario(
    outcomeId: string,
    occurrence: number,
    random: CompletionRandom,
  ): CompletionQuestionCore;
}>): readonly CompletionQuestionSpec[] {
  if (input.unit.kind !== input.kind) {
    throw new Error(`${input.kind} generator received another unit kind.`);
  }
  if (12 % input.unit.officialOutcomeIds.length !== 0) {
    throw new Error(`${input.unit.slug} cannot distribute evidence evenly.`);
  }
  const count = 12 / input.unit.officialOutcomeIds.length;
  const random = completionRandom(`${input.seed}:${input.unit.slug}`);
  return input.unit.officialOutcomeIds.flatMap((outcomeId) =>
    Array.from({ length: count }, (_, occurrence) =>
      wrapQuestion(
        input.unit,
        outcomeId,
        occurrence,
        input.scenario(outcomeId, occurrence, random),
      ),
    ),
  );
}
