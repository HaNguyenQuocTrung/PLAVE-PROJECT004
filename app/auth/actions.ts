"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { LogoutActionState } from "@/lib/auth/logout";
import { createClient } from "@/lib/supabase/server";

export async function signOutAction(
  previousState: LogoutActionState,
  formData: FormData,
): Promise<LogoutActionState> {
  void previousState;
  void formData;

  const supabase = await createClient();
  await supabase.auth.getUser();

  const { error } = await supabase.auth.signOut();
  if (error) {
    return {
      status: "ERROR",
      message: "Chưa thể đăng xuất. Vui lòng thử lại.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
