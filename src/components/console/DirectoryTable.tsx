"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { DISTRIBUTION_DIRECTORIES } from "@/data/directories";

interface LiveDirState {
  status: "queued" | "submitted" | "live";
  live_backlink_url?: string;
}

interface Props {
  liveMap: Map<string, LiveDirState>;
  locale: "en" | "zh" | "ja";
}

/**
 * 生产级可搜索、可筛选的 50+ 高权重目录数据表（Apple HIG 细线表格规范）
 */
export default function DirectoryTable({ liveMap, locale }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "live" | "submitted" | "queued">("all");
  const isZh = locale === "zh";
  const isJa = locale === "ja";

  const rows = useMemo(() => {
    return DISTRIBUTION_DIRECTORIES.map((dir) => {
      const live = liveMap.get(dir.id);
      const status = live?.status || "queued";
      return {
        ...dir,
        status,
        liveUrl: live?.live_backlink_url || "",
      };
    });
  }, [liveMap]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      live: rows.filter((r) => r.status === "live").length,
      submitted: rows.filter((r) => r.status === "submitted").length,
      queued: rows.filter((r) => r.status === "queued").length,
    }),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
    });
  }, [rows, filter, query]);

  const statusText = (s: "live" | "submitted" | "queued") => {
    if (isZh) return s === "live" ? "已收录" : s === "submitted" ? "已提交" : "排队中";
    if (isJa) return s === "live" ? "掲載済み" : s === "submitted" ? "申請済み" : "待機中";
    return s === "live" ? "Live" : s === "submitted" ? "Submitted" : "Queued";
  };

  return (
    <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] overflow-hidden">
      <div className="p-4 border-b border-[var(--apple-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-[var(--apple-ink-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isZh ? "搜索目录名或分类..." : isJa ? "ディレクトリを検索..." : "Search directories..."
            }
            className="w-full rounded-lg border border-[var(--apple-border)] bg-[var(--apple-bg-alt)] pl-8 pr-3 py-1.5 text-[13px] text-[var(--apple-ink)] placeholder:text-[var(--apple-ink-tertiary)] focus:border-[var(--apple-blue)] focus:outline-none"
          />
        </div>

        <div className="inline-flex items-center rounded-lg bg-[var(--apple-bg-alt)] border border-[var(--apple-border)] p-0.5 text-[12px] overflow-x-auto">
          {(["all", "live", "submitted", "queued"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer whitespace-nowrap tabular-nums ${
                filter === k
                  ? "bg-[var(--apple-surface)] text-[var(--apple-ink)] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                  : "text-[var(--apple-ink-secondary)] hover:text-[var(--apple-ink)]"
              }`}
            >
              {k === "all"
                ? isZh
                  ? "全部"
                  : isJa
                  ? "すべて"
                  : "All"
                : statusText(k)}{" "}
              ({counts[k]})
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-left text-[13px] tabular-nums">
          <thead className="sticky top-0 bg-[var(--apple-surface)] border-b border-[var(--apple-border)] text-[11px] font-medium text-[var(--apple-ink-tertiary)]">
            <tr>
              <th className="py-2.5 px-4 font-medium">
                {isZh ? "软件目录站" : isJa ? "ディレクトリ" : "Directory"}
              </th>
              <th className="py-2.5 px-4 font-medium">
                {isZh ? "分类" : isJa ? "カテゴリ" : "Category"}
              </th>
              <th className="py-2.5 px-4 font-medium text-right">DR</th>
              <th className="py-2.5 px-4 font-medium">
                {isZh ? "状态" : isJa ? "ステータス" : "Status"}
              </th>
              <th className="py-2.5 px-4 font-medium text-right">
                {isZh ? "外链凭证" : isJa ? "リンク" : "Link"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--apple-border)]">
            {filtered.map((row) => (
              <tr key={row.id} className="hover:bg-[var(--apple-hover)] transition-colors">
                <td className="py-3 px-4 font-medium text-[var(--apple-ink)]">{row.name}</td>
                <td className="py-3 px-4 text-[var(--apple-ink-secondary)]">{row.category}</td>
                <td className="py-3 px-4 text-right font-mono text-[12px] text-[var(--apple-ink-secondary)]">
                  {row.dr}
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--apple-ink-secondary)]">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          row.status === "live"
                            ? "var(--apple-green-dot)"
                            : row.status === "submitted"
                            ? "var(--apple-orange-dot)"
                            : "var(--apple-ink-tertiary)",
                      }}
                    />
                    {statusText(row.status)}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <a
                    href={row.liveUrl || row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[12px] text-[var(--apple-blue)] hover:underline"
                  >
                    {row.liveUrl
                      ? isZh
                        ? "查看收录"
                        : "Live URL"
                      : isZh
                      ? "访问目录"
                      : "Visit"}
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
