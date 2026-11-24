"use client";

import Link from "next/link";
import { ChevronRight, Play } from "lucide-react";
import type { StartupAuditReport } from "@/types/audit";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LiveScannerHero from "@/components/LiveScannerHero";
import PricingCheckoutButtons from "@/components/PricingCheckoutButtons";
import { V2_DICTIONARIES } from "@/lib/v2-i18n";

interface Props {
  sampleAudits: StartupAuditReport[];
}

export default function HomeClient({ sampleAudits }: Props) {
  const { locale, t } = useI18n();
  const v2 = V2_DICTIONARIES[locale];
  const featured = sampleAudits[0];

  return (
    <div className="min-h-screen bg-[var(--apple-bg)] text-[var(--apple-ink)] overflow-x-hidden">
      {/* Apple 标志性 48px 半透明毛玻璃导航栏 */}
      <header className="sticky top-0 z-40 apple-glass border-b border-[var(--apple-border)]">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-[15px] tracking-tight text-[var(--apple-ink)] shrink-0"
          >
            <BrandMark className="w-5 h-5" />
            <span>LaunchPulse</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-[12px] font-normal text-[var(--apple-ink-secondary)]">
            <a href="#samples" className="hover:text-[var(--apple-ink)] transition">
              {t.nav.samples}
            </a>
            <a href="#how-it-works" className="hover:text-[var(--apple-ink)] transition">
              {t.nav.howItWorks}
            </a>
            <a href="#pricing" className="hover:text-[var(--apple-ink)] transition">
              {t.nav.pricing}
            </a>
            <Link href="/dashboard" className="hover:text-[var(--apple-ink)] transition">
              {v2.nav.dashboard}
            </Link>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="hidden sm:block">
              <ThemeSwitcher />
            </div>
            <LangSwitcher />
            <Link
              href="/login"
              className="px-3 sm:px-3.5 py-1.5 rounded-full bg-[var(--apple-blue)] hover:bg-[var(--apple-blue-hover)] text-[12px] font-medium text-white transition whitespace-nowrap"
            >
              {v2.nav.login}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* 1. Apple 级大留白 Hero 首屏 */}
        <section className="max-w-[980px] mx-auto px-5 sm:px-6 pt-20 pb-20 text-center space-y-6">
          <p className="text-[12px] font-semibold tracking-wider uppercase text-[var(--apple-blue)]">
            {t.hero.badge}
          </p>

          <h1 className="apple-display text-4xl sm:text-6xl font-semibold text-[var(--apple-ink)] leading-[1.08] max-w-4xl mx-auto">
            {t.hero.titlePrefix}
            <span className="text-[var(--apple-ink-secondary)]">{t.hero.titleHighlight}</span>
          </h1>

          <p className="text-[17px] sm:text-[19px] text-[var(--apple-ink-secondary)] max-w-2xl mx-auto leading-[1.55] font-normal">
            {t.hero.subtitle}
          </p>

          <div className="pt-2">
            <LiveScannerHero />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[13px] text-[var(--apple-ink-secondary)] pt-2">
            <span>{t.hero.trust1}</span>
            <span className="opacity-30">·</span>
            <span>{t.hero.trust2}</span>
            <span className="opacity-30">·</span>
            <span>{t.hero.trust3}</span>
          </div>
        </section>

        {/* 2. Apple 产品展示区（#f5f5f7 / #161617 交替通栏） */}
        {featured && (
          <section id="samples" className="bg-[var(--apple-bg-alt)] py-20 border-y border-[var(--apple-border)]">
            <div className="max-w-[1080px] mx-auto px-5 sm:px-6 space-y-10">
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--apple-ink-tertiary)]">
                  {t.samples.kicker}
                </p>
                <h2 className="apple-display text-3xl sm:text-5xl font-semibold text-[var(--apple-ink)] leading-[1.1]">
                  {featured.videoDurationSeconds}
                  {t.samples.titleSuffix}
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  {sampleAudits.map((a) => (
                    <Link
                      key={a.slug}
                      href={`/audit/${a.slug}`}
                      className="inline-flex items-center gap-1 text-[15px] text-[var(--apple-blue)] hover:underline font-normal"
                    >
                      <span>
                        {a.productName} ({a.overallScore}/100)
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-[var(--apple-border)] bg-[var(--apple-surface)] overflow-hidden shadow-[var(--apple-shadow)]">
                <div className="px-6 py-3.5 border-b border-[var(--apple-border)] flex items-center justify-between text-[13px]">
                  <span className="text-[var(--apple-ink)] font-medium inline-flex items-center gap-2">
                    <Play className="w-3.5 h-3.5 text-[var(--apple-blue)] fill-[var(--apple-blue)]" />
                    {featured.productName} · {featured.domain}
                  </span>
                  <Link
                    href={`/audit/${featured.slug}`}
                    className="text-[var(--apple-blue)] hover:underline inline-flex items-center gap-0.5 font-normal"
                  >
                    {t.samples.inspectFull} <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="aspect-video bg-black">
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    poster={featured.posterUrl}
                    className="w-full h-full object-contain"
                  >
                    <source src={featured.videoUrl} type="video/mp4" />
                  </video>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 3. 三大核心能力（Apple Bento 卡片阵列） */}
        <section id="how-it-works" className="max-w-[1080px] mx-auto px-5 sm:px-6 py-24 space-y-12">
          <div className="max-w-2xl space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--apple-ink-tertiary)]">
              {t.pillars.kicker}
            </p>
            <h2 className="apple-display text-3xl sm:text-5xl font-semibold text-[var(--apple-ink)] leading-[1.1]">
              {t.pillars.title}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { title: t.pillars.p1Title, desc: t.pillars.p1Desc },
              { title: t.pillars.p2Title, desc: t.pillars.p2Desc },
              { title: t.pillars.p3Title, desc: t.pillars.p3Desc },
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-[24px] bg-[var(--apple-bg-alt)] border border-[var(--apple-border)] p-8 space-y-3"
              >
                <span className="text-[12px] font-semibold text-[var(--apple-blue)] tabular-nums">
                  0{idx + 1}
                </span>
                <h3 className="apple-display text-[20px] font-semibold text-[var(--apple-ink)] leading-snug">
                  {item.title}
                </h3>
                <p className="text-[14px] text-[var(--apple-ink-secondary)] leading-[1.6]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Apple Store 风格透明定价区 */}
        <section id="pricing" className="bg-[var(--apple-bg-alt)] py-24 border-t border-[var(--apple-border)]">
          <div className="max-w-[1080px] mx-auto px-5 sm:px-6 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--apple-ink-tertiary)]">
                {t.pricing.kicker}
              </p>
              <h2 className="apple-display text-3xl sm:text-5xl font-semibold text-[var(--apple-ink)] leading-[1.1]">
                {t.pricing.title}
              </h2>
              <p className="text-[16px] text-[var(--apple-ink-secondary)]">{t.pricing.subtitle}</p>
            </div>

            <PricingCheckoutButtons />
          </div>
        </section>
      </main>

      {/* Apple 极简页脚 */}
      <footer className="bg-[var(--apple-bg)] border-t border-[var(--apple-border)] py-8 text-[12px] text-[var(--apple-ink-tertiary)]">
        <div className="max-w-[1080px] mx-auto px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            Copyright © 2026 LaunchPulse.{" "}
            <a href="mailto:hello@statementflow.win" className="hover:underline">
              hello@statementflow.win
            </a>
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/dashboard" className="hover:text-[var(--apple-ink)] transition">
              {v2.nav.dashboard}
            </Link>
            <Link href="/portal" className="hover:text-[var(--apple-ink)] transition">
              {t.nav.portal}
            </Link>
            <Link href="/privacy" className="hover:text-[var(--apple-ink)] transition">
              {t.common.privacy}
            </Link>
            <Link href="/terms" className="hover:text-[var(--apple-ink)] transition">
              {t.common.terms}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
