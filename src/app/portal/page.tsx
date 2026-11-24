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
import LangSwitcher from "@/components/LangSwitcher";

interface LiveRescanResult {
  domain: string;
  score: number;
  leaksCount: number;
  leaks: Array<{ severity: string; category: string; title: string; evidence: string }>;
}

const DEMO_ACMEFLOW_REPORT: StartupAuditReport = {
  slug: "acmeflow-demo",
  productName: "AcmeFlow (Sample Demo)",
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
    "# AcmeFlow\n\n> Automated workflow orchestration for developer teams.\n\n## Core Capabilities\n- Website: https://acmeflow.example\n- Pricing: $19/mo Pro\n",
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
  const { t } = useI18n();
  const sampleAudits = getAllAudits();
  const [emailInput, setEmailInput] = useState("");
  const [activeToken, setActiveToken] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [activeReport, setActiveReport] = useState<StartupAuditReport | null>(null);
  const [activePlanCode, setActivePlanCode] = useState<"fixpack" | "radar" | "dfy">("radar");
  const [activePlanLabel, setActivePlanLabel] = useState("Growth & Buyer Radar Pro ($29/mo)");
  const [competitorName, setCompetitorName] = useState("Legacy Competitor");
  const [verifiedUnboundEmail, setVerifiedUnboundEmail] = useState<string | null>(null);
  const [bindUrlInput, setBindUrlInput] = useState("");
  const [bindingSite, setBindingSite] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [leadStatuses, setLeadStatuses] = useState<Record<string, "new" | "replied" | "won">>({});
  const [rescanLoading, setRescanLoading] = useState(false);
  const [rescanResult, setRescanResult] = useState<LiveRescanResult | null>(null);
  const [dfyLoading, setDfyLoading] = useState(false);

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
        // 若为 D1 动态入库的新客户，自动从 /api/audit/:slug 实时拉取报告，彻底打通动态扩展
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
          // 首页直购尚无专属 slug 时，绝不误显他人样板，引导绑定自己的网站 URL 实时生成
          setActiveReport(null);
          setVerifiedUnboundEmail(data.order.customer_email || emailInput);
        }
        const pCode: "fixpack" | "radar" | "dfy" =
          data.order.plan === "fixpack"
            ? "fixpack"
            : data.order.plan === "dfy"
            ? "dfy"
            : "radar";
        setActivePlanCode(pCode);
        setActivePlanLabel(
          pCode === "fixpack"
            ? "One-Time Launch Fix Pack ($19)"
            : pCode === "dfy"
            ? "Done-For-You Growth Sprint ($299)"
            : "Growth & Buyer Radar Pro ($29/mo)"
        );
      } else {
        setStatusMsg(
          data.message ||
            "No active Creem order matched that email yet. Try the interactive demo workspace below."
        );
      }
    } catch {
      setStatusMsg("Unable to connect to portal lookup right now.");
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
        setStatusMsg(data.error || "Unable to scan that URL.");
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
              lk: { severity: "critical" | "high" | "medium"; category: string; title: string; evidence: string },
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
              ld: { source: string; author: string; postedAt: string; title: string; excerpt: string; url: string },
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
      setStatusMsg("Network error while activating your domain.");
    } finally {
      setBindingSite(false);
    }
  };

  const cycleLeadStatus = (lead: { id: string; source: string; community: string; title: string; url: string }) => {
    setLeadStatuses((prev) => {
      const cur = prev[lead.id] || "new";
      const next: "new" | "replied" | "won" = cur === "new" ? "replied" : cur === "replied" ? "won" : "new";
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

  return (
    <div className="min-h-screen bg-[#07090d] text-slate-100 obsidian-grid overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07090d]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-[family-name:var(--font-display)] font-bold text-white tracking-tight"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
              <span>LaunchPulse</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-[family-name:var(--font-mono)] text-emerald-300">
              CUSTOMER PORTAL
            </span>
          </div>

          <div className="flex items-center gap-3">
            <LangSwitcher />
            <Link
              href="/"
              className="hidden sm:inline-block text-xs text-slate-400 hover:text-white transition"
            >
              {t.warRoom.backToScanner}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {!activeReport ? (
          <section className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-[#0c1018] p-7 sm:p-9 space-y-6 shadow-2xl">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-[family-name:var(--font-mono)]">
                <KeyRound className="w-3.5 h-3.5" /> {t.portal.badge}
              </div>
              <h1 className="text-2xl sm:text-3xl font-[family-name:var(--font-display)] font-bold text-white">
                {t.portal.title}
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                {t.portal.subtitle}
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <input
                type="text"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder={t.portal.inputPlaceholder}
                className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-sm font-[family-name:var(--font-mono)] text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Checking...
                  </>
                ) : (
                  t.portal.submitBtn
                )}
              </button>
            </form>

            {statusMsg && (
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                {statusMsg}
              </p>
            )}

            {verifiedUnboundEmail && (
              <form
                onSubmit={bindCustomSite}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3"
              >
                <p className="text-xs text-emerald-200 font-semibold">
                  ✓ Active plan verified for {verifiedUnboundEmail}! Enter your SaaS URL to activate
                  your live Fix Pack &amp; Buyer Radar workspace:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bindUrlInput}
                    onChange={(e) => setBindUrlInput(e.target.value)}
                    placeholder="https://your-startup.com"
                    className="flex-1 rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs font-[family-name:var(--font-mono)] text-white"
                  />
                  <button
                    type="submit"
                    disabled={bindingSite}
                    className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-60"
                  >
                    {bindingSite ? "Activating..." : "Activate →"}
                  </button>
                </div>
              </form>
            )}

            <div className="pt-4 border-t border-white/10 space-y-2.5">
              <p className="text-xs font-[family-name:var(--font-mono)] text-slate-400 uppercase">
                {t.portal.previewLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveReport(DEMO_ACMEFLOW_REPORT)}
                  className="px-3.5 py-2 rounded-lg border border-white/15 hover:border-emerald-400/50 bg-white/[0.03] text-xs font-[family-name:var(--font-mono)] text-slate-200 transition cursor-pointer"
                >
                  Preview Sample Demo Workspace (AcmeFlow) →
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
                  <span>ACTIVE WORKSPACE · {activePlanLabel}</span>
                </div>
                <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
                  {activeReport.productName} ({activeReport.domain})
                </h1>
                <p className="text-xs text-slate-400">
                  Apply the Cursor/Claude prompts below, deploy your changes, then click Re-Scan to
                  verify your readiness score jump.
                </p>
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
                    <strong>Live Re-Scan Complete ({rescanResult.domain}):</strong> Current edge
                    readiness score is{" "}
                    <span className="font-[family-name:var(--font-mono)] font-bold text-white">
                      {rescanResult.score}/100
                    </span>{" "}
                    with {rescanResult.leaksCount} remaining items detected.
                  </div>
                </div>
              </section>
            )}

            {/* 50+ 高权重目录分发外链进度回执看板（$39 主力商品核心交付物） */}
            <section className="rounded-2xl border border-amber-500/35 bg-[#0c111b] p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-[family-name:var(--font-mono)] text-amber-300 uppercase font-semibold">
                    50+ HIGH-DR DIRECTORY DISTRIBUTION TRACKER (DR 45–91)
                  </span>
                  <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mt-0.5">
                    Backlink &amp; Referral Traffic Proof for {activeReport.domain}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    const csv = [
                      "Directory,URL,DomainRating,Category,Status",
                      ...DISTRIBUTION_DIRECTORIES.map(
                        (d) => `"${d.name}","${d.url}",${d.dr},"${d.category}","${d.defaultStatus}"`
                      ),
                    ].join("\n");
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `${activeReport.slug}-50-directories-backlinks.csv`;
                    a.click();
                  }}
                  className="px-3.5 py-2 rounded-lg border border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 text-xs font-semibold transition cursor-pointer shrink-0"
                >
                  Export 50-Directory CSV Proof ↓
                </button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {DISTRIBUTION_DIRECTORIES.map((dir) => (
                  <a
                    key={dir.id}
                    href={dir.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-white/10 bg-black/40 hover:border-emerald-400/40 p-2.5 flex flex-col justify-between gap-1.5 transition"
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px] font-[family-name:var(--font-mono)]">
                      <span className="text-slate-400">DR {dir.dr}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded uppercase ${
                          dir.defaultStatus === "submitted"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-white/10 text-slate-400"
                        }`}
                      >
                        {dir.defaultStatus}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white truncate">{dir.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{dir.category}</p>
                  </a>
                ))}
              </div>
            </section>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
              {/* 左栏：已解锁的全部修复 Prompt 与 /llms.txt */}
              <div className="lg:col-span-6 space-y-5">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                    Unlocked Cursor &amp; Claude Code Fix Prompts ({activeReport.leaks.length})
                  </h2>
                </div>

                {activeReport.leaks.map((leak, idx) => (
                  <div
                    key={leak.id}
                    className="rounded-xl border border-white/10 bg-[#0c1018] p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs font-[family-name:var(--font-mono)]">
                      <span className="text-amber-300 uppercase">
                        FIX #0{idx + 1} · {leak.category}
                      </span>
                      <button
                        onClick={() => copyText(leak.id, leak.cursorFixPrompt)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 transition cursor-pointer"
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
                    <h3 className="text-sm font-semibold text-white">{leak.title}</h3>
                    <pre className="text-xs font-[family-name:var(--font-mono)] text-slate-200 bg-black/50 border border-white/10 rounded-lg p-3 whitespace-pre-wrap break-words">
                      {leak.cursorFixPrompt}
                    </pre>
                  </div>
                ))}

                <div className="rounded-xl border border-white/10 bg-[#0c1018] p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs font-[family-name:var(--font-mono)]">
                    <span className="text-emerald-400 uppercase">
                      READY-TO-DEPLOY public/llms.txt
                    </span>
                    <button
                      onClick={() => copyText("portal-llms", activeReport.generatedLlmsTxtPreview)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 cursor-pointer"
                    >
                      {copiedId === "portal-llms" ? "Copied!" : "Copy File"}
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
                      Unlocked High-Intent Buyer Feed ({activeReport.buyerLeads.length})
                    </h2>
                  </div>
                  <span className="text-xs font-[family-name:var(--font-mono)] text-slate-400">
                    Click badge to track outreach
                  </span>
                </div>

                <div className="space-y-3">
                  {activePlanCode === "fixpack" ? (
                    <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-5 space-y-3">
                      <p className="text-sm font-bold text-white">
                        24/7 Buyer Intent Radar is included in Radar Pro ($29/mo)
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Your One-Time Fix Pack ($19) unlocks all Cursor prompts, /llms.txt, and
                        unlimited Re-Scans on the left. Upgrade to Radar Pro to unlock daily fresh
                        community buyer threads and weekly competitor /vs/ landing pages.
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
                        Upgrade to Buyer Radar Pro ($29/mo) →
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
                              {st}
                            </button>
                          </div>
                          <h3 className="text-sm font-semibold text-white">{lead.title}</h3>
                          <p className="text-xs text-slate-400 leading-relaxed">{lead.excerpt}</p>
                          <p className="text-[11px] text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 rounded p-2">
                            <strong>Suggested reply angle:</strong> {lead.suggestedReplyAngle}
                          </p>
                          <div className="flex justify-end">
                            <a
                              href={lead.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline"
                            >
                              Open Live Thread &amp; Reply <ArrowUpRight className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* V42：一键生成 SEO 竞品对比落地页 (/vs/competitor) 源码 */}
                {activePlanCode !== "fixpack" && (
                  <div className="rounded-xl border border-white/10 bg-[#0c1018] p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-[family-name:var(--font-mono)] text-emerald-400 uppercase font-semibold">
                        SEO Competitor /vs/ Page Generator
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
                        {copiedId === "vs-page" ? "Copied Markdown!" : "Copy /vs/ Markdown"}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={competitorName}
                      onChange={(e) => setCompetitorName(e.target.value)}
                      placeholder="Competitor name (e.g. UptimeRobot)"
                      className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-xs font-[family-name:var(--font-mono)] text-white"
                    />
                    <p className="text-[11px] text-slate-400">
                      Generates a ready-to-publish <code>/vs/{competitorName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}</code>{" "}
                      comparison page targeting high-intent buyers searching &ldquo;{competitorName} alternative&rdquo;.
                    </p>
                  </div>
                )}

                {/* $299 Done-For-You 高毛利升级入口 */}
                <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-[family-name:var(--font-mono)] text-amber-300 font-semibold">
                    <Sparkles className="w-4 h-4" /> OPTIONAL DONE-FOR-YOU SPRINT ($299)
                  </div>
                  <p className="text-sm font-semibold text-white">
                    Too busy shipping features to apply SEO fixes or reply to threads yourself?
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Our engineering team submits a clean GitHub PR fixing all AEO/SEO/security
                    headers, ships 5 competitor <code>/vs/</code> pages, and runs a 7-day
                    non-spam buyer outreach sprint for you.
                  </p>
                  <button
                    onClick={startDfyCheckout}
                    disabled={dfyLoading}
                    className="inline-flex items-center gap-1.5 mt-1 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-60"
                  >
                    {dfyLoading
                      ? "Opening Secure Checkout..."
                      : "Book $299 Done-For-You Sprint →"}
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
