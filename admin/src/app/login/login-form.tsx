import { KeyRound, UserRound } from "lucide-react";
import { FormSubmitButton } from "@/components/form-submit-button";
import { ADMIN_LOGIN_NAME_HTML_PATTERN } from "@/lib/admin-credentials";
import { signInAdmin } from "./actions";

export function LoginForm() {
  return <form action={signInAdmin} className="mt-7 space-y-4">
    <label className="block"><span className="mb-2 block text-sm font-semibold">Admin name</span><div className="flex items-center gap-2 rounded-xl border border-[#ded9e8] bg-white px-3 focus-within:ring-3 focus-within:ring-[#512b91]/20"><UserRound size={18} className="text-[#777286}"/><input required name="name" type="text" autoComplete="username" maxLength={64} pattern={ADMIN_LOGIN_NAME_HTML_PATTERN} className="h-12 min-w-0 flex-1 outline-none" placeholder="admin"/></div></label>
    <label className="block"><span className="mb-2 block text-sm font-semibold">Password</span><div className="flex items-center gap-2 rounded-xl border border-[#ded9e8] bg-white px-3 focus-within:ring-3 focus-within:ring-[#512b91]/20"><KeyRound size={18} className="text-[#777286}"/><input required name="password" type="password" autoComplete="current-password" maxLength={128} className="h-12 min-w-0 flex-1 outline-none" placeholder="Enter your password"/></div></label>
    <FormSubmitButton label="Sign in" pendingLabel="Signing in" className="h-12 w-full bg-[#512b91] text-white shadow-[0_10px_24px_rgba(81,43,145,.22)] transition-transform hover:-translate-y-0.5" icon={<KeyRound size={18}/>} />
    <p className="text-xs leading-5 text-[#777286]">Only configured administrators can sign in. Dashboard access still requires an allowlisted Supabase admin membership.</p>
  </form>;
}
