import { describe, expect, it } from "vitest";
import {
  ADMIN_LOGIN_NAME_HTML_PATTERN,
  buildInternalAdminEmail,
  isAdminPasswordValid,
  normalizeAdminLoginName,
  readAdminAuthEmailDomain,
} from "./admin-credentials";

describe("admin credential helpers", () => {
  it("normalizes supported usernames", () => {
    expect(normalizeAdminLoginName("  Admin_123 ")).toBe("admin_123");
    expect(normalizeAdminLoginName("admin name")).toBeNull();
    expect(ADMIN_LOGIN_NAME_HTML_PATTERN).toContain("\\-");
  });

  it("builds an internal Auth identity without exposing it to the UI", () => {
    expect(buildInternalAdminEmail("Admin_123", {})).toBe("admin_123@admin.invalid");
    expect(buildInternalAdminEmail("admin", { ADMIN_AUTH_EMAIL_DOMAIN: "auth.example.com" }))
      .toBe("admin@auth.example.com");
    expect(readAdminAuthEmailDomain({ ADMIN_AUTH_EMAIL_DOMAIN: "not a domain" })).toBeNull();
  });

  it("rejects weak or username-equal passwords", () => {
    expect(isAdminPasswordValid("admin123", "admin")).toBe(false);
    expect(isAdminPasswordValid("admin", "admin")).toBe(false);
    expect(isAdminPasswordValid("a-strong-password-123", "admin")).toBe(true);
  });
});
