const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseOnDemandStartRequest(value: unknown) {
  if (
    !isRecord(value) ||
    Object.keys(value).join("|") !== "idempotencyKey" ||
    typeof value.idempotencyKey !== "string" ||
    !uuidPattern.test(value.idempotencyKey)
  ) {
    return null;
  }
  return {
    idempotencyKey: value.idempotencyKey,
  };
}
