"use server";

import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseAdminLoginFormData, readAdminLoginConfig } from "./credentials";

const INVALID_CREDENTIALS_PATH = "/login?error=invalid_credentials";
const CONFIGURATION_ERROR_PATH = "/login?error=config";
const AUTH_UNAVAILABLE_PATH = "/login?error=unavailable";

async function resolveAdminEmail(loginName: string): Promise<string | null> {
  const adminClient = getAdminClient();
  const { data: member, error: memberError } = await adminClient
    .from("admin_members")
    .select("user_id")
    .eq("login_name", loginName)
    .maybeSingle();

  if (memberError) {
    console.error("Admin login membership lookup failed", { code: memberError.code });
    redirect(AUTH_UNAVAILABLE_PATH);
  }

  if (member?.user_id) {
    const { data: userResult, error: userError } = await adminClient.auth.admin.getUserById(member.user_id);
    if (userError) {
      console.error("Admin login Auth lookup failed", { code: userError.code, status: userError.status });
      redirect(AUTH_UNAVAILABLE_PATH);
    }
    return userResult.user?.email ?? null;
  }

  const legacyConfig = readAdminLoginConfig(process.env);
  return legacyConfig?.loginName === loginName ? legacyConfig.email : null;
}

export async function signInAdmin(formData: FormData) {
  const input = parseAdminLoginFormData(formData);

  if (!input) {
    redirect(INVALID_CREDENTIALS_PATH);
  }

  const email = await resolveAdminEmail(input.loginName);
  if (!email) {
    redirect(readAdminLoginConfig(process.env) ? INVALID_CREDENTIALS_PATH : CONFIGURATION_ERROR_PATH);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  });

  if (error) {
    redirect(INVALID_CREDENTIALS_PATH);
  }

  redirect("/overview");
}
