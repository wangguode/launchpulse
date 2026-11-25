"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { toast } from "sonner";
import {
  IconArrowRight,
  IconArrowUpRight,
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconFileCode,
  IconPlayerPlay,
  IconSearch,
  IconShieldCheck,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DISTRIBUTION_DIRECTORIES } from "@/data/directories";
import {
  buildContextualReply,
  buildSampleOverview,
  deriveConsoleLedger,
  formatCategoryLabel,
  formatSlaLabel,
  type ReplyTone,
} from "@/lib/console-ledger";
import type { StartupAuditReport } from "@/types/audit";

const SAMPLE_DATA = buildSampleOverview();
const SAMPLE_LEDGER = deriveConsoleLedger(SAMPLE_DATA, true);

interface LiveScanPayload {
  domain: string;
  origin: string;
  title: string;
  score: number;
  leaksCount: number;
  leaks: Array<{ severity: string; category: string; title: string; evidence: string }>;
  diagnostics?: { ttfbMs: number };
}

/**
 * LaunchPulse 官网（/）
 * 100% 复用官方 shadcn/ui 组件库 + Kiranism 10 套多主题系统 + Recharts 3 交互图表
 * 与控制台视觉规范完全同源，支持一键体验 Vercel / Supabase / Claude / Mono 主题与深浅色切换
 */
export default function HomeClient({ sampleAudits }: { sampleAudits: StartupAuditReport[] }) {
  const { locale } = useI18n();
  const isZh = locale === "zh";

  const heroChartConfig = useMemo(
    () =>
      ({
        revenueUsd: {
          label: isZh ? "归因营收 ($)" : "Attributed Revenue ($)",
          color: "var(--chart-2)",
        },
      }) satisfies ChartConfig,
    [isZh]
  );

  const scanInputRef = useRef<HTMLInputElement>(null);
  const [scanUrl, setScanUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<LiveScanPayload | null>(null);

  const [tone, setTone] = useState<ReplyTone>("peer");
  const [zeroLink, setZeroLink] = useState(true);
  const [dirQuery, setDirQuery] = useState("");
  const [dirFilter, setDirFilter] = useState<"all" | "dr70" | "dofollow">("all");
  const [videoOpen, setVideoOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        scanInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleRunScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = scanUrl.trim();
    if (!raw) {
      scanInputRef.current?.focus();
      return;
    }
    setScanning(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: raw }),
      });
      const json = (await res.json()) as LiveScanPayload & { error?: string };
      if (!res.ok) {
        toast.error(json.error || (isZh ? "诊断失败，请确认网址可公网访问" : "Could not inspect this URL"));
      } else {
        setScanResult(json);
        toast.success(isZh ? `${json.domain} 诊断完成：${json.score}/100` : `Audit complete: ${json.score}/100`);
      }
    } catch {
      toast.error(isZh ? "网络异常，请重试" : "Network error");
    } finally {
      setScanning(false);
    }
  };

  const handleCheckout = async (plan: "blitz" | "radar" | "dfy") => {
    setCheckoutPlan(plan);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          slug: scanResult?.domain || "saas-launch",
          targetUrl: scanResult?.origin || scanUrl.trim() || "",
        }),
      });
      const data = (await res.json()) as { checkoutUrl?: string };
      if (res.ok && data.checkoutUrl) window.location.href = data.checkoutUrl;
    } finally {
      setCheckoutPlan(null);
    }
  };

  const previewDirectories = useMemo(() => {
    const q = dirQuery.trim().toLowerCase();
    return DISTRIBUTION_DIRECTORIES.filter((d) => {
      if (dirFilter === "dr70" && d.dr < 70) return false;
      if (dirFilter === "dofollow" && d.linkType !== "dofollow") return false;
      if (q && !`${d.name} ${d.url} ${d.category}`.toLowerCase().includes(q)) return false;
      return true;
    }).slice(0, 8);
  }, [dirQuery, dirFilter]);

  const demoLead = SAMPLE_DATA.radarLeads[0];
  const liveDraft = buildContextualReply(
    demoLead,
    "AcmeFlow",
    "lightweight SSL & domain expiry alerts",
    "https://pulse.statementflow.win/r/acme-hn",
    tone,
    zeroLink
  );

  const heroChartData = SAMPLE_LEDGER.revenue.dailySeries.slice(-14).map((pt) => ({
    date: pt.date.slice(5),
    revenueUsd: pt.revenueUsd,
  }));

  const featuredAuditSlug = sampleAudits[0]?.slug || "certnudge";

  const pricingPlans = [
    {
      id: "blitz" as const,
      name: isZh ? "启动包" : "Launch Starter",
      price: "$39",
      unit: isZh ? "一次性买断" : "one-time",
      desc: isZh ? "适合刚上线的独立产品，快速拿下首批高权重外链。" : "Fast initial authority lift for new SaaS products.",
      features: isZh
        ? ["30 个核心高权重目录提交队列", "自动 HTTP 200 外链验活回执", "专属边缘归因短链与点击统计", "免费 AEO 与 /llms.txt 诊断"]
        : ["30 Tier-1 directory queue", "Automated HTTP 200 verification", "Custom edge tracking shortlinks", "AEO & /llms.txt audit"],
      cta: isZh ? "立即开通启动包" : "Start for $39",
      highlighted: false,
    },
    {
      id: "radar" as const,
      name: isZh ? "增长指挥台" : "Growth Command",
      price: "$29",
      unit: isZh ? "/ 月" : "/ mo",
      desc: isZh ? "完整闭环：100 目录节奏投放 + 买家收件箱 + 美元级归因。" : "Complete OS: 100 directories, buyer inbox & attribution.",
      features: isZh
        ? ["全部 100+ 精选目录 3 周自然排期", "24/7 买家收件箱扫帖与原生回复精编", "零链接安全养号模式与键盘流", "美元级转化漏斗与公开核验战报页"]
        : ["All 100+ directories over 3 weeks", "24/7 Buyer Inbox + Reply Studio", "Zero-link safe mode & shortcuts", "Revenue funnel & verifiable public report"],
      cta: isZh ? "订阅增长指挥台" : "Subscribe · $29/mo",
      highlighted: true,
    },
    {
      id: "dfy" as const,
      name: isZh ? "代投旗舰" : "Done-For-You",
      price: "$299",
      unit: isZh ? "一次性全托管" : "one-time concierge",
      desc: isZh ? "把时间留给产品开发：人工精修物料并完成 100+ 目录代提交。" : "We polish your Brand Kit and submit all 100+ listings manually.",
      features: isZh
        ? ["100+ 精选目录全人工逐站代提交", "英文产品定位与三档目录简介代精修", "30 天内死链或拒审免费补投保障", "附赠 30 天增长指挥台完整权限"]
        : ["Full manual 100+ directory submission", "Native English Brand Kit polish", "30-day replacement guarantee", "30 days Command Center access"],
      cta: isZh ? "预约人工代投" : "Book Concierge · $299",
      highlighted: false,
    },
  ];

  const faqs = [
    {
      q: isZh ? "提交 100 个外链目录会不会被 Google 判定作弊？" : "Will submitting to 100 directories trigger a Google penalty?",
      a: isZh
        ? "不会。系统采用 3 周自然节奏分批推进（第 1 周 30 个权威站 → 第 2 周 35 个垂直站 → 第 3 周 35 个独立生态站），所有站点均经人工清洗验证，绝不涉及垃圾站群。"
        : "No. Submissions are staggered across 3 weekly waves across verified software directories—never automated spam link farms.",
    },
    {
      q: isZh ? "去 Hacker News / Reddit / GitHub 回复求购帖会被封号吗？" : "Will replying to buyer threads risk account bans?",
      a: isZh
        ? "买家收件箱默认开启「零链接安全养号模式」，先以工程师同行视角提供干货解法且不带任何外部链接，大幅降低新号被删帖风控概率。"
        : "Buyer Inbox enables Zero-Link Safe Mode by default—answering with genuine engineering advice without dropping unsolicited URLs.",
    },
    {
      q: isZh ? "如何验证提交后的外链真的存活并带来转化？" : "How do you verify live backlinks and real revenue?",
      a: isZh
        ? "Cloudflare 边缘节点会自动执行 HTTP 200 验活并结合专属 /r/ 短链与 1 行统计脚本，把点击、注册、付费逐笔归因并同步至公开只读战报页。"
        : "Our Cloudflare worker verifies HTTP 200 status and connects shortlinks plus a 1-line pixel straight to your verifiable public report.",
    },
    {
      q: isZh ? "支持哪些支付方式？能否随时取消？" : "How do payments and cancellations work?",
      a: isZh
        ? "全部方案通过 Creem 安全结算，支持主流国际卡。月度订阅随时一键取消，代投服务承诺按交付清单透明验收。"
        : "Secure checkout via Creem. Monthly subscriptions cancel anytime in one click.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 标准 shadcn 顶栏（含 10 套多主题切换 + 深浅色切换 + 中英切换） */}
      <header className="sticky top-0 z-40 h-14 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-sm tracking-tight">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BrandMark className="size-4" tone="light" />
            </div>
            <span>LaunchPulse</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground" aria-label="官网导航">
            <a href="#features" className="hover:text-foreground transition-colors">
              {isZh ? "核心模块" : "Modules"}
            </a>
            <a href="#directories" className="hover:text-foreground transition-colors">
              {isZh ? "100 目录库" : "Directories"}
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              {isZh ? "透明定价" : "Pricing"}
            </a>
            <Link href="/tools/aeo-checker" className="hover:text-foreground transition-colors">
              {isZh ? "免费体检" : "Free Audit"}
            </Link>
          </nav>

          <div className="flex items-center gap-1.5">
            <LangSwitcher />
            <ThemeModeToggle />
            <Button size="sm" render={<Link href="/dashboard?sample=1" />}>
              {isZh ? "进入指挥台" : "Open Console"}
            </Button>
          </div>
        </div>
      </header>

      {/* 第 1 幕：标准 SaaS Hero + 命令式诊断栏 + 嵌入式真实 Recharts 指挥台预览 */}
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 space-y-12">
          <div className="mx-auto max-w-3xl text-center space-y-5">
            <h1 className="lp-display text-4xl font-bold tracking-tight sm:text-5xl leading-[1.15]">
              {isZh ? (
                <>
                  产品上线后，
                  <br />
                  把海外买家和外链带回来。
                </>
              ) : (
                <>
                  After you ship,
                  <br />
                  bring back buyers and backlinks.
                </>
              )}
            </h1>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground leading-relaxed">
              {isZh
                ? "一次录入品牌资料，开启 100+ 海外精选目录节奏投放、全网求购线索监听与美元级营收归因。"
                : "Fill your Brand Kit once to pace 100+ curated directory submissions, monitor live buying threads, and attribute revenue per channel."}
            </p>

            {/* 免费诊断输入条 */}
            <form onSubmit={handleRunScan} className="mx-auto max-w-2xl pt-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <IconSearch className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    ref={scanInputRef}
                    value={scanUrl}
                    onChange={(e) => setScanUrl(e.target.value)}
                    placeholder={isZh ? "输入官网地址，例如 https://your-saas.com" : "https://your-saas.com"}
                    className="h-10 pl-9 pr-14"
                  />
                  <Kbd className="hidden sm:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2">⌘K</Kbd>
                </div>
                <Button type="submit" size="lg" className="h-10 px-5" disabled={scanning}>
                  {scanning ? (isZh ? "诊断中..." : "Scanning...") : isZh ? "免费诊断" : "Free Audit"}
                  <IconArrowRight className="size-4" />
                </Button>
              </div>
            </form>

            {scanResult && (
              <Card className="mx-auto max-w-2xl text-left">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-mono">{scanResult.domain}</CardTitle>
                  <CardDescription className="text-xs">
                    {isZh ? `增长健康分 ${scanResult.score}/100 · 发现 ${scanResult.leaksCount} 项待优化` : `Score ${scanResult.score}/100 · ${scanResult.leaksCount} findings`}
                  </CardDescription>
                  <CardAction>
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={`/audit/live?url=${encodeURIComponent(scanResult.origin)}`} />}
                    >
                      {isZh ? "完整报告" : "Full Report"}
                      <IconArrowUpRight className="size-3.5" />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-2 pt-0 text-xs">
                  {scanResult.leaks.slice(0, 4).map((lk, i) => (
                    <div key={i} className="rounded-md border bg-muted/40 p-2.5">
                      <p className="font-medium text-foreground">{lk.title}</p>
                      <p className="text-muted-foreground line-clamp-1 mt-0.5">{lk.evidence}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* 嵌入式真实 shadcn/ui + Recharts 3 指挥台实时窗口 */}
          <Card className="overflow-hidden shadow-md">
            <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5 text-xs">
              <div className="flex items-center gap-2 font-medium">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>{isZh ? "LaunchPulse 增长指挥台 · AcmeFlow 实时视图" : "LaunchPulse Command Center · AcmeFlow"}</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" render={<Link href="/dashboard?sample=1" />}>
                {isZh ? "进入完整交互控制台" : "Open Full Demo"}
                <IconArrowUpRight className="size-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 divide-y lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              {/* 栏 1：Recharts 3 归因营收 */}
              <div className="p-5 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{isZh ? "近 30 天归因营收" : "Revenue (30d)"}</p>
                    <p className="text-2xl font-bold tabular-nums mt-0.5">
                      ${SAMPLE_LEDGER.revenue.totalUsd.toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="tabular-nums">
                    <IconTrendingUp className="size-3" />
                    +${SAMPLE_LEDGER.revenue.deltaUsd}
                  </Badge>
                </div>
                <ChartContainer config={heroChartConfig} className="aspect-auto h-[120px] w-full">
                  <AreaChart data={heroChartData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" hide />
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Area
                      dataKey="revenueUsd"
                      type="monotone"
                      fill="var(--color-revenueUsd)"
                      fillOpacity={0.18}
                      stroke="var(--color-revenueUsd)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {SAMPLE_LEDGER.revenue.funnel.clicks.toLocaleString()} {isZh ? "点击" : "clicks"} →{" "}
                  {SAMPLE_LEDGER.revenue.funnel.signups} {isZh ? "注册" : "signups"} →{" "}
                  {SAMPLE_LEDGER.revenue.funnel.paid} {isZh ? "付费" : "paid"}
                </p>
              </div>

              {/* 栏 2：今日高意向求购 */}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">{isZh ? "买家求购收件箱" : "Buyer Intent Inbox"}</span>
                  <Badge variant="outline" className="tabular-nums">
                    {isZh ? `待跟进 ${SAMPLE_LEDGER.leadCounts.pending}` : `${SAMPLE_LEDGER.leadCounts.pending} open`}
                  </Badge>
                </div>
                <div className="space-y-2.5">
                  {SAMPLE_DATA.radarLeads
                    .filter((l) => l.status === "new")
                    .slice(0, 3)
                    .map((lead) => (
                      <div key={lead.id} className="rounded-md border p-2.5 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-primary">
                            {lead.intent_score}% · {lead.source}
                          </span>
                          <span className="text-muted-foreground">
                            {isZh ? lead.relative_time_zh : lead.relative_time_en}
                          </span>
                        </div>
                        <p className="text-xs font-medium line-clamp-1">{lead.title}</p>
                      </div>
                    ))}
                </div>
              </div>

              {/* 栏 3：权威目录验活回执 */}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between text-xs tabular-nums">
                  <span className="font-semibold">{isZh ? "权威目录验活回执" : "Verified Directories"}</span>
                  <span className="font-mono text-muted-foreground">
                    {SAMPLE_LEDGER.dirCounts.live}/{SAMPLE_LEDGER.dirCounts.total}
                  </span>
                </div>
                <div className="divide-y rounded-md border text-xs tabular-nums">
                  {SAMPLE_LEDGER.recentVerifiedReceipts.map((dir) => (
                    <div key={dir.id} className="flex items-center justify-between px-3 py-2.5">
                      <span className="font-medium truncate">{dir.name.replace(" Software", "")}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-muted-foreground">DR {dir.dr}</span>
                        <Badge variant="secondary" className="text-xs">
                          {isZh ? "已验活" : "Live"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 第 2 幕：官方 shadcn Tabs 交互式三核心能力演示 */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 space-y-8">
        <div className="max-w-2xl space-y-2">
          <h2 className="lp-display text-2xl font-bold tracking-tight sm:text-3xl">
            {isZh ? "把冷启动最耗时间的 3 件事，收进标准控制台。" : "Three launch workflows in one standard console."}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isZh ? "直接切换下方标签体验真实交互组件与对账账本。" : "Switch tabs below to test each module live."}
          </p>
        </div>

        <Tabs defaultValue="reply" className="space-y-4">
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="reply">{isZh ? "买家收件箱拟稿" : "Buyer Inbox"}</TabsTrigger>
            <TabsTrigger value="dirs">{isZh ? "100 目录节奏排期" : "Directory Pacing"}</TabsTrigger>
            <TabsTrigger value="roi">{isZh ? "美元归因闭环" : "Revenue Attribution"}</TabsTrigger>
          </TabsList>

          <TabsContent value="reply">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{isZh ? "原生英文回复精编器（现场切换体验）" : "Native Reply Studio"}</CardTitle>
                <CardDescription>{demoLead.title}</CardDescription>
                <CardAction>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-muted-foreground">{isZh ? "零链接安全养号" : "Zero-link safe"}</span>
                    <Switch checked={zeroLink} onCheckedChange={(v) => setZeroLink(Boolean(v))} />
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={tone} onValueChange={(v) => setTone(v as ReplyTone)}>
                  <TabsList>
                    <TabsTrigger value="peer">{isZh ? "同行纯干货" : "Peer Help"}</TabsTrigger>
                    <TabsTrigger value="founder">{isZh ? "创始人分享" : "Founder"}</TabsTrigger>
                    <TabsTrigger value="compare">{isZh ? "客观对比" : "Objective"}</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {liveDraft}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(liveDraft).catch(() => {});
                    toast.success(isZh ? "英文回复草稿已复制" : "Draft copied");
                  }}
                >
                  <IconCopy className="size-3.5" />
                  {isZh ? "复制此条草稿" : "Copy Draft"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dirs">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{isZh ? "3 周自然节奏与自动化 HTTP 验活" : "3-Week Natural Cadence"}</CardTitle>
                <CardDescription className="tabular-nums">
                  {isZh
                    ? `第 1 周 ${SAMPLE_LEDGER.dirCounts.wave1} 站 · 第 2 周 ${SAMPLE_LEDGER.dirCounts.wave2} 站 · 第 3 周 ${SAMPLE_LEDGER.dirCounts.wave3} 站（共 100 站）`
                    : "Wave 1 (30) · Wave 2 (35) · Wave 3 (35) = 100 verified directories"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isZh ? "目录平台" : "Directory"}</TableHead>
                      <TableHead>{isZh ? "域名权重" : "DR"}</TableHead>
                      <TableHead>{isZh ? "属性" : "Link"}</TableHead>
                      <TableHead>{isZh ? "验活状态" : "Status"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SAMPLE_LEDGER.directories.slice(0, 5).map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell className="font-mono">DR {d.dr}</TableCell>
                        <TableCell>{d.linkType === "dofollow" ? (isZh ? "传递权重" : "Dofollow") : "Nofollow"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">HTTP 200 · {isZh ? "已验活" : "Live"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roi">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{isZh ? "每条渠道严格对账到美元" : "Dollar-Reconciled Channel Ledger"}</CardTitle>
                <CardDescription>{isZh ? "总营收 $2,088 = $1,102 + $725 + $261" : "$2,088 = $1,102 + $725 + $261"}</CardDescription>
                <CardAction>
                  <Button variant="outline" size="sm" render={<Link href="/report?id=demo-acmeflow" />}>
                    {isZh ? "预览公开战报" : "Public Report"}
                    <IconExternalLink className="size-3.5" />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-4 tabular-nums">
                {SAMPLE_LEDGER.revenue.channels.map((ch) => (
                  <Card key={ch.key}>
                    <CardHeader className="pb-2">
                      <CardDescription>{isZh ? ch.labelZh : ch.labelEn}</CardDescription>
                      <CardTitle className="text-2xl font-mono">${ch.revenueUsd.toLocaleString()}</CardTitle>
                    </CardHeader>
                    <CardFooter className="text-xs text-muted-foreground">
                      {ch.clicks.toLocaleString()} {isZh ? "次有效点击" : "verified clicks"}
                    </CardFooter>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      <Separator />

      {/* 第 3 幕：100 目录透明检索表 + 免费前置工具 */}
      <section id="directories" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="lp-display text-2xl font-bold tracking-tight sm:text-3xl">
              {isZh ? "100+ 真实可提交目录，付费前即可逐站查验。" : "Inspect all 100+ directories before paying."}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isZh ? "剔除死链与封闭站，每站附带真实 DR 权重、审核周期与直达提交地址。" : "Verified public directories with live DR and review windows."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setVideoOpen(true)}>
              <IconPlayerPlay className="size-4" />
              {isZh ? "81 秒实机拆解" : "81s Teardown"}
            </Button>
            <Button variant="outline" size="sm" render={<Link href="/tools/directory-finder" />}>
              {isZh ? "浏览全部 100 站" : "Browse All 100"}
              <IconArrowUpRight className="size-3.5" />
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
            <Tabs value={dirFilter} onValueChange={(v) => setDirFilter(v as typeof dirFilter)}>
              <TabsList>
                <TabsTrigger value="all">{isZh ? "全部 (100)" : "All (100)"}</TabsTrigger>
                <TabsTrigger value="dr70">DR 70+</TabsTrigger>
                <TabsTrigger value="dofollow">{isZh ? "传递权重" : "Dofollow"}</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative sm:w-64">
              <IconSearch className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={dirQuery}
                onChange={(e) => setDirQuery(e.target.value)}
                placeholder={isZh ? "搜索目录名..." : "Filter directories..."}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isZh ? "平台名称" : "Directory"}</TableHead>
                  <TableHead>{isZh ? "域名权重" : "DR"}</TableHead>
                  <TableHead className="hidden sm:table-cell">{isZh ? "分类" : "Category"}</TableHead>
                  <TableHead className="hidden md:table-cell">{isZh ? "预计审核" : "Review"}</TableHead>
                  <TableHead>{isZh ? "外链属性" : "Link"}</TableHead>
                  <TableHead className="text-right">{isZh ? "入口" : "Submit"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="tabular-nums">
                {previewDirectories.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="font-mono">DR {d.dr}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                      {formatCategoryLabel(d.category, isZh)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                      {formatSlaLabel(d.approvalSla, isZh)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={d.linkType === "dofollow" ? "default" : "secondary"} className="text-xs">
                        {d.linkType === "dofollow" ? (isZh ? "传递权重" : "Dofollow") : "Nofollow"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        render={<a href={d.submitUrl} target="_blank" rel="noopener noreferrer" />}
                      >
                        {isZh ? "直达" : "Open"}
                        <IconExternalLink className="size-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/tools/aeo-checker" className="block group">
            <Card className="hover:bg-accent/40 transition-colors h-full">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/60">
                    <IconShieldCheck className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-sm">{isZh ? "AI 搜索可见度体检（12 项实测）" : "12-Point AEO Checker"}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {isZh ? "核查 GPTBot / ClaudeBot / PerplexityBot 是否被 robots.txt 误拦" : "Check AI crawler rules & JSON-LD schema"}
                    </CardDescription>
                  </div>
                </div>
                <IconArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </CardHeader>
            </Card>
          </Link>

          <Link href="/tools/llms-txt-generator" className="block group">
            <Card className="hover:bg-accent/40 transition-colors h-full">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/60">
                    <IconFileCode className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-sm">{isZh ? "/llms.txt 标准清单生成器" : "/llms.txt Manifest Studio"}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {isZh ? "10 秒提取官网定位，一键导出符合 llmstxt.org 规范的 Markdown 文件" : "Generate a clean llmstxt.org index in seconds"}
                    </CardDescription>
                  </div>
                </div>
                <IconArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </CardHeader>
            </Card>
          </Link>
        </div>
      </section>

      <Separator />

      {/* 第 4 幕：官方 shadcn Card 三档透明定价 */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 space-y-8">
        <div className="max-w-xl space-y-1.5">
          <h2 className="lp-display text-2xl font-bold tracking-tight sm:text-3xl">
            {isZh ? "透明定价，按出海阶段选择。" : "Transparent pricing for every launch stage."}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isZh ? "无年付绑定，全部外链与营收归因支持公开查验。" : "No lock-ins. Every backlink and dollar is verifiable."}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {pricingPlans.map((plan) => (
            <Card key={plan.id} className={plan.highlighted ? "border-primary shadow-sm flex flex-col" : "flex flex-col"}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {plan.highlighted && <Badge>{isZh ? "推荐" : "Popular"}</Badge>}
                </div>
                <div className="flex items-baseline gap-1.5 pt-2 tabular-nums">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-xs text-muted-foreground">{plan.unit}</span>
                </div>
                <CardDescription className="pt-1">{plan.desc}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2.5 text-sm">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <IconCheck className="size-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  variant={plan.highlighted ? "default" : "outline"}
                  className="w-full"
                  disabled={checkoutPlan === plan.id}
                  onClick={() => handleCheckout(plan.id)}
                >
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* 第 5 幕：官方 shadcn Accordion FAQ + 页脚 */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-2">
          <h2 className="lp-display text-2xl font-bold tracking-tight">
            {isZh ? "上线前最常问的 4 个问题" : "Frequently asked questions"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isZh ? "把外链安全节奏、防封号策略与公开实证提前讲透。" : "Clear answers on pacing, account safety & proof."}
          </p>
          <Button variant="link" className="px-0" render={<Link href={`/audit/${featuredAuditSlug}`} />}>
            {isZh ? "查看真实出海诊断样本 ↗" : "Read a live teardown ↗"}
          </Button>
        </div>

        <div className="lg:col-span-8">
          <Accordion className="w-full rounded-lg border px-4">
            {faqs.map((item, idx) => (
              <AccordionItem key={idx} value={`faq-${idx}`}>
                <AccordionTrigger className="text-sm font-medium">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-4 py-6 sm:px-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">LaunchPulse</span>
            <span>·</span>
            <span>{isZh ? "出海产品增长与投流归因平台" : "Growth & Attribution Command Center"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/dashboard?sample=1" className="hover:text-foreground">
              {isZh ? "体验指挥台" : "Sandbox"}
            </Link>
            <Link href="/report?id=demo-acmeflow" className="hover:text-foreground">
              {isZh ? "公开战报" : "Report"}
            </Link>
            <Link href="/login" className="hover:text-foreground">
              {isZh ? "登录" : "Sign In"}
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              {isZh ? "隐私条款" : "Privacy"}
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              {isZh ? "服务协议" : "Terms"}
            </Link>
          </div>
        </div>
      </footer>

      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-5 py-3 border-b">
            <DialogTitle className="text-sm">
              {isZh ? "81 秒真实出海产品增长拆解（CertNudge）" : "81-Second Live Growth Teardown"}
            </DialogTitle>
          </DialogHeader>
          <video controls autoPlay poster="/teardowns/certnudge-poster.png" className="w-full aspect-video bg-black">
            <source src="/teardowns/certnudge.mp4" type="video/mp4" />
          </video>
        </DialogContent>
      </Dialog>
    </div>
  );
}
