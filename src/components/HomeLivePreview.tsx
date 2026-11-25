"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ExternalLink } from "lucide-react";
import { buildContextualReply, buildSampleOverview, deriveConsoleLedger, type ReplyTone } from "@/lib/console-ledger";

const SAMPLE_DATA = buildSampleOverview();
const SAMPLE_LEDGER = deriveConsoleLedger(SAMPLE_DATA, true);

/**
 * 官网第 1 幕底部：嵌入式暗黑精密指挥台透视窗（真实锐利排印 + 100% 对账数据）
 */
export function HeroCommandWindow({ isZh }: { isZh: boolean }) {
  const pendingLeads = SAMPLE_DATA.radarLeads.filter((l) => l.status === "new").slice(0, 3);
  const verifiedReceipts = SAMPLE_LEDGER.recentVerifiedReceipts.slice(0, 4);

  return (
    <div className="relative mt-10 sm:mt-14">
      {/* 极克制银白底光，仅托起嵌入式指挥台玻璃边缘 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 inset-x-10 h-28 rounded-full opacity-45 blur-3xl"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, rgba(148, 163, 184, 0.28) 0%, rgba(79, 140, 255, 0.14) 45%, transparent 100%)",
        }}
      />

      <div className="relative rounded-[14px] border border-white/[0.12] bg-[#111317] overflow-hidden">
        {/* 窗口顶栏 */}
        <div className="h-10 px-4 border-b border-white/[0.08] bg-[#14171d] flex items-center justify-between gap-3 text-[12px]">
          <div className="flex items-center gap-2 text-white/90 font-medium min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#4f8cff] shrink-0" />
            <span className="truncate">
              {isZh ? "LaunchPulse 增长指挥台 · AcmeFlow" : "LaunchPulse Command Center · AcmeFlow"}
            </span>
          </div>
          <Link
            href="/dashboard?sample=1"
            className="inline-flex items-center gap-1 text-[11.5px] text-white/65 hover:text-white lp-ease whitespace-nowrap shrink-0"
          >
            <span className="sm:hidden">{isZh ? "全屏体验" : "Demo"}</span>
            <span className="hidden sm:inline">{isZh ? "全屏交互体验" : "Open Interactive Demo"}</span>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
          </Link>
        </div>

        {/* 三列精密透视区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
          {/* 列 1：归因营收与单色曲线 */}
          <div className="p-5 flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[12px] text-white/55">{isZh ? "近 30 天归因营收" : "Attributed Revenue (30d)"}</p>
              <div className="flex items-baseline gap-2 tabular-nums">
                <span className="text-[28px] font-bold tracking-[-0.03em] text-white">
                  ${SAMPLE_LEDGER.revenue.totalUsd.toLocaleString()}
                </span>
                <span className="text-[12px] font-medium text-[#34d399]">
                  +${SAMPLE_LEDGER.revenue.deltaUsd} {isZh ? "较上期" : "vs. prior"}
                </span>
              </div>
            </div>

            <svg viewBox="0 0 280 86" preserveAspectRatio="none" className="w-full h-[84px] block">
              <defs>
                <linearGradient id="lpHeroCurve" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f8cff" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#4f8cff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 74 C 35 70, 58 50, 95 46 C 132 42, 160 54, 196 32 C 228 14, 255 12, 280 8 L 280 86 L 0 86 Z"
                fill="url(#lpHeroCurve)"
              />
              <path
                d="M 0 74 C 35 70, 58 50, 95 46 C 132 42, 160 54, 196 32 C 228 14, 255 12, 280 8"
                fill="none"
                stroke="#4f8cff"
                strokeWidth="2.2"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            <div className="flex items-center justify-between text-[11.5px] text-white/50 tabular-nums pt-2 border-t border-white/[0.06]">
              <span>
                {SAMPLE_LEDGER.revenue.funnel.clicks.toLocaleString()} {isZh ? "点击" : "clicks"} →{" "}
                {SAMPLE_LEDGER.revenue.funnel.signups} {isZh ? "注册" : "signups"} →{" "}
                {SAMPLE_LEDGER.revenue.funnel.paid} {isZh ? "付费" : "paid"}
              </span>
            </div>
          </div>

          {/* 列 2：今日高意向求购帖 */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-white/90 font-medium">{isZh ? "买家意向求购" : "Buyer Intent Inbox"}</span>
              <span className="text-white/50 tabular-nums">
                {isZh ? `今日 ${pendingLeads.length} 条高意向` : `${pendingLeads.length} high-intent`}
              </span>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {pendingLeads.map((lead) => (
                <div key={lead.id} className="py-2.5 first:pt-1 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-white/50 tabular-nums">
                    <span className="text-[#4f8cff] font-medium">
                      {lead.intent_score}% · {lead.source}
                    </span>
                    <span>{isZh ? lead.relative_time_zh : lead.relative_time_en}</span>
                  </div>
                  <p className="text-[12.5px] text-white/85 leading-snug line-clamp-1">{lead.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 列 3：权威目录验活状态 */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between text-[12px] tabular-nums">
              <span className="text-white/90 font-medium">{isZh ? "权威目录收录状态" : "Directory Backlinks"}</span>
              <span className="text-white/55 font-mono">
                {SAMPLE_LEDGER.dirCounts.live}/{SAMPLE_LEDGER.dirCounts.total} · {isZh ? "已验活" : "Verified"}
              </span>
            </div>

            <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full bg-[#4f8cff]"
                style={{ width: `${(SAMPLE_LEDGER.dirCounts.live / SAMPLE_LEDGER.dirCounts.total) * 100}%` }}
              />
            </div>

            <div className="divide-y divide-white/[0.06] text-[12px] tabular-nums">
              {verifiedReceipts.map((dir) => (
                <div key={dir.id} className="py-2 flex items-center justify-between gap-2">
                  <span className="text-white/85 truncate">{dir.name.replace(" Software", "")}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-white/45 text-[11.5px]">DR {dir.dr}</span>
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-white/80">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          dir.effectiveStatus === "live" ? "bg-[#34d399]" : "bg-[#fbbf24]"
                        }`}
                      />
                      {dir.effectiveStatus === "live"
                        ? isZh
                          ? "已验活"
                          : "Live"
                        : isZh
                          ? "审核中"
                          : "Review"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 官网第 2 幕右侧：可真实交互的三核心能力演示舞台
 */
export function InteractiveCapabilityStage({
  activeStep,
  isZh,
}: {
  activeStep: 0 | 1 | 2;
  isZh: boolean;
}) {
  const [tone, setTone] = useState<ReplyTone>("peer");
  const [zeroLink, setZeroLink] = useState(true);
  const [copied, setCopied] = useState(false);

  const demoLead = SAMPLE_DATA.radarLeads[0];
  const liveDraft = buildContextualReply(
    demoLead,
    "AcmeFlow",
    "lightweight SSL & domain expiry alerts",
    "https://pulse.statementflow.win/r/acme-hn",
    tone,
    zeroLink
  );

  if (activeStep === 0) {
    return (
      <div className="rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center justify-between text-[12px] tabular-nums">
          <span className="font-semibold text-[var(--ink-primary)]">
            {isZh ? "3 周自然节奏分发排期" : "3-Week Natural Cadence"}
          </span>
          <span className="text-[var(--ink-muted)]">
            {isZh
              ? `第 1 周 ${SAMPLE_LEDGER.dirCounts.wave1} · 第 2 周 ${SAMPLE_LEDGER.dirCounts.wave2} · 第 3 周 ${SAMPLE_LEDGER.dirCounts.wave3}`
              : `W1 ${SAMPLE_LEDGER.dirCounts.wave1} · W2 ${SAMPLE_LEDGER.dirCounts.wave2} · W3 ${SAMPLE_LEDGER.dirCounts.wave3}`}
          </span>
        </div>

        <div className="divide-y divide-[var(--border-hairline)] text-[13px] tabular-nums">
          {SAMPLE_LEDGER.directories.slice(0, 6).map((dir) => (
            <div key={dir.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-[var(--ink-primary)] truncate">{dir.name}</p>
                <p className="text-[11.5px] text-[var(--ink-muted)]">
                  {dir.url.replace("https://", "")} · {dir.linkType === "dofollow" ? (isZh ? "传递权重" : "Dofollow") : "Nofollow"}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="font-mono text-[12px] text-[var(--ink-secondary)]">DR {dir.dr}</span>
                <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ink-primary)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-live)]" />
                  {isZh ? "HTTP 200 已验活" : "HTTP 200 Verified"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeStep === 1) {
    return (
      <div className="rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center justify-between gap-2 text-[12px]">
          <span className="font-semibold text-[var(--ink-primary)]">
            {isZh ? "原生回复精编器（可现场切换语调）" : "Native Reply Studio (Interactive)"}
          </span>
          <span className="text-[var(--accent-primary)] font-mono">96% · Hacker News</span>
        </div>

        <div className="p-4 space-y-3.5">
          <div className="p-3 rounded-[7px] bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
            <p className="text-[12.5px] font-medium text-[var(--ink-primary)]">{demoLead.title}</p>
            <p className="text-[11.5px] text-[var(--ink-muted)] mt-1">{demoLead.excerpt}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-0.5 text-[11.5px]">
              {(
                [
                  { k: "peer", zh: "同行纯干货", en: "Peer Help" },
                  { k: "founder", zh: "创始人分享", en: "Founder" },
                  { k: "compare", zh: "客观对比", en: "Objective" },
                ] as const
              ).map((item) => (
                <button
                  key={item.k}
                  type="button"
                  onClick={() => setTone(item.k)}
                  className={`px-2.5 py-1 rounded-[4px] lp-ease cursor-pointer ${
                    tone === item.k
                      ? "bg-[var(--bg-sheet)] text-[var(--ink-primary)] font-semibold border border-[var(--border-hairline)]"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                  }`}
                >
                  {isZh ? item.zh : item.en}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setZeroLink((v) => !v)}
              className="inline-flex items-center gap-2 text-[12px] text-[var(--ink-secondary)] cursor-pointer"
            >
              <span>{isZh ? "零链接养号模式" : "Zero-link safe mode"}</span>
              <span
                className={`w-8 h-4.5 rounded-full inline-flex items-center px-0.5 lp-ease ${
                  zeroLink ? "bg-[var(--accent-primary)] justify-end" : "bg-[var(--border-strong)] justify-start"
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full bg-white" />
              </span>
            </button>
          </div>

          <div className="p-3.5 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[12.5px] leading-[1.6] text-[var(--ink-primary)] whitespace-pre-wrap">
            {liveDraft}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11.5px] text-[var(--ink-muted)]">
              {isZh ? "零模板截断，直接粘贴至海外社区评论区" : "Clean contextual copy ready to post"}
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(liveDraft).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }}
              className="h-7 px-2.5 rounded-[6px] border border-[var(--border-strong)] bg-[var(--bg-sheet)] hover:bg-[var(--bg-hover)] text-[12px] font-medium text-[var(--ink-primary)] inline-flex items-center gap-1 cursor-pointer"
            >
              {copied && <Check className="w-3.5 h-3.5 text-[var(--status-live)]" />}
              {copied ? (isZh ? "已复制" : "Copied") : isZh ? "试着复制这条草稿" : "Copy Draft"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: 美元级营收归因闭环
  return (
    <div className="rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] p-5 space-y-5 tabular-nums">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-[12px] text-[var(--ink-muted)]">{isZh ? "近 30 天归因美元营收" : "Attributed Revenue (30d)"}</p>
          <div className="flex items-baseline gap-2.5 mt-1">
            <span className="text-[30px] font-bold tracking-[-0.03em] text-[var(--ink-primary)]">
              ${SAMPLE_LEDGER.revenue.totalUsd.toLocaleString()}
            </span>
            <span className="text-[12.5px] font-medium text-[var(--status-live)]">
              +${SAMPLE_LEDGER.revenue.deltaUsd} {isZh ? "较上期" : "vs. prior"}
            </span>
          </div>
        </div>
        <Link
          href="/report?id=demo-acmeflow"
          className="inline-flex items-center gap-1 text-[12px] text-[var(--accent-primary)] hover:underline"
        >
          <span>{isZh ? "查看公开战报" : "Public Report"}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="py-3 border-y border-[var(--border-hairline)] grid grid-cols-4 text-center">
        <div>
          <div className="text-[16px] font-semibold text-[var(--ink-primary)]">
            {SAMPLE_LEDGER.revenue.funnel.clicks.toLocaleString()}
          </div>
          <div className="text-[11.5px] text-[var(--ink-muted)] mt-0.5">{isZh ? "点击" : "Clicks"}</div>
        </div>
        <div>
          <div className="text-[16px] font-semibold text-[var(--ink-primary)]">
            {SAMPLE_LEDGER.revenue.funnel.visits.toLocaleString()}
          </div>
          <div className="text-[11.5px] text-[var(--ink-muted)] mt-0.5">{isZh ? "有效进站" : "Visits"}</div>
        </div>
        <div>
          <div className="text-[16px] font-semibold text-[var(--ink-primary)]">
            {SAMPLE_LEDGER.revenue.funnel.signups}
          </div>
          <div className="text-[11.5px] text-[var(--ink-muted)] mt-0.5">{isZh ? "注册账号" : "Signups"}</div>
        </div>
        <div>
          <div className="text-[16px] font-semibold text-[var(--ink-primary)]">
            {SAMPLE_LEDGER.revenue.funnel.paid}
          </div>
          <div className="text-[11.5px] text-[var(--ink-muted)] mt-0.5">{isZh ? "付费订阅" : "Paid"}</div>
        </div>
      </div>

      <div className="space-y-2.5 text-[13px]">
        {SAMPLE_LEDGER.revenue.channels.map((ch) => (
          <div key={ch.key} className="flex items-baseline gap-2">
            <span className="font-medium text-[var(--ink-primary)]">{isZh ? ch.labelZh : ch.labelEn}</span>
            <span className="flex-1 border-b border-dotted border-[var(--border-strong)] -translate-y-1" />
            <span className="font-mono font-semibold text-[var(--ink-primary)]">
              ${ch.revenueUsd.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
