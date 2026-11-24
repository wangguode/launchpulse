"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

export default function PricingCheckoutButtons() {
  const { t } = useI18n();
  const [loading, setLoading] = useState<"blitz" | "radar" | null>(null);
  const [error, setError] = useState("");

  const startCheckout = async (plan: "blitz" | "radar") => {
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
      setError(data.error || t.common.unableCheckoutError);
    } catch {
      setError(t.common.networkCheckoutError);
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
                {t.pricing.freeLabel}
              </p>
              <div className="mt-2 flex items-baseline gap-1 tabular-nums">
                <span className="text-4xl font-[family-name:var(--font-display)] font-bold text-white">
                  $0
                </span>
                <span className="text-xs text-slate-500">{t.pricing.freePeriod}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{t.pricing.freeDesc}</p>
            <ul className="space-y-2.5 text-xs text-slate-300 pt-2">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t.pricing.freeF1}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t.pricing.freeF2}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t.pricing.freeF3}</span>
              </li>
            </ul>
          </div>

          <a
            href="#"
            className="mt-8 w-full py-3 rounded-xl border border-white/15 hover:border-white/35 text-center text-xs font-semibold text-white transition"
          >
            {t.pricing.freeBtn}
          </a>
        </div>

        {/* Tier 2: 50+ Directory Distribution Blitz ($39) */}
        <div className="rounded-2xl border border-amber-500/40 bg-[#0d121c] p-7 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-[family-name:var(--font-mono)] text-amber-300 uppercase">
                {t.pricing.fixLabel}
              </p>
              <div className="mt-2 flex items-baseline gap-1 tabular-nums">
                <span className="text-4xl font-[family-name:var(--font-display)] font-bold text-white">
                  $39
                </span>
                <span className="text-xs text-slate-400">{t.pricing.fixPeriod}</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{t.pricing.fixDesc}</p>
            <ul className="space-y-2.5 text-xs text-slate-200 pt-2">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t.pricing.fixF1}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t.pricing.fixF2}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t.pricing.fixF3}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>{t.pricing.fixF4Prefix}</strong> {t.pricing.fixF4Text}
                </span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => startCheckout("blitz")}
            disabled={loading !== null}
            className="mt-8 w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-60"
          >
            {loading === "blitz" ? t.pricing.loadingCheckout : t.pricing.fixBtn}
          </button>
        </div>

        {/* Tier 3: Growth & Buyer Radar Pro ($29/mo) */}
        <div className="rounded-2xl border-2 border-emerald-500/60 bg-[#0c1520] p-7 flex flex-col justify-between relative shadow-[0_16px_50px_rgba(16,185,129,0.12)]">
          <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold uppercase tracking-wider">
            {t.pricing.radarBadge}
          </span>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-[family-name:var(--font-mono)] text-emerald-300 uppercase">
                {t.pricing.radarLabel}
              </p>
              <div className="mt-2 flex items-baseline gap-1 tabular-nums">
                <span className="text-4xl font-[family-name:var(--font-display)] font-bold text-white">
                  $29
                </span>
                <span className="text-xs text-slate-400">{t.pricing.radarPeriod}</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{t.pricing.radarDesc}</p>
            <ul className="space-y-2.5 text-xs text-slate-100 pt-2">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t.pricing.radarF1}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t.pricing.radarF2}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t.pricing.radarF3}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t.pricing.radarF4}</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => startCheckout("radar")}
            disabled={loading !== null}
            className="mt-8 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {loading === "radar" ? t.pricing.loadingCheckout : t.pricing.radarBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
