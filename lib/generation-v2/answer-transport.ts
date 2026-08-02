import type {
  CanonicalResponse,
  ProductInteractionContract,
} from "./types.ts";

const legacyChoiceKeys = ["A", "B", "C", "D"] as const;

/**
 * Convert a public V2 response into 0040/0041's immutable text transport.
 *
 * This deliberately runs before the request is sent. An HTTP retry therefore
 * carries the exact same database payload even after the attempt has advanced
 * to its next question.
 */
export function serializeGeneratorV2DatabaseAnswer(
  interaction: ProductInteractionContract,
  response: CanonicalResponse,
) {
  if (
    (interaction.type === "SINGLE_CHOICE" ||
      interaction.type === "CONSTRUCTION_OR_VISUAL_SELECTION") &&
    interaction.options?.length === 4
  ) {
    if (
      typeof response === "string" &&
      legacyChoiceKeys.includes(response as (typeof legacyChoiceKeys)[number])
    ) {
      return response;
    }
    const index = interaction.options?.findIndex(
      (option) => option.id === String(response),
    ) ?? -1;
    return legacyChoiceKeys[index] ?? null;
  }
  if (typeof response === "string" || typeof response === "number") {
    return String(response);
  }
  return JSON.stringify(response);
}

export function displayGeneratorV2DatabaseAnswer(
  interaction: ProductInteractionContract,
  stored: string,
) {
  if (
    (interaction.type === "SINGLE_CHOICE" ||
      interaction.type === "CONSTRUCTION_OR_VISUAL_SELECTION") &&
    interaction.options?.length === 4 &&
    /^[A-D]$/u.test(stored)
  ) {
    return interaction.options?.[stored.charCodeAt(0) - 65]?.label ?? stored;
  }
  try {
    const parsed = JSON.parse(stored) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      "numerator" in parsed &&
      "denominator" in parsed
    ) {
      const fraction = parsed as { numerator: unknown; denominator: unknown };
      return `${String(fraction.numerator)}/${String(fraction.denominator)}`;
    }
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === "string") {
            return interaction.options?.find((option) => option.id === item)?.label ?? item;
          }
          if (
            item &&
            typeof item === "object" &&
            "leftId" in item &&
            "rightId" in item
          ) {
            const pair = item as { leftId: unknown; rightId: unknown };
            return `${String(pair.leftId)} = ${String(pair.rightId)}`;
          }
          return String(item);
        })
        .join("; ");
    }
  } catch {
    // Scalar transport is already display-safe.
  }
  return stored;
}
