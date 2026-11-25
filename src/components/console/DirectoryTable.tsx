"use client";

import { useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  Image as ImageIcon,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { DISTRIBUTION_DIRECTORIES, type DirectoryChannel } from "@/data/directories";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";

export interface LiveDirState {
  status: "queued" | "submitted" | "live";
  liveBacklinkUrl?: string;
  updatedAt?: string;
  moderationState?: "approved" | "skipped" | "priority";
  scheduledWave?: number;
  proofScreenshotUrl?: string;
  lastHttpStatus?: number;
  isDofollowVerified?: boolean;
  lastCheckedAt?: string;
}

interface DirectoryTableProps {
  liveMap: Record<string, LiveDirState>;
  locale: "en" | "zh" | "ja";
  useSampleDefaults?: boolean;
  /** 开启客户前置选站审批（优先 / 正常 / 跳过） */
  allowModeration?: boolean;
  onModerationChange?: (
    directoryId: string,
    moderationState: "approved" | "skipped" | "priority",
    scheduledWave: number
  ) => Promise<void> | void;
  /** 管理员行内编辑模式（供 /admin 履约台复用） */
  editable?: boolean;
  onSaveRow?: (
    dir: DirectoryChannel,
    status: "queued" | "submitted" | "live",
    liveUrl: string,
    proofScreenshotUrl?: string,
    scheduledWave?: number
  ) => Promise<void>;
  onTriggerVerify?: () => Promise<void>;
  verifyingBacklinks?: boolean;
  exportFilename?: string;
}

/**
 * V4 目录分发引擎 2.0（100 精选目录 + 3 周自然排期轴 + 客户选站审批 + Cron 外链自动验活 + 截图回执）
 */
export default function DirectoryTable({
  liveMap,
  locale,
  useSampleDefaults = false,
  allowModeration = false,
  onModerationChange,
  editable = false,
  onSaveRow,
  onTriggerVerify,
  verifyingBacklinks = false,
  exportFilename = "launchpulse-100-directories-report.csv",
}: DirectoryTableProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "live" | "submitted" | "queued">("all");
  const [waveFilter, setWaveFilter] = useState<0 | 1 | 2 | 3>(0);
  const [drafts, setDrafts] = useState<
    Record<string, { status: "queued" | "submitted" | "live"; url: string; proof: string }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [proofModal, setProofModal] = useState<{ name: string; url: string; backlink?: string } | null>(null);

  const isZh = locale === "zh";

  const rows = useMemo(() => {
    return DISTRIBUTION_DIRECTORIES.map((dir) => {
      const live = liveMap[dir.id];
      const status: "queued" | "submitted" | "live" =
        live?.status || (useSampleDefaults ? dir.defaultStatus : "queued");
      const backlinkUrl = live?.liveBacklinkUrl || (useSampleDefaults && status === "live" ? dir.url : "");
      const moderationState = live?.moderationState || "approved";
      const scheduledWave = live?.scheduledWave || dir.wave;
      const lastHttpStatus = live?.lastHttpStatus || (useSampleDefaults && status === "live" ? 200 : 0);
      const isDofollowVerified =
        live?.isDofollowVerified ?? (useSampleDefaults && status === "live" && dir.linkType === "dofollow");
      const lastCheckedAt = live?.lastCheckedAt || (useSampleDefaults && status === "live" ? "2h ago" : "");
      const proofScreenshotUrl = live?.proofScreenshotUrl || "";
      return {
        ...dir,
        status,
        backlinkUrl,
        moderationState,
        scheduledWave,
        lastHttpStatus,
        isDofollowVerified,
        lastCheckedAt,
        proofScreenshotUrl,
      };
    });
  }, [liveMap, useSampleDefaults]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      live: rows.filter((r) => r.status === "live").length,
      submitted: rows.filter((r) => r.status === "submitted").length,
      queued: rows.filter((r) => r.status === "queued").length,
      verified: rows.filter((r) => r.lastHttpStatus >= 200 && r.lastHttpStatus < 400).length,
      priority: rows.filter((r) => r.moderationState === "priority").length,
      skipped: rows.filter((r) => r.moderationState === "skipped").length,
    }),
    [rows]
  );

  // 3 周自然节奏排期进度统计
  const waveStats = useMemo(() => {
    return ([1, 2, 3] as const).map((w) => {
      const list = rows.filter((r) => r.scheduledWave === w && r.moderationState !== "skipped");
      const done = list.filter((r) => r.status === "live" || r.status === "submitted").length;
      const label =
        w === 1
          ? isZh
            ? "Week 1 · 权威核心站 (DR 70–91)"
            : "Week 1 · Authority Core (DR 70–91)"
          : w === 2
            ? isZh
              ? "Week 2 · 高转化 AI/SaaS (DR 50–69)"
              : "Week 2 · High-Intent AI/SaaS (DR 50–69)"
            : isZh
              ? "Week 3 · 极速 Launchpad (DR 38–49)"
              : "Week 3 · Fast-Track Launchpads";
      return { wave: w, label, total: list.length, done, pct: list.length > 0 ? Math.round((done / list.length) * 100) : 0 };
    });
  }, [rows, isZh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (waveFilter !== 0 && r.scheduledWave !== waveFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.linkType.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    });
  }, [rows, filter, waveFilter, search]);

  const exportCsv = () => {
    const header = "ID,Directory,DR,MonthlyTraffic,Category,LinkType,Wave,Moderation,Status,HTTPVerify,SubmitURL,LiveBacklinkURL\n";
    const body = rows
      .map(
        (r) =>
          `${r.id},"${r.name}",${r.dr},"${r.monthlyTraffic}","${r.category}",${r.linkType},Week${r.scheduledWave},${r.moderationState},${r.status},${r.lastHttpStatus || "-"},${r.submitUrl},${r.backlinkUrl}`
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusLabel = (st: "queued" | "submitted" | "live") => {
    if (st === "live") return isZh ? "已收录" : locale === "ja" ? "掲載済み" : "Live";
    if (st === "submitted") return isZh ? "已提交" : locale === "ja" ? "提出済み" : "Submitted";
    return isZh ? "排队中" : locale === "ja" ? "待機中" : "Queued";
  };

  const getDraft = (row: (typeof rows)[number]) =>
    drafts[row.id] || { status: row.status, url: row.backlinkUrl, proof: row.proofScreenshotUrl };

  const handleSave = async (row: (typeof rows)[number]) => {
    if (!onSaveRow) return;
    const d = getDraft(row);
    setSavingId(row.id);
    try {
      await onSaveRow(row, d.status, d.url.trim(), d.proof.trim(), row.scheduledWave);
      setSavedId(row.id);
      setTimeout(() => setSavedId((cur) => (cur === row.id ? null : cur)), 1800);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* V4 3 周自然节奏排期时间轴（防 Google 判突击垃圾外链） */}
      <div className="grid md:grid-cols-3 gap-3 tabular-nums">
        {waveStats.map((w) => {
          const active = waveFilter === w.wave;
          return (
            <button
              key={w.wave}
              type="button"
              onClick={() => setWaveFilter(active ? 0 : w.wave)}
              className={`text-left rounded-[16px] border p-4 transition cursor-pointer ${
                active
                  ? "border-[var(--apple-blue)] bg-[var(--apple-blue-soft)]"
                  : "border-[var(--apple-border)] bg-[var(--apple-surface)] hover:border-[var(--apple-border-strong)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="font-semibold text-[var(--apple-ink)]">{w.label}</span>
                <span className="text-[11px] font-medium text-[var(--apple-blue)]">
                  {w.done}/{w.total}
                </span>
              </div>
              <div className="mt-2.5 h-1.5 rounded-full bg-[var(--apple-surface-subtle)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--apple-blue)] transition-all"
                  style={{ width: `${w.pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-[var(--apple-ink-secondary)]">
                {active
                  ? isZh
                    ? "已按该波次筛选（再点取消）"
                    : "Filtered by wave (click to reset)"
                  : isZh
                    ? `已完成 ${w.pct}% · 按周自然递增权重`
                    : `${w.pct}% processed · natural drip cadence`}
              </p>
            </button>
          );
        })}
      </div>

      {/* 主表格卡片 */}
      <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] overflow-hidden">
        {/* 顶栏工具条 */}
        <div className="p-4 sm:p-5 border-b border-[var(--apple-border)] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[var(--apple-ink-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isZh ? "搜索 100 个目录、分类或 dofollow..." : "Search 100 directories, category or dofollow..."}
              className="w-full h-9 pl-9 pr-3.5 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[14px] text-[var(--apple-ink)] placeholder:text-[var(--apple-ink-tertiary)] outline-none focus:border-[var(--apple-blue)] transition"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center rounded-[10px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-0.5 text-[12px] tabular-nums">
              {(["all", "live", "submitted", "queued"] as const).map((k) => {
                const active = filter === k;
                const label =
                  k === "all"
                    ? `${isZh ? "全部" : "All"} (${counts.all})`
                    : k === "live"
                      ? `${isZh ? "已收录" : "Live"} (${counts.live})`
                      : k === "submitted"
                        ? `${isZh ? "已提交" : "Submitted"} (${counts.submitted})`
                        : `${isZh ? "排队中" : "Queued"} (${counts.queued})`;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setFilter(k)}
                    className={`px-2.5 py-1 rounded-[8px] font-medium transition cursor-pointer ${
                      active
                        ? "bg-[var(--apple-surface)] text-[var(--apple-ink)] shadow-xs"
                        : "text-[var(--apple-ink-secondary)] hover:text-[var(--apple-ink)]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {editable && onTriggerVerify && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={verifyingBacklinks}
                onClick={onTriggerVerify}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {isZh ? "一键 HTTP 验活" : "Verify Live URLs"}
              </Button>
            )}

            {!editable && (
              <Button variant="secondary" size="sm" onClick={exportCsv}>
                <Download className="w-3.5 h-3.5" />
                {isZh ? "导出 100 站 CSV" : "Export CSV"}
              </Button>
            )}
          </div>
        </div>

        {/* 验活统计微提示条 */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-[var(--apple-border)] bg-[var(--apple-bg)] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--apple-ink-secondary)] tabular-nums">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[var(--apple-green)] font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              {isZh ? `HTTP 200 自动验活：${counts.verified} 站` : `HTTP 200 Auto-Verified: ${counts.verified}`}
            </span>
            {counts.priority > 0 && (
              <span className="text-[var(--apple-blue)] font-medium">
                ★ {isZh ? `客户置顶优先：${counts.priority}` : `Priority: ${counts.priority}`}
              </span>
            )}
            {counts.skipped > 0 && (
              <span>{isZh ? `已跳过：${counts.skipped}` : `Skipped: ${counts.skipped}`}</span>
            )}
          </div>
          <span>
            {isZh
              ? "Cloudflare Cron 每日自动巡检已收录外链存活与 dofollow 状态"
              : "Daily Cloudflare Cron monitors HTTP 200 status & dofollow integrity"}
          </span>
        </div>

        {/* 数据表 */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-[var(--apple-surface)] border-b border-[var(--apple-border)] text-[11px] font-medium text-[var(--apple-ink-tertiary)]">
              <tr>
                <th className="py-2.5 px-4 sm:px-5">{isZh ? "软件目录站 / 月访问" : "Directory & Traffic"}</th>
                <th className="py-2.5 px-3">{isZh ? "属性 / 排期" : "Type / Wave"}</th>
                <th className="py-2.5 px-3 text-right">DR</th>
                <th className="py-2.5 px-3">{isZh ? "收录与验活状态" : "Status & Health"}</th>
                {allowModeration && !editable && (
                  <th className="py-2.5 px-3">{isZh ? "选站审批" : "Moderation"}</th>
                )}
                <th className="py-2.5 px-4 sm:px-5 text-right">
                  {editable ? (isZh ? "外链 / 截图回执与保存" : "Backlink / Proof & Save") : isZh ? "外链凭证" : "Proof"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--apple-border)] text-[13px]">
              {filtered.map((row) => {
                const draft = getDraft(row);
                const isSkipped = row.moderationState === "skipped";
                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-[var(--apple-bg)] transition ${isSkipped ? "opacity-50" : ""}`}
                  >
                    <td className="py-3 px-4 sm:px-5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--apple-ink)]">{row.name}</span>
                        {row.moderationState === "priority" && (
                          <Star className="w-3.5 h-3.5 text-[var(--apple-blue)] fill-[var(--apple-blue)]" />
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--apple-ink-tertiary)] mt-0.5 tabular-nums">
                        {row.category} · {row.monthlyTraffic}/mo · SLA {row.approvalSla}
                      </p>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--apple-surface-subtle)] text-[var(--apple-ink-secondary)]">
                          {row.linkType}
                        </span>
                        <span className="text-[11px] text-[var(--apple-ink-tertiary)] tabular-nums">
                          W{row.scheduledWave}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-semibold tabular-nums text-[var(--apple-ink)]">
                      {row.dr}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      {editable ? (
                        <select
                          value={draft.status}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.id]: {
                                ...draft,
                                status: e.target.value as "queued" | "submitted" | "live",
                              },
                            }))
                          }
                          className="h-8 px-2 rounded-[8px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[12px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
                        >
                          <option value="queued">{isZh ? "排队中" : "Queued"}</option>
                          <option value="submitted">{isZh ? "已提交" : "Submitted"}</option>
                          <option value="live">{isZh ? "已收录" : "Live"}</option>
                        </select>
                      ) : (
                        <div className="space-y-1">
                          <StatusBadge
                            tone={row.status === "live" ? "green" : row.status === "submitted" ? "blue" : "neutral"}
                            label={statusLabel(row.status)}
                          />
                          {row.lastHttpStatus >= 200 && row.lastHttpStatus < 400 && (
                            <div className="flex items-center gap-1 text-[10px] text-[var(--apple-green)] font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              HTTP {row.lastHttpStatus}
                              {row.isDofollowVerified ? " · dofollow" : ""}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {allowModeration && !editable && (
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="inline-flex rounded-[8px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-0.5 text-[11px]">
                          {(
                            [
                              { id: "priority", label: isZh ? "优先" : "Pin" },
                              { id: "approved", label: isZh ? "正常" : "OK" },
                              { id: "skipped", label: isZh ? "跳过" : "Skip" },
                            ] as const
                          ).map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => onModerationChange?.(row.id, opt.id, row.scheduledWave)}
                              className={`px-2 py-0.5 rounded-[6px] font-medium transition cursor-pointer ${
                                row.moderationState === opt.id
                                  ? opt.id === "priority"
                                    ? "bg-[var(--apple-blue)] text-white"
                                    : "bg-[var(--apple-surface)] text-[var(--apple-ink)] shadow-xs"
                                  : "text-[var(--apple-ink-secondary)] hover:text-[var(--apple-ink)]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}

                    <td className="py-3 px-4 sm:px-5 text-right whitespace-nowrap">
                      {editable ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="url"
                            value={draft.url}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [row.id]: { ...draft, url: e.target.value },
                              }))
                            }
                            placeholder={row.submitUrl}
                            className="w-36 sm:w-44 h-8 px-2.5 rounded-[8px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[12px] font-mono text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
                          />
                          <input
                            type="url"
                            value={draft.proof}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [row.id]: { ...draft, proof: e.target.value },
                              }))
                            }
                            placeholder={isZh ? "截图 URL (可选)" : "Screenshot URL"}
                            className="hidden xl:block w-32 h-8 px-2.5 rounded-[8px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[12px] font-mono text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
                          />
                          <a
                            href={row.submitUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={row.submitUrl}
                            className="p-1.5 rounded-[8px] border border-[var(--apple-border)] text-[var(--apple-blue)] hover:bg-[var(--apple-blue-soft)]"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <Button
                            variant="primary"
                            size="sm"
                            loading={savingId === row.id}
                            onClick={() => handleSave(row)}
                          >
                            {savedId === row.id ? <Check className="w-3.5 h-3.5" /> : isZh ? "保存" : "Save"}
                          </Button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          {row.proofScreenshotUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setProofModal({
                                  name: row.name,
                                  url: row.proofScreenshotUrl,
                                  backlink: row.backlinkUrl,
                                })
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--apple-surface-subtle)] text-[var(--apple-ink)] hover:text-[var(--apple-blue)] cursor-pointer"
                            >
                              <ImageIcon className="w-3 h-3" /> {isZh ? "截图" : "Proof"}
                            </button>
                          )}
                          {row.backlinkUrl ? (
                            <a
                              href={row.backlinkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--apple-blue)] hover:underline"
                            >
                              {isZh ? "查看收录" : "View live"}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <a
                              href={row.submitUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[12px] text-[var(--apple-ink-tertiary)] hover:text-[var(--apple-blue)]"
                            >
                              {isZh ? "目标站" : "Target"}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 截图凭证预览弹窗 */}
      {proofModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-[22px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--apple-blue)]" />
                <h4 className="text-[15px] font-semibold text-[var(--apple-ink)]">
                  {proofModal.name} — {isZh ? "实机收录截图凭证" : "Live Submission Screenshot Proof"}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setProofModal(null)}
                className="p-1.5 rounded-full hover:bg-[var(--apple-surface-subtle)] text-[var(--apple-ink-secondary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-[14px] border border-[var(--apple-border)] overflow-hidden bg-[var(--apple-bg)] max-h-[65vh] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proofModal.url} alt={proofModal.name} className="w-full h-auto object-contain" />
            </div>
            {proofModal.backlink && (
              <div className="flex justify-end">
                <a
                  href={proofModal.backlink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--apple-blue)] hover:underline"
                >
                  {proofModal.backlink} <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
