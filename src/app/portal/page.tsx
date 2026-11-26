"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconKey, IconLoader2 } from "@tabler/icons-react";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

/**
 * 官方 shadcn/ui 免密登录与 Magic Link 跳板页（/portal）
 */
export default function PortalBridgePage() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const isZh = locale === "zh";

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
    const checkoutId = (params.get("checkout_id") || params.get("checkoutId") || "").trim();
    const demo = params.get("demo");
    if (demo) {
      router.replace("/dashboard?sample=1");
      return;
    }
    if (checkoutId) {
      setExchanging(true);
      fetch("/api/checkout/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId }),
      })
        .then((r) => r.json())
        .then((d: { ok?: boolean; redirectTo?: string; error?: string }) => {
          if (d.ok) {
            router.replace(d.redirectTo || "/dashboard?unlocked=1");
            return;
          }
          setError(d.error || t.portal.lookupError);
          setExchanging(false);
        })
        .catch(() => {
          setError(t.portal.lookupError);
          setExchanging(false);
        });
      return;
    }
    if (token) {
      void exchangeToken(token);
      return;
    }
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
    <div className="min-h-screen bg-transparent text-foreground flex flex-col">
      <div className="px-4 pt-3 sm:px-6">
        <header className="lp-frosted-topbar mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 rounded-2xl px-4 sm:px-5">
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-[15px] tracking-tight">
            <div className="lp-btn-bevel flex size-8 items-center justify-center rounded-[10px]">
              <BrandMark className="size-4" tone="light" />
            </div>
            <span>LaunchPulse</span>
          </Link>
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <ThemeModeToggle />
            <Button size="sm" variant="outline" render={<Link href="/login" />}>
              {isZh ? "账号登录" : "Sign In"}
            </Button>
          </div>
        </header>
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {exchanging ? (
          <div className="text-center space-y-3">
            <IconLoader2 className="size-6 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              {isZh ? "正在验证免密凭证并进入指挥台..." : "Verifying your Magic Link..."}
            </p>
          </div>
        ) : (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto flex size-10 items-center justify-center rounded-lg border bg-muted">
                <IconKey className="size-5 text-primary" />
              </div>
              <Badge variant="secondary" className="mx-auto">
                {t.portal.badge}
              </Badge>
              <CardTitle className="text-xl">{t.portal.title}</CardTitle>
              <CardDescription>{t.portal.subtitle}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t.portal.inputPlaceholder}
                />
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <IconLoader2 className="size-4 animate-spin" />
                      {t.portal.checkingBtn}
                    </>
                  ) : (
                    t.portal.submitBtn
                  )}
                </Button>
              </form>

              {feedback && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 rounded-md border bg-muted/50 p-3">
                  {feedback}
                </p>
              )}
              {error && (
                <p className="text-xs text-destructive rounded-md border border-destructive/30 bg-destructive/10 p-3">
                  {error}
                </p>
              )}
            </CardContent>

            <Separator />

            <CardFooter className="flex-col gap-2 pt-4">
              <p className="text-xs text-muted-foreground">{t.portal.previewLabel}</p>
              <Button variant="outline" size="sm" className="w-full" render={<Link href="/dashboard?sample=1" />}>
                {isZh ? "免登录体验完整增长指挥台 →" : "Preview Interactive Console →"}
              </Button>
            </CardFooter>
          </Card>
        )}
      </main>
    </div>
  );
}
