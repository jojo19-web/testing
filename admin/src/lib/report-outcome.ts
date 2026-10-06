export type ReportFailure = {
  status: number;
  code: string;
  message: string;
};

/** Maps the private report RPC contract to stable HTTP error semantics. */
export function reportFailureForOutcome(outcome: string): ReportFailure | null {
  switch (outcome) {
    case "accepted":
    case "duplicate":
      return null;
    case "unavailable":
      return { status: 404, code: "scan_not_found", message: "This Global Scan is no longer available." };
    case "self_report":
      return { status: 400, code: "self_report", message: "You cannot report your own shared scan." };
    case "quota":
      return { status: 429, code: "report_limit", message: "Daily report limit reached." };
    case "rate_duplicate":
      return { status: 409, code: "report_duplicate_network", message: "This network has already reported this scan." };
    default:
      return { status: 500, code: "report_failed", message: "Could not submit the report." };
  }
}
