import Link from "next/link";

export const metadata = {
  title: "Terms of Service — LaunchPulse",
  description: "Terms governing LaunchPulse diagnostics, AI fix packs, and Buyer Intent Radar subscriptions.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#07090d] text-slate-200 px-6 py-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="text-xs font-mono text-emerald-400 hover:underline">
          ← Back to LaunchPulse
        </Link>
        <h1 className="text-3xl font-bold text-white tracking-tight">Terms of Service</h1>
        <p className="text-sm text-slate-400">Last updated: November 24, 2026</p>
        <section className="space-y-3 text-sm leading-relaxed text-slate-300">
          <h2 className="text-lg font-semibold text-white">1. Authorized Use</h2>
          <p>
            By submitting a domain to LaunchPulse, you confirm that you are requesting a passive,
            read-only diagnostic of publicly served web metadata and community discussion threads.
          </p>
          <h2 className="text-lg font-semibold text-white">2. Plans, Refunds &amp; Cancellation</h2>
          <p>
            The $19 Launch Fix Pack is a one-time purchase unlocking full audit prompts and generated
            manifests. The $29/month Buyer Intent Radar Pro subscription can be canceled anytime with one
            click; if you are unsatisfied within 7 days of initial purchase, email{" "}
            <a href="mailto:hello@statementflow.win" className="text-emerald-400 underline">
              hello@statementflow.win
            </a>{" "}
            for a full refund.
          </p>
        </section>
      </div>
    </main>
  );
}
