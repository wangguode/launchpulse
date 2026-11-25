"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  FolderPlus,
  Globe,
  Layers,
  Link2,
  LogOut,
  Radar,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import AppShell, { type ShellNavItem } from "@/components/ui/AppShell";
import Button from "@/components/ui/Button";
import MetricStrip from "@/components/ui/MetricStrip";
import StatusBadge from "@/components/ui/StatusBadge";
import AnalyticsAreaChart from "@/components/AnalyticsAreaChart";
import DirectoryTable, { type LiveDirState } from "@/components/console/DirectoryTable";
import BrandKitPanel, { type BrandKitData } from "@/components/console/BrandKitPanel";
import ConversionFunnelCard from "@/components/console/ConversionFunnelCard";
import AttributionLinksMatrix, { type TrackingLinkRow } from "@/components/console/AttributionLinksMatrix";
import BuyerRadarProPanel, {
  type RadarLeadRow,
  type RadarMonitorConfig,
} from "@/components/console/BuyerRadarProPanel";

type DashTab = "overview" | "brandkit" | "directories" | "radar" | "links" | "aeo";

interface CampaignRow {
  id: number;
  slug: string;
  product_name: string;
  target_url: string;
  tagline: string;
  competitors: string;
}

interface OverviewPayload {
  user: { id: number; email: string; name: string; role: string };
  orders: Array<{ order_id: string; plan: string; amount_usd: number; status: string; created_at: string }>;
  campaigns: CampaignRow[];
  activeCampaignId: number;
  brandKit: BrandKitData | null;
  links: TrackingLinkRow[];
  directories: Array<{
    directory_id: string;
    status: "queued" | "submitted" | "live";
    live_backlink_url: string;
    updated_at: string;
    moderation_state?: "approved" | "skipped" | "priority";
    scheduled_wave?: number;
    proof_screenshot_url?: string;
    last_http_status?: number;
    is_dofollow_verified?: boolean;
    last_checked_at?: string;
  }>;
  directoryHealth?: Array<{
    directory_id: string;
    moderation_state: "approved" | "skipped" | "priority";
    scheduled_wave: number;
    proof_screenshot_url: string;
    last_http_status: number;
    is_dofollow_verified: number;
    last_checked_at: string;
  }>;
  radarMonitor: RadarMonitorConfig | null;
  radarLeads: RadarLeadRow[];
  publicReport: { share_id: string; title: string; show_revenue: number } | null;
  stats: {
    totalClicks: number;
    totalConversions: number;
    conversionRate: number;
    attributedRevenueUsd: number;
    rpv: number;
    roiMultiple: number;
    clicksDeltaPct: number;
    conversionsDeltaPct: number;
    funnel: { clicks: number; qualifiedVisits: number; signups: number; purchases: number };
    directoriesLive: number;
    directoriesSubmitted: number;
    dailySeries: Array<{ date: string; clicks: number; conversions: number }>;
    channelBreakdown: Array<{ channel: string; clicks: number; conversions: number; cvr: number; revenueUsd?: number; rpv?: number }>;
    countryBreakdown: Array<{ country: string; clicks: number }>;
    deviceBreakdown: Array<{ device: string; clicks: number }>;
    recentClicks: Array<{ code: string; channel: string; country: string; device: string; referer: string; clicked_at: string }>;
  };
}

interface DeepScanResult {
  score: number;
  subScores?: { seo: number; aeo: number; social: number; security: number };
  leaksCount: number;
  leaks: Array<{ severity: string; category: string; title: string; evidence: string }>;
  diagnostics?: {
    ttfbMs: number;
    llmsTxt: { exists: boolean; wordCount: number; generatedPreview: string };
    aiCrawlers: Array<{ bot: string; engine: string; allowed: boolean }>;
    socialPreview: { ogTitle: string; ogDesc: string; ogImage: string; twitterCard: string };
  };
}

function buildSampleOverview(): OverviewPayload {
  const dailySeries = Array.from({ length: 30 }, (_, idx) => {
    const d = new Date(Date.now() - (29 - idx) * 86400 * 1000).toISOString().slice(0, 10);
    const clicks = Math.round(28 + idx * 1.65 + (idx % 4) * 5);
    const conversions = Math.max(1, Math.round(clicks * 0.052));
    return { date: d, clicks, conversions };
  });
  return {
    user: { id: 0, email: "demo@acmeflow.example", name: "AcmeFlow Demo", role: "customer" },
    orders: [{ order_id: "ord_sample", plan: "blitz", amount_usd: 39, status: "active", created_at: "2026-11-10" }],
    campaigns: [
      {
        id: 1,
        slug: "acmeflow",
        product_name: "AcmeFlow",
        target_url: "https://acmeflow.example",
        tagline: "Automated SSL & domain expiry alerts built for indie SaaS teams",
        competitors: "UptimeRobot, Better Stack",
      },
      {
        id: 2,
        slug: "pingvault",
        product_name: "PingVault API",
        target_url: "https://pingvault.example",
        tagline: "Zero-config webhook uptime & latency telemetry for Node & Go",
        competitors: "Checkly, Cronitor",
      },
    ],
    activeCampaignId: 1,
    brandKit: {
      campaign_id: 1,
      short_tagline: "Automated SSL & domain expiry alerts built for indie SaaS teams",
      medium_pitch:
        "AcmeFlow polls TLS handshakes and WHOIS registries every 6 hours from 3 global regions and alerts Slack/email before silent auto-renewal failures cause production outages.",
      long_description:
        "Built for lean engineering teams who want zero-config certificate, DNS, and domain renewal protection without paying $100+/mo for bloated enterprise observability suites.",
      pricing_model: "freemium",
      categories: ["DevOps", "Monitoring", "SaaS", "Developer Tools"],
      competitors: ["UptimeRobot", "Better Stack", "Oh Dear"],
      founder_name: "Alex Chen",
      founder_x: "@alexchen_dev",
      completeness_score: 85,
    },
    links: [
      {
        code: "acme-dir",
        campaign_id: 1,
        channel: "directory",
        label: "100+ High-DR Directory Distribution",
        destination_url: "https://acmeflow.example",
        clicks_count: 788,
        conversions_count: 38,
        revenue_usd: 1102,
        cvr: 4.8,
        rpv: 1.4,
      },
      {
        code: "acme-hn",
        campaign_id: 1,
        channel: "community",
        label: "HN / GitHub Buyer Replies",
        destination_url: "https://acmeflow.example",
        clicks_count: 408,
        conversions_count: 25,
        revenue_usd: 725,
        cvr: 6.1,
        rpv: 1.78,
      },
      {
        code: "acme-vs",
        campaign_id: 1,
        channel: "seo",
        label: "Competitor /vs/ & /llms.txt",
        destination_url: "https://acmeflow.example",
        clicks_count: 212,
        conversions_count: 9,
        revenue_usd: 261,
        cvr: 4.2,
        rpv: 1.23,
      },
    ],
    directories: [],
    radarMonitor: {
      keywords: ["ssl certificate expired", "domain expiry monitor", "tls renewal failed"],
      competitors: ["UptimeRobot", "Better Stack"],
      excludeWords: ["hiring", "freelancer", "what are you working on"],
      sources: ["hn", "github", "devto", "lobsters"],
      last_scanned_at: "2026-11-25 02:40",
    },
    radarLeads: [
      {
        id: 101,
        source: "Hacker News",
        community: "Ask HN",
        author: "@devops_mike",
        title: "Looking for a simple SSL certificate & domain expiry monitor (no enterprise bloat)",
        excerpt:
          "We just had an internal staging cert expire silently over the weekend after Let's Encrypt rate-limited us. Does anyone recommend a clean developer-focused alert tool?",
        url: "https://news.ycombinator.com",
        intent_type: "buying",
        intent_score: 96,
        status: "new",
        posted_at: "2026-11-24",
      },
      {
        id: 102,
        source: "GitHub",
        community: "acme-ops/infra",
        author: "@sarah_sre",
        title: "Cheaper alternative to Better Stack for a 3-person dev shop?",
        excerpt:
          "Love the UI but $100+/mo is overkill right now. We mainly need reliable webhook/email domain & TLS expiry checks across 40 customer domains.",
        url: "https://github.com",
        intent_type: "alternative",
        intent_score: 95,
        status: "replied",
        posted_at: "2026-11-23",
      },
      {
        id: 103,
        source: "DEV.to",
        community: "#devops",
        author: "@indie_kyle",
        title: "Postmortem: how one expired WHOIS renewal took down our checkout API for 4 hours",
        excerpt:
          "Autorenew failed silently on an expired virtual card and registrar emails went straight to spam. Never relying on registrar reminders again.",
        url: "https://dev.to",
        intent_type: "pain",
        intent_score: 91,
        status: "new",
        posted_at: "2026-11-22",
      },
    ],
    publicReport: { share_id: "demo-acmeflow", title: "AcmeFlow · 30-Day Growth Report", show_revenue: 1 },
    stats: {
      totalClicks: 1408,
      totalConversions: 72,
      conversionRate: 5.1,
      attributedRevenueUsd: 2088,
      rpv: 1.48,
      roiMultiple: 53.5,
      clicksDeltaPct: 24.8,
      conversionsDeltaPct: 31.2,
      funnel: { clicks: 1408, qualifiedVisits: 1183, signups: 54, purchases: 18 },
      directoriesLive: 34,
      directoriesSubmitted: 48,
      dailySeries,
      channelBreakdown: [
        { channel: "directory", clicks: 788, conversions: 38, revenueUsd: 1102, cvr: 4.8, rpv: 1.4 },
        { channel: "community", clicks: 408, conversions: 25, revenueUsd: 725, cvr: 6.1, rpv: 1.78 },
        { channel: "seo", clicks: 212, conversions: 9, revenueUsd: 261, cvr: 4.2, rpv: 1.23 },
      ],
      countryBreakdown: [
        { country: "US", clicks: 620 },
        { country: "DE", clicks: 225 },
        { country: "GB", clicks: 197 },
        { country: "JP", clicks: 155 },
        { country: "CA", clicks: 113 },
      ],
      deviceBreakdown: [
        { device: "desktop", clicks: 1098 },
        { device: "mobile", clicks: 310 },
      ],
      recentClicks: [
        { code: "acme-dir", channel: "directory", country: "US", device: "desktop", referer: "alternativeto.net", clicked_at: "2026-11-25 02:18" },
        { code: "acme-hn", channel: "community", country: "DE", device: "desktop", referer: "news.ycombinator.com", clicked_at: "2026-11-25 01:44" },
        { code: "acme-dir", channel: "directory", country: "GB", device: "mobile", referer: "saashub.com", clicked_at: "2026-11-25 00:52" },
        { code: "acme-vs", channel: "seo", country: "JP", device: "desktop", referer: "google.com", clicked_at: "2026-11-24 23:31" },
      ],
    },
  };
}

/**
 * LaunchPulse V4 客户增长操作系统（/dashboard）
 * 6 大高价值工作台：增长总览与归因 · 品牌提交资料库 · 100 目录分发与验活 · 24/7 买家雷达 Pro · 归因短链矩阵 · AEO 工具与账单
 */
export default function DashboardV4Page() {
  const { locale } = useI18n();
  const isZh = locale === "zh";

  const [tab, setTab] = useState<DashTab>("overview");
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number>(0);

  // 新建/编辑推广项目表单
  const [showNewProj, setShowNewProj] = useState(false);
  const [projName, setProjName] = useState("");
  const [projUrl, setProjUrl] = useState("");
  const [projTagline, setProjTagline] = useState("");
  const [savingProj, setSavingProj] = useState(false);
  const [projMsg, setProjMsg] = useState("");

  // 公开战报分享状态
  const [sharingReport, setSharingReport] = useState(false);
  const [shareToast, setShareToast] = useState("");

  // 12 维深度复检 + /vs/ 生成器状态
  const [rescanning, setRescanning] = useState(false);
  const [scanResult, setScanResult] = useState<DeepScanResult | null>(null);
  const [vsComp, setVsComp] = useState("UptimeRobot");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  const loadOverview = useCallback(async (campId?: number) => {
    try {
      const qs = campId ? `?campaignId=${campId}` : "";
      const res = await fetch(`/api/dashboard/overview${qs}`);
      if (res.status === 401) {
        if (typeof window !== "undefined") {
          const sp = new URLSearchParams(window.location.search);
          if (sp.get("sample") === "1") {
            setIsSampleMode(true);
            setData(buildSampleOverview());
            setLoading(false);
            return;
          }
          window.location.href = "/login";
        }
        return;
      }
      if (res.ok) {
        const json = (await res.json()) as OverviewPayload;
        setIsSampleMode(false);
        setData(json);
        setSelectedCampaignId(json.activeCampaignId || json.campaigns[0]?.id || 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("sample") === "1") {
        setIsSampleMode(true);
        setData(buildSampleOverview());
        setLoading(false);
        return;
      }
    }
    loadOverview();
  }, [loadOverview]);

  const effectiveData = useMemo(() => {
    if (isSampleMode) return buildSampleOverview();
    return data;
  }, [isSampleMode, data]);

  const activeCampaign = useMemo(() => {
    const list = effectiveData?.campaigns || [];
    return list.find((c) => c.id === selectedCampaignId) || list[0] || null;
  }, [effectiveData, selectedCampaignId]);

  const dirLiveMap = useMemo(() => {
    const m: Record<string, LiveDirState> = {};
    for (const h of effectiveData?.directoryHealth || []) {
      m[h.directory_id] = {
        status: "queued",
        moderationState: h.moderation_state,
        scheduledWave: h.scheduled_wave,
        proofScreenshotUrl: h.proof_screenshot_url,
        lastHttpStatus: h.last_http_status,
        isDofollowVerified: Boolean(h.is_dofollow_verified),
        lastCheckedAt: h.last_checked_at,
      };
    }
    for (const d of effectiveData?.directories || []) {
      m[d.directory_id] = {
        ...(m[d.directory_id] || {}),
        status: d.status,
        liveBacklinkUrl: d.live_backlink_url,
        updatedAt: d.updated_at,
        moderationState: d.moderation_state || m[d.directory_id]?.moderationState || "approved",
        scheduledWave: d.scheduled_wave || m[d.directory_id]?.scheduledWave || 1,
        proofScreenshotUrl: d.proof_screenshot_url || m[d.directory_id]?.proofScreenshotUrl || "",
        lastHttpStatus: d.last_http_status ?? m[d.directory_id]?.lastHttpStatus ?? 0,
        isDofollowVerified: d.is_dofollow_verified ?? m[d.directory_id]?.isDofollowVerified ?? false,
        lastCheckedAt: d.last_checked_at || m[d.directory_id]?.lastCheckedAt || "",
      };
    }
    return m;
  }, [effectiveData]);

  const handleSwitchProject = async (nextId: number) => {
    setSelectedCampaignId(nextId);
    if (!isSampleMode) {
      await loadOverview(nextId);
    }
  };

  const handleSaveNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSampleMode) {
      setProjMsg(isZh ? "示例预览模式：注册登录后可创建并保存无限推广项目。" : "Sign in to create live projects.");
      return;
    }
    setSavingProj(true);
    setProjMsg("");
    try {
      const res = await fetch("/api/dashboard/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: projName.trim(),
          targetUrl: projUrl.trim(),
          tagline: projTagline.trim(),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; campaign?: { id: number }; error?: string };
      if (!res.ok) {
        setProjMsg(json.error || "Save failed");
      } else {
        setProjName("");
        setProjUrl("");
        setProjTagline("");
        setShowNewProj(false);
        await loadOverview(json.campaign?.id);
      }
    } finally {
      setSavingProj(false);
    }
  };

  const handleModerationChange = async (
    directoryId: string,
    moderationState: "approved" | "skipped" | "priority",
    scheduledWave: number
  ) => {
    if (isSampleMode) return;
    await fetch("/api/dashboard/directory-pref", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: activeCampaign?.id || 0,
        directoryId,
        moderationState,
        scheduledWave,
      }),
    });
    await loadOverview(activeCampaign?.id);
  };

  const handleSharePublicReport = async () => {
    if (isSampleMode) {
      const url = `${window.location.origin}/report/demo-acmeflow`;
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // ignore
      }
      setShareToast(isZh ? `已复制示例战报链接：${url}` : `Copied sample report: ${url}`);
      setTimeout(() => setShareToast(""), 4000);
      return;
    }
    if (!activeCampaign) return;
    setSharingReport(true);
    try {
      const res = await fetch("/api/dashboard/public-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: activeCampaign.id,
          title: `${activeCampaign.product_name} · Growth & Attribution Report`,
          showRevenue: true,
        }),
      });
      const json = (await res.json()) as { reportUrl?: string };
      if (json.reportUrl) {
        try {
          await navigator.clipboard.writeText(json.reportUrl);
        } catch {
          // ignore
        }
        setShareToast(isZh ? `公开只读战报已生成并复制：${json.reportUrl}` : `Public report ready & copied: ${json.reportUrl}`);
        await loadOverview(activeCampaign.id);
        setTimeout(() => setShareToast(""), 5000);
      }
    } finally {
      setSharingReport(false);
    }
  };

  const handleRunDeepScan = async () => {
    const targetUrl = activeCampaign?.target_url || "https://certnudge.dev";
    setRescanning(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: isSampleMode ? "https://certnudge.dev" : targetUrl }),
      });
      if (res.ok) {
        setScanResult((await res.json()) as DeepScanResult);
      }
    } finally {
      setRescanning(false);
    }
  };

  const handleCheckout = async (plan: "blitz" | "radar" | "dfy") => {
    setCheckoutPlan(plan);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          slug: activeCampaign?.slug || "saas",
          targetUrl: activeCampaign?.target_url || "",
          customerEmail: isSampleMode ? "" : effectiveData?.user.email || "",
        }),
      });
      const d = (await res.json()) as { checkoutUrl?: string };
      if (res.ok && d.checkoutUrl) window.location.href = d.checkoutUrl;
    } finally {
      setCheckoutPlan(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // ignore
    }
  };

  const navItems: ShellNavItem[] = [
    { key: "overview", label: isZh ? "增长总览与归因" : "Overview & ROI", icon: <BarChart3 className="w-4 h-4" /> },
    {
      key: "brandkit",
      label: isZh ? "品牌提交资料库" : "Brand Launch Vault",
      icon: <Layers className="w-4 h-4" />,
      badge: effectiveData?.brandKit?.completeness_score ? `${effectiveData.brandKit.completeness_score}%` : undefined,
    },
    {
      key: "directories",
      label: isZh ? "100+ 目录与验活" : "100+ Directories",
      icon: <Globe className="w-4 h-4" />,
      badge: `${isSampleMode ? 34 : effectiveData?.stats.directoriesLive || 0}/100`,
    },
    {
      key: "radar",
      label: isZh ? "24/7 买家雷达" : "Buyer Radar Pro",
      icon: <Radar className="w-4 h-4" />,
      badge: effectiveData?.radarLeads?.length ? String(effectiveData.radarLeads.length) : undefined,
    },
    { key: "links", label: isZh ? "归因短链与像素" : "Links & Pixel", icon: <Link2 className="w-4 h-4" /> },
    { key: "aeo", label: isZh ? "AEO 工具与账单" : "AEO Kit & Billing", icon: <Wrench className="w-4 h-4" /> },
  ];

  if (loading || !effectiveData) {
    return (
      <div className="min-h-screen bg-[var(--apple-bg)] text-[var(--apple-ink-secondary)] flex items-center justify-center text-[13px]">
        {isZh ? "正在加载 LaunchPulse V4 增长控制台..." : "Loading LaunchPulse V4 Growth OS..."}
      </div>
    );
  }

  const stats = effectiveData.stats;
  const communityShortlink = effectiveData.links.find((l) => l.channel === "community")
    ? `https://pulse.statementflow.win/r/${effectiveData.links.find((l) => l.channel === "community")!.code}`
    : activeCampaign?.target_url || "https://your-saas.com";

  const generatedLlms =
    scanResult?.diagnostics?.llmsTxt.generatedPreview ||
    `# ${activeCampaign?.product_name || "Your SaaS"}\n\n> ${activeCampaign?.tagline || "Fast, focused SaaS product."}\n\n## Core Links\n- Website: ${activeCampaign?.target_url || "https://your-saas.com"}\n- Competitors: ${activeCampaign?.competitors || "Legacy suites"}\n`;

  const generatedVsMd = `# ${activeCampaign?.product_name || "Your SaaS"} vs ${vsComp}: Honest 2026 Comparison\n\n> Looking for a faster, lighter alternative to ${vsComp} without bloated enterprise pricing?\n\n| Dimension | ${activeCampaign?.product_name || "Your SaaS"} | ${vsComp} |\n| :--- | :--- | :--- |\n| Setup Time | < 2 minutes | 30+ minutes |\n| Pricing | Transparent flat pricing | Per-seat enterprise tiers |\n| Core Edge | ${activeCampaign?.tagline || "Focused workflow automation"} | Legacy multi-product bundle |\n\n👉 Try ${activeCampaign?.product_name || "Your SaaS"} free at ${activeCampaign?.target_url || "https://your-saas.com"}\n`;

  const currentTabTitle = navItems.find((n) => n.key === tab)?.label || "Dashboard";

  return (
    <AppShell
      scopeBadge="V4 OS"
      navItems={navItems}
      activeKey={tab}
      onSelect={(id) => setTab(id as DashTab)}
      title={currentTabTitle}
      subtitle={activeCampaign?.product_name || effectiveData.user.name}
      headerActions={
        isSampleMode ? (
          <Link
            href="/login"
            className="inline-flex items-center px-3.5 py-1.5 rounded-full lp-btn-primary text-[12px] font-medium whitespace-nowrap"
          >
            {isZh ? "免费注册使用" : "Start Free"}
          </Link>
        ) : (
          <Button type="button" variant="primary" size="sm" loading={sharingReport} onClick={handleSharePublicReport}>
            <Share2 className="w-3.5 h-3.5" />
            {isZh ? "分享公开战报" : "Share Report"}
          </Button>
        )
      }
      sidebarFooter={
        <div className="space-y-3">
          {/* 多项目切换器 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[var(--apple-ink-tertiary)]">
              <span>{isZh ? "当前工作空间项目" : "Active Project"}</span>
              <button
                type="button"
                onClick={() => {
                  setShowNewProj(true);
                  setTab("brandkit");
                }}
                className="text-[var(--apple-blue)] hover:underline font-medium cursor-pointer"
              >
                + {isZh ? "新建" : "New"}
              </button>
            </div>
            <select
              value={activeCampaign?.id || 0}
              onChange={(e) => handleSwitchProject(Number(e.target.value))}
              className="w-full h-8 px-2.5 rounded-[8px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[12px] font-medium text-[var(--apple-ink)] outline-none"
            >
              {effectiveData.campaigns.length === 0 ? (
                <option value={0}>{isZh ? "未创建项目" : "No projects yet"}</option>
              ) : (
                effectiveData.campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.product_name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="pt-2 border-t border-[var(--apple-border)] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[var(--apple-ink)] truncate">{effectiveData.user.name}</p>
              <p className="text-[11px] text-[var(--apple-ink-tertiary)] truncate">{effectiveData.user.email}</p>
            </div>
            {!isSampleMode && (
              <button
                type="button"
                onClick={handleLogout}
                title="Logout"
                className="p-1.5 rounded-lg text-[var(--apple-ink-tertiary)] hover:text-[var(--apple-ink)] cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      }
    >
      {/* 示例数据预览条 */}
      {isSampleMode && (
        <div className="rounded-[14px] border border-[var(--apple-border)] bg-[var(--apple-surface)] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[12px]">
          <span className="text-[var(--apple-ink-secondary)]">
            <strong className="text-[var(--apple-ink)]">{isZh ? "V4 示例数据预览模式：" : "V4 Live Sandbox Mode:"}</strong>{" "}
            {isZh
              ? "正在体验 AcmeFlow 投流 30 天后的完整增长 OS（100+ 目录验活、4 阶漏斗、买家雷达 Pro 与公开战报）。"
              : "Exploring AcmeFlow's full 30-day Growth OS with 100 directories, attribution funnel & Buyer Radar Pro."}
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/report/demo-acmeflow" className="text-[var(--apple-blue)] font-medium hover:underline">
              {isZh ? "查看公开战报页 ↗" : "Public Report ↗"}
            </Link>
            <Link href="/login" className="text-[var(--apple-blue)] font-semibold hover:underline">
              {isZh ? "注册我的账号 →" : "Create Account →"}
            </Link>
          </div>
        </div>
      )}

      {shareToast && (
        <div className="rounded-[12px] bg-[var(--apple-green-soft)] text-[var(--apple-green)] px-4 py-2.5 text-[12px] font-medium flex items-center justify-between gap-2">
          <span>{shareToast}</span>
          {effectiveData.publicReport?.share_id && (
            <a
              href={`/report/${effectiveData.publicReport.share_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold whitespace-nowrap"
            >
              {isZh ? "立即预览 ↗" : "Preview ↗"}
            </a>
          )}
        </div>
      )}

      {/* ==================== TAB 1: 增长总览与归因 ==================== */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* 首次零项目 3 步引导卡 */}
          {!isSampleMode && effectiveData.campaigns.length === 0 && (
            <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-[16px] font-semibold text-[var(--apple-ink)]">
                  {isZh ? "3 步开启你的海外增长引擎" : "Launch your distribution OS in 3 steps"}
                </h2>
                <p className="text-[13px] text-[var(--apple-ink-secondary)]">
                  {isZh
                    ? "① 创建项目并完善 Brand Kit → ② 勾选 100+ 优先目录与买家雷达关键词 → ③ 粘贴 1 行像素实时追踪美元 ROI。"
                    : "1. Add your SaaS & Brand Kit → 2. Approve target directories & radar keywords → 3. Install 1-line pixel.js."}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="secondary" size="sm" onClick={() => setIsSampleMode(true)}>
                  {isZh ? "查看示例报表" : "Preview Sample"}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setShowNewProj(true);
                    setTab("brandkit");
                  }}
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  {isZh ? "创建首个项目" : "Add First Project"}
                </Button>
              </div>
            </div>
          )}

          {/* 核心 KPI 条（带周期环比 Delta） */}
          <MetricStrip
            items={[
              {
                label: isZh ? "累计导流点击" : "Referral Clicks",
                value: stats.totalClicks.toLocaleString(),
                hint: `${stats.clicksDeltaPct >= 0 ? "+" : ""}${stats.clicksDeltaPct}% ${isZh ? "vs 上 14 天" : "vs prev 14d"}`,
              },
              {
                label: isZh ? "验证转化事件" : "Conversions",
                value: stats.totalConversions.toLocaleString(),
                hint: `${stats.conversionsDeltaPct >= 0 ? "+" : ""}${stats.conversionsDeltaPct}% ${isZh ? "环比" : "delta"}`,
              },
              {
                label: isZh ? "整体转化率 (CVR)" : "Conversion Rate",
                value: `${stats.conversionRate}%`,
                accent: true,
                hint: `RPV $${stats.rpv.toFixed(2)}`,
              },
              {
                label: isZh ? "归因美元营收" : "Attributed Revenue",
                value: `$${stats.attributedRevenueUsd.toLocaleString()}`,
                hint: stats.roiMultiple > 0 ? `${stats.roiMultiple}× ROI` : isZh ? "接入像素实时归因" : "Via pixel.js",
              },
              {
                label: isZh ? "已收录高权重目录" : "Live Directories",
                value: `${isSampleMode ? 34 : stats.directoriesLive} / 100`,
                hint: `${isSampleMode ? 48 : stats.directoriesSubmitted} ${isZh ? "站已推进" : "in flight"}`,
              },
            ]}
          />

          {/* DataFast 级 4 阶转化漏斗 */}
          <ConversionFunnelCard
            clicks={stats.funnel.clicks}
            qualifiedVisits={stats.funnel.qualifiedVisits}
            signups={stats.funnel.signups}
            purchases={stats.funnel.purchases}
            attributedRevenueUsd={stats.attributedRevenueUsd}
            rpv={stats.rpv}
            roiMultiple={stats.roiMultiple}
            locale={locale}
          />

          {/* 30D 交互折线图 */}
          <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 sm:p-6">
            <AnalyticsAreaChart
              series={stats.dailySeries}
              title={isZh ? "导流点击与转化趋势" : "Clicks & Conversions Trend"}
              clicksLabel={isZh ? "真实点击" : "Clicks"}
              conversionsLabel={isZh ? "注册/付费转化" : "Conversions"}
            />
          </div>

          {/* 渠道 RPV / 国家 / 实时明细三栏 */}
          <div className="grid md:grid-cols-3 gap-4 tabular-nums">
            <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-3.5">
              <h3 className="text-[14px] font-semibold text-[var(--apple-ink)]">
                {isZh ? "各渠道归因与单客产值 (RPV)" : "Channel Revenue & RPV"}
              </h3>
              <div className="space-y-3 text-[13px]">
                {stats.channelBreakdown.map((ch) => (
                  <div key={ch.channel} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize text-[var(--apple-ink)]">{ch.channel}</span>
                      <span className="text-[var(--apple-ink-secondary)]">
                        {ch.clicks} · {ch.cvr}% {ch.revenueUsd ? `· $${ch.revenueUsd}` : ""}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--apple-surface-subtle)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--apple-blue)]"
                        style={{
                          width: `${Math.min(100, Math.max(8, (ch.clicks / Math.max(1, stats.totalClicks)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-3.5">
              <h3 className="text-[14px] font-semibold text-[var(--apple-ink)]">
                {isZh ? "海外访客国家 / 地区分布" : "Top Visitor Countries"}
              </h3>
              <div className="space-y-2.5 text-[13px]">
                {stats.countryBreakdown.slice(0, 5).map((c) => {
                  const pct = stats.totalClicks > 0 ? Math.round((c.clicks / stats.totalClicks) * 100) : 0;
                  return (
                    <div key={c.country} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[var(--apple-ink)]">{c.country}</span>
                        <span className="text-[var(--apple-ink-secondary)]">
                          {c.clicks} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--apple-surface-subtle)] overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--apple-blue)]" style={{ width: `${Math.max(6, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-[var(--apple-ink)]">
                  {isZh ? "实时边缘来路明细" : "Live Referral Stream"}
                </h3>
                <Link
                  href={`/report/${effectiveData.publicReport?.share_id || "demo-acmeflow"}`}
                  className="text-[11px] text-[var(--apple-blue)] hover:underline font-medium"
                >
                  {isZh ? "公开战报 ↗" : "Public Report ↗"}
                </Link>
              </div>
              <div className="divide-y divide-[var(--apple-border)] text-[12px]">
                {stats.recentClicks.slice(0, 5).map((rc, i) => (
                  <div key={`${rc.code}-${i}`} className="py-2 flex items-center justify-between gap-2">
                    <span className="truncate text-[var(--apple-ink)]">
                      {rc.country} · {rc.referer || rc.channel}
                    </span>
                    <span className="text-[11px] text-[var(--apple-ink-tertiary)] shrink-0">
                      {rc.clicked_at.slice(5, 16)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: 品牌提交资料库 & 多项目管理 ==================== */}
      {tab === "brandkit" && (
        <div className="space-y-5">
          {/* 顶部多项目切换与新建表单 */}
          <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--apple-ink)]">
                  {isZh ? `我的推广项目矩阵（${effectiveData.campaigns.length}）` : `Projects Workspace (${effectiveData.campaigns.length})`}
                </h2>
                <p className="text-[12px] text-[var(--apple-ink-secondary)]">
                  {isZh ? "单个账号可同时管理多个出海 SaaS 产品，短链、资料库与买家雷达按项目完全隔离。" : "Manage multiple SaaS launches under one workspace with isolated shortlinks and radar monitors."}
                </p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowNewProj((v) => !v)}>
                <FolderPlus className="w-3.5 h-3.5" />
                {showNewProj ? (isZh ? "收起新建" : "Cancel") : isZh ? "添加新 SaaS 项目" : "Add New Project"}
              </Button>
            </div>

            {effectiveData.campaigns.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {effectiveData.campaigns.map((c) => {
                  const active = c.id === activeCampaign?.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSwitchProject(c.id)}
                      className={`px-3.5 py-2 rounded-[12px] border text-left transition cursor-pointer ${
                        active
                          ? "border-[var(--apple-blue)] bg-[var(--apple-blue-soft)]"
                          : "border-[var(--apple-border)] bg-[var(--apple-bg)] hover:border-[var(--apple-border-strong)]"
                      }`}
                    >
                      <p className="text-[13px] font-semibold text-[var(--apple-ink)]">{c.product_name}</p>
                      <p className="text-[11px] font-mono text-[var(--apple-ink-tertiary)]">
                        {c.target_url.replace(/^https?:\/\//, "")}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {(showNewProj || effectiveData.campaigns.length === 0) && (
              <form
                onSubmit={handleSaveNewProject}
                className="pt-3 border-t border-[var(--apple-border)] grid md:grid-cols-3 gap-3 items-end"
              >
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                    {isZh ? "产品名称" : "Product Name"}
                  </label>
                  <input
                    type="text"
                    required
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    placeholder="StatementFlow AI"
                    className="w-full h-10 px-3.5 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[14px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                    {isZh ? "产品官网 URL" : "Website HTTPS URL"}
                  </label>
                  <input
                    type="url"
                    required
                    value={projUrl}
                    onChange={(e) => setProjUrl(e.target.value)}
                    placeholder="https://your-saas.com"
                    className="w-full h-10 px-3.5 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[14px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={projTagline}
                    onChange={(e) => setProjTagline(e.target.value)}
                    placeholder={isZh ? "一句话核心卖点" : "One-sentence pitch"}
                    className="flex-1 h-10 px-3.5 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[14px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
                  />
                  <Button type="submit" variant="primary" size="md" loading={savingProj}>
                    {isZh ? "创建" : "Save"}
                  </Button>
                </div>
                {projMsg && <p className="md:col-span-3 text-[12px] text-[var(--apple-blue)]">{projMsg}</p>}
              </form>
            )}
          </div>

          {/* Brand Launch Kit 资料库 */}
          {activeCampaign && (
            <BrandKitPanel
              campaignId={activeCampaign.id}
              productName={activeCampaign.product_name}
              targetUrl={activeCampaign.target_url}
              initialTagline={activeCampaign.tagline}
              initialCompetitors={activeCampaign.competitors}
              brandKit={effectiveData.brandKit}
              locale={locale}
              isSample={isSampleMode}
              onSaved={() => loadOverview(activeCampaign.id)}
            />
          )}
        </div>
      )}

      {/* ==================== TAB 3: 100+ 目录分发与自动验活 ==================== */}
      {tab === "directories" && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-[18px] font-semibold text-[var(--apple-ink)]">
              {isZh ? "100+ 海外高权重目录分发、选站审批与外链自动验活（DR 38–91）" : "100+ High-DR Directory Distribution, Moderation & Auto-Health"}
            </h2>
            <p className="text-[13px] text-[var(--apple-ink-secondary)]">
              {isZh
                ? "你可以提前置顶「优先」或「跳过」特定目录站；专人按 Week 1→3 自然节奏分批精填提交，Cloudflare Cron 每日自动验活 HTTP 200 与 dofollow 属性。"
                : "Pin priority directories or skip irrelevant ones before paced 3-week human-curated submission. Cloudflare Cron monitors live backlinks daily."}
            </p>
          </div>
          <DirectoryTable
            liveMap={dirLiveMap}
            locale={locale}
            useSampleDefaults={isSampleMode}
            allowModeration={true}
            onModerationChange={handleModerationChange}
          />
        </div>
      )}

      {/* ==================== TAB 4: 24/7 买家意图雷达 Pro ==================== */}
      {tab === "radar" && (
        <BuyerRadarProPanel
          campaignId={activeCampaign?.id || 0}
          productName={activeCampaign?.product_name || "Your SaaS"}
          tagline={activeCampaign?.tagline || ""}
          communityShortlink={communityShortlink}
          monitor={effectiveData.radarMonitor}
          leads={effectiveData.radarLeads || []}
          locale={locale}
          isSample={isSampleMode}
          onRefresh={() => loadOverview(activeCampaign?.id)}
        />
      )}

      {/* ==================== TAB 5: 归因短链矩阵与像素 ==================== */}
      {tab === "links" && (
        <AttributionLinksMatrix
          campaignId={activeCampaign?.id || 0}
          links={effectiveData.links}
          locale={locale}
          isSample={isSampleMode}
          onRefresh={() => loadOverview(activeCampaign?.id)}
        />
      )}

      {/* ==================== TAB 6: 12 维 AEO/SEO 工具与套餐账单 ==================== */}
      {tab === "aeo" && (
        <div className="space-y-6">
          {/* 12 维实时复检卡 */}
          <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--apple-blue)]" />
                  <h2 className="text-[16px] font-semibold text-[var(--apple-ink)]">
                    {isZh ? "12 维深度 AEO / SEO / AI 爬虫实时复检" : "12-Point Deep AEO, SEO & AI Crawler Audit"}
                  </h2>
                </div>
                <p className="text-[12px] text-[var(--apple-ink-secondary)] mt-0.5">
                  {isZh
                    ? "检查 GPTBot / ClaudeBot / PerplexityBot 放行状态、OG 社媒卡片、安全响应头与 /llms.txt 就绪分。"
                    : "Verify GPTBot / ClaudeBot / PerplexityBot access, OG cards, security headers & /llms.txt readiness."}
                </p>
              </div>
              <Button type="button" variant="primary" size="sm" loading={rescanning} onClick={handleRunDeepScan}>
                <RefreshCw className="w-3.5 h-3.5" />
                {isZh ? "立即执行 12 维复检" : "Run 12-Point Re-Scan"}
              </Button>
            </div>

            {scanResult && (
              <div className="space-y-4 pt-2 border-t border-[var(--apple-border)]">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 tabular-nums">
                  {[
                    { l: isZh ? "综合评分" : "Overall", v: `${scanResult.score}/100`, accent: true },
                    { l: "Google SEO", v: `${scanResult.subScores?.seo ?? "-"}` },
                    { l: "AI Search (AEO)", v: `${scanResult.subScores?.aeo ?? "-"}` },
                    { l: "Social & UX", v: `${scanResult.subScores?.social ?? "-"}` },
                    { l: "TTFB", v: `${scanResult.diagnostics?.ttfbMs ?? "-"}ms` },
                  ].map((m) => (
                    <div key={m.l} className="rounded-[12px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-3">
                      <p className="text-[11px] text-[var(--apple-ink-secondary)]">{m.l}</p>
                      <p className={`text-[20px] font-semibold ${m.accent ? "text-[var(--apple-blue)]" : "text-[var(--apple-ink)]"}`}>
                        {m.v}
                      </p>
                    </div>
                  ))}
                </div>

                {scanResult.diagnostics?.aiCrawlers && (
                  <div className="flex flex-wrap gap-2">
                    {scanResult.diagnostics.aiCrawlers.map((b) => (
                      <StatusBadge
                        key={b.bot}
                        tone={b.allowed ? "green" : "red"}
                        label={`${b.bot}: ${b.allowed ? (isZh ? "放行 ✓" : "Allowed") : isZh ? "被拦截 ✕" : "Blocked"}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* llms.txt + /vs/ 竞品对比页双栏生成器 */}
            <div className="grid md:grid-cols-2 gap-4 pt-2">
              <div className="rounded-[14px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[var(--apple-ink)]">public/llms.txt</span>
                  <Button type="button" variant="secondary" size="sm" onClick={() => copyText("llms", generatedLlms)}>
                    {copiedId === "llms" ? <Check className="w-3.5 h-3.5 text-[var(--apple-green)]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === "llms" ? (isZh ? "已复制" : "Copied") : isZh ? "复制清单" : "Copy"}
                  </Button>
                </div>
                <pre className="text-[11px] font-mono text-[var(--apple-ink-secondary)] whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {generatedLlms}
                </pre>
              </div>

              <div className="rounded-[14px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-[var(--apple-ink)]">
                    {isZh ? "竞品 /vs/ 截流页源码" : "Competitor /vs/ Page Generator"}
                  </span>
                  <Button type="button" variant="secondary" size="sm" onClick={() => copyText("vs", generatedVsMd)}>
                    {copiedId === "vs" ? <Check className="w-3.5 h-3.5 text-[var(--apple-green)]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === "vs" ? (isZh ? "已复制" : "Copied") : isZh ? "复制 Markdown" : "Copy MDX"}
                  </Button>
                </div>
                <input
                  type="text"
                  value={vsComp}
                  onChange={(e) => setVsComp(e.target.value)}
                  placeholder="Competitor name"
                  className="w-full h-9 px-3 rounded-[8px] border border-[var(--apple-border-strong)] bg-[var(--apple-surface)] text-[13px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
                />
                <pre className="text-[11px] font-mono text-[var(--apple-ink-secondary)] whitespace-pre-wrap max-h-28 overflow-y-auto">
                  {generatedVsMd}
                </pre>
              </div>
            </div>
          </div>

          {/* 透明商业套餐与 Creem 升级卡 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[var(--apple-blue)]" />
              <h3 className="text-[16px] font-semibold text-[var(--apple-ink)]">
                {isZh ? "升级推流套餐（Creem 安全直连）" : "Upgrade Growth OS Plans"}
              </h3>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">Launch Blitz</p>
                  <p className="apple-display text-3xl font-semibold text-[var(--apple-ink)]">
                    $39 <span className="text-[13px] font-normal text-[var(--apple-ink-secondary)]">{isZh ? "买断" : "one-time"}</span>
                  </p>
                  <p className="text-[12px] text-[var(--apple-ink-secondary)] leading-relaxed">
                    {isZh
                      ? "50+ 高权重目录专人按节奏分批精填提交 + 自动 HTTP/dofollow 验活 + 归因短链与公开战报页。"
                      : "50+ high-DR human-curated submissions, auto backlink health checks, shortlinks & public growth report."}
                  </p>
                </div>
                <Button variant="inverse" fullWidth loading={checkoutPlan === "blitz"} onClick={() => handleCheckout("blitz")}>
                  {isZh ? "启动 50+ 目录分发 — $39" : "Launch 50+ Blitz — $39"}
                </Button>
              </div>

              <div className="rounded-[18px] border-2 border-[var(--apple-blue)] bg-[var(--apple-surface)] p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-semibold text-[var(--apple-blue)]">Growth OS Pro</p>
                    <span className="px-2 py-0.5 rounded-full lp-btn-primary text-[10px] font-medium">
                      <Sparkles className="w-2.5 h-2.5 inline mr-0.5" /> Popular
                    </span>
                  </div>
                  <p className="apple-display text-3xl font-semibold text-[var(--apple-ink)]">
                    $29 <span className="text-[13px] font-normal text-[var(--apple-ink-secondary)]">/mo</span>
                  </p>
                  <p className="text-[12px] text-[var(--apple-ink-secondary)] leading-relaxed">
                    {isZh
                      ? "24/7 自定义关键词买家雷达 Pro（多源扫帖 + 原生回复抽屉 + Slack/Discord 告警）+ 多项目归因漏斗。"
                      : "24/7 custom Buyer Radar Pro, multi-source scanning, native reply studio, webhooks & full revenue funnel."}
                  </p>
                </div>
                <Button variant="primary" fullWidth loading={checkoutPlan === "radar"} onClick={() => handleCheckout("radar")}>
                  {isZh ? "开启 24/7 增长 Pro — $29/月" : "Start Growth OS Pro — $29/mo"}
                </Button>
              </div>

              <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">Concierge 100+ Scale</p>
                  <p className="apple-display text-3xl font-semibold text-[var(--apple-ink)]">
                    $299 <span className="text-[13px] font-normal text-[var(--apple-ink-secondary)]">{isZh ? "7 天全包" : "full-service"}</span>
                  </p>
                  <p className="text-[12px] text-[var(--apple-ink-secondary)] leading-relaxed">
                    {isZh
                      ? "100+ 全目录逐站精填 + 逐站截图凭证 + 直接提 GitHub PR 修复 SEO/AEO 并上线 5 个竞品 /vs/ 页。"
                      : "All 100+ curated directories with screenshot proof + direct GitHub PR for AEO/SEO & 5 /vs/ pages."}
                  </p>
                </div>
                <Button variant="secondary" fullWidth loading={checkoutPlan === "dfy"} onClick={() => handleCheckout("dfy")}>
                  {isZh ? "预约 100+ 全包冲刺 — $299" : "Book Concierge 100+ — $299"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
