"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Globe, ShieldCheck, XCircle } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LangSwitcher from "@/components/LangSwitcher";
import Button from "@/components/ui/Button";

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

/**
 * 免费 SEO 裂变工具 3：12 维 AI 搜索可见度（AEO / GEO）与爬虫放行检测器（/tools/aeo-checker）
 */
export default function AeoCheckerToolPage() {
  const { locale } = useI18n();
  const isZh = locale === "zh";

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resData, setResData] = useState<AeoScanPayload | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = (await res.json()) as AeoScanPayload & { error?: string };
      if (!res.ok) setError(json.error || "Audit failed.");
      else setResData(json);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--apple-bg)] text-[var(--apple-ink)]">
      <header className="sticky top-0 z-30 apple-glass border-b border-[var(--apple-border)]">
        <div className="max-w-[1040px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] text-[var(--apple-ink)]">
            <BrandMark className="w-5 h-5" />
            <span>LaunchPulse</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ThemeSwitcher />
            </div>
            <LangSwitcher />
            <Link href="/tools/llms-txt-generator" className="text-[12px] text-[var(--apple-blue)] hover:underline font-medium">
              {isZh ? "生成 llms.txt →" : "llms.txt Generator →"}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1040px] mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-8">
        <div className="max-w-2xl space-y-3">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--apple-blue)]">
            AEO & AI SEARCH READINESS · 12-POINT PASSIVE AUDIT
          </p>
          <h1 className="apple-display text-3xl sm:text-5xl font-semibold text-[var(--apple-ink)]">
            {isZh ? "ChatGPT 与 Perplexity 能搜到你的 SaaS 吗？" : "Will ChatGPT & Perplexity Cite Your SaaS?"}
          </h1>
          <p className="text-[15px] text-[var(--apple-ink-secondary)] leading-relaxed">
            {isZh
              ? "100% 无害只读实测：检查 GPTBot / ClaudeBot / PerplexityBot 是否被 robots.txt 误杀、验证 /llms.txt 与 JSON-LD 实体结构，并实时预览社交分享卡片与安全头矩阵。"
              : "100% passive audit checking GPTBot, ClaudeBot & PerplexityBot access, /llms.txt, SoftwareApplication JSON-LD, OG card preview & 6 security headers."}
          </p>
        </div>

        <form
          onSubmit={handleCheck}
          className="rounded-[20px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-4 sm:p-5 flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-startup.com"
            className="flex-1 h-11 px-4 rounded-full border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[15px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
          />
          <Button type="submit" variant="primary" size="lg" loading={loading}>
            <ShieldCheck className="w-4 h-4" />
            {isZh ? "开始 12 维 AEO 体检" : "Run 12-Point AEO Audit"}
          </Button>
        </form>

        {error && (
          <div className="rounded-[12px] bg-[var(--apple-red-soft)] text-[var(--apple-red)] px-4 py-3 text-[13px] font-medium">
            {error}
          </div>
        )}

        {resData && (
          <div className="space-y-6">
            {/* 5 项评分卡 */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 tabular-nums">
              {[
                { l: isZh ? "综合就绪分" : "Overall Score", v: `${resData.score}/100`, accent: true },
                { l: "AI Search (AEO)", v: `${resData.subScores.aeo}/100` },
                { l: "Google SEO", v: `${resData.subScores.seo}/100` },
                { l: "Social & UX", v: `${resData.subScores.social}/100` },
                { l: "Security & TTFB", v: `${resData.diagnostics.ttfbMs}ms` },
              ].map((m) => (
                <div key={m.l} className="rounded-[16px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-4">
                  <p className="text-[11px] text-[var(--apple-ink-secondary)]">{m.l}</p>
                  <p className={`apple-display text-2xl font-semibold mt-1 ${m.accent ? "text-[var(--apple-blue)]" : "text-[var(--apple-ink)]"}`}>
                    {m.v}
                  </p>
                </div>
              ))}
            </div>

            {/* AI 爬虫放行矩阵 + OG 社交卡片实时预览 */}
            <div className="grid md:grid-cols-2 gap-5">
              <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-4">
                <h2 className="text-[15px] font-semibold text-[var(--apple-ink)]">
                  {isZh ? "AI 搜索引擎爬虫放行状态（robots.txt）" : "AI Crawler Access Matrix (robots.txt)"}
                </h2>
                <div className="divide-y divide-[var(--apple-border)] text-[13px]">
                  {resData.diagnostics.aiCrawlers.map((c) => (
                    <div key={c.bot} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold font-mono text-[var(--apple-ink)]">{c.bot}</p>
                        <p className="text-[11px] text-[var(--apple-ink-tertiary)]">{c.engine}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-[12px] font-medium ${
                          c.allowed ? "text-[var(--apple-green)]" : "text-[var(--apple-red)]"
                        }`}
                      >
                        {c.allowed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {c.allowed ? (isZh ? "允许抓取" : "Allowed") : isZh ? "被拦截" : "Blocked"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-4">
                <h2 className="text-[15px] font-semibold text-[var(--apple-ink)]">
                  {isZh ? "X / Slack / LinkedIn 社交分享卡片实时预览" : "Live Social Share Card Preview (OG)"}
                </h2>
                <div className="rounded-[14px] border border-[var(--apple-border)] bg-[var(--apple-bg)] overflow-hidden">
                  <div className="h-36 bg-[var(--apple-surface-subtle)] flex items-center justify-center overflow-hidden">
                    {resData.diagnostics.socialPreview.ogImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resData.diagnostics.socialPreview.ogImage}
                        alt={resData.domain}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-[12px] text-[var(--apple-ink-tertiary)] space-y-1">
                        <Globe className="w-6 h-6 mx-auto opacity-50" />
                        <p>{isZh ? "未检测到 og:image 社交封面图" : "No og:image configured"}</p>
                      </div>
                    )}
                  </div>
                  <div className="p-3.5 space-y-1">
                    <p className="text-[11px] font-mono text-[var(--apple-ink-tertiary)]">{resData.domain}</p>
                    <p className="text-[14px] font-semibold text-[var(--apple-ink)] line-clamp-1">
                      {resData.diagnostics.socialPreview.ogTitle}
                    </p>
                    <p className="text-[12px] text-[var(--apple-ink-secondary)] line-clamp-2">
                      {resData.diagnostics.socialPreview.ogDesc || (isZh ? "缺少 meta description 描述" : "Missing meta description")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 6 项 HTTP 安全头矩阵 */}
            <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-3">
              <h2 className="text-[15px] font-semibold text-[var(--apple-ink)]">
                {isZh ? "企业级 HTTP 安全头合规矩阵" : "HTTP Security Headers Matrix"}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-[12px]">
                {Object.entries(resData.diagnostics.securityHeaders).map(([k, ok]) => (
                  <div
                    key={k}
                    className={`rounded-[10px] border p-3 flex items-center justify-between ${
                      ok
                        ? "border-[var(--apple-border)] bg-[var(--apple-green-soft)] text-[var(--apple-green)]"
                        : "border-[var(--apple-border)] bg-[var(--apple-bg)] text-[var(--apple-ink-tertiary)]"
                    }`}
                  >
                    <span className="font-mono font-medium uppercase">{k}</span>
                    <span>{ok ? "✓" : "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 发现的漏洞列表 */}
            {resData.leaks.length > 0 && (
              <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-3">
                <h2 className="text-[15px] font-semibold text-[var(--apple-ink)]">
                  {isZh ? `检出 ${resData.leaks.length} 项待修复流量与 AI 引用缺口` : `${resData.leaks.length} Actionable Visibility Gaps`}
                </h2>
                <div className="divide-y divide-[var(--apple-border)]">
                  {resData.leaks.map((lk, idx) => (
                    <div key={idx} className="py-3 space-y-1">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded-full bg-[var(--apple-red-soft)] text-[var(--apple-red)] font-semibold uppercase">
                          {lk.severity}
                        </span>
                        <span className="text-[var(--apple-ink-tertiary)]">{lk.category}</span>
                      </div>
                      <p className="text-[14px] font-semibold text-[var(--apple-ink)]">{lk.title}</p>
                      <p className="text-[12px] text-[var(--apple-ink-secondary)]">{lk.evidence}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-[13px] text-[var(--apple-ink-secondary)]">
                {isZh
                  ? "想把体检分数拉满并立刻上线 50+ 高权重外链与 24/7 买家雷达？"
                  : "Ready to fix every leak and launch across 50+ high-DR directories?"}
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full lp-btn-primary text-[12px] font-medium whitespace-nowrap"
              >
                {isZh ? "免费开通控制台" : "Open Free Console"} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
