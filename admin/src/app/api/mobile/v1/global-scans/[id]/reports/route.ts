import { NextResponse } from "next/server";
import { apiError, authorizeMobile, mobileRateSubject, parseJson } from "@/lib/mobile-api";
import {
  UUID_PATTERN,
  validateContentReport,
} from "@/lib/mobile-validation";
import { reportFailureForOutcome } from "@/lib/report-outcome";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  // Reporting is a safety/moderation path. Keep it available even when the
  // owner pauses ordinary mobile submissions such as new shares or requests.
  const auth = await authorizeMobile(request, false);
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  const validation = validateContentReport(await parseJson<unknown>(request));
  if (!UUID_PATTERN.test(id) || !validation.ok) {
    return apiError("Invalid report.", 400, "invalid_report");
  }

  let rateSubject: string;
  try {
    rateSubject = mobileRateSubject(request);
  } catch {
    return apiError("Report protection is temporarily unavailable.", 503, "rate_limit_unavailable");
  }
  const { data: outcome, error } = await getAdminClient().rpc(
    "report_scan_contribution",
    {
      p_reporter_id: auth.user.id,
      p_contribution_id: id,
      p_reason: validation.value.reason,
      p_details: validation.value.details,
      p_rate_subject: rateSubject,
    },
  );
  if (error || typeof outcome !== "string") {
    return apiError("Could not submit the report.", 500, "report_failed");
  }
  const failure = reportFailureForOutcome(outcome);
  if (failure) return apiError(failure.message, failure.status, failure.code);
  return NextResponse.json(
    { accepted: outcome === "accepted", duplicate: outcome === "duplicate" },
    { status: outcome === "accepted" ? 202 : 200 },
  );
}
