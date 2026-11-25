"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Download, FileCode2, Sparkles } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LangSwitcher from "@/components/LangSwitcher";
import Button from "@/components/ui/Button";

/**
 * 免费 SEO 裂变工具 2：免费 /llms.txt AI 搜索清单生成器（/tools/llms-txt-generator）
 */
export default function LlmsTxtGeneratorPage() {
  const { locale } = useI18n();
  const isZh = locale === "zh";

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [output, setOutput] = useState("");
  const [existsAlready, setExistsAlready] = useState<boolean | null>(null);
  const [domain, setDomain] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = (await res.json()) as {
        domain?: string;
        error?: string;
        diagnostics?: { llmsTxt?: { exists: boolean; generatedPreview: string } };
      };
      if (!res.ok) {
        setError(data.error || "Failed to inspect URL.");
      } else {
        setDomain(data.domain || "");
        setExistsAlready(Boolean(data.diagnostics?.llmsTxt?.exists));
        setOutput(data.diagnostics?.llmsTxt?.generatedPreview || "");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen bg-[var(--apple-bg)] text-[var(--apple-ink)]">
      <header className="sticky top-0 z-30 apple-glass border-b border-[var(--apple-border)]">
        <div className="max-w-[960px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] text-[var(--apple-ink)]">
            <BrandMark className="w-5 h-5" />
            <span>LaunchPulse</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ThemeSwitcher />
            </div>
            <LangSwitcher />
            <Link href="/tools/aeo-checker" className="text-[12px] text-[var(--apple-blue)] hover:underline font-medium">
              {isZh ? "AEO 爬虫体检 →" : "AEO Checker →"}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[960px] mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-8">
        <div className="max-w-2xl space-y-3">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--apple-blue)]">
            LLMSTXT.ORG GENERATOR · FREE TOOL
          </p>
          <h1 className="apple-display text-3xl sm:text-5xl font-semibold text-[var(--apple-ink)]">
            {isZh ? "免费 /llms.txt AI 搜索清单一键生成器" : "Free /llms.txt Generator for AI Search"}
          </h1>
          <p className="text-[15px] text-[var(--apple-ink-secondary)] leading-relaxed">
            {isZh
              ? "输入你的 SaaS 官网地址，10 秒自动提取标题、卖点与核心页面，生成符合 llmstxt.org 标准的 Markdown 文件，让 ChatGPT、Claude 与 Perplexity 精准理解并推荐你的产品。"
              : "Paste your SaaS URL to inspect your existing /llms.txt status and generate a clean llmstxt.org Markdown manifest for ChatGPT, Claude & Perplexity."}
          </p>
        </div>

        <form
          onSubmit={handleGenerate}
          className="rounded-[20px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-4 sm:p-5 flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-startup.com"
            className="flex-1 h-11 px-4 rounded-full border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[15px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
          />
          <Button type="submit" variant="primary" size="lg" loading={loading}>
            <Sparkles className="w-4 h-4" />
            {isZh ? "抓取并生成 llms.txt" : "Generate llms.txt"}
          </Button>
        </form>

        {error && (
          <div className="rounded-[12px] bg-[var(--apple-red-soft)] text-[var(--apple-red)] px-4 py-3 text-[13px] font-medium">
            {error}
          </div>
        )}

        {output && (
          <div className="rounded-[20px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-[var(--apple-blue)]" />
                <span className="text-[14px] font-semibold text-[var(--apple-ink)]">
                  {domain} / public/llms.txt
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    existsAlready
                      ? "bg-[var(--apple-green-soft)] text-[var(--apple-green)]"
                      : "bg-[var(--apple-orange-soft)] text-[var(--apple-orange)]"
                  }`}
                >
                  {existsAlready
                    ? isZh
                      ? "官网已存在 /llms.txt"
                      : "Existing /llms.txt detected"
                    : isZh
                      ? "官网当前缺失 /llms.txt"
                      : "Currently missing on site"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={handleDownload}>
                  <Download className="w-3.5 h-3.5" />
                  {isZh ? "下载 llms.txt" : "Download"}
                </Button>
                <Button type="button" variant="primary" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? (isZh ? "已复制" : "Copied") : isZh ? "复制全部" : "Copy"}
                </Button>
              </div>
            </div>

            <textarea
              rows={13}
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              className="w-full p-4 rounded-[12px] border border-[var(--apple-border)] bg-[var(--apple-bg)] font-mono text-[13px] text-[var(--apple-ink)] leading-relaxed outline-none"
            />
          </div>
        )}

        <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[13px] text-[var(--apple-ink-secondary)]">
            {isZh
              ? "单靠 /llms.txt 还不够：AI 搜索引擎同时高度依赖高权重第三方目录的引用共识。"
              : "AI engines cross-check your /llms.txt against third-party high-DR directory citations."}
          </p>
          <Link
            href="/tools/directory-finder"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--apple-blue)] hover:underline whitespace-nowrap"
          >
            {isZh ? "查看 100+ 高权重目录库" : "Explore 100+ Directories"} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>
    </div>
  );
}
