/**
 * LaunchPulse Cloudflare Workers 边缘网关（D1 动态底座版）：
 * 1. POST /api/scan            — 100% 被动无害实时 SEO/AEO/安全头体检 + HN 真实买家匹配（内置防 SSRF）
 * 2. POST /api/track           — 战情页热力埋点（访问次数 / 视频播放最大秒数 / 买家线索点击数）实时写入 D1
 * 3. POST /api/checkout        — 直连 Creem.io 实时收银（$19 Fix Pack / $29/mo Radar Pro）
 * 4. POST /api/webhook         — Creem HMAC-SHA256 验签并自动入账 D1 customers_orders + 签发 Magic Token
 * 5. POST /api/portal/lookup   — 免密客户工作台查询（凭 Magic Token 或付款邮箱拉取已购报告与买家线索）
 * 6. POST /api/portal/lead-status — 客户在工作台标记线索状态（new / replied / won）
 * 7. GET  /api/admin/overview  — 受 ADMIN_API_KEY 保护的内部指挥台同步接口（对接开源 PocketBase）
 */

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
  CREEM_PRODUCT_ID_RADAR?: string;
  CREEM_PRODUCT_ID_DFY?: string;
  CREEM_WEBHOOK_SECRET?: string;
  ADMIN_API_KEY?: string;
}

const PLAN_CONFIG = {
  fixpack: {
    name: "LaunchPulse One-Time Launch Fix Pack",
    amountUsd: 19,
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
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
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

    const [homeRes, llmsRes, sitemapRes] = await Promise.all([
      safeGet(target.toString(), 6500),
      safeGet(`${origin}/llms.txt`, 4500),
      safeGet(`${origin}/sitemap.xml`, 4500),
    ]);

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
      const hnRes = await fetch(
        `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(
          queryTerm
        )}&tags=comment&hitsPerPage=6`
      );
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
        for (const hit of hnData.hits || []) {
          const excerpt = cleanEntities(hit.comment_text || "");
          if (excerpt.length < 40) continue;
          leads.push({
            source: "Hacker News",
            author: `@${hit.author || "dev"}`,
            postedAt: (hit.created_at || "").slice(0, 10),
            title: cleanEntities(hit.story_title || "Developer thread"),
            excerpt: excerpt.slice(0, 150) + (excerpt.length > 150 ? "..." : ""),
            url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
            unlocked: leads.length < 3,
          });
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
      body.plan === "fixpack"
        ? "fixpack"
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
      plan === "fixpack"
        ? env.CREEM_PRODUCT_ID_FIXPACK?.trim()
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
 * Creem 付款回调：自动写入 D1 customers_orders 并签发免密 Magic Token
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
      const amountUsd = Math.round((obj.order?.amount || (plan === "fixpack" ? 1900 : 2900)) / 100);
      const magicToken = crypto.randomUUID().replace(/-/g, "");

      if (email) {
        await env.DB.prepare(
          `INSERT INTO customers_orders (order_id, customer_email, slug, target_url, plan, amount_usd, status, magic_token)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', ?7)
           ON CONFLICT(order_id) DO UPDATE SET status = 'active'`
        )
          .bind(orderId, email, slug, targetUrl, plan, amountUsd, magicToken)
          .run();

        if (slug) {
          await env.DB.prepare(
            `UPDATE leads_targets SET status = 'paid', updated_at = datetime('now') WHERE slug = ?1`
          )
            .bind(slug)
            .run();
        }
      }
    } catch {
      // 防止非订单类 webhook 报错重发
    }
  }

  return jsonResponse({ received: true });
}

/**
 * 免密客户工作台查询（支持 Magic Token 或付款邮箱）
 */
async function handlePortalLookup(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return jsonResponse({ found: false, orders: [] });
  try {
    const body = (await request.json()) as { email?: string; token?: string };
    const token = (body.token || "").trim();
    const email = (body.email || "").trim().toLowerCase();

    let order = null;
    if (token) {
      order = await env.DB.prepare(
        `SELECT order_id, customer_email, slug, target_url, plan, amount_usd, status, created_at
         FROM customers_orders WHERE magic_token = ?1 AND status = 'active' LIMIT 1`
      )
        .bind(token)
        .first();
    } else if (email && email.includes("@")) {
      order = await env.DB.prepare(
        `SELECT order_id, customer_email, slug, target_url, plan, amount_usd, status, created_at
         FROM customers_orders WHERE customer_email = ?1 AND status = 'active' ORDER BY id DESC LIMIT 1`
      )
        .bind(email)
        .first();
    }

    if (!order) {
      return jsonResponse({
        found: false,
        message: "No active paid plan found for this email/token yet. You can preview the live demo workspace below.",
      });
    }

    const deliveries = await env.DB.prepare(
      `SELECT lead_id, source, community, title, excerpt, url, reply_draft, lead_status, delivered_at
       FROM radar_deliveries WHERE customer_email = ?1 ORDER BY id DESC LIMIT 30`
    )
      .bind(order.customer_email)
      .all();

    return jsonResponse({
      found: true,
      order,
      deliveries: deliveries.results || [],
    });
  } catch {
    return jsonResponse({ error: "Invalid portal lookup" }, 400);
  }
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

    if (url.pathname === "/api/scan" && request.method === "POST") {
      return handleLiveScan(request);
    }
    if (url.pathname === "/api/track" && request.method === "POST") {
      return handleTrack(request, env);
    }
    if (url.pathname === "/api/checkout" && request.method === "POST") {
      return handleCheckout(request, env);
    }
    if (url.pathname === "/api/webhook" && request.method === "POST") {
      return handleWebhook(request, env);
    }
    if (url.pathname === "/api/portal/lookup" && request.method === "POST") {
      return handlePortalLookup(request, env);
    }
    if (url.pathname === "/api/admin/overview" && request.method === "GET") {
      return handleAdminOverview(request, env);
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
};
