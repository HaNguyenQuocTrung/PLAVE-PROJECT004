import "server-only";

import { parseGradesTwoToNineReleaseMode } from "./release-mode.ts";

export function getGradesTwoToNineReleaseMode() {
  return parseGradesTwoToNineReleaseMode(
    process.env.PLAVE_GRADES_2_9_RELEASE_MODE,
  );
}
