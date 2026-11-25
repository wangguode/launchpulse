"use client";

import { ArrowRight, DollarSign, TrendingUp } from "lucide-react";

interface ConversionFunnelCardProps {
  clicks: number;
  qualifiedVisits: number;
  signups: number;
  purchases: number;
  attributedRevenueUsd: number;
  rpv: number;
  roiMultiple: number;
  locale: "en" | "zh" | "ja";
}

/**
 * V4 DataFast 级 4 阶归因转化漏斗卡
 * 清晰展示：导流短链点击 -> 有效进站 -> 注册/试用 -> 付费转化，并直出 RPV 与 ROI 倍数
 */
export default function ConversionFunnelCard({
  clicks,
  qualifiedVisits,
  signups,
  purchases,
  attributedRevenueUsd,
  rpv,
  roiMultiple,
  locale,
}: ConversionFunnelCardProps) {
  const isZh = locale === "zh";
  const base = Math.max(1, clicks);

  const stages = [
    {
      label: isZh ? "1. 短链导流点击" : "1. Referral Clicks",
      value: clicks,
      pct: 100,
      accent: "var(--apple-blue)",
    },
    {
      label: isZh ? "2. 有效进站访问" : "2. Qualified Visits",
      value: qualifiedVisits,
      pct: clicks > 0 ? Math.min(100, Math.round((qualifiedVisits / base) * 100)) : 0,
      accent: "var(--apple-blue)",
    },
    {
      label: isZh ? "3. 注册 / 免费试用" : "3. Signups / Trials",
      value: signups,
      pct: clicks > 0 ? Math.min(100, Number(((signups / base) * 100).toFixed(1))) : 0,
      accent: "var(--apple-green)",
    },
    {
      label: isZh ? "4. 付费成交转化" : "4. Paid Conversions",
      value: purchases,
      pct: clicks > 0 ? Math.min(100, Number(((purchases / base) * 100).toFixed(1))) : 0,
      accent: "var(--apple-green)",
    },
  ];

  return (
    <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--apple-ink)]">
            {isZh ? "流量 → 美元全链路归因漏斗" : "Traffic-to-Revenue Attribution Funnel"}
          </h3>
          <p className="text-[12px] text-[var(--apple-ink-secondary)] mt-0.5">
            {isZh
              ? "把每一次目录点击、社区回复直接对应到真实注册与美元营收"
              : "Direct line from every directory backlink and buyer reply to verified USD revenue"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap tabular-nums">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--apple-bg)] border border-[var(--apple-border)] text-[12px] font-medium text-[var(--apple-ink)]">
            <DollarSign className="w-3.5 h-3.5 text-[var(--apple-blue)]" />
            RPV ${rpv.toFixed(2)}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--apple-green-soft)] text-[var(--apple-green)] text-[12px] font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            {roiMultiple > 0 ? `${roiMultiple}× ROI` : isZh ? "待回传首笔收入" : "Awaiting 1st sale"}
          </span>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 tabular-nums">
        {stages.map((st, idx) => (
          <div
            key={st.label}
            className="relative rounded-[14px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-4 flex flex-col justify-between gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-[var(--apple-ink-secondary)]">{st.label}</span>
              {idx < stages.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-[var(--apple-ink-tertiary)] hidden sm:block" />
              )}
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="apple-display text-[26px] font-semibold text-[var(--apple-ink)]">
                {st.value.toLocaleString()}
              </span>
              <span className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">{st.pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[var(--apple-surface-subtle)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(st.value > 0 ? 6 : 0, Math.min(100, st.pct))}%`,
                  backgroundColor: st.accent,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {attributedRevenueUsd > 0 && (
        <div className="flex items-center justify-between text-[12px] text-[var(--apple-ink-secondary)] pt-1 border-t border-[var(--apple-border)]">
          <span>
            {isZh
              ? `当前归因总营收 $${attributedRevenueUsd.toLocaleString()}（对比 $39 目录分发成本实现 ${roiMultiple}× 回报）`
              : `Attributed revenue $${attributedRevenueUsd.toLocaleString()} (${roiMultiple}× return vs $39 Launch Blitz)`}
          </span>
          <span className="text-[var(--apple-green)] font-medium">
            {isZh ? "像素已实时归因" : "Verified via pixel.js"}
          </span>
        </div>
      )}
    </div>
  );
}
