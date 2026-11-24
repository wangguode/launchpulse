"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
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
    <div className="min-h-screen bg-[var(--apple-bg)] text-[var(--apple-ink)] flex flex-col">
      <header className="sticky top-0 z-30 apple-glass border-b border-[var(--apple-border)]">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-[15px] tracking-tight text-[var(--apple-ink)]"
          >
            <BrandMark className="w-5 h-5" />
            <span>LaunchPulse</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <LangSwitcher />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-14">
        <div className="w-full max-w-[400px] rounded-[24px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-8 shadow-[var(--apple-shadow)] space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <BrandMark className="w-9 h-9" />
            </div>
            <h1 className="apple-display text-2xl font-semibold text-[var(--apple-ink)]">
              {mode === "login" ? v2.auth.loginTitle : v2.auth.registerTitle}
            </h1>
            <p className="text-[13px] text-[var(--apple-ink-secondary)] leading-relaxed">
              {mode === "login" ? v2.auth.loginSub : v2.auth.registerSub}
            </p>
          </div>

          {/* Apple 分段切换器 */}
          <div className="grid grid-cols-2 rounded-lg bg-[var(--apple-bg-alt)] border border-[var(--apple-border)] p-0.5 text-[13px]">
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`py-1.5 rounded-md transition cursor-pointer ${
                mode === "register"
                  ? "bg-[var(--apple-surface)] text-[var(--apple-ink)] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                  : "text-[var(--apple-ink-secondary)] hover:text-[var(--apple-ink)]"
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
              className={`py-1.5 rounded-md transition cursor-pointer ${
                mode === "login"
                  ? "bg-[var(--apple-surface)] text-[var(--apple-ink)] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                  : "text-[var(--apple-ink-secondary)] hover:text-[var(--apple-ink)]"
              }`}
            >
              {v2.auth.tabLogin}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                  {v2.auth.nameLabel}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={v2.auth.namePlaceholder}
                  className="w-full rounded-xl border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2.5 text-[16px] sm:text-[14px] text-[var(--apple-ink)] focus:border-[var(--apple-blue)] focus:outline-none"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                {v2.auth.emailLabel}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={v2.auth.emailPlaceholder}
                className="w-full rounded-xl border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2.5 text-[16px] sm:text-[14px] text-[var(--apple-ink)] focus:border-[var(--apple-blue)] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                {v2.auth.passwordLabel}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={v2.auth.passwordPlaceholder}
                className="w-full rounded-xl border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2.5 text-[16px] sm:text-[14px] text-[var(--apple-ink)] focus:border-[var(--apple-blue)] focus:outline-none"
              />
            </div>

            {error && <p className="text-[12px] text-[var(--apple-red)]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full bg-[var(--apple-blue)] hover:bg-[var(--apple-blue-hover)] text-white font-medium text-[14px] transition inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {v2.auth.submitting}
                </>
              ) : mode === "login" ? (
                v2.auth.loginBtn
              ) : (
                v2.auth.registerBtn
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-[var(--apple-border)] text-center space-y-1 text-[12px] text-[var(--apple-ink-secondary)]">
            <p>{v2.auth.portalHint}</p>
            <Link
              href="/portal"
              className="inline-flex items-center gap-0.5 text-[var(--apple-blue)] hover:underline"
            >
              {v2.auth.portalLink} <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
