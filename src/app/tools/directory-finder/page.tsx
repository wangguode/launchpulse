"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import { DISTRIBUTION_DIRECTORIES } from "@/data/directories";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LangSwitcher from "@/components/LangSwitcher";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCategoryLabel, formatSlaLabel } from "@/lib/console-ledger";

/**
 * V5 精密 Framed Sheet：100+ 海外高权重软件目录透明检索库（/tools/directory-finder）
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
      return `${d.name} ${d.url} ${d.category}`.toLowerCase().includes(q);
    });
  }, [query, category, onlyDofollow, minDr]);

  const dofollowTotal = DISTRIBUTION_DIRECTORIES.filter((d) => d.linkType === "dofollow").length;

  return (
    <div className="min-h-screen bg-[var(--bg-frame)] text-[var(--ink-primary)] flex flex-col">
      <header className="h-12 px-4 sm:px-6 border-b border-[var(--border-hairline)] bg-[var(--bg-frame)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] min-w-0">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold text-[14.5px] text-[var(--ink-primary)] shrink-0">
            <BrandMark className="w-5 h-5" />
            <span>LaunchPulse</span>
          </Link>
          <span className="text-[var(--border-strong)]">/</span>
          <span className="text-[var(--ink-secondary)] truncate">{isZh ? "100+ 目录检索库" : "Directory Finder"}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <LangSwitcher />
          <div className="hidden sm:block">
            <ThemeSwitcher />
          </div>
          <Link
            href="/dashboard?sample=1"
            className="h-7 px-3 rounded-[6px] lp-btn-primary text-[12px] font-medium inline-flex items-center whitespace-nowrap"
          >
            {isZh ? "在指挥台管理提交" : "Manage in Console"}
          </Link>
        </div>
      </header>

      <main className="flex-1 p-3 sm:p-5 max-w-[1220px] w-full mx-auto flex flex-col">
        <div className="flex-1 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] overflow-hidden flex flex-col">
          {/* 头部标题与单行过滤栏 */}
          <div className="p-5 sm:p-6 border-b border-[var(--border-hairline)] space-y-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
              <div className="space-y-1">
                <h1 className="lp-display text-[21px] sm:text-[24px] font-semibold text-[var(--ink-primary)]">
                  {isZh ? "100+ 海外高权重软件目录透明检索库" : "100+ Curated High-DR SaaS & AI Directories"}
                </h1>
                <p className="text-[13px] text-[var(--ink-secondary)] tabular-nums">
                  {isZh
                    ? `共收录 ${DISTRIBUTION_DIRECTORIES.length} 个经人工清洗的可公开提交站点（含 ${dofollowTotal} 个传递权重外链），支持免费自查或委托代投。`
                    : `${DISTRIBUTION_DIRECTORIES.length} verified public directories (${dofollowTotal} dofollow) with direct submit URLs and review estimates.`}
                </p>
              </div>
              <span className="text-[12px] font-mono text-[var(--ink-muted)] tabular-nums shrink-0">
                {isZh ? `当前匹配 ${filtered.length} 站` : `${filtered.length} matching`}
              </span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[var(--ink-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isZh ? "搜索目录名或域名，如 SourceForge、AlternativeTo..." : "Search SourceForge, AlternativeTo..."}
                  className="w-full h-8 pl-8 pr-3 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[13px] text-[var(--ink-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-8 px-2.5 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[12.5px] text-[var(--ink-primary)] outline-none"
                >
                  <option value="all">{isZh ? "全部分类" : "All Categories"}</option>
                  <option value="SaaS Directory">{isZh ? "SaaS 综合目录" : "SaaS Directory"}</option>
                  <option value="AI Aggregator">{isZh ? "AI 工具导航" : "AI Aggregator"}</option>
                  <option value="Launchpad">{isZh ? "新品首发台" : "Launchpad"}</option>
                  <option value="Dev & Indie">{isZh ? "开发者社区" : "Dev & Indie"}</option>
                </select>

                <select
                  value={minDr}
                  onChange={(e) => setMinDr(Number(e.target.value))}
                  className="h-8 px-2.5 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[12.5px] text-[var(--ink-primary)] outline-none"
                >
                  <option value={0}>{isZh ? "不限域名权重" : "Any DR"}</option>
                  <option value={70}>DR 70+</option>
                  <option value={50}>DR 50+</option>
                </select>

                <button
                  type="button"
                  onClick={() => setOnlyDofollow((v) => !v)}
                  className={`h-8 px-3 rounded-[7px] border text-[12.5px] font-medium lp-ease cursor-pointer ${
                    onlyDofollow
                      ? "border-[var(--accent-primary)] bg-[var(--bg-active-tint)] text-[var(--ink-primary)]"
                      : "border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                  }`}
                >
                  {isZh ? "仅看传递权重" : "Dofollow only"}
                </button>
              </div>
            </div>
          </div>

          {/* 精密表格 */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse tabular-nums">
              <thead>
                <tr className="bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] text-[12px] text-[var(--ink-muted)]">
                  <th className="py-2.5 pl-5 pr-3 font-medium">{isZh ? "平台名称" : "Directory"}</th>
                  <th className="py-2.5 px-3 font-medium">{isZh ? "域名权重" : "DR"}</th>
                  <th className="py-2.5 px-3 font-medium hidden sm:table-cell">{isZh ? "所属分类" : "Category"}</th>
                  <th className="py-2.5 px-3 font-medium hidden md:table-cell">{isZh ? "月访问估算" : "Est. Traffic"}</th>
                  <th className="py-2.5 px-3 font-medium hidden md:table-cell">{isZh ? "预计审核" : "Review"}</th>
                  <th className="py-2.5 px-3 font-medium">{isZh ? "外链属性" : "Link"}</th>
                  <th className="py-2.5 pl-3 pr-5 font-medium text-right">{isZh ? "提交入口" : "Submit"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)] text-[13px]">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-[var(--bg-hover)] lp-ease">
                    <td className="py-2.5 pl-5 pr-3">
                      <div className="font-medium text-[var(--ink-primary)]">{d.name}</div>
                      <div className="text-[11.5px] font-mono text-[var(--ink-muted)]">{d.url.replace("https://", "")}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-[var(--ink-primary)]">DR {d.dr}</td>
                    <td className="py-2.5 px-3 text-[12.5px] text-[var(--ink-secondary)] hidden sm:table-cell">
                      {formatCategoryLabel(d.category, isZh)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[12.5px] text-[var(--ink-secondary)] hidden md:table-cell">
                      {d.monthlyTraffic}
                    </td>
                    <td className="py-2.5 px-3 text-[12.5px] text-[var(--ink-secondary)] hidden md:table-cell">
                      {formatSlaLabel(d.approvalSla, isZh)}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge
                        tone={d.linkType === "dofollow" ? "success" : "neutral"}
                        label={d.linkType === "dofollow" ? (isZh ? "传递权重" : "Dofollow") : "Nofollow"}
                      />
                    </td>
                    <td className="py-2.5 pl-3 pr-5 text-right">
                      <a
                        href={d.submitUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[12.5px] text-[var(--accent-primary)] hover:underline"
                      >
                        <span>{isZh ? "提交页" : "Submit"}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
