"use client";

import { useState } from "react";
import { Check, Code2, Copy, ExternalLink, Link2, Plus, QrCode, Radio, X } from "lucide-react";
import Button from "@/components/ui/Button";

export interface TrackingLinkRow {
  code: string;
  campaign_id: number;
  channel: string;
  label: string;
  destination_url: string;
  clicks_count: number;
  conversions_count: number;
  revenue_usd?: number;
  cvr?: number;
  rpv?: number;
  created_at?: string;
}

interface AttributionLinksMatrixProps {
  campaignId: number;
  links: TrackingLinkRow[];
  locale: "en" | "zh" | "ja";
  isSample?: boolean;
  onRefresh: () => Promise<void> | void;
}

/**
 * 确定性 SVG 视觉二维码卡片生成器（无需外部重库，扫码直达或下载分享）
 * 实际生成可直接扫的 Google/QRServer 矢量或清晰预览，同时提供一键复制完整归因短链。
 */
function buildQrApiUrl(text: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(text)}`;
}

/**
 * V4 Dub.co 级短链归因矩阵 + 1 行像素实时验通面板
 */
export default function AttributionLinksMatrix({
  campaignId,
  links,
  locale,
  isSample = false,
  onRefresh,
}: AttributionLinksMatrixProps) {
  const isZh = locale === "zh";
  const [newChannel, setNewChannel] = useState("directory");
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedPixel, setCopiedPixel] = useState(false);
  const [qrLink, setQrLink] = useState<TrackingLinkRow | null>(null);
  const [testingPixel, setTestingPixel] = useState(false);
  const [pixelTestMsg, setPixelTestMsg] = useState("");

  const pixelSnippet = `<script src="https://pulse.statementflow.win/api/pixel.js" defer></script>
<!-- 在注册成功或付款回调时调用： -->
<!-- window.lpConvert('signup') 或 window.lpConvert('purchase', 39) -->`;

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSample) return;
    if (!campaignId || !newLabel.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/dashboard/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, channel: newChannel, label: newLabel.trim() }),
      });
      if (res.ok) {
        setNewLabel("");
        await onRefresh();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (code: string) => {
    const full = `https://pulse.statementflow.win/r/${code}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1600);
    } catch {
      // ignore
    }
  };

  const handleCopyPixel = async () => {
    try {
      await navigator.clipboard.writeText(pixelSnippet);
      setCopiedPixel(true);
      setTimeout(() => setCopiedPixel(false), 1600);
    } catch {
      // ignore
    }
  };

  const handleTestPixel = async () => {
    const targetCode = links[0]?.code;
    if (!targetCode) return;
    if (isSample) {
      setPixelTestMsg(
        isZh
          ? "✓ 示例测试通过：pixel.js 归因事件已模拟回传至 /api/pixel（登录真实账号即可写入你的 D1 报表）。"
          : "✓ Sample ping OK: simulated conversion event verified (sign in to log to your live project)."
      );
      return;
    }
    setTestingPixel(true);
    setPixelTestMsg("");
    try {
      const res = await fetch("/api/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: targetCode, event: "signup", valueUsd: 0 }),
      });
      if (res.ok) {
        setPixelTestMsg(
          isZh
            ? `✓ 实时回传验证成功！短链 /r/${targetCode} 已收到 1 条测试 signup 事件，转化计数已更新。`
            : `✓ Test conversion received for /r/${targetCode}! Dashboard count updated live.`
        );
        await onRefresh();
      } else {
        setPixelTestMsg(isZh ? "测试回传返回异常，请检查短链是否存在。" : "Test ping returned an error.");
      }
    } catch {
      setPixelTestMsg("Network error.");
    } finally {
      setTestingPixel(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 创建自定义归因短链条 */}
      <form
        onSubmit={handleCreateLink}
        className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--apple-ink)]">
              {isZh ? "创建专属边缘归因短链（Dub.co 架构）" : "Create Custom Attribution Shortlink"}
            </h2>
            <p className="text-[12px] text-[var(--apple-ink-secondary)] mt-0.5">
              {isZh
                ? "为每个目录站、Show HN 帖子、Reddit 评论或 KOL 测评单独签发短链，精确算清单渠道 RPV 与美元营收。"
                : "Issue dedicated shortlinks per directory, HN thread, or creator review to track exact CVR and RPV."}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <select
            value={newChannel}
            onChange={(e) => setNewChannel(e.target.value)}
            className="h-10 px-3 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[14px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
          >
            <option value="directory">{isZh ? "目录外链 (directory)" : "Directory"}</option>
            <option value="community">{isZh ? "社区买家回复 (community)" : "Community"}</option>
            <option value="seo">{isZh ? "SEO / 竞品对比页 (seo)" : "SEO / vs Page"}</option>
            <option value="custom">{isZh ? "自定义 / 联盟推广 (custom)" : "Custom / Affiliate"}</option>
          </select>
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={isZh ? "渠道备注，如：Product Hunt 首发主按钮 / AlternativeTo" : "Label, e.g. Product Hunt Launch / AlternativeTo"}
            className="flex-1 h-10 px-3.5 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[14px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
          />
          <Button type="submit" variant="primary" size="md" loading={creating} disabled={isSample || !newLabel.trim()}>
            <Plus className="w-3.5 h-3.5" />
            {isZh ? "签发短链" : "Create Link"}
          </Button>
        </div>
      </form>

      {/* 高密度短链表现矩阵 */}
      <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--apple-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-[var(--apple-blue)]" />
            <h3 className="text-[14px] font-semibold text-[var(--apple-ink)]">
              {isZh ? `全渠道归因短链表现矩阵（${links.length}）` : `Attribution Links Performance (${links.length})`}
            </h3>
          </div>
          <span className="text-[11px] text-[var(--apple-ink-tertiary)]">
            302 Edge Redirect · Auto UTM + lp_ref
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--apple-border)] text-[11px] font-medium text-[var(--apple-ink-tertiary)] bg-[var(--apple-bg)]">
                <th className="py-2.5 px-5">{isZh ? "短链与渠道备注" : "Shortlink & Label"}</th>
                <th className="py-2.5 px-3">{isZh ? "渠道类型" : "Channel"}</th>
                <th className="py-2.5 px-3 text-right">{isZh ? "点击" : "Clicks"}</th>
                <th className="py-2.5 px-3 text-right">{isZh ? "转化" : "Conv."}</th>
                <th className="py-2.5 px-3 text-right">CVR</th>
                <th className="py-2.5 px-3 text-right">{isZh ? "营收 / RPV" : "Rev / RPV"}</th>
                <th className="py-2.5 px-5 text-right">{isZh ? "操作" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--apple-border)] text-[13px] tabular-nums">
              {links.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[var(--apple-ink-secondary)]">
                    {isZh ? "保存推广项目后将自动生成 3 条默认归因短链。" : "Save your project first to auto-issue 3 attribution shortlinks."}
                  </td>
                </tr>
              ) : (
                links.map((l) => {
                  const clicks = Number(l.clicks_count || 0);
                  const conv = Number(l.conversions_count || 0);
                  const cvr = l.cvr ?? (clicks > 0 ? Number(((conv / clicks) * 100).toFixed(1)) : 0);
                  const rev = Number(l.revenue_usd || 0);
                  const rpv = l.rpv ?? (clicks > 0 ? Number((rev / clicks).toFixed(2)) : 0);
                  return (
                    <tr key={l.code} className="hover:bg-[var(--apple-bg)] transition">
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-[var(--apple-ink)]">{l.label || l.channel}</p>
                        <code className="text-[12px] text-[var(--apple-blue)]">
                          pulse.statementflow.win/r/{l.code}
                        </code>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-[var(--apple-surface-subtle)] text-[11px] font-medium text-[var(--apple-ink-secondary)] capitalize">
                          {l.channel}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-semibold text-[var(--apple-ink)]">{clicks}</td>
                      <td className="py-3.5 px-3 text-right font-semibold text-[var(--apple-green)]">{conv}</td>
                      <td className="py-3.5 px-3 text-right text-[var(--apple-ink-secondary)]">{cvr}%</td>
                      <td className="py-3.5 px-3 text-right">
                        <span className="font-semibold text-[var(--apple-ink)]">${rev}</span>
                        <span className="block text-[11px] text-[var(--apple-ink-tertiary)]">
                          ${rpv.toFixed(2)}/click
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(l.code)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[var(--apple-border-strong)] bg-[var(--apple-surface)] text-[11px] font-medium text-[var(--apple-ink)] hover:bg-[var(--apple-surface-subtle)] cursor-pointer"
                          >
                            {copiedCode === l.code ? <Check className="w-3 h-3 text-[var(--apple-green)]" /> : <Copy className="w-3 h-3" />}
                            {copiedCode === l.code ? (isZh ? "已复制" : "Copied") : isZh ? "复制" : "Copy"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setQrLink(l)}
                            title="QR Code"
                            className="p-1.5 rounded-full border border-[var(--apple-border-strong)] bg-[var(--apple-surface)] text-[var(--apple-ink-secondary)] hover:text-[var(--apple-ink)] cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1 行转化像素接入 + 实时连通性测试灯 */}
      <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[var(--apple-blue)]" />
              <h3 className="text-[15px] font-semibold text-[var(--apple-ink)]">
                {isZh ? "1 行零 Cookie 转化归因像素（pixel.js）" : "1-Line Zero-Cookie Conversion Pixel"}
              </h3>
            </div>
            <p className="text-[12px] text-[var(--apple-ink-secondary)]">
              {isZh
                ? "粘贴至官网 <head>，用户从短链进入后自动记录归因源；在注册或 Creem/Stripe 付款回调调用 window.lpConvert('purchase', 39) 即刻回传营收。"
                : "Paste in <head>, then fire window.lpConvert('purchase', 39) on Stripe/Creem success to tie revenue back to the exact link."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="secondary" size="sm" onClick={handleTestPixel} loading={testingPixel}>
              <Radio className="w-3.5 h-3.5 text-[var(--apple-green)]" />
              {isZh ? "发送测试转化事件" : "Send Test Event"}
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={handleCopyPixel}>
              {copiedPixel ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedPixel ? (isZh ? "已复制代码" : "Copied") : isZh ? "复制像素代码" : "Copy Snippet"}
            </Button>
          </div>
        </div>

        <pre className="rounded-[12px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-4 text-[12px] font-mono text-[var(--apple-ink)] overflow-x-auto leading-relaxed">
          {pixelSnippet}
        </pre>

        {pixelTestMsg && (
          <div className="rounded-[10px] bg-[var(--apple-green-soft)] text-[var(--apple-green)] px-3.5 py-2.5 text-[12px] font-medium">
            {pixelTestMsg}
          </div>
        )}
      </div>

      {/* QR 码弹窗 */}
      {qrLink && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-[22px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-[15px] font-semibold text-[var(--apple-ink)]">{qrLink.label || qrLink.code}</h4>
              <button
                type="button"
                onClick={() => setQrLink(null)}
                className="p-1.5 rounded-full hover:bg-[var(--apple-surface-subtle)] text-[var(--apple-ink-secondary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-[16px] border border-[var(--apple-border)] bg-white p-4 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={buildQrApiUrl(`https://pulse.statementflow.win/r/${qrLink.code}`)}
                alt={`QR ${qrLink.code}`}
                className="w-48 h-48"
              />
            </div>
            <p className="text-center text-[12px] font-mono text-[var(--apple-blue)]">
              https://pulse.statementflow.win/r/{qrLink.code}
            </p>
            <div className="flex items-center justify-end gap-2">
              <a
                href={`https://pulse.statementflow.win/r/${qrLink.code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12px] text-[var(--apple-blue)] hover:underline mr-auto"
              >
                {isZh ? "测试跳转" : "Test Redirect"} <ExternalLink className="w-3 h-3" />
              </a>
              <Button type="button" variant="primary" size="sm" onClick={() => handleCopy(qrLink.code)}>
                {isZh ? "复制短链" : "Copy Link"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
