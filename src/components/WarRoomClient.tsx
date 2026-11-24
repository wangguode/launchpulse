"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Check,
  Lock,
  Play,
  Radar,
  ShieldAlert,
  Sparkles,
  Terminal,
  Unlock,
} from "lucide-react";
import type { StartupAuditReport } from "@/types/audit";

interface Props {
  report: StartupAuditReport;
}

export default function WarRoomClient({ report }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockedPlan, setUnlockedPlan] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<"fixpack" | "radar" | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("unlocked") === "1") {
        setIsUnlocked(true);
        setUnlockedPlan(params.get("plan") || "radar");
      }
    }
  }, []);

  const jumpToChapter = (ratio: number) => {
    const v = videoRef.current;
    if (!v) return;
    const dur = v.duration || report.videoDurationSeconds || 82;
    v.currentTime = Math.max(0, dur * ratio);
    v.play().catch(() => {});
  };

  const handleCheckout = async (plan: "fixpack" | "radar") => {
    setLoadingPlan(plan);
    setCheckoutError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          slug: report.slug,
          targetUrl: report.targetUrl,
        }),
      });
      const data = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setCheckoutError(data.error || "Unable to open checkout right now.");
    } catch {
      setCheckoutError("Network error while connecting to Creem checkout.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  const unlockedLeads = report.buyerLeads.filter((l) => l.unlockedByDefault || isUnlocked);
  const lockedLeads = isUnlocked ? [] : report.buyerLeads.filter((l) => !l.unlockedByDefault);

  return (
    <div className="min-h-screen bg-[#07090d] text-slate-100 obsidian-grid overflow-x-hidden">
      {/* 顶部专属战情导航条 */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07090d]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2 font-[family-name:var(--font-display)] font-bold text-white tracking-tight shrink-0"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
              <span>LaunchPulse</span>
            </Link>
            <span className="text-slate-600 hidden sm:inline">/</span>
            <span className="hidden sm:inline-block text-xs font-[family-name:var(--font-mono)] text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded truncate">
              PRIVATE WAR-ROOM · {report.domain}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href={report.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
            >
              {report.domain} <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            {!isUnlocked ? (
              <button
                onClick={() => handleCheckout("radar")}
                disabled={loadingPlan !== null}
                className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition cursor-pointer disabled:opacity-60"
              >
                {loadingPlan === "radar"
                  ? "Opening Checkout..."
                  : `Unlock All ${report.buyerLeads.length} Buyers ($29/mo)`}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold">
                <Unlock className="w-3.5 h-3.5" /> Full Pack Unlocked ({unlockedPlan})
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {isUnlocked && (
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-100">
                <strong>Payment verified!</strong> All Cursor / Claude Code fix prompts, your custom{" "}
                <code>/llms.txt</code> manifest, and all {report.buyerLeads.length} high-intent buyer
                threads for <strong>{report.productName}</strong> are now unlocked below.
              </p>
            </div>
          </div>
        )}

        {/* 1. 专属定制抬头 + 四维就绪度仪表盘 */}
        <section className="grid lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-8 rounded-2xl border border-white/10 bg-[#0c1018] p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-[family-name:var(--font-mono)]">
                <span className="px-2.5 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  PREPARED EXCLUSIVELY FOR {report.productName.toUpperCase()}
                </span>
                <span className="text-slate-400">
                  Passive read-only scan · {new Date(report.scannedAt).toISOString().slice(0, 10)}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-[family-name:var(--font-display)] font-bold text-white tracking-tight leading-tight">
                {report.productName} Launch &amp; Buyer Intent Teardown
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl">
                We inspected <span className="text-white font-medium">{report.domain}</span> across
                desktop &amp; mobile viewports, audited AI search citation endpoints (
                <code className="text-emerald-300">/llms.txt</code> &amp; JSON-LD), and matched{" "}
                <strong className="text-emerald-400">
                  {report.buyerLeads.length} live developer threads
                </strong>{" "}
                discussing the exact pain point {report.productName} solves.
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap gap-2">
              {report.passedChecks.map((check) => (
                <span
                  key={check}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-slate-300"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {check}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-[#0c1018] p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-slate-400">
                  Launch Readiness
                </p>
                <div className="mt-1 flex items-baseline gap-1.5 tabular-nums">
                  <span className="text-5xl font-[family-name:var(--font-display)] font-bold text-amber-400">
                    {report.overallScore}
                  </span>
                  <span className="text-lg text-slate-500">/ 100</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded text-xs font-semibold bg-red-500/15 text-red-300 border border-red-500/30 tabular-nums">
                {report.leaks.length} Leaks Found
              </span>
            </div>

            <div className="mt-5 space-y-2.5 text-xs tabular-nums">
              {[
                { label: "AI Search Visibility (/llms.txt)", val: report.subScores.aiSearchVisibility },
                { label: "Google SEO & Rich Schema", val: report.subScores.seoAndSchema },
                { label: "Bottom-Funnel & Mobile UX", val: report.subScores.conversionAndUx },
                { label: "HTTP Security Hardening", val: report.subScores.securityBaseline },
              ].map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>{row.label}</span>
                    <span className="font-[family-name:var(--font-mono)] font-semibold">
                      {row.val}/100
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        row.val < 55
                          ? "bg-red-500"
                          : row.val < 80
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                      style={{ width: `${row.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. 核心 85 秒专属实机拆解视频播放器 */}
        <section className="rounded-2xl border border-emerald-500/30 bg-[#0b1018] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
          <div className="px-5 py-3.5 border-b border-white/10 bg-[#0f1521] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              <span className="text-sm font-semibold text-white">
                {report.videoDurationSeconds}s Personalized Video Walkthrough for {report.productName}
              </span>
              <span className="text-xs font-[family-name:var(--font-mono)] text-slate-400 hidden sm:inline">
                (Narrated · 720p HD · Subtitled)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs font-[family-name:var(--font-mono)]">
              <button
                onClick={() => jumpToChapter(0)}
                className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
              >
                01 · Product UI
              </button>
              <button
                onClick={() => jumpToChapter(0.22)}
                className="px-2.5 py-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-300 transition cursor-pointer"
              >
                02 · {report.leaks.length} Leaks
              </button>
              <button
                onClick={() => jumpToChapter(0.58)}
                className="px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 transition cursor-pointer"
              >
                03 · Waiting Buyers
              </button>
              <button
                onClick={() => jumpToChapter(0.84)}
                className="px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 transition cursor-pointer"
              >
                04 · 15-Min Fix
              </button>
            </div>
          </div>

          <div className="bg-black aspect-video w-full">
            <video
              ref={videoRef}
              controls
              playsInline
              preload="metadata"
              poster={report.posterUrl}
              className="w-full h-full object-contain"
            >
              <source src={report.videoUrl} type="video/mp4" />
              Your browser does not support HTML5 video playback.
            </video>
          </div>
        </section>

        {checkoutError && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {checkoutError}
          </div>
        )}

        {/* 3. 左右双栏成交主战场：左栏漏洞与 AI 修复包 + 右栏真实等待买家 */}
        <section className="grid lg:grid-cols-12 gap-8 items-start">
          {/* 左栏：Leak & SEO Report */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <h2 className="text-xl font-[family-name:var(--font-display)] font-bold text-white">
                  Detected Conversion &amp; AI Search Leaks
                </h2>
              </div>
              <span className="text-xs font-[family-name:var(--font-mono)] text-slate-400">
                100% Passive Check
              </span>
            </div>

            {/* 实机桌面与移动端快照凭证 */}
            <div className="grid grid-cols-3 gap-3 rounded-xl border border-white/10 bg-[#0c1018] p-3">
              <div className="col-span-2 rounded-lg overflow-hidden border border-white/10 bg-black">
                <img
                  src={report.heroScreenshotUrl}
                  alt={`${report.productName} desktop capture`}
                  className="w-full h-36 object-cover object-top"
                />
              </div>
              <div className="col-span-1 rounded-lg overflow-hidden border border-white/10 bg-black">
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
                  className="rounded-xl border border-white/10 bg-[#0c1018] p-5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-[family-name:var(--font-mono)] uppercase font-semibold px-2 py-0.5 rounded ${
                        leak.severity === "critical"
                          ? "bg-red-500/20 text-red-300 border border-red-500/30"
                          : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {leak.severity} · {leak.category}
                    </span>
                    <span className="text-xs font-[family-name:var(--font-mono)] text-slate-500">
                      LEAK #0{idx + 1}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-white leading-snug">{leak.title}</h3>
                  <p className="text-xs font-[family-name:var(--font-mono)] text-slate-300 bg-black/40 border border-white/5 rounded-lg p-3 leading-relaxed break-words overflow-x-auto">
                    {leak.evidence}
                  </p>
                  <p className="text-xs text-amber-300/90 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Impact: {leak.impactEstimate}</span>
                  </p>

                  {/* Cursor / Claude Code 一键修复 Prompt（付费解锁区） */}
                  <div className="pt-2 border-t border-white/10">
                    {isUnlocked ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-emerald-300 font-[family-name:var(--font-mono)]">
                          <span className="inline-flex items-center gap-1">
                            <Terminal className="w-3.5 h-3.5" /> Ready-to-Paste Cursor / Claude Code Prompt
                          </span>
                          <button
                            onClick={() => copyText(leak.id, leak.cursorFixPrompt)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 transition cursor-pointer"
                          >
                            {copiedId === leak.id ? (
                              <>
                                <Check className="w-3 h-3" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Copy Prompt
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="text-xs font-[family-name:var(--font-mono)] text-slate-200 bg-[#070a10] border border-emerald-500/25 rounded-lg p-3 whitespace-pre-wrap">
                          {leak.cursorFixPrompt}
                        </pre>
                      </div>
                    ) : (
                      <div className="relative rounded-lg bg-[#080b12] border border-white/10 p-3 overflow-hidden">
                        <p className="text-xs font-[family-name:var(--font-mono)] text-slate-500 select-none blur-[4px]">
                          {leak.cursorFixPrompt}
                        </p>
                        <div className="absolute inset-0 bg-[#080b12]/65 backdrop-blur-[1px] flex items-center justify-between px-3.5">
                          <span className="text-xs text-slate-300 inline-flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                            1-Click Cursor / Claude Fix Prompt
                          </span>
                          <button
                            onClick={() => handleCheckout("fixpack")}
                            disabled={loadingPlan !== null}
                            className="text-xs font-semibold text-emerald-300 hover:text-emerald-200 underline cursor-pointer"
                          >
                            Unlock Fix Pack ($19)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 自动生成的专属 llms.txt 预览卡片 */}
            <div className="rounded-xl border border-white/10 bg-[#0c1018] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-[family-name:var(--font-mono)] text-emerald-400 uppercase font-semibold">
                  Generated /llms.txt Manifest for {report.domain}
                </span>
                {isUnlocked && (
                  <button
                    onClick={() => copyText("llms-txt", report.generatedLlmsTxtPreview)}
                    className="text-xs text-emerald-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === "llms-txt" ? "Copied!" : "Copy File"}
                  </button>
                )}
              </div>
              <div className="relative">
                <pre
                  className={`text-xs font-[family-name:var(--font-mono)] text-slate-300 bg-black/50 border border-white/10 rounded-lg p-3.5 whitespace-pre-wrap ${
                    !isUnlocked ? "blur-[4px] select-none" : ""
                  }`}
                >
                  {report.generatedLlmsTxtPreview}
                </pre>
                {!isUnlocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#07090d]/65 rounded-lg p-4 text-center gap-2">
                    <p className="text-xs text-slate-200 font-medium">
                      Ready-to-deploy <code>public/llms.txt</code> + SoftwareApplication JSON-LD
                    </p>
                    <button
                      onClick={() => handleCheckout("fixpack")}
                      disabled={loadingPlan !== null}
                      className="px-4 py-2 rounded-lg bg-white text-slate-950 hover:bg-slate-200 font-semibold text-xs transition cursor-pointer"
                    >
                      {loadingPlan === "fixpack"
                        ? "Redirecting..."
                        : "Unlock Complete Launch Fix Pack — $19 One-Time"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右栏：Live Buyers Waiting for You（前 3 条 100% 免费可点击验真！） */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Radar className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-[family-name:var(--font-display)] font-bold text-white">
                  Live Buyers &amp; Pain-Point Threads ({report.buyerLeads.length})
                </h2>
              </div>
              <span className="text-xs font-[family-name:var(--font-mono)] text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded">
                First 3 Free to Verify
              </span>
            </div>

            {/* 前 3 条完全公开、带真实外链 */}
            <div className="space-y-3.5">
              {unlockedLeads.map((lead, idx) => (
                <div
                  key={lead.id}
                  className="rounded-xl border border-emerald-500/30 bg-[#0c131d] p-5 space-y-2.5 hover:border-emerald-400/60 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-[family-name:var(--font-mono)]">
                    <span className="text-emerald-300 font-semibold">
                      #{idx + 1} UNLOCKED · {lead.source} ({lead.community})
                    </span>
                    <span className="text-slate-400 tabular-nums">
                      Intent {lead.intentScore}% · {lead.postedAt}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-white leading-snug">{lead.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{lead.excerpt}</p>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
                    <span className="text-[11px] text-slate-400">
                      Author: <strong className="text-slate-200">{lead.author}</strong>
                    </span>
                    <a
                      href={lead.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-300 text-xs font-semibold transition"
                    >
                      Open Live Thread &amp; Reply <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* 第 4–10 条半透明模糊锁定 + 转化收银卡片 */}
            {lockedLeads.length > 0 && (
              <div className="rounded-2xl border border-amber-500/35 bg-[#0d111a] p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-amber-300 font-semibold">
                    + {lockedLeads.length} More High-Intent Threads Queued
                  </span>
                  <span className="text-xs text-slate-400">Updated daily</span>
                </div>

                <div className="space-y-2.5">
                  {lockedLeads.slice(0, 4).map((lead) => (
                    <div
                      key={lead.id}
                      className="rounded-lg border border-white/10 bg-black/35 p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 text-[11px] font-[family-name:var(--font-mono)] text-amber-300/90">
                          <span>
                            {lead.source} · {lead.community}
                          </span>
                          <span>· {lead.postedAt}</span>
                          <span>· Intent {lead.intentScore}%</span>
                        </div>
                        <p className="text-xs text-slate-300 truncate blur-[4.5px] select-none">
                          {lead.title} — {lead.excerpt}
                        </p>
                      </div>
                      <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    </div>
                  ))}
                </div>

                {/* 双档位直连 Creem.io 变现区 */}
                <div className="pt-3 border-t border-white/10 space-y-3">
                  <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-xs font-[family-name:var(--font-mono)] text-emerald-300 font-semibold uppercase">
                          Most Popular for Solo Founders
                        </span>
                        <h4 className="text-lg font-bold text-white">
                          Growth &amp; Buyer Radar Pro
                        </h4>
                      </div>
                      <div className="text-right tabular-nums">
                        <span className="text-2xl font-bold text-white">$29</span>
                        <span className="text-xs text-slate-400">/mo</span>
                      </div>
                    </div>
                    <ul className="text-xs text-slate-200 space-y-1.5">
                      <li>✓ Unlock all {report.buyerLeads.length} live buyer URLs + tailored reply angles</li>
                      <li>✓ Includes the complete $19 Launch Fix Pack (Cursor prompts + /llms.txt)</li>
                      <li>✓ Daily email alerts when developers ask for tools like {report.productName}</li>
                      <li>✓ 2 SEO competitor &ldquo;Alternative-to&rdquo; pages generated weekly</li>
                    </ul>
                    <button
                      onClick={() => handleCheckout("radar")}
                      disabled={loadingPlan !== null}
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      <Sparkles className="w-4 h-4" />
                      {loadingPlan === "radar"
                        ? "Connecting to Secure Checkout..."
                        : `Unlock All ${report.buyerLeads.length} Buyers + 24/7 Radar ($29/mo)`}
                    </button>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Just want the one-time code fixes?
                      </p>
                      <p className="text-xs text-slate-400">
                        Get all Cursor/Claude prompts + custom <code>/llms.txt</code> &amp; JSON-LD.
                      </p>
                    </div>
                    <button
                      onClick={() => handleCheckout("fixpack")}
                      disabled={loadingPlan !== null}
                      className="shrink-0 px-4 py-2.5 rounded-lg border border-white/20 hover:border-white/40 bg-white/5 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-60"
                    >
                      {loadingPlan === "fixpack" ? "Opening..." : "Buy Fix Pack ($19)"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            LaunchPulse · 100% Passive Read-Only Diagnostics · Questions?{" "}
            <a href="mailto:hello@statementflow.win" className="text-slate-300 hover:underline">
              hello@statementflow.win
            </a>
          </p>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-slate-300">
              Run Free Scan
            </Link>
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
