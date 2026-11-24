"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Check,
  Copy,
  CreditCard,
  DollarSign,
  Globe,
  Link2,
  Loader2,
  LogOut,
  Monitor,
  MousePointerClick,
  Percent,
  Radar,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import LangSwitcher from "@/components/LangSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import AnalyticsAreaChart from "@/components/AnalyticsAreaChart";
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
    attributedRevenueUsd?: number;
    directoriesLive: number;
    directoriesSubmitted: number;
    dailySeries: Array<{ date: string; clicks: number; conversions: number }>;
    channelBreakdown: Array<{ channel: string; clicks: number; conversions: number; cvr: number }>;
    countryBreakdown?: Array<{ country: string; clicks: number }>;
    deviceBreakdown?: Array<{ device: string; clicks: number }>;
    recentClicks?: Array<{
      code: string;
      channel: string;
      country: string;
      device: string;
      referer: string;
      clicked_at: string;
    }>;
  };
}

type TabKey = "overview" | "campaign" | "links" | "directories" | "buyers" | "billing";

export default function DashboardPage() {
  const { locale, t } = useI18n();
  const v2 = V2_DICTIONARIES[locale];
  const router = useRouter();

  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("overview");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [productName, setProductName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [campaignMsg, setCampaignMsg] = useState("");

  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkChannel, setNewLinkChannel] = useState("directory");
  const [creatingLink, setCreatingLink] = useState(false);

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
  const countries = data.stats.countryBreakdown || [];
  const devices = data.stats.deviceBreakdown || [];
  const recentClicks = data.stats.recentClicks || [];
  const totalDeviceClicks = Math.max(1, devices.reduce((s, d) => s + Number(d.clicks || 0), 0));
  const pixelSnippet = `<script src="https://pulse.statementflow.win/api/pixel.js" defer></script>\n<!-- Call on signup or checkout success: window.lpConvert('signup') -->`;

  const menuItems: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
    { key: "overview", label: v2.dash.menuOverview, icon: <BarChart3 className="w-4 h-4" /> },
    { key: "campaign", label: v2.dash.menuCampaign, icon: <Rocket className="w-4 h-4" /> },
    { key: "links", label: v2.dash.menuLinks, icon: <Link2 className="w-4 h-4" /> },
    { key: "directories", label: v2.dash.menuDirectories, icon: <Globe className="w-4 h-4" /> },
    { key: "buyers", label: v2.dash.menuBuyers, icon: <Radar className="w-4 h-4" /> },
    { key: "billing", label: v2.dash.menuBilling, icon: <CreditCard className="w-4 h-4" /> },
  ];

  const isZh = locale === "zh";
  const isJa = locale === "ja";

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
            <ThemeSwitcher />
          </div>

          <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1.5">
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
                  tab === item.key
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold"
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
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0 shadow-sm"
            >
              {v2.dash.upgradeBlitz}
            </button>
          )}
        </div>

        {/* 未提交项目引导卡片 */}
        {data.campaigns.length === 0 && tab === "overview" && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">{v2.dash.onboardingTitle}</h2>
              <p className="text-xs text-slate-300 max-w-2xl">{v2.dash.onboardingDesc}</p>
            </div>
            <button
              onClick={() => setTab("campaign")}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer"
            >
              {v2.dash.menuCampaign} →
            </button>
          </div>
        )}

        {/* TAB 1: Dub.co / Plausible 级多维流量与转化率报表 */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* 5 大核心 KPI 卡片 */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 tabular-nums">
              <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-4 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{v2.dash.kpiClicks}</span>
                  <MousePointerClick className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white">{data.stats.totalClicks}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-4 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{v2.dash.kpiConversions}</span>
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white">{data.stats.totalConversions}</p>
              </div>

              <div className="rounded-2xl border border-emerald-500/35 bg-[#0c141d] p-4 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-emerald-300 font-medium">
                  <span>{v2.dash.kpiCvr}</span>
                  <Percent className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-400">
                  {data.stats.conversionRate}%
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-4 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{isZh ? "归因转化营收" : isJa ? "帰属売上" : "Attributed Rev"}</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  ${Number(data.stats.attributedRevenueUsd || 0).toFixed(0)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-4 space-y-1.5 col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{v2.dash.kpiDirectories}</span>
                  <Globe className="w-4 h-4 text-sky-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  {data.stats.directoriesLive}
                  <span className="text-sm text-slate-500 font-normal"> / 50</span>
                </p>
              </div>
            </div>

            {/* 交互式 7D / 14D / 30D 双曲线面积图 */}
            <AnalyticsAreaChart
              series={data.stats.dailySeries}
              title={
                isZh
                  ? "真实导流点击与转化趋势（支持 7 / 14 / 30 天切换）"
                  : isJa
                  ? "クリック＆コンバージョン推移（7 / 14 / 30日切替）"
                  : "Traffic & Conversion Trend (7D / 14D / 30D)"
              }
              clicksLabel={v2.dash.chartClicks}
              conversionsLabel={v2.dash.chartConversions}
            />

            {/* 三列 Plausible / Dub 风格多维拆分卡片：渠道 / 国家 / 设备 */}
            <div className="grid lg:grid-cols-3 gap-5">
              {/* 1. 渠道归因 */}
              <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-5 space-y-3.5">
                <h3 className="text-sm font-bold text-white">{v2.dash.channelTitle}</h3>
                {data.stats.channelBreakdown.length === 0 ? (
                  <p className="text-xs text-slate-400">{v2.dash.noTrafficYet}</p>
                ) : (
                  <div className="space-y-3 tabular-nums">
                    {data.stats.channelBreakdown.map((row) => {
                      const pct =
                        data.stats.totalClicks > 0
                          ? Math.max(6, Math.round((row.clicks / data.stats.totalClicks) * 100))
                          : 0;
                      return (
                        <div key={row.channel} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-white uppercase">{row.channel}</span>
                            <span className="text-slate-300">
                              {row.clicks} · <span className="text-emerald-400">{row.cvr}% CVR</span>
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. 访客国家分布 */}
              <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-5 space-y-3.5">
                <h3 className="text-sm font-bold text-white">
                  {isZh ? "访客国家 / 地区分布" : isJa ? "国・地域別トラフィック" : "Top Countries"}
                </h3>
                {countries.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    {isZh ? "产生首笔短链点击后自动统计全球访客分布。" : "Country telemetry appears after your first click."}
                  </p>
                ) : (
                  <div className="space-y-2.5 tabular-nums">
                    {countries.map((c) => {
                      const pct =
                        data.stats.totalClicks > 0
                          ? Math.max(6, Math.round((Number(c.clicks) / data.stats.totalClicks) * 100))
                          : 0;
                      return (
                        <div key={c.country} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-[family-name:var(--font-mono)] text-white">{c.country}</span>
                            <span className="text-slate-400">
                              {c.clicks} ({pct}%)
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full bg-sky-400" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. 设备占比与实时访问流 */}
              <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-5 space-y-4">
                <h3 className="text-sm font-bold text-white">
                  {isZh ? "终端设备分布" : isJa ? "デバイス比率" : "Device Split"}
                </h3>
                {devices.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    {isZh ? "等待真实访客点击..." : "Waiting for live clicks..."}
                  </p>
                ) : (
                  <div className="space-y-2.5 tabular-nums">
                    {devices.map((d) => {
                      const pct = Math.round((Number(d.clicks) / totalDeviceClicks) * 100);
                      return (
                        <div key={d.device} className="flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-1.5 text-white capitalize">
                            {d.device === "mobile" ? (
                              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                            {d.device}
                          </span>
                          <span className="text-slate-300 font-[family-name:var(--font-mono)]">
                            {d.clicks} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-3 border-t border-white/10 space-y-2">
                  <p className="text-[11px] font-[family-name:var(--font-mono)] text-slate-400 uppercase flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    {isZh ? "最新实时点击明细" : isJa ? "最新のクリック履歴" : "Live Click Feed"}
                  </p>
                  {recentClicks.length === 0 ? (
                    <p className="text-[11px] text-slate-500">—</p>
                  ) : (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {recentClicks.slice(0, 6).map((rc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] font-[family-name:var(--font-mono)] text-slate-300"
                        >
                          <span className="truncate">
                            {rc.country} · {rc.channel} ({rc.device})
                          </span>
                          <span className="text-slate-500 shrink-0">{rc.clicked_at.slice(5, 16)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-slate-200">{v2.dash.noTrafficYet}</p>
                  <button
                    type="button"
                    onClick={() => setTab("campaign")}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer transition"
                  >
                    {isZh ? "去第一步：填写我的网站 →" : isJa ? "ステップ1へ進む →" : "Step 1: Add My SaaS →"}
                  </button>
                </div>
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

        {/* TAB 6: Stripe / Linear 级高信任感付费升级页 */}
        {tab === "billing" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-[family-name:var(--font-display)] font-bold text-white">
                {v2.dash.billingTitle}
              </h2>
              <p className="text-xs text-slate-400">{v2.dash.billingDesc}</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-5 items-stretch">
              {/* $39 50+ 目录外链分发 */}
              <div className="rounded-2xl border border-amber-500/40 bg-[#0c1018] p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase text-amber-300 font-semibold">
                      {t.pricing.fixLabel}
                    </p>
                    <div className="mt-2 flex items-baseline gap-1.5 tabular-nums">
                      <span className="text-4xl font-bold text-white">$39</span>
                      <span className="text-xs text-slate-400">{t.pricing.fixPeriod}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{t.pricing.fixDesc}</p>
                  <ul className="space-y-2.5 text-xs text-slate-200">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{t.pricing.fixF1}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{t.pricing.fixF2}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{t.pricing.fixF3}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>{t.pricing.fixF4Prefix}</strong> {t.pricing.fixF4Text}
                      </span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => handleCheckout("blitz")}
                  disabled={checkoutLoading !== null}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-60"
                >
                  {checkoutLoading === "blitz" ? t.pricing.loadingCheckout : v2.dash.upgradeBlitz}
                </button>
              </div>

              {/* $29/mo 24/7 买家引流雷达 */}
              <div className="rounded-2xl border-2 border-emerald-500/60 bg-[#0c141d] p-6 flex flex-col justify-between space-y-6 relative shadow-lg">
                <span className="absolute -top-3 right-5 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold uppercase tracking-wider">
                  {t.pricing.radarBadge}
                </span>
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase text-emerald-300 font-semibold">
                      {t.pricing.radarLabel}
                    </p>
                    <div className="mt-2 flex items-baseline gap-1.5 tabular-nums">
                      <span className="text-4xl font-bold text-white">$29</span>
                      <span className="text-xs text-slate-400">{t.pricing.radarPeriod}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{t.pricing.radarDesc}</p>
                  <ul className="space-y-2.5 text-xs text-slate-200">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{t.pricing.radarF1}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{t.pricing.radarF2}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{t.pricing.radarF3}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{t.pricing.radarF4}</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => handleCheckout("radar")}
                  disabled={checkoutLoading !== null}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {checkoutLoading === "radar" ? t.pricing.loadingCheckout : v2.dash.upgradeRadar}
                </button>
              </div>

              {/* $299 Done-For-You 首批 100 用户全包 */}
              <div className="rounded-2xl border border-white/15 bg-[#0c1018] p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase text-slate-400 font-semibold">
                      {t.portal.dfyBadge}
                    </p>
                    <div className="mt-2 flex items-baseline gap-1.5 tabular-nums">
                      <span className="text-4xl font-bold text-white">$299</span>
                      <span className="text-xs text-slate-400">
                        {isZh ? "7天全包交付" : isJa ? "7日間丸投げ" : "7-day sprint"}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{t.portal.dfyHeadline}</p>
                  <ul className="space-y-2.5 text-xs text-slate-200">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        {isZh ? "50+ 高权重目录全人工复核提交" : "Manual 50+ high-DR directory submissions"}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        {isZh ? "直接提 GitHub PR 修完所有 SEO/AEO/安全头" : "Clean GitHub PR fixing all SEO/AEO headers"}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        {isZh ? "上线 5 个竞品 /vs/ 截流页 + 7 天代客外联" : "5 competitor /vs/ pages + 7-day outreach"}
                      </span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => handleCheckout("dfy")}
                  disabled={checkoutLoading !== null}
                  className="w-full py-3 rounded-xl border border-white/20 hover:border-emerald-400/60 bg-white/5 text-white font-bold text-xs transition cursor-pointer disabled:opacity-60"
                >
                  {checkoutLoading === "dfy" ? t.pricing.loadingCheckout : v2.dash.upgradeDfy}
                </button>
              </div>
            </div>

            {/* 信任保障条（提升付费观感） */}
            <div className="rounded-xl border border-white/10 bg-[#0c1018] px-5 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
              <span className="inline-flex items-center gap-2 text-slate-200 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {isZh
                  ? "Creem.io 合规收单 · 7 天不满意全额退款保障 · 随时一键取消 · 自动开具发票"
                  : isJa
                  ? "Creem.io 安全決済 · 7日間全額返金保証 · いつでも解約可能 · 領収書自動発行"
                  : "Secured by Creem.io · 7-Day Money-Back Guarantee · Cancel Anytime · Instant Invoice"}
              </span>
              <a href="mailto:hello@statementflow.win" className="text-emerald-400 hover:underline">
                hello@statementflow.win
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
