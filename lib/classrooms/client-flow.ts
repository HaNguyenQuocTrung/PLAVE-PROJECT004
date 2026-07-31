export function createClassroomRequestGate() {
  let requestInFlight = false;

  return {
    tryStart() {
      if (requestInFlight) return false;
      requestInFlight = true;
      return true;
    },
    reset() {
      requestInFlight = false;
    },
  };
}
