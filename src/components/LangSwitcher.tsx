"use client";

import { useI18n } from "@/components/I18nProvider";
import { LOCALE_LABELS, type Locale } from "@/lib/i18n";

const LOCALES: Locale[] = ["en", "zh", "ja"];

export default function LangSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div
      className="inline-flex items-center rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-0.5 text-[11px] font-medium"
      role="group"
      aria-label="Language switcher"
    >
      {LOCALES.map((loc) => {
        const active = locale === loc;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => setLocale(loc)}
            className={`px-2 py-1 rounded transition cursor-pointer ${
              active
                ? "bg-[var(--app-surface)] text-[var(--app-ink)] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                : "text-[var(--app-ink-muted)] hover:text-[var(--app-ink)]"
            }`}
          >
            {LOCALE_LABELS[loc]}
          </button>
        );
      })}
    </div>
  );
}
