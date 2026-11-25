"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, RefreshCw, Share2, X } from "lucide-react";
import Button from "@/components/ui/Button";

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
 * 静音底栏抽屉：套餐与账单 + AEO 体检与公开战报（让主导航永久保持极简 3 项）
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
  const [section, setSection] = useState<"billing" | "aeo">("billing");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<DeepScanSummary | null>(null);
  const [copiedLlms, setCopiedLlms] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const llmsDraft =
    scanResult?.diagnostics?.llmsTxt?.generatedPreview ||
    `# ${productName || "Your SaaS"}\n\n> ${tagline || "Focused SaaS product."}\n\n## Core Links\n- Homepage: ${targetUrl || "https://your-saas.com"}\n- Alternatives to: ${competitors || "Legacy suites"}\n`;

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
      }
    } finally {
      setScanning(false);
    }
  };

  const copyLlms = async () => {
    try {
      await navigator.clipboard.writeText(llmsDraft);
      setCopiedLlms(true);
      setTimeout(() => setCopiedLlms(false), 1600);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isZh ? "套餐账单与增长工具" : "Billing & Tools"}
    >
      <div
        className="w-full max-w-[520px] h-full bg-[var(--bg-sheet)] border-l border-[var(--border-hairline)] flex flex-col"
        style={{ boxShadow: "var(--overlay-shadow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[var(--border-hairline)] flex items-center justify-between">
          <div className="flex items-center gap-4 text-[13.5px]">
            <button
              type="button"
              onClick={() => setSection("billing")}
              className={`pb-1 border-b-2 lp-ease cursor-pointer ${
                section === "billing"
                  ? "border-[var(--ink-primary)] text-[var(--ink-primary)] font-semibold"
                  : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              }`}
            >
              {isZh ? "套餐与账单" : "Plans & Billing"}
            </button>
            <button
              type="button"
              onClick={() => setSection("aeo")}
              className={`pb-1 border-b-2 lp-ease cursor-pointer ${
                section === "aeo"
                  ? "border-[var(--ink-primary)] text-[var(--ink-primary)] font-semibold"
                  : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              }`}
            >
              {isZh ? "AEO 体检与公开战报" : "AEO Check & Report"}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="p-1.5 rounded-[6px] text-[var(--ink-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-primary)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {section === "billing" ? (
            <>
              <div className="space-y-2.5">
                <h3 className="text-[13.5px] font-semibold text-[var(--ink-primary)]">
                  {isZh ? "升级增长方案（Creem 安全结算）" : "Upgrade Plan"}
                </h3>
                {[
                  {
                    id: "blitz" as const,
                    name: isZh ? "启动包 · 30 核心目录提交" : "Launch Starter Pack",
                    price: "$39",
                    note: isZh ? "一次性买断 · 含外链验活回执与归因短链" : "One-time · 30 core high-DR directories",
                  },
                  {
                    id: "radar" as const,
                    name: isZh ? "增长版 · 100 目录 + 买家收件箱" : "Growth Command Center",
                    price: "$29/月",
                    note: isZh ? "推荐 · 含全网求购扫帖、原生拟稿与归因漏斗" : "Popular · 100 directories + 24/7 buyer inbox",
                  },
                  {
                    id: "dfy" as const,
                    name: isZh ? "代投旗舰 · 人工全托管 100+ 站" : "Done-For-You Flagship",
                    price: "$299",
                    note: isZh ? "一次性 · 品牌资料代精修 + 30 天死链包补" : "One-time · Concierge submission + 30d warranty",
                  },
                ].map((plan) => (
                  <div
                    key={plan.id}
                    className="p-3.5 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-[var(--ink-primary)]">{plan.name}</p>
                      <p className="text-[12px] text-[var(--ink-muted)] mt-0.5">{plan.note}</p>
                    </div>
                    <Button
                      variant={plan.id === "radar" ? "primary" : "secondary"}
                      size="xs"
                      loading={checkoutPlan === plan.id}
                      onClick={() => onCheckout(plan.id)}
                    >
                      {plan.price}
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-3 border-t border-[var(--border-hairline)]">
                <h3 className="text-[13px] font-semibold text-[var(--ink-primary)]">
                  {isZh ? "已购订单记录" : "Order History"}
                </h3>
                {orders.length === 0 ? (
                  <p className="text-[12.5px] text-[var(--ink-muted)]">
                    {isZh ? "当前暂无历史付款订单。" : "No completed orders yet."}
                  </p>
                ) : (
                  <div className="rounded-[8px] border border-[var(--border-hairline)] divide-y divide-[var(--border-hairline)] tabular-nums text-[12.5px]">
                    {orders.map((ord) => (
                      <div key={ord.order_id} className="px-3.5 py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-mono text-[var(--ink-primary)]">{ord.order_id}</span>
                          <span className="ml-2 text-[var(--ink-muted)]">{ord.created_at}</span>
                        </div>
                        <span className="font-mono font-semibold text-[var(--ink-primary)]">${ord.amount_usd}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* 公开可验证战报 */}
              <div className="p-4 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-[13.5px] font-semibold text-[var(--ink-primary)]">
                      {isZh ? "可公开核验增长战报" : "Public Verifiable Growth Report"}
                    </h3>
                    <p className="text-[12px] text-[var(--ink-muted)] mt-0.5">
                      {isZh ? "一键生成只读公开页，适合向团队或投资人展示真实收录与归因。" : "Share verified backlinks and attribution in read-only mode."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="primary" size="xs" loading={sharingReport} onClick={onShareReport}>
                    <Share2 className="w-3.5 h-3.5" />
                    {isZh ? "生成并复制链接" : "Copy Share Link"}
                  </Button>
                  {publicShareId && (
                    <Link
                      href={`/report?id=${publicShareId}`}
                      className="inline-flex items-center gap-1 text-[12.5px] text-[var(--accent-primary)] hover:underline"
                    >
                      <span>{isZh ? "预览公开页" : "Preview"}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>

              {/* 实时 AEO 与 llms.txt 体检 */}
              <div className="p-4 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-[13.5px] font-semibold text-[var(--ink-primary)]">
                      {isZh ? "AI 搜索可见度体检与 llms.txt" : "AI Search & llms.txt Check"}
                    </h3>
                    <p className="text-[12px] text-[var(--ink-muted)] mt-0.5 truncate max-w-[290px]">
                      {targetUrl || "https://your-saas.com"}
                    </p>
                  </div>
                  <Button variant="secondary" size="xs" loading={scanning} onClick={runScan}>
                    <RefreshCw className="w-3.5 h-3.5" />
                    {isZh ? "立即复检" : "Run Check"}
                  </Button>
                </div>

                {scanResult && (
                  <div className="flex items-center gap-4 text-[12.5px] tabular-nums py-2 border-y border-[var(--border-hairline)]">
                    <span>
                      {isZh ? "健康分：" : "Score: "}
                      <strong className="font-mono text-[var(--ink-primary)]">{scanResult.score}/100</strong>
                    </span>
                    <span>
                      {isZh ? "待修漏洞：" : "Issues: "}
                      <strong className="font-mono text-[var(--ink-primary)]">{scanResult.leaksCount}</strong>
                    </span>
                    {scanResult.diagnostics?.ttfbMs ? (
                      <span className="text-[var(--ink-muted)] font-mono">{scanResult.diagnostics.ttfbMs}ms</span>
                    ) : null}
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[var(--ink-secondary)] font-medium">/llms.txt</span>
                    <button
                      type="button"
                      onClick={copyLlms}
                      className="text-[var(--accent-primary)] hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                      {copiedLlms ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedLlms ? (isZh ? "已复制" : "Copied") : isZh ? "复制内容" : "Copy"}
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] text-[11.5px] font-mono text-[var(--ink-secondary)] overflow-x-auto whitespace-pre-wrap">
                    {llmsDraft}
                  </pre>
                </div>

                <div className="flex items-center gap-3 text-[12px] pt-1">
                  <Link href="/tools/aeo-checker" className="text-[var(--accent-primary)] hover:underline">
                    {isZh ? "打开完整 AEO 体检台 ↗" : "Full AEO Checker ↗"}
                  </Link>
                  <Link href="/tools/llms-txt-generator" className="text-[var(--accent-primary)] hover:underline">
                    {isZh ? "打开 llms.txt 工作台 ↗" : "llms.txt Studio ↗"}
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
