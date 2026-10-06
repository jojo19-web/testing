import { NextResponse } from "next/server";
import { readPublicMobileConfig } from "@/lib/mobile-config";

export const dynamic = "force-dynamic";

export function GET() {
  const config = readPublicMobileConfig();
  if (!config) {
    return NextResponse.json(
      { error: { code: "cloud_config_unavailable", message: "Cloud configuration is unavailable." } },
      { status: 503 },
    );
  }

  return NextResponse.json(config, {
    headers: {
      "Cache-Control": "public, max-age=300, must-revalidate",
    },
  });
}
