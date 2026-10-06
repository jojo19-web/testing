import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Flag, RefreshCw } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { adminRoleLabel, reportReasonLabel, scanStatusLabel, scanStatusTone } from "@/lib/admin-copy";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type Report = {
  id: string;
  contribution_id: string;
  reason: string;
  details: string | null;
  created_at: string;
};

type Scan = {
  id: string;
  disease_id: string;
  confidence: number;
  status: string;
  published_at: string | null;
  photo_path: string;
};

function pageHref(page: number) {
  return page > 1 ? `/reports?page=${page}` : "/reports";
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const admin = await requireAdmin(["owner", "admin", "reviewer"]);
  const supabase = getAdminClient();
  const query = await searchParams;
  const { count, error: countError } = await supabase.from("content_reports").select("id", { count: "exact", head: true });
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const requestedPage = Number.parseInt(query.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), pageCount) : 1;
  const from = (page - 1) * PAGE_SIZE;
  const { data: reportData, error: reportError } = await supabase
    .from("content_reports")
    .select("id,contribution_id,reason,details,created_at")
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  const reports = (reportData ?? []) as Report[];
  const contributionIds = [...new Set(reports.map((report) => report.contribution_id))];
  const { data: scanData, error: scanError } = contributionIds.length
    ? await supabase.from("scan_contributions").select("id,disease_id,confidence,status,published_at,photo_path").in("id", contributionIds)
    : { data: [] as Scan[], error: null };
  const scans = (scanData ?? []) as Scan[];
  const scanById = new Map(scans.map((scan) => [scan.id, scan]));
  const paths = scans.map((scan) => scan.photo_path);
  const signedResult = paths.length
    ? await supabase.storage.from("eggplant-scans").createSignedUrls(paths, 300)
    : { data: [], error: null };
  const signedByPath = new Map(paths.map((path, index) => [path, signedResult.data?.[index]?.signedUrl ?? ""]));
  const error = countError ?? reportError ?? scanError;

  return <div className="fade-up mx-auto max-w-[1240px]">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-3"><span className="rounded-full bg-[#f1ecf8] p-2.5 text-[#5b3295]"><Flag size={20}/></span><h1 className="text-3xl font-bold tracking-[-.03em]">Reports</h1></div>
        <p className="mt-2 max-w-2xl text-sm text-[#6f6b80]">When someone flags a shared scan, it appears here. Open the scan to check the photo and decide whether it should stay public.</p>
        <p className="mt-2 text-xs font-semibold text-[#399d4c]">Signed in as {adminRoleLabel(admin.role)}{admin.loginName ? ` · ${admin.loginName}` : ""}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="rounded-xl border border-[#e5ddec] bg-[#fffdfd] px-3 py-2 text-sm font-semibold text-[#5e596e]">{count ?? 0} report{count === 1 ? "" : "s"} received</p>
        <Link href={pageHref(page)} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#dcd8e4] bg-white px-3 text-sm font-semibold text-[#5b3295]"><RefreshCw size={16}/>Refresh reports</Link>
      </div>
    </header>

    {error ? <p role="alert" className="mt-6 rounded-xl bg-[#fff0f2] p-4 text-sm text-[#a92f40]">Reports are temporarily unavailable. Refresh to try again.</p> : reports.length === 0 ? <div className="surface mt-6 grid place-items-center p-10 text-center sm:p-14"><Flag size={42} className="text-[#b3a2c9]"/><h2 className="mt-4 text-lg font-bold">No reports yet</h2><p className="mt-1 max-w-md text-sm text-[#6f6b80]">Reports from the mobile app will appear here when a user flags a shared scan.</p></div> : <>
      <section className="mt-6 grid gap-3" aria-label="Reports received">
        {reports.map((report) => {
          const scan = scanById.get(report.contribution_id);
          const photoUrl = scan ? signedByPath.get(scan.photo_path) : "";
          return <article className="surface min-w-0 p-4 sm:p-5" key={report.id}>
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
              {scan && <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl bg-[#eeeaf4] sm:h-24 sm:w-32">{photoUrl ? <Image src={photoUrl} alt="Reported shared scan" fill sizes="128px" unoptimized className="object-cover"/> : <div className="grid h-full place-items-center text-xs text-[#777286]">Photo unavailable</div>}</div>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-xs font-semibold uppercase tracking-[.08em] text-[#777286]">{reportReasonLabel(report.reason)}</p><h2 className="safe-long-content mt-1 text-lg font-bold">{scan ? scan.disease_id.replaceAll("-", " ") : "Scan unavailable"}</h2></div>
                  {scan && <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${scanStatusTone(scan.status)}`}>{scanStatusLabel(scan.status)}</span>}
                </div>
                {report.details && <p className="safe-long-content mt-3 whitespace-pre-wrap text-sm leading-6 text-[#625e72]">{report.details}</p>}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#ece9f1] pt-3 text-xs text-[#777286]"><span>{new Date(report.created_at).toLocaleString()}</span>{scan ? <Link href={`/global-scans/${scan.id}`} className="focus-ring inline-flex min-h-10 items-center gap-1 font-semibold text-[#5b3295] hover:underline">Open scan <ChevronRight size={16}/></Link> : <span>This scan is no longer available.</span>}</div>
              </div>
            </div>
          </article>;
        })}
      </section>
      <nav aria-label="Report pages" className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e1eb] pt-5"><p className="text-sm text-[#716c80]">Page <span className="font-semibold text-[#2b2341]">{page}</span> of {pageCount}</p><div className="flex gap-2"><Link aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} href={pageHref(Math.max(1, page - 1))} className={`focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#dcd8e4] px-3 text-sm font-semibold ${page <= 1 ? "pointer-events-none opacity-45" : ""}`}><ChevronLeft size={17}/>Previous</Link><Link aria-disabled={page >= pageCount} tabIndex={page >= pageCount ? -1 : undefined} href={pageHref(Math.min(pageCount, page + 1))} className={`focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#dcd8e4] px-3 text-sm font-semibold ${page >= pageCount ? "pointer-events-none opacity-45" : ""}`}>Next<ChevronRight size={17}/></Link></div></nav>
    </>}
  </div>;
}
