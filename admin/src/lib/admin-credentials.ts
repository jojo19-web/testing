const ADMIN_LOGIN_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMIN_AUTH_EMAIL_DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export const ADMIN_LOGIN_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
// HTML's pattern attribute is compiled with the UnicodeSets (v) flag. The
// hyphen must be escaped there even though the equivalent JavaScript RegExp
// above accepts it at the end of the character class.
export const ADMIN_LOGIN_NAME_HTML_PATTERN = "[A-Za-z0-9][A-Za-z0-9._\\-]{0,63}";
export const MIN_ADMIN_PASSWORD_LENGTH = 12;
export const MAX_ADMIN_PASSWORD_LENGTH = 128;
export const DEFAULT_ADMIN_AUTH_EMAIL_DOMAIN = "admin.invalid";

export type AdminLoginConfig = {
  loginName: string;
  email: string;
};

export function normalizeAdminLoginName(value: string): string | null {
  const loginName = value.trim().toLowerCase();
  return ADMIN_LOGIN_NAME_PATTERN.test(loginName) ? loginName : null;
}

export function readAdminLoginConfig(
  environment: Record<string, string | undefined>,
): AdminLoginConfig | null {
  const loginName = normalizeAdminLoginName(environment.ADMIN_LOGIN_NAME ?? "");
  const email = environment.ADMIN_LOGIN_EMAIL?.trim() ?? "";

  if (!loginName || !ADMIN_LOGIN_EMAIL_PATTERN.test(email)) {
    return null;
  }

  return { loginName, email };
}

export function isAdminPasswordValid(password: string, loginName: string): boolean {
  return password.length >= MIN_ADMIN_PASSWORD_LENGTH
    && password.length <= MAX_ADMIN_PASSWORD_LENGTH
    && password.trim().length > 0
    && password.toLowerCase() !== loginName.toLowerCase();
}

export function readAdminAuthEmailDomain(
  environment: Record<string, string | undefined>,
): string | null {
  const domain = environment.ADMIN_AUTH_EMAIL_DOMAIN?.trim().toLowerCase()
    || DEFAULT_ADMIN_AUTH_EMAIL_DOMAIN;
  return ADMIN_AUTH_EMAIL_DOMAIN_PATTERN.test(domain) ? domain : null;
}

export function buildInternalAdminEmail(
  loginName: string,
  environment: Record<string, string | undefined>,
): string | null {
  const normalizedLoginName = normalizeAdminLoginName(loginName);
  const domain = readAdminAuthEmailDomain(environment);
  if (!normalizedLoginName || !domain) return null;
  return `${normalizedLoginName}@${domain}`;
}
