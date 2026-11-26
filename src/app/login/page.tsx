"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * LaunchPulse V8 光学磨砂极简认证页（/login）
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
  const [prefillUrl, setPrefillUrl] = useState("");

  useEffect(() => {
    const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const u = sp?.get("url")?.trim() || "";
    if (u) setPrefillUrl(u);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { authenticated?: boolean }) => {
        if (d.authenticated) {
          router.replace(u ? `/dashboard?newUrl=${encodeURIComponent(u)}` : "/dashboard");
        }
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
        setError(data.error || (isZh ? "认证失败，请核对邮箱与密码。" : "Authentication failed."));
        return;
      }
      router.push(prefillUrl ? `/dashboard?newUrl=${encodeURIComponent(prefillUrl)}` : "/dashboard");
    } catch {
      setError(isZh ? "网络异常，请重试。" : "Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-foreground flex flex-col">
      <div className="px-4 pt-3 sm:px-6">
        <header className="lp-frosted-topbar mx-auto flex h-14 max-w-5xl items-center justify-between rounded-2xl px-4 sm:px-5">
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-[15px] tracking-tight">
            <div className="lp-btn-bevel flex size-8 items-center justify-center rounded-[10px]">
              <BrandMark className="size-4" tone="light" />
            </div>
            <span>LaunchPulse</span>
          </Link>
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <ThemeModeToggle />
          </div>
        </header>
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-[400px]">
          <CardHeader className="space-y-1.5">
            <CardTitle className="text-xl font-semibold tracking-tight">
              {mode === "register" ? (isZh ? "创建你的增长指挥台" : "Create workspace") : isZh ? "欢迎回到 LaunchPulse" : "Sign in"}
            </CardTitle>
            <CardDescription>
              {isZh ? "管理 100+ 高权目录排期、求购雷达与美元归因。" : "Manage directory distribution, buyer radar & revenue attribution."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Tabs value={mode} onValueChange={(v) => { setMode(v as "register" | "login"); setError(""); }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="register">{isZh ? "免费注册" : "Register"}</TabsTrigger>
                <TabsTrigger value="login">{isZh ? "账号登录" : "Sign In"}</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-1.5">
                  <Label className="text-[13px]">{isZh ? "产品或团队名称" : "Workspace Name"}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex / StatementFlow" className="h-10" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-[13px]">{isZh ? "工作邮箱" : "Work Email"}</Label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@your-saas.com" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">{isZh ? "密码（至少 6 位）" : "Password"}</Label>
                <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-10" />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? (isZh ? "提交中..." : "Submitting...") : mode === "register" ? (isZh ? "创建账号并进入 →" : "Create Workspace →") : isZh ? "立即进入指挥台 →" : "Sign In →"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex items-center justify-between text-[13px] text-muted-foreground">
            <Link href="/dashboard?sample=1" className="font-medium text-foreground hover:text-accent-cobalt transition-colors">
              {isZh ? "免登录体验沙盒 →" : "Live Sandbox →"}
            </Link>
            <Link href="/portal" className="hover:text-foreground transition-colors">
              {isZh ? "订单查询" : "Order Lookup"}
            </Link>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
