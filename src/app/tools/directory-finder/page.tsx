"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Globe, Search } from "lucide-react";
import { DISTRIBUTION_DIRECTORIES } from "@/data/directories";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LangSwitcher from "@/components/LangSwitcher";

/**
 * 免费 SEO 裂变工具 1：100+ 海外高权重 AI & SaaS 目录实时检索库（/tools/directory-finder）
 */
export default function DirectoryFinderToolPage() {
  const { locale } = useI18n();
  const isZh = locale === "zh";

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [onlyDofollow, setOnlyDofollow] = useState(false);
  const [minDr, setMinDr] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DISTRIBUTION_DIRECTORIES.filter((d) => {
      if (category !== "all" && d.category !== category) return false;
      if (onlyDofollow && d.linkType !== "dofollow") return false;
      if (d.dr < minDr) return false;
      if (!q) return true;
      return d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q);
    });
  }, [query, category, onlyDofollow, minDr]);

  const dofollowTotal = DISTRIBUTION_DIRECTORIES.filter((d) => d.linkType === "dofollow").length;

  return (
    <div className="min-h-screen bg-[var(--apple-bg)] text-[var(--apple-ink)]">
      <header className="sticky top-0 z-30 apple-glass border-b border-[var(--apple-border)]">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] text-[var(--apple-ink)]">
              <BrandMark className="w-5 h-5" />
              <span>LaunchPulse</span>
            </Link>
            <span className="text-[var(--apple-ink-tertiary)] hidden sm:inline">/</span>
            <span className="text-[12px] text-[var(--apple-ink-secondary)] hidden sm:inline">
              {isZh ? "100+ 目录检索库" : "Directory Finder"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ThemeSwitcher />
            </div>
            <LangSwitcher />
            <Link href="/dashboard?sample=1" className="px-3.5 py-1.5 rounded-full lp-btn-primary text-[12px] font-medium whitespace-nowrap">
              {isZh ? "帮我代提交 ($39)" : "Submit For Me ($39)"}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        <div className="max-w-3xl space-y-3">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--apple-blue)]">
            {isZh ? "免费开源检索库 · 2026 实时清洗验证" : "FREE LIVE DATABASE · 2026 VERIFIED"}
          </p>
          <h1 className="apple-display text-3xl sm:text-5xl font-semibold text-[var(--apple-ink)]">
            {isZh ? "100+ 海外高权重 SaaS & AI 软件目录实时检索库" : "100+ High-DR SaaS & AI Directory Database"}
          </h1>
          <p className="text-[15px] text-[var(--apple-ink-secondary)] leading-relaxed">
            {isZh
              ? `收录 ${DISTRIBUTION_DIRECTORIES.length} 个经实测可公开提交的高权重目录（含 ${dofollowTotal} 个 dofollow 站，DR 38–91）。已剔除死链与无法提交的企业白名单站，支持免费自查或委托我们 $39 专人代提交。`
              : `Curated list of ${DISTRIBUTION_DIRECTORIES.length} verified public-submission SaaS & AI directories (${dofollowTotal} dofollow, DR 38–91) with exact submission URLs, traffic estimates & approval SLAs.`}
          </p>
        </div>

        {/* 筛选条 */}
        <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--apple-ink-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isZh ? "搜索目录名或分类，如 AlternativeTo、SaaSHub..." : "Search AlternativeTo, SaaSHub, Toolify..."}
              className="w-full h-10 pl-9 pr-3.5 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[14px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 px-3 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[13px] text-[var(--apple-ink)] outline-none"
            >
              <option value="all">{isZh ? "全部分类" : "All Categories"}</option>
              <option value="SaaS Directory">SaaS Directory</option>
              <option value="AI Aggregator">AI Aggregator</option>
              <option value="Launchpad">Launchpad</option>
              <option value="Dev & Indie">Dev & Indie</option>
            </select>

            <select
              value={minDr}
              onChange={(e) => setMinDr(Number(e.target.value))}
              className="h-10 px-3 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[13px] text-[var(--apple-ink)] outline-none"
            >
              <option value={0}>{isZh ? "不限 DR 权重" : "Any DR"}</option>
              <option value={70}>DR 70+ (Tier 1)</option>
              <option value={50}>DR 50+ (Tier 1–2)</option>
            </select>

            <button
              type="button"
              onClick={() => setOnlyDofollow((v) => !v)}
              className={`h-10 px-3.5 rounded-[10px] border text-[13px] font-medium transition cursor-pointer ${
                onlyDofollow
                  ? "border-[var(--apple-blue)] bg-[var(--apple-blue-soft)] text-[var(--apple-blue)]"
                  : "border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[var(--apple-ink-secondary)]"
              }`}
            >
              {onlyDofollow ? "✓ Dofollow Only" : "Dofollow Only"}
            </button>
          </div>
        </div>

        {/* 100 目录公开列表 */}
        <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--apple-border)] flex items-center justify-between text-[12px] text-[var(--apple-ink-secondary)] tabular-nums">
            <span>
              {isZh ? `共匹配 ${filtered.length} 个高权重目录站` : `Showing ${filtered.length} verified directories`}
            </span>
            <span>{isZh ? "点击右侧按钮直达官方提交表单" : "Direct submission URLs verified"}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--apple-border)] bg-[var(--apple-bg)] text-[11px] font-medium text-[var(--apple-ink-tertiary)]">
                  <th className="py-2.5 px-5">{isZh ? "目录名称" : "Directory"}</th>
                  <th className="py-2.5 px-3">{isZh ? "分类" : "Category"}</th>
                  <th className="py-2.5 px-3 text-right">DR</th>
                  <th className="py-2.5 px-3 text-right">{isZh ? "月估算访问" : "Est. Traffic"}</th>
                  <th className="py-2.5 px-3">{isZh ? "外链属性" : "Link Type"}</th>
                  <th className="py-2.5 px-3">{isZh ? "审核 SLA" : "SLA"}</th>
                  <th className="py-2.5 px-5 text-right">{isZh ? "官方提交入口" : "Submit"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--apple-border)] text-[13px] tabular-nums">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-[var(--apple-bg)] transition">
                    <td className="py-3 px-5 font-semibold text-[var(--apple-ink)]">
                      <span className="inline-flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-[var(--apple-ink-tertiary)]" />
                        {d.name}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[var(--apple-ink-secondary)]">{d.category}</td>
                    <td className="py-3 px-3 text-right font-semibold text-[var(--apple-ink)]">{d.dr}</td>
                    <td className="py-3 px-3 text-right text-[var(--apple-ink-secondary)]">{d.monthlyTraffic}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          d.linkType === "dofollow"
                            ? "bg-[var(--apple-green-soft)] text-[var(--apple-green)]"
                            : "bg-[var(--apple-surface-subtle)] text-[var(--apple-ink-secondary)]"
                        }`}
                      >
                        {d.linkType}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[var(--apple-ink-tertiary)]">{d.approvalSla}</td>
                    <td className="py-3 px-5 text-right">
                      <a
                        href={d.submitUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--apple-blue)] hover:underline"
                      >
                        {isZh ? "去提交" : "Submit"} <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 底部转化 CTA */}
        <div className="rounded-[20px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-[18px] font-semibold text-[var(--apple-ink)]">
              {isZh ? "不想花 18 小时手动逐个填表？" : "Don't want to burn 18 hours filling out 100 forms manually?"}
            </h2>
            <p className="text-[13px] text-[var(--apple-ink-secondary)]">
              {isZh
                ? "只需在 LaunchPulse 填写 1 次 Brand Launch Kit，我们按 2–3 周自然节奏专人代提交并每日自动验活外链（$39 买断）。"
                : "Fill your Brand Launch Kit once—we handle paced human-verified submissions with live HTTP/dofollow monitoring starting at $39."}
            </p>
          </div>
          <Link
            href="/#pricing"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full lp-btn-primary text-[13px] font-medium whitespace-nowrap"
          >
            {isZh ? "启动 50+ 目录分发 — $39" : "Launch 50+ Blitz — $39"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
