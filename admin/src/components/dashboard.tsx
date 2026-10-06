import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, Globe2, Leaf, UsersRound } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard-data";
import { RefreshDashboardButton } from "@/components/refresh-dashboard-button";
import { scanStatusLabel, scanStatusTone } from "@/lib/admin-copy";

function Metric({ label, value, icon: Icon, href }: { label: string; value: number; icon: typeof Globe2; href?: string }) {
  const content = (
    <div className="min-w-0 border-b border-[#ebe8f0] p-5 last:border-0 sm:border-b-0 sm:border-r">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#6f6b80]">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-[#17152b]">{value.toLocaleString()}</p>
        </div>
        <span className="rounded-full bg-[#f0eafb] p-2.5 text-[#512b91]" aria-hidden="true"><Icon size={21} /></span>
      </div>
    </div>
  );
  return href ? <Link href={href} className="focus-ring block rounded-[20px] transition-colors hover:bg-[#faf8fd]">{content}</Link> : content;
}

export function Dashboard({ data }: { data: DashboardData }) {
  const maxRank = Math.max(1, ...data.rankings.map((r) => r.count));
  return (
    <div className="fade-up mx-auto max-w-[1240px]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-[-.03em]">Overview</h1>
          <p className="mt-1 text-sm text-[#6f6b80]">Shared scans, requests, and reports in one place.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RefreshDashboardButton />
        </div>
      </header>
      <section className="surface mt-6 grid sm:grid-cols-2 xl:grid-cols-4" aria-label="Operational metrics">
        <Metric label="Reports received" value={data.reportsReceived} icon={ClipboardCheck} href="/reports" />
        <Metric label="Shared scans" value={data.sharedScans} icon={Globe2} />
        <Metric label="Contributing installs" value={data.installations} icon={UsersRound} />
        <Metric label="Open requests" value={data.openRequests} icon={Leaf} />
      </section>
      <section className="mt-5 grid overflow-hidden rounded-[20px] border border-[#e5ddec] bg-[#fffdfd] sm:grid-cols-3" aria-label="System status">
        <Ops label="Mobile submissions" value={data.cloudWritesEnabled ? "On" : "Paused"} hint="Global scans and disease requests" />
        <Ops label="Photo storage" value={formatBytes(data.storageBytes)} hint="Private review images" />
        <Ops label="Last app activity" value={data.lastInstallationSeenAt ? new Date(data.lastInstallationSeenAt).toLocaleString() : "No sync yet"} hint="Most recent mobile activity" />
      </section>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.15fr]">
        <section className="surface p-5">
          <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-bold">Disease rankings</h2><Link href="/global-scans" className="text-sm font-semibold text-[#512b91]">View all</Link></div>
          {data.rankings.length === 0 ? <Empty text="Rankings will appear after users share confirmed scans." /> : <ol className="mt-4 divide-y divide-[#ece9f1]">{data.rankings.map((rank, index) => <li key={rank.diseaseId} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 py-3"><span className="font-mono text-sm font-bold text-[#17152b]">{index + 1}</span><div><p className="text-sm font-semibold">{rank.name}</p><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#eceaf0]"><div className="h-full rounded-full bg-[#319548]" style={{ width: `${rank.count / maxRank * 100}%` }} /></div></div><span className="font-mono text-sm text-[#17152b]">{rank.count}</span></li>)}</ol>}
        </section>
        <section className="surface p-5">
          <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-bold">Recent shared scans</h2><Link href="/global-scans" className="text-sm font-semibold text-[#512b91]">Manage</Link></div>
          {data.recent.length === 0 ? <Empty text="No community photos have been shared yet." /> : <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase tracking-wide text-[#797487]"><tr><th className="pb-3">Disease</th><th className="pb-3">Confidence</th><th className="pb-3">Status</th><th className="pb-3"><span className="sr-only">Open</span></th></tr></thead><tbody className="divide-y divide-[#ece9f1]">{data.recent.map((scan) => <tr key={scan.id}><td className="py-3 font-semibold">{scan.disease}</td><td className="py-3 font-mono text-[#27883d]">{scan.confidence}%</td><td className="py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${scanStatusTone(scan.status)}`}>{scanStatusLabel(scan.status)}</span></td><td><Link href={`/global-scans/${scan.id}`} aria-label={`Review ${scan.disease}`} className="text-[#512b91]"><ArrowUpRight size={17} aria-hidden="true" /></Link></td></tr>)}</tbody></table></div>}
        </section>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) { return <div className="mt-4 rounded-xl border border-dashed border-[#d9d3e4] bg-[#faf9fc] p-8 text-center text-sm text-[#716c80]">{text}</div>; }
function Ops({ label, value, hint }: { label: string; value: string; hint: string }) { return <div className="border-b border-[#ece9f1] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><p className="text-xs font-semibold text-[#68687c]">{label}</p><p className="mt-1 truncate font-mono text-sm font-semibold text-[#17152b]">{value}</p><p className="mt-1 truncate text-xs text-[#8a8498]">{hint}</p></div>; }
function formatBytes(bytes: number) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
