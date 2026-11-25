"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ExternalLink,
  FileCode2,
  Loader2,
  Play,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { HeroCommandWindow, InteractiveCapabilityStage } from "@/components/HomeLivePreview";
import { DISTRIBUTION_DIRECTORIES } from "@/data/directories";
import { formatCategoryLabel, formatSlaLabel } from "@/lib/console-ledger";
import type { StartupAuditReport } from "@/types/audit";

interface LiveScanPayload {
  domain: string;
  origin: string;
  title: string;
  score: number;
  leaksCount: number;
  leaks: Array<{ severity: string; category: string; title: string; evidence: string }>;
  diagnostics?: {
    ttfbMs: number;
    llmsTxt: { exists: boolean; wordCount: number };
    aiCrawlers: Array<{ bot: string; engine: string; allowed: boolean }>;
  };
}

/**
 * LaunchPulse V5 精密工程官网（5 幕旗舰叙事，彻底终结 5,800px 九宫格模板长页）
 * - 第 1 幕：暗黑曜石首屏 + ⌘K 命令式网址诊断条 + 嵌入式实时指挥台透视窗
 * - 第 2 幕：交互式三核心能力切屏演示
 * - 第 3 幕：100 目录透明实时检索 + 81 秒实机拆解 + 免费诊断入口
 * - 第 4 幕：透明三档定价（直连 Creem 结账）
 * - 第 5 幕：4 条直击顾虑的精简问答与紧凑尾栏
 */
export default function HomeClient({ sampleAudits }: { sampleAudits: StartupAuditReport[] }) {
  const { locale } = useI18n();
  const isZh = locale === "zh";

  const scanInputRef = useRef<HTMLInputElement>(null);
  const [scanUrl, setScanUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanResult, setScanResult] = useState<LiveScanPayload | null>(null);

  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0);
  const [dirQuery, setDirQuery] = useState("");
  const [dirFilter, setDirFilter] = useState<"all" | "dr70" | "dofollow">("all");
  const [videoOpen, setVideoOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  // 官网 ⌘K 快速聚焦命令式网址诊断输入框
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        scanInputRef.current?.focus();
        scanInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (e.key === "Escape" && videoOpen) {
        setVideoOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [videoOpen]);

  const handleRunScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = scanUrl.trim();
    if (!raw) {
      scanInputRef.current?.focus();
      return;
    }
    setScanning(true);
    setScanError("");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: raw }),
      });
      const json = (await res.json()) as LiveScanPayload & { error?: string };
      if (!res.ok) {
        setScanError(json.error || (isZh ? "诊断请求失败，请确认网址可公网访问。" : "Could not inspect this URL."));
      } else {
        setScanResult(json);
      }
    } catch {
      setScanError(isZh ? "网络异常，请稍后重试。" : "Network error. Please retry.");
    } finally {
      setScanning(false);
    }
  };

  const handleCheckout = async (plan: "blitz" | "radar" | "dfy") => {
    setCheckoutPlan(plan);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          slug: scanResult?.domain || "saas-launch",
          targetUrl: scanResult?.origin || scanUrl.trim() || "",
        }),
      });
      const data = (await res.json()) as { checkoutUrl?: string };
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } finally {
      setCheckoutPlan(null);
    }
  };

  const previewDirectories = useMemo(() => {
    const q = dirQuery.trim().toLowerCase();
    return DISTRIBUTION_DIRECTORIES.filter((d) => {
      if (dirFilter === "dr70" && d.dr < 70) return false;
      if (dirFilter === "dofollow" && d.linkType !== "dofollow") return false;
      if (q && !`${d.name} ${d.url} ${d.category}`.toLowerCase().includes(q)) return false;
      return true;
    }).slice(0, 8);
  }, [dirQuery, dirFilter]);

  const featuredAuditSlug = sampleAudits[0]?.slug || "certnudge";

  const capabilitySteps = [
    {
      title: isZh ? "100+ 精选目录，3 周自然节奏投放" : "100+ curated directories over 3 natural weeks",
      desc: isZh
        ? "一次填好品牌资料，按域名权重与审核周期分批推进提交，并由系统自动执行 HTTP 200 验活回执。"
        : "Fill your Brand Kit once, stagger submissions safely across 3 weeks, and verify every live link automatically.",
    },
    {
      title: isZh ? "全网高意向求购监听与防封号回复" : "Live buyer-intent inbox with ban-safe drafts",
      desc: isZh
        ? "持续扫描 Hacker News、GitHub 与 DEV.to 上的求推荐、寻替代讨论；内置零链接安全养号开关，一键生成地道英文回复。"
        : "Track real buying and alternative-seeking threads across HN, GitHub & DEV.to with contextual tone and zero-link toggles.",
    },
    {
      title: isZh ? "每条外链与回复，精准归因至美元营收" : "Dollar-level attribution per directory and reply",
      desc: isZh
        ? "边缘短链 + 1 行轻量脚本完整串联点击、有效进站、注册与付费，清楚看到哪条外链带来了真实收入。"
        : "Edge shortlinks and a 1-line pixel connect clicks, visits, signups, and paid orders back to the exact channel.",
    },
  ];

  const pricingPlans = [
    {
      id: "blitz" as const,
      name: isZh ? "启动包" : "Launch Starter",
      price: "$39",
      unit: isZh ? "一次性买断" : "one-time",
      desc: isZh ? "适合刚上线的独立产品，快速拿下首批权威外链收录。" : "Fast initial authority lift for newly shipped products.",
      features: isZh
        ? ["30 个核心高权重目录提交队列", "自动 HTTP 200 外链验活回执", "专属归因短链与点击统计", "免费 AEO 与 llms.txt 诊断"]
        : ["30 Tier-1 high-DR directory queue", "Automated HTTP 200 verification receipts", "Custom attribution shortlinks", "AEO & llms.txt diagnostics"],
      cta: isZh ? "立即开通启动包" : "Start for $39",
      highlighted: false,
    },
    {
      id: "radar" as const,
      name: isZh ? "增长指挥台" : "Growth Command",
      price: "$29",
      unit: isZh ? "/ 月" : "/ mo",
      desc: isZh ? "完整闭环：100 目录节奏分发 + 每日高意向买家收件箱 + 归因漏斗。" : "Complete engine: 100 directories, daily buyer inbox & attribution.",
      features: isZh
        ? [
            "全部 100+ 精选目录 3 周自然节奏排期",
            "买家收件箱 24/7 扫帖 + 原生回复精编器",
            "零链接安全养号模式与键盘极速跟进",
            "美元级归因漏斗与可公开核验战报页",
          ]
        : [
            "All 100+ directories with 3-week pacing",
            "24/7 Buyer Inbox + Native Reply Studio",
            "Zero-link safe mode & keyboard shortcuts",
            "Dollar attribution funnel & public report",
          ],
      cta: isZh ? "订阅增长指挥台" : "Subscribe · $29/mo",
      highlighted: true,
    },
    {
      id: "dfy" as const,
      name: isZh ? "代投旗舰" : "Done-For-You",
      price: "$299",
      unit: isZh ? "一次性全托管" : "one-time concierge",
      desc: isZh ? "把时间留给写代码：我们人工精修资料并完成全部 100+ 目录提交。" : "Keep shipping code while we refine copy and submit all 100+ listings.",
      features: isZh
        ? ["100+ 精选目录全人工逐站代提交", "英文品牌定位与目录简介代精修", "30 天内死链或拒审免费补投保障", "附赠 30 天增长指挥台完整权限"]
        : ["Full manual submission to 100+ directories", "Native English Brand Kit copy polish", "30-day broken/rejected link replacement", "Includes 30 days of Command Center"],
      cta: isZh ? "预约人工代投" : "Book Concierge · $299",
      highlighted: false,
    },
  ];

  const faqs = [
    {
      q: isZh ? "一口气提交 100 个外链目录，会不会被 Google 判定作弊？" : "Will submitting to 100 directories trigger a Google penalty?",
      a: isZh
        ? "不会。系统严格采用 3 周自然节奏分批推进（第 1 周 30 个权威站 → 第 2 周 35 个垂直站 → 第 3 周 35 个独立生态站），并且只收录经人工清洗的真实公开软件目录，杜绝垃圾站群与自动化刷链。"
        : "No. Submissions are paced naturally across 3 weekly waves across verified software directories—never link farms or automated spam blasts.",
    },
    {
      q: isZh ? "去 Hacker News、Reddit 或 GitHub 回复求购帖，账号会不会被封？" : "Will replying to threads on HN, GitHub or Reddit get my account banned?",
      a: isZh
        ? "买家收件箱默认开启「零链接安全养号模式」，先以同行工程经验解决发帖人痛点，不硬塞外部短链；待建立信任或对方追问后再自然分享链接，极大降低新号被删帖或封禁的风险。"
        : "Buyer Inbox enables Zero-Link Safe Mode by default—helping with peer engineering advice first and stripping external URLs so new accounts stay ban-free.",
    },
    {
      q: isZh ? "你们如何证明提交后的外链真的存活并被收录？" : "How do you prove submitted backlinks are actually live?",
      a: isZh
        ? "所有已提交目录都会由 Cloudflare 边缘节点定时执行 HTTP 200 存活探测与属性检查，并将实测结果直接写入你的公开只读战报页，每一条链接都可点击溯源核验。"
        : "Our Cloudflare edge worker runs live HTTP 200 and link-attribute checks and publishes verifiable proof straight to your public read-only growth report.",
    },
    {
      q: isZh ? "支持哪些支付方式？如果不满意怎么处理？" : "How does billing and refund protection work?",
      a: isZh
        ? "所有方案通过 Creem 安全结账，支持国际信用卡与常见数字钱包。月度订阅可随时一键取消；代投旗舰套餐如在约定周期内未完成交付承诺，支持按未完成比例原路退款。"
        : "Payments are processed securely via Creem. Monthly plans cancel anytime in one click, and Concierge packages carry a delivery guarantee.",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-frame)] text-[var(--ink-primary)]">
      {/* ==================== 顶栏（48px 暗黑曜石极细导航） ==================== */}
      <header className="sticky top-0 z-40 h-12 bg-[#0b0c0e]/90 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-[1140px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-[14.5px] font-semibold tracking-tight text-white">
            <BrandMark className="w-5 h-5" tone="light" />
            <span>LaunchPulse</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-[13px] text-white/65" aria-label="官网导航">
            <a href="#capabilities" className="hover:text-white lp-ease">
              {isZh ? "产品能力" : "Capabilities"}
            </a>
            <a href="#directories" className="hover:text-white lp-ease">
              {isZh ? "目录名录" : "Directories"}
            </a>
            <a href="#pricing" className="hover:text-white lp-ease">
              {isZh ? "透明定价" : "Pricing"}
            </a>
            <Link href="/tools/aeo-checker" className="hover:text-white lp-ease">
              {isZh ? "免费体检" : "Free Audit"}
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <LangSwitcher surface="dark" />
            <div className="hidden sm:block">
              <ThemeSwitcher surface="dark" />
            </div>
            <Link
              href="/dashboard?sample=1"
              className="h-7 px-3.5 rounded-full bg-white text-[#0b0c0e] hover:bg-white/90 text-[12px] font-semibold inline-flex items-center lp-ease whitespace-nowrap"
            >
              {isZh ? "进入指挥台" : "Open Console"}
            </Link>
          </div>
        </div>
      </header>

      {/* ==================== 第 1 幕：暗黑曜石精密工程首屏 ==================== */}
      <section className="relative bg-[#0b0c0e] text-white border-b border-white/[0.08] overflow-hidden">
        {/* 极细建筑纵线（严格容器结构线，非杂乱装饰网格） */}
        <div
          aria-hidden="true"
          className="pointer-events-none max-w-[1140px] mx-auto absolute inset-y-0 inset-x-0 border-x border-white/[0.05]"
        />

        <div className="relative max-w-[1140px] mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-14 sm:pb-16">
          <div className="max-w-[780px] space-y-5">
            <h1 className="lp-display text-[36px] sm:text-[52px] font-bold tracking-[-0.03em] leading-[1.14] text-white">
              {isZh ? (
                <>
                  产品上线后，
                  <br />
                  把海外买家和外链带回来。
                </>
              ) : (
                <>
                  After you ship,
                  <br />
                  bring back buyers and backlinks.
                </>
              )}
            </h1>

            <p className="text-[15px] sm:text-[16.5px] text-white/65 leading-[1.6] max-w-[740px] lp-balance">
              {isZh
                ? "一次录入产品资料，开启 100+ 精选目录节奏投放、全网求购线索监听与美元级营收归因。"
                : "Fill your Brand Kit once to pace 100+ directory submissions, monitor live buying threads, and trace every dollar back to its source."}
            </p>

            {/* ⌘K 命令式网址诊断条 */}
            <form onSubmit={handleRunScan} className="pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-1.5 rounded-[10px] border border-white/[0.14] bg-[#111317] focus-within:border-[#4f8cff] lp-ease">
                <div className="flex-1 flex items-center gap-2.5 pl-2.5">
                  <Search className="w-4 h-4 text-white/40 shrink-0" strokeWidth={1.7} />
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanUrl}
                    onChange={(e) => setScanUrl(e.target.value)}
                    placeholder={
                      isZh
                        ? "输入你的官网地址，例如 https://your-saas.com"
                        : "Enter your SaaS URL, e.g. https://your-saas.com"
                    }
                    aria-label={isZh ? "输入你的官网地址进行免费诊断" : "Enter website URL to inspect"}
                    className="w-full h-9 bg-transparent text-[14px] text-white placeholder:text-white/40 outline-none"
                  />
                  <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 h-5 rounded-[4px] border border-white/15 bg-white/[0.04] font-mono text-[11px] text-white/50 shrink-0">
                    ⌘K
                  </kbd>
                </div>

                <button
                  type="submit"
                  disabled={scanning}
                  className="h-9 px-4 rounded-[7px] bg-white text-[#0b0c0e] hover:bg-white/90 text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 lp-ease cursor-pointer disabled:opacity-60 shrink-0"
                >
                  {scanning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{isZh ? "正在诊断..." : "Inspecting..."}</span>
                    </>
                  ) : (
                    <>
                      <span>{isZh ? "免费诊断" : "Free Audit"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {scanError && <p className="text-[12.5px] text-[#f87171]">{scanError}</p>}

            {/* 原地展开的实时诊断结果卡 */}
            {scanResult && (
              <div className="rounded-[10px] border border-white/[0.12] bg-[#14171d] p-4 space-y-3 text-[13px]">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-semibold text-white">{scanResult.domain}</span>
                    <span className="text-white/50">·</span>
                    <span className="text-white/80 tabular-nums">
                      {isZh ? "增长健康分" : "Launch Score"}:{" "}
                      <strong className="font-mono text-[#4f8cff]">{scanResult.score}/100</strong>
                    </span>
                    {scanResult.diagnostics?.ttfbMs ? (
                      <span className="font-mono text-[12px] text-white/45">
                        {scanResult.diagnostics.ttfbMs}ms
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/audit/live?url=${encodeURIComponent(scanResult.origin)}`}
                      className="text-[12px] text-[#4f8cff] hover:underline inline-flex items-center gap-1"
                    >
                      {isZh ? "查看完整 12 维诊断" : "Full 12-Point Report"}
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setScanResult(null)}
                      className="text-white/45 hover:text-white cursor-pointer"
                      aria-label="关闭诊断摘要"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-2.5 text-[12.5px]">
                  {(scanResult.leaks || []).slice(0, 4).map((lk, idx) => (
                    <div key={idx} className="p-2.5 rounded-[7px] bg-white/[0.03] border border-white/[0.06]">
                      <p className="font-medium text-white/90">{lk.title}</p>
                      <p className="text-[11.5px] text-white/50 mt-0.5 line-clamp-1">{lk.evidence}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 嵌入式暗黑精密指挥台透视窗 */}
          <HeroCommandWindow isZh={isZh} />
        </div>
      </section>

      {/* ==================== 第 2 幕：交互式「一分钟看懂三件事」 ==================== */}
      <section id="capabilities" className="max-w-[1140px] mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-[680px] mb-10 space-y-2">
          <h2 className="lp-display text-[26px] sm:text-[32px] font-semibold tracking-[-0.025em] leading-[1.25] text-[var(--ink-primary)]">
            {isZh ? (
              <>
                把冷启动最耗时间的 3 件事，
                <br className="hidden sm:inline" />
                收进一个指挥台。
              </>
            ) : (
              "Three cold-start bottlenecks, unified in one console."
            )}
          </h2>
          <p className="text-[14.5px] text-[var(--ink-secondary)] leading-relaxed">
            {isZh
              ? "点击左侧任意环节，直接在右侧体验真实交互——不是静态截图。"
              : "Select any stage below to test the real workflow live on the right."}
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* 左 5 列：3 条精密可切换步骤 */}
          <div className="lg:col-span-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] divide-y divide-[var(--border-hairline)] overflow-hidden">
            {capabilitySteps.map((step, idx) => {
              const active = activeStep === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveStep(idx as 0 | 1 | 2)}
                  style={active ? { boxShadow: "inset 1px 0 0 var(--accent-primary)" } : undefined}
                  className={`w-full text-left p-5 lp-ease cursor-pointer space-y-1.5 ${
                    active ? "bg-[var(--bg-active-tint)]" : "hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <h3 className="text-[15px] font-semibold text-[var(--ink-primary)]">{step.title}</h3>
                  <p className="text-[13px] text-[var(--ink-secondary)] leading-[1.6]">{step.desc}</p>
                </button>
              );
            })}
          </div>

          {/* 右 7 列：实时交互舞台 */}
          <div className="lg:col-span-7">
            <InteractiveCapabilityStage activeStep={activeStep} isZh={isZh} />
          </div>
        </div>
      </section>

      {/* ==================== 第 3 幕：透明 100 目录实时检索 + 81 秒拆解 + 免费诊断 ==================== */}
      <section
        id="directories"
        className="border-y border-[var(--border-hairline)] bg-[var(--bg-sheet)]"
      >
        <div className="max-w-[1140px] mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-[600px]">
              <h2 className="lp-display text-[26px] sm:text-[32px] font-semibold tracking-[-0.025em] text-[var(--ink-primary)]">
                {isZh ? "100+ 真实可提交目录，上线前即可逐站查验。" : "Inspect all 100+ curated directories before you pay."}
              </h2>
              <p className="text-[14px] text-[var(--ink-secondary)] leading-relaxed">
                {isZh
                  ? "剔除无法提交的企业封闭站与失效死链，每一站都附带真实域名权重、预计审核周期与官方提交直达地址。"
                  : "No dead links or gated enterprise-only lists—every entry includes verified DR, review window, and direct submission URL."}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button variant="secondary" size="sm" onClick={() => setVideoOpen(true)}>
                <Play className="w-3.5 h-3.5" />
                {isZh ? "81 秒实机拆解" : "81s Live Teardown"}
              </Button>
              <Link
                href="/tools/directory-finder"
                className="h-8 px-3 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-sheet)] hover:bg-[var(--bg-hover)] text-[12.5px] font-medium text-[var(--ink-primary)] inline-flex items-center gap-1 lp-ease"
              >
                <span>{isZh ? "查看全部 100 站" : "Browse All 100"}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 实时目录过滤器 + 8 行精炼预览表 */}
          <div className="rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 text-[12px]">
                {(
                  [
                    { k: "all", zh: "全部精选 (100)", en: "All (100)" },
                    { k: "dr70", zh: "高权重 DR 70+", en: "DR 70+" },
                    { k: "dofollow", zh: "传递权重 (Dofollow)", en: "Dofollow" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.k}
                    type="button"
                    onClick={() => setDirFilter(item.k)}
                    className={`h-7 px-2.5 rounded-[6px] border lp-ease cursor-pointer ${
                      dirFilter === item.k
                        ? "border-[var(--accent-primary)] bg-[var(--bg-active-tint)] text-[var(--ink-primary)] font-semibold"
                        : "border-[var(--border-hairline)] bg-[var(--bg-sheet)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                    }`}
                  >
                    {isZh ? item.zh : item.en}
                  </button>
                ))}
              </div>

              <div className="relative sm:w-[220px]">
                <Search className="w-3.5 h-3.5 text-[var(--ink-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  value={dirQuery}
                  onChange={(e) => setDirQuery(e.target.value)}
                  placeholder={isZh ? "筛选目录名，如 AlternativeTo..." : "Search SourceForge, SaaSHub..."}
                  className="w-full h-7 pl-8 pr-2.5 rounded-[6px] border border-[var(--border-strong)] bg-[var(--bg-sheet)] text-[12px] text-[var(--ink-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse tabular-nums">
                <thead>
                  <tr className="border-b border-[var(--border-hairline)] text-[12px] text-[var(--ink-muted)] bg-[var(--bg-surface)]/50">
                    <th className="py-2.5 px-4 font-medium">{isZh ? "平台名称" : "Directory"}</th>
                    <th className="py-2.5 px-4 font-medium">{isZh ? "域名权重" : "Authority"}</th>
                    <th className="py-2.5 px-4 font-medium hidden sm:table-cell">{isZh ? "分类" : "Category"}</th>
                    <th className="py-2.5 px-4 font-medium hidden md:table-cell">{isZh ? "预计审核" : "Review"}</th>
                    <th className="py-2.5 px-4 font-medium">{isZh ? "权重属性" : "Link"}</th>
                    <th className="py-2.5 px-4 font-medium text-right">{isZh ? "提交入口" : "Submit"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)] text-[13px]">
                  {previewDirectories.map((dir) => (
                    <tr key={dir.id} className="hover:bg-[var(--bg-hover)] lp-ease">
                      <td className="py-2.5 px-4 font-medium text-[var(--ink-primary)]">{dir.name}</td>
                      <td className="py-2.5 px-4 font-mono text-[12.5px] text-[var(--ink-primary)]">DR {dir.dr}</td>
                      <td className="py-2.5 px-4 text-[12.5px] text-[var(--ink-secondary)] hidden sm:table-cell">
                        {formatCategoryLabel(dir.category, isZh)}
                      </td>
                      <td className="py-2.5 px-4 text-[12.5px] text-[var(--ink-secondary)] hidden md:table-cell">
                        {formatSlaLabel(dir.approvalSla, isZh)}
                      </td>
                      <td className="py-2.5 px-4">
                        <StatusBadge
                          tone={dir.linkType === "dofollow" ? "success" : "neutral"}
                          label={dir.linkType === "dofollow" ? (isZh ? "传递权重" : "Dofollow") : "Nofollow"}
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <a
                          href={dir.submitUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[12px] text-[var(--accent-primary)] hover:underline"
                        >
                          <span>{isZh ? "直达" : "Open"}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 紧凑免费工具直达带（取代原本孤立的大白屏入口） */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/tools/aeo-checker"
              className="group p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] lp-ease flex items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)] mt-0.5 shrink-0" strokeWidth={1.75} />
                <div>
                  <p className="text-[14px] font-semibold text-[var(--ink-primary)]">
                    {isZh ? "AI 搜索可见度体检（12 项只读实测）" : "12-Point AI Search & AEO Checker"}
                  </p>
                  <p className="text-[12.5px] text-[var(--ink-secondary)] mt-0.5">
                    {isZh
                      ? "检测 GPTBot / ClaudeBot / PerplexityBot 是否被 robots.txt 误拦"
                      : "Check GPTBot, ClaudeBot & PerplexityBot access plus JSON-LD schema"}
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink-primary)] shrink-0" />
            </Link>

            <Link
              href="/tools/llms-txt-generator"
              className="group p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] lp-ease flex items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <FileCode2 className="w-4 h-4 text-[var(--accent-primary)] mt-0.5 shrink-0" strokeWidth={1.75} />
                <div>
                  <p className="text-[14px] font-semibold text-[var(--ink-primary)]">
                    {isZh ? "/llms.txt 标准清单生成器" : "/llms.txt Manifest Generator"}
                  </p>
                  <p className="text-[12.5px] text-[var(--ink-secondary)] mt-0.5">
                    {isZh
                      ? "10 秒提取官网结构，一键导出符合 llmstxt.org 规范的 Markdown 文件"
                      : "Generate a clean llmstxt.org Markdown index for AI search engines"}
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink-primary)] shrink-0" />
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== 第 4 幕：透明三档定价 ==================== */}
      <section id="pricing" className="max-w-[1140px] mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-10">
        <div className="max-w-[560px] space-y-2">
          <h2 className="lp-display text-[26px] sm:text-[32px] font-semibold tracking-[-0.025em] text-[var(--ink-primary)]">
            {isZh ? "透明定价，按出海阶段选择。" : "Transparent pricing for every stage of launch."}
          </h2>
          <p className="text-[14px] text-[var(--ink-secondary)]">
            {isZh
              ? "没有隐藏年付捆绑，所有外链收录与营收归因数据均支持公开核验。"
              : "No hidden annual lock-ins. Every backlink and attributed dollar is verifiable."}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-[10px] border bg-[var(--bg-sheet)] p-6 flex flex-col justify-between gap-6 ${
                plan.highlighted
                  ? "border-[var(--accent-primary)]"
                  : "border-[var(--border-hairline)]"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[15.5px] font-semibold text-[var(--ink-primary)]">{plan.name}</h3>
                  {plan.highlighted && (
                    <span className="text-[11.5px] font-medium text-[var(--accent-primary)]">
                      {isZh ? "推荐方案" : "Recommended"}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1.5 tabular-nums">
                  <span className="text-[34px] font-bold tracking-[-0.03em] text-[var(--ink-primary)]">
                    {plan.price}
                  </span>
                  <span className="text-[12.5px] text-[var(--ink-muted)]">{plan.unit}</span>
                </div>

                <p className="text-[13px] text-[var(--ink-secondary)] leading-relaxed">{plan.desc}</p>

                <ul className="space-y-2.5 pt-4 border-t border-[var(--border-hairline)] text-[13px] text-[var(--ink-primary)]">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[var(--accent-primary)] mt-0.5 shrink-0" strokeWidth={2} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                variant={plan.highlighted ? "primary" : "secondary"}
                size="md"
                loading={checkoutPlan === plan.id}
                onClick={() => handleCheckout(plan.id)}
                className="w-full"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== 第 5 幕：4 条直击顾虑的精简问答与紧凑尾栏 ==================== */}
      <section className="border-t border-[var(--border-hairline)] bg-[var(--bg-sheet)]">
        <div className="max-w-[1140px] mx-auto px-4 sm:px-6 py-16 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-2">
            <h2 className="lp-display text-[22px] sm:text-[24px] font-semibold tracking-[-0.02em] text-[var(--ink-primary)]">
              {isZh ? "上线前最常问的 4 个问题" : "Four practical questions"}
            </h2>
            <p className="text-[13.5px] text-[var(--ink-secondary)] leading-relaxed">
              {isZh
                ? "把安全节奏、防封号机制和验活实证提前讲清楚。"
                : "Clear answers on pacing safety, account health, and verifiable proof."}
            </p>
            <div className="pt-2">
              <Link
                href={`/audit/${featuredAuditSlug}`}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--accent-primary)] hover:underline"
              >
                <span>{isZh ? "阅读真实出海诊断样本" : "Read a real teardown sample"}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-8 rounded-[10px] border border-[var(--border-hairline)] divide-y divide-[var(--border-hairline)]">
            {faqs.map((item, idx) => {
              const open = openFaq === idx;
              return (
                <div key={idx}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : idx)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-[var(--bg-hover)] lp-ease cursor-pointer"
                  >
                    <span className="text-[14px] font-medium text-[var(--ink-primary)]">{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[var(--ink-muted)] shrink-0 transition-transform duration-150 ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {open && (
                    <div className="px-5 pb-4 text-[13.5px] text-[var(--ink-secondary)] leading-[1.65]">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 紧凑精密页脚 */}
      <footer className="border-t border-[var(--border-hairline)] bg-[var(--bg-frame)]">
        <div className="max-w-[1140px] mx-auto px-4 sm:px-6 py-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[12.5px] text-[var(--ink-muted)]">
          <div className="flex items-center gap-2.5">
            <BrandMark className="w-4 h-4" />
            <span className="font-semibold text-[var(--ink-primary)]">LaunchPulse</span>
            <span>·</span>
            <span>{isZh ? "出海产品增长指挥台" : "Precision Growth Command Center"}</span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <Link href="/dashboard?sample=1" className="hover:text-[var(--ink-primary)] lp-ease">
              {isZh ? "在线体验指挥台" : "Interactive Console"}
            </Link>
            <Link href="/report?id=demo-acmeflow" className="hover:text-[var(--ink-primary)] lp-ease">
              {isZh ? "公开战报样本" : "Sample Report"}
            </Link>
            <Link href="/login" className="hover:text-[var(--ink-primary)] lp-ease">
              {isZh ? "登录账号" : "Sign In"}
            </Link>
            <Link href="/privacy" className="hover:text-[var(--ink-primary)] lp-ease">
              {isZh ? "隐私条款" : "Privacy"}
            </Link>
            <Link href="/terms" className="hover:text-[var(--ink-primary)] lp-ease">
              {isZh ? "服务协议" : "Terms"}
            </Link>
          </div>
        </div>
      </footer>

      {/* 81 秒实机拆解轻量视频弹窗 */}
      {videoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setVideoOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-[820px] rounded-[12px] border border-white/15 bg-[#111317] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-11 px-4 border-b border-white/10 flex items-center justify-between text-[13px] text-white">
              <span className="font-medium">
                {isZh ? "81 秒真实出海产品增长拆解（CertNudge 案例）" : "81-Second Live Growth Teardown (CertNudge)"}
              </span>
              <button
                type="button"
                onClick={() => setVideoOpen(false)}
                className="p-1 text-white/60 hover:text-white cursor-pointer"
                aria-label="关闭视频"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <video
              controls
              autoPlay
              poster="/teardowns/certnudge-poster.png"
              className="w-full aspect-video bg-black"
            >
              <source src="/teardowns/certnudge.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      )}
    </div>
  );
}
