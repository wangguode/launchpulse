"use client";

import Link from "next/link";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";

export default function TermsPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-[var(--apple-bg)] text-[var(--apple-ink)]">
      <header className="sticky top-0 z-30 apple-glass border-b border-[var(--apple-border)]">
        <div className="max-w-[820px] mx-auto px-5 h-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[15px]">
            <BrandMark className="w-5 h-5" />
            <span>LaunchPulse</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <LangSwitcher />
          </div>
        </div>
      </header>
      <main className="max-w-[820px] mx-auto px-5 py-16 space-y-6">
        <Link href="/" className="text-[13px] text-[var(--apple-blue)] hover:underline">
          {t.common.backToHome}
        </Link>
        <h1 className="apple-display text-3xl font-semibold text-[var(--apple-ink)]">
          {t.legal.termsTitle}
        </h1>
        <p className="text-[13px] text-[var(--apple-ink-tertiary)]">{t.legal.lastUpdated}</p>
        <section className="space-y-4 text-[14px] leading-relaxed text-[var(--apple-ink-secondary)]">
          <h2 className="text-[17px] font-semibold text-[var(--apple-ink)] pt-2">
            {t.legal.termsS1Title}
          </h2>
          <p>{t.legal.termsS1Body}</p>
          <h2 className="text-[17px] font-semibold text-[var(--apple-ink)] pt-2">
            {t.legal.termsS2Title}
          </h2>
          <p>
            {t.legal.termsS2BodyPrefix}{" "}
            <a href="mailto:hello@statementflow.win" className="text-[var(--apple-blue)] hover:underline">
              hello@statementflow.win
            </a>{" "}
            {t.legal.termsS2BodySuffix}
          </p>
        </section>
      </main>
    </div>
  );
}
