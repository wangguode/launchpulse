"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  FileCode2,
  Play,
  Radar,
  ShieldAlert,
} from "lucide-react";
import type { StartupAuditReport } from "@/types/audit";
import { useI18n } from "@/components/I18nProvider";
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
    <div className="min-h-screen bg-[#07090d] text-slate-100 obsidian-grid overflow-x-hidden">
      {/* 顶部导航栏（含 EN / 中文 / 日本語 切换器） */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07090d]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-[family-name:var(--font-display)] font-bold text-lg text-white tracking-tight shrink-0"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#10b981]" />
            <span>LaunchPulse</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-sm text-slate-300">
            <a href="#samples" className="hover:text-white transition">
              {t.nav.samples}
            </a>
            <a href="#how-it-works" className="hover:text-white transition">
              {t.nav.howItWorks}
            </a>
            <a href="#pricing" className="hover:text-white transition">
              {t.nav.pricing}
            </a>
            <Link href="/dashboard" className="hover:text-emerald-300 transition font-medium">
              {v2.nav.dashboard}
            </Link>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <ThemeSwitcher />
            <LangSwitcher />
            <Link
              href="/login"
              className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 transition"
            >
              {v2.nav.login}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* 1. 首屏 Hero：直击 Vibe Coder 痛点 + 实时无害扫描器 */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-14 text-center space-y-7">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-[family-name:var(--font-mono)]">
            <span>{t.hero.badge}</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-[family-name:var(--font-display)] font-bold text-white tracking-tight leading-[1.1] max-w-4xl mx-auto">
            {t.hero.titlePrefix}
            <span className="text-emerald-400">{t.hero.titleHighlight}</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t.hero.subtitle}
          </p>

          <LiveScannerHero />

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400 pt-1">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {t.hero.trust1}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {t.hero.trust2}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {t.hero.trust3}
            </span>
          </div>
        </section>

        {/* 2. 真实个性化拆解样片 + 1对1 专属战情页实证 */}
        {featured && (
          <section id="samples" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-emerald-400">
                  {t.samples.kicker}
                </p>
                <h2 className="text-2xl sm:text-3xl font-[family-name:var(--font-display)] font-bold text-white mt-1">
                  {featured.videoDurationSeconds}
                  {t.samples.titleSuffix}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {sampleAudits.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/audit/${a.slug}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/15 bg-[#0c1018] hover:border-emerald-400/50 text-xs font-[family-name:var(--font-mono)] text-slate-200 transition"
                  >
                    <span>
                      {a.productName} {t.samples.openWarRoom}
                    </span>
                    <span className="text-amber-400">({a.overallScore}/100)</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/12 bg-[#0b1018] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
              <div className="px-5 py-3 border-b border-white/10 bg-[#101622] flex items-center justify-between text-xs font-[family-name:var(--font-mono)]">
                <span className="text-slate-200 inline-flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                  {featured.productName} ({featured.domain})
                </span>
                <Link
                  href={`/audit/${featured.slug}`}
                  className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  {t.samples.inspectFull} <ArrowUpRight className="w-3.5 h-3.5" />
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
          </section>
        )}

        {/* 3. 三大核心能力模块 */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-10">
          <div className="max-w-2xl">
            <p className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-amber-400">
              {t.pillars.kicker}
            </p>
            <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-white mt-2">
              {t.pillars.title}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                {t.pillars.p1Title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{t.pillars.p1Desc}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FileCode2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                {t.pillars.p2Title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{t.pillars.p2Desc}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Radar className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                {t.pillars.p3Title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{t.pillars.p3Desc}</p>
            </div>
          </div>
        </section>

        {/* 4. 透明三档定价（直连 Creem.io 实时收款） */}
        <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <p className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-emerald-400">
              {t.pricing.kicker}
            </p>
            <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] font-bold text-white">
              {t.pricing.title}
            </h2>
            <p className="text-sm text-slate-400">{t.pricing.subtitle}</p>
          </div>

          <PricingCheckoutButtons />
        </section>
      </main>

      <footer className="border-t border-white/10 py-10 mt-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            © 2026 LaunchPulse ·{" "}
            <a href="mailto:hello@statementflow.win" className="text-slate-300 hover:underline">
              hello@statementflow.win
            </a>
          </p>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/portal" className="hover:text-slate-300">
              {t.nav.portal}
            </Link>
            <Link href="/privacy" className="hover:text-slate-300">
              {t.common.privacy}
            </Link>
            <Link href="/terms" className="hover:text-slate-300">
              {t.common.terms}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
