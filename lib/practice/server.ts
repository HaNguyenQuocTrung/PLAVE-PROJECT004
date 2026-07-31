import "server-only";

import { createClient } from "@/lib/supabase/server";

export type StudentLearningAccessFailure =
  | "UNAUTHENTICATED"
  | "ONBOARDING_REQUIRED"
  | "ACCESS_DENIED"
  | "DATA_UNAVAILABLE";

type StudentLearningContextTimingStage =
  | "supabase_client"
  | "auth_user"
  | "profile"
  | "student_profile";

type StudentLearningContextOptions = Readonly<{
  recordTiming?: (
    stage: StudentLearningContextTimingStage,
    durationMs: number,
  ) => void;
}>;

async function measured<T>(
  stage: StudentLearningContextTimingStage,
  operation: () => PromiseLike<T> | T,
  options?: StudentLearningContextOptions,
): Promise<T> {
  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    options?.recordTiming?.(stage, performance.now() - startedAt);
  }
}

export async function getStudentLearningContext(
  options?: StudentLearningContextOptions,
) {
  const supabase = await measured(
    "supabase_client",
    () => createClient(),
    options,
  );
  const {
    data: { user },
    error: userError,
  } = await measured("auth_user", () => supabase.auth.getUser(), options);

  if (userError || !user) {
    return {
      ok: false as const,
      reason: (
        userError &&
        /abort|timeout|fetch failed|network/i.test(userError.message)
          ? "DATA_UNAVAILABLE"
          : "UNAUTHENTICATED"
      ) as StudentLearningAccessFailure,
    };
  }

  const { data: profile, error: profileError } = await measured(
    "profile",
    () =>
      supabase
        .from("profiles")
        .select("role, onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle(),
    options,
  );

  if (profileError || !profile) {
    return {
      ok: false as const,
      reason: "DATA_UNAVAILABLE" as StudentLearningAccessFailure,
    };
  }

  if (!profile.onboarding_completed) {
    return {
      ok: false as const,
      reason: "ONBOARDING_REQUIRED" as StudentLearningAccessFailure,
    };
  }

  if (profile.role !== "STUDENT") {
    return {
      ok: false as const,
      reason: "ACCESS_DENIED" as StudentLearningAccessFailure,
    };
  }

  const { data: studentProfile, error: studentError } = await measured(
    "student_profile",
    () =>
      supabase
        .from("student_profiles")
        .select("grade")
        .eq("user_id", user.id)
        .maybeSingle(),
    options,
  );

  if (
    studentError ||
    !studentProfile ||
    !Number.isInteger(studentProfile.grade)
  ) {
    return {
      ok: false as const,
      reason: "DATA_UNAVAILABLE" as StudentLearningAccessFailure,
    };
  }

  return {
    ok: true as const,
    supabase,
    user,
    grade: studentProfile.grade as number,
  };
}
