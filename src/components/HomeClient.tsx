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
  const isZh = locale === "zh";
  const isJa = locale === "ja";

  return (
    <div className="min-h-screen bg-[var(--apple-bg)] text-[var(--apple-ink)] overflow-x-hidden">
      {/* Apple 标志性 48px 半透明毛玻璃导航栏 */}
      <header className="sticky top-0 z-40 apple-glass border-b border-[var(--apple-border)]">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-3">
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
            <Link href="/dashboard?sample=1" className="hover:text-[var(--apple-ink)] transition">
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
              className="px-3.5 py-1.5 rounded-full lp-btn-primary text-[12px] font-medium transition whitespace-nowrap"
            >
              {v2.nav.login}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* 1. Hero 首屏 + Apple 级 macOS 产品橱窗 */}
        <section className="max-w-[1040px] mx-auto px-5 sm:px-6 pt-16 sm:pt-20 pb-20 text-center space-y-6">
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

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-[var(--apple-ink-secondary)]">
            <span>{t.hero.trust1}</span>
            <span className="opacity-30">·</span>
            <span>{t.hero.trust2}</span>
            <span className="opacity-30">·</span>
            <Link
              href="/dashboard?sample=1"
              className="inline-flex items-center gap-0.5 text-[var(--apple-blue)] hover:underline font-medium"
            >
              {isZh
                ? "直接体验交互式控制台"
                : isJa
                ? "デモコンソールを体験"
                : "Try Interactive Console"}
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Apple 风格 macOS 产品橱窗（让访客 3 秒看清付费后真实交付的控制台与报表） */}
          <div className="pt-8">
            <div className="rounded-[24px] border border-[var(--apple-border)] bg-[var(--apple-surface)] shadow-[var(--apple-shadow)] overflow-hidden text-left">
              <div className="h-10 px-4 border-b border-[var(--apple-border)] bg-[var(--apple-bg-alt)] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                </div>
                <span className="hidden sm:inline text-[11px] font-mono text-[var(--apple-ink-tertiary)]">
                  pulse.statementflow.win/dashboard
                </span>
                <Link
                  href="/dashboard?sample=1"
                  className="text-[11px] text-[var(--apple-blue)] hover:underline font-medium whitespace-nowrap"
                >
                  {isZh ? "进入实时体验 ›" : isJa ? "デモを開く ›" : "Open Live Demo ›"}
                </Link>
              </div>

              <div className="p-5 sm:p-7 space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--apple-border)] rounded-[14px] border border-[var(--apple-border)] bg-[var(--apple-bg)] tabular-nums">
                  {[
                    {
                      l: isZh ? "近 30 天导流点击" : isJa ? "30日間クリック" : "30D Referral Clicks",
                      v: "1,248",
                    },
                    {
                      l: isZh ? "归因注册转化" : isJa ? "登録コンバージョン" : "Verified Signups",
                      v: "64",
                    },
                    {
                      l: isZh ? "转化率 (CVR)" : "Conversion Rate",
                      v: "5.1%",
                      accent: true,
                    },
                    {
                      l: isZh ? "已收录高权重目录" : isJa ? "掲載完了ディレクトリ" : "Live Directories",
                      v: "38 / 50",
                    },
                  ].map((m) => (
                    <div key={m.l} className="p-4 space-y-1">
                      <p className="text-[11px] text-[var(--apple-ink-secondary)]">{m.l}</p>
                      <p
                        className={`apple-display text-2xl font-semibold ${
                          m.accent ? "text-[var(--apple-blue)]" : "text-[var(--apple-ink)]"
                        }`}
                      >
                        {m.v}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 rounded-[14px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-4 space-y-2">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-semibold text-[var(--apple-ink)]">
                        {isZh ? "外链与社区引流增长趋势（示例）" : "Distribution Traffic Curve (Sample)"}
                      </span>
                      <span className="text-[11px] text-[var(--apple-ink-tertiary)]">30D</span>
                    </div>
                    <svg viewBox="0 0 460 95" className="w-full h-24 overflow-visible">
                      <defs>
                        <linearGradient id="heroCurveGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--apple-blue)" stopOpacity="0.24" />
                          <stop offset="100%" stopColor="var(--apple-blue)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0,82 L 42,76 L 84,68 L 126,64 L 168,52 L 210,55 L 252,41 L 294,35 L 336,28 L 378,24 L 420,16 L 460,11 L 460,92 L 0,92 Z"
                        fill="url(#heroCurveGrad)"
                      />
                      <path
                        d="M 0,82 L 42,76 L 84,68 L 126,64 L 168,52 L 210,55 L 252,41 L 294,35 L 336,28 L 378,24 L 420,16 L 460,11"
                        fill="none"
                        stroke="var(--apple-blue)"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div className="rounded-[14px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-4 space-y-2.5 text-[12px]">
                    <p className="font-semibold text-[var(--apple-ink)]">
                      {isZh ? "最新收录目录外链" : "Recent Live Backlinks"}
                    </p>
                    {[
                      { name: "AlternativeTo", dr: 82 },
                      { name: "SaaSHub", dr: 74 },
                      { name: "Uneed.best", dr: 68 },
                      { name: "MicroLaunch", dr: 61 },
                    ].map((d) => (
                      <div
                        key={d.name}
                        className="flex items-center justify-between text-[var(--apple-ink-secondary)]"
                      >
                        <span className="inline-flex items-center gap-1.5 text-[var(--apple-ink)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--apple-green-dot)]" />
                          {d.name}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--apple-ink-tertiary)]">
                          DR {d.dr}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. 真实 80 秒实机拆解样片 */}
        {featured && (
          <section
            id="samples"
            className="bg-[var(--apple-bg-alt)] py-20 border-y border-[var(--apple-border)]"
          >
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
                      className="inline-flex items-center gap-1 text-[14px] text-[var(--apple-blue)] hover:underline font-normal"
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

        {/* 3. 三大核心流量引擎 */}
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

        {/* 4. Apple Store 风格定价 */}
        <section
          id="pricing"
          className="bg-[var(--apple-bg-alt)] py-24 border-t border-[var(--apple-border)]"
        >
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
