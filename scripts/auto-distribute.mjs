#!/usr/bin/env node
/**
 * LaunchPulse 核心目录投流半自动预填引擎（Human-in-the-Loop Playwright Assistant）
 * -------------------------------------------------------------------------------
 * 用法：
 *   node scripts/auto-distribute.mjs <customer_email> [--limit 10] [--dry-run]
 *
 * 工作流：
 *   1. 从 Cloudflare D1 (/api/admin/dashboard) 自动拉取该客户的推广档案与专属归因短链 (/r/...)
 *   2. 过滤出尚未提交的高 DR 目录，在可视化浏览器中依次打开目录提交页
 *   3. 自动识别并预填常见表单字段（产品名、追踪短链/官网 URL、一句话卖点、联系邮箱）
 *   4. 遇到登录或人机验证时交由运营人员合规人工核验并点击提交，绝不绕过任何验证
 *   5. 运营确认后，自动回写 Cloudflare D1 (/api/admin/directory-update)，客户前台秒级点亮进度
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadEnvOps() {
  const envPath = path.join(ROOT, ".env.ops");
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return out;
}

function loadDirectories() {
  const src = fs.readFileSync(path.join(ROOT, "src/data/directories.ts"), "utf8");
  const rows = [];
  const regex =
    /\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*url:\s*"([^"]+)",\s*dr:\s*(\d+),\s*category:\s*"([^"]+)"/g;
  let m;
  while ((m = regex.exec(src)) !== null) {
    rows.push({ id: m[1], name: m[2], url: m[3], dr: Number(m[4]), category: m[5] });
  }
  return rows;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

async function main() {
  const args = process.argv.slice(2);
  const email = (args.find((a) => !a.startsWith("--")) || "").trim().toLowerCase();
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Math.max(1, Number(args[limitIdx + 1] || 10)) : 10;
  const dryRun = args.includes("--dry-run");

  if (!email || !email.includes("@")) {
    console.error("Usage: node scripts/auto-distribute.mjs <customer_email> [--limit 10] [--dry-run]");
    process.exit(1);
  }

  const env = loadEnvOps();
  const adminKey = process.env.ADMIN_API_KEY || env.ADMIN_API_KEY;
  if (!adminKey) {
    console.error("❌ Missing ADMIN_API_KEY in .env.ops or environment.");
    process.exit(1);
  }

  const apiBase = "https://pulse.statementflow.win";
  const dashRes = await fetch(`${apiBase}/api/admin/dashboard`, {
    headers: { "x-admin-key": adminKey },
  });
  if (!dashRes.ok) {
    console.error(`❌ Failed to fetch admin dashboard: HTTP ${dashRes.status}`);
    process.exit(1);
  }
  const dash = await dashRes.json();
  const campaign = (dash.campaigns || []).find((c) => c.user_email === email);
  if (!campaign) {
    console.error(`❌ No campaign found for ${email}. Ask the customer to save their SaaS in /dashboard first.`);
    process.exit(1);
  }

  const dirLink = (dash.links || []).find(
    (l) => l.user_email === email && l.channel === "directory"
  );
  const promoUrl = dirLink ? `${apiBase}/r/${dirLink.code}` : campaign.target_url;
  const doneSet = new Set(
    (dash.directories || [])
      .filter((d) => d.customer_email === email && (d.status === "submitted" || d.status === "live"))
      .map((d) => d.directory_id)
  );

  const allDirs = loadDirectories();
  const queue = allDirs.filter((d) => !doneSet.has(d.id)).slice(0, limit);

  console.log(`\n🚀 LaunchPulse Distribution Assistant`);
  console.log(`   Customer : ${email}`);
  console.log(`   Product  : ${campaign.product_name}`);
  console.log(`   Promo URL: ${promoUrl} (Target: ${campaign.target_url})`);
  console.log(`   Tagline  : ${campaign.tagline || "(none)"}`);
  console.log(`   Queue    : ${queue.length} directories (${doneSet.size}/${allDirs.length} already done)\n`);

  if (dryRun || queue.length === 0) {
    for (const d of queue) console.log(`   - [DR ${d.dr}] ${d.name} (${d.url})`);
    console.log(dryRun ? "\n✅ Dry-run complete." : "\n✅ All directories already processed!");
    return;
  }

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("❌ Playwright is not installed in this Node path. Install via: npm i -D playwright");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await context.newPage();

  for (const dir of queue) {
    console.log(`\n🌐 Opening [DR ${dir.dr}] ${dir.name} -> ${dir.url}`);
    try {
      await page.goto(dir.url, { waitUntil: "domcontentloaded", timeout: 25000 });
      // 智能预填常见表单字段（不自动提交，留给运营人工复核并点击）
      await page.evaluate(
        ({ name, url, tagline, email }) => {
          const fill = (selectors, val) => {
            if (!val) return;
            for (const sel of selectors) {
              const el = document.querySelector(sel);
              if (el && !el.value) {
                el.focus();
                el.value = val;
                el.dispatchEvent(new Event("input", { bubbles: true }));
                el.dispatchEvent(new Event("change", { bubbles: true }));
                return;
              }
            }
          };
          fill(['input[name*="name" i]', 'input[placeholder*="name" i]', 'input[name*="title" i]'], name);
          fill(['input[type="url"]', 'input[name*="url" i]', 'input[name*="website" i]', 'input[placeholder*="https" i]'], url);
          fill(['input[type="email"]', 'input[name*="email" i]'], email);
          fill(['textarea[name*="desc" i]', 'textarea[placeholder*="desc" i]', 'input[name*="tagline" i]'], tagline);
        },
        { name: campaign.product_name, url: promoUrl, tagline: campaign.tagline, email }
      );
    } catch (e) {
      console.log(`   ⚠️ Page load warning: ${e.message}`);
    }

    const ans = await ask(
      `   👉 Review & submit in browser. Press [Enter]=submitted, paste [https://...]=live backlink, or [s]=skip: `
    );
    if (ans.toLowerCase() === "s") {
      console.log("   ⏭️ Skipped.");
      continue;
    }

    const isLive = /^https?:\/\//i.test(ans);
    const updRes = await fetch(`${apiBase}/api/admin/directory-update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({
        customerEmail: email,
        slug: campaign.slug,
        directoryId: dir.id,
        directoryName: dir.name,
        directoryUrl: dir.url,
        dr: dir.dr,
        category: dir.category,
        status: isLive ? "live" : "submitted",
        liveBacklinkUrl: isLive ? ans : "",
      }),
    });
    console.log(updRes.ok ? `   ✅ Synced to D1 (${isLive ? "live" : "submitted"})` : `   ❌ Sync failed: ${updRes.status}`);
  }

  await browser.close();
  console.log("\n🎉 Distribution batch finished!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
