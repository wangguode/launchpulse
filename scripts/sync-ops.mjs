#!/usr/bin/env node
/**
 * LaunchPulse 内部指挥台同步脚本（适配 PocketBase / CSV / 终端实时看板）：
 * 1. 从线上 Cloudflare D1 (/api/admin/overview) 拉取全量猎物、热力与付费订单
 * 2. 自动导出本地 ops-data/latest-snapshot.json 与 ops-data/crm-outreach.csv（可直接导入 PocketBase Admin UI）
 * 3. 自动标出“视频看了 >=30s 却尚未付款”的高意向待追单名单
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENV_OPS_PATH = path.join(ROOT, ".env.ops");
const OPS_DATA_DIR = path.join(ROOT, "ops-data");

function loadAdminKey() {
  if (process.env.ADMIN_API_KEY) return process.env.ADMIN_API_KEY.trim();
  if (fs.existsSync(ENV_OPS_PATH)) {
    const raw = fs.readFileSync(ENV_OPS_PATH, "utf8");
    const m = raw.match(/^ADMIN_API_KEY=(.+)$/m);
    if (m) return m[1].trim();
  }
  return "";
}

function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
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
  fs.mkdirSync(OPS_DATA_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OPS_DATA_DIR, "latest-snapshot.json"),
    JSON.stringify(data, null, 2),
    "utf8"
  );

  // 生成可直接导入 PocketBase / NocoDB / Excel 的 CRM 追单表
  const csvHeader = [
    "slug",
    "recipient_email",
    "page_views",
    "max_video_seconds",
    "buyer_clicks",
    "follow_up_status",
    "last_event_at",
    "hot_followup_flag",
  ].join(",");
  const csvLines = [csvHeader];
  const hotFollowups = [];

  for (const row of data.outreach || []) {
    const isHot =
      (row.max_video_seconds >= 30 || row.buyer_clicks >= 1) &&
      row.follow_up_status !== "won";
    if (isHot) hotFollowups.push(row);
    csvLines.push(
      [
        row.slug,
        row.recipient_email,
        row.page_views,
        row.max_video_seconds,
        row.buyer_clicks,
        row.follow_up_status,
        row.last_event_at,
        isHot ? "HOT_FOLLOWUP" : "NORMAL",
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  fs.writeFileSync(path.join(OPS_DATA_DIR, "crm-outreach.csv"), csvLines.join("\n"), "utf8");

  const totalSent = (data.outreach || []).length;
  const openedCount = (data.outreach || []).filter((r) => Number(r.page_views || 0) > 0).length;
  const openRatePct = totalSent > 0 ? Math.round((openedCount / totalSent) * 100) : 0;
  const activeOrders = (data.orders || []).filter((o) => o.status === "active");
  const totalRevenueUsd = activeOrders.reduce((acc, o) => acc + Number(o.amount_usd || 0), 0);
  const activeMrrUsd = activeOrders
    .filter((o) => o.plan === "radar")
    .reduce((acc, o) => acc + Number(o.amount_usd || 0), 0);

  console.log(`\n📊 LaunchPulse Live Ops & Revenue Snapshot (${data.syncedAt})`);
  console.log("=".repeat(68));
  console.log(
    `Targets: ${data.leads.length} | Sent: ${totalSent} | Open Rate: ${openRatePct}% | Hot Follow-ups: ${hotFollowups.length}`
  );
  console.log(
    `💰 Active Orders: ${activeOrders.length} | Total Revenue: $${totalRevenueUsd} | Active MRR: $${activeMrrUsd}/mo`
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
  if (hotFollowups.length > 0) {
    console.log("\n🎯 High-Intent Follow-up Targets (Watched >=30s or Clicked Buyers):");
    for (const h of hotFollowups) {
      console.log(`  → ${h.slug} (${h.recipient_email}) — MaxVideo=${h.max_video_seconds}s, Clicks=${h.buyer_clicks}`);
    }
  }
  if (data.orders.length > 0) {
    console.log("\n💰 Paid Customers (Creem Webhook):");
    for (const o of data.orders) {
      console.log(`  • ${o.customer_email} | ${o.plan} ($${o.amount_usd}) | status=${o.status}`);
    }
  }
  console.log(`\n💾 Exported PocketBase/CRM snapshot -> ops-data/crm-outreach.csv\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
