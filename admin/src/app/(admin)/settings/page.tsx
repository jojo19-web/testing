import { Cloud, LockKeyhole } from "lucide-react";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { FormSubmitButton } from "@/components/form-submit-button";
import { adminActionLabel } from "@/lib/admin-copy";
import { hashActionPayload, requireIdempotencyKey } from "@/lib/action-idempotency";
import { requireAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function setCloudWrites(formData: FormData) {
  "use server";
  const admin = await requireAdmin(["owner"]);
  const enabled = formData.get("enabled") === "true";
  const idempotencyKey = requireIdempotencyKey(formData);
  const { data: outcome, error } = await getAdminClient().rpc("set_cloud_writes_enabled_v2", {
    p_enabled: enabled,
    p_admin_id: admin.user.id,
    p_idempotency_key: idempotencyKey,
    p_payload_hash: hashActionPayload({ enabled }),
  });
  if (error || !["applied", "unchanged"].includes(outcome ?? "")) {
    throw new Error("The cloud-write safety control could not be changed.");
  }
  revalidatePath("/settings");
  redirect(`/settings?cloudWrites=${enabled ? "enabled" : "paused"}&outcome=${encodeURIComponent(outcome)}`);
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ cloudWrites?: string; outcome?: string }>;
}) {
  const admin = await requireAdmin();
  const supabase = getAdminClient();
  const [configResult, auditResult] = await Promise.all([
    supabase
      .from("app_config")
      .select("cloud_writes_enabled,catalog_version,updated_at")
      .eq("id", true)
      .single(),
    supabase
      .from("moderation_actions")
      .select("id,action,reason,created_at,contribution_id,request_id,resource_type,resource_key")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (configResult.error || auditResult.error) {
    throw new Error("Production settings and audit data could not be loaded.");
  }

  const data = configResult.data;
  const audit = auditResult.data ?? [];
  const enabled = data.cloud_writes_enabled === true;
  const query = await searchParams;
  const statusChanged = query.cloudWrites === "enabled" || query.cloudWrites === "paused";

  return (
    <div className="fade-up mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold tracking-[-.03em]">Settings</h1>
      <p className="mt-1 text-sm text-[#68687c]">
        Control mobile submissions and review the audit log.
      </p>
      {statusChanged && (
        <p
          role="status"
          className="status-banner mt-5 rounded-xl border border-[#bfe4c5] bg-[#f1fbf2] p-3 text-sm font-semibold text-[#247936]"
        >
          {query.outcome === "unchanged"
            ? "Mobile submissions were already in that state."
            : `Mobile submissions are now ${query.cloudWrites}.`}
        </p>
      )}
      <section className="surface mt-6 p-6">
        <div className="flex items-start gap-4">
          <span
            className={`rounded-full p-3 ${
              enabled ? "bg-[#eaf6ec] text-[#399d4c]" : "bg-[#fff0dd] text-[#995a06]"
            }`}
          >
            <Cloud />
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-bold">
              Mobile cloud submissions: {enabled ? "On" : "Paused"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#68687c]">
              When this is on, the mobile app can send new Global Scans and disease requests for review.
              When paused, reading still works and new submissions stay in the app queue until this is turned on.
            </p>
            {admin.role === "owner" ? (
              <form action={setCloudWrites} className="mt-4">
                <input type="hidden" name="enabled" value={String(!enabled)} />
                <input type="hidden" name="idempotency_key" value={randomUUID()} />
                <FormSubmitButton
                  label={enabled ? "Pause mobile submissions" : "Allow mobile submissions"}
                  pendingLabel={enabled ? "Pausing submissions" : "Allowing submissions"}
                  className={`px-4 text-white ${enabled ? "bg-[#b33143]" : "bg-[#5b3295]"}`}
                />
              </form>
            ) : (
              <p className="mt-4 text-xs font-semibold text-[#68687c]">
                Only the owner can change this safety switch.
              </p>
            )}
          </div>
        </div>
      </section>
      <section className="surface mt-5 p-6">
        <div className="flex items-start gap-4">
          <span className="rounded-full bg-[#f1ecf8] p-3 text-[#5b3295]">
            <LockKeyhole />
          </span>
          <div>
            <h2 className="text-lg font-bold">Security</h2>
            <p className="mt-1 text-sm leading-6 text-[#68687c]">
              Private storage, owner-scoped data, server-only credentials, audited moderation, and Row Level Security.
              Catalog version: {data.catalog_version ?? 1}.
            </p>
          </div>
        </div>
      </section>
      <section className="surface mt-5 p-6">
        <h2 className="font-bold">Audit log</h2>
        {audit.length === 0 ? (
          <p className="mt-3 text-sm text-[#68687c]">No moderation actions yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-[#ece9f1]">
            {audit.map((event) => (
              <div className="safe-long-content py-3 text-sm" key={event.id}>
                <div className="flex flex-wrap justify-between gap-4">
                  <span className="font-semibold">{adminActionLabel(event.action)}</span>
                  <span className="font-mono text-xs text-[#68687c]">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="safe-long-content mt-1 text-xs text-[#68687c]">
                  Target: {event.contribution_id ?? event.request_id ?? [event.resource_type, event.resource_key].filter(Boolean).join(":")}
                </p>
                {event.reason && (
                  <p className="safe-long-content mt-1 whitespace-pre-wrap">{event.reason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
