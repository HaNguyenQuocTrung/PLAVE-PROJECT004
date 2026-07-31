"use server";

import { revalidatePath } from "next/cache";

import type { StudentProfileInput } from "@/lib/profile/validation";
import { validateStudentProfileInput } from "@/lib/profile/validation";
import { createClient } from "@/lib/supabase/server";

export type UpdateStudentProfileResult =
  | {
      ok: true;
      message: "";
      fieldErrors: {
        fullName?: string;
        birthDate?: string;
      };
    }
  | {
      ok: false;
      message: string;
      fieldErrors: {
        fullName?: string;
        birthDate?: string;
      };
    };

export async function updateStudentProfile(
  input: StudentProfileInput,
): Promise<UpdateStudentProfileResult> {
  const validation = validateStudentProfileInput(input);
  if (!validation.ok) {
    return {
      ok: false,
      message: "Vui lòng kiểm tra lại thông tin hồ sơ.",
      fieldErrors: validation.fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        ok: false,
        message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        fieldErrors: {},
      };
    }

    const { error } = await supabase.rpc("update_student_profile", {
      p_full_name: validation.value.fullName,
      p_birth_date: validation.value.birthDate,
    });

    if (error) {
      return {
        ok: false,
        message: "Chưa thể cập nhật hồ sơ. Vui lòng thử lại.",
        fieldErrors: {},
      };
    }

    revalidatePath("/", "layout");
    revalidatePath("/profile");
    revalidatePath("/profile/edit");

    return { ok: true, message: "", fieldErrors: {} };
  } catch {
    return {
      ok: false,
      message: "Chưa thể kết nối dịch vụ hồ sơ. Vui lòng thử lại sau.",
      fieldErrors: {},
    };
  }
}
