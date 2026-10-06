"use client";

import Image from "next/image";
import { useState } from "react";

type GlobalScanImageToggleProps = {
  originalUrl: string | null;
  annotatedUrl: string | null;
  alt: string;
};

export function GlobalScanImageToggle({
  originalUrl,
  annotatedUrl,
  alt,
}: GlobalScanImageToggleProps) {
  const [showAnnotated, setShowAnnotated] = useState(false);
  const activeUrl = showAnnotated && annotatedUrl ? annotatedUrl : originalUrl;

  return (
    <>
      {annotatedUrl ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9f1] bg-[#fffdfd] px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#716c80]">Image view</span>
          <div className="flex rounded-xl border border-[#dcd8e4] p-1" role="group" aria-label="Choose scan image view">
            <button
              type="button"
              aria-pressed={!showAnnotated}
              onClick={() => setShowAnnotated(false)}
              className={`focus-ring rounded-lg px-3 py-1.5 text-xs font-semibold ${!showAnnotated ? "bg-[#f1ecf8] text-[#5b3295]" : "text-[#716c80]"}`}
            >
              Original
            </button>
            <button
              type="button"
              aria-pressed={showAnnotated}
              onClick={() => setShowAnnotated(true)}
              className={`focus-ring rounded-lg px-3 py-1.5 text-xs font-semibold ${showAnnotated ? "bg-[#f1ecf8] text-[#5b3295]" : "text-[#716c80]"}`}
            >
              Annotated
            </button>
          </div>
        </div>
      ) : null}
      <div className="relative aspect-[4/3] bg-[#f1ecf8]">
        {activeUrl ? (
          <Image src={activeUrl} alt={alt} fill sizes="(min-width: 1280px) 60vw, 100vw" unoptimized className="object-contain" />
        ) : (
          <div className="grid h-full place-items-center text-sm text-[#68687c]">Photo unavailable</div>
        )}
      </div>
      {showAnnotated && annotatedUrl ? <p className="border-t border-[#ece9f1] px-4 py-2 text-[11px] font-semibold text-[#716c80]">AI screening overlay • confidence shown from the scan result</p> : null}
    </>
  );
}
