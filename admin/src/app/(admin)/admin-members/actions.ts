"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeAdminLoginName, readAdminLoginConfig, buildInternalAdminEmail } from "@/lib/admin-credentials";
import { requireAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { CREATABLE_ADMIN_ROLES, parseCreateAdminFormData } from "./validation";

const ADMIN_MEMBERS_PATH = "/admin-members";

function redirectWithError(error: string): never {
  redirect(`${ADMIN_MEMBERS_PATH}?error=${encodeURIComponent(error)}`);
}

function errorCode(error: { code?: string | null; status?: number | null } | null): string {
  return error?.code || (error?.status ? `http_${error.status}` : "unknown");
}

async function markProvisioningFailed(
  adminClient: ReturnType<typeof getAdminClient>,
  provisioningId: string,
  reason: string,
) {
  const { error } = await adminClient
    .from("admin_provisioning")
    .update({ status: "failed", last_error: reason.slice(0, 500), updated_at: new Date().toISOString() })
    .eq("id", provisioningId);
  if (error) {
    console.error("Admin provisioning failure could not be recorded", { code: error.code });
  }
}

async function reserveProvisioning(
  adminClient: ReturnType<typeof getAdminClient>,
  loginName: string,
  role: (typeof CREATABLE_ADMIN_ROLES)[number],
  requestedBy: string,
) {
  const now = new Date().toISOString();
  const { data: existing, error: existingError } = await adminClient
    .from("admin_provisioning")
    .select("id,auth_user_id,status")
    .eq("login_name", loginName)
    .maybeSingle();
  if (existingError) redirectWithError("unavailable");

  if (existing) {
    if (existing.status !== "failed") redirectWithError("name_taken");
    const { data: retried, error: retryError } = await adminClient
      .from("admin_provisioning")
      .update({
        role,
        requested_by: requestedBy,
        status: "pending",
        last_error: null,
        updated_at: now,
      })
      .eq("id", existing.id)
      .eq("status", "failed")
      .select("id,auth_user_id,status")
      .maybeSingle();
    if (retryError || !retried) redirectWithError("name_taken");
    return retried;
  }

  const { data: created, error: createError } = await adminClient
    .from("admin_provisioning")
    .insert({
      login_name: loginName,
      role,
      requested_by: requestedBy,
      status: "pending",
    })
    .select("id,auth_user_id,status")
    .single();
  if (!createError && created) return created;

  if (createError?.code === "23505") {
    const { data: raced } = await adminClient
      .from("admin_provisioning")
      .select("id,auth_user_id,status")
      .eq("login_name", loginName)
      .maybeSingle();
    if (raced?.status === "failed") return reserveProvisioning(adminClient, loginName, role, requestedBy);
    redirectWithError("name_taken");
  }

  console.error("Admin provisioning reservation failed", { code: errorCode(createError) });
  redirectWithError("unavailable");
}

export async function createAdmin(formData: FormData) {
  const admin = await requireAdmin(["owner"]);
  const parsed = parseCreateAdminFormData(formData);
  if (parsed.error || !parsed.value) redirectWithError(parsed.error ?? "invalid");

  const { loginName, password, role } = parsed.value;
  const legacyConfig = readAdminLoginConfig(process.env);
  if (legacyConfig?.loginName === loginName) redirectWithError("name_taken");
  const authEmail = buildInternalAdminEmail(loginName, process.env);
  if (!authEmail) redirectWithError("config");

  const adminClient = getAdminClient();
  const { data: existingMember, error: memberLookupError } = await adminClient
    .from("admin_members")
    .select("user_id")
    .eq("login_name", loginName)
    .maybeSingle();
  if (memberLookupError) redirectWithError("unavailable");
  if (existingMember) redirectWithError("name_taken");

  const provisioning = await reserveProvisioning(adminClient, loginName, role, admin.user.id);
  let authUserId = provisioning.auth_user_id as string | null;

  if (authUserId) {
    const { error: passwordError } = await adminClient.auth.admin.updateUserById(authUserId, { password });
    if (passwordError) {
      await markProvisioningFailed(adminClient, provisioning.id, `password_update:${errorCode(passwordError)}`);
      console.error("Provisioned admin password update failed", { code: errorCode(passwordError) });
      redirectWithError("provisioning");
    }
  } else {
    const { data: createdUser, error: authError } = await adminClient.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
    });
    if (authError || !createdUser.user?.id) {
      await markProvisioningFailed(adminClient, provisioning.id, `auth_create:${errorCode(authError)}`);
      console.error("Admin Auth user creation failed", { code: errorCode(authError) });
      redirectWithError("provisioning");
    }
    authUserId = createdUser.user.id;
    const { error: userRecordError } = await adminClient
      .from("admin_provisioning")
      .update({ auth_user_id: authUserId, updated_at: new Date().toISOString() })
      .eq("id", provisioning.id);
    if (userRecordError) {
      await markProvisioningFailed(adminClient, provisioning.id, `record_auth_user:${userRecordError.code}`);
      console.error("Admin Auth user reference could not be recorded", { code: userRecordError.code });
      redirectWithError("provisioning");
    }
  }

  const { error: membershipError } = await adminClient
    .from("admin_members")
    .insert({ user_id: authUserId, login_name: loginName, role });
  if (membershipError) {
    await markProvisioningFailed(adminClient, provisioning.id, `membership:${membershipError.code}`);
    console.error("Admin membership activation failed", { code: membershipError.code });
    redirectWithError("activation");
  }

  const { error: activationError } = await adminClient
    .from("admin_provisioning")
    .update({ status: "active", last_error: null, updated_at: new Date().toISOString() })
    .eq("id", provisioning.id);
  if (activationError) {
    console.error("Admin provisioning status update failed", { code: activationError.code });
  }

  revalidatePath(ADMIN_MEMBERS_PATH);
  redirect(`${ADMIN_MEMBERS_PATH}?created=1`);
}

export async function claimMyAdminUsername(formData: FormData) {
  const admin = await requireAdmin(["owner"]);
  const loginNameValue = formData.get("loginName");
  const loginName = typeof loginNameValue === "string" ? normalizeAdminLoginName(loginNameValue) : null;
  if (!loginName) redirectWithError("invalid_name");

  const legacyConfig = readAdminLoginConfig(process.env);
  if (legacyConfig?.loginName !== loginName) {
    const adminClient = getAdminClient();
    const [{ data: existingMember, error: memberLookupError }, { data: existingProvisioning, error: provisioningLookupError }] = await Promise.all([
      adminClient
        .from("admin_members")
        .select("user_id")
        .eq("login_name", loginName)
        .maybeSingle(),
      adminClient
        .from("admin_provisioning")
        .select("id")
        .eq("login_name", loginName)
        .maybeSingle(),
    ]);
    if (memberLookupError || provisioningLookupError) redirectWithError("unavailable");
    if (existingProvisioning) redirectWithError("name_taken");
    if (existingMember && existingMember.user_id !== admin.user.id) redirectWithError("name_taken");
  } else {
    const { data: existingProvisioning, error: provisioningLookupError } = await getAdminClient()
      .from("admin_provisioning")
      .select("id")
      .eq("login_name", loginName)
      .maybeSingle();
    if (provisioningLookupError) redirectWithError("unavailable");
    if (existingProvisioning) redirectWithError("name_taken");
  }

  const { error } = await getAdminClient()
    .from("admin_members")
    .update({ login_name: loginName })
    .eq("user_id", admin.user.id)
    .is("login_name", null);
  if (error) {
    console.error("Owner username claim failed", { code: error.code });
    redirectWithError("unavailable");
  }

  revalidatePath(ADMIN_MEMBERS_PATH);
  redirect(`${ADMIN_MEMBERS_PATH}?claimed=1`);
}
