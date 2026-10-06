import { hashActionPayload, requireIdempotencyKey } from "@/lib/action-idempotency";
import { requireAdmin } from "@/lib/auth";
import { reportReasonLabel, scanStatusLabel, scanStatusTone } from "@/lib/admin-copy";
import { getAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, ShieldAlert, Trash2 } from "lucide-react";
import Link from "next/link";
import { UUID_PATTERN } from "@/lib/mobile-validation";
import { FormSubmitButton } from "@/components/form-submit-button";
import { GlobalScanImageToggle } from "@/components/global-scan-image-toggle";
import { randomUUID } from "node:crypto";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;
const STATUS_FILTERS = ["pending_review", "published", "all", "quarantined", "removed"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

type Report = { id: string; reason: string; details: string | null; created_at: string };

async function moderate(formData: FormData) {
  "use server";
  const admin = await requireAdmin(["owner", "admin", "reviewer"]);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const idempotencyKey = requireIdempotencyKey(formData);
  if (!UUID_PATTERN.test(id) || !["published", "quarantined", "removed"].includes(status)) throw new Error("Invalid moderation action.");
  const reason = String(formData.get("reason") ?? "Manual admin action").slice(0, 500);
  const page = String(formData.get("page") ?? "1").replace(/[^0-9]/g, "") || "1";
  const listStatus = String(formData.get("list_status") ?? "published");
  const search = String(formData.get("search") ?? "").slice(0, 80);
  const supabase = getAdminClient();
  const { data: outcome, error } = await supabase.rpc("moderate_scan_contribution_v2", {
    p_contribution_id: id,
    p_status: status,
    p_reason: reason,
    p_admin_id: admin.user.id,
    p_idempotency_key: idempotencyKey,
    p_payload_hash: hashActionPayload({ contributionId: id, status, reason }),
  });
  if (error || !["applied", "unchanged"].includes(outcome ?? "")) throw new Error("The scan could not be updated. Refresh and try again.");
  revalidatePath("/global-scans");
  const params = new URLSearchParams({ moderated: status, outcome: outcome ?? "applied", page });
  if (STATUS_FILTERS.includes(listStatus as StatusFilter) && listStatus !== "pending_review") params.set("status", listStatus);
  if (search) params.set("q", search);
  redirect(`/global-scans/${id}?${params.toString()}`);
}

export default async function GlobalScanDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ moderated?: string; outcome?: string; page?: string; status?: string; q?: string }> }) {
  await requireAdmin(["owner", "admin", "reviewer"]);
  const { id } = await params;
  const query = await searchParams;
  const supabase = getAdminClient();
  const { data: scan, error: scanError } = await supabase.from("scan_contributions").select("*").eq("id", id).maybeSingle();
  if (scanError) throw new Error("The Global Scan could not be loaded.");
  if (!scan) notFound();

  const requestedStatus = STATUS_FILTERS.includes(query.status as StatusFilter) ? query.status as StatusFilter : "pending_review";
  const search = (query.q ?? "").replace(/[^a-z0-9\s-]/gi, "").trim().slice(0, 80);
  const requestedPage = Number.parseInt(query.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(requestedPage, 1) : 1;
  let neighborQuery = supabase.from("scan_contributions").select("id").order("published_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (requestedStatus !== "all") neighborQuery = neighborQuery.eq("status", requestedStatus);
  if (search) neighborQuery = neighborQuery.ilike("disease_id", `%${search}%`);

  const [{ data: signed, error: signedError }, { data: annotatedSigned, error: annotatedSignedError }, { data: originalDownload }, { data: annotatedDownload }, { data: reportData, error: reportError }, { data: neighborData }] = await Promise.all([
    supabase.storage.from("eggplant-scans").createSignedUrl(scan.photo_path, 300),
    scan.annotated_photo_path
      ? supabase.storage.from("eggplant-scans").createSignedUrl(scan.annotated_photo_path, 300)
      : Promise.resolve({ data: null, error: null }),
    supabase.storage.from("eggplant-scans").createSignedUrl(scan.photo_path, 300, { download: true }),
    scan.annotated_photo_path
      ? supabase.storage.from("eggplant-scans").createSignedUrl(scan.annotated_photo_path, 300, { download: true })
      : Promise.resolve({ data: null, error: null }),
    supabase.from("content_reports").select("id,reason,details,created_at").eq("contribution_id", id).order("created_at", { ascending: false }),
    neighborQuery,
  ]);
  if (signedError || annotatedSignedError || reportError) throw new Error("The Global Scan review data could not be loaded.");

  const reports = (reportData ?? []) as Report[];
  const neighborIds = (neighborData ?? []).map((item) => item.id as string);
  const currentIndex = neighborIds.indexOf(id);
  const previousId = currentIndex > 0 ? neighborIds[currentIndex - 1] : null;
  const nextId = currentIndex >= 0 && currentIndex < neighborIds.length - 1 ? neighborIds[currentIndex + 1] : null;
  const context = new URLSearchParams({ page: String(page) });
  if (requestedStatus !== "pending_review") context.set("status", requestedStatus);
  if (search) context.set("q", search);
  const contextSuffix = context.toString();
  const detailHref = (scanId: string) => `/global-scans/${scanId}?${contextSuffix}`;
  const moderated = query.moderated;
  const outcome = query.outcome;
  const moderationSucceeded = ["published", "quarantined", "removed"].includes(moderated ?? "");

  return <div className="fade-up mx-auto max-w-[1240px]">
    <header className="flex flex-wrap items-center justify-between gap-3"><Link href="/global-scans" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#5b3295]"><ArrowLeft size={17}/>Back to scans</Link><nav aria-label="Scan details" className="flex flex-wrap gap-2"><Link aria-label="Previous scan" aria-disabled={!previousId} tabIndex={previousId ? undefined : -1} href={previousId ? detailHref(previousId) : "#"} className={`focus-ring inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#dcd8e4] px-3 text-sm font-semibold ${previousId ? "" : "pointer-events-none opacity-45"}`}><ChevronLeft size={17}/>Previous</Link><Link aria-label="Next scan" aria-disabled={!nextId} tabIndex={nextId ? undefined : -1} href={nextId ? detailHref(nextId) : "#"} className={`focus-ring inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#dcd8e4] px-3 text-sm font-semibold ${nextId ? "" : "pointer-events-none opacity-45"}`}>Next<ChevronRight size={17}/></Link></nav></header>
    {moderationSucceeded && <p role="status" className="status-banner mt-4 flex items-center gap-2 rounded-xl border border-[#bfe4c5] bg-[#f1fbf2] p-3 text-sm font-semibold text-[#247936]"><CheckCircle2 size={17}/>{outcome === "unchanged" ? "No scan status change was needed." : `Scan status updated to ${scanStatusLabel(moderated ?? "")}.`}</p>}
    <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,.8fr)]">
      <div className="min-w-0 space-y-5"><section className="surface overflow-hidden"><GlobalScanImageToggle originalUrl={signed?.signedUrl ?? null} annotatedUrl={annotatedSigned?.signedUrl ?? null} alt="Shared eggplant disease photo" /><div className="flex flex-wrap gap-3 border-t border-[#ece9f1] px-4 py-3"><a href={originalDownload?.signedUrl ?? undefined} download className="text-sm font-semibold text-[#5b3295]">Download original image</a>{annotatedDownload?.signedUrl && <a href={annotatedDownload.signedUrl} download className="text-sm font-semibold text-[#5b3295]">Download annotated image</a>}</div></section><section className="surface p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Reports about this scan</h2><p className="mt-1 text-sm text-[#68687c]">These are user flags. Check the photo before hiding or restoring the scan.</p></div><span className="rounded-full bg-[#fff0dd] px-2.5 py-1 text-xs font-bold text-[#995a06]">{reports.length}</span></div>{reports.length === 0 ? <p className="mt-4 rounded-xl bg-[#faf9fc] p-4 text-sm text-[#716c80]">No one has reported this scan.</p> : <div className="mt-4 divide-y divide-[#ece9f1]">{reports.map((report) => <article className="py-4 first:pt-0 last:pb-0" key={report.id}><div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-[#f1ecf8] px-2.5 py-1 text-xs font-semibold text-[#5b3295]">{reportReasonLabel(report.reason)}</span><time className="font-mono text-xs text-[#777286]">{new Date(report.created_at).toLocaleString()}</time></div>{report.details && <p className="safe-long-content mt-3 whitespace-pre-wrap text-sm leading-6 text-[#625e72]">{report.details}</p>}</article>)}</div>}</section></div>
      <aside className="min-w-0 space-y-5"><section className="surface p-5"><h1 className="safe-long-content text-2xl font-bold capitalize">{scan.disease_id.replaceAll("-", " ")}</h1><div className="mt-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${scanStatusTone(scan.status)}`}>{scanStatusLabel(scan.status)}</span></div><dl className="mt-4 divide-y divide-[#ece9f1] text-sm"><Row label="Confidence" value={`${Math.round(Number(scan.confidence) * 100)}%`}/><Row label="Source" value={scan.source}/><Row label="Reports" value={String(reports.length)}/><Row label="Model" value={scan.model_version}/></dl></section><section className="surface p-5"><h2 className="font-bold">Scan actions</h2><p className="mt-1 text-xs leading-5 text-[#68687c]">Approve a pending submission to publish it globally, or reject it to keep it out of the public feed.</p><div className="mt-4 grid gap-2"><Action id={id} status="published" page={page} listStatus={requestedStatus} search={search} label={scan.status === "pending_review" ? "Approve and publish" : "Publish / restore"} icon={<CheckCircle2 size={17}/>} style="border-[#70b77b] text-[#247936]"/><Action id={id} status="quarantined" page={page} listStatus={requestedStatus} search={search} label="Hide from public" icon={<ShieldAlert size={17}/>} style="border-[#e0a44e] text-[#915707]"/><Action id={id} status="removed" page={page} listStatus={requestedStatus} search={search} label={scan.status === "pending_review" ? "Reject submission" : "Remove permanently"} icon={<Trash2 size={17}/>} style="border-[#e38b96] text-[#b12d40]"/></div></section></aside>
    </div>
  </div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-wrap justify-between gap-4 py-3"><dt className="text-[#716c80]">{label}</dt><dd className="safe-long-content max-w-[65%] text-right font-mono font-semibold">{value}</dd></div>;
}

function Action({ id, status, page, listStatus, search, label, icon, style }: { id: string; status: string; page: number; listStatus: string; search: string; label: string; icon: ReactNode; style: string }) {
  return <form action={moderate}><input type="hidden" name="id" value={id}/><input type="hidden" name="status" value={status}/><input type="hidden" name="page" value={page}/><input type="hidden" name="list_status" value={listStatus}/><input type="hidden" name="search" value={search}/><input type="hidden" name="idempotency_key" value={randomUUID()}/><FormSubmitButton label={label} pendingLabel="Saving change" icon={icon} className={`w-full border px-4 ${style}`}/></form>;
}
