"use client";

import { useState } from "react";

export interface DailyPoint {
  date: string;
  clicks: number;
  conversions: number;
}

interface Props {
  series: DailyPoint[];
  title: string;
  clicksLabel: string;
  conversionsLabel: string;
}

/**
 * 业界标准（Dub.co / Plausible 风格）交互式双曲线面积图
 * 支持 7D / 14D / 30D 切换、悬停精准 Tooltip、自适应亮/暗双主题
 */
export default function AnalyticsAreaChart({
  series,
  title,
  clicksLabel,
  conversionsLabel,
}: Props) {
  const [range, setRange] = useState<7 | 14 | 30>(14);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const visible = series.slice(-range);
  const width = 760;
  const height = 220;
  const padL = 36;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const maxVal = Math.max(4, ...visible.map((d) => Math.max(d.clicks, d.conversions)));
  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  const getX = (idx: number) =>
    visible.length <= 1 ? padL : padL + (idx / (visible.length - 1)) * innerW;
  const getY = (val: number) => padT + innerH - (val / maxVal) * innerH;

  const clickPoints = visible.map((d, i) => `${getX(i).toFixed(1)},${getY(d.clicks).toFixed(1)}`);
  const convPoints = visible.map((d, i) => `${getX(i).toFixed(1)},${getY(d.conversions).toFixed(1)}`);

  const clickLinePath = clickPoints.length ? `M ${clickPoints.join(" L ")}` : "";
  const clickAreaPath = clickPoints.length
    ? `${clickLinePath} L ${getX(visible.length - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L ${padL},${(padT + innerH).toFixed(1)} Z`
    : "";
  const convLinePath = convPoints.length ? `M ${convPoints.join(" L ")}` : "";

  const hovered = hoverIdx !== null ? visible[hoverIdx] : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <div className="flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              {clicksLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              {conversionsLabel}
            </span>
          </div>
        </div>

        <div className="inline-flex items-center rounded-lg border border-white/15 bg-black/40 p-0.5 text-xs font-[family-name:var(--font-mono)]">
          {([7, 14, 30] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRange(r);
                setHoverIdx(null);
              }}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                range === r
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {r}D
            </button>
          ))}
        </div>
      </div>

      {/* 悬停实时数据条 */}
      <div className="h-6 flex items-center text-xs font-[family-name:var(--font-mono)] text-slate-400 tabular-nums">
        {hovered ? (
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-white font-semibold">{hovered.date}</span>
            <span className="text-emerald-400">
              {clicksLabel}: <strong>{hovered.clicks}</strong>
            </span>
            <span className="text-amber-400">
              {conversionsLabel}: <strong>{hovered.conversions}</strong>
            </span>
            <span>
              CVR:{" "}
              <strong>
                {hovered.clicks > 0
                  ? `${((hovered.conversions / hovered.clicks) * 100).toFixed(1)}%`
                  : "0.0%"}
              </strong>
            </span>
          </div>
        ) : (
          <span>
            {visible[0]?.date} — {visible[visible.length - 1]?.date}
          </span>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-52 sm:h-56 select-none overflow-visible"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="lpClicksGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* 水平参考网格线与 Y 轴刻度 */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={padL}
                  y1={y}
                  x2={width - padR}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity={0.12}
                  strokeDasharray="4 4"
                />
                <text
                  x={padL - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="currentColor"
                  opacity={0.55}
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* 面积填充 + 折线 */}
          {clickAreaPath && <path d={clickAreaPath} fill="url(#lpClicksGrad)" />}
          {clickLinePath && (
            <path
              d={clickLinePath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {convLinePath && (
            <path
              d={convLinePath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="5 3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* X 轴标签 + 交互热区 */}
          {visible.map((d, i) => {
            const x = getX(i);
            const showLabel =
              range === 7 || i === 0 || i === visible.length - 1 || i % Math.ceil(range / 6) === 0;
            const isHover = hoverIdx === i;
            return (
              <g key={d.date}>
                {showLabel && (
                  <text
                    x={x}
                    y={height - 6}
                    textAnchor="middle"
                    fontSize="10"
                    fill="currentColor"
                    opacity={0.55}
                  >
                    {d.date.slice(5)}
                  </text>
                )}
                {isHover && (
                  <>
                    <line
                      x1={x}
                      y1={padT}
                      x2={x}
                      y2={padT + innerH}
                      stroke="#10b981"
                      strokeOpacity={0.45}
                      strokeWidth="1"
                    />
                    <circle cx={x} cy={getY(d.clicks)} r="4.5" fill="#10b981" />
                    <circle cx={x} cy={getY(d.conversions)} r="3.5" fill="#f59e0b" />
                  </>
                )}
                <rect
                  x={x - innerW / visible.length / 2}
                  y={padT}
                  width={innerW / visible.length}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
