"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  IconArrowUpRight,
  IconCheck,
  IconCopy,
  IconDownload,
  IconFileCode,
} from "@tabler/icons-react";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

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
 * 官方 shadcn/ui /llms.txt 标准清单生成器（/tools/llms-txt-generator）
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
        const msg = data.error || (isZh ? "抓取失败，请确认网址可公网访问。" : "Failed to inspect URL.");
        setError(msg);
        toast.error(msg);
      } else {
        setDomain(data.domain || "");
        setExistsAlready(Boolean(data.diagnostics?.llmsTxt?.exists));
        setOutput(data.diagnostics?.llmsTxt?.generatedPreview || SAMPLE_LLMS);
        setIsCustomOutput(true);
        toast.success(isZh ? `已生成 ${data.domain || ""} 的 llms.txt 草案` : "Generated llms.txt draft");
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
      toast.success(isZh ? "llms.txt 内容已复制" : "Copied llms.txt");
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
    <div className="min-h-screen bg-transparent text-foreground flex flex-col">
      <div className="sticky top-3 z-40 px-4 sm:px-6">
        <header className="lp-frosted-topbar mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-2xl px-4 sm:px-5">
          <div className="flex items-center gap-2.5 text-sm min-w-0">
            <Link href="/" className="flex items-center gap-2.5 font-semibold text-[15px] tracking-tight shrink-0">
              <div className="lp-btn-bevel flex size-8 items-center justify-center rounded-[10px]">
                <BrandMark className="size-4" tone="light" />
              </div>
              <span>LaunchPulse</span>
            </Link>
            <span className="text-muted-foreground opacity-50">/</span>
            <span className="text-muted-foreground truncate">/llms.txt {isZh ? "生成器" : "Studio"}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-xs" render={<Link href="/tools/aeo-checker" />}>
              {isZh ? "AEO 体检" : "AEO Checker"}
              <IconArrowUpRight className="size-3.5" />
            </Button>
            <LangSwitcher />
            <ThemeModeToggle />
            <Button size="sm" render={<Link href="/dashboard?sample=1" />}>
              {isZh ? "进入指挥台" : "Console"}
            </Button>
          </div>
        </header>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle className="text-xl">
                {isZh ? "/llms.txt AI 搜索清单生成器" : "/llms.txt Manifest Generator"}
              </CardTitle>
              <CardDescription>
                {isZh
                  ? "输入官网地址，自动提取定位与核心链接，生成符合 llmstxt.org 规范的标准文件。"
                  : "Extract homepage positioning and generate a clean llmstxt.org Markdown index for ChatGPT, Claude & Perplexity."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="text"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-saas.com"
                    className="font-mono text-sm"
                  />
                  <Button type="submit" disabled={loading} className="shrink-0">
                    <IconFileCode className="size-4" />
                    {loading ? (isZh ? "提取中..." : "Extracting...") : isZh ? "提取生成" : "Generate"}
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{isZh ? "实测示例：" : "Try:"}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 font-mono text-xs"
                    onClick={() => void runGenerate("https://statementflow.win")}
                  >
                    statementflow.win
                  </Button>
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
              </form>

              {domain && (
                <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-medium">{domain}</span>
                  <Badge variant={existsAlready ? "default" : "secondary"}>
                    {existsAlready
                      ? isZh
                        ? "已存在 /llms.txt"
                        : "Existing file found"
                      : isZh
                        ? "尚未部署 /llms.txt"
                        : "Not deployed yet"}
                  </Badge>
                </div>
              )}

              <Separator />

              <div className="space-y-2 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">{isZh ? "30 秒上线部署步骤" : "Deploy in 30 seconds"}</p>
                <ol className="space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>{isZh ? "在右侧编辑器微调产品卖点与核心文档链接。" : "Review and fine-tune your product links on the right."}</li>
                  <li>
                    {isZh
                      ? "点击下载 llms.txt，放入网站 public/ 目录随下一次构建发布。"
                      : "Download llms.txt and place it inside your site's public/ folder."}
                  </li>
                  <li>
                    {isZh
                      ? "确认 https://你的域名/llms.txt 返回纯文本 HTTP 200。"
                      : "Verify https://yourdomain.com/llms.txt returns HTTP 200."}
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b pb-4">
              <CardTitle className="font-mono text-sm">
                {isCustomOutput && domain ? `${domain}/llms.txt` : `llms.txt (${isZh ? "标准模板预览" : "Template"})`}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <IconCheck className="size-3.5" /> : <IconCopy className="size-3.5" />}
                  {copied ? (isZh ? "已复制" : "Copied") : isZh ? "复制内容" : "Copy"}
                </Button>
                <Button size="sm" onClick={handleDownload}>
                  <IconDownload className="size-3.5" />
                  {isZh ? "下载 llms.txt" : "Download"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                value={output}
                onChange={(e) => setOutput(e.target.value)}
                rows={18}
                aria-label="llms.txt Markdown 编辑器"
                className="font-mono text-xs leading-relaxed"
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
