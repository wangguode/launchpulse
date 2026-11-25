"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "inverse";
type Size = "xs" | "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "lp-btn-primary border border-transparent",
  inverse: "lp-btn-inverse border border-transparent",
  secondary:
    "bg-[var(--bg-sheet)] hover:bg-[var(--bg-hover)] text-[var(--ink-primary)] border border-[var(--border-strong)]",
  ghost:
    "bg-transparent hover:bg-[var(--bg-hover)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] border border-transparent",
  danger:
    "bg-[var(--status-danger-soft)] hover:opacity-90 text-[var(--status-danger)] border border-transparent",
};

const SIZE_CLASSES: Record<Size, string> = {
  xs: "h-7 px-2.5 text-[12px] rounded-[6px] gap-1.5",
  sm: "h-8 px-3 text-[12.5px] rounded-[7px] gap-1.5",
  md: "h-9 px-3.5 text-[13px] rounded-[8px] gap-2",
};

/**
 * V5 精密按钮原语：1px 清晰边框、零夸张阴影、140ms 精准手感
 */
export default function Button({
  variant = "primary",
  size = "sm",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium lp-ease whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" strokeWidth={1.8} />}
      {children}
    </button>
  );
}
