"use client";

import { useState } from "react";

interface SeriesPoint {
  date: string;
  clicks: number;
  conversions: number;
  revenueUsd: number;
}

interface RevenuePulseChartProps {
  series: SeriesPoint[];
  isZh: boolean;
}

/**
 * V5 全宽无留白单色钴蓝趋势图（零死区留白、悬停十字准星、精准美元/点击读数）
 */
export default function RevenuePulseChart({ series, isZh }: RevenuePulseChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!series || series.length < 2) {
    return (
      <div className="h-[152px] rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center justify-center text-[12.5px] text-[var(--ink-muted)]">
        {isZh ? "接入归因短链后，此处实时绘制近 30 天增长曲线" : "Revenue & click trend appears once links receive traffic"}
      </div>
    );
  }

  const width = 440;
  const height = 152;
  const padTop = 10;
  const padBottom = 8;
  const innerH = height - padTop - padBottom;

  const values = series.map((s) => Math.max(0, s.revenueUsd > 0 ? s.revenueUsd : s.clicks));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values, minVal + 10);
  const range = Math.max(1, maxVal - minVal);

  const coords = series.map((pt, i) => {
    const x = (i / (series.length - 1)) * width;
    const v = Math.max(0, pt.revenueUsd > 0 ? pt.revenueUsd : pt.clicks);
    const y = padTop + innerH - ((v - minVal) / range) * innerH;
    return { x, y, pt };
  });

  // 平滑曲线路径（温和张力，避免过冲）
  const linePath = coords
    .map((c, idx) => {
      if (idx === 0) return `M ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
      const prev = coords[idx - 1];
      const cx = ((prev.x + c.x) / 2).toFixed(1);
      return `C ${cx} ${prev.y.toFixed(1)}, ${cx} ${c.y.toFixed(1)}, ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
    })
    .join(" ");

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
  const active = hoverIdx !== null ? coords[hoverIdx] : null;

  return (
    <div className="relative w-full select-none">
      {/* 悬停读数浮条（不挤占图表高度） */}
      <div className="h-5 mb-1 flex items-center justify-between text-[11.5px] tabular-nums">
        {active ? (
          <>
            <span className="font-mono text-[var(--ink-muted)]">{active.pt.date}</span>
            <span className="text-[var(--ink-primary)] font-medium">
              ${active.pt.revenueUsd.toLocaleString()} · {active.pt.clicks} {isZh ? "点击" : "clicks"}
            </span>
          </>
        ) : (
          <>
            <span className="text-[var(--ink-muted)]">{series[0]?.date.slice(5)}</span>
            <span className="text-[var(--ink-muted)]">{series[series.length - 1]?.date.slice(5)}</span>
          </>
        )}
      </div>

      <div className="relative w-full h-[148px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible block"
          onMouseLeave={() => setHoverIdx(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setHoverIdx(Math.round(ratio * (series.length - 1)));
          }}
        >
          <defs>
            <linearGradient id="lpV5PulseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 4 条极细水平参考基准线 */}
          {[0.08, 0.36, 0.64, 0.92].map((r) => (
            <line
              key={r}
              x1="0"
              y1={(height * r).toFixed(1)}
              x2={width}
              y2={(height * r).toFixed(1)}
              stroke="var(--border-hairline)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* 面积轻柔渐隐 */}
          <path d={areaPath} fill="url(#lpV5PulseFill)" />

          {/* 单支精密钴蓝主线 */}
          <path
            d={linePath}
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* 悬停垂直准星 */}
          {active && (
            <line
              x1={active.x}
              y1={0}
              x2={active.x}
              y2={height}
              stroke="var(--border-strong)"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* 悬停圆点（绝对定位防止 SVG preserveAspectRatio="none" 拉伸变形） */}
        {active && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute w-2.5 h-2.5 -ml-1.5 -mt-1.5 rounded-full bg-[var(--accent-primary)] ring-2 ring-[var(--bg-sheet)]"
            style={{
              left: `${(active.x / width) * 100}%`,
              top: `${(active.y / height) * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}
