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
 * Apple App Store Connect 风格交互式面积折线图
 * 单一品牌蓝主曲线 + 克制次级虚线 + 3 条极淡水平网格线 + Apple 分段周期切换器
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
  const height = 210;
  const padL = 34;
  const padR = 14;
  const padT = 14;
  const padB = 26;
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
    <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-[15px] font-semibold text-[var(--apple-ink)]">{title}</h2>
          <div className="flex items-center gap-4 text-[12px] text-[var(--apple-ink-secondary)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--apple-blue)]" />
              {clicksLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--apple-green-dot)]" />
              {conversionsLabel}
            </span>
          </div>
        </div>

        <div className="inline-flex items-center rounded-lg bg-[var(--apple-bg-alt)] border border-[var(--apple-border)] p-0.5 text-[12px]">
          {([7, 14, 30] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRange(r);
                setHoverIdx(null);
              }}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                range === r
                  ? "bg-[var(--apple-surface)] text-[var(--apple-ink)] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                  : "text-[var(--apple-ink-secondary)] hover:text-[var(--apple-ink)]"
              }`}
            >
              {r}D
            </button>
          ))}
        </div>
      </div>

      <div className="h-5 flex items-center text-[12px] text-[var(--apple-ink-secondary)] tabular-nums">
        {hovered ? (
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold text-[var(--apple-ink)]">{hovered.date}</span>
            <span>
              {clicksLabel}: <strong className="text-[var(--apple-blue)]">{hovered.clicks}</strong>
            </span>
            <span>
              {conversionsLabel}:{" "}
              <strong className="text-[var(--apple-green)]">{hovered.conversions}</strong>
            </span>
            <span>
              CVR:{" "}
              <strong className="text-[var(--apple-ink)]">
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
          className="w-full h-52 select-none overflow-visible"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="appleBlueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--apple-blue)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--apple-blue)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

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
                  strokeOpacity={0.09}
                />
                <text
                  x={padL - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fill="currentColor"
                  opacity={0.48}
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {clickAreaPath && <path d={clickAreaPath} fill="url(#appleBlueGrad)" />}
          {clickLinePath && (
            <path
              d={clickLinePath}
              fill="none"
              stroke="var(--apple-blue)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {convLinePath && (
            <path
              d={convLinePath}
              fill="none"
              stroke="var(--apple-green-dot)"
              strokeWidth="1.8"
              strokeDasharray="4 3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

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
                    opacity={0.48}
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
                      stroke="var(--apple-blue)"
                      strokeOpacity={0.35}
                      strokeWidth="1"
                    />
                    <circle cx={x} cy={getY(d.clicks)} r="4" fill="var(--apple-blue)" />
                    <circle cx={x} cy={getY(d.conversions)} r="3.2" fill="var(--apple-green-dot)" />
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
