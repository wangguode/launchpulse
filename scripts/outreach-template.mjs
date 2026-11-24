#!/usr/bin/env node
/**
 * LaunchPulse 合规极简创始人直邮模板生成器（V32：内置 CAN-SPAM / GDPR 退订声明）
 * 用法：node scripts/outreach-template.mjs <slug>
 */

import fs from "node:fs";
import path from "node:path";

const slug = (process.argv[2] || "").trim().toLowerCase();
const audits = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "src/data/generated-audits.json"), "utf8")
);
const target = audits.find((a) => a.slug === slug) || audits[0];

if (!target) {
  console.error("No audit found.");
  process.exit(1);
}

const topLeak = target.leaks[0]?.title || "missing /llms.txt AI search manifest";

console.log(`TO: ${target.founderContact || "founder@" + target.domain}`);
console.log(`SUBJECT: Quick 80s teardown for ${target.domain} + 3 recent dev threads`);
console.log("---");
console.log(`Hey ${target.productName} team,

Saw your launch — super clean execution on ${target.domain}. I ran a passive read-only launch check (noticed ${topLeak}) and pulled ${target.buyerLeads.length} recent (<45 days) developer threads hitting this exact pain point.

Put the 80s video walkthrough + the first 3 live thread links (unlocked free to click & reply) here:
https://pulse.statementflow.win/audit/${target.slug}

No pressure at all — hope those 3 threads bring a couple signups this week.

— Guo
LaunchPulse (hello@statementflow.win)
(Reply "stop" anytime and I'll remove your report immediately.)`);
