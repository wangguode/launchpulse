/**
 * LaunchPulse Cloudflare Workers 边缘网关（D1 动态底座版）：
 * 1. POST /api/scan            — 100% 被动无害实时 SEO/AEO/安全头体检 + HN 真实买家匹配（内置防 SSRF）
 * 2. POST /api/track           — 战情页热力埋点（访问次数 / 视频播放最大秒数 / 买家线索点击数）实时写入 D1
 * 3. POST /api/checkout        — 直连 Creem.io 实时收银（$39 50+ Directory Blitz / $29/mo Radar Pro / $299 DFY）
 * 4. POST /api/webhook         — Creem HMAC-SHA256 验签并自动入账 D1 customers_orders + 签发 Magic Token
 * 5. POST /api/portal/lookup   — 免密客户工作台查询（凭 Magic Token 或付款邮箱拉取已购报告与买家线索）
 * 6. POST /api/portal/lead-status — 客户在工作台标记线索状态（new / replied / won）
 * 7. GET  /api/admin/overview  — 受 ADMIN_API_KEY 保护的内部指挥台同步接口（对接开源 PocketBase）
 */

import {
  handleDeepLiveScan,
  handleGetPublicReport,
  handleRunRadarScan,
  handleSaveBrandKit,
  handleSaveDirectoryPref,
  handleSaveRadarMonitor,
  handleTestRadarWebhook,
  handleUpdateRadarLead,
  handleUpsertPublicReport,
  handleV4DashboardOverview,
  runBacklinkHealthCheck,
} from "./worker-v4";

interface D1PreparedStatement {
  bind: (...values: unknown[]) => D1PreparedStatement;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
  run: () => Promise<{ success: boolean }>;
}

interface D1Database {
  prepare: (query: string) => D1PreparedStatement;
}

interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  DB?: D1Database;
  CREEM_API_KEY?: string;
  CREEM_PRODUCT_ID_FIXPACK?: string;
  CREEM_PRODUCT_ID_BLITZ?: string;
  CREEM_PRODUCT_ID_RADAR?: string;
  CREEM_PRODUCT_ID_DFY?: string;
  CREEM_WEBHOOK_SECRET?: string;
  ADMIN_API_KEY?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
}

const PLAN_CONFIG = {
  blitz: {
    name: "LaunchPulse 50+ Directory Distribution Blitz",
    amountUsd: 39,
  },
  fixpack: {
    name: "LaunchPulse 50+ Directory Distribution Blitz",
    amountUsd: 39,
  },
  radar: {
    name: "LaunchPulse Growth & Buyer Intent Radar Pro (Monthly)",
    amountUsd: 29,
  },
  dfy: {
    name: "LaunchPulse Done-For-You Growth Sprint",
    amountUsd: 299,
  },
} as const;

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": "frame-ancestors 'none'",
};

/**
 * V07：基于 CF-Connecting-IP 的轻量滑动窗口限流（单实例每分钟上限 25 次，防刷爆 D1/扫描配额）
 */
const ipRateWindow = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(request: Request, maxPerMinute = 25): boolean {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const now = Date.now();
  const entry = ipRateWindow.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRateWindow.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= maxPerMinute) return false;
  entry.count += 1;
  return true;
}

async function logAdminAudit(env: Env, request: Request, action: string, targetSlug = "") {
  if (!env.DB) return;
  try {
    const ip = request.headers.get("cf-connecting-ip") || "";
    await env.DB.prepare(
      `INSERT INTO admin_audit_logs (action, target_slug, ip) VALUES (?1, ?2, ?3)`
    )
      .bind(action, targetSlug, ip)
      .run();
  } catch {
    // ignore
  }
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...SECURITY_HEADERS,
    },
  });
}

function parseSafePublicHttpsUrl(rawInput: string): URL | null {
  try {
    const trimmed = rawInput.trim();
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProto);
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      !host.includes(".")
    ) {
      return null;
    }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      const parts = host.split(".").map(Number);
      if (
        parts[0] === 10 ||
        parts[0] === 127 ||
        parts[0] === 0 ||
        (parts[0] === 169 && parts[1] === 254) ||
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
        (parts[0] === 192 && parts[1] === 168)
      ) {
        return null;
      }
    }
    if (host.startsWith("[") || host.includes(":")) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function safeGet(url: string, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "LaunchPulseEdgeScanner/1.0 (+https://pulse.statementflow.win)",
        Accept: "text/html,text/plain,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const text = (await res.text()).slice(0, 120000);
    return { ok: res.ok, status: res.status, headers: res.headers, text };
  } catch {
    return { ok: false, status: 0, headers: new Headers(), text: "" };
  } finally {
    clearTimeout(timer);
  }
}

function cleanEntities(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function handleLiveScan(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { url?: string };
    const target = parseSafePublicHttpsUrl(body.url || "");
    if (!target) {
      return jsonResponse(
        { error: "Please enter a valid public HTTPS domain (e.g. https://your-startup.com)." },
        400
      );
    }

    const origin = target.origin;
    const domain = target.hostname.replace(/^www\./, "");

    const t0 = Date.now();
    const [homeRes, llmsRes, sitemapRes] = await Promise.all([
      safeGet(target.toString(), 6500),
      safeGet(`${origin}/llms.txt`, 4500),
      safeGet(`${origin}/sitemap.xml`, 4500),
    ]);
    const ttfbMs = Date.now() - t0;

    if (!homeRes.status) {
      return jsonResponse(
        { error: `Could not reach ${origin} within 6.5s. Check the URL and try again.` },
        422
      );
    }

    const html = homeRes.text;
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = cleanEntities(titleMatch?.[1] || domain);
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const h1 = cleanEntities(h1Match?.[1] || "");
    const descMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
    const metaDesc = cleanEntities(descMatch?.[1] || "");
    const hasOgImage = /property=["']og:image["']/i.test(html);
    const hasNoindex = /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html);
    const hasSoftwareSchema =
      /application\/ld\+json/i.test(html) &&
      /SoftwareApplication|WebApplication|Product/i.test(html);
    const hasVsPages = /\b(\/vs\/|alternatives?|compare)\b/i.test(html);
    const hasCsp = Boolean(homeRes.headers.get("content-security-policy"));
    const hasXfo = Boolean(homeRes.headers.get("x-frame-options"));

    const llmsValid =
      llmsRes.ok && !/<!doctype html|<html[\s>]/i.test(llmsRes.text.slice(0, 300));
    const sitemapValid =
      sitemapRes.ok && /<urlset|<sitemapindex/i.test(sitemapRes.text.slice(0, 600));

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
        evidence: `${domain} explicitly instructs search crawlers not to index the page.`,
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
    if (!hasSoftwareSchema) {
      leaks.push({
        severity: "high",
        category: "Google SEO",
        title: "Missing SoftwareApplication JSON-LD rich schema",
        evidence: `No SoftwareApplication / Offer structured schema detected on ${origin}.`,
      });
    }
    if (!hasCsp || !hasXfo) {
      leaks.push({
        severity: "high",
        category: "Security & Trust",
        title: "Missing Content-Security-Policy / X-Frame-Options headers",
        evidence: `Clickjacking & frame-ancestors hardening headers are unset on ${origin}.`,
      });
    }
    if (!hasVsPages) {
      leaks.push({
        severity: "high",
        category: "Conversion UX",
        title: "Zero competitor '/vs/' or 'Alternative to' landing pages",
        evidence: `Missing bottom-of-funnel comparison pages for high-intent buyers.`,
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
    if (!hasOgImage || metaDesc.length < 110) {
      leaks.push({
        severity: "medium",
        category: "Conversion UX",
        title: !hasOgImage
          ? "Missing OpenGraph og:image social preview card"
          : `Short meta description (${metaDesc.length} chars vs 145–158 optimal)`,
        evidence: `Sub-optimal social & SERP preview snippet on ${domain}.`,
      });
    }
    if (ttfbMs > 1200) {
      leaks.push({
        severity: "high",
        category: "Conversion UX",
        title: `Slow initial server response (${ttfbMs}ms TTFB > 1,200ms threshold)`,
        evidence: `Edge probe to ${origin} took ${ttfbMs}ms; slow first paint increases mobile bounce rates by 15%+.`,
      });
    }

    const stopWords = new Set([
      "the", "and", "for", "with", "your", "that", "from", "this", "into", "free", "app", "tool", "home", "welcome", "best", "fast", "modern",
    ]);
    const rawWords = `${title} ${h1}`
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !stopWords.has(w) && !domain.startsWith(w));
    const queryTerm = rawWords.slice(0, 2).join(" ") || domain.split(".")[0];

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
      const since45d = Math.floor((Date.now() - 45 * 86400 * 1000) / 1000);
      const hnRes = await fetch(
        `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(
          queryTerm
        )}&tags=comment&numericFilters=created_at_i>${since45d}&hitsPerPage=25`
      );
      const intentRegex =
        /\b(looking for|recommend|alternative|monitor|alert|expir|outage|problem|issue|broken|tool|switch|replace|better than|pain|frustrat|help|manage|automat|renew)\b/i;
      const coreTokens = queryTerm
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 3);
      if (hnRes.ok) {
        const hnData = (await hnRes.json()) as {
          hits?: Array<{
            objectID: string;
            author?: string;
            created_at?: string;
            story_title?: string;
            comment_text?: string;
          }>;
        };
        const seenScanTitles = new Set<string>();
        for (const hit of hnData.hits || []) {
          const st = cleanEntities(hit.story_title || "");
          if (
            !st ||
            /^show hn:/i.test(st) ||
            /^\[dead\]/i.test(st) ||
            /who is hiring|who wants to be hired|what are you working on/i.test(st)
          ) {
            continue;
          }
          const titleKey = st.toLowerCase();
          if (seenScanTitles.has(titleKey)) continue;
          const excerpt = cleanEntities(hit.comment_text || "");
          if (excerpt.length < 45) continue;
          const combined = `${st} ${excerpt}`.toLowerCase();
          const hasTopic = coreTokens.length === 0 || coreTokens.some((tok) => combined.includes(tok));
          const hasIntent = intentRegex.test(combined);
          if (!hasTopic || !hasIntent) continue;
          seenScanTitles.add(titleKey);
          leads.push({
            source: "Hacker News",
            author: `@${hit.author || "dev"}`,
            postedAt: (hit.created_at || "").slice(0, 10),
            title: st || "Developer thread",
            excerpt: excerpt.slice(0, 160) + (excerpt.length > 160 ? "..." : ""),
            url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
            unlocked: leads.length < 3,
          });
          if (leads.length >= 6) break;
        }
      }
    } catch {
      // ignore timeout
    }

    const score = Math.max(38, Math.min(96, 94 - leaks.length * 9));

    return jsonResponse({
      domain,
      origin,
      title,
      tagline: h1 || title,
      score,
      queryTerm,
      leaksCount: leaks.length,
      leaks: leaks.slice(0, 4),
      leads,
    });
  } catch {
    return jsonResponse({ error: "Invalid scan payload." }, 400);
  }
}

/**
 * 战情页行为热力埋点：记录访问次数、视频播放最大秒数、点击买家外链次数
 */
async function handleTrack(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return jsonResponse({ ok: true, persisted: false });
  try {
    const body = (await request.json()) as {
      slug?: string;
      event?: "view" | "video_progress" | "buyer_click";
      seconds?: number;
    };
    const slug = (body.slug || "").toLowerCase().replace(/[^a-z0-9-_]/g, "").slice(0, 64);
    const event = body.event || "view";
    if (!slug) return jsonResponse({ error: "Missing slug" }, 400);

    const sec = Math.max(0, Math.min(600, Math.round(Number(body.seconds || 0))));
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO outreach_logs (slug, page_views, max_video_seconds, buyer_clicks, last_event_at, last_event_type)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT(slug) DO UPDATE SET
         page_views = page_views + ?2,
         max_video_seconds = MAX(max_video_seconds, ?3),
         buyer_clicks = buyer_clicks + ?4,
         last_event_at = ?5,
         last_event_type = ?6`
    )
      .bind(
        slug,
        event === "view" ? 1 : 0,
        event === "video_progress" ? sec : 0,
        event === "buyer_click" ? 1 : 0,
        now,
        event
      )
      .run();

    return jsonResponse({ ok: true, persisted: true });
  } catch {
    return jsonResponse({ ok: false }, 400);
  }
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function verifyCreemSignature(
  rawBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expectedHex = Array.from(new Uint8Array(sigBytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return timingSafeEqualHex(signature.toLowerCase(), expectedHex);
}

async function handleCheckout(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as {
      plan?: string;
      slug?: string;
      targetUrl?: string;
      email?: string;
    };
    const plan: keyof typeof PLAN_CONFIG =
      body.plan === "blitz" || body.plan === "fixpack"
        ? "blitz"
        : body.plan === "dfy"
        ? "dfy"
        : "radar";
    const meta = PLAN_CONFIG[plan];
    const origin = request.headers.get("origin") || new URL(request.url).origin;
    const returnPath = body.slug
      ? `/audit/${encodeURIComponent(body.slug)}?unlocked=1&plan=${plan}`
      : `/portal?unlocked=1&plan=${plan}`;

    const creemApiKey = env.CREEM_API_KEY?.trim();
    const productId =
      plan === "blitz"
        ? env.CREEM_PRODUCT_ID_BLITZ?.trim() || env.CREEM_PRODUCT_ID_FIXPACK?.trim()
        : plan === "dfy"
        ? env.CREEM_PRODUCT_ID_DFY?.trim()
        : env.CREEM_PRODUCT_ID_RADAR?.trim();

    if (creemApiKey && productId) {
      const creemPayload: Record<string, unknown> = {
        product_id: productId,
        success_url: `${origin}${returnPath}`,
        request_id: `lp_${plan}_${Date.now()}`,
        metadata: {
          plan,
          slug: body.slug || "public",
          targetUrl: body.targetUrl || "",
        },
      };
      if (body.email?.trim()) {
        creemPayload.customer = { email: body.email.trim() };
      }

      const creemRes = await fetch("https://api.creem.io/v1/checkouts", {
        method: "POST",
        headers: {
          "x-api-key": creemApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(creemPayload),
      });

      if (creemRes.ok) {
        const data = (await creemRes.json()) as { checkout_url?: string };
        if (data.checkout_url) {
          return jsonResponse({
            mode: "live_redirect",
            checkoutUrl: data.checkout_url,
            plan,
            amountUsd: meta.amountUsd,
          });
        }
      }
    }

    if (productId) {
      return jsonResponse({
        mode: "hosted_product_redirect",
        checkoutUrl: `https://www.creem.io/product/${productId}`,
        plan,
        amountUsd: meta.amountUsd,
      });
    }

    return jsonResponse(
      {
        error: "Live checkout is momentarily initializing. Please email hello@statementflow.win.",
      },
      503
    );
  } catch {
    return jsonResponse({ error: "Invalid checkout request" }, 400);
  }
}

/**
 * 付款成功后通过 Resend 自动发送免密 Magic Link 欢迎邮件（配置 RESEND_API_KEY 后自动生效）
 */
async function sendResendEmail(
  env: Env,
  params: { to: string; subject: string; text: string }
): Promise<boolean> {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey || !params.to) return false;
  const from = env.RESEND_FROM_EMAIL?.trim() || "LaunchPulse <hello@statementflow.win>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        text: params.text,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Creem 付款回调：自动写入 D1 customers_orders、签发免密 Magic Token 并触发自动欢迎邮件
 */
async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const secret = env.CREEM_WEBHOOK_SECRET?.trim();
  const signature = request.headers.get("creem-signature") || "";
  if (!secret || !signature) {
    return jsonResponse({ error: "Missing webhook signature" }, 401);
  }
  const rawBody = await request.text();
  const valid = await verifyCreemSignature(rawBody, signature, secret);
  if (!valid) {
    return jsonResponse({ error: "Invalid signature" }, 401);
  }

  if (env.DB) {
    try {
      const payload = JSON.parse(rawBody) as {
        eventType?: string;
        object?: {
          id?: string;
          customer?: { email?: string };
          metadata?: { plan?: string; slug?: string; targetUrl?: string };
          order?: { amount?: number };
        };
      };
      const obj = payload.object || {};
      const email = (obj.customer?.email || "").trim().toLowerCase();
      const orderId = obj.id || `ord_${Date.now()}`;
      const plan = obj.metadata?.plan || "radar";
      const slug = obj.metadata?.slug || "";
      const targetUrl = obj.metadata?.targetUrl || "";
      const fallbackCents =
        plan === "dfy" ? 29900 : plan === "blitz" || plan === "fixpack" ? 3900 : 2900;
      const amountUsd = Math.round((obj.order?.amount || fallbackCents) / 100);
      const magicToken = crypto.randomUUID().replace(/-/g, "");

      if (email) {
        const evt = (payload.eventType || "").toLowerCase();
        const isRevoke = /cancel|expire|refund|dispute|revok/.test(evt);
        const isPaymentFailed = /payment_failed|failed|past_due/.test(evt);

        if (isPaymentFailed) {
          // V13：续费失败自动发送宽限期提醒邮件
          await sendResendEmail(env, {
            to: email,
            subject: "Action needed: Update payment method for LaunchPulse Buyer Radar",
            text: [
              "Hi there,",
              "",
              "Your recent renewal payment for LaunchPulse Buyer Radar Pro could not be processed.",
              "Your workspace remains active during a 3-day grace period. Please update your billing card in Creem or reply to hello@statementflow.win for help.",
              "",
              "— LaunchPulse Team",
            ].join("\n"),
          });
        } else if (isRevoke) {
          await env.DB.prepare(
            `UPDATE customers_orders SET status = ?1 WHERE order_id = ?2 OR customer_email = ?3`
          )
            .bind(/refund|dispute/.test(evt) ? "refunded" : "canceled", orderId, email)
            .run();
        } else {
          const expiresAt = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
          await env.DB.prepare(
            `INSERT INTO customers_orders (order_id, customer_email, slug, target_url, plan, amount_usd, status, magic_token, token_expires_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', ?7, ?8)
             ON CONFLICT(order_id) DO UPDATE SET status = 'active', token_expires_at = ?8`
          )
            .bind(orderId, email, slug, targetUrl, plan, amountUsd, magicToken, expiresAt)
            .run();

          if (slug) {
            await env.DB.prepare(
              `UPDATE leads_targets SET status = 'paid', updated_at = datetime('now') WHERE slug = ?1`
            )
              .bind(slug)
              .run();
          }

          const origin = new URL(request.url).origin;
          const portalLink = `${origin}/portal?token=${magicToken}`;
          const warRoomLink = slug ? `${origin}/audit/${slug}?token=${magicToken}` : portalLink;

          const planDisplayName =
            plan === "dfy"
              ? "Done-For-You Growth Sprint ($299)"
              : plan === "blitz" || plan === "fixpack"
              ? "50+ Directory Distribution Blitz ($39)"
              : "24/7 Buyer Intent Radar Pro ($29/mo)";

          await sendResendEmail(env, {
            to: email,
            subject: `Your LaunchPulse ${planDisplayName} is unlocked`,
            text: [
              "Welcome to LaunchPulse!",
              "",
              "Your payment is confirmed and your workspace is unlocked immediately (no password needed).",
              "",
              `• Customer Portal (50+ Directory Tracker, Bonus /llms.txt, Re-Scan & Buyer Feed): ${portalLink}`,
              slug ? `• Unlocked War-Room Report: ${warRoomLink}` : "",
              "",
              "Need anything? Simply reply to this email (hello@statementflow.win).",
              "",
              "— LaunchPulse Team",
            ]
              .filter(Boolean)
              .join("\n"),
          });
        }
      }
    } catch {
      // 防止非订单类 webhook 报错重发
    }
  }

  return jsonResponse({ received: true });
}

/**
 * 免密客户工作台查询（严格防撞库：凭 Magic Token 直接解锁；仅输邮箱则只发送 Magic Link 到本人收件箱，绝不直接泄露订单内容）
 */
async function handlePortalLookup(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return jsonResponse({ found: false, orders: [] });
  try {
    const body = (await request.json()) as { email?: string; token?: string; slug?: string };
    const token = (body.token || "").trim();
    const email = (body.email || "").trim().toLowerCase();

    if (token) {
      const order = await env.DB.prepare(
        `SELECT order_id, customer_email, slug, target_url, plan, amount_usd, status, token_expires_at, created_at
         FROM customers_orders WHERE magic_token = ?1 AND status = 'active' LIMIT 1`
      )
        .bind(token)
        .first<{ customer_email: string; token_expires_at?: string }>();

      const isExpired =
        Boolean(order?.token_expires_at) &&
        new Date(order!.token_expires_at!).getTime() < Date.now();

      if (!order || isExpired) {
        return jsonResponse({
          found: false,
          message: "Invalid or expired Magic Token. Enter your checkout email to receive a fresh 30-day login link.",
        });
      }

      const [deliveries, directories] = await Promise.all([
        env.DB.prepare(
          `SELECT lead_id, source, community, title, excerpt, url, reply_draft, lead_status, delivered_at
           FROM radar_deliveries WHERE customer_email = ?1 ORDER BY id DESC LIMIT 30`
        )
          .bind(order.customer_email)
          .all(),
        env.DB.prepare(
          `SELECT directory_id, directory_name, directory_url, dr, category, status, live_backlink_url, updated_at
           FROM directory_submissions WHERE customer_email = ?1 ORDER BY dr DESC`
        )
          .bind(order.customer_email)
          .all(),
      ]);

      return jsonResponse({
        found: true,
        order,
        deliveries: deliveries.results || [],
        directories: directories.results || [],
      });
    }

    if (email && email.includes("@")) {
      const order = await env.DB.prepare(
        `SELECT magic_token, slug, plan FROM customers_orders WHERE customer_email = ?1 AND status = 'active' ORDER BY id DESC LIMIT 1`
      )
        .bind(email)
        .first<{ magic_token: string; slug: string; plan: string }>();

      if (order) {
        // V08：每次重发 Magic Link 自动轮换新 Token 并续期 30 天
        const rotatedToken = crypto.randomUUID().replace(/-/g, "");
        const newExpiry = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
        await env.DB.prepare(
          `UPDATE customers_orders SET magic_token = ?1, token_expires_at = ?2 WHERE customer_email = ?3 AND status = 'active'`
        )
          .bind(rotatedToken, newExpiry, email)
          .run();

        const origin = new URL(request.url).origin;
        const targetLink =
          body.slug || order.slug
            ? `${origin}/audit/${encodeURIComponent(body.slug || order.slug)}?token=${rotatedToken}`
            : `${origin}/portal?token=${rotatedToken}`;
        await sendResendEmail(env, {
          to: email,
          subject: "Your LaunchPulse Magic Login Link (Valid 30 Days)",
          text: `Click below to securely unlock your LaunchPulse workspace:\n\n${targetLink}\n\n— LaunchPulse`,
        });
      }

      // 防邮箱枚举攻击：无论邮箱是否存在，均返回统一中性提示
      return jsonResponse({
        found: false,
        magicLinkSent: true,
        message:
          "If an active paid order exists for this email, we just sent a private Magic Login Link to your inbox.",
      });
    }

    return jsonResponse({ found: false, message: "Please provide a valid email or Magic Token." }, 400);
  } catch {
    return jsonResponse({ error: "Invalid portal lookup" }, 400);
  }
}

/**
 * V2 密码学安全哈希与会话工具（Web Crypto PBKDF2-SHA256 + HttpOnly Session Cookie）
 */
function bytesToHex(buf: ArrayBuffer | Uint8Array): string {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password: string, saltHex?: string): Promise<{ hash: string; salt: string }> {
  const saltBytes = saltHex
    ? new Uint8Array((saltHex.match(/.{1,2}/g) || []).map((b) => parseInt(b, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const salt = bytesToHex(saltBytes);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return { hash: bytesToHex(bits), salt };
}

function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get("cookie") || "";
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx > 0) {
      out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return out;
}

function makeSessionCookie(token: string, maxAgeSec = 30 * 86400): string {
  return `lp_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`;
}

function clearSessionCookie(): string {
  return `lp_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

async function getSessionUser(
  request: Request,
  env: Env
): Promise<{ id: number; email: string; name: string; role: string } | null> {
  if (!env.DB) return null;
  const cookies = parseCookies(request);
  const token = (cookies.lp_session || "").trim();
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.role, s.expires_at
     FROM sessions s JOIN users u ON s.user_id = u.id
     WHERE s.token = ?1 LIMIT 1`
  )
    .bind(token)
    .first<{ id: number; email: string; name: string; role: string; expires_at: string }>();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB.prepare(`DELETE FROM sessions WHERE token = ?1`).bind(token).run();
    return null;
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

function randomShortCode(prefix = ""): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let rand = "";
  for (const b of bytes) rand += chars[b % chars.length];
  const cleanPrefix = prefix.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6);
  return cleanPrefix ? `${cleanPrefix}-${rand}` : rand;
}

async function handleAuthRegister(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return jsonResponse({ error: "DB not bound" }, 500);
  try {
    const body = (await request.json()) as { email?: string; password?: string; name?: string };
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const name = (body.name || "").trim().slice(0, 60) || email.split("@")[0];
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: "Please enter a valid email address." }, 400);
    }
    if (password.length < 6) {
      return jsonResponse({ error: "Password must be at least 6 characters." }, 400);
    }
    const existing = await env.DB.prepare(`SELECT id FROM users WHERE email = ?1 LIMIT 1`)
      .bind(email)
      .first();
    if (existing) {
      return jsonResponse({ error: "An account with this email already exists. Please log in." }, 409);
    }
    const { hash, salt } = await hashPassword(password);
    await env.DB.prepare(
      `INSERT INTO users (email, name, password_hash, password_salt, role) VALUES (?1, ?2, ?3, ?4, 'customer')`
    )
      .bind(email, name, hash, salt)
      .run();
    const user = await env.DB.prepare(`SELECT id, email, name, role FROM users WHERE email = ?1 LIMIT 1`)
      .bind(email)
      .first<{ id: number; email: string; name: string; role: string }>();
    if (!user) return jsonResponse({ error: "Account creation failed." }, 500);

    const sessionToken = bytesToHex(crypto.getRandomValues(new Uint8Array(24)));
    const expiresAt = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
    await env.DB.prepare(
      `INSERT INTO sessions (token, user_id, email, expires_at) VALUES (?1, ?2, ?3, ?4)`
    )
      .bind(sessionToken, user.id, user.email, expiresAt)
      .run();

    return new Response(JSON.stringify({ ok: true, user }), {
      status: 201,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": makeSessionCookie(sessionToken),
        ...SECURITY_HEADERS,
      },
    });
  } catch {
    return jsonResponse({ error: "Invalid registration payload." }, 400);
  }
}

async function handleAuthLogin(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return jsonResponse({ error: "DB not bound" }, 500);
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    if (!email || !password) {
      return jsonResponse({ error: "Email and password are required." }, 400);
    }
    const user = await env.DB.prepare(
      `SELECT id, email, name, role, password_hash, password_salt FROM users WHERE email = ?1 LIMIT 1`
    )
      .bind(email)
      .first<{
        id: number;
        email: string;
        name: string;
        role: string;
        password_hash: string;
        password_salt: string;
      }>();
    if (!user) {
      return jsonResponse({ error: "Invalid email or password." }, 401);
    }
    const { hash } = await hashPassword(password, user.password_salt);
    if (!timingSafeEqualHex(hash, user.password_hash)) {
      return jsonResponse({ error: "Invalid email or password." }, 401);
    }
    const sessionToken = bytesToHex(crypto.getRandomValues(new Uint8Array(24)));
    const expiresAt = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
    await env.DB.prepare(
      `INSERT INTO sessions (token, user_id, email, expires_at) VALUES (?1, ?2, ?3, ?4)`
    )
      .bind(sessionToken, user.id, user.email, expiresAt)
      .run();

    return new Response(
      JSON.stringify({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Set-Cookie": makeSessionCookie(sessionToken),
          ...SECURITY_HEADERS,
        },
      }
    );
  } catch {
    return jsonResponse({ error: "Invalid login payload." }, 400);
  }
}

async function handleAuthLogout(request: Request, env: Env): Promise<Response> {
  if (env.DB) {
    const cookies = parseCookies(request);
    if (cookies.lp_session) {
      await env.DB.prepare(`DELETE FROM sessions WHERE token = ?1`).bind(cookies.lp_session).run();
    }
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": clearSessionCookie(),
      ...SECURITY_HEADERS,
    },
  });
}

async function handleDashboardOverview(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return jsonResponse({ error: "DB not bound" }, 500);
  const user = await getSessionUser(request, env);
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  const [
    ordersRes,
    campaignsRes,
    linksRes,
    dirsRes,
    deliveriesRes,
    clicksDailyRes,
    convDailyRes,
    countryRes,
    deviceRes,
    recentClicksRes,
    convRevenueRes,
  ] = await Promise.all([
    env.DB.prepare(
      `SELECT order_id, slug, target_url, plan, amount_usd, status, created_at FROM customers_orders WHERE customer_email = ?1 ORDER BY id DESC`
    )
      .bind(user.email)
      .all(),
    env.DB.prepare(
      `SELECT id, slug, product_name, target_url, tagline, competitors, status, created_at, updated_at FROM campaigns WHERE user_email = ?1 ORDER BY id DESC`
    )
      .bind(user.email)
      .all(),
    env.DB.prepare(
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
      .all<{ status: string }>(),
    env.DB.prepare(
      `SELECT lead_id, source, community, title, excerpt, url, reply_draft, lead_status, delivered_at FROM radar_deliveries WHERE customer_email = ?1 ORDER BY id DESC LIMIT 30`
    )
      .bind(user.email)
      .all(),
    env.DB.prepare(
      `SELECT substr(clicked_at, 1, 10) as day, COUNT(*) as cnt FROM link_clicks WHERE user_email = ?1 AND clicked_at >= datetime('now', '-30 days') GROUP BY day ORDER BY day ASC`
    )
      .bind(user.email)
      .all<{ day: string; cnt: number }>(),
    env.DB.prepare(
      `SELECT substr(created_at, 1, 10) as day, COUNT(*) as cnt FROM conversions WHERE user_email = ?1 AND created_at >= datetime('now', '-30 days') GROUP BY day ORDER BY day ASC`
    )
      .bind(user.email)
      .all<{ day: string; cnt: number }>(),
    env.DB.prepare(
      `SELECT country, COUNT(*) as clicks FROM link_clicks WHERE user_email = ?1 GROUP BY country ORDER BY clicks DESC LIMIT 8`
    )
      .bind(user.email)
      .all<{ country: string; clicks: number }>(),
    env.DB.prepare(
      `SELECT device, COUNT(*) as clicks FROM link_clicks WHERE user_email = ?1 GROUP BY device ORDER BY clicks DESC`
    )
      .bind(user.email)
      .all<{ device: string; clicks: number }>(),
    env.DB.prepare(
      `SELECT code, channel, country, device, referer, clicked_at FROM link_clicks WHERE user_email = ?1 ORDER BY id DESC LIMIT 12`
    )
      .bind(user.email)
      .all<{ code: string; channel: string; country: string; device: string; referer: string; clicked_at: string }>(),
    env.DB.prepare(
      `SELECT COALESCE(SUM(value_usd), 0) as rev FROM conversions WHERE user_email = ?1`
    )
      .bind(user.email)
      .first<{ rev: number }>(),
  ]);

  const links = linksRes.results || [];
  const dirs = dirsRes.results || [];
  const totalClicks = links.reduce((sum, l) => sum + Number(l.clicks_count || 0), 0);
  const totalConversions = links.reduce((sum, l) => sum + Number(l.conversions_count || 0), 0);
  const conversionRate = totalClicks > 0 ? Number(((totalConversions / totalClicks) * 100).toFixed(2)) : 0;
  const attributedRevenueUsd = Number(convRevenueRes?.rev || 0);

  // 构建近 30 天连续日期序列，支持前端自由切换 7D / 14D / 30D 视图
  const clickMap = new Map((clicksDailyRes.results || []).map((r) => [r.day, Number(r.cnt)]));
  const convMap = new Map((convDailyRes.results || []).map((r) => [r.day, Number(r.cnt)]));
  const dailySeries: Array<{ date: string; clicks: number; conversions: number }> = [];
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 86400 * 1000).toISOString().slice(0, 10);
    dailySeries.push({ date: d, clicks: clickMap.get(d) || 0, conversions: convMap.get(d) || 0 });
  }

  const channelMap = new Map<string, { clicks: number; conversions: number }>();
  for (const l of links) {
    const cur = channelMap.get(l.channel) || { clicks: 0, conversions: 0 };
    cur.clicks += Number(l.clicks_count || 0);
    cur.conversions += Number(l.conversions_count || 0);
    channelMap.set(l.channel, cur);
  }
  const channelBreakdown = Array.from(channelMap.entries()).map(([channel, v]) => ({
    channel,
    clicks: v.clicks,
    conversions: v.conversions,
    cvr: v.clicks > 0 ? Number(((v.conversions / v.clicks) * 100).toFixed(2)) : 0,
  }));

  return jsonResponse({
    user,
    orders: ordersRes.results || [],
    campaigns: campaignsRes.results || [],
    links,
    directories: dirs,
    deliveries: deliveriesRes.results || [],
    stats: {
      totalClicks,
      totalConversions,
      conversionRate,
      attributedRevenueUsd,
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

async function handleDashboardSaveCampaign(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return jsonResponse({ error: "DB not bound" }, 500);
  const user = await getSessionUser(request, env);
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  try {
    const body = (await request.json()) as {
      productName?: string;
      targetUrl?: string;
      tagline?: string;
      competitors?: string;
    };
    const target = parseSafePublicHttpsUrl(body.targetUrl || "");
    if (!target) {
      return jsonResponse({ error: "Please enter a valid public HTTPS website URL." }, 400);
    }
    const productName = (body.productName || "").trim().slice(0, 80) || target.hostname.replace(/^www\./, "");
    const slug = target.hostname
      .replace(/^www\./, "")
      .split(".")[0]
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    const tagline = (body.tagline || "").trim().slice(0, 200);
    const competitors = (body.competitors || "").trim().slice(0, 160);

    await env.DB.prepare(
      `INSERT INTO campaigns (user_email, slug, product_name, target_url, tagline, competitors, status, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', datetime('now'))
       ON CONFLICT(user_email, slug) DO UPDATE SET
         product_name = ?3, target_url = ?4, tagline = ?5, competitors = ?6, updated_at = datetime('now')`
    )
      .bind(user.email, slug, productName, target.origin, tagline, competitors)
      .run();

    const campaign = await env.DB.prepare(
      `SELECT id, slug, product_name, target_url FROM campaigns WHERE user_email = ?1 AND slug = ?2 LIMIT 1`
    )
      .bind(user.email, slug)
      .first<{ id: number; slug: string; product_name: string; target_url: string }>();

    if (campaign) {
      // 自动为新项目签发 3 条即插即用的归因追踪短链（目录外链 / 社区回复 / SEO 竞品页）
      const existingLinks = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM tracking_links WHERE campaign_id = ?1`
      )
        .bind(campaign.id)
        .first<{ cnt: number }>();

      if (!existingLinks || Number(existingLinks.cnt) === 0) {
        const defaults = [
          { channel: "directory", label: "50+ Directory Distribution" },
          { channel: "community", label: "HN / Reddit Buyer Replies" },
          { channel: "seo", label: "Competitor /vs/ & /llms.txt" },
        ];
        for (const d of defaults) {
          const code = randomShortCode(`${slug.slice(0, 4)}${d.channel[0]}`);
          await env.DB.prepare(
            `INSERT OR IGNORE INTO tracking_links (code, campaign_id, user_email, channel, label, destination_url)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
          )
            .bind(code, campaign.id, user.email, d.channel, d.label, campaign.target_url)
            .run();
        }
      }
    }

    return jsonResponse({ ok: true, campaign });
  } catch {
    return jsonResponse({ error: "Invalid campaign payload." }, 400);
  }
}

async function handleDashboardCreateLink(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return jsonResponse({ error: "DB not bound" }, 500);
  const user = await getSessionUser(request, env);
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  try {
    const body = (await request.json()) as {
      campaignId?: number;
      channel?: string;
      label?: string;
      destinationUrl?: string;
    };
    const target = parseSafePublicHttpsUrl(body.destinationUrl || "");
    if (!target) return jsonResponse({ error: "Invalid HTTPS destination URL." }, 400);
    const channel = ["directory", "community", "seo", "custom"].includes(body.channel || "")
      ? body.channel!
      : "custom";
    const label = (body.label || "Custom Campaign Link").trim().slice(0, 80);
    const code = randomShortCode(channel.slice(0, 3));
    await env.DB.prepare(
      `INSERT INTO tracking_links (code, campaign_id, user_email, channel, label, destination_url)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    )
      .bind(code, Number(body.campaignId || 0), user.email, channel, label, target.toString())
      .run();
    return jsonResponse({ ok: true, code });
  } catch {
    return jsonResponse({ error: "Unable to create link." }, 400);
  }
}

/**
 * 边缘追踪短链跳转（/r/:code）：复刻 Dub 架构，毫秒级 302 跳转 + 写入 D1 点击明细与 UTM 归因
 */
async function handleShortLinkRedirect(code: string, request: Request, env: Env): Promise<Response> {
  if (!env.DB) return new Response("Not Found", { status: 404 });
  const cleanCode = code.toLowerCase().replace(/[^a-z0-9-_]/g, "").slice(0, 32);
  if (!cleanCode) return new Response("Not Found", { status: 404 });

  const link = await env.DB.prepare(
    `SELECT code, campaign_id, user_email, channel, destination_url FROM tracking_links WHERE code = ?1 LIMIT 1`
  )
    .bind(cleanCode)
    .first<{
      code: string;
      campaign_id: number;
      user_email: string;
      channel: string;
      destination_url: string;
    }>();

  if (!link) return new Response("Tracking link not found", { status: 404 });

  const ua = request.headers.get("user-agent") || "";
  const device = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
  const referer = (request.headers.get("referer") || "").slice(0, 200);
  const cfCountry = ((request as Request & { cf?: { country?: string } }).cf?.country || "UN").slice(0, 8);

  // 仅对真实 GET 访问计入点击，避免 HEAD 探测虚增点击数
  if (request.method === "GET") {
    try {
      await Promise.all([
        env.DB.prepare(`UPDATE tracking_links SET clicks_count = clicks_count + 1 WHERE code = ?1`)
          .bind(link.code)
          .run(),
        env.DB.prepare(
          `INSERT INTO link_clicks (code, campaign_id, user_email, channel, country, referer, device)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
        )
          .bind(link.code, link.campaign_id, link.user_email, link.channel, cfCountry, referer, device)
          .run(),
      ]);
    } catch {
      // ignore
    }
  }

  let dest = link.destination_url;
  try {
    const destUrl = new URL(link.destination_url);
    destUrl.searchParams.set("utm_source", "launchpulse");
    destUrl.searchParams.set("utm_medium", link.channel);
    destUrl.searchParams.set("lp_ref", link.code);
    dest = destUrl.toString();
  } catch {
    // fallback raw url
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: dest,
      "Cache-Control": "no-store",
      ...SECURITY_HEADERS,
    },
  });
}

/**
 * 客户网站 1 行转化追踪脚本（/api/pixel.js）与转化回传（POST /api/pixel）
 */
function handlePixelScript(): Response {
  const js = `(function(){try{var p=new URLSearchParams(location.search);var r=p.get("lp_ref");if(r)localStorage.setItem("lp_ref",r);window.lpConvert=function(ev,val){var c=localStorage.getItem("lp_ref")||"";fetch("https://pulse.statementflow.win/api/pixel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:c,event:ev||"signup",valueUsd:Number(val||0)}),keepalive:true}).catch(function(){});};}catch(e){}})();`;
  return new Response(js, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

async function handlePixelConversion(request: Request, env: Env): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (!env.DB) return new Response(JSON.stringify({ ok: false }), { status: 500, headers: corsHeaders });
  try {
    const body = (await request.json()) as { code?: string; event?: string; valueUsd?: number };
    const code = (body.code || "").toLowerCase().replace(/[^a-z0-9-_]/g, "").slice(0, 32);
    if (!code) {
      return new Response(JSON.stringify({ ok: false, error: "Missing tracking code" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const link = await env.DB.prepare(
      `SELECT code, campaign_id, user_email FROM tracking_links WHERE code = ?1 LIMIT 1`
    )
      .bind(code)
      .first<{ code: string; campaign_id: number; user_email: string }>();
    if (!link) {
      return new Response(JSON.stringify({ ok: false, error: "Unknown code" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const ev = body.event === "purchase" ? "purchase" : "signup";
    const val = Math.max(0, Math.min(100000, Number(body.valueUsd || 0)));
    await Promise.all([
      env.DB.prepare(`UPDATE tracking_links SET conversions_count = conversions_count + 1 WHERE code = ?1`)
        .bind(link.code)
        .run(),
      env.DB.prepare(
        `INSERT INTO conversions (campaign_id, user_email, code, event_type, value_usd) VALUES (?1, ?2, ?3, ?4, ?5)`
      )
        .bind(link.campaign_id, link.user_email, link.code, ev, val)
        .run(),
    ]);
    return new Response(JSON.stringify({ ok: true, code: link.code, event: ev }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}

/**
 * V3 服务端 HttpOnly Admin 会话鉴权（兼容 CLI 的 x-admin-key 与网页端的 HttpOnly lp_admin Cookie）
 */
async function signAdminCookieValue(secret: string, expMs: number): Promise<string> {
  const payload = `admin:${expMs}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${expMs}.${bytesToHex(sig)}`;
}

async function isAdminAuthorized(request: Request, env: Env): Promise<boolean> {
  const adminKey = env.ADMIN_API_KEY?.trim();
  if (!adminKey) return false;
  // 1. CLI / 自动化脚本头鉴权
  const headerKey = (request.headers.get("x-admin-key") || "").trim();
  if (headerKey && timingSafeEqualHex(headerKey, adminKey)) return true;
  // 2. 网页端 HttpOnly 签名 Cookie 鉴权（绝不将密钥明文存前端 storage）
  const cookies = parseCookies(request);
  const raw = cookies.lp_admin || "";
  const dot = raw.indexOf(".");
  if (dot <= 0) return false;
  const expMs = Number(raw.slice(0, dot));
  const sigHex = raw.slice(dot + 1);
  if (!Number.isFinite(expMs) || expMs < Date.now()) return false;
  const expected = await signAdminCookieValue(adminKey, expMs);
  return timingSafeEqualHex(`${expMs}.${sigHex}`, expected);
}

async function handleAdminLogin(request: Request, env: Env): Promise<Response> {
  const adminKey = env.ADMIN_API_KEY?.trim();
  if (!adminKey) return jsonResponse({ error: "Admin auth unavailable" }, 503);
  try {
    const body = (await request.json()) as { key?: string };
    const provided = (body.key || "").trim();
    if (!provided || !timingSafeEqualHex(provided, adminKey)) {
      return jsonResponse({ error: "Invalid administrator key." }, 401);
    }
    const expMs = Date.now() + 7 * 86400 * 1000;
    const cookieVal = await signAdminCookieValue(adminKey, expMs);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": `lp_admin=${encodeURIComponent(cookieVal)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 86400}`,
        ...SECURITY_HEADERS,
      },
    });
  } catch {
    return jsonResponse({ error: "Invalid login payload" }, 400);
  }
}

function handleAdminLogout(): Response {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": "lp_admin=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
      ...SECURITY_HEADERS,
    },
  });
}

/**
 * V3 免密 Magic Token 无缝换取标准 /dashboard 会话（彻底消灭 /portal 与 /dashboard 双轨割裂）
 */
async function handleMagicExchange(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return jsonResponse({ error: "DB not bound" }, 500);
  try {
    const body = (await request.json()) as { token?: string };
    const token = (body.token || "").trim();
    if (!token) return jsonResponse({ error: "Missing Magic Token" }, 400);

    const order = await env.DB.prepare(
      `SELECT order_id, customer_email, slug, target_url, plan, token_expires_at
       FROM customers_orders WHERE magic_token = ?1 AND status = 'active' LIMIT 1`
    )
      .bind(token)
      .first<{
        order_id: string;
        customer_email: string;
        slug: string;
        target_url: string;
        plan: string;
        token_expires_at?: string;
      }>();

    const isExpired =
      Boolean(order?.token_expires_at) && new Date(order!.token_expires_at!).getTime() < Date.now();
    if (!order || isExpired) {
      return jsonResponse(
        { error: "Invalid or expired Magic Link. Enter your checkout email to request a new one." },
        401
      );
    }

    const email = order.customer_email.toLowerCase().trim();
    let user = await env.DB.prepare(`SELECT id, email, name, role FROM users WHERE email = ?1 LIMIT 1`)
      .bind(email)
      .first<{ id: number; email: string; name: string; role: string }>();

    if (!user) {
      const randPass = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
      const { hash, salt } = await hashPassword(randPass);
      const displayName = email.split("@")[0];
      await env.DB.prepare(
        `INSERT OR IGNORE INTO users (email, name, password_hash, password_salt, role) VALUES (?1, ?2, ?3, ?4, 'customer')`
      )
        .bind(email, displayName, hash, salt)
        .run();
      user = await env.DB.prepare(`SELECT id, email, name, role FROM users WHERE email = ?1 LIMIT 1`)
        .bind(email)
        .first<{ id: number; email: string; name: string; role: string }>();
    }
    if (!user) return jsonResponse({ error: "Unable to initialize workspace account." }, 500);

    // 若订单自带 target_url / slug 且用户尚未建项目，自动建档并生成 3 条追踪短链
    if (order.target_url) {
      const parsed = parseSafePublicHttpsUrl(order.target_url);
      if (parsed) {
        const slug =
          (order.slug || parsed.hostname.replace(/^www\./, "").split(".")[0])
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "") || "project";
        const productName = parsed.hostname.replace(/^www\./, "");
        await env.DB.prepare(
          `INSERT OR IGNORE INTO campaigns (user_email, slug, product_name, target_url, status)
           VALUES (?1, ?2, ?3, ?4, 'active')`
        )
          .bind(email, slug, productName, parsed.origin)
          .run();
        const camp = await env.DB.prepare(
          `SELECT id, target_url FROM campaigns WHERE user_email = ?1 AND slug = ?2 LIMIT 1`
        )
          .bind(email, slug)
          .first<{ id: number; target_url: string }>();
        if (camp) {
          const cntRow = await env.DB.prepare(
            `SELECT COUNT(*) as cnt FROM tracking_links WHERE campaign_id = ?1`
          )
            .bind(camp.id)
            .first<{ cnt: number }>();
          if (!cntRow || Number(cntRow.cnt) === 0) {
            for (const d of [
              { channel: "directory", label: "50+ Directory Distribution" },
              { channel: "community", label: "HN / Reddit Buyer Replies" },
              { channel: "seo", label: "Competitor /vs/ & /llms.txt" },
            ]) {
              const code = randomShortCode(`${slug.slice(0, 4)}${d.channel[0]}`);
              await env.DB.prepare(
                `INSERT OR IGNORE INTO tracking_links (code, campaign_id, user_email, channel, label, destination_url)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
              )
                .bind(code, camp.id, email, d.channel, d.label, camp.target_url)
                .run();
            }
          }
        }
      }
    }

    const sessionToken = bytesToHex(crypto.getRandomValues(new Uint8Array(24)));
    const expiresAt = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
    await env.DB.prepare(
      `INSERT INTO sessions (token, user_id, email, expires_at) VALUES (?1, ?2, ?3, ?4)`
    )
      .bind(sessionToken, user.id, user.email, expiresAt)
      .run();

    return new Response(JSON.stringify({ ok: true, user, redirectTo: "/dashboard" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": makeSessionCookie(sessionToken),
        ...SECURITY_HEADERS,
      },
    });
  } catch {
    return jsonResponse({ error: "Invalid magic link exchange" }, 400);
  }
}

/**
 * 在线可视化管理台聚合接口（支持 HttpOnly Admin Cookie 或 x-admin-key）
 */
async function handleAdminDashboard(request: Request, env: Env): Promise<Response> {
  if (!(await isAdminAuthorized(request, env))) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  if (!env.DB) return jsonResponse({ error: "DB not bound" }, 500);

  const [usersRes, campaignsRes, ordersRes, linksRes, dirsRes, outreachRes, brandKitsRes, dirHealthRes] =
    await Promise.all([
      env.DB.prepare(`SELECT id, email, name, role, created_at FROM users ORDER BY id DESC LIMIT 100`).all(),
      env.DB.prepare(`SELECT * FROM campaigns ORDER BY updated_at DESC LIMIT 100`).all(),
      env.DB.prepare(`SELECT * FROM customers_orders ORDER BY created_at DESC LIMIT 100`).all<{
        plan: string;
        amount_usd: number;
        status: string;
      }>(),
      env.DB.prepare(`SELECT * FROM tracking_links ORDER BY clicks_count DESC LIMIT 200`).all<{
        clicks_count: number;
        conversions_count: number;
      }>(),
      env.DB.prepare(`SELECT * FROM directory_submissions ORDER BY updated_at DESC LIMIT 200`).all(),
      env.DB.prepare(`SELECT * FROM outreach_logs ORDER BY last_event_at DESC LIMIT 100`).all(),
      env.DB.prepare(`SELECT * FROM brand_kits ORDER BY updated_at DESC LIMIT 100`).all(),
      env.DB.prepare(`SELECT * FROM directory_health_checks ORDER BY updated_at DESC LIMIT 300`).all(),
    ]);

  const orders = ordersRes.results || [];
  const links = linksRes.results || [];
  const totalRevenueUsd = orders
    .filter((o) => o.status === "active")
    .reduce((s, o) => s + Number(o.amount_usd || 0), 0);
  const activeMrrUsd = orders
    .filter((o) => o.status === "active" && o.plan === "radar")
    .reduce((s, o) => s + Number(o.amount_usd || 29), 0);
  const totalClicks = links.reduce((s, l) => s + Number(l.clicks_count || 0), 0);
  const totalConversions = links.reduce((s, l) => s + Number(l.conversions_count || 0), 0);
  const overallCvr = totalClicks > 0 ? Number(((totalConversions / totalClicks) * 100).toFixed(2)) : 0;

  return jsonResponse({
    syncedAt: new Date().toISOString(),
    kpis: {
      totalUsers: (usersRes.results || []).length,
      totalCampaigns: (campaignsRes.results || []).length,
      totalOrders: orders.length,
      totalRevenueUsd,
      activeMrrUsd,
      totalClicks,
      totalConversions,
      overallCvr,
    },
    users: usersRes.results || [],
    campaigns: campaignsRes.results || [],
    orders,
    links,
    directories: dirsRes.results || [],
    outreach: outreachRes.results || [],
    brandKits: brandKitsRes.results || [],
    directoryHealth: dirHealthRes.results || [],
  });
}

/**
 * 内部指挥台同步接口（受 ADMIN_API_KEY 保护，供本地 PocketBase 拉取实时数据）
 */
async function handleAdminOverview(request: Request, env: Env): Promise<Response> {
  const adminKey = env.ADMIN_API_KEY?.trim();
  const provided = request.headers.get("x-admin-key") || "";
  if (!adminKey || !provided || !timingSafeEqualHex(provided, adminKey)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  if (!env.DB) return jsonResponse({ error: "DB not bound" }, 500);

  const [leads, outreach, orders] = await Promise.all([
    env.DB.prepare(`SELECT * FROM leads_targets ORDER BY updated_at DESC LIMIT 100`).all(),
    env.DB.prepare(`SELECT * FROM outreach_logs ORDER BY last_event_at DESC LIMIT 100`).all(),
    env.DB.prepare(`SELECT * FROM customers_orders ORDER BY created_at DESC LIMIT 100`).all(),
  ]);

  return jsonResponse({
    syncedAt: new Date().toISOString(),
    leads: leads.results || [],
    outreach: outreach.results || [],
    orders: orders.results || [],
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // V2 边缘追踪短链跳转（/r/:code）与转化像素
    if (url.pathname.startsWith("/r/") && (request.method === "GET" || request.method === "HEAD")) {
      const code = url.pathname.slice(3).split("/")[0];
      return handleShortLinkRedirect(code, request, env);
    }
    if (url.pathname === "/api/pixel.js" && request.method === "GET") {
      return handlePixelScript();
    }
    if (url.pathname === "/api/pixel" && (request.method === "POST" || request.method === "OPTIONS")) {
      return handlePixelConversion(request, env);
    }

    // V2 注册登录认证接口（含 V3 Magic Link 无缝换取 Session + Admin HttpOnly 登录）
    if (url.pathname === "/api/auth/register" && request.method === "POST") {
      if (!checkRateLimit(request, 10)) return jsonResponse({ error: "Too many attempts." }, 429);
      return handleAuthRegister(request, env);
    }
    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      if (!checkRateLimit(request, 15)) return jsonResponse({ error: "Too many login attempts." }, 429);
      return handleAuthLogin(request, env);
    }
    if (url.pathname === "/api/auth/magic-exchange" && request.method === "POST") {
      if (!checkRateLimit(request, 15)) return jsonResponse({ error: "Too many attempts." }, 429);
      return handleMagicExchange(request, env);
    }
    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      return handleAuthLogout(request, env);
    }
    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      const user = await getSessionUser(request, env);
      return jsonResponse({ authenticated: Boolean(user), user });
    }
    if (url.pathname === "/api/admin/login" && request.method === "POST") {
      if (!checkRateLimit(request, 10)) return jsonResponse({ error: "Too many attempts." }, 429);
      return handleAdminLogin(request, env);
    }
    if (url.pathname === "/api/admin/logout" && request.method === "POST") {
      return handleAdminLogout();
    }

    // V4 客户控制台多项目聚合、Brand Kit、选站审批、买家雷达 Pro 与公开战报接口
    if (url.pathname === "/api/dashboard/overview" && request.method === "GET") {
      const user = await getSessionUser(request, env);
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
      return handleV4DashboardOverview(request, env, user);
    }
    if (url.pathname === "/api/dashboard/campaign" && request.method === "POST") {
      return handleDashboardSaveCampaign(request, env);
    }
    if (url.pathname === "/api/dashboard/links" && request.method === "POST") {
      return handleDashboardCreateLink(request, env);
    }
    if (url.pathname === "/api/dashboard/brand-kit" && request.method === "POST") {
      const user = await getSessionUser(request, env);
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
      return handleSaveBrandKit(request, env, user);
    }
    if (url.pathname === "/api/dashboard/directory-pref" && request.method === "POST") {
      const user = await getSessionUser(request, env);
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
      return handleSaveDirectoryPref(request, env, user);
    }
    if (url.pathname === "/api/dashboard/radar/monitor" && request.method === "POST") {
      const user = await getSessionUser(request, env);
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
      return handleSaveRadarMonitor(request, env, user);
    }
    if (url.pathname === "/api/dashboard/radar/scan" && request.method === "POST") {
      if (!checkRateLimit(request, 12)) return jsonResponse({ error: "Too many scans. Wait 60s." }, 429);
      const user = await getSessionUser(request, env);
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
      return handleRunRadarScan(request, env, user);
    }
    if (url.pathname === "/api/dashboard/radar/lead" && request.method === "POST") {
      const user = await getSessionUser(request, env);
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
      return handleUpdateRadarLead(request, env, user);
    }
    if (url.pathname === "/api/dashboard/radar/test-webhook" && request.method === "POST") {
      const user = await getSessionUser(request, env);
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
      return handleTestRadarWebhook(request);
    }
    if (url.pathname === "/api/dashboard/public-report" && request.method === "POST") {
      const user = await getSessionUser(request, env);
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
      return handleUpsertPublicReport(request, env, user);
    }
    if (url.pathname.startsWith("/api/public-report/") && request.method === "GET") {
      const shareId = url.pathname.replace("/api/public-report/", "").split("/")[0];
      return handleGetPublicReport(shareId, env);
    }

    // V4 管理员一键触发外链 HTTP/dofollow 验活巡检
    if (url.pathname === "/api/admin/verify-backlinks" && request.method === "POST") {
      if (!(await isAdminAuthorized(request, env))) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      const body = (await request.json().catch(() => ({}))) as { customerEmail?: string };
      const summary = await runBacklinkHealthCheck(env, body.customerEmail || "", 20);
      await logAdminAudit(env, request, "verify_backlinks", body.customerEmail || "all");
      return jsonResponse({ ok: true, ...summary });
    }

    // V2 在线可视化管理台聚合接口
    if (url.pathname === "/api/admin/dashboard" && request.method === "GET") {
      await logAdminAudit(env, request, "admin_dashboard_read");
      return handleAdminDashboard(request, env);
    }

    if (url.pathname === "/api/scan" && request.method === "POST") {
      if (!checkRateLimit(request, 20)) return jsonResponse({ error: "Rate limit exceeded. Try again in 60s." }, 429);
      return handleDeepLiveScan(request);
    }
    if (url.pathname === "/api/track" && request.method === "POST") {
      if (!checkRateLimit(request, 60)) return jsonResponse({ ok: true, throttled: true }, 429);
      return handleTrack(request, env);
    }
    if (url.pathname === "/api/checkout" && request.method === "POST") {
      if (!checkRateLimit(request, 15)) return jsonResponse({ error: "Too many checkout attempts." }, 429);
      return handleCheckout(request, env);
    }
    if (url.pathname === "/api/webhook" && request.method === "POST") {
      return handleWebhook(request, env);
    }
    if (url.pathname === "/api/portal/lookup" && request.method === "POST") {
      if (!checkRateLimit(request, 15)) return jsonResponse({ error: "Too many lookup attempts." }, 429);
      return handlePortalLookup(request, env);
    }
    if (url.pathname === "/api/portal/verify-unlock" && request.method === "POST") {
      if (!env.DB) return jsonResponse({ unlocked: false });
      try {
        const body = (await request.json()) as { token?: string; email?: string; slug?: string };
        const token = (body.token || "").trim();
        const email = (body.email || "").trim().toLowerCase();
        if (!token && !email) return jsonResponse({ unlocked: false });
        const row = token
          ? await env.DB.prepare(
              `SELECT plan FROM customers_orders WHERE magic_token = ?1 AND status = 'active' LIMIT 1`
            )
              .bind(token)
              .first<{ plan: string }>()
          : await env.DB.prepare(
              `SELECT plan FROM customers_orders WHERE customer_email = ?1 AND status = 'active' LIMIT 1`
            )
              .bind(email)
              .first<{ plan: string }>();
        return jsonResponse({ unlocked: Boolean(row), plan: row?.plan || null });
      } catch {
        return jsonResponse({ unlocked: false }, 400);
      }
    }
    if (url.pathname === "/api/portal/lead-status" && request.method === "POST") {
      if (!env.DB) return jsonResponse({ ok: true, persisted: false });
      try {
        const body = (await request.json()) as {
          token?: string;
          slug?: string;
          leadId?: string;
          status?: string;
          title?: string;
          url?: string;
          source?: string;
          community?: string;
        };
        const token = (body.token || "").trim();
        // 严禁匿名写 D1，必须持有有效付费 Magic Token 才能持久化到生产库
        if (!token) {
          return jsonResponse({ ok: true, persisted: false, reason: "demo_local_only" });
        }
        const owner = await env.DB.prepare(
          `SELECT customer_email FROM customers_orders WHERE magic_token = ?1 AND status = 'active' LIMIT 1`
        )
          .bind(token)
          .first<{ customer_email: string }>();
        if (!owner) {
          return jsonResponse({ error: "Unauthorized token" }, 401);
        }
        const leadId = (body.leadId || "").slice(0, 80);
        const status = ["new", "replied", "won", "archived"].includes(body.status || "")
          ? body.status
          : "new";
        if (!leadId) return jsonResponse({ error: "Missing leadId" }, 400);
        await env.DB.prepare(
          `INSERT INTO radar_deliveries (customer_email, slug, lead_id, source, community, title, excerpt, url, lead_status)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, '', ?7, ?8)
           ON CONFLICT(customer_email, lead_id) DO UPDATE SET lead_status = ?8`
        )
          .bind(
            owner.customer_email,
            body.slug || "",
            leadId,
            body.source || "Community",
            body.community || "",
            (body.title || "").slice(0, 160),
            body.url || "",
            status
          )
          .run();
        return jsonResponse({ ok: true, persisted: true, status });
      } catch {
        return jsonResponse({ ok: false }, 400);
      }
    }
    if (url.pathname === "/api/admin/overview" && request.method === "GET") {
      await logAdminAudit(env, request, "overview_read");
      return handleAdminOverview(request, env);
    }

    // 动态报告入库接口（受 ADMIN_API_KEY 保护，新增客户 1 秒写入 D1 立即上线无需重新 build）
    if (url.pathname === "/api/admin/ingest" && request.method === "POST") {
      const adminKey = env.ADMIN_API_KEY?.trim();
      const provided = request.headers.get("x-admin-key") || "";
      if (!adminKey || !provided || !timingSafeEqualHex(provided, adminKey)) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      if (!env.DB) return jsonResponse({ error: "DB not bound" }, 500);
      try {
        const rep = (await request.json()) as {
          slug?: string;
          productName?: string;
          targetUrl?: string;
          domain?: string;
          overallScore?: number;
          leaks?: unknown[];
          buyerLeads?: unknown[];
          videoUrl?: string;
          posterUrl?: string;
          founderContact?: string;
        };
        const slug = (rep.slug || "").toLowerCase().replace(/[^a-z0-9-_]/g, "");
        if (!slug || !rep.productName || !rep.targetUrl) {
          return jsonResponse({ error: "Missing required report fields" }, 400);
        }
        await logAdminAudit(env, request, "ingest_report", slug);
        await env.DB.prepare(
          `INSERT INTO audits_assets (slug, product_name, target_url, domain, overall_score, leaks_count, leads_count, video_url, poster_url, report_json, scanned_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, datetime('now'))
           ON CONFLICT(slug) DO UPDATE SET
             overall_score = ?5, leaks_count = ?6, leads_count = ?7, video_url = ?8, poster_url = ?9, report_json = ?10, scanned_at = datetime('now')`
        )
          .bind(
            slug,
            rep.productName,
            rep.targetUrl,
            rep.domain || "",
            Number(rep.overallScore || 60),
            Array.isArray(rep.leaks) ? rep.leaks.length : 0,
            Array.isArray(rep.buyerLeads) ? rep.buyerLeads.length : 0,
            rep.videoUrl || "",
            rep.posterUrl || "",
            JSON.stringify(rep)
          )
          .run();
        return jsonResponse({ ok: true, slug, liveUrl: `/audit/live?s=${slug}` });
      } catch {
        return jsonResponse({ error: "Invalid ingest payload" }, 400);
      }
    }

    // 管理员回填客户真实目录外链收录结果接口（支持 HttpOnly Admin Cookie 或 x-admin-key）
    if (url.pathname === "/api/admin/directory-update" && request.method === "POST") {
      if (!(await isAdminAuthorized(request, env))) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      if (!env.DB) return jsonResponse({ error: "DB not bound" }, 500);
      try {
        const body = (await request.json()) as {
          customerEmail?: string;
          slug?: string;
          directoryId?: string;
          directoryName?: string;
          directoryUrl?: string;
          dr?: number;
          category?: string;
          status?: "queued" | "submitted" | "live";
          liveBacklinkUrl?: string;
          proofScreenshotUrl?: string;
          scheduledWave?: number;
        };
        const email = (body.customerEmail || "").trim().toLowerCase();
        const dirId = (body.directoryId || "").trim();
        if (!email || !dirId) return jsonResponse({ error: "Missing customerEmail or directoryId" }, 400);
        const st = ["queued", "submitted", "live"].includes(body.status || "")
          ? body.status
          : "submitted";
        await env.DB.prepare(
          `INSERT INTO directory_submissions (customer_email, slug, directory_id, directory_name, directory_url, dr, category, status, live_backlink_url, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'))
           ON CONFLICT(customer_email, directory_id) DO UPDATE SET
             status = ?8, live_backlink_url = ?9, updated_at = datetime('now')`
        )
          .bind(
            email,
            body.slug || "",
            dirId,
            body.directoryName || dirId,
            body.directoryUrl || "",
            Number(body.dr || 50),
            body.category || "SaaS Directory",
            st,
            body.liveBacklinkUrl || ""
          )
          .run();
        if (body.proofScreenshotUrl || body.scheduledWave) {
          const wave = [1, 2, 3].includes(Number(body.scheduledWave)) ? Number(body.scheduledWave) : 1;
          await env.DB.prepare(
            `INSERT INTO directory_health_checks (customer_email, campaign_id, directory_id, scheduled_wave, proof_screenshot_url, updated_at)
             VALUES (?1, 0, ?2, ?3, ?4, datetime('now'))
             ON CONFLICT(customer_email, campaign_id, directory_id) DO UPDATE SET
               scheduled_wave = ?3, proof_screenshot_url = COALESCE(NULLIF(?4, ''), proof_screenshot_url), updated_at = datetime('now')`
          )
            .bind(email, dirId, wave, (body.proofScreenshotUrl || "").trim().slice(0, 400))
            .run();
        }
        await logAdminAudit(env, request, "directory_update", `${body.slug || email}:${dirId}:${st}`);
        return jsonResponse({ ok: true, directoryId: dirId, status: st });
      } catch {
        return jsonResponse({ error: "Invalid directory update payload" }, 400);
      }
    }

    // 动态读取 D1 报告 JSON（供 /audit/live?s=<slug> 秒级渲染）
    if (url.pathname.startsWith("/api/audit/") && request.method === "GET") {
      if (!env.DB) return jsonResponse({ error: "DB not bound" }, 500);
      const slug = url.pathname.replace("/api/audit/", "").toLowerCase().replace(/[^a-z0-9-_]/g, "");
      if (!slug) return jsonResponse({ error: "Missing slug" }, 400);
      const row = await env.DB.prepare(`SELECT report_json FROM audits_assets WHERE slug = ?1 LIMIT 1`)
        .bind(slug)
        .first<{ report_json: string }>();
      if (!row) return jsonResponse({ error: "Report not found" }, 404);
      return new Response(row.report_json, {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8", ...SECURITY_HEADERS },
      });
    }

    // V4 公开战报洁净短路径（/report/:shareId -> 静态渲染 /report.html）
    if (/^\/report\/[a-zA-Z0-9-_]+$/.test(url.pathname) && request.method === "GET") {
      const rewritten = new Request(new URL("/report.html", url.origin).toString(), request);
      const rptResp = await env.ASSETS.fetch(rewritten);
      const rptHeaders = new Headers(rptResp.headers);
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
        if (!rptHeaders.has(k)) rptHeaders.set(k, v);
      }
      return new Response(rptResp.body, {
        status: rptResp.status,
        statusText: rptResp.statusText,
        headers: rptHeaders,
      });
    }

    const assetResp = await env.ASSETS.fetch(request);
    const headers = new Headers(assetResp.headers);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
      if (!headers.has(k)) headers.set(k, v);
    }
    return new Response(assetResp.body, {
      status: assetResp.status,
      statusText: assetResp.statusText,
      headers,
    });
  },

  /**
   * 每日 UTC 13:00 自动执行：
   * 1. 已收录外链 HTTP 200 & dofollow 自动验活巡检
   * 2. 为所有 $29/月 Radar Pro 活跃订阅客户抓取最新高意图买家线索并发送日报
   */
  async scheduled(_event: unknown, env: Env): Promise<void> {
    if (!env.DB) return;
    try {
      await runBacklinkHealthCheck(env, "", 20);
    } catch {
      // 单次验活失败不影响买家雷达发送
    }
    try {
      const subs = await env.DB.prepare(
        `SELECT customer_email, slug, target_url, magic_token FROM customers_orders WHERE plan = 'radar' AND status = 'active' LIMIT 50`
      ).all<{ customer_email: string; slug: string; target_url: string; magic_token: string }>();

      for (const sub of subs.results || []) {
        const keyword = (sub.slug || sub.target_url.replace(/^https?:\/\//, "").split(".")[0] || "").trim();
        if (!keyword) continue;
        try {
          const cutoffSec = Math.floor(Date.now() / 1000) - 48 * 3600;
          const hnRes = await fetch(
            `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(
              keyword
            )}&tags=comment&numericFilters=created_at_i>${cutoffSec}&hitsPerPage=6`
          );
          if (!hnRes.ok) continue;
          const hnData = (await hnRes.json()) as {
            hits?: Array<{
              objectID: string;
              story_title?: string;
              title?: string;
              comment_text?: string;
            }>;
          };
          const freshLines: string[] = [];
          for (const hit of hnData.hits || []) {
            const title = cleanEntities(hit.story_title || hit.title || "");
            if (!title || /^\[dead\]|^show hn:|who is hiring/i.test(title)) continue;
            const leadUrl = `https://news.ycombinator.com/item?id=${hit.objectID}`;
            const excerpt = cleanEntities(hit.comment_text || title).slice(0, 150);
            await env.DB.prepare(
              `INSERT OR IGNORE INTO radar_deliveries (customer_email, slug, lead_id, source, community, title, excerpt, url, lead_status)
               VALUES (?1, ?2, ?3, 'Hacker News', 'HN Daily Radar', ?4, ?5, ?6, 'new')`
            )
              .bind(sub.customer_email, sub.slug, `hn-${hit.objectID}`, title.slice(0, 120), excerpt, leadUrl)
              .run();
            freshLines.push(`• ${title}\n  ${leadUrl}`);
          }
          if (freshLines.length > 0) {
            await sendResendEmail(env, {
              to: sub.customer_email,
              subject: `LaunchPulse Daily Radar: ${freshLines.length} fresh buyer threads for ${keyword}`,
              text: [
                `Here are today's latest developer discussions matching ${keyword}:`,
                "",
                ...freshLines,
                "",
                `Open your portal: https://pulse.statementflow.win/portal?token=${sub.magic_token}`,
              ].join("\n"),
            });
          }
        } catch {
          // 单客户异常不影响其余订阅客户
        }
      }
    } catch {
      // ignore
    }
  },
};
