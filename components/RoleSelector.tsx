"use client";

import type { RefObject } from "react";
import { PlaveIcon } from "@/components/PlaveIcon";

export type RegistrationRole = "student" | "parent" | "teacher";

type RoleSelectorProps = {
  selectedRole: RegistrationRole | null;
  onChange: (role: RegistrationRole) => void;
  error?: string;
  groupRef: RefObject<HTMLFieldSetElement | null>;
};

const roles: Array<{
  value: RegistrationRole;
  label: string;
  description: string;
  disabled?: boolean;
  disabledMessage?: string;
}> = [
  {
    value: "student",
    label: "Học sinh",
    description: "Học bài, luyện tập và theo dõi tiến bộ.",
  },
  {
    value: "parent",
    label: "Phụ huynh",
    description: "Liên kết với học sinh sau khi tài khoản được tạo.",
  },
  {
    value: "teacher",
    label: "Giáo viên",
    description: "Đăng ký bằng mã mời riêng do PLAVE cấp.",
    disabledMessage: "Cần mã mời của PLAVE",
  },
];

export function RoleSelector({
  selectedRole,
  onChange,
  error,
  groupRef,
}: RoleSelectorProps) {
  return (
    <fieldset
      ref={groupRef}
      className="role-selector"
      tabIndex={-1}
      aria-describedby={error ? "role-error" : undefined}
      aria-invalid={Boolean(error)}
    >
      <legend>Bạn muốn dùng PLAVE với vai trò nào?</legend>
      <div className="role-selector__grid">
        {roles.map((role) => (
          <label
            key={role.value}
            className={`role-option ${
              selectedRole === role.value ? "role-option--selected" : ""
            } ${role.disabled ? "role-option--disabled" : ""}`}
          >
            <input
              type="radio"
              name="role"
              value={role.value}
              checked={selectedRole === role.value}
              disabled={role.disabled}
              onChange={() => onChange(role.value)}
            />
            <PlaveIcon name={role.value} className="role-option__icon" />
            <span className="role-option__title">{role.label}</span>
            <span className="role-option__description">{role.description}</span>
            {role.disabledMessage ? (
              <span className="role-option__notice">{role.disabledMessage}</span>
            ) : null}
          </label>
        ))}
      </div>
      {error ? (
        <p className="field__error" id="role-error" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
