import { NextResponse } from "next/server";
import { apiError, authorizeMobile, mobileRateSubject, parseJson } from "@/lib/mobile-api";
import {
  globalAnnotatedSharePath,
  globalSharePath,
  validateShareIntent,
} from "@/lib/mobile-validation";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await authorizeMobile(request, true);
  if ("response" in auth) return auth.response;

  const validation = validateShareIntent(await parseJson<unknown>(request));
  if (!validation.ok) {
    return apiError("Invalid share metadata.", 400, "invalid_share");
  }
  const body = validation.value;
  const supabase = getAdminClient();
  const { data: disease, error: diseaseError } = await supabase
    .from("disease_catalog")
    .select("id")
    .eq("id", body.diseaseId)
    .maybeSingle();
  if (diseaseError) {
    return apiError(
      "The disease catalog is temporarily unavailable.",
      503,
      "catalog_unavailable",
    );
  }
  if (!disease) {
    return apiError(
      "Disease is not supported by this model.",
      422,
      "unsupported_disease",
    );
  }

  const path = globalSharePath(
    auth.user.id,
    body.clientScanId,
    body.sha256,
  );
  const annotatedPath = body.annotatedSha256
    ? globalAnnotatedSharePath(auth.user.id, body.clientScanId, body.annotatedSha256)
    : null;
  let rateSubject: string;
  try {
    rateSubject = mobileRateSubject(request);
  } catch {
    return apiError("Share protection is temporarily unavailable.", 503, "rate_limit_unavailable");
  }
  const reservationParameters = {
    p_owner_id: auth.user.id,
    p_client_scan_id: body.clientScanId,
    p_disease_id: body.diseaseId,
    p_confidence: body.confidence,
    p_source: body.source,
    p_model_version: body.modelVersion,
    p_photo_path: path,
    p_expected_sha256: body.sha256,
    p_rate_subject: rateSubject,
    ...(annotatedPath
      ? {
          p_annotated_photo_path: annotatedPath,
          p_annotated_expected_sha256: body.annotatedSha256,
        }
      : {}),
  };
  const { data: reserved, error: reserveError } = await supabase.rpc(
    annotatedPath ? "reserve_global_share_intent_v2" : "reserve_global_share_intent",
    annotatedPath
      ? reservationParameters
      : {
          p_owner_id: auth.user.id,
          p_client_scan_id: body.clientScanId,
          p_disease_id: body.diseaseId,
          p_confidence: body.confidence,
          p_source: body.source,
          p_model_version: body.modelVersion,
          p_photo_path: path,
          p_expected_sha256: body.sha256,
          p_rate_subject: rateSubject,
        },
  );
  const reservation = reserved?.[0];
  if (reserveError || !reservation) {
    return apiError("Could not reserve this share.", 500, "share_reservation_failed");
  }
  if (reservation.outcome === "quota") {
    return apiError("Daily share limit reached.", 429, "share_limit");
  }
  if (reservation.outcome === "conflict") {
    return apiError("This local scan has conflicting share metadata.", 409, "share_conflict");
  }
  if (reservation.outcome === "consent_required") {
    return apiError("Anonymous sharing is disabled.", 409, "sharing_disabled");
  }
  if (reservation.outcome === "cleanup_pending") {
    return apiError(
      "The previous private photo cleanup is still finishing. Try again shortly.",
      503,
      "share_cleanup_pending",
    );
  }
  if (reservation.outcome === "completed") {
    return NextResponse.json({ path, annotatedPath, alreadyPublished: true });
  }
  const bucket = supabase.storage.from("eggplant-scans");
  const paths = [path, annotatedPath].filter((value): value is string => Boolean(value));
  const { error: cleanupError } = await bucket.remove(paths);
  if (cleanupError) {
    return apiError(
      "Could not safely renew the photo upload.",
      503,
      "upload_cleanup_failed",
    );
  }
  const [signedRaw, signedAnnotated] = await Promise.all([
    bucket.createSignedUploadUrl(path, { upsert: false }),
    annotatedPath
      ? bucket.createSignedUploadUrl(annotatedPath, { upsert: false })
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (signedRaw.error || !signedRaw.data || signedAnnotated.error || (annotatedPath && !signedAnnotated.data)) {
    return apiError(
      "Could not prepare photo upload.",
      500,
      "upload_intent_failed",
    );
  }
  return NextResponse.json({
    path,
    token: signedRaw.data.token,
    signedUrl: signedRaw.data.signedUrl,
    annotatedPath,
    annotatedToken: signedAnnotated.data?.token ?? null,
    annotatedSignedUrl: signedAnnotated.data?.signedUrl ?? null,
    expiresInSeconds: 7_200,
  });
}
