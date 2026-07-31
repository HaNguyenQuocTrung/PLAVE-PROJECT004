export type UniversalCurriculumRuntimeFlag =
  | Readonly<{ enabled: true }>
  | Readonly<{
      enabled: false;
      reason: "UNSET" | "FALSE" | "MALFORMED";
    }>;

export function parseUniversalCurriculumRuntimeFlag(
  value: string | undefined,
): UniversalCurriculumRuntimeFlag {
  if (value === undefined || value.trim() === "") {
    return { enabled: false, reason: "UNSET" };
  }
  if (value === "true") return { enabled: true };
  if (value === "false") return { enabled: false, reason: "FALSE" };
  return { enabled: false, reason: "MALFORMED" };
}
