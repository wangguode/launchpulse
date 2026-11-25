"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  ExternalLink,
  Link2,
  Plus,
  Radio,
  Search,
  Share2,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  formatCategoryLabel,
  formatChannelLabel,
  formatSlaLabel,
  type BrandKitRecord,
  type ReconciledDirectoryRow,
  type ReconciledLedger,
  type TrackingLinkRecord,
} from "@/lib/console-ledger";

interface DirectoriesChannelsViewProps {
  campaignId: number;
  productName: string;
  targetUrl: string;
  brandKit: BrandKitRecord | null;
  ledger: ReconciledLedger;
  links: TrackingLinkRecord[];
  initialDirectoryId?: string | null;
  isZh: boolean;
  isSample: boolean;
  onModerationChange: (
    directoryId: string,
    moderationState: "approved" | "skipped" | "priority",
    scheduledWave: 1 | 2 | 3
  ) => Promise<void> | void;
  onShareReport: () => Promise<void> | void;
  sharingReport: boolean;
  onRefresh: () => Promise<void> | void;
}

/**
 * 视图 ②：外链与渠道（合并 100 目录节奏排期、选站审批与归因短链矩阵）
 */
export default function DirectoriesChannelsView({
  campaignId,
  productName,
  targetUrl,
  brandKit,
  ledger,
  links,
  initialDirectoryId,
  isZh,
  isSample,
  onModerationChange,
  onShareReport,
  sharingReport,
  onRefresh,
}: DirectoriesChannelsViewProps) {
  const [waveFilter, setWaveFilter] = useState<0 | 1 | 2 | 3>(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "submitted" | "queued" | "skipped">("all");
  const [query, setQuery] = useState("");
  const [selectedDirId, setSelectedDirId] = useState<string | null>(initialDirectoryId || null);

  // 底部归因短链与埋点区
  const [linksExpanded, setLinksExpanded] = useState(false);
  const [newChannel, setNewChannel] = useState("directory");
  const [newLabel, setNewLabel] = useState("");
  const [creatingLink, setCreatingLink] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testingPixel, setTestingPixel] = useState(false);
  const [pixelMsg, setPixelMsg] = useState("");

  const filteredDirs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ledger.directories.filter((d) => {
      if (waveFilter !== 0 && d.scheduledWave !== waveFilter) return false;
      if (statusFilter !== "all" && d.effectiveStatus !== statusFilter) return false;
      if (q) {
        const hay = `${d.name} ${d.url} ${d.category} dr${d.dr}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ledger.directories, waveFilter, statusFilter, query]);

  const activeDir: ReconciledDirectoryRow | null = useMemo(() => {
    if (!selectedDirId) return null;
    return ledger.directories.find((d) => d.id === selectedDirId) || null;
  }, [ledger.directories, selectedDirId]);

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // ignore
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    if (isSample) {
      setPixelMsg(isZh ? "体验模式：登录后可生成持久化短链并实时追踪点击。" : "Sign in to create live shortlinks.");
      return;
    }
    if (!campaignId) return;
    setCreatingLink(true);
    try {
      const res = await fetch("/api/dashboard/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, channel: newChannel, label: newLabel.trim() }),
      });
      if (res.ok) {
        setNewLabel("");
        await onRefresh();
      }
    } finally {
      setCreatingLink(false);
    }
  };

  const handleTestPixel = async () => {
    const targetCode = links[0]?.code;
    if (!targetCode) return;
    if (isSample) {
      setPixelMsg(isZh ? "体验模式校验通过：统计脚本可正常上报注册与付费事件。" : "Sample ping OK.");
      return;
    }
    setTestingPixel(true);
    setPixelMsg("");
    try {
      const res = await fetch("/api/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: targetCode, event: "signup", valueUsd: 0 }),
      });
      if (res.ok) {
        setPixelMsg(isZh ? `验证成功：/r/${targetCode} 已收到测试注册事件。` : `Verified ping for /r/${targetCode}.`);
        await onRefresh();
      } else {
        setPixelMsg(isZh ? "回传校验异常，请确认短链存在。" : "Ping failed.");
      }
    } finally {
      setTestingPixel(false);
    }
  };

  const pixelCode = `<script src="https://pulse.statementflow.win/api/pixel.js" defer></script>`;

  const waveButtons: Array<{ key: 0 | 1 | 2 | 3; label: string; count: number }> = [
    { key: 0, label: isZh ? "全部" : "All", count: ledger.dirCounts.total },
    { key: 1, label: isZh ? "第 1 周" : "Week 1", count: ledger.dirCounts.wave1 },
    { key: 2, label: isZh ? "第 2 周" : "Week 2", count: ledger.dirCounts.wave2 },
    { key: 3, label: isZh ? "第 3 周" : "Week 3", count: ledger.dirCounts.wave3 },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 relative">
      {/* 顶部标题与精准对账摘要 */}
      <div className="px-5 sm:px-7 pt-5 pb-4 border-b border-[var(--border-hairline)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="lp-display text-[19px] sm:text-[20px] font-semibold text-[var(--ink-primary)] tracking-tight">
              {isZh ? "外链与渠道" : "Directories & Links"}
            </h1>
            <p className="text-[12.5px] text-[var(--ink-muted)] mt-0.5 tabular-nums">
              {isZh
                ? `已验活 ${ledger.dirCounts.live} · 审核中 ${ledger.dirCounts.submitted} · 待提交 ${ledger.dirCounts.queued} · 已跳过 ${ledger.dirCounts.skipped}（共 ${ledger.dirCounts.total} 站，严格对账）`
                : `${ledger.dirCounts.live} verified · ${ledger.dirCounts.submitted} in review · ${ledger.dirCounts.queued} queued · ${ledger.dirCounts.skipped} skipped (${ledger.dirCounts.total} total)`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="xs" onClick={() => setLinksExpanded((v) => !v)}>
              <Link2 className="w-3.5 h-3.5" strokeWidth={1.7} />
              {isZh ? `归因短链 (${links.length})` : `Links (${links.length})`}
              {linksExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="secondary" size="xs" loading={sharingReport} onClick={onShareReport}>
              <Share2 className="w-3.5 h-3.5" strokeWidth={1.7} />
              {isZh ? "复制公开战报" : "Share Report"}
            </Button>
          </div>
        </div>

        {/* 单行紧凑筛选控制带 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 flex-wrap tabular-nums">
            {waveButtons.map((wb) => {
              const active = waveFilter === wb.key;
              return (
                <button
                  key={wb.key}
                  type="button"
                  onClick={() => setWaveFilter(wb.key)}
                  className={`h-7 px-2.5 rounded-[6px] text-[12px] lp-ease cursor-pointer inline-flex items-center gap-1.5 border ${
                    active
                      ? "bg-[var(--bg-active-tint)] border-[var(--accent-primary)] text-[var(--ink-primary)] font-semibold"
                      : "bg-[var(--bg-surface)] border-[var(--border-hairline)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                  }`}
                >
                  <span>{wb.label}</span>
                  <span className="font-mono text-[11px] opacity-75">{wb.count}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              aria-label={isZh ? "按验活状态筛选" : "Filter by status"}
              className="h-8 px-2.5 rounded-[6px] border border-[var(--border-strong)] bg-[var(--bg-sheet)] text-[12.5px] text-[var(--ink-primary)] outline-none"
            >
              <option value="all">{isZh ? "全部状态" : "All statuses"}</option>
              <option value="live">{isZh ? `已验活 (${ledger.dirCounts.live})` : `Verified (${ledger.dirCounts.live})`}</option>
              <option value="submitted">{isZh ? `审核中 (${ledger.dirCounts.submitted})` : `In review (${ledger.dirCounts.submitted})`}</option>
              <option value="queued">{isZh ? `待提交 (${ledger.dirCounts.queued})` : `Queued (${ledger.dirCounts.queued})`}</option>
              <option value="skipped">{isZh ? `已跳过 (${ledger.dirCounts.skipped})` : `Skipped (${ledger.dirCounts.skipped})`}</option>
            </select>

            <div className="relative flex-1 sm:w-[210px]">
              <Search className="w-3.5 h-3.5 text-[var(--ink-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isZh ? "搜索目录名或 DR..." : "Filter directories..."}
                className="w-full h-8 pl-8 pr-2.5 rounded-[6px] border border-[var(--border-strong)] bg-[var(--bg-sheet)] text-[12.5px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 可展开：自定义归因短链与 1 行统计脚本区 */}
      {linksExpanded && (
        <div className="px-5 sm:px-7 py-4 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* 短链列表 + 快速新建 */}
            <div className="space-y-3">
              <form onSubmit={handleCreateLink} className="flex items-center gap-2">
                <select
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  className="h-8 px-2 rounded-[6px] border border-[var(--border-strong)] bg-[var(--bg-sheet)] text-[12px] text-[var(--ink-primary)] outline-none"
                >
                  <option value="directory">{isZh ? "目录外链" : "Directory"}</option>
                  <option value="community">{isZh ? "社区回复" : "Community"}</option>
                  <option value="seo">{isZh ? "竞品对比页" : "Comparison"}</option>
                  <option value="social">{isZh ? "社媒简介" : "Social"}</option>
                </select>
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder={isZh ? "渠道备注，如 Product Hunt 首发" : "Label e.g. HN Show Launch"}
                  className="flex-1 h-8 px-2.5 rounded-[6px] border border-[var(--border-strong)] bg-[var(--bg-sheet)] text-[12.5px] text-[var(--ink-primary)] outline-none"
                />
                <Button type="submit" variant="primary" size="xs" loading={creatingLink}>
                  <Plus className="w-3.5 h-3.5" />
                  {isZh ? "生成短链" : "Add Link"}
                </Button>
              </form>

              <div className="rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] divide-y divide-[var(--border-hairline)] tabular-nums">
                {links.map((lk) => {
                  const shortUrl = `https://pulse.statementflow.win/r/${lk.code}`;
                  return (
                    <div key={lk.code} className="px-3 py-2 flex items-center justify-between gap-2 text-[12.5px]">
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--ink-primary)] truncate">
                          {lk.label}
                          <span className="ml-2 text-[11px] text-[var(--ink-muted)] font-normal">
                            {formatChannelLabel(lk.channel, isZh)}
                          </span>
                        </p>
                        <p className="font-mono text-[11.5px] text-[var(--ink-muted)] truncate">/r/{lk.code}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-[12px] text-[var(--ink-secondary)]">
                          {lk.clicks_count} {isZh ? "点击" : "clicks"} · ${lk.revenue_usd || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyText(`lk-${lk.code}`, shortUrl)}
                          className="h-7 px-2 rounded-[5px] border border-[var(--border-hairline)] hover:bg-[var(--bg-hover)] text-[11.5px] text-[var(--ink-primary)] inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === `lk-${lk.code}` ? <Check className="w-3 h-3 text-[var(--status-live)]" /> : <Copy className="w-3 h-3" />}
                          {copiedId === `lk-${lk.code}` ? (isZh ? "已复制" : "Copied") : isZh ? "复制" : "Copy"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 1 行归因统计脚本 */}
            <div className="rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] p-3.5 flex flex-col justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-[var(--ink-primary)] inline-flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    {isZh ? "1 行美元级归因脚本" : "1-Line Revenue Attribution Pixel"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="xs" onClick={() => copyText("pixel", pixelCode)}>
                      {copiedId === "pixel" ? <Check className="w-3 h-3 text-[var(--status-live)]" /> : <Copy className="w-3 h-3" />}
                      {copiedId === "pixel" ? (isZh ? "已复制" : "Copied") : isZh ? "复制脚本" : "Copy"}
                    </Button>
                    <Button variant="secondary" size="xs" loading={testingPixel} onClick={handleTestPixel}>
                      <Radio className="w-3 h-3" />
                      {isZh ? "测试回传" : "Ping"}
                    </Button>
                  </div>
                </div>
                <pre className="p-2.5 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[11.5px] font-mono text-[var(--ink-secondary)] overflow-x-auto">
                  {pixelCode}
                </pre>
                <p className="text-[11.5px] text-[var(--ink-muted)]">
                  {isZh
                    ? "注册或付款成功时调用 window.lpConvert('purchase', 39)，自动归因至来源目录或社区回复。"
                    : "Call window.lpConvert('purchase', 39) on checkout to attribute dollars back to the exact source."}
                </p>
              </div>
              {pixelMsg && <p className="text-[12px] text-[var(--status-live)] font-medium">{pixelMsg}</p>}
            </div>
          </div>
        </div>
      )}

      {/* 精密 100 目录核心表格 + 右侧详情检查器 */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 min-w-0 overflow-x-auto">
          <table className="w-full text-left border-collapse tabular-nums">
            <thead>
              <tr className="bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] text-[12px] text-[var(--ink-muted)]">
                <th className="py-2.5 pl-5 sm:pl-7 pr-3 font-medium">{isZh ? "目录平台" : "Directory"}</th>
                <th className="py-2.5 px-3 font-medium">{isZh ? "域名权重" : "Authority"}</th>
                <th className="py-2.5 px-3 font-medium hidden md:table-cell">{isZh ? "预计审核" : "Review"}</th>
                <th className="py-2.5 px-3 font-medium hidden sm:table-cell">{isZh ? "排期" : "Cadence"}</th>
                <th className="py-2.5 px-3 font-medium">{isZh ? "投放与验活" : "Status"}</th>
                <th className="py-2.5 pl-3 pr-5 sm:pr-7 font-medium text-right">{isZh ? "操作" : "Action"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)] text-[13px]">
              {filteredDirs.map((dir) => {
                const selected = activeDir?.id === dir.id;
                const statusTone =
                  dir.effectiveStatus === "live"
                    ? "success"
                    : dir.effectiveStatus === "submitted"
                      ? "warning"
                      : dir.effectiveStatus === "skipped"
                        ? "neutral"
                        : "info";
                const statusLabel =
                  dir.effectiveStatus === "live"
                    ? isZh
                      ? dir.isDofollowVerified
                        ? "已验活 · 传权重"
                        : "已验活"
                      : "Verified"
                    : dir.effectiveStatus === "submitted"
                      ? isZh
                        ? "审核中"
                        : "In Review"
                      : dir.effectiveStatus === "skipped"
                        ? isZh
                          ? "已跳过"
                          : "Skipped"
                        : isZh
                          ? "待提交"
                          : "Queued";

                return (
                  <tr
                    key={dir.id}
                    onClick={() => setSelectedDirId(dir.id)}
                    style={selected ? { boxShadow: "inset 1px 0 0 var(--accent-primary)" } : undefined}
                    className={`lp-ease cursor-pointer ${
                      selected ? "bg-[var(--bg-active-tint)]" : "hover:bg-[var(--bg-hover)]"
                    }`}
                  >
                    <td className="py-3 pl-5 sm:pl-7 pr-3">
                      <div className="font-medium text-[var(--ink-primary)]">{dir.name}</div>
                      <div className="text-[11.5px] text-[var(--ink-muted)] mt-0.5">
                        {formatCategoryLabel(dir.category, isZh)} ·{" "}
                        {dir.pricing === "free" ? (isZh ? "免费收录" : "Free") : isZh ? "含加速项" : "Freemium"}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[12.5px] text-[var(--ink-primary)]">DR {dir.dr}</td>
                    <td className="py-3 px-3 text-[12.5px] text-[var(--ink-secondary)] hidden md:table-cell">
                      {formatSlaLabel(dir.approvalSla, isZh)}
                    </td>
                    <td className="py-3 px-3 text-[12.5px] text-[var(--ink-secondary)] hidden sm:table-cell">
                      {isZh ? `第 ${dir.scheduledWave} 周` : `Week ${dir.scheduledWave}`}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge tone={statusTone} label={statusLabel} />
                    </td>
                    <td
                      className="py-3 pl-3 pr-5 sm:pr-7 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onModerationChange(
                              dir.id,
                              dir.moderationState === "skipped" ? "approved" : "skipped",
                              dir.scheduledWave
                            )
                          }
                          className="h-7 px-2 rounded-[5px] border border-[var(--border-hairline)] hover:bg-[var(--bg-hover)] text-[11.5px] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] lp-ease cursor-pointer"
                        >
                          {dir.moderationState === "skipped" ? (isZh ? "恢复" : "Restore") : isZh ? "跳过" : "Skip"}
                        </button>
                        <a
                          href={dir.liveBacklinkUrl || dir.submitUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-7 px-2 rounded-[5px] border border-[var(--border-hairline)] hover:bg-[var(--bg-hover)] text-[11.5px] text-[var(--ink-primary)] inline-flex items-center gap-1"
                        >
                          <span>{dir.liveBacklinkUrl ? (isZh ? "查看外链" : "Live") : isZh ? "提交页" : "Submit"}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredDirs.length === 0 && (
            <div className="py-16 text-center text-[13px] text-[var(--ink-muted)]">
              {isZh ? "当前筛选条件下未找到匹配目录" : "No directories match this filter"}
            </div>
          )}
        </div>

        {/* 右侧常驻目录详情检查器（选中某行时展开） */}
        {activeDir && (
          <aside className="hidden lg:flex lg:flex-col w-[340px] shrink-0 border-l border-[var(--border-hairline)] bg-[var(--bg-sheet)]">
            <div className="px-4 h-12 border-b border-[var(--border-hairline)] flex items-center justify-between">
              <span className="text-[13.5px] font-semibold text-[var(--ink-primary)] truncate">
                {activeDir.name}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDirId(null)}
                aria-label="关闭详情"
                className="p-1 rounded text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto text-[12.5px]">
              <div className="grid grid-cols-2 gap-2.5 tabular-nums">
                <div className="p-2.5 rounded-[7px] bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
                  <div className="text-[11px] text-[var(--ink-muted)]">{isZh ? "域名权重" : "Authority"}</div>
                  <div className="font-mono font-semibold text-[15px] text-[var(--ink-primary)] mt-0.5">
                    DR {activeDir.dr}
                  </div>
                </div>
                <div className="p-2.5 rounded-[7px] bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
                  <div className="text-[11px] text-[var(--ink-muted)]">{isZh ? "月访问估算" : "Est. Traffic"}</div>
                  <div className="font-mono font-semibold text-[15px] text-[var(--ink-primary)] mt-0.5">
                    {activeDir.monthlyTraffic}
                  </div>
                </div>
              </div>

              <div className="space-y-2 py-2 border-y border-[var(--border-hairline)]">
                <div className="flex justify-between">
                  <span className="text-[var(--ink-muted)]">{isZh ? "外链属性" : "Link Type"}</span>
                  <span className="font-medium text-[var(--ink-primary)]">
                    {activeDir.linkType === "dofollow" ? (isZh ? "传递权重 (Dofollow)" : "Dofollow") : "Nofollow"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ink-muted)]">{isZh ? "预计过审周期" : "Review SLA"}</span>
                  <span className="text-[var(--ink-primary)]">{formatSlaLabel(activeDir.approvalSla, isZh)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ink-muted)]">{isZh ? "验活状态码" : "HTTP Check"}</span>
                  <span className="font-mono text-[var(--ink-primary)]">
                    {activeDir.lastHttpStatus ? `HTTP ${activeDir.lastHttpStatus}` : isZh ? "等待收录" : "Pending"}
                  </span>
                </div>
              </div>

              {/* 专属短链与自助提交一键复制包 */}
              <div className="space-y-2">
                <p className="text-[12px] font-semibold text-[var(--ink-primary)]">
                  {isZh ? "自助提交快捷复制" : "Quick-Fill Snippets"}
                </p>
                {[
                  {
                    id: "url",
                    label: isZh ? "归因短链（填入官网字段）" : "Tracking Shortlink",
                    val: `https://pulse.statementflow.win/r/${activeDir.shortlinkCode}`,
                  },
                  {
                    id: "tag",
                    label: isZh ? "一句话定位" : "One-line Tagline",
                    val: brandKit?.short_tagline || `${productName} — ${targetUrl}`,
                  },
                  {
                    id: "pitch",
                    label: isZh ? "标准产品介绍" : "Standard Pitch",
                    val: brandKit?.medium_pitch || `${productName} (${targetUrl})`,
                  },
                ].map((snip) => (
                  <div
                    key={snip.id}
                    className="p-2.5 rounded-[7px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)]">
                      <span>{snip.label}</span>
                      <button
                        type="button"
                        onClick={() => copyText(`snip-${snip.id}`, snip.val)}
                        className="text-[var(--accent-primary)] hover:underline cursor-pointer inline-flex items-center gap-1"
                      >
                        {copiedId === `snip-${snip.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedId === `snip-${snip.id}` ? (isZh ? "已复制" : "Copied") : isZh ? "复制" : "Copy"}
                      </button>
                    </div>
                    <p
                      className={`text-[12px] text-[var(--ink-primary)] line-clamp-2 ${
                        snip.id === "url" ? "font-mono break-all" : "break-words"
                      }`}
                    >
                      {snip.val}
                    </p>
                  </div>
                ))}
              </div>

              <a
                href={activeDir.submitUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-9 rounded-[7px] lp-btn-primary text-[12.5px] font-medium inline-flex items-center justify-center gap-1.5"
              >
                <span>{isZh ? "前往官方提交页" : "Open Official Submit Page"}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
