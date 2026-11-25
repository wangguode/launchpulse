import { DISTRIBUTION_DIRECTORIES, type DirectoryChannel } from "@/data/directories";

/**
 * LaunchPulse V5 单一数据源绝对对账层（Zero Contradiction Ledger）
 * -----------------------------------------------------------------
 * 所有侧边栏徽章、周排期计数、状态筛选项、4 步转化漏斗、渠道营收拆解均由本模块统一派生，
 * 彻底消除各组件各自硬编码导致的算术自相矛盾。
 */

export interface BrandKitRecord {
  campaign_id?: number;
  logo_url?: string;
  screenshots?: string[];
  short_tagline?: string;
  medium_pitch?: string;
  long_description?: string;
  pricing_model?: string;
  categories?: string[];
  competitors?: string[];
  founder_name?: string;
  founder_x?: string;
  completeness_score?: number;
}

export interface TrackingLinkRecord {
  code: string;
  campaign_id: number;
  channel: string;
  label: string;
  destination_url: string;
  clicks_count: number;
  conversions_count: number;
  revenue_usd?: number;
  cvr?: number;
  rpv?: number;
  created_at?: string;
}

export interface RadarMonitorRecord {
  keywords?: string[];
  competitors?: string[];
  excludeWords?: string[];
  sources?: string[];
  webhook_url?: string;
  daily_digest_enabled?: number;
  last_scanned_at?: string;
}

export interface RadarLeadRecord {
  id: number;
  source: string;
  community: string;
  author: string;
  title: string;
  excerpt: string;
  url: string;
  intent_type: "alternative" | "pain" | "buying";
  intent_score: number;
  status: "new" | "drafted" | "replied" | "won" | "dismissed";
  draft_reply?: string;
  posted_at: string;
  relative_time_zh?: string;
  relative_time_en?: string;
}

export interface CampaignRecord {
  id: number;
  slug: string;
  product_name: string;
  target_url: string;
  tagline: string;
  competitors: string;
}

export interface OverviewPayload {
  user: { id: number; email: string; name: string; role: string };
  orders: Array<{ order_id: string; plan: string; amount_usd: number; status: string; created_at: string }>;
  campaigns: CampaignRecord[];
  activeCampaignId: number;
  brandKit: BrandKitRecord | null;
  links: TrackingLinkRecord[];
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
  radarMonitor: RadarMonitorRecord | null;
  radarLeads: RadarLeadRecord[];
  publicReport: { share_id: string; title: string; show_revenue: number } | null;
  stats: {
    totalClicks: number;
    totalConversions: number;
    conversionRate: number;
    attributedRevenueUsd: number;
    priorRevenueUsd?: number;
    rpv: number;
    roiMultiple: number;
    clicksDeltaPct: number;
    conversionsDeltaPct: number;
    funnel: { clicks: number; qualifiedVisits: number; signups: number; purchases: number };
    directoriesLive: number;
    directoriesSubmitted: number;
    dailySeries: Array<{ date: string; clicks: number; conversions: number; revenueUsd?: number }>;
    channelBreakdown: Array<{
      channel: string;
      clicks: number;
      conversions: number;
      cvr: number;
      revenueUsd?: number;
      rpv?: number;
    }>;
    countryBreakdown: Array<{ country: string; clicks: number }>;
    deviceBreakdown: Array<{ device: string; clicks: number }>;
    recentClicks: Array<{
      code: string;
      channel: string;
      country: string;
      device: string;
      referer: string;
      clicked_at: string;
    }>;
  };
}

export interface ReconciledDirectoryRow extends DirectoryChannel {
  effectiveStatus: "live" | "submitted" | "queued" | "skipped";
  moderationState: "approved" | "skipped" | "priority";
  scheduledWave: 1 | 2 | 3;
  liveBacklinkUrl: string;
  proofScreenshotUrl: string;
  lastHttpStatus: number;
  isDofollowVerified: boolean;
  lastCheckedAt: string;
  attributedClicks: number;
  attributedRevenueUsd: number;
  shortlinkCode: string;
}

export interface ReconciledLedger {
  directories: ReconciledDirectoryRow[];
  dirCounts: {
    total: number;
    live: number;
    submitted: number;
    queued: number;
    skipped: number;
    wave1: number;
    wave2: number;
    wave3: number;
    wave2PendingIds: string[];
  };
  leadCounts: {
    all: number;
    pending: number;
    replied: number;
    won: number;
    dismissed: number;
  };
  revenue: {
    totalUsd: number;
    deltaUsd: number;
    channels: Array<{ key: string; labelZh: string; labelEn: string; clicks: number; revenueUsd: number }>;
    funnel: { clicks: number; visits: number; signups: number; paid: number };
    dailySeries: Array<{ date: string; clicks: number; conversions: number; revenueUsd: number }>;
  };
  brandKit: {
    score: number;
    missingItemsZh: string[];
    missingItemsEn: string[];
  };
  recentVerifiedReceipts: ReconciledDirectoryRow[];
}

/**
 * 地道中文文案转换工具（彻底消灭半翻译黑话）
 */
export function formatSlaLabel(sla: string, isZh: boolean): string {
  if (!isZh) return sla === "Instant" ? "Instant" : `${sla} review`;
  if (sla === "Instant") return "提交即展示";
  if (sla === "24–48h") return "1–2 天过审";
  const cleaned = sla.replace("d", " 天");
  return `预计 ${cleaned}`;
}

export function formatCategoryLabel(cat: DirectoryChannel["category"], isZh: boolean): string {
  if (!isZh) return cat;
  switch (cat) {
    case "SaaS Directory":
      return "SaaS 综合目录";
    case "AI Aggregator":
      return "AI 工具导航";
    case "Launchpad":
      return "新品首发台";
    case "Dev & Indie":
      return "开发者社区";
  }
}

export function formatChannelLabel(channel: string, isZh: boolean): string {
  const key = channel.toLowerCase();
  if (key === "directory") return isZh ? "目录外链" : "Directory Backlinks";
  if (key === "community") return isZh ? "社区回复" : "Community Replies";
  if (key === "seo") return isZh ? "竞品对比页" : "Comparison & AEO";
  if (key === "social") return isZh ? "社媒简介" : "Social Bio";
  return isZh ? "自定义渠道" : channel;
}

export function formatIntentBadge(
  type: RadarLeadRecord["intent_type"],
  score: number,
  isZh: boolean
): string {
  if (!isZh) {
    const tag = type === "buying" ? "Buying" : type === "alternative" ? "Switching" : "Pain";
    return `${score}% ${tag}`;
  }
  const tag = type === "buying" ? "求推荐" : type === "alternative" ? "寻替代" : "痛点";
  return `${score}% ${tag}`;
}

/**
 * 计算品牌资料完整度与明确缺失项
 */
export function computeBrandKitProgress(kit: BrandKitRecord | null) {
  let score = 0;
  const missingZh: string[] = [];
  const missingEn: string[] = [];

  if ((kit?.short_tagline || "").trim().length >= 10) score += 20;
  else {
    missingZh.push("一句话定位");
    missingEn.push("One-line tagline");
  }

  if ((kit?.medium_pitch || "").trim().length >= 30) score += 20;
  else {
    missingZh.push("标准产品介绍");
    missingEn.push("Standard pitch");
  }

  if ((kit?.long_description || "").trim().length >= 60) score += 15;
  else {
    missingZh.push("深度场景说明");
    missingEn.push("Full description");
  }

  if ((kit?.logo_url || "").trim()) score += 15;
  else {
    missingZh.push("产品标志图标");
    missingEn.push("Brand logo");
  }

  if (kit?.screenshots && kit.screenshots.length > 0) score += 10;
  else {
    missingZh.push("1 张产品主图");
    missingEn.push("1 hero screenshot");
  }

  if (kit?.categories && kit.categories.length > 0) score += 10;
  else {
    missingZh.push("产品所属分类");
    missingEn.push("Categories");
  }

  if (kit?.competitors && kit.competitors.length > 0) score += 5;
  else {
    missingZh.push("主要竞品词");
    missingEn.push("Competitors");
  }

  if ((kit?.founder_name || "").trim() || (kit?.founder_x || "").trim()) score += 5;
  else {
    missingZh.push("创始人署名");
    missingEn.push("Founder profile");
  }

  return { score, missingItemsZh: missingZh, missingItemsEn: missingEn };
}

/**
 * 构建 100% 算术恒等对账的体验演示数据集（与效果图 2 & 3 逐项对齐）
 * - 营收拆解：$1,102 + $725 + $261 = $2,088（较上期 +$492）
 * - 4 步漏斗：1,408 点击 → 1,183 进站 → 54 注册 → 18 付费
 * - 买家收件箱：全部 12 = 待跟进 3 + 已回复 6 + 已转化 3
 * - 100 目录：完全由 DISTRIBUTION_DIRECTORIES 实时计算，零手写偏差
 */
export function buildSampleOverview(): OverviewPayload {
  const dailySeries = Array.from({ length: 30 }, (_, idx) => {
    const d = new Date(Date.now() - (29 - idx) * 86400 * 1000).toISOString().slice(0, 10);
    const wave = Math.sin(idx * 0.55) * 4;
    const clicks = Math.round(28 + idx * 1.3 + wave);
    const conversions = Math.max(1, Math.round(clicks * 0.048));
    const revenueUsd = Math.round(32 + idx * 2.55 + wave * 2.4);
    return { date: d, clicks, conversions, revenueUsd };
  });

  // 使样例的 100 个目录拥有清晰、真实的验活状态分布，完全可算术对账
  const sampleDirectories: OverviewPayload["directories"] = DISTRIBUTION_DIRECTORIES.map((dir, index) => {
    const status = dir.defaultStatus;
    const isVerified = status === "live";
    return {
      directory_id: dir.id,
      status,
      live_backlink_url: isVerified ? `${dir.url.replace(/\/$/, "")}/products/acmeflow` : "",
      updated_at: isVerified ? "2026-11-24" : "2026-11-23",
      moderation_state: index < 30 || status !== "queued" ? "approved" : "approved",
      scheduled_wave: dir.wave,
      last_http_status: isVerified ? 200 : 0,
      is_dofollow_verified: isVerified && dir.linkType === "dofollow",
      last_checked_at: isVerified ? "2026-11-25 02:10" : "",
    };
  });

  return {
    user: { id: 0, email: "alex@acmeflow.dev", name: "Alex Chen", role: "customer" },
    orders: [{ order_id: "ord_sample_01", plan: "radar", amount_usd: 29, status: "active", created_at: "2026-11-01" }],
    campaigns: [
      {
        id: 1,
        slug: "acmeflow",
        product_name: "AcmeFlow",
        target_url: "https://acmeflow.example",
        tagline: "轻量级 SSL 证书与域名到期自动告警工具，专为独立开发与小团队打造",
        competitors: "UptimeRobot, Better Stack",
      },
      {
        id: 2,
        slug: "pingvault",
        product_name: "PingVault API",
        target_url: "https://pingvault.example",
        tagline: "零配置 Webhook 可用性与延迟监控，面向 Node 与 Go 后端团队",
        competitors: "Checkly, Cronitor",
      },
    ],
    activeCampaignId: 1,
    brandKit: {
      campaign_id: 1,
      logo_url: "https://acmeflow.example/logo.svg",
      screenshots: [], // 刻意缺 1 张产品主图 → 85% 完整度，与今日行动流第一条严丝合缝
      short_tagline: "Automated SSL & domain expiry alerts built for lean SaaS teams",
      medium_pitch:
        "AcmeFlow polls TLS handshakes and WHOIS registries every 6 hours from 3 global regions and alerts Slack or email before silent renewal failures break production.",
      long_description:
        "Built for lean engineering teams who want reliable certificate, DNS, and domain renewal protection without paying enterprise observability pricing.",
      pricing_model: "freemium",
      categories: ["DevOps", "Monitoring", "Developer Tools"],
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
        label: "100+ 海外高权重目录",
        destination_url: "https://acmeflow.example",
        clicks_count: 788,
        conversions_count: 30,
        revenue_usd: 1102,
        cvr: 3.8,
        rpv: 1.4,
      },
      {
        code: "acme-hn",
        campaign_id: 1,
        channel: "community",
        label: "HN / GitHub 求购回复",
        destination_url: "https://acmeflow.example",
        clicks_count: 408,
        conversions_count: 16,
        revenue_usd: 725,
        cvr: 3.9,
        rpv: 1.78,
      },
      {
        code: "acme-vs",
        campaign_id: 1,
        channel: "seo",
        label: "竞品对比与 AEO 页",
        destination_url: "https://acmeflow.example",
        clicks_count: 212,
        conversions_count: 8,
        revenue_usd: 261,
        cvr: 3.8,
        rpv: 1.23,
      },
    ],
    directories: sampleDirectories,
    radarMonitor: {
      keywords: ["ssl certificate expired", "domain expiry monitor", "tls renewal failed"],
      competitors: ["UptimeRobot", "Better Stack"],
      excludeWords: ["hiring", "freelancer", "what are you working on"],
      sources: ["hn", "github", "devto", "lobsters"],
      last_scanned_at: "2026-11-25 02:40",
    },
    // 严格对账：3 待跟进(new) + 6 已回复(replied) + 3 已转化(won) = 12 条
    radarLeads: [
      {
        id: 101,
        source: "Hacker News",
        community: "Ask HN",
        author: "@devops_mike",
        title: "Looking for a simple SSL certificate & domain expiry monitor",
        excerpt:
          "We just had an internal staging cert expire silently over the weekend after Let's Encrypt rate-limited us. Looking for a lightweight tool with Slack alerts and zero enterprise bloat.",
        url: "https://news.ycombinator.com",
        intent_type: "buying",
        intent_score: 96,
        status: "new",
        posted_at: "2026-11-25",
        relative_time_zh: "2小时前",
        relative_time_en: "2h ago",
      },
      {
        id: 102,
        source: "GitHub",
        community: "acme-ops/infra",
        author: "@sarah_sre",
        title: "Cheaper alternative to Better Stack for a 3-person dev shop?",
        excerpt:
          "Love the UI but $100+/mo is overkill right now. We mainly need reliable webhook and email alerts across 40 customer domains.",
        url: "https://github.com",
        intent_type: "alternative",
        intent_score: 95,
        status: "new",
        posted_at: "2026-11-24",
        relative_time_zh: "昨天",
        relative_time_en: "1d ago",
      },
      {
        id: 103,
        source: "DEV.to",
        community: "#devops",
        author: "@indie_kyle",
        title: "How one expired WHOIS renewal took down our checkout API",
        excerpt:
          "Autorenew failed silently on an expired virtual card and registrar emails went straight to spam. Never trusting registrar emails alone again.",
        url: "https://dev.to",
        intent_type: "pain",
        intent_score: 91,
        status: "new",
        posted_at: "2026-11-23",
        relative_time_zh: "2天前",
        relative_time_en: "2d ago",
      },
      {
        id: 104,
        source: "Hacker News",
        community: "Show HN",
        author: "@liam_ops",
        title: "How do small teams track wildcard TLS renewals across multi-region clusters?",
        excerpt: "Cron scripts keep drifting whenever we migrate DNS zones to Cloudflare.",
        url: "https://news.ycombinator.com",
        intent_type: "pain",
        intent_score: 89,
        status: "replied",
        posted_at: "2026-11-22",
        relative_time_zh: "3天前",
        relative_time_en: "3d ago",
      },
      {
        id: 105,
        source: "GitHub",
        community: "caddyserver/discussions",
        author: "@nina_backend",
        title: "Lightweight external watcher for Caddy auto-TLS renewal failures",
        excerpt: "Need an independent outside check that pings Slack 14 days before expiry.",
        url: "https://github.com",
        intent_type: "buying",
        intent_score: 92,
        status: "replied",
        posted_at: "2026-11-21",
        relative_time_zh: "4天前",
        relative_time_en: "4d ago",
      },
      {
        id: 106,
        source: "Lobste.rs",
        community: "ops",
        author: "@tobias_k",
        title: "UptimeRobot dropped our custom SSL alert tier—what are folks using now?",
        excerpt: "Looking for flat pricing without per-seat surprises for a 2-founder SaaS.",
        url: "https://lobste.rs",
        intent_type: "alternative",
        intent_score: 94,
        status: "replied",
        posted_at: "2026-11-20",
        relative_time_zh: "5天前",
        relative_time_en: "5d ago",
      },
      {
        id: 107,
        source: "DEV.to",
        community: "#webdev",
        author: "@marta_dev",
        title: "Checklist before launching a multi-tenant custom domain SaaS",
        excerpt: "Biggest blind spot so far has been tracking customer CNAME SSL expiration.",
        url: "https://dev.to",
        intent_type: "pain",
        intent_score: 86,
        status: "replied",
        posted_at: "2026-11-19",
        relative_time_zh: "6天前",
        relative_time_en: "6d ago",
      },
      {
        id: 108,
        source: "GitHub",
        community: "traefik/discussions",
        author: "@dev_owen",
        title: "Best zero-maintenance SSL expiry notifier for 25 client subdomains?",
        excerpt: "Don't want to host Prometheus just for certificate dates.",
        url: "https://github.com",
        intent_type: "buying",
        intent_score: 90,
        status: "replied",
        posted_at: "2026-11-18",
        relative_time_zh: "7天前",
        relative_time_en: "7d ago",
      },
      {
        id: 109,
        source: "Hacker News",
        community: "Ask HN",
        author: "@jules_infra",
        title: "What minimal monitoring stack do solo SaaS founders actually stick with?",
        excerpt: "Trying to avoid bloated dashboards that take hours to maintain.",
        url: "https://news.ycombinator.com",
        intent_type: "buying",
        intent_score: 88,
        status: "replied",
        posted_at: "2026-11-17",
        relative_time_zh: "8天前",
        relative_time_en: "8d ago",
      },
      {
        id: 110,
        source: "Hacker News",
        community: "Ask HN",
        author: "@ryan_cloud",
        title: "Need a simple domain + SSL expiration watcher with webhook payload support",
        excerpt: "Signed up after comparing lightweight alerts—needed 14-day advance notice.",
        url: "https://news.ycombinator.com",
        intent_type: "buying",
        intent_score: 97,
        status: "won",
        posted_at: "2026-11-16",
        relative_time_zh: "9天前",
        relative_time_en: "9d ago",
      },
      {
        id: 111,
        source: "GitHub",
        community: "indie-devops/tools",
        author: "@priya_s",
        title: "Switching off Better Stack for pure TLS & WHOIS alerting",
        excerpt: "Cut monthly ops spend by 70% while keeping Slack escalation intact.",
        url: "https://github.com",
        intent_type: "alternative",
        intent_score: 95,
        status: "won",
        posted_at: "2026-11-14",
        relative_time_zh: "11天前",
        relative_time_en: "11d ago",
      },
      {
        id: 112,
        source: "DEV.to",
        community: "#sre",
        author: "@daniel_go",
        title: "Preventing silent Let's Encrypt staging/prod rate limit outages",
        excerpt: "Adopted external TLS polling across 30 client domains.",
        url: "https://dev.to",
        intent_type: "pain",
        intent_score: 93,
        status: "won",
        posted_at: "2026-11-12",
        relative_time_zh: "13天前",
        relative_time_en: "13d ago",
      },
    ],
    publicReport: { share_id: "demo-acmeflow", title: "AcmeFlow · 30 天增长归因战报", show_revenue: 1 },
    stats: {
      totalClicks: 1408,
      totalConversions: 54,
      conversionRate: 3.8,
      attributedRevenueUsd: 2088,
      priorRevenueUsd: 1596,
      rpv: 1.48,
      roiMultiple: 53.5,
      clicksDeltaPct: 24.8,
      conversionsDeltaPct: 31.2,
      funnel: { clicks: 1408, qualifiedVisits: 1183, signups: 54, purchases: 18 },
      directoriesLive: 26,
      directoriesSubmitted: 11,
      dailySeries,
      channelBreakdown: [
        { channel: "directory", clicks: 788, conversions: 30, revenueUsd: 1102, cvr: 3.8, rpv: 1.4 },
        { channel: "community", clicks: 408, conversions: 16, revenueUsd: 725, cvr: 3.9, rpv: 1.78 },
        { channel: "seo", clicks: 212, conversions: 8, revenueUsd: 261, cvr: 3.8, rpv: 1.23 },
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
        { code: "acme-dir", channel: "directory", country: "US", device: "desktop", referer: "sourceforge.net", clicked_at: "2026-11-25 02:18" },
        { code: "acme-hn", channel: "community", country: "DE", device: "desktop", referer: "news.ycombinator.com", clicked_at: "2026-11-25 01:44" },
        { code: "acme-dir", channel: "directory", country: "GB", device: "mobile", referer: "alternativeto.net", clicked_at: "2026-11-25 00:52" },
        { code: "acme-vs", channel: "seo", country: "JP", device: "desktop", referer: "google.com", clicked_at: "2026-11-24 23:31" },
      ],
    },
  };
}

/**
 * 核心派生对账引擎：将原始 API / 样例载荷归一化为 100% 恒等对账视图模型
 */
export function deriveConsoleLedger(payload: OverviewPayload, isSample: boolean): ReconciledLedger {
  const healthByDir = new Map<string, NonNullable<OverviewPayload["directoryHealth"]>[number]>();
  for (const h of payload.directoryHealth || []) {
    healthByDir.set(h.directory_id, h);
  }
  const subByDir = new Map<string, OverviewPayload["directories"][number]>();
  for (const d of payload.directories || []) {
    subByDir.set(d.directory_id, d);
  }

  const defaultDirLinkCode = payload.links.find((l) => l.channel === "directory")?.code || payload.links[0]?.code || "acme-dir";

  const directories: ReconciledDirectoryRow[] = DISTRIBUTION_DIRECTORIES.map((dir, index) => {
    const sub = subByDir.get(dir.id);
    const health = healthByDir.get(dir.id);

    const moderationState: "approved" | "skipped" | "priority" =
      sub?.moderation_state || health?.moderation_state || "approved";

    const rawWave = sub?.scheduled_wave || health?.scheduled_wave || dir.wave;
    const scheduledWave: 1 | 2 | 3 = rawWave === 2 ? 2 : rawWave === 3 ? 3 : 1;

    let effectiveStatus: ReconciledDirectoryRow["effectiveStatus"];
    if (moderationState === "skipped") {
      effectiveStatus = "skipped";
    } else if (sub?.status === "live" || (isSample && dir.defaultStatus === "live")) {
      effectiveStatus = "live";
    } else if (sub?.status === "submitted" || (isSample && dir.defaultStatus === "submitted")) {
      effectiveStatus = "submitted";
    } else {
      effectiveStatus = "queued";
    }

    const isVerified = effectiveStatus === "live";
    // 为体验样例的已验活目录分配真实感的单站点击参考（仅用于列表明细），真实模式按后端统计展示
    const sampleClicks = isSample && isVerified ? Math.max(12, Math.round((95 - index * 2.1) * 1.15)) : 0;
    const sampleRev = isSample && isVerified && index < 8 ? Math.round(sampleClicks * 1.4) : 0;

    return {
      ...dir,
      effectiveStatus,
      moderationState,
      scheduledWave,
      liveBacklinkUrl: sub?.live_backlink_url || "",
      proofScreenshotUrl: sub?.proof_screenshot_url || health?.proof_screenshot_url || "",
      lastHttpStatus: sub?.last_http_status ?? health?.last_http_status ?? (isVerified ? 200 : 0),
      isDofollowVerified:
        sub?.is_dofollow_verified ??
        (health ? Boolean(health.is_dofollow_verified) : isVerified && dir.linkType === "dofollow"),
      lastCheckedAt: sub?.last_checked_at || health?.last_checked_at || "",
      attributedClicks: sampleClicks,
      attributedRevenueUsd: sampleRev,
      shortlinkCode: defaultDirLinkCode,
    };
  });

  // 严格从 directories 派生全部目录计数（确保 100% 对账）
  let live = 0;
  let submitted = 0;
  let queued = 0;
  let skipped = 0;
  let wave1 = 0;
  let wave2 = 0;
  let wave3 = 0;
  const wave2PendingIds: string[] = [];

  for (const row of directories) {
    if (row.effectiveStatus === "live") live += 1;
    else if (row.effectiveStatus === "submitted") submitted += 1;
    else if (row.effectiveStatus === "skipped") skipped += 1;
    else queued += 1;

    if (row.scheduledWave === 1) wave1 += 1;
    else if (row.scheduledWave === 2) {
      wave2 += 1;
      if (row.effectiveStatus === "queued" && row.moderationState !== "priority") {
        wave2PendingIds.push(row.id);
      }
    } else {
      wave3 += 1;
    }
  }

  // 严格从 radarLeads 派生收件箱计数（确保 全部 === 待跟进 + 已回复 + 已转化）
  const activeLeads = (payload.radarLeads || []).filter((l) => l.status !== "dismissed");
  const pending = activeLeads.filter((l) => l.status === "new" || l.status === "drafted").length;
  const replied = activeLeads.filter((l) => l.status === "replied").length;
  const won = activeLeads.filter((l) => l.status === "won").length;
  const dismissed = (payload.radarLeads || []).filter((l) => l.status === "dismissed").length;

  // 严格对账渠道营收明细与总营收
  const rawChannels = (payload.stats.channelBreakdown || []).slice(0, 3).map((ch) => ({
    key: ch.channel,
    labelZh: formatChannelLabel(ch.channel, true),
    labelEn: formatChannelLabel(ch.channel, false),
    clicks: Math.max(0, Number(ch.clicks || 0)),
    revenueUsd: Math.max(0, Math.round(Number(ch.revenueUsd || 0))),
  }));

  const channelSum = rawChannels.reduce((acc, c) => acc + c.revenueUsd, 0);
  const totalUsd = channelSum > 0 ? channelSum : Math.max(0, Math.round(Number(payload.stats.attributedRevenueUsd || 0)));
  const priorUsd =
    typeof payload.stats.priorRevenueUsd === "number"
      ? payload.stats.priorRevenueUsd
      : Math.round(totalUsd * 0.764);
  const deltaUsd = Math.max(0, totalUsd - priorUsd);

  // 保证漏斗绝对单调非增：clicks >= visits >= signups >= paid
  const fClicks = Math.max(0, payload.stats.funnel?.clicks ?? payload.stats.totalClicks ?? 0);
  const fVisits = Math.min(fClicks, Math.max(0, payload.stats.funnel?.qualifiedVisits ?? Math.round(fClicks * 0.84)));
  const fSignups = Math.min(fVisits, Math.max(0, payload.stats.funnel?.signups ?? payload.stats.totalConversions ?? 0));
  const fPaid = Math.min(fSignups, Math.max(0, payload.stats.funnel?.purchases ?? Math.round(fSignups * 0.33)));

  // 保证每日趋势图携带营收或点击完整序列
  const dailySeries = (payload.stats.dailySeries || []).map((pt) => ({
    date: pt.date,
    clicks: pt.clicks,
    conversions: pt.conversions,
    revenueUsd:
      typeof pt.revenueUsd === "number"
        ? pt.revenueUsd
        : Math.round(pt.clicks * Math.max(0.8, payload.stats.rpv || 1.2)),
  }));

  // 精选最近 4 条关键验活回执（与效果图 2 左下角呼应：SourceForge / AlternativeTo / SaaSHub / BetaList）
  const receiptPriority = ["d01", "d04", "d09", "d07"];
  const recentVerifiedReceipts = receiptPriority
    .map((id) => directories.find((d) => d.id === id))
    .filter((d): d is ReconciledDirectoryRow => Boolean(d));

  const brandKit = computeBrandKitProgress(payload.brandKit);

  return {
    directories,
    dirCounts: {
      total: directories.length,
      live,
      submitted,
      queued,
      skipped,
      wave1,
      wave2,
      wave3,
      wave2PendingIds: wave2PendingIds.slice(0, 12),
    },
    leadCounts: {
      all: pending + replied + won,
      pending,
      replied,
      won,
      dismissed,
    },
    revenue: {
      totalUsd,
      deltaUsd,
      channels: rawChannels,
      funnel: { clicks: fClicks, visits: fVisits, signups: fSignups, paid: fPaid },
      dailySeries,
    },
    brandKit,
    recentVerifiedReceipts,
  };
}

/**
 * 结构化词边界痛点抽取（彻底根除 V4 中 lead.title.slice(0, 72) 造成的半截词丑陋输出）
 */
function extractCleanPainFocus(lead: RadarLeadRecord): string {
  const lower = `${lead.title} ${lead.excerpt}`.toLowerCase();
  if (lower.includes("ssl") || lower.includes("tls") || lower.includes("cert")) {
    return "SSL certificate renewals and WHOIS expiry";
  }
  if (lower.includes("whois") || lower.includes("domain")) {
    return "domain auto-renewal failures and registrar alert blind spots";
  }
  if (lower.includes("better stack") || lower.includes("uptimerobot") || lower.includes("overkill")) {
    return "lightweight monitoring without paying enterprise per-seat pricing";
  }
  if (lower.includes("webhook") || lower.includes("api") || lower.includes("uptime")) {
    return "reliable external health checks before customers notice downtime";
  }
  // 退化为按完整词边界裁剪，绝不在单词中间切开
  const cleanTitle = lead.title.replace(/\s*\([^)]*$/, "").replace(/[?!.]+$/, "").trim();
  const words = cleanTitle.split(/\s+/);
  return words.slice(0, 9).join(" ").toLowerCase();
}

export type ReplyTone = "peer" | "founder" | "compare";

/**
 * V5 零截断自然语境英文回复精编引擎（支持 3 种自然语调 + 零链接安全养号模式）
 */
export function buildContextualReply(
  lead: RadarLeadRecord,
  productName: string,
  tagline: string,
  shortlink: string,
  tone: ReplyTone,
  zeroLinkMode: boolean
): string {
  const focus = extractCleanPainFocus(lead);
  const safeProduct = productName.trim() || "our tool";
  const safeTagline = tagline.trim() || "lightweight dedicated alerting with zero maintenance overhead";

  if (tone === "peer") {
    const core = `We hit this exact issue after a silent failure around ${focus} broke our production webhooks. When all you need is reliable 14-day advance alerts without bloated observability dashboards, separating an external watcher with Slack or webhook notifications is usually the cleanest fix.`;
    if (zeroLinkMode) {
      return `${core}\n\nHappy to share the exact alert thresholds we landed on if useful.`;
    }
    return `${core}\n\nWe eventually packaged our internal setup into ${safeProduct} if you want to compare approaches: ${shortlink}`;
  }

  if (tone === "founder") {
    const core = `Full disclosure—I built ${safeProduct} specifically after getting burned by ${focus}. Even if you roll your own cron check, I strongly recommend running it from an independent region and firing reminders at 14, 7, and 1 day before expiration.`;
    if (zeroLinkMode) {
      return `${core}\n\nNot dropping a link out of respect for the thread, but happy to DM our open checklist if you're evaluating options.`;
    }
    return `${core}\n\nIf you'd rather skip maintaining scripts, you can try the free tier here: ${shortlink}`;
  }

  // compare
  const core = `Quick honest trade-off from testing tools for ${focus}:\n- Enterprise suites shine once you have 50+ engineers, though per-seat pricing adds up quickly for small teams.\n- DIY scripts cost nothing upfront, but fail silently the day a virtual card or cron runner resets.\n- Focused tools like ${safeProduct} stick strictly to ${safeTagline} so setup takes under two minutes.`;
  if (zeroLinkMode) {
    return `${core}\n\nDepends mostly on whether you already run a full observability stack or just want a standalone safety net.`;
  }
  return `${core}\n\nLive sandbox is here if you want to benchmark it side by side: ${shortlink}`;
}
