"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ClipboardList, Flag, Globe2, LayoutDashboard, LogOut, Settings, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { adminRoleLabel } from "@/lib/admin-copy";

const items = [
  ["Overview", "/overview", LayoutDashboard, false],
  ["Global scans", "/global-scans", Globe2, false],
  ["Reports", "/reports", Flag, false],
  ["Disease requests", "/disease-requests", ClipboardList, false],
  ["Disease catalog", "/disease-catalog", BookOpen, false],
  ["Settings", "/settings", Settings, false],
  ["Admin access", "/admin-members", ShieldCheck, true],
] as const;

export function AdminShell({ children, role, loginName, reportCount = 0 }: { children: ReactNode; role: string; loginName?: string | null; reportCount?: number }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f7f7f4] lg:grid lg:grid-cols-[276px_1fr]">
      <aside className="border-b border-[#dfe3dc] bg-[#eef1ed] px-5 py-5 text-[#20251f] lg:relative lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:border-[#d8ddd5]">
        <div className="flex items-center gap-3 px-2">
          <Image src="/eggplant-mascot.png" alt="" width={50} height={50} priority className="object-contain" />
          <div><p className="text-xl font-bold tracking-tight">Eggplant</p><p className="text-sm font-semibold text-[#399d4c]">Admin</p></div>
        </div>
        <nav className="mt-8 flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-1" aria-label="Admin navigation">
          {items.filter(([, , , ownerOnly]) => !ownerOnly || role === "owner").map(([label, href, Icon]) => {
            const selected = pathname === href || pathname.startsWith(`${href}/`);
            return <Link prefetch={false} key={href} href={href} aria-current={selected ? "page" : undefined} className={`focus-ring flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-all lg:w-full ${selected ? "bg-[#d8c5eb] text-[#3d2269]" : "text-[#5f645e] hover:bg-white/70 hover:text-[#3d2269]"}`}><Icon size={19} strokeWidth={1.9}/><span className="flex-1">{label}</span>{label === "Reports" && reportCount > 0 && <span aria-label={`${reportCount} reports`} className="rounded-full bg-[#fff0dd] px-2 py-0.5 text-[11px] font-bold text-[#995a06]">{reportCount > 99 ? "99+" : reportCount}</span>}</Link>;
          })}
        </nav>
        <div className="mt-6 rounded-2xl border border-[#d8ddd5] bg-white/65 p-4 lg:absolute lg:bottom-5 lg:left-5 lg:right-5">
          <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={17} className="text-[#399d4c]"/>Admin workspace</div>
          <p className="mt-1 text-xs leading-5 text-[#5f645e]">Signed in as {adminRoleLabel(role)}{loginName ? ` · ${loginName}` : ""}. Changes are audited.</p>
          <form action="/auth/signout" method="post" className="mt-3"><button className="focus-ring flex items-center gap-2 text-xs font-semibold text-[#5b3295] hover:text-[#3d2269]"><LogOut size={14}/>Sign out</button></form>
        </div>
      </aside>
      <main className="min-w-0 p-5 sm:p-7 lg:p-10">{children}</main>
    </div>
  );
}
