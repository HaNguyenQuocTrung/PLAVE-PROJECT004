import { combinedWaveABCDEFGHIGradePacks } from "./wave-i-packs.ts";
import { buildWaveJGradePacks, combineWaveABCDEFGHIJPacks } from "./wave-j.ts";
import type { FactoryGrade } from "./types.ts";

export const waveJGradePacks = buildWaveJGradePacks(combinedWaveABCDEFGHIGradePacks);
export const combinedWaveABCDEFGHIJGradePacks = combinedWaveABCDEFGHIGradePacks.map((source) => {
  const waveJ = waveJGradePacks.find((entry) => entry.grade === source.grade);
  if (!waveJ) throw new Error(`WAVE_J_PACK_MISSING:G${source.grade}`);
  return combineWaveABCDEFGHIJPacks(source, waveJ);
});

export function getWaveJGradePacks(grades: readonly FactoryGrade[]) {
  return waveJGradePacks.filter((pack) => grades.includes(pack.grade));
}
export function getCombinedWaveABCDEFGHIJGradePacks(grades: readonly FactoryGrade[]) {
  return combinedWaveABCDEFGHIJGradePacks.filter((pack) => grades.includes(pack.grade));
}
