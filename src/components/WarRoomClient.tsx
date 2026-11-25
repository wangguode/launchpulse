"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  IconArrowUpRight,
  IconCheck,
  IconCopy,
  IconLock,
  IconLockOpen,
  IconPlayerPlay,
} from "@tabler/icons-react";
import type { StartupAuditReport } from "@/types/audit";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
 * 官方 shadcn/ui 专属诊断战情页（/audit/[slug] 与 /audit/live?s=slug）
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
      toast.success(locale === "zh" ? "已复制到剪贴板" : "Copied");
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // ignore
    }
  };

  const unlockedLeads = report.buyerLeads.filter((l) => l.unlockedByDefault || isUnlocked);
  const lockedLeads = isUnlocked ? [] : report.buyerLeads.filter((l) => !l.unlockedByDefault);

  return (
    <div className="min-h-screen bg-transparent text-foreground overflow-x-hidden">
      <div className="sticky top-3 z-40 px-4 sm:px-6">
        <header className="lp-frosted-topbar mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-2xl px-4 sm:px-5">
          <div className="flex items-center gap-2.5 text-sm min-w-0">
            <Link href="/" className="flex items-center gap-2.5 font-semibold text-[15px] tracking-tight shrink-0">
              <div className="lp-btn-bevel flex size-8 items-center justify-center rounded-[10px]">
                <BrandMark className="size-4" tone="light" />
              </div>
              <span className="hidden sm:inline">LaunchPulse</span>
            </Link>
            <span className="text-muted-foreground opacity-50 hidden sm:inline">/</span>
            <span className="hidden sm:inline font-mono text-xs text-muted-foreground truncate">{report.domain}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <LangSwitcher />
            <ThemeModeToggle />
            <Button variant="ghost" size="sm" className="hidden md:inline-flex text-xs" render={<Link href="/login" />}>
              {v2.nav.login}
            </Button>
            {!isUnlocked ? (
              <Button size="sm" disabled={loadingPlan !== null} onClick={() => handleCheckout("blitz")}>
                {loadingPlan === "blitz" ? t.pricing.loadingCheckout : locale === "zh" ? "开通启动包 $39" : "Start $39"}
              </Button>
            ) : (
              <Badge variant="success" className="gap-1">
                <IconLockOpen className="size-3.5" />
                {t.warRoom.fullPackUnlocked} ({unlockedPlan})
              </Badge>
            )}
          </div>
        </header>
      </div>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
        {postCheckoutPrompt && !isUnlocked && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t.warRoom.postCheckoutTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!claimEmail.includes("@")) return;
                  const r = await fetch("/api/portal/lookup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: claimEmail.trim(), slug: report.slug }),
                  });
                  const d = (await r.json()) as { message?: string };
                  setClaimFeedback(d.message || t.warRoom.magicLinkSentFallback);
                }}
                className="flex flex-col sm:flex-row gap-2 max-w-lg"
              >
                <Input
                  type="email"
                  value={claimEmail}
                  onChange={(e) => setClaimEmail(e.target.value)}
                  placeholder={t.warRoom.claimEmailPlaceholder}
                />
                <Button type="submit">{t.warRoom.sendMagicLinkBtn}</Button>
              </form>
              {claimFeedback && <p className="text-xs text-emerald-600 dark:text-emerald-400">{claimFeedback}</p>}
            </CardContent>
          </Card>
        )}

        {isUnlocked && (
          <Card className="border-emerald-500/40">
            <CardContent className="p-4 flex items-center gap-3 text-sm">
              <IconCheck className="size-5 text-emerald-500 shrink-0" />
              <p className="text-muted-foreground">
                <strong className="text-foreground">{t.warRoom.paymentVerifiedStrong}</strong>{" "}
                {t.warRoom.paymentVerifiedBodyPrefix} <code>/llms.txt</code> {t.warRoom.paymentVerifiedBodyMid}{" "}
                {report.buyerLeads.length} {t.warRoom.paymentVerifiedBodySuffix}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 1. 顶部专属诊断摘要 + 四维评分 */}
        <section className="grid lg:grid-cols-12 gap-5 items-stretch">
          <Card className="lg:col-span-8 flex flex-col justify-between">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary">
                  {t.warRoom.exclusivePrefix} {report.productName}
                </Badge>
                <span className="text-muted-foreground">
                  · {t.warRoom.passiveScan} · {new Date(report.scannedAt).toISOString().slice(0, 10)}
                </span>
              </div>
              <CardTitle className="text-2xl sm:text-3xl leading-tight">
                {report.productName} {t.warRoom.teardownHeadingSuffix}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {t.warRoom.introPrefix} <strong className="text-foreground">{report.domain}</strong> {t.warRoom.introMid1}
                <code className="text-primary">/llms.txt</code> {t.warRoom.introMid2}{" "}
                <strong className="text-foreground">
                  {report.buyerLeads.length} {t.warRoom.introThreadsUnit}
                </strong>{" "}
                {t.warRoom.introSuffix}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Separator className="mb-4" />
              <div className="flex flex-wrap gap-2">
                {report.passedChecks.map((check) => (
                  <Badge key={check} variant="outline" className="gap-1 font-normal">
                    <IconCheck className="size-3 text-emerald-500" />
                    {localizePassedCheck(check, locale)}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-4 flex flex-col justify-between">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardDescription>{t.warRoom.readiness}</CardDescription>
                <CardTitle className="text-5xl font-bold font-mono tabular-nums mt-1">
                  {report.overallScore}
                  <span className="text-base font-normal text-muted-foreground"> / 100</span>
                </CardTitle>
              </div>
              <Badge variant="destructive" className="tabular-nums">
                {report.leaks.length} {t.warRoom.leaksFound}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-xs tabular-nums">
              {[
                { label: t.warRoom.subScoreAi, val: report.subScores.aiSearchVisibility },
                { label: t.warRoom.subScoreSeo, val: report.subScores.seoAndSchema },
                { label: t.warRoom.subScoreUx, val: report.subScores.conversionAndUx },
                { label: t.warRoom.subScoreSec, val: report.subScores.securityBaseline },
              ].map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-mono font-medium">{row.val}/100</span>
                  </div>
                  <Progress value={row.val} />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* 2. 80 秒实机拆解视频 */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 py-3.5 border-b">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <IconPlayerPlay className="size-4 text-primary" />
              <span>
                {report.videoDurationSeconds}
                {t.warRoom.videoTitleMid} {report.productName}
              </span>
              <span className="text-xs text-muted-foreground font-normal hidden sm:inline">{t.warRoom.videoSpecs}</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: t.warRoom.ch1, ratio: 0 },
                { label: `02 · ${report.leaks.length} ${t.warRoom.ch2Suffix}`, ratio: 0.22 },
                { label: t.warRoom.ch3, ratio: 0.58 },
                { label: t.warRoom.ch4, ratio: 0.84 },
              ].map((ch) => (
                <Button key={ch.label} variant="outline" size="sm" className="h-7 text-xs" onClick={() => jumpToChapter(ch.ratio)}>
                  {ch.label}
                </Button>
              ))}
            </div>
          </CardHeader>
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
                trackEvent("video_progress", Math.round(e.currentTarget.duration || report.videoDurationSeconds));
              }}
              className="w-full h-full object-contain"
            >
              <source src={report.videoUrl} type="video/mp4" />
              {t.warRoom.videoUnsupported}
            </video>
          </div>
        </Card>

        {checkoutError && <p className="text-sm text-destructive">{checkoutError}</p>}

        {/* 3. 左右双栏主内容 */}
        <section className="grid lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">{t.warRoom.leaksSection}</h2>
              <span className="text-xs text-muted-foreground">{t.warRoom.passiveBadge}</span>
            </div>

            <Card>
              <CardContent className="p-3 grid grid-cols-3 gap-3">
                <div className="col-span-2 rounded-md overflow-hidden border bg-muted">
                  <img src={report.heroScreenshotUrl} alt={`${report.productName} desktop`} className="w-full h-36 object-cover object-top" />
                </div>
                <div className="col-span-1 rounded-md overflow-hidden border bg-muted">
                  <img src={report.mobileScreenshotUrl} alt={`${report.productName} mobile`} className="w-full h-36 object-cover object-top" />
                </div>
              </CardContent>
            </Card>

            {report.leaks.map((leak, idx) => (
              <Card key={leak.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <Badge variant={leak.severity === "critical" ? "destructive" : "secondary"}>
                      {localizeSeverity(leak.severity, locale)} · {localizeCategory(leak.category, locale)}
                    </Badge>
                    <span className="font-mono text-muted-foreground">
                      {t.warRoom.leakTagPrefix}
                      {idx + 1}
                    </span>
                  </div>
                  <CardTitle className="text-base pt-1">{localizeLeakTitle(leak.title, locale)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <p className="font-mono text-muted-foreground rounded-md border bg-muted/40 p-3 break-words">{leak.evidence}</p>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">{t.warRoom.impactPrefix}</strong> {localizeLeakImpact(leak.impactEstimate, locale)}
                  </p>
                  <Separator />
                  {isUnlocked ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-primary">{t.warRoom.readyPromptLabel}</span>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => copyText(leak.id, leak.cursorFixPrompt)}>
                          {copiedId === leak.id ? <IconCheck className="size-3.5" /> : <IconCopy className="size-3.5" />}
                          {copiedId === leak.id ? t.common.copied : t.common.copyPrompt}
                        </Button>
                      </div>
                      <pre className="font-mono rounded-md border bg-muted p-3 whitespace-pre-wrap">{leak.cursorFixPrompt}</pre>
                    </div>
                  ) : (
                    <div className="rounded-md border bg-muted/40 px-3 py-2 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground truncate">
                        <IconLock className="size-3.5 shrink-0" />
                        <span className="truncate">{t.warRoom.lockedPromptLabel}</span>
                      </span>
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs shrink-0" onClick={() => handleCheckout("blitz")}>
                        {t.warRoom.unlockBlitzShort}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm">
                  {t.warRoom.generatedLlmsTitle} {report.domain}
                </CardTitle>
                {isUnlocked && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyText("llms-txt", report.generatedLlmsTxtPreview)}>
                    {copiedId === "llms-txt" ? t.common.copiedBang : t.common.copyFile}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="relative rounded-md overflow-hidden border bg-muted/40">
                  <pre className={`text-xs font-mono text-muted-foreground p-3.5 whitespace-pre-wrap ${!isUnlocked ? "blur-[4px] select-none" : ""}`}>
                    {report.generatedLlmsTxtPreview}
                  </pre>
                  {!isUnlocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xs p-4 text-center gap-2.5">
                      <p className="text-xs font-medium">
                        {t.warRoom.llmsOverlayDescPrefix} <code>public/llms.txt</code> {t.warRoom.llmsOverlayDescSuffix}
                      </p>
                      <Button size="sm" disabled={loadingPlan !== null} onClick={() => handleCheckout("blitz")}>
                        {loadingPlan === "blitz" ? t.pricing.loadingCheckout : t.warRoom.unlockBlitzLong}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">
                {t.warRoom.buyersSection} ({report.buyerLeads.length})
              </h2>
              <Badge variant="secondary">{t.warRoom.first3Free}</Badge>
            </div>

            {unlockedLeads.map((lead, idx) => (
              <Card key={lead.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <Badge variant="outline">
                      #{idx + 1} {t.warRoom.unlockedTag} · {lead.source}
                    </Badge>
                    <span className="text-muted-foreground tabular-nums">
                      {t.warRoom.intentLabel} {lead.intentScore}% · {lead.postedAt}
                    </span>
                  </div>
                  <CardTitle className="text-base pt-1">{decodeHtmlEntities(lead.title)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <p className="text-muted-foreground leading-relaxed">{decodeHtmlEntities(lead.excerpt)}</p>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t.warRoom.authorLabel} <strong className="text-foreground">{lead.author}</strong>
                    </span>
                    <a
                      href={lead.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackEvent("buyer_click")}
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      {t.warRoom.openThread}
                      <IconArrowUpRight className="size-3.5" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}

            {lockedLeads.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between text-xs">
                    <CardTitle className="text-sm">
                      {t.warRoom.moreQueuedPrefix} {lockedLeads.length} {t.warRoom.moreQueuedSuffix}
                    </CardTitle>
                    <span className="text-muted-foreground">{t.warRoom.updatedDaily}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {lockedLeads.slice(0, 4).map((lead) => (
                      <div key={lead.id} className="rounded-md border bg-muted/40 p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-[11px] text-muted-foreground">
                            {lead.source} · {lead.postedAt} · {t.warRoom.intentLabel} {lead.intentScore}%
                          </p>
                          <p className="text-xs text-muted-foreground truncate blur-[4px] select-none">
                            {decodeHtmlEntities(lead.title)}
                          </p>
                        </div>
                        <IconLock className="size-3.5 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>

                  <Card className="border-primary">
                    <CardHeader className="pb-2">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <Badge className="mb-1.5">{t.warRoom.mostPopular}</Badge>
                          <CardTitle className="text-base">{t.warRoom.radarTitle}</CardTitle>
                        </div>
                        <div className="text-right tabular-nums">
                          <span className="text-2xl font-bold">$29</span>
                          <span className="text-xs text-muted-foreground">{t.warRoom.perMonth}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs text-muted-foreground">
                      <ul className="space-y-1.5">
                        <li>
                          {t.warRoom.radarBullet1Prefix} {report.buyerLeads.length} {t.warRoom.radarBullet1Suffix}
                        </li>
                        <li>{t.warRoom.radarBullet2}</li>
                        <li>
                          {t.warRoom.radarBullet3Prefix} {report.productName}
                          {t.warRoom.radarBullet3Suffix}
                        </li>
                        <li>{t.warRoom.radarBullet4}</li>
                      </ul>
                      <Button className="w-full" disabled={loadingPlan !== null} onClick={() => handleCheckout("radar")}>
                        {loadingPlan === "radar" ? t.pricing.loadingCheckout : t.warRoom.unlockAll}
                      </Button>
                    </CardContent>
                  </Card>

                  <div className="rounded-lg border bg-muted/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{t.pricing.fixLabel}</p>
                      <p className="text-xs text-muted-foreground">{t.warRoom.blitzCardDesc}</p>
                    </div>
                    <Button variant="outline" size="sm" disabled={loadingPlan !== null} onClick={() => handleCheckout("blitz")}>
                      {loadingPlan === "blitz" ? t.pricing.loadingCheckout : t.warRoom.buyFixPack}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t py-8 mt-12 text-xs text-muted-foreground">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            {t.common.passiveFooterNote} · {t.common.questionsPrefix}{" "}
            <a href="mailto:hello@statementflow.win" className="text-primary hover:underline">
              hello@statementflow.win
            </a>
          </p>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-foreground">
              {t.common.runFreeScan}
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              {t.common.privacy}
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              {t.common.terms}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
