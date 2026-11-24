"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";

export default function PricingCheckoutButtons() {
  const [loading, setLoading] = useState<"fixpack" | "radar" | null>(null);
  const [error, setError] = useState("");

  const startCheckout = async (plan: "fixpack" | "radar") => {
    setLoading(plan);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setError(data.error || "Unable to open checkout right now.");
    } catch {
      setError("Network error while connecting to Creem checkout.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="max-w-xl mx-auto rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200 text-center">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 items-stretch">
        {/* Tier 1: Free Snapshot */}
        <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-7 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-[family-name:var(--font-mono)] text-slate-400 uppercase">
                FREE SNAPSHOT
              </p>
              <div className="mt-2 flex items-baseline gap-1 tabular-nums">
                <span className="text-4xl font-[family-name:var(--font-display)] font-bold text-white">
                  $0
                </span>
                <span className="text-xs text-slate-500">forever</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verify our diagnostic accuracy and click real buyer threads before spending a cent.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-300 pt-2">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant Launch Readiness score (0–100)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Top 3 critical SEO / AEO / security leaks</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>First 3 live community buyer links unlocked</span>
              </li>
            </ul>
          </div>

          <a
            href="#"
            className="mt-8 w-full py-3 rounded-xl border border-white/15 hover:border-white/35 text-center text-xs font-semibold text-white transition"
          >
            Scan Your URL Above ↑
          </a>
        </div>

        {/* Tier 2: One-Time Launch Fix Pack ($19) */}
        <div className="rounded-2xl border border-white/15 bg-[#0d121c] p-7 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-[family-name:var(--font-mono)] text-amber-300 uppercase">
                ONE-TIME LAUNCH FIX PACK
              </p>
              <div className="mt-2 flex items-baseline gap-1 tabular-nums">
                <span className="text-4xl font-[family-name:var(--font-display)] font-bold text-white">
                  $19
                </span>
                <span className="text-xs text-slate-400">one-time payment</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ship every technical SEO, schema, and AI citation fix in under 15 minutes.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-200 pt-2">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Full passive diagnostic report + custom 90s teardown</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Copy-paste Cursor &amp; Claude Code fix prompts</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Auto-generated <code>/llms.txt</code> + <code>SoftwareApplication</code> JSON-LD
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>HTTP security header middleware snippet</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => startCheckout("fixpack")}
            disabled={loading !== null}
            className="mt-8 w-full py-3 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-60"
          >
            {loading === "fixpack" ? "Opening Secure Checkout..." : "Buy Launch Fix Pack — $19"}
          </button>
        </div>

        {/* Tier 3: Growth & Buyer Radar Pro ($29/mo) */}
        <div className="rounded-2xl border-2 border-emerald-500/60 bg-[#0c1520] p-7 flex flex-col justify-between relative shadow-[0_16px_50px_rgba(16,185,129,0.12)]">
          <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold uppercase tracking-wider">
            Best ROI · Cancel Anytime
          </span>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-[family-name:var(--font-mono)] text-emerald-300 uppercase">
                GROWTH &amp; BUYER RADAR PRO
              </p>
              <div className="mt-2 flex items-baseline gap-1 tabular-nums">
                <span className="text-4xl font-[family-name:var(--font-display)] font-bold text-white">
                  $29
                </span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Everything in Fix Pack plus 24/7 alerts whenever buyers ask for a tool in your space.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-100 pt-2">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Includes full $19 Launch Fix Pack &amp; AI prompts</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Unlock all 10+ live Reddit, HN &amp; GitHub buyer threads</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Daily high-intent buyer alerts + non-spam reply drafts</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>2 SEO competitor &ldquo;Alternative-to&rdquo; pages / week</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => startCheckout("radar")}
            disabled={loading !== null}
            className="mt-8 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {loading === "radar" ? "Opening Secure Checkout..." : "Start 24/7 Buyer Radar — $29/mo"}
          </button>
        </div>
      </div>
    </div>
  );
}
