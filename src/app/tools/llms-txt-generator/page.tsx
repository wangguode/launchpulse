"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Copy, Download, FileCode2 } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LangSwitcher from "@/components/LangSwitcher";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";

const SAMPLE_LLMS = `# AcmeFlow

> Automated SSL certificate & domain expiry alerts built for lean SaaS teams.

## Core Pages
- Homepage: https://acmeflow.example
- Documentation: https://acmeflow.example/docs
- Pricing: https://acmeflow.example/pricing

## Key Capabilities
- 6-hour TLS handshake & WHOIS polling across 3 global regions
- 14-day, 7-day, and 24-hour advance Slack / Webhook alerts
- Flat transparent pricing without per-seat enterprise tiers
`;

/**
 * V5 50/50 精密分栏工作台：/llms.txt 标准清单生成器（/tools/llms-txt-generator）
 */
export default function LlmsTxtGeneratorPage() {
  const { locale } = useI18n();
  const isZh = locale === "zh";

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [output, setOutput] = useState(SAMPLE_LLMS);
  const [isCustomOutput, setIsCustomOutput] = useState(false);
  const [existsAlready, setExistsAlready] = useState<boolean | null>(null);
  const [domain, setDomain] = useState("");
  const [copied, setCopied] = useState(false);

  const runGenerate = async (target: string) => {
    const cleaned = target.trim();
    if (!cleaned) return;
    setUrl(cleaned);
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleaned }),
      });
      const data = (await res.json()) as {
        domain?: string;
        error?: string;
        diagnostics?: { llmsTxt?: { exists: boolean; generatedPreview: string } };
      };
      if (!res.ok) {
        setError(data.error || (isZh ? "抓取失败，请确认网址可公网访问。" : "Failed to inspect URL."));
      } else {
        setDomain(data.domain || "");
        setExistsAlready(Boolean(data.diagnostics?.llmsTxt?.exists));
        setOutput(data.diagnostics?.llmsTxt?.generatedPreview || SAMPLE_LLMS);
        setIsCustomOutput(true);
      }
    } catch {
      setError(isZh ? "网络异常，请稍后重试。" : "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runGenerate(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/markdown;charset=utf-8;" });
    const dl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = dl;
    a.download = "llms.txt";
    a.click();
    URL.revokeObjectURL(dl);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-frame)] text-[var(--ink-primary)] flex flex-col">
      <header className="h-12 px-4 sm:px-6 border-b border-[var(--border-hairline)] bg-[var(--bg-frame)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] min-w-0">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold text-[14.5px] text-[var(--ink-primary)] shrink-0">
            <BrandMark className="w-5 h-5" />
            <span>LaunchPulse</span>
          </Link>
          <span className="text-[var(--border-strong)]">/</span>
          <span className="text-[var(--ink-secondary)] truncate">/llms.txt {isZh ? "工作台" : "Studio"}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/tools/aeo-checker"
            className="hidden sm:inline-flex items-center gap-1 text-[12px] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] mr-1"
          >
            <span>{isZh ? "AEO 体检" : "AEO Checker"}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <LangSwitcher />
          <div className="hidden sm:block">
            <ThemeSwitcher />
          </div>
          <Link
            href="/dashboard?sample=1"
            className="h-7 px-3 rounded-[6px] lp-btn-primary text-[12px] font-medium inline-flex items-center"
          >
            {isZh ? "进入指挥台" : "Console"}
          </Link>
        </div>
      </header>

      <main className="flex-1 p-3 sm:p-5 max-w-[1220px] w-full mx-auto flex flex-col">
        <div className="flex-1 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-hairline)] overflow-hidden">
          {/* 左半栏：网址提取 + 部署说明 */}
          <section className="lg:col-span-5 p-5 sm:p-7 space-y-6">
            <div className="space-y-1.5">
              <h1 className="lp-display text-[22px] sm:text-[26px] font-semibold text-[var(--ink-primary)]">
                {isZh ? "/llms.txt AI 搜索清单生成器" : "/llms.txt Manifest Generator"}
              </h1>
              <p className="text-[13.5px] text-[var(--ink-secondary)] leading-relaxed">
                {isZh
                  ? "输入官网地址，自动提取核心定位与关键页面，生成符合 llmstxt.org 规范的 Markdown 文件，让大模型准确理解并引用你的产品。"
                  : "Extract your homepage positioning and generate a clean llmstxt.org Markdown index for ChatGPT, Claude & Perplexity."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-saas.com"
                  className="flex-1 h-9 px-3 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[13.5px] font-mono text-[var(--ink-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
                <Button type="submit" variant="primary" size="md" loading={loading}>
                  <FileCode2 className="w-4 h-4" />
                  {isZh ? "提取生成" : "Generate"}
                </Button>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-[var(--ink-muted)]">
                <span>{isZh ? "实测示例：" : "Try:"}</span>
                <button
                  type="button"
                  onClick={() => void runGenerate("https://certnudge.dev")}
                  className="font-mono text-[11.5px] px-2 py-0.5 rounded-[5px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:text-[var(--ink-primary)] cursor-pointer"
                >
                  certnudge.dev
                </button>
              </div>
              {error && <p className="text-[12.5px] text-[var(--status-danger)]">{error}</p>}
            </form>

            {domain && (
              <div className="p-3.5 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center justify-between gap-2 text-[12.5px]">
                <span className="font-mono text-[var(--ink-primary)]">{domain}</span>
                <StatusBadge
                  tone={existsAlready ? "success" : "warning"}
                  label={
                    existsAlready
                      ? isZh
                        ? "已存在 /llms.txt"
                        : "Existing file found"
                      : isZh
                        ? "尚未部署 /llms.txt"
                        : "Not deployed yet"
                  }
                />
              </div>
            )}

            <div className="space-y-2 pt-3 border-t border-[var(--border-hairline)] text-[12.5px] text-[var(--ink-secondary)]">
              <p className="font-semibold text-[var(--ink-primary)]">
                {isZh ? "30 秒上线部署方法" : "Deploy in 30 seconds"}
              </p>
              <ol className="space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>{isZh ? "在右侧编辑器微调你的产品卖点与核心文档链接。" : "Review and fine-tune your product links on the right."}</li>
                <li>
                  {isZh
                    ? "点击下载 llms.txt，放入网站 public/ 目录随下一次构建发布。"
                    : "Download llms.txt and place it inside your site's public/ folder."}
                </li>
                <li>
                  {isZh
                    ? "确保 https://你的域名/llms.txt 返回纯文本状态码 200。"
                    : "Verify https://yourdomain.com/llms.txt returns HTTP 200."}
                </li>
              </ol>
            </div>
          </section>

          {/* 右半栏：实时可编辑 Markdown 编辑器 */}
          <section className="lg:col-span-7 flex flex-col bg-[var(--bg-surface)]/45">
            <div className="px-5 h-12 border-b border-[var(--border-hairline)] flex items-center justify-between gap-2">
              <span className="font-mono text-[12.5px] font-medium text-[var(--ink-primary)]">
                {isCustomOutput && domain ? `${domain}/llms.txt` : `llms.txt (${isZh ? "标准模板预览" : "Template Preview"})`}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="xs" onClick={handleCopy}>
                  {copied ? <Check className="w-3.5 h-3.5 text-[var(--status-live)]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? (isZh ? "已复制" : "Copied") : isZh ? "复制内容" : "Copy"}
                </Button>
                <Button variant="primary" size="xs" onClick={handleDownload}>
                  <Download className="w-3.5 h-3.5" />
                  {isZh ? "下载 llms.txt" : "Download"}
                </Button>
              </div>
            </div>

            <div className="flex-1 p-5 flex flex-col">
              <textarea
                value={output}
                onChange={(e) => setOutput(e.target.value)}
                rows={16}
                aria-label="llms.txt Markdown 编辑器"
                className="flex-1 w-full rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-sheet)] p-4 font-mono text-[12.5px] leading-[1.65] text-[var(--ink-primary)] outline-none focus:border-[var(--accent-primary)] resize-none"
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
