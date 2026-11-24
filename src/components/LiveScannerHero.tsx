"use client";

import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  AlertCircle,
  Loader2,
  Lock,
  Radar,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
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
        className="max-w-2xl mx-auto rounded-2xl border border-white/15 bg-[#0c111b] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col sm:flex-row gap-2"
      >
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder={t.hero.placeholder}
          aria-label={t.hero.placeholder}
          className="flex-1 bg-transparent px-4 py-3.5 text-sm sm:text-base font-[family-name:var(--font-mono)] text-white placeholder:text-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={scanning}
          className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-60"
        >
          {scanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> {t.hero.scanningBtn}
            </>
          ) : (
            <>
              {t.hero.scanBtn} <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="max-w-2xl mx-auto rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs sm:text-sm text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* 实时边缘无害体检快照面板 */}
      {result && (
        <div className="max-w-5xl mx-auto rounded-2xl border border-emerald-500/35 bg-[#0b1019] p-6 sm:p-8 text-left space-y-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
            <div>
              <span className="text-xs font-[family-name:var(--font-mono)] text-emerald-400 uppercase">
                {t.scanner.liveSnapshot} · {result.domain}
              </span>
              <h3 className="text-xl sm:text-2xl font-[family-name:var(--font-display)] font-bold text-white mt-1">
                {decodeHtmlEntities(result.title)}
              </h3>
            </div>
            <div className="flex items-center gap-4 tabular-nums">
              <div className="text-right">
                <p className="text-[11px] font-[family-name:var(--font-mono)] text-slate-400">
                  {t.scanner.readinessScore}
                </p>
                <p className="text-3xl font-bold text-amber-400">
                  {result.score}
                  <span className="text-sm text-slate-500">/100</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 左列：实时检出的漏洞 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>
                  {t.scanner.detectedLeaks} ({result.leaksCount})
                </span>
              </div>
              {result.leaks.map((lk, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-1"
                >
                  <span className="text-[10px] font-[family-name:var(--font-mono)] uppercase text-red-300 bg-red-500/15 px-2 py-0.5 rounded">
                    {localizeSeverity(lk.severity, locale)} ·{" "}
                    {localizeCategory(lk.category, locale)}
                  </span>
                  <p className="text-sm font-semibold text-white">
                    {localizeLeakTitle(lk.title, locale)}
                  </p>
                  <p className="text-xs text-slate-400 break-words">{lk.evidence}</p>
                </div>
              ))}
            </div>

            {/* 右列：实时抓到的社区讨论线索 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Radar className="w-4 h-4 text-emerald-400" />
                  <span>
                    {t.scanner.matchedDiscussions} (&ldquo;{result.queryTerm}&rdquo;)
                  </span>
                </div>
                <span className="text-[11px] font-[family-name:var(--font-mono)] text-emerald-300">
                  {t.scanner.first3Free}
                </span>
              </div>

              {result.leads.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-slate-400">
                  {t.scanner.noLeadsFallback} <strong>{result.domain}</strong>.
                </div>
              ) : (
                result.leads.map((ld, idx) =>
                  ld.unlocked ? (
                    <div
                      key={idx}
                      className="rounded-xl border border-emerald-500/30 bg-[#0d1520] p-3.5 space-y-1.5"
                    >
                      <div className="flex justify-between text-[11px] font-[family-name:var(--font-mono)] text-emerald-300">
                        <span>
                          #{idx + 1} {ld.source} · {ld.author}
                        </span>
                        <span>{ld.postedAt}</span>
                      </div>
                      <p className="text-xs font-semibold text-white">
                        {decodeHtmlEntities(ld.title)}
                      </p>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {decodeHtmlEntities(ld.excerpt)}
                      </p>
                      <a
                        href={ld.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline pt-1"
                      >
                        {t.scanner.openLiveThread} <ArrowUpRight className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/10 bg-black/35 p-3 flex items-center justify-between"
                    >
                      <span className="text-xs text-slate-400 blur-[4px] select-none truncate">
                        {decodeHtmlEntities(ld.title)} — {decodeHtmlEntities(ld.excerpt)}
                      </span>
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    </div>
                  )
                )
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-300">
              {t.scanner.upsellPromptPrefix} <strong>{result.domain}</strong>
              {t.scanner.upsellPromptSuffix}
            </p>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => triggerCheckout("blitz", result.origin)}
                disabled={checkoutLoading !== null}
                className="px-4 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-xs font-bold text-slate-950 cursor-pointer disabled:opacity-60"
              >
                {checkoutLoading === "blitz" ? t.common.loading : t.scanner.getBlitzBtn}
              </button>
              <button
                onClick={() => triggerCheckout("radar", result.origin)}
                disabled={checkoutLoading !== null}
                className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {checkoutLoading === "radar" ? t.common.loading : t.scanner.startRadarBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
