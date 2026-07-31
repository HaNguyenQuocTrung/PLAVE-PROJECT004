import "server-only";

import { getStudentLearningContext } from "@/lib/practice/server";

export type StudentProfileView = {
  fullName: string;
  grade: number;
  birthDate: string | null;
  studentCode: string;
};

export async function getStudentProfileView() {
  const access = await getStudentLearningContext();
  if (!access.ok) return access;

  const [profileResult, studentResult] = await Promise.all([
    access.supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", access.user.id)
      .maybeSingle(),
    access.supabase
      .from("student_profiles")
      .select("grade, birth_date, student_code")
      .eq("user_id", access.user.id)
      .maybeSingle(),
  ]);

  const fullName = profileResult.data?.full_name;
  const studentProfile = studentResult.data;

  if (
    profileResult.error ||
    studentResult.error ||
    typeof fullName !== "string" ||
    fullName.trim().length < 2 ||
    !studentProfile ||
    !Number.isInteger(studentProfile.grade) ||
    (studentProfile.birth_date !== null &&
      typeof studentProfile.birth_date !== "string") ||
    typeof studentProfile.student_code !== "string"
  ) {
    return {
      ok: false as const,
      reason: "DATA_UNAVAILABLE" as const,
    };
  }

  return {
    ok: true as const,
    supabase: access.supabase,
    user: access.user,
    profile: {
      fullName,
      grade: studentProfile.grade as number,
      birthDate: studentProfile.birth_date as string | null,
      studentCode: studentProfile.student_code,
    } satisfies StudentProfileView,
  };
}
