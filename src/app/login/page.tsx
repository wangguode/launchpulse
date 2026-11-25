"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import Button from "@/components/ui/Button";

/**
 * V5 精密认证页（/login）：零多余阴影，母语中文优先，一键切 EN 与深浅色
 */
export default function LoginPage() {
  const { locale } = useI18n();
  const isZh = locale === "zh";
  const router = useRouter();

  const [mode, setMode] = useState<"register" | "login">("register");
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
        setError(data.error || (isZh ? "认证失败，请检查邮箱和密码。" : "Authentication failed."));
        return;
      }
      router.push("/dashboard");
    } catch {
      setError(isZh ? "网络异常，请稍后重试。" : "Network error. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-frame)] text-[var(--ink-primary)] flex flex-col">
      <header className="h-12 px-4 sm:px-6 border-b border-[var(--border-hairline)] flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold text-[14.5px] text-[var(--ink-primary)]">
          <BrandMark className="w-5 h-5" />
          <span>LaunchPulse</span>
        </Link>
        <div className="flex items-center gap-2">
          <LangSwitcher />
          <ThemeSwitcher />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[392px] rounded-[12px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] p-7 space-y-6">
          <div className="space-y-1.5">
            <h1 className="lp-display text-[21px] font-semibold text-[var(--ink-primary)]">
              {mode === "register"
                ? isZh
                  ? "创建你的增长指挥台"
                  : "Create your Command Center"
                : isZh
                  ? "欢迎回到 LaunchPulse"
                  : "Sign in to LaunchPulse"}
            </h1>
            <p className="text-[13px] text-[var(--ink-secondary)]">
              {mode === "register"
                ? isZh
                  ? "管理 100+ 目录排期、求购收件箱与美元归因。"
                  : "Manage 100+ directory submissions, buyer inbox & revenue attribution."
                : isZh
                  ? "登录继续查看今日待办行动流与外链验活回执。"
                  : "Sign in to review today's action flow and verified backlinks."}
            </p>
          </div>

          <div className="grid grid-cols-2 rounded-[7px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-0.5 text-[12.5px]">
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`py-1.5 rounded-[5px] lp-ease cursor-pointer ${
                mode === "register"
                  ? "bg-[var(--bg-sheet)] text-[var(--ink-primary)] font-semibold border border-[var(--border-hairline)]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              }`}
            >
              {isZh ? "免费注册" : "Create Account"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`py-1.5 rounded-[5px] lp-ease cursor-pointer ${
                mode === "login"
                  ? "bg-[var(--bg-sheet)] text-[var(--ink-primary)] font-semibold border border-[var(--border-hairline)]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              }`}
            >
              {isZh ? "账号登录" : "Sign In"}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === "register" && (
              <label className="block space-y-1">
                <span className="text-[12px] font-medium text-[var(--ink-secondary)]">
                  {isZh ? "称呼 / 团队名" : "Your Name"}
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isZh ? "例如：Alex / AcmeFlow" : "Alex Chen"}
                  className="w-full h-9 px-3 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[13.5px] text-[var(--ink-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
              </label>
            )}

            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[var(--ink-secondary)]">
                {isZh ? "工作邮箱" : "Work Email"}
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@your-saas.com"
                className="w-full h-9 px-3 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[13.5px] text-[var(--ink-primary)] outline-none focus:border-[var(--accent-primary)]"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[var(--ink-secondary)]">
                {isZh ? "密码（至少 6 位）" : "Password (6+ chars)"}
              </span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-9 px-3 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[13.5px] text-[var(--ink-primary)] outline-none focus:border-[var(--accent-primary)]"
              />
            </label>

            {error && <p className="text-[12px] text-[var(--status-danger)]">{error}</p>}

            <Button type="submit" variant="primary" size="md" loading={loading} className="w-full">
              {mode === "register" ? (isZh ? "创建账号并进入指挥台" : "Create Account") : isZh ? "立即登录" : "Sign In"}
            </Button>
          </form>

          <div className="pt-4 border-t border-[var(--border-hairline)] flex items-center justify-between text-[12px] text-[var(--ink-muted)]">
            <Link href="/dashboard?sample=1" className="text-[var(--accent-primary)] hover:underline">
              {isZh ? "先免登录体验演示 →" : "Try Live Sandbox →"}
            </Link>
            <Link href="/portal" className="hover:text-[var(--ink-primary)]">
              {isZh ? "旧订单自助查询" : "Order Lookup"}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
