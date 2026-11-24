"use client";

/**
 * LaunchPulse 专属极简几何品牌徽标（参考 Apple 几何线条美学，非模板圆点）
 */
export default function BrandMark({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="6"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="1.25"
      />
      <path
        d="M7 15.5L10.5 11.5L13 13.5L17 8.5M17 8.5H13.8M17 8.5V11.7"
        stroke="var(--apple-blue)"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
