"use client";

/**
 * LaunchPulse 极简脉冲折线徽标
 */
export default function BrandMark({
  className = "w-5 h-5",
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "light";
}) {
  if (tone === "light") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path
          d="M3.5 13.5H7.8L10.4 6.5L13.8 17.5L16.2 11.5H20.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="6"
        fill="var(--muted)"
        stroke="var(--border)"
        strokeWidth="1.2"
      />
      <path
        d="M6.5 13.5H9.2L11 8.5L13.3 15.5L15.1 11.5H17.5"
        stroke="var(--primary)"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
