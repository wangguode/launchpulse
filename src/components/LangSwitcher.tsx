"use client";

import { Globe } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { LOCALE_LABELS, type Locale } from "@/lib/i18n";

const LOCALES: Locale[] = ["en", "zh", "ja"];

export default function LangSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-lg border border-white/15 bg-white/[0.04] p-0.5"
      role="group"
      aria-label="Language switcher"
    >
      <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5 hidden sm:block" />
      {LOCALES.map((loc) => {
        const active = locale === loc;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => setLocale(loc)}
            className={`px-2 py-1 rounded-md text-[11px] font-[family-name:var(--font-mono)] font-semibold transition cursor-pointer ${
              active
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-300 hover:text-white"
            }`}
          >
            {LOCALE_LABELS[loc]}
          </button>
        );
      })}
    </div>
  );
}
