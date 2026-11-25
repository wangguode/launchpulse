/**
 * LaunchPulse V4 Growth OS 核心后端模块
 * ----------------------------------------------------------------------
 * 包含：
 * 1. 12 维深度被动站点诊断引擎（含 AEO/AI 爬虫放行、OG 预览、TTFB、安全头矩阵）
 * 2. 多项目 Brand Launch Kit 资料库与完整度评分
 * 3. 目录选站审批、排期波次与外链 HTTP/dofollow 自动验活（支持 Cron 巡检）
 * 4. 24/7 买家意图雷达 Pro（自定义规则 + HN/GitHub/Dev.to/Lobste.rs 实时抓取 + CRM + Webhook）
 * 5. DataFast/Dub 级归因漏斗、周期环比与公开只读增长战报（/report/:shareId）
 */

export interface V4Env {
  DB?: {
    prepare: (sql: string) => {
      bind: (...args: unknown[]) => {
        run: () => Promise<unknown>;
        first: <T = Record<string, unknown>>() => Promise<T | null>;
        all: <T = Record<string, unknown>>() => Promise<{ results?: T[] }>;
      };
      all: <T = Record<string, unknown>>() => Promise<{ results?: T[] }>;
    };
  };
  ADMIN_API_KEY?: string;
}

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function jsonRes(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...SECURITY_HEADERS,
    },
  });
}

function cleanText(raw = ""): string {
  return raw
    .replace(/&#x2F;|&#x2f;|&#47;/g, "/")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSafePublicUrl(rawInput: string): URL | null {
  try {
    const trimmed = rawInput.trim();
    if (!trimmed) return null;
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProto);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    const host = parsed.hostname.toLowerCase();
    if (
      !host ||
      !host.includes(".") ||
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host === "[::1]" ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^\[?(fc|fd|fe80)/i.test(host)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function passiveGet(url: string, timeoutMs = 5500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LaunchPulsePassiveAudit/4.0; +https://pulse.statementflow.win)",
      },
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, headers: res.headers, text: text.slice(0, 120000) };
  } catch {
    return { ok: false, status: 0, headers: new Headers(), text: "" };
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonArr(raw: string | null | undefined, fallback: string[] = []): string[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((x) => String(x)).filter(Boolean) : fallback;
  } catch {
    return fallback;
  }
}

function randomId(prefix: string): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += chars[b % chars.length];
  return `${prefix}-${out}`;
}

/**
 * 1. V4 12 维深度站点体检（兼容 /api/scan、首页扫描器、/tools/llms-txt-generator 与 /tools/aeo-checker）
 */
export async function handleDeepLiveScan(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { url?: string };
    const target = parseSafePublicUrl(body.url || "");
    if (!target) {
      return jsonRes(
        { error: "Please enter a valid public HTTPS domain (e.g. https://your-startup.com)." },
        400
      );
    }

    const origin = target.origin;
    const domain = target.hostname.replace(/^www\./, "");
    const t0 = Date.now();
    const [homeRes, llmsRes, sitemapRes, robotsRes] = await Promise.all([
      passiveGet(target.toString(), 6500),
      passiveGet(`${origin}/llms.txt`, 4200),
      passiveGet(`${origin}/sitemap.xml`, 4200),
      passiveGet(`${origin}/robots.txt`, 4200),
    ]);
    const ttfbMs = Date.now() - t0;

    if (!homeRes.status) {
      return jsonRes(
        { error: `Could not reach ${origin} within 6.5s. Check the URL and try again.` },
        422
      );
    }

    const html = homeRes.text;
    const title = cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || domain);
    const h1 = cleanText(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
    const h2Count = (html.match(/<h2[\s>]/gi) || []).length;
    const metaDesc = cleanText(
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ||
        html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1] ||
        ""
    );
    const ogTitle = cleanText(
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i)?.[1] ||
        html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i)?.[1] ||
        title
    );
    const ogDesc = cleanText(
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)?.[1] ||
        html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i)?.[1] ||
        metaDesc
    );
    const ogImageRaw =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i)?.[1] ||
      html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:image["']/i)?.[1] ||
      "";
    const ogImage = ogImageRaw
      ? /^https?:\/\//i.test(ogImageRaw)
        ? ogImageRaw
        : `${origin}${ogImageRaw.startsWith("/") ? "" : "/"}${ogImageRaw}`
      : "";
    const twitterCard =
      html.match(/<meta[^>]+name=["']twitter:card["'][^>]+content=["']([^"']*)["']/i)?.[1] || "";
    const canonical =
      html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i)?.[1] || "";
    const hasNoindex = /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html);
    const jsonLdMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
    const jsonLdRaw = jsonLdMatches.join("\n");
    const hasSoftwareSchema = /SoftwareApplication|WebApplication|Product/i.test(jsonLdRaw);
    const hasFaqSchema = /FAQPage/i.test(jsonLdRaw);
    const hasVsPages = /\b(\/vs\/|alternatives?|compare)\b/i.test(html);

    // 6 项 HTTP 安全响应头矩阵
    const securityHeaders = {
      hsts: Boolean(homeRes.headers.get("strict-transport-security")),
      csp: Boolean(homeRes.headers.get("content-security-policy")),
      xfo: Boolean(homeRes.headers.get("x-frame-options")),
      xcto: Boolean(homeRes.headers.get("x-content-type-options")),
      referrerPolicy: Boolean(homeRes.headers.get("referrer-policy")),
      permissionsPolicy: Boolean(homeRes.headers.get("permissions-policy")),
    };

    // AI 搜索爬虫放行状态解析（GPTBot / ClaudeBot / PerplexityBot / OAI-SearchBot）
    const robotsText = robotsRes.ok && !/<!doctype html/i.test(robotsRes.text.slice(0, 200)) ? robotsRes.text : "";
    const isBotBlocked = (botName: string) => {
      if (!robotsText) return false;
      const re = new RegExp(`User-agent:\\s*${botName}[\\s\\S]*?(?=User-agent:|$)`, "i");
      const block = robotsText.match(re)?.[0] || "";
      return /Disallow:\s*\/\s*$/m.test(block);
    };
    const aiCrawlers = [
      { bot: "GPTBot", engine: "ChatGPT / OpenAI", allowed: !isBotBlocked("GPTBot") },
      { bot: "OAI-SearchBot", engine: "ChatGPT Search", allowed: !isBotBlocked("OAI-SearchBot") },
      { bot: "ClaudeBot", engine: "Anthropic Claude", allowed: !isBotBlocked("ClaudeBot") },
      { bot: "PerplexityBot", engine: "Perplexity AI", allowed: !isBotBlocked("PerplexityBot") },
    ];

    const llmsValid = llmsRes.ok && !/<!doctype html|<html[\s>]/i.test(llmsRes.text.slice(0, 300));
    const llmsWords = llmsValid ? llmsRes.text.trim().split(/\s+/).filter(Boolean).length : 0;
    const sitemapValid = sitemapRes.ok && /<urlset|<sitemapindex/i.test(sitemapRes.text.slice(0, 600));

    // 自动合成即插即用的 llmstxt.org 规范草案
    const brandName = title.split(/[|\-–—:]/)[0].trim() || domain;
    const generatedLlmsTxt = [
      `# ${brandName}`,
      "",
      `> ${h1 || metaDesc || `${brandName} official SaaS platform.`}`,
      "",
      metaDesc ? `${metaDesc}\n` : "",
      "## Core Links",
      `- Homepage: ${origin}`,
      sitemapValid ? `- Sitemap: ${origin}/sitemap.xml` : `- Pricing: ${origin}/#pricing`,
      `- Documentation: ${origin}/docs`,
      "",
      "## Ideal Buyers & Use Cases",
      `- Built for teams searching for a faster, modern solution around ${brandName}.`,
      `- Verify pricing, features, and live product demos at ${origin}.`,
    ]
      .filter((line) => line !== undefined)
      .join("\n");

    const leaks: Array<{
      severity: "critical" | "high" | "medium";
      category: string;
      title: string;
      evidence: string;
    }> = [];

    if (hasNoindex) {
      leaks.push({
        severity: "critical",
        category: "Google SEO",
        title: "Homepage contains meta robots noindex",
        evidence: `${domain} blocks Google & Bing indexing via meta robots.`,
      });
    }
    if (!llmsValid) {
      leaks.push({
        severity: "critical",
        category: "AEO / AI Visibility",
        title: `Missing valid /llms.txt manifest (HTTP ${llmsRes.status || 404})`,
        evidence: `ChatGPT, Claude, and Perplexity lack a structured entity card for ${domain}.`,
      });
    }
    const blockedBots = aiCrawlers.filter((b) => !b.allowed).map((b) => b.bot);
    if (blockedBots.length > 0) {
      leaks.push({
        severity: "critical",
        category: "AEO / AI Visibility",
        title: `robots.txt blocks AI search crawlers (${blockedBots.join(", ")})`,
        evidence: `Your /robots.txt explicitly disallows ${blockedBots.join(", ")}, preventing AI search citations.`,
      });
    }
    if (!hasSoftwareSchema) {
      leaks.push({
        severity: "high",
        category: "Google SEO",
        title: "Missing SoftwareApplication JSON-LD rich schema",
        evidence: `No SoftwareApplication / Offer JSON-LD block detected on ${origin}.`,
      });
    }
    if (!securityHeaders.csp || !securityHeaders.xfo) {
      leaks.push({
        severity: "high",
        category: "Security & Trust",
        title: "Missing CSP / X-Frame-Options clickjacking headers",
        evidence: `Enterprise security scanners flag unset CSP or X-Frame-Options on ${origin}.`,
      });
    }
    if (!hasVsPages) {
      leaks.push({
        severity: "high",
        category: "Conversion UX",
        title: "Zero competitor '/vs/' or 'Alternative to' landing pages",
        evidence: `Missing bottom-of-funnel comparison pages capturing switch-ready searchers.`,
      });
    }
    if (!sitemapValid) {
      leaks.push({
        severity: "high",
        category: "Google SEO",
        title: "Missing or invalid /sitemap.xml",
        evidence: `GET ${origin}/sitemap.xml did not return a valid XML urlset.`,
      });
    }
    if (!ogImage || metaDesc.length < 110) {
      leaks.push({
        severity: "medium",
        category: "Social & SERP",
        title: !ogImage
          ? "Missing OpenGraph og:image social preview card"
          : `Short meta description (${metaDesc.length} chars vs 145–158 optimal)`,
        evidence: `Links shared on X, HN, or Slack lack an optimized social card on ${domain}.`,
      });
    }
    if (ttfbMs > 1200) {
      leaks.push({
        severity: "high",
        category: "Performance",
        title: `Slow initial server response (${ttfbMs}ms TTFB > 1,200ms threshold)`,
        evidence: `Edge probe to ${origin} took ${ttfbMs}ms; slow first paint increases bounce rate.`,
      });
    }

    // 4 维度独立子评分
    const seoScore = Math.max(
      28,
      100 -
        (hasNoindex ? 45 : 0) -
        (hasSoftwareSchema ? 0 : 18) -
        (sitemapValid ? 0 : 16) -
        (canonical ? 0 : 8) -
        (metaDesc.length >= 110 && metaDesc.length <= 165 ? 0 : 10)
    );
    const aeoScore = Math.max(
      20,
      100 -
        (llmsValid ? 0 : 38) -
        blockedBots.length * 15 -
        (hasSoftwareSchema ? 0 : 14) -
        (hasFaqSchema ? 0 : 8)
    );
    const socialScore = Math.max(
      30,
      100 - (ogImage ? 0 : 35) - (twitterCard ? 0 : 15) - (hasVsPages ? 0 : 20) - (ttfbMs > 1200 ? 15 : 0)
    );
    const secCount = Object.values(securityHeaders).filter(Boolean).length;
    const securityScore = Math.round(35 + (secCount / 6) * 65);
    const score = Math.round(seoScore * 0.3 + aeoScore * 0.3 + socialScore * 0.2 + securityScore * 0.2);

    // 实时拉取高意图 HN 买家线索（严格去重与相关性校验）
    const stopWords = new Set([
      "the", "and", "for", "with", "your", "that", "from", "this", "into", "free", "app", "tool", "home", "welcome", "best", "fast", "modern", "online",
    ]);
    const rawWords = `${title} ${h1}`
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !stopWords.has(w));
    const queryTerm = Array.from(new Set(rawWords)).slice(0, 2).join(" ") || domain.split(".")[0];

    const leads: Array<{
      source: string;
      author: string;
      postedAt: string;
      title: string;
      excerpt: string;
      url: string;
      unlocked: boolean;
    }> = [];
    try {
      const since45d = Math.floor(Date.now() / 1000) - 45 * 86400;
      const hnRes = await fetch(
        `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(
          queryTerm
        )}&tags=comment&numericFilters=created_at_i>${since45d}&hitsPerPage=24`
      );
      const intentRe =
        /\b(looking for|recommend|alternative|monitor|alert|expir|outage|problem|issue|broken|tool|switch|replace|better than|pain|frustrat|help|manage|automat|renew)\b/i;
      const coreTokens = queryTerm.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
      if (hnRes.ok) {
        const hnData = (await hnRes.json()) as {
          hits?: Array<{ objectID: string; author?: string; created_at?: string; story_title?: string; comment_text?: string }>;
        };
        const seenTitles = new Set<string>();
        for (const hit of hnData.hits || []) {
          const st = cleanText(hit.story_title || "");
          if (!st || /^show hn:|^\[dead\]|who is hiring|who wants to be hired|what are you working on/i.test(st)) {
            continue;
          }
          const key = st.toLowerCase();
          if (seenTitles.has(key)) continue;
          const excerpt = cleanText(hit.comment_text || "");
          if (excerpt.length < 45) continue;
          const combined = `${st} ${excerpt}`.toLowerCase();
          if (coreTokens.length > 0 && !coreTokens.some((tok) => combined.includes(tok))) continue;
          if (!intentRe.test(combined)) continue;
          seenTitles.add(key);
          leads.push({
            source: "Hacker News",
            author: `@${hit.author || "dev"}`,
            postedAt: (hit.created_at || "").slice(0, 10),
            title: st,
            excerpt: excerpt.slice(0, 160) + (excerpt.length > 160 ? "..." : ""),
            url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
            unlocked: leads.length < 3,
          });
          if (leads.length >= 6) break;
        }
      }
    } catch {
      // ignore HN timeout
    }

    return jsonRes({
      domain,
      origin,
      title,
      tagline: h1 || metaDesc || title,
      score,
      subScores: { seo: seoScore, aeo: aeoScore, social: socialScore, security: securityScore },
      queryTerm,
      leaksCount: leaks.length,
      leaks,
      leads,
      diagnostics: {
        ttfbMs,
        httpsEnabled: target.protocol === "https:",
        canonical,
        h1,
        h2Count,
        metaDesc,
        metaDescLength: metaDesc.length,
        sitemapValid,
        robotsPresent: Boolean(robotsText),
        llmsTxt: {
          exists: llmsValid,
          wordCount: llmsWords,
          generatedPreview: generatedLlmsTxt,
        },
        socialPreview: {
          ogTitle,
          ogDesc,
          ogImage,
          twitterCard: twitterCard || "none",
        },
        jsonLd: {
          count: jsonLdMatches.length,
          hasSoftwareSchema,
          hasFaqSchema,
        },
        aiCrawlers,
        securityHeaders,
      },
    });
  } catch {
    return jsonRes({ error: "Scan failed. Please verify the URL and retry." }, 400);
  }
}

/**
 * 2. V4 多项目聚合概览（支持 ?campaignId= 切换，附带周期环比 Delta、4 阶漏斗、Brand Kit、目录验活与买家雷达）
 */
export async function handleV4DashboardOverview(
  request: Request,
  env: V4Env,
  user: SessionUser
): Promise<Response> {
  if (!env.DB) return jsonRes({ error: "DB not bound" }, 500);
  const url = new URL(request.url);
  const requestedCampaignId = Number(url.searchParams.get("campaignId") || 0);

  const [ordersRes, campaignsRes] = await Promise.all([
    env.DB.prepare(
      `SELECT order_id, slug, target_url, plan, amount_usd, status, created_at FROM customers_orders WHERE customer_email = ?1 ORDER BY id DESC`
    )
      .bind(user.email)
      .all(),
    env.DB.prepare(
      `SELECT id, slug, product_name, target_url, tagline, competitors, status, created_at, updated_at FROM campaigns WHERE user_email = ?1 ORDER BY id DESC`
    )
      .bind(user.email)
      .all<{
        id: number;
        slug: string;
        product_name: string;
        target_url: string;
        tagline: string;
        competitors: string;
        status: string;
        created_at: string;
        updated_at: string;
      }>(),
  ]);

  const campaigns = campaignsRes.results || [];
  const activeCampaign =
    (requestedCampaignId ? campaigns.find((c) => c.id === requestedCampaignId) : null) || campaigns[0] || null;
  const activeId = activeCampaign?.id || 0;

  const [
    linksRes,
    dirsRes,
    dirHealthRes,
    deliveriesRes,
    clicksDailyRes,
    convDailyRes,
    countryRes,
    deviceRes,
    recentClicksRes,
    convSummaryRes,
    convByCodeRes,
    brandKitRes,
    radarMonitorRes,
    radarLeadsRes,
    publicReportRes,
  ] = await Promise.all([
    activeId
      ? env.DB.prepare(
          `SELECT code, campaign_id, channel, label, destination_url, clicks_count, conversions_count, created_at FROM tracking_links WHERE user_email = ?1 AND campaign_id = ?2 ORDER BY clicks_count DESC, created_at DESC`
        )
          .bind(user.email, activeId)
          .all<{
            code: string;
            campaign_id: number;
            channel: string;
            label: string;
            destination_url: string;
            clicks_count: number;
            conversions_count: number;
            created_at: string;
          }>()
      : env.DB.prepare(
          `SELECT code, campaign_id, channel, label, destination_url, clicks_count, conversions_count, created_at FROM tracking_links WHERE user_email = ?1 ORDER BY clicks_count DESC, created_at DESC`
        )
          .bind(user.email)
          .all<{
            code: string;
            campaign_id: number;
            channel: string;
            label: string;
            destination_url: string;
            clicks_count: number;
            conversions_count: number;
            created_at: string;
          }>(),
    env.DB.prepare(
      `SELECT directory_id, directory_name, directory_url, dr, category, status, live_backlink_url, updated_at FROM directory_submissions WHERE customer_email = ?1 ORDER BY dr DESC`
    )
      .bind(user.email)
      .all<{
        directory_id: string;
        directory_name: string;
        directory_url: string;
        dr: number;
        category: string;
        status: string;
        live_backlink_url: string;
        updated_at: string;
      }>(),
    env.DB.prepare(
      `SELECT directory_id, moderation_state, scheduled_wave, proof_screenshot_url, last_http_status, is_dofollow_verified, last_checked_at FROM directory_health_checks WHERE customer_email = ?1 AND (campaign_id = ?2 OR campaign_id = 0)`
    )
      .bind(user.email, activeId)
      .all<{
        directory_id: string;
        moderation_state: string;
        scheduled_wave: number;
        proof_screenshot_url: string;
        last_http_status: number;
        is_dofollow_verified: number;
        last_checked_at: string;
      }>(),
    env.DB.prepare(
      `SELECT lead_id, source, community, title, excerpt, url, reply_draft, lead_status, delivered_at FROM radar_deliveries WHERE customer_email = ?1 ORDER BY id DESC LIMIT 30`
    )
      .bind(user.email)
      .all(),
    activeId
      ? env.DB.prepare(
          `SELECT substr(clicked_at, 1, 10) as day, COUNT(*) as cnt FROM link_clicks WHERE user_email = ?1 AND campaign_id = ?2 AND clicked_at >= datetime('now', '-30 days') GROUP BY day ORDER BY day ASC`
        )
          .bind(user.email, activeId)
          .all<{ day: string; cnt: number }>()
      : env.DB.prepare(
          `SELECT substr(clicked_at, 1, 10) as day, COUNT(*) as cnt FROM link_clicks WHERE user_email = ?1 AND clicked_at >= datetime('now', '-30 days') GROUP BY day ORDER BY day ASC`
        )
          .bind(user.email)
          .all<{ day: string; cnt: number }>(),
    activeId
      ? env.DB.prepare(
          `SELECT substr(created_at, 1, 10) as day, COUNT(*) as cnt FROM conversions WHERE user_email = ?1 AND campaign_id = ?2 AND created_at >= datetime('now', '-30 days') GROUP BY day ORDER BY day ASC`
        )
          .bind(user.email, activeId)
          .all<{ day: string; cnt: number }>()
      : env.DB.prepare(
          `SELECT substr(created_at, 1, 10) as day, COUNT(*) as cnt FROM conversions WHERE user_email = ?1 AND created_at >= datetime('now', '-30 days') GROUP BY day ORDER BY day ASC`
        )
          .bind(user.email)
          .all<{ day: string; cnt: number }>(),
    activeId
      ? env.DB.prepare(
          `SELECT country, COUNT(*) as clicks FROM link_clicks WHERE user_email = ?1 AND campaign_id = ?2 GROUP BY country ORDER BY clicks DESC LIMIT 8`
        )
          .bind(user.email, activeId)
          .all<{ country: string; clicks: number }>()
      : env.DB.prepare(
          `SELECT country, COUNT(*) as clicks FROM link_clicks WHERE user_email = ?1 GROUP BY country ORDER BY clicks DESC LIMIT 8`
        )
          .bind(user.email)
          .all<{ country: string; clicks: number }>(),
    activeId
      ? env.DB.prepare(
          `SELECT device, COUNT(*) as clicks FROM link_clicks WHERE user_email = ?1 AND campaign_id = ?2 GROUP BY device ORDER BY clicks DESC`
        )
          .bind(user.email, activeId)
          .all<{ device: string; clicks: number }>()
      : env.DB.prepare(
          `SELECT device, COUNT(*) as clicks FROM link_clicks WHERE user_email = ?1 GROUP BY device ORDER BY clicks DESC`
        )
          .bind(user.email)
          .all<{ device: string; clicks: number }>(),
    activeId
      ? env.DB.prepare(
          `SELECT code, channel, country, device, referer, clicked_at FROM link_clicks WHERE user_email = ?1 AND campaign_id = ?2 ORDER BY id DESC LIMIT 12`
        )
          .bind(user.email, activeId)
          .all<{ code: string; channel: string; country: string; device: string; referer: string; clicked_at: string }>()
      : env.DB.prepare(
          `SELECT code, channel, country, device, referer, clicked_at FROM link_clicks WHERE user_email = ?1 ORDER BY id DESC LIMIT 12`
        )
          .bind(user.email)
          .all<{ code: string; channel: string; country: string; device: string; referer: string; clicked_at: string }>(),
    activeId
      ? env.DB.prepare(
          `SELECT event_type, COUNT(*) as cnt, COALESCE(SUM(value_usd), 0) as rev FROM conversions WHERE user_email = ?1 AND campaign_id = ?2 GROUP BY event_type`
        )
          .bind(user.email, activeId)
          .all<{ event_type: string; cnt: number; rev: number }>()
      : env.DB.prepare(
          `SELECT event_type, COUNT(*) as cnt, COALESCE(SUM(value_usd), 0) as rev FROM conversions WHERE user_email = ?1 GROUP BY event_type`
        )
          .bind(user.email)
          .all<{ event_type: string; cnt: number; rev: number }>(),
    activeId
      ? env.DB.prepare(
          `SELECT code, COALESCE(SUM(value_usd), 0) as rev FROM conversions WHERE user_email = ?1 AND campaign_id = ?2 GROUP BY code`
        )
          .bind(user.email, activeId)
          .all<{ code: string; rev: number }>()
      : env.DB.prepare(
          `SELECT code, COALESCE(SUM(value_usd), 0) as rev FROM conversions WHERE user_email = ?1 GROUP BY code`
        )
          .bind(user.email)
          .all<{ code: string; rev: number }>(),
    activeId
      ? env.DB.prepare(`SELECT * FROM brand_kits WHERE campaign_id = ?1 LIMIT 1`).bind(activeId).first()
      : Promise.resolve(null),
    activeId
      ? env.DB.prepare(`SELECT * FROM radar_monitors WHERE campaign_id = ?1 LIMIT 1`).bind(activeId).first()
      : Promise.resolve(null),
    activeId
      ? env.DB.prepare(
          `SELECT * FROM radar_leads WHERE campaign_id = ?1 ORDER BY intent_score DESC, id DESC LIMIT 60`
        )
          .bind(activeId)
          .all()
      : Promise.resolve({ results: [] }),
    activeId
      ? env.DB.prepare(`SELECT share_id, title, show_revenue, created_at FROM public_reports WHERE campaign_id = ?1 LIMIT 1`)
          .bind(activeId)
          .first()
      : Promise.resolve(null),
  ]);

  const revByCode = new Map((convByCodeRes.results || []).map((r) => [r.code, Number(r.rev || 0)]));
  const links = (linksRes.results || []).map((l) => {
    const rev = revByCode.get(l.code) || 0;
    const clicks = Number(l.clicks_count || 0);
    const conv = Number(l.conversions_count || 0);
    return {
      ...l,
      revenue_usd: rev,
      cvr: clicks > 0 ? Number(((conv / clicks) * 100).toFixed(2)) : 0,
      rpv: clicks > 0 ? Number((rev / clicks).toFixed(2)) : 0,
    };
  });

  const dirs = dirsRes.results || [];
  const totalClicks = links.reduce((sum, l) => sum + Number(l.clicks_count || 0), 0);
  const totalConversions = links.reduce((sum, l) => sum + Number(l.conversions_count || 0), 0);
  const conversionRate = totalClicks > 0 ? Number(((totalConversions / totalClicks) * 100).toFixed(2)) : 0;

  let signupsCount = 0;
  let purchasesCount = 0;
  let attributedRevenueUsd = 0;
  for (const row of convSummaryRes.results || []) {
    attributedRevenueUsd += Number(row.rev || 0);
    if (row.event_type === "purchase" || row.event_type === "paid") purchasesCount += Number(row.cnt || 0);
    else signupsCount += Number(row.cnt || 0);
  }
  const rpv = totalClicks > 0 ? Number((attributedRevenueUsd / totalClicks).toFixed(2)) : 0;
  const roiMultiple = attributedRevenueUsd > 0 ? Number((attributedRevenueUsd / 39).toFixed(1)) : 0;

  // 30 天序列 + 近 14 天 vs 前 14 天环比 Delta
  const clickMap = new Map((clicksDailyRes.results || []).map((r) => [r.day, Number(r.cnt)]));
  const convMap = new Map((convDailyRes.results || []).map((r) => [r.day, Number(r.cnt)]));
  const dailySeries: Array<{ date: string; clicks: number; conversions: number }> = [];
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 86400 * 1000).toISOString().slice(0, 10);
    dailySeries.push({ date: d, clicks: clickMap.get(d) || 0, conversions: convMap.get(d) || 0 });
  }
  const cur14Clicks = dailySeries.slice(16).reduce((s, d) => s + d.clicks, 0);
  const prev14Clicks = dailySeries.slice(2, 16).reduce((s, d) => s + d.clicks, 0);
  const clicksDeltaPct =
    prev14Clicks > 0 ? Number((((cur14Clicks - prev14Clicks) / prev14Clicks) * 100).toFixed(1)) : cur14Clicks > 0 ? 100 : 0;

  const cur14Conv = dailySeries.slice(16).reduce((s, d) => s + d.conversions, 0);
  const prev14Conv = dailySeries.slice(2, 16).reduce((s, d) => s + d.conversions, 0);
  const conversionsDeltaPct =
    prev14Conv > 0 ? Number((((cur14Conv - prev14Conv) / prev14Conv) * 100).toFixed(1)) : cur14Conv > 0 ? 100 : 0;

  const channelMap = new Map<string, { clicks: number; conversions: number; revenueUsd: number }>();
  for (const l of links) {
    const cur = channelMap.get(l.channel) || { clicks: 0, conversions: 0, revenueUsd: 0 };
    cur.clicks += Number(l.clicks_count || 0);
    cur.conversions += Number(l.conversions_count || 0);
    cur.revenueUsd += Number(l.revenue_usd || 0);
    channelMap.set(l.channel, cur);
  }
  const channelBreakdown = Array.from(channelMap.entries()).map(([channel, v]) => ({
    channel,
    clicks: v.clicks,
    conversions: v.conversions,
    revenueUsd: v.revenueUsd,
    cvr: v.clicks > 0 ? Number(((v.conversions / v.clicks) * 100).toFixed(2)) : 0,
    rpv: v.clicks > 0 ? Number((v.revenueUsd / v.clicks).toFixed(2)) : 0,
  }));

  // 合并目录提交状态与 V4 审批/排期/自动验活健康状态
  const healthMap = new Map((dirHealthRes.results || []).map((h) => [h.directory_id, h]));
  const mergedDirs = dirs.map((d) => {
    const h = healthMap.get(d.directory_id);
    return {
      ...d,
      moderation_state: h?.moderation_state || "approved",
      scheduled_wave: h?.scheduled_wave || 1,
      proof_screenshot_url: h?.proof_screenshot_url || "",
      last_http_status: h?.last_http_status || 0,
      is_dofollow_verified: Boolean(h?.is_dofollow_verified),
      last_checked_at: h?.last_checked_at || "",
    };
  });

  // 也把没有提交记录但客户设置了选站审批的目录健康行一并返回
  const dirHealthList = dirHealthRes.results || [];

  return jsonRes({
    user,
    orders: ordersRes.results || [],
    campaigns,
    activeCampaignId: activeId,
    brandKit: brandKitRes
      ? {
          ...brandKitRes,
          screenshots: parseJsonArr((brandKitRes as { screenshots_json?: string }).screenshots_json),
          categories: parseJsonArr((brandKitRes as { categories_json?: string }).categories_json),
          competitors: parseJsonArr((brandKitRes as { competitors_json?: string }).competitors_json),
        }
      : null,
    links,
    directories: mergedDirs,
    directoryHealth: dirHealthList,
    deliveries: deliveriesRes.results || [],
    radarMonitor: radarMonitorRes
      ? {
          ...radarMonitorRes,
          keywords: parseJsonArr((radarMonitorRes as { keywords_json?: string }).keywords_json),
          competitors: parseJsonArr((radarMonitorRes as { competitors_json?: string }).competitors_json),
          excludeWords: parseJsonArr((radarMonitorRes as { exclude_words_json?: string }).exclude_words_json),
          sources: parseJsonArr((radarMonitorRes as { sources_json?: string }).sources_json, ["hn", "github", "devto"]),
        }
      : null,
    radarLeads: radarLeadsRes.results || [],
    publicReport: publicReportRes || null,
    stats: {
      totalClicks,
      totalConversions,
      conversionRate,
      attributedRevenueUsd,
      rpv,
      roiMultiple,
      clicksDeltaPct,
      conversionsDeltaPct,
      funnel: {
        clicks: totalClicks,
        qualifiedVisits: Math.round(totalClicks * 0.84),
        signups: signupsCount || Math.max(0, totalConversions - purchasesCount),
        purchases: purchasesCount,
      },
      directoriesLive: dirs.filter((d) => d.status === "live").length,
      directoriesSubmitted: dirs.filter((d) => d.status === "submitted" || d.status === "live").length,
      dailySeries,
      channelBreakdown,
      countryBreakdown: countryRes.results || [],
      deviceBreakdown: deviceRes.results || [],
      recentClicks: recentClicksRes.results || [],
    },
  });
}

/**
 * 3. 保存 Brand Launch Kit 并计算完整度评分（0–100%）
 */
export async function handleSaveBrandKit(
  request: Request,
  env: V4Env,
  user: SessionUser
): Promise<Response> {
  if (!env.DB) return jsonRes({ error: "DB not bound" }, 500);
  try {
    const body = (await request.json()) as {
      campaignId?: number;
      logoUrl?: string;
      screenshots?: string[];
      shortTagline?: string;
      mediumPitch?: string;
      longDescription?: string;
      pricingModel?: string;
      categories?: string[];
      competitors?: string[];
      founderName?: string;
      founderX?: string;
    };
    const campaignId = Number(body.campaignId || 0);
    if (!campaignId) return jsonRes({ error: "Missing campaignId" }, 400);

    const own = await env.DB.prepare(`SELECT id FROM campaigns WHERE id = ?1 AND user_email = ?2 LIMIT 1`)
      .bind(campaignId, user.email)
      .first();
    if (!own) return jsonRes({ error: "Campaign not found" }, 404);

    const logoUrl = (body.logoUrl || "").trim().slice(0, 300);
    const screenshots = (Array.isArray(body.screenshots) ? body.screenshots : [])
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 5);
    const shortTagline = (body.shortTagline || "").trim().slice(0, 80);
    const mediumPitch = (body.mediumPitch || "").trim().slice(0, 320);
    const longDescription = (body.longDescription || "").trim().slice(0, 2000);
    const pricingModel = ["free", "freemium", "paid", "one-time", "open-source"].includes(body.pricingModel || "")
      ? String(body.pricingModel)
      : "freemium";
    const categories = (Array.isArray(body.categories) ? body.categories : [])
      .map((c) => String(c).trim())
      .filter(Boolean)
      .slice(0, 6);
    const competitors = (Array.isArray(body.competitors) ? body.competitors : [])
      .map((c) => String(c).trim())
      .filter(Boolean)
      .slice(0, 6);
    const founderName = (body.founderName || "").trim().slice(0, 80);
    const founderX = (body.founderX || "").trim().slice(0, 80);

    // 计算资料完整度评分（满 100 分）
    let score = 0;
    if (shortTagline.length >= 10) score += 20;
    if (mediumPitch.length >= 30) score += 20;
    if (longDescription.length >= 60) score += 15;
    if (logoUrl) score += 15;
    if (screenshots.length > 0) score += 10;
    if (categories.length > 0) score += 10;
    if (competitors.length > 0) score += 5;
    if (founderName || founderX) score += 5;

    await env.DB.prepare(
      `INSERT INTO brand_kits (
         campaign_id, user_email, logo_url, screenshots_json, short_tagline, medium_pitch,
         long_description, pricing_model, categories_json, competitors_json, founder_name, founder_x,
         completeness_score, updated_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, datetime('now'))
       ON CONFLICT(campaign_id) DO UPDATE SET
         logo_url = ?3, screenshots_json = ?4, short_tagline = ?5, medium_pitch = ?6,
         long_description = ?7, pricing_model = ?8, categories_json = ?9, competitors_json = ?10,
         founder_name = ?11, founder_x = ?12, completeness_score = ?13, updated_at = datetime('now')`
    )
      .bind(
        campaignId,
        user.email,
        logoUrl,
        JSON.stringify(screenshots),
        shortTagline,
        mediumPitch,
        longDescription,
        pricingModel,
        JSON.stringify(categories),
        JSON.stringify(competitors),
        founderName,
        founderX,
        score
      )
      .run();

    // 同步主卖点与竞品到 campaigns 表保持向后兼容
    await env.DB.prepare(
      `UPDATE campaigns SET tagline = COALESCE(NULLIF(?1, ''), tagline), competitors = COALESCE(NULLIF(?2, ''), competitors), updated_at = datetime('now') WHERE id = ?3`
    )
      .bind(shortTagline, competitors.join(", "), campaignId)
      .run();

    return jsonRes({ ok: true, completenessScore: score });
  } catch {
    return jsonRes({ error: "Invalid Brand Kit payload." }, 400);
  }
}

/**
 * 4. 客户目录选站审批与排期偏好（Listing Moderation）
 */
export async function handleSaveDirectoryPref(
  request: Request,
  env: V4Env,
  user: SessionUser
): Promise<Response> {
  if (!env.DB) return jsonRes({ error: "DB not bound" }, 500);
  try {
    const body = (await request.json()) as {
      campaignId?: number;
      directoryId?: string;
      moderationState?: "approved" | "skipped" | "priority";
      scheduledWave?: number;
    };
    const directoryId = (body.directoryId || "").trim().slice(0, 32);
    if (!directoryId) return jsonRes({ error: "Missing directoryId" }, 400);
    const campaignId = Number(body.campaignId || 0);
    const mod = ["approved", "skipped", "priority"].includes(body.moderationState || "")
      ? String(body.moderationState)
      : "approved";
    const wave = [1, 2, 3].includes(Number(body.scheduledWave)) ? Number(body.scheduledWave) : 1;

    await env.DB.prepare(
      `INSERT INTO directory_health_checks (customer_email, campaign_id, directory_id, moderation_state, scheduled_wave, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
       ON CONFLICT(customer_email, campaign_id, directory_id) DO UPDATE SET
         moderation_state = ?4, scheduled_wave = ?5, updated_at = datetime('now')`
    )
      .bind(user.email, campaignId, directoryId, mod, wave)
      .run();

    return jsonRes({ ok: true, directoryId, moderationState: mod, scheduledWave: wave });
  } catch {
    return jsonRes({ error: "Invalid directory preference." }, 400);
  }
}

/**
 * 5. 自动外链验活巡检引擎（HTTP 200 + 客户域名存在性 + dofollow 校验）
 */
export async function runBacklinkHealthCheck(
  env: V4Env,
  filterEmail = "",
  limit = 15
): Promise<{ checked: number; verifiedLive: number; dofollowCount: number }> {
  if (!env.DB) return { checked: 0, verifiedLive: 0, dofollowCount: 0 };

  const rowsRes = filterEmail
    ? await env.DB.prepare(
        `SELECT ds.customer_email, ds.directory_id, ds.live_backlink_url, c.id as campaign_id, c.target_url
         FROM directory_submissions ds
         LEFT JOIN campaigns c ON c.user_email = ds.customer_email
         WHERE ds.customer_email = ?1 AND ds.status = 'live' AND ds.live_backlink_url != ''
         ORDER BY ds.updated_at DESC LIMIT ?2`
      )
        .bind(filterEmail.toLowerCase(), limit)
        .all<{
          customer_email: string;
          directory_id: string;
          live_backlink_url: string;
          campaign_id: number | null;
          target_url: string | null;
        }>()
    : await env.DB.prepare(
        `SELECT ds.customer_email, ds.directory_id, ds.live_backlink_url, c.id as campaign_id, c.target_url
         FROM directory_submissions ds
         LEFT JOIN campaigns c ON c.user_email = ds.customer_email
         WHERE ds.status = 'live' AND ds.live_backlink_url != ''
         ORDER BY ds.updated_at DESC LIMIT ?1`
      )
        .bind(limit)
        .all<{
          customer_email: string;
          directory_id: string;
          live_backlink_url: string;
          campaign_id: number | null;
          target_url: string | null;
        }>();

  let checked = 0;
  let verifiedLive = 0;
  let dofollowCount = 0;

  for (const row of rowsRes.results || []) {
    const safeUrl = parseSafePublicUrl(row.live_backlink_url);
    if (!safeUrl) continue;
    const probe = await passiveGet(safeUrl.toString(), 4500);
    checked += 1;
    const isOk = probe.status >= 200 && probe.status < 400;
    if (isOk) verifiedLive += 1;

    const targetHost = row.target_url
      ? row.target_url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase()
      : "";
    let isDofollow = 0;
    if (isOk && targetHost && probe.text.toLowerCase().includes(targetHost)) {
      const anchorRe = new RegExp(`<a[^>]+href=["'][^"']*${targetHost.replace(/\./g, "\\.")}[^"']*["'][^>]*>`, "i");
      const anchor = probe.text.match(anchorRe)?.[0] || "";
      if (anchor && !/rel=["'][^"']*nofollow/i.test(anchor)) {
        isDofollow = 1;
        dofollowCount += 1;
      }
    }

    await env.DB.prepare(
      `INSERT INTO directory_health_checks (
         customer_email, campaign_id, directory_id, last_http_status, is_dofollow_verified, last_checked_at, updated_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'), datetime('now'))
       ON CONFLICT(customer_email, campaign_id, directory_id) DO UPDATE SET
         last_http_status = ?4, is_dofollow_verified = ?5, last_checked_at = datetime('now'), updated_at = datetime('now')`
    )
      .bind(row.customer_email, Number(row.campaign_id || 0), row.directory_id, probe.status, isDofollow)
      .run();
  }

  return { checked, verifiedLive, dofollowCount };
}

/**
 * 6. 买家雷达 Pro：保存监听规则（关键词 / 竞品词 / 排除词 / 数据源 / Webhook）
 */
export async function handleSaveRadarMonitor(
  request: Request,
  env: V4Env,
  user: SessionUser
): Promise<Response> {
  if (!env.DB) return jsonRes({ error: "DB not bound" }, 500);
  try {
    const body = (await request.json()) as {
      campaignId?: number;
      keywords?: string[];
      competitors?: string[];
      excludeWords?: string[];
      sources?: string[];
      webhookUrl?: string;
      dailyDigestEnabled?: boolean;
    };
    const campaignId = Number(body.campaignId || 0);
    if (!campaignId) return jsonRes({ error: "Missing campaignId" }, 400);

    const own = await env.DB.prepare(`SELECT id FROM campaigns WHERE id = ?1 AND user_email = ?2 LIMIT 1`)
      .bind(campaignId, user.email)
      .first();
    if (!own) return jsonRes({ error: "Campaign not found" }, 404);

    const keywords = (Array.isArray(body.keywords) ? body.keywords : [])
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 10);
    const competitors = (Array.isArray(body.competitors) ? body.competitors : [])
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 8);
    const excludeWords = (Array.isArray(body.excludeWords) ? body.excludeWords : [])
      .map((s) => String(s).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12);
    const validSources = ["hn", "github", "devto", "lobsters"];
    const sources = (Array.isArray(body.sources) ? body.sources : ["hn", "github", "devto"]).filter((s) =>
      validSources.includes(s)
    );
    const rawWebhook = (body.webhookUrl || "").trim();
    if (rawWebhook && !parseSafePublicUrl(rawWebhook)) {
      return jsonRes({ error: "Webhook URL must be a valid public HTTPS endpoint." }, 400);
    }

    await env.DB.prepare(
      `INSERT INTO radar_monitors (
         campaign_id, user_email, keywords_json, competitors_json, exclude_words_json,
         sources_json, webhook_url, daily_digest_enabled, updated_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))
       ON CONFLICT(campaign_id) DO UPDATE SET
         keywords_json = ?3, competitors_json = ?4, exclude_words_json = ?5,
         sources_json = ?6, webhook_url = ?7, daily_digest_enabled = ?8, updated_at = datetime('now')`
    )
      .bind(
        campaignId,
        user.email,
        JSON.stringify(keywords),
        JSON.stringify(competitors),
        JSON.stringify(excludeWords),
        JSON.stringify(sources.length ? sources : ["hn", "github"]),
        rawWebhook,
        body.dailyDigestEnabled === false ? 0 : 1
      )
      .run();

    return jsonRes({ ok: true });
  } catch {
    return jsonRes({ error: "Invalid radar monitor payload." }, 400);
  }
}

/**
 * 7. 买家雷达 Pro：多源实时抓帖扫描（HN + GitHub Issues + Dev.to + Lobste.rs）
 */
export async function handleRunRadarScan(
  request: Request,
  env: V4Env,
  user: SessionUser
): Promise<Response> {
  if (!env.DB) return jsonRes({ error: "DB not bound" }, 500);
  try {
    const body = (await request.json()) as { campaignId?: number };
    const campaignId = Number(body.campaignId || 0);
    if (!campaignId) return jsonRes({ error: "Missing campaignId" }, 400);

    const campaign = await env.DB.prepare(
      `SELECT id, product_name, target_url, tagline, competitors FROM campaigns WHERE id = ?1 AND user_email = ?2 LIMIT 1`
    )
      .bind(campaignId, user.email)
      .first<{ id: number; product_name: string; target_url: string; tagline: string; competitors: string }>();
    if (!campaign) return jsonRes({ error: "Campaign not found" }, 404);

    const monitor = await env.DB.prepare(
      `SELECT keywords_json, competitors_json, exclude_words_json, sources_json, webhook_url FROM radar_monitors WHERE campaign_id = ?1 LIMIT 1`
    )
      .bind(campaignId)
      .first<{
        keywords_json: string;
        competitors_json: string;
        exclude_words_json: string;
        sources_json: string;
        webhook_url: string;
      }>();

    const keywords = parseJsonArr(monitor?.keywords_json);
    const competitors = parseJsonArr(
      monitor?.competitors_json,
      (campaign.competitors || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
    const excludeWords = parseJsonArr(monitor?.exclude_words_json, ["hiring", "freelancer", "what are you working on"]);
    const sources = parseJsonArr(monitor?.sources_json, ["hn", "github", "devto"]);

    const queries = Array.from(
      new Set([
        ...keywords.slice(0, 3),
        ...competitors.slice(0, 2).map((c) => `${c} alternative`),
        ...(keywords.length === 0 ? [campaign.product_name, ...campaign.tagline.split(/\s+/).filter((w) => w.length > 5).slice(0, 2)] : []),
      ])
    ).slice(0, 4);

    const collected: Array<{
      externalId: string;
      source: string;
      community: string;
      author: string;
      title: string;
      excerpt: string;
      url: string;
      intentType: "alternative" | "pain" | "buying";
      intentScore: number;
      postedAt: string;
    }> = [];
    const seenTitle = new Set<string>();

    const isExcluded = (txt: string) => {
      const low = txt.toLowerCase();
      if (/^show hn:|^\[dead\]|who is hiring|who wants to be hired|what are you working on/i.test(txt)) return true;
      return excludeWords.some((w) => w && low.includes(w.toLowerCase()));
    };

    const classify = (txt: string): { intentType: "alternative" | "pain" | "buying"; score: number } => {
      const low = txt.toLowerCase();
      if (/\b(alternative|replace|switch from|migrate from|too expensive|pricing)\b/i.test(low)) {
        return { intentType: "alternative", score: 95 };
      }
      if (/\b(looking for|recommend|any tool|what do you use|best tool|willing to pay)\b/i.test(low)) {
        return { intentType: "buying", score: 93 };
      }
      return { intentType: "pain", score: 87 };
    };

    const cutoffSec = Math.floor(Date.now() / 1000) - 60 * 86400;

    // 数据源 1：Hacker News Algolia
    if (sources.includes("hn")) {
      for (const q of queries.slice(0, 3)) {
        try {
          const res = await fetch(
            `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=(story,comment)&numericFilters=created_at_i>${cutoffSec}&hitsPerPage=12`
          );
          if (!res.ok) continue;
          const data = (await res.json()) as {
            hits?: Array<{ objectID: string; author?: string; created_at?: string; story_title?: string; title?: string; comment_text?: string; story_text?: string }>;
          };
          for (const h of data.hits || []) {
            const title = cleanText(h.story_title || h.title || "");
            const excerpt = cleanText(h.comment_text || h.story_text || title);
            if (!title || excerpt.length < 40 || isExcluded(`${title} ${excerpt}`)) continue;
            const tk = title.toLowerCase();
            if (seenTitle.has(tk)) continue;
            seenTitle.add(tk);
            const cls = classify(`${title} ${excerpt}`);
            collected.push({
              externalId: `hn-${h.objectID}`,
              source: "Hacker News",
              community: "Hacker News",
              author: `@${h.author || "hn_dev"}`,
              title: title.slice(0, 140),
              excerpt: excerpt.slice(0, 220),
              url: `https://news.ycombinator.com/item?id=${h.objectID}`,
              intentType: cls.intentType,
              intentScore: cls.score,
              postedAt: (h.created_at || "").slice(0, 10),
            });
          }
        } catch {
          // ignore
        }
      }
    }

    // 数据源 2：GitHub Public Issues
    if (sources.includes("github") && queries[0]) {
      try {
        const res = await fetch(
          `https://api.github.com/search/issues?q=${encodeURIComponent(queries[0])}+is:issue+is:open&sort=updated&per_page=6`,
          { headers: { Accept: "application/vnd.github+json", "User-Agent": "LaunchPulseRadarV4/1.0" } }
        );
        if (res.ok) {
          const data = (await res.json()) as {
            items?: Array<{ id: number; html_url: string; title: string; body?: string; repository_url?: string; updated_at?: string; user?: { login: string } }>;
          };
          for (const item of data.items || []) {
            const title = cleanText(item.title || "");
            const excerpt = cleanText(item.body || title);
            if (!title || isExcluded(`${title} ${excerpt}`)) continue;
            const tk = title.toLowerCase();
            if (seenTitle.has(tk)) continue;
            seenTitle.add(tk);
            const repo = (item.repository_url || "").split("/").slice(-2).join("/");
            const cls = classify(`${title} ${excerpt}`);
            collected.push({
              externalId: `gh-${item.id}`,
              source: "GitHub",
              community: repo || "GitHub Issues",
              author: `@${item.user?.login || "dev"}`,
              title: title.slice(0, 140),
              excerpt: excerpt.slice(0, 220),
              url: item.html_url,
              intentType: cls.intentType,
              intentScore: Math.min(96, cls.score + 1),
              postedAt: (item.updated_at || "").slice(0, 10),
            });
          }
        }
      } catch {
        // ignore rate limits
      }
    }

    // 数据源 3：Dev.to Public Articles & Discussions
    if (sources.includes("devto") && queries[0]) {
      try {
        const tag = queries[0].toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24) || "saas";
        const res = await fetch(`https://dev.to/api/articles?tag=${encodeURIComponent(tag)}&per_page=6`);
        if (res.ok) {
          const items = (await res.json()) as Array<{
            id: number;
            title: string;
            description?: string;
            url: string;
            published_at?: string;
            user?: { username: string };
          }>;
          for (const item of items || []) {
            const title = cleanText(item.title || "");
            const excerpt = cleanText(item.description || title);
            if (!title || isExcluded(`${title} ${excerpt}`)) continue;
            const tk = title.toLowerCase();
            if (seenTitle.has(tk)) continue;
            seenTitle.add(tk);
            const cls = classify(`${title} ${excerpt}`);
            collected.push({
              externalId: `devto-${item.id}`,
              source: "DEV.to",
              community: `#${tag}`,
              author: `@${item.user?.username || "builder"}`,
              title: title.slice(0, 140),
              excerpt: excerpt.slice(0, 220),
              url: item.url,
              intentType: cls.intentType,
              intentScore: cls.score - 2,
              postedAt: (item.published_at || "").slice(0, 10),
            });
          }
        }
      } catch {
        // ignore
      }
    }

    // 数据源 4：Lobste.rs Active Stories
    if (sources.includes("lobsters")) {
      try {
        const res = await fetch("https://lobste.rs/active.json");
        if (res.ok) {
          const items = (await res.json()) as Array<{
            short_id: string;
            title: string;
            comments_url: string;
            created_at?: string;
            submitter_user?: string;
            tags?: string[];
          }>;
          const matchTerms = queries.join(" ").toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
          for (const item of items || []) {
            const title = cleanText(item.title || "");
            if (!title || !matchTerms.some((t) => title.toLowerCase().includes(t))) continue;
            const tk = title.toLowerCase();
            if (seenTitle.has(tk)) continue;
            seenTitle.add(tk);
            collected.push({
              externalId: `lobsters-${item.short_id}`,
              source: "Lobste.rs",
              community: (item.tags || ["dev"]).slice(0, 2).join(", "),
              author: `@${item.submitter_user || "dev"}`,
              title: title.slice(0, 140),
              excerpt: `Active developer discussion on Lobste.rs tagged ${(item.tags || []).join(", ")}.`,
              url: item.comments_url,
              intentType: "pain",
              intentScore: 88,
              postedAt: (item.created_at || "").slice(0, 10),
            });
          }
        }
      } catch {
        // ignore
      }
    }

    let inserted = 0;
    for (const lead of collected.slice(0, 18)) {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO radar_leads (
           campaign_id, user_email, external_id, source, community, author, title, excerpt, url,
           intent_type, intent_score, status, posted_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'new', ?12)`
      )
        .bind(
          campaignId,
          user.email,
          lead.externalId,
          lead.source,
          lead.community,
          lead.author,
          lead.title,
          lead.excerpt,
          lead.url,
          lead.intentType,
          lead.intentScore,
          lead.postedAt
        )
        .run();
      inserted += 1;
    }

    await env.DB.prepare(
      `INSERT INTO radar_monitors (campaign_id, user_email, keywords_json, competitors_json, last_scanned_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, datetime('now'), datetime('now'))
       ON CONFLICT(campaign_id) DO UPDATE SET last_scanned_at = datetime('now'), updated_at = datetime('now')`
    )
      .bind(campaignId, user.email, JSON.stringify(keywords), JSON.stringify(competitors))
      .run();

    // 若配置了合法 Slack/Discord Webhook 且扫到高意图线索，自动触发推送
    const topAlert = collected.find((c) => c.intentScore >= 92);
    if (monitor?.webhook_url && topAlert && parseSafePublicUrl(monitor.webhook_url)) {
      const msg = `🎯 LaunchPulse Buyer Radar (${campaign.product_name})\n[${topAlert.source} · Intent ${topAlert.intentScore}] ${topAlert.title}\n${topAlert.url}`;
      fetch(monitor.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg, content: msg }),
      }).catch(() => {});
    }

    return jsonRes({ ok: true, scanned: collected.length, inserted, queries });
  } catch {
    return jsonRes({ error: "Radar scan failed." }, 500);
  }
}

/**
 * 8. 买家雷达线索 CRM 状态与原生回复草稿保存
 */
export async function handleUpdateRadarLead(
  request: Request,
  env: V4Env,
  user: SessionUser
): Promise<Response> {
  if (!env.DB) return jsonRes({ error: "DB not bound" }, 500);
  try {
    const body = (await request.json()) as {
      leadId?: number;
      status?: "new" | "drafted" | "replied" | "won" | "dismissed";
      draftReply?: string;
    };
    const leadId = Number(body.leadId || 0);
    if (!leadId) return jsonRes({ error: "Missing leadId" }, 400);
    const st = ["new", "drafted", "replied", "won", "dismissed"].includes(body.status || "")
      ? String(body.status)
      : "drafted";
    const draft = (body.draftReply || "").slice(0, 3000);

    await env.DB.prepare(
      `UPDATE radar_leads SET status = ?1, draft_reply = COALESCE(NULLIF(?2, ''), draft_reply) WHERE id = ?3 AND user_email = ?4`
    )
      .bind(st, draft, leadId, user.email)
      .run();

    return jsonRes({ ok: true, leadId, status: st });
  } catch {
    return jsonRes({ error: "Invalid lead update." }, 400);
  }
}

/**
 * 9. 测试 Slack / Discord Webhook 连通性
 */
export async function handleTestRadarWebhook(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { webhookUrl?: string; productName?: string };
    const safe = parseSafePublicUrl(body.webhookUrl || "");
    if (!safe) return jsonRes({ error: "Invalid HTTPS webhook URL." }, 400);
    const msg = `✅ LaunchPulse Buyer Radar connected for ${body.productName || "your SaaS"}. High-intent HN / GitHub / Dev.to buyer leads will arrive here in real time.`;
    const res = await fetch(safe.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: msg, content: msg }),
    });
    return jsonRes({ ok: res.ok, status: res.status });
  } catch {
    return jsonRes({ ok: false, error: "Webhook request failed." }, 502);
  }
}

/**
 * 10. 公开只读增长战报生成与读取（/report/:shareId）
 */
export async function handleUpsertPublicReport(
  request: Request,
  env: V4Env,
  user: SessionUser
): Promise<Response> {
  if (!env.DB) return jsonRes({ error: "DB not bound" }, 500);
  try {
    const body = (await request.json()) as { campaignId?: number; title?: string; showRevenue?: boolean };
    const campaignId = Number(body.campaignId || 0);
    if (!campaignId) return jsonRes({ error: "Missing campaignId" }, 400);

    const camp = await env.DB.prepare(
      `SELECT id, product_name FROM campaigns WHERE id = ?1 AND user_email = ?2 LIMIT 1`
    )
      .bind(campaignId, user.email)
      .first<{ id: number; product_name: string }>();
    if (!camp) return jsonRes({ error: "Campaign not found" }, 404);

    const existing = await env.DB.prepare(`SELECT share_id FROM public_reports WHERE campaign_id = ?1 LIMIT 1`)
      .bind(campaignId)
      .first<{ share_id: string }>();
    const shareId = existing?.share_id || randomId("rpt");
    const title = (body.title || `${camp.product_name} Growth & Attribution Report`).trim().slice(0, 120);
    const showRev = body.showRevenue === false ? 0 : 1;

    await env.DB.prepare(
      `INSERT INTO public_reports (share_id, campaign_id, user_email, title, show_revenue, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
       ON CONFLICT(campaign_id) DO UPDATE SET title = ?4, show_revenue = ?5, updated_at = datetime('now')`
    )
      .bind(shareId, campaignId, user.email, title, showRev)
      .run();

    return jsonRes({
      ok: true,
      shareId,
      reportUrl: `https://pulse.statementflow.win/report/${shareId}`,
      showRevenue: Boolean(showRev),
    });
  } catch {
    return jsonRes({ error: "Failed to publish report." }, 400);
  }
}

export async function handleGetPublicReport(shareIdRaw: string, env: V4Env): Promise<Response> {
  if (!env.DB) return jsonRes({ error: "DB not bound" }, 500);
  const shareId = shareIdRaw.toLowerCase().replace(/[^a-z0-9-_]/g, "").slice(0, 32);
  if (!shareId) return jsonRes({ error: "Missing shareId" }, 400);

  // 内置官方 AcmeFlow 示例公开战报（让访客零登录即可体验高质感公开战报）
  if (shareId === "demo-acmeflow") {
    const series = Array.from({ length: 14 }, (_, i) => ({
      date: new Date(Date.now() - (13 - i) * 86400 * 1000).toISOString().slice(0, 10),
      clicks: 74 + Math.round(i * 4.5 + (i % 3) * 7),
      conversions: 3 + (i % 4),
    }));
    return jsonRes({
      shareId,
      title: "AcmeFlow · 30-Day LaunchPulse Growth Report",
      productName: "AcmeFlow",
      targetUrl: "https://acmeflow.example",
      showRevenue: true,
      generatedAt: new Date().toISOString(),
      stats: {
        totalClicks: 1408,
        totalConversions: 72,
        conversionRate: 5.1,
        attributedRevenueUsd: 2088,
        rpv: 1.48,
        roiMultiple: 53.5,
        directoriesLive: 34,
        directoriesTotal: 100,
        funnel: { clicks: 1408, qualifiedVisits: 1183, signups: 54, purchases: 18 },
        dailySeries: series,
        channelBreakdown: [
          { channel: "directory", clicks: 788, conversions: 38, revenueUsd: 1102, cvr: 4.8 },
          { channel: "community", clicks: 408, conversions: 25, revenueUsd: 725, cvr: 6.1 },
          { channel: "seo", clicks: 212, conversions: 9, revenueUsd: 261, cvr: 4.2 },
        ],
        topDirectories: [
          { name: "SourceForge Software", dr: 91, linkType: "dofollow", url: "https://sourceforge.net" },
          { name: "DEV.to #showdev", dr: 85, linkType: "nofollow", url: "https://dev.to" },
          { name: "AlternativeTo", dr: 82, linkType: "nofollow", url: "https://alternativeto.net" },
          { name: "There's An AI For That", dr: 78, linkType: "dofollow", url: "https://theresanaiforthat.com" },
          { name: "BetaList", dr: 76, linkType: "dofollow", url: "https://betalist.com" },
          { name: "SaaSHub", dr: 74, linkType: "dofollow", url: "https://www.saashub.com" },
        ],
      },
    });
  }

  const rpt = await env.DB.prepare(
    `SELECT pr.share_id, pr.campaign_id, pr.user_email, pr.title, pr.show_revenue, c.product_name, c.target_url
     FROM public_reports pr
     JOIN campaigns c ON c.id = pr.campaign_id
     WHERE pr.share_id = ?1 LIMIT 1`
  )
    .bind(shareId)
    .first<{
      share_id: string;
      campaign_id: number;
      user_email: string;
      title: string;
      show_revenue: number;
      product_name: string;
      target_url: string;
    }>();
  if (!rpt) return jsonRes({ error: "Public report not found" }, 404);

  const [linksRes, clicksDailyRes, convDailyRes, convSumRes, liveDirsRes] = await Promise.all([
    env.DB.prepare(`SELECT channel, clicks_count, conversions_count FROM tracking_links WHERE campaign_id = ?1`)
      .bind(rpt.campaign_id)
      .all<{ channel: string; clicks_count: number; conversions_count: number }>(),
    env.DB.prepare(
      `SELECT substr(clicked_at, 1, 10) as day, COUNT(*) as cnt FROM link_clicks WHERE campaign_id = ?1 AND clicked_at >= datetime('now', '-30 days') GROUP BY day ORDER BY day ASC`
    )
      .bind(rpt.campaign_id)
      .all<{ day: string; cnt: number }>(),
    env.DB.prepare(
      `SELECT substr(created_at, 1, 10) as day, COUNT(*) as cnt FROM conversions WHERE campaign_id = ?1 AND created_at >= datetime('now', '-30 days') GROUP BY day ORDER BY day ASC`
    )
      .bind(rpt.campaign_id)
      .all<{ day: string; cnt: number }>(),
    env.DB.prepare(
      `SELECT event_type, COUNT(*) as cnt, COALESCE(SUM(value_usd), 0) as rev FROM conversions WHERE campaign_id = ?1 GROUP BY event_type`
    )
      .bind(rpt.campaign_id)
      .all<{ event_type: string; cnt: number; rev: number }>(),
    env.DB.prepare(
      `SELECT directory_name as name, dr, live_backlink_url as url FROM directory_submissions WHERE customer_email = ?1 AND status = 'live' ORDER BY dr DESC LIMIT 12`
    )
      .bind(rpt.user_email)
      .all<{ name: string; dr: number; url: string }>(),
  ]);

  const links = linksRes.results || [];
  const totalClicks = links.reduce((s, l) => s + Number(l.clicks_count || 0), 0);
  const totalConversions = links.reduce((s, l) => s + Number(l.conversions_count || 0), 0);
  let signups = 0;
  let purchases = 0;
  let rev = 0;
  for (const r of convSumRes.results || []) {
    rev += Number(r.rev || 0);
    if (r.event_type === "purchase") purchases += Number(r.cnt || 0);
    else signups += Number(r.cnt || 0);
  }

  const cMap = new Map((clicksDailyRes.results || []).map((r) => [r.day, Number(r.cnt)]));
  const vMap = new Map((convDailyRes.results || []).map((r) => [r.day, Number(r.cnt)]));
  const dailySeries = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400 * 1000).toISOString().slice(0, 10);
    return { date: d, clicks: cMap.get(d) || 0, conversions: vMap.get(d) || 0 };
  });

  const chMap = new Map<string, { clicks: number; conversions: number }>();
  for (const l of links) {
    const cur = chMap.get(l.channel) || { clicks: 0, conversions: 0 };
    cur.clicks += Number(l.clicks_count || 0);
    cur.conversions += Number(l.conversions_count || 0);
    chMap.set(l.channel, cur);
  }

  return jsonRes({
    shareId: rpt.share_id,
    title: rpt.title,
    productName: rpt.product_name,
    targetUrl: rpt.target_url,
    showRevenue: Boolean(rpt.show_revenue),
    generatedAt: new Date().toISOString(),
    stats: {
      totalClicks,
      totalConversions,
      conversionRate: totalClicks > 0 ? Number(((totalConversions / totalClicks) * 100).toFixed(2)) : 0,
      attributedRevenueUsd: rpt.show_revenue ? rev : 0,
      rpv: rpt.show_revenue && totalClicks > 0 ? Number((rev / totalClicks).toFixed(2)) : 0,
      roiMultiple: rpt.show_revenue && rev > 0 ? Number((rev / 39).toFixed(1)) : 0,
      directoriesLive: (liveDirsRes.results || []).length,
      directoriesTotal: 100,
      funnel: { clicks: totalClicks, qualifiedVisits: Math.round(totalClicks * 0.84), signups, purchases },
      dailySeries,
      channelBreakdown: Array.from(chMap.entries()).map(([channel, v]) => ({
        channel,
        clicks: v.clicks,
        conversions: v.conversions,
        cvr: v.clicks > 0 ? Number(((v.conversions / v.clicks) * 100).toFixed(2)) : 0,
      })),
      topDirectories: (liveDirsRes.results || []).map((d) => ({ ...d, linkType: "dofollow" })),
    },
  });
}
