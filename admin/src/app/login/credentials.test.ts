import { describe, expect, it } from "vitest";
import {
  MAX_ADMIN_PASSWORD_LENGTH,
  parseAdminLoginFormData,
  readAdminLoginConfig,
} from "./credentials";

describe("admin login credentials", () => {
  it("parses a valid login without altering the password", () => {
    const formData = new FormData();
    formData.set("name", "  ADMIN ");
    formData.set("password", "not-a-real-password");

    expect(parseAdminLoginFormData(formData)).toEqual({
      loginName: "admin",
      password: "not-a-real-password",
    });
  });

  const invalidInputs: Array<[string, { name?: string; password?: string }]> = [
    ["missing name", { password: "password" }],
    ["missing password", { name: "admin" }],
    ["invalid name", { name: "admin name", password: "password" }],
    ["empty password", { name: "admin", password: "" }],
    ["oversized password", { name: "admin", password: "x".repeat(MAX_ADMIN_PASSWORD_LENGTH + 1) }],
  ];

  it.each(invalidInputs)("rejects %s", (_, values) => {
    const formData = new FormData();
    if (values.name !== undefined) formData.set("name", values.name);
    if (values.password !== undefined) formData.set("password", values.password);

    expect(parseAdminLoginFormData(formData)).toBeNull();
  });

  it("requires a valid server-side alias and Auth email", () => {
    expect(
      readAdminLoginConfig({
        ADMIN_LOGIN_NAME: "admin",
        ADMIN_LOGIN_EMAIL: "admin@example.com",
      }),
    ).toEqual({ loginName: "admin", email: "admin@example.com" });
    expect(readAdminLoginConfig({ ADMIN_LOGIN_NAME: "admin" })).toBeNull();
    expect(
      readAdminLoginConfig({
        ADMIN_LOGIN_NAME: "admin name",
        ADMIN_LOGIN_EMAIL: "admin@example.com",
      }),
    ).toBeNull();
  });
});
