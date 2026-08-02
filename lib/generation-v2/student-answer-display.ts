import type {
  StudentGeneratorV2Question,
} from "../curriculum-runtime/contracts.ts";

export function formatGeneratorV2StudentCorrectAnswer(
  question: StudentGeneratorV2Question,
  rawAnswer: string,
  publicOptions: readonly { key: string; label: string }[] | null,
) {
  const interaction = question.interaction;
  const publicOption = publicOptions?.find(
    (option) => option.key === rawAnswer,
  );
  if (publicOption) return publicOption.label;
  if (
    interaction.type === "SINGLE_CHOICE" ||
    interaction.type === "CONSTRUCTION_OR_VISUAL_SELECTION"
  ) {
    return interaction.options?.find((option) => option.id === rawAnswer)?.label ??
      rawAnswer;
  }
  try {
    const parsed = JSON.parse(rawAnswer) as unknown;
    if (
      interaction.type === "FRACTION_INPUT" &&
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      "numerator" in parsed &&
      "denominator" in parsed &&
      Number.isFinite(Number(parsed.numerator)) &&
      Number.isFinite(Number(parsed.denominator))
    ) {
      return `${Number(parsed.numerator)}/${Number(parsed.denominator)}`;
    }
    if (
      Array.isArray(parsed) &&
      parsed.every(
        (pair) =>
          pair &&
          typeof pair === "object" &&
          "leftId" in pair &&
          "rightId" in pair &&
          typeof pair.leftId === "string" &&
          typeof pair.rightId === "string",
      )
    ) {
      return parsed
        .map((pair) => `${pair.leftId} = ${pair.rightId}`)
        .join("; ");
    }
    if (
      (interaction.type === "ORDERING" ||
        interaction.type === "MULTI_SELECT") &&
      Array.isArray(parsed)
    ) {
      const labels = parsed.map((id) =>
        interaction.options?.find((option) => option.id === id)?.label,
      );
      if (labels.every((label): label is string => Boolean(label))) {
        return labels.join(interaction.type === "ORDERING" ? " → " : ", ");
      }
      if (parsed.every((item) => typeof item === "string")) {
        return parsed.join(
          interaction.type === "ORDERING" ? " → " : ", ",
        );
      }
    }
  } catch {
    // Scalar numeric, decimal and symbolic answers are already display-ready.
  }
  return rawAnswer;
}
