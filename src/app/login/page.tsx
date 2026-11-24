"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import LangSwitcher from "@/components/LangSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { V2_DICTIONARIES } from "@/lib/v2-i18n";

export default function LoginPage() {
  const { locale, t } = useI18n();
  const v2 = V2_DICTIONARIES[locale];
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { authenticated?: boolean }) => {
        if (d.authenticated) router.replace("/dashboard");
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload = mode === "register" ? { name, email, password } : { email, password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Authentication failed.");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090d] text-slate-100 obsidian-grid flex flex-col">
      <header className="border-b border-white/10 bg-[#07090d]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-[family-name:var(--font-display)] font-bold text-white tracking-tight"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
            <span>LaunchPulse</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <ThemeSwitcher />
            <LangSwitcher />
            <Link href="/" className="text-xs text-slate-400 hover:text-white transition">
              {t.common.backToHome}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c1018] p-7 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-[family-name:var(--font-mono)]">
              <ShieldCheck className="w-3.5 h-3.5" /> {v2.auth.badge}
            </div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
              {mode === "login" ? v2.auth.loginTitle : v2.auth.registerTitle}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {mode === "login" ? v2.auth.loginSub : v2.auth.registerSub}
            </p>
          </div>

          <div className="grid grid-cols-2 rounded-xl bg-black/40 p-1 border border-white/10 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`py-2 rounded-lg transition cursor-pointer ${
                mode === "register"
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {v2.auth.tabRegister}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`py-2 rounded-lg transition cursor-pointer ${
                mode === "login"
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {v2.auth.tabLogin}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">{v2.auth.nameLabel}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={v2.auth.namePlaceholder}
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">{v2.auth.emailLabel}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={v2.auth.emailPlaceholder}
                className="w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm font-[family-name:var(--font-mono)] text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">{v2.auth.passwordLabel}</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={v2.auth.passwordPlaceholder}
                className="w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              />
            </div>

            {error && (
              <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {v2.auth.submitting}
                </>
              ) : (
                <>
                  {mode === "login" ? v2.auth.loginBtn : v2.auth.registerBtn}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-white/10 flex flex-col gap-1.5 text-xs text-slate-400">
            <span>{v2.auth.portalHint}</span>
            <Link
              href="/portal"
              className="inline-flex items-center gap-1.5 text-emerald-400 hover:underline font-medium"
            >
              <KeyRound className="w-3.5 h-3.5" /> {v2.auth.portalLink}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
