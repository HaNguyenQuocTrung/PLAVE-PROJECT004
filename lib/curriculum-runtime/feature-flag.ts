import "server-only";

import { parseUniversalCurriculumRuntimeFlag } from "./flag-policy.ts";

export function getUniversalCurriculumRuntimeFlag() {
  return parseUniversalCurriculumRuntimeFlag(
    process.env.PLAVE_CURRICULUM_RUNTIME_ENABLED,
  );
}
