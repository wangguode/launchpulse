"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink, Printer, ShieldCheck } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LangSwitcher from "@/components/LangSwitcher";
import MetricStrip from "@/components/ui/MetricStrip";
import Button from "@/components/ui/Button";
import AnalyticsAreaChart from "@/components/AnalyticsAreaChart";
import ConversionFunnelCard from "@/components/console/ConversionFunnelCard";

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
    dailySeries: Array<{ date: string; clicks: number; conversions: number }>;
    channelBreakdown: Array<{ channel: string; clicks: number; conversions: number; cvr: number; revenueUsd?: number }>;
    topDirectories: Array<{ name: string; dr: number; linkType?: string; url?: string }>;
  };
}

/**
 * V4 公开只读增长归因战报页（/report/:shareId 或 /report?id=...）
 * 支持打印 / 导出 PDF、Build-in-Public 晒增长、向投资人/团队一键分享实证 ROI。
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
      .catch(() => setError(isZh ? "未找到对应的公开战报链接。" : "Public growth report not found."))
      .finally(() => setLoading(false));
  }, [isZh]);

  return (
    <div className="min-h-screen bg-[var(--apple-bg)] text-[var(--apple-ink)]">
      {/* 顶栏（打印时隐藏） */}
      <header className="sticky top-0 z-30 apple-glass border-b border-[var(--apple-border)] print:hidden">
        <div className="max-w-[1060px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] text-[var(--apple-ink)]">
            <BrandMark className="w-5 h-5" />
            <span>LaunchPulse</span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--apple-blue-soft)] text-[var(--apple-blue)]">
              {isZh ? "公开增长战报" : "Public Report"}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ThemeSwitcher />
            </div>
            <LangSwitcher />
            <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" />
              {isZh ? "打印 / 导出 PDF" : "Print / PDF"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1060px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        {loading ? (
          <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-12 text-center text-[13px] text-[var(--apple-ink-secondary)]">
            {isZh ? "正在拉取实时边缘归因数据..." : "Loading verified attribution telemetry..."}
          </div>
        ) : error || !data ? (
          <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-12 text-center space-y-3">
            <p className="text-[15px] font-semibold">{error}</p>
            <Link href="/report/demo-acmeflow" className="text-[13px] text-[var(--apple-blue)] hover:underline">
              {isZh ? "查看 AcmeFlow 官方示例战报 →" : "Open AcmeFlow Sample Report →"}
            </Link>
          </div>
        ) : (
          <>
            {/* 头部标识 */}
            <div className="rounded-[20px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--apple-green)]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isZh ? "Cloudflare 边缘归因实时实证" : "Verified Cloudflare Edge Attribution"}
                </div>
                <h1 className="apple-display text-2xl sm:text-3xl font-semibold text-[var(--apple-ink)]">
                  {data.title}
                </h1>
                <p className="text-[13px] text-[var(--apple-ink-secondary)]">
                  {data.productName} ·{" "}
                  <a
                    href={data.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--apple-blue)] hover:underline"
                  >
                    {data.targetUrl}
                  </a>
                </p>
              </div>
              <div className="text-[12px] text-[var(--apple-ink-tertiary)] tabular-nums sm:text-right">
                <p>{isZh ? "数据更新时间" : "Synced At"}</p>
                <p className="font-mono text-[var(--apple-ink-secondary)]">
                  {data.generatedAt.slice(0, 16).replace("T", " ")} UTC
                </p>
              </div>
            </div>

            {/* 核心 KPI 条 */}
            <MetricStrip
              items={[
                { label: isZh ? "累计导流点击" : "Referral Clicks", value: data.stats.totalClicks.toLocaleString() },
                { label: isZh ? "验证转化数" : "Conversions", value: data.stats.totalConversions.toLocaleString() },
                { label: isZh ? "整体转化率" : "Conversion Rate", value: `${data.stats.conversionRate}%`, accent: true },
                ...(data.showRevenue
                  ? [
                      {
                        label: isZh ? "归因美元营收" : "Attributed Revenue",
                        value: `$${data.stats.attributedRevenueUsd.toLocaleString()}`,
                      },
                    ]
                  : []),
                {
                  label: isZh ? "已收录高权重目录" : "Live Directories",
                  value: `${data.stats.directoriesLive} / ${data.stats.directoriesTotal}`,
                },
              ]}
            />

            {/* 4 阶归因漏斗 */}
            <ConversionFunnelCard
              clicks={data.stats.funnel.clicks}
              qualifiedVisits={data.stats.funnel.qualifiedVisits}
              signups={data.stats.funnel.signups}
              purchases={data.stats.funnel.purchases}
              attributedRevenueUsd={data.showRevenue ? data.stats.attributedRevenueUsd : 0}
              rpv={data.showRevenue ? data.stats.rpv : 0}
              roiMultiple={data.showRevenue ? data.stats.roiMultiple : 0}
              locale={locale}
            />

            {/* 趋势图 */}
            <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 sm:p-6">
              <AnalyticsAreaChart
                series={data.stats.dailySeries}
                title={isZh ? "近 14 天真实导流与转化趋势" : "14-Day Verified Clicks & Conversions"}
                clicksLabel={isZh ? "真实点击" : "Clicks"}
                conversionsLabel={isZh ? "转化事件" : "Conversions"}
              />
            </div>

            {/* 渠道拆解 + 已收录高权重外链墙 */}
            <div className="grid md:grid-cols-2 gap-5">
              <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 sm:p-6 space-y-4">
                <h3 className="text-[15px] font-semibold text-[var(--apple-ink)]">
                  {isZh ? "各渠道转化效率排行" : "Channel Performance Breakdown"}
                </h3>
                <div className="space-y-3 tabular-nums">
                  {data.stats.channelBreakdown.map((ch) => (
                    <div key={ch.channel} className="space-y-1">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="font-medium capitalize text-[var(--apple-ink)]">{ch.channel}</span>
                        <span className="text-[var(--apple-ink-secondary)]">
                          {ch.clicks} {isZh ? "点击" : "clicks"} · {ch.cvr}% CVR
                          {data.showRevenue && ch.revenueUsd ? ` · $${ch.revenueUsd}` : ""}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--apple-surface-subtle)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--apple-blue)]"
                          style={{
                            width: `${Math.min(100, Math.max(8, (ch.clicks / Math.max(1, data.stats.totalClicks)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 sm:p-6 space-y-4">
                <h3 className="text-[15px] font-semibold text-[var(--apple-ink)]">
                  {isZh ? "代表性已收录高权重目录凭证" : "Featured Verified High-DR Backlinks"}
                </h3>
                <div className="divide-y divide-[var(--apple-border)] text-[13px] tabular-nums">
                  {data.stats.topDirectories.map((d) => (
                    <div key={d.name} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--apple-green)] shrink-0" />
                        <span className="font-medium text-[var(--apple-ink)] truncate">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-mono text-[var(--apple-ink-secondary)]">DR {d.dr}</span>
                        {d.url && (
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--apple-blue)] hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 底部病毒裂变品牌横幅 */}
            <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
              <div className="text-[13px] text-[var(--apple-ink-secondary)]">
                <strong className="text-[var(--apple-ink)]">Powered by LaunchPulse Growth OS</strong> —{" "}
                {isZh
                  ? "为你的 SaaS 生成同款 100+ 高权重目录分发与归因战报。"
                  : "Launch 100+ high-DR directories, 24/7 buyer radar & live revenue attribution for your SaaS."}
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full lp-btn-primary text-[12px] font-medium whitespace-nowrap"
              >
                {isZh ? "免费开始使用" : "Start Free"}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
