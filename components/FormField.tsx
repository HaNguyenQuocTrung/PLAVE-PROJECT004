import type {
  ChangeEventHandler,
  HTMLInputAutoCompleteAttribute,
  ReactNode,
  Ref,
} from "react";

type FormFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  type?: "text" | "email" | "password" | "date";
  autoComplete?: HTMLInputAutoCompleteAttribute;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  action?: ReactNode;
  inputRef?: Ref<HTMLInputElement>;
  inputMode?: "email" | "numeric" | "text";
  disabled?: boolean;
};

export function FormField({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  required = false,
  error,
  hint,
  action,
  inputRef,
  inputMode,
  disabled = false,
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <div className={`field__control ${error ? "field__control--error" : ""}`}>
        <input
          ref={inputRef}
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          inputMode={inputMode}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
        {action}
      </div>
      {hint ? (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
