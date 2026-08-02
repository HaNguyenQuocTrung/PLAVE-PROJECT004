"use client";

import { useState } from "react";
import type { ComponentProps } from "react";

import { FormField } from "@/components/FormField";

type PasswordFieldProps = Omit<
  ComponentProps<typeof FormField>,
  "type" | "action"
>;

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField
      {...props}
      type={visible ? "text" : "password"}
      action={
        <button
          className="field__action"
          type="button"
          disabled={props.disabled}
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={visible}
        >
          {visible ? "Ẩn" : "Hiện"}
        </button>
      }
    />
  );
}
