"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { toast } from "sonner";
import {
  IconArrowsSort,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCode,
  IconCopy,
  IconExternalLink,
  IconLink,
  IconPlus,
  IconBroadcast,
  IconSearch,
  IconShare,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatCategoryLabel,
  formatChannelLabel,
  formatSlaLabel,
  type BrandKitRecord,
  type ReconciledDirectoryRow,
  type ReconciledLedger,
  type TrackingLinkRecord,
} from "@/lib/console-ledger";

interface DirectoriesChannelsViewProps {
  campaignId: number;
  productName: string;
  targetUrl: string;
  brandKit: BrandKitRecord | null;
  ledger: ReconciledLedger;
  links: TrackingLinkRecord[];
  initialDirectoryId?: string | null;
  isZh: boolean;
  isSample: boolean;
  onModerationChange: (
    directoryId: string,
    moderationState: "approved" | "skipped" | "priority",
    scheduledWave: 1 | 2 | 3
  ) => Promise<void> | void;
  onShareReport: () => Promise<void> | void;
  sharingReport: boolean;
  onRefresh: () => Promise<void> | void;
}

/**
 * 视图 ②：外链与渠道（基于官方 shadcn/ui + @tanstack/react-table 工业级数据表 + Sheet 检查器）
 * - 支持按域名权重 DR / 平台名排序、3 周波次筛选、状态筛选、分页与搜索
 * - 内置归因短链矩阵与 1 行统计像素子标签页
 */
export default function DirectoriesChannelsView({
  campaignId,
  productName,
  targetUrl,
  brandKit,
  ledger,
  links,
  initialDirectoryId,
  isZh,
  isSample,
  onModerationChange,
  onShareReport,
  sharingReport,
  onRefresh,
}: DirectoriesChannelsViewProps) {
  const [sectionTab, setSectionTab] = useState<"directories" | "links">("directories");
  const [waveFilter, setWaveFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "dr", desc: true }]);
  const [selectedDirId, setSelectedDirId] = useState<string | null>(initialDirectoryId || null);

  // 归因短链新建与埋点验证
  const [newChannel, setNewChannel] = useState("directory");
  const [newLabel, setNewLabel] = useState("");
  const [creatingLink, setCreatingLink] = useState(false);
  const [testingPixel, setTestingPixel] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredDirs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ledger.directories.filter((d) => {
      if (waveFilter !== "all" && String(d.scheduledWave) !== waveFilter) return false;
      if (statusFilter !== "all" && d.effectiveStatus !== statusFilter) return false;
      if (q && !`${d.name} ${d.url} ${d.category} dr${d.dr}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [ledger.directories, waveFilter, statusFilter, query]);

  const activeDir: ReconciledDirectoryRow | null = useMemo(() => {
    if (!selectedDirId) return null;
    return ledger.directories.find((d) => d.id === selectedDirId) || null;
  }, [ledger.directories, selectedDirId]);

  const copyText = async (id: string, text: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success(label || (isZh ? "已复制到剪贴板" : "Copied to clipboard"));
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // ignore
    }
  };

  const columns = useMemo<ColumnDef<ReconciledDirectoryRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: () => (isZh ? "目录平台" : "Directory"),
        cell: ({ row }) => {
          const d = row.original;
          return (
            <div className="min-w-[180px]">
              <div className="font-medium text-foreground">{d.name}</div>
              <div className="text-xs text-muted-foreground">
                {formatCategoryLabel(d.category, isZh)} ·{" "}
                {d.pricing === "free" ? (isZh ? "免费收录" : "Free") : isZh ? "含加速项" : "Freemium"}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "dr",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-7 px-2 text-xs font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {isZh ? "域名权重" : "DR"}
            <IconArrowsSort className="ml-1 size-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono tabular-nums">
            DR {row.original.dr}
          </Badge>
        ),
      },
      {
        accessorKey: "approvalSla",
        header: () => (isZh ? "预计审核" : "Review"),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatSlaLabel(row.original.approvalSla, isZh)}
          </span>
        ),
      },
      {
        accessorKey: "scheduledWave",
        header: () => (isZh ? "自然排期" : "Cadence"),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {isZh ? `第 ${row.original.scheduledWave} 周` : `Week ${row.original.scheduledWave}`}
          </span>
        ),
      },
      {
        accessorKey: "effectiveStatus",
        header: () => (isZh ? "投放与验活" : "Status"),
        cell: ({ row }) => {
          const d = row.original;
          if (d.effectiveStatus === "live") {
            return (
              <Badge variant="default" className="text-xs">
                {isZh ? (d.isDofollowVerified ? "已验活 · 传权重" : "已验活") : "Verified"}
              </Badge>
            );
          }
          if (d.effectiveStatus === "submitted") {
            return <Badge variant="secondary">{isZh ? "审核中" : "In Review"}</Badge>;
          }
          if (d.effectiveStatus === "skipped") {
            return <Badge variant="outline">{isZh ? "已跳过" : "Skipped"}</Badge>;
          }
          return <Badge variant="outline">{isZh ? "待提交" : "Queued"}</Badge>;
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">{isZh ? "操作" : "Action"}</div>,
        cell: ({ row }) => {
          const d = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  void onModerationChange(
                    d.id,
                    d.moderationState === "skipped" ? "approved" : "skipped",
                    d.scheduledWave
                  );
                  toast.success(
                    d.moderationState === "skipped"
                      ? isZh
                        ? `已恢复 ${d.name} 至投放队列`
                        : `Restored ${d.name}`
                      : isZh
                        ? `已跳过 ${d.name}`
                        : `Skipped ${d.name}`
                  );
                }}
              >
                {d.moderationState === "skipped" ? (isZh ? "恢复" : "Restore") : isZh ? "跳过" : "Skip"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs"
                render={<a href={d.liveBacklinkUrl || d.submitUrl} target="_blank" rel="noopener noreferrer" />}
              >
                {d.liveBacklinkUrl ? (isZh ? "外链" : "Live") : isZh ? "提交" : "Submit"}
                <IconExternalLink className="size-3" />
              </Button>
            </div>
          );
        },
      },
    ],
    [isZh, onModerationChange]
  );

  const table = useReactTable({
    data: filteredDirs,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    if (isSample) {
      toast.info(isZh ? "体验模式预览：登录后可创建持久化短链并实时追踪点击" : "Sign in to create live tracking links");
      return;
    }
    if (!campaignId) return;
    setCreatingLink(true);
    try {
      const res = await fetch("/api/dashboard/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, channel: newChannel, label: newLabel.trim() }),
      });
      if (res.ok) {
        setNewLabel("");
        toast.success(isZh ? "归因短链已生成" : "Tracking link created");
        await onRefresh();
      }
    } finally {
      setCreatingLink(false);
    }
  };

  const handleTestPixel = async () => {
    const targetCode = links[0]?.code;
    if (!targetCode) return;
    if (isSample) {
      toast.success(isZh ? "体验校验通过：pixel.js 归因上报链路正常" : "Sample pixel verification passed");
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
        toast.success(isZh ? `回传验证成功：/r/${targetCode} 已记录测试转化` : `Verified /r/${targetCode}`);
        await onRefresh();
      } else {
        toast.error(isZh ? "校验失败，请检查短链状态" : "Verification failed");
      }
    } finally {
      setTestingPixel(false);
    }
  };

  const pixelCode = `<script src="https://pulse.statementflow.win/api/pixel.js" defer></script>`;

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6 min-w-0">
      {/* 顶栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isZh ? "外链与渠道" : "Directories & Links"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 tabular-nums">
            {isZh
              ? `已验活 ${ledger.dirCounts.live} · 审核中 ${ledger.dirCounts.submitted} · 待提交 ${ledger.dirCounts.queued} · 已跳过 ${ledger.dirCounts.skipped}（共 ${ledger.dirCounts.total} 站，严格对账）`
              : `${ledger.dirCounts.live} verified · ${ledger.dirCounts.submitted} in review · ${ledger.dirCounts.queued} queued · ${ledger.dirCounts.skipped} skipped (${ledger.dirCounts.total} total)`}
          </p>
        </div>

        <Button variant="outline" size="sm" disabled={sharingReport} onClick={onShareReport}>
          <IconShare className="size-4" />
          {isZh ? "复制公开战报" : "Share Public Report"}
        </Button>
      </div>

      {/* 主切页：100 目录排期表 vs 归因短链与 1 行统计像素 */}
      <Tabs value={sectionTab} onValueChange={(v) => setSectionTab(v as "directories" | "links")} className="space-y-4">
        <TabsList>
          <TabsTrigger value="directories" className="px-3">
            {isZh ? `100 目录节奏排期 (${ledger.dirCounts.total})` : `Directories (${ledger.dirCounts.total})`}
          </TabsTrigger>
          <TabsTrigger value="links" className="px-3">
            <IconLink className="size-3.5" />
            {isZh ? `归因短链与像素 (${links.length})` : `Tracking Links (${links.length})`}
          </TabsTrigger>
        </TabsList>

        {/* 子标签 1：TanStack Table 工业级 100 目录管理 */}
        <TabsContent value="directories" className="space-y-4">
          {/* 过滤控制栏 */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={waveFilter} onValueChange={(v) => setWaveFilter(String(v))}>
              <TabsList className="tabular-nums">
                <TabsTrigger value="all" className="px-2.5 text-xs">
                  {isZh ? `全部 ${ledger.dirCounts.total}` : `All ${ledger.dirCounts.total}`}
                </TabsTrigger>
                <TabsTrigger value="1" className="px-2.5 text-xs">
                  {isZh ? `第 1 周 ${ledger.dirCounts.wave1}` : `W1 ${ledger.dirCounts.wave1}`}
                </TabsTrigger>
                <TabsTrigger value="2" className="px-2.5 text-xs">
                  {isZh ? `第 2 周 ${ledger.dirCounts.wave2}` : `W2 ${ledger.dirCounts.wave2}`}
                </TabsTrigger>
                <TabsTrigger value="3" className="px-2.5 text-xs">
                  {isZh ? `第 3 周 ${ledger.dirCounts.wave3}` : `W3 ${ledger.dirCounts.wave3}`}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label={isZh ? "按验活状态筛选" : "Filter status"}
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground outline-none"
              >
                <option value="all">{isZh ? "全部状态" : "All statuses"}</option>
                <option value="live">{isZh ? `已验活 (${ledger.dirCounts.live})` : `Verified (${ledger.dirCounts.live})`}</option>
                <option value="submitted">{isZh ? `审核中 (${ledger.dirCounts.submitted})` : `In review (${ledger.dirCounts.submitted})`}</option>
                <option value="queued">{isZh ? `待提交 (${ledger.dirCounts.queued})` : `Queued (${ledger.dirCounts.queued})`}</option>
                <option value="skipped">{isZh ? `已跳过 (${ledger.dirCounts.skipped})` : `Skipped (${ledger.dirCounts.skipped})`}</option>
              </select>

              <div className="relative w-full sm:w-[220px]">
                <IconSearch className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isZh ? "搜索目录名或 DR..." : "Search directory or DR..."}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* 官方 shadcn Table + TanStack React Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-28 text-center text-muted-foreground">
                        {isZh ? "当前筛选条件下未找到匹配目录" : "No matching directories"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={selectedDirId === row.original.id ? "selected" : undefined}
                        onClick={() => setSelectedDirId(row.original.id)}
                        className="cursor-pointer"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* TanStack 标准分页栏 */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground tabular-nums">
            <span>
              {isZh
                ? `共 ${filteredDirs.length} 站 · 当前第 ${table.getState().pagination.pageIndex + 1} / ${Math.max(1, table.getPageCount())} 页`
                : `${filteredDirs.length} directories · Page ${table.getState().pagination.pageIndex + 1} of ${Math.max(1, table.getPageCount())}`}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                <IconChevronLeft className="size-3.5" />
                {isZh ? "上一页" : "Prev"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                {isZh ? "下一页" : "Next"}
                <IconChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* 子标签 2：归因短链矩阵与 1 行统计像素 */}
        <TabsContent value="links" className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle>{isZh ? "专属边缘归因短链" : "Edge Attribution Shortlinks"}</CardTitle>
              <CardDescription>
                {isZh
                  ? "为每个目录、社区回复或对比页分配独立短链，自动追踪点击与美元付费"
                  : "Track exact clicks and dollar conversions per channel"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleCreateLink} className="flex flex-col sm:flex-row gap-2">
                <select
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2.5 text-sm outline-none"
                >
                  <option value="directory">{isZh ? "目录外链" : "Directory"}</option>
                  <option value="community">{isZh ? "社区回复" : "Community"}</option>
                  <option value="seo">{isZh ? "竞品对比页" : "Comparison"}</option>
                  <option value="social">{isZh ? "社媒简介" : "Social"}</option>
                </select>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder={isZh ? "渠道备注，如 Hacker News Show 首发" : "Channel label e.g. HN Launch"}
                  className="flex-1"
                />
                <Button type="submit" disabled={creatingLink}>
                  <IconPlus className="size-4" />
                  {isZh ? "生成短链" : "Add Link"}
                </Button>
              </form>

              <div className="divide-y rounded-lg border tabular-nums">
                {links.map((lk) => {
                  const fullUrl = `https://pulse.statementflow.win/r/${lk.code}`;
                  return (
                    <div key={lk.code} className="flex items-center justify-between gap-3 p-3.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{lk.label}</span>
                          <Badge variant="secondary" className="text-[11px]">
                            {formatChannelLabel(lk.channel, isZh)}
                          </Badge>
                        </div>
                        <p className="font-mono text-xs text-muted-foreground mt-0.5">/r/{lk.code}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right text-xs">
                          <div className="font-mono font-semibold">${lk.revenue_usd || 0}</div>
                          <div className="text-muted-foreground">
                            {lk.clicks_count} {isZh ? "点击" : "clicks"}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyText(`lk-${lk.code}`, fullUrl, isZh ? "短链已复制" : "Shortlink copied")}
                        >
                          {copiedId === `lk-${lk.code}` ? <IconCheck className="size-3.5" /> : <IconCopy className="size-3.5" />}
                          {isZh ? "复制" : "Copy"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconCode className="size-4" />
                {isZh ? "1 行美元级归因像素" : "1-Line Revenue Attribution Pixel"}
              </CardTitle>
              <CardDescription>
                {isZh
                  ? "粘贴到官网 <head> 中，注册或付款回调触发 window.lpConvert()"
                  : "Paste into your <head> and trigger window.lpConvert() on signup/checkout"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <pre className="rounded-lg border bg-muted p-3 font-mono text-xs overflow-x-auto">{pixelCode}</pre>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isZh
                  ? "示例调用：注册时调用 window.lpConvert('signup')，收款成功时调用 window.lpConvert('purchase', 39)。"
                  : "Example: window.lpConvert('signup') or window.lpConvert('purchase', 39)."}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => copyText("pixel", pixelCode, isZh ? "归因脚本已复制" : "Snippet copied")}>
                  <IconCopy className="size-3.5" />
                  {isZh ? "复制脚本" : "Copy Script"}
                </Button>
                <Button size="sm" disabled={testingPixel} onClick={handleTestPixel}>
                  <IconBroadcast className="size-3.5" />
                  {isZh ? "测试回传" : "Test Ping"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 官方 shadcn Sheet 目录详情检查器 */}
      <Sheet open={Boolean(activeDir)} onOpenChange={(open) => !open && setSelectedDirId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {activeDir && (
            <>
              <SheetHeader>
                <SheetTitle>{activeDir.name}</SheetTitle>
                <SheetDescription className="font-mono text-xs">
                  {activeDir.url.replace("https://", "")}
                </SheetDescription>
              </SheetHeader>

              <div className="px-4 pb-6 space-y-5">
                <div className="grid grid-cols-2 gap-3 tabular-nums">
                  <Card>
                    <CardHeader className="p-3">
                      <CardDescription className="text-xs">{isZh ? "域名权重" : "Authority"}</CardDescription>
                      <CardTitle className="font-mono text-lg">DR {activeDir.dr}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="p-3">
                      <CardDescription className="text-xs">{isZh ? "估算月流量" : "Est. Traffic"}</CardDescription>
                      <CardTitle className="font-mono text-lg">{activeDir.monthlyTraffic}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">{isZh ? "外链属性" : "Link Type"}</span>
                    <span className="font-medium">
                      {activeDir.linkType === "dofollow" ? (isZh ? "传递权重 (Dofollow)" : "Dofollow") : "Nofollow"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">{isZh ? "预计审核周期" : "Review SLA"}</span>
                    <span>{formatSlaLabel(activeDir.approvalSla, isZh)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">{isZh ? "HTTP 验活状态" : "HTTP Check"}</span>
                    <span className="font-mono">
                      {activeDir.lastHttpStatus ? `HTTP ${activeDir.lastHttpStatus}` : isZh ? "等待收录" : "Pending"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {isZh ? "自助提交快捷复制" : "Quick-Fill Snippets"}
                  </p>
                  {[
                    {
                      id: "url",
                      label: isZh ? "专属归因短链" : "Tracking Shortlink",
                      val: `https://pulse.statementflow.win/r/${activeDir.shortlinkCode}`,
                    },
                    {
                      id: "tag",
                      label: isZh ? "一句话定位" : "One-line Tagline",
                      val: brandKit?.short_tagline || `${productName} — ${targetUrl}`,
                    },
                    {
                      id: "pitch",
                      label: isZh ? "标准产品简介" : "Standard Pitch",
                      val: brandKit?.medium_pitch || `${productName} (${targetUrl})`,
                    },
                  ].map((snip) => (
                    <div key={snip.id} className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{snip.label}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => copyText(`snip-${snip.id}`, snip.val)}
                        >
                          <IconCopy className="size-3" />
                          {isZh ? "复制" : "Copy"}
                        </Button>
                      </div>
                      <p className={`text-xs leading-relaxed ${snip.id === "url" ? "font-mono break-all" : "break-words"}`}>
                        {snip.val}
                      </p>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full"
                  render={<a href={activeDir.submitUrl} target="_blank" rel="noopener noreferrer" />}
                >
                  {isZh ? "前往官方提交页" : "Open Official Submit Page"}
                  <IconExternalLink className="size-4" />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
