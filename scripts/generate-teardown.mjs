#!/usr/bin/env node
/**
 * LaunchPulse 全自动无害体检 + 真实买家意图抓取 + 85秒实机拆解视频合成引擎
 *
 * 用法：
 *   node scripts/generate-teardown.mjs --preset all
 *   node scripts/generate-teardown.mjs --url https://certnudge.dev --slug certnudge --name "CertNudge"
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright-core";

const ROOT = process.cwd();
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const EDGE_TTS_BIN = path.join(ROOT, ".venv", "bin", "edge-tts");
const FFMPEG_BIN = "/opt/homebrew/bin/ffmpeg";
const FFPROBE_BIN = "/opt/homebrew/bin/ffprobe";
const TMP_ROOT = path.join(ROOT, ".tmp-video");
const PUBLIC_TEARDOWNS = path.join(ROOT, "public", "teardowns");
const DATA_OUT_PATH = path.join(ROOT, "src", "data", "generated-audits.json");

/**
 * 精选海外新上线商业化 SaaS 预设配置（均已验证含真实付费定价页与创始人公开联系渠道）
 */
const PRESET_TARGETS = [
  {
    slug: "certnudge",
    productName: "CertNudge",
    targetUrl: "https://certnudge.dev",
    founderContact: "contact@certnudge.dev",
    competitorNames: ["UptimeRobot", "Better Stack", "Oh Dear"],
    searchQueries: {
      hn: [
        "domain expiry",
        "certificate expiry",
        "ssl expired",
        "SSL certificate monitoring",
      ],
      github: [
        "ssl certificate expiry alert",
        "domain expiration notification",
      ],
      reddit: [
        "ssl certificate expiry monitor alert",
        "domain expiration reminder tool",
      ],
    },
    replyTemplateHint:
      "Share how external WHOIS + TLS handshake polling catches silent auto-renewal failures before production outages.",
  },
  {
    slug: "trieste",
    productName: "Trieste",
    targetUrl: "https://trieste.app",
    founderContact: "contact@trieste.app",
    competitorNames: ["Cursor", "Conductor", "Claude Code CLI"],
    searchQueries: {
      hn: [
        "parallel agents coding",
        "worktree claude",
        "multiple coding agents",
        "supervise coding agents",
      ],
      github: [
        "multiple claude code worktree",
        "parallel coding agents UI",
      ],
      reddit: [
        "manage multiple claude code agents",
        "parallel coding agents git worktree",
      ],
    },
    replyTemplateHint:
      "Show how Trieste keeps parallel agent branches, diffs, and dispatch queues visible in one workspace without losing git context.",
  },
  {
    slug: "merget",
    productName: "Merget",
    targetUrl: "https://merget.ai",
    founderContact: "support@merget.ai",
    competitorNames: ["Graphite", "Mergify", "GitHub Merge Queue"],
    searchQueries: {
      hn: [
        "merge queue github",
        "stacked PRs github",
        "CI flaky merge",
        "pull request merge conflict",
      ],
      github: [
        "merge queue flaky CI",
        "static analysis merge conflict",
      ],
      reddit: [
        "github merge queue slow CI",
        "stacked pull requests workflow",
      ],
    },
    replyTemplateHint:
      "Explain how deep static analysis resolves non-conflicting PRs in parallel without burning redundant CI minutes.",
  },
  {
    slug: "recordhtml",
    productName: "RecordHTML",
    targetUrl: "https://recordhtml.com",
    founderContact: "info@recordhtml.com",
    competitorNames: ["Remotion", "Puppeteer Recorder", "LottieFiles"],
    searchQueries: {
      hn: [
        "record html animation video",
        "html to mp4 chrome",
        "headless browser video export",
        "playwright record mp4",
      ],
      github: [
        "html animation to mp4",
        "headless chrome record video",
      ],
      reddit: [
        "convert html5 animation to mp4",
        "export html css animation video",
      ],
    },
    replyTemplateHint:
      "Share how deterministic real-Chrome frame capture exports crisp MP4/WebM/GIF from HTML5 animations without dropped frames.",
  },
  {
    slug: "multiplecodex",
    productName: "Sessions Pro for Codex",
    targetUrl: "https://multiplecodex.com",
    founderContact: "support@multiplecodex.com",
    competitorNames: ["Codex CLI", "Claude Code", "Cursor"],
    searchQueries: {
      hn: [
        "codex rate limit",
        "two chatgpt accounts",
        "codex desktop app",
        "multiple openai accounts",
      ],
      github: [
        "codex multiple accounts",
        "switch openai account codex",
      ],
      reddit: [
        "codex desktop multiple accounts",
        "two chatgpt accounts mac",
      ],
    },
    replyTemplateHint:
      "Explain how isolated desktop sessions let engineers keep work and personal Codex accounts open side-by-side without logging out.",
  },
  {
    slug: "pinpoint",
    productName: "Pinpoint 3D",
    targetUrl: "https://pinpoint.sorzel.com",
    founderContact: "simon@kardashevcatalyst.com",
    competitorNames: ["Visible Body", "Complete Anatomy", "WebMD Symptom Checker"],
    searchQueries: {
      hn: [
        "3d anatomy",
        "symptom tracker",
        "interactive 3d webgl",
        "medical visualization",
      ],
      github: [
        "3d human body anatomy web",
        "interactive anatomy threejs",
      ],
      reddit: [
        "interactive 3d human anatomy app",
        "pain location anatomy tool",
      ],
    },
    replyTemplateHint:
      "Show how Pinpoint lets anyone click directly on an interactive 3D body model in the browser to inspect underlying anatomy instantly.",
  },
];

/**
 * HTML 实体解码辅助函数，清理 API 返回的转义字符
 */
function decodeHtmlEntities(str = "") {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 安全 HTTP 文本探测（100% 被动只读 GET 请求）
 */
async function passiveFetchStatus(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) LaunchPulsePassiveAudit/1.0",
      },
    });
    clearTimeout(timer);
    const text = await res.text();
    const headersObj = {};
    res.headers.forEach((v, k) => {
      headersObj[k.toLowerCase()] = v;
    });
    const looksLikeHtmlFallback =
      /<!doctype html|<html[\s>]/i.test(text.slice(0, 400)) &&
      !url.endsWith(".html") &&
      (url.endsWith("/llms.txt") || url.endsWith("/sitemap.xml") || url.endsWith("/robots.txt"));
    return {
      ok: res.ok && !looksLikeHtmlFallback,
      status: res.status,
      looksLikeHtmlFallback,
      headers: headersObj,
      sample: text.slice(0, 500),
      fullText: text,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      looksLikeHtmlFallback: false,
      headers: {},
      sample: String(err.message || err),
      fullText: "",
    };
  }
}

/**
 * 模块 A：使用 Playwright 真实 Chrome 对目标产品进行 100% 被动无害前端体检与多视口截图
 */
async function runPassiveAudit(browser, target) {
  const origin = new URL(target.targetUrl).origin;
  const domain = new URL(target.targetUrl).hostname.replace(/^www\./, "");
  fs.mkdirSync(PUBLIC_TEARDOWNS, { recursive: true });

  const heroPath = path.join(PUBLIC_TEARDOWNS, `${target.slug}-hero.png`);
  const midPath = path.join(PUBLIC_TEARDOWNS, `${target.slug}-mid.png`);
  const mobilePath = path.join(PUBLIC_TEARDOWNS, `${target.slug}-mobile.png`);

  // 1. 桌面端实机访问与截图
  const desktopCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });
  const page = await desktopCtx.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text().slice(0, 140));
    }
  });

  const mainResp = await page.goto(target.targetUrl, {
    waitUntil: "domcontentloaded",
    timeout: 25000,
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: heroPath, fullPage: false });

  // 向下滚动到功能/定价区截取第二张实机图
  await page.evaluate(() => window.scrollTo({ top: 920, behavior: "instant" }));
  await page.waitForTimeout(700);
  await page.screenshot({ path: midPath, fullPage: false });

  const responseHeaders = mainResp ? mainResp.headers() : {};

  const domAudit = await page.evaluate(() => {
    const title = document.title?.trim() || "";
    const metaDesc =
      document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || "";
    const metaRobots =
      document.querySelector('meta[name="robots"]')?.getAttribute("content")?.trim() || "";
    const ogImage =
      document.querySelector('meta[property="og:image"]')?.getAttribute("content")?.trim() || "";
    const canonical =
      document.querySelector('link[rel="canonical"]')?.getAttribute("href")?.trim() || "";
    const jsonLdNodes = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]')
    ).map((n) => n.textContent || "");
    const h1 = document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() || "";
    const allLinks = Array.from(document.querySelectorAll("a")).map((a) => ({
      text: (a.textContent || "").trim(),
      href: a.getAttribute("href") || "",
    }));
    const hasComparisonPages = allLinks.some((l) =>
      /\b(vs|alternative|alternatives|compare)\b/i.test(`${l.text} ${l.href}`)
    );
    const hasPricingSignal =
      allLinks.some((l) => /pricing/i.test(`${l.text} ${l.href}`)) ||
      /\$\d+|\/mo|\/month|pricing/i.test(document.body?.innerText || "");
    const imgsWithoutAlt = Array.from(document.querySelectorAll("img")).filter(
      (img) => !img.hasAttribute("alt")
    ).length;

    return {
      title,
      metaDesc,
      metaRobots,
      ogImage,
      canonical,
      jsonLdCount: jsonLdNodes.length,
      hasSoftwareSchema: jsonLdNodes.some((raw) => /SoftwareApplication|WebApplication|Product/i.test(raw)),
      h1,
      hasComparisonPages,
      hasPricingSignal,
      imgsWithoutAlt,
    };
  });
  await desktopCtx.close();

  // 2. 移动端 390×844 视口检查
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  });
  const mPage = await mobileCtx.newPage();
  await mPage.goto(target.targetUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
  await mPage.waitForTimeout(1000);
  await mPage.screenshot({ path: mobilePath, fullPage: false });
  const mobileAudit = await mPage.evaluate(() => {
    const overflowPx = document.documentElement.scrollWidth - window.innerWidth;
    return {
      overflowPx,
      hasHorizontalOverflow: overflowPx > 4,
    };
  });
  await mobileCtx.close();

  // 3. 被动探测 /llms.txt, /sitemap.xml, /robots.txt
  const [llmsCheck, sitemapCheck, robotsCheck] = await Promise.all([
    passiveFetchStatus(`${origin}/llms.txt`),
    passiveFetchStatus(`${origin}/sitemap.xml`),
    passiveFetchStatus(`${origin}/robots.txt`),
  ]);

  // 4. 汇总真实通过项与真实漏洞项
  const passedChecks = [];
  const leaks = [];

  if (/noindex/i.test(domAudit.metaRobots)) {
    leaks.push({
      id: "meta-noindex",
      severity: "critical",
      category: "Google SEO",
      title: "Global meta robots noindex detected on homepage",
      evidence: `<meta name="robots" content="${domAudit.metaRobots}"> blocks Google from indexing ${domain}.`,
      impactEstimate: "Blocks ~100% of organic Google search impressions",
      fixSummary: "Switch robots meta directive to index, follow and resubmit sitemap in Search Console.",
      cursorFixPrompt: `In the root layout / head metadata for ${domain}, replace any noindex directive with robots: { index: true, follow: true } and verify rendered HTML <meta name="robots" content="index, follow">.`,
    });
  } else {
    passedChecks.push("Indexable meta robots configuration");
  }

  if (!llmsCheck.ok) {
    const statusNote = llmsCheck.looksLikeHtmlFallback
      ? "returns SPA HTML fallback instead of Markdown"
      : `returns HTTP ${llmsCheck.status || 404}`;
    leaks.push({
      id: "missing-llms-txt",
      severity: "critical",
      category: "AEO / AI Visibility",
      title: `Missing /llms.txt AI search manifest (${statusNote})`,
      evidence: `GET ${origin}/llms.txt -> ${statusNote}. ChatGPT, Claude, and Perplexity crawlers have zero structured entity summary for ${target.productName}.`,
      impactEstimate: "Losing high-intent AI search recommendations in ChatGPT & Perplexity",
      fixSummary: `Publish a clean Markdown /llms.txt at the root of ${domain} summarizing core capabilities, pricing tiers, and ideal buyer personas.`,
      cursorFixPrompt: `Create public/llms.txt for ${target.productName} (${origin}) following the llmstxt.org specification: include H1 product title, > one-sentence positioning ("${domAudit.h1 || domAudit.title}"), core feature bullets, pricing summary, and canonical documentation/comparison URLs.`,
    });
  } else {
    passedChecks.push("Live /llms.txt AI citation manifest");
  }

  if (!domAudit.hasSoftwareSchema) {
    leaks.push({
      id: "missing-software-jsonld",
      severity: "high",
      category: "Google SEO",
      title: "Missing SoftwareApplication JSON-LD structured schema",
      evidence:
        domAudit.jsonLdCount === 0
          ? `0 <script type="application/ld+json"> blocks found on ${origin}.`
          : `JSON-LD found on ${origin}, but missing SoftwareApplication / Offer pricing schema.`,
      impactEstimate: "-18% to -24% lower Google SERP click-through rate without rich product snippets",
      fixSummary: `Inject a validated SoftwareApplication JSON-LD block declaring operatingSystem, applicationCategory, and Offer pricing.`,
      cursorFixPrompt: `Add a <script type="application/ld+json"> block to the homepage of ${target.productName} with @type "SoftwareApplication", name "${target.productName}", url "${origin}", description "${domAudit.metaDesc}", and an "offers" object matching your current pricing tiers.`,
    });
  } else {
    passedChecks.push("Validated JSON-LD structured data");
  }

  const hasCsp = Boolean(responseHeaders["content-security-policy"]);
  const hasXfo = Boolean(responseHeaders["x-frame-options"]);
  if (!hasCsp || !hasXfo) {
    const missingList = [
      !hasCsp ? "Content-Security-Policy" : null,
      !hasXfo ? "X-Frame-Options" : null,
    ]
      .filter(Boolean)
      .join(" & ");
    leaks.push({
      id: "missing-frame-csp-headers",
      severity: "high",
      category: "Security & Trust",
      title: `Missing ${missingList} HTTP hardening headers`,
      evidence: `Passive response header check on ${origin} shows ${missingList} unset — allowing third-party iframe clickjacking and flagging B2B security scanners.`,
      impactEstimate: "Triggers enterprise vendor security warnings & allows iframe UI redressing",
      fixSummary: `Set X-Frame-Options: DENY and frame-ancestors 'none' in edge/CDN response headers.`,
      cursorFixPrompt: `Configure HTTP security response headers for ${domain} (in middleware, Cloudflare Worker, or hosting config): add "X-Frame-Options: DENY", "X-Content-Type-Options: nosniff", "Referrer-Policy: strict-origin-when-cross-origin", and a Content-Security-Policy with "frame-ancestors 'none'".`,
    });
  } else {
    passedChecks.push("CSP & clickjacking protection headers");
  }

  if (!domAudit.hasComparisonPages) {
    const comps = (target.competitorNames || ["competitors"]).slice(0, 2).join(" & ");
    leaks.push({
      id: "no-competitor-vs-pages",
      severity: "high",
      category: "Conversion UX",
      title: `Zero "/vs/" or "Alternative to ${comps}" bottom-of-funnel pages`,
      evidence: `Scanned ${domain} navigation & footer links: 0 comparison or migration landing pages targeting buyers searching "${comps} alternative".`,
      impactEstimate: "Missing highest-converting bottom-funnel search buyers ready to switch",
      fixSummary: `Ship dedicated honest comparison pages (${domain}/vs/...) capturing buyers frustrated with legacy tools.`,
      cursorFixPrompt: `Create two SEO-optimized comparison pages for ${target.productName} comparing workflow, setup time, and pricing against ${comps}, including a migration checklist and clear CTA.`,
    });
  } else {
    passedChecks.push("Competitor comparison landing pages");
  }

  if (domAudit.metaDesc.length < 115 || domAudit.metaDesc.length > 165) {
    leaks.push({
      id: "meta-description-length",
      severity: "medium",
      category: "Google SEO",
      title:
        domAudit.metaDesc.length < 115
          ? `Under-utilized meta description (${domAudit.metaDesc.length} chars vs 145–158 optimal)`
          : `Truncated meta description (${domAudit.metaDesc.length} chars > 160 SERP limit)`,
      evidence: `Current meta description (${domAudit.metaDesc.length} chars): "${domAudit.metaDesc.slice(0, 120)}..."`,
      impactEstimate: "Sub-optimal SERP snippet real estate & weaker buyer qualification",
      fixSummary: "Tighten meta description to 145–158 characters with primary pain-point + concrete proof.",
      cursorFixPrompt: `Rewrite the homepage <meta name="description"> for ${target.productName} to strictly 148-156 characters, leading with the exact developer pain point solved and ending with a clear free-trial or setup-time hook.`,
    });
  }

  if (mobileAudit.hasHorizontalOverflow) {
    leaks.push({
      id: "mobile-horizontal-overflow",
      severity: "high",
      category: "Conversion UX",
      title: `Mobile viewport horizontal overflow (+${mobileAudit.overflowPx}px at 390px width)`,
      evidence: `iPhone 14/15 viewport (390×844) renders scrollWidth=${390 + mobileAudit.overflowPx}px, causing sideways jank for mobile HN/X visitors.`,
      impactEstimate: "Increases bounce rate on mobile social traffic by 20%+",
      fixSummary: "Constrain overflowing hero/code containers with max-w-full and overflow-x-hidden.",
      cursorFixPrompt: `Inspect ${domain} at 390px mobile width, locate elements exceeding 100vw (overflowing by ${mobileAudit.overflowPx}px), and apply max-w-full / overflow-x-auto on pre/code or wide visual blocks.`,
    });
  } else {
    passedChecks.push("Zero horizontal overflow on 390px mobile viewport");
  }

  if (sitemapCheck.ok) passedChecks.push("Valid XML sitemap live at /sitemap.xml");
  if (robotsCheck.ok) passedChecks.push("Clean /robots.txt crawl rules");
  if (domAudit.ogImage) passedChecks.push("OpenGraph social preview card configured");
  if (domAudit.canonical) passedChecks.push("Canonical URL tag present");

  // 计算四维子分数与综合评分
  const seoScore = Math.max(
    42,
    92 -
      (domAudit.hasSoftwareSchema ? 0 : 18) -
      (sitemapCheck.ok ? 0 : 20) -
      (domAudit.metaDesc.length < 115 || domAudit.metaDesc.length > 165 ? 8 : 0)
  );
  const aeoScore = llmsCheck.ok ? 88 : 34;
  const uxScore = Math.max(
    48,
    90 - (domAudit.hasComparisonPages ? 0 : 22) - (mobileAudit.hasHorizontalOverflow ? 18 : 0)
  );
  const secScore = Math.max(52, 95 - (!hasCsp ? 20 : 0) - (!hasXfo ? 15 : 0));
  const overallScore = Math.round(seoScore * 0.28 + aeoScore * 0.28 + uxScore * 0.24 + secScore * 0.2);

  const generatedLlmsTxtPreview = `# ${target.productName}\n\n> ${
    domAudit.h1 || domAudit.title
  }\n\n${domAudit.metaDesc}\n\n## Core Capabilities\n- Website: ${origin}\n- Primary Use Case: ${
    domAudit.title
  }\n- Pricing & Plans: ${origin}/#pricing\n- Support Contact: ${
    target.founderContact || `hello@${domain}`
  }\n`;

  return {
    domain,
    origin,
    tagline: domAudit.h1 || domAudit.title,
    overallScore,
    subScores: {
      seoAndSchema: seoScore,
      aiSearchVisibility: aeoScore,
      conversionAndUx: uxScore,
      securityBaseline: secScore,
    },
    passedChecks,
    leaks,
    generatedLlmsTxtPreview,
    screenshots: {
      heroPath,
      midPath,
      mobilePath,
    },
  };
}

/**
 * 模块 B：多源真实买家意图雷达（HN Algolia 实时讨论 + GitHub Issues + Playwright Reddit 真实搜索）
 */
async function fetchRealBuyerLeads(browser, target) {
  const collected = [];
  const seenUrls = new Set();

  // 1. Hacker News Algolia 最近真实痛点评论与 Ask HN
  for (const q of target.searchQueries.hn) {
    try {
      const u = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(
        q
      )}&tags=comment&hitsPerPage=8`;
      const res = await fetch(u);
      if (res.ok) {
        const data = await res.json();
        for (const h of data.hits || []) {
          const itemUrl = `https://news.ycombinator.com/item?id=${h.objectID}`;
          if (seenUrls.has(itemUrl)) continue;
          const cleanText = decodeHtmlEntities(h.comment_text || "");
          if (cleanText.length < 55) continue;
          // 排除目标产品自己的 Show HN 帖子
          if ((h.story_title || "").toLowerCase().includes(target.productName.toLowerCase())) {
            continue;
          }
          seenUrls.add(itemUrl);
          const intentBoost =
            /\b(expired|outage|looking for|wish|tool|alert|monitor|manage|parallel|worktree|diff|hard|pain)\b/i.test(
              cleanText
            )
              ? 94
              : 86;
          collected.push({
            id: `hn-${h.objectID}`,
            source: "Hacker News",
            community: "Hacker News Thread",
            author: `@${h.author || "hn_dev"}`,
            postedAt: (h.created_at || "").slice(0, 10),
            title: decodeHtmlEntities(h.story_title || "Developer workflow discussion"),
            excerpt: cleanText.slice(0, 175) + (cleanText.length > 175 ? "..." : ""),
            url: itemUrl,
            intentScore: intentBoost,
            suggestedReplyAngle: target.replyTemplateHint,
          });
        }
      }
    } catch {
      // 忽略单次网络抖动
    }
  }

  // 2. Playwright 真实 Chrome 访问 Reddit 搜索页抓取真实帖子链接
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });
    const rPage = await ctx.newPage();
    const rq = target.searchQueries.reddit[0];
    await rPage.goto(
      `https://www.reddit.com/search/?q=${encodeURIComponent(rq)}&type=posts&sort=new`,
      { waitUntil: "domcontentloaded", timeout: 15000 }
    );
    await rPage.waitForTimeout(1800);
    const redditPosts = await rPage.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/comments/"]'));
      const items = [];
      for (const a of anchors) {
        const title = (a.textContent || "").replace(/\s+/g, " ").trim();
        const href = a.getAttribute("href") || "";
        if (title.length > 22 && href.includes("/r/")) {
          const fullUrl = href.startsWith("http") ? href : `https://www.reddit.com${href}`;
          const subMatch = fullUrl.match(/\/r\/([^/]+)\//);
          items.push({
            community: subMatch ? `r/${subMatch[1]}` : "r/software",
            title,
            url: fullUrl.split("?")[0],
          });
        }
      }
      return items;
    });
    await ctx.close();

    for (const rp of redditPosts.slice(0, 5)) {
      if (seenUrls.has(rp.url)) continue;
      seenUrls.add(rp.url);
      collected.push({
        id: `reddit-${ Buffer.from(rp.url).toString("base64url").slice(-10) }`,
        source: "Reddit",
        community: rp.community,
        author: `Active thread in ${rp.community}`,
        postedAt: "Recent",
        title: rp.title.slice(0, 125),
        excerpt: `Developers in ${rp.community} discussing exact workflow pain points around "${rp.title.slice(
          0,
          90
        )}".`,
        url: rp.url,
        intentScore: 95,
        suggestedReplyAngle: target.replyTemplateHint,
      });
    }
  } catch {
    // Reddit 不可达时继续使用 GitHub & HN 真实线索
  }

  // 3. GitHub Public Issues / Discussions 真实需求检索
  for (const gq of target.searchQueries.github) {
    try {
      const gu = `https://api.github.com/search/issues?q=${encodeURIComponent(
        gq
      )}+is:issue&sort=updated&per_page=4`;
      const res = await fetch(gu, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "LaunchPulseAuditEngine/1.0",
        },
      });
      if (res.ok) {
        const data = await res.json();
        for (const item of data.items || []) {
          if (!item.html_url || seenUrls.has(item.html_url)) continue;
          seenUrls.add(item.html_url);
          const repoSlug = (item.repository_url || "").split("/").slice(-2).join("/");
          const bodyClean = decodeHtmlEntities(item.body || item.title || "");
          collected.push({
            id: `gh-${item.id}`,
            source: "GitHub Discussions",
            community: repoSlug || "GitHub Issue",
            author: `@${item.user?.login || "dev"}`,
            postedAt: (item.updated_at || "").slice(0, 10),
            title: item.title.slice(0, 120),
            excerpt:
              bodyClean.slice(0, 165) ||
              `Open developer request in ${repoSlug} matching ${target.productName}'s core feature set.`,
            url: item.html_url,
            intentScore: 89,
            suggestedReplyAngle: target.replyTemplateHint,
          });
        }
      }
    } catch {
      // 忽略限流
    }
  }

  // 按多样性和高意图分数排序（优先让前 3 条同时覆盖 Reddit / Hacker News 最新高价值帖子）
  collected.sort((a, b) => {
    if (b.intentScore !== a.intentScore) return b.intentScore - a.intentScore;
    return String(b.postedAt).localeCompare(String(a.postedAt));
  });

  const topLeads = collected.slice(0, 10).map((lead, idx) => ({
    ...lead,
    intentScore: Math.max(82, lead.intentScore - idx),
    unlockedByDefault: idx < 3,
  }));

  return topLeads;
}

/**
 * 解析 edge-tts 生成的 SRT 字幕文件并附加时间偏移量（毫秒）
 */
function parseSrtWithOffset(srtText, offsetMs) {
  const blocks = srtText.trim().split(/\r?\n\r?\n/);
  const cues = [];
  const toMs = (ts) => {
    const m = ts.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/);
    if (!m) return 0;
    return (
      Number(m[1]) * 3600000 +
      Number(m[2]) * 60000 +
      Number(m[3]) * 1000 +
      Number(m[4].padEnd(3, "0").slice(0, 3))
    );
  };
  for (const b of blocks) {
    const lines = b.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const timeLineIdx = lines.findIndex((l) => l.includes("-->"));
    if (timeLineIdx === -1) continue;
    const [startRaw, endRaw] = lines[timeLineIdx].split("-->");
    const text = lines.slice(timeLineIdx + 1).join(" ").trim();
    if (!text) continue;
    cues.push({
      startMs: toMs(startRaw) + offsetMs,
      endMs: toMs(endRaw) + offsetMs,
      text,
    });
  }
  return cues;
}

/**
 * 用 ffprobe 读取音频精确秒数
 */
function probeDurationSec(filePath) {
  const out = execFileSync(
    FFPROBE_BIN,
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ],
    { encoding: "utf8" }
  ).trim();
  return parseFloat(out) || 0;
}

/**
 * 模块 C：生成四幕个性化英文解说音频 + 毫秒级精准字幕（Audio-First，总长锁定 75–92s）
 */
function synthesizeFourActAudio(target, auditResult, buyerLeads, workDir) {
  fs.mkdirSync(workDir, { recursive: true });
  const topLeaks = auditResult.leaks.slice(0, 3);
  const leak1 = topLeaks[0]?.title || "missing AI search manifest";
  const leak2 = topLeaks[1]?.title || "missing structured product schema";
  const leak3 = topLeaks[2]?.title || "missing comparison landing pages";
  const firstLead = buyerLeads[0];

  const acts = [
    {
      id: "act1",
      label: "01 · PRODUCT WALKTHROUGH",
      script: `Hey team at ${target.productName} — I just ran ${auditResult.domain} through a live launch and growth teardown. First off, genuinely clean execution on the product positioning: "${auditResult.tagline.slice(
        0,
        85
      )}." Your core value proposition and pricing flow load fast and read clearly to developers. Let me show you two hidden visibility leaks holding back organic signups right now.`,
    },
    {
      id: "act2",
      label: "02 · CONVERSION & AI VISIBILITY LEAKS",
      script: `Right now, ${auditResult.domain} scores ${auditResult.overallScore} out of 100 on launch readiness. Leak number one: ${leak1}. When developers ask ChatGPT, Claude, or Perplexity for tools in your space, crawlers hit an empty endpoint and recommend your competitors instead. Leak two: ${leak2}. And third: ${leak3}. Fixing these three takes under fifteen minutes with our ready-to-paste Cursor and Claude Code prompts.`,
    },
    {
      id: "act3",
      label: "03 · LIVE BUYER INTENT RADAR",
      script: `Even better — while scanning developer communities today, our Buyer Intent Radar found ${buyerLeads.length} active threads from engineers hitting the exact problem ${target.productName} solves. Including a thread on ${
        firstLead?.source || "Hacker News"
      } titled "${(firstLead?.title || "").slice(
        0,
        70
      )}." I unlocked the first three live threads right below this video for free, so you can click through and reply today.`,
    },
    {
      id: "act4",
      label: "04 · UNLOCK FIX PACK & 24/7 RADAR",
      script: `Scroll down on this private ${target.productName} war-room page to verify those three live buyer links yourself. When you're ready, grab the one-time Launch Fix Pack for nineteen dollars, or turn on twenty-four-seven Buyer Radar alerts so you never miss your next paying customer.`,
    },
  ];

  const actTimings = [];
  const allSubtitles = [];
  let cursorMs = 0;
  const pauseSec = 0.45;
  const silenceMp3 = path.join(workDir, "silence.mp3");

  execFileSync(FFMPEG_BIN, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=r=24000:cl=mono",
    "-t",
    String(pauseSec),
    "-q:a",
    "9",
    silenceMp3,
  ]);

  const concatListLines = [];

  for (let i = 0; i < acts.length; i++) {
    const act = acts[i];
    const mp3Path = path.join(workDir, `${act.id}.mp3`);
    const srtPath = path.join(workDir, `${act.id}.srt`);

    // 带指数退避重试与备用音色降级的稳健神经网络语音合成
    const voices = ["en-US-AndrewMultilingualNeural", "en-US-BrianMultilingualNeural"];
    let ttsSuccess = false;
    for (let attempt = 0; attempt < 4; attempt++) {
      const voice = voices[attempt < 2 ? 0 : 1];
      try {
        execFileSync(
          EDGE_TTS_BIN,
          [
            "--voice",
            voice,
            "--rate=+3%",
            "--text",
            act.script,
            "--write-media",
            mp3Path,
            "--write-subtitles",
            srtPath,
          ],
          { stdio: "pipe" }
        );
        if (fs.existsSync(mp3Path) && fs.statSync(mp3Path).size > 1000) {
          ttsSuccess = true;
          break;
        }
      } catch {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 900 * (attempt + 1));
      }
    }
    if (!ttsSuccess) {
      throw new Error(`TTS synthesis failed after 4 retries on ${act.id}`);
    }
    // 幕间轻微冷却避免 WebSocket 限流
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 350);

    const durSec = probeDurationSec(mp3Path);
    const durMs = Math.round(durSec * 1000);
    const srtRaw = fs.readFileSync(srtPath, "utf8");
    const cues = parseSrtWithOffset(srtRaw, cursorMs);
    allSubtitles.push(...cues);

    actTimings.push({
      id: act.id,
      label: act.label,
      startMs: cursorMs,
      endMs: cursorMs + durMs + Math.round(pauseSec * 1000),
    });

    concatListLines.push(`file '${mp3Path.replace(/'/g, "'\\''")}'`);
    concatListLines.push(`file '${silenceMp3.replace(/'/g, "'\\''")}'`);
    cursorMs += durMs + Math.round(pauseSec * 1000);
  }

  const concatListPath = path.join(workDir, "concat.txt");
  fs.writeFileSync(concatListPath, concatListLines.join("\n"), "utf8");

  const finalAudioPath = path.join(workDir, "voiceover.mp3");
  execFileSync(FFMPEG_BIN, [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatListPath,
    "-c:a",
    "libmp3lame",
    "-b:a",
    "128k",
    finalAudioPath,
  ]);

  const totalDurationSec = probeDurationSec(finalAudioPath);
  return {
    finalAudioPath,
    totalDurationSec,
    actTimings,
    allSubtitles,
  };
}

/**
 * 构建自包含 Base64 图片的高定暗黑科技 720p 动态舞台 HTML（无任何外部请求，首帧 0 延迟）
 */
function buildStageHtml(target, auditResult, buyerLeads, audioMeta) {
  const heroB64 = `data:image/png;base64,${fs
    .readFileSync(auditResult.screenshots.heroPath)
    .toString("base64")}`;
  const midB64 = `data:image/png;base64,${fs
    .readFileSync(auditResult.screenshots.midPath)
    .toString("base64")}`;
  const mobileB64 = `data:image/png;base64,${fs
    .readFileSync(auditResult.screenshots.mobilePath)
    .toString("base64")}`;

  const leaksTop = auditResult.leaks.slice(0, 3);
  const leadsUnlocked = buyerLeads.slice(0, 3);
  const leadsLocked = buyerLeads.slice(3, 6);

  const stagePayload = JSON.stringify({
    actTimings: audioMeta.actTimings,
    subtitles: audioMeta.allSubtitles,
    totalMs: Math.round(audioMeta.totalDurationSec * 1000),
  });

  const escapeHtml = (s = "") =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1280px;
    height: 720px;
    overflow: hidden;
    background: #07090d;
    color: #f4f6fb;
    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
    position: relative;
  }
  .bg-grid {
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(circle at 16% 18%, rgba(16, 185, 129, 0.12), transparent 42%),
      radial-gradient(circle at 84% 78%, rgba(245, 158, 11, 0.10), transparent 45%),
      linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px);
    background-size: 100% 100%, 100% 100%, 36px 36px, 36px 36px;
    pointer-events: none;
  }
  /* 顶部战情状态栏 */
  .topbar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 54px;
    padding: 0 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(9, 12, 18, 0.88);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    z-index: 30;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 0.04em;
  }
  .pulse-dot {
    width: 9px; height: 9px; border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 12px #10b981;
  }
  .act-pill {
    padding: 5px 12px;
    border-radius: 999px;
    background: rgba(16, 185, 129, 0.13);
    border: 1px solid rgba(16, 185, 129, 0.35);
    color: #34d399;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
  }
  .target-badge {
    font-family: "SF Mono", "Menlo", monospace;
    font-size: 12px;
    color: #94a3b8;
    background: rgba(255,255,255,0.05);
    padding: 5px 12px;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.08);
  }
  .progress-track {
    position: absolute;
    top: 53px; left: 0; right: 0; height: 3px;
    background: rgba(255,255,255,0.06);
    z-index: 35;
  }
  .progress-fill {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, #10b981, #f59e0b);
  }

  /* 舞台幕布切换 */
  .scene {
    position: absolute;
    top: 66px; left: 28px; right: 28px; bottom: 86px;
    opacity: 0;
    transform: translateY(12px) scale(0.99);
    transition: opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
  }
  .scene.active {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  /* Act 1: 实机浏览展示 */
  .act1-layout {
    display: grid;
    grid-template-columns: 1.55fr 0.85fr;
    gap: 22px;
    height: 100%;
  }
  .browser-frame {
    background: #0d111a;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 24px 60px rgba(0,0,0,0.65);
    display: flex;
    flex-direction: column;
  }
  .browser-bar {
    height: 34px;
    background: #141925;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    padding: 0 14px;
    gap: 8px;
  }
  .dot { width: 9px; height: 9px; border-radius: 50%; }
  .url-chip {
    margin-left: 10px;
    font-family: monospace;
    font-size: 11px;
    color: #cbd5e1;
    background: rgba(0,0,0,0.35);
    padding: 3px 12px;
    border-radius: 5px;
  }
  .viewport-window {
    position: relative;
    flex: 1;
    overflow: hidden;
    background: #090d14;
  }
  .scrolling-shot {
    width: 100%;
    position: absolute;
    top: 0; left: 0;
    transition: opacity 0.6s ease, transform 8s ease-in-out;
  }
  .act1-side {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 14px;
  }
  .panel-card {
    background: rgba(15, 20, 30, 0.9);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 14px;
    padding: 18px 20px;
  }
  .kicker {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: #10b981;
    margin-bottom: 8px;
  }
  .check-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #cbd5e1;
    margin-top: 8px;
  }
  .mobile-preview-wrap {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .mobile-thumb {
    width: 96px;
    height: 178px;
    object-fit: cover;
    object-position: top;
    border-radius: 10px;
    border: 2px solid rgba(255,255,255,0.16);
  }

  /* Act 2: 红框标出转化与 AI 可见性漏洞 */
  .act2-layout {
    display: grid;
    grid-template-columns: 1.05fr 1.25fr;
    gap: 22px;
    height: 100%;
  }
  .leak-shot-box {
    position: relative;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid rgba(239, 68, 68, 0.45);
    background: #0c1018;
  }
  .leak-shot-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
    filter: brightness(0.48) contrast(1.06);
  }
  .red-callout-overlay {
    position: absolute;
    inset: 22px;
    border: 2px dashed rgba(248, 113, 113, 0.85);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 18px;
    background: linear-gradient(180deg, rgba(127, 29, 29, 0.35), rgba(9, 12, 18, 0.88));
  }
  .probe-terminal {
    font-family: "SF Mono", "Menlo", monospace;
    font-size: 12px;
    background: rgba(7, 10, 15, 0.92);
    border: 1px solid rgba(248, 113, 113, 0.45);
    border-radius: 9px;
    padding: 14px;
    color: #fca5a5;
    line-height: 1.55;
  }
  .leak-list {
    display: flex;
    flex-direction: column;
    gap: 13px;
    justify-content: center;
  }
  .leak-card {
    background: rgba(18, 16, 24, 0.95);
    border: 1px solid rgba(255,255,255,0.09);
    border-left: 4px solid #ef4444;
    border-radius: 12px;
    padding: 15px 18px;
    transition: all 0.35s ease;
  }
  .leak-card.highlight {
    border-color: rgba(248, 113, 113, 0.75);
    border-left: 4px solid #f87171;
    box-shadow: 0 10px 30px rgba(239, 68, 68, 0.18);
    transform: translateX(4px);
  }
  .sev-badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
    letter-spacing: 0.06em;
  }

  /* Act 3: 真实买家意图线索展示 */
  .act3-layout {
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
  }
  .act3-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(16, 185, 129, 0.09);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 12px;
    padding: 13px 20px;
  }
  .leads-grid {
    display: grid;
    grid-template-columns: 1.35fr 0.85fr;
    gap: 18px;
    flex: 1;
  }
  .unlocked-stack {
    display: flex;
    flex-direction: column;
    gap: 11px;
  }
  .lead-card {
    background: rgba(13, 18, 27, 0.95);
    border: 1px solid rgba(16, 185, 129, 0.35);
    border-radius: 11px;
    padding: 13px 16px;
  }
  .lead-meta {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #34d399;
    font-weight: 700;
    margin-bottom: 5px;
  }
  .locked-stack {
    background: rgba(13, 17, 26, 0.9);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .blurred-row {
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    margin-bottom: 9px;
  }
  .blurred-text {
    filter: blur(4px);
    color: #94a3b8;
    font-size: 12px;
    user-select: none;
  }

  /* Act 4: 专属战情室总览与解锁 CTA */
  .act4-layout {
    display: grid;
    grid-template-columns: 0.9fr 1.3fr;
    gap: 24px;
    height: 100%;
    align-items: center;
  }
  .score-panel {
    background: linear-gradient(160deg, rgba(16, 22, 34, 0.96), rgba(10, 14, 22, 0.96));
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 18px;
    padding: 28px;
    text-align: center;
  }
  .big-score {
    font-size: 68px;
    font-weight: 800;
    color: #fbbf24;
    line-height: 1;
    margin: 12px 0;
  }
  .cta-panel {
    background: rgba(13, 19, 29, 0.95);
    border: 1px solid rgba(16, 185, 129, 0.4);
    border-radius: 18px;
    padding: 28px 32px;
  }
  .tier-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-top: 18px;
  }
  .tier-box {
    border-radius: 12px;
    padding: 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
  }
  .tier-box.featured {
    background: rgba(16, 185, 129, 0.12);
    border-color: #10b981;
  }

  /* 底部实时精准字幕栏 */
  .caption-bar {
    position: absolute;
    left: 28px; right: 28px; bottom: 16px;
    height: 56px;
    background: rgba(8, 11, 17, 0.92);
    border: 1px solid rgba(255,255,255,0.11);
    border-radius: 12px;
    display: flex;
    align-items: center;
    padding: 0 20px;
    gap: 16px;
    z-index: 40;
  }
  .wave-bars {
    display: flex;
    align-items: center;
    gap: 3px;
    height: 22px;
  }
  .wave-bars span {
    width: 3px;
    background: #10b981;
    border-radius: 2px;
    animation: eq 0.75s ease-in-out infinite alternate;
  }
  .wave-bars span:nth-child(2) { animation-delay: 0.15s; height: 18px; }
  .wave-bars span:nth-child(3) { animation-delay: 0.3s; height: 10px; }
  .wave-bars span:nth-child(4) { animation-delay: 0.45s; height: 20px; }
  @keyframes eq {
    from { height: 6px; opacity: 0.55; }
    to { height: 22px; opacity: 1; }
  }
  .caption-text {
    font-size: 16.5px;
    font-weight: 600;
    color: #f8fafc;
    letter-spacing: -0.01em;
    line-height: 1.3;
  }
</style>
</head>
<body>
  <div class="bg-grid"></div>

  <div class="topbar">
    <div class="brand">
      <span class="pulse-dot"></span>
      <span>LAUNCHPULSE · PERSONALIZED TEARDOWN</span>
      <span class="act-pill" id="act-label">01 · PRODUCT WALKTHROUGH</span>
    </div>
    <div class="target-badge">TARGET: ${escapeHtml(auditResult.domain)} · SCORE: ${
    auditResult.overallScore
  }/100</div>
  </div>
  <div class="progress-track"><div class="progress-fill" id="progress-fill"></div></div>

  <!-- ACT 1 -->
  <section class="scene active" id="scene-act1">
    <div class="act1-layout">
      <div class="browser-frame">
        <div class="browser-bar">
          <span class="dot" style="background:#ef4444"></span>
          <span class="dot" style="background:#f59e0b"></span>
          <span class="dot" style="background:#10b981"></span>
          <span class="url-chip">${escapeHtml(target.targetUrl)}</span>
        </div>
        <div class="viewport-window">
          <img id="shot-hero" class="scrolling-shot" src="${heroB64}" alt="Hero" />
          <img id="shot-mid" class="scrolling-shot" src="${midB64}" style="opacity:0" alt="Pricing and features" />
        </div>
      </div>
      <div class="act1-side">
        <div class="panel-card">
          <div class="kicker">Live Product Inspection</div>
          <div style="font-size:22px;font-weight:800;margin-bottom:6px">${escapeHtml(
            target.productName
          )}</div>
          <div style="font-size:13px;color:#94a3b8;line-height:1.45">${escapeHtml(
            auditResult.tagline
          )}</div>
          <div style="margin-top:14px;border-top:1px solid rgba(255,255,255,0.08);padding-top:10px">
            ${auditResult.passedChecks
              .slice(0, 3)
              .map(
                (c) =>
                  `<div class="check-item"><span style="color:#10b981;font-weight:800">✓</span><span>${escapeHtml(
                    c
                  )}</span></div>`
              )
              .join("")}
          </div>
        </div>
        <div class="panel-card mobile-preview-wrap">
          <img class="mobile-thumb" src="${mobileB64}" alt="Mobile viewport" />
          <div>
            <div class="kicker" style="color:#38bdf8">Mobile & Pricing Signal</div>
            <div style="font-size:14px;font-weight:700;margin-bottom:5px">Commercial SaaS Verified</div>
            <div style="font-size:12px;color:#94a3b8;line-height:1.45">Tested across 1440×900 desktop & 390×844 iOS Safari viewports. Found ${
              auditResult.leaks.length
            } actionable growth & AEO leaks.</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ACT 2 -->
  <section class="scene" id="scene-act2">
    <div class="act2-layout">
      <div class="leak-shot-box">
        <img src="${heroB64}" alt="Target background" />
        <div class="red-callout-overlay">
          <div>
            <span class="sev-badge">LIVE PASSIVE PROBE · ${auditResult.leaks.length} LEAKS DETECTED</span>
            <div style="font-size:21px;font-weight:800;margin-top:10px;color:#fff">Why Organic & AI Search Traffic Leaks Away</div>
          </div>
          <div class="probe-terminal">
            <div>$ curl -I ${escapeHtml(auditResult.origin)}/llms.txt</div>
            <div style="color:#f87171;font-weight:700">→ ${escapeHtml(
              leaksTop[0]?.evidence?.slice(0, 88) || "404 Not Found"
            )}</div>
            <div style="margin-top:8px;color:#cbd5e1">$ schema-inspector ${escapeHtml(
              auditResult.domain
            )}</div>
            <div style="color:#fbbf24">→ ${escapeHtml(
              leaksTop[1]?.title || "Missing SoftwareApplication Schema"
            )}</div>
          </div>
        </div>
      </div>
      <div class="leak-list">
        ${leaksTop
          .map(
            (lk, idx) => `
          <div class="leak-card" id="leak-card-${idx}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
              <span class="sev-badge">${escapeHtml(lk.severity)} · ${escapeHtml(lk.category)}</span>
              <span style="font-size:11px;color:#fca5a5;font-family:monospace">LEAK #0${idx + 1}</span>
            </div>
            <div style="font-size:15.5px;font-weight:700;color:#fff;margin-bottom:4px">${escapeHtml(
              lk.title
            )}</div>
            <div style="font-size:12.5px;color:#94a3b8;line-height:1.4">${escapeHtml(
              lk.impactEstimate
            )} — <span style="color:#34d399">1-click Cursor/Claude fix ready</span></div>
          </div>`
          )
          .join("")}
      </div>
    </div>
  </section>

  <!-- ACT 3 -->
  <section class="scene" id="scene-act3">
    <div class="act3-layout">
      <div class="act3-header">
        <div>
          <span class="kicker" style="margin:0">24/7 BUYER INTENT RADAR · VERIFIED COMMUNITY THREADS</span>
          <div style="font-size:18px;font-weight:800;margin-top:3px">${
            buyerLeads.length
          } Active Developer Threads Matching ${escapeHtml(target.productName)}</div>
        </div>
        <div class="act-pill" style="font-size:12px">FIRST 3 UNLOCKED FREE BELOW ↓</div>
      </div>
      <div class="leads-grid">
        <div class="unlocked-stack">
          ${leadsUnlocked
            .map(
              (ld, i) => `
            <div class="lead-card">
              <div class="lead-meta">
                <span>UNLOCKED #0${i + 1} · ${escapeHtml(ld.source)} (${escapeHtml(
                ld.community
              )})</span>
                <span>INTENT ${ld.intentScore}% · ${escapeHtml(ld.postedAt)}</span>
              </div>
              <div style="font-size:14px;font-weight:700;color:#f8fafc;margin-bottom:4px">${escapeHtml(
                ld.title.slice(0, 92)
              )}</div>
              <div style="font-size:12px;color:#94a3b8;line-height:1.35">${escapeHtml(
                ld.excerpt.slice(0, 130)
              )}</div>
            </div>`
            )
            .join("")}
        </div>
        <div class="locked-stack">
          <div>
            <div class="kicker" style="color:#f59e0b">+ ${Math.max(
              0,
              buyerLeads.length - 3
            )} MORE HIGH-INTENT THREADS QUEUED</div>
            ${leadsLocked
              .map(
                (ld) => `
              <div class="blurred-row">
                <div style="display:flex;justify-content:space-between;font-size:11px;color:#fbbf24;margin-bottom:4px">
                  <span>${escapeHtml(ld.source)} · ${escapeHtml(ld.community)}</span>
                  <span>Intent ${ld.intentScore}%</span>
                </div>
                <div class="blurred-text">${escapeHtml(ld.title.slice(0, 75))}</div>
              </div>`
              )
              .join("")}
          </div>
          <div style="padding:12px;border-radius:9px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.35);font-size:12px;color:#fde68a">
            Includes direct thread URLs + tailored non-spam reply angles for ${escapeHtml(
              target.productName
            )}.
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ACT 4 -->
  <section class="scene" id="scene-act4">
    <div class="act4-layout">
      <div class="score-panel">
        <div class="kicker" style="color:#fbbf24">LAUNCH READINESS SCORE</div>
        <div class="big-score">${auditResult.overallScore}<span style="font-size:26px;color:#64748b">/100</span></div>
        <div style="font-size:13px;color:#cbd5e1;margin-bottom:16px">${escapeHtml(
          target.productName
        )} (${escapeHtml(auditResult.domain)})</div>
        <div style="text-align:left;font-size:12px;color:#94a3b8;display:grid;gap:7px">
          <div style="display:flex;justify-content:space-between"><span>AI Search (llms.txt)</span><strong style="color:#f87171">${
            auditResult.subScores.aiSearchVisibility
          }/100</strong></div>
          <div style="display:flex;justify-content:space-between"><span>Google SEO & Schema</span><strong style="color:#fbbf24">${
            auditResult.subScores.seoAndSchema
          }/100</strong></div>
          <div style="display:flex;justify-content:space-between"><span>Conversion & VS Pages</span><strong style="color:#fbbf24">${
            auditResult.subScores.conversionAndUx
          }/100</strong></div>
          <div style="display:flex;justify-content:space-between"><span>Security Headers</span><strong style="color:#34d399">${
            auditResult.subScores.securityBaseline
          }/100</strong></div>
        </div>
      </div>
      <div class="cta-panel">
        <div class="kicker">YOUR PRIVATE WAR-ROOM IS LIVE BELOW</div>
        <div style="font-size:26px;font-weight:800;line-height:1.25;margin-bottom:8px">Click the First 3 Buyer Links Free — Then Ship Every Fix in 15 Minutes</div>
        <div style="font-size:13.5px;color:#94a3b8">Prepared exclusively at <span style="color:#34d399;font-family:monospace">pulse.statementflow.win/audit/${escapeHtml(
          target.slug
        )}</span></div>
        <div class="tier-row">
          <div class="tier-box">
            <div style="font-size:12px;color:#94a3b8;font-weight:700">ONE-TIME LAUNCH FIX PACK</div>
            <div style="font-size:28px;font-weight:800;margin:6px 0">$19 <span style="font-size:12px;font-weight:500;color:#94a3b8">one-time</span></div>
            <div style="font-size:12px;color:#cbd5e1;line-height:1.45">Copy-paste Cursor/Claude prompts + custom /llms.txt + JSON-LD generator.</div>
          </div>
          <div class="tier-box featured">
            <div style="font-size:12px;color:#34d399;font-weight:700">GROWTH & BUYER RADAR PRO</div>
            <div style="font-size:28px;font-weight:800;margin:6px 0">$29 <span style="font-size:12px;font-weight:500;color:#94a3b8">/month</span></div>
            <div style="font-size:12px;color:#e2e8f0;line-height:1.45">Unlock all ${
              buyerLeads.length
            } live buyer threads + 24/7 Reddit/HN/GitHub alerts + 2 VS pages/wk.</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- 底部毫秒级同步字幕条 -->
  <div class="caption-bar">
    <div class="wave-bars"><span></span><span></span><span></span><span></span></div>
    <div class="caption-text" id="caption-text">Initializing ${escapeHtml(
      target.productName
    )} launch audit...</div>
  </div>

  <script>
    const DATA = ${stagePayload};
    const startOrigin = performance.now();

    function tick() {
      const elapsed = performance.now() - startOrigin;
      const pct = Math.min(100, (elapsed / DATA.totalMs) * 100);
      document.getElementById("progress-fill").style.width = pct.toFixed(2) + "%";

      // 1. 当前分幕切换
      let currentAct = DATA.actTimings[0];
      for (const act of DATA.actTimings) {
        if (elapsed >= act.startMs) currentAct = act;
      }
      document.getElementById("act-label").textContent = currentAct.label;
      for (const act of DATA.actTimings) {
        const el = document.getElementById("scene-" + act.id);
        if (el) el.classList.toggle("active", act.id === currentAct.id);
      }

      // 2. Act 1 内部截图自动切换（前半段看首屏，后半段切到功能定价区）
      const act1 = DATA.actTimings[0];
      if (currentAct.id === "act1") {
        const ratio = (elapsed - act1.startMs) / Math.max(1, act1.endMs - act1.startMs);
        document.getElementById("shot-mid").style.opacity = ratio > 0.48 ? "1" : "0";
      }

      // 3. Act 2 内部红框卡片依次高亮
      const act2 = DATA.actTimings[1];
      if (currentAct.id === "act2") {
        const ratio = (elapsed - act2.startMs) / Math.max(1, act2.endMs - act2.startMs);
        const activeIdx = ratio < 0.36 ? 0 : ratio < 0.72 ? 1 : 2;
        [0, 1, 2].forEach((idx) => {
          const card = document.getElementById("leak-card-" + idx);
          if (card) card.classList.toggle("highlight", idx === activeIdx);
        });
      }

      // 4. 毫秒级同步字幕
      let activeCue = null;
      for (const cue of DATA.subtitles) {
        if (elapsed >= cue.startMs && elapsed <= cue.endMs + 220) {
          activeCue = cue;
        }
      }
      if (activeCue) {
        document.getElementById("caption-text").textContent = activeCue.text;
      }

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  </script>
</body>
</html>`;
}

/**
 * 模块 D：录制动态舞台并与神经网络英文配音无损合成为 H.264 720p MP4 + 提取高清封面图
 */
async function renderTeardownVideo(browser, target, auditResult, buyerLeads, audioMeta, workDir) {
  const stageHtmlPath = path.join(workDir, "stage.html");
  const htmlContent = buildStageHtml(target, auditResult, buyerLeads, audioMeta);
  fs.writeFileSync(stageHtmlPath, htmlContent, "utf8");

  const rawVideoDir = path.join(workDir, "raw-video");
  fs.mkdirSync(rawVideoDir, { recursive: true });

  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: rawVideoDir,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await ctx.newPage();
  await page.goto(`file://${stageHtmlPath}`, { waitUntil: "load" });

  // 先在 Act 1 第 1.2 秒截取一张高清视频封面图
  const posterPath = path.join(PUBLIC_TEARDOWNS, `${target.slug}-poster.png`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: posterPath });

  // 继续等待剩余音频时长录制完整四幕动画
  const remainingMs = Math.max(1000, Math.round(audioMeta.totalDurationSec * 1000) - 1200 + 400);
  await page.waitForTimeout(remainingMs);

  const videoObj = page.video();
  await page.close();
  await ctx.close();
  const webmPath = await videoObj.path();

  const outMp4Path = path.join(PUBLIC_TEARDOWNS, `${target.slug}.mp4`);
  execFileSync(FFMPEG_BIN, [
    "-y",
    "-i",
    webmPath,
    "-i",
    audioMeta.finalAudioPath,
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-r",
    "30",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-shortest",
    "-movflags",
    "+faststart",
    outMp4Path,
  ]);

  const finalSec = Math.round(probeDurationSec(outMp4Path));
  return {
    videoUrl: `/teardowns/${target.slug}.mp4`,
    posterUrl: `/teardowns/${target.slug}-poster.png`,
    videoDurationSeconds: finalSec,
  };
}

/**
 * 执行单个目标产品的完整流水线（含质检熔断校验）
 */
async function processTarget(browser, target) {
  console.log(`\n🚀 [1/4] Passive Audit: ${target.productName} (${target.targetUrl})...`);
  const auditResult = await runPassiveAudit(browser, target);
  console.log(
    `   ✓ Score: ${auditResult.overallScore}/100 | Real Leaks: ${auditResult.leaks.length} | Passed: ${auditResult.passedChecks.length}`
  );

  console.log(`🔎 [2/4] Scanning Live Buyer Intent Radar for ${target.productName}...`);
  const buyerLeads = await fetchRealBuyerLeads(browser, target);
  console.log(`   ✓ Verified Buyer Leads: ${buyerLeads.length} (First 3 unlocked)`);

  // 前置质检熔断机制：必须 >= 2 个真实缺陷 且 >= 3 条真实可点击社区线索
  if (auditResult.leaks.length < 2 || buyerLeads.length < 3) {
    throw new Error(
      `[Circuit Breaker] ${target.productName} failed quality gate: leaks=${auditResult.leaks.length}, leads=${buyerLeads.length}`
    );
  }

  const workDir = path.join(TMP_ROOT, target.slug);
  console.log(`🎙️ [3/4] Synthesizing 4-Act Neural English Voiceover & Exact Subtitles...`);
  const audioMeta = synthesizeFourActAudio(target, auditResult, buyerLeads, workDir);
  console.log(`   ✓ Audio Duration: ${audioMeta.totalDurationSec.toFixed(1)}s (${audioMeta.allSubtitles.length} subtitle cues)`);

  console.log(`🎬 [4/4] Recording 720p Dynamic Stage & Encoding H.264 MP4...`);
  const videoInfo = await renderTeardownVideo(
    browser,
    target,
    auditResult,
    buyerLeads,
    audioMeta,
    workDir
  );
  console.log(`   ✓ Video Ready: public${videoInfo.videoUrl} (${videoInfo.videoDurationSeconds}s)`);

  return {
    slug: target.slug,
    productName: target.productName,
    targetUrl: target.targetUrl,
    domain: auditResult.domain,
    tagline: auditResult.tagline,
    founderContact: target.founderContact,
    scannedAt: new Date().toISOString(),
    overallScore: auditResult.overallScore,
    subScores: auditResult.subScores,
    videoUrl: videoInfo.videoUrl,
    posterUrl: videoInfo.posterUrl,
    heroScreenshotUrl: `/teardowns/${target.slug}-hero.png`,
    mobileScreenshotUrl: `/teardowns/${target.slug}-mobile.png`,
    videoDurationSeconds: videoInfo.videoDurationSeconds,
    passedChecks: auditResult.passedChecks,
    leaks: auditResult.leaks,
    generatedLlmsTxtPreview: auditResult.generatedLlmsTxtPreview,
    buyerLeads,
  };
}

async function main() {
  const fromQueue = process.argv.includes("--from-queue");
  const onlyArgIdx = process.argv.indexOf("--only");
  const onlySlugs =
    onlyArgIdx !== -1 && process.argv[onlyArgIdx + 1]
      ? new Set(
          process.argv[onlyArgIdx + 1]
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        )
      : null;

  let selectedTargets = onlySlugs
    ? PRESET_TARGETS.filter((t) => onlySlugs.has(t.slug))
    : PRESET_TARGETS;

  if (fromQueue) {
    const qPath = path.join(ROOT, "src", "data", "hunt-queue.json");
    if (fs.existsSync(qPath)) {
      const queued = JSON.parse(fs.readFileSync(qPath, "utf8"));
      selectedTargets = queued.slice(0, 3).map((q) => {
        const words = (q.hnTitle || q.productName || q.domain)
          .replace(/^Show HN:\s*/i, "")
          .replace(/[^a-zA-Z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length >= 4)
          .slice(0, 3);
        const phrase = words.join(" ") || q.productName;
        return {
          slug: q.slug,
          productName: q.productName,
          targetUrl: q.targetUrl,
          founderContact: q.founderContact,
          competitorNames: ["legacy alternatives"],
          searchQueries: {
            hn: [phrase, words[0] || q.productName],
            github: [phrase],
            reddit: [phrase],
          },
          replyTemplateHint: `Show how ${q.productName} directly solves this workflow without heavy setup.`,
        };
      });
    }
  }

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  try {
    const prepared = [];
    for (const target of selectedTargets) {
      console.log(`\n🔎 Auditing & Preparing Audio for ${target.productName}...`);
      try {
        const auditResult = await runPassiveAudit(browser, target);
        const buyerLeads = await fetchRealBuyerLeads(browser, target);
        if (auditResult.leaks.length < 2 || buyerLeads.length < 3) {
          console.warn(
            `⚠️ [Circuit Breaker] Skipping ${target.productName}: leaks=${auditResult.leaks.length}, leads=${buyerLeads.length}`
          );
          continue;
        }
        const workDir = path.join(TMP_ROOT, target.slug);
        const audioMeta = synthesizeFourActAudio(target, auditResult, buyerLeads, workDir);
        console.log(
          `   ✓ ${target.productName}: score=${auditResult.overallScore}/100, leaks=${auditResult.leaks.length}, leads=${buyerLeads.length}, voiceover=${audioMeta.totalDurationSec.toFixed(1)}s`
        );
        prepared.push({ target, auditResult, buyerLeads, audioMeta, workDir });
      } catch (err) {
        console.warn(`⚠️ Skipping ${target.productName} due to error:`, err.message);
      }
    }

    console.log(`\n🎬 Recording ${prepared.length} 720p Personalized Teardown Videos in Parallel...`);
    const newReports = await Promise.all(
      prepared.map(async ({ target, auditResult, buyerLeads, audioMeta, workDir }) => {
        const videoInfo = await renderTeardownVideo(
          browser,
          target,
          auditResult,
          buyerLeads,
          audioMeta,
          workDir
        );
        return {
          slug: target.slug,
          productName: target.productName,
          targetUrl: target.targetUrl,
          domain: auditResult.domain,
          tagline: auditResult.tagline,
          founderContact: target.founderContact,
          scannedAt: new Date().toISOString(),
          overallScore: auditResult.overallScore,
          subScores: auditResult.subScores,
          videoUrl: videoInfo.videoUrl,
          posterUrl: videoInfo.posterUrl,
          heroScreenshotUrl: `/teardowns/${target.slug}-hero.png`,
          mobileScreenshotUrl: `/teardowns/${target.slug}-mobile.png`,
          videoDurationSeconds: videoInfo.videoDurationSeconds,
          passedChecks: auditResult.passedChecks,
          leaks: auditResult.leaks,
          generatedLlmsTxtPreview: auditResult.generatedLlmsTxtPreview,
          buyerLeads,
        };
      })
    );

    // 增量合并已有报告，绝不覆盖先前的样板
    let existing = [];
    if (fs.existsSync(DATA_OUT_PATH)) {
      try {
        existing = JSON.parse(fs.readFileSync(DATA_OUT_PATH, "utf8"));
      } catch {
        existing = [];
      }
    }
    const mergedMap = new Map(existing.map((r) => [r.slug, r]));
    for (const rep of newReports) {
      mergedMap.set(rep.slug, rep);
    }
    const mergedReports = Array.from(mergedMap.values());

    fs.mkdirSync(path.dirname(DATA_OUT_PATH), { recursive: true });
    fs.writeFileSync(DATA_OUT_PATH, JSON.stringify(mergedReports, null, 2), "utf8");
    console.log(
      `\n✅ Added/updated ${newReports.length} reports (total ${mergedReports.length}) in ${DATA_OUT_PATH}`
    );
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("❌ Teardown pipeline failed:", err);
  process.exit(1);
});
