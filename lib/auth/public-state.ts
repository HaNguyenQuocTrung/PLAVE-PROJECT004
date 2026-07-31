import "server-only";

import { cache } from "react";

import type { HeaderRole } from "@/lib/auth/navigation";
import { createClient } from "@/lib/supabase/server";

export type PublicAuthState = {
  authenticated: boolean;
  role: HeaderRole;
  fullName: string | null;
  grade: number | null;
  onboardingCompleted: boolean;
};

const guestState: PublicAuthState = {
  authenticated: false,
  role: null,
  fullName: null,
  grade: null,
  onboardingCompleted: false,
};

export const getPublicAuthState = cache(
  async (): Promise<PublicAuthState> => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) return guestState;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      const role: HeaderRole =
        profile?.role === "STUDENT" ||
        profile?.role === "PARENT" ||
        profile?.role === "TEACHER"
          ? profile.role
          : null;
      let grade: number | null = null;

      if (role === "STUDENT") {
        const { data: studentProfile } = await supabase
          .from("student_profiles")
          .select("grade")
          .eq("user_id", user.id)
          .maybeSingle();
        const profileGrade = studentProfile?.grade;
        grade =
          typeof profileGrade === "number" && Number.isInteger(profileGrade)
            ? profileGrade
            : null;
      }

      return {
        authenticated: true,
        role,
        fullName:
          typeof profile?.full_name === "string" ? profile.full_name : null,
        grade,
        onboardingCompleted: profile?.onboarding_completed === true,
      };
    } catch {
      // Public pages remain available if the auth service is unavailable.
      return guestState;
    }
  },
);
