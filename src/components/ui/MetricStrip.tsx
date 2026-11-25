"use client";

export interface MetricItem {
  label: string;
  value: string;
  subline?: string;
  hint?: string;
  accent?: boolean;
}

/**
 * Apple App Store Connect 风格横向联排指标带（1px 细线分隔，支持周期环比 Delta 提示）
 */
export default function MetricStrip({
  items,
  columnsClass = "grid-cols-2 lg:grid-cols-5",
}: {
  items: MetricItem[];
  columnsClass?: string;
}) {
  return (
    <div
      className={`rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] grid ${columnsClass} divide-y lg:divide-y-0 lg:divide-x divide-[var(--apple-border)] tabular-nums`}
    >
      {items.map((m) => {
        const sub = m.hint || m.subline;
        const isPositive = Boolean(sub && sub.trim().startsWith("+"));
        return (
          <div key={m.label} className="p-4 sm:p-5 space-y-1.5 min-w-0">
            <p className="text-[12px] text-[var(--apple-ink-secondary)] truncate">{m.label}</p>
            <p
              className={`apple-display text-[26px] sm:text-[28px] font-semibold leading-none ${
                m.accent ? "text-[var(--apple-blue)]" : "text-[var(--apple-ink)]"
              }`}
            >
              {m.value}
            </p>
            {sub && (
              <p
                className={`text-[11px] truncate ${
                  isPositive ? "text-[var(--apple-green)] font-medium" : "text-[var(--apple-ink-tertiary)]"
                }`}
              >
                {sub}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
