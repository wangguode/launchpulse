"use client";

import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

export default function PricingCheckoutButtons() {
  const { locale, t } = useI18n();
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
    <div className="space-y-6">
      {error && (
        <div className="max-w-xl mx-auto rounded-2xl border border-[var(--apple-border)] bg-[var(--apple-surface)] px-4 py-3 text-[13px] text-[var(--apple-red)] text-center">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5 items-stretch">
        {/* Tier 1: Free */}
        <div className="rounded-[24px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-8 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-[12px] font-semibold text-[var(--apple-ink-tertiary)]">
                {t.pricing.freeLabel}
              </p>
              <div className="mt-2 flex items-baseline gap-1.5 tabular-nums">
                <span className="apple-display text-4xl font-semibold text-[var(--apple-ink)]">
                  $0
                </span>
                <span className="text-[13px] text-[var(--apple-ink-tertiary)]">
                  {t.pricing.freePeriod}
                </span>
              </div>
            </div>
            <p className="text-[14px] text-[var(--apple-ink-secondary)] leading-relaxed">
              {t.pricing.freeDesc}
            </p>
            <ul className="space-y-2.5 text-[13px] text-[var(--apple-ink-secondary)] pt-2">
              {[t.pricing.freeF1, t.pricing.freeF2, t.pricing.freeF3].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[var(--apple-blue)] shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <a
            href="#"
            className="mt-8 w-full py-2.5 rounded-full border border-[var(--apple-border-strong)] hover:bg-[var(--apple-hover)] text-center text-[14px] font-medium text-[var(--apple-ink)] transition"
          >
            {t.pricing.freeBtn}
          </a>
        </div>

        {/* Tier 2: $39 50+ Directory Blitz */}
        <div className="rounded-[24px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-8 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-[12px] font-semibold text-[var(--apple-ink-tertiary)]">
                {t.pricing.fixLabel}
              </p>
              <div className="mt-2 flex items-baseline gap-1.5 tabular-nums">
                <span className="apple-display text-4xl font-semibold text-[var(--apple-ink)]">
                  $39
                </span>
                <span className="text-[13px] text-[var(--apple-ink-tertiary)]">
                  {t.pricing.fixPeriod}
                </span>
              </div>
            </div>
            <p className="text-[14px] text-[var(--apple-ink-secondary)] leading-relaxed">
              {t.pricing.fixDesc}
            </p>
            <ul className="space-y-2.5 text-[13px] text-[var(--apple-ink-secondary)] pt-2">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[var(--apple-blue)] shrink-0 mt-0.5" />
                <span>{t.pricing.fixF1}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[var(--apple-blue)] shrink-0 mt-0.5" />
                <span>{t.pricing.fixF2}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[var(--apple-blue)] shrink-0 mt-0.5" />
                <span>{t.pricing.fixF3}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[var(--apple-blue)] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--apple-ink)] font-medium">
                    {t.pricing.fixF4Prefix}
                  </strong>{" "}
                  {t.pricing.fixF4Text}
                </span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => startCheckout("blitz")}
            disabled={loading !== null}
            className="mt-8 w-full py-2.5 rounded-full lp-btn-inverse font-medium text-[14px] transition cursor-pointer disabled:opacity-60 min-h-[42px]"
          >
            {loading === "blitz" ? t.pricing.loadingCheckout : t.pricing.fixBtn}
          </button>
        </div>

        {/* Tier 3: $29/mo Buyer Radar Pro */}
        <div className="rounded-[24px] border-2 border-[var(--apple-blue)] bg-[var(--apple-surface)] p-8 flex flex-col justify-between relative shadow-[var(--apple-shadow)]">
          <span className="absolute -top-3 right-7 px-3 py-0.5 rounded-full lp-btn-primary text-[11px] font-medium">
            {t.pricing.radarBadge}
          </span>

          <div className="space-y-4">
            <div>
              <p className="text-[12px] font-semibold text-[var(--apple-blue)]">
                {t.pricing.radarLabel}
              </p>
              <div className="mt-2 flex items-baseline gap-1.5 tabular-nums">
                <span className="apple-display text-4xl font-semibold text-[var(--apple-ink)]">
                  $29
                </span>
                <span className="text-[13px] text-[var(--apple-ink-tertiary)]">
                  {t.pricing.radarPeriod}
                </span>
              </div>
            </div>
            <p className="text-[14px] text-[var(--apple-ink-secondary)] leading-relaxed">
              {t.pricing.radarDesc}
            </p>
            <ul className="space-y-2.5 text-[13px] text-[var(--apple-ink-secondary)] pt-2">
              {[t.pricing.radarF1, t.pricing.radarF2, t.pricing.radarF3, t.pricing.radarF4].map(
                (f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[var(--apple-blue)] shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                )
              )}
            </ul>
          </div>

          <button
            onClick={() => startCheckout("radar")}
            disabled={loading !== null}
            className="mt-8 w-full py-2.5 rounded-full lp-btn-primary font-medium text-[14px] transition cursor-pointer disabled:opacity-60 min-h-[42px]"
          >
            {loading === "radar" ? t.pricing.loadingCheckout : t.pricing.radarBtn}
          </button>
        </div>
      </div>

      {/* Apple 风格极简信任保障条 */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-[var(--apple-ink-secondary)] pt-2">
        <span className="inline-flex items-center gap-1.5 font-medium text-[var(--apple-ink)]">
          <ShieldCheck className="w-4 h-4 text-[var(--apple-blue)]" />
          {locale === "zh"
            ? "Creem.io 合规安全收单（信用卡 / Apple Pay）"
            : locale === "ja"
            ? "Creem.io 安全決済（カード / Apple Pay 対応）"
            : "Secured by Creem.io (Card & Apple Pay)"}
        </span>
        <span className="opacity-30">·</span>
        <span>
          {locale === "zh"
            ? "7 天无理由退款保障"
            : locale === "ja"
            ? "7日間全額返金保証"
            : "7-Day Money-Back Guarantee"}
        </span>
        <span className="opacity-30">·</span>
        <span>
          {locale === "zh"
            ? "订阅随时一键取消"
            : locale === "ja"
            ? "いつでもワンクリック解約"
            : "Cancel Anytime"}
        </span>
      </div>
    </div>
  );
}
