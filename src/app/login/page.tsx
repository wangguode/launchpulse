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
 * 标准官方 shadcn/ui 认证页（/login）
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
        setError(data.error || (isZh ? "认证失败，请核对邮箱与密码。" : "Authentication failed."));
        return;
      }
      router.push("/dashboard");
    } catch {
      setError(isZh ? "网络异常，请重试。" : "Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-14 border-b px-4 sm:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-sm">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BrandMark className="size-4" tone="light" />
          </div>
          <span>LaunchPulse</span>
        </Link>
        <div className="flex items-center gap-2">
          <LangSwitcher />
          <ThemeModeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">
              {mode === "register" ? (isZh ? "创建你的增长指挥台" : "Create account") : isZh ? "欢迎回到 LaunchPulse" : "Sign in"}
            </CardTitle>
            <CardDescription>
              {isZh ? "管理 100+ 目录排期、求购收件箱与美元归因。" : "Manage directory distribution, buyer inbox & attribution."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Tabs value={mode} onValueChange={(v) => { setMode(v as "register" | "login"); setError(""); }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="register">{isZh ? "免费注册" : "Register"}</TabsTrigger>
                <TabsTrigger value="login">{isZh ? "账号登录" : "Sign In"}</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === "register" && (
                <div className="space-y-1.5">
                  <Label>{isZh ? "称呼 / 团队名" : "Name"}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex / AcmeFlow" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>{isZh ? "工作邮箱" : "Email"}</Label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@your-saas.com" />
              </div>
              <div className="space-y-1.5">
                <Label>{isZh ? "密码（至少 6 位）" : "Password"}</Label>
                <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (isZh ? "提交中..." : "Submitting...") : mode === "register" ? (isZh ? "创建账号并进入" : "Create Account") : isZh ? "立即登录" : "Sign In"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
            <Link href="/dashboard?sample=1" className="text-primary hover:underline">
              {isZh ? "免登录体验演示 →" : "Live Sandbox →"}
            </Link>
            <Link href="/portal" className="hover:text-foreground">
              {isZh ? "旧订单查询" : "Order Lookup"}
            </Link>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
