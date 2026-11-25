"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  IconAdjustmentsHorizontal,
  IconArrowLeft,
  IconCopy,
  IconExternalLink,
  IconLock,
  IconRefresh,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  buildContextualReply,
  formatIntentBadge,
  type EntitlementInfo,
  type RadarLeadRecord,
  type RadarMonitorRecord,
  type ReplyTone,
} from "@/lib/console-ledger";

interface BuyerInboxViewProps {
  campaignId: number;
  productName: string;
  tagline: string;
  communityShortlink: string;
  monitor: RadarMonitorRecord | null;
  leads: RadarLeadRecord[];
  entitlement: EntitlementInfo;
  initialLeadId?: number | null;
  isZh: boolean;
  isSample: boolean;
  onRefresh: () => Promise<void> | void;
  onCheckout: (plan: "blitz" | "radar" | "dfy") => Promise<void> | void;
  checkoutPlan: string | null;
  onLocalLeadStatus?: (leadId: number, status: RadarLeadRecord["status"]) => void;
}

type InboxFilter = "all" | "pending" | "replied" | "won";

const ALL_SOURCES = [
  { id: "hn", label: "Hacker News" },
  { id: "reddit", label: "Reddit" },
  { id: "github", label: "GitHub" },
  { id: "devto", label: "DEV.to" },
  { id: "lobsters", label: "Lobste.rs" },
] as const;

/**
 * 视图 ③：买家收件箱（基于官方 shadcn/ui ResizablePanelGroup）
 * - 支持 Reddit / HN / GitHub / DEV.to / Lobste.rs 多源实时扫帖
 * - 接入后端真大模型 AI 回复精编引擎（POST /api/dashboard/radar/generate-reply），诚实标明生成引擎
 * - 严格执行 Free vs Paid 商业配额门控（体验沙盒模式完整预览，真实免费用户解锁前 3 条，超出提示 Creem 升级）
 */
export default function BuyerInboxView({
  campaignId,
  productName,
  tagline,
  communityShortlink,
  monitor,
  leads,
  entitlement,
  initialLeadId,
  isZh,
  isSample,
  onRefresh,
  onCheckout,
  checkoutPlan,
  onLocalLeadStatus,
}: BuyerInboxViewProps) {
  const [filter, setFilter] = useState<InboxFilter>("pending");
  const [selectedId, setSelectedId] = useState<number | null>(initialLeadId ?? null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const [tone, setTone] = useState<ReplyTone>("peer");
  const [zeroLinkMode, setZeroLinkMode] = useState(true);
  const [draft, setDraft] = useState("");
  const [draftEngine, setDraftEngine] = useState<{ engine: "template" | "llm" | "contextual-fallback"; model?: string }>({
    engine: "template",
  });
  const [generatingAi, setGeneratingAi] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [scanning, setScanning] = useState(false);

  // 监听规则折叠面板（含 Reddit 多源开关）
  const [showRules, setShowRules] = useState(false);
  const [keywordsInput, setKeywordsInput] = useState((monitor?.keywords || []).join(", "));
  const [competitorsInput, setCompetitorsInput] = useState((monitor?.competitors || []).join(", "));
  const [selectedSources, setSelectedSources] = useState<string[]>(
    monitor?.sources?.length ? monitor.sources : ["hn", "reddit", "github", "devto"]
  );
  const [savingRules, setSavingRules] = useState(false);

  useEffect(() => {
    setKeywordsInput((monitor?.keywords || []).join(", "));
    setCompetitorsInput((monitor?.competitors || []).join(", "));
    setSelectedSources(monitor?.sources?.length ? monitor.sources : ["hn", "reddit", "github", "devto"]);
  }, [monitor]);

  const activeLeads = useMemo(() => leads.filter((l) => l.status !== "dismissed"), [leads]);

  const counts = useMemo(() => {
    const pending = activeLeads.filter((l) => l.status === "new" || l.status === "drafted").length;
    const replied = activeLeads.filter((l) => l.status === "replied").length;
    const won = activeLeads.filter((l) => l.status === "won").length;
    return { all: pending + replied + won, pending, replied, won };
  }, [activeLeads]);

  const visibleLeads = useMemo(() => {
    return activeLeads.filter((l) => {
      if (filter === "pending") return l.status === "new" || l.status === "drafted";
      if (filter === "replied") return l.status === "replied";
      if (filter === "won") return l.status === "won";
      return true;
    });
  }, [activeLeads, filter]);

  const selectedIndex = useMemo(() => {
    if (visibleLeads.length === 0) return -1;
    const idx = visibleLeads.findIndex((l) => l.id === selectedId);
    return idx >= 0 ? idx : 0;
  }, [visibleLeads, selectedId]);

  const selectedLead = selectedIndex >= 0 ? visibleLeads[selectedIndex] : null;
  const maxUnlockedLeads = isSample ? 999 : entitlement.maxLeads;
  const isSelectedLocked = !isSample && selectedIndex >= maxUnlockedLeads;

  useEffect(() => {
    if (initialLeadId) setSelectedId(initialLeadId);
  }, [initialLeadId]);

  useEffect(() => {
    if (!selectedLead) {
      setDraft("");
      setDraftEngine({ engine: "template" });
      return;
    }
    setDraft(buildContextualReply(selectedLead, productName, tagline, communityShortlink, tone, zeroLinkMode));
    setDraftEngine({ engine: "template" });
  }, [selectedLead, productName, tagline, communityShortlink, tone, zeroLinkMode]);

  const handleGenerateAiReply = async () => {
    if (!selectedLead || isSelectedLocked) return;
    if (isSample) {
      toast.info(
        isZh
          ? "体验模式使用本地上下文草稿；登录真实账号后将直连 Cloudflare Workers AI 实时推理生成"
          : "Sign in to generate live LLM replies via Cloudflare Workers AI"
      );
      return;
    }
    setGeneratingAi(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const res = await fetch("/api/dashboard/radar/generate-reply", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selectedLead.title,
          excerpt: selectedLead.excerpt,
          source: selectedLead.source,
          community: selectedLead.community,
          productName,
          tagline,
          shortlink: communityShortlink,
          tone,
          zeroLinkMode,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        reply?: string;
        engine?: "llm" | "contextual-fallback";
        model?: string;
        error?: string;
      };
      if (!res.ok || !json.reply) {
        toast.error(json.error || (isZh ? "AI 生成失败，请稍后重试" : "AI generation failed"));
        return;
      }
      setDraft(json.reply);
      setDraftEngine({ engine: json.engine || "contextual-fallback", model: json.model });
      toast.success(
        json.engine === "llm"
          ? isZh
            ? "AI 原生回复已实时生成"
            : "Live AI reply generated"
          : isZh
            ? "模型繁忙，已切换结构化上下文兜底生成"
            : "Generated via contextual fallback"
      );
    } catch {
      toast.error(isZh ? "AI 生成请求超时，已保留当前草稿" : "AI request timed out");
    } finally {
      clearTimeout(timer);
      setGeneratingAi(false);
    }
  };

  const updateLeadStatus = useCallback(
    async (lead: RadarLeadRecord, nextStatus: RadarLeadRecord["status"], replyPayload?: string) => {
      setUpdating(true);
      try {
        if (isSample) {
          onLocalLeadStatus?.(lead.id, nextStatus);
        } else {
          await fetch("/api/dashboard/radar/lead", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leadId: lead.id, status: nextStatus, draftReply: replyPayload ?? draft }),
          });
          await onRefresh();
        }
      } finally {
        setUpdating(false);
      }
    },
    [draft, isSample, onLocalLeadStatus, onRefresh]
  );

  const handleCopyAndMarkReplied = useCallback(async () => {
    if (!selectedLead || isSelectedLocked) return;
    try {
      await navigator.clipboard.writeText(draft);
    } catch {
      // ignore
    }
    const idx = visibleLeads.findIndex((l) => l.id === selectedLead.id);
    const nextLead = visibleLeads[idx + 1] || visibleLeads[idx - 1] || null;
    await updateLeadStatus(selectedLead, "replied", draft);
    if (nextLead) setSelectedId(nextLead.id);
    toast.success(isZh ? "已复制英文草稿，并将该求购帖标为已回复" : "Draft copied and marked replied");
  }, [draft, isSelectedLocked, isZh, selectedLead, updateLeadStatus, visibleLeads]);

  const handleDismissLead = useCallback(async () => {
    if (!selectedLead || isSelectedLocked) return;
    const idx = visibleLeads.findIndex((l) => l.id === selectedLead.id);
    const nextLead = visibleLeads[idx + 1] || visibleLeads[idx - 1] || null;
    await updateLeadStatus(selectedLead, "dismissed");
    if (nextLead) setSelectedId(nextLead.id);
    toast.info(isZh ? "已归档忽略此条线索" : "Thread archived");
  }, [isSelectedLocked, isZh, selectedLead, updateLeadStatus, visibleLeads]);

  const handleRunScan = async () => {
    if (isSample) {
      toast.info(isZh ? "体验模式已展示最新样例；登录后可按你的关键词实时扫帖（含 Reddit）" : "Sign in to run live scans");
      return;
    }
    if (!campaignId) return;
    setScanning(true);
    try {
      const res = await fetch("/api/dashboard/radar/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const json = (await res.json()) as { inserted?: number; error?: string };
      if (res.ok) {
        toast.success(isZh ? `扫帖完成，新增 ${json.inserted || 0} 条求购线索` : `Found ${json.inserted || 0} new leads`);
        await onRefresh();
      } else {
        toast.error(json.error || "Scan failed");
      }
    } finally {
      setScanning(false);
    }
  };

  const toggleSource = (id: string) => {
    setSelectedSources((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((s) => s !== id) : prev) : [...prev, id]
    );
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSample) {
      setShowRules(false);
      toast.info(isZh ? "体验模式规则已预览；登录后持久化" : "Sign in to save custom rules");
      return;
    }
    setSavingRules(true);
    try {
      const res = await fetch("/api/dashboard/radar/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          keywords: keywordsInput.split(",").map((s) => s.trim()).filter(Boolean),
          competitors: competitorsInput.split(",").map((s) => s.trim()).filter(Boolean),
          sources: selectedSources,
        }),
      });
      if (res.ok) {
        setShowRules(false);
        toast.success(isZh ? "监听规则与多源开关已保存" : "Monitor rules saved");
        await onRefresh();
      }
    } finally {
      setSavingRules(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || showRules) return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (visibleLeads.length === 0) return;

      const curIdx = selectedLead ? visibleLeads.findIndex((l) => l.id === selectedLead.id) : 0;
      const k = e.key.toLowerCase();

      if (k === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedId(visibleLeads[(curIdx + 1) % visibleLeads.length]?.id ?? null);
      } else if (k === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedId(visibleLeads[(curIdx - 1 + visibleLeads.length) % visibleLeads.length]?.id ?? null);
      } else if (k === "1") setTone("peer");
      else if (k === "2") setTone("founder");
      else if (k === "3") setTone("compare");
      else if (k === "c") {
        e.preventDefault();
        void handleCopyAndMarkReplied();
      } else if (k === "e") {
        e.preventDefault();
        void handleDismissLead();
      } else if (k === "o" && selectedLead?.url && !isSelectedLocked) {
        window.open(selectedLead.url, "_blank", "noopener,noreferrer");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visibleLeads, selectedLead, isSelectedLocked, showRules, handleCopyAndMarkReplied, handleDismissLead]);

  const listPane = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 p-4 pb-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{isZh ? "买家收件箱" : "Buyer Inbox"}</h1>
          <p className="text-xs text-muted-foreground tabular-nums">
            {isZh
              ? `共 ${counts.all} 条线索 · 待跟进 ${counts.pending} 条${!isSample && maxUnlockedLeads < 999 ? ` · 当前方案可解锁前 ${maxUnlockedLeads} 条` : ""}`
              : `${counts.all} threads · ${counts.pending} pending`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setShowRules((v) => !v)}>
            <IconAdjustmentsHorizontal className="size-4" />
            <span className="hidden sm:inline">{isZh ? "监听词" : "Rules"}</span>
          </Button>
          <Button variant="outline" size="sm" disabled={scanning} onClick={handleRunScan}>
            <IconRefresh className={`size-3.5 ${scanning ? "animate-spin" : ""}`} />
            {isZh ? "立即扫帖" : "Scan"}
          </Button>
        </div>
      </div>

      {showRules && (
        <form onSubmit={handleSaveRules} className="mx-4 mb-3 rounded-lg border bg-muted/40 p-3 space-y-3">
          <div className="flex items-center justify-between text-xs font-medium">
            <span>{isZh ? "监听痛点词、竞品词与数据源" : "Keywords, Competitors & Sources"}</span>
            <Button type="button" variant="ghost" size="icon-xs" onClick={() => setShowRules(false)}>
              <IconX className="size-3.5" />
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <Input
              value={keywordsInput}
              onChange={(e) => setKeywordsInput(e.target.value)}
              placeholder="ssl certificate expired, domain monitor"
              className="h-8 text-xs bg-background"
            />
            <Input
              value={competitorsInput}
              onChange={(e) => setCompetitorsInput(e.target.value)}
              placeholder="UptimeRobot, Better Stack"
              className="h-8 text-xs bg-background"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {ALL_SOURCES.map((src) => {
              const active = selectedSources.includes(src.id);
              return (
                <Button
                  key={src.id}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className="h-6 px-2.5 text-[11px]"
                  onClick={() => toggleSource(src.id)}
                >
                  {src.label}
                </Button>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" className="h-7 text-xs" disabled={savingRules}>
              {isZh ? "保存规则" : "Save Rules"}
            </Button>
          </div>
        </form>
      )}

      <div className="px-4 pb-3 border-b">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as InboxFilter)}>
          <TabsList className="w-full grid grid-cols-4 tabular-nums">
            <TabsTrigger value="all" className="text-xs">
              {isZh ? `全部 ${counts.all}` : `All ${counts.all}`}
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">
              {isZh ? `待跟进 ${counts.pending}` : `Open ${counts.pending}`}
            </TabsTrigger>
            <TabsTrigger value="replied" className="text-xs">
              {isZh ? `已回复 ${counts.replied}` : `Replied ${counts.replied}`}
            </TabsTrigger>
            <TabsTrigger value="won" className="text-xs">
              {isZh ? `已转化 ${counts.won}` : `Won ${counts.won}`}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-3">
          {visibleLeads.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground space-y-2">
              <p>{isZh ? "当前筛选下暂无求购线索" : "No buyer threads in this view"}</p>
              {!isSample && (
                <Button variant="outline" size="sm" disabled={scanning} onClick={handleRunScan}>
                  <IconRefresh className={`size-3.5 ${scanning ? "animate-spin" : ""}`} />
                  {isZh ? "立即从 Reddit / HN / GitHub 扫帖" : "Run Live Multi-Source Scan"}
                </Button>
              )}
            </div>
          ) : (
            visibleLeads.map((lead, idx) => {
              const selected = selectedLead?.id === lead.id;
              const locked = !isSample && idx >= maxUnlockedLeads;
              return (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(lead.id);
                    setMobileDetailOpen(true);
                  }}
                  className={`flex flex-col items-start gap-2 rounded-lg border p-3.5 text-left text-sm transition-colors cursor-pointer ${
                    selected ? "bg-accent border-foreground/25" : "hover:bg-accent/50"
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        variant={lead.intent_type === "buying" ? "default" : "secondary"}
                        className="text-[11px] tabular-nums shrink-0"
                      >
                        {formatIntentBadge(lead.intent_type, lead.intent_score, isZh)}
                      </Badge>
                      <span className="text-xs font-medium text-muted-foreground truncate">
                        {lead.source}
                        {lead.community && lead.community !== lead.source ? ` · ${lead.community}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {locked && <IconLock className="size-3.5 text-muted-foreground" />}
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {isZh ? lead.relative_time_zh || lead.posted_at : lead.relative_time_en || lead.posted_at}
                      </span>
                    </div>
                  </div>
                  <p className={`font-medium leading-snug line-clamp-2 text-foreground ${locked ? "blur-[3px] select-none" : ""}`}>
                    {lead.title}
                  </p>
                  <p className={`text-xs text-muted-foreground line-clamp-1 ${locked ? "blur-[3px] select-none" : ""}`}>
                    {lead.excerpt}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const editorPane = (
    <div className="flex h-full flex-col">
      <div className="flex h-[57px] items-center justify-between gap-2 border-b px-4 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMobileDetailOpen(false)}
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <h2 className="text-sm font-semibold truncate">{isZh ? "原生回复精编器" : "Native Reply Studio"}</h2>
        </div>
        {selectedLead?.url && !isSelectedLocked && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            render={<a href={selectedLead.url} target="_blank" rel="noopener noreferrer" />}
          >
            {isZh ? "打开原帖" : "Open Thread"}
            <IconExternalLink className="size-3.5" />
          </Button>
        )}
      </div>

      {!selectedLead ? (
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
          {isZh ? "从左侧选择一条求购帖开始拟稿" : "Select a thread to compose a reply"}
        </div>
      ) : isSelectedLocked ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <Card className="w-full max-w-md border-primary/40">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto flex size-10 items-center justify-center rounded-lg border bg-muted">
                <IconLock className="size-5 text-primary" />
              </div>
              <CardTitle className="text-lg">
                {isZh ? "升级解锁全部高意向买家原帖" : "Unlock Unlimited Buyer Threads"}
              </CardTitle>
              <CardDescription>
                {isZh
                  ? `当前方案（${entitlement.plan.toUpperCase()}）最多查看前 ${maxUnlockedLeads} 条线索。订阅增长指挥台即可 24/7 解锁 Reddit / HN / GitHub 全量原帖与真实大模型回复生成。`
                  : `Your ${entitlement.plan} tier unlocks the first ${maxUnlockedLeads} threads. Upgrade to Growth Command for unlimited leads & AI replies.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <Button
                className="w-full"
                disabled={checkoutPlan === "radar"}
                onClick={() => void onCheckout("radar")}
              >
                {isZh ? "升级增长指挥台 · $29/月（Creem 安全结算）" : "Upgrade to Growth Command · $29/mo"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={checkoutPlan === "blitz"}
                onClick={() => void onCheckout("blitz")}
              >
                {isZh ? "或先开通启动包 · $39 一次性买断" : "Or Launch Starter · $39 one-time"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-between gap-4 p-4 overflow-y-auto">
          <div className="space-y-4">
            <Card className="bg-muted/40 shadow-none">
              <CardContent className="p-3.5 space-y-1.5">
                <p className="text-sm font-medium leading-snug">{selectedLead.title}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedLead.source}
                  {selectedLead.community && selectedLead.community !== selectedLead.source ? ` (${selectedLead.community})` : ""} ·{" "}
                  {selectedLead.author} ·{" "}
                  {isZh ? selectedLead.relative_time_zh || selectedLead.posted_at : selectedLead.relative_time_en || selectedLead.posted_at}
                </p>
                {selectedLead.excerpt && (
                  <>
                    <Separator className="my-2" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{selectedLead.excerpt}</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 3 种自然语调 Tabs */}
            <Tabs value={tone} onValueChange={(v) => setTone(v as ReplyTone)}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="peer" className="text-xs">
                  {isZh ? "同行纯干货" : "Peer Help"}
                </TabsTrigger>
                <TabsTrigger value="founder" className="text-xs">
                  {isZh ? "创始人分享" : "Founder"}
                </TabsTrigger>
                <TabsTrigger value="compare" className="text-xs">
                  {isZh ? "客观对比" : "Objective"}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* 官方 shadcn Switch 零链接养号模式 */}
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="zero-link-switch" className="text-sm font-medium cursor-pointer">
                  {isZh ? "零链接安全养号模式" : "Zero-Link Safe Mode"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isZh ? "剔除外部短链，避免 Reddit / HN 新号被误判广告" : "Strips external URLs to keep accounts ban-free"}
                </p>
              </div>
              <Switch
                id="zero-link-switch"
                checked={zeroLinkMode}
                onCheckedChange={(checked) => setZeroLinkMode(Boolean(checked))}
              />
            </div>

            {/* AI 真模型生成控制栏（诚实标注当前引擎） */}
            <div className="flex items-center justify-between gap-2">
              <Badge variant={draftEngine.engine === "llm" ? "default" : "secondary"} className="text-[11px] font-normal">
                {draftEngine.engine === "llm"
                  ? isZh
                    ? `真大模型实时生成 (${draftEngine.model?.split("/").pop() || "LLM"})`
                    : `Live LLM (${draftEngine.model?.split("/").pop() || "LLM"})`
                  : draftEngine.engine === "contextual-fallback"
                    ? isZh
                      ? "结构化上下文兜底生成"
                      : "Contextual fallback"
                    : isZh
                      ? "本地即时预览草稿"
                      : "Instant contextual draft"}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={generatingAi}
                onClick={() => void handleGenerateAiReply()}
              >
                <IconSparkles className={`size-3.5 ${generatingAi ? "animate-pulse" : ""}`} />
                {generatingAi ? (isZh ? "AI 推理中..." : "Generating...") : isZh ? "AI 实时精编" : "Generate with AI"}
              </Button>
            </div>

            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={7}
              aria-label={isZh ? "原生英文回复草稿" : "Reply draft"}
              className="text-sm leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t pt-3">
            <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Kbd>C</Kbd> {isZh ? "复制标已回复" : "Copy & Reply"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Kbd>E</Kbd> {isZh ? "忽略" : "Archive"}
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="ghost" size="sm" disabled={updating} onClick={handleDismissLead}>
                {isZh ? "忽略" : "Archive"}
              </Button>
              <Button size="sm" disabled={updating} onClick={handleCopyAndMarkReplied}>
                <IconCopy className="size-3.5" />
                {isZh ? "复制并标记已回复" : "Copy & Mark Replied"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-1 flex-col min-h-[calc(100vh-3.5rem)]">
      <div className="hidden lg:flex flex-1 min-h-0">
        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          <ResizablePanel defaultSize={52} minSize={36}>
            {listPane}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={48} minSize={34}>
            {editorPane}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <div className="flex flex-1 flex-col lg:hidden">
        {mobileDetailOpen ? editorPane : listPane}
      </div>
    </div>
  );
}
