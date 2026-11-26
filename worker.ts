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
  handleAutofillBrandKit,
  handleDeepLiveScan,
  handleGenerateRadarReply,
  handleGetPublicReport,
  handleRunRadarScan,
  handleSaveBrandKit,
  handleSaveDirectoryPref,
  handleSaveRadarMonitor,
  handleSelfSubmitDirectory,
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
  STATEMENTFLOW_SVC?: {
    fetch: (request: Request) => Promise<Response>;
  };
  HARDCALL_SVC?: {
    fetch: (request: Request) => Promise<Response>;
  };
  DB?: D1Database;
  AI?: {
    run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
  };
  CREEM_API_KEY?: string;
  CREEM_PRODUCT_ID_FIXPACK?: string;
  CREEM_PRODUCT_ID_BLITZ?: string;
  CREEM_PRODUCT_ID_RADAR?: string;
  CREEM_PRODUCT_ID_DFY?: string;
  CREEM_WEBHOOK_SECRET?: string;
  ADMIN_API_KEY?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  LLM_API_KEY?: string;
  LLM_BASE_URL?: string;
  LLM_MODEL?: string;
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
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Content-Security-Policy": "frame-ancestors 'self'",
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
      customerEmail?: string;
    };
    const plan: keyof typeof PLAN_CONFIG =
      body.plan === "blitz" || body.plan === "fixpack"
        ? "blitz"
        : body.plan === "dfy"
        ? "dfy"
        : "radar";
    const meta = PLAN_CONFIG[plan];
    const origin = request.headers.get("origin") || new URL(request.url).origin;
    const sessionUser = await getSessionUser(request, env);
    const resolvedEmail = (body.email || body.customerEmail || sessionUser?.email || "").trim().toLowerCase();
    const returnPath = sessionUser
      ? `/dashboard?unlocked=1&plan=${plan}`
      : body.slug
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
      if (resolvedEmail) {
        creemPayload.customer = { email: resolvedEmail };
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
  params: { to: string; subject: string; text: string; fromLabel?: string }
): Promise<boolean> {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey || !params.to) return false;
  const label = params.fromLabel || "LaunchPulse";
  const rawFrom = env.RESEND_FROM_EMAIL?.trim() || `${label} <hello@mail.statementflow.win>`;
  // 确保发信子域对齐 Resend 已完成 DKIM 认证的 mail.statementflow.win，并允许按子品牌替换发件人名称
  const normalizedAddr = rawFrom.replace(/@statementflow\.win\b/i, "@mail.statementflow.win");
  const from = params.fromLabel
    ? `${params.fromLabel} <hello@mail.statementflow.win>`
    : normalizedAddr;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        reply_to: "hello@statementflow.win",
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
 * 三系统共享 D1 邮件发信队列（email_outbox）：
 * 让同库绑定的 StatementFlow AI 与 HardCall 无需重复维护 RESEND_API_KEY，
 * 写入 email_outbox 后触发 /api/internal/flush-outbox 秒级发出，并由每日 Cron 兜底重试。
 */
async function ensureEmailOutboxTable(env: Env): Promise<void> {
  if (!env.DB) return;
  try {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS email_outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_label TEXT NOT NULL DEFAULT 'StatementFlow',
        to_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        body_text TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        sent_at TEXT NOT NULL DEFAULT ''
      )`
    ).run();
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS dfy_fulfillment_jobs (
        order_id TEXT PRIMARY KEY,
        customer_email TEXT NOT NULL,
        target_url TEXT NOT NULL DEFAULT '',
        slug TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'queued_wave1',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    ).run();
  } catch {
    // ignore
  }
}

async function flushSharedEmailOutbox(env: Env, limit = 15): Promise<number> {
  if (!env.DB || !env.RESEND_API_KEY?.trim()) return 0;
  await ensureEmailOutboxTable(env);
  const pending = await env.DB.prepare(
    `SELECT id, from_label, to_email, subject, body_text, attempts
     FROM email_outbox WHERE status = 'pending' AND attempts < 3 ORDER BY id ASC LIMIT ?1`
  )
    .bind(limit)
    .all<{
      id: number;
      from_label: string;
      to_email: string;
      subject: string;
      body_text: string;
      attempts: number;
    }>();

  let sentCount = 0;
  for (const row of pending.results || []) {
    const ok = await sendResendEmail(env, {
      to: row.to_email,
      subject: row.subject,
      text: row.body_text,
      fromLabel: row.from_label || "StatementFlow",
    });
    if (ok) {
      sentCount += 1;
      await env.DB.prepare(
        `UPDATE email_outbox SET status = 'sent', attempts = attempts + 1, sent_at = datetime('now') WHERE id = ?1`
      )
        .bind(row.id)
        .run();
    } else {
      await env.DB.prepare(
        `UPDATE email_outbox SET attempts = attempts + 1, status = CASE WHEN attempts + 1 >= 3 THEN 'failed' ELSE 'pending' END WHERE id = ?1`
      )
        .bind(row.id)
        .run();
    }
  }
  return sentCount;
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
              `• Customer Portal (100+ Directory Tracker, Bonus /llms.txt, Re-Scan & Buyer Feed): ${portalLink}`,
              slug ? `• Unlocked War-Room Report: ${warRoomLink}` : "",
              plan === "dfy"
                ? "• Done-For-You Sprint Auto-Queued: Please verify your Brand Launch Kit in the console; Wave 1 (Top 30 high-DR directories) starts within 24 hours."
                : "",
              "",
              "Need anything? Simply reply to this email (hello@statementflow.win).",
              "",
              "— LaunchPulse Team",
            ]
              .filter(Boolean)
              .join("\n"),
          });

          // 若为 $299 DFY 旗舰代投单，自动入队 dfy_fulfillment_jobs，供自动化投递流水线拉取履约
          if (plan === "dfy") {
            await ensureEmailOutboxTable(env);
            await env.DB.prepare(
              `INSERT INTO dfy_fulfillment_jobs (order_id, customer_email, target_url, slug, status, updated_at)
               VALUES (?1, ?2, ?3, ?4, 'queued_wave1', datetime('now'))
               ON CONFLICT(order_id) DO UPDATE SET updated_at = datetime('now')`
            )
              .bind(orderId, email, targetUrl, slug)
              .run();
          }

          // 实时向创始人主邮箱发送新订单入账与履约提醒（自动经 Cloudflare Email Routing 投递至 Gmail）
          await sendResendEmail(env, {
            to: "hello@statementflow.win",
            subject: `💰 [LaunchPulse Paid] $${amountUsd} (${plan.toUpperCase()}) from ${email}`,
            text: [
              `New Paid Order on LaunchPulse!`,
              `- Order ID: ${orderId}`,
              `- Customer: ${email}`,
              `- Plan: ${planDisplayName} ($${amountUsd})`,
              `- Target URL: ${targetUrl || slug || "N/A"}`,
              `- Auto-Unlock Status: Active & Magic Link Sent`,
              plan === "dfy" ? `- Action: Added to /api/admin/dfy-queue for Wave 1 fulfillment.` : `- Action: 100% Self-Serve Automated (Zero manual action required).`,
            ].join("\n"),
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
      campaignId?: number;
      productName?: string;
      targetUrl?: string;
      tagline?: string;
      competitors?: string;
      status?: "active" | "paused";
    };
    const target = parseSafePublicHttpsUrl(body.targetUrl || "");
    if (!target) {
      return jsonResponse({ error: "Please enter a valid public HTTPS website URL." }, 400);
    }
    const productName = (body.productName || "").trim().slice(0, 80) || target.hostname.replace(/^www\./, "");
    const tagline = (body.tagline || "").trim().slice(0, 200);
    const competitors = (body.competitors || "").trim().slice(0, 160);
    const status = body.status === "paused" ? "paused" : "active";

    // 若携带 campaignId，则直接按 ID 更新已有项目（支持编辑名称、网址、简介、竞品与状态）
    const editId = Number(body.campaignId || 0);
    if (editId > 0) {
      const own = await env.DB.prepare(`SELECT id, slug FROM campaigns WHERE id = ?1 AND user_email = ?2 LIMIT 1`)
        .bind(editId, user.email)
        .first<{ id: number; slug: string }>();
      if (!own) return jsonResponse({ error: "Campaign not found" }, 404);
      await env.DB.prepare(
        `UPDATE campaigns
         SET product_name = ?1, target_url = ?2, tagline = ?3, competitors = ?4, status = ?5, updated_at = datetime('now')
         WHERE id = ?6 AND user_email = ?7`
      )
        .bind(productName, target.origin, tagline, competitors, status, editId, user.email)
        .run();
      return jsonResponse({
        ok: true,
        campaign: { id: editId, slug: own.slug, product_name: productName, target_url: target.origin, tagline, competitors, status },
      });
    }

    // 使用完整规范化域名生成 slug，彻底避免 app.foo.com 与 app.bar.com 冲突静默覆盖
    const slug = target.hostname
      .replace(/^www\./, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);

    await env.DB.prepare(
      `INSERT INTO campaigns (user_email, slug, product_name, target_url, tagline, competitors, status, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))
       ON CONFLICT(user_email, slug) DO UPDATE SET
         product_name = ?3, target_url = ?4, tagline = ?5, competitors = ?6, status = ?7, updated_at = datetime('now')`
    )
      .bind(user.email, slug, productName, target.origin, tagline, competitors, status)
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
          { channel: "directory", label: "100+ Directory Distribution" },
          { channel: "community", label: "HN / Reddit Buyer Replies" },
          { channel: "seo", label: "Competitor /vs/ & /llms.txt" },
        ];
        for (const d of defaults) {
          const code = randomShortCode(`${slug.replace(/-/g, "").slice(0, 4)}${d.channel[0]}`);
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

async function handleDashboardDeleteCampaign(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return jsonResponse({ error: "DB not bound" }, 500);
  const user = await getSessionUser(request, env);
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  try {
    const body = (await request.json()) as { campaignId?: number };
    const campaignId = Number(body.campaignId || 0);
    if (!campaignId) return jsonResponse({ error: "Missing campaignId" }, 400);

    const own = await env.DB.prepare(`SELECT id FROM campaigns WHERE id = ?1 AND user_email = ?2 LIMIT 1`)
      .bind(campaignId, user.email)
      .first();
    if (!own) return jsonResponse({ error: "Campaign not found" }, 404);

    await Promise.all([
      env.DB.prepare(`DELETE FROM brand_kits WHERE campaign_id = ?1 AND user_email = ?2`).bind(campaignId, user.email).run(),
      env.DB.prepare(`DELETE FROM radar_monitors WHERE campaign_id = ?1 AND user_email = ?2`).bind(campaignId, user.email).run(),
      env.DB.prepare(`DELETE FROM radar_leads WHERE campaign_id = ?1 AND user_email = ?2`).bind(campaignId, user.email).run(),
      env.DB.prepare(`DELETE FROM tracking_links WHERE campaign_id = ?1 AND user_email = ?2`).bind(campaignId, user.email).run(),
      env.DB.prepare(`DELETE FROM public_reports WHERE campaign_id = ?1 AND user_email = ?2`).bind(campaignId, user.email).run(),
      env.DB.prepare(`DELETE FROM directory_health_checks WHERE campaign_id = ?1 AND customer_email = ?2`).bind(campaignId, user.email).run(),
      env.DB.prepare(`DELETE FROM campaigns WHERE id = ?1 AND user_email = ?2`).bind(campaignId, user.email).run(),
    ]);

    return jsonResponse({ ok: true, deletedId: campaignId });
  } catch {
    return jsonResponse({ error: "Unable to delete campaign." }, 400);
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
    const campaignId = Number(body.campaignId || 0);
    let rawDest = (body.destinationUrl || "").trim();
    if (!rawDest && campaignId > 0) {
      const camp = await env.DB.prepare(`SELECT target_url FROM campaigns WHERE id = ?1 AND user_email = ?2 LIMIT 1`)
        .bind(campaignId, user.email)
        .first<{ target_url: string }>();
      rawDest = camp?.target_url || "";
    }
    const target = parseSafePublicHttpsUrl(rawDest);
    if (!target) return jsonResponse({ error: "Please provide a valid public HTTPS destination URL." }, 400);
    const channel = ["directory", "community", "seo", "social", "custom"].includes(body.channel || "")
      ? body.channel!
      : "custom";
    const label = (body.label || "Custom Campaign Link").trim().slice(0, 80);
    const code = randomShortCode(channel.slice(0, 3));
    await env.DB.prepare(
      `INSERT INTO tracking_links (code, campaign_id, user_email, channel, label, destination_url)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    )
      .bind(code, campaignId, user.email, channel, label, target.toString())
      .run();
    return jsonResponse({ ok: true, code, destinationUrl: target.toString() });
  } catch {
    return jsonResponse({ error: "Unable to create link." }, 400);
  }
}

async function handleDashboardDeleteLink(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return jsonResponse({ error: "DB not bound" }, 500);
  const user = await getSessionUser(request, env);
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
  try {
    const body = (await request.json()) as { code?: string };
    const code = String(body.code || "").trim().slice(0, 32);
    if (!code) return jsonResponse({ error: "Missing link code" }, 400);
    await env.DB.prepare(`DELETE FROM tracking_links WHERE code = ?1 AND user_email = ?2`).bind(code, user.email).run();
    return jsonResponse({ ok: true, code });
  } catch {
    return jsonResponse({ error: "Unable to delete link." }, 400);
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
 * Creem 支付回跳直通核验（/api/checkout/claim）：
 * 凭回跳 URL 中的 checkout_id 直接向 Creem API 服务端验真，幂等入账 D1 并下发 HttpOnly 登录会话，
 * 彻底消除「Webhook 延迟」或「Resend 邮件未送达」导致付费客户无法进入工作台的单点故障。
 */
async function handleCheckoutClaim(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return jsonResponse({ error: "DB not bound" }, 500);
  const creemApiKey = env.CREEM_API_KEY?.trim();
  if (!creemApiKey) return jsonResponse({ error: "Checkout verification unavailable" }, 503);

  try {
    const body = (await request.json()) as { checkoutId?: string };
    const checkoutId = (body.checkoutId || "").trim();
    if (!checkoutId || checkoutId.length < 4 || checkoutId.length > 96) {
      return jsonResponse({ ok: false, error: "Invalid checkout_id" }, 400);
    }

    const res = await fetch(
      `https://api.creem.io/v1/checkouts?checkout_id=${encodeURIComponent(checkoutId)}`,
      { headers: { "x-api-key": creemApiKey } }
    );
    if (!res.ok) {
      return jsonResponse({ ok: false, unlocked: false, error: "Checkout session not verified" }, 402);
    }

    const data = (await res.json()) as {
      id?: string;
      status?: string;
      customer?: { email?: string };
      order?: { id?: string; amount?: number };
      metadata?: { plan?: string; slug?: string; targetUrl?: string };
    };

    if (data.status !== "completed") {
      return jsonResponse({ ok: false, unlocked: false, status: data.status || "pending" }, 402);
    }

    const sessionUser = await getSessionUser(request, env);
    const email = (data.customer?.email || sessionUser?.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return jsonResponse({ ok: false, error: "Customer email missing on checkout" }, 400);
    }

    const rawPlan = (data.metadata?.plan || "blitz").toLowerCase();
    const plan = rawPlan === "dfy" ? "dfy" : rawPlan === "radar" ? "radar" : "blitz";
    const slug = (data.metadata?.slug || "").trim();
    const targetUrl = (data.metadata?.targetUrl || "").trim();
    const orderId = data.order?.id || data.id || checkoutId;
    const fallbackCents = plan === "dfy" ? 29900 : plan === "blitz" ? 3900 : 2900;
    const amountUsd = Math.round((data.order?.amount || fallbackCents) / 100);

    const existingOrder = await env.DB.prepare(
      `SELECT magic_token FROM customers_orders WHERE order_id = ?1 LIMIT 1`
    )
      .bind(orderId)
      .first<{ magic_token: string }>();

    const magicToken = existingOrder?.magic_token || crypto.randomUUID().replace(/-/g, "");
    const tokenExpiry = new Date(Date.now() + 30 * 86400 * 1000).toISOString();

    await env.DB.prepare(
      `INSERT INTO customers_orders (order_id, customer_email, slug, target_url, plan, amount_usd, status, magic_token, token_expires_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', ?7, ?8)
       ON CONFLICT(order_id) DO UPDATE SET status = 'active', token_expires_at = ?8`
    )
      .bind(orderId, email, slug === "public" ? "" : slug, targetUrl, plan, amountUsd, magicToken, tokenExpiry)
      .run();

    if (plan === "dfy") {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO dfy_fulfillment_jobs (order_id, customer_email, target_url, slug, status)
         VALUES (?1, ?2, ?3, ?4, 'queued')`
      )
        .bind(orderId, email, targetUrl, slug === "public" ? "" : slug)
        .run();
    }

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
    if (!user) return jsonResponse({ ok: false, error: "Account provisioning failed" }, 500);

    const sessionToken = bytesToHex(crypto.getRandomValues(new Uint8Array(24)));
    const sessionExpiry = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
    await env.DB.prepare(
      `INSERT INTO sessions (token, user_id, email, expires_at) VALUES (?1, ?2, ?3, ?4)`
    )
      .bind(sessionToken, user.id, user.email, sessionExpiry)
      .run();

    return new Response(
      JSON.stringify({
        ok: true,
        unlocked: true,
        plan,
        amountUsd,
        magicToken,
        user,
        redirectTo: "/dashboard?unlocked=1",
      }),
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
    return jsonResponse({ ok: false, error: "Invalid checkout claim payload" }, 400);
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
  await logAdminAudit(env, request, "admin_dashboard_read");

  const [
    usersRes,
    campaignsRes,
    ordersRes,
    linksRes,
    dirsRes,
    outreachRes,
    brandKitsRes,
    dirHealthRes,
    auditLogsRes,
    countsUsers,
    countsCampaigns,
    countsOrders,
    leadCountsRes,
  ] = await Promise.all([
    env.DB.prepare(`SELECT id, email, name, role, created_at FROM users ORDER BY id DESC LIMIT 200`).all(),
    env.DB.prepare(`SELECT * FROM campaigns ORDER BY updated_at DESC LIMIT 200`).all(),
    env.DB.prepare(`SELECT * FROM customers_orders ORDER BY created_at DESC LIMIT 200`).all<{
      order_id: string;
      customer_email: string;
      slug: string;
      plan: string;
      amount_usd: number;
      status: string;
      created_at: string;
    }>(),
    env.DB.prepare(`SELECT * FROM tracking_links ORDER BY clicks_count DESC LIMIT 200`).all<{
      clicks_count: number;
      conversions_count: number;
    }>(),
    env.DB.prepare(`SELECT * FROM directory_submissions ORDER BY updated_at DESC LIMIT 600`).all(),
    env.DB.prepare(`SELECT * FROM outreach_logs ORDER BY last_event_at DESC, id DESC LIMIT 100`).all(),
    env.DB.prepare(`SELECT * FROM brand_kits ORDER BY updated_at DESC LIMIT 200`).all(),
    env.DB.prepare(`SELECT * FROM directory_health_checks ORDER BY updated_at DESC LIMIT 600`).all(),
    env.DB.prepare(`SELECT id, action, target_slug, ip, created_at FROM admin_audit_logs ORDER BY id DESC LIMIT 30`).all(),
    env.DB.prepare(`SELECT COUNT(*) as cnt FROM users`).first<{ cnt: number }>(),
    env.DB.prepare(`SELECT COUNT(*) as cnt FROM campaigns`).first<{ cnt: number }>(),
    env.DB.prepare(`SELECT COUNT(*) as cnt FROM customers_orders`).first<{ cnt: number }>(),
    env.DB.prepare(`SELECT campaign_id, COUNT(*) as cnt FROM radar_leads WHERE status != 'dismissed' GROUP BY campaign_id`).all<{
      campaign_id: number;
      cnt: number;
    }>(),
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
      totalUsers: Number(countsUsers?.cnt ?? (usersRes.results || []).length),
      totalCampaigns: Number(countsCampaigns?.cnt ?? (campaignsRes.results || []).length),
      totalOrders: Number(countsOrders?.cnt ?? orders.length),
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
    auditLogs: auditLogsRes.results || [],
    leadCounts: leadCountsRes.results || [],
  });
}

/**
 * 管理员手工开通 / 变更 / 撤销客户套餐（线下打款、DFY 托管或客服补单）
 */
async function handleAdminGrantPlan(request: Request, env: Env): Promise<Response> {
  if (!(await isAdminAuthorized(request, env))) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  if (!env.DB) return jsonResponse({ error: "DB not bound" }, 500);
  try {
    const body = (await request.json()) as {
      orderId?: string;
      customerEmail?: string;
      plan?: "blitz" | "radar" | "dfy" | "fixpack";
      amountUsd?: number;
      status?: "active" | "canceled" | "refunded";
      slug?: string;
    };
    const status = ["active", "canceled", "refunded"].includes(body.status || "") ? String(body.status) : "active";

    // 若传了既有 orderId，直接更新该订单状态
    if (body.orderId && !body.customerEmail) {
      const oid = body.orderId.trim().slice(0, 80);
      await env.DB.prepare(`UPDATE customers_orders SET status = ?1 WHERE order_id = ?2`).bind(status, oid).run();
      await logAdminAudit(env, request, "order_status_update", `${oid}:${status}`);
      return jsonResponse({ ok: true, orderId: oid, status });
    }

    const email = (body.customerEmail || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return jsonResponse({ error: "Please enter a valid customer email." }, 400);
    }
    const plan = ["blitz", "radar", "dfy", "fixpack"].includes(body.plan || "") ? String(body.plan) : "blitz";
    const defaultAmt = plan === "dfy" ? 299 : plan === "radar" ? 29 : 39;
    const amountUsd = Number.isFinite(Number(body.amountUsd)) && Number(body.amountUsd) >= 0 ? Number(body.amountUsd) : defaultAmt;
    const orderId = (body.orderId || "").trim().slice(0, 64) || `ord_ops_${Date.now().toString(36)}`;
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const magicToken = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

    await env.DB.prepare(
      `INSERT INTO customers_orders (order_id, customer_email, slug, target_url, plan, amount_usd, status, magic_token, created_at)
       VALUES (?1, ?2, ?3, '', ?4, ?5, ?6, ?7, datetime('now'))
       ON CONFLICT(order_id) DO UPDATE SET plan = ?4, amount_usd = ?5, status = ?6`
    )
      .bind(orderId, email, (body.slug || "").trim().slice(0, 60), plan, amountUsd, status, magicToken)
      .run();

    await logAdminAudit(env, request, "grant_plan", `${email}:${plan}:${status}`);
    return jsonResponse({ ok: true, orderId, email, plan, amountUsd, status });
  } catch {
    return jsonResponse({ error: "Invalid plan grant payload." }, 400);
  }
}

/**
 * 管理员向客户一键发送目录履约进展邮件（通过已接入的 Resend 服务）
 */
async function handleAdminNotifyCustomer(request: Request, env: Env): Promise<Response> {
  if (!(await isAdminAuthorized(request, env))) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  if (!env.DB) return jsonResponse({ error: "DB not bound" }, 500);
  try {
    const body = (await request.json()) as {
      customerEmail?: string;
      productName?: string;
      liveCount?: number;
      submittedCount?: number;
      note?: string;
    };
    const email = (body.customerEmail || "").trim().toLowerCase();
    if (!email || !email.includes("@")) return jsonResponse({ error: "Missing valid customerEmail" }, 400);

    const origin = new URL(request.url).origin;
    const prod = (body.productName || "your SaaS").trim().slice(0, 80);
    const live = Number(body.liveCount || 0);
    const sub = Number(body.submittedCount || 0);
    const sent = await sendResendEmail(env, {
      to: email,
      subject: `LaunchPulse Progress Update for ${prod}: ${live} Live Backlinks Verified`,
      text: [
        `Hi there,`,
        ``,
        `Here is your latest LaunchPulse distribution update for ${prod}:`,
        `- Verified Live Backlinks: ${live}`,
        `- Submitted & Under Review: ${sub}`,
        body.note ? `- Operations Note: ${body.note.trim().slice(0, 300)}` : "",
        ``,
        `Inspect every live backlink URL, HTTP status, and attribution link in your console:`,
        `${origin}/dashboard`,
        ``,
        `— LaunchPulse Operations`,
      ]
        .filter((line) => line !== "")
        .join("\n"),
    });
    await logAdminAudit(env, request, "notify_customer", `${email}:${sent ? "sent" : "no_resend_key"}`);
    if (!sent) {
      return jsonResponse(
        { ok: false, error: "Resend API key is not configured or rejected the delivery. Audit logged." },
        503
      );
    }
    return jsonResponse({ ok: true, sent: true });
  } catch {
    return jsonResponse({ error: "Failed to send customer update." }, 400);
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

    if (url.pathname === "/api/health" && request.method === "GET") {
      return jsonResponse({ ok: true, service: "launchpulse" });
    }

    // 内部共享发信队列刷新端点（仅消费 D1 已入库的 email_outbox 待发记录，外部无法伪造收件人与正文）
    if (url.pathname === "/api/internal/flush-outbox" && request.method === "POST") {
      if (!checkRateLimit(request, 30)) return jsonResponse({ ok: false }, 429);
      const sent = await flushSharedEmailOutbox(env, 10);
      return jsonResponse({ ok: true, sent });
    }

    // DFY 自动化代投队列拉取接口（受 ADMIN_API_KEY 保护，供 opencli 投递流水线自动消费）
    if (url.pathname === "/api/admin/dfy-queue" && request.method === "GET") {
      if (!(await isAdminAuthorized(request, env))) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      if (!env.DB) return jsonResponse({ jobs: [] });
      await ensureEmailOutboxTable(env);
      const jobs = await env.DB.prepare(
        `SELECT j.*, b.logo_url, b.short_tagline, b.medium_pitch, b.long_description, b.categories_json
         FROM dfy_fulfillment_jobs j
         LEFT JOIN campaigns c ON c.user_email = j.customer_email
         LEFT JOIN brand_kits b ON b.campaign_id = c.id
         ORDER BY j.created_at DESC LIMIT 50`
      ).all();
      return jsonResponse({ ok: true, jobs: jobs.results || [] });
    }

    if ((url.pathname === "/directories" || url.pathname === "/directories/") && request.method === "GET") {
      return Response.redirect(`${url.origin}/tools/directory-finder`, 302);
    }

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
    if (url.pathname === "/api/dashboard/campaign" && request.method === "DELETE") {
      return handleDashboardDeleteCampaign(request, env);
    }
    if (url.pathname === "/api/dashboard/links" && request.method === "POST") {
      return handleDashboardCreateLink(request, env);
    }
    if (url.pathname === "/api/dashboard/links" && request.method === "DELETE") {
      return handleDashboardDeleteLink(request, env);
    }
    if (url.pathname === "/api/dashboard/directory-submit" && request.method === "POST") {
      const user = await getSessionUser(request, env);
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
      return handleSelfSubmitDirectory(request, env, user);
    }
    if (url.pathname === "/api/dashboard/brand-kit" && request.method === "POST") {
      const user = await getSessionUser(request, env);
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
      return handleSaveBrandKit(request, env, user);
    }
    if (url.pathname === "/api/dashboard/brand-kit/autofill" && request.method === "POST") {
      if (!checkRateLimit(request, 15)) return jsonResponse({ error: "Too many autofill requests. Wait 60s." }, 429);
      const user = await getSessionUser(request, env);
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
      return handleAutofillBrandKit(request, env);
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
    if (url.pathname === "/api/dashboard/radar/generate-reply" && request.method === "POST") {
      if (!checkRateLimit(request, 20)) return jsonResponse({ error: "Too many AI reply requests. Wait 60s." }, 429);
      const user = await getSessionUser(request, env);
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
      return handleGenerateRadarReply(request, env, user);
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

    // V4 管理员一键触发外链 HTTP/dofollow 验活巡检（支持单项目与全站模式）
    if (url.pathname === "/api/admin/verify-backlinks" && request.method === "POST") {
      if (!(await isAdminAuthorized(request, env))) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      const body = (await request.json().catch(() => ({}))) as { scope?: "all" | "customer"; customerEmail?: string };
      const targetEmail = body.scope === "all" ? "" : (body.customerEmail || "").trim();
      const summary = await runBacklinkHealthCheck(env, targetEmail, 25);
      await logAdminAudit(env, request, "verify_backlinks", targetEmail || "all");
      return jsonResponse({ ok: true, scope: targetEmail ? "customer" : "all", ...summary });
    }

    // 管理员手工开通/变更客户套餐
    if (url.pathname === "/api/admin/grant-plan" && request.method === "POST") {
      return handleAdminGrantPlan(request, env);
    }

    // 管理员发送客户目录履约进展邮件
    if (url.pathname === "/api/admin/notify-customer" && request.method === "POST") {
      return handleAdminNotifyCustomer(request, env);
    }

    // V2 在线可视化管理台聚合接口（审计日志已移入鉴权通过后）
    if (url.pathname === "/api/admin/dashboard" && request.method === "GET") {
      return handleAdminDashboard(request, env);
    }

    if (url.pathname === "/api/scan" && request.method === "POST") {
      if (!checkRateLimit(request, 20)) return jsonResponse({ error: "Rate limit exceeded. Try again in 60s." }, 429);
      return handleDeepLiveScan(request, env);
    }
    if (url.pathname === "/api/track" && request.method === "POST") {
      if (!checkRateLimit(request, 60)) return jsonResponse({ ok: true, throttled: true }, 429);
      return handleTrack(request, env);
    }
    if (url.pathname === "/api/checkout" && request.method === "POST") {
      if (!checkRateLimit(request, 15)) return jsonResponse({ error: "Too many checkout attempts." }, 429);
      return handleCheckout(request, env);
    }
    if (url.pathname === "/api/checkout/claim" && request.method === "POST") {
      if (!checkRateLimit(request, 15)) return jsonResponse({ error: "Too many verification attempts." }, 429);
      return handleCheckoutClaim(request, env);
    }
    if (url.pathname === "/api/webhook" && request.method === "POST") {
      return handleWebhook(request, env);
    }
    if (url.pathname === "/api/portal/lookup" && request.method === "POST") {
      if (!checkRateLimit(request, 15)) return jsonResponse({ error: "Too many lookup attempts." }, 429);
      return handlePortalLookup(request, env);
    }
    if (url.pathname === "/api/portal/verify-unlock" && request.method === "POST") {
      if (!checkRateLimit(request, 20)) return jsonResponse({ unlocked: false, error: "Too many attempts." }, 429);
      if (!env.DB) return jsonResponse({ unlocked: false });
      try {
        const body = (await request.json()) as { token?: string; slug?: string };
        const token = (body.token || "").trim();
        if (token) {
          const row = await env.DB.prepare(
            `SELECT plan, token_expires_at FROM customers_orders WHERE magic_token = ?1 AND status = 'active' LIMIT 1`
          )
            .bind(token)
            .first<{ plan: string; token_expires_at?: string }>();
          const expired = Boolean(row?.token_expires_at) && new Date(row!.token_expires_at!).getTime() < Date.now();
          if (!row || expired) return jsonResponse({ unlocked: false, plan: null });
          return jsonResponse({ unlocked: true, plan: row.plan });
        }
        // 严禁凭裸邮箱枚举订单：无 Magic Token 时仅允许已登录本人会话校验
        const sessionUser = await getSessionUser(request, env);
        if (!sessionUser) return jsonResponse({ unlocked: false, plan: null });
        const row = await env.DB.prepare(
          `SELECT plan FROM customers_orders WHERE customer_email = ?1 AND status = 'active' ORDER BY id DESC LIMIT 1`
        )
          .bind(sessionUser.email)
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

    // 管理员回填客户真实目录外链收录结果接口（支持单条与批量更新、截图凭证回填与 URL 校验）
    if (url.pathname === "/api/admin/directory-update" && request.method === "POST") {
      if (!(await isAdminAuthorized(request, env))) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      if (!env.DB) return jsonResponse({ error: "DB not bound" }, 500);
      try {
        interface DirUpdateEntry {
          directoryId?: string;
          directoryName?: string;
          directoryUrl?: string;
          dr?: number;
          category?: string;
          status?: "queued" | "submitted" | "live";
          liveBacklinkUrl?: string;
          proofScreenshotUrl?: string;
          scheduledWave?: number;
        }
        const body = (await request.json()) as DirUpdateEntry & {
          customerEmail?: string;
          campaignId?: number;
          slug?: string;
          items?: DirUpdateEntry[];
        };
        const email = (body.customerEmail || "").trim().toLowerCase();
        if (!email) return jsonResponse({ error: "Missing customerEmail" }, 400);
        const campaignId = Number(body.campaignId || 0);
        const entries: DirUpdateEntry[] =
          Array.isArray(body.items) && body.items.length > 0 ? body.items.slice(0, 50) : [body];

        let updatedCount = 0;
        for (const item of entries) {
          const dirId = (item.directoryId || "").trim();
          if (!dirId) continue;
          const st = ["queued", "submitted", "live"].includes(item.status || "") ? item.status! : "submitted";
          const rawLive = (item.liveBacklinkUrl || "").trim();
          if (rawLive && !parseSafePublicHttpsUrl(rawLive)) {
            return jsonResponse({ error: `Invalid live backlink URL for ${dirId}` }, 400);
          }
          const rawProof = (item.proofScreenshotUrl || "").trim();
          if (rawProof && !parseSafePublicHttpsUrl(rawProof)) {
            return jsonResponse({ error: `Invalid proof screenshot URL for ${dirId}` }, 400);
          }
          await env.DB.prepare(
            `INSERT INTO directory_submissions (customer_email, slug, directory_id, directory_name, directory_url, dr, category, status, live_backlink_url, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'))
             ON CONFLICT(customer_email, directory_id) DO UPDATE SET
               slug = COALESCE(NULLIF(?2, ''), slug),
               status = ?8,
               live_backlink_url = CASE WHEN ?9 != '' OR ?8 = 'queued' THEN ?9 ELSE live_backlink_url END,
               updated_at = datetime('now')`
          )
            .bind(
              email,
              body.slug || "",
              dirId,
              item.directoryName || dirId,
              item.directoryUrl || "",
              Number(item.dr || 50),
              item.category || "SaaS Directory",
              st,
              rawLive
            )
            .run();

          if (rawProof || item.scheduledWave) {
            const wave = [1, 2, 3].includes(Number(item.scheduledWave)) ? Number(item.scheduledWave) : 1;
            await env.DB.prepare(
              `INSERT INTO directory_health_checks (customer_email, campaign_id, directory_id, scheduled_wave, proof_screenshot_url, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
               ON CONFLICT(customer_email, campaign_id, directory_id) DO UPDATE SET
                 scheduled_wave = ?4, proof_screenshot_url = COALESCE(NULLIF(?5, ''), proof_screenshot_url), updated_at = datetime('now')`
            )
              .bind(email, campaignId, dirId, wave, rawProof.slice(0, 400))
              .run();
          }
          updatedCount += 1;
        }

        if (updatedCount === 0) return jsonResponse({ error: "Missing directoryId" }, 400);
        await logAdminAudit(
          env,
          request,
          entries.length > 1 ? "directory_batch_update" : "directory_update",
          `${body.slug || email}:${entries[0]?.directoryId || "batch"}:${updatedCount}`
        );
        return jsonResponse({ ok: true, updatedCount });
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

    // V4 公开战报洁净短路径（/report/:shareId -> 内部直读无后缀 /report，规避 Cloudflare Assets 307 去 .html 重定向丢参）
    if (/^\/report\/[a-zA-Z0-9-_]+$/.test(url.pathname) && request.method === "GET") {
      const rewritten = new Request(new URL("/report", url.origin).toString(), request);
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
   * 每日 UTC 13:00（北京时间 21:00）全自动闭环巡检：
   * 1. 消费并发送三站共享 D1 email_outbox 队列邮件
   * 2. 对已收录外链执行 HTTP 200 & dofollow 自动验活巡检
   * 3. 对所有活跃订阅者与监控项目自动抓取最新买家求购线索并发送日报
   * 4. 聚合三大系统（StatementFlow + HardCall + LaunchPulse）当日营收、漏斗与待办，发送 CEO 自动经营日报
   */
  async scheduled(_event: unknown, env: Env): Promise<void> {
    if (!env.DB) return;
    try {
      await flushSharedEmailOutbox(env, 25);
    } catch {
      // ignore
    }
    let backlinkSummary = { checked: 0, verifiedLive: 0, dofollowCount: 0 };
    try {
      backlinkSummary = await runBacklinkHealthCheck(env, "", 25);
    } catch {
      // 单次验活失败不影响后续任务
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
          const activeCamp = await env.DB.prepare(
            `SELECT id FROM campaigns WHERE user_email = ?1 ORDER BY id DESC LIMIT 1`
          )
            .bind(sub.customer_email)
            .first<{ id: number }>();

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
            // 同步写入 radar_leads，让定时任务扫到的线索直接出现在 /dashboard 买家收件箱里
            if (activeCamp?.id) {
              await env.DB.prepare(
                `INSERT OR IGNORE INTO radar_leads (
                   campaign_id, user_email, external_id, source, community, author, title, excerpt, url,
                   intent_type, intent_score, status, posted_at
                 ) VALUES (?1, ?2, ?3, 'Hacker News', 'HN Daily Radar', '@hn_dev', ?4, ?5, ?6, 'buying', 91, 'new', date('now'))`
              )
                .bind(activeCamp.id, sub.customer_email, `hn-${hit.objectID}`, title.slice(0, 140), excerpt, leadUrl)
                .run();
            }
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

    // 4. 每日三系统统一全自动 CEO 经营日报（仅当过去 24h 有真实订单、漏斗事件或外链巡检时发送简报）
    try {
      const [lp24h, sf24h, hc24h, clicks24h, sfEvents24h] = await Promise.all([
        env.DB.prepare(
          `SELECT COUNT(*) as cnt, COALESCE(SUM(amount_usd), 0) as rev FROM customers_orders WHERE status = 'active' AND created_at >= datetime('now', '-24 hours')`
        )
          .first<{ cnt: number; rev: number }>()
          .catch(() => ({ cnt: 0, rev: 0 })),
        env.DB.prepare(
          `SELECT COUNT(*) as cnt, COALESCE(SUM(amount_usd), 0) as rev FROM sf_orders WHERE status = 'completed' AND created_at >= datetime('now', '-24 hours')`
        )
          .first<{ cnt: number; rev: number }>()
          .catch(() => ({ cnt: 0, rev: 0 })),
        env.DB.prepare(
          `SELECT COUNT(*) as cnt, COALESCE(SUM(amount_usd), 0) as rev FROM hc_orders WHERE status = 'completed' AND created_at >= datetime('now', '-24 hours')`
        )
          .first<{ cnt: number; rev: number }>()
          .catch(() => ({ cnt: 0, rev: 0 })),
        env.DB.prepare(
          `SELECT COUNT(*) as cnt FROM link_clicks WHERE clicked_at >= datetime('now', '-24 hours')`
        )
          .first<{ cnt: number }>()
          .catch(() => ({ cnt: 0 })),
        env.DB.prepare(
          `SELECT COUNT(*) as cnt FROM sf_funnel_events WHERE created_at >= datetime('now', '-24 hours')`
        )
          .first<{ cnt: number }>()
          .catch(() => ({ cnt: 0 })),
      ]);

      const total24hOrders = Number(lp24h?.cnt || 0) + Number(sf24h?.cnt || 0) + Number(hc24h?.cnt || 0);
      const total24hRev = Number(lp24h?.rev || 0) + Number(sf24h?.rev || 0) + Number(hc24h?.rev || 0);

      await sendResendEmail(env, {
        to: "hello@statementflow.win",
        fromLabel: "Overseas Growth OS",
        subject: `📊 Daily Auto-Digest: $${total24hRev} (24h) · ${total24hOrders} Orders · ${Number(clicks24h?.cnt || 0)} Clicks`,
        text: [
          `Automated 24-Hour Operating Digest (${new Date().toISOString().slice(0, 10)}):`,
          ``,
          `1. Revenue & Paid Orders (Last 24h): $${total24hRev} USD (${total24hOrders} orders)`,
          `   • StatementFlow AI: ${Number(sf24h?.cnt || 0)} orders ($${Number(sf24h?.rev || 0)}) | ${Number(sfEvents24h?.cnt || 0)} funnel events`,
          `   • HardCall B2B:     ${Number(hc24h?.cnt || 0)} orders ($${Number(hc24h?.rev || 0)})`,
          `   • LaunchPulse:      ${Number(lp24h?.cnt || 0)} orders ($${Number(lp24h?.rev || 0)}) | ${Number(clicks24h?.cnt || 0)} tracked clicks`,
          ``,
          `2. Backlink Health Patrol:`,
          `   • Checked: ${backlinkSummary.checked} | Live HTTP 200: ${backlinkSummary.verifiedLive} | Dofollow: ${backlinkSummary.dofollowCount}`,
          ``,
          `Admin Console: https://pulse.statementflow.win/admin`,
        ].join("\n"),
      });
    } catch {
      // ignore
    }
  },
};
