#!/usr/bin/env node
/**
 * LaunchPulse 每日全自动猎物雷达（scripts/daily-hunt.mjs）
 * 1. 从 Hacker News Show HN 实时抓取最新上线的海外独立 SaaS
 * 2. 自动去重（跳过已生成报告的域名）
 * 3. 被动无害校验：必须包含 Pricing 商业变现信号 + 公开创始人联系邮箱 + >= 2 处真实 SEO/AEO/安全头缺陷
 * 4. 输出可直接送入 generate-teardown.mjs 的标准化猎物队列文件 src/data/hunt-queue.json
 */

import fs from "node:fs";
import path from "node:path";
import dns from "node:dns/promises";

const ROOT = process.cwd();
const EXISTING_AUDITS_PATH = path.join(ROOT, "src", "data", "generated-audits.json");
const QUEUE_OUT_PATH = path.join(ROOT, "src", "data", "hunt-queue.json");

const SKIP_DOMAINS = [
  "github.com",
  "youtube.com",
  "npmjs.com",
  "pypi.org",
  "huggingface.co",
  "crates.io",
  "apps.apple.com",
  "play.google.com",
  "medium.com",
  "substack.com",
  "arxiv.org",
  "wikipedia.org",
];

const BAD_EMAIL_FRAGMENTS = [
  "example.com",
  "company.com",
  "yourdomain",
  "sentry",
  "wixpress",
  "noreply",
  ".png",
  ".jpg",
  ".svg",
  "you@",
  "user@",
  "name@",
];

function loadExistingTrackers() {
  const domains = new Set();
  const emails = new Set();
  if (fs.existsSync(EXISTING_AUDITS_PATH)) {
    try {
      const arr = JSON.parse(fs.readFileSync(EXISTING_AUDITS_PATH, "utf8"));
      for (const item of arr) {
        if (item.domain) domains.add(item.domain.toLowerCase());
        if (item.founderContact) emails.add(item.founderContact.toLowerCase());
      }
    } catch {
      // ignore
    }
  }
  return { domains, emails };
}

/**
 * V35：前置验活目标邮箱域名 MX 记录，过滤无效死邮箱以保护发信信誉
 */
async function hasValidEmailMx(email) {
  const domain = (email.split("@")[1] || "").trim().toLowerCase();
  if (!domain) return false;
  try {
    const mx = await dns.resolveMx(domain);
    return Array.isArray(mx) && mx.length > 0;
  } catch {
    return false;
  }
}

async function passiveFetch(url, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) LaunchPulseHunter/1.0",
      },
    });
    const text = (await res.text()).slice(0, 180000);
    return { ok: res.ok, status: res.status, headers: res.headers, text };
  } catch {
    return { ok: false, status: 0, headers: new Headers(), text: "" };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const limit = Number(process.argv[2] || 6);
  const { domains: existingDomains, emails: existingEmails } = loadExistingTrackers();
  console.log(
    `🔎 Hunting fresh commercial SaaS launches (tracked domains: ${existingDomains.size}, emails: ${existingEmails.size})...`
  );

  const hnRes = await fetch(
    "https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&hitsPerPage=100"
  );
  const hnData = await hnRes.json();
  const qualified = [];

  for (const hit of hnData.hits || []) {
    if (qualified.length >= limit) break;
    const rawUrl = (hit.url || "").trim();
    const title = (hit.title || "").trim();
    if (!rawUrl.startsWith("https://")) continue;

    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      continue;
    }
    const domain = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (existingDomains.has(domain) || SKIP_DOMAINS.some((s) => domain.includes(s))) continue;
    // 剔除非商业 SaaS 的小游戏、导览、博客、小说与测验类玩具站
    if (/\b(game|puzzle|sudoku|wordle|tour|map tour|novel|poem|podcast|gallery|quiz|rpg|flash)\b/i.test(title)) {
      continue;
    }

    const home = await passiveFetch(parsed.origin, 5500);
    if (!home.ok) continue;

    const hasPricing = /pricing|\$\d+|\/mo\b|\/month\b|stripe|lemonsqueezy|paddle|creem/i.test(
      home.text
    );
    if (!hasPricing) continue;

    const rawEmails = home.text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const emails = [...new Set(rawEmails)].filter(
      (e) =>
        !BAD_EMAIL_FRAGMENTS.some((bad) => e.toLowerCase().includes(bad)) &&
        !existingEmails.has(e.toLowerCase())
    );
    if (emails.length === 0) continue;
    const validMx = await hasValidEmailMx(emails[0]);
    if (!validMx) continue;

    const llms = await passiveFetch(`${parsed.origin}/llms.txt`, 4000);
    const llmsMissing = !llms.ok || /<!doctype html|<html[\s>]/i.test(llms.text.slice(0, 300));
    const leaks = [];
    if (llmsMissing) leaks.push("missing_llms_txt");
    if (!/application\/ld\+json/i.test(home.text)) leaks.push("missing_json_ld");
    if (!home.headers.get("content-security-policy")) leaks.push("missing_csp");
    if (!home.headers.get("x-frame-options")) leaks.push("missing_xfo");
    if (!/\b(\/vs\/|alternatives?|compare)\b/i.test(home.text)) leaks.push("missing_vs_pages");

    if (leaks.length >= 2) {
      const slug = domain.split(".")[0].replace(/[^a-z0-9]/g, "");
      existingDomains.add(domain);
      const item = {
        slug,
        productName: title.replace(/^Show HN:\s*/i, "").split(/[–—:-]/)[0].trim().slice(0, 36),
        targetUrl: parsed.origin,
        domain,
        founderContact: emails[0],
        detectedLeaks: leaks,
        hnTitle: title,
      };
      qualified.push(item);
      console.log(`  ✅ QUALIFIED: ${item.productName} (${item.targetUrl}) | ${item.founderContact} | leaks=${leaks.join(",")}`);
    }
  }

  fs.mkdirSync(path.dirname(QUEUE_OUT_PATH), { recursive: true });
  fs.writeFileSync(QUEUE_OUT_PATH, JSON.stringify(qualified, null, 2), "utf8");
  console.log(`\n📦 Saved ${qualified.length} fresh qualified targets to ${QUEUE_OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
