"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

/**
 * V5 紧凑双态主题切换胶囊（Framed Sheet 浅色 ↔ True-Dark Obsidian 深色）
 */
export default function ThemeSwitcher({ surface = "auto" }: { surface?: "auto" | "dark" }) {
  const { resolvedTheme, setMode } = useTheme();
  const isDark = resolvedTheme === "dark";

  const frameClass =
    surface === "dark"
      ? "border-white/15 bg-white/[0.04]"
      : "border-[var(--border-hairline)] bg-[var(--bg-surface)]";

  return (
    <div
      className={`inline-flex items-center rounded-full border p-0.5 ${frameClass}`}
      role="group"
      aria-label="切换浅色或深色主题"
    >
      <button
        type="button"
        title="浅色模式"
        aria-label="浅色模式"
        aria-pressed={!isDark}
        onClick={() => setMode("light")}
        className={`w-6 h-6 rounded-full inline-flex items-center justify-center lp-ease cursor-pointer ${
          !isDark
            ? surface === "dark"
              ? "bg-white text-[#0b0c0e]"
              : "bg-[var(--bg-sheet)] text-[var(--ink-primary)] border border-[var(--border-hairline)]"
            : surface === "dark"
              ? "text-white/50 hover:text-white"
              : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
        }`}
      >
        <Sun className="w-3.5 h-3.5" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        title="深色模式"
        aria-label="深色模式"
        aria-pressed={isDark}
        onClick={() => setMode("dark")}
        className={`w-6 h-6 rounded-full inline-flex items-center justify-center lp-ease cursor-pointer ${
          isDark
            ? surface === "dark"
              ? "bg-white/15 text-white"
              : "bg-[var(--bg-sheet)] text-[var(--ink-primary)] border border-[var(--border-hairline)]"
            : surface === "dark"
              ? "text-white/50 hover:text-white"
              : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
        }`}
      >
        <Moon className="w-3.5 h-3.5" strokeWidth={1.75} />
      </button>
    </div>
  );
}
