"use client";

import Link from "next/link";
import { useI18n } from "@/components/I18nProvider";
import LangSwitcher from "@/components/LangSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";

export default function TermsPage() {
  const { t } = useI18n();
  return (
    <main className="min-h-screen bg-[#07090d] text-slate-200 px-6 py-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-xs font-mono text-emerald-400 hover:underline">
            {t.common.backToHome}
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <LangSwitcher />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">{t.legal.termsTitle}</h1>
        <p className="text-sm text-slate-400">{t.legal.lastUpdated}</p>
        <section className="space-y-3 text-sm leading-relaxed text-slate-300">
          <h2 className="text-lg font-semibold text-white">{t.legal.termsS1Title}</h2>
          <p>{t.legal.termsS1Body}</p>
          <h2 className="text-lg font-semibold text-white">{t.legal.termsS2Title}</h2>
          <p>
            {t.legal.termsS2BodyPrefix}{" "}
            <a href="mailto:hello@statementflow.win" className="text-emerald-400 underline">
              hello@statementflow.win
            </a>{" "}
            {t.legal.termsS2BodySuffix}
          </p>
        </section>
      </div>
    </main>
  );
}
