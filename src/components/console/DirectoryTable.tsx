"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Check, Download, Search } from "lucide-react";
import { DISTRIBUTION_DIRECTORIES, type DirectoryChannel } from "@/data/directories";
import StatusBadge from "@/components/ui/StatusBadge";
import type { Locale } from "@/lib/i18n";

export interface LiveDirState {
  status: "queued" | "submitted" | "live";
  live_backlink_url?: string;
}

interface Props {
  liveMap: Map<string, LiveDirState>;
  locale: Locale;
  exportSlug?: string;
  editable?: boolean;
  onSaveRow?: (
    dir: DirectoryChannel,
    status: "queued" | "submitted" | "live",
    liveBacklinkUrl: string
  ) => Promise<void>;
}

/**
 * 生产级 50+ 高权重目录数据表（同时服务 /dashboard 客户只读导出 与 /admin 运营行内快速履约）
 */
export default function DirectoryTable({
  liveMap,
  locale,
  exportSlug,
  editable = false,
  onSaveRow,
}: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "live" | "submitted" | "queued">("all");
  const [drafts, setDrafts] = useState<
    Record<string, { status: "queued" | "submitted" | "live"; url: string }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

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
      return (
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.linkType.toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query]);

  const exportCsv = () => {
    const csv = [
      "Directory,SubmitURL,DomainRating,Category,LinkType,Status,LiveBacklinkURL",
      ...rows.map(
        (r) =>
          `"${r.name}","${r.submitUrl}",${r.dr},"${r.category}","${r.linkType}","${r.status}","${r.liveUrl}"`
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportSlug || "launchpulse"}-50-directories.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const tabLabel = (k: "all" | "live" | "submitted" | "queued") => {
    if (k === "all") return isZh ? "全部" : isJa ? "すべて" : "All";
    if (k === "live") return isZh ? "已收录" : isJa ? "掲載済み" : "Live";
    if (k === "submitted") return isZh ? "已提交" : isJa ? "申請済み" : "Submitted";
    return isZh ? "排队中" : isJa ? "待機中" : "Queued";
  };

  return (
    <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] overflow-hidden">
      {/* 顶部工具条 */}
      <div className="p-4 border-b border-[var(--apple-border)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-[var(--apple-ink-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isZh
                ? "搜索目录名、分类或 dofollow..."
                : isJa
                ? "ディレクトリを検索..."
                : "Search directories..."
            }
            className="w-full rounded-[10px] border border-[var(--apple-border)] bg-[var(--apple-bg-alt)] pl-8 pr-3 py-1.5 text-[16px] sm:text-[13px] text-[var(--apple-ink)] placeholder:text-[var(--apple-ink-tertiary)] focus:border-[var(--apple-blue)] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
                {tabLabel(k)} ({counts[k]})
              </button>
            ))}
          </div>

          {!editable && (
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--apple-border-strong)] hover:bg-[var(--apple-hover)] text-[12px] font-medium text-[var(--apple-ink)] cursor-pointer transition"
            >
              <Download className="w-3.5 h-3.5" />
              {isZh ? "导出 CSV" : isJa ? "CSV出力" : "Export CSV"}
            </button>
          )}
        </div>
      </div>

      {/* 细线数据表 */}
      <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
        <table className="w-full text-left text-[13px] tabular-nums">
          <thead className="sticky top-0 z-10 bg-[var(--apple-surface)] border-b border-[var(--apple-border)] text-[11px] font-medium text-[var(--apple-ink-tertiary)]">
            <tr>
              <th className="py-2.5 px-4 font-medium">
                {isZh ? "软件目录站" : isJa ? "ディレクトリ" : "Directory"}
              </th>
              <th className="py-2.5 px-3 font-medium">
                {isZh ? "属性" : isJa ? "属性" : "Type"}
              </th>
              <th className="py-2.5 px-3 font-medium text-right">DR</th>
              <th className="py-2.5 px-4 font-medium">
                {isZh ? "状态" : isJa ? "ステータス" : "Status"}
              </th>
              <th className="py-2.5 px-4 font-medium text-right">
                {editable
                  ? isZh
                    ? "收录链接与操作"
                    : "Backlink & Save"
                  : isZh
                  ? "外链凭证"
                  : isJa
                  ? "リンク"
                  : "Link"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--apple-border)]">
            {filtered.map((row) => {
              const draft = drafts[row.id] || { status: row.status, url: row.liveUrl };
              return (
                <tr key={row.id} className="hover:bg-[var(--apple-hover)] transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-medium text-[var(--apple-ink)]">{row.name}</p>
                    <p className="text-[11px] text-[var(--apple-ink-tertiary)]">{row.category}</p>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-[var(--apple-bg-alt)] border border-[var(--apple-border)] text-[var(--apple-ink-secondary)]">
                      {row.linkType}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[12px] text-[var(--apple-ink-secondary)]">
                    {row.dr}
                  </td>
                  <td className="py-3 px-4">
                    {editable ? (
                      <select
                        value={draft.status}
                        onChange={(e) =>
                          setDrafts((p) => ({
                            ...p,
                            [row.id]: {
                              ...draft,
                              status: e.target.value as "queued" | "submitted" | "live",
                            },
                          }))
                        }
                        className="rounded-lg border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-2 py-1 text-[16px] sm:text-[12px] text-[var(--apple-ink)]"
                      >
                        <option value="queued">{tabLabel("queued")}</option>
                        <option value="submitted">{tabLabel("submitted")}</option>
                        <option value="live">{tabLabel("live")}</option>
                      </select>
                    ) : (
                      <StatusBadge status={row.status} locale={locale} />
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {editable && onSaveRow ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          type="url"
                          value={draft.url}
                          onChange={(e) =>
                            setDrafts((p) => ({
                              ...p,
                              [row.id]: { ...draft, url: e.target.value },
                            }))
                          }
                          placeholder={row.submitUrl}
                          className="w-44 sm:w-56 rounded-lg border border-[var(--apple-border)] bg-[var(--apple-bg)] px-2.5 py-1 text-[16px] sm:text-[12px] font-mono text-[var(--apple-ink)] focus:border-[var(--apple-blue)] focus:outline-none"
                        />
                        <a
                          href={row.submitUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={isZh ? "打开提交页" : "Open submit page"}
                          className="p-1.5 rounded-lg border border-[var(--apple-border)] text-[var(--apple-blue)] hover:bg-[var(--apple-hover)]"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          disabled={savingId === row.id}
                          onClick={async () => {
                            setSavingId(row.id);
                            try {
                              await onSaveRow(row, draft.status, draft.url.trim());
                              setSavedId(row.id);
                              setTimeout(() => setSavedId(null), 1500);
                            } finally {
                              setSavingId(null);
                            }
                          }}
                          className="px-3 py-1 rounded-full lp-btn-primary text-[12px] font-medium cursor-pointer disabled:opacity-50"
                        >
                          {savedId === row.id ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : savingId === row.id ? (
                            "..."
                          ) : isZh ? (
                            "保存"
                          ) : (
                            "Save"
                          )}
                        </button>
                      </div>
                    ) : (
                      <a
                        href={row.liveUrl || row.submitUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[12px] text-[var(--apple-blue)] hover:underline"
                      >
                        {row.liveUrl
                          ? isZh
                            ? "查看收录"
                            : isJa
                            ? "掲載URL"
                            : "Live URL"
                          : isZh
                          ? "访问目录"
                          : isJa
                          ? "サイトへ"
                          : "Visit"}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
