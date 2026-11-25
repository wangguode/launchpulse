"use client";

import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "inverse" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

/**
 * 统一高对比度 Apple 风格药丸按钮原语（杜绝亮色模式蓝底黑字）
 */
export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const variantCls =
    variant === "primary"
      ? "lp-btn-primary"
      : variant === "inverse"
      ? "lp-btn-inverse"
      : variant === "secondary"
      ? "border border-[var(--apple-border-strong)] bg-transparent text-[var(--apple-ink)] hover:bg-[var(--apple-hover)]"
      : "bg-transparent text-[var(--apple-ink-secondary)] hover:bg-[var(--apple-hover)] hover:text-[var(--apple-ink)]";

  const sizeCls =
    size === "sm"
      ? "px-3.5 py-1.5 text-[12px] min-h-[32px]"
      : size === "lg"
      ? "px-6 py-3 text-[15px] min-h-[44px]"
      : "px-4 py-2 text-[13px] min-h-[38px]";

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed whitespace-nowrap ${variantCls} ${sizeCls} ${className}`}
    >
      {children}
    </button>
  );
}
