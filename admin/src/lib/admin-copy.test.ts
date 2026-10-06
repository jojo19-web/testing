import { describe, expect, it } from "vitest";
import { adminActionLabel, adminRoleLabel, requestStatusLabel, scanStatusLabel } from "./admin-copy";

describe("admin copy", () => {
  it("keeps internal hidden status out of visible scan labels", () => {
    expect(scanStatusLabel("quarantined")).toBe("Hidden for review");
  });

  it("turns request states into readable labels", () => {
    expect(requestStatusLabel("under_review")).toBe("Under review");
    expect(requestStatusLabel("needs_information")).toBe("Needs information");
  });

  it("makes the signed-in role obvious", () => {
    expect(adminRoleLabel("admin")).toBe("Admin");
    expect(adminRoleLabel("reviewer")).toBe("Reviewer");
  });

  it("turns audit actions into plain-language labels", () => {
    expect(adminActionLabel("scan_moderation")).toBe("Global scan review");
    expect(adminActionLabel("catalog_publish")).toBe("Disease catalog update");
  });
});
