"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Eye,
  Globe,
  Link2,
  Loader2,
  LogOut,
  Monitor,
  Radar,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import AppShell, { type ShellNavItem } from "@/components/ui/AppShell";
import Button from "@/components/ui/Button";
import MetricStrip from "@/components/ui/MetricStrip";
import StatusBadge from "@/components/ui/StatusBadge";
import AnalyticsAreaChart from "@/components/AnalyticsAreaChart";
import DirectoryTable, { type LiveDirState } from "@/components/console/DirectoryTable";
import { DISTRIBUTION_DIRECTORIES } from "@/data/directories";
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

/**
 * 构建真实感十足的 30 天样板数据（供未付费/空态客户一键体验完整报表与履约效果）
 */
function buildSamplePayload(): DashboardPayload {
  const dailySeries = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400 * 1000).toISOString().slice(0, 10);
    const clicks = Math.round(18 + i * 1.6 + ((i * 7) % 13));
    const conversions = Math.max(1, Math.round(clicks * 0.052));
    return { date: d, clicks, conversions };
  });
  const totalClicks = dailySeries.reduce((s, p) => s + p.clicks, 0);
  const totalConversions = dailySeries.reduce((s, p) => s + p.conversions, 0);
  const sampleDirs = DISTRIBUTION_DIRECTORIES.map((dir, idx) => ({
    directory_id: dir.id,
    status: (idx < 34 ? "live" : idx < 44 ? "submitted" : "queued") as
      | "live"
      | "submitted"
      | "queued",
    live_backlink_url: idx < 34 ? `${dir.url}/product/acmeflow` : "",
  }));

  return {
    user: { id: 0, email: "demo@acmeflow.example", name: "AcmeFlow Demo", role: "customer" },
    orders: [
      {
        order_id: "ord_sample_blitz",
        plan: "blitz",
        amount_usd: 39,
        status: "active",
        created_at: new Date(Date.now() - 18 * 86400 * 1000).toISOString(),
      },
    ],
    campaigns: [
      {
        id: 999,
        slug: "acmeflow",
        product_name: "AcmeFlow",
        target_url: "https://acmeflow.example",
        tagline: "Automated SSL & API uptime monitoring for indie SaaS teams.",
        competitors: "UptimeRobot, Better Stack",
        status: "active",
      },
    ],
    links: [
      {
        code: "acmed-dir82",
        campaign_id: 999,
        channel: "directory",
        label: "50+ Directory Distribution",
        destination_url: "https://acmeflow.example",
        clicks_count: Math.round(totalClicks * 0.56),
        conversions_count: Math.round(totalConversions * 0.52),
      },
      {
        code: "acmec-hn94",
        campaign_id: 999,
        channel: "community",
        label: "HN / Reddit Buyer Replies",
        destination_url: "https://acmeflow.example",
        clicks_count: Math.round(totalClicks * 0.29),
        conversions_count: Math.round(totalConversions * 0.34),
      },
      {
        code: "acmes-vs01",
        campaign_id: 999,
        channel: "seo",
        label: "Competitor /vs/ & /llms.txt",
        destination_url: "https://acmeflow.example",
        clicks_count: totalClicks - Math.round(totalClicks * 0.85),
        conversions_count: totalConversions - Math.round(totalConversions * 0.86),
      },
    ],
    directories: sampleDirs,
    deliveries: [
      {
        lead_id: "sample-1",
        source: "Hacker News",
        community: "Ask HN",
        title: "Looking for a simple SSL certificate & domain expiry monitor (no enterprise bloat)",
        excerpt:
          "We just had an internal staging cert expire silently over the weekend. Does anyone recommend a clean developer-focused alert tool?",
        url: "https://news.ycombinator.com/",
        lead_status: "replied",
        delivered_at: new Date(Date.now() - 86400 * 1000).toISOString(),
      },
      {
        lead_id: "sample-2",
        source: "Reddit",
        community: "r/SaaS",
        title: "Cheaper alternative to Better Stack for a 3-person dev shop?",
        excerpt:
          "Love the clean UI but $100+/mo is overkill right now. We mainly need webhook/email expiry & uptime checks.",
        url: "https://www.reddit.com/r/SaaS/",
        lead_status: "new",
        delivered_at: new Date().toISOString(),
      },
    ],
    stats: {
      totalClicks,
      totalConversions,
      conversionRate: Number(((totalConversions / totalClicks) * 100).toFixed(1)),
      attributedRevenueUsd: totalConversions * 29,
      directoriesLive: 34,
      directoriesSubmitted: 44,
      dailySeries,
      channelBreakdown: [
        { channel: "directory", clicks: Math.round(totalClicks * 0.56), conversions: Math.round(totalConversions * 0.52), cvr: 4.8 },
        { channel: "community", clicks: Math.round(totalClicks * 0.29), conversions: Math.round(totalConversions * 0.34), cvr: 6.1 },
        { channel: "seo", clicks: totalClicks - Math.round(totalClicks * 0.85), conversions: totalConversions - Math.round(totalConversions * 0.86), cvr: 4.9 },
      ],
      countryBreakdown: [
        { country: "US", clicks: Math.round(totalClicks * 0.44) },
        { country: "DE", clicks: Math.round(totalClicks * 0.16) },
        { country: "GB", clicks: Math.round(totalClicks * 0.14) },
        { country: "JP", clicks: Math.round(totalClicks * 0.11) },
        { country: "CA", clicks: Math.round(totalClicks * 0.08) },
      ],
      deviceBreakdown: [
        { device: "desktop", clicks: Math.round(totalClicks * 0.78) },
        { device: "mobile", clicks: totalClicks - Math.round(totalClicks * 0.78) },
      ],
      recentClicks: [
        { code: "acmed-dir82", channel: "directory", country: "US", device: "desktop", referer: "alternativeto.net", clicked_at: new Date(Date.now() - 600000).toISOString() },
        { code: "acmec-hn94", channel: "community", country: "DE", device: "desktop", referer: "news.ycombinator.com", clicked_at: new Date(Date.now() - 2400000).toISOString() },
        { code: "acmed-dir82", channel: "directory", country: "GB", device: "mobile", referer: "saashub.com", clicked_at: new Date(Date.now() - 5100000).toISOString() },
        { code: "acmes-vs01", channel: "seo", country: "JP", device: "desktop", referer: "google.com", clicked_at: new Date(Date.now() - 9200000).toISOString() },
      ],
    },
  };
}

type TabKey = "overview" | "campaign" | "directories" | "links" | "buyers" | "billing";

export default function DashboardPage() {
  const { locale, t } = useI18n();
  const v2 = V2_DICTIONARIES[locale];
  const router = useRouter();
  const isZh = locale === "zh";
  const isJa = locale === "ja";

  const [realData, setRealData] = useState<DashboardPayload | null>(null);
  const [sampleMode, setSampleMode] = useState(false);
  const [guestPreview, setGuestPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("overview");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Campaign state
  const [productName, setProductName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [campaignMsg, setCampaignMsg] = useState("");

  // Custom link state
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkChannel, setNewLinkChannel] = useState("directory");
  const [creatingLink, setCreatingLink] = useState(false);

  // SEO Kit (merged from legacy /portal)
  const [vsCompetitor, setVsCompetitor] = useState("UptimeRobot");
  const [rescanning, setRescanning] = useState(false);
  const [rescanScore, setRescanScore] = useState<{ score: number; leaks: number } | null>(null);

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const samplePayload = useMemo(() => buildSamplePayload(), []);

  const loadDashboard = useCallback(async () => {
    const isSampleQuery =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("sample") === "1";

    try {
      const res = await fetch("/api/dashboard/overview");
      if (res.status === 401) {
        if (isSampleQuery) {
          setGuestPreview(true);
          setSampleMode(true);
        } else {
          router.replace("/login");
        }
        return;
      }
      if (res.ok) {
        const json = (await res.json()) as DashboardPayload;
        setRealData(json);
        if (isSampleQuery) setSampleMode(true);
        if (json.campaigns.length > 0) {
          const c = json.campaigns[0];
          setProductName(c.product_name);
          setTargetUrl(c.target_url);
          setTagline(c.tagline);
          setCompetitors(c.competitors);
          if (c.competitors) setVsCompetitor(c.competitors.split(",")[0].trim());
        }
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const data = sampleMode ? samplePayload : realData;

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
    if (sampleMode) {
      router.push("/login");
      return;
    }
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
    if (sampleMode || !realData?.campaigns[0]) return;
    setCreatingLink(true);
    try {
      const res = await fetch("/api/dashboard/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: realData.campaigns[0].id,
          channel: newLinkChannel,
          label: newLinkLabel || "Custom Promo Link",
          destinationUrl: realData.campaigns[0].target_url,
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

  const handleRescan = async () => {
    const url = data?.campaigns[0]?.target_url;
    if (!url || sampleMode) return;
    setRescanning(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const d = (await res.json()) as { score: number; leaksCount: number };
        setRescanScore({ score: d.score, leaks: d.leaksCount });
      }
    } finally {
      setRescanning(false);
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
          email: guestPreview ? "" : data?.user.email || "",
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
  const dirMap = new Map<string, LiveDirState>(
    data.directories.map((d) => [d.directory_id, d])
  );
  const countries = data.stats.countryBreakdown || [];
  const devices = data.stats.deviceBreakdown || [];
  const recentClicks = data.stats.recentClicks || [];
  const totalDeviceClicks = Math.max(1, devices.reduce((s, d) => s + Number(d.clicks || 0), 0));
  const pixelSnippet = `<script src="https://pulse.statementflow.win/api/pixel.js" defer></script>\n<!-- Call on signup or checkout success: window.lpConvert('signup') -->`;
  const generatedLlms = activeCampaign
    ? `# ${activeCampaign.product_name}\n\n> ${activeCampaign.tagline || activeCampaign.product_name}\n\n## Core Details\n- Website: ${activeCampaign.target_url}\n- Competitors: ${activeCampaign.competitors || "Legacy incumbents"}\n`
    : `# Your SaaS\n\n> Add your website in "My SaaS Campaign" to generate your custom /llms.txt.`;

  const navItems: ShellNavItem[] = [
    { key: "overview", label: v2.dash.menuOverview, icon: <BarChart3 className="w-4 h-4" /> },
    { key: "campaign", label: v2.dash.menuCampaign, icon: <Rocket className="w-4 h-4" /> },
    {
      key: "directories",
      label: v2.dash.menuDirectories,
      icon: <Globe className="w-4 h-4" />,
      badge: `${data.stats.directoriesLive}/50`,
    },
    { key: "links", label: v2.dash.menuLinks, icon: <Link2 className="w-4 h-4" /> },
    {
      key: "buyers",
      label: isZh ? "买家雷达与 SEO 增效" : isJa ? "見込み客・SEOキット" : "Buyers & SEO Kit",
      icon: <Radar className="w-4 h-4" />,
    },
    { key: "billing", label: v2.dash.menuBilling, icon: <CreditCard className="w-4 h-4" /> },
  ];

  const currentNav = navItems.find((m) => m.key === tab) || navItems[0];

  // 新手 3 步状态计算
  const step1Done = Boolean(activeCampaign);
  const step2Done = Boolean(activeOrder);
  const step3Done = data.stats.totalClicks > 0 || data.stats.directoriesLive > 0;

  return (
    <AppShell
      navItems={navItems}
      activeKey={tab}
      onSelect={(k) => setTab(k as TabKey)}
      title={currentNav.label}
      subtitle={activeCampaign?.product_name}
      headerActions={
        <div className="flex items-center gap-2">
          {!guestPreview && (
            <button
              type="button"
              onClick={() => setSampleMode((s) => !s)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-medium transition cursor-pointer ${
                sampleMode
                  ? "border-[var(--apple-blue)] bg-[var(--apple-blue-soft)] text-[var(--apple-blue)]"
                  : "border-[var(--apple-border-strong)] text-[var(--apple-ink-secondary)] hover:text-[var(--apple-ink)]"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {sampleMode
                  ? isZh
                    ? "退出示例预览"
                    : "Exit Sample"
                  : isZh
                  ? "示例数据预览"
                  : "Sample Data"}
              </span>
            </button>
          )}
          {guestPreview ? (
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-full lp-btn-primary text-[12px] font-medium"
            >
              {isZh ? "免费注册使用" : "Create Free Account"}
            </Link>
          ) : !activeOrder ? (
            <Button size="sm" onClick={() => setTab("billing")}>
              {isZh ? "开启 50+ 目录投流" : isJa ? "50+配信を開始" : "Start Distribution"}
            </Button>
          ) : null}
        </div>
      }
      sidebarFooter={
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[var(--apple-ink)] truncate">
              {data.user.name}
            </p>
            <p className="text-[11px] text-[var(--apple-ink-tertiary)] truncate">
              {activeOrder ? activeOrder.plan.toUpperCase() : "FREE"} · {data.user.email}
            </p>
          </div>
          {!guestPreview && (
            <button
              onClick={handleLogout}
              title={v2.dash.logout}
              className="p-1.5 rounded-md text-[var(--apple-ink-tertiary)] hover:text-[var(--apple-red)] hover:bg-[var(--apple-hover)] transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      }
    >
      {/* 示例数据预览提示条 */}
      {sampleMode && (
        <div className="rounded-[14px] border border-[var(--apple-border)] bg-[var(--apple-bg-alt)] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-[13px]">
          <span className="text-[var(--apple-ink-secondary)]">
            <strong className="text-[var(--apple-ink)]">
              {isZh ? "示例数据预览模式：" : "Sample Data Preview:"}
            </strong>{" "}
            {isZh
              ? "你正在查看 AcmeFlow 投流 30 天后的真实报表形态（34 个目录已收录、1,200+ 次导流点击）。"
              : "Viewing a realistic 30-day distribution snapshot for AcmeFlow."}
          </span>
          {guestPreview ? (
            <Link
              href="/login"
              className="text-[12px] font-medium text-[var(--apple-blue)] hover:underline"
            >
              {isZh ? "注册我的账号并开始投流 →" : "Create Account to Launch →"}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setSampleMode(false)}
              className="text-[12px] font-medium text-[var(--apple-blue)] hover:underline cursor-pointer"
            >
              {isZh ? "切换回我的真实数据 →" : "Back to My Real Data →"}
            </button>
          )}
        </div>
      )}

      {/* TAB 1: 数据概览与报表 */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* 3 步启动清单（仅真实账号未完成全部步骤时显示，告别冰冷空壳感） */}
          {!sampleMode && (!step1Done || !step2Done || !step3Done) && (
            <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-[14px] font-semibold text-[var(--apple-ink)]">
                    {isZh
                      ? "3 步启动你的 SaaS 人工目录投流与流量归因"
                      : isJa
                      ? "3ステップでSaaS集客を開始"
                      : "3 Steps to Start Your SaaS Traffic Distribution"}
                  </h2>
                  <p className="text-[12px] text-[var(--apple-ink-secondary)] mt-0.5">
                    {isZh
                      ? "想先看填满数据后的效果？点右上角「示例数据预览」即可秒看 30 天增长报表。"
                      : "Click Sample Data above to preview a populated 30-day growth report."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSampleMode(true)}
                  className="text-[12px] font-medium text-[var(--apple-blue)] hover:underline cursor-pointer"
                >
                  {isZh ? "先看示例效果 ›" : "Preview sample ›"}
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                {[
                  {
                    done: step1Done,
                    step: "01",
                    title: isZh ? "提交你的网站信息" : "Add your SaaS URL",
                    desc: isZh ? "自动签发 3 条边缘归因短链" : "Auto-creates 3 attribution links",
                    action: () => setTab("campaign"),
                    btn: isZh ? "去填写" : "Add URL",
                  },
                  {
                    done: step2Done,
                    step: "02",
                    title: isZh ? "开启 50+ 人工目录投流" : "Launch 50+ Directories",
                    desc: isZh ? "专员逐站人工提交（$39 买断）" : "Hand-submitted ($39 one-time)",
                    action: () => setTab("billing"),
                    btn: isZh ? "查看套餐" : "View Plans",
                  },
                  {
                    done: step3Done,
                    step: "03",
                    title: isZh ? "验收收录外链与点击" : "Track Backlinks & Clicks",
                    desc: isZh ? "实时查看目录收录与 CVR%" : "Monitor live backlinks & CVR%",
                    action: () => setTab("directories"),
                    btn: isZh ? "看目录表" : "Open Table",
                  },
                ].map((s) => (
                  <div
                    key={s.step}
                    className="rounded-[14px] border border-[var(--apple-border)] bg-[var(--apple-bg-alt)] p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-[var(--apple-blue)] font-semibold">
                          STEP {s.step}
                        </span>
                        {s.done && (
                          <CheckCircle2 className="w-4 h-4 text-[var(--apple-green-dot)]" />
                        )}
                      </div>
                      <p className="text-[13px] font-semibold text-[var(--apple-ink)]">{s.title}</p>
                      <p className="text-[12px] text-[var(--apple-ink-secondary)]">{s.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={s.action}
                      className="text-left text-[12px] font-medium text-[var(--apple-blue)] hover:underline cursor-pointer"
                    >
                      {s.btn} →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5 列 Apple 联排指标带 */}
          <MetricStrip
            items={[
              { label: v2.dash.kpiClicks, value: String(data.stats.totalClicks) },
              { label: v2.dash.kpiConversions, value: String(data.stats.totalConversions) },
              { label: v2.dash.kpiCvr, value: `${data.stats.conversionRate}%`, accent: true },
              {
                label: isZh ? "归因转化营收" : isJa ? "帰属売上" : "Attributed Revenue",
                value: `$${Number(data.stats.attributedRevenueUsd || 0).toFixed(0)}`,
              },
              {
                label: v2.dash.kpiDirectories,
                value: `${data.stats.directoriesLive} / 50`,
              },
            ]}
          />

          {/* 交互式 7D / 14D / 30D 面积折线图 */}
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

          {/* 三列多维归因面板 */}
          <div className="grid lg:grid-cols-3 gap-5">
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
                      <span className="truncate">
                        {rc.country} · {rc.referer || rc.channel}
                      </span>
                      <span className="text-[var(--apple-ink-tertiary)] shrink-0">
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
                value={sampleMode ? "AcmeFlow" : productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="CertNudge"
                className="w-full rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2.5 text-[16px] sm:text-[14px] text-[var(--apple-ink)] focus:border-[var(--apple-blue)] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                {v2.dash.fieldUrl}
              </label>
              <input
                type="url"
                required
                value={sampleMode ? "https://acmeflow.example" : targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://your-startup.com"
                className="w-full rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2.5 text-[16px] sm:text-[14px] font-mono text-[var(--apple-ink)] focus:border-[var(--apple-blue)] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                {v2.dash.fieldTagline}
              </label>
              <input
                type="text"
                value={sampleMode ? "Automated SSL & API uptime monitoring." : tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Know before SSL certs or domains expire."
                className="w-full rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2.5 text-[16px] sm:text-[14px] text-[var(--apple-ink)] focus:border-[var(--apple-blue)] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                {v2.dash.fieldCompetitors}
              </label>
              <input
                type="text"
                value={sampleMode ? "UptimeRobot, Better Stack" : competitors}
                onChange={(e) => setCompetitors(e.target.value)}
                placeholder="UptimeRobot, Better Stack"
                className="w-full rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2.5 text-[16px] sm:text-[14px] text-[var(--apple-ink)] focus:border-[var(--apple-blue)] focus:outline-none"
              />
            </div>
          </div>

          {campaignMsg && (
            <p className="text-[13px] text-[var(--apple-green)] font-medium">{campaignMsg}</p>
          )}

          <Button type="submit" disabled={savingCampaign} size="md">
            {savingCampaign ? v2.dash.savingBtn : v2.dash.saveCampaignBtn}
          </Button>
        </form>
      )}

      {/* TAB 3: 50+ 人工高权重目录数据表（带搜索、状态筛选、CSV导出） */}
      {tab === "directories" && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-[17px] font-semibold text-[var(--apple-ink)]">
              {v2.dash.dirTitle}
            </h2>
            <p className="text-[13px] text-[var(--apple-ink-secondary)]">{v2.dash.dirDesc}</p>
          </div>
          <DirectoryTable
            liveMap={dirMap}
            locale={locale}
            exportSlug={activeCampaign?.slug || "launchpulse"}
          />
        </div>
      )}

      {/* TAB 4: 追踪短链与可选转化像素 */}
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
              <div className="rounded-[14px] bg-[var(--apple-bg-alt)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-[13px] text-[var(--apple-ink-secondary)]">
                  {v2.dash.noTrafficYet}
                </p>
                <Button size="sm" onClick={() => setTab("campaign")}>
                  {isZh ? "去填写我的网站 →" : "Add My SaaS →"}
                </Button>
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
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => copyText(lk.code, shortUrl)}
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
                        </Button>
                        {!sampleMode && (
                          <a
                            href={shortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[var(--apple-blue)] hover:underline"
                          >
                            {v2.dash.testClick} <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!sampleMode && realData && realData.campaigns.length > 0 && (
              <form
                onSubmit={handleCreateCustomLink}
                className="pt-4 border-t border-[var(--apple-border)] flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="text"
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  placeholder={v2.dash.createLinkTitle}
                  className="flex-1 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2 text-[16px] sm:text-[13px] text-[var(--apple-ink)]"
                />
                <select
                  value={newLinkChannel}
                  onChange={(e) => setNewLinkChannel(e.target.value)}
                  className="rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3 py-2 text-[16px] sm:text-[13px] text-[var(--apple-ink)]"
                >
                  <option value="directory">directory</option>
                  <option value="community">community</option>
                  <option value="seo">seo</option>
                  <option value="custom">custom</option>
                </select>
                <Button type="submit" variant="inverse" size="sm" disabled={creatingLink}>
                  {v2.dash.createLinkBtn}
                </Button>
              </form>
            )}
          </div>

          <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-[var(--apple-ink)]">
                {v2.dash.pixelTitle}
              </h2>
              <Button variant="secondary" size="sm" onClick={() => copyText("pixel", pixelSnippet)}>
                {copiedId === "pixel" ? v2.dash.copied : v2.dash.copyPixel}
              </Button>
            </div>
            <p className="text-[13px] text-[var(--apple-ink-secondary)]">{v2.dash.pixelDesc}</p>
            <pre className="text-[12px] font-mono text-[var(--apple-ink)] bg-[var(--apple-bg-alt)] border border-[var(--apple-border)] rounded-xl p-4 overflow-x-auto">
              {pixelSnippet}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 5: 每日买家雷达 + 合并原 /portal 的 SEO 增效工具箱（Re-Scan / llms.txt / /vs/ 生成器） */}
      {tab === "buyers" && (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-6 space-y-4">
            <h2 className="text-[16px] font-semibold text-[var(--apple-ink)]">
              {v2.dash.buyersTitle}
            </h2>
            {data.deliveries.length === 0 ? (
              <div className="rounded-[14px] bg-[var(--apple-bg-alt)] p-5 space-y-3">
                <p className="text-[13px] text-[var(--apple-ink-secondary)]">
                  {v2.dash.buyersEmpty}
                </p>
                <Button size="sm" onClick={() => handleCheckout("radar")} disabled={checkoutLoading !== null}>
                  {v2.dash.upgradeRadar}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-[var(--apple-border)]">
                {data.deliveries.map((d) => (
                  <div key={d.lead_id} className="py-4 space-y-1.5">
                    <div className="flex justify-between items-center text-[11px] text-[var(--apple-ink-tertiary)]">
                      <span>
                        {d.source} · {d.community}
                      </span>
                      <StatusBadge status={d.lead_status} locale={locale} />
                    </div>
                    <p className="text-[14px] font-medium text-[var(--apple-ink)]">{d.title}</p>
                    <p className="text-[13px] text-[var(--apple-ink-secondary)]">{d.excerpt}</p>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-[12px] text-[var(--apple-blue)] hover:underline pt-1"
                    >
                      {t.portal.openThreadReply} <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 右侧：随赠 SEO 增效工具箱（原 /portal 功能无缝收编） */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[14px] font-semibold text-[var(--apple-ink)]">
                  {isZh ? "一键官网健康复检 (Re-Scan)" : "Live Site Re-Scan"}
                </h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRescan}
                  disabled={rescanning || !activeCampaign || sampleMode}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${rescanning ? "animate-spin" : ""}`} />
                  {t.portal.rescanBtn}
                </Button>
              </div>
              {rescanScore ? (
                <p className="text-[13px] text-[var(--apple-green)]">
                  {isZh
                    ? `最新评分 ${rescanScore.score}/100，剩余 ${rescanScore.leaks} 项待优化。`
                    : `Score ${rescanScore.score}/100 with ${rescanScore.leaks} remaining leaks.`}
                </p>
              ) : (
                <p className="text-[12px] text-[var(--apple-ink-secondary)]">
                  {isZh
                    ? "修改完网站 SEO 或 /llms.txt 后，随时点击复检验证提分效果。"
                    : "Verify your readiness score jump anytime after deploying SEO fixes."}
                </p>
              )}
            </div>

            <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[var(--apple-ink)]">
                  public/llms.txt
                </span>
                <Button variant="secondary" size="sm" onClick={() => copyText("llms", generatedLlms)}>
                  {copiedId === "llms" ? v2.dash.copied : t.common.copyFile}
                </Button>
              </div>
              <pre className="text-[12px] font-mono text-[var(--apple-ink-secondary)] bg-[var(--apple-bg-alt)] border border-[var(--apple-border)] rounded-xl p-3 whitespace-pre-wrap">
                {generatedLlms}
              </pre>
            </div>

            <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-[var(--apple-ink)]">
                  {t.portal.vsGeneratorTitle}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    copyText(
                      "vs",
                      `# ${activeCampaign?.product_name || "Your SaaS"} vs ${vsCompetitor} (2026)\n\nLooking for a simpler alternative to ${vsCompetitor}? Explore ${activeCampaign?.target_url || "https://your-startup.com"}.\n`
                    )
                  }
                >
                  {copiedId === "vs" ? t.portal.copiedMarkdown : t.portal.copyVsMarkdown}
                </Button>
              </div>
              <input
                type="text"
                value={vsCompetitor}
                onChange={(e) => setVsCompetitor(e.target.value)}
                placeholder={t.portal.competitorPlaceholder}
                className="w-full rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3 py-2 text-[16px] sm:text-[13px] text-[var(--apple-ink)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: Apple Store 风格高级账单升级页 + 已购订单历史 */}
      {tab === "billing" && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="apple-display text-2xl font-semibold text-[var(--apple-ink)]">
              {v2.dash.billingTitle}
            </h2>
            <p className="text-[14px] text-[var(--apple-ink-secondary)]">{v2.dash.billingDesc}</p>
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
                  {[
                    t.pricing.fixF1,
                    isZh
                      ? "控制台实时外链收录进度追踪 + CSV 回执导出"
                      : "Live backlink tracker & CSV export in Dashboard",
                    t.pricing.fixF3,
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[var(--apple-blue)] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                variant="inverse"
                size="md"
                onClick={() => handleCheckout("blitz")}
                disabled={checkoutLoading !== null}
                className="w-full"
              >
                {checkoutLoading === "blitz" ? t.pricing.loadingCheckout : v2.dash.upgradeBlitz}
              </Button>
            </div>

            {/* $29/mo */}
            <div className="rounded-[22px] border-2 border-[var(--apple-blue)] bg-[var(--apple-surface)] p-7 flex flex-col justify-between space-y-6 relative shadow-[var(--apple-shadow)]">
              <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full lp-btn-primary text-[11px] font-medium">
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
              <Button
                variant="primary"
                size="md"
                onClick={() => handleCheckout("radar")}
                disabled={checkoutLoading !== null}
                className="w-full"
              >
                {checkoutLoading === "radar" ? t.pricing.loadingCheckout : v2.dash.upgradeRadar}
              </Button>
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
              <Button
                variant="secondary"
                size="md"
                onClick={() => handleCheckout("dfy")}
                disabled={checkoutLoading !== null}
                className="w-full"
              >
                {checkoutLoading === "dfy" ? t.pricing.loadingCheckout : v2.dash.upgradeDfy}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 text-[12px] text-[var(--apple-ink-secondary)] pt-1">
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
    </AppShell>
  );
}
