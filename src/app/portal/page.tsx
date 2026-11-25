"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import Button from "@/components/ui/Button";

/**
 * V3 统一免密登录跳板（/portal）：
 * 彻底消除 /portal 与 /dashboard 双轨割裂——
 * 1. 携带 ?token=xxx 时自动调用 /api/auth/magic-exchange 建档并签发 HttpOnly Cookie，秒跳 /dashboard；
 * 2. 未携带 token 时，支持付费客户输入邮箱收取 Magic Link、直接粘贴 Token，或一键体验 /dashboard 演示模式。
 */
export default function PortalBridgePage() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const isZh = locale === "zh";
  const isJa = locale === "ja";

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [exchanging, setExchanging] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const exchangeToken = async (token: string) => {
    setExchanging(true);
    setError("");
    try {
      const res = await fetch("/api/auth/magic-exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        router.replace("/dashboard");
        return;
      }
      setError(data.error || t.portal.noOrderFallback);
    } catch {
      setError(t.portal.lookupError);
    } finally {
      setExchanging(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token")?.trim();
    const demo = params.get("demo");
    if (demo) {
      router.replace("/dashboard?sample=1");
      return;
    }
    if (token) {
      exchangeToken(token);
      return;
    }
    // 若用户已经登录，直接进入统一 /dashboard 工作台
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { authenticated?: boolean }) => {
        if (d.authenticated) router.replace("/dashboard");
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = input.trim();
    if (!val) return;
    if (!val.includes("@")) {
      await exchangeToken(val);
      return;
    }
    setLoading(true);
    setError("");
    setFeedback("");
    try {
      const res = await fetch("/api/portal/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: val }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (res.ok) {
        setFeedback(
          data.message ||
            (isZh
              ? "若该邮箱存在有效订单，我们已向你的收件箱发送免密登录链接。"
              : "If an active order exists for this email, we sent a Magic Login Link to your inbox.")
        );
      } else {
        setError(data.error || t.portal.lookupError);
      }
    } catch {
      setError(t.portal.lookupError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--apple-bg)] text-[var(--apple-ink)] flex flex-col">
      <header className="sticky top-0 z-30 apple-glass border-b border-[var(--apple-border)]">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-[15px] tracking-tight text-[var(--apple-ink)]"
          >
            <BrandMark className="w-5 h-5" />
            <span>LaunchPulse</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ThemeSwitcher />
            </div>
            <LangSwitcher />
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-full lp-btn-primary text-[12px] font-medium transition"
            >
              {isZh ? "账号登录" : isJa ? "ログイン" : "Sign In"}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-14">
        {exchanging ? (
          <div className="text-center space-y-3">
            <Loader2 className="w-6 h-6 text-[var(--apple-blue)] animate-spin mx-auto" />
            <p className="text-[14px] text-[var(--apple-ink-secondary)]">
              {isZh
                ? "正在验证免密凭证并进入工作台..."
                : isJa
                ? "マジックリンクを認証しダッシュボードへ移動中..."
                : "Verifying your Magic Link and opening Dashboard..."}
            </p>
          </div>
        ) : (
          <section className="w-full max-w-[420px] rounded-[24px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-8 space-y-6 shadow-[var(--apple-shadow)]">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[var(--apple-bg-alt)] border border-[var(--apple-border)]">
                <KeyRound className="w-4 h-4 text-[var(--apple-blue)]" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--apple-blue)]">
                {t.portal.badge}
              </p>
              <h1 className="apple-display text-2xl font-semibold text-[var(--apple-ink)]">
                {t.portal.title}
              </h1>
              <p className="text-[13px] text-[var(--apple-ink-secondary)] leading-relaxed">
                {t.portal.subtitle}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.portal.inputPlaceholder}
                className="w-full rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2.5 text-[16px] sm:text-[14px] text-[var(--apple-ink)] placeholder:text-[var(--apple-ink-tertiary)] focus:border-[var(--apple-blue)] focus:outline-none"
              />
              <Button type="submit" disabled={loading} className="w-full" size="md">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {t.portal.checkingBtn}
                  </>
                ) : (
                  t.portal.submitBtn
                )}
              </Button>
            </form>

            {feedback && (
              <p className="text-[12px] text-[var(--apple-green)] bg-[var(--apple-green-soft)] rounded-xl p-3">
                {feedback}
              </p>
            )}
            {error && (
              <p className="text-[12px] text-[var(--apple-red)] bg-[var(--apple-red-soft)] rounded-xl p-3">
                {error}
              </p>
            )}

            <div className="pt-4 border-t border-[var(--apple-border)] text-center space-y-2.5">
              <p className="text-[12px] text-[var(--apple-ink-secondary)]">
                {t.portal.previewLabel}
              </p>
              <Link
                href="/dashboard?sample=1"
                className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-[var(--apple-border-strong)] hover:bg-[var(--apple-hover)] text-[13px] font-medium text-[var(--apple-ink)] transition"
              >
                {isZh
                  ? "免登录预览完整工作台（含示例数据）→"
                  : isJa
                  ? "サンプルデータでダッシュボードを見る →"
                  : "Preview Live Console (Sample Data) →"}
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
