#!/usr/bin/env node
/**
 * LaunchPulse 内部指挥台同步脚本：
 * 从线上 Cloudflare D1 (/api/admin/overview) 实时拉取：
 *   - 猎物池 (leads_targets)
 *   - 发信与视频观看热力 (outreach_logs: 打开次数 / 视频播放最大秒数 / 买家链接点击数)
 *   - Creem 实时付费订单台账 (customers_orders)
 * 并一键打印实时经营漏斗报表（同时可推送至本地 PocketBase Admin UI）。
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENV_OPS_PATH = path.join(ROOT, ".env.ops");

function loadAdminKey() {
  if (process.env.ADMIN_API_KEY) return process.env.ADMIN_API_KEY.trim();
  if (fs.existsSync(ENV_OPS_PATH)) {
    const raw = fs.readFileSync(ENV_OPS_PATH, "utf8");
    const m = raw.match(/^ADMIN_API_KEY=(.+)$/m);
    if (m) return m[1].trim();
  }
  return "";
}

async function main() {
  const adminKey = loadAdminKey();
  if (!adminKey) {
    console.error("❌ Missing ADMIN_API_KEY in .env.ops or environment.");
    process.exit(1);
  }

  const res = await fetch("https://pulse.statementflow.win/api/admin/overview", {
    headers: { "x-admin-key": adminKey },
  });

  if (!res.ok) {
    console.error(`❌ Failed to sync from Cloudflare D1: HTTP ${res.status}`);
    process.exit(1);
  }

  const data = await res.json();
  console.log(`\n📊 LaunchPulse Live Ops Snapshot (${data.syncedAt})`);
  console.log("=".repeat(64));
  console.log(
    `Targets: ${data.leads.length} | Emailed/Tracked: ${data.outreach.length} | Paid Orders: ${data.orders.length}`
  );
  console.log("\n🔥 Outreach & Video Watch Heatmap:");
  for (const row of data.outreach) {
    console.log(
      `  • ${row.slug.padEnd(14)} | Views: ${String(row.page_views).padStart(
        2
      )} | MaxVideo: ${String(row.max_video_seconds).padStart(3)}s | BuyerClicks: ${
        row.buyer_clicks
      } | Status: ${row.follow_up_status}`
    );
  }
  if (data.orders.length > 0) {
    console.log("\n💰 Paid Customers (Creem Webhook):");
    for (const o of data.orders) {
      console.log(
        `  • ${o.customer_email} | ${o.plan} ($${o.amount_usd}) | status=${o.status}`
      );
    }
  }
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
