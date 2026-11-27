"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { toast } from "sonner";
import {
  IconArrowRight,
  IconArrowUpRight,
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconFileCode,
  IconPlayerPlay,
  IconSearch,
  IconShieldCheck,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import DomainFavicon from "@/components/frosted/DomainFavicon";
import WaveTelemetryMatrix from "@/components/frosted/WaveTelemetryMatrix";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DISTRIBUTION_DIRECTORIES } from "@/data/directories";
import {
  buildContextualReply,
  buildSampleOverview,
  deriveConsoleLedger,
  formatCategoryLabel,
  formatSlaLabel,
  type ReplyTone,
} from "@/lib/console-ledger";
import type { StartupAuditReport } from "@/types/audit";

const SAMPLE_DATA = buildSampleOverview();
const SAMPLE_LEDGER = deriveConsoleLedger(SAMPLE_DATA, true);

interface LiveScanPayload {
  domain: string;
  origin: string;
  title: string;
  score: number;
  leaksCount: number;
  leaks: Array<{ severity: string; category: string; title: string; evidence: string }>;
  diagnostics?: {
    ttfbMs: number;
    llmsTxt?: { exists: boolean; wordCount: number; generatedPreview?: string };
  };
}

interface ScanHistoryEntry {
  domain: string;
  origin: string;
  firstScore: number;
  latestScore: number;
  scannedAt: string;
}

const LP_SCAN_HISTORY_KEY = "lp_scan_history_v1";

/**
 * LaunchPulse 官网（/）
 * 100% 复用官方 shadcn/ui 组件库 + Kiranism 10 套多主题系统 + Recharts 3 交互图表
 * 与控制台视觉规范完全同源，支持一键体验 Vercel / Supabase / Claude / Mono 主题与深浅色切换
 */
export default function HomeClient({ sampleAudits }: { sampleAudits: StartupAuditReport[] }) {
  const { locale } = useI18n();
  const isZh = locale === "zh";

  const heroChartConfig = useMemo(
    () =>
      ({
        revenueUsd: {
          label: isZh ? "归因营收 ($)" : "Attributed Revenue ($)",
          color: "var(--chart-1)",
        },
      }) satisfies ChartConfig,
    [isZh]
  );

  const scanInputRef = useRef<HTMLInputElement>(null);
  const [scanUrl, setScanUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<LiveScanPayload | null>(null);

  const [tone, setTone] = useState<ReplyTone>("peer");
  const [zeroLink, setZeroLink] = useState(true);
  const [dirQuery, setDirQuery] = useState("");
  const [dirFilter, setDirFilter] = useState<"all" | "dr70" | "dofollow">("all");
  const [videoOpen, setVideoOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [checkoutDialogPlan, setCheckoutDialogPlan] = useState<"blitz" | "radar" | "dfy" | null>(null);
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [checkoutTargetUrl, setCheckoutTargetUrl] = useState("");
  const [copiedLlms, setCopiedLlms] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(LP_SCAN_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ScanHistoryEntry[];
      return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "lp-home", event: "view" }),
      keepalive: true,
    }).catch(() => {});
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        scanInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const executeScanForUrl = async (targetInput: string) => {
    const raw = targetInput.trim();
    if (!raw) {
      scanInputRef.current?.focus();
      return;
    }
    setScanUrl(raw);
    setScanning(true);
    setCopiedLlms(false);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: raw }),
      });
      const json = (await res.json()) as LiveScanPayload & { error?: string };
      if (!res.ok) {
        toast.error(json.error || (isZh ? "诊断失败，请确认网址可公网访问" : "Could not inspect this URL"));
      } else {
        setScanResult(json);
        setCheckoutTargetUrl(json.origin);
        setScanHistory((prev) => {
          const prevMatch = prev.find((item) => item.domain === json.domain);
          const entry: ScanHistoryEntry = {
            domain: json.domain,
            origin: json.origin,
            firstScore: prevMatch ? prevMatch.firstScore : json.score,
            latestScore: json.score,
            scannedAt: new Date().toISOString(),
          };
          const next = [entry, ...prev.filter((item) => item.domain !== json.domain)].slice(0, 6);
          try {
            window.localStorage.setItem(LP_SCAN_HISTORY_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
        fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: "lp-home", event: "buyer_click" }),
          keepalive: true,
        }).catch(() => {});
        toast.success(isZh ? `${json.domain} 诊断完成：${json.score}/100` : `Audit complete: ${json.score}/100`);
      }
    } catch {
      toast.error(isZh ? "网络异常，请重试" : "Network error");
    } finally {
      setScanning(false);
    }
  };

  const handleRunScan = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeScanForUrl(scanUrl);
  };

  const handleCheckout = (plan: "blitz" | "radar" | "dfy") => {
    setCheckoutTargetUrl(scanResult?.origin || scanUrl.trim() || "");
    setCheckoutDialogPlan(plan);
  };

  const handleConfirmLaunchCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutDialogPlan) return;
    const cleanEmail = checkoutEmail.trim().toLowerCase();
    let cleanUrl = checkoutTargetUrl.trim();
    if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }
    let derivedDomain = scanResult?.domain || "saas-launch";
    try {
      if (cleanUrl) {
        derivedDomain = new URL(cleanUrl).hostname.replace(/^www\./i, "");
      }
    } catch {
      toast.error(isZh ? "请输入有效的产品网址（例如 https://your-saas.com）" : "Please enter a valid product URL.");
      return;
    }

    setCheckoutPlan(checkoutDialogPlan);
    try {
      fetch("/api/lead-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          targetUrl: cleanUrl,
          plan: checkoutDialogPlan,
        }),
        keepalive: true,
      }).catch(() => {});

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: checkoutDialogPlan,
          email: cleanEmail,
          slug: derivedDomain,
          targetUrl: cleanUrl,
        }),
      });
      const data = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      toast.error(
        data.error ||
          (isZh
            ? "暂时无法初始化结账会话，请稍后重试或联系 hello@statementflow.win"
            : "Unable to start checkout right now. Please retry or email hello@statementflow.win.")
      );
    } catch {
      toast.error(
        isZh
          ? "网络连接异常，请检查网络后重试"
          : "Network error while connecting to Creem checkout. Please retry."
      );
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

  const demoLead = SAMPLE_DATA.radarLeads[0];
  const liveDraft = buildContextualReply(
    demoLead,
    "AcmeFlow",
    "lightweight SSL & domain expiry alerts",
    "https://pulse.statementflow.win/r/acme-hn",
    tone,
    zeroLink
  );

  const heroChartData = SAMPLE_LEDGER.revenue.dailySeries.slice(-14).map((pt) => ({
    date: pt.date.slice(5),
    revenueUsd: pt.revenueUsd,
  }));

  const featuredAuditSlug = sampleAudits[0]?.slug || "certnudge";

  const pricingPlans = [
    {
      id: "blitz" as const,
      name: isZh ? "启动包" : "Launch Starter",
      price: "$39",
      unit: isZh ? "一次性买断" : "one-time",
      desc: isZh ? "适合刚上线的独立产品，快速拿下首批高权重外链。" : "Fast initial authority lift for new SaaS products.",
      features: isZh
        ? ["30 个核心高权重目录提交队列", "自动 HTTP 200 外链验活回执", "专属边缘归因短链与点击统计", "免费 AEO 与 /llms.txt 诊断"]
        : ["30 Tier-1 directory queue", "Automated HTTP 200 verification", "Custom edge tracking shortlinks", "AEO & /llms.txt audit"],
      cta: isZh ? "立即开通启动包" : "Start for $39",
      highlighted: false,
    },
    {
      id: "radar" as const,
      name: isZh ? "增长指挥台" : "Growth Command",
      price: "$29",
      unit: isZh ? "/ 月" : "/ mo",
      desc: isZh ? "完整闭环：100 目录节奏投放 + 买家收件箱 + 美元级归因。" : "Complete OS: 100 directories, buyer inbox & attribution.",
      features: isZh
        ? ["全部 100+ 精选目录 3 周自然排期", "24/7 买家收件箱扫帖与原生回复精编", "零链接安全养号模式与键盘流", "美元级转化漏斗与公开核验战报页"]
        : ["All 100+ directories over 3 weeks", "24/7 Buyer Inbox + Reply Studio", "Zero-link safe mode & shortcuts", "Revenue funnel & verifiable public report"],
      cta: isZh ? "订阅增长指挥台" : "Subscribe · $29/mo",
      highlighted: true,
    },
    {
      id: "dfy" as const,
      name: isZh ? "代投旗舰" : "Done-For-You",
      price: "$299",
      unit: isZh ? "一次性全托管" : "one-time concierge",
      desc: isZh ? "把时间留给产品开发：人工精修物料并完成 100+ 目录代提交。" : "We polish your Brand Kit and submit all 100+ listings manually.",
      features: isZh
        ? ["100+ 精选目录全人工逐站代提交", "英文产品定位与三档目录简介代精修", "30 天内死链或拒审免费补投保障", "附赠 30 天增长指挥台完整权限"]
        : ["Full manual 100+ directory submission", "Native English Brand Kit polish", "30-day replacement guarantee", "30 days Command Center access"],
      cta: isZh ? "预约人工代投" : "Book Concierge · $299",
      highlighted: false,
    },
  ];

  const faqs = [
    {
      q: isZh ? "提交 100 个外链目录会不会被 Google 判定作弊？" : "Will submitting to 100 directories trigger a Google penalty?",
      a: isZh
        ? "不会。系统采用 3 周自然节奏分批推进（第 1 周 30 个权威站 → 第 2 周 35 个垂直站 → 第 3 周 35 个独立生态站），所有站点均经人工清洗验证，绝不涉及垃圾站群。"
        : "No. Submissions are staggered across 3 weekly waves across verified software directories—never automated spam link farms.",
    },
    {
      q: isZh ? "去 Hacker News / Reddit / GitHub 回复求购帖会被封号吗？" : "Will replying to buyer threads risk account bans?",
      a: isZh
        ? "买家收件箱默认开启「零链接安全养号模式」，先以工程师同行视角提供干货解法且不带任何外部链接，大幅降低新号被删帖风控概率。"
        : "Buyer Inbox enables Zero-Link Safe Mode by default—answering with genuine engineering advice without dropping unsolicited URLs.",
    },
    {
      q: isZh ? "如何验证提交后的外链真的存活并带来转化？" : "How do you verify live backlinks and real revenue?",
      a: isZh
        ? "Cloudflare 边缘节点会自动执行 HTTP 200 验活并结合专属 /r/ 短链与 1 行统计脚本，把点击、注册、付费逐笔归因并同步至公开只读战报页。"
        : "Our Cloudflare worker verifies HTTP 200 status and connects shortlinks plus a 1-line pixel straight to your verifiable public report.",
    },
    {
      q: isZh ? "支持哪些支付方式？能否随时取消？" : "How do payments and cancellations work?",
      a: isZh
        ? "全部方案通过 Creem 安全结算，支持主流国际卡。月度订阅随时一键取消，代投服务承诺按交付清单透明验收。"
        : "Secure checkout via Creem. Monthly subscriptions cancel anytime in one click.",
    },
  ];

  return (
    <div className="min-h-screen overflow-x-clip bg-transparent text-foreground">
      {/* 悬浮光学磨砂旗舰导航舱 */}
      <div className="sticky top-3 z-40 px-3 sm:px-6">
        <header className="lp-frosted-topbar mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 sm:gap-4 rounded-2xl px-3 sm:px-5">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold text-[14.5px] sm:text-[15px] tracking-tight whitespace-nowrap">
            <div className="lp-btn-bevel flex size-7 sm:size-8 items-center justify-center rounded-[10px]">
              <BrandMark className="size-4" tone="light" />
            </div>
            <span>LaunchPulse</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-[14px] text-muted-foreground" aria-label="官网导航">
            <a href="#features" className="hover:text-foreground transition-colors">
              {isZh ? "核心模块" : "Modules"}
            </a>
            <a href="#directories" className="hover:text-foreground transition-colors">
              {isZh ? "100 目录库" : "Directories"}
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              {isZh ? "透明定价" : "Pricing"}
            </a>
            <Link href="/tools/aeo-checker" className="hover:text-foreground transition-colors">
              {isZh ? "免费体检" : "Free Audit"}
            </Link>
            <a
              href="https://github.com/wangguode/launchpulse"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <span>GitHub</span>
              <IconArrowUpRight className="size-3.5" />
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LangSwitcher />
            <ThemeModeToggle />
            <Button size="sm" className="whitespace-nowrap px-2.5 sm:px-3" render={<Link href="/dashboard?sample=1" />}>
              <span className="hidden sm:inline">{isZh ? "进入指挥台" : "Open Console"}</span>
              <span className="sm:hidden">{isZh ? "指挥台" : "Console"}</span>
              <IconArrowRight className="size-3.5" />
            </Button>
          </div>
        </header>
      </div>

      {/* 第 1 幕：殿堂级排版 Hero + 命令式诊断栏 + 嵌入式光学磨砂指挥台实景 */}
      <section>
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-20 space-y-12">
          <div className="mx-auto max-w-4xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 lp-frost-pill rounded-full px-3.5 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>{isZh ? "100 高权目录三波次分发 · 社区求购雷达 · Stripe 边缘美元归因" : "100 Curated Directories · Buyer Radar · Verifiable Revenue Attribution"}</span>
            </div>

            <h1 className="lp-display text-[29px] font-semibold tracking-[-0.035em] sm:text-6xl lg:text-[64px] leading-[1.12] sm:leading-[1.08]">
              {isZh ? (
                <>
                  把海外外链分发，
                  <br />
                  变成可核验的美元回款
                </>
              ) : (
                <>
                  Turn global directories
                  <br />
                  into verifiable revenue.
                </>
              )}
            </h1>
            <p className="mx-auto max-w-2xl text-[15.5px] sm:text-[16.5px] text-muted-foreground leading-relaxed">
              {isZh
                ? "一次录入品牌资料，按三波次自然节奏投递 100+ 海外高权重目录，全天候捕捉 Reddit 与 Hacker News 买家求购信号，并将每笔美元收款精确归因到具体渠道。"
                : "Calibrate your Brand Kit once to pace 100+ high-DR directory submissions, capture live Reddit & HN buying threads, and reconcile every dollar of revenue."}
            </p>

            {/* 免费诊断磨砂胶囊输入舱 */}
            <form onSubmit={handleRunScan} className="mx-auto max-w-2xl pt-1">
              <div className="lp-frosted-card flex flex-col sm:flex-row gap-2 rounded-2xl p-2">
                <div className="relative flex-1">
                  <IconSearch className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    ref={scanInputRef}
                    value={scanUrl}
                    onChange={(e) => setScanUrl(e.target.value)}
                    placeholder={isZh ? "粘贴产品官网，如 https://your-saas.com" : "https://your-saas.com"}
                    className="h-11 pl-10 pr-3 sm:pr-14 border-transparent bg-transparent shadow-none focus-visible:ring-0 text-base sm:text-[14.5px]"
                  />
                  <Kbd className="lp-frost-pill border-none hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2">⌘K</Kbd>
                </div>
                <Button type="submit" size="lg" className="min-h-11 px-6 rounded-xl" disabled={scanning}>
                  {scanning ? (isZh ? "诊断中..." : "Scanning...") : isZh ? "免费增长体检" : "Free Growth Audit"}
                  <IconArrowRight className="size-4" />
                </Button>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                <span>{isZh ? "免输入一键实测：" : "1-click live test:"}</span>
                {["linear.app", "cal.com", "statementflow.win"].map((demoDomain) => (
                  <button
                    key={demoDomain}
                    type="button"
                    disabled={scanning}
                    onClick={() => void executeScanForUrl(`https://${demoDomain}`)}
                    className="lp-frost-pill rounded-full px-2.5 py-0.5 font-mono text-[11.5px] text-foreground/85 hover:text-foreground transition-colors cursor-pointer"
                  >
                    {demoDomain}
                  </button>
                ))}
              </div>

              {/* 本地复测涨分留存飞轮：记录首次与最新健康分差值，驱动创始人部署 /llms.txt 后回访复测转化 */}
              {scanHistory.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {isZh ? "最近体检记录：" : "Recent scans:"}
                  </span>
                  {scanHistory.map((item) => {
                    const delta = item.latestScore - item.firstScore;
                    return (
                      <button
                        key={item.domain}
                        type="button"
                        disabled={scanning}
                        onClick={() => void executeScanForUrl(item.origin)}
                        className="lp-frost-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11.5px] text-foreground hover:border-primary/50 transition-colors cursor-pointer tabular-nums"
                      >
                        <span>{item.domain}</span>
                        <span className="font-semibold text-primary">{item.latestScore}/100</span>
                        {delta !== 0 && (
                          <span
                            className={
                              delta > 0
                                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                                : "text-amber-600 font-bold"
                            }
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </form>

            {scanResult && (
              <Card className="mx-auto max-w-2xl text-left">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-mono">{scanResult.domain}</CardTitle>
                  <CardDescription className="text-xs">
                    {isZh ? `增长健康分 ${scanResult.score}/100 · 发现 ${scanResult.leaksCount} 项待优化` : `Score ${scanResult.score}/100 · ${scanResult.leaksCount} findings`}
                  </CardDescription>
                  <CardAction>
                    <div className="flex items-center gap-1.5">
                      {scanResult.diagnostics?.llmsTxt?.generatedPreview && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard
                              .writeText(scanResult.diagnostics?.llmsTxt?.generatedPreview || "")
                              .then(() => {
                                setCopiedLlms(true);
                                toast.success(isZh ? "已复制生成的 /llms.txt 清单" : "Copied ready-to-publish /llms.txt");
                              })
                              .catch(() => {});
                          }}
                        >
                          {copiedLlms ? <IconCheck className="size-3.5 text-emerald-500" /> : <IconCopy className="size-3.5" />}
                          {isZh ? "复制 /llms.txt" : "Copy /llms.txt"}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        render={<Link href={`/audit/live?url=${encodeURIComponent(scanResult.origin)}`} />}
                      >
                        {isZh ? "完整报告" : "Full Report"}
                        <IconArrowUpRight className="size-3.5" />
                      </Button>
                    </div>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-3 pt-0 text-xs">
                  <div className="grid sm:grid-cols-2 gap-2">
                    {scanResult.leaks.slice(0, 4).map((lk, i) => (
                      <div key={i} className="rounded-md border bg-muted/40 p-2.5">
                        <p className="font-medium text-foreground">{lk.title}</p>
                        <p className="text-muted-foreground line-clamp-1 mt-0.5">{lk.evidence}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-3.5 py-2.5">
                    <div className="text-xs">
                      <span className="font-semibold text-foreground">
                        {isZh ? "快速拉升域名权重与 AI 引用率：" : "Fix authority & AI citation gaps:"}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {isZh ? "按 3 周自然波次投放 30+ 高权目录并自动 HTTP 200 验活" : "Queue Wave 1 (30 Tier-1 directories) with live HTTP 200 verification"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0"
                      disabled={checkoutPlan === "blitz"}
                      onClick={() => void handleCheckout("blitz")}
                    >
                      {isZh ? "解锁 Wave 1 · $39" : "Unlock Wave 1 · $39"}
                      <IconArrowRight className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 嵌入式光学磨砂指挥台实景舞台（含 100 目录三波次遥测矩阵） */}
          <div className="space-y-4" data-ui="hero-console">
            <WaveTelemetryMatrix directories={SAMPLE_LEDGER.directories} isZh={isZh} />

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/70 bg-[var(--frost-well)] px-5 py-3 text-[13px]">
                <div className="flex items-center gap-2.5 font-medium">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{isZh ? "LaunchPulse 增长指挥台 · AcmeFlow 30 天真实归因账本" : "LaunchPulse Command Center · Live Attribution Stage"}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" render={<Link href="/dashboard?sample=1" />}>
                  {isZh ? "进入完整交互沙盒" : "Open Live Sandbox"}
                  <IconArrowUpRight className="size-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 divide-y border-border/60 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
                {/* 栏 1：归因营收曲线 */}
                <div className="p-5 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-[13px] text-muted-foreground">{isZh ? "Stripe 归因净收入 (30天)" : "Attributed Revenue (30d)"}</p>
                      <p className="text-[28px] font-semibold tabular-nums mt-0.5">
                        ${SAMPLE_LEDGER.revenue.totalUsd.toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="success" className="tabular-nums">
                      <IconTrendingUp className="size-3" />
                      +${SAMPLE_LEDGER.revenue.deltaUsd}
                    </Badge>
                  </div>
                  <ChartContainer config={heroChartConfig} className="aspect-auto h-[126px] w-full">
                    <AreaChart data={heroChartData}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="date" hide />
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Area
                        dataKey="revenueUsd"
                        type="monotone"
                        fill="var(--color-revenueUsd)"
                        fillOpacity={0.18}
                        stroke="var(--color-revenueUsd)"
                        strokeWidth={2.2}
                      />
                    </AreaChart>
                  </ChartContainer>
                  <p className="text-[13px] text-muted-foreground tabular-nums">
                    {SAMPLE_LEDGER.revenue.funnel.clicks.toLocaleString()} {isZh ? "点击" : "clicks"} →{" "}
                    {SAMPLE_LEDGER.revenue.funnel.signups} {isZh ? "注册" : "signups"} →{" "}
                    {SAMPLE_LEDGER.revenue.funnel.paid} {isZh ? "笔付费" : "paid"}
                  </p>
                </div>

                {/* 栏 2：今日高意向求购 */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-medium">{isZh ? "高意向买家求购雷达" : "Buyer Intent Radar"}</span>
                    <Badge variant="outline" className="tabular-nums">
                      {isZh ? `待回复 ${SAMPLE_LEDGER.leadCounts.pending}` : `${SAMPLE_LEDGER.leadCounts.pending} open`}
                    </Badge>
                  </div>
                  <div className="space-y-2.5">
                    {SAMPLE_DATA.radarLeads
                      .filter((l) => l.status === "new")
                      .slice(0, 3)
                      .map((lead) => (
                        <div key={lead.id} className="lp-frost-well rounded-xl p-3 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                              <DomainFavicon name={lead.source} size="sm" />
                              <span>{lead.source} · {lead.intent_score}%</span>
                            </span>
                            <span className="text-muted-foreground">
                              {isZh ? lead.relative_time_zh : lead.relative_time_en}
                            </span>
                          </div>
                          <p className="text-[13px] font-medium line-clamp-1">{lead.title}</p>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 栏 3：权威目录验活回执 */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between text-[13px] tabular-nums">
                    <span className="font-medium">{isZh ? "权威目录收录回执" : "Verified Directories"}</span>
                    <span className="text-muted-foreground">
                      {SAMPLE_LEDGER.dirCounts.live}/{SAMPLE_LEDGER.dirCounts.total}
                    </span>
                  </div>
                  <div className="space-y-2 text-[13px] tabular-nums">
                    {SAMPLE_LEDGER.recentVerifiedReceipts.map((dir) => (
                      <div key={dir.id} className="lp-frost-well flex items-center justify-between rounded-xl px-3 py-2.5">
                        <span className="inline-flex items-center gap-2.5 font-medium truncate">
                          <DomainFavicon name={dir.name} url={dir.url} size="sm" />
                          <span className="truncate">{dir.name.replace(" Software", "")}</span>
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">DR {dir.dr}</span>
                          <Badge variant="success">
                            {isZh ? "已收录" : "Live"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 第 2 幕：官方 shadcn Tabs 交互式三核心能力演示 */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 space-y-8">
        <div className="max-w-2xl space-y-2">
          <h2 className="lp-display text-2xl font-bold tracking-tight sm:text-3xl">
            {isZh ? "把冷启动最耗时间的 3 件事，收进标准控制台。" : "Three launch workflows in one standard console."}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isZh ? "直接切换下方标签体验真实交互组件与对账账本。" : "Switch tabs below to test each module live."}
          </p>
        </div>

        <Tabs defaultValue="reply" className="space-y-4">
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="reply">{isZh ? "买家收件箱拟稿" : "Buyer Inbox"}</TabsTrigger>
            <TabsTrigger value="dirs">{isZh ? "100 目录节奏排期" : "Directory Pacing"}</TabsTrigger>
            <TabsTrigger value="roi">{isZh ? "美元归因闭环" : "Revenue Attribution"}</TabsTrigger>
          </TabsList>

          <TabsContent value="reply">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{isZh ? "原生英文回复精编器（现场切换体验）" : "Native Reply Studio"}</CardTitle>
                <CardDescription>{demoLead.title}</CardDescription>
                <CardAction>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-muted-foreground">{isZh ? "零链接安全养号" : "Zero-link safe"}</span>
                    <Switch checked={zeroLink} onCheckedChange={(v) => setZeroLink(Boolean(v))} />
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={tone} onValueChange={(v) => setTone(v as ReplyTone)}>
                  <TabsList>
                    <TabsTrigger value="peer">{isZh ? "同行纯干货" : "Peer Help"}</TabsTrigger>
                    <TabsTrigger value="founder">{isZh ? "创始人分享" : "Founder"}</TabsTrigger>
                    <TabsTrigger value="compare">{isZh ? "客观对比" : "Objective"}</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {liveDraft}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(liveDraft).catch(() => {});
                    toast.success(isZh ? "英文回复草稿已复制" : "Draft copied");
                  }}
                >
                  <IconCopy className="size-3.5" />
                  {isZh ? "复制此条草稿" : "Copy Draft"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dirs">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{isZh ? "3 周自然节奏与自动化 HTTP 验活" : "3-Week Natural Cadence"}</CardTitle>
                <CardDescription className="tabular-nums">
                  {isZh
                    ? `第 1 周 ${SAMPLE_LEDGER.dirCounts.wave1} 站 · 第 2 周 ${SAMPLE_LEDGER.dirCounts.wave2} 站 · 第 3 周 ${SAMPLE_LEDGER.dirCounts.wave3} 站（共 100 站）`
                    : "Wave 1 (30) · Wave 2 (35) · Wave 3 (35) = 100 verified directories"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isZh ? "目录平台" : "Directory"}</TableHead>
                      <TableHead>{isZh ? "域名权重" : "DR"}</TableHead>
                      <TableHead>{isZh ? "属性" : "Link"}</TableHead>
                      <TableHead>{isZh ? "验活状态" : "Status"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SAMPLE_LEDGER.directories.slice(0, 5).map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell className="font-mono">DR {d.dr}</TableCell>
                        <TableCell>{d.linkType === "dofollow" ? (isZh ? "传递权重" : "Dofollow") : "Nofollow"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">HTTP 200 · {isZh ? "已验活" : "Live"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roi">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{isZh ? "每条渠道严格对账到美元" : "Dollar-Reconciled Channel Ledger"}</CardTitle>
                <CardDescription>{isZh ? "总营收 $2,088 = $1,102 + $725 + $261" : "$2,088 = $1,102 + $725 + $261"}</CardDescription>
                <CardAction>
                  <Button variant="outline" size="sm" render={<Link href="/report?id=demo-acmeflow" />}>
                    {isZh ? "预览公开战报" : "Public Report"}
                    <IconExternalLink className="size-3.5" />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-4 tabular-nums">
                {SAMPLE_LEDGER.revenue.channels.map((ch) => (
                  <Card key={ch.key}>
                    <CardHeader className="pb-2">
                      <CardDescription>{isZh ? ch.labelZh : ch.labelEn}</CardDescription>
                      <CardTitle className="text-2xl font-mono">${ch.revenueUsd.toLocaleString()}</CardTitle>
                    </CardHeader>
                    <CardFooter className="text-xs text-muted-foreground">
                      {ch.clicks.toLocaleString()} {isZh ? "次有效点击" : "verified clicks"}
                    </CardFooter>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      <Separator />

      {/* 第 3 幕：100 目录透明检索表 + 免费前置工具 */}
      <section id="directories" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="lp-display text-2xl font-bold tracking-tight sm:text-3xl">
              {isZh ? "100+ 真实可提交目录，付费前即可逐站查验。" : "Inspect all 100+ directories before paying."}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isZh ? "剔除死链与封闭站，每站附带真实 DR 权重、审核周期与直达提交地址。" : "Verified public directories with live DR and review windows."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setVideoOpen(true)}>
              <IconPlayerPlay className="size-4" />
              {isZh ? "81 秒实机拆解" : "81s Teardown"}
            </Button>
            <Button variant="outline" size="sm" render={<Link href="/tools/directory-finder" />}>
              {isZh ? "浏览全部 100 站" : "Browse All 100"}
              <IconArrowUpRight className="size-3.5" />
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
            <Tabs value={dirFilter} onValueChange={(v) => setDirFilter(v as typeof dirFilter)}>
              <TabsList>
                <TabsTrigger value="all">{isZh ? "全部 (100)" : "All (100)"}</TabsTrigger>
                <TabsTrigger value="dr70">DR 70+</TabsTrigger>
                <TabsTrigger value="dofollow">{isZh ? "传递权重" : "Dofollow"}</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative sm:w-64">
              <IconSearch className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={dirQuery}
                onChange={(e) => setDirQuery(e.target.value)}
                placeholder={isZh ? "搜索目录名..." : "Filter directories..."}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isZh ? "平台名称" : "Directory"}</TableHead>
                  <TableHead>{isZh ? "域名权重" : "DR"}</TableHead>
                  <TableHead className="hidden sm:table-cell">{isZh ? "分类" : "Category"}</TableHead>
                  <TableHead className="hidden md:table-cell">{isZh ? "预计审核" : "Review"}</TableHead>
                  <TableHead>{isZh ? "外链属性" : "Link"}</TableHead>
                  <TableHead className="text-right">{isZh ? "入口" : "Submit"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="tabular-nums">
                {previewDirectories.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2.5">
                        <DomainFavicon name={d.name} url={d.url} />
                        <span>{d.name}</span>
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums font-medium">DR {d.dr}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                      {formatCategoryLabel(d.category, isZh)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                      {formatSlaLabel(d.approvalSla, isZh)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={d.linkType === "dofollow" ? "default" : "secondary"} className="text-xs">
                        {d.linkType === "dofollow" ? (isZh ? "传递权重" : "Dofollow") : "Nofollow"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        render={<a href={d.submitUrl} target="_blank" rel="noopener noreferrer" />}
                      >
                        {isZh ? "直达" : "Open"}
                        <IconExternalLink className="size-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/tools/aeo-checker" className="block group">
            <Card className="hover:bg-accent/40 transition-colors h-full">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/60">
                    <IconShieldCheck className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-sm">{isZh ? "AI 搜索可见度体检（12 项实测）" : "12-Point AEO Checker"}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {isZh ? "核查 GPTBot / ClaudeBot / PerplexityBot 是否被 robots.txt 误拦" : "Check AI crawler rules & JSON-LD schema"}
                    </CardDescription>
                  </div>
                </div>
                <IconArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </CardHeader>
            </Card>
          </Link>

          <Link href="/tools/llms-txt-generator" className="block group">
            <Card className="hover:bg-accent/40 transition-colors h-full">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/60">
                    <IconFileCode className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-sm">{isZh ? "/llms.txt 标准清单生成器" : "/llms.txt Manifest Studio"}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {isZh ? "10 秒提取官网定位，一键导出符合 llmstxt.org 规范的 Markdown 文件" : "Generate a clean llmstxt.org index in seconds"}
                    </CardDescription>
                  </div>
                </div>
                <IconArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </CardHeader>
            </Card>
          </Link>
        </div>
      </section>

      <Separator />

      {/* 第 4 幕：官方 shadcn Card 三档透明定价 + 工时 ROI 锚点 */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-xl space-y-1.5">
            <h2 className="lp-display text-2xl font-bold tracking-tight sm:text-3xl">
              {isZh ? "透明定价，按出海阶段选择。" : "Transparent pricing for every launch stage."}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isZh
                ? "手工逐站注册提交 100 个海外目录耗时约 25 小时（按工程师时薪折合 $2,000+）。无年付绑定，全部外链支持 HTTP 200 验活。"
                : "Manual submission across 100+ SaaS directories takes ~25 founder hours ($2,000+ opportunity cost). Every plan includes Creem VAT invoicing & 14-day guarantee."}
            </p>
          </div>
          <Badge variant="outline" className="w-fit py-1 px-3 text-xs">
            <IconShieldCheck className="size-3.5 mr-1 text-emerald-500" />
            {isZh ? "14 天退款保障 · 30 天死链免费补投" : "14-Day Refund Guarantee · 30-Day Link Replacement"}
          </Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {pricingPlans.map((plan) => (
            <Card key={plan.id} className={plan.highlighted ? "border-primary shadow-sm flex flex-col" : "flex flex-col"}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {plan.highlighted && <Badge>{isZh ? "推荐" : "Popular"}</Badge>}
                </div>
                <div className="flex items-baseline gap-1.5 pt-2 tabular-nums">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-xs text-muted-foreground">{plan.unit}</span>
                </div>
                <CardDescription className="pt-1">{plan.desc}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2.5 text-sm">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <IconCheck className="size-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  variant={plan.highlighted ? "default" : "outline"}
                  className="w-full"
                  disabled={checkoutPlan === plan.id}
                  onClick={() => handleCheckout(plan.id)}
                >
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* 第 5 幕：官方 shadcn Accordion FAQ + 页脚 */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-2">
          <h2 className="lp-display text-2xl font-bold tracking-tight">
            {isZh ? "上线前最常问的 4 个问题" : "Frequently asked questions"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isZh ? "把外链安全节奏、防封号策略与公开实证提前讲透。" : "Clear answers on pacing, account safety & proof."}
          </p>
          <Button variant="link" className="px-0" render={<Link href={`/audit/${featuredAuditSlug}`} />}>
            {isZh ? "查看真实出海诊断样本 ↗" : "Read a live teardown ↗"}
          </Button>
        </div>

        <div className="lg:col-span-8">
          <Accordion className="w-full rounded-lg border px-4">
            {faqs.map((item, idx) => (
              <AccordionItem key={idx} value={`faq-${idx}`}>
                <AccordionTrigger className="text-sm font-medium">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-4 py-6 sm:px-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">LaunchPulse</span>
            <span>·</span>
            <span>{isZh ? "出海产品增长与投流归因平台" : "Growth & Attribution Command Center"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/dashboard?sample=1" className="hover:text-foreground">
              {isZh ? "体验指挥台" : "Sandbox"}
            </Link>
            <Link href="/report?id=demo-acmeflow" className="hover:text-foreground">
              {isZh ? "公开战报" : "Report"}
            </Link>
            <Link href="/login" className="hover:text-foreground">
              {isZh ? "登录" : "Sign In"}
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              {isZh ? "隐私条款" : "Privacy"}
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              {isZh ? "服务协议" : "Terms"}
            </Link>
          </div>
        </div>
      </footer>

      <Dialog
        open={Boolean(checkoutDialogPlan)}
        onOpenChange={(open) => {
          if (!open) setCheckoutDialogPlan(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {checkoutDialogPlan === "dfy"
                ? isZh
                  ? "确认代投旗舰站点与接收邮箱 ($299)"
                  : "Confirm Done-For-You Concierge ($299)"
                : checkoutDialogPlan === "radar"
                ? isZh
                  ? "开通增长指挥台订阅 ($29/月)"
                  : "Activate Growth Command Pro ($29/mo)"
                : isZh
                ? "开通 Wave 1 启动包 ($39 买断)"
                : "Unlock Launch Starter Wave 1 ($39 once)"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConfirmLaunchCheckout} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {isZh ? "需要推广的产品官网 URL" : "Product Website URL to Distribute"}
              </label>
              <Input
                type="text"
                required
                value={checkoutTargetUrl}
                onChange={(e) => setCheckoutTargetUrl(e.target.value)}
                placeholder="https://your-saas.com"
                className="h-11 text-base sm:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {isZh ? "创始人邮箱（接收免密控制台链接与税票）" : "Work Email (Receives Instant Console Link & VAT Invoice)"}
              </label>
              <Input
                type="email"
                required
                value={checkoutEmail}
                onChange={(e) => setCheckoutEmail(e.target.value)}
                placeholder="founder@your-saas.com"
                className="h-11 text-base sm:text-sm"
              />
            </div>

            <div className="rounded-xl border bg-muted/40 p-3 text-xs space-y-1.5">
              <p className="font-semibold text-foreground">
                {isZh ? "付款后 60 秒内自动交付：" : "Delivered automatically within 60 seconds:"}
              </p>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  •{" "}
                  {checkoutDialogPlan === "dfy"
                    ? isZh
                      ? "人工精修英文 Brand Kit + 100+ 目录逐站代提交排期"
                      : "Human Brand Kit polish + manual submission across 100+ verified directories"
                    : checkoutDialogPlan === "radar"
                    ? isZh
                      ? "100+ 目录三波次队列 + 24/7 买家求购雷达 + 边缘归因短链"
                      : "100+ directory 3-wave pacer + 24/7 Buyer Inbox + edge revenue attribution"
                    : isZh
                    ? "Wave 1 首波 30 个高权重目录队列 + 自动 HTTP 200 验活回执"
                    : "Wave 1 queue (30 Tier-1 directories) + automated HTTP 200 live verification"}
                </li>
                <li>
                  •{" "}
                  {isZh
                    ? "Creem 官方全球税务合规发票 + 14 天无忧保障"
                    : "Creem Merchant-of-Record VAT invoice + 14-day satisfaction guarantee"}
                </li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full min-h-11"
              disabled={Boolean(checkoutPlan)}
            >
              {checkoutPlan
                ? isZh
                  ? "正在安全跳转至 Creem 收银台..."
                  : "Redirecting to Secure Creem Checkout..."
                : checkoutDialogPlan === "dfy"
                ? isZh
                  ? "前往安全结账 · $299"
                  : "Continue to Secure Checkout · $299"
                : checkoutDialogPlan === "radar"
                ? isZh
                  ? "前往安全结账 · $29/月"
                  : "Continue to Secure Checkout · $29/mo"
                : isZh
                ? "前往安全结账 · $39"
                : "Continue to Secure Checkout · $39"}
              <IconArrowRight className="size-4" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-5 py-3 border-b">
            <DialogTitle className="text-sm">
              {isZh ? "81 秒真实出海产品增长拆解（CertNudge）" : "81-Second Live Growth Teardown"}
            </DialogTitle>
          </DialogHeader>
          <video controls autoPlay poster="/teardowns/certnudge-poster.png" className="w-full aspect-video bg-black">
            <source src="/teardowns/certnudge.mp4" type="video/mp4" />
          </video>
        </DialogContent>
      </Dialog>
    </div>
  );
}
