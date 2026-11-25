"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { IconExternalLink, IconSearch } from "@tabler/icons-react";
import { DISTRIBUTION_DIRECTORIES } from "@/data/directories";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

/**
 * 官方 shadcn/ui 100+ 海外高权重软件目录透明检索库（/tools/directory-finder）
 */
export default function DirectoryFinderToolPage() {
  const { locale } = useI18n();
  const isZh = locale === "zh";

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [onlyDofollow, setOnlyDofollow] = useState(false);
  const [minDr, setMinDr] = useState(0);

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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-40 h-14 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight shrink-0">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <BrandMark className="size-4" tone="light" />
              </div>
              <span>LaunchPulse</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground truncate">{isZh ? "100+ 目录检索库" : "Directory Finder"}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <LangSwitcher />
            <ThemeModeToggle />
            <Button size="sm" render={<Link href="/dashboard?sample=1" />}>
              {isZh ? "在指挥台管理提交" : "Manage in Console"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">
                  {isZh ? "100+ 海外高权重软件目录透明检索库" : "100+ Curated High-DR SaaS & AI Directories"}
                </CardTitle>
                <CardDescription className="mt-1 tabular-nums">
                  {isZh
                    ? `共收录 ${DISTRIBUTION_DIRECTORIES.length} 个经人工清洗的可公开提交站点（含 ${dofollowTotal} 个传递权重外链），支持免费自查或委托代投。`
                    : `${DISTRIBUTION_DIRECTORIES.length} verified public directories (${dofollowTotal} dofollow) with direct submit URLs and review estimates.`}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="font-mono tabular-nums self-start md:self-auto">
                {isZh ? `当前匹配 ${filtered.length} 站` : `${filtered.length} matching`}
              </Badge>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="relative flex-1">
                <IconSearch className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isZh ? "搜索目录名或域名，如 SourceForge、AlternativeTo..." : "Search SourceForge, AlternativeTo..."}
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
                {filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="font-medium">{d.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">{d.url.replace("https://", "")}</div>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        render={<a href={d.submitUrl} target="_blank" rel="noopener noreferrer" />}
                      >
                        {isZh ? "提交页" : "Submit"}
                        <IconExternalLink className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
