export type AuthSubmissionGate = Readonly<{
  tryStart: () => boolean;
  reset: () => void;
}>;

export function createAuthSubmissionGate(): AuthSubmissionGate {
  let pending = false;

  return {
    tryStart() {
      if (pending) return false;
      pending = true;
      return true;
    },
    reset() {
      pending = false;
    },
  };
}
