import Image from "next/image";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const errorMessage = error === "config"
    ? "Admin authentication is not configured."
    : error === "invalid_credentials"
      ? "Invalid admin name or password."
      : error === "not_authorized"
        ? "This account is not authorized for the dashboard."
        : error === "unavailable"
          ? "Admin authentication is temporarily unavailable. Try again shortly."
        : error === "callback"
          ? "That sign-in link is invalid or expired."
          : null;
  return <main className="grid min-h-screen bg-[#f7f7f4] p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,28rem)] lg:gap-14 lg:p-12"><section className="relative hidden min-h-[calc(100vh-6rem)] overflow-hidden rounded-[28px] bg-[#17211e] p-9 text-white lg:flex"><Image src="/admin-signin-hero.webp" alt="" fill priority sizes="(min-width: 1024px) 50vw, 0px" className="object-cover"/><div className="login-hero-overlay absolute inset-0" aria-hidden="true"/><div className="relative z-10 flex h-full flex-col justify-between"><div><div className="flex items-center gap-3"><Image src="/eggplant-mascot.png" width={50} height={50} alt=""/><div><p className="text-xl font-bold tracking-tight">Eggplant</p><p className="text-sm font-semibold text-[#b4e5ba]">Admin</p></div></div><div className="mt-24 max-w-lg"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#b4e5ba]">Admin workspace</p><h2 className="mt-4 text-5xl font-bold leading-[1.02] tracking-[-.05em]">Keep every scan moving.</h2><p className="mt-5 max-w-md text-base leading-7 text-[#e0e9df]">Review shared photos, publish disease guidance, and keep the mobile catalog current from one controlled workspace.</p></div></div><div className="flex items-center gap-3 text-sm text-[#d6e1d6]"><span className="h-2 w-2 rounded-full bg-[#8fe2a0]"/>Authenticated access · audited actions</div></div></section><section className="surface fade-up my-auto w-full max-w-md justify-self-center p-7 sm:p-9 lg:max-w-none"><div className="flex items-center gap-3 lg:hidden"><Image src="/eggplant-mascot.png" width={50} height={50} alt=""/><div><h1 className="text-2xl font-bold tracking-tight">Eggplant Admin</h1><p className="text-sm font-semibold text-[#278b3d]">Admin dashboard</p></div></div><div className="hidden lg:block"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#278b3d]">Sign in</p><h1 className="mt-2 text-3xl font-bold tracking-[-.03em]">Welcome back.</h1><p className="mt-2 text-sm leading-6 text-[#6f6b80]">Use your admin name and password to open the admin workspace.</p></div>{errorMessage && <p role="alert" className="mt-5 rounded-xl bg-[#fff0f2] p-3 text-sm text-[#a92f40]">{errorMessage}</p>}<LoginForm/></section></main>;
}
