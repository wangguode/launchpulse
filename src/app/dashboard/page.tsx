"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  Check,
  Copy,
  CreditCard,
  Globe,
  Link2,
  Loader2,
  LogOut,
  MousePointerClick,
  Percent,
  Radar,
  Rocket,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import LangSwitcher from "@/components/LangSwitcher";
import { V2_DICTIONARIES } from "@/lib/v2-i18n";
import { DISTRIBUTION_DIRECTORIES } from "@/data/directories";

interface DashboardPayload {
  user: { id: number; email: string; name: string; role: string };
  orders: Array<{
    order_id: string;
    plan: string;
    amount_usd: number;
    status: string;
    created_at: string;
  }>;
  campaigns: Array<{
    id: number;
    slug: string;
    product_name: string;
    target_url: string;
    tagline: string;
    competitors: string;
    status: string;
  }>;
  links: Array<{
    code: string;
    campaign_id: number;
    channel: string;
    label: string;
    destination_url: string;
    clicks_count: number;
    conversions_count: number;
  }>;
  directories: Array<{
    directory_id: string;
    status: "queued" | "submitted" | "live";
    live_backlink_url?: string;
  }>;
  deliveries: Array<{
    lead_id: string;
    source: string;
    community: string;
    title: string;
    excerpt: string;
    url: string;
    lead_status: string;
    delivered_at: string;
  }>;
  stats: {
    totalClicks: number;
    totalConversions: number;
    conversionRate: number;
    directoriesLive: number;
    directoriesSubmitted: number;
    dailySeries: Array<{ date: string; clicks: number; conversions: number }>;
    channelBreakdown: Array<{ channel: string; clicks: number; conversions: number; cvr: number }>;
  };
}

type TabKey = "overview" | "campaign" | "links" | "directories" | "buyers" | "billing";

export default function DashboardPage() {
  const { locale } = useI18n();
  const v2 = V2_DICTIONARIES[locale];
  const router = useRouter();

  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("overview");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Campaign form
  const [productName, setProductName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [campaignMsg, setCampaignMsg] = useState("");

  // Custom link form
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkChannel, setNewLinkChannel] = useState("directory");
  const [creatingLink, setCreatingLink] = useState(false);

  // Checkout
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/overview");
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (res.ok) {
        const json = (await res.json()) as DashboardPayload;
        setData(json);
        if (json.campaigns.length > 0) {
          const c = json.campaigns[0];
          setProductName(c.product_name);
          setTargetUrl(c.target_url);
          setTagline(c.tagline);
          setCompetitors(c.competitors);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // ignore
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCampaign(true);
    setCampaignMsg("");
    try {
      const res = await fetch("/api/dashboard/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, targetUrl, tagline, competitors }),
      });
      const out = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && out.ok) {
        setCampaignMsg(v2.dash.campaignSaved);
        await loadDashboard();
      } else {
        setCampaignMsg(out.error || "Failed to save campaign.");
      }
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleCreateCustomLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.campaigns[0]) return;
    setCreatingLink(true);
    try {
      const res = await fetch("/api/dashboard/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: data.campaigns[0].id,
          channel: newLinkChannel,
          label: newLinkLabel || "Custom Promo Link",
          destinationUrl: data.campaigns[0].target_url,
        }),
      });
      if (res.ok) {
        setNewLinkLabel("");
        await loadDashboard();
      }
    } finally {
      setCreatingLink(false);
    }
  };

  const handleCheckout = async (plan: "blitz" | "radar" | "dfy") => {
    setCheckoutLoading(plan);
    try {
      const c = data?.campaigns[0];
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          slug: c?.slug || "",
          targetUrl: c?.target_url || "",
          email: data?.user.email || "",
        }),
      });
      const d = (await res.json()) as { checkoutUrl?: string };
      if (res.ok && d.checkoutUrl) window.location.href = d.checkoutUrl;
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading || !data) {
    return (
      <main className="min-h-screen bg-[#07090d] text-slate-200 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        <p className="text-xs font-[family-name:var(--font-mono)] text-slate-400">
          {v2.dash.loading}
        </p>
      </main>
    );
  }

  const activeOrder = data.orders.find((o) => o.status === "active");
  const dirMap = new Map(data.directories.map((d) => [d.directory_id, d]));
  const maxDailyClicks = Math.max(4, ...data.stats.dailySeries.map((d) => d.clicks));
  const pixelSnippet = `<script src="https://pulse.statementflow.win/api/pixel.js" defer></script>\n<!-- Call on signup or checkout success: window.lpConvert('signup') -->`;

  const menuItems: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
    { key: "overview", label: v2.dash.menuOverview, icon: <BarChart3 className="w-4 h-4" /> },
    { key: "campaign", label: v2.dash.menuCampaign, icon: <Rocket className="w-4 h-4" /> },
    { key: "links", label: v2.dash.menuLinks, icon: <Link2 className="w-4 h-4" /> },
    { key: "directories", label: v2.dash.menuDirectories, icon: <Globe className="w-4 h-4" /> },
    { key: "buyers", label: v2.dash.menuBuyers, icon: <Radar className="w-4 h-4" /> },
    { key: "billing", label: v2.dash.menuBilling, icon: <CreditCard className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#07090d] text-slate-100 flex flex-col lg:flex-row">
      {/* 左侧标准 SaaS 导航栏 */}
      <aside className="lg:w-64 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#0a0e16] flex flex-col justify-between shrink-0">
        <div className="p-5 space-y-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 font-[family-name:var(--font-display)] font-bold text-white tracking-tight"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
              <span>LaunchPulse</span>
            </Link>
            <span className="text-[10px] font-[family-name:var(--font-mono)] text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded">
              V2
            </span>
          </div>

          <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1.5">
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
                  tab === item.key
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{data.user.name}</p>
              <p className="text-[11px] font-[family-name:var(--font-mono)] text-slate-400 truncate">
                {data.user.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title={v2.dash.logout}
              className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-red-300 hover:border-red-500/40 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <LangSwitcher />
            <Link href="/admin" className="text-[11px] text-slate-500 hover:text-slate-300">
              {v2.nav.admin}
            </Link>
          </div>
        </div>
      </aside>

      {/* 右侧主内容区 */}
      <main className="flex-1 p-5 sm:p-8 max-w-6xl w-full mx-auto space-y-7 overflow-x-hidden">
        {/* 顶部欢迎与套餐状态条 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/10">
          <div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
              {v2.dash.welcomePrefix} {data.user.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {v2.dash.activePlan}:{" "}
              <span className="text-emerald-300 font-semibold">
                {activeOrder ? `${activeOrder.plan.toUpperCase()} ($${activeOrder.amount_usd})` : v2.dash.freePlan}
              </span>
            </p>
          </div>
          {!activeOrder && (
            <button
              onClick={() => setTab("billing")}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0"
            >
              {v2.dash.upgradeBlitz}
            </button>
          )}
        </div>

        {/* 若未提交项目，优先展示直观的引导卡片 */}
        {data.campaigns.length === 0 && tab === "overview" && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">{v2.dash.onboardingTitle}</h2>
              <p className="text-xs text-emerald-100/80 max-w-2xl">{v2.dash.onboardingDesc}</p>
            </div>
            <button
              onClick={() => setTab("campaign")}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer"
            >
              {v2.dash.menuCampaign} →
            </button>
          </div>
        )}

        {/* TAB 1: 概览与转化率报表 */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* 4 大核心 KPI 卡片 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
              <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{v2.dash.kpiClicks}</span>
                  <MousePointerClick className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-3xl font-bold text-white">{data.stats.totalClicks}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{v2.dash.kpiConversions}</span>
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-3xl font-bold text-white">{data.stats.totalConversions}</p>
              </div>

              <div className="rounded-2xl border border-emerald-500/30 bg-[#0c141d] p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-emerald-300">
                  <span>{v2.dash.kpiCvr}</span>
                  <Percent className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-3xl font-bold text-emerald-400">{data.stats.conversionRate}%</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{v2.dash.kpiDirectories}</span>
                  <Globe className="w-4 h-4 text-sky-400" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {data.stats.directoriesLive}
                  <span className="text-sm text-slate-500 font-normal"> / 50</span>
                </p>
              </div>
            </div>

            {/* 14 天点击与转化趋势柱状/折线图（纯 SVG，零外部图表包膨胀） */}
            <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-white">{v2.dash.chartTitle}</h2>
                <div className="flex items-center gap-4 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-emerald-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                    {v2.dash.chartClicks}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-amber-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                    {v2.dash.chartConversions}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-14 gap-1.5 items-end h-44 pt-4">
                {data.stats.dailySeries.map((pt) => {
                  const clickH = Math.max(4, Math.round((pt.clicks / maxDailyClicks) * 120));
                  const convH =
                    pt.conversions > 0 ? Math.max(6, Math.round((pt.conversions / maxDailyClicks) * 120)) : 0;
                  return (
                    <div key={pt.date} className="flex flex-col items-center gap-1.5 group">
                      <div className="w-full flex items-end justify-center gap-0.5 h-32">
                        <div
                          title={`${pt.date}: ${pt.clicks} clicks`}
                          style={{ height: `${clickH}px` }}
                          className="w-2.5 rounded-t bg-emerald-500/80 group-hover:bg-emerald-400 transition-all"
                        />
                        {convH > 0 && (
                          <div
                            title={`${pt.date}: ${pt.conversions} conversions`}
                            style={{ height: `${convH}px` }}
                            className="w-2.5 rounded-t bg-amber-400 transition-all"
                          />
                        )}
                      </div>
                      <span className="text-[9px] font-[family-name:var(--font-mono)] text-slate-500">
                        {pt.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 渠道归因与转化率表 */}
            <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-6 space-y-4">
              <h2 className="text-base font-bold text-white">{v2.dash.channelTitle}</h2>
              {data.stats.channelBreakdown.length === 0 ? (
                <p className="text-xs text-slate-400">{v2.dash.noTrafficYet}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs tabular-nums">
                    <thead className="text-slate-400 border-b border-white/10 font-[family-name:var(--font-mono)]">
                      <tr>
                        <th className="py-2.5">{v2.dash.channelCol}</th>
                        <th className="py-2.5">{v2.dash.clicksCol}</th>
                        <th className="py-2.5">{v2.dash.convCol}</th>
                        <th className="py-2.5">{v2.dash.cvrCol}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.stats.channelBreakdown.map((row) => (
                        <tr key={row.channel}>
                          <td className="py-3 font-semibold text-white uppercase">{row.channel}</td>
                          <td className="py-3 text-slate-200">{row.clicks}</td>
                          <td className="py-3 text-amber-300">{row.conversions}</td>
                          <td className="py-3 text-emerald-400 font-semibold">{row.cvr}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: 我的推广项目 */}
        {tab === "campaign" && (
          <form
            onSubmit={handleSaveCampaign}
            className="rounded-2xl border border-white/10 bg-[#0c1018] p-6 sm:p-8 space-y-5 max-w-2xl"
          >
            <div>
              <h2 className="text-lg font-bold text-white">{v2.dash.campaignTitle}</h2>
              <p className="text-xs text-slate-400 mt-1">{v2.dash.campaignDesc}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">{v2.dash.fieldProduct}</label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="CertNudge"
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">{v2.dash.fieldUrl}</label>
                <input
                  type="url"
                  required
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://your-startup.com"
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm font-[family-name:var(--font-mono)] text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">{v2.dash.fieldTagline}</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Know before SSL certs or domains expire."
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">{v2.dash.fieldCompetitors}</label>
                <input
                  type="text"
                  value={competitors}
                  onChange={(e) => setCompetitors(e.target.value)}
                  placeholder="UptimeRobot, Better Stack"
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white"
                />
              </div>
            </div>

            {campaignMsg && (
              <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                {campaignMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={savingCampaign}
              className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-60"
            >
              {savingCampaign ? v2.dash.savingBtn : v2.dash.saveCampaignBtn}
            </button>
          </form>
        )}

        {/* TAB 3: 归因追踪短链与 1 行转化像素 */}
        {tab === "links" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">{v2.dash.linksTitle}</h2>
                <p className="text-xs text-slate-400 mt-1">{v2.dash.linksDesc}</p>
              </div>

              {data.links.length === 0 ? (
                <p className="text-xs text-amber-300">{v2.dash.noTrafficYet}</p>
              ) : (
                <div className="space-y-3">
                  {data.links.map((lk) => {
                    const shortUrl = `https://pulse.statementflow.win/r/${lk.code}`;
                    const cvr =
                      lk.clicks_count > 0
                        ? ((lk.conversions_count / lk.clicks_count) * 100).toFixed(1)
                        : "0.0";
                    return (
                      <div
                        key={lk.code}
                        className="rounded-xl border border-white/10 bg-black/40 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 text-[11px] font-[family-name:var(--font-mono)]">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 uppercase">
                              {lk.channel}
                            </span>
                            <span className="text-slate-300 font-semibold">{lk.label}</span>
                          </div>
                          <p className="text-xs font-[family-name:var(--font-mono)] text-emerald-400 truncate">
                            {shortUrl}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums shrink-0">
                          <span className="text-slate-300">
                            {lk.clicks_count} {v2.dash.clicksCol}
                          </span>
                          <span className="text-amber-300">
                            {lk.conversions_count} {v2.dash.convCol} ({cvr}%)
                          </span>
                          <button
                            onClick={() => copyText(lk.code, shortUrl)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white cursor-pointer"
                          >
                            {copiedId === lk.code ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" /> {v2.dash.copied}
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> {v2.dash.copyShortUrl}
                              </>
                            )}
                          </button>
                          <a
                            href={shortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/10"
                          >
                            {v2.dash.testClick} <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {data.campaigns.length > 0 && (
                <form
                  onSubmit={handleCreateCustomLink}
                  className="pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-2"
                >
                  <input
                    type="text"
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    placeholder={v2.dash.createLinkTitle}
                    className="flex-1 rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-xs text-white"
                  />
                  <select
                    value={newLinkChannel}
                    onChange={(e) => setNewLinkChannel(e.target.value)}
                    className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-xs text-white"
                  >
                    <option value="directory">directory</option>
                    <option value="community">community</option>
                    <option value="seo">seo</option>
                    <option value="custom">custom</option>
                  </select>
                  <button
                    type="submit"
                    disabled={creatingLink}
                    className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    {v2.dash.createLinkBtn}
                  </button>
                </form>
              )}
            </div>

            {/* 1 行转化追踪代码 */}
            <div className="rounded-2xl border border-amber-500/30 bg-[#0c1018] p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-white">{v2.dash.pixelTitle}</h2>
                <button
                  onClick={() => copyText("pixel", pixelSnippet)}
                  className="px-3 py-1.5 rounded-lg bg-amber-400/15 text-amber-300 border border-amber-400/35 text-xs font-semibold cursor-pointer"
                >
                  {copiedId === "pixel" ? v2.dash.copied : v2.dash.copyPixel}
                </button>
              </div>
              <p className="text-xs text-slate-400">{v2.dash.pixelDesc}</p>
              <pre className="text-xs font-[family-name:var(--font-mono)] text-emerald-300 bg-black/60 border border-white/10 rounded-xl p-4 overflow-x-auto">
                {pixelSnippet}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 4: 50+ 目录外链进度 */}
        {tab === "directories" && (
          <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">{v2.dash.dirTitle}</h2>
              <p className="text-xs text-slate-400 mt-1">{v2.dash.dirDesc}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 max-h-[540px] overflow-y-auto pr-1">
              {DISTRIBUTION_DIRECTORIES.map((dir) => {
                const live = dirMap.get(dir.id);
                const st = live?.status || "queued";
                const href = live?.live_backlink_url || dir.url;
                return (
                  <a
                    key={dir.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-white/10 bg-black/40 hover:border-emerald-400/40 p-3 flex flex-col justify-between gap-1.5 transition"
                  >
                    <div className="flex items-center justify-between text-[10px] font-[family-name:var(--font-mono)]">
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
                        {st}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white truncate">{dir.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {live?.live_backlink_url ? "Verified Backlink ↗" : dir.category}
                    </p>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: 每日买家雷达 */}
        {tab === "buyers" && (
          <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">{v2.dash.buyersTitle}</h2>
            {data.deliveries.length === 0 ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-3">
                <p className="text-xs text-slate-200">{v2.dash.buyersEmpty}</p>
                <button
                  onClick={() => handleCheckout("radar")}
                  disabled={checkoutLoading !== null}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  {v2.dash.upgradeRadar}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {data.deliveries.map((d) => (
                  <div
                    key={d.lead_id}
                    className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-1.5"
                  >
                    <div className="flex justify-between text-[11px] font-[family-name:var(--font-mono)] text-emerald-300">
                      <span>
                        {d.source} · {d.community}
                      </span>
                      <span className="uppercase">{d.lead_status}</span>
                    </div>
                    <p className="text-sm font-semibold text-white">{d.title}</p>
                    <p className="text-xs text-slate-400">{d.excerpt}</p>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline pt-1"
                    >
                      Open Thread <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: 套餐升级与账单 */}
        {tab === "billing" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">{v2.dash.billingTitle}</h2>
                <p className="text-xs text-slate-400 mt-1">{v2.dash.billingDesc}</p>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <button
                  onClick={() => handleCheckout("blitz")}
                  disabled={checkoutLoading !== null}
                  className="p-5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-left space-y-2 transition cursor-pointer"
                >
                  <p className="text-2xl font-bold text-white">$39</p>
                  <p className="text-xs font-semibold text-amber-300">{v2.dash.upgradeBlitz}</p>
                </button>
                <button
                  onClick={() => handleCheckout("radar")}
                  disabled={checkoutLoading !== null}
                  className="p-5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-left space-y-2 transition cursor-pointer"
                >
                  <p className="text-2xl font-bold text-white">$29/mo</p>
                  <p className="text-xs font-semibold text-emerald-300 inline-flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> {v2.dash.upgradeRadar}
                  </p>
                </button>
                <button
                  onClick={() => handleCheckout("dfy")}
                  disabled={checkoutLoading !== null}
                  className="p-5 rounded-xl border border-white/15 bg-white/[0.03] hover:border-white/35 text-left space-y-2 transition cursor-pointer"
                >
                  <p className="text-2xl font-bold text-white">$299</p>
                  <p className="text-xs font-semibold text-slate-200">{v2.dash.upgradeDfy}</p>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
