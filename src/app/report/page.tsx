"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { IconExternalLink, IconPrinter, IconShieldCheck } from "@tabler/icons-react";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";
import { buildSampleOverview, deriveConsoleLedger, formatChannelLabel } from "@/lib/console-ledger";

interface PublicReportData {
  shareId: string;
  title: string;
  productName: string;
  targetUrl: string;
  showRevenue: boolean;
  generatedAt: string;
  stats: {
    totalClicks: number;
    totalConversions: number;
    conversionRate: number;
    attributedRevenueUsd: number;
    rpv: number;
    roiMultiple: number;
    directoriesLive: number;
    directoriesTotal: number;
    funnel: { clicks: number; qualifiedVisits: number; signups: number; purchases: number };
    dailySeries: Array<{ date: string; clicks: number; conversions: number; revenueUsd?: number }>;
    channelBreakdown: Array<{ channel: string; clicks: number; conversions: number; cvr: number; revenueUsd?: number }>;
    topDirectories: Array<{ name: string; dr: number; linkType?: string; url?: string }>;
  };
}

function buildFallbackSampleReport(): PublicReportData {
  const sample = buildSampleOverview();
  const ledger = deriveConsoleLedger(sample, true);
  return {
    shareId: "demo-acmeflow",
    title: "AcmeFlow · 30 天增长归因战报",
    productName: "AcmeFlow",
    targetUrl: "https://acmeflow.example",
    showRevenue: true,
    generatedAt: "2026-11-25",
    stats: {
      totalClicks: ledger.revenue.funnel.clicks,
      totalConversions: ledger.revenue.funnel.signups,
      conversionRate: 3.8,
      attributedRevenueUsd: ledger.revenue.totalUsd,
      rpv: 1.48,
      roiMultiple: 53.5,
      directoriesLive: ledger.dirCounts.live,
      directoriesTotal: ledger.dirCounts.total,
      funnel: {
        clicks: ledger.revenue.funnel.clicks,
        qualifiedVisits: ledger.revenue.funnel.visits,
        signups: ledger.revenue.funnel.signups,
        purchases: ledger.revenue.funnel.paid,
      },
      dailySeries: ledger.revenue.dailySeries,
      channelBreakdown: ledger.revenue.channels.map((ch) => ({
        channel: ch.key,
        clicks: ch.clicks,
        conversions: 0,
        cvr: 0,
        revenueUsd: ch.revenueUsd,
      })),
      topDirectories: ledger.recentVerifiedReceipts.map((d) => ({
        name: d.name,
        dr: d.dr,
        linkType: d.linkType,
        url: d.url,
      })),
    },
  };
}

/**
 * 标准官方 shadcn/ui + Recharts 3 公开可核验增长战报页（/report）
 */
export default function PublicGrowthReportPage() {
  const { locale } = useI18n();
  const isZh = locale === "zh";

  const reportChartConfig = useMemo(
    () =>
      ({
        revenueUsd: { label: isZh ? "归因营收 ($)" : "Attributed Revenue ($)", color: "var(--chart-2)" },
      }) satisfies ChartConfig,
    [isZh]
  );

  const [data, setData] = useState<PublicReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const pathMatch = window.location.pathname.match(/^\/report\/([a-zA-Z0-9-_]+)/);
    const shareId = params.get("id") || pathMatch?.[1] || "demo-acmeflow";

    fetch(`/api/public-report/${encodeURIComponent(shareId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("not_found");
        return (await res.json()) as PublicReportData;
      })
      .then((json) => setData(json))
      .catch(() => {
        if (shareId === "demo-acmeflow") setData(buildFallbackSampleReport());
        else setError(isZh ? "未找到对应的公开增长战报。" : "Report not found.");
      })
      .finally(() => setLoading(false));
  }, [isZh]);

  const series = (data?.stats.dailySeries || []).map((pt) => ({
    date: pt.date.slice(5),
    revenueUsd: typeof pt.revenueUsd === "number" ? pt.revenueUsd : Math.round(pt.clicks * (data?.stats.rpv || 1.2)),
  }));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-14 border-b px-4 sm:px-6 flex items-center justify-between print:hidden">
        <Link href="/" className="flex items-center gap-2 font-semibold text-sm">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BrandMark className="size-4" tone="light" />
          </div>
          <span>LaunchPulse</span>
          <Badge variant="secondary" className="ml-1">{isZh ? "公开战报" : "Public Report"}</Badge>
        </Link>
        <div className="flex items-center gap-2">
          <LangSwitcher />
          <ThemeModeToggle />
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <IconPrinter className="size-4" />
            {isZh ? "导出 PDF" : "Print"}
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6 space-y-6">
        {loading ? (
          <Card className="p-16 text-center text-sm text-muted-foreground">
            {isZh ? "正在加载边缘归因战报..." : "Loading report..."}
          </Card>
        ) : error || !data ? (
          <Card className="p-16 text-center space-y-3">
            <p className="font-semibold">{error}</p>
            <Button variant="link" render={<Link href="/report?id=demo-acmeflow" />}>
              {isZh ? "查看 AcmeFlow 示例战报 →" : "Open Sample Report →"}
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{data.title}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{data.productName}</span>
                  <span>·</span>
                  <a
                    href={data.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {data.targetUrl.replace(/^https?:\/\//, "")}
                    <IconExternalLink className="size-3" />
                  </a>
                </CardDescription>
                <CardAction>
                  <Badge variant="secondary" className="gap-1.5">
                    <IconShieldCheck className="size-3.5 text-emerald-500" />
                    {isZh ? "Cloudflare 边缘归因实证" : "Verified Edge Attribution"}
                  </Badge>
                </CardAction>
              </CardHeader>
            </Card>

            <div className="grid gap-4 lg:grid-cols-7 tabular-nums">
              <Card className="lg:col-span-4">
                <CardHeader>
                  <CardDescription>{isZh ? "近 30 天归因美元营收" : "Attributed Revenue (30d)"}</CardDescription>
                  <CardTitle className="text-3xl font-bold">
                    ${data.stats.attributedRevenueUsd.toLocaleString()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ChartContainer config={reportChartConfig} className="aspect-auto h-[220px] w-full">
                    <AreaChart data={series} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} />
                      <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `$${v}`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        dataKey="revenueUsd"
                        type="monotone"
                        fill="var(--color-revenueUsd)"
                        fillOpacity={0.2}
                        stroke="var(--color-revenueUsd)"
                        strokeWidth={2}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ChartContainer>
                  <Separator />
                  <div className="grid grid-cols-4 text-center">
                    <div>
                      <div className="font-semibold">{data.stats.funnel.clicks.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{isZh ? "点击" : "Clicks"}</div>
                    </div>
                    <div>
                      <div className="font-semibold">{data.stats.funnel.qualifiedVisits.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{isZh ? "进站" : "Visits"}</div>
                    </div>
                    <div>
                      <div className="font-semibold">{data.stats.funnel.signups}</div>
                      <div className="text-xs text-muted-foreground">{isZh ? "注册" : "Signups"}</div>
                    </div>
                    <div>
                      <div className="font-semibold">{data.stats.funnel.purchases}</div>
                      <div className="text-xs text-muted-foreground">{isZh ? "付费" : "Paid"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-base">{isZh ? "渠道拆解与权威外链" : "Channels & Backlinks"}</CardTitle>
                  <CardDescription>
                    {isZh
                      ? `已验活 ${data.stats.directoriesLive}/${data.stats.directoriesTotal || 100} 站 · 单次访问产出 $${data.stats.rpv.toFixed(2)}`
                      : `${data.stats.directoriesLive}/${data.stats.directoriesTotal || 100} live · $${data.stats.rpv.toFixed(2)}/visit`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    {data.stats.channelBreakdown.map((ch) => (
                      <div key={ch.channel} className="flex items-center justify-between">
                        <span>{formatChannelLabel(ch.channel, isZh)}</span>
                        <span className="font-mono font-semibold">${(ch.revenueUsd || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    {data.stats.topDirectories.slice(0, 5).map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-xs rounded-md border px-3 py-2">
                        <span className="font-medium truncate">{d.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-muted-foreground">DR {d.dr}</span>
                          <Badge variant="secondary" className="text-xs">
                            {isZh ? "已验活" : "Live"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
