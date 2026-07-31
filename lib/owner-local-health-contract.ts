export const ownerLocalHealthContract = {
  contractVersion: 2,
  contractHash:
    "a10a6f6b4bd754635a75e663d89abbc424878cf128f2ebfed3effab8ba99e96b",
  project: "PROJECT004",
  cacheIdentity: "PROJECT004_OWNER_LOCAL_CACHE_V1",
} as const;

export type OwnerLocalHealth = Readonly<{
  status: "OK";
  contractVersion: 2;
  contractHash: typeof ownerLocalHealthContract.contractHash;
  project: typeof ownerLocalHealthContract.project;
  cacheIdentity: typeof ownerLocalHealthContract.cacheIdentity;
  ownerMode: true;
  runtimeEnabled: boolean;
  adaptivePilotDisabled: boolean;
  onDemandGenerationEnabled: boolean;
}>;

export function parseOwnerLocalHealth(value: unknown): OwnerLocalHealth | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const expectedKeys = [
    "adaptivePilotDisabled",
    "cacheIdentity",
    "contractHash",
    "contractVersion",
    "onDemandGenerationEnabled",
    "ownerMode",
    "project",
    "runtimeEnabled",
    "status",
  ];
  if (
    Object.keys(record).sort().join("|") !== expectedKeys.join("|") ||
    record.status !== "OK" ||
    record.contractVersion !== ownerLocalHealthContract.contractVersion ||
    record.contractHash !== ownerLocalHealthContract.contractHash ||
    record.project !== ownerLocalHealthContract.project ||
    record.cacheIdentity !== ownerLocalHealthContract.cacheIdentity ||
    record.ownerMode !== true ||
    typeof record.runtimeEnabled !== "boolean" ||
    typeof record.adaptivePilotDisabled !== "boolean" ||
    typeof record.onDemandGenerationEnabled !== "boolean"
  ) {
    return null;
  }
  return record as OwnerLocalHealth;
}
