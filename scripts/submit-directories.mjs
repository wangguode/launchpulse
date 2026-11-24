#!/usr/bin/env node
/**
 * LaunchPulse 50+ 目录外链交付回写工具（scripts/submit-directories.mjs）
 * 接到 $39 订单并实际提交目录后，一键将真实状态（submitted / live）与外链 URL 写入远端 D1，
 * 客户的 /portal 看板立即实时更新并支持 CSV 导出。
 *
 * 用法：
 *   node scripts/submit-directories.mjs <customerEmail> <slug> <directoryId> <submitted|live> [liveBacklinkUrl]
 */

import fs from "node:fs";
import path from "node:path";

const [customerEmail, slug, directoryId, status = "submitted", liveBacklinkUrl = ""] =
  process.argv.slice(2);

if (!customerEmail || !slug || !directoryId) {
  console.error(
    "Usage: node scripts/submit-directories.mjs <customerEmail> <slug> <directoryId> <submitted|live> [liveBacklinkUrl]"
  );
  process.exit(1);
}

const envOps = fs.readFileSync(path.join(process.cwd(), ".env.ops"), "utf8");
const adminKey = envOps.match(/^ADMIN_API_KEY=(.+)$/m)?.[1]?.trim();
if (!adminKey) {
  console.error("Missing ADMIN_API_KEY in .env.ops");
  process.exit(1);
}

const res = await fetch("https://pulse.statementflow.win/api/admin/directory-update", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
  body: JSON.stringify({
    customerEmail,
    slug,
    directoryId,
    status,
    liveBacklinkUrl,
  }),
});

console.log("HTTP", res.status, await res.text());
