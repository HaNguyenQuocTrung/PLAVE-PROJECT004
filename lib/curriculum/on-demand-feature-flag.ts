import "server-only";

import { parseGeneratedPracticeRuntimeConfiguration } from "./generated-practice-feature-flag.ts";
import { getGeneratedPracticePilotConfiguration } from "./generated-practice-pilot.ts";

export function getOnDemandRuntimeConfiguration() {
  const signingKey = process.env.PLAVE_ON_DEMAND_GENERATION_SIGNING_KEY;
  const generated = parseGeneratedPracticeRuntimeConfiguration({
    enabled: process.env.PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED,
    mode: process.env.PLAVE_GENERATED_PRACTICE_MODE,
  });
  const pilot = getGeneratedPracticePilotConfiguration();
  const enabled =
    process.env.PLAVE_ON_DEMAND_GENERATION_ENABLED === "true" &&
    generated.enabled &&
    (generated.mode === "SHADOW" || pilot.enabled) &&
    typeof signingKey === "string" &&
    /^[0-9a-f]{64}$/.test(signingKey);
  return {
    enabled,
    mode: generated.mode,
    signingKey: enabled ? signingKey : null,
    pilot,
  };
}
