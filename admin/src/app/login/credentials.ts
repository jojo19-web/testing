import {
  MAX_ADMIN_PASSWORD_LENGTH,
  normalizeAdminLoginName,
} from "../../lib/admin-credentials";

export {
  ADMIN_LOGIN_NAME_PATTERN,
  MAX_ADMIN_PASSWORD_LENGTH,
  normalizeAdminLoginName,
  readAdminLoginConfig,
} from "../../lib/admin-credentials";

export type AdminLoginInput = {
  loginName: string;
  password: string;
};

export function parseAdminLoginFormData(formData: FormData): AdminLoginInput | null {
  const loginNameValue = formData.get("name");
  const passwordValue = formData.get("password");

  if (typeof loginNameValue !== "string" || typeof passwordValue !== "string") {
    return null;
  }

  const loginName = normalizeAdminLoginName(loginNameValue);
  if (
    !loginName ||
    passwordValue.length === 0 ||
    passwordValue.length > MAX_ADMIN_PASSWORD_LENGTH
  ) {
    return null;
  }

  return { loginName, password: passwordValue };
}
