import { describe, expect, it } from "vitest";
import { parseCreateAdminFormData } from "./validation";

function formData(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("admin member form validation", () => {
  it("normalizes a valid username and preserves the password", () => {
    expect(parseCreateAdminFormData(formData({
      loginName: "  Admin_123 ",
      password: "a-strong-password-123",
      role: "admin",
    }))).toEqual({
      value: {
        loginName: "admin_123",
        password: "a-strong-password-123",
        role: "admin",
      },
      error: null,
    });
  });

  it.each([
    ["invalid username", { loginName: "admin name", password: "a-strong-password-123", role: "admin" }, "invalid_name"],
    ["short password", { loginName: "admin", password: "admin123", role: "admin" }, "invalid_password"],
    ["username password", { loginName: "admin", password: "admin", role: "admin" }, "invalid_password"],
    ["invalid role", { loginName: "admin", password: "a-strong-password-123", role: "owner" }, "invalid_role"],
  ])("rejects %s", (_, values, error) => {
    expect(parseCreateAdminFormData(formData(values))).toEqual({ value: null, error });
  });
});
