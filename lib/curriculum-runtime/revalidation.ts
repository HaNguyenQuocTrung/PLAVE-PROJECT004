import "server-only";

import { revalidatePath } from "next/cache";

const studentLearningProjectionPaths = [
  "/dashboard",
  "/lessons",
  "/learning-progress",
  "/learning-history",
  "/results",
] as const;

export function revalidateStudentLearningProjections() {
  for (const path of studentLearningProjectionPaths) {
    revalidatePath(path);
  }
  revalidatePath("/parent/children/[connectionId]", "page");
}
