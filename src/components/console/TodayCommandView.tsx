"use client";

import { ArrowRight, CheckCircle2, FolderPlus, Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import RevenuePulseChart from "@/components/console/RevenuePulseChart";
import type { RadarLeadRecord, ReconciledDirectoryRow, ReconciledLedger } from "@/lib/console-ledger";

interface TodayCommandViewProps {
  ledger: ReconciledLedger;
  topPendingLead: RadarLeadRecord | null;
  hasProject: boolean;
  isZh: boolean;
  approvingWave: boolean;
  waveApprovedNotice: boolean;
  onOpenBrandKit: () => void;
  onApproveWave2: () => void;
  onGoInboxLead: (leadId?: number) => void;
  onOpenDirectory: (dir: ReconciledDirectoryRow) => void;
  onGoDirectories: () => void;
  onCreateProject: () => void;
}

/**
 * 视图 ①：今日指挥台（2:1 行动驱动左右分栏，严格对齐效果图 2）
 * - 左 64%：今日待办行动流（原地闭环） + 最新外链验活回执
 * - 右 36%：营收与归因脉搏（单锚点主数值 + 全宽无留白趋势图 + 4 步漏斗 + 渠道对账明细）
 */
export default function TodayCommandView({
  ledger,
  topPendingLead,
  hasProject,
  isZh,
  approvingWave,
  waveApprovedNotice,
  onOpenBrandKit,
  onApproveWave2,
  onGoInboxLead,
  onOpenDirectory,
  onGoDirectories,
  onCreateProject,
}: TodayCommandViewProps) {
  const needsBrandKit = ledger.brandKit.score < 100;
  const wave2Count = ledger.dirCounts.wave2PendingIds.length;
  const needsWaveApproval = wave2Count > 0 && !waveApprovedNotice;
  const pendingLeadsCount = ledger.leadCounts.pending;

  const activeTodoCount =
    (needsBrandKit ? 1 : 0) + (needsWaveApproval ? 1 : 0) + (pendingLeadsCount > 0 ? 1 : 0);

  const firstMissing = isZh
    ? ledger.brandKit.missingItemsZh[0] || "核心物料"
    : ledger.brandKit.missingItemsEn[0] || "key brand asset";

  return (
    <div className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)] divide-y xl:divide-y-0 xl:divide-x divide-[var(--border-hairline)]">
      {/* ==================== 左栏（64%）：行动流 + 外链验活回执 ==================== */}
      <section className="p-5 sm:p-7 space-y-6 min-w-0">
        {/* 顶部标题与动态态势（无多余 kicker） */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="lp-display text-[21px] sm:text-[22px] font-semibold text-[var(--ink-primary)] tracking-tight">
              {isZh ? "今日增长指挥台" : "Today's Growth Command Center"}
            </h1>
            <p className="text-[13.5px] text-[var(--ink-secondary)]">
              {!hasProject
                ? isZh
                  ? "先创建你的首个出海项目，系统将自动生成 100 目录排期与求购监听。"
                  : "Add your first product to unlock 100-directory scheduling and buyer intent alerts."
                : activeTodoCount > 0
                  ? isZh
                    ? `今日有 ${activeTodoCount} 项推进可直接带来高权重外链与付费咨询`
                    : `${activeTodoCount} concrete actions today will directly drive backlinks and qualified buyers`
                  : isZh
                    ? "今日关键推进已全部清零，系统正每小时监测海外求购与外链存活"
                    : "All priority actions cleared — monitoring live buyer threads and backlinks hourly"}
            </p>
          </div>

          {!hasProject && (
            <Button variant="primary" size="sm" onClick={onCreateProject}>
              <FolderPlus className="w-3.5 h-3.5" strokeWidth={1.75} />
              {isZh ? "创建首个项目" : "Create Project"}
            </Button>
          )}
        </div>

        {/* 今日待办行动流 */}
        <div className="rounded-[9px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-[var(--ink-primary)]">
              {isZh ? "今日待办行动流" : "Today's Action Queue"}
            </h2>
            <span className="text-[11.5px] text-[var(--ink-muted)] tabular-nums">
              {isZh ? `剩余 ${activeTodoCount} 项` : `${activeTodoCount} open`}
            </span>
          </div>

          {activeTodoCount === 0 ? (
            <div className="px-4 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-[13.5px] text-[var(--ink-secondary)]">
                <CheckCircle2 className="w-4 h-4 text-[var(--status-live)] shrink-0" strokeWidth={1.8} />
                <span>
                  {isZh
                    ? "品牌资料、本周外链批次与高意向求购帖均已处理完毕。"
                    : "Brand Kit, weekly directory wave, and pending buyer threads are all caught up."}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="secondary" size="xs" onClick={onGoDirectories}>
                  {isZh ? "管理 100 目录" : "Manage Directories"}
                </Button>
                <Button variant="secondary" size="xs" onClick={() => onGoInboxLead()}>
                  {isZh ? "去扫新求购帖" : "Scan New Threads"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {/* 行动 1：补齐品牌资料 */}
              {needsBrandKit && (
                <div className="px-4 py-3.5 flex items-center justify-between gap-4 hover:bg-[var(--bg-hover)] lp-ease">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-[var(--ink-primary)]">
                      {isZh
                        ? `补齐 ${firstMissing}，将提交物料完善至 100%`
                        : `Add ${firstMissing} to bring your Brand Kit to 100%`}
                    </p>
                    <p className="text-[12px] text-[var(--ink-muted)] mt-0.5 tabular-nums">
                      {isZh
                        ? `当前完成度 ${ledger.brandKit.score}% · 完善后自动同步全部 100 个目录提交表单`
                        : `Currently ${ledger.brandKit.score}% complete · synced automatically across all 100 submissions`}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={onOpenBrandKit}>
                    {isZh ? "去补充" : "Complete"}
                  </Button>
                </div>
              )}

              {/* 行动 2：一键批准本周目录批次（全屏唯一实心钴蓝主按钮） */}
              {needsWaveApproval && (
                <div className="px-4 py-3.5 flex items-center justify-between gap-4 hover:bg-[var(--bg-hover)] lp-ease">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-[var(--ink-primary)]">
                      {isZh
                        ? `确认本周第 2 批 ${wave2Count} 个精选目录投放名单`
                        : `Approve this week's Wave 2 batch (${wave2Count} curated directories)`}
                    </p>
                    <p className="text-[12px] text-[var(--ink-muted)] mt-0.5">
                      {isZh
                        ? "按 3 周自然节奏分批提交，兼顾域名权重提升与搜索引擎安全"
                        : "Staggered across 3 natural weeks to build clean DR velocity safely"}
                    </p>
                  </div>
                  <Button variant="primary" size="sm" loading={approvingWave} onClick={onApproveWave2}>
                    {isZh ? "一键批准" : "Approve Wave"}
                  </Button>
                </div>
              )}

              {/* 行动 3：回复高意向求购帖 */}
              {pendingLeadsCount > 0 && (
                <div className="px-4 py-3.5 flex items-center justify-between gap-4 hover:bg-[var(--bg-hover)] lp-ease">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-[var(--ink-primary)]">
                      {isZh
                        ? `回复今日 ${pendingLeadsCount} 条海外高意向求购帖`
                        : `Reply to ${pendingLeadsCount} high-intent buyer threads today`}
                    </p>
                    {topPendingLead && (
                      <p className="text-[12px] text-[var(--ink-muted)] mt-0.5 truncate">
                        {topPendingLead.source} · {topPendingLead.title} ·{" "}
                        {isZh ? `意向 ${topPendingLead.intent_score}%` : `${topPendingLead.intent_score}% match`}
                      </p>
                    )}
                  </div>
                  <Button
                    variant={!needsWaveApproval ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => onGoInboxLead(topPendingLead?.id)}
                  >
                    {isZh ? "拟稿回复" : "Draft Reply"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {waveApprovedNotice && (
            <div className="px-4 py-2 border-t border-[var(--border-hairline)] bg-[var(--status-live-soft)] text-[var(--status-live)] text-[12px] font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              {isZh
                ? "本周第 2 批精选目录名单已批准，正在按自然节奏推进提交与 HTTP 验活。"
                : "Wave 2 directory batch approved and queued for natural-cadence submission."}
            </div>
          )}
        </div>

        {/* 最新外链验活回执表 */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-[var(--ink-primary)]">
              {isZh ? "最新外链验活回执" : "Latest Verified Backlinks"}
            </h2>
            <button
              type="button"
              onClick={onGoDirectories}
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] lp-ease cursor-pointer tabular-nums"
            >
              <span>
                {isZh
                  ? `查看全部 ${ledger.dirCounts.live}/${ledger.dirCounts.total}`
                  : `View all ${ledger.dirCounts.live}/${ledger.dirCounts.total}`}
              </span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>

          <div className="rounded-[9px] border border-[var(--border-hairline)] overflow-hidden">
            <table className="w-full text-left border-collapse tabular-nums">
              <thead>
                <tr className="bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] text-[12px] text-[var(--ink-muted)] font-medium">
                  <th className="py-2.5 px-4 font-medium">{isZh ? "平台名称" : "Directory"}</th>
                  <th className="py-2.5 px-4 font-medium">{isZh ? "域名权重" : "Authority"}</th>
                  <th className="py-2.5 px-4 font-medium">{isZh ? "验活状态" : "Verification"}</th>
                  <th className="py-2.5 px-4 font-medium text-right hidden sm:table-cell">
                    {isZh ? "累计点击" : "Clicks"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)] text-[13.5px]">
                {ledger.recentVerifiedReceipts.map((dir) => {
                  const isLive = dir.effectiveStatus === "live";
                  const isSubmitted = dir.effectiveStatus === "submitted";
                  return (
                    <tr
                      key={dir.id}
                      onClick={() => onOpenDirectory(dir)}
                      className="hover:bg-[var(--bg-hover)] lp-ease cursor-pointer"
                    >
                      <td className="py-3 px-4 font-medium text-[var(--ink-primary)]">
                        {dir.name.replace(" Software", "")}
                      </td>
                      <td className="py-3 px-4 font-mono text-[12.5px] text-[var(--ink-secondary)]">
                        DR {dir.dr}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          tone={isLive ? "success" : isSubmitted ? "warning" : "neutral"}
                          label={
                            isLive
                              ? isZh
                                ? "已验活"
                                : "Verified"
                              : isSubmitted
                                ? isZh
                                  ? "审核中"
                                  : "In Review"
                                : isZh
                                  ? "待提交"
                                  : "Queued"
                          }
                        />
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[12.5px] text-[var(--ink-secondary)] hidden sm:table-cell">
                        {dir.attributedClicks > 0 ? dir.attributedClicks.toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ==================== 右栏（36%）：营收与归因脉搏 ==================== */}
      <aside className="p-5 sm:p-7 flex flex-col justify-between gap-6 min-w-0">
        <div className="space-y-5">
          {/* 单一视觉锚点：近 30 天归因营收 */}
          <div className="space-y-1.5">
            <h2 className="text-[15px] font-semibold text-[var(--ink-primary)]">
              {isZh ? "营收与归因脉搏" : "Revenue & Attribution Pulse"}
            </h2>
            <p className="text-[12.5px] text-[var(--ink-muted)]">
              {isZh ? "近 30 天归因营收" : "Attributed revenue (30d)"}
            </p>
            <div className="flex items-baseline gap-2.5 flex-wrap pt-0.5 tabular-nums">
              <span className="text-[32px] font-bold tracking-[-0.03em] leading-none text-[var(--ink-primary)]">
                ${ledger.revenue.totalUsd.toLocaleString()}
              </span>
              {ledger.revenue.deltaUsd > 0 && (
                <span className="text-[13px] font-medium text-[var(--status-live)]">
                  +${ledger.revenue.deltaUsd.toLocaleString()} {isZh ? "较上期" : "vs. prior 30d"}
                </span>
              )}
            </div>
          </div>

          {/* 全宽无留白趋势折线图 */}
          <RevenuePulseChart series={ledger.revenue.dailySeries} isZh={isZh} />

          {/* 极简 4 步转化漏斗 */}
          <div className="py-3.5 border-y border-[var(--border-hairline)] grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center text-center tabular-nums">
            <div>
              <div className="text-[15px] font-semibold text-[var(--ink-primary)]">
                {ledger.revenue.funnel.clicks.toLocaleString()}
              </div>
              <div className="text-[11.5px] text-[var(--ink-muted)] mt-0.5">{isZh ? "点击" : "Clicks"}</div>
            </div>
            <span className="text-[var(--ink-muted)] text-[12px] px-1">→</span>
            <div>
              <div className="text-[15px] font-semibold text-[var(--ink-primary)]">
                {ledger.revenue.funnel.visits.toLocaleString()}
              </div>
              <div className="text-[11.5px] text-[var(--ink-muted)] mt-0.5">{isZh ? "进站" : "Visits"}</div>
            </div>
            <span className="text-[var(--ink-muted)] text-[12px] px-1">→</span>
            <div>
              <div className="text-[15px] font-semibold text-[var(--ink-primary)]">
                {ledger.revenue.funnel.signups.toLocaleString()}
              </div>
              <div className="text-[11.5px] text-[var(--ink-muted)] mt-0.5">{isZh ? "注册" : "Signups"}</div>
            </div>
            <span className="text-[var(--ink-muted)] text-[12px] px-1">→</span>
            <div>
              <div className="text-[15px] font-semibold text-[var(--ink-primary)]">
                {ledger.revenue.funnel.paid.toLocaleString()}
              </div>
              <div className="text-[11.5px] text-[var(--ink-muted)] mt-0.5">{isZh ? "付费" : "Paid"}</div>
            </div>
          </div>

          {/* 点线引导渠道对账明细（严格恒等于总营收） */}
          <div className="space-y-3 pt-1 tabular-nums">
            {ledger.revenue.channels.length === 0 ? (
              <p className="text-[12.5px] text-[var(--ink-muted)]">
                {isZh
                  ? "创建归因短链并接入 1 行统计脚本后，按渠道自动拆分美元产出。"
                  : "Create tracking links and install the 1-line pixel to break down revenue by channel."}
              </p>
            ) : (
              ledger.revenue.channels.map((ch) => (
                <div key={ch.key} className="flex items-baseline gap-2 text-[13.5px]">
                  <span className="text-[var(--ink-primary)] font-medium shrink-0">
                    {isZh ? ch.labelZh : ch.labelEn}
                  </span>
                  <span
                    className="flex-1 border-b border-dotted border-[var(--border-strong)] -translate-y-1"
                    aria-hidden="true"
                  />
                  <span className="font-mono font-semibold text-[var(--ink-primary)] shrink-0">
                    ${ch.revenueUsd.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 底部极简单次访问产出参考（不喧宾夺主） */}
        <div className="pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between text-[12px] text-[var(--ink-muted)] tabular-nums">
          <span>{isZh ? "单次访问产出" : "Revenue per visit"}</span>
          <span className="font-mono font-medium text-[var(--ink-secondary)]">
            $
            {ledger.revenue.funnel.clicks > 0
              ? (ledger.revenue.totalUsd / ledger.revenue.funnel.clicks).toFixed(2)
              : "0.00"}
          </span>
        </div>
      </aside>
    </div>
  );
}
