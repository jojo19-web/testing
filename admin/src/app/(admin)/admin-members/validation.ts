import {
  isAdminPasswordValid,
  MAX_ADMIN_PASSWORD_LENGTH,
  MIN_ADMIN_PASSWORD_LENGTH,
  normalizeAdminLoginName,
} from "../../../lib/admin-credentials";

export const CREATABLE_ADMIN_ROLES = ["admin", "reviewer"] as const;
export type CreatableAdminRole = (typeof CREATABLE_ADMIN_ROLES)[number];

export type CreateAdminInput = {
  loginName: string;
  password: string;
  role: CreatableAdminRole;
};

export type CreateAdminValidationError = "invalid_name" | "invalid_password" | "invalid_role";

export function parseCreateAdminFormData(
  formData: FormData,
): { value: CreateAdminInput; error: null } | { value: null; error: CreateAdminValidationError } {
  const loginNameValue = formData.get("loginName");
  const passwordValue = formData.get("password");
  const roleValue = formData.get("role");
  const loginName = typeof loginNameValue === "string" ? normalizeAdminLoginName(loginNameValue) : null;
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const role = typeof roleValue === "string" && CREATABLE_ADMIN_ROLES.includes(roleValue as CreatableAdminRole)
    ? roleValue as CreatableAdminRole
    : null;

  if (!loginName) return { value: null, error: "invalid_name" };
  if (!isAdminPasswordValid(password, loginName)) return { value: null, error: "invalid_password" };
  if (!role) return { value: null, error: "invalid_role" };

  return { value: { loginName, password, role }, error: null };
}

export const ADMIN_LOGIN_NAME_HELP = "Letters, numbers, dots, underscores, and hyphens only.";
export const ADMIN_PASSWORD_HELP = `Use at least ${MIN_ADMIN_PASSWORD_LENGTH} characters (maximum ${MAX_ADMIN_PASSWORD_LENGTH}).`;
