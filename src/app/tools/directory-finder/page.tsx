"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  IconArrowRight,
  IconExternalLink,
  IconLock,
  IconSearch,
  IconShieldCheck,
} from "@tabler/icons-react";
import { DISTRIBUTION_DIRECTORIES } from "@/data/directories";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import DomainFavicon from "@/components/frosted/DomainFavicon";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCategoryLabel, formatSlaLabel } from "@/lib/console-ledger";

const FREE_PREVIEW_LIMIT = 18;

function maskDirectoryDomain(rawUrl: string): string {
  try {
    const host = new URL(rawUrl).hostname.replace(/^www\./, "");
    const parts = host.split(".");
    const tld = parts.length > 1 ? parts[parts.length - 1] : "com";
    return `${host.slice(0, 2)}••••••.${tld}`;
  } catch {
    return "••••••.com";
  }
}

/**
 * 100+ 海外高权重软件目录检索库（/tools/directory-finder）
 * 开放前 18 个高权目录直达验证真货质量；第 19–100 个直达提交入口与三波次排期器由 $39 Launch Starter / $299 DFY 解锁
 */
export default function DirectoryFinderToolPage() {
  const { locale } = useI18n();
  const isZh = locale === "zh";

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [onlyDofollow, setOnlyDofollow] = useState(false);
  const [minDr, setMinDr] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const [checkoutPlanDialog, setCheckoutPlanDialog] = useState<"blitz" | "dfy" | null>(null);
  const [targetUrl, setTargetUrl] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = (params.get("token") || "").trim();
        if (token) {
          const vRes = await fetch("/api/portal/verify-unlock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          const vData = (await vRes.json()) as { unlocked?: boolean };
          if (!cancelled && vData.unlocked) {
            setIsUnlocked(true);
            return;
          }
        }
        const meRes = await fetch("/api/auth/me");
        const meData = (await meRes.json()) as { authenticated?: boolean };
        if (!meData.authenticated || cancelled) return;
        const unlockRes = await fetch("/api/portal/verify-unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const unlockData = (await unlockRes.json()) as { unlocked?: boolean };
        if (!cancelled && unlockData.unlocked) {
          setIsUnlocked(true);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DISTRIBUTION_DIRECTORIES.filter((d) => {
      if (category !== "all" && d.category !== category) return false;
      if (onlyDofollow && d.linkType !== "dofollow") return false;
      if (d.dr < minDr) return false;
      if (!q) return true;
      return `${d.name} ${d.url} ${d.category}`.toLowerCase().includes(q);
    });
  }, [query, category, onlyDofollow, minDr]);

  const dofollowTotal = DISTRIBUTION_DIRECTORIES.filter((d) => d.linkType === "dofollow").length;

  const handleConfirmUnlockCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPlanDialog) return;
    const cleanEmail = workEmail.trim().toLowerCase();
    let cleanUrl = targetUrl.trim();
    if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }
    setSubmitting(true);
    try {
      fetch("/api/lead-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          targetUrl: cleanUrl,
          plan: checkoutPlanDialog,
        }),
        keepalive: true,
      }).catch(() => {});

      let derivedSlug = "launch-workspace";
      try {
        if (cleanUrl) {
          derivedSlug = new URL(cleanUrl).hostname.replace(/^www\./, "").toLowerCase();
        }
      } catch {
        // ignore
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: checkoutPlanDialog,
          email: cleanEmail,
          slug: derivedSlug,
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
            ? "无法启动结账会话，请重试或发信至 hello@statementflow.win"
            : "Could not start checkout right now. Please retry or email hello@statementflow.win.")
      );
    } catch {
      toast.error(isZh ? "网络异常，请重试" : "Network error while starting checkout.");
    } finally {
      setSubmitting(false);
    }
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
            <span className="text-muted-foreground truncate">{isZh ? "100+ 目录检索库" : "Directory Finder"}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <LangSwitcher />
            <ThemeModeToggle />
            {isUnlocked ? (
              <Button size="sm" render={<Link href="/dashboard" />}>
                {isZh ? "进入已解锁指挥台" : "Open Console"}
              </Button>
            ) : (
              <Button size="sm" onClick={() => setCheckoutPlanDialog("blitz")}>
                {isZh ? "解锁全部 100 站 · $39" : "Unlock All 100 · $39"}
              </Button>
            )}
          </div>
        </header>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 space-y-5">
        {!isUnlocked && (
          <Card className="border-primary/35 bg-primary/[0.04]">
            <CardContent className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-primary">
                  <IconShieldCheck className="size-4" />
                  <span>
                    {isZh
                      ? `免费预览前 ${FREE_PREVIEW_LIMIT} 个权威站点直达链接 · 剩余 ${DISTRIBUTION_DIRECTORIES.length - FREE_PREVIEW_LIMIT} 个高转化垂直站已就绪`
                      : `${FREE_PREVIEW_LIMIT} Tier-1 Submit URLs Unlocked Free · ${DISTRIBUTION_DIRECTORIES.length - FREE_PREVIEW_LIMIT} Verified Niche & Dofollow Directories Ready`}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {isZh
                    ? "解锁 $39 启动包：获取全部 100+ 人工清洗直达提交入口 + 一键复制三档英文文案包 + 3 周自然排期器 + HTTP 200 自动验活；或选 $299 由我们人工逐站代填全部 100+ 站点。"
                    : "Unlock Launch Starter ($39 once) for all 100+ direct submit URLs, 1-click Brand Kit copy pack, 3-wave pacer & HTTP 200 live verifier — or book $299 100% Human Manual Submission."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button size="sm" variant="secondary" onClick={() => setCheckoutPlanDialog("blitz")}>
                  {isZh ? "解锁自助全库 · $39" : "Unlock All 100 · $39"}
                </Button>
                <Button size="sm" onClick={() => setCheckoutPlanDialog("dfy")}>
                  {isZh ? "100+ 人工代投 · $299" : "Human DFY · $299"}
                  <IconArrowRight className="size-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">
                  {isZh ? "100+ 海外高权重软件目录透明检索库" : "100+ Curated High-DR SaaS & AI Directories"}
                </CardTitle>
                <CardDescription className="mt-1 tabular-nums">
                  {isZh
                    ? `共收录 ${DISTRIBUTION_DIRECTORIES.length} 个经人工清洗的可公开提交站点（含 ${dofollowTotal} 个传递权重外链），剔除死链与垃圾站群。`
                    : `${DISTRIBUTION_DIRECTORIES.length} verified public directories (${dofollowTotal} dofollow) with live DR, traffic & review SLA estimates.`}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="font-mono tabular-nums self-start md:self-auto">
                {isUnlocked
                  ? isZh
                    ? `全部 ${filtered.length} 站已解锁`
                    : `All ${filtered.length} unlocked`
                  : isZh
                  ? `免费预览 ${Math.min(FREE_PREVIEW_LIMIT, filtered.length)} / ${filtered.length} 站`
                  : `${Math.min(FREE_PREVIEW_LIMIT, filtered.length)} of ${filtered.length} unlocked free`}
              </Badge>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="relative flex-1">
                <IconSearch className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isZh ? "搜索目录名或分类，如 SourceForge、AI Aggregator..." : "Search SourceForge, AlternativeTo, AI Aggregator..."}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Select value={category} onValueChange={(v) => v && setCategory(String(v))}>
                  <SelectTrigger className="w-[152px] h-9" aria-label={isZh ? "目录分类" : "Category"}>
                    <SelectValue>
                      {category === "all"
                        ? isZh ? "全部分类" : "All Categories"
                        : formatCategoryLabel(category as (typeof DISTRIBUTION_DIRECTORIES)[number]["category"], isZh)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isZh ? "全部分类" : "All Categories"}</SelectItem>
                    <SelectItem value="SaaS Directory">{isZh ? "SaaS 综合目录" : "SaaS Directory"}</SelectItem>
                    <SelectItem value="AI Aggregator">{isZh ? "AI 工具导航" : "AI Aggregator"}</SelectItem>
                    <SelectItem value="Launchpad">{isZh ? "新品首发台" : "Launchpad"}</SelectItem>
                    <SelectItem value="Dev & Indie">{isZh ? "开发者社区" : "Dev & Indie"}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={String(minDr)} onValueChange={(v) => v !== null && setMinDr(Number(v))}>
                  <SelectTrigger className="w-[140px] h-9" aria-label={isZh ? "最低 DR" : "Min DR"}>
                    <SelectValue>
                      {minDr === 0 ? (isZh ? "不限域名权重" : "Any DR") : `DR ${minDr}+`}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{isZh ? "不限域名权重" : "Any DR"}</SelectItem>
                    <SelectItem value="70">DR 70+</SelectItem>
                    <SelectItem value="50">DR 50+</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 rounded-md border px-3 h-9">
                  <Switch id="dofollow-only" checked={onlyDofollow} onCheckedChange={(v) => setOnlyDofollow(Boolean(v))} />
                  <Label htmlFor="dofollow-only" className="text-xs cursor-pointer">
                    {isZh ? "仅看传递权重" : "Dofollow only"}
                  </Label>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isZh ? "平台名称" : "Directory"}</TableHead>
                  <TableHead>{isZh ? "域名权重" : "DR"}</TableHead>
                  <TableHead className="hidden sm:table-cell">{isZh ? "所属分类" : "Category"}</TableHead>
                  <TableHead className="hidden md:table-cell">{isZh ? "月访问估算" : "Est. Traffic"}</TableHead>
                  <TableHead className="hidden md:table-cell">{isZh ? "预计审核" : "Review"}</TableHead>
                  <TableHead>{isZh ? "外链属性" : "Link"}</TableHead>
                  <TableHead className="text-right">{isZh ? "提交入口" : "Submit"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="tabular-nums">
                {filtered.map((d, idx) => {
                  const rowUnlocked = isUnlocked || idx < FREE_PREVIEW_LIMIT;
                  return (
                    <TableRow key={d.id} className={rowUnlocked ? "" : "opacity-85"}>
                      <TableCell>
                        {rowUnlocked ? (
                          <div className="flex items-center gap-3">
                            <DomainFavicon name={d.name} url={d.url} />
                            <div>
                              <div className="font-medium">{d.name}</div>
                              <div className="text-xs font-mono text-muted-foreground">{d.url.replace("https://", "")}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/60 text-muted-foreground">
                              <IconLock className="size-3.5" />
                            </div>
                            <div>
                              <div className="font-medium text-foreground/90">
                                {`${d.name.slice(0, 3)}•••••`}{" "}
                                <span className="text-xs font-normal text-muted-foreground">
                                  ({isZh ? "已验证直达页" : "Verified Submit Page"})
                                </span>
                              </div>
                              <div className="text-xs font-mono text-muted-foreground">
                                {maskDirectoryDomain(d.url)}
                              </div>
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          DR {d.dr}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {formatCategoryLabel(d.category, isZh)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                        {d.monthlyTraffic}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {formatSlaLabel(d.approvalSla, isZh)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.linkType === "dofollow" ? "default" : "secondary"} className="text-xs">
                          {d.linkType === "dofollow" ? (isZh ? "传递权重" : "Dofollow") : "Nofollow"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {rowUnlocked ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            render={<a href={d.submitUrl} target="_blank" rel="noopener noreferrer" />}
                          >
                            {isZh ? "提交页" : "Submit"}
                            <IconExternalLink className="size-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            onClick={() => setCheckoutPlanDialog("blitz")}
                          >
                            <IconLock className="size-3" />
                            {isZh ? "解锁 · $39" : "Unlock · $39"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <Dialog
        open={Boolean(checkoutPlanDialog)}
        onOpenChange={(open) => {
          if (!open) setCheckoutPlanDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {checkoutPlanDialog === "dfy"
                ? isZh
                  ? "预约 100+ 目录全人工代投 ($299)"
                  : "Book 100+ Human Done-For-You Submission ($299)"
                : isZh
                ? "解锁全部 100+ 目录直达库与三波次排期 ($39)"
                : "Unlock All 100+ Submit URLs & Wave Pacer ($39 once)"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConfirmUnlockCheckout} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {isZh ? "需要推广的产品官网 URL" : "Your SaaS / Product URL"}
              </label>
              <Input
                type="text"
                required
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://your-saas.com"
                className="h-11 text-base sm:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {isZh ? "接收免密控制台激活信的工作邮箱" : "Work Email (Instant Magic-Link Unlock & VAT Receipt)"}
              </label>
              <Input
                type="email"
                required
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                placeholder="founder@your-saas.com"
                className="h-11 text-base sm:text-sm"
              />
            </div>
            <div className="rounded-xl border bg-muted/40 p-3 text-xs space-y-1 text-muted-foreground">
              <p className="font-semibold text-foreground">
                {checkoutPlanDialog === "dfy"
                  ? isZh
                    ? "您将获得（零手工填表）："
                    : "Included with Human Concierge ($299):"
                  : isZh
                  ? "付款后 60 秒自动解锁："
                  : "Unlocked instantly within 60 seconds:"}
              </p>
              <p>
                {checkoutPlanDialog === "dfy"
                  ? isZh
                    ? "• 英文产品三档目录简介精修 + 100+ 目录逐站人工提交 + 30 天死链免费补投"
                    : "• Native English Brand Kit rewrite + manual human submission across all 100+ directories + 30-day replacement guarantee"
                  : isZh
                  ? "• 全部 100+ 验证直达 Submit URL + 一键复制文案包 + 自动 HTTP 200 外链存活巡检 + 归因短链"
                  : "• All 100+ direct Submit URLs + 1-click Brand Copy Pack + automated HTTP 200 live backlink verifier + attribution shortlinks"}
              </p>
            </div>
            <Button type="submit" className="w-full min-h-11" disabled={submitting}>
              {submitting
                ? isZh
                  ? "正在连接安全收银台..."
                  : "Connecting to Creem Checkout..."
                : checkoutPlanDialog === "dfy"
                ? isZh
                  ? "前往安全结账 · $299"
                  : "Continue to Checkout · $299"
                : isZh
                ? "前往安全结账 · $39"
                : "Continue to Checkout · $39"}
              <IconArrowRight className="size-4" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
