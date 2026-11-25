"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconArrowUpRight, IconCheck, IconLoader2, IconShieldCheck } from "@tabler/icons-react";
import WarRoomClient from "@/components/WarRoomClient";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { StartupAuditReport } from "@/types/audit";

interface InstantScanPayload {
  domain: string;
  origin: string;
  title: string;
  tagline: string;
  score: number;
  subScores?: { seo: number; aeo: number; social: number; security: number };
  leaks: Array<{ severity: string; category: string; title: string; evidence: string }>;
  leads: Array<{ source: string; author: string; postedAt: string; title: string; excerpt: string; url: string; unlocked: boolean }>;
  diagnostics?: {
    ttfbMs: number;
    llmsTxt?: { exists: boolean; generatedPreview: string };
    aiCrawlers?: Array<{ bot: string; engine: string; allowed: boolean }>;
  };
}

/**
 * 动态实时诊断与战情报告路由（/audit/live）
 * 同时支持：
 * 1. ?s=<slug>  — 读取 D1 持久化战情报告交由 WarRoomClient 渲染
 * 2. ?url=<url> — 实时调用 POST /api/scan 生成完整 12 维诊断与买家线索视图（修复官网直达断链）
 */
export default function DynamicLiveAuditPage() {
  const { locale, t } = useI18n();
  const isZh = locale === "zh";

  const [report, setReport] = useState<StartupAuditReport | null>(null);
  const [instantScan, setInstantScan] = useState<InstantScanPayload | null>(null);
  const [errorKey, setErrorKey] = useState<"missingSlug" | "notFound" | "unableToLoad" | "">("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const slug = (params.get("s") || "").toLowerCase().replace(/[^a-z0-9-_]/g, "");
    const rawUrl = (params.get("url") || "").trim();

    if (rawUrl) {
      fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: rawUrl }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("unableToLoad");
          return (await res.json()) as InstantScanPayload;
        })
        .then((data) => {
          setInstantScan(data);
          setLoading(false);
        })
        .catch(() => {
          setErrorKey("unableToLoad");
          setLoading(false);
        });
      return;
    }

    if (!slug) {
      setErrorKey("missingSlug");
      setLoading(false);
      return;
    }

    fetch(`/api/audit/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("notFound");
        return (await res.json()) as StartupAuditReport;
      })
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        setErrorKey(err.message === "notFound" ? "notFound" : "unableToLoad");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-muted-foreground flex flex-col items-center justify-center gap-3">
        <IconLoader2 className="size-6 text-primary animate-spin" />
        <p className="text-sm">{t.liveAudit.loadingText}</p>
      </main>
    );
  }

  if (report) {
    return <WarRoomClient report={report} />;
  }

  if (instantScan) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="sticky top-0 z-40 h-14 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight shrink-0">
                <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <BrandMark className="size-4" tone="light" />
                </div>
                <span>LaunchPulse</span>
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="font-mono text-xs text-muted-foreground truncate">{instantScan.domain}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <LangSwitcher />
              <ThemeModeToggle />
              <Button size="sm" render={<Link href="/dashboard?sample=1" />}>
                {isZh ? "进入指挥台" : "Console"}
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 space-y-6">
          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <Badge variant="secondary">{isZh ? "实时无害诊断报告" : "Live Passive Audit"}</Badge>
                <CardTitle className="text-2xl">{instantScan.domain}</CardTitle>
                <CardDescription>{instantScan.tagline || instantScan.title}</CardDescription>
              </div>
              <div className="text-right tabular-nums">
                <p className="text-xs text-muted-foreground">{isZh ? "综合健康分" : "Readiness Score"}</p>
                <p className="text-4xl font-bold font-mono">{instantScan.score}/100</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={instantScan.score} />
              {instantScan.subScores && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                  {[
                    { k: isZh ? "搜索基础 SEO" : "SEO", v: instantScan.subScores.seo },
                    { k: isZh ? "AI 可见度 AEO" : "AEO", v: instantScan.subScores.aeo },
                    { k: isZh ? "社交与转化" : "Social", v: instantScan.subScores.social },
                    { k: isZh ? "安全响应头" : "Security", v: instantScan.subScores.security },
                  ].map((s) => (
                    <div key={s.k} className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">{s.k}</p>
                      <p className="font-mono text-xl font-semibold mt-0.5">{s.v}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <IconShieldCheck className="size-4 text-primary" />
                  {isZh ? `待优化增长漏洞 (${instantScan.leaks.length})` : `Growth Findings (${instantScan.leaks.length})`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {instantScan.leaks.length === 0 ? (
                  <p className="text-sm text-emerald-600 flex items-center gap-2">
                    <IconCheck className="size-4" />
                    {isZh ? "核心基线检查全部通过。" : "All baseline checks passed."}
                  </p>
                ) : (
                  instantScan.leaks.map((lk, i) => (
                    <div key={i} className="rounded-lg border p-3.5 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{lk.title}</p>
                        <Badge variant={lk.severity === "critical" ? "destructive" : "secondary"} className="text-xs">
                          {lk.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{lk.evidence}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isZh ? `实时匹配到的海外买家讨论 (${instantScan.leads.length})` : `Live Buyer Discussions (${instantScan.leads.length})`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {instantScan.leads.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {isZh
                      ? "登录后可在买家收件箱自定义核心痛点词与竞品词，24/7 扫描 Reddit / HN / GitHub。"
                      : "Sign in to configure custom pain keywords and scan Reddit / HN / GitHub."}
                  </p>
                ) : (
                  instantScan.leads.map((ld, i) => (
                    <div key={i} className="rounded-lg border p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{ld.source} · {ld.author}</span>
                        <span>{ld.postedAt}</span>
                      </div>
                      <p className="text-sm font-medium">{ld.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{ld.excerpt}</p>
                      <a
                        href={ld.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {isZh ? "查看原帖" : "Open thread"}
                        <IconArrowUpRight className="size-3.5" />
                      </a>
                    </div>
                  ))
                )}
                <Button className="w-full" render={<Link href="/login" />}>
                  {isZh ? "免费注册并在控制台一键导入此站点" : "Create Free Workspace for This Site"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg font-semibold">
        {errorKey ? t.liveAudit[errorKey] : t.liveAudit.notFound}
      </p>
      <Button render={<Link href="/" />}>{t.common.runFreeScan} →</Button>
    </main>
  );
}
