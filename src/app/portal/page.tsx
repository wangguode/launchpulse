"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  Radar,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import { getAllAudits } from "@/data/audits";
import { DISTRIBUTION_DIRECTORIES } from "@/data/directories";
import type { StartupAuditReport } from "@/types/audit";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import DirectoryTable from "@/components/console/DirectoryTable";
import {
  decodeHtmlEntities,
  localizeCategory,
  localizeLeakTitle,
} from "@/lib/i18n";

interface LiveRescanResult {
  domain: string;
  score: number;
  leaksCount: number;
  leaks: Array<{ severity: string; category: string; title: string; evidence: string }>;
}

const DEMO_ACMEFLOW_REPORT: StartupAuditReport = {
  slug: "acmeflow-demo",
  productName: "AcmeFlow (Demo)",
  targetUrl: "https://acmeflow.example",
  domain: "acmeflow.example",
  tagline: "Interactive sample workspace showing what paid founders unlock.",
  scannedAt: "2026-11-24T00:00:00.000Z",
  overallScore: 61,
  subScores: {
    seoAndSchema: 68,
    aiSearchVisibility: 34,
    conversionAndUx: 64,
    securityBaseline: 78,
  },
  videoUrl: "",
  posterUrl: "",
  heroScreenshotUrl: "",
  mobileScreenshotUrl: "",
  videoDurationSeconds: 82,
  passedChecks: ["Indexable robots meta", "Valid XML sitemap"],
  leaks: [
    {
      id: "demo-llms",
      severity: "critical",
      category: "AEO / AI Visibility",
      title: "Missing /llms.txt AI search manifest (HTTP 404)",
      evidence: "GET https://acmeflow.example/llms.txt -> 404 Not Found.",
      impactEstimate: "ChatGPT & Perplexity skip your SaaS in buyer comparisons.",
      fixSummary: "Deploy a structured Markdown /llms.txt at site root.",
      cursorFixPrompt:
        "Create public/llms.txt following llmstxt.org spec summarizing AcmeFlow positioning, core features, pricing tiers, and canonical URLs.",
    },
    {
      id: "demo-schema",
      severity: "high",
      category: "Google SEO",
      title: "Missing SoftwareApplication JSON-LD rich schema",
      evidence: "0 SoftwareApplication JSON-LD blocks detected.",
      impactEstimate: "-20% organic SERP click-through rate.",
      fixSummary: "Add validated SoftwareApplication JSON-LD to root layout.",
      cursorFixPrompt:
        "Add a <script type='application/ld+json'> block with @type SoftwareApplication, offers, and operatingSystem to app/layout.tsx.",
    },
  ],
  generatedLlmsTxtPreview:
    "# AcmeFlow\n\n> Automated workflow orchestration for developer teams.\n\n## Core Capabilities\n- Website: https://acmeflow.example\n- Pricing: $29/mo Pro\n",
  buyerLeads: [
    {
      id: "demo-lead-1",
      source: "Hacker News",
      community: "Ask HN",
      author: "@sample_founder",
      postedAt: "2026-11-22",
      title: "Sample unlocked thread: Looking for a lightweight workflow monitor for small dev teams",
      excerpt:
        "Real paid workspaces unlock all 10+ fresh (<45 days) pain-point discussions with direct reply URLs and tailored non-spam reply angles.",
      url: "https://news.ycombinator.com/",
      intentScore: 95,
      suggestedReplyAngle: "Share a concise technical breakdown without hard-selling.",
      unlockedByDefault: true,
    },
  ],
};

export default function CustomerPortalPage() {
  const { locale, t } = useI18n();
  const sampleAudits = getAllAudits();
  const [emailInput, setEmailInput] = useState("");
  const [activeToken, setActiveToken] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [activeReport, setActiveReport] = useState<StartupAuditReport | null>(null);
  const [liveDirectories, setLiveDirectories] = useState<
    Record<string, { status: "queued" | "submitted" | "live"; liveBacklinkUrl?: string }>
  >({});
  const [activePlanCode, setActivePlanCode] = useState<"blitz" | "radar" | "dfy">("radar");
  const [competitorName, setCompetitorName] = useState("UptimeRobot");
  const [verifiedUnboundEmail, setVerifiedUnboundEmail] = useState<string | null>(null);
  const [bindUrlInput, setBindUrlInput] = useState("");
  const [bindingSite, setBindingSite] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [leadStatuses, setLeadStatuses] = useState<Record<string, "new" | "replied" | "won">>({});
  const [rescanLoading, setRescanLoading] = useState(false);
  const [rescanResult, setRescanResult] = useState<LiveRescanResult | null>(null);
  const [dfyLoading, setDfyLoading] = useState(false);

  const activePlanLabel =
    activePlanCode === "blitz"
      ? t.portal.planBlitzLabel
      : activePlanCode === "dfy"
      ? t.portal.planDfyLabel
      : t.portal.planRadarLabel;

  const startDfyCheckout = async () => {
    if (!activeReport) return;
    setDfyLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "dfy",
          slug: activeReport.slug,
          targetUrl: activeReport.targetUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } finally {
      setDfyLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const demoMode = params.get("demo");
    const token = params.get("token");
    if (demoMode) {
      setActiveReport(DEMO_ACMEFLOW_REPORT);
    } else if (token) {
      setActiveToken(token);
      lookupPortal({ token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lookupPortal = async (payload: { email?: string; token?: string }) => {
    setLoading(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/portal/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.found && data.order) {
        let matched: StartupAuditReport | null =
          sampleAudits.find((a) => a.slug === data.order.slug) || null;
        if (!matched && data.order.slug) {
          try {
            const dynRes = await fetch(`/api/audit/${encodeURIComponent(data.order.slug)}`);
            if (dynRes.ok) {
              matched = (await dynRes.json()) as StartupAuditReport;
            }
          } catch {
            // ignore
          }
        }
        if (matched) {
          setActiveReport(matched);
          setVerifiedUnboundEmail(null);
        } else {
          setActiveReport(null);
          setVerifiedUnboundEmail(data.order.customer_email || emailInput);
        }
        if (Array.isArray(data.directories)) {
          const map: Record<
            string,
            { status: "queued" | "submitted" | "live"; liveBacklinkUrl?: string }
          > = {};
          for (const row of data.directories) {
            map[row.directory_id] = {
              status: row.status || "queued",
              liveBacklinkUrl: row.live_backlink_url || "",
            };
          }
          setLiveDirectories(map);
        }
        // 统一识别 blitz / fixpack（$39 目录分发）、dfy（$299）与 radar（$29/月）
        const pCode: "blitz" | "radar" | "dfy" =
          data.order.plan === "blitz" || data.order.plan === "fixpack"
            ? "blitz"
            : data.order.plan === "dfy"
            ? "dfy"
            : "radar";
        setActivePlanCode(pCode);
      } else {
        setStatusMsg(data.message || t.portal.noOrderFallback);
      }
    } catch {
      setStatusMsg(t.portal.lookupError);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    if (emailInput.includes("@")) {
      lookupPortal({ email: emailInput.trim() });
    } else {
      lookupPortal({ token: emailInput.trim() });
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

  const runLiveRescan = async () => {
    if (!activeReport) return;
    setRescanLoading(true);
    setRescanResult(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: activeReport.targetUrl }),
      });
      if (res.ok) {
        const data = (await res.json()) as LiveRescanResult;
        setRescanResult(data);
      }
    } finally {
      setRescanLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("lp_lead_statuses");
      if (saved) setLeadStatuses(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  const bindCustomSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bindUrlInput.trim()) return;
    setBindingSite(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: bindUrlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg(data.error || t.portal.scanUrlError);
      } else {
        const customReport: StartupAuditReport = {
          slug: data.domain.split(".")[0],
          productName: data.title.split(/[–—:-]/)[0].trim() || data.domain,
          targetUrl: data.origin,
          domain: data.domain,
          tagline: data.tagline || data.title,
          scannedAt: new Date().toISOString(),
          overallScore: data.score,
          subScores: {
            seoAndSchema: data.score,
            aiSearchVisibility: data.score,
            conversionAndUx: data.score,
            securityBaseline: data.score,
          },
          videoUrl: "",
          posterUrl: "",
          heroScreenshotUrl: "",
          mobileScreenshotUrl: "",
          videoDurationSeconds: 0,
          passedChecks: [],
          leaks: (data.leaks || []).map(
            (
              lk: {
                severity: "critical" | "high" | "medium";
                category: string;
                title: string;
                evidence: string;
              },
              idx: number
            ) => ({
              id: `live-${idx}`,
              severity: lk.severity,
              category: lk.category as StartupAuditReport["leaks"][number]["category"],
              title: lk.title,
              evidence: lk.evidence,
              impactEstimate: "Impacts organic discovery and conversion",
              fixSummary: lk.title,
              cursorFixPrompt: `Fix the following issue on ${data.domain}: ${lk.title}. Evidence: ${lk.evidence}`,
            })
          ),
          generatedLlmsTxtPreview: `# ${data.domain}\n\n> ${data.tagline || data.title}\n\n- Website: ${data.origin}\n`,
          buyerLeads: (data.leads || []).map(
            (
              ld: {
                source: string;
                author: string;
                postedAt: string;
                title: string;
                excerpt: string;
                url: string;
              },
              idx: number
            ) => ({
              id: `live-lead-${idx}`,
              source: "Hacker News" as const,
              community: ld.source,
              author: ld.author,
              postedAt: ld.postedAt,
              title: ld.title,
              excerpt: ld.excerpt,
              url: ld.url,
              intentScore: 90,
              suggestedReplyAngle: `Share how ${data.domain} directly solves this workflow.`,
              unlockedByDefault: true,
            })
          ),
        };
        setActiveReport(customReport);
        setVerifiedUnboundEmail(null);
      }
    } catch {
      setStatusMsg(t.portal.bindNetworkError);
    } finally {
      setBindingSite(false);
    }
  };

  const cycleLeadStatus = (lead: {
    id: string;
    source: string;
    community: string;
    title: string;
    url: string;
  }) => {
    setLeadStatuses((prev) => {
      const cur = prev[lead.id] || "new";
      const next: "new" | "replied" | "won" =
        cur === "new" ? "replied" : cur === "replied" ? "won" : "new";
      const updated = { ...prev, [lead.id]: next };
      try {
        localStorage.setItem("lp_lead_statuses", JSON.stringify(updated));
        fetch("/api/portal/lead-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: activeToken,
            slug: activeReport?.slug || "",
            leadId: lead.id,
            status: next,
            title: lead.title,
            url: lead.url,
            source: lead.source,
            community: lead.community,
          }),
        }).catch(() => {});
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const dirStatusLabel = (st: "queued" | "submitted" | "live") =>
    st === "live"
      ? t.portal.statusLive
      : st === "submitted"
      ? t.portal.statusSubmitted
      : t.portal.statusQueued;

  const leadStatusLabel = (st: "new" | "replied" | "won") =>
    st === "won"
      ? t.portal.leadStatusWon
      : st === "replied"
      ? t.portal.leadStatusReplied
      : t.portal.leadStatusNew;

  return (
    <div className="min-h-screen bg-[var(--apple-bg)] text-[var(--apple-ink)] overflow-x-hidden">
      <header className="sticky top-0 z-40 apple-glass border-b border-[var(--apple-border)]">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold text-[15px] tracking-tight text-[var(--apple-ink)]"
            >
              <BrandMark className="w-5 h-5" />
              <span>LaunchPulse</span>
            </Link>
            <span className="text-[var(--apple-ink-tertiary)]">/</span>
            <span className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
              {t.portal.headerLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <LangSwitcher />
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex px-3.5 py-1.5 rounded-full bg-[var(--apple-blue)] hover:bg-[var(--apple-blue-hover)] text-[12px] font-medium text-white transition"
            >
              Dashboard →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1080px] mx-auto px-4 sm:px-6 py-12 space-y-10">
        {!activeReport ? (
          <section className="max-w-[440px] mx-auto rounded-[24px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-8 space-y-6 shadow-[var(--apple-shadow)]">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[var(--apple-bg-alt)] border border-[var(--apple-border)]">
                <KeyRound className="w-4 h-4 text-[var(--apple-blue)]" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--apple-blue)]">
                {t.portal.badge}
              </p>
              <h1 className="apple-display text-2xl font-semibold text-[var(--apple-ink)]">
                {t.portal.title}
              </h1>
              <p className="text-[13px] text-[var(--apple-ink-secondary)] leading-relaxed">
                {t.portal.subtitle}
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <input
                type="text"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder={t.portal.inputPlaceholder}
                className="w-full rounded-xl border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-4 py-2.5 text-[16px] sm:text-[14px] text-[var(--apple-ink)] placeholder:text-[var(--apple-ink-tertiary)] focus:border-[var(--apple-blue)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-full bg-[var(--apple-blue)] hover:bg-[var(--apple-blue-hover)] text-white font-medium text-[14px] transition inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {t.portal.checkingBtn}
                  </>
                ) : (
                  t.portal.submitBtn
                )}
              </button>
            </form>

            {statusMsg && (
              <p className="text-[12px] text-[var(--apple-orange)] bg-[var(--apple-bg-alt)] border border-[var(--apple-border)] rounded-xl p-3">
                {statusMsg}
              </p>
            )}

            {verifiedUnboundEmail && (
              <form
                onSubmit={bindCustomSite}
                className="rounded-2xl border border-[var(--apple-border)] bg-[var(--apple-bg-alt)] p-4 space-y-3"
              >
                <p className="text-[12px] text-[var(--apple-ink)] font-medium">
                  {t.portal.unboundTitlePrefix} {verifiedUnboundEmail}
                  {t.portal.unboundTitleSuffix}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bindUrlInput}
                    onChange={(e) => setBindUrlInput(e.target.value)}
                    placeholder="https://your-startup.com"
                    className="flex-1 rounded-xl border border-[var(--apple-border-strong)] bg-[var(--apple-surface)] px-3 py-2 text-[13px] text-[var(--apple-ink)]"
                  />
                  <button
                    type="submit"
                    disabled={bindingSite}
                    className="px-4 py-2 rounded-full bg-[var(--apple-blue)] text-white font-medium text-[12px] cursor-pointer disabled:opacity-60"
                  >
                    {bindingSite ? t.portal.activatingBtn : t.portal.activateBtn}
                  </button>
                </div>
              </form>
            )}

            <div className="pt-4 border-t border-[var(--apple-border)] text-center space-y-2.5">
              <p className="text-[12px] text-[var(--apple-ink-secondary)]">
                {t.portal.previewLabel}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setActiveReport(DEMO_ACMEFLOW_REPORT)}
                  className="px-4 py-2 rounded-full border border-[var(--apple-border-strong)] hover:bg-[var(--apple-hover)] text-[13px] font-medium text-[var(--apple-ink)] transition cursor-pointer"
                >
                  {t.portal.previewDemoBtn}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <div className="space-y-8">
            {/* 顶部客户状态栏 + 一键 Re-Scan 复检按钮 */}
            <section className="rounded-2xl border border-emerald-500/30 bg-[#0c121c] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-[family-name:var(--font-mono)] text-emerald-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {t.portal.activeWorkspace} · {activePlanLabel}
                  </span>
                </div>
                <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
                  {activeReport.productName} ({activeReport.domain})
                </h1>
                <p className="text-xs text-slate-400">{t.portal.workspaceHint}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={runLiveRescan}
                  disabled={rescanLoading}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${rescanLoading ? "animate-spin" : ""}`} />
                  {rescanLoading ? t.portal.rescanningBtn : t.portal.rescanBtn}
                </button>
                <button
                  onClick={() => {
                    setActiveReport(null);
                    setRescanResult(null);
                  }}
                  className="px-3.5 py-2.5 rounded-xl border border-white/15 text-xs text-slate-300 hover:text-white cursor-pointer"
                >
                  {t.portal.switchWorkspace}
                </button>
              </div>
            </section>

            {/* 实时复检对比结果条 */}
            {rescanResult && (
              <section className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="text-xs sm:text-sm text-emerald-100">
                    <strong>
                      {t.portal.rescanDonePrefix} ({rescanResult.domain}):
                    </strong>{" "}
                    {t.portal.rescanDoneMid}{" "}
                    <span className="font-[family-name:var(--font-mono)] font-bold text-white">
                      {rescanResult.score}/100
                    </span>{" "}
                    · {rescanResult.leaksCount} {t.portal.rescanDoneSuffix}
                  </div>
                </div>
              </section>
            )}

            {/* 50+ 高权重目录分发外链进度回执看板（$39 主力商品核心交付物） */}
            <section className="rounded-2xl border border-amber-500/35 bg-[#0c111b] p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-[family-name:var(--font-mono)] text-amber-300 uppercase font-semibold">
                    {t.portal.dirTrackerBadge}
                  </span>
                  <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mt-0.5">
                    {t.portal.dirTrackerTitlePrefix} {activeReport.domain}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    const isDemo = activeReport.slug === "acmeflow-demo";
                    const csv = [
                      "Directory,DirectoryURL,DomainRating,Category,Status,LiveBacklinkURL",
                      ...DISTRIBUTION_DIRECTORIES.map((d) => {
                        const live = liveDirectories[d.id];
                        const st = isDemo ? d.defaultStatus : live?.status || "queued";
                        const proof = live?.liveBacklinkUrl || "";
                        return `"${d.name}","${d.url}",${d.dr},"${d.category}","${st}","${proof}"`;
                      }),
                    ].join("\n");
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${activeReport.slug}-50-directories-backlinks.csv`;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                  className="px-3.5 py-2 rounded-lg border border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 text-xs font-semibold transition cursor-pointer shrink-0"
                >
                  {t.portal.exportCsvBtn}
                </button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {DISTRIBUTION_DIRECTORIES.map((dir) => {
                  const isDemo = activeReport.slug === "acmeflow-demo";
                  const live = liveDirectories[dir.id];
                  const st = isDemo ? dir.defaultStatus : live?.status || "queued";
                  const href = live?.liveBacklinkUrl || dir.url;
                  return (
                    <a
                      key={dir.id}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-white/10 bg-black/40 hover:border-emerald-400/40 p-2.5 flex flex-col justify-between gap-1.5 transition"
                    >
                      <div className="flex items-center justify-between gap-1 text-[10px] font-[family-name:var(--font-mono)]">
                        <span className="text-slate-400">DR {dir.dr}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded uppercase ${
                            st === "live"
                              ? "bg-emerald-500 text-slate-950 font-bold"
                              : st === "submitted"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-white/10 text-slate-400"
                          }`}
                        >
                          {dirStatusLabel(st)}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-white truncate">{dir.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {live?.liveBacklinkUrl ? t.portal.verifiedBacklink : dir.category}
                      </p>
                    </a>
                  );
                })}
              </div>
            </section>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
              {/* 左栏：已解锁的全部修复 Prompt 与 /llms.txt */}
              <div className="lg:col-span-6 space-y-5">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                    {t.portal.promptsTitle} ({activeReport.leaks.length})
                  </h2>
                </div>

                {activeReport.leaks.map((leak, idx) => (
                  <div
                    key={leak.id}
                    className="rounded-xl border border-white/10 bg-[#0c1018] p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs font-[family-name:var(--font-mono)]">
                      <span className="text-amber-300 uppercase">
                        {t.portal.fixTagPrefix}
                        {idx + 1} · {localizeCategory(leak.category, locale)}
                      </span>
                      <button
                        onClick={() => copyText(leak.id, leak.cursorFixPrompt)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 transition cursor-pointer"
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
                    <h3 className="text-sm font-semibold text-white">
                      {localizeLeakTitle(leak.title, locale)}
                    </h3>
                    <pre className="text-xs font-[family-name:var(--font-mono)] text-slate-200 bg-black/50 border border-white/10 rounded-lg p-3 whitespace-pre-wrap break-words">
                      {leak.cursorFixPrompt}
                    </pre>
                  </div>
                ))}

                <div className="rounded-xl border border-white/10 bg-[#0c1018] p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs font-[family-name:var(--font-mono)]">
                    <span className="text-emerald-400 uppercase">{t.portal.readyLlmsHeader}</span>
                    <button
                      onClick={() => copyText("portal-llms", activeReport.generatedLlmsTxtPreview)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 cursor-pointer"
                    >
                      {copiedId === "portal-llms" ? t.common.copiedBang : t.common.copyFile}
                    </button>
                  </div>
                  <pre className="text-xs font-[family-name:var(--font-mono)] text-slate-300 bg-black/50 border border-white/10 rounded-lg p-3 whitespace-pre-wrap break-words">
                    {activeReport.generatedLlmsTxtPreview}
                  </pre>
                </div>
              </div>

              {/* 右栏：全部解锁的每日买家线索流 + 状态跟踪 + $299 代办升级 */}
              <div className="lg:col-span-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radar className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                      {t.portal.buyersTitle} ({activeReport.buyerLeads.length})
                    </h2>
                  </div>
                  <span className="text-xs font-[family-name:var(--font-mono)] text-slate-400">
                    {t.portal.clickBadgeHint}
                  </span>
                </div>

                <div className="space-y-3">
                  {activePlanCode === "blitz" ? (
                    <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-5 space-y-3">
                      <p className="text-sm font-bold text-white">{t.portal.radarUpgradeTitle}</p>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {t.portal.radarUpgradeDesc}
                      </p>
                      <button
                        onClick={async () => {
                          const r = await fetch("/api/checkout", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              plan: "radar",
                              slug: activeReport.slug,
                              targetUrl: activeReport.targetUrl,
                            }),
                          });
                          const d = await r.json();
                          if (r.ok && d.checkoutUrl) window.location.href = d.checkoutUrl;
                        }}
                        className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
                      >
                        {t.portal.radarUpgradeBtn}
                      </button>
                    </div>
                  ) : (
                    activeReport.buyerLeads.map((lead) => {
                      const st = leadStatuses[lead.id] || "new";
                      return (
                        <div
                          key={lead.id}
                          className="rounded-xl border border-white/10 bg-[#0c1018] p-4 space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs font-[family-name:var(--font-mono)]">
                            <span className="text-emerald-300">
                              {lead.source} · {lead.community} · {lead.postedAt}
                            </span>
                            <button
                              onClick={() => cycleLeadStatus(lead)}
                              className={`px-2 py-0.5 rounded uppercase text-[10px] font-bold cursor-pointer ${
                                st === "won"
                                  ? "bg-emerald-500 text-slate-950"
                                  : st === "replied"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                  : "bg-white/10 text-slate-300"
                              }`}
                            >
                              {leadStatusLabel(st)}
                            </button>
                          </div>
                          <h3 className="text-sm font-semibold text-white">
                            {decodeHtmlEntities(lead.title)}
                          </h3>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {decodeHtmlEntities(lead.excerpt)}
                          </p>
                          <p className="text-[11px] text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 rounded p-2">
                            <strong>{t.portal.suggestedReplyLabel}</strong>{" "}
                            {lead.suggestedReplyAngle}
                          </p>
                          <div className="flex justify-end">
                            <a
                              href={lead.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline"
                            >
                              {t.portal.openThreadReply} <ArrowUpRight className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* V42：一键生成 SEO 竞品对比落地页 (/vs/competitor) 源码 */}
                {activePlanCode !== "blitz" && (
                  <div className="rounded-xl border border-white/10 bg-[#0c1018] p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-[family-name:var(--font-mono)] text-emerald-400 uppercase font-semibold">
                        {t.portal.vsGeneratorTitle}
                      </span>
                      <button
                        onClick={() =>
                          copyText(
                            "vs-page",
                            `# ${activeReport.productName} vs ${competitorName} (2026 Comparison)\n\nLooking for a faster, simpler alternative to ${competitorName}? Here is an honest side-by-side breakdown.\n\n## Why teams switch to ${activeReport.productName}\n- Positioning: ${activeReport.tagline}\n- Zero bloat setup at ${activeReport.targetUrl}\n- Transparent developer-first pricing\n\n## Quick Migration Checklist\n1. Export your existing config from ${competitorName}\n2. Connect your workspace in ${activeReport.productName}\n3. Verify live alerts & workflows in under 5 minutes\n`
                          )
                        }
                        className="text-xs px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 cursor-pointer"
                      >
                        {copiedId === "vs-page" ? t.portal.copiedMarkdown : t.portal.copyVsMarkdown}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={competitorName}
                      onChange={(e) => setCompetitorName(e.target.value)}
                      placeholder={t.portal.competitorPlaceholder}
                      className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-xs font-[family-name:var(--font-mono)] text-white"
                    />
                    <p className="text-[11px] text-slate-400">
                      {t.portal.vsHintPrefix}{" "}
                      <code>/vs/{competitorName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}</code>{" "}
                      {t.portal.vsHintMid}
                      {competitorName} {t.portal.vsHintSuffix}
                    </p>
                  </div>
                )}

                {/* $299 Done-For-You 高毛利升级入口 */}
                <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-[family-name:var(--font-mono)] text-amber-300 font-semibold">
                    <Sparkles className="w-4 h-4" /> {t.portal.dfyBadge}
                  </div>
                  <p className="text-sm font-semibold text-white">{t.portal.dfyHeadline}</p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {t.portal.dfyDescPrefix} <code>/vs/</code> {t.portal.dfyDescSuffix}
                  </p>
                  <button
                    onClick={startDfyCheckout}
                    disabled={dfyLoading}
                    className="inline-flex items-center gap-1.5 mt-1 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-60"
                  >
                    {dfyLoading ? t.pricing.loadingCheckout : t.portal.dfyBtn}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
