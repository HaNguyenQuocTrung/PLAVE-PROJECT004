export type LogoutActionState = {
  status: "IDLE" | "ERROR";
  message: string | null;
};

export const INITIAL_LOGOUT_ACTION_STATE: LogoutActionState = {
  status: "IDLE",
  message: null,
};
