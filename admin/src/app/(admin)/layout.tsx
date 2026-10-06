import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { getAdminClient } from "@/lib/supabase/admin";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const reportResult = await getAdminClient().from("content_reports").select("id", { count: "exact", head: true });
  return <AdminShell role={admin.role} loginName={admin.loginName} reportCount={reportResult.error ? undefined : reportResult.count ?? 0}>{children}</AdminShell>;
}
