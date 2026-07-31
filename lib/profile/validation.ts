export type StudentProfileInput = {
  fullName: string;
  birthDate: string;
};

export type StudentProfileFieldErrors = {
  fullName?: string;
  birthDate?: string;
};

type StudentProfileValidationResult =
  | {
      ok: true;
      value: {
        fullName: string;
        birthDate: string | null;
      };
      fieldErrors: StudentProfileFieldErrors;
    }
  | {
      ok: false;
      fieldErrors: StudentProfileFieldErrors;
    };

function isValidCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function validateStudentProfileInput(
  input: StudentProfileInput,
  today = new Date().toISOString().slice(0, 10),
): StudentProfileValidationResult {
  if (
    typeof input !== "object" ||
    input === null ||
    typeof input.fullName !== "string" ||
    typeof input.birthDate !== "string"
  ) {
    return {
      ok: false,
      fieldErrors: {
        fullName: "Họ và tên cần có từ 2 đến 100 ký tự.",
        birthDate: "Ngày sinh không hợp lệ hoặc nằm trong tương lai.",
      },
    };
  }

  const fullName = input.fullName.replace(/\s+/g, " ").trim();
  const birthDate = input.birthDate.trim();
  const fieldErrors: StudentProfileFieldErrors = {};

  if (fullName.length < 2 || fullName.length > 100) {
    fieldErrors.fullName = "Họ và tên cần có từ 2 đến 100 ký tự.";
  }

  if (
    birthDate &&
    (!isValidCalendarDate(birthDate) || birthDate > today)
  ) {
    fieldErrors.birthDate =
      "Ngày sinh không hợp lệ hoặc nằm trong tương lai.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      fullName,
      birthDate: birthDate || null,
    },
    fieldErrors: {},
  };
}

export function maskAccountEmail(email: string | null | undefined) {
  if (!email) return "Email tài khoản được bảo vệ";

  const separatorIndex = email.lastIndexOf("@");
  if (separatorIndex <= 0 || separatorIndex === email.length - 1) {
    return "Email tài khoản được bảo vệ";
  }

  const localPart = email.slice(0, separatorIndex);
  const domain = email.slice(separatorIndex + 1);
  return `${localPart.charAt(0)}***@${domain}`;
}
