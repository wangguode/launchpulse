"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  Lock,
  Play,
  Unlock,
} from "lucide-react";
import type { StartupAuditReport } from "@/types/audit";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { V2_DICTIONARIES } from "@/lib/v2-i18n";
import {
  decodeHtmlEntities,
  localizeCategory,
  localizeLeakImpact,
  localizeLeakTitle,
  localizePassedCheck,
  localizeSeverity,
} from "@/lib/i18n";

interface Props {
  report: StartupAuditReport;
}

/**
 * V3 纯净 Apple 双主题专属战情页（0 处旧暗黑硬编码，亮暗双模式高对比度原生适配）
 */
export default function WarRoomClient({ report }: Props) {
  const { locale, t } = useI18n();
  const v2 = V2_DICTIONARIES[locale];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastReportedSecRef = useRef<number>(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockedPlan, setUnlockedPlan] = useState<string | null>(null);
  const [postCheckoutPrompt, setPostCheckoutPrompt] = useState(false);
  const [claimEmail, setClaimEmail] = useState("");
  const [claimFeedback, setClaimFeedback] = useState("");
  const [loadingPlan, setLoadingPlan] = useState<"blitz" | "radar" | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const trackEvent = (event: "view" | "video_progress" | "buyer_click", seconds = 0) => {
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: report.slug, event, seconds }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token")?.trim();
      if (params.get("unlocked") === "1" && !token) {
        setPostCheckoutPrompt(true);
      }
      if (token) {
        fetch("/api/portal/verify-unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, slug: report.slug }),
        })
          .then((r) => r.json())
          .then((d: { unlocked?: boolean; plan?: string }) => {
            if (d.unlocked) {
              setIsUnlocked(true);
              setUnlockedPlan(d.plan || "radar");
            }
          })
          .catch(() => {});
      }
      trackEvent("view");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.slug]);

  const jumpToChapter = (ratio: number) => {
    const v = videoRef.current;
    if (!v) return;
    const dur = v.duration || report.videoDurationSeconds || 82;
    v.currentTime = Math.max(0, dur * ratio);
    v.play().catch(() => {});
  };

  const handleCheckout = async (plan: "blitz" | "radar") => {
    setLoadingPlan(plan);
    setCheckoutError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, slug: report.slug, targetUrl: report.targetUrl }),
      });
      const data = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setCheckoutError(data.error || t.common.unableCheckoutError);
    } catch {
      setCheckoutError(t.common.networkCheckoutError);
    } finally {
      setLoadingPlan(null);
    }
  };

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // ignore
    }
  };

  const unlockedLeads = report.buyerLeads.filter((l) => l.unlockedByDefault || isUnlocked);
  const lockedLeads = isUnlocked ? [] : report.buyerLeads.filter((l) => !l.unlockedByDefault);

  return (
    <div className="min-h-screen bg-[var(--apple-bg)] text-[var(--apple-ink)] overflow-x-hidden">
      {/* 48px Apple 毛玻璃顶部导航 */}
      <header className="sticky top-0 z-40 apple-glass border-b border-[var(--apple-border)]">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold text-[15px] tracking-tight text-[var(--apple-ink)] shrink-0"
            >
              <BrandMark className="w-5 h-5" />
              <span className="hidden sm:inline">LaunchPulse</span>
            </Link>
            <span className="text-[var(--apple-ink-tertiary)] hidden sm:inline">/</span>
            <span className="hidden sm:inline-block text-[12px] text-[var(--apple-ink-secondary)] truncate">
              {report.domain}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block">
              <ThemeSwitcher />
            </div>
            <LangSwitcher />
            <Link
              href="/login"
              className="hidden md:inline-flex text-[12px] text-[var(--apple-ink-secondary)] hover:text-[var(--apple-ink)] px-2"
            >
              {v2.nav.login}
            </Link>
            {!isUnlocked ? (
              <button
                onClick={() => handleCheckout("blitz")}
                disabled={loadingPlan !== null}
                className="px-3 sm:px-3.5 py-1.5 rounded-full lp-btn-primary text-[12px] font-medium transition cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                {loadingPlan === "blitz" ? (
                  t.pricing.loadingCheckout
                ) : (
                  <>
                    <span className="sm:hidden">{locale === "zh" ? "50+ 外链 $39" : "50+ Blitz ($39)"}</span>
                    <span className="hidden sm:inline">{t.warRoom.buyFixPack}</span>
                  </>
                )}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--apple-green-soft)] text-[var(--apple-green)] text-[12px] font-medium">
                <Unlock className="w-3.5 h-3.5" /> {t.warRoom.fullPackUnlocked} ({unlockedPlan})
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {postCheckoutPrompt && !isUnlocked && (
          <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-3">
            <p className="text-[14px] font-semibold text-[var(--apple-ink)]">
              {t.warRoom.postCheckoutTitle}
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!claimEmail.includes("@")) return;
                const r = await fetch("/api/portal/lookup", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: claimEmail.trim(), slug: report.slug }),
                });
                const d = await r.json();
                setClaimFeedback(d.message || t.warRoom.magicLinkSentFallback);
              }}
              className="flex flex-col sm:flex-row gap-2 max-w-lg"
            >
              <input
                type="email"
                value={claimEmail}
                onChange={(e) => setClaimEmail(e.target.value)}
                placeholder={t.warRoom.claimEmailPlaceholder}
                className="flex-1 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2 text-[16px] sm:text-[13px] text-[var(--apple-ink)]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-full lp-btn-primary text-[13px] font-medium cursor-pointer"
              >
                {t.warRoom.sendMagicLinkBtn}
              </button>
            </form>
            {claimFeedback && (
              <p className="text-[12px] text-[var(--apple-green)]">{claimFeedback}</p>
            )}
          </div>
        )}

        {isUnlocked && (
          <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[var(--apple-green)] shrink-0" />
            <p className="text-[13px] text-[var(--apple-ink-secondary)]">
              <strong className="text-[var(--apple-ink)]">{t.warRoom.paymentVerifiedStrong}</strong>{" "}
              {t.warRoom.paymentVerifiedBodyPrefix} <code>/llms.txt</code>{" "}
              {t.warRoom.paymentVerifiedBodyMid} {report.buyerLeads.length}{" "}
              {t.warRoom.paymentVerifiedBodySuffix}
            </p>
          </div>
        )}

        {/* 1. 顶部专属诊断摘要 + 四维评分 */}
        <section className="grid lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-8 rounded-[22px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <span className="font-semibold text-[var(--apple-blue)]">
                  {t.warRoom.exclusivePrefix} {report.productName}
                </span>
                <span className="text-[var(--apple-ink-tertiary)]">
                  · {t.warRoom.passiveScan} · {new Date(report.scannedAt).toISOString().slice(0, 10)}
                </span>
              </div>
              <h1 className="apple-display text-2xl sm:text-4xl font-semibold text-[var(--apple-ink)] leading-tight">
                {report.productName} {t.warRoom.teardownHeadingSuffix}
              </h1>
              <p className="text-[14px] sm:text-[15px] text-[var(--apple-ink-secondary)] leading-relaxed max-w-3xl">
                {t.warRoom.introPrefix}{" "}
                <span className="text-[var(--apple-ink)] font-medium">{report.domain}</span>{" "}
                {t.warRoom.introMid1}
                <code className="text-[var(--apple-blue)]">/llms.txt</code> {t.warRoom.introMid2}{" "}
                <strong className="text-[var(--apple-ink)]">
                  {report.buyerLeads.length} {t.warRoom.introThreadsUnit}
                </strong>{" "}
                {t.warRoom.introSuffix}
              </p>
            </div>

            <div className="pt-5 border-t border-[var(--apple-border)] flex flex-wrap gap-2">
              {report.passedChecks.map((check) => (
                <span
                  key={check}
                  className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full bg-[var(--apple-bg-alt)] border border-[var(--apple-border)] text-[var(--apple-ink-secondary)]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--apple-green-dot)]" />
                  {localizePassedCheck(check, locale)}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 rounded-[22px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[12px] text-[var(--apple-ink-secondary)]">
                  {t.warRoom.readiness}
                </p>
                <div className="mt-1 flex items-baseline gap-1 tabular-nums">
                  <span className="apple-display text-5xl font-semibold text-[var(--apple-ink)]">
                    {report.overallScore}
                  </span>
                  <span className="text-[15px] text-[var(--apple-ink-tertiary)]">/ 100</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--apple-red-soft)] text-[var(--apple-red)] tabular-nums">
                {report.leaks.length} {t.warRoom.leaksFound}
              </span>
            </div>

            <div className="mt-5 space-y-3 text-[12px] tabular-nums">
              {[
                { label: t.warRoom.subScoreAi, val: report.subScores.aiSearchVisibility },
                { label: t.warRoom.subScoreSeo, val: report.subScores.seoAndSchema },
                { label: t.warRoom.subScoreUx, val: report.subScores.conversionAndUx },
                { label: t.warRoom.subScoreSec, val: report.subScores.securityBaseline },
              ].map((row) => (
                <div key={row.label} className="space-y-1.5">
                  <div className="flex justify-between text-[var(--apple-ink-secondary)]">
                    <span>{row.label}</span>
                    <span className="font-mono font-medium text-[var(--apple-ink)]">
                      {row.val}/100
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--apple-bg-alt)] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${row.val}%`,
                        backgroundColor:
                          row.val < 55
                            ? "var(--apple-red-dot)"
                            : row.val < 80
                            ? "var(--apple-orange-dot)"
                            : "var(--apple-green-dot)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. 80 秒实机拆解视频播放器（无悬浮浮窗遮挡） */}
        <section className="rounded-[24px] border border-[var(--apple-border)] bg-[var(--apple-surface)] overflow-hidden shadow-[var(--apple-shadow)]">
          <div className="px-5 py-3.5 border-b border-[var(--apple-border)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-[var(--apple-blue)] fill-[var(--apple-blue)]" />
              <span className="text-[14px] font-semibold text-[var(--apple-ink)]">
                {report.videoDurationSeconds}
                {t.warRoom.videoTitleMid} {report.productName}
              </span>
              <span className="text-[12px] text-[var(--apple-ink-tertiary)] hidden sm:inline">
                {t.warRoom.videoSpecs}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
              {[
                { label: t.warRoom.ch1, ratio: 0 },
                { label: `02 · ${report.leaks.length} ${t.warRoom.ch2Suffix}`, ratio: 0.22 },
                { label: t.warRoom.ch3, ratio: 0.58 },
                { label: t.warRoom.ch4, ratio: 0.84 },
              ].map((ch) => (
                <button
                  key={ch.label}
                  onClick={() => jumpToChapter(ch.ratio)}
                  className="px-2.5 py-1 rounded-full bg-[var(--apple-bg-alt)] hover:bg-[var(--apple-active)] border border-[var(--apple-border)] text-[var(--apple-ink-secondary)] hover:text-[var(--apple-ink)] transition cursor-pointer"
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-black aspect-video w-full">
            <video
              ref={videoRef}
              controls
              playsInline
              preload="metadata"
              poster={report.posterUrl}
              onTimeUpdate={(e) => {
                const sec = Math.floor(e.currentTarget.currentTime || 0);
                if (sec >= lastReportedSecRef.current + 10) {
                  lastReportedSecRef.current = sec;
                  trackEvent("video_progress", sec);
                }
              }}
              onEnded={(e) => {
                trackEvent(
                  "video_progress",
                  Math.round(e.currentTarget.duration || report.videoDurationSeconds)
                );
              }}
              className="w-full h-full object-contain"
            >
              <source src={report.videoUrl} type="video/mp4" />
              {t.warRoom.videoUnsupported}
            </video>
          </div>
        </section>

        {checkoutError && (
          <div className="rounded-2xl bg-[var(--apple-red-soft)] px-4 py-3 text-[13px] text-[var(--apple-red)]">
            {checkoutError}
          </div>
        )}

        {/* 3. 左右双栏主内容 */}
        <section className="grid lg:grid-cols-12 gap-7 items-start">
          {/* 左栏：诊断与随赠修复 */}
          <div className="lg:col-span-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="apple-display text-[20px] font-semibold text-[var(--apple-ink)]">
                {t.warRoom.leaksSection}
              </h2>
              <span className="text-[12px] text-[var(--apple-ink-tertiary)]">
                {t.warRoom.passiveBadge}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-3">
              <div className="col-span-2 rounded-xl overflow-hidden border border-[var(--apple-border)] bg-[var(--apple-bg-alt)]">
                <img
                  src={report.heroScreenshotUrl}
                  alt={`${report.productName} desktop capture`}
                  className="w-full h-36 object-cover object-top"
                />
              </div>
              <div className="col-span-1 rounded-xl overflow-hidden border border-[var(--apple-border)] bg-[var(--apple-bg-alt)]">
                <img
                  src={report.mobileScreenshotUrl}
                  alt={`${report.productName} mobile capture`}
                  className="w-full h-36 object-cover object-top"
                />
              </div>
            </div>

            <div className="space-y-4">
              {report.leaks.map((leak, idx) => (
                <div
                  key={leak.id}
                  className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1.5 font-medium text-[var(--apple-ink-secondary)]">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            leak.severity === "critical"
                              ? "var(--apple-red-dot)"
                              : "var(--apple-orange-dot)",
                        }}
                      />
                      {localizeSeverity(leak.severity, locale)} ·{" "}
                      {localizeCategory(leak.category, locale)}
                    </span>
                    <span className="font-mono text-[var(--apple-ink-tertiary)]">
                      {t.warRoom.leakTagPrefix}
                      {idx + 1}
                    </span>
                  </div>

                  <h3 className="text-[15px] font-semibold text-[var(--apple-ink)] leading-snug">
                    {localizeLeakTitle(leak.title, locale)}
                  </h3>
                  <p className="text-[12px] font-mono text-[var(--apple-ink-secondary)] bg-[var(--apple-bg-alt)] border border-[var(--apple-border)] rounded-xl p-3 leading-relaxed break-words">
                    {leak.evidence}
                  </p>
                  <p className="text-[12px] text-[var(--apple-ink-secondary)]">
                    <strong className="text-[var(--apple-ink)]">{t.warRoom.impactPrefix}</strong>{" "}
                    {localizeLeakImpact(leak.impactEstimate, locale)}
                  </p>

                  {/* 随赠修复指令区（干净半透明磨砂，亮暗双模式高对比可读） */}
                  <div className="pt-2 border-t border-[var(--apple-border)]">
                    {isUnlocked ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="font-medium text-[var(--apple-blue)]">
                            {t.warRoom.readyPromptLabel}
                          </span>
                          <button
                            onClick={() => copyText(leak.id, leak.cursorFixPrompt)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[var(--apple-border-strong)] hover:bg-[var(--apple-hover)] text-[var(--apple-ink)] cursor-pointer"
                          >
                            {copiedId === leak.id ? (
                              <>
                                <Check className="w-3 h-3" /> {t.common.copied}
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> {t.common.copyPrompt}
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="text-[12px] font-mono text-[var(--apple-ink)] bg-[var(--apple-bg-alt)] border border-[var(--apple-border)] rounded-xl p-3 whitespace-pre-wrap">
                          {leak.cursorFixPrompt}
                        </pre>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-[var(--apple-bg-alt)] border border-[var(--apple-border)] px-3.5 py-2.5 flex items-center justify-between gap-2">
                        <span className="text-[12px] text-[var(--apple-ink-secondary)] inline-flex items-center gap-1.5 truncate">
                          <Lock className="w-3.5 h-3.5 text-[var(--apple-ink-tertiary)] shrink-0" />
                          <span className="truncate">{t.warRoom.lockedPromptLabel}</span>
                        </span>
                        <button
                          onClick={() => handleCheckout("blitz")}
                          disabled={loadingPlan !== null}
                          className="text-[12px] font-medium text-[var(--apple-blue)] hover:underline cursor-pointer shrink-0"
                        >
                          {t.warRoom.unlockBlitzShort}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[var(--apple-ink)]">
                  {t.warRoom.generatedLlmsTitle} {report.domain}
                </span>
                {isUnlocked && (
                  <button
                    onClick={() => copyText("llms-txt", report.generatedLlmsTxtPreview)}
                    className="text-[12px] text-[var(--apple-blue)] hover:underline cursor-pointer"
                  >
                    {copiedId === "llms-txt" ? t.common.copiedBang : t.common.copyFile}
                  </button>
                )}
              </div>
              <div className="relative rounded-xl overflow-hidden border border-[var(--apple-border)] bg-[var(--apple-bg-alt)]">
                <pre
                  className={`text-[12px] font-mono text-[var(--apple-ink-secondary)] p-3.5 whitespace-pre-wrap ${
                    !isUnlocked ? "blur-[4px] select-none" : ""
                  }`}
                >
                  {report.generatedLlmsTxtPreview}
                </pre>
                {!isUnlocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center apple-glass p-4 text-center gap-2.5">
                    <p className="text-[12px] text-[var(--apple-ink)] font-medium">
                      {t.warRoom.llmsOverlayDescPrefix} <code>public/llms.txt</code>{" "}
                      {t.warRoom.llmsOverlayDescSuffix}
                    </p>
                    <button
                      onClick={() => handleCheckout("blitz")}
                      disabled={loadingPlan !== null}
                      className="px-4 py-2 rounded-full lp-btn-primary text-[12px] font-medium transition cursor-pointer"
                    >
                      {loadingPlan === "blitz"
                        ? t.pricing.loadingCheckout
                        : t.warRoom.unlockBlitzLong}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右栏：真实活跃买家原帖 */}
          <div className="lg:col-span-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="apple-display text-[20px] font-semibold text-[var(--apple-ink)]">
                {t.warRoom.buyersSection} ({report.buyerLeads.length})
              </h2>
              <span className="text-[12px] font-medium text-[var(--apple-blue)]">
                {t.warRoom.first3Free}
              </span>
            </div>

            <div className="space-y-3.5">
              {unlockedLeads.map((lead, idx) => (
                <div
                  key={lead.id}
                  className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1.5 font-medium text-[var(--apple-blue)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--apple-green-dot)]" />#
                      {idx + 1} {t.warRoom.unlockedTag} · {lead.source}
                    </span>
                    <span className="text-[var(--apple-ink-tertiary)] tabular-nums">
                      {t.warRoom.intentLabel} {lead.intentScore}% · {lead.postedAt}
                    </span>
                  </div>

                  <h3 className="text-[15px] font-semibold text-[var(--apple-ink)] leading-snug">
                    {decodeHtmlEntities(lead.title)}
                  </h3>
                  <p className="text-[13px] text-[var(--apple-ink-secondary)] leading-relaxed">
                    {decodeHtmlEntities(lead.excerpt)}
                  </p>

                  <div className="pt-2.5 flex items-center justify-between gap-3 border-t border-[var(--apple-border)]">
                    <span className="text-[12px] text-[var(--apple-ink-tertiary)]">
                      {t.warRoom.authorLabel}{" "}
                      <strong className="text-[var(--apple-ink)] font-medium">{lead.author}</strong>
                    </span>
                    <a
                      href={lead.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackEvent("buyer_click")}
                      className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--apple-blue)] hover:underline"
                    >
                      {t.warRoom.openThread} <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {lockedLeads.length > 0 && (
              <div className="rounded-[22px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-6 space-y-5 shadow-[var(--apple-shadow)]">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-[var(--apple-ink)]">
                    {t.warRoom.moreQueuedPrefix} {lockedLeads.length} {t.warRoom.moreQueuedSuffix}
                  </span>
                  <span className="text-[var(--apple-ink-tertiary)]">{t.warRoom.updatedDaily}</span>
                </div>

                <div className="space-y-2">
                  {lockedLeads.slice(0, 4).map((lead) => (
                    <div
                      key={lead.id}
                      className="rounded-xl border border-[var(--apple-border)] bg-[var(--apple-bg-alt)] p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-[11px] text-[var(--apple-ink-tertiary)]">
                          {lead.source} · {lead.postedAt} · {t.warRoom.intentLabel}{" "}
                          {lead.intentScore}%
                        </p>
                        <p className="text-[12px] text-[var(--apple-ink-secondary)] truncate blur-[4px] select-none">
                          {decodeHtmlEntities(lead.title)}
                        </p>
                      </div>
                      <Lock className="w-3.5 h-3.5 text-[var(--apple-ink-tertiary)] shrink-0" />
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-[var(--apple-border)] space-y-3">
                  <div className="rounded-[18px] border-2 border-[var(--apple-blue)] bg-[var(--apple-bg)] p-5 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-[var(--apple-blue)]">
                          {t.warRoom.mostPopular}
                        </span>
                        <h4 className="apple-display text-[18px] font-semibold text-[var(--apple-ink)]">
                          {t.warRoom.radarTitle}
                        </h4>
                      </div>
                      <div className="text-right tabular-nums">
                        <span className="apple-display text-2xl font-semibold text-[var(--apple-ink)]">
                          $29
                        </span>
                        <span className="text-[12px] text-[var(--apple-ink-tertiary)]">
                          {t.warRoom.perMonth}
                        </span>
                      </div>
                    </div>
                    <ul className="text-[13px] text-[var(--apple-ink-secondary)] space-y-1.5">
                      <li>
                        {t.warRoom.radarBullet1Prefix} {report.buyerLeads.length}{" "}
                        {t.warRoom.radarBullet1Suffix}
                      </li>
                      <li>{t.warRoom.radarBullet2}</li>
                      <li>
                        {t.warRoom.radarBullet3Prefix} {report.productName}
                        {t.warRoom.radarBullet3Suffix}
                      </li>
                      <li>{t.warRoom.radarBullet4}</li>
                    </ul>
                    <button
                      onClick={() => handleCheckout("radar")}
                      disabled={loadingPlan !== null}
                      className="w-full py-2.5 rounded-full lp-btn-primary font-medium text-[14px] transition cursor-pointer disabled:opacity-60 min-h-[42px]"
                    >
                      {loadingPlan === "radar" ? t.pricing.loadingCheckout : t.warRoom.unlockAll}
                    </button>
                  </div>

                  <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-bg-alt)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-semibold text-[var(--apple-ink)]">
                        {t.pricing.fixLabel}
                      </p>
                      <p className="text-[12px] text-[var(--apple-ink-secondary)]">
                        {t.warRoom.blitzCardDesc}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCheckout("blitz")}
                      disabled={loadingPlan !== null}
                      className="shrink-0 px-4 py-2 rounded-full lp-btn-inverse font-medium text-[13px] transition cursor-pointer disabled:opacity-60"
                    >
                      {loadingPlan === "blitz" ? t.pricing.loadingCheckout : t.warRoom.buyFixPack}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--apple-border)] py-8 mt-12 text-[12px] text-[var(--apple-ink-tertiary)]">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            {t.common.passiveFooterNote} · {t.common.questionsPrefix}{" "}
            <a
              href={`mailto:hello@statementflow.win?subject=${encodeURIComponent(
                `Question about ${report.productName} LaunchPulse teardown`
              )}`}
              className="text-[var(--apple-blue)] hover:underline"
            >
              hello@statementflow.win
            </a>
          </p>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-[var(--apple-ink)]">
              {t.common.runFreeScan}
            </Link>
            <Link href="/privacy" className="hover:text-[var(--apple-ink)]">
              {t.common.privacy}
            </Link>
            <Link href="/terms" className="hover:text-[var(--apple-ink)]">
              {t.common.terms}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
