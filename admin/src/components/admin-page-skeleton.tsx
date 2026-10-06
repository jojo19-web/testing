type SkeletonKind =
  | "overview"
  | "requests"
  | "reports"
  | "catalog"
  | "scans"
  | "scan-detail"
  | "request-detail"
  | "catalog-detail"
  | "settings"
  | "members";

function Bar({ className = "" }: { className?: string }) {
  return <div className={`pulse-soft rounded-lg bg-[#e7e7e2] ${className}`} />;
}

function PageHeader({ action = false }: { action?: boolean }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <Bar className="h-9 w-56 max-w-full" />
        <Bar className="mt-3 h-4 w-[28rem] max-w-full" />
      </div>
      {action && <Bar className="h-10 w-32" />}
    </header>
  );
}

function OverviewWorkspace() {
  return (
    <>
      <div className="mt-6 grid overflow-hidden rounded-[20px] border border-[#e2e2dc] bg-[#fffefa] sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="border-b border-[#ece9e2] p-5 last:border-0 sm:border-b-0 sm:border-r xl:last:border-r-0" key={index}>
            <Bar className="h-3 w-28" />
            <Bar className="mt-3 h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="mt-5 grid overflow-hidden rounded-[20px] border border-[#e2e2dc] bg-[#fffefa] sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="border-b border-[#ece9e2] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0" key={index}>
            <Bar className="h-3 w-24" />
            <Bar className="mt-2 h-4 w-32" />
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.15fr]">
        <div className="surface min-h-[19rem] p-5">
          <Bar className="h-5 w-40" />
          <div className="mt-6 grid gap-5">{Array.from({ length: 4 }, (_, index) => <Bar className="h-7 w-full" key={index} />)}</div>
        </div>
        <div className="surface min-h-[19rem] p-5">
          <Bar className="h-5 w-44" />
          <div className="mt-6 grid gap-3">{Array.from({ length: 5 }, (_, index) => <Bar className="h-10 w-full" key={index} />)}</div>
        </div>
      </div>
    </>
  );
}

function ScansWorkspace() {
  return (
    <>
      <div className="surface mt-6 grid gap-3 p-4 sm:grid-cols-[minmax(12rem,.55fr)_minmax(14rem,1fr)_auto] sm:items-end">
        <div><Bar className="h-4 w-20" /><Bar className="mt-2 h-11 w-full" /></div>
        <div><Bar className="h-4 w-28" /><Bar className="mt-2 h-11 w-full" /></div>
        <Bar className="h-11 w-32" />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="surface overflow-hidden" key={index}>
            <Bar className="aspect-[16/10] w-full rounded-none" />
            <div className="p-4"><Bar className="h-5 w-3/5" /><Bar className="mt-4 h-4 w-full" /><Bar className="mt-3 h-3 w-2/5" /></div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-[#e2e2dc] pt-5"><Bar className="h-4 w-24" /><div className="flex gap-2"><Bar className="h-11 w-28" /><Bar className="h-11 w-24" /></div></div>
    </>
  );
}

function RequestsWorkspace() {
  return (
    <>
      <div className="mt-6 grid gap-3 md:hidden">
        {Array.from({ length: 5 }, (_, index) => (
          <div className="surface p-4" key={index}><div className="flex gap-3"><Bar className="h-20 w-24 shrink-0" /><div className="min-w-0 flex-1"><Bar className="h-5 w-2/3" /><Bar className="mt-3 h-4 w-full" /><Bar className="mt-2 h-4 w-4/5" /></div></div><Bar className="mt-4 h-8 w-full" /></div>
        ))}
      </div>
      <div className="surface mt-6 hidden overflow-hidden p-5 md:block"><div className="grid grid-cols-[5rem_1.1fr_1.5fr_7rem_9rem_8rem] gap-4 border-b border-[#ece7f1] pb-3">{Array.from({ length: 6 }, (_, index) => <Bar className="h-3 w-full" key={index} />)}</div><div className="divide-y divide-[#ece7f1]">{Array.from({ length: 5 }, (_, index) => <div className="grid grid-cols-[5rem_1.1fr_1.5fr_7rem_9rem_8rem] items-center gap-4 py-4" key={index}>{Array.from({ length: 6 }, (_, cell) => <Bar className={`${cell === 0 ? "h-14" : "h-5"} w-full`} key={cell} />)}</div>)}</div></div>
    </>
  );
}

function ReportsWorkspace() {
  return <div className="mt-6 grid gap-3">{Array.from({ length: 6 }, (_, index) => <div className="surface min-w-0 p-4 sm:p-5" key={index}><div className="flex min-w-0 flex-col gap-4 sm:flex-row"><Bar className="h-24 w-full shrink-0 sm:w-32"/><div className="min-w-0 flex-1"><Bar className="h-3 w-28"/><Bar className="mt-3 h-6 w-2/5 max-w-full"/><Bar className="mt-4 h-4 w-full"/><Bar className="mt-2 h-4 w-3/4"/><Bar className="mt-4 h-8 w-32"/></div></div></div>)}</div>;
}

function CatalogWorkspace() {
  return (
    <>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <div className="surface p-5" key={index}><Bar className="h-4 w-24" /><Bar className="mt-3 h-6 w-1/2" /><Bar className="mt-5 h-4 w-full" /><Bar className="mt-2 h-4 w-4/5" /><Bar className="mt-5 h-3 w-1/3" /></div>)}</div>
      <div className="mt-5 rounded-xl border border-[#e2e2dc] bg-[#f4f4f0] p-4"><Bar className="h-4 w-4/5" /><Bar className="mt-2 h-4 w-3/5" /></div>
    </>
  );
}

function DetailWorkspace({ kind }: { kind: "scan-detail" | "request-detail" }) {
  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,.8fr)]">
      <div className="min-w-0">
        <div className="surface aspect-[4/3] overflow-hidden"><Bar className="h-full w-full rounded-none" /></div>
        {kind === "request-detail" && <div className="surface mt-5 p-5"><Bar className="h-4 w-40" /><Bar className="mt-3 h-7 w-2/3" /><Bar className="mt-5 h-4 w-full" /><Bar className="mt-2 h-4 w-4/5" /></div>}
      </div>
      <div className="grid gap-5"><div className="surface min-h-60 p-5"><Bar className="h-7 w-2/3" /><div className="mt-6 grid gap-4">{Array.from({ length: kind === "scan-detail" ? 5 : 2 }, (_, index) => <Bar className="h-5 w-full" key={index} />)}</div></div><div className="surface min-h-52 p-5"><Bar className="h-6 w-40" /><div className="mt-5 grid gap-3">{Array.from({ length: kind === "scan-detail" ? 3 : 4 }, (_, index) => <Bar className="h-11 w-full" key={index} />)}</div></div></div>
    </div>
  );
}

function CatalogDetailWorkspace() {
  return <>
    <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
      <div><Bar className="h-9 w-64 max-w-full" /><Bar className="mt-3 h-4 w-80 max-w-full" /></div>
      <Bar className="h-9 w-48 max-w-full" />
    </header>
    <div className="mt-6 grid gap-5">{Array.from({ length: 2 }, (_, index) => <div className="surface p-5" key={index}><Bar className="h-6 w-24" /><div className="mt-5 grid gap-4 sm:grid-cols-2"><Bar className="h-11 w-full" /><Bar className="h-11 w-full" /></div><Bar className="mt-4 h-28 w-full" />{Array.from({ length: 5 }, (_, field) => <Bar className="mt-4 h-20 w-full" key={field} />)}</div>)}<Bar className="h-12 w-48" /></div>
  </>;
}

function SettingsWorkspace({ members = false }: { members?: boolean }) {
  return <div className="mt-6 grid gap-5">{members ? <><div className="surface min-h-64 p-6"><Bar className="h-6 w-48" /><Bar className="mt-4 h-4 w-full" /><div className="mt-6 grid gap-4 sm:grid-cols-2"><Bar className="h-11 w-full" /><Bar className="h-11 w-full" /></div><Bar className="mt-5 h-11 w-44" /></div><div className="surface min-h-64 p-6"><Bar className="h-6 w-40" />{Array.from({ length: 4 }, (_, index) => <Bar className="mt-5 h-7 w-full" key={index} />)}</div></> : <><div className="surface min-h-52 p-6"><Bar className="h-6 w-56" /><Bar className="mt-4 h-4 w-full" /><Bar className="mt-3 h-4 w-4/5" /><Bar className="mt-6 h-11 w-48" /></div><div className="surface min-h-48 p-6"><Bar className="h-6 w-36" />{Array.from({ length: 3 }, (_, index) => <Bar className="mt-5 h-7 w-full" key={index} />)}</div></>}</div>;
}

export function AdminPageSkeleton({ kind = "overview" }: { kind?: SkeletonKind }) {
  const isDetail = kind.includes("detail");
  return (
    <div aria-busy="true" aria-label="Loading admin workspace" className="mx-auto max-w-[1240px]">
      {kind === "scan-detail" ? <div className="flex flex-wrap items-center justify-between gap-3"><Bar className="h-4 w-28" /><div className="flex gap-2"><Bar className="h-10 w-28" /><Bar className="h-10 w-24" /></div></div> : isDetail ? <Bar className="h-4 w-28" /> : <PageHeader action={kind === "overview" || kind === "scans" || kind === "requests"} />}
      {kind === "overview" && <OverviewWorkspace />}
      {kind === "scans" && <ScansWorkspace />}
      {kind === "requests" && <RequestsWorkspace />}
      {kind === "reports" && <ReportsWorkspace />}
      {kind === "catalog" && <CatalogWorkspace />}
      {kind === "scan-detail" && <DetailWorkspace kind="scan-detail" />}
      {kind === "request-detail" && <DetailWorkspace kind="request-detail" />}
      {kind === "catalog-detail" && <CatalogDetailWorkspace />}
      {kind === "settings" && <SettingsWorkspace />}
      {kind === "members" && <SettingsWorkspace members />}
      <span className="sr-only">Loading live production data</span>
    </div>
  );
}
