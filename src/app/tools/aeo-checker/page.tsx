"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  IconArrowUpRight,
  IconCheck,
  IconShieldCheck,
  IconX,
} from "@tabler/icons-react";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface AeoScanPayload {
  domain: string;
  origin: string;
  title: string;
  score: number;
  subScores: { seo: number; aeo: number; social: number; security: number };
  leaks: Array<{ severity: string; category: string; title: string; evidence: string }>;
  diagnostics: {
    ttfbMs: number;
    httpsEnabled: boolean;
    canonical: string;
    h1: string;
    h2Count: number;
    metaDescLength: number;
    sitemapValid: boolean;
    robotsPresent: boolean;
    llmsTxt: { exists: boolean; wordCount: number; generatedPreview: string };
    socialPreview: { ogTitle: string; ogDesc: string; ogImage: string; twitterCard: string };
    jsonLd: { count: number; hasSoftwareSchema: boolean; hasFaqSchema: boolean };
    aiCrawlers: Array<{ bot: string; engine: string; allowed: boolean }>;
    securityHeaders: Record<string, boolean>;
  };
}

const DEFAULT_CRAWLERS = [
  { bot: "GPTBot", engine: "ChatGPT / OpenAI", allowed: true },
  { bot: "OAI-SearchBot", engine: "ChatGPT Search", allowed: true },
  { bot: "ClaudeBot", engine: "Claude / Anthropic", allowed: true },
  { bot: "PerplexityBot", engine: "Perplexity AI", allowed: true },
];

/**
 * 官方 shadcn/ui 12 项 AI 搜索可见度（AEO）只读体检台（/tools/aeo-checker）
 */
export default function AeoCheckerToolPage() {
  const { locale } = useI18n();
  const isZh = locale === "zh";

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resData, setResData] = useState<AeoScanPayload | null>(null);

  const runCheck = async (target: string) => {
    const cleaned = target.trim();
    if (!cleaned) return;
    setUrl(cleaned);
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleaned }),
      });
      const json = (await res.json()) as AeoScanPayload & { error?: string };
      if (!res.ok) {
        const msg = json.error || (isZh ? "体检失败，请检查网址是否可公网访问。" : "Audit failed.");
        setError(msg);
        toast.error(msg);
      } else {
        setResData(json);
        toast.success(isZh ? `${json.domain} 12 项体检完成：${json.score}/100` : `Audit complete: ${json.score}/100`);
      }
    } catch {
      setError(isZh ? "网络异常，请稍后重试。" : "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runCheck(url);
  };

  const crawlers = resData?.diagnostics?.aiCrawlers || DEFAULT_CRAWLERS;
  const subScores = resData?.subScores || { seo: 0, aeo: 0, social: 0, security: 0 };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-40 h-14 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight shrink-0">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <BrandMark className="size-4" tone="light" />
              </div>
              <span>LaunchPulse</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground truncate">{isZh ? "AEO 可见度体检" : "AEO Checker"}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-xs" render={<Link href="/tools/llms-txt-generator" />}>
              {isZh ? "llms.txt 生成器" : "llms.txt Studio"}
              <IconArrowUpRight className="size-3.5" />
            </Button>
            <LangSwitcher />
            <ThemeModeToggle />
            <Button size="sm" render={<Link href="/dashboard?sample=1" />}>
              {isZh ? "进入指挥台" : "Console"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* 左栏：输入与问题列表 */}
          <Card className="lg:col-span-6">
            <CardHeader>
              <CardTitle className="text-xl">
                {isZh ? "ChatGPT 与 Perplexity 能搜到你的产品吗？" : "Will ChatGPT & Perplexity cite your SaaS?"}
              </CardTitle>
              <CardDescription>
                {isZh
                  ? "100% 只读无害实测：核验 AI 爬虫放行规则、/llms.txt、JSON-LD 结构化数据与 6 项安全响应头。"
                  : "100% passive audit for AI crawler rules, /llms.txt presence, JSON-LD schema, OG tags, and security headers."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="text"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-saas.com"
                    className="font-mono text-sm"
                  />
                  <Button type="submit" disabled={loading} className="shrink-0">
                    <IconShieldCheck className="size-4" />
                    {loading ? (isZh ? "检测中..." : "Checking...") : isZh ? "开始 12 项体检" : "Run Audit"}
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span>{isZh ? "快速实测：" : "Try live:"}</span>
                  {["https://statementflow.win", "https://linear.app"].map((sample) => (
                    <Button
                      key={sample}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 font-mono text-xs"
                      onClick={() => void runCheck(sample)}
                    >
                      {sample.replace("https://", "")}
                    </Button>
                  ))}
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
              </form>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <h2 className="font-semibold">
                    {resData
                      ? isZh
                        ? `发现 ${resData.leaks.length} 项待优化项`
                        : `${resData.leaks.length} actionable findings`
                      : isZh
                        ? "12 项自动核查维度"
                        : "12 automated inspection checks"}
                  </h2>
                  {resData && (
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {resData.domain} · {resData.diagnostics.ttfbMs}ms
                    </span>
                  )}
                </div>

                {resData ? (
                  resData.leaks.length === 0 ? (
                    <div className="rounded-lg border p-4 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <IconCheck className="size-4 shrink-0" />
                      <span>{isZh ? "未发现明显拦截或元数据缺失，已具备良好收录基础。" : "No blocking issues detected."}</span>
                    </div>
                  ) : (
                    <div className="divide-y rounded-lg border">
                      {resData.leaks.map((lk, i) => (
                        <div key={i} className="p-3.5 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">{lk.title}</p>
                            <Badge variant={lk.severity === "critical" ? "destructive" : "secondary"} className="text-xs shrink-0">
                              {lk.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{lk.evidence}</p>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="divide-y rounded-lg border text-sm">
                    {[
                      isZh ? "GPTBot / OAI-SearchBot / ClaudeBot / PerplexityBot 放行状态" : "GPTBot / OAI-SearchBot / ClaudeBot / PerplexityBot policy",
                      isZh ? "/llms.txt 根目录存在性与 Markdown 实体结构检查" : "/llms.txt presence & Markdown structure",
                      isZh ? "SoftwareApplication & FAQ JSON-LD 结构化数据验证" : "SoftwareApplication & FAQ JSON-LD markup",
                      isZh ? "OpenGraph 社交预览卡片与 6 项 HTTPS 安全响应头" : "OpenGraph social card & 6 security headers",
                    ].map((item, idx) => (
                      <div key={idx} className="px-3.5 py-2.5 flex items-center gap-2.5 text-muted-foreground text-xs">
                        <span className="size-1.5 rounded-full bg-primary shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 右栏：总分与爬虫矩阵 */}
          <div className="lg:col-span-6 space-y-4">
            <Card>
              <CardHeader>
                <CardDescription>
                  {resData
                    ? isZh
                      ? `${resData.domain} 综合可见度得分`
                      : `${resData.domain} Readiness Score`
                    : isZh
                      ? "体检报告实时预览"
                      : "Live scorecard preview"}
                </CardDescription>
                <CardTitle className="text-4xl font-bold tabular-nums mt-1">
                  {resData ? resData.score : "—"}
                  <span className="text-base font-normal text-muted-foreground"> / 100</span>
                </CardTitle>
                {resData && (
                  <CardAction>
                    <Badge variant={resData.diagnostics.llmsTxt.exists ? "default" : "secondary"}>
                      {resData.diagnostics.llmsTxt.exists
                        ? isZh
                          ? "已配置 /llms.txt"
                          : "/llms.txt found"
                        : isZh
                          ? "缺少 /llms.txt"
                          : "Missing /llms.txt"}
                    </Badge>
                  </CardAction>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {resData && <Progress value={resData.score} />}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                  {(
                    [
                      { k: "seo", label: isZh ? "搜索基础" : "SEO" },
                      { k: "aeo", label: isZh ? "AI 可见度" : "AEO" },
                      { k: "social", label: isZh ? "社交分享" : "Social" },
                      { k: "security", label: isZh ? "安全响应头" : "Security" },
                    ] as const
                  ).map((dim) => (
                    <div key={dim.k} className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">{dim.label}</p>
                      <p className="font-mono text-xl font-semibold mt-1">{resData ? subScores[dim.k] : "—"}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{isZh ? "主流 AI 搜索引擎爬虫放行状态" : "AI Crawler Access Matrix"}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {crawlers.map((c) => (
                    <div key={c.bot} className="px-6 py-3 flex items-center justify-between gap-2 text-sm">
                      <div>
                        <span className="font-mono font-medium">{c.bot}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{c.engine}</span>
                      </div>
                      {resData ? (
                        c.allowed ? (
                          <Badge variant="secondary" className="gap-1">
                            <IconCheck className="size-3 text-emerald-500" />
                            {isZh ? "允许抓取" : "Allowed"}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <IconX className="size-3" />
                            {isZh ? "被拦截" : "Blocked"}
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline">{isZh ? "待检测" : "Ready"}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {resData && (
              <Card>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {isZh
                      ? "修复 AI 爬虫与元数据后，进入控制台启动 100+ 精选目录分发提升权威权重。"
                      : "Pair clean AEO metadata with 100+ directory backlinks for faster citations."}
                  </p>
                  <Button size="sm" className="shrink-0" render={<Link href="/dashboard?sample=1" />}>
                    {isZh ? "打开增长指挥台" : "Open Console"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
