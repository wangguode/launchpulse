"use client";

/**
 * LaunchPulse V5 极简几何脉冲星标（呼应 Linear / Vercel 极简工程符号语言）
 */
export default function BrandMark({
  className = "w-5 h-5",
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "light";
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="6"
        fill={tone === "light" ? "rgba(255,255,255,0.08)" : "var(--bg-surface)"}
        stroke={tone === "light" ? "rgba(255,255,255,0.18)" : "var(--border-strong)"}
        strokeWidth="1.2"
      />
      <path
        d="M6.5 13.5H9.2L11 8.5L13.3 15.5L15.1 11.5H17.5"
        stroke={tone === "light" ? "#4f8cff" : "var(--accent-primary)"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
