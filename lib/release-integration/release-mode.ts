export const gradesTwoToNineReleaseModes = [
  "HIDDEN",
  "PILOT",
  "PUBLIC",
] as const;

export type GradesTwoToNineReleaseMode =
  (typeof gradesTwoToNineReleaseModes)[number];

export type GradesTwoToNineReleaseModeResult =
  | Readonly<{ mode: GradesTwoToNineReleaseMode; valid: true }>
  | Readonly<{ mode: "HIDDEN"; valid: false; reason: "UNSET" | "MALFORMED" }>;

export function parseGradesTwoToNineReleaseMode(
  value: string | undefined,
): GradesTwoToNineReleaseModeResult {
  if (value === undefined || value.trim() === "") {
    return { mode: "HIDDEN", valid: false, reason: "UNSET" };
  }
  if (gradesTwoToNineReleaseModes.includes(value as GradesTwoToNineReleaseMode)) {
    return { mode: value as GradesTwoToNineReleaseMode, valid: true };
  }
  return { mode: "HIDDEN", valid: false, reason: "MALFORMED" };
}

export type ReleaseAuthorizationInput = Readonly<{
  applicationMode: GradesTwoToNineReleaseMode;
  databaseMode: GradesTwoToNineReleaseMode;
  authenticated: boolean;
  role: "STUDENT" | "PARENT" | "TEACHER" | "UNKNOWN";
  schoolGrade: number | null;
  releaseGrade: number;
  exactTupleMatches: boolean;
  applicationRuntimeEnabled: boolean;
  databaseRuntimeEnabled: boolean;
  pilotEntitled: boolean;
}>;

export type ReleaseAuthorization =
  | Readonly<{ allowed: true; mode: "PILOT" | "PUBLIC" }>
  | Readonly<{
      allowed: false;
      reason:
        | "HIDDEN"
        | "MODE_MISMATCH"
        | "AUTH_REQUIRED"
        | "STUDENT_REQUIRED"
        | "GRADE_MISMATCH"
        | "TUPLE_MISMATCH"
        | "RUNTIME_DISABLED"
        | "PILOT_ENTITLEMENT_REQUIRED";
    }>;

export function authorizeGradesTwoToNineRelease(
  input: ReleaseAuthorizationInput,
): ReleaseAuthorization {
  if (input.applicationMode === "HIDDEN" || input.databaseMode === "HIDDEN") {
    return { allowed: false, reason: "HIDDEN" };
  }
  if (input.applicationMode !== input.databaseMode) {
    return { allowed: false, reason: "MODE_MISMATCH" };
  }
  if (!input.authenticated) return { allowed: false, reason: "AUTH_REQUIRED" };
  if (input.role !== "STUDENT") return { allowed: false, reason: "STUDENT_REQUIRED" };
  if (input.schoolGrade !== input.releaseGrade || input.releaseGrade < 2 || input.releaseGrade > 9) {
    return { allowed: false, reason: "GRADE_MISMATCH" };
  }
  if (!input.exactTupleMatches) return { allowed: false, reason: "TUPLE_MISMATCH" };
  if (!input.applicationRuntimeEnabled || !input.databaseRuntimeEnabled) {
    return { allowed: false, reason: "RUNTIME_DISABLED" };
  }
  if (input.applicationMode === "PILOT" && !input.pilotEntitled) {
    return { allowed: false, reason: "PILOT_ENTITLEMENT_REQUIRED" };
  }
  return { allowed: true, mode: input.applicationMode };
}
