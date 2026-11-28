"use client";

import type { ReconciledDirectoryRow } from "@/lib/console-ledger";
import { cn } from "@/lib/utils";

interface WaveTelemetryMatrixProps {
  directories: ReconciledDirectoryRow[];
  isZh: boolean;
  unlockedIds?: Set<string>;
  onSelectDirectory?: (dir: ReconciledDirectoryRow) => void;
  onSelectWave?: (wave: "all" | "1" | "2" | "3") => void;
  activeWave?: string;
  className?: string;
}

/**
 * LaunchPulse 专属标志性视觉组件：100 目录三波次光学磨砂遥测矩阵
 * 将全部目录按第 1/2/3 波分装入 3 个磨砂凹槽，每根微柱真实映射目录收录与排期状态
 */
export default function WaveTelemetryMatrix({
  directories,
  isZh,
  unlockedIds,
  onSelectDirectory,
  onSelectWave,
  activeWave,
  className,
}: WaveTelemetryMatrixProps) {
  const waves = ([1, 2, 3] as const).map((w) => {
    const items = directories
      .filter((d) => d.scheduledWave === w)
      .sort((a, b) => {
        const order = { live: 0, submitted: 1, queued: 2, skipped: 3 };
        return order[a.effectiveStatus] - order[b.effectiveStatus] || b.dr - a.dr;
      });
    const liveCount = items.filter((d) => d.effectiveStatus === "live").length;
    const subCount = items.filter((d) => d.effectiveStatus === "submitted").length;
    return {
      wave: w,
      items,
      liveCount,
      subCount,
      title:
        w === 1
          ? isZh
            ? "第一波 · 旗舰高权站"
            : "Wave 1 · Flagship DR 80+"
          : w === 2
            ? isZh
              ? "第二波 · 垂直评测站"
              : "Wave 2 · Vertical SaaS"
            : isZh
              ? "第三波 · 社区与生态"
              : "Wave 3 · Niche & Community",
    };
  });

  const totalLive = directories.filter((d) => d.effectiveStatus === "live").length;
  const totalSub = directories.filter((d) => d.effectiveStatus === "submitted").length;
  const totalQueued = directories.filter((d) => d.effectiveStatus === "queued").length;

  return (
    <section
      className={cn(
        "lp-frosted-card rounded-2xl px-5 py-4 flex flex-col gap-3 tabular-nums",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-[14.5px] font-medium text-foreground">
            {isZh ? "100 目录三波次节奏矩阵" : "100-Directory 3-Wave Cadence Matrix"}
          </h2>
          <span className="lp-frost-chip text-xs">
            {isZh ? "反沙盒自然节奏投递" : "Anti-sandbox staggered pacing"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2 rounded-full bg-emerald-500 inline-block" />
            {isZh ? `已验活收录 ${totalLive}` : `Verified ${totalLive}`}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2 rounded-full bg-amber-500 inline-block" />
            {isZh ? `审核队列中 ${totalSub}` : `In Review ${totalSub}`}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2 rounded-full bg-slate-400/50 inline-block" />
            {isZh ? `波次待提交 ${totalQueued}` : `Queued ${totalQueued}`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {waves.map((w) => {
          const isSelected = activeWave === String(w.wave);
          return (
            <div
              key={w.wave}
              onClick={() => onSelectWave?.(isSelected ? "all" : (String(w.wave) as "1" | "2" | "3"))}
              className={cn(
                "lp-frost-well rounded-xl px-3.5 py-2.5 flex flex-col gap-2 transition-all",
                onSelectWave && "cursor-pointer hover:border-primary/30",
                isSelected && "ring-1 ring-accent-cobalt/50"
              )}
            >
              <div
                className="grid h-4 gap-[2.5px]"
                style={{
                  gridAutoFlow: "column",
                  gridAutoColumns: "minmax(0, 1fr)",
                }}
              >
                {w.items.map((dir) => {
                  const barCls =
                    dir.effectiveStatus === "live"
                      ? "bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.28)]"
                      : dir.effectiveStatus === "submitted"
                        ? "bg-amber-500 dark:bg-amber-400"
                        : dir.effectiveStatus === "skipped"
                          ? "bg-rose-400/35"
                          : "bg-slate-400/30 dark:bg-slate-500/25";
                  const isLockedBar = Boolean(unlockedIds && !unlockedIds.has(dir.id));
                  return (
                    <button
                      key={dir.id}
                      type="button"
                      title={
                        isLockedBar
                          ? isZh
                            ? `已锁定高权目录 (DR ${dir.dr}) · $39 解锁全部 30 站 + 赠 5 站人工代投`
                            : `Locked Directory (DR ${dir.dr}) · Unlock all 30 + 5 manual DFY for $39`
                          : `${dir.name} (DR ${dir.dr}) · ${dir.effectiveStatus}`
                      }
                      onClick={(e) => {
                        if (onSelectDirectory && !isLockedBar) {
                          e.stopPropagation();
                          onSelectDirectory(dir);
                        }
                      }}
                      className={cn(
                        "h-full w-full rounded-[2.5px] transition-transform hover:scale-y-125 focus:outline-none",
                        barCls
                      )}
                    />
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[12.5px] text-muted-foreground">
                <span className="font-medium text-foreground/85">{w.title}</span>
                <span>
                  {w.liveCount > 0
                    ? isZh
                      ? `${w.liveCount} / ${w.items.length} 已收录`
                      : `${w.liveCount}/${w.items.length} live`
                    : w.subCount > 0
                      ? isZh
                        ? `${w.subCount} 审核中 · 共 ${w.items.length}`
                        : `${w.subCount} review / ${w.items.length}`
                      : isZh
                        ? `0 / ${w.items.length} 待推进`
                        : `0/${w.items.length} queued`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
