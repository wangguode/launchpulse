"use client";

type Tone = "neutral" | "success" | "info" | "warning" | "danger" | "green" | "blue" | "orange" | "red";

const DOT_CLASSES: Record<Tone, string> = {
  neutral: "bg-[var(--ink-muted)]",
  success: "bg-[var(--status-live)]",
  green: "bg-[var(--status-live)]",
  info: "bg-[var(--accent-primary)]",
  blue: "bg-[var(--accent-primary)]",
  warning: "bg-[var(--status-warn)]",
  orange: "bg-[var(--status-warn)]",
  danger: "bg-[var(--status-danger)]",
  red: "bg-[var(--status-danger)]",
};

const TEXT_CLASSES: Record<Tone, string> = {
  neutral: "text-[var(--ink-secondary)]",
  success: "text-[var(--ink-primary)]",
  green: "text-[var(--ink-primary)]",
  info: "text-[var(--ink-primary)]",
  blue: "text-[var(--ink-primary)]",
  warning: "text-[var(--ink-primary)]",
  orange: "text-[var(--ink-primary)]",
  danger: "text-[var(--status-danger)]",
  red: "text-[var(--status-danger)]",
};

/**
 * V5 克制状态指示器（6px 实心圆点 + 中性文字，彻底告别廉价彩色药丸刷屏）
 */
export default function StatusBadge({
  tone = "neutral",
  label,
  dot = true,
  className = "",
}: {
  tone?: Tone;
  label: string;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12.5px] font-medium whitespace-nowrap ${TEXT_CLASSES[tone]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_CLASSES[tone]}`} aria-hidden="true" />}
      <span>{label}</span>
    </span>
  );
}
