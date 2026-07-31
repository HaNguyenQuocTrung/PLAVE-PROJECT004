"use client";

import { useActionState } from "react";

import { signOutAction } from "@/app/auth/actions";
import { Button } from "@/components/Button";
import { INITIAL_LOGOUT_ACTION_STATE } from "@/lib/auth/logout";

type LogoutFormProps = {
  buttonClassName?: string;
  buttonVariant?: "primary" | "secondary" | "quiet";
  formClassName?: string;
  menuItem?: boolean;
};

export function LogoutForm({
  buttonClassName,
  buttonVariant = "quiet",
  formClassName,
  menuItem = false,
}: LogoutFormProps) {
  const [state, formAction, pending] = useActionState(
    signOutAction,
    INITIAL_LOGOUT_ACTION_STATE,
  );

  return (
    <form action={formAction} className={formClassName}>
      <Button
        className={buttonClassName}
        type="submit"
        variant={buttonVariant}
        role={menuItem ? "menuitem" : undefined}
        aria-label="Đăng xuất khỏi PLAVE"
        aria-disabled={pending}
        disabled={pending}
      >
        {pending ? "Đang đăng xuất…" : "Đăng xuất"}
      </Button>
      {state.status === "ERROR" ? (
        <p className="logout-form__error" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
