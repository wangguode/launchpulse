"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BarListItem {
  key: string;
  label: string;
  codeBadge?: string;
  icon?: ReactNode;
  value: number;
  formattedValue?: string;
  sharePct?: number;
  subLabel?: string;
}

/**
 * Dub.co × HeroUI 风格：行底色即数据占比条的光学磨砂比例排行榜
 */
export default function ProportionalBarList({
  items,
  emptyText = "暂无统计数据",
  className,
}: {
  items: BarListItem[];
  emptyText?: string;
  className?: string;
}) {
  if (!items || items.length === 0) {
    return (
      <div className="lp-frost-well rounded-xl py-8 px-4 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  const maxVal = Math.max(1, ...items.map((i) => i.value));
  const sumVal = Math.max(1, items.reduce((acc, i) => acc + i.value, 0));

  return (
    <div className={cn("flex flex-col gap-2 tabular-nums", className)}>
      {items.map((item) => {
        const widthPct = Math.max(item.value > 0 ? 6 : 0, Math.round((item.value / maxVal) * 100));
        const share =
          typeof item.sharePct === "number"
            ? item.sharePct
            : Number(((item.value / sumVal) * 100).toFixed(1));
        return (
          <div
            key={item.key}
            className="lp-frost-well relative flex h-10 items-center justify-between overflow-hidden rounded-xl px-3.5 text-sm transition-colors hover:border-accent-cobalt/25"
          >
            <div
              className="pointer-events-none absolute inset-y-0 left-0 rounded-xl transition-all duration-500"
              style={{
                width: `${widthPct}%`,
                background: "var(--frost-bar-fill)",
              }}
            />
            <div className="relative z-10 flex min-w-0 items-center gap-2.5">
              {item.icon}
              {item.codeBadge && (
                <span className="lp-frost-pill shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {item.codeBadge}
                </span>
              )}
              <span className="truncate font-medium text-foreground">{item.label}</span>
              {item.subLabel && (
                <span className="hidden sm:inline text-xs text-muted-foreground truncate">
                  {item.subLabel}
                </span>
              )}
            </div>
            <div className="relative z-10 flex shrink-0 items-center gap-3.5 pl-2">
              <span className="text-[12.5px] text-muted-foreground">{share}%</span>
              <strong className="font-semibold text-foreground">
                {item.formattedValue ?? item.value.toLocaleString()}
              </strong>
            </div>
          </div>
        );
      })}
    </div>
  );
}
