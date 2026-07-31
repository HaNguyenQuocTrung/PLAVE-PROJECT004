import type { StudentCurriculumProgress } from "./contracts.ts";

export function recordUniversalAvailabilityDiagnostic(input: Readonly<{
  route: "/lessons" | "/dashboard";
  role: "STUDENT" | "PARENT" | "TEACHER" | "ANONYMOUS";
  schoolGrade: number | null;
  runtimeEnabled: boolean;
  releaseAvailable: boolean;
  catalogCount: number;
  failureCode: string;
  progress?: StudentCurriculumProgress | null;
}>) {
  console.info("[PLAVE_UNIVERSAL_AVAILABILITY]", {
    route: input.route,
    role: input.role,
    schoolGrade: input.schoolGrade,
    runtimeEnabled: input.runtimeEnabled,
    releaseAvailable: input.releaseAvailable,
    catalogCount: input.catalogCount,
    failureCode: input.failureCode,
  });
}
