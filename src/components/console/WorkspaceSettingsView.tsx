"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  IconAlertTriangle,
  IconCheck,
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconRefresh,
  IconShare,
  IconShieldCheck,
  IconTrash,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatDateTimeLabel,
  formatOrderStatus,
  formatPlanName,
  type CampaignRecord,
  type EntitlementInfo,
  type ReconciledLedger,
} from "@/lib/console-ledger";

interface WorkspaceSettingsViewProps {
  campaign: CampaignRecord | null;
  tagline: string;
  entitlement: EntitlementInfo;
  ledger: ReconciledLedger;
  orders: Array<{ order_id: string; plan: string; amount_usd: number; status: string; created_at: string }>;
  publicReport: { share_id: string; title: string; show_revenue: number } | null;
  isZh: boolean;
  isSample: boolean;
  onCheckout: (plan: "blitz" | "radar" | "dfy") => Promise<void> | void;
  checkoutPlan: string | null;
  onPublishReport: (params: { title: string; showRevenue: boolean }) => Promise<void>;
  sharingReport: boolean;
  onUpdateProject: (params: {
    campaignId: number;
    productName: string;
    targetUrl: string;
    tagline: string;
    competitors: string;
  }) => Promise<boolean>;
  onDeleteProject: (campaignId: number) => Promise<boolean>;
}

interface DeepScanSummary {
  score: number;
  leaksCount: number;
  leaks?: Array<{ title: string; severity?: string; fix?: string }>;
  diagnostics?: {
    ttfbMs: number;
    titleLength?: number;
    metaDescLength?: number;
    sitemapValid?: boolean;
    robotsPresent?: boolean;
    llmsTxt?: { exists: boolean; wordCount?: number; generatedPreview: string };
    socialPreview?: { ogTitle?: string; ogImage?: string; twitterCard?: string };
    jsonLd?: { count: number; hasSoftwareSchema?: boolean; hasFaqSchema?: boolean };
    aiCrawlers?: Array<{ name: string; allowed: boolean }>;
    securityHeaders?: Array<{ name: string; present: boolean }>;
  };
}

/**
 * 视图 ⑥：AEO 体检、公开战报、套餐账单与项目设置全宽中心（彻底取代 384px 杂物抽屉）
 */
export default function WorkspaceSettingsView({
  campaign,
  tagline,
  entitlement,
  ledger,
  orders,
  publicReport,
  isZh,
  isSample,
  onCheckout,
  checkoutPlan,
  onPublishReport,
  sharingReport,
  onUpdateProject,
  onDeleteProject,
}: WorkspaceSettingsViewProps) {
  // AEO 体检态
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<DeepScanSummary | null>(null);

  const defaultReportTitle = isZh
    ? `${campaign?.product_name || "Your SaaS"} · 增长归因战报`
    : `${campaign?.product_name || "Your SaaS"} · Growth & Attribution Report`;

  // 公开战报配置
  const [reportTitle, setReportTitle] = useState(
    publicReport?.title || defaultReportTitle
  );
  const [showRevenue, setShowRevenue] = useState(publicReport ? Boolean(publicReport.show_revenue) : true);

  // 项目编辑与删除
  const [editName, setEditName] = useState(campaign?.product_name || "");
  const [editUrl, setEditUrl] = useState(campaign?.target_url || "");
  const [editTagline, setEditTagline] = useState(campaign?.tagline || "");
  const [editCompetitors, setEditCompetitors] = useState(campaign?.competitors || "");
  const [savingProj, setSavingProj] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProj, setDeletingProj] = useState(false);

  useEffect(() => {
    setEditName(campaign?.product_name || "");
    setEditUrl(campaign?.target_url || "");
    setEditTagline(campaign?.tagline || "");
    setEditCompetitors(campaign?.competitors || "");
    setReportTitle(publicReport?.title || defaultReportTitle);
    setShowRevenue(publicReport ? Boolean(publicReport.show_revenue) : true);
  }, [campaign, publicReport, defaultReportTitle]);

  const llmsDraft =
    scanResult?.diagnostics?.llmsTxt?.generatedPreview ||
    `# ${campaign?.product_name || "Your SaaS"}\n\n> ${tagline || campaign?.tagline || "Focused SaaS platform."}\n\n## Core Links\n- Homepage: ${campaign?.target_url || "https://your-saas.com"}\n- Competitors: ${campaign?.competitors || "Legacy tools"}\n`;

  const runScan = async () => {
    const scanTarget = isSample ? "https://linear.app" : campaign?.target_url || "";
    if (!scanTarget) {
      toast.error(isZh ? "当前项目尚未配置官网地址" : "Project URL is missing");
      return;
    }
    setScanning(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scanTarget }),
      });
      const json = (await res.json()) as DeepScanSummary & { error?: string };
      if (!res.ok) {
        toast.error(json.error || (isZh ? "AEO 体检请求失败" : "AEO scan failed"));
        return;
      }
      setScanResult(json);
      toast.success(isZh ? `12 维 AEO 实时体检完成：${json.score}/100 分` : `AEO audit finished: ${json.score}/100`);
    } catch {
      toast.error(isZh ? "体检网络超时，请重试" : "Scan timed out");
    } finally {
      setScanning(false);
    }
  };

  const handleDownloadLlms = () => {
    const blob = new Blob([llmsDraft], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "llms.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isZh ? "已下载 llms.txt，上传至网站根目录 /llms.txt 即可生效" : "Downloaded llms.txt");
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) return;
    if (isSample) {
      toast.info(isZh ? "体验模式不支持修改示例项目" : "Sign in to edit live projects");
      return;
    }
    setSavingProj(true);
    try {
      await onUpdateProject({
        campaignId: campaign.id,
        productName: editName.trim(),
        targetUrl: editUrl.trim(),
        tagline: editTagline.trim(),
        competitors: editCompetitors.trim(),
      });
    } finally {
      setSavingProj(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!campaign) return;
    setDeletingProj(true);
    try {
      const ok = await onDeleteProject(campaign.id);
      if (ok) setDeleteDialogOpen(false);
    } finally {
      setDeletingProj(false);
    }
  };

  const diag = scanResult?.diagnostics;

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6 min-w-0 tabular-nums">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isZh ? "AEO 体检、战报与账单设置" : "AEO Diagnostics, Reports & Billing"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isZh
            ? "一站管理当前方案权益配额、12 维 AEO 实时体检、公开可核验战报与项目基础设置"
            : "Manage plan quotas, run 12-point AEO audits, configure public reports, and edit workspace settings"}
        </p>
      </div>

      <Tabs defaultValue="billing" className="space-y-5">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="billing" className="px-3.5 text-xs">
            {isZh ? "套餐配额与账单" : "Plans & Billing"}
          </TabsTrigger>
          <TabsTrigger value="aeo" className="px-3.5 text-xs">
            {isZh ? "AEO 12 项体检 & /llms.txt" : "AEO Audit & /llms.txt"}
          </TabsTrigger>
          <TabsTrigger value="report" className="px-3.5 text-xs">
            {isZh ? "公开只读战报" : "Public Report"}
          </TabsTrigger>
          <TabsTrigger value="project" className="px-3.5 text-xs">
            {isZh ? "项目设置与删除" : "Project Settings"}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: 套餐配额与订单 */}
        <TabsContent value="billing" className="space-y-5">
          {/* 当前权益配额条 */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">
                    {isZh ? `当前方案：${formatPlanName(entitlement.plan, true)}` : `Current Plan: ${formatPlanName(entitlement.plan, false)}`}
                  </CardTitle>
                  <CardDescription className="mt-0.5">
                    {isZh ? "全部支付由 Creem 安全托管，开通后 10 秒内自动解锁配额" : "Payments processed securely by Creem with instant unlock"}
                  </CardDescription>
                </div>
                <Badge variant={entitlement.plan === "free" ? "neutral" : "success"}>
                  {formatPlanName(entitlement.plan, isZh)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 rounded-lg border p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{isZh ? "已解锁目录数" : "Unlocked Directories"}</span>
                  <span className="font-mono font-semibold">
                    {entitlement.maxDirectories} / {ledger.dirCounts.total}
                  </span>
                </div>
                <Progress value={(entitlement.maxDirectories / Math.max(1, ledger.dirCounts.total)) * 100} className="h-1.5" />
              </div>
              <div className="space-y-1.5 rounded-lg border p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{isZh ? "买家收件箱线索配额" : "Buyer Inbox Thread Quota"}</span>
                  <span className="font-mono font-semibold">
                    {entitlement.maxLeads >= 999 ? (isZh ? "无限制" : "Unlimited") : `${entitlement.maxLeads} ${isZh ? "条" : "threads"}`}
                  </span>
                </div>
                <Progress value={entitlement.maxLeads >= 999 ? 100 : Math.min(100, (entitlement.maxLeads / 20) * 100)} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

          {/* 3 档清晰方案对比 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                id: "blitz" as const,
                badge: isZh ? "一次性买断" : "One-time",
                name: isZh ? "自助加速包 · Launch Starter" : "Launch Starter",
                price: "$39",
                period: isZh ? "一次性" : "one-time",
                features: isZh
                  ? ["解锁全部 100+ 人工验证直达 Submit URL", "一键英文 Brand Kit 文案包 + HTTP 200 自动验活", "全套边缘归因短链 (/r/) + 1 行美元像素", "可核验公开战报页导出"]
                  : ["All 100+ verified direct Submit URLs", "1-click Brand Copy Pack + HTTP 200 verifier", "Edge shortlinks (/r/) + 1-line pixel", "Shareable public report"],
              },
              {
                id: "radar" as const,
                badge: isZh ? "最受欢迎" : "Recommended",
                name: isZh ? "增长指挥台 Pro" : "Growth Command Pro",
                price: "$29",
                period: isZh ? "/ 月" : "/ mo",
                highlight: true,
                features: isZh
                  ? ["含全部 100+ 海外高权目录三波次排期", "无限条 Reddit / HN / GitHub 买家原帖", "零链接防封号原生英文回复精编", "Slack / Discord 高意向实时 Webhook 推送"]
                  : ["All 100+ directories paced across 3 waves", "Unlimited Reddit / HN / GitHub threads", "Zero-link safe native reply studio", "Real-time Slack / Discord webhooks"],
              },
              {
                id: "dfy" as const,
                badge: isZh ? "全人工代投" : "Concierge",
                name: isZh ? "代投旗舰 · Done-For-You" : "Done-For-You Concierge",
                price: "$299",
                period: isZh ? "一次性" : "one-time",
                features: isZh
                  ? ["70+ 免费高权目录全人工逐站代投 + 30+ 严审站即贴包", "母语级英文 Brand Kit 定位重塑 + HTTP 200 回执", "附赠 30 天增长指挥台 Pro 完整权限", "30 天死链免费补投保障（不含第三方目录自收加急费）"]
                  : ["70+ free high-DR directories manually submitted + 30+ gated pack", "Human Brand Kit rewrite + HTTP 200 proofs", "Includes 30 days of Growth Command Pro", "30-day dead-link replacement guarantee"],
              },
            ].map((plan) => (
              <Card
                key={plan.id}
                className={`flex flex-col shadow-xs ${plan.highlight ? "border-primary/50 ring-1 ring-primary/15" : ""}`}
              >
                <CardHeader className="pb-3">
                  <Badge variant={plan.highlight ? "info" : "neutral"} className="w-fit text-[11px]">
                    {plan.badge}
                  </Badge>
                  <CardTitle className="text-base mt-1">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1 pt-1">
                    <span className="text-2xl font-bold font-mono">{plan.price}</span>
                    <span className="text-xs text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between gap-4">
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <IconCheck className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={plan.highlight ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                    disabled={checkoutPlan === plan.id}
                    onClick={() => void onCheckout(plan.id)}
                  >
                    {checkoutPlan === plan.id
                      ? isZh
                        ? "正在跳转结账..."
                        : "Opening checkout..."
                      : isZh
                        ? `立即开通 (${plan.price})`
                        : `Upgrade (${plan.price})`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 完整历史订单表 */}
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle className="text-base">{isZh ? "历史账单与订单明细" : "Order History"}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isZh ? "订单编号" : "Order ID"}</TableHead>
                    <TableHead>{isZh ? "所购方案" : "Plan"}</TableHead>
                    <TableHead>{isZh ? "金额" : "Amount"}</TableHead>
                    <TableHead>{isZh ? "状态" : "Status"}</TableHead>
                    <TableHead className="text-right">{isZh ? "支付时间" : "Date"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-20 text-center text-xs text-muted-foreground">
                        {isZh ? "暂无已支付订单记录" : "No paid orders yet"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((o) => (
                      <TableRow key={o.order_id}>
                        <TableCell className="font-mono text-xs">{o.order_id}</TableCell>
                        <TableCell className="text-xs font-medium">{formatPlanName(o.plan, isZh)}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold">${o.amount_usd}</TableCell>
                        <TableCell>
                          <Badge variant={o.status === "active" ? "success" : "neutral"} className="text-[11px]">
                            {formatOrderStatus(o.status, isZh)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {formatDateTimeLabel(o.created_at, isZh)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: AEO 12 项体检 + /llms.txt */}
        <TabsContent value="aeo" className="space-y-5">
          <Card className="shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <IconShieldCheck className="size-4 text-primary" />
                  {isZh ? "12 维 AEO / AI 搜索引擎实时体检" : "12-Point Live AEO & AI Crawler Audit"}
                </CardTitle>
                <CardDescription className="font-mono text-xs mt-1">
                  {isSample
                    ? isZh
                      ? "https://linear.app (示例体检目标)"
                      : "https://linear.app (sample target)"
                    : campaign?.target_url || "https://your-saas.com"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {scanResult && (
                  <Badge variant={scanResult.score >= 80 ? "success" : scanResult.score >= 60 ? "warning" : "destructive"} className="font-mono">
                    {scanResult.score}/100
                  </Badge>
                )}
                <Button size="sm" disabled={scanning} onClick={() => void runScan()}>
                  <IconRefresh className={`size-3.5 ${scanning ? "animate-spin" : ""}`} />
                  {scanning ? (isZh ? "实时扫描中..." : "Scanning...") : isZh ? "运行 12 项实时体检" : "Run Live Audit"}
                </Button>
              </div>
            </CardHeader>
            {diag && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: isZh ? "TTFB 响应" : "Edge TTFB", value: `${diag.ttfbMs} ms`, ok: diag.ttfbMs < 1000 },
                    {
                      label: "Sitemap.xml",
                      value: diag.sitemapValid ? (isZh ? "已就绪" : "Valid") : isZh ? "缺失" : "Missing",
                      ok: Boolean(diag.sitemapValid),
                    },
                    {
                      label: "/llms.txt",
                      value: diag.llmsTxt?.exists ? (isZh ? "已部署" : "Deployed") : isZh ? "未部署" : "Missing",
                      ok: Boolean(diag.llmsTxt?.exists),
                    },
                    {
                      label: isZh ? "JSON-LD 结构化" : "JSON-LD Schema",
                      value: `${diag.jsonLd?.count || 0} ${isZh ? "块" : "blocks"}`,
                      ok: (diag.jsonLd?.count || 0) > 0,
                    },
                  ].map((item, idx) => (
                    <div key={idx} className="rounded-lg border p-3 space-y-1">
                      <p className="text-[11px] text-muted-foreground">{item.label}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold font-mono">{item.value}</span>
                        <Badge variant={item.ok ? "success" : "warning"} className="text-[10px]">
                          {item.ok ? (isZh ? "通过" : "Pass") : isZh ? "待补" : "Fix"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {diag.aiCrawlers && diag.aiCrawlers.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {isZh ? "主流 AI 爬虫放行状态（robots.txt）" : "AI Crawler Access Matrix"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {diag.aiCrawlers.map((bot, bIdx) => {
                        const botLabel =
                          (bot as { name?: string; bot?: string }).name ||
                          (bot as { bot?: string }).bot ||
                          `Crawler-${bIdx + 1}`;
                        return (
                          <Badge key={botLabel} variant={bot.allowed ? "success" : "destructive"} className="text-xs font-mono">
                            {botLabel}: {bot.allowed ? "Allow" : "Blocked"}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {scanResult?.leaks && scanResult.leaks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {isZh ? `待修复项明细（${scanResult.leaks.length} 项）` : `Actionable Issues (${scanResult.leaks.length})`}
                    </p>
                    <div className="divide-y rounded-lg border">
                      {scanResult.leaks.slice(0, 8).map((lk, i) => (
                        <div key={i} className="p-3 text-xs space-y-0.5">
                          <p className="font-medium text-foreground">{lk.title}</p>
                          {lk.fix && <p className="text-muted-foreground">{lk.fix}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle className="text-base">
                {isZh ? "/llms.txt 自动生成与部署指南" : "Auto-Generated /llms.txt Manifest"}
              </CardTitle>
              <CardDescription>
                {isZh
                  ? "上传至网站根目录（例如 https://your-saas.com/llms.txt），帮助 ChatGPT、Perplexity 与 Claude 准确引用你的产品"
                  : "Upload to your site root (/llms.txt) so ChatGPT, Perplexity & Claude cite your product accurately"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="rounded-lg border bg-muted/50 p-3.5 font-mono text-xs whitespace-pre-wrap break-words leading-relaxed">
                {llmsDraft}
              </pre>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard?.writeText(llmsDraft).catch(() => {});
                      toast.success(isZh ? "llms.txt 已复制" : "Copied llms.txt");
                    }}
                  >
                    <IconCopy className="size-3.5" />
                    {isZh ? "复制内容" : "Copy"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadLlms}>
                    <IconDownload className="size-3.5" />
                    {isZh ? "下载 llms.txt" : "Download .txt"}
                  </Button>
                </div>
                <Link href="/tools/aeo-checker" className="text-xs text-primary hover:underline">
                  {isZh ? "打开公开体检对比页 ↗" : "Open Public AEO Tool ↗"}
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: 公开只读战报配置 */}
        <TabsContent value="report">
          <Card className="max-w-2xl shadow-xs">
            <CardHeader>
              <CardTitle className="text-base">{isZh ? "公开可核验增长战报" : "Public Verifiable Growth Report"}</CardTitle>
              <CardDescription>
                {isZh
                  ? "自定义对外展示标题与营收可见性，一键生成只读战报链接，适合分享给团队、合作方或投资人"
                  : "Customize title and revenue visibility to share live verified progress with stakeholders"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="rpt-title">{isZh ? "公开战报标题" : "Public Report Title"}</Label>
                <Input
                  id="rpt-title"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="AcmeFlow · 30-Day Growth Report"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3.5">
                <div className="space-y-0.5">
                  <Label htmlFor="rpt-rev" className="text-sm font-medium cursor-pointer">
                    {isZh ? "在公开战报中展示归因美元营收" : "Display Attributed Revenue (USD)"}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isZh ? "关闭后仅对外展示外链收录、点击量与转化趋势，隐藏具体金额" : "Hide dollar totals while keeping backlinks & traffic public"}
                  </p>
                </div>
                <Switch
                  id="rpt-rev"
                  checked={showRevenue}
                  onCheckedChange={(v) => setShowRevenue(Boolean(v))}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  disabled={sharingReport}
                  onClick={() => void onPublishReport({ title: reportTitle.trim(), showRevenue })}
                >
                  <IconShare className="size-3.5" />
                  {sharingReport ? (isZh ? "生成中..." : "Publishing...") : isZh ? "保存配置并复制链接" : "Save & Copy Share Link"}
                </Button>
                {publicReport?.share_id && (
                  <Button variant="outline" size="sm" render={<Link href={`/report?id=${publicReport.share_id}`} />}>
                    {isZh ? "打开公开预览页" : "Preview Report"}
                    <IconExternalLink className="size-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: 项目设置与危险区删除 */}
        <TabsContent value="project" className="space-y-5">
          <Card className="max-w-2xl shadow-xs">
            <CardHeader>
              <CardTitle className="text-base">{isZh ? "编辑当前出海项目" : "Edit Active Project"}</CardTitle>
              <CardDescription>
                {isZh ? "修改产品名称、官网地址、简介或竞品词，不会影响已有短链与目录记录" : "Update project metadata without losing shortlinks or submissions"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProject} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-proj-name">{isZh ? "产品名称" : "Product Name"}</Label>
                    <Input
                      id="edit-proj-name"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-proj-url">{isZh ? "官网地址 (HTTPS)" : "Target URL (HTTPS)"}</Label>
                    <Input
                      id="edit-proj-url"
                      type="url"
                      required
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-proj-tag">{isZh ? "一句话定位" : "One-line Tagline"}</Label>
                  <Input
                    id="edit-proj-tag"
                    value={editTagline}
                    onChange={(e) => setEditTagline(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-proj-comp">{isZh ? "主要竞品（逗号分隔）" : "Competitors (comma-separated)"}</Label>
                  <Input
                    id="edit-proj-comp"
                    value={editCompetitors}
                    onChange={(e) => setEditCompetitors(e.target.value)}
                  />
                </div>
                <Button type="submit" size="sm" disabled={savingProj || !campaign}>
                  {savingProj ? (isZh ? "保存中..." : "Saving...") : isZh ? "保存项目更改" : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {!isSample && campaign && (
            <Card className="max-w-2xl border-destructive/35 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-destructive flex items-center gap-2">
                  <IconAlertTriangle className="size-4" />
                  {isZh ? "危险操作区" : "Danger Zone"}
                </CardTitle>
                <CardDescription>
                  {isZh
                    ? `删除项目「${campaign.product_name}」将同步清理该项目关联的品牌资料、追踪短链、监听规则与买家线索，操作不可恢复。`
                    : `Deleting "${campaign.product_name}" permanently removes its Brand Kit, tracking links, radar monitors, and leads.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                  <IconTrash className="size-3.5" />
                  {isZh ? "删除当前项目" : "Delete Project"}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isZh ? "确认删除该项目？" : "Delete this project?"}</DialogTitle>
            <DialogDescription>
              {isZh
                ? `删除「${campaign?.product_name}」后无法撤销，其关联短链与线索将永久清除。`
                : `This permanently deletes "${campaign?.product_name}" and cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
              {isZh ? "取消" : "Cancel"}
            </Button>
            <Button variant="destructive" disabled={deletingProj} onClick={() => void handleConfirmDelete()}>
              {deletingProj ? (isZh ? "删除中..." : "Deleting...") : isZh ? "确认永久删除" : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
