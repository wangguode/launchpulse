"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Printer, ShieldCheck } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LangSwitcher from "@/components/LangSwitcher";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import RevenuePulseChart from "@/components/console/RevenuePulseChart";
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
 * V5 公开只读增长归因战报页（/report?id=... 或 /report/:shareId）
 * 严格遵循 V5 Framed Sheet / True-Dark Obsidian 精密版式，支持打印导出 PDF
 */
export default function PublicGrowthReportPage() {
  const { locale } = useI18n();
  const isZh = locale === "zh";

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
        if (shareId === "demo-acmeflow") {
          setData(buildFallbackSampleReport());
        } else {
          setError(isZh ? "未找到对应的公开增长战报链接。" : "Public growth report not found.");
        }
      })
      .finally(() => setLoading(false));
  }, [isZh]);

  const normalizedSeries = (data?.stats.dailySeries || []).map((pt) => ({
    date: pt.date,
    clicks: pt.clicks,
    conversions: pt.conversions,
    revenueUsd: typeof pt.revenueUsd === "number" ? pt.revenueUsd : Math.round(pt.clicks * (data?.stats.rpv || 1.2)),
  }));

  return (
    <div className="min-h-screen bg-[var(--bg-frame)] text-[var(--ink-primary)] flex flex-col">
      <header className="h-12 px-4 sm:px-6 border-b border-[var(--border-hairline)] bg-[var(--bg-frame)] flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 text-[13px] min-w-0">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold text-[14.5px] text-[var(--ink-primary)] shrink-0">
            <BrandMark className="w-5 h-5" />
            <span>LaunchPulse</span>
          </Link>
          <span className="text-[var(--border-strong)]">/</span>
          <span className="text-[var(--ink-secondary)] truncate">{isZh ? "公开可核验战报" : "Public Report"}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <LangSwitcher />
          <div className="hidden sm:block">
            <ThemeSwitcher />
          </div>
          <Button variant="secondary" size="xs" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" />
            {isZh ? "导出 PDF" : "Print / PDF"}
          </Button>
        </div>
      </header>

      <main className="flex-1 p-3 sm:p-5 max-w-[1040px] w-full mx-auto">
        {loading ? (
          <div className="rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] p-16 text-center text-[13px] text-[var(--ink-muted)]">
            {isZh ? "正在拉取实时边缘归因战报..." : "Loading verified attribution report..."}
          </div>
        ) : error || !data ? (
          <div className="rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] p-16 text-center space-y-3">
            <p className="text-[15px] font-semibold text-[var(--ink-primary)]">{error}</p>
            <Link href="/report?id=demo-acmeflow" className="text-[13px] text-[var(--accent-primary)] hover:underline">
              {isZh ? "查看 AcmeFlow 示例战报 →" : "Open Sample Report →"}
            </Link>
          </div>
        ) : (
          <div className="rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] overflow-hidden divide-y divide-[var(--border-hairline)]">
            {/* 头部认证与产品信息 */}
            <div className="p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <h1 className="lp-display text-[22px] sm:text-[26px] font-semibold text-[var(--ink-primary)]">
                  {data.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--ink-secondary)]">
                  <span className="font-medium text-[var(--ink-primary)]">{data.productName}</span>
                  <span>·</span>
                  <a
                    href={data.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[12.5px] text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1"
                  >
                    {data.targetUrl.replace(/^https?:\/\//, "")}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[12px] text-[var(--status-live)] font-medium shrink-0">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{isZh ? "Cloudflare 边缘归因实证" : "Verified Edge Attribution"}</span>
              </div>
            </div>

            {/* 核心 2:1 归因脉搏与外链回执 */}
            <div className="grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-hairline)]">
              {/* 左 7 列：主营收焦点 + 全宽趋势图 + 4 步漏斗 */}
              <div className="lg:col-span-7 p-6 sm:p-7 space-y-6 tabular-nums">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <p className="text-[12.5px] text-[var(--ink-muted)]">
                      {data.showRevenue
                        ? isZh
                          ? "近 30 天归因美元营收"
                          : "Attributed Revenue (30d)"
                        : isZh
                          ? "近 30 天累计有效点击"
                          : "Attributed Clicks (30d)"}
                    </p>
                    <p className="text-[34px] font-bold tracking-[-0.03em] text-[var(--ink-primary)] mt-1">
                      {data.showRevenue
                        ? `$${data.stats.attributedRevenueUsd.toLocaleString()}`
                        : data.stats.totalClicks.toLocaleString()}
                    </p>
                  </div>

                  <div className="text-right text-[12.5px] text-[var(--ink-muted)]">
                    <div>
                      {isZh ? "已验活目录：" : "Verified backlinks: "}
                      <strong className="font-mono text-[var(--ink-primary)]">
                        {data.stats.directoriesLive}/{data.stats.directoriesTotal || 100}
                      </strong>
                    </div>
                    <div className="mt-0.5">
                      {isZh ? "单次访问产出：" : "Revenue / visit: "}
                      <strong className="font-mono text-[var(--ink-primary)]">${data.stats.rpv.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

                <RevenuePulseChart series={normalizedSeries} isZh={isZh} />

                <div className="py-3.5 border-t border-[var(--border-hairline)] grid grid-cols-4 text-center">
                  <div>
                    <div className="text-[16px] font-semibold text-[var(--ink-primary)]">
                      {data.stats.funnel.clicks.toLocaleString()}
                    </div>
                    <div className="text-[11.5px] text-[var(--ink-muted)] mt-0.5">{isZh ? "点击" : "Clicks"}</div>
                  </div>
                  <div>
                    <div className="text-[16px] font-semibold text-[var(--ink-primary)]">
                      {data.stats.funnel.qualifiedVisits.toLocaleString()}
                    </div>
                    <div className="text-[11.5px] text-[var(--ink-muted)] mt-0.5">{isZh ? "进站" : "Visits"}</div>
                  </div>
                  <div>
                    <div className="text-[16px] font-semibold text-[var(--ink-primary)]">
                      {data.stats.funnel.signups.toLocaleString()}
                    </div>
                    <div className="text-[11.5px] text-[var(--ink-muted)] mt-0.5">{isZh ? "注册" : "Signups"}</div>
                  </div>
                  <div>
                    <div className="text-[16px] font-semibold text-[var(--ink-primary)]">
                      {data.stats.funnel.purchases.toLocaleString()}
                    </div>
                    <div className="text-[11.5px] text-[var(--ink-muted)] mt-0.5">{isZh ? "付费" : "Paid"}</div>
                  </div>
                </div>
              </div>

              {/* 右 5 列：渠道拆解 + 权威外链样本 */}
              <div className="lg:col-span-5 p-6 sm:p-7 space-y-6 tabular-nums">
                <div className="space-y-3">
                  <h2 className="text-[13.5px] font-semibold text-[var(--ink-primary)]">
                    {isZh ? "按渠道归因拆解" : "Revenue by Channel"}
                  </h2>
                  <div className="space-y-2.5 text-[13px]">
                    {data.stats.channelBreakdown.map((ch) => (
                      <div key={ch.channel} className="flex items-baseline gap-2">
                        <span className="font-medium text-[var(--ink-primary)] shrink-0">
                          {formatChannelLabel(ch.channel, isZh)}
                        </span>
                        <span className="flex-1 border-b border-dotted border-[var(--border-strong)] -translate-y-1" />
                        <span className="font-mono font-semibold text-[var(--ink-primary)] shrink-0">
                          {data.showRevenue && typeof ch.revenueUsd === "number"
                            ? `$${ch.revenueUsd.toLocaleString()}`
                            : `${ch.clicks} ${isZh ? "点击" : "clicks"}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-[var(--border-hairline)]">
                  <h2 className="text-[13.5px] font-semibold text-[var(--ink-primary)]">
                    {isZh ? "代表性已验活高权重外链" : "Verified High-DR Backlinks"}
                  </h2>
                  <div className="divide-y divide-[var(--border-hairline)] border border-[var(--border-hairline)] rounded-[8px] text-[12.5px]">
                    {(data.stats.topDirectories || []).slice(0, 6).map((dir, i) => (
                      <div key={i} className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                        <span className="font-medium text-[var(--ink-primary)] truncate">{dir.name}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-[var(--ink-secondary)]">DR {dir.dr}</span>
                          <StatusBadge tone="success" label={isZh ? "已验活" : "Live"} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 底部 CTA */}
            <div className="px-6 py-4 bg-[var(--bg-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
              <p className="text-[12.5px] text-[var(--ink-secondary)]">
                {isZh
                  ? "由 LaunchPulse 边缘归因引擎实时生成，支持向团队或投资人透明分享。"
                  : "Generated live by LaunchPulse Edge Attribution."}
              </p>
              <Link
                href="/dashboard?sample=1"
                className="h-8 px-3.5 rounded-[7px] lp-btn-primary text-[12.5px] font-medium inline-flex items-center justify-center shrink-0"
              >
                {isZh ? "免费体验同款增长指挥台" : "Try Command Center"}
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
