import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — LaunchPulse",
  description: "How LaunchPulse handles public passive website scans and customer billing data.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#07090d] text-slate-200 px-6 py-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="text-xs font-mono text-emerald-400 hover:underline">
          ← Back to LaunchPulse
        </Link>
        <h1 className="text-3xl font-bold text-white tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-slate-400">Last updated: November 24, 2026</p>
        <section className="space-y-3 text-sm leading-relaxed text-slate-300">
          <h2 className="text-lg font-semibold text-white">1. Passive Public Website Diagnostics</h2>
          <p>
            LaunchPulse performs strictly read-only, non-intrusive checks on publicly accessible URLs
            (such as homepage HTML metadata, HTTP headers, <code>/robots.txt</code>,{" "}
            <code>/sitemap.xml</code>, and <code>/llms.txt</code>). We never submit forms, probe private
            endpoints, or access authenticated data.
          </p>
          <h2 className="text-lg font-semibold text-white">2. Payment Processing</h2>
          <p>
            Payments for the One-Time Launch Fix Pack ($19) and Growth &amp; Buyer Radar Pro ($29/mo) are
            processed securely by Creem.io as Merchant of Record. LaunchPulse never stores credit card
            numbers.
          </p>
          <h2 className="text-lg font-semibold text-white">3. Report Removal &amp; Contact</h2>
          <p>
            Founders may request immediate removal or refresh of any custom audit page at any time by
            emailing{" "}
            <a href="mailto:hello@statementflow.win" className="text-emerald-400 underline">
              hello@statementflow.win
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
