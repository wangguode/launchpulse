"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  IconBroadcast,
  IconCheck,
  IconCode,
  IconCopy,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconGlobe,
  IconLink,
  IconPlus,
  IconTrash,
  IconTrendingUp,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatChannelLabel,
  formatDateTimeLabel,
  getSiteOrigin,
  type OverviewPayload,
  type ReconciledLedger,
  type TrackingLinkRecord,
} from "@/lib/console-ledger";

interface AttributionAnalyticsViewProps {
  campaignId: number;
  targetUrl: string;
  links: TrackingLinkRecord[];
  stats: OverviewPayload["stats"];
  ledger: ReconciledLedger;
  isZh: boolean;
  isSample: boolean;
  onRefresh: () => Promise<void> | void;
}

const COUNTRY_NAMES_ZH: Record<string, string> = {
  US: "美国 (US)",
  DE: "德国 (DE)",
  GB: "英国 (GB)",
  JP: "日本 (JP)",
  CA: "加拿大 (CA)",
  FR: "法国 (FR)",
  AU: "澳大利亚 (AU)",
  SG: "新加坡 (SG)",
  NL: "荷兰 (NL)",
  IN: "印度 (IN)",
  UN: "未知地区",
};

/**
 * 视图 ④：归因短链与流量分析台（独立全宽页，释放后端全部地域、设备与实时点击流能力）
 */
export default function AttributionAnalyticsView({
  campaignId,
  targetUrl,
  links,
  stats,
  ledger,
  isZh,
  isSample,
  onRefresh,
}: AttributionAnalyticsViewProps) {
  const [newChannel, setNewChannel] = useState("directory");
  const [newLabel, setNewLabel] = useState("");
  const [newDestUrl, setNewDestUrl] = useState(targetUrl || "");
  const [creatingLink, setCreatingLink] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [testingPixel, setTestingPixel] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const siteOrigin = getSiteOrigin();
  const pixelScript = `<script src="${siteOrigin}/api/pixel.js" defer></script>`;
  const nextJsSnippet = `// app/layout.tsx\nimport Script from "next/script";\n\n<Script src="${siteOrigin}/api/pixel.js" strategy="afterInteractive" />\n\n// 注册或收款成功后调用：\nwindow.lpConvert?.("signup");\nwindow.lpConvert?.("purchase", 39);`;
  const stripeSnippet = `// Stripe / Creem Checkout Success 页面回调\nif (typeof window !== "undefined" && typeof window.lpConvert === "function") {\n  window.lpConvert("purchase", 29);\n}`;

  const copyText = async (id: string, text: string, msg?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success(msg || (isZh ? "已复制到剪贴板" : "Copied to clipboard"));
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      toast.error(isZh ? "复制失败，请手动复制" : "Clipboard copy failed");
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = newLabel.trim();
    const dest = (newDestUrl || targetUrl).trim();
    if (!label) {
      toast.error(isZh ? "请填写渠道备注名称" : "Enter a link label");
      return;
    }
    if (!dest.startsWith("https://")) {
      toast.error(isZh ? "目标网址必须以 https:// 开头" : "Destination URL must start with https://");
      return;
    }
    if (isSample) {
      toast.info(isZh ? "体验模式预览：登录后可生成持久化短链并实时追踪" : "Sign in to create live tracking links");
      return;
    }
    if (!campaignId) return;
    setCreatingLink(true);
    try {
      const res = await fetch("/api/dashboard/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          channel: newChannel,
          label,
          destinationUrl: dest,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; code?: string; error?: string };
      if (!res.ok) {
        toast.error(json.error || (isZh ? "创建短链失败，请检查目标网址" : "Failed to create shortlink"));
        return;
      }
      setNewLabel("");
      toast.success(isZh ? `归因短链 /r/${json.code} 已生成` : `Created /r/${json.code}`);
      await onRefresh();
    } catch {
      toast.error(isZh ? "网络异常，请重试" : "Network error");
    } finally {
      setCreatingLink(false);
    }
  };

  const handleDeleteLink = async (code: string) => {
    if (isSample) {
      toast.info(isZh ? "体验模式暂不支持删除示例短链" : "Cannot delete sample links");
      return;
    }
    setDeletingCode(code);
    try {
      const res = await fetch("/api/dashboard/links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        toast.error(isZh ? "删除短链失败" : "Failed to delete link");
        return;
      }
      toast.success(isZh ? `已删除短链 /r/${code}` : `Deleted /r/${code}`);
      await onRefresh();
    } finally {
      setDeletingCode(null);
    }
  };

  const handleTestPixel = async () => {
    const targetCode = links[0]?.code;
    if (!targetCode) {
      toast.error(isZh ? "请先生成至少 1 条追踪短链" : "Create at least one tracking link first");
      return;
    }
    if (isSample) {
      toast.success(isZh ? "体验校验通过：归因回传链路工作正常" : "Sample pixel verification passed");
      return;
    }
    setTestingPixel(true);
    try {
      const res = await fetch("/api/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: targetCode, event: "signup", valueUsd: 0 }),
      });
      if (res.ok) {
        toast.success(isZh ? `像素回传测试成功：/r/${targetCode} 已收到测试事件` : `Verified pixel on /r/${targetCode}`);
        await onRefresh();
      } else {
        toast.error(isZh ? "回传校验失败，请稍后重试" : "Pixel test failed");
      }
    } finally {
      setTestingPixel(false);
    }
  };

  const countryTotal = Math.max(1, (stats.countryBreakdown || []).reduce((s, c) => s + c.clicks, 0));
  const deviceTotal = Math.max(1, (stats.deviceBreakdown || []).reduce((s, d) => s + d.clicks, 0));

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6 min-w-0 tabular-nums">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isZh ? "归因短链与流量分析" : "Attribution Links & Analytics"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isZh
            ? "管理各渠道独立短链、接入 1 行美元归因像素，并实时洞察访客国家、设备与来源明细"
            : "Manage per-channel edge shortlinks, install the 1-line pixel, and inspect country, device & live click telemetry"}
        </p>
      </div>

      {/* 顶部 4 项实时归因核心指标 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription>{isZh ? "累计归因点击" : "Total Clicks"}</CardDescription>
            <CardTitle className="text-2xl font-semibold flex items-center gap-2">
              {stats.totalClicks.toLocaleString()}
              {stats.clicksDeltaPct !== 0 && (
                <Badge variant={stats.clicksDeltaPct > 0 ? "success" : "destructive"} className="text-[11px]">
                  <IconTrendingUp className="size-3" />
                  {stats.clicksDeltaPct > 0 ? "+" : ""}
                  {stats.clicksDeltaPct}%
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription>{isZh ? "累计转化（注册+付费）" : "Total Conversions"}</CardDescription>
            <CardTitle className="text-2xl font-semibold flex items-center gap-2">
              {stats.totalConversions.toLocaleString()}
              {stats.conversionsDeltaPct !== 0 && (
                <Badge variant={stats.conversionsDeltaPct > 0 ? "success" : "destructive"} className="text-[11px]">
                  {stats.conversionsDeltaPct > 0 ? "+" : ""}
                  {stats.conversionsDeltaPct}%
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription>{isZh ? "整体点击转化率 (CVR)" : "Conversion Rate (CVR)"}</CardDescription>
            <CardTitle className="text-2xl font-semibold">{stats.conversionRate}%</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription>{isZh ? "归因美元营收 / RPV" : "Revenue / RPV"}</CardDescription>
            <CardTitle className="text-2xl font-semibold">
              ${ledger.revenue.totalUsd.toLocaleString()}
              <span className="ml-2 text-xs font-normal text-muted-foreground font-mono">
                ${stats.rpv.toFixed(2)}/click
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 第一行：短链创建与管理表（左 7）+ 归因像素与框架范例（右 5） */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7 min-w-0 shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconLink className="size-4 text-primary" />
              {isZh ? "边缘归因短链矩阵" : "Edge Attribution Shortlinks"}
            </CardTitle>
            <CardDescription>
              {isZh
                ? "不同目录、社区回复或对比页使用独立短链，自动透传 UTM 并记录每次点击与美元转化"
                : "Create dedicated shortlinks per channel to measure exact CVR and revenue per click"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleCreateLink} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 rounded-lg border bg-muted/30 p-3">
              <div className="sm:col-span-3 space-y-1">
                <Label htmlFor="link-channel" className="text-[11px] text-muted-foreground">
                  {isZh ? "投放渠道" : "Channel"}
                </Label>
                <Select value={newChannel} onValueChange={(v) => v && setNewChannel(String(v))}>
                  <SelectTrigger id="link-channel" className="h-8 bg-background text-xs">
                    <SelectValue>{formatChannelLabel(newChannel, isZh)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="directory">{isZh ? "目录外链" : "Directory"}</SelectItem>
                    <SelectItem value="community">{isZh ? "社区回复" : "Community"}</SelectItem>
                    <SelectItem value="seo">{isZh ? "竞品对比页" : "Comparison"}</SelectItem>
                    <SelectItem value="social">{isZh ? "社媒简介" : "Social Bio"}</SelectItem>
                    <SelectItem value="custom">{isZh ? "自定义渠道" : "Custom"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-4 space-y-1">
                <Label htmlFor="link-label" className="text-[11px] text-muted-foreground">
                  {isZh ? "渠道备注" : "Label"}
                </Label>
                <Input
                  id="link-label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder={isZh ? "如 Show HN 首发" : "e.g. Show HN Launch"}
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div className="sm:col-span-5 space-y-1">
                <Label htmlFor="link-dest" className="text-[11px] text-muted-foreground">
                  {isZh ? "落地目标网址 (HTTPS)" : "Destination URL"}
                </Label>
                <div className="flex gap-1.5">
                  <Input
                    id="link-dest"
                    value={newDestUrl}
                    onChange={(e) => setNewDestUrl(e.target.value)}
                    placeholder={targetUrl || "https://your-saas.com"}
                    className="h-8 font-mono text-xs bg-background flex-1"
                  />
                  <Button type="submit" size="sm" className="h-8 shrink-0" disabled={creatingLink}>
                    <IconPlus className="size-3.5" />
                    {isZh ? "生成" : "Add"}
                  </Button>
                </div>
              </div>
            </form>

            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isZh ? "短链与落地页" : "Link & Destination"}</TableHead>
                    <TableHead className="text-right">{isZh ? "点击 / 转化" : "Clicks / Conv"}</TableHead>
                    <TableHead className="text-right">{isZh ? "CVR / 营收" : "CVR / Rev"}</TableHead>
                    <TableHead className="text-right">{isZh ? "操作" : "Action"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-20 text-center text-xs text-muted-foreground">
                        {isZh ? "暂无短链，请在上方生成第一条追踪短链" : "No tracking links yet"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    links.map((lk) => {
                      const fullUrl = `${siteOrigin}/r/${lk.code}`;
                      return (
                        <TableRow key={lk.code}>
                          <TableCell className="min-w-[180px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-xs">{lk.label}</span>
                              <Badge variant="info" className="text-[10px]">
                                {formatChannelLabel(lk.channel, isZh)}
                              </Badge>
                            </div>
                            <p className="font-mono text-[11px] text-primary mt-0.5">/r/{lk.code}</p>
                            <p className="font-mono text-[11px] text-muted-foreground truncate max-w-[230px]">
                              → {lk.destination_url}
                            </p>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                            <div>{lk.clicks_count.toLocaleString()}</div>
                            <div className="text-muted-foreground">{lk.conversions_count} conv</div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                            <div className="font-semibold text-foreground">${lk.revenue_usd || 0}</div>
                            <div className="text-muted-foreground">{lk.cvr ?? 0}% CVR</div>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => copyText(`lk-${lk.code}`, fullUrl, isZh ? "短链已复制" : "Shortlink copied")}
                              >
                                {copiedId === `lk-${lk.code}` ? <IconCheck className="size-3.5" /> : <IconCopy className="size-3.5" />}
                                {isZh ? "复制" : "Copy"}
                              </Button>
                              {!isSample && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  aria-label={isZh ? `删除短链 ${lk.code}` : `Delete link ${lk.code}`}
                                  disabled={deletingCode === lk.code}
                                  onClick={() => void handleDeleteLink(lk.code)}
                                >
                                  <IconTrash className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 min-w-0 shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconCode className="size-4 text-primary" />
              {isZh ? "1 行美元归因像素与接入示例" : "1-Line Attribution Pixel & Guides"}
            </CardTitle>
            <CardDescription>
              {isZh
                ? "在官网引入脚本后，在注册与付款成功页触发 window.lpConvert()"
                : "Include the script once, then fire window.lpConvert() on signup or payment"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="html" className="space-y-3">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="html" className="text-xs">HTML</TabsTrigger>
                <TabsTrigger value="nextjs" className="text-xs">Next.js</TabsTrigger>
                <TabsTrigger value="checkout" className="text-xs">Stripe / Creem</TabsTrigger>
              </TabsList>

              <TabsContent value="html" className="space-y-2.5">
                <pre className="rounded-lg border bg-muted/60 p-3 font-mono text-xs whitespace-pre-wrap break-all leading-relaxed">
                  {pixelScript}
                </pre>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isZh
                    ? "将上方标签放入官网 <head>；注册完成触发 window.lpConvert('signup')，收款成功触发 window.lpConvert('purchase', 39)。"
                    : "Place in <head>. Trigger window.lpConvert('signup') on signup and window.lpConvert('purchase', 39) on payment."}
                </p>
              </TabsContent>

              <TabsContent value="nextjs" className="space-y-2.5">
                <pre className="rounded-lg border bg-muted/60 p-3 font-mono text-[11px] whitespace-pre-wrap break-all leading-relaxed">
                  {nextJsSnippet}
                </pre>
              </TabsContent>

              <TabsContent value="checkout" className="space-y-2.5">
                <pre className="rounded-lg border bg-muted/60 p-3 font-mono text-[11px] whitespace-pre-wrap break-all leading-relaxed">
                  {stripeSnippet}
                </pre>
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyText("pixel", pixelScript, isZh ? "HTML 归因脚本已复制" : "Pixel snippet copied")}
              >
                {copiedId === "pixel" ? <IconCheck className="size-3.5" /> : <IconCopy className="size-3.5" />}
                {isZh ? "复制脚本" : "Copy Script"}
              </Button>
              <Button size="sm" disabled={testingPixel} onClick={() => void handleTestPixel()}>
                <IconBroadcast className="size-3.5" />
                {testingPixel ? (isZh ? "回传测试中..." : "Testing...") : isZh ? "发送测试回传" : "Send Test Ping"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 第二行：释放后端 40% 沉睡分析资产 — 国家分布 + 设备分布 + 实时点击流水 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-4 min-w-0 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <IconGlobe className="size-4 text-primary" />
              {isZh ? "访客国家 / 地区分布" : "Top Countries"}
            </CardTitle>
            <CardDescription>{isZh ? "由边缘短链节点实时识别访客地域" : "Geo-detected at Cloudflare Edge"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(stats.countryBreakdown || []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">
                {isZh ? "尚无国家点击数据，分享短链后实时展示" : "No country clicks yet"}
              </p>
            ) : (
              stats.countryBreakdown.map((c) => {
                const pct = Math.round((c.clicks / countryTotal) * 100);
                return (
                  <div key={c.country} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">
                        {isZh ? COUNTRY_NAMES_ZH[c.country] || c.country : c.country}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        <strong className="text-foreground">{c.clicks}</strong> ({pct}%)
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 min-w-0 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">{isZh ? "访问设备占比" : "Devices"}</CardTitle>
            <CardDescription>{isZh ? "桌面端 vs 移动端访问结构" : "Desktop vs Mobile clicks"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(stats.deviceBreakdown || []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">
                {isZh ? "尚无设备统计数据" : "No device data yet"}
              </p>
            ) : (
              stats.deviceBreakdown.map((d) => {
                const pct = Math.round((d.clicks / deviceTotal) * 100);
                const isMobile = d.device.toLowerCase() === "mobile";
                return (
                  <div key={d.device} className="rounded-lg border p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        {isMobile ? <IconDeviceMobile className="size-4 text-primary" /> : <IconDeviceDesktop className="size-4 text-primary" />}
                        {isMobile ? (isZh ? "移动端" : "Mobile") : isZh ? "桌面端" : "Desktop"}
                      </span>
                      <Badge variant="neutral" className="font-mono">{pct}%</Badge>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {d.clicks.toLocaleString()} {isZh ? "次点击" : "clicks"}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 min-w-0 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">{isZh ? "实时点击明细日志" : "Live Click Stream"}</CardTitle>
            <CardDescription>{isZh ? "最近 12 条边缘节点真实跳转记录" : "Latest 12 edge shortlink redirects"}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isZh ? "短链" : "Code"}</TableHead>
                  <TableHead>{isZh ? "来源域名" : "Referer"}</TableHead>
                  <TableHead>{isZh ? "地区/设备" : "Geo / Device"}</TableHead>
                  <TableHead className="text-right">{isZh ? "时间" : "Time"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stats.recentClicks || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-xs text-muted-foreground">
                      {isZh ? "暂无实时点击记录，在外部渠道投放你的短链即可看到实时访问流" : "No click events recorded yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentClicks.map((clk, idx) => (
                    <TableRow key={`${clk.code}-${idx}`}>
                      <TableCell className="font-mono text-xs text-primary">/r/{clk.code}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[140px]">
                        {clk.referer ? clk.referer.replace(/^https?:\/\//, "") : isZh ? "直接访问" : "Direct"}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        <Badge variant="neutral" className="mr-1 font-mono text-[10px]">
                          {clk.country}
                        </Badge>
                        <span className="text-muted-foreground text-[11px]">{clk.device}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {formatDateTimeLabel(clk.clicked_at, isZh).slice(5)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
