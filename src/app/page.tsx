import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  FileCode2,
  Play,
  Radar,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { getAllAudits } from "@/data/audits";
import LiveScannerHero from "@/components/LiveScannerHero";
import PricingCheckoutButtons from "@/components/PricingCheckoutButtons";

export default function HomePage() {
  const sampleAudits = getAllAudits();
  const featured = sampleAudits[0];

  return (
    <div className="min-h-screen bg-[#07090d] text-slate-100 obsidian-grid">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07090d]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-[family-name:var(--font-display)] font-bold text-lg text-white tracking-tight"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#10b981]" />
            <span>LaunchPulse</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm text-slate-300">
            <a href="#samples" className="hover:text-white transition">
              Live War-Room Samples
            </a>
            <a href="#how-it-works" className="hover:text-white transition">
              How It Works
            </a>
            <a href="#pricing" className="hover:text-white transition">
              Pricing
            </a>
            <Link href="/portal" className="hover:text-emerald-300 transition">
              Customer Portal
            </Link>
          </nav>

          <a
            href="#pricing"
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white transition"
          >
            Get Launch Fix Pack · $19
          </a>
        </div>
      </header>

      <main>
        {/* 1. 首屏 Hero：直击 Vibe Coder 痛点 + 实时无害扫描器 */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-14 text-center space-y-7">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-[family-name:var(--font-mono)]">
            <span>PASSIVE LAUNCH TEARDOWN + 24/7 BUYER INTENT RADAR</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-[family-name:var(--font-display)] font-bold text-white tracking-tight leading-[1.08] max-w-4xl mx-auto">
            Built your AI SaaS, now wondering{" "}
            <span className="text-emerald-400">where the paying users are?</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Shipping code with Cursor and Claude Code takes a weekend. Getting organic traffic takes
            fixing hidden{" "}
            <code className="text-emerald-300 font-[family-name:var(--font-mono)]">/llms.txt</code>{" "}
            &amp; SEO leaks — and replying to real developers actively asking for your tool today.
          </p>

          <LiveScannerHero />

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400 pt-1">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 100% Passive Read-Only Check
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> First 3 Buyer Links Unlocked
              Free
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Copy-Paste Cursor / Claude
              Fix Prompts
            </span>
          </div>
        </section>

        {/* 2. 真实 85 秒个性化拆解样片 + 1对1 专属战情页实证 */}
        {featured && (
          <section id="samples" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-emerald-400">
                  REAL GENERATED WAR-ROOMS · NOT MOCKUPS
                </p>
                <h2 className="text-2xl sm:text-3xl font-[family-name:var(--font-display)] font-bold text-white mt-1">
                  Watch a Live {featured.videoDurationSeconds}-Second SaaS Teardown
                </h2>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {sampleAudits.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/audit/${a.slug}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/15 bg-[#0c1018] hover:border-emerald-400/50 text-xs font-[family-name:var(--font-mono)] text-slate-200 transition"
                  >
                    <span>Open {a.productName} War-Room</span>
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
                  SAMPLE TEARDOWN: {featured.productName} ({featured.domain})
                </span>
                <Link
                  href={`/audit/${featured.slug}`}
                  className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  Inspect Full War-Room Page <ArrowUpRight className="w-3.5 h-3.5" />
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
              THE GROWTH STACK FOR VIBE CODERS
            </p>
            <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-white mt-2">
              Three Shovels That Turn Silent Launches Into Paying Customers
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                1. Launch &amp; Conversion Teardown
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Non-intrusive Playwright inspection across desktop &amp; mobile viewports catches{" "}
                <code>noindex</code> disasters, missing <code>SoftwareApplication</code> schemas,
                header gaps, and bottom-of-funnel <code>/vs/</code> blind spots.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FileCode2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                2. AI Search Visibility (AEO)
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Over 70% of new indie apps return <code>404</code> on <code>/llms.txt</code>. We
                auto-generate your structured Markdown entity manifest and copy-paste Cursor prompts
                so ChatGPT, Claude, and Perplexity cite your product.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Radar className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                3. 24/7 Buyer Intent Radar
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Stop burning cash on cold ads. We continuously filter Hacker News, Reddit, and
                GitHub threads to surface developers actively experiencing the exact problem you
                solve — with the first 3 links unlocked free.
              </p>
            </div>
          </div>
        </section>

        {/* 4. 透明三档定价（直连 Creem.io 实时收款） */}
        <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <p className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-emerald-400">
              VERIFY FIRST · PAY ONLY FOR REAL LEVERAGE
            </p>
            <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] font-bold text-white">
              Transparent Founder-Friendly Pricing
            </h2>
            <p className="text-sm text-slate-400">
              Every war-room unlocks your top 3 leaks and first 3 buyer threads for $0 so you never
              buy blind.
            </p>
          </div>

          <PricingCheckoutButtons />
        </section>
      </main>

      <footer className="border-t border-white/10 py-10 mt-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            © 2026 LaunchPulse · Built for SaaS &amp; AI Founders ·{" "}
            <a href="mailto:hello@statementflow.win" className="text-slate-300 hover:underline">
              hello@statementflow.win
            </a>
          </p>
          <div className="flex items-center gap-6">
            {sampleAudits.map((a) => (
              <Link key={a.slug} href={`/audit/${a.slug}`} className="hover:text-slate-300">
                {a.productName} Demo
              </Link>
            ))}
            <Link href="/privacy" className="hover:text-slate-300">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-slate-300">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
