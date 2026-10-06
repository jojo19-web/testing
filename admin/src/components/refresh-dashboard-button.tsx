"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RefreshDashboardButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="focus-ring action-button inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d9d3e4] bg-white px-3.5 text-sm font-semibold text-[#512b91]"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      aria-busy={isPending}
    >
      <RefreshCw size={16} className={isPending ? "animate-spin" : undefined} aria-hidden="true" />
      {isPending ? "Refreshing overview" : "Refresh overview"}
    </button>
  );
}
