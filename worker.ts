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
        )}&tags=comment&numericFilters=created_at_i>${since45d}&hitsPerPage=15`
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
          const st = cleanEntities(hit.story_title || "");
          if (/^show hn:/i.test(st) || /^\[dead\]/i.test(st) || /who is hiring|who wants to be hired/i.test(st)) {
            continue;
          }
          const excerpt = cleanEntities(hit.comment_text || "");
          if (excerpt.length < 40) continue;
          leads.push({
            source: "Hacker News",
            author: `@${hit.author || "dev"}`,
            postedAt: (hit.created_at || "").slice(0, 10),
            title: st || "Developer thread",
            excerpt: excerpt.slice(0, 150) + (excerpt.length > 150 ? "..." : ""),
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
      if (!checkRateLimit(request, 20)) return jsonResponse({ error: "Rate limit exceeded. Try again in 60s." }, 429);
      return handleLiveScan(request);
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

    // 管理员回填客户真实目录外链收录结果接口（受 ADMIN_API_KEY 保护）
    if (url.pathname === "/api/admin/directory-update" && request.method === "POST") {
      const adminKey = env.ADMIN_API_KEY?.trim();
      const provided = request.headers.get("x-admin-key") || "";
      if (!adminKey || !provided || !timingSafeEqualHex(provided, adminKey)) {
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
   * 每日 UTC 13:00 自动为所有 $29/月 Radar Pro 活跃订阅客户抓取最新高意图买家线索并发送日报
   */
  async scheduled(_event: unknown, env: Env): Promise<void> {
    if (!env.DB) return;
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
