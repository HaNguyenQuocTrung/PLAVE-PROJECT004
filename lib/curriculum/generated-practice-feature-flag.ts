export type GeneratedPracticeMode = "OFF" | "SHADOW" | "PILOT_LIVE";

export function parseGeneratedPracticeRuntimeConfiguration(input: Readonly<{
  enabled?: string;
  mode?: string;
}>) {
  const mode: GeneratedPracticeMode =
    input.enabled === "true" &&
    (input.mode === "SHADOW" || input.mode === "PILOT_LIVE")
      ? input.mode
      : "OFF";
  return { enabled: mode !== "OFF", mode };
}
