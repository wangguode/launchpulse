"use client";

import { useI18n } from "@/components/I18nProvider";

/**
 * V5 极简中英切换器（母语中文优先，一键切换纯正英文）
 */
export default function LangSwitcher({ surface = "auto" }: { surface?: "auto" | "dark" }) {
  const { locale, setLocale } = useI18n();
  const isZh = locale === "zh";

  const containerCls =
    surface === "dark"
      ? "border-white/15 bg-white/[0.04] text-white/60"
      : "border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--ink-muted)]";

  return (
    <div
      className={`inline-flex items-center rounded-full border p-0.5 text-[11px] font-medium ${containerCls}`}
      role="group"
      aria-label="切换中英文语言"
    >
      <button
        type="button"
        onClick={() => setLocale("zh")}
        className={`px-2 py-0.5 rounded-full lp-ease cursor-pointer ${
          isZh
            ? surface === "dark"
              ? "bg-white/15 text-white font-semibold"
              : "bg-[var(--bg-sheet)] text-[var(--ink-primary)] font-semibold border border-[var(--border-hairline)]"
            : surface === "dark"
              ? "hover:text-white"
              : "hover:text-[var(--ink-primary)]"
        }`}
      >
        中文
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`px-2 py-0.5 rounded-full lp-ease cursor-pointer ${
          !isZh
            ? surface === "dark"
              ? "bg-white/15 text-white font-semibold"
              : "bg-[var(--bg-sheet)] text-[var(--ink-primary)] font-semibold border border-[var(--border-hairline)]"
            : surface === "dark"
              ? "hover:text-white"
              : "hover:text-[var(--ink-primary)]"
        }`}
      >
        EN
      </button>
    </div>
  );
}
