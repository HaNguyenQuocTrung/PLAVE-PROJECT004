export type DisposableResourceClassification =
  | "ADEQUATE"
  | "CONSTRAINED_BUT_SUPPORTED"
  | "INSUFFICIENT";

export const disposableResourceThresholds = {
  cpu: {
    minimum: 2,
    recommended: 4,
  },
  memoryBytes: {
    minimum: 4 * 1024 ** 3,
    recommended: 8 * 1024 ** 3,
  },
  freeDiskBytes: {
    minimum: 8 * 1024 ** 3,
    recommended: 16 * 1024 ** 3,
  },
} as const;

export type DisposableResourceEvidence = {
  classification: DisposableResourceClassification;
  cpu: {
    check: DisposableResourceClassification;
    observed: number;
    requiredMinimum: number;
    recommended: number;
  };
  memory: {
    check: DisposableResourceClassification;
    dockerObservedBytes: number;
    hostObservedBytes: number;
    requiredMinimumBytes: number;
    recommendedBytes: number;
  };
  disk: {
    check: DisposableResourceClassification;
    observedBytes: number;
    requiredMinimumBytes: number;
    recommendedBytes: number;
  };
  image: {
    check: "ADEQUATE" | "INSUFFICIENT";
    observed: "AVAILABLE" | "NOT_AVAILABLE";
    required: "AVAILABLE";
  };
};

function capacityClassification(
  observed: number,
  minimum: number,
  recommended: number,
): DisposableResourceClassification {
  if (
    !Number.isFinite(observed) ||
    observed < minimum
  ) {
    return "INSUFFICIENT";
  }
  return observed >= recommended
    ? "ADEQUATE"
    : "CONSTRAINED_BUT_SUPPORTED";
}

function overallClassification(
  checks: readonly DisposableResourceClassification[],
) {
  if (checks.includes("INSUFFICIENT")) {
    return "INSUFFICIENT" as const;
  }
  if (checks.includes("CONSTRAINED_BUT_SUPPORTED")) {
    return "CONSTRAINED_BUT_SUPPORTED" as const;
  }
  return "ADEQUATE" as const;
}

export function classifyDisposableResources(input: {
  cpu: number;
  dockerMemoryBytes: number;
  hostMemoryBytes: number;
  freeDiskBytes: number;
  postgresImageAvailable: boolean;
}): DisposableResourceEvidence {
  const cpuCheck = capacityClassification(
    input.cpu,
    disposableResourceThresholds.cpu.minimum,
    disposableResourceThresholds.cpu.recommended,
  );
  const dockerMemoryCheck = capacityClassification(
    input.dockerMemoryBytes,
    disposableResourceThresholds.memoryBytes.minimum,
    disposableResourceThresholds.memoryBytes.recommended,
  );
  const hostMemoryCheck = capacityClassification(
    input.hostMemoryBytes,
    disposableResourceThresholds.memoryBytes.minimum,
    disposableResourceThresholds.memoryBytes.recommended,
  );
  const memoryCheck = overallClassification([
    dockerMemoryCheck,
    hostMemoryCheck,
  ]);
  const diskCheck = capacityClassification(
    input.freeDiskBytes,
    disposableResourceThresholds.freeDiskBytes.minimum,
    disposableResourceThresholds.freeDiskBytes.recommended,
  );
  const imageCheck = input.postgresImageAvailable
    ? ("ADEQUATE" as const)
    : ("INSUFFICIENT" as const);
  return {
    classification: overallClassification([
      cpuCheck,
      memoryCheck,
      diskCheck,
      imageCheck,
    ]),
    cpu: {
      check: cpuCheck,
      observed: input.cpu,
      requiredMinimum:
        disposableResourceThresholds.cpu.minimum,
      recommended:
        disposableResourceThresholds.cpu.recommended,
    },
    memory: {
      check: memoryCheck,
      dockerObservedBytes: input.dockerMemoryBytes,
      hostObservedBytes: input.hostMemoryBytes,
      requiredMinimumBytes:
        disposableResourceThresholds.memoryBytes.minimum,
      recommendedBytes:
        disposableResourceThresholds.memoryBytes.recommended,
    },
    disk: {
      check: diskCheck,
      observedBytes: input.freeDiskBytes,
      requiredMinimumBytes:
        disposableResourceThresholds.freeDiskBytes.minimum,
      recommendedBytes:
        disposableResourceThresholds.freeDiskBytes.recommended,
    },
    image: {
      check: imageCheck,
      observed: input.postgresImageAvailable
        ? "AVAILABLE"
        : "NOT_AVAILABLE",
      required: "AVAILABLE",
    },
  };
}
