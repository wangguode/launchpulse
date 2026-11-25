"use client";

export interface MetricItem {
  label: string;
  value: string;
  subline?: string;
  accent?: boolean;
}

/**
 * Apple App Store Connect 风格横向联排指标带（1px 细线分隔，零冗余彩色图标）
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
      {items.map((m) => (
        <div key={m.label} className="p-4 sm:p-5 space-y-1.5 min-w-0">
          <p className="text-[12px] text-[var(--apple-ink-secondary)] truncate">{m.label}</p>
          <p
            className={`apple-display text-[26px] sm:text-[28px] font-semibold leading-none ${
              m.accent ? "text-[var(--apple-blue)]" : "text-[var(--apple-ink)]"
            }`}
          >
            {m.value}
          </p>
          {m.subline && (
            <p className="text-[11px] text-[var(--apple-ink-tertiary)] truncate">{m.subline}</p>
          )}
        </div>
      ))}
    </div>
  );
}
