import { describe, expect, it } from "vitest";
import { readPublicMobileConfig } from "./mobile-config";

describe("readPublicMobileConfig", () => {
  it("returns only the public Supabase configuration", () => {
    expect(
      readPublicMobileConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co/",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
        SUPABASE_SECRET_KEY: "must-not-be-returned",
      }),
    ).toEqual({
      supabaseUrl: "https://example.supabase.co",
      publishableKey: "sb_publishable_test",
    });
  });

  it("rejects missing or unsafe public configuration", () => {
    expect(readPublicMobileConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" })).toBeNull();
    expect(
      readPublicMobileConfig({
        NEXT_PUBLIC_SUPABASE_URL: "http://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "key",
      }),
    ).toBeNull();
    expect(
      readPublicMobileConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co/unsafe?token=1",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "key",
      }),
    ).toBeNull();
  });
});
