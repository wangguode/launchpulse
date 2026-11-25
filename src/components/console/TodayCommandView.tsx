"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import DomainFavicon from "@/components/frosted/DomainFavicon";
import ProportionalBarList from "@/components/frosted/ProportionalBarList";
import WaveTelemetryMatrix from "@/components/frosted/WaveTelemetryMatrix";
import {
  IconArrowRight,
  IconCheck,
  IconCircleCheck,
  IconCircleDashed,
  IconCode,
  IconFolderPlus,
  IconInbox,
  IconLink,
  IconSparkles,
  IconTrendingUp,
  IconWorldDownload,
} from "@tabler/icons-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RadarLeadRecord, ReconciledDirectoryRow, ReconciledLedger } from "@/lib/console-ledger";

interface TodayCommandViewProps {
  ledger: ReconciledLedger;
  topPendingLead: RadarLeadRecord | null;
  hasProject: boolean;
  isZh: boolean;
  isSample: boolean;
  approvingWave: boolean;
  waveApprovedNotice: boolean;
  onOpenBrandKit: () => void;
  onApproveWave2: () => void;
  onGoInboxLead: (leadId?: number) => void;
  onOpenDirectory: (dir: ReconciledDirectoryRow) => void;
  onGoDirectories: () => void;
  onGoAnalytics: () => void;
  onQuickCreateProject: (params: {
    url: string;
    name?: string;
    tagline?: string;
    crawledKit?: Record<string, unknown> | null;
  }) => Promise<boolean>;
}

/**
 * 视图 ①：今日作战室（现代增长分析台气质）
 * - 0 项目时在主画布内嵌 URL 一键抓取建档表单，30 秒直达激活
 * - 真实新项目无点击/营收数据时展示“首周上线 4 步冲刺清单”，杜绝趴地 $0 死图
 * - 活跃增长态提供 7D/30D + 归因营收/点击双指标切换、4 步可视转化漏斗与真实外链验活回执
 */
export default function TodayCommandView({
  ledger,
  topPendingLead,
  hasProject,
  isZh,
  isSample,
  approvingWave,
  waveApprovedNotice,
  onOpenBrandKit,
  onApproveWave2,
  onGoInboxLead,
  onOpenDirectory,
  onGoDirectories,
  onGoAnalytics,
  onQuickCreateProject,
}: TodayCommandViewProps) {
  const [range, setRange] = useState<"7d" | "30d">("30d");
  const [metric, setMetric] = useState<"revenueUsd" | "clicks">("revenueUsd");

  // 0 项目态内嵌 URL 一键建档表单
  const [onboardUrl, setOnboardUrl] = useState("");
  const [onboardName, setOnboardName] = useState("");
  const [onboardTagline, setOnboardTagline] = useState("");
  const [crawling, setCrawling] = useState(false);
  const [creating, setCreating] = useState(false);
  const [crawledMeta, setCrawledMeta] = useState<Record<string, unknown> | null>(null);

  const areaChartConfig = useMemo(
    () =>
      ({
        revenueUsd: {
          label: isZh ? "归因营收 ($)" : "Attributed Revenue ($)",
          color: "var(--chart-1)",
        },
        clicks: {
          label: isZh ? "归因点击" : "Attributed Clicks",
          color: "var(--chart-2)",
        },
      }) satisfies ChartConfig,
    [isZh]
  );

  const barChartConfig = useMemo(
    () =>
      ({
        revenueUsd: {
          label: isZh ? "归因营收 ($)" : "Revenue ($)",
          color: "var(--chart-1)",
        },
        clicks: {
          label: isZh ? "有效点击" : "Clicks",
          color: "var(--chart-2)",
        },
      }) satisfies ChartConfig,
    [isZh]
  );

  const handleInlineCrawl = async () => {
    const raw = onboardUrl.trim();
    if (!raw) {
      toast.error(isZh ? "请先粘贴你的产品官网地址" : "Enter your product URL first");
      return;
    }
    setCrawling(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch("/api/dashboard/brand-kit/autofill", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: raw }),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        toast.error(String(json.error || (isZh ? "抓取失败，请检查网址是否可公网访问" : "Unable to crawl URL")));
        return;
      }
      if (typeof json.productName === "string") setOnboardName(json.productName);
      if (typeof json.shortTagline === "string") setOnboardTagline(json.shortTagline);
      setCrawledMeta(json);
      toast.success(isZh ? "官网资料已自动提取，点击下方按钮立即生成工作台" : "Metadata imported — click Create Workspace");
    } catch {
      toast.error(isZh ? "抓取超时，你也可以直接填写产品名并创建" : "Crawl timed out — you can still create manually");
    } finally {
      clearTimeout(timer);
      setCrawling(false);
    }
  };

  const handleInlineCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardUrl.trim()) {
      toast.error(isZh ? "请输入有效官网 URL（以 https:// 开头）" : "Enter a valid HTTPS URL");
      return;
    }
    setCreating(true);
    try {
      const ok = await onQuickCreateProject({
        url: onboardUrl.trim(),
        name: onboardName.trim(),
        tagline: onboardTagline.trim(),
        crawledKit: crawledMeta,
      });
      if (ok) {
        setOnboardUrl("");
        setOnboardName("");
        setOnboardTagline("");
        setCrawledMeta(null);
      }
    } finally {
      setCreating(false);
    }
  };

  // 0 项目冷启动：主画布直接建档，减少多一层弹窗摩擦
  if (!hasProject) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
        <Card className="w-full max-w-2xl shadow-sm">
          <CardHeader className="space-y-2 pb-4">
            <Badge variant="info" className="w-fit">
              {isZh ? "30 秒完成冷启动建档" : "30-Second Workspace Setup"}
            </Badge>
            <CardTitle className="text-2xl tracking-tight">
              {isZh ? "添加你的首个出海产品，开启外链与买家雷达" : "Add your first product to start distribution & buyer radar"}
            </CardTitle>
            <CardDescription>
              {isZh
                ? "粘贴产品官网，系统自动抓取 Logo、三档英文介绍与分类，立即解锁 100+ 目录排期与 Reddit / HN 实时监听。"
                : "Paste your product URL once — we auto-fill your Brand Kit, pace 100+ directories, and scan Reddit, HN & GitHub."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={handleInlineCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="onboard-url">{isZh ? "产品官网地址（HTTPS）" : "Product Website URL (HTTPS)"}</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="onboard-url"
                    type="url"
                    required
                    value={onboardUrl}
                    onChange={(e) => setOnboardUrl(e.target.value)}
                    placeholder="https://your-saas.com"
                    className="font-mono text-sm flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={crawling || !onboardUrl.trim()}
                    onClick={() => void handleInlineCrawl()}
                  >
                    <IconWorldDownload className="size-4" />
                    {crawling ? (isZh ? "抓取中..." : "Crawling...") : isZh ? "自动抓取资料" : "Auto-fill"}
                  </Button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="onboard-name">{isZh ? "产品名称" : "Product Name"}</Label>
                  <Input
                    id="onboard-name"
                    value={onboardName}
                    onChange={(e) => setOnboardName(e.target.value)}
                    placeholder="AcmeFlow"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onboard-tagline">{isZh ? "一句话定位（英文更佳）" : "One-line Tagline"}</Label>
                  <Input
                    id="onboard-tagline"
                    value={onboardTagline}
                    onChange={(e) => setOnboardTagline(e.target.value)}
                    placeholder="SSL & domain monitoring for lean SaaS teams"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-xs text-muted-foreground">
                  {isZh
                    ? "免费版立即可用前 10 个高权重目录、3 条买家原帖与边缘归因短链。"
                    : "Free tier includes Top 10 directories, 3 buyer threads, and attribution links."}
                </p>
                <Button type="submit" disabled={creating}>
                  <IconFolderPlus className="size-4" />
                  {creating ? (isZh ? "创建中..." : "Creating...") : isZh ? "立即生成增长工作台" : "Create Workspace"}
                </Button>
              </div>
            </form>

            <Separator />

            <div className="grid sm:grid-cols-3 gap-3">
              {[
                {
                  step: "01",
                  title: isZh ? "品牌物料库自动就绪" : "Instant Brand Kit",
                  desc: isZh ? "一次校准 Logo、主图与英文简介，全渠道复用" : "Calibrate copy & assets once, reuse everywhere",
                },
                {
                  step: "02",
                  title: isZh ? "100+ 目录节奏推进" : "100+ Directories",
                  desc: isZh ? "按 DR 权重分 3 周提交，支持自助打卡与 HTTP 验活" : "DR-sorted 3-week waves with self-tracking & HTTP check",
                },
                {
                  step: "03",
                  title: isZh ? "高意向买家捕手" : "Buyer Radar Inbox",
                  desc: isZh ? "监测 Reddit / HN / GitHub 求购帖，AI 拟稿零链接养号" : "Monitor live buyer threads + zero-link AI replies",
                },
              ].map((item) => (
                <div key={item.step} className="rounded-lg border bg-muted/35 p-3 space-y-1">
                  <span className="font-mono text-[11px] font-semibold text-primary">{item.step}</span>
                  <p className="text-xs font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const needsBrandKit = ledger.brandKit.score < 100;
  const wave2Count = ledger.dirCounts.wave2PendingIds.length;
  const needsWaveApproval = wave2Count > 0 && !waveApprovedNotice;
  const pendingLeadsCount = ledger.leadCounts.pending;
  const activeTodoCount = (needsBrandKit ? 1 : 0) + (needsWaveApproval ? 1 : 0) + (pendingLeadsCount > 0 ? 1 : 0);

  const firstMissing = isZh
    ? ledger.brandKit.missingItemsZh[0] || "核心物料"
    : ledger.brandKit.missingItemsEn[0] || "brand asset";

  const hasTelemetryData =
    isSample ||
    ledger.revenue.totalUsd > 0 ||
    ledger.revenue.funnel.clicks > 0 ||
    ledger.revenue.dailySeries.some((d) => d.clicks > 0 || d.revenueUsd > 0);

  const dirProgressPct =
    ledger.dirCounts.total > 0 ? Math.round((ledger.dirCounts.live / ledger.dirCounts.total) * 100) : 0;

  const rpv =
    ledger.revenue.funnel.clicks > 0
      ? (ledger.revenue.totalUsd / ledger.revenue.funnel.clicks).toFixed(2)
      : "0.00";

  const slicedSeries = useMemo(() => {
    const src = range === "7d" ? ledger.revenue.dailySeries.slice(-7) : ledger.revenue.dailySeries;
    return src.map((pt) => ({
      date: pt.date.slice(5),
      revenueUsd: pt.revenueUsd,
      clicks: pt.clicks,
    }));
  }, [ledger.revenue.dailySeries, range]);

  const channelBarData = ledger.revenue.channels.map((ch) => ({
    channel: isZh ? ch.labelZh : ch.labelEn,
    revenueUsd: ch.revenueUsd,
    clicks: ch.clicks,
  }));

  const funnelSteps = useMemo(() => {
    const { clicks, visits, signups, paid } = ledger.revenue.funnel;
    const base = Math.max(1, clicks);
    return [
      {
        label: isZh ? "短链点击" : "Link Clicks",
        value: clicks,
        pct: clicks > 0 ? 100 : 0,
        rate: "100%",
      },
      {
        label: isZh ? "有效进站" : "Qualified Visits",
        value: visits,
        pct: Math.round((visits / base) * 100),
        rate: clicks > 0 ? `${Math.round((visits / clicks) * 100)}%` : "0%",
      },
      {
        label: isZh ? "注册试用" : "Signups",
        value: signups,
        pct: Math.max(signups > 0 ? 6 : 0, Math.round((signups / base) * 100)),
        rate: visits > 0 ? `${((signups / visits) * 100).toFixed(1)}%` : "0%",
      },
      {
        label: isZh ? "美元付费" : "Paid Customers",
        value: paid,
        pct: Math.max(paid > 0 ? 4 : 0, Math.round((paid / base) * 100)),
        rate: signups > 0 ? `${((paid / signups) * 100).toFixed(1)}%` : "0%",
      },
    ];
  }, [ledger.revenue.funnel, isZh]);

  const checklistSteps = [
    {
      done: ledger.brandKit.score >= 80,
      title: isZh ? "完善品牌提交资料至 80%+" : "Complete Brand Kit (80%+)",
      desc: isZh
        ? `当前完整度 ${ledger.brandKit.score}%，补充后一键复用于 100 个目录提交表单`
        : `${ledger.brandKit.score}% complete — reused across all directory forms`,
      actionLabel: isZh ? "完善物料" : "Edit Kit",
      onClick: onOpenBrandKit,
      icon: <IconSparkles className="size-4" />,
    },
    {
      done: ledger.revenue.funnel.clicks > 0,
      title: isZh ? "在官网接入 1 行归因像素并生成首条短链" : "Install Attribution Pixel & Test Shortlink",
      desc: isZh
        ? "追踪每个目录与社区回复带来的真实点击、注册和美元付款"
        : "Measure exact clicks, signups, and USD conversions per channel",
      actionLabel: isZh ? "配置归因" : "Setup Pixel",
      onClick: onGoAnalytics,
      icon: <IconCode className="size-4" />,
    },
    {
      done: ledger.dirCounts.live + ledger.dirCounts.submitted >= 3,
      title: isZh ? "向首批高 DR 免费目录提交并打卡" : "Submit First High-DR Free Directories",
      desc: isZh
        ? `当前已提交/验活 ${ledger.dirCounts.live + ledger.dirCounts.submitted} 站，建议从 DR 80+ 免费目录起步`
        : `${ledger.dirCounts.live + ledger.dirCounts.submitted} submitted — start with DR 80+ free listings`,
      actionLabel: isZh ? "去提交目录" : "Open Directories",
      onClick: onGoDirectories,
      icon: <IconLink className="size-4" />,
    },
    {
      done: ledger.leadCounts.all > 0,
      title: isZh ? "配置痛点词并运行首次买家雷达扫帖" : "Configure Keywords & Run First Radar Scan",
      desc: isZh
        ? `已发现 ${ledger.leadCounts.all} 条求购讨论，AI 可生成无外链自然英文回复`
        : `${ledger.leadCounts.all} buyer threads found across Reddit, HN & GitHub`,
      actionLabel: isZh ? "打开收件箱" : "Open Inbox",
      onClick: () => onGoInboxLead(),
      icon: <IconInbox className="size-4" />,
    },
  ];
  const completedChecks = checklistSteps.filter((s) => s.done).length;

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6 tabular-nums">
      {/* 顶部标题栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isZh ? "今日作战室" : "Growth Overview"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeTodoCount > 0
              ? isZh
                ? `今日有 ${activeTodoCount} 项高价值动作可直接推进外链收录与海外咨询`
                : `${activeTodoCount} priority actions ready to drive backlinks and revenue`
              : isZh
                ? "今日重点待办已清空，系统正持续追踪外链存活与买家讨论"
                : "All priority tasks completed — monitoring links and leads continuously"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onGoAnalytics}>
            {isZh ? "归因明细" : "Analytics"}
          </Button>
          <Button size="sm" onClick={onGoDirectories}>
            {isZh ? "推进目录分发" : "Launch Directories"}
            <IconArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* 顶部 4 列光学磨砂 KPI 指标卡 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="@container/card">
          <CardHeader className="pb-1.5">
            <CardDescription>{isZh ? "Stripe 归因净收入" : "Attributed Revenue (30d)"}</CardDescription>
            <CardTitle className="text-[28px] font-semibold tracking-tight leading-tight">
              ${ledger.revenue.totalUsd.toLocaleString()}
            </CardTitle>
            <CardAction>
              {ledger.revenue.deltaUsd > 0 ? (
                <Badge variant="success">
                  <IconTrendingUp className="size-3" />
                  +${ledger.revenue.deltaUsd.toLocaleString()}
                </Badge>
              ) : (
                <Badge variant="neutral">
                  {ledger.revenue.roiMultiple > 0 ? `${ledger.revenue.roiMultiple}x ROI` : isZh ? "实时监测" : "Live"}
                </Badge>
              )}
            </CardAction>
          </CardHeader>
          <CardContent className="pt-0 text-[13px] text-muted-foreground">
            <span className="font-medium text-foreground">
              {isZh ? `单次点击产出 $${rpv}` : `$${rpv} per click`}
            </span>
            <span className="mx-1.5 opacity-45">·</span>
            <span>{isZh ? `${ledger.revenue.funnel.paid} 笔已核验收款` : `${ledger.revenue.funnel.paid} verified orders`}</span>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader className="pb-1.5">
            <CardDescription>{isZh ? "边缘短链总点击" : "Edge Shortlink Clicks"}</CardDescription>
            <CardTitle className="text-[28px] font-semibold tracking-tight leading-tight">
              {ledger.revenue.funnel.clicks.toLocaleString()}
            </CardTitle>
            <CardAction>
              <Badge variant={ledger.revenue.clicksDeltaPct > 0 ? "success" : "neutral"}>
                {ledger.revenue.clicksDeltaPct > 0
                  ? `+${ledger.revenue.clicksDeltaPct}%`
                  : `${ledger.revenue.conversionRate}% CVR`}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="pt-0 text-[13px] text-muted-foreground">
            <span className="font-medium text-foreground">
              {ledger.revenue.funnel.signups} {isZh ? "注册" : "signups"}
            </span>
            <span className="mx-1.5 opacity-45">·</span>
            <span>{isZh ? `进站 ${ledger.revenue.funnel.visits.toLocaleString()}` : `${ledger.revenue.funnel.visits.toLocaleString()} visits`}</span>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader className="pb-1.5">
            <CardDescription>{isZh ? "已收录高权重目录" : "Verified Backlinks"}</CardDescription>
            <CardTitle className="text-[28px] font-semibold tracking-tight leading-tight">
              {ledger.dirCounts.live}
              <span className="text-base font-normal text-muted-foreground"> / {ledger.dirCounts.total}</span>
            </CardTitle>
            <CardAction>
              <Badge variant={ledger.dirCounts.submitted > 0 ? "warning" : "neutral"}>
                {isZh ? `审核中 ${ledger.dirCounts.submitted}` : `${ledger.dirCounts.submitted} review`}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="pt-0 text-[13px] text-muted-foreground">
            <span className="font-medium text-foreground">{dirProgressPct}%</span>
            <span className="mx-1.5 opacity-45">·</span>
            <span>{isZh ? `待推进 ${ledger.dirCounts.queued} 站` : `${ledger.dirCounts.queued} queued`}</span>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader className="pb-1.5">
            <CardDescription>{isZh ? "高意向求购信号" : "High-Intent Buyer Leads"}</CardDescription>
            <CardTitle className="text-[28px] font-semibold tracking-tight leading-tight">
              {ledger.leadCounts.pending}
            </CardTitle>
            <CardAction>
              <Badge variant={ledger.leadCounts.won > 0 ? "success" : "neutral"}>
                {isZh ? `已转化 ${ledger.leadCounts.won}` : `${ledger.leadCounts.won} won`}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="pt-0 text-[13px] text-muted-foreground">
            <span className="font-medium text-foreground">
              {isZh ? `共 ${ledger.leadCounts.all} 条` : `${ledger.leadCounts.all} active`}
            </span>
            <span className="mx-1.5 opacity-45">·</span>
            <span>Reddit · HN · GitHub</span>
          </CardContent>
        </Card>
      </div>

      {/* LaunchPulse 专属签名组件：100 目录三波次光学磨砂矩阵 */}
      <WaveTelemetryMatrix
        directories={ledger.directories}
        isZh={isZh}
        onSelectDirectory={onOpenDirectory}
        onSelectWave={() => onGoDirectories()}
      />

      {/* 中部主体：若真实账号暂无点击与营收，展示高转化“首周 4 步冲刺清单”替代死图 */}
      {!hasTelemetryData ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-7 shadow-xs">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>{isZh ? "首周上线冲刺清单" : "First-Week Launch Checklist"}</CardTitle>
                  <CardDescription className="mt-1">
                    {isZh
                      ? "按以下 4 步启动分发与归因，产生首条真实点击后此处自动切换为趋势分析图"
                      : "Complete these 4 steps to activate attribution charts automatically"}
                  </CardDescription>
                </div>
                <Badge variant="info" className="font-mono">
                  {completedChecks} / 4
                </Badge>
              </div>
              <Progress value={(completedChecks / 4) * 100} className="h-1.5 mt-2" />
            </CardHeader>
            <CardContent className="space-y-2.5">
              {checklistSteps.map((step, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3.5 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md ${
                        step.done
                          ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {step.done ? <IconCircleCheck className="size-4" /> : step.icon}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${step.done ? "line-through text-muted-foreground" : ""}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                  <Button
                    variant={step.done ? "ghost" : "outline"}
                    size="sm"
                    className="shrink-0"
                    onClick={step.onClick}
                  >
                    {step.done ? (isZh ? "查看" : "View") : step.actionLabel}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-5 shadow-xs">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{isZh ? "推荐首发免费高权重目录" : "Recommended Free Starter Directories"}</CardTitle>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onGoDirectories}>
                  {isZh ? "全部 100 站" : "All 100"}
                  <IconArrowRight className="size-3.5" />
                </Button>
              </div>
              <CardDescription>
                {isZh ? "优先提交这些免审核费的高 DR 站点，点击可查看物料并标记进度" : "Start with these free high-DR directories"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {ledger.recommendedStarterDirs.map((dir) => (
                <button
                  key={dir.id}
                  type="button"
                  onClick={() => onOpenDirectory(dir)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-mono text-xs font-semibold">
                      {dir.dr}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{dir.name}</p>
                      <p className="text-xs text-muted-foreground">
                        DR {dir.dr} · {dir.linkType === "dofollow" ? (isZh ? "传递权重" : "Dofollow") : "Nofollow"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="neutral">{isZh ? "待首发" : "Starter"}</Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* 趋势分析主图（7D/30D + 营收/点击切换）+ 今日待办行动流 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-8 shadow-xs">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span>{isZh ? "归因营收与导流趋势" : "Attributed Revenue & Click Velocity"}</span>
                    {ledger.revenue.deltaUsd > 0 && (
                      <Badge variant="success" className="font-mono text-[11px]">
                        +${ledger.revenue.deltaUsd.toLocaleString()}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {isZh
                      ? "按边缘短链与转化像素回传统计的每日变化"
                      : "Daily velocity from edge tracking links and conversion pixel"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Tabs value={metric} onValueChange={(v) => setMetric(v as "revenueUsd" | "clicks")}>
                    <TabsList className="h-8">
                      <TabsTrigger value="revenueUsd" className="text-xs px-2.5">
                        {isZh ? "营收" : "Revenue"}
                      </TabsTrigger>
                      <TabsTrigger value="clicks" className="text-xs px-2.5">
                        {isZh ? "点击" : "Clicks"}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Tabs value={range} onValueChange={(v) => setRange(v as "7d" | "30d")}>
                    <TabsList className="h-8">
                      <TabsTrigger value="7d" className="text-xs px-2">
                        7D
                      </TabsTrigger>
                      <TabsTrigger value="30d" className="text-xs px-2">
                        30D
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent className="px-2 pt-2 sm:px-6">
                <ChartContainer config={areaChartConfig} className="aspect-auto h-[250px] w-full">
                  <AreaChart accessibilityLayer data={slicedSeries} margin={{ left: 0, right: 16, top: 8 }}>
                    <defs>
                      <linearGradient id="lpAreaFill" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={metric === "revenueUsd" ? "var(--color-revenueUsd)" : "var(--color-clicks)"}
                          stopOpacity={0.28}
                        />
                        <stop
                          offset="95%"
                          stopColor={metric === "revenueUsd" ? "var(--color-revenueUsd)" : "var(--color-clicks)"}
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={46}
                      tickFormatter={(v) => (metric === "revenueUsd" ? `$${v}` : String(v))}
                    />
                    <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                    <Area
                      dataKey={metric}
                      type="monotone"
                      fill="url(#lpAreaFill)"
                      stroke={metric === "revenueUsd" ? "var(--color-revenueUsd)" : "var(--color-clicks)"}
                      strokeWidth={2.2}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-4 flex flex-col shadow-xs">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{isZh ? "今日待办行动流" : "Priority Queue"}</CardTitle>
                  <Badge variant={activeTodoCount > 0 ? "warning" : "success"}>
                    {activeTodoCount > 0
                      ? isZh
                        ? `剩余 ${activeTodoCount} 项`
                        : `${activeTodoCount} open`
                      : isZh
                        ? "已清空"
                        : "Clear"}
                  </Badge>
                </div>
                <CardDescription>
                  {isZh ? "按转化影响排序，点击即可直达闭环" : "Highest-leverage actions first"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between gap-3">
                {activeTodoCount === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center gap-2">
                    <IconCheck className="size-6 text-emerald-500" />
                    <p className="text-sm font-medium">
                      {isZh ? "今日重点待办已全部完成" : "All priority actions complete"}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Button variant="outline" size="sm" onClick={onGoDirectories}>
                        {isZh ? "目录分发" : "Directories"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onGoInboxLead()}>
                        {isZh ? "买家收件箱" : "Buyer Inbox"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {needsBrandKit && (
                      <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-medium leading-snug">
                            {isZh ? `补齐 ${firstMissing}，将物料完善至 100%` : `Add ${firstMissing} to complete Brand Kit`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isZh ? `当前完成度 ${ledger.brandKit.score}%` : `${ledger.brandKit.score}% complete`}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={onOpenBrandKit}>
                          {isZh ? "去补充" : "Edit"}
                        </Button>
                      </div>
                    )}

                    {needsWaveApproval && (
                      <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-medium leading-snug">
                            {isZh ? `批准第 2 周 ${wave2Count} 个精选目录` : `Approve Wave 2 (${wave2Count} directories)`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isZh ? "按 3 周自然节奏提交，保障收录率" : "Natural 3-week cadence for clean DR growth"}
                          </p>
                        </div>
                        <Button size="sm" disabled={approvingWave} onClick={onApproveWave2}>
                          {approvingWave ? (isZh ? "处理中..." : "Saving...") : isZh ? "一键批准" : "Approve"}
                        </Button>
                      </div>
                    )}

                    {pendingLeadsCount > 0 && (
                      <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-medium leading-snug">
                            {isZh ? `回复 ${pendingLeadsCount} 条高意向买家求购帖` : `Reply to ${pendingLeadsCount} buyer threads`}
                          </p>
                          {topPendingLead && (
                            <p className="text-xs text-muted-foreground truncate">
                              {topPendingLead.source} · {topPendingLead.title}
                            </p>
                          )}
                        </div>
                        <Button
                          variant={!needsWaveApproval ? "default" : "outline"}
                          size="sm"
                          onClick={() => onGoInboxLead(topPendingLead?.id)}
                        >
                          {isZh ? "拟稿" : "Draft"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {waveApprovedNotice && (
                  <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    <IconSparkles className="size-3.5 shrink-0" />
                    <span>{isZh ? "第 2 周目录批次已确认排期。" : "Wave 2 batch approved."}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 底部 3 栏分析区：Dub 同款比例条形榜 + 4 步转化漏斗 + 真实外链验活回执 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-5">
              <CardHeader>
                <CardTitle>{isZh ? "渠道归因营收排行" : "Revenue by Channel"}</CardTitle>
                <CardDescription>
                  {isZh
                    ? `总计 $${ledger.revenue.totalUsd.toLocaleString()} · 覆盖 ${ledger.revenue.channels.length} 类活跃渠道`
                    : `Total $${ledger.revenue.totalUsd.toLocaleString()} across ${ledger.revenue.channels.length} channels`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProportionalBarList
                  items={ledger.revenue.channels.map((ch) => ({
                    key: ch.key,
                    label: isZh ? ch.labelZh : ch.labelEn,
                    subLabel: `${ch.clicks.toLocaleString()} ${isZh ? "点击" : "clicks"}`,
                    value: Math.max(ch.revenueUsd, ch.clicks > 0 ? 1 : 0),
                    formattedValue: `$${ch.revenueUsd.toLocaleString()}`,
                  }))}
                  emptyText={isZh ? "暂无渠道归因数据" : "No channel data yet"}
                />
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>{isZh ? "4 步转化漏斗" : "Conversion Funnel"}</CardTitle>
                <CardDescription>
                  {isZh ? "点击至美元付费全链路转化" : "Step-by-step from click to paid"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                {funnelSteps.map((step, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-medium text-foreground">{step.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        <strong className="text-foreground">{step.value.toLocaleString()}</strong> · {step.rate}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--frost-well)]">
                      <div
                        className="h-full rounded-full bg-accent-cobalt transition-all"
                        style={{ width: `${Math.min(100, step.pct)}%`, opacity: 1 - idx * 0.14 }}
                      />
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={onGoAnalytics}>
                  {isZh ? "国家、设备与实时点击流" : "Countries & Live Clicks"}
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-4">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>
                    {ledger.hasVerifiedReceipts
                      ? isZh
                        ? "最新外链验活回执"
                        : "Verified Backlink Receipts"
                      : isZh
                        ? "推荐优先提交目录"
                        : "Recommended Starter Directories"}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={onGoDirectories} className="h-7 px-2 text-xs">
                    {ledger.dirCounts.live}/{ledger.dirCounts.total}
                    <IconArrowRight className="size-3.5" />
                  </Button>
                </div>
                <CardDescription>
                  {ledger.hasVerifiedReceipts
                    ? isZh
                      ? "点击查看收录链接、HTTP 状态与物料包"
                      : "Inspect live proof, HTTP status & snippets"
                    : isZh
                      ? "优先提交高 DR 免费目录获取初始权重"
                      : "Start with high-DR free directories"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(ledger.hasVerifiedReceipts ? ledger.recentVerifiedReceipts : ledger.recommendedStarterDirs).map(
                  (dir) => {
                    const statusVariant =
                      dir.effectiveStatus === "live"
                        ? "success"
                        : dir.effectiveStatus === "submitted"
                          ? "warning"
                          : "neutral";
                    const statusLabel =
                      dir.effectiveStatus === "live"
                        ? isZh
                          ? "已收录"
                          : "Live"
                        : dir.effectiveStatus === "submitted"
                          ? isZh
                            ? "审核中"
                            : "Review"
                          : isZh
                            ? "待提交"
                            : "Queued";
                    return (
                      <button
                        key={dir.id}
                        type="button"
                        onClick={() => onOpenDirectory(dir)}
                        className="lp-frost-well flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-[var(--frost-pill)] cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <DomainFavicon name={dir.name} url={dir.url} />
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-medium truncate">{dir.name.replace(" Software", "")}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              DR {dir.dr} · {dir.linkType === "dofollow" ? "Dofollow" : "Nofollow"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <Badge variant={statusVariant}>{statusLabel}</Badge>
                          {dir.attributedClicks > 0 && (
                            <span className="tabular-nums text-xs text-muted-foreground">
                              {dir.attributedClicks} {isZh ? "点击" : "clicks"}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  }
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
