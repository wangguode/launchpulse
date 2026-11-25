"use client";

import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  IconArrowRight,
  IconCheck,
  IconFolderPlus,
  IconSparkles,
  IconTrendingUp,
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
import { Separator } from "@/components/ui/separator";
import type { RadarLeadRecord, ReconciledDirectoryRow, ReconciledLedger } from "@/lib/console-ledger";

interface TodayCommandViewProps {
  ledger: ReconciledLedger;
  topPendingLead: RadarLeadRecord | null;
  hasProject: boolean;
  isZh: boolean;
  approvingWave: boolean;
  waveApprovedNotice: boolean;
  onOpenBrandKit: () => void;
  onApproveWave2: () => void;
  onGoInboxLead: (leadId?: number) => void;
  onOpenDirectory: (dir: ReconciledDirectoryRow) => void;
  onGoDirectories: () => void;
  onCreateProject: () => void;
}

/**
 * 视图 ①：今日总览与归因（官方 shadcn/ui @container/card + Recharts 3）
 * - 真实新用户 0 项目时展示高转化 3 步冷启动激活向导，彻底消除满屏 $0 落差
 */
export default function TodayCommandView({
  ledger,
  topPendingLead,
  hasProject,
  isZh,
  approvingWave,
  waveApprovedNotice,
  onOpenBrandKit,
  onApproveWave2,
  onGoInboxLead,
  onOpenDirectory,
  onGoDirectories,
  onCreateProject,
}: TodayCommandViewProps) {
  const areaChartConfig = useMemo(
    () =>
      ({
        revenueUsd: {
          label: isZh ? "归因营收 ($)" : "Attributed Revenue ($)",
          color: "var(--chart-2)",
        },
        clicks: {
          label: isZh ? "有效点击" : "Verified Clicks",
          color: "var(--chart-1)",
        },
      }) satisfies ChartConfig,
    [isZh]
  );

  const barChartConfig = useMemo(
    () =>
      ({
        revenueUsd: {
          label: isZh ? "归因美元 ($)" : "Attributed USD ($)",
          color: "var(--chart-2)",
        },
      }) satisfies ChartConfig,
    [isZh]
  );

  if (!hasProject) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
        <Card className="w-full max-w-2xl">
          <CardHeader className="space-y-2">
            <Badge variant="secondary" className="w-fit">
              {isZh ? "30 秒完成冷启动建档" : "30-Second Workspace Setup"}
            </Badge>
            <CardTitle className="text-2xl">
              {isZh ? "添加你的首个出海产品，开启外链与买家雷达" : "Add your first product to launch distribution & buyer radar"}
            </CardTitle>
            <CardDescription>
              {isZh
                ? "只需粘贴官网地址，系统自动抓取产品 Logo、简介与定位并一键填充 Brand Kit，告别手动填表。"
                : "Paste your website URL once — we auto-crawl your Brand Kit, pace 100+ directory submissions, and monitor Reddit / HN / GitHub."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3">
            {[
              {
                step: "1",
                title: isZh ? "输入网址自动抓取" : "Auto-crawl URL",
                desc: isZh ? "3 秒拉取 Logo、定位、三档英文简介与分类" : "Extracts logo, tagline & pitch automatically",
              },
              {
                step: "2",
                title: isZh ? "100+ 目录节奏分发" : "100+ Directories",
                desc: isZh ? "按 DR 权重降序分 3 周推进并自动 HTTP 验活" : "DR-sorted 3-week waves with HTTP checks",
              },
              {
                step: "3",
                title: isZh ? "Reddit / HN 买家雷达" : "AI Buyer Radar",
                desc: isZh ? "扫帖抓高意向求购 + 真大模型零链接原生精编" : "Live buyer threads + zero-link AI replies",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-lg border bg-muted/30 p-3.5 space-y-1">
                <span className="font-mono text-xs text-muted-foreground">0{item.step}</span>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </CardContent>
          <CardFooter className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {isZh ? "免费账号立即可用前 10 个高权重目录与前 3 条买家线索。" : "Free plan includes Top 10 directories & 3 buyer threads."}
            </p>
            <Button onClick={onCreateProject}>
              <IconFolderPlus className="size-4" />
              {isZh ? "输入官网一键创建项目" : "Create Project from URL"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  const needsBrandKit = ledger.brandKit.score < 100;
  const wave2Count = ledger.dirCounts.wave2PendingIds.length;
  const needsWaveApproval = wave2Count > 0 && !waveApprovedNotice;
  const pendingLeadsCount = ledger.leadCounts.pending;

  const activeTodoCount =
    (needsBrandKit ? 1 : 0) + (needsWaveApproval ? 1 : 0) + (pendingLeadsCount > 0 ? 1 : 0);

  const firstMissing = isZh
    ? ledger.brandKit.missingItemsZh[0] || "核心物料"
    : ledger.brandKit.missingItemsEn[0] || "brand asset";

  const rpv =
    ledger.revenue.funnel.clicks > 0
      ? (ledger.revenue.totalUsd / ledger.revenue.funnel.clicks).toFixed(2)
      : "0.00";

  const areaData = ledger.revenue.dailySeries.map((pt) => ({
    date: pt.date.slice(5),
    revenueUsd: pt.revenueUsd,
    clicks: pt.clicks,
  }));

  const channelBarData = ledger.revenue.channels.map((ch) => ({
    channel: isZh ? ch.labelZh : ch.labelEn,
    revenueUsd: ch.revenueUsd,
    clicks: ch.clicks,
  }));

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      {/* 顶部标题区 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isZh ? "今日增长指挥台" : "Growth Overview"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeTodoCount > 0
              ? isZh
                ? `今日有 ${activeTodoCount} 项关键推进可直接带来高权重外链与海外付费咨询`
                : `${activeTodoCount} priority actions today to drive backlinks and revenue`
              : isZh
                ? "今日待办已全部清零，系统正持续监测海外求购与外链存活"
                : "All priority tasks cleared — monitoring backlinks and leads continuously"}
          </p>
        </div>

        {!hasProject && (
          <Button size="sm" onClick={onCreateProject}>
            <IconFolderPlus className="size-4" />
            {isZh ? "创建首个出海项目" : "Create Project"}
          </Button>
        )}
      </div>

      {/* Kiranism 原装 4 列 @container/card KPI 卡片组（严格单一数据源，0 矛盾） */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-2 lg:grid-cols-4">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>{isZh ? "近 30 天归因营收" : "Attributed Revenue (30d)"}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              ${ledger.revenue.totalUsd.toLocaleString()}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="tabular-nums">
                <IconTrendingUp className="size-3.5" />
                +${ledger.revenue.deltaUsd.toLocaleString()}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 text-sm">
            <div className="line-clamp-1 font-medium tabular-nums">
              {isZh ? `单次访问产出 $${rpv}` : `$${rpv} revenue per visit`}
            </div>
            <div className="text-muted-foreground text-xs">
              {isZh ? "目录 + 社区 + 对比页三渠道精确合计" : "Exact sum across all active channels"}
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>{isZh ? "导流转化漏斗" : "Conversion Funnel"}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {ledger.revenue.funnel.paid} {isZh ? "付费" : "Paid"}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="tabular-nums">
                {ledger.revenue.funnel.clicks.toLocaleString()} {isZh ? "点击" : "clicks"}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 text-sm">
            <div className="line-clamp-1 font-medium tabular-nums">
              {ledger.revenue.funnel.visits.toLocaleString()} {isZh ? "进站" : "visits"} →{" "}
              {ledger.revenue.funnel.signups} {isZh ? "注册" : "signups"}
            </div>
            <div className="text-muted-foreground text-xs">
              {isZh ? "Cloudflare 边缘短链与像素实测" : "Edge shortlink & pixel verified"}
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>{isZh ? "已验活目录外链" : "Verified Backlinks"}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {ledger.dirCounts.live} / {ledger.dirCounts.total}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="tabular-nums">
                {isZh ? `审核中 ${ledger.dirCounts.submitted}` : `${ledger.dirCounts.submitted} review`}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 text-sm">
            <div className="line-clamp-1 font-medium tabular-nums">
              {isZh
                ? `第 1 周 ${ledger.dirCounts.wave1} · 第 2 周 ${ledger.dirCounts.wave2} · 第 3 周 ${ledger.dirCounts.wave3}`
                : `W1 ${ledger.dirCounts.wave1} · W2 ${ledger.dirCounts.wave2} · W3 ${ledger.dirCounts.wave3}`}
            </div>
            <div className="text-muted-foreground text-xs">
              {isZh ? "自动 HTTP 200 存活与权重探测" : "Automated HTTP 200 link verification"}
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>{isZh ? "待跟进求购线索" : "Pending Buyer Leads"}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {ledger.leadCounts.pending}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="tabular-nums">
                {isZh ? `已转化 ${ledger.leadCounts.won}` : `${ledger.leadCounts.won} won`}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 text-sm">
            <div className="line-clamp-1 font-medium tabular-nums">
              {isZh
                ? `总计 ${ledger.leadCounts.all} 条 · 已回复 ${ledger.leadCounts.replied} 条`
                : `${ledger.leadCounts.all} total · ${ledger.leadCounts.replied} replied`}
            </div>
            <div className="text-muted-foreground text-xs">
              {isZh ? "Reddit · Hacker News · GitHub · DEV.to 实时监测" : "Live across Reddit, HN, GitHub & DEV.to"}
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* 中部 7 列网格：左 4 列 Recharts 3 交互面积图 + 右 3 列今日行动流 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isZh ? "30 天归因营收与导流趋势" : "30-Day Revenue & Click Velocity"}
              <Badge variant="secondary" className="font-mono text-xs tabular-nums">
                +${ledger.revenue.deltaUsd.toLocaleString()}
              </Badge>
            </CardTitle>
            <CardDescription>
              {isZh
                ? "基于边缘短链点击与像素回传的每日美元归因曲线"
                : "Daily attributed USD revenue and referral click telemetry"}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 pt-2 sm:px-6">
            <ChartContainer config={areaChartConfig} className="aspect-auto h-[250px] w-full">
              <AreaChart accessibilityLayer data={areaData} margin={{ left: 0, right: 18, top: 8 }}>
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-revenueUsd)" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="var(--color-revenueUsd)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={28}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={42}
                  tickFormatter={(v) => `$${v}`}
                />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Area
                  dataKey="revenueUsd"
                  type="monotone"
                  fill="url(#fillRevenue)"
                  stroke="var(--color-revenueUsd)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{isZh ? "今日待办行动流" : "Today's Action Queue"}</span>
              <Badge variant="outline" className="tabular-nums">
                {isZh ? `剩余 ${activeTodoCount} 项` : `${activeTodoCount} open`}
              </Badge>
            </CardTitle>
            <CardDescription>
              {isZh
                ? "按优先级排好今日推进事项，点击即可原地闭环"
                : "Prioritized daily workflow actions"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between gap-3">
            {activeTodoCount === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center gap-2">
                <IconCheck className="size-6 text-emerald-500" />
                <p className="text-sm font-medium">
                  {isZh ? "今日关键推进已全部完成" : "All priority tasks completed"}
                </p>
                <div className="flex gap-2 mt-1">
                  <Button variant="outline" size="sm" onClick={onGoDirectories}>
                    {isZh ? "管理目录" : "Directories"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onGoInboxLead()}>
                    {isZh ? "打开收件箱" : "Buyer Inbox"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {needsBrandKit && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border p-3.5">
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium leading-snug">
                        {isZh
                          ? `补齐 ${firstMissing}，将物料完善至 100%`
                          : `Add ${firstMissing} to complete Brand Kit`}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {isZh
                          ? `当前完成度 ${ledger.brandKit.score}% · 自动同步全部 100 个提交表单`
                          : `${ledger.brandKit.score}% complete · synced to all 100 forms`}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={onOpenBrandKit}>
                      {isZh ? "去补充" : "Fill"}
                    </Button>
                  </div>
                )}

                {needsWaveApproval && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border p-3.5">
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium leading-snug">
                        {isZh
                          ? `确认本周第 2 批 ${wave2Count} 个精选目录名单`
                          : `Approve Wave 2 batch (${wave2Count} directories)`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isZh
                          ? "按 3 周自然节奏推进，兼顾权重提升与安全"
                          : "3-week natural cadence for clean DR velocity"}
                      </p>
                    </div>
                    <Button size="sm" disabled={approvingWave} onClick={onApproveWave2}>
                      {approvingWave ? (isZh ? "提交中..." : "Saving...") : isZh ? "一键批准" : "Approve"}
                    </Button>
                  </div>
                )}

                {pendingLeadsCount > 0 && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border p-3.5">
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium leading-snug">
                        {isZh
                          ? `回复今日 ${pendingLeadsCount} 条海外高意向求购帖`
                          : `Reply to ${pendingLeadsCount} high-intent buyer threads`}
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
                      {isZh ? "拟稿回复" : "Draft"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {waveApprovedNotice && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <IconSparkles className="size-3.5 shrink-0" />
                <span>
                  {isZh
                    ? "第 2 批目录名单已批准，正在按自然节奏推进。"
                    : "Wave 2 approved and scheduled."}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 底部 7 列网格：左 4 列 Recharts 渠道归因柱状图 + 右 3 列最新外链验活回执 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>{isZh ? "按渠道美元归因拆解" : "Revenue Attribution by Channel"}</CardTitle>
            <CardDescription className="tabular-nums">
              {isZh
                ? `总计 $${ledger.revenue.totalUsd.toLocaleString()}，严格与顶部归因营收恒等`
                : `Total $${ledger.revenue.totalUsd.toLocaleString()}, reconciled to the dollar`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChartContainer config={barChartConfig} className="aspect-auto h-[190px] w-full">
              <BarChart accessibilityLayer data={channelBarData} margin={{ left: 0, right: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="channel" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `$${v}`} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="revenueUsd" fill="var(--color-revenueUsd)" radius={[6, 6, 0, 0]} maxBarSize={56} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>

            <Separator />
            <div className="grid grid-cols-3 gap-3 text-center tabular-nums">
              {ledger.revenue.channels.map((ch) => (
                <div key={ch.key} className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">{isZh ? ch.labelZh : ch.labelEn}</p>
                  <p className="text-sm font-semibold font-mono">${ch.revenueUsd.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{isZh ? "最新外链验活回执" : "Verified Backlink Receipts"}</span>
              <Button variant="ghost" size="sm" onClick={onGoDirectories} className="h-7 px-2 text-xs">
                {isZh ? `全部 ${ledger.dirCounts.live}/${ledger.dirCounts.total}` : `All ${ledger.dirCounts.live}/${ledger.dirCounts.total}`}
                <IconArrowRight className="size-3.5" />
              </Button>
            </CardTitle>
            <CardDescription>
              {isZh ? "点击任意平台可查看提交地址、属性与短链包" : "Click any directory to inspect proof & snippets"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 tabular-nums">
            {ledger.recentVerifiedReceipts.map((dir) => {
              const isLive = dir.effectiveStatus === "live";
              return (
                <button
                  key={dir.id}
                  type="button"
                  onClick={() => onOpenDirectory(dir)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs font-semibold">
                      {dir.dr}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{dir.name.replace(" Software", "")}</p>
                      <p className="text-xs text-muted-foreground">
                        DR {dir.dr} · {dir.linkType === "dofollow" ? (isZh ? "传递权重" : "Dofollow") : "Nofollow"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={isLive ? "default" : "secondary"} className="text-[11px]">
                      {isLive ? (isZh ? "已验活" : "Verified") : isZh ? "审核中" : "Review"}
                    </Badge>
                    {dir.attributedClicks > 0 && (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {dir.attributedClicks} {isZh ? "点击" : "clicks"}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
