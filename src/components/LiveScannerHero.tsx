"use client";

import { useState } from "react";
import { AlertCircle, ChevronRight, Loader2, Lock } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import {
  decodeHtmlEntities,
  localizeCategory,
  localizeLeakTitle,
  localizeSeverity,
} from "@/lib/i18n";

interface ScanResult {
  domain: string;
  origin: string;
  title: string;
  tagline: string;
  score: number;
  queryTerm: string;
  leaksCount: number;
  leaks: Array<{
    severity: "critical" | "high" | "medium";
    category: string;
    title: string;
    evidence: string;
  }>;
  leads: Array<{
    source: string;
    author: string;
    postedAt: string;
    title: string;
    excerpt: string;
    url: string;
    unlocked: boolean;
  }>;
}

export default function LiveScannerHero() {
  const { locale, t } = useI18n();
  const [urlInput, setUrlInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<"blitz" | "radar" | null>(null);

  const runLiveScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setScanning(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.scanner.scanFailed);
      } else {
        setResult(data as ScanResult);
      }
    } catch {
      setError(t.scanner.networkScanError);
    } finally {
      setScanning(false);
    }
  };

  const triggerCheckout = async (plan: "blitz" | "radar", targetUrl?: string) => {
    setCheckoutLoading(plan);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, targetUrl: targetUrl || urlInput }),
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
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={runLiveScan}
        className="max-w-xl mx-auto rounded-2xl sm:rounded-full border border-[var(--apple-border-strong)] bg-[var(--apple-surface)] p-1.5 shadow-[var(--apple-shadow)] flex flex-col sm:flex-row gap-1.5 focus-within:border-[var(--apple-blue)] transition"
      >
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder={t.hero.placeholder}
          aria-label={t.hero.placeholder}
          className="flex-1 bg-transparent px-5 py-2.5 text-[16px] sm:text-[15px] text-[var(--apple-ink)] placeholder:text-[var(--apple-ink-tertiary)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={scanning}
          className="px-6 py-2.5 rounded-full bg-[var(--apple-blue)] hover:bg-[var(--apple-blue-hover)] text-white font-medium text-[14px] transition inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-60"
        >
          {scanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> {t.hero.scanningBtn}
            </>
          ) : (
            t.hero.scanBtn
          )}
        </button>
      </form>

      {error && (
        <div className="max-w-xl mx-auto rounded-2xl border border-[var(--apple-border)] bg-[var(--apple-bg-alt)] px-4 py-3 text-[13px] text-[var(--apple-red)] flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="max-w-4xl mx-auto rounded-[24px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-6 sm:p-8 text-left space-y-6 shadow-[var(--apple-shadow)]">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[var(--apple-border)]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--apple-blue)]">
                {t.scanner.liveSnapshot} · {result.domain}
              </p>
              <h3 className="apple-display text-xl sm:text-2xl font-semibold text-[var(--apple-ink)] mt-1">
                {decodeHtmlEntities(result.title)}
              </h3>
            </div>
            <div className="text-right tabular-nums">
              <p className="text-[11px] uppercase tracking-wider text-[var(--apple-ink-tertiary)]">
                {t.scanner.readinessScore}
              </p>
              <p className="text-3xl font-semibold text-[var(--apple-ink)]">
                {result.score}
                <span className="text-sm text-[var(--apple-ink-tertiary)] font-normal">/100</span>
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-[13px] font-semibold text-[var(--apple-ink)]">
                {t.scanner.detectedLeaks} ({result.leaksCount})
              </p>
              {result.leaks.map((lk, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-[var(--apple-border)] bg-[var(--apple-bg-alt)] p-4 space-y-1"
                >
                  <p className="text-[11px] font-medium text-[var(--apple-ink-tertiary)]">
                    {localizeSeverity(lk.severity, locale)} ·{" "}
                    {localizeCategory(lk.category, locale)}
                  </p>
                  <p className="text-[14px] font-medium text-[var(--apple-ink)]">
                    {localizeLeakTitle(lk.title, locale)}
                  </p>
                  <p className="text-[12px] text-[var(--apple-ink-secondary)] break-words">
                    {lk.evidence}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-[var(--apple-ink)]">
                  {t.scanner.matchedDiscussions}
                </p>
                <span className="text-[11px] text-[var(--apple-blue)] font-medium">
                  {t.scanner.first3Free}
                </span>
              </div>

              {result.leads.length === 0 ? (
                <div className="rounded-2xl border border-[var(--apple-border)] bg-[var(--apple-bg-alt)] p-4 text-[13px] text-[var(--apple-ink-secondary)]">
                  {t.scanner.noLeadsFallback} <strong>{result.domain}</strong>.
                </div>
              ) : (
                result.leads.map((ld, idx) =>
                  ld.unlocked ? (
                    <div
                      key={idx}
                      className="rounded-2xl border border-[var(--apple-border)] bg-[var(--apple-bg-alt)] p-4 space-y-1.5"
                    >
                      <div className="flex justify-between text-[11px] text-[var(--apple-ink-tertiary)]">
                        <span>
                          #{idx + 1} {ld.source} · {ld.author}
                        </span>
                        <span>{ld.postedAt}</span>
                      </div>
                      <p className="text-[13px] font-medium text-[var(--apple-ink)]">
                        {decodeHtmlEntities(ld.title)}
                      </p>
                      <p className="text-[12px] text-[var(--apple-ink-secondary)] line-clamp-2">
                        {decodeHtmlEntities(ld.excerpt)}
                      </p>
                      <a
                        href={ld.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[12px] text-[var(--apple-blue)] hover:underline pt-1"
                      >
                        {t.scanner.openLiveThread} <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ) : (
                    <div
                      key={idx}
                      className="rounded-2xl border border-[var(--apple-border)] bg-[var(--apple-bg-alt)] p-3 flex items-center justify-between"
                    >
                      <span className="text-[12px] text-[var(--apple-ink-tertiary)] blur-[4px] select-none truncate">
                        {decodeHtmlEntities(ld.title)}
                      </span>
                      <Lock className="w-3.5 h-3.5 text-[var(--apple-ink-tertiary)] shrink-0" />
                    </div>
                  )
                )
              )}
            </div>
          </div>

          <div className="pt-5 border-t border-[var(--apple-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[13px] text-[var(--apple-ink-secondary)]">
              {t.scanner.upsellPromptPrefix} <strong>{result.domain}</strong>
              {t.scanner.upsellPromptSuffix}
            </p>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => triggerCheckout("blitz", result.origin)}
                disabled={checkoutLoading !== null}
                className="px-4 py-2 rounded-full border border-[var(--apple-border-strong)] hover:bg-[var(--apple-hover)] text-[13px] font-medium text-[var(--apple-ink)] cursor-pointer transition"
              >
                {checkoutLoading === "blitz" ? t.common.loading : t.scanner.getBlitzBtn}
              </button>
              <button
                onClick={() => triggerCheckout("radar", result.origin)}
                disabled={checkoutLoading !== null}
                className="px-4 py-2 rounded-full bg-[var(--apple-blue)] hover:bg-[var(--apple-blue-hover)] text-white text-[13px] font-medium cursor-pointer transition"
              >
                {checkoutLoading === "radar" ? t.common.loading : t.scanner.startRadarBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
