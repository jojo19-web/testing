export type PublicMobileConfig = {
  supabaseUrl: string;
  publishableKey: string;
};

type PublicMobileEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  [key: string]: string | undefined;
};

export function readPublicMobileConfig(
  env: PublicMobileEnvironment = process.env,
): PublicMobileConfig | null {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!supabaseUrl || !publishableKey || publishableKey.length > 512) return null;

  try {
    const url = new URL(supabaseUrl);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return { supabaseUrl, publishableKey };
}
