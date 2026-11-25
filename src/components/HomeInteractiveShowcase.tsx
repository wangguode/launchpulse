"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  FileCode2,
  Globe,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { DISTRIBUTION_DIRECTORIES } from "@/data/directories";

interface ShowcaseProps {
  locale: "en" | "zh" | "ja";
}

/**
 * 首页首屏下方的 4-Tab 交互式真实产品沙盒（macOS 窗口形态）
 * 访客无需注册即可在首页直接切换体验 LaunchPulse V4 四大核心引擎。
 */
export function HomeInteractiveSandbox({ locale }: ShowcaseProps) {
  const isZh = locale === "zh";
  const isJa = locale === "ja";
  const [tab, setTab] = useState<"funnel" | "dirs" | "radar" | "aeo">("funnel");

  const tabs = [
    { id: "funnel" as const, icon: BarChart3, label: isZh ? "营收归因漏斗" : isJa ? "収益ファネル" : "Revenue Funnel" },
    { id: "dirs" as const, icon: Globe, label: isZh ? "100+ 目录验活" : isJa ? "100+ 掲載確認" : "100+ Directories" },
    { id: "radar" as const, icon: Radar, label: isZh ? "24/7 买家雷达" : isJa ? "24/7 レーダー" : "Buyer Radar Pro" },
    { id: "aeo" as const, icon: ShieldCheck, label: isZh ? "12 维 AEO 体检" : isJa ? "AEO 診断" : "12-Point AEO" },
  ];

  return (
    <div className="pt-8">
      <div className="rounded-[22px] border border-[var(--apple-border)] bg-[var(--apple-surface)] overflow-hidden text-left shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
        {/* macOS 顶栏 + 4-Tab 切换条 */}
        <div className="px-4 py-2.5 border-b border-[var(--apple-border)] bg-[var(--apple-bg)] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            <span className="hidden md:inline ml-2 text-[11px] font-mono text-[var(--apple-ink-tertiary)]">
              pulse.statementflow.win/dashboard
            </span>
          </div>

          <div className="inline-flex items-center rounded-[9px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-0.5 text-[11px] overflow-x-auto max-w-full">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] font-medium transition whitespace-nowrap cursor-pointer ${
                    active
                      ? "bg-[var(--apple-blue)] text-white"
                      : "text-[var(--apple-ink-secondary)] hover:text-[var(--apple-ink)]"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <Link
            href="/dashboard?sample=1"
            className="text-[11px] text-[var(--apple-blue)] hover:underline font-medium whitespace-nowrap"
          >
            {isZh ? "进入完整沙盒 ›" : isJa ? "フルデモ ›" : "Open Full Sandbox ›"}
          </Link>
        </div>

        {/* 沙盒主内容区 */}
        <div className="p-5 sm:p-7">
          {tab === "funnel" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--apple-border)] rounded-[14px] border border-[var(--apple-border)] bg-[var(--apple-bg)] tabular-nums">
                {[
                  { l: isZh ? "30 天导流点击" : "30D Referral Clicks", v: "1,408", hint: "+24.8% vs prev" },
                  { l: isZh ? "验证注册 / 付费" : "Signups / Paid", v: "54 / 18", hint: "5.1% CVR" },
                  { l: isZh ? "归因美元营收" : "Attributed Revenue", v: "$2,088", accent: true, hint: "RPV $1.48" },
                  { l: isZh ? "对比 $39 成本 ROI" : "ROI vs $39 Blitz", v: "53.5×", hint: "34/100 live" },
                ].map((m) => (
                  <div key={m.l} className="p-4 space-y-1">
                    <p className="text-[11px] text-[var(--apple-ink-secondary)]">{m.l}</p>
                    <p className={`apple-display text-2xl font-semibold ${m.accent ? "text-[var(--apple-blue)]" : "text-[var(--apple-ink)]"}`}>
                      {m.v}
                    </p>
                    <p className="text-[10px] text-[var(--apple-green)] font-medium">{m.hint}</p>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2 rounded-[14px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-4 space-y-2">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-[var(--apple-ink)]">
                      {isZh ? "外链与社区引流 → 营收增长曲线（AcmeFlow 实测样本）" : "Distribution Clicks & Revenue Curve (Sample)"}
                    </span>
                    <Link href="/report/demo-acmeflow" className="text-[11px] text-[var(--apple-blue)] hover:underline">
                      {isZh ? "公开战报页 ↗" : "Public Report ↗"}
                    </Link>
                  </div>
                  <svg viewBox="0 0 460 95" className="w-full h-24 overflow-visible">
                    <defs>
                      <linearGradient id="v4HeroGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--apple-blue)" stopOpacity="0.24" />
                        <stop offset="100%" stopColor="var(--apple-blue)" stopOpacity="0.01" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 84 L45 78 L90 71 L135 73 L180 58 L225 51 L270 43 L315 38 L360 27 L405 21 L460 12 L460 95 L0 95 Z"
                      fill="url(#v4HeroGrad)"
                    />
                    <path
                      d="M0 84 L45 78 L90 71 L135 73 L180 58 L225 51 L270 43 L315 38 L360 27 L405 21 L460 12"
                      fill="none"
                      stroke="var(--apple-blue)"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div className="rounded-[14px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-4 space-y-2.5 text-[12px] tabular-nums">
                  <p className="font-semibold text-[var(--apple-ink)]">{isZh ? "渠道单客产值 (RPV)" : "Channel Revenue & RPV"}</p>
                  {[
                    { name: "100+ Directories", rev: "$1,102", rpv: "$1.40/click" },
                    { name: "HN / GitHub Radar", rev: "$725", rpv: "$1.78/click" },
                    { name: "Competitor /vs/", rev: "$261", rpv: "$1.23/click" },
                  ].map((c) => (
                    <div key={c.name} className="flex items-center justify-between py-1.5 border-b last:border-0 border-[var(--apple-border)]">
                      <div>
                        <p className="font-medium text-[var(--apple-ink)]">{c.name}</p>
                        <p className="text-[10px] text-[var(--apple-ink-tertiary)]">{c.rpv}</p>
                      </div>
                      <span className="font-semibold text-[var(--apple-green)]">{c.rev}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "dirs" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-[12px] tabular-nums">
                {[
                  { w: "Week 1 · Tier 1 (DR 70–91)", pct: "100%", note: "30/30 live & verified" },
                  { w: "Week 2 · AI/SaaS (DR 50–69)", pct: "68%", note: "24/35 paced release" },
                  { w: "Week 3 · Launchpads", pct: "35%", note: "Scheduled natural drip" },
                ].map((x) => (
                  <div key={x.w} className="rounded-[12px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-3">
                    <p className="font-semibold text-[var(--apple-ink)] truncate">{x.w}</p>
                    <p className="text-[11px] text-[var(--apple-blue)] font-medium mt-0.5">{x.pct} · {x.note}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-[12px] border border-[var(--apple-border)] bg-[var(--apple-bg)] divide-y divide-[var(--apple-border)] text-[12px] tabular-nums">
                {DISTRIBUTION_DIRECTORIES.slice(0, 5).map((d) => (
                  <div key={d.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--apple-green)] shrink-0" />
                      <span className="font-semibold text-[var(--apple-ink)] truncate">{d.name}</span>
                      <span className="hidden sm:inline text-[11px] text-[var(--apple-ink-tertiary)]">{d.monthlyTraffic}/mo</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-[var(--apple-surface)] border border-[var(--apple-border)] text-[10px]">
                        {d.linkType}
                      </span>
                      <span className="font-mono font-semibold text-[var(--apple-ink)]">DR {d.dr}</span>
                      <span className="text-[11px] text-[var(--apple-green)] font-medium">HTTP 200 ✓</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "radar" && (
            <div className="grid md:grid-cols-2 gap-4 text-[12px]">
              <div className="space-y-2.5">
                {[
                  {
                    src: "Hacker News",
                    intent: "Buying · 96%",
                    title: "Looking for a simple SSL certificate & domain expiry monitor (no bloat)",
                    author: "@devops_mike · 4h ago",
                  },
                  {
                    src: "GitHub Issues",
                    intent: "Alternative · 95%",
                    title: "Cheaper alternative to Better Stack for a 3-person dev shop?",
                    author: "@sarah_sre · 1d ago",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-[12px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--apple-ink)]">{item.src}</span>
                      <span className="px-2 py-0.5 rounded-full bg-[var(--apple-blue-soft)] text-[var(--apple-blue)] text-[10px] font-semibold">
                        {item.intent}
                      </span>
                    </div>
                    <p className="font-medium text-[var(--apple-ink)] leading-snug">{item.title}</p>
                    <p className="text-[11px] text-[var(--apple-ink-tertiary)]">{item.author}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-[12px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--apple-blue)] inline-flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    {isZh ? "原生防封号回复预览（Peer 视角）" : "Native Anti-Spam Reply Draft"}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--apple-green-soft)] text-[var(--apple-green)]">
                    Zero-Spam ✓
                  </span>
                </div>
                <p className="text-[var(--apple-ink-secondary)] leading-relaxed">
                  &ldquo;We hit this exact silent cert expiry headache last quarter. Separating TLS handshake polling from our main CI pipeline caught 3 silent Let&apos;s Encrypt renewal failures before prod outage. Happy to share our checklist or the tiny tool we built around it...&rdquo;
                </p>
              </div>
            </div>
          )}

          {tab === "aeo" && (
            <div className="grid md:grid-cols-2 gap-4 text-[12px]">
              <div className="rounded-[12px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-4 space-y-2.5">
                <p className="font-semibold text-[var(--apple-ink)]">{isZh ? "AI 搜索爬虫放行检测" : "AI Search Crawler Check"}</p>
                {["GPTBot (ChatGPT)", "OAI-SearchBot", "ClaudeBot (Anthropic)", "PerplexityBot"].map((b) => (
                  <div key={b} className="flex items-center justify-between py-1 border-b last:border-0 border-[var(--apple-border)]">
                    <span className="font-mono text-[var(--apple-ink)]">{b}</span>
                    <span className="text-[var(--apple-green)] font-medium">Allowed ✓</span>
                  </div>
                ))}
              </div>
              <div className="rounded-[12px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-4 space-y-2.5">
                <p className="font-semibold text-[var(--apple-ink)]">{isZh ? "AEO / SEO 实体与安全基线" : "AEO & Security Signals"}</p>
                {[
                  { k: "/llms.txt Entity Manifest", ok: true },
                  { k: "SoftwareApplication JSON-LD", ok: true },
                  { k: "OpenGraph & Twitter Social Card", ok: true },
                  { k: "HSTS + CSP + X-Frame-Options", ok: true },
                ].map((item) => (
                  <div key={item.k} className="flex items-center justify-between py-1 border-b last:border-0 border-[var(--apple-border)]">
                    <span className="text-[var(--apple-ink-secondary)]">{item.k}</span>
                    <span className="text-[var(--apple-green)] font-medium">Verified ✓</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 首页 V4 增量高转化板块：
 * 1. 可搜索 100+ 目录预览墙
 * 2. 交互式 ROI & 工时回报计算器
 * 3. 免费 SEO 裂变工具箱入口
 * 4. 异议消除 FAQ 手风琴
 */
export function HomeGrowthModules({ locale }: ShowcaseProps) {
  const isZh = locale === "zh";
  const [dirSearch, setDirSearch] = useState("");
  const [productPrice, setProductPrice] = useState(29);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const previewDirs = useMemo(() => {
    const q = dirSearch.trim().toLowerCase();
    const list = q
      ? DISTRIBUTION_DIRECTORIES.filter(
          (d) => d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)
        )
      : DISTRIBUTION_DIRECTORIES;
    return list.slice(0, 8);
  }, [dirSearch]);

  const paybackSales = Math.max(1, Math.ceil(39 / Math.max(5, productPrice)));
  const projectedMonthlyRev = Math.round(productPrice * 14);

  const faqs = isZh
    ? [
        {
          q: "你们是机器人垃圾群发，还是人工逐站精选提交？会被 Google 降权吗？",
          a: "绝对不做垃圾群发。我们在后台用合规辅助预填提效，但每一站均由专人核验分类、Logo、简介并按 Week 1→3 自然节奏分批上线，同时每日自动校验 HTTP 200 与 dofollow 状态，完全符合 Google 自然外链节奏。",
        },
        {
          q: "为什么同类服务 ListingBott / BoringLaunch 卖 $149–$499，你们 $39 就能启动？",
          a: "我们把 Brand Launch Kit 资料标准化、边缘短链归因与自动验活做成了自研 Cloudflare 平台，把人工沟通成本压到了最低。$39 的 Launch Blitz 覆盖 50+ 精选高权重站，先用压倒性性价比帮独立开发者跑出真实点击与外链；如需 100+ 全包与官网 PR 代改可升级 $299 档。",
        },
        {
          q: "24/7 买家雷达 Pro 和已关停的 GummySearch / 昂贵的 Octolens ($159/月) 有何区别？",
          a: "GummySearch 已宣布退场，Octolens 起步价 $159/月。LaunchPulse Growth OS Pro 仅 $29/月，内置自定义痛点词/竞品词/排除词规则引擎、HN/GitHub/DEV.to/Lobste.rs 多源实时扫描、CRM 状态流转、3 风格防封号回复抽屉以及 Slack/Discord Webhook 推送。",
        },
        {
          q: "怎么证明流量和转化是真的来自你们的投流？",
          a: "我们为你的每个渠道自动签发边缘归因短链（/r/...）并提供 1 行零 Cookie 转化像素（pixel.js）。每一次目录点击、国家、来路域名与注册/付款转化都实时可查，还能一键生成公开只读战报页（/report/...）打印 PDF 或分享给合伙人。",
        },
      ]
    : [
        {
          q: "Is this spammy bot blasting, or human-verified paced submissions?",
          a: "Zero spam blasting. Every listing is human-verified using your Brand Launch Kit and released in natural weekly waves (Week 1 Authority DR 70–91 → Week 2 AI/SaaS → Week 3 Launchpads), with daily automated HTTP 200 & dofollow health checks.",
        },
        {
          q: "Why do ListingBott / BoringLaunch charge $149–$499 while LaunchPulse starts at $39?",
          a: "Our unified Brand Launch Vault, edge attribution, and verification tooling eliminate manual back-and-forth overhead. The $39 Launch Blitz lets indie founders prove real backlinks and referral clicks with near-zero risk before scaling to Growth OS Pro ($29/mo) or Concierge 100+ ($299).",
        },
        {
          q: "How does Buyer Radar Pro compare to GummySearch (shutting down) or Octolens ($159/mo)?",
          a: "At $29/mo, LaunchPulse includes custom keyword/competitor/exclusion rules, live multi-source scanning (Hacker News, GitHub, DEV.to, Lobste.rs), CRM lead stages, a 3-tone anti-spam native reply studio, and Slack/Discord webhooks.",
        },
        {
          q: "How do I verify that clicks and revenue actually came from LaunchPulse?",
          a: "Every channel gets a dedicated Cloudflare edge shortlink (/r/...) plus a 1-line zero-cookie conversion pixel (pixel.js). Track exact clicks, signups, revenue, RPV, and ROI—and export a live public growth report (/report/...) anytime.",
        },
      ];

  return (
    <>
      {/* 1. 100+ 目录实时预览墙 */}
      <section className="bg-[var(--apple-bg)] border-t border-[var(--apple-border)] py-20 px-4 sm:px-6">
        <div className="max-w-[1040px] mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-xl">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--apple-blue)]">
                {isZh ? "100+ 实测可提交高权重目录库（DR 38–91）" : "100+ VERIFIED HIGH-DR DIRECTORIES (DR 38–91)"}
              </p>
              <h2 className="apple-display text-3xl sm:text-4xl font-semibold text-[var(--apple-ink)]">
                {isZh ? "拒绝黑盒名单：下单前先查真实目录成色" : "Inspect the Exact High-DR Sites Before You Pay"}
              </h2>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-[var(--apple-ink-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={dirSearch}
                onChange={(e) => setDirSearch(e.target.value)}
                placeholder={isZh ? "搜索 SourceForge / AlternativeTo..." : "Filter SourceForge, SaaSHub..."}
                className="w-full h-10 pl-9 pr-3.5 rounded-full border border-[var(--apple-border-strong)] bg-[var(--apple-surface)] text-[14px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 tabular-nums">
            {previewDirs.map((d) => (
              <div
                key={d.id}
                className="rounded-[16px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[14px] font-semibold text-[var(--apple-ink)]">{d.name}</p>
                    <p className="text-[11px] text-[var(--apple-ink-tertiary)]">{d.category}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--apple-blue-soft)] text-[var(--apple-blue)] text-[11px] font-semibold">
                    DR {d.dr}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[var(--apple-ink-secondary)] pt-2 border-t border-[var(--apple-border)]">
                  <span>{d.monthlyTraffic}/mo</span>
                  <span className={d.linkType === "dofollow" ? "text-[var(--apple-green)] font-medium" : ""}>
                    {d.linkType}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/tools/directory-finder"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--apple-blue)] hover:underline"
            >
              {isZh ? "浏览并筛选全部 100 个目录站与官方提交入口" : "Browse & filter all 100 curated directories"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. 交互式 ROI & 工时回报计算器 */}
      <section className="bg-[var(--apple-surface)] border-t border-[var(--apple-border)] py-20 px-4 sm:px-6">
        <div className="max-w-[960px] mx-auto rounded-[24px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-6 sm:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--apple-blue)]">
                {isZh ? "互动 ROI 回本测算器" : "INTERACTIVE ROI CALCULATOR"}
              </p>
              <h2 className="apple-display text-2xl sm:text-3xl font-semibold text-[var(--apple-ink)]">
                {isZh ? "算清你的 SaaS 需要几单就能收回 $39 分发成本" : "See How Fast $39 Distribution Pays For Itself"}
              </h2>
            </div>
            <div className="text-left md:text-right tabular-nums">
              <p className="text-[12px] text-[var(--apple-ink-secondary)]">
                {isZh ? "你的 SaaS 客单价" : "Your SaaS Price"}
              </p>
              <p className="apple-display text-3xl font-semibold text-[var(--apple-blue)]">${productPrice}</p>
            </div>
          </div>

          <div className="space-y-2">
            <input
              type="range"
              min={9}
              max={299}
              step={5}
              value={productPrice}
              onChange={(e) => setProductPrice(Number(e.target.value))}
              className="w-full accent-[var(--apple-blue)] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-[var(--apple-ink-tertiary)] tabular-nums">
              <span>$9 Micro-SaaS</span>
              <span>$49 Pro Tool</span>
              <span>$149 B2B SaaS</span>
              <span>$299 Annual / Pilot</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 pt-2 tabular-nums">
            <div className="rounded-[16px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-4">
              <p className="text-[11px] text-[var(--apple-ink-secondary)]">
                {isZh ? "收回 $39 成本所需成交单量" : "Sales Needed to Break Even"}
              </p>
              <p className="apple-display text-2xl font-semibold text-[var(--apple-ink)] mt-1">
                {paybackSales} {isZh ? "单回本" : paybackSales === 1 ? "customer" : "customers"}
              </p>
            </div>
            <div className="rounded-[16px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-4">
              <p className="text-[11px] text-[var(--apple-ink-secondary)]">
                {isZh ? "替创始人省下的枯燥填表工时" : "Founder Grunt-Work Saved"}
              </p>
              <p className="apple-display text-2xl font-semibold text-[var(--apple-ink)] mt-1">18+ {isZh ? "小时" : "hours"}</p>
            </div>
            <div className="rounded-[16px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-4">
              <p className="text-[11px] text-[var(--apple-ink-secondary)]">
                {isZh ? "保守 14 单新增归因营收估算" : "Est. Revenue (14 Conversions)"}
              </p>
              <p className="apple-display text-2xl font-semibold text-[var(--apple-green)] mt-1">
                ${projectedMonthlyRev.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 免费 SEO 裂变工具箱 */}
      <section className="bg-[var(--apple-bg)] border-t border-[var(--apple-border)] py-16 px-4 sm:px-6">
        <div className="max-w-[1040px] mx-auto space-y-6">
          <div className="text-center space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--apple-blue)]">
              {isZh ? "零登录免费增长工具箱" : "FREE FOUNDER TOOLS · NO SIGN-UP REQUIRED"}
            </p>
            <h2 className="apple-display text-2xl sm:text-3xl font-semibold text-[var(--apple-ink)]">
              {isZh ? "先免费体验我们的专业工具，再决定是否付费" : "Test Our Distribution & AEO Tools Free"}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                href: "/tools/directory-finder",
                icon: Globe,
                title: isZh ? "100+ 目录检索库" : "100+ Directory Finder",
                desc: isZh ? "按 DR、月流量与 dofollow 自由检索官方提交页。" : "Filter 100 verified SaaS & AI directories by DR & dofollow.",
              },
              {
                href: "/tools/llms-txt-generator",
                icon: FileCode2,
                title: isZh ? "/llms.txt 生成器" : "/llms.txt Generator",
                desc: isZh ? "10 秒抓取官网自动生成 llmstxt.org 规范文件。" : "Auto-generate a clean AI search manifest in 10 seconds.",
              },
              {
                href: "/tools/aeo-checker",
                icon: ShieldCheck,
                title: isZh ? "12 维 AEO 爬虫体检" : "12-Point AEO Audit",
                desc: isZh ? "检查 GPTBot / ClaudeBot 放行状态与 OG 分享卡。" : "Audit AI crawlers, JSON-LD, OG cards & security headers.",
              },
              {
                href: "/report/demo-acmeflow",
                icon: BarChart3,
                title: isZh ? "公开增长战报示例" : "Live Public Report",
                desc: isZh ? "预览可分享、可打印 PDF 的实证 ROI 归因战报。" : "Inspect a live shareable growth & attribution report.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 hover:border-[var(--apple-blue)] transition flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <Icon className="w-5 h-5 text-[var(--apple-blue)]" />
                    <h3 className="text-[15px] font-semibold text-[var(--apple-ink)]">{item.title}</h3>
                    <p className="text-[12px] text-[var(--apple-ink-secondary)] leading-relaxed">{item.desc}</p>
                  </div>
                  <span className="text-[12px] font-medium text-[var(--apple-blue)] inline-flex items-center gap-1">
                    {isZh ? "免费打开" : "Open free"} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. FAQ 异议消除手风琴 */}
      <section className="bg-[var(--apple-surface)] border-t border-[var(--apple-border)] py-20 px-4 sm:px-6">
        <div className="max-w-[820px] mx-auto space-y-6">
          <div className="text-center space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--apple-blue)]">FAQ</p>
            <h2 className="apple-display text-2xl sm:text-3xl font-semibold text-[var(--apple-ink)]">
              {isZh ? "独立开发者最关心的 4 个真实问题" : "Straight Answers Before You Launch"}
            </h2>
          </div>

          <div className="rounded-[20px] border border-[var(--apple-border)] bg-[var(--apple-bg)] divide-y divide-[var(--apple-border)] overflow-hidden">
            {faqs.map((f, idx) => {
              const open = openFaq === idx;
              return (
                <div key={f.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : idx)}
                    className="w-full px-5 sm:px-6 py-4 text-left flex items-center justify-between gap-3 cursor-pointer hover:bg-[var(--apple-surface)] transition"
                  >
                    <span className="text-[14px] sm:text-[15px] font-semibold text-[var(--apple-ink)]">{f.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[var(--apple-ink-tertiary)] shrink-0 transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {open && (
                    <div className="px-5 sm:px-6 pb-5 text-[13px] text-[var(--apple-ink-secondary)] leading-relaxed">
                      {f.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
