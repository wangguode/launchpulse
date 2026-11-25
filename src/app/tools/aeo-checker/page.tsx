"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LangSwitcher from "@/components/LangSwitcher";
import Button from "@/components/ui/lp-button";
import StatusBadge from "@/components/ui/StatusBadge";

interface AeoScanPayload {
  domain: string;
  origin: string;
  title: string;
  score: number;
  subScores: { seo: number; aeo: number; social: number; security: number };
  leaks: Array<{ severity: string; category: string; title: string; evidence: string }>;
  diagnostics: {
    ttfbMs: number;
    httpsEnabled: boolean;
    canonical: string;
    h1: string;
    h2Count: number;
    metaDescLength: number;
    sitemapValid: boolean;
    robotsPresent: boolean;
    llmsTxt: { exists: boolean; wordCount: number; generatedPreview: string };
    socialPreview: { ogTitle: string; ogDesc: string; ogImage: string; twitterCard: string };
    jsonLd: { count: number; hasSoftwareSchema: boolean; hasFaqSchema: boolean };
    aiCrawlers: Array<{ bot: string; engine: string; allowed: boolean }>;
    securityHeaders: Record<string, boolean>;
  };
}

const DEFAULT_CRAWLERS = [
  { bot: "GPTBot", engine: "ChatGPT / OpenAI", allowed: true },
  { bot: "ClaudeBot", engine: "Claude / Anthropic", allowed: true },
  { bot: "PerplexityBot", engine: "Perplexity AI", allowed: true },
  { bot: "Google-Extended", engine: "Gemini / AI Overviews", allowed: true },
];

/**
 * V5 50/50 精密分栏工作台：12 项 AI 搜索可见度（AEO）只读体检（/tools/aeo-checker）
 */
export default function AeoCheckerToolPage() {
  const { locale } = useI18n();
  const isZh = locale === "zh";

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resData, setResData] = useState<AeoScanPayload | null>(null);

  const runCheck = async (target: string) => {
    const cleaned = target.trim();
    if (!cleaned) return;
    setUrl(cleaned);
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleaned }),
      });
      const json = (await res.json()) as AeoScanPayload & { error?: string };
      if (!res.ok) setError(json.error || (isZh ? "体检失败，请检查网址是否可访问。" : "Audit failed."));
      else setResData(json);
    } catch {
      setError(isZh ? "网络异常，请稍后重试。" : "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runCheck(url);
  };

  const crawlers = resData?.diagnostics?.aiCrawlers || DEFAULT_CRAWLERS;
  const subScores = resData?.subScores || { seo: 82, aeo: 64, social: 75, security: 88 };

  return (
    <div className="min-h-screen bg-[var(--bg-frame)] text-[var(--ink-primary)] flex flex-col">
      {/* 48px 顶栏 */}
      <header className="h-12 px-4 sm:px-6 border-b border-[var(--border-hairline)] bg-[var(--bg-frame)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] min-w-0">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold text-[14.5px] text-[var(--ink-primary)] shrink-0">
            <BrandMark className="w-5 h-5" />
            <span>LaunchPulse</span>
          </Link>
          <span className="text-[var(--border-strong)]">/</span>
          <span className="text-[var(--ink-secondary)] truncate">{isZh ? "AEO 可见度体检台" : "AEO Checker"}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/tools/llms-txt-generator"
            className="hidden sm:inline-flex items-center gap-1 text-[12px] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] mr-1"
          >
            <span>{isZh ? "llms.txt 生成器" : "llms.txt"}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <LangSwitcher />
          <div className="hidden sm:block">
            <ThemeSwitcher />
          </div>
          <Link
            href="/dashboard?sample=1"
            className="h-7 px-3 rounded-[6px] lp-btn-primary text-[12px] font-medium inline-flex items-center"
          >
            {isZh ? "进入指挥台" : "Console"}
          </Link>
        </div>
      </header>

      {/* 内嵌 Framed Sheet 左右 50/50 精密工作台 */}
      <main className="flex-1 p-3 sm:p-5 max-w-[1220px] w-full mx-auto flex flex-col">
        <div className="flex-1 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-hairline)] overflow-hidden">
          {/* 左半栏：输入、快捷样本与实时漏洞清单 */}
          <section className="lg:col-span-6 p-5 sm:p-7 space-y-6">
            <div className="space-y-1.5">
              <h1 className="lp-display text-[22px] sm:text-[26px] font-semibold text-[var(--ink-primary)]">
                {isZh ? "ChatGPT 与 Perplexity 能搜到你的产品吗？" : "Will ChatGPT & Perplexity cite your SaaS?"}
              </h1>
              <p className="text-[13.5px] text-[var(--ink-secondary)] leading-relaxed">
                {isZh
                  ? "100% 只读无害实测：核验 AI 爬虫是否被 robots.txt 误拦、检查 /llms.txt、JSON-LD 结构化数据与安全响应头。"
                  : "100% passive audit for AI crawler rules, /llms.txt presence, JSON-LD schema, OG preview, and security headers."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-saas.com"
                  className="flex-1 h-9 px-3 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[13.5px] font-mono text-[var(--ink-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
                <Button type="submit" variant="primary" size="md" loading={loading}>
                  <ShieldCheck className="w-4 h-4" />
                  {isZh ? "开始 12 项体检" : "Run Audit"}
                </Button>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-[var(--ink-muted)] flex-wrap">
                <span>{isZh ? "快速实测：" : "Try live:"}</span>
                {["https://certnudge.dev", "https://linear.app"].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => void runCheck(sample)}
                    className="font-mono text-[11.5px] px-2 py-0.5 rounded-[5px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:text-[var(--ink-primary)] cursor-pointer"
                  >
                    {sample.replace("https://", "")}
                  </button>
                ))}
              </div>
              {error && <p className="text-[12.5px] text-[var(--status-danger)]">{error}</p>}
            </form>

            {/* 体检发现与修复项 */}
            <div className="space-y-2.5 pt-2 border-t border-[var(--border-hairline)]">
              <div className="flex items-center justify-between text-[13px]">
                <h2 className="font-semibold text-[var(--ink-primary)]">
                  {resData
                    ? isZh
                      ? `发现 ${resData.leaks.length} 项可优化线索`
                      : `${resData.leaks.length} actionable findings`
                    : isZh
                      ? "12 项自动核查维度"
                      : "12 automated inspection checks"}
                </h2>
                {resData && (
                  <span className="font-mono text-[12px] text-[var(--ink-muted)]">
                    {resData.domain} · {resData.diagnostics.ttfbMs}ms
                  </span>
                )}
              </div>

              {resData ? (
                <div className="rounded-[8px] border border-[var(--border-hairline)] divide-y divide-[var(--border-hairline)]">
                  {resData.leaks.length === 0 ? (
                    <div className="p-4 text-[13px] text-[var(--status-live)] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{isZh ? "未发现明显拦截或元数据缺失，已具备良好收录基础。" : "No blocking issues detected."}</span>
                    </div>
                  ) : (
                    resData.leaks.map((lk, i) => (
                      <div key={i} className="p-3.5 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-medium text-[var(--ink-primary)]">{lk.title}</p>
                          <StatusBadge
                            tone={lk.severity === "high" ? "danger" : lk.severity === "medium" ? "warning" : "neutral"}
                            label={lk.category}
                          />
                        </div>
                        <p className="text-[12px] text-[var(--ink-secondary)] leading-relaxed">{lk.evidence}</p>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="rounded-[8px] border border-[var(--border-hairline)] divide-y divide-[var(--border-hairline)] text-[13px]">
                  {[
                    isZh ? "GPTBot / ClaudeBot / PerplexityBot robots.txt 放行状态" : "GPTBot / ClaudeBot / PerplexityBot robots.txt policy",
                    isZh ? "/llms.txt 根目录存在性与结构完整度检查" : "/llms.txt presence & Markdown structure",
                    isZh ? "SoftwareApplication & FAQ JSON-LD 实体标注验证" : "SoftwareApplication & FAQ JSON-LD markup",
                    isZh ? "OpenGraph 社交卡片与 6 项 HTTPS 安全响应头" : "OpenGraph social card & 6 security headers",
                  ].map((item, idx) => (
                    <div key={idx} className="px-3.5 py-2.5 flex items-center gap-2.5 text-[var(--ink-secondary)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 右半栏：实时评分面板 + AI 爬虫矩阵 */}
          <aside className="lg:col-span-6 p-5 sm:p-7 bg-[var(--bg-surface)]/45 space-y-6">
            <div className="flex items-baseline justify-between gap-3 pb-4 border-b border-[var(--border-hairline)] tabular-nums">
              <div>
                <p className="text-[12px] text-[var(--ink-muted)]">
                  {resData
                    ? isZh
                      ? `${resData.domain} 综合可见度得分`
                      : `${resData.domain} Readiness Score`
                    : isZh
                      ? "体检报告实时预览（输入网址后更新）"
                      : "Live scorecard preview"}
                </p>
                <div className="text-[36px] font-bold tracking-[-0.03em] text-[var(--ink-primary)] mt-0.5">
                  {resData ? resData.score : "—"}
                  <span className="text-[15px] font-normal text-[var(--ink-muted)]"> / 100</span>
                </div>
              </div>
              {resData && (
                <StatusBadge
                  tone={resData.diagnostics.llmsTxt.exists ? "success" : "warning"}
                  label={
                    resData.diagnostics.llmsTxt.exists
                      ? isZh
                        ? "已配置 /llms.txt"
                        : "/llms.txt found"
                      : isZh
                        ? "缺少 /llms.txt"
                        : "Missing /llms.txt"
                  }
                />
              )}
            </div>

            {/* 4 维细分子分 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
              {(
                [
                  { k: "seo", label: isZh ? "搜索基础" : "SEO" },
                  { k: "aeo", label: isZh ? "AI 可见度" : "AEO" },
                  { k: "social", label: isZh ? "社交分享" : "Social" },
                  { k: "security", label: isZh ? "安全响应头" : "Security" },
                ] as const
              ).map((dim) => (
                <div
                  key={dim.k}
                  className="p-3 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)]"
                >
                  <p className="text-[11.5px] text-[var(--ink-muted)]">{dim.label}</p>
                  <p className="font-mono text-[18px] font-semibold text-[var(--ink-primary)] mt-0.5">
                    {resData ? subScores[dim.k] : "—"}
                  </p>
                </div>
              ))}
            </div>

            {/* AI 爬虫放行矩阵 */}
            <div className="space-y-2.5">
              <h2 className="text-[13px] font-semibold text-[var(--ink-primary)]">
                {isZh ? "主流 AI 搜索引擎爬虫放行状态" : "AI Crawler Access Matrix"}
              </h2>
              <div className="rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] divide-y divide-[var(--border-hairline)] text-[13px]">
                {crawlers.map((c) => (
                  <div key={c.bot} className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-medium text-[var(--ink-primary)]">{c.bot}</span>
                      <span className="ml-2 text-[12px] text-[var(--ink-muted)]">{c.engine}</span>
                    </div>
                    {resData ? (
                      c.allowed ? (
                        <span className="inline-flex items-center gap-1 text-[12px] text-[var(--status-live)] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {isZh ? "允许抓取" : "Allowed"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[12px] text-[var(--status-danger)] font-medium">
                          <XCircle className="w-3.5 h-3.5" />
                          {isZh ? "被拦截" : "Blocked"}
                        </span>
                      )
                    ) : (
                      <span className="text-[12px] text-[var(--ink-muted)]">{isZh ? "待检测" : "Ready"}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 安全头与后续行动 */}
            {resData && (
              <div className="p-4 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-[12.5px] text-[var(--ink-secondary)]">
                  {isZh
                    ? "修复完 AI 爬虫与元数据后，立即启动 100+ 精选目录分发提升域名权重。"
                    : "Pair clean AEO metadata with 100+ directory backlinks for faster citations."}
                </div>
                <Link
                  href="/dashboard?sample=1"
                  className="h-8 px-3 rounded-[7px] lp-btn-primary text-[12px] font-medium inline-flex items-center shrink-0"
                >
                  {isZh ? "打开增长指挥台" : "Open Console"}
                </Link>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
