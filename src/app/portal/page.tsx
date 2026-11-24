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
import type { StartupAuditReport } from "@/types/audit";

interface LiveRescanResult {
  domain: string;
  score: number;
  leaksCount: number;
  leaks: Array<{ severity: string; category: string; title: string; evidence: string }>;
}

export default function CustomerPortalPage() {
  const sampleAudits = getAllAudits();
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [activeReport, setActiveReport] = useState<StartupAuditReport | null>(null);
  const [activePlanLabel, setActivePlanLabel] = useState("Growth & Buyer Radar Pro ($29/mo)");
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
    const demoSlug = params.get("demo");
    const token = params.get("token");
    if (demoSlug) {
      const found = sampleAudits.find((a) => a.slug === demoSlug) || sampleAudits[0];
      if (found) setActiveReport(found);
    } else if (token) {
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
        const matched =
          sampleAudits.find((a) => a.slug === data.order.slug) || sampleAudits[0];
        setActiveReport(matched || null);
        setActivePlanLabel(
          data.order.plan === "fixpack"
            ? "One-Time Launch Fix Pack ($19)"
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

  const cycleLeadStatus = (id: string) => {
    setLeadStatuses((prev) => {
      const cur = prev[id] || "new";
      const next = cur === "new" ? "replied" : cur === "replied" ? "won" : "new";
      return { ...prev, [id]: next };
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

          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-white transition"
          >
            ← Back to Scanner
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {!activeReport ? (
          <section className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-[#0c1018] p-7 sm:p-9 space-y-6 shadow-2xl">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-[family-name:var(--font-mono)]">
                <KeyRound className="w-3.5 h-3.5" /> PASSWORDLESS MAGIC PORTAL
              </div>
              <h1 className="text-2xl sm:text-3xl font-[family-name:var(--font-display)] font-bold text-white">
                Access Your Fix Pack &amp; Buyer Radar
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                No passwords to remember. Enter the email used at Creem checkout (or paste your Magic
                Token) to open your unlocked Cursor fix prompts, live Re-Scan verifier, and daily
                buyer threads.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <input
                type="text"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="founder@your-startup.com or magic token"
                className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-sm font-[family-name:var(--font-mono)] text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Checking Creem Orders...
                  </>
                ) : (
                  "Open My Workspace →"
                )}
              </button>
            </form>

            {statusMsg && (
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                {statusMsg}
              </p>
            )}

            <div className="pt-4 border-t border-white/10 space-y-2.5">
              <p className="text-xs font-[family-name:var(--font-mono)] text-slate-400 uppercase">
                Want to preview the unlocked workspace first?
              </p>
              <div className="flex flex-wrap gap-2">
                {sampleAudits.map((a) => (
                  <button
                    key={a.slug}
                    onClick={() => setActiveReport(a)}
                    className="px-3.5 py-2 rounded-lg border border-white/15 hover:border-emerald-400/50 bg-white/[0.03] text-xs font-[family-name:var(--font-mono)] text-slate-200 transition cursor-pointer"
                  >
                    Preview {a.productName} Portal →
                  </button>
                ))}
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
                  {rescanLoading ? "Re-Scanning Live Site..." : "Re-Scan My Site Now"}
                </button>
                <button
                  onClick={() => {
                    setActiveReport(null);
                    setRescanResult(null);
                  }}
                  className="px-3.5 py-2.5 rounded-xl border border-white/15 text-xs text-slate-300 hover:text-white cursor-pointer"
                >
                  Switch Workspace
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
                  {activeReport.buyerLeads.map((lead) => {
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
                            onClick={() => cycleLeadStatus(lead.id)}
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
                  })}
                </div>

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
