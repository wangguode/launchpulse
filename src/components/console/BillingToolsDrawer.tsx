"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { IconCopy, IconExternalLink, IconRefresh, IconShare } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BillingToolsDrawerProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  targetUrl: string;
  tagline: string;
  competitors: string;
  orders: Array<{ order_id: string; plan: string; amount_usd: number; status: string; created_at: string }>;
  publicShareId?: string;
  isZh: boolean;
  isSample: boolean;
  onCheckout: (plan: "blitz" | "radar" | "dfy") => Promise<void> | void;
  checkoutPlan: string | null;
  onShareReport: () => Promise<void> | void;
  sharingReport: boolean;
}

interface DeepScanSummary {
  score: number;
  leaksCount: number;
  diagnostics?: {
    ttfbMs: number;
    llmsTxt: { exists: boolean; generatedPreview: string };
  };
}

/**
 * 基于官方 shadcn/ui Sheet + Tabs + Card 的套餐账单与 AEO 体检抽屉
 */
export default function BillingToolsDrawer({
  open,
  onClose,
  productName,
  targetUrl,
  tagline,
  competitors,
  orders,
  publicShareId,
  isZh,
  isSample,
  onCheckout,
  checkoutPlan,
  onShareReport,
  sharingReport,
}: BillingToolsDrawerProps) {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<DeepScanSummary | null>(null);

  const llmsDraft =
    scanResult?.diagnostics?.llmsTxt?.generatedPreview ||
    `# ${productName || "Your SaaS"}\n\n> ${tagline || "Focused SaaS product."}\n\n## Core Links\n- Homepage: ${targetUrl || "https://your-saas.com"}\n- Competitors: ${competitors || "Legacy suites"}\n`;

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: isSample ? "https://certnudge.dev" : targetUrl || "https://certnudge.dev" }),
      });
      if (res.ok) {
        setScanResult((await res.json()) as DeepScanSummary);
        toast.success(isZh ? "12 项 AEO 复检完成" : "AEO audit complete");
      }
    } finally {
      setScanning(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>{isZh ? "套餐账单与增长工具" : "Billing & Growth Tools"}</SheetTitle>
          <SheetDescription>
            {isZh ? "Creem 安全结算、公开只读战报与 AEO 实时复检" : "Creem billing, verifiable reports & AEO diagnostics"}
          </SheetDescription>
        </SheetHeader>

        <div className="p-5">
          <Tabs defaultValue="billing" className="space-y-4">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="billing">{isZh ? "套餐与账单" : "Plans & Billing"}</TabsTrigger>
              <TabsTrigger value="aeo">{isZh ? "战报与 AEO 工具" : "Report & AEO"}</TabsTrigger>
            </TabsList>

            <TabsContent value="billing" className="space-y-4">
              <div className="space-y-3">
                {[
                  {
                    id: "blitz" as const,
                    name: isZh ? "启动包 · 30 核心目录" : "Launch Starter",
                    price: "$39",
                    note: isZh ? "一次性 · 外链验活回执与归因短链" : "One-time · 30 Tier-1 directories",
                  },
                  {
                    id: "radar" as const,
                    name: isZh ? "增长指挥台 · 全功能" : "Growth Command",
                    price: "$29/月",
                    note: isZh ? "推荐 · 100 目录 + 买家收件箱 + 归因漏斗" : "Popular · 100 dirs + Buyer Inbox",
                  },
                  {
                    id: "dfy" as const,
                    name: isZh ? "代投旗舰 · 人工全托管" : "Done-For-You",
                    price: "$299",
                    note: isZh ? "一次性 · 人工代提交 100+ 站与死链包补" : "One-time · Concierge submission",
                  },
                ].map((plan) => (
                  <Card key={plan.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{plan.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{plan.note}</p>
                      </div>
                      <Button
                        variant={plan.id === "radar" ? "default" : "outline"}
                        size="sm"
                        disabled={checkoutPlan === plan.id}
                        onClick={() => onCheckout(plan.id)}
                      >
                        {plan.price}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{isZh ? "历史订单记录" : "Order History"}</CardTitle>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{isZh ? "暂无已支付订单。" : "No orders yet."}</p>
                  ) : (
                    <div className="divide-y text-xs tabular-nums">
                      {orders.map((o) => (
                        <div key={o.order_id} className="py-2 flex items-center justify-between">
                          <span className="font-mono">{o.order_id}</span>
                          <Badge variant="outline" className="font-mono">
                            ${o.amount_usd}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="aeo" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{isZh ? "公开可核验战报页" : "Public Growth Report"}</CardTitle>
                  <CardDescription className="text-xs">
                    {isZh ? "一键复制只读链接，向团队或投资人展示实证收录与归因。" : "Read-only shareable proof of ROI."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <Button size="sm" disabled={sharingReport} onClick={onShareReport}>
                    <IconShare className="size-3.5" />
                    {isZh ? "生成并复制链接" : "Copy Link"}
                  </Button>
                  {publicShareId && (
                    <Button variant="outline" size="sm" render={<Link href={`/report?id=${publicShareId}`} />}>
                      {isZh ? "预览公开页" : "Preview"}
                      <IconExternalLink className="size-3.5" />
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{isZh ? "AEO 复检与 /llms.txt" : "AEO & /llms.txt"}</CardTitle>
                  <CardDescription className="text-xs truncate max-w-[240px]">
                    {targetUrl || "https://your-saas.com"}
                  </CardDescription>
                  <CardAction>
                    <Button variant="outline" size="sm" disabled={scanning} onClick={runScan}>
                      <IconRefresh className={`size-3.5 ${scanning ? "animate-spin" : ""}`} />
                      {isZh ? "复检" : "Scan"}
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-3">
                  {scanResult && (
                    <div className="flex items-center gap-3 text-xs tabular-nums">
                      <Badge variant="secondary">
                        {isZh ? `健康分 ${scanResult.score}/100` : `Score ${scanResult.score}/100`}
                      </Badge>
                      <Badge variant="outline">
                        {isZh ? `待修 ${scanResult.leaksCount} 项` : `${scanResult.leaksCount} issues`}
                      </Badge>
                    </div>
                  )}
                  <pre className="rounded-md border bg-muted p-3 font-mono text-xs whitespace-pre-wrap overflow-x-auto">
                    {llmsDraft}
                  </pre>
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard?.writeText(llmsDraft).catch(() => {});
                        toast.success(isZh ? "llms.txt 内容已复制" : "Copied llms.txt");
                      }}
                    >
                      <IconCopy className="size-3.5" />
                      {isZh ? "复制 llms.txt" : "Copy llms.txt"}
                    </Button>
                    <Link href="/tools/aeo-checker" className="text-xs text-primary hover:underline">
                      {isZh ? "打开完整体检台 ↗" : "Full AEO Studio ↗"}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
