"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  IconArrowRight,
  IconArrowUpRight,
  IconCheck,
  IconCopy,
  IconDownload,
  IconFileCode,
  IconLoader2,
  IconShieldCheck,
} from "@tabler/icons-react";
import WarRoomClient from "@/components/WarRoomClient";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  leads: Array<{
    source: string;
    author: string;
    postedAt: string;
    title: string;
    excerpt: string;
    url: string;
    unlocked: boolean;
  }>;
  diagnostics?: {
    ttfbMs: number;
    llmsTxt?: { exists: boolean; generatedPreview: string };
    aiCrawlers?: Array<{ bot: string; engine: string; allowed: boolean }>;
  };
}

const LP_SCAN_HISTORY_KEY = "lp_scan_history_v1";

/**
 * 动态实时诊断与战情报告路由（/audit/live）
 * 同时支持：
 * 1. ?s=<slug>  — 读取 D1 持久化战情报告交由 WarRoomClient 渲染
 * 2. ?url=<url> — 实时调用 POST /api/scan 交付完整 12 维诊断、即用型 /llms.txt 生成代码与预结账转化舱
 */
export default function DynamicLiveAuditPage() {
  const { locale, t } = useI18n();
  const isZh = locale === "zh";

  const [report, setReport] = useState<StartupAuditReport | null>(null);
  const [instantScan, setInstantScan] = useState<InstantScanPayload | null>(null);
  const [errorKey, setErrorKey] = useState<"missingSlug" | "notFound" | "unableToLoad" | "">("");
  const [loading, setLoading] = useState(true);
  const [copiedLlms, setCopiedLlms] = useState(false);

  const [checkoutPlanDialog, setCheckoutPlanDialog] = useState<"blitz" | "dfy" | null>(null);
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [submittingCheckout, setSubmittingCheckout] = useState(false);

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
          try {
            const existingRaw = window.localStorage.getItem(LP_SCAN_HISTORY_KEY);
            const prev = existingRaw ? (JSON.parse(existingRaw) as Array<{ domain: string; origin: string; firstScore: number; latestScore: number; scannedAt: string }>) : [];
            const matched = prev.find((p) => p.domain === data.domain);
            const next = [
              {
                domain: data.domain,
                origin: data.origin,
                firstScore: matched ? matched.firstScore : data.score,
                latestScore: data.score,
                scannedAt: new Date().toISOString(),
              },
              ...prev.filter((p) => p.domain !== data.domain),
            ].slice(0, 6);
            window.localStorage.setItem(LP_SCAN_HISTORY_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
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

  const handleConfirmLiveCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPlanDialog || !instantScan) return;
    setSubmittingCheckout(true);
    try {
      const cleanEmail = checkoutEmail.trim().toLowerCase();
      fetch("/api/lead-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          targetUrl: instantScan.origin,
          plan: checkoutPlanDialog,
        }),
        keepalive: true,
      }).catch(() => {});

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: checkoutPlanDialog,
          email: cleanEmail,
          slug: instantScan.domain,
          targetUrl: instantScan.origin,
        }),
      });
      const d = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (res.ok && d.checkoutUrl) {
        window.location.href = d.checkoutUrl;
        return;
      }
      toast.error(
        d.error ||
          (isZh
            ? "无法启动结账会话，请稍后重试或发送邮件至 hello@statementflow.win"
            : "Could not start checkout right now. Please retry or email hello@statementflow.win.")
      );
    } catch {
      toast.error(isZh ? "网络异常，请重试" : "Network error while starting checkout.");
    } finally {
      setSubmittingCheckout(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-transparent text-muted-foreground flex flex-col items-center justify-center gap-3">
        <IconLoader2 className="size-6 text-accent-cobalt animate-spin" />
        <p className="text-sm">{t.liveAudit.loadingText}</p>
      </main>
    );
  }

  if (report) {
    return <WarRoomClient report={report} />;
  }

  if (instantScan) {
    const llmsPreview = instantScan.diagnostics?.llmsTxt?.generatedPreview || "";

    return (
      <div className="min-h-screen bg-transparent text-foreground flex flex-col">
        <div className="sticky top-3 z-40 px-4 sm:px-6">
          <header className="lp-frosted-topbar mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 rounded-2xl px-4 sm:px-5">
            <div className="flex items-center gap-2.5 text-sm min-w-0">
              <Link href="/" className="flex items-center gap-2.5 font-semibold text-[15px] tracking-tight shrink-0">
                <div className="lp-btn-bevel flex size-8 items-center justify-center rounded-[10px]">
                  <BrandMark className="size-4" tone="light" />
                </div>
                <span>LaunchPulse</span>
              </Link>
              <span className="text-muted-foreground opacity-50">/</span>
              <span className="font-mono text-xs text-muted-foreground truncate">{instantScan.domain}</span>
            </div>
            <div className="flex items-center gap-2">
              <LangSwitcher />
              <ThemeModeToggle />
              <Button size="sm" render={<Link href="/dashboard?sample=1" />}>
                {isZh ? "进入指挥台" : "Console"}
              </Button>
            </div>
          </header>
        </div>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
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

          {/* 免费即时高价值交付物：自动为该域名生成的 /llms.txt 标准清单（先给真价值，再自然承接外链分发付费） */}
          {llmsPreview && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <IconFileCode className="size-4 text-primary" />
                    {instantScan.diagnostics?.llmsTxt?.exists
                      ? isZh
                        ? `检测到已部署 /llms.txt · 标准优化版预览`
                        : `/llms.txt Detected · Optimized Index Preview`
                      : isZh
                      ? `免费为您生成的即用型 /llms.txt 清单（部署至 public/llms.txt 立涨 +18 分）`
                      : `Ready-to-Deploy /llms.txt Manifest for ${instantScan.domain} (+18 AEO pts)`}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isZh
                      ? "让 ChatGPT Search、Claude 与 Perplexity 准确抓取您的核心功能与定价，部署后随时回到本页免费复测涨分。"
                      : "Help ChatGPT Search, Claude & Perplexity cite your exact product positioning. Deploy to /public/llms.txt and re-scan free."}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard
                        .writeText(llmsPreview)
                        .then(() => {
                          setCopiedLlms(true);
                          toast.success(isZh ? "已复制 /llms.txt 内容" : "Copied /llms.txt to clipboard");
                        })
                        .catch(() => {});
                    }}
                  >
                    {copiedLlms ? <IconCheck className="size-3.5 text-emerald-500" /> : <IconCopy className="size-3.5" />}
                    {isZh ? "一键复制" : "Copy"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const blob = new Blob([llmsPreview], { type: "text/plain;charset=utf-8" });
                      const u = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = u;
                      a.download = "llms.txt";
                      a.click();
                      URL.revokeObjectURL(u);
                    }}
                  >
                    <IconDownload className="size-3.5" />
                    {isZh ? "下载 llms.txt" : "Download .txt"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="max-h-48 overflow-auto rounded-xl border bg-muted/40 p-3.5 font-mono text-xs leading-relaxed text-foreground">
                  {llmsPreview}
                </pre>
              </CardContent>
            </Card>
          )}

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
              </CardContent>
            </Card>
          </div>

          {/* 清晰 ROI 价值锚点与双阶行动舱（消除 25 小时人工填表苦力） */}
          <Card className="border-primary/40">
            <CardContent className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-xl">
                <Badge variant="outline" className="text-xs">
                  {isZh ? "省去 25 小时枯燥手工注册填表" : "Save ~25 Founder Hours of Manual Directory Forms"}
                </Badge>
                <h3 className="text-lg font-semibold">
                  {isZh
                    ? `为 ${instantScan.domain} 启动高权重外链三波次自然分发`
                    : `Launch ${instantScan.domain} across verified DR 70+ SaaS directories`}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isZh
                    ? "支持 $39 自助启动首波 30 个权威目录（含 HTTP 200 自动验活与归因短链），或选择 $299 全人工代写物料并逐站代投 100+ 目录（30 天死链免费补投）。"
                    : "Start with Wave 1 ($39 once · 30 Tier-1 directories + HTTP 200 live verifier), or book Done-For-You Concierge ($299 · human Brand Kit polish + all 100+ manual submissions)."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Button
                  variant="outline"
                  className="min-h-11"
                  render={<Link href={`/login?url=${encodeURIComponent(instantScan.origin)}`} />}
                >
                  {isZh ? "免费导入指挥台" : "Free Console Import"}
                </Button>
                <Button
                  variant="secondary"
                  className="min-h-11"
                  onClick={() => setCheckoutPlanDialog("blitz")}
                >
                  {isZh ? "Wave 1 启动包 · $39" : "Wave 1 Starter · $39"}
                </Button>
                <Button
                  className="min-h-11"
                  onClick={() => setCheckoutPlanDialog("dfy")}
                >
                  {isZh ? "100+ 全托管代投 · $299" : "100+ DFY Concierge · $299"}
                  <IconArrowRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>

        <Dialog
          open={Boolean(checkoutPlanDialog)}
          onOpenChange={(open) => {
            if (!open) setCheckoutPlanDialog(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">
                {checkoutPlanDialog === "dfy"
                  ? isZh
                    ? `确认 ${instantScan.domain} 全托管代投 ($299)`
                    : `Book 100+ DFY Concierge for ${instantScan.domain} ($299)`
                  : isZh
                  ? `解锁 ${instantScan.domain} 首波 30 目录队列 ($39)`
                  : `Unlock Wave 1 (30 Directories) for ${instantScan.domain} ($39)`}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleConfirmLiveCheckout} className="space-y-4 pt-1">
              <div className="rounded-lg border bg-muted/40 px-3.5 py-2.5 text-xs flex items-center justify-between">
                <span className="text-muted-foreground">{isZh ? "目标域名" : "Target Site"}</span>
                <span className="font-mono font-semibold">{instantScan.origin}</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">
                  {isZh ? "创始人邮箱（接收免密登录链接与税票）" : "Founder Email (for Instant Access Link & VAT Receipt)"}
                </label>
                <Input
                  type="email"
                  required
                  value={checkoutEmail}
                  onChange={(e) => setCheckoutEmail(e.target.value)}
                  placeholder="founder@your-saas.com"
                  className="h-11 text-base sm:text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {isZh
                  ? "由 Creem.io 提供全球税务合规收银，附带 14 天满意退款保障。"
                  : "Secured by Creem.io Merchant of Record with instant workspace unlock & 14-day guarantee."}
              </p>
              <Button type="submit" className="w-full min-h-11" disabled={submittingCheckout}>
                {submittingCheckout
                  ? isZh
                    ? "正在安全跳转..."
                    : "Redirecting to Creem..."
                  : checkoutPlanDialog === "dfy"
                  ? isZh
                    ? "前往安全结账 · $299"
                    : "Continue to Checkout · $299"
                  : isZh
                  ? "前往安全结账 · $39"
                  : "Continue to Checkout · $39"}
                <IconArrowRight className="size-4" />
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-transparent text-foreground flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg font-semibold">
        {errorKey ? t.liveAudit[errorKey] : t.liveAudit.notFound}
      </p>
      <Button render={<Link href="/" />}>{t.common.runFreeScan} →</Button>
    </main>
  );
}
