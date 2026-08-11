import type { FactoryGrade } from "./types.ts";
import { combinedWaveABCDEFGHIJGradePacks } from "./wave-j-packs.ts";
import { buildWaveKGradePacks, combineWaveABCDEFGHIJKPacks } from "./wave-k.ts";

export const waveKGradePacks = buildWaveKGradePacks(combinedWaveABCDEFGHIJGradePacks);
export const combinedWaveABCDEFGHIJKGradePacks = combinedWaveABCDEFGHIJGradePacks.map((source) => {
  const waveK = waveKGradePacks.find((entry) => entry.grade === source.grade);
  if (!waveK) throw new Error(`WAVE_K_PACK_MISSING:G${source.grade}`);
  return combineWaveABCDEFGHIJKPacks(source, waveK);
});

export function getWaveKGradePacks(grades: readonly FactoryGrade[]) {
  return waveKGradePacks.filter((pack) => grades.includes(pack.grade));
}

export function getCombinedWaveABCDEFGHIJKGradePacks(grades: readonly FactoryGrade[]) {
  return combinedWaveABCDEFGHIJKGradePacks.filter((pack) => grades.includes(pack.grade));
}

