import { describe, expect, it } from "vitest";
import { reportFailureForOutcome } from "./report-outcome";

describe("reportFailureForOutcome", () => {
  it("treats accepted and duplicate reports as successful", () => {
    expect(reportFailureForOutcome("accepted")).toBeNull();
    expect(reportFailureForOutcome("duplicate")).toBeNull();
  });

  it("preserves the moderation-specific failure messages", () => {
    expect(reportFailureForOutcome("unavailable")).toMatchObject({ status: 404, code: "scan_not_found" });
    expect(reportFailureForOutcome("self_report")).toMatchObject({ status: 400, code: "self_report" });
    expect(reportFailureForOutcome("quota")).toMatchObject({ status: 429, code: "report_limit" });
    expect(reportFailureForOutcome("rate_duplicate")).toMatchObject({ status: 409, code: "report_duplicate_network" });
  });

  it("fails closed for an unknown RPC outcome", () => {
    expect(reportFailureForOutcome("new_status_from_server")).toEqual({
      status: 500,
      code: "report_failed",
      message: "Could not submit the report.",
    });
  });
});
