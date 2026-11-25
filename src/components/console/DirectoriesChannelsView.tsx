"use client";

import { useEffect, useMemo, useState } from "react";
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
  IconCopy,
  IconExternalLink,
  IconFilterOff,
  IconLock,
  IconPhoto,
  IconSearch,
  IconShare,
  IconShieldCheck,
  IconStar,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DomainFavicon from "@/components/frosted/DomainFavicon";
import WaveTelemetryMatrix from "@/components/frosted/WaveTelemetryMatrix";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatCategoryLabel,
  formatDateTimeLabel,
  formatPlanName,
  formatSlaLabel,
  getSiteOrigin,
  type BrandKitRecord,
  type EntitlementInfo,
  type ReconciledDirectoryRow,
  type ReconciledLedger,
} from "@/lib/console-ledger";

interface DirectoriesChannelsViewProps {
  campaignId: number;
  productName: string;
  targetUrl: string;
  brandKit: BrandKitRecord | null;
  ledger: ReconciledLedger;
  entitlement: EntitlementInfo;
  initialDirectoryId?: string | null;
  onClearInitialDirectory?: () => void;
  isZh: boolean;
  isSample: boolean;
  onModerationChange: (
    directoryId: string,
    moderationState: "approved" | "skipped" | "priority",
    scheduledWave: 1 | 2 | 3
  ) => Promise<boolean>;
  onSelfSubmitDirectory: (params: {
    dir: ReconciledDirectoryRow;
    status: "queued" | "submitted" | "live";
    liveBacklinkUrl: string;
    verifyNow?: boolean;
  }) => Promise<boolean>;
  onCheckout: (plan: "blitz" | "radar" | "dfy") => Promise<void> | void;
  checkoutPlan: string | null;
  onShareReport: () => Promise<void> | void;
  sharingReport: boolean;
}

/**
 * 视图 ②：100 目录分发工作台（专注目录排期、自助打卡回填与 HTTP 验活闭环）
 * - 支持按波次 / 状态 / 外链属性（Dofollow）/ 费用筛选、自定义每页条数与键盘行访问
 * - 右侧 520px 详情检查器提供自助标已提交、回填收录外链、即时单站 HTTP 验活、调波次与凭证预览
 */
export default function DirectoriesChannelsView({
  campaignId,
  productName,
  targetUrl,
  brandKit,
  ledger,
  entitlement,
  initialDirectoryId,
  onClearInitialDirectory,
  isZh,
  isSample,
  onModerationChange,
  onSelfSubmitDirectory,
  onCheckout,
  checkoutPlan,
  onShareReport,
  sharingReport,
}: DirectoriesChannelsViewProps) {
  const [waveFilter, setWaveFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [linkFilter, setLinkFilter] = useState<"all" | "dofollow" | "free">("all");
  const [query, setQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "dr", desc: true }]);
  const [selectedDirId, setSelectedDirId] = useState<string | null>(initialDirectoryId || null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 检查器自助提交表单
  const [liveUrlInput, setLiveUrlInput] = useState("");
  const [submittingSelf, setSubmittingSelf] = useState(false);

  // 同步外部 ⌘K 或首页跳转打开的目录 ID
  useEffect(() => {
    if (initialDirectoryId) {
      setSelectedDirId(initialDirectoryId);
      onClearInitialDirectory?.();
    }
  }, [initialDirectoryId, onClearInitialDirectory]);

  const unlockedIdSet = useMemo(() => {
    const limit = isSample ? ledger.directories.length : entitlement.maxDirectories;
    const sortedByDr = [...ledger.directories].sort((a, b) => b.dr - a.dr);
    return new Set(sortedByDr.slice(0, limit).map((d) => d.id));
  }, [isSample, ledger.directories, entitlement.maxDirectories]);

  const activeDir: ReconciledDirectoryRow | null = useMemo(() => {
    if (!selectedDirId) return null;
    if (!unlockedIdSet.has(selectedDirId)) return null;
    return ledger.directories.find((d) => d.id === selectedDirId) || null;
  }, [ledger.directories, selectedDirId, unlockedIdSet]);

  useEffect(() => {
    setLiveUrlInput(activeDir?.liveBacklinkUrl || "");
  }, [activeDir?.id, activeDir?.liveBacklinkUrl]);

  const hasActiveFilters = waveFilter !== "all" || statusFilter !== "all" || linkFilter !== "all" || query.trim() !== "";

  const filteredDirs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ledger.directories.filter((d) => {
      if (waveFilter !== "all" && String(d.scheduledWave) !== waveFilter) return false;
      if (statusFilter !== "all" && d.effectiveStatus !== statusFilter) return false;
      if (linkFilter === "dofollow" && d.linkType !== "dofollow") return false;
      if (linkFilter === "free" && d.pricing !== "free") return false;
      if (q && !`${d.name} ${d.url} ${d.category} dr${d.dr}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [ledger.directories, waveFilter, statusFilter, linkFilter, query]);

  const copyText = async (id: string, text: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success(label || (isZh ? "已复制到剪贴板" : "Copied to clipboard"));
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      toast.error(isZh ? "复制失败，请手动复制" : "Clipboard copy failed");
    }
  };

  const handleSelfAction = async (nextStatus: "queued" | "submitted" | "live", verifyNow = false) => {
    if (!activeDir) return;
    if (nextStatus === "live" && verifyNow && !liveUrlInput.trim()) {
      toast.error(isZh ? "请先填写你的收录页面链接再执行 HTTP 验活" : "Enter your live listing URL before verifying");
      return;
    }
    setSubmittingSelf(true);
    try {
      await onSelfSubmitDirectory({
        dir: activeDir,
        status: nextStatus,
        liveBacklinkUrl: liveUrlInput.trim(),
        verifyNow,
      });
    } finally {
      setSubmittingSelf(false);
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
            <div className="flex items-center gap-3 min-w-[210px]">
              <DomainFavicon name={d.name} url={d.url} />
              <div className="min-w-0">
                <div className="font-medium text-foreground flex items-center gap-1.5">
                  <span className="truncate">{d.name}</span>
                  {d.moderationState === "priority" && (
                    <Badge variant="info" className="h-4.5 px-1.5 text-[10.5px]">
                      {isZh ? "优先" : "Priority"}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatCategoryLabel(d.category, isZh)} ·{" "}
                  {d.pricing === "free" ? (isZh ? "免费收录" : "Free") : isZh ? "含加速项" : "Freemium"} ·{" "}
                  {d.linkType === "dofollow" ? "Dofollow" : "Nofollow"}
                </div>
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
        cell: ({ row }) => {
          const dr = row.original.dr;
          const variant = dr >= 80 ? "success" : dr >= 70 ? "info" : "neutral";
          return (
            <Badge variant={variant} className="font-mono tabular-nums">
              DR {dr}
            </Badge>
          );
        },
      },
      {
        accessorKey: "approvalSla",
        header: () => (isZh ? "预计审核" : "Review"),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{formatSlaLabel(row.original.approvalSla, isZh)}</span>
        ),
      },
      {
        accessorKey: "scheduledWave",
        header: () => (isZh ? "排期波次" : "Wave"),
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
              <Badge variant="success" className="text-xs">
                {isZh ? (d.isDofollowVerified ? "已验活 · 传权重" : "已验活") : "Verified"}
              </Badge>
            );
          }
          if (d.effectiveStatus === "submitted") {
            return <Badge variant="warning">{isZh ? "审核中" : "In Review"}</Badge>;
          }
          if (d.effectiveStatus === "skipped") {
            return <Badge variant="neutral">{isZh ? "已跳过" : "Skipped"}</Badge>;
          }
          return <Badge variant="outline">{isZh ? "待提交" : "Queued"}</Badge>;
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">{isZh ? "操作" : "Action"}</div>,
        cell: ({ row }) => {
          const d = row.original;
          const locked = !unlockedIdSet.has(d.id);
          if (locked) {
            return (
              <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  disabled={checkoutPlan !== null}
                  onClick={() => void onCheckout(entitlement.plan === "free" ? "blitz" : "radar")}
                >
                  <IconLock className="size-3" />
                  {isZh ? "升级解锁" : "Upgrade"}
                </Button>
              </div>
            );
          }
          return (
            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={async () => {
                  const ok = await onModerationChange(
                    d.id,
                    d.moderationState === "skipped" ? "approved" : "skipped",
                    d.scheduledWave
                  );
                  if (ok) {
                    toast.success(
                      d.moderationState === "skipped"
                        ? isZh
                          ? `已恢复 ${d.name} 至投放队列`
                          : `Restored ${d.name}`
                        : isZh
                          ? `已跳过 ${d.name}`
                          : `Skipped ${d.name}`
                    );
                  }
                }}
              >
                {d.moderationState === "skipped" ? (isZh ? "恢复" : "Restore") : isZh ? "跳过" : "Skip"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setSelectedDirId(d.id)}
              >
                {d.effectiveStatus === "live"
                  ? isZh
                    ? "查回执"
                    : "Proof"
                  : d.effectiveStatus === "submitted"
                    ? isZh
                      ? "更新进度"
                      : "Update"
                    : isZh
                      ? "提交与打卡"
                      : "Submit"}
              </Button>
            </div>
          );
        },
      },
    ],
    [isZh, onModerationChange, unlockedIdSet, checkoutPlan, onCheckout, entitlement.plan]
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

  const siteOrigin = getSiteOrigin();
  const activeDirTrackingUrl = activeDir
    ? `${siteOrigin}/r/${activeDir.shortlinkCode}?ref=${encodeURIComponent(activeDir.id)}`
    : "";

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6 min-w-0 tabular-nums">
      {/* 顶栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isZh ? "100+ 目录分发队列" : "Directory Distribution"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isZh
              ? `已验活 ${ledger.dirCounts.live} · 审核中 ${ledger.dirCounts.submitted} · 待提交 ${ledger.dirCounts.queued} · 已跳过 ${ledger.dirCounts.skipped}（共 ${ledger.dirCounts.total} 站）`
              : `${ledger.dirCounts.live} verified · ${ledger.dirCounts.submitted} in review · ${ledger.dirCounts.queued} queued · ${ledger.dirCounts.skipped} skipped (${ledger.dirCounts.total} total)`}
          </p>
        </div>

        <Button variant="outline" size="sm" disabled={sharingReport} onClick={onShareReport}>
          <IconShare className="size-4" />
          {isZh ? "复制公开战报" : "Share Public Report"}
        </Button>
      </div>

      {/* 商业配额提示条（清晰标明配额差异） */}
      {!isSample && entitlement.maxDirectories < ledger.dirCounts.total && (
        <Card className="border-primary/25 bg-primary/[0.04] shadow-none">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <IconLock className="size-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <p className="font-semibold text-foreground">
                  {isZh
                    ? `${formatPlanName(entitlement.plan, true)}已开放前 ${entitlement.maxDirectories} 个高权重目录（共 ${ledger.dirCounts.total} 站）`
                    : `${formatPlanName(entitlement.plan, false)} unlocks Top ${entitlement.maxDirectories} of ${ledger.dirCounts.total} directories`}
                </p>
                <p className="text-muted-foreground">
                  {isZh
                    ? "启动包（$39 买断）开放 30 站 + 5 条买家原帖；增长指挥台（$29/月）解锁全部 100 站与无限买家线索。"
                    : "Starter ($39) unlocks 30 directories + 5 buyer threads; Growth Pro ($29/mo) unlocks all 100 directories + unlimited leads."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                disabled={checkoutPlan !== null}
                onClick={() => void onCheckout("blitz")}
              >
                {isZh ? "启动包 $39" : "Starter $39"}
              </Button>
              <Button size="sm" disabled={checkoutPlan !== null} onClick={() => void onCheckout("radar")}>
                {isZh ? "解锁全部 100 站 · $29/月" : "Unlock All 100 · $29/mo"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 100 目录三波次交互矩阵（点击波次直接联动下方表格筛选） */}
      <WaveTelemetryMatrix
        directories={ledger.directories}
        isZh={isZh}
        activeWave={waveFilter}
        onSelectWave={(w) => setWaveFilter(w)}
        onSelectDirectory={(d) => {
          if (unlockedIdSet.has(d.id)) setSelectedDirId(d.id);
        }}
      />

      {/* 多维筛选工具栏 */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <Tabs value={waveFilter} onValueChange={(v) => setWaveFilter(String(v))}>
          <TabsList>
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
          <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(String(v))}>
            <SelectTrigger className="w-[144px] h-8 text-xs" aria-label={isZh ? "按投放状态筛选" : "Filter status"}>
              <SelectValue>
                {statusFilter === "all"
                  ? isZh
                    ? "全部状态"
                    : "All statuses"
                  : statusFilter === "live"
                    ? isZh
                      ? `已验活 (${ledger.dirCounts.live})`
                      : `Verified (${ledger.dirCounts.live})`
                    : statusFilter === "submitted"
                      ? isZh
                        ? `审核中 (${ledger.dirCounts.submitted})`
                        : `In review (${ledger.dirCounts.submitted})`
                      : statusFilter === "queued"
                        ? isZh
                          ? `待提交 (${ledger.dirCounts.queued})`
                          : `Queued (${ledger.dirCounts.queued})`
                        : isZh
                          ? `已跳过 (${ledger.dirCounts.skipped})`
                          : `Skipped (${ledger.dirCounts.skipped})`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isZh ? "全部状态" : "All statuses"}</SelectItem>
              <SelectItem value="live">{isZh ? `已验活 (${ledger.dirCounts.live})` : `Verified (${ledger.dirCounts.live})`}</SelectItem>
              <SelectItem value="submitted">{isZh ? `审核中 (${ledger.dirCounts.submitted})` : `In review (${ledger.dirCounts.submitted})`}</SelectItem>
              <SelectItem value="queued">{isZh ? `待提交 (${ledger.dirCounts.queued})` : `Queued (${ledger.dirCounts.queued})`}</SelectItem>
              <SelectItem value="skipped">{isZh ? `已跳过 (${ledger.dirCounts.skipped})` : `Skipped (${ledger.dirCounts.skipped})`}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={linkFilter} onValueChange={(v) => v && setLinkFilter(v as "all" | "dofollow" | "free")}>
            <SelectTrigger className="w-[136px] h-8 text-xs" aria-label={isZh ? "按外链属性筛选" : "Filter link type"}>
              <SelectValue>
                {linkFilter === "all"
                  ? isZh
                    ? "全部属性"
                    : "All types"
                  : linkFilter === "dofollow"
                    ? isZh
                      ? "仅传权重 (Dofollow)"
                      : "Dofollow only"
                    : isZh
                      ? "仅免费收录"
                      : "Free only"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isZh ? "全部属性" : "All types"}</SelectItem>
              <SelectItem value="dofollow">{isZh ? "仅传权重 (Dofollow)" : "Dofollow only"}</SelectItem>
              <SelectItem value="free">{isZh ? "仅免费收录" : "Free only"}</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-[210px]">
            <IconSearch className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              aria-label={isZh ? "搜索目录名或 DR" : "Search directory or DR"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isZh ? "搜索目录名或 DR..." : "Search directory or DR..."}
              className="h-8 pl-8 text-xs"
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground"
              onClick={() => {
                setWaveFilter("all");
                setStatusFilter("all");
                setLinkFilter("all");
                setQuery("");
              }}
            >
              <IconFilterOff className="size-3.5" />
              {isZh ? "重置" : "Reset"}
            </Button>
          )}
        </div>
      </div>

      {/* TanStack React Table */}
      <Card className="shadow-xs">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                table.getRowModel().rows.map((row) => {
                  const locked = !unlockedIdSet.has(row.original.id);
                  const openRow = () => {
                    if (locked) {
                      toast.info(
                        isZh
                          ? `当前方案已开放前 ${entitlement.maxDirectories} 站，升级即可解锁全部 100+ 目录`
                          : "Upgrade to unlock all 100+ directories"
                      );
                      return;
                    }
                    setSelectedDirId(row.original.id);
                  };
                  return (
                    <TableRow
                      key={row.id}
                      tabIndex={0}
                      role="button"
                      data-state={selectedDirId === row.original.id ? "selected" : undefined}
                      onClick={openRow}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openRow();
                        }
                      }}
                      className={`focus-visible:outline-none focus-visible:bg-accent/60 ${
                        locked ? "opacity-70 cursor-pointer" : "cursor-pointer"
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 分页控制栏（支持调整每页显示数） */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>
            {isZh
              ? `共 ${filteredDirs.length} 站 · 第 ${table.getState().pagination.pageIndex + 1} / ${Math.max(1, table.getPageCount())} 页`
              : `${filteredDirs.length} directories · Page ${table.getState().pagination.pageIndex + 1} of ${Math.max(1, table.getPageCount())}`}
          </span>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(v) => v && table.setPageSize(Number(v))}
          >
            <SelectTrigger className="h-7 w-[92px] text-xs" aria-label={isZh ? "每页条数" : "Rows per page"}>
              <SelectValue>
                {table.getState().pagination.pageSize} {isZh ? "条/页" : "/ page"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 {isZh ? "条/页" : "/ page"}</SelectItem>
              <SelectItem value="30">30 {isZh ? "条/页" : "/ page"}</SelectItem>
              <SelectItem value="50">50 {isZh ? "条/页" : "/ page"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

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

      {/* 宽版 520px 目录详情与自助提交闭环检查器 */}
      <Sheet open={Boolean(activeDir)} onOpenChange={(open) => !open && setSelectedDirId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {activeDir && (
            <>
              <SheetHeader className="border-b pb-3">
                <div className="flex items-center gap-2 pr-8">
                  <SheetTitle className="truncate">{activeDir.name}</SheetTitle>
                  <Badge
                    variant={
                      activeDir.effectiveStatus === "live"
                        ? "success"
                        : activeDir.effectiveStatus === "submitted"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {activeDir.effectiveStatus === "live"
                      ? isZh
                        ? "已验活"
                        : "Verified"
                      : activeDir.effectiveStatus === "submitted"
                        ? isZh
                          ? "审核中"
                          : "In Review"
                        : activeDir.effectiveStatus === "skipped"
                          ? isZh
                            ? "已跳过"
                            : "Skipped"
                          : isZh
                            ? "待提交"
                            : "Queued"}
                  </Badge>
                </div>
                <SheetDescription className="font-mono text-xs">
                  {activeDir.url.replace("https://", "")}
                </SheetDescription>
              </SheetHeader>

              <div className="px-4 pb-6 space-y-5">
                {/* 权重与流量概览 */}
                <div className="grid grid-cols-3 gap-2.5 tabular-nums">
                  <Card className="shadow-none">
                    <CardHeader className="p-3">
                      <CardDescription className="text-[11px]">{isZh ? "域名权重" : "Authority"}</CardDescription>
                      <CardTitle className="font-mono text-base">DR {activeDir.dr}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="shadow-none">
                    <CardHeader className="p-3">
                      <CardDescription className="text-[11px]">{isZh ? "月访问估算" : "Est. Traffic"}</CardDescription>
                      <CardTitle className="font-mono text-base">{activeDir.monthlyTraffic}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="shadow-none">
                    <CardHeader className="p-3">
                      <CardDescription className="text-[11px]">{isZh ? "外链属性" : "Link Type"}</CardDescription>
                      <CardTitle className="text-sm font-semibold">
                        {activeDir.linkType === "dofollow" ? "Dofollow" : "Nofollow"}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* 排期与优先级控制 */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{isZh ? "投放排期" : "Wave"}</span>
                    <Select
                      value={String(activeDir.scheduledWave)}
                      onValueChange={async (v) => {
                        const w = Number(v) as 1 | 2 | 3;
                        const ok = await onModerationChange(activeDir.id, activeDir.moderationState, w);
                        if (ok) toast.success(isZh ? `已调整至第 ${w} 周` : `Moved to Week ${w}`);
                      }}
                    >
                      <SelectTrigger className="h-7 w-[92px] text-xs bg-background">
                        <SelectValue>{isZh ? `第 ${activeDir.scheduledWave} 周` : `Week ${activeDir.scheduledWave}`}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">{isZh ? "第 1 周" : "Week 1"}</SelectItem>
                        <SelectItem value="2">{isZh ? "第 2 周" : "Week 2"}</SelectItem>
                        <SelectItem value="3">{isZh ? "第 3 周" : "Week 3"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant={activeDir.moderationState === "priority" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={async () => {
                      const next = activeDir.moderationState === "priority" ? "approved" : "priority";
                      const ok = await onModerationChange(activeDir.id, next, activeDir.scheduledWave);
                      if (ok) toast.success(next === "priority" ? (isZh ? "已设为优先提交" : "Marked priority") : isZh ? "已取消优先" : "Removed priority");
                    }}
                  >
                    <IconStar className="size-3.5" />
                    {activeDir.moderationState === "priority" ? (isZh ? "已标优先" : "Priority") : isZh ? "标为优先" : "Set Priority"}
                  </Button>
                </div>

                {/* 自助提交进度打卡与单站实时验活闭环 */}
                <div className="rounded-lg border p-3.5 space-y-3 bg-card">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">
                      {isZh ? "自助进度打卡与外链验活" : "Self-Serve Progress & Live Verification"}
                    </p>
                    {activeDir.lastHttpStatus > 0 && (
                      <Badge variant={activeDir.lastHttpStatus >= 200 && activeDir.lastHttpStatus < 400 ? "success" : "destructive"}>
                        HTTP {activeDir.lastHttpStatus}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="self-live-url" className="text-xs text-muted-foreground">
                      {isZh ? "收录后的外链页面 URL（可选，支持立即 HTTP 验活）" : "Live Listing URL (optional, for instant HTTP check)"}
                    </Label>
                    <Input
                      id="self-live-url"
                      value={liveUrlInput}
                      onChange={(e) => setLiveUrlInput(e.target.value)}
                      placeholder="https://sourceforge.net/projects/your-saas"
                      className="h-8 font-mono text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      disabled={submittingSelf}
                      onClick={() => void handleSelfAction("submitted", false)}
                    >
                      <IconCheck className="size-3.5" />
                      {isZh ? "标为我已提交" : "Mark Submitted"}
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      disabled={submittingSelf}
                      onClick={() => void handleSelfAction("live", Boolean(liveUrlInput.trim()))}
                    >
                      <IconShieldCheck className="size-3.5" />
                      {liveUrlInput.trim()
                        ? isZh
                          ? "标为已收录并立即验活"
                          : "Mark Live & Verify HTTP"
                        : isZh
                          ? "标为已收录"
                          : "Mark Live"}
                    </Button>
                    {activeDir.effectiveStatus !== "queued" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-muted-foreground"
                        disabled={submittingSelf}
                        onClick={() => void handleSelfAction("queued", false)}
                      >
                        {isZh ? "退回待提交" : "Reset"}
                      </Button>
                    )}
                  </div>

                  {activeDir.lastCheckedAt && (
                    <p className="text-[11px] text-muted-foreground">
                      {isZh
                        ? `最近验活时间：${formatDateTimeLabel(activeDir.lastCheckedAt, true)}`
                        : `Last checked: ${formatDateTimeLabel(activeDir.lastCheckedAt, false)}`}
                    </p>
                  )}

                  {activeDir.proofScreenshotUrl && (
                    <div className="pt-1 border-t space-y-1.5">
                      <a
                        href={activeDir.proofScreenshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <IconPhoto className="size-3.5" />
                        {isZh ? "查看提交截图凭证 ↗" : "View Submission Proof Screenshot ↗"}
                      </a>
                    </div>
                  )}
                </div>

                {/* 快捷复制提交物料（明确带单站 ref 归因参数） */}
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {isZh ? "快捷复制提交物料" : "Quick-Fill Submission Snippets"}
                  </p>
                  {[
                    {
                      id: "url",
                      label: isZh ? "带目录来源标记的归因短链" : "Directory Tracking Link (with ref)",
                      val: activeDirTrackingUrl,
                    },
                    {
                      id: "tag",
                      label: isZh ? "一句话定位" : "One-line Tagline",
                      val: brandKit?.short_tagline || `${productName} — ${targetUrl}`,
                    },
                    {
                      id: "pitch",
                      label: isZh ? "标准目录简介" : "Standard Pitch",
                      val: brandKit?.medium_pitch || `${productName} (${targetUrl})`,
                    },
                  ].map((snip) => (
                    <div key={snip.id} className="rounded-lg border bg-muted/35 p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{snip.label}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => copyText(`snip-${snip.id}`, snip.val)}
                        >
                          {copiedId === `snip-${snip.id}` ? <IconCheck className="size-3" /> : <IconCopy className="size-3" />}
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
