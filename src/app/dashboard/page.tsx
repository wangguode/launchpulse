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
  Monitor,
  Radar,
  Rocket,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import AnalyticsAreaChart from "@/components/AnalyticsAreaChart";
import DirectoryTable from "@/components/console/DirectoryTable";
import { V2_DICTIONARIES } from "@/lib/v2-i18n";

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
  const isZh = locale === "zh";
  const isJa = locale === "ja";

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
      <main className="min-h-screen bg-[var(--apple-bg)] text-[var(--apple-ink-secondary)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 text-[var(--apple-blue)] animate-spin" />
        <p className="text-[13px]">{v2.dash.loading}</p>
      </main>
    );
  }

  const activeOrder = data.orders.find((o) => o.status === "active");
  const activeCampaign = data.campaigns[0];
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

  const currentMenu = menuItems.find((m) => m.key === tab) || menuItems[0];

  return (
    <div className="min-h-screen bg-[var(--apple-bg)] text-[var(--apple-ink)] flex flex-col lg:flex-row">
      {/* Apple macOS 极简左侧导航栏 */}
      <aside className="lg:w-60 border-b lg:border-b-0 lg:border-r border-[var(--apple-border)] bg-[var(--apple-bg-alt)] flex flex-col justify-between shrink-0">
        <div className="p-4 space-y-5">
          <div className="flex items-center justify-between px-2 pt-1">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold text-[15px] tracking-tight text-[var(--apple-ink)]"
            >
              <BrandMark className="w-5 h-5" />
              <span>LaunchPulse</span>
            </Link>
          </div>

          <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1">
            {menuItems.map((item) => {
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition cursor-pointer text-left ${
                    active
                      ? "bg-[var(--apple-active)] text-[var(--apple-ink)] font-semibold"
                      : "text-[var(--apple-ink-secondary)] hover:bg-[var(--apple-hover)] hover:text-[var(--apple-ink)]"
                  }`}
                >
                  <span className={active ? "text-[var(--apple-blue)]" : "opacity-75"}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-[var(--apple-border)] space-y-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[var(--apple-ink)] truncate">
                {data.user.name}
              </p>
              <p className="text-[11px] text-[var(--apple-ink-tertiary)] truncate">
                {data.user.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title={v2.dash.logout}
              className="p-1.5 rounded-md text-[var(--apple-ink-tertiary)] hover:text-[var(--apple-red)] hover:bg-[var(--apple-hover)] transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between px-1">
            <Link
              href="/admin"
              className="text-[11px] text-[var(--apple-ink-tertiary)] hover:text-[var(--apple-ink)]"
            >
              {v2.nav.admin}
            </Link>
            <span className="text-[11px] text-[var(--apple-ink-tertiary)]">
              {activeOrder ? activeOrder.plan.toUpperCase() : "FREE"}
            </span>
          </div>
        </div>
      </aside>

      {/* 右侧 Apple 风格工作画布 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 56px 毛玻璃顶部工具条 */}
        <header className="sticky top-0 z-30 h-14 apple-glass border-b border-[var(--apple-border)] px-5 sm:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="text-[15px] font-semibold text-[var(--apple-ink)] truncate">
              {currentMenu.label}
            </h1>
            {activeCampaign && (
              <span className="hidden sm:inline-block text-[12px] text-[var(--apple-ink-tertiary)] truncate">
                / {activeCampaign.product_name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ThemeSwitcher />
            <LangSwitcher />
            {!activeOrder && (
              <button
                onClick={() => setTab("billing")}
                className="hidden sm:inline-flex px-3.5 py-1.5 rounded-full bg-[var(--apple-blue)] hover:bg-[var(--apple-blue-hover)] text-white text-[12px] font-medium transition cursor-pointer"
              >
                {isZh ? "开启 50+ 目录投流" : isJa ? "50+配信を開始" : "Start Distribution"}
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-8 max-w-[1100px] w-full mx-auto space-y-6">
          {/* 首次未提交项目的单行克制提示 */}
          {data.campaigns.length === 0 && tab === "overview" && (
            <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[14px] font-semibold text-[var(--apple-ink)]">
                  {v2.dash.onboardingTitle}
                </p>
                <p className="text-[13px] text-[var(--apple-ink-secondary)]">
                  {v2.dash.onboardingDesc}
                </p>
              </div>
              <button
                onClick={() => setTab("campaign")}
                className="px-4 py-2 rounded-full bg-[var(--apple-blue)] hover:bg-[var(--apple-blue-hover)] text-white font-medium text-[13px] shrink-0 cursor-pointer transition"
              >
                {v2.dash.menuCampaign} →
              </button>
            </div>
          )}

          {/* TAB 1: 数据概览与报表 */}
          {tab === "overview" && (
            <div className="space-y-6">
              {/* Apple App Store Connect 风格横向联排指标带（零多余图标，纯数字层次） */}
              <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-[var(--apple-border)] tabular-nums">
                {[
                  { label: v2.dash.kpiClicks, val: String(data.stats.totalClicks) },
                  { label: v2.dash.kpiConversions, val: String(data.stats.totalConversions) },
                  { label: v2.dash.kpiCvr, val: `${data.stats.conversionRate}%`, accent: true },
                  {
                    label: isZh ? "归因转化营收" : isJa ? "帰属売上" : "Attributed Revenue",
                    val: `$${Number(data.stats.attributedRevenueUsd || 0).toFixed(0)}`,
                  },
                  {
                    label: v2.dash.kpiDirectories,
                    val: `${data.stats.directoriesLive} / 50`,
                  },
                ].map((m) => (
                  <div key={m.label} className="p-5 space-y-1.5">
                    <p className="text-[12px] text-[var(--apple-ink-secondary)]">{m.label}</p>
                    <p
                      className={`apple-display text-[28px] font-semibold leading-none ${
                        m.accent ? "text-[var(--apple-blue)]" : "text-[var(--apple-ink)]"
                      }`}
                    >
                      {m.val}
                    </p>
                  </div>
                ))}
              </div>

              <AnalyticsAreaChart
                series={data.stats.dailySeries}
                title={
                  isZh
                    ? "导流点击与转化趋势"
                    : isJa
                    ? "クリック＆コンバージョン推移"
                    : "Referral Clicks & Conversions"
                }
                clicksLabel={v2.dash.chartClicks}
                conversionsLabel={v2.dash.chartConversions}
              />

              <div className="grid lg:grid-cols-3 gap-5">
                {/* 渠道归因 */}
                <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-4">
                  <h3 className="text-[14px] font-semibold text-[var(--apple-ink)]">
                    {v2.dash.channelTitle}
                  </h3>
                  {data.stats.channelBreakdown.length === 0 ? (
                    <p className="text-[13px] text-[var(--apple-ink-tertiary)]">—</p>
                  ) : (
                    <div className="space-y-3 tabular-nums">
                      {data.stats.channelBreakdown.map((row) => {
                        const pct =
                          data.stats.totalClicks > 0
                            ? Math.max(4, Math.round((row.clicks / data.stats.totalClicks) * 100))
                            : 0;
                        return (
                          <div key={row.channel} className="space-y-1.5">
                            <div className="flex justify-between text-[12px]">
                              <span className="font-medium text-[var(--apple-ink)] capitalize">
                                {row.channel}
                              </span>
                              <span className="text-[var(--apple-ink-secondary)]">
                                {row.clicks} · {row.cvr}%
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[var(--apple-bg-alt)] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[var(--apple-blue)]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 国家/地区 */}
                <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-4">
                  <h3 className="text-[14px] font-semibold text-[var(--apple-ink)]">
                    {isZh ? "国家 / 地区分布" : isJa ? "国・地域別" : "Top Countries"}
                  </h3>
                  {countries.length === 0 ? (
                    <p className="text-[13px] text-[var(--apple-ink-tertiary)]">—</p>
                  ) : (
                    <div className="space-y-3 tabular-nums">
                      {countries.map((c) => {
                        const pct =
                          data.stats.totalClicks > 0
                            ? Math.max(4, Math.round((Number(c.clicks) / data.stats.totalClicks) * 100))
                            : 0;
                        return (
                          <div key={c.country} className="space-y-1.5">
                            <div className="flex justify-between text-[12px]">
                              <span className="font-medium text-[var(--apple-ink)]">{c.country}</span>
                              <span className="text-[var(--apple-ink-secondary)]">
                                {c.clicks} ({pct}%)
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[var(--apple-bg-alt)] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[var(--apple-blue)] opacity-75"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 设备与实时点击 */}
                <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-4">
                  <h3 className="text-[14px] font-semibold text-[var(--apple-ink)]">
                    {isZh ? "设备占比与实时明细" : isJa ? "デバイス・最新ログ" : "Devices & Live Feed"}
                  </h3>
                  {devices.length === 0 ? (
                    <p className="text-[13px] text-[var(--apple-ink-tertiary)]">—</p>
                  ) : (
                    <div className="space-y-2 tabular-nums">
                      {devices.map((d) => {
                        const pct = Math.round((Number(d.clicks) / totalDeviceClicks) * 100);
                        return (
                          <div key={d.device} className="flex items-center justify-between text-[12px]">
                            <span className="inline-flex items-center gap-1.5 text-[var(--apple-ink)] capitalize">
                              {d.device === "mobile" ? (
                                <Smartphone className="w-3.5 h-3.5 text-[var(--apple-ink-secondary)]" />
                              ) : (
                                <Monitor className="w-3.5 h-3.5 text-[var(--apple-ink-secondary)]" />
                              )}
                              {d.device}
                            </span>
                            <span className="text-[var(--apple-ink-secondary)]">
                              {d.clicks} ({pct}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {recentClicks.length > 0 && (
                    <div className="pt-3 border-t border-[var(--apple-border)] space-y-1.5">
                      {recentClicks.slice(0, 5).map((rc, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between text-[11px] text-[var(--apple-ink-secondary)] tabular-nums"
                        >
                          <span>
                            {rc.country} · {rc.channel}
                          </span>
                          <span className="text-[var(--apple-ink-tertiary)]">
                            {rc.clicked_at.slice(5, 16)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 我的推广项目 */}
          {tab === "campaign" && (
            <form
              onSubmit={handleSaveCampaign}
              className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-6 sm:p-8 space-y-5 max-w-2xl"
            >
              <div>
                <h2 className="text-[17px] font-semibold text-[var(--apple-ink)]">
                  {v2.dash.campaignTitle}
                </h2>
                <p className="text-[13px] text-[var(--apple-ink-secondary)] mt-1">
                  {v2.dash.campaignDesc}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                    {v2.dash.fieldProduct}
                  </label>
                  <input
                    type="text"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="CertNudge"
                    className="w-full rounded-xl border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2.5 text-[15px] text-[var(--apple-ink)] focus:border-[var(--apple-blue)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                    {v2.dash.fieldUrl}
                  </label>
                  <input
                    type="url"
                    required
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://your-startup.com"
                    className="w-full rounded-xl border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2.5 text-[15px] font-mono text-[var(--apple-ink)] focus:border-[var(--apple-blue)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                    {v2.dash.fieldTagline}
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Know before SSL certs or domains expire."
                    className="w-full rounded-xl border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2.5 text-[15px] text-[var(--apple-ink)] focus:border-[var(--apple-blue)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                    {v2.dash.fieldCompetitors}
                  </label>
                  <input
                    type="text"
                    value={competitors}
                    onChange={(e) => setCompetitors(e.target.value)}
                    placeholder="UptimeRobot, Better Stack"
                    className="w-full rounded-xl border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2.5 text-[15px] text-[var(--apple-ink)] focus:border-[var(--apple-blue)] focus:outline-none"
                  />
                </div>
              </div>

              {campaignMsg && (
                <p className="text-[13px] text-[var(--apple-green)] font-medium">{campaignMsg}</p>
              )}

              <button
                type="submit"
                disabled={savingCampaign}
                className="px-5 py-2.5 rounded-full bg-[var(--apple-blue)] hover:bg-[var(--apple-blue-hover)] text-white font-medium text-[14px] transition cursor-pointer disabled:opacity-60"
              >
                {savingCampaign ? v2.dash.savingBtn : v2.dash.saveCampaignBtn}
              </button>
            </form>
          )}

          {/* TAB 3: 追踪短链与可选转化像素 */}
          {tab === "links" && (
            <div className="space-y-6">
              <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-6 space-y-5">
                <div>
                  <h2 className="text-[16px] font-semibold text-[var(--apple-ink)]">
                    {v2.dash.linksTitle}
                  </h2>
                  <p className="text-[13px] text-[var(--apple-ink-secondary)] mt-1">
                    {v2.dash.linksDesc}
                  </p>
                </div>

                {data.links.length === 0 ? (
                  <div className="rounded-xl bg-[var(--apple-bg-alt)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-[13px] text-[var(--apple-ink-secondary)]">
                      {v2.dash.noTrafficYet}
                    </p>
                    <button
                      type="button"
                      onClick={() => setTab("campaign")}
                      className="px-4 py-2 rounded-full bg-[var(--apple-blue)] text-white font-medium text-[13px] shrink-0 cursor-pointer"
                    >
                      {isZh ? "去填写我的网站 →" : "Step 1: Add My SaaS →"}
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--apple-border)] border-t border-[var(--apple-border)]">
                    {data.links.map((lk) => {
                      const shortUrl = `https://pulse.statementflow.win/r/${lk.code}`;
                      const cvr =
                        lk.clicks_count > 0
                          ? ((lk.conversions_count / lk.clicks_count) * 100).toFixed(1)
                          : "0.0";
                      return (
                        <div
                          key={lk.code}
                          className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-[13px] font-medium text-[var(--apple-ink)]">
                              {lk.label}{" "}
                              <span className="text-[11px] text-[var(--apple-ink-tertiary)] uppercase ml-1">
                                · {lk.channel}
                              </span>
                            </p>
                            <p className="text-[12px] font-mono text-[var(--apple-blue)] truncate">
                              {shortUrl}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[12px] tabular-nums shrink-0">
                            <span className="text-[var(--apple-ink-secondary)]">
                              {lk.clicks_count} {v2.dash.clicksCol} · {lk.conversions_count}{" "}
                              {v2.dash.convCol} ({cvr}%)
                            </span>
                            <button
                              onClick={() => copyText(lk.code, shortUrl)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[var(--apple-border-strong)] hover:bg-[var(--apple-hover)] text-[var(--apple-ink)] cursor-pointer"
                            >
                              {copiedId === lk.code ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-[var(--apple-green)]" />{" "}
                                  {v2.dash.copied}
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
                              className="inline-flex items-center gap-0.5 text-[var(--apple-blue)] hover:underline"
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
                    className="pt-4 border-t border-[var(--apple-border)] flex flex-col sm:flex-row gap-2"
                  >
                    <input
                      type="text"
                      value={newLinkLabel}
                      onChange={(e) => setNewLinkLabel(e.target.value)}
                      placeholder={v2.dash.createLinkTitle}
                      className="flex-1 rounded-xl border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2 text-[13px] text-[var(--apple-ink)]"
                    />
                    <select
                      value={newLinkChannel}
                      onChange={(e) => setNewLinkChannel(e.target.value)}
                      className="rounded-xl border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3 py-2 text-[13px] text-[var(--apple-ink)]"
                    >
                      <option value="directory">directory</option>
                      <option value="community">community</option>
                      <option value="seo">seo</option>
                      <option value="custom">custom</option>
                    </select>
                    <button
                      type="submit"
                      disabled={creatingLink}
                      className="px-4 py-2 rounded-full bg-[var(--apple-ink)] text-[var(--apple-bg)] font-medium text-[13px] cursor-pointer"
                    >
                      {v2.dash.createLinkBtn}
                    </button>
                  </form>
                )}
              </div>

              <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-6 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[15px] font-semibold text-[var(--apple-ink)]">
                    {v2.dash.pixelTitle}
                  </h2>
                  <button
                    onClick={() => copyText("pixel", pixelSnippet)}
                    className="px-3.5 py-1.5 rounded-full border border-[var(--apple-border-strong)] hover:bg-[var(--apple-hover)] text-[12px] font-medium text-[var(--apple-ink)] cursor-pointer"
                  >
                    {copiedId === "pixel" ? v2.dash.copied : v2.dash.copyPixel}
                  </button>
                </div>
                <p className="text-[13px] text-[var(--apple-ink-secondary)]">{v2.dash.pixelDesc}</p>
                <pre className="text-[12px] font-mono text-[var(--apple-ink)] bg-[var(--apple-bg-alt)] border border-[var(--apple-border)] rounded-xl p-4 overflow-x-auto">
                  {pixelSnippet}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: 50+ 高权重目录数据表 */}
          {tab === "directories" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-[17px] font-semibold text-[var(--apple-ink)]">
                  {v2.dash.dirTitle}
                </h2>
                <p className="text-[13px] text-[var(--apple-ink-secondary)]">{v2.dash.dirDesc}</p>
              </div>
              <DirectoryTable liveMap={dirMap} locale={locale} />
            </div>
          )}

          {/* TAB 5: 每日真实买家雷达 */}
          {tab === "buyers" && (
            <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-6 space-y-4">
              <h2 className="text-[16px] font-semibold text-[var(--apple-ink)]">
                {v2.dash.buyersTitle}
              </h2>
              {data.deliveries.length === 0 ? (
                <div className="rounded-xl bg-[var(--apple-bg-alt)] p-5 space-y-3">
                  <p className="text-[13px] text-[var(--apple-ink-secondary)]">
                    {v2.dash.buyersEmpty}
                  </p>
                  <button
                    onClick={() => handleCheckout("radar")}
                    disabled={checkoutLoading !== null}
                    className="px-4 py-2 rounded-full bg-[var(--apple-blue)] text-white font-medium text-[13px] cursor-pointer"
                  >
                    {v2.dash.upgradeRadar}
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[var(--apple-border)]">
                  {data.deliveries.map((d) => (
                    <div key={d.lead_id} className="py-4 space-y-1.5">
                      <div className="flex justify-between text-[11px] text-[var(--apple-ink-tertiary)]">
                        <span>
                          {d.source} · {d.community}
                        </span>
                        <span className="uppercase">{d.lead_status}</span>
                      </div>
                      <p className="text-[14px] font-medium text-[var(--apple-ink)]">{d.title}</p>
                      <p className="text-[13px] text-[var(--apple-ink-secondary)]">{d.excerpt}</p>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[12px] text-[var(--apple-blue)] hover:underline pt-1"
                      >
                        Open Thread <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: Apple Store 风格高级账单升级页 */}
          {tab === "billing" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="apple-display text-2xl font-semibold text-[var(--apple-ink)]">
                  {v2.dash.billingTitle}
                </h2>
                <p className="text-[14px] text-[var(--apple-ink-secondary)]">
                  {v2.dash.billingDesc}
                </p>
              </div>

              <div className="grid lg:grid-cols-3 gap-5 items-stretch">
                {/* $39 */}
                <div className="rounded-[22px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-7 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[12px] font-semibold text-[var(--apple-ink-tertiary)]">
                        {t.pricing.fixLabel}
                      </p>
                      <div className="mt-2 flex items-baseline gap-1.5 tabular-nums">
                        <span className="apple-display text-4xl font-semibold text-[var(--apple-ink)]">
                          $39
                        </span>
                        <span className="text-[13px] text-[var(--apple-ink-tertiary)]">
                          {t.pricing.fixPeriod}
                        </span>
                      </div>
                    </div>
                    <p className="text-[13px] text-[var(--apple-ink-secondary)] leading-relaxed">
                      {t.pricing.fixDesc}
                    </p>
                    <ul className="space-y-2.5 text-[13px] text-[var(--apple-ink-secondary)]">
                      {[t.pricing.fixF1, t.pricing.fixF2, t.pricing.fixF3].map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-[var(--apple-blue)] shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={() => handleCheckout("blitz")}
                    disabled={checkoutLoading !== null}
                    className="w-full py-2.5 rounded-full bg-[var(--apple-ink)] text-[var(--apple-bg)] font-medium text-[14px] transition cursor-pointer disabled:opacity-60"
                  >
                    {checkoutLoading === "blitz" ? t.pricing.loadingCheckout : v2.dash.upgradeBlitz}
                  </button>
                </div>

                {/* $29/mo */}
                <div className="rounded-[22px] border-2 border-[var(--apple-blue)] bg-[var(--apple-surface)] p-7 flex flex-col justify-between space-y-6 relative shadow-[var(--apple-shadow)]">
                  <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-[var(--apple-blue)] text-white text-[11px] font-medium">
                    {t.pricing.radarBadge}
                  </span>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[12px] font-semibold text-[var(--apple-blue)]">
                        {t.pricing.radarLabel}
                      </p>
                      <div className="mt-2 flex items-baseline gap-1.5 tabular-nums">
                        <span className="apple-display text-4xl font-semibold text-[var(--apple-ink)]">
                          $29
                        </span>
                        <span className="text-[13px] text-[var(--apple-ink-tertiary)]">
                          {t.pricing.radarPeriod}
                        </span>
                      </div>
                    </div>
                    <p className="text-[13px] text-[var(--apple-ink-secondary)] leading-relaxed">
                      {t.pricing.radarDesc}
                    </p>
                    <ul className="space-y-2.5 text-[13px] text-[var(--apple-ink-secondary)]">
                      {[t.pricing.radarF1, t.pricing.radarF2, t.pricing.radarF3, t.pricing.radarF4].map(
                        (f) => (
                          <li key={f} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-[var(--apple-blue)] shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                  <button
                    onClick={() => handleCheckout("radar")}
                    disabled={checkoutLoading !== null}
                    className="w-full py-2.5 rounded-full bg-[var(--apple-blue)] hover:bg-[var(--apple-blue-hover)] text-white font-medium text-[14px] transition cursor-pointer disabled:opacity-60"
                  >
                    {checkoutLoading === "radar" ? t.pricing.loadingCheckout : v2.dash.upgradeRadar}
                  </button>
                </div>

                {/* $299 */}
                <div className="rounded-[22px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-7 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[12px] font-semibold text-[var(--apple-ink-tertiary)]">
                        {t.portal.dfyBadge}
                      </p>
                      <div className="mt-2 flex items-baseline gap-1.5 tabular-nums">
                        <span className="apple-display text-4xl font-semibold text-[var(--apple-ink)]">
                          $299
                        </span>
                        <span className="text-[13px] text-[var(--apple-ink-tertiary)]">
                          {isZh ? "7天全包交付" : isJa ? "7日間丸投げ" : "7-day sprint"}
                        </span>
                      </div>
                    </div>
                    <p className="text-[13px] text-[var(--apple-ink-secondary)] leading-relaxed">
                      {t.portal.dfyHeadline}
                    </p>
                    <ul className="space-y-2.5 text-[13px] text-[var(--apple-ink-secondary)]">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[var(--apple-blue)] shrink-0 mt-0.5" />
                        <span>
                          {isZh
                            ? "50+ 高权重目录专人逐站审核提交"
                            : "Hand-submitted 50+ high-DR directories"}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[var(--apple-blue)] shrink-0 mt-0.5" />
                        <span>
                          {isZh
                            ? "直接提 GitHub PR 修完所有 SEO/AEO/安全头"
                            : "Clean GitHub PR fixing all SEO/AEO headers"}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[var(--apple-blue)] shrink-0 mt-0.5" />
                        <span>
                          {isZh
                            ? "上线 5 个竞品 /vs/ 截流页 + 7 天代客外联"
                            : "5 competitor /vs/ pages + 7-day outreach"}
                        </span>
                      </li>
                    </ul>
                  </div>
                  <button
                    onClick={() => handleCheckout("dfy")}
                    disabled={checkoutLoading !== null}
                    className="w-full py-2.5 rounded-full border border-[var(--apple-border-strong)] hover:bg-[var(--apple-hover)] text-[var(--apple-ink)] font-medium text-[14px] transition cursor-pointer disabled:opacity-60"
                  >
                    {checkoutLoading === "dfy" ? t.pricing.loadingCheckout : v2.dash.upgradeDfy}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 text-[12px] text-[var(--apple-ink-secondary)] pt-2">
                <span className="inline-flex items-center gap-1.5 font-medium text-[var(--apple-ink)]">
                  <ShieldCheck className="w-4 h-4 text-[var(--apple-blue)]" />
                  {isZh
                    ? "Creem.io 合规收单 · 7 天无理由退款保障 · 随时一键取消"
                    : isJa
                    ? "Creem.io 安全決済 · 7日間全額返金保証 · いつでも解約可能"
                    : "Secured by Creem.io · 7-Day Money-Back Guarantee · Cancel Anytime"}
                </span>
                <a
                  href="mailto:hello@statementflow.win"
                  className="text-[var(--apple-blue)] hover:underline"
                >
                  hello@statementflow.win
                </a>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
