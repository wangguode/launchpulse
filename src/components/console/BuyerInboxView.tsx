"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  IconAdjustmentsHorizontal,
  IconArrowLeft,
  IconBellRinging,
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconHelp,
  IconLock,
  IconRefresh,
  IconRotateClockwise,
  IconSparkles,
  IconTrophy,
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
  formatDateTimeLabel,
  formatIntentBadge,
  formatPlanName,
  getSourceToneClasses,
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
  shortcutsDisabled?: boolean;
  isZh: boolean;
  isSample: boolean;
  onRefresh: () => Promise<void> | void;
  onCheckout: (plan: "blitz" | "radar" | "dfy") => Promise<void> | void;
  checkoutPlan: string | null;
  onLocalLeadStatus?: (leadId: number, status: RadarLeadRecord["status"], draftReply?: string) => void;
}

type InboxFilter = "all" | "pending" | "replied" | "won" | "archived";

const ALL_SOURCES = [
  { id: "hn", label: "Hacker News" },
  { id: "reddit", label: "Reddit" },
  { id: "github", label: "GitHub" },
  { id: "devto", label: "DEV.to" },
  { id: "lobsters", label: "Lobste.rs" },
] as const;

/**
 * 视图 ③：买家收件箱（邮件式双栏批处理 + 完整 CRM 闭环 + Webhook 实时推送）
 * - 修复 react-resizable-panels v4 百分比字符串单位与视口定高容器
 * - 补齐 Won（已转化）标记、仅复制、忽略后 Toast Undo 撤销、已归档找回与草稿持久化回显
 * - 完整释放后端已实现的排除词（excludeWords）、Slack/Discord Webhook 推送与测试、日报开关和上次扫帖时间
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
  shortcutsDisabled = false,
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
  const [draftEngine, setDraftEngine] = useState<{ engine: "saved" | "template" | "llm" | "contextual-fallback"; model?: string }>({
    engine: "template",
  });
  const [generatingAi, setGeneratingAi] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // 监听规则与 Webhook 推送面板
  const [showRules, setShowRules] = useState(false);
  const [keywordsInput, setKeywordsInput] = useState((monitor?.keywords || []).join(", "));
  const [competitorsInput, setCompetitorsInput] = useState((monitor?.competitors || []).join(", "));
  const [excludeInput, setExcludeInput] = useState((monitor?.excludeWords || []).join(", "));
  const [webhookUrl, setWebhookUrl] = useState(monitor?.webhook_url || "");
  const [dailyDigest, setDailyDigest] = useState(monitor?.daily_digest_enabled !== 0);
  const [selectedSources, setSelectedSources] = useState<string[]>(
    monitor?.sources?.length ? monitor.sources : ["hn", "reddit", "github", "devto"]
  );
  const [savingRules, setSavingRules] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  useEffect(() => {
    setKeywordsInput((monitor?.keywords || []).join(", "));
    setCompetitorsInput((monitor?.competitors || []).join(", "));
    setExcludeInput((monitor?.excludeWords || []).join(", "));
    setWebhookUrl(monitor?.webhook_url || "");
    setDailyDigest(monitor?.daily_digest_enabled !== 0);
    setSelectedSources(monitor?.sources?.length ? monitor.sources : ["hn", "reddit", "github", "devto"]);
  }, [monitor]);

  const activeLeads = useMemo(() => leads.filter((l) => l.status !== "dismissed"), [leads]);
  const archivedLeads = useMemo(() => leads.filter((l) => l.status === "dismissed"), [leads]);

  const counts = useMemo(() => {
    const pending = activeLeads.filter((l) => l.status === "new" || l.status === "drafted").length;
    const replied = activeLeads.filter((l) => l.status === "replied").length;
    const won = activeLeads.filter((l) => l.status === "won").length;
    return { all: pending + replied + won, pending, replied, won, archived: archivedLeads.length };
  }, [activeLeads, archivedLeads.length]);

  const visibleLeads = useMemo(() => {
    if (filter === "archived") return archivedLeads;
    return activeLeads.filter((l) => {
      if (filter === "pending") return l.status === "new" || l.status === "drafted";
      if (filter === "replied") return l.status === "replied";
      if (filter === "won") return l.status === "won";
      return true;
    });
  }, [activeLeads, archivedLeads, filter]);

  const selectedIndex = useMemo(() => {
    if (visibleLeads.length === 0) return -1;
    const idx = visibleLeads.findIndex((l) => l.id === selectedId);
    return idx >= 0 ? idx : 0;
  }, [visibleLeads, selectedId]);

  const selectedLead = selectedIndex >= 0 ? visibleLeads[selectedIndex] : null;
  const maxUnlockedLeads = isSample ? 999 : entitlement.maxLeads;
  const isSelectedLocked = Boolean(selectedLead && !isSample && (selectedLead.locked || selectedIndex >= maxUnlockedLeads));

  useEffect(() => {
    if (initialLeadId) setSelectedId(initialLeadId);
  }, [initialLeadId]);

  // 优先回显该线索已保存的草稿，不再无条件覆写用户写过的内容
  useEffect(() => {
    if (!selectedLead) {
      setDraft("");
      setDraftEngine({ engine: "template" });
      return;
    }
    if (selectedLead.draft_reply && selectedLead.draft_reply.trim().length > 0) {
      setDraft(selectedLead.draft_reply);
      setDraftEngine({ engine: "saved" });
      return;
    }
    setDraft(buildContextualReply(selectedLead, productName, tagline, communityShortlink, tone, zeroLinkMode));
    setDraftEngine({ engine: "template" });
  }, [selectedLead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyToneOrLink = (nextTone: ReplyTone, nextZeroLink: boolean) => {
    setTone(nextTone);
    setZeroLinkMode(nextZeroLink);
    if (selectedLead && !isSelectedLocked) {
      setDraft(buildContextualReply(selectedLead, productName, tagline, communityShortlink, nextTone, nextZeroLink));
      setDraftEngine({ engine: "template" });
    }
  };

  const handleGenerateAiReply = async () => {
    if (!selectedLead || isSelectedLocked) return;
    if (isSample) {
      toast.info(isZh ? "体验模式使用本地草稿；登录后直连边缘 AI 实时生成回复" : "Sign in to generate live AI replies");
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
            ? "AI 回复已实时生成"
            : "AI reply generated"
          : isZh
            ? "当前推理繁忙，已为你生成场景化草稿"
            : "Generated contextual draft"
      );
    } catch {
      toast.error(isZh ? "AI 请求超时，已保留当前草稿" : "AI request timed out");
    } finally {
      clearTimeout(timer);
      setGeneratingAi(false);
    }
  };

  const updateLeadStatus = useCallback(
    async (lead: RadarLeadRecord, nextStatus: RadarLeadRecord["status"], replyPayload?: string): Promise<boolean> => {
      setUpdating(true);
      try {
        if (isSample) {
          onLocalLeadStatus?.(lead.id, nextStatus, replyPayload);
          return true;
        }
        const res = await fetch("/api/dashboard/radar/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId: lead.id, status: nextStatus, draftReply: replyPayload ?? draft }),
        });
        if (!res.ok) {
          toast.error(isZh ? "状态保存失败，请重试" : "Failed to update thread status");
          return false;
        }
        await onRefresh();
        return true;
      } catch {
        toast.error(isZh ? "网络异常，请稍后重试" : "Network error");
        return false;
      } finally {
        setUpdating(false);
      }
    },
    [draft, isSample, isZh, onLocalLeadStatus, onRefresh]
  );

  const handleCopyOnly = async () => {
    if (!selectedLead || isSelectedLocked) return;
    try {
      await navigator.clipboard.writeText(draft);
      toast.success(isZh ? "英文草稿已复制（状态保持不变）" : "Draft copied");
    } catch {
      toast.error(isZh ? "复制失败" : "Copy failed");
    }
  };

  const handleCopyAndMarkReplied = useCallback(async () => {
    if (!selectedLead || isSelectedLocked) return;
    try {
      await navigator.clipboard.writeText(draft);
    } catch {
      // ignore
    }
    const idx = visibleLeads.findIndex((l) => l.id === selectedLead.id);
    const nextLead = visibleLeads[idx + 1] || visibleLeads[idx - 1] || null;
    const ok = await updateLeadStatus(selectedLead, "replied", draft);
    if (ok) {
      if (nextLead) setSelectedId(nextLead.id);
      toast.success(isZh ? "已复制英文草稿并标记为已回复" : "Copied and marked replied");
    }
  }, [draft, isSelectedLocked, isZh, selectedLead, updateLeadStatus, visibleLeads]);

  const handleMarkWon = useCallback(async () => {
    if (!selectedLead || isSelectedLocked) return;
    const ok = await updateLeadStatus(selectedLead, "won", draft);
    if (ok) {
      toast.success(isZh ? "恭喜！已将该买家线索标记为已转化" : "Marked lead as Won!");
    }
  }, [draft, isSelectedLocked, isZh, selectedLead, updateLeadStatus]);

  const handleDismissLead = useCallback(async () => {
    if (!selectedLead || isSelectedLocked) return;
    const target = selectedLead;
    const prevStatus = target.status;
    const idx = visibleLeads.findIndex((l) => l.id === target.id);
    const nextLead = visibleLeads[idx + 1] || visibleLeads[idx - 1] || null;
    const ok = await updateLeadStatus(target, "dismissed");
    if (ok) {
      if (nextLead) setSelectedId(nextLead.id);
      toast.info(isZh ? "已归档忽略此条线索" : "Thread archived", {
        action: {
          label: isZh ? "撤销" : "Undo",
          onClick: () => void updateLeadStatus(target, prevStatus === "dismissed" ? "new" : prevStatus),
        },
      });
    }
  }, [isSelectedLocked, isZh, selectedLead, updateLeadStatus, visibleLeads]);

  const handleRestoreLead = async () => {
    if (!selectedLead) return;
    const ok = await updateLeadStatus(selectedLead, "new");
    if (ok) {
      toast.success(isZh ? "已恢复至待跟进列表" : "Restored to Open");
    }
  };

  const handleRunScan = async () => {
    if (isSample) {
      toast.info(isZh ? "体验模式已展示最新样例；登录后可按关键词实时扫帖" : "Sign in to run live scans");
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
      const json = (await res.json()) as { inserted?: number; scanned?: number; error?: string };
      if (res.ok) {
        toast.success(
          isZh
            ? `扫帖完成：命中 ${json.scanned || 0} 条，新增入库 ${json.inserted || 0} 条`
            : `Scan finished: ${json.scanned || 0} matched, ${json.inserted || 0} new`
        );
        await onRefresh();
      } else {
        toast.error(json.error || (isZh ? "扫帖失败，请稍后重试" : "Scan failed"));
      }
    } catch {
      toast.error(isZh ? "扫帖请求超时" : "Scan request timed out");
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
      toast.info(isZh ? "体验模式规则已预览；登录后持久化保存" : "Sign in to save monitor rules");
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
          excludeWords: excludeInput.split(",").map((s) => s.trim()).filter(Boolean),
          sources: selectedSources,
          webhookUrl: webhookUrl.trim(),
          dailyDigestEnabled: dailyDigest,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error || (isZh ? "规则保存失败，请检查 Webhook 地址" : "Failed to save monitor rules"));
        return;
      }
      setShowRules(false);
      toast.success(isZh ? "监听词、排除词与实时推送规则已保存" : "Monitor & webhook rules saved");
      await onRefresh();
    } finally {
      setSavingRules(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast.error(isZh ? "请先填写 Slack 或 Discord Webhook URL" : "Enter a Slack/Discord Webhook URL first");
      return;
    }
    if (isSample) {
      toast.success(isZh ? "体验模式预览：登录后可发送真实 Webhook 测试消息" : "Sign in to test live webhooks");
      return;
    }
    setTestingWebhook(true);
    try {
      const res = await fetch("/api/dashboard/radar/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim(), productName }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && json.ok) {
        toast.success(isZh ? "测试推送成功，请检查你的 Slack / Discord 频道" : "Test alert delivered to webhook");
      } else {
        toast.error(json.error || (isZh ? "推送失败，请确认 Webhook URL 有效" : "Webhook delivery failed"));
      }
    } finally {
      setTestingWebhook(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || showRules || shortcutsDisabled) return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "?") {
        e.preventDefault();
        setShowShortcuts((v) => !v);
        return;
      }
      if (visibleLeads.length === 0) return;

      const curIdx = selectedLead ? visibleLeads.findIndex((l) => l.id === selectedLead.id) : 0;
      const k = e.key.toLowerCase();

      if (k === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedId(visibleLeads[(curIdx + 1) % visibleLeads.length]?.id ?? null);
      } else if (k === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedId(visibleLeads[(curIdx - 1 + visibleLeads.length) % visibleLeads.length]?.id ?? null);
      } else if (k === "1") applyToneOrLink("peer", zeroLinkMode);
      else if (k === "2") applyToneOrLink("founder", zeroLinkMode);
      else if (k === "3") applyToneOrLink("compare", zeroLinkMode);
      else if (k === "c") {
        e.preventDefault();
        void handleCopyAndMarkReplied();
      } else if (k === "w") {
        e.preventDefault();
        void handleMarkWon();
      } else if (k === "e") {
        e.preventDefault();
        void handleDismissLead();
      } else if (k === "o" && selectedLead?.url && !isSelectedLocked) {
        window.open(selectedLead.url, "_blank", "noopener,noreferrer");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    visibleLeads,
    selectedLead,
    isSelectedLocked,
    showRules,
    shortcutsDisabled,
    zeroLinkMode,
    handleCopyAndMarkReplied,
    handleMarkWon,
    handleDismissLead,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const listPane = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 p-4 pb-3 shrink-0">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight">{isZh ? "买家收件箱" : "Buyer Inbox"}</h1>
          <p className="text-xs text-muted-foreground tabular-nums truncate">
            {isZh
              ? `有效 ${counts.all} · 待跟进 ${counts.pending}${monitor?.last_scanned_at ? ` · 上次扫帖 ${formatDateTimeLabel(monitor.last_scanned_at, true)}` : ""}`
              : `${counts.all} threads · ${counts.pending} pending${monitor?.last_scanned_at ? ` · Scanned ${formatDateTimeLabel(monitor.last_scanned_at, false)}` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant={showRules ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowRules((v) => !v)}
          >
            <IconAdjustmentsHorizontal className="size-4" />
            <span className="hidden sm:inline">{isZh ? "规则与推送" : "Rules"}</span>
          </Button>
          <Button variant="outline" size="sm" disabled={scanning} onClick={handleRunScan}>
            <IconRefresh className={`size-3.5 ${scanning ? "animate-spin" : ""}`} />
            {isZh ? "立即扫帖" : "Scan"}
          </Button>
        </div>
      </div>

      {showRules && (
        <form onSubmit={handleSaveRules} className="mx-4 mb-3 rounded-lg border bg-muted/40 p-3.5 space-y-3 shrink-0">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>{isZh ? "监听关键词、排除词与实时 Webhook 推送" : "Monitor Keywords, Exclusions & Webhook"}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={isZh ? "关闭规则面板" : "Close rules panel"}
              onClick={() => setShowRules(false)}
            >
              <IconX className="size-3.5" />
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label htmlFor="radar-kw" className="text-[11px] text-muted-foreground">
                {isZh ? "核心痛点词（逗号分隔）" : "Pain Keywords"}
              </Label>
              <Input
                id="radar-kw"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="ssl certificate expired, domain monitor"
                className="h-8 text-xs bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="radar-comp" className="text-[11px] text-muted-foreground">
                {isZh ? "竞品替代词（逗号分隔）" : "Competitors"}
              </Label>
              <Input
                id="radar-comp"
                value={competitorsInput}
                onChange={(e) => setCompetitorsInput(e.target.value)}
                placeholder="UptimeRobot, Better Stack"
                className="h-8 text-xs bg-background"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="radar-excl" className="text-[11px] text-muted-foreground">
              {isZh ? "排除噪音词（过滤招聘/水贴）" : "Exclude Words"}
            </Label>
            <Input
              id="radar-excl"
              value={excludeInput}
              onChange={(e) => setExcludeInput(e.target.value)}
              placeholder="hiring, freelancer, internship"
              className="h-8 text-xs bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] text-muted-foreground">{isZh ? "监听平台" : "Sources"}</span>
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
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="radar-webhook" className="text-[11px] text-muted-foreground">
              {isZh ? "Slack / Discord Webhook（命中 92+ 高意向自动实时推送）" : "Slack / Discord Webhook URL"}
            </Label>
            <div className="flex gap-2">
              <Input
                id="radar-webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="h-8 font-mono text-xs bg-background flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs shrink-0"
                disabled={testingWebhook || !webhookUrl.trim()}
                onClick={() => void handleTestWebhook()}
              >
                <IconBellRinging className="size-3.5" />
                {testingWebhook ? (isZh ? "发送中..." : "Testing...") : isZh ? "测试推送" : "Test"}
              </Button>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Switch
                  id="radar-digest"
                  checked={dailyDigest}
                  onCheckedChange={(v) => setDailyDigest(Boolean(v))}
                />
                <Label htmlFor="radar-digest" className="text-xs cursor-pointer">
                  {isZh ? "开启每日高意向线索邮件摘要" : "Enable daily email digest"}
                </Label>
              </div>
              <Button type="submit" size="sm" className="h-7 text-xs" disabled={savingRules}>
                {savingRules ? (isZh ? "保存中..." : "Saving...") : isZh ? "保存规则" : "Save Rules"}
              </Button>
            </div>
          </div>
        </form>
      )}

      <div className="px-4 pb-3 border-b shrink-0">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as InboxFilter)}>
          <TabsList className="w-full grid grid-cols-5 tabular-nums">
            <TabsTrigger value="pending" className="text-xs px-1">
              {isZh ? `待跟进 ${counts.pending}` : `Open ${counts.pending}`}
            </TabsTrigger>
            <TabsTrigger value="replied" className="text-xs px-1">
              {isZh ? `已回复 ${counts.replied}` : `Replied ${counts.replied}`}
            </TabsTrigger>
            <TabsTrigger value="won" className="text-xs px-1">
              {isZh ? `已转化 ${counts.won}` : `Won ${counts.won}`}
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs px-1">
              {isZh ? `全部 ${counts.all}` : `All ${counts.all}`}
            </TabsTrigger>
            <TabsTrigger value="archived" className="text-xs px-1">
              {isZh ? `归档 ${counts.archived}` : `Arch ${counts.archived}`}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-2 p-3">
          {visibleLeads.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground space-y-2.5">
              <p>
                {filter === "archived"
                  ? isZh
                    ? "暂无已归档忽略的线索"
                    : "No archived threads"
                  : isZh
                    ? "当前筛选下暂无求购线索"
                    : "No buyer threads in this view"}
              </p>
              {!isSample && filter !== "archived" && (
                <Button variant="outline" size="sm" disabled={scanning} onClick={handleRunScan}>
                  <IconRefresh className={`size-3.5 ${scanning ? "animate-spin" : ""}`} />
                  {isZh ? "立即从 Reddit / HN / GitHub 扫帖" : "Run Live Multi-Source Scan"}
                </Button>
              )}
            </div>
          ) : (
            visibleLeads.map((lead, idx) => {
              const selected = selectedLead?.id === lead.id;
              const locked = !isSample && (Boolean(lead.locked) || idx >= maxUnlockedLeads);
              const intentVariant =
                lead.intent_type === "buying" ? "success" : lead.intent_type === "alternative" ? "warning" : "info";
              return (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(lead.id);
                    setMobileDetailOpen(true);
                  }}
                  className={`flex flex-col items-start gap-2 rounded-lg border p-3.5 text-left text-sm transition-colors cursor-pointer ${
                    selected
                      ? "bg-primary/[0.06] border-primary/40 shadow-2xs"
                      : "bg-card hover:bg-accent/45"
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Badge variant={intentVariant} className="text-[11px] tabular-nums shrink-0">
                        {formatIntentBadge(lead.intent_type, lead.intent_score, isZh)}
                      </Badge>
                      <span
                        className={`inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-medium truncate ${getSourceToneClasses(lead.source)}`}
                      >
                        {lead.source}
                      </span>
                      {lead.status === "won" && (
                        <Badge variant="success" className="text-[10px]">
                          {isZh ? "已转化" : "Won"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {locked && <IconLock className="size-3.5 text-muted-foreground" />}
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {isZh ? lead.relative_time_zh || lead.posted_at : lead.relative_time_en || lead.posted_at}
                      </span>
                    </div>
                  </div>
                  <p className={`font-medium leading-snug line-clamp-2 text-foreground ${locked ? "blur-[2px] select-none opacity-75" : ""}`}>
                    {lead.title}
                  </p>
                  <p className={`text-xs text-muted-foreground line-clamp-1 ${locked ? "blur-[2px] select-none opacity-70" : ""}`}>
                    {lead.community && lead.community !== lead.source ? `${lead.community} · ` : ""}
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
    <div className="flex h-full min-h-0 flex-col bg-card/40">
      <div className="flex h-[57px] items-center justify-between gap-2 border-b px-4 shrink-0 bg-card">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            aria-label={isZh ? "返回线索列表" : "Back to thread list"}
            onClick={() => setMobileDetailOpen(false)}
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <h2 className="text-sm font-semibold truncate">{isZh ? "原生回复精编器" : "Native Reply Studio"}</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 text-muted-foreground"
            aria-label={isZh ? "快捷键说明" : "Keyboard shortcuts"}
            onClick={() => setShowShortcuts((v) => !v)}
          >
            <IconHelp className="size-4" />
          </Button>
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
      </div>

      {showShortcuts && (
        <div className="mx-4 mt-3 rounded-lg border bg-muted/50 p-3 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span><Kbd>J</Kbd>/<Kbd>K</Kbd> {isZh ? "上下切换" : "Next/Prev"}</span>
            <span><Kbd>1</Kbd>/<Kbd>2</Kbd>/<Kbd>3</Kbd> {isZh ? "切换语调" : "Tone"}</span>
            <span><Kbd>C</Kbd> {isZh ? "复制并标已回复" : "Copy & Reply"}</span>
            <span><Kbd>W</Kbd> {isZh ? "标为已转化" : "Mark Won"}</span>
            <span><Kbd>E</Kbd> {isZh ? "归档忽略" : "Archive"}</span>
            <span><Kbd>O</Kbd> {isZh ? "打开原帖" : "Open URL"}</span>
          </div>
          <Button variant="ghost" size="icon-xs" onClick={() => setShowShortcuts(false)}>
            <IconX className="size-3.5" />
          </Button>
        </div>
      )}

      {!selectedLead ? (
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
          {isZh ? "从左侧选择一条求购帖开始拟稿" : "Select a thread to compose a reply"}
        </div>
      ) : isSelectedLocked ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <Card className="w-full max-w-md border-primary/30 shadow-xs">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconLock className="size-5" />
              </div>
              <CardTitle className="text-lg">
                {isZh ? "升级解锁全部高意向买家原帖" : "Unlock Unlimited Buyer Threads"}
              </CardTitle>
              <CardDescription>
                {isZh
                  ? `${formatPlanName(entitlement.plan, true)}可查看前 ${maxUnlockedLeads} 条线索。订阅增长指挥台 Pro 即刻解锁无限原帖与实时 AI 回复。`
                  : `${formatPlanName(entitlement.plan, false)} unlocks ${maxUnlockedLeads} threads. Upgrade for unlimited leads & live AI replies.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <Button className="w-full" disabled={checkoutPlan === "radar"} onClick={() => void onCheckout("radar")}>
                {isZh ? "增长指挥台 Pro · $29/月（无限线索 + 100 站）" : "Growth Pro · $29/mo (Unlimited leads)"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={checkoutPlan === "blitz"}
                onClick={() => void onCheckout("blitz")}
              >
                {isZh ? "启动包 · $39 一次性买断（5 条线索 + 30 站）" : "Starter · $39 one-time (5 leads + 30 dirs)"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-between gap-4 p-4 overflow-y-auto">
          <div className="space-y-4">
            <Card className="bg-card shadow-none">
              <CardContent className="p-3.5 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className={`inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-medium ${getSourceToneClasses(selectedLead.source)}`}>
                    {selectedLead.source}
                  </span>
                  {selectedLead.community && selectedLead.community !== selectedLead.source && (
                    <Badge variant="neutral" className="text-[11px]">{selectedLead.community}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {selectedLead.author} · {isZh ? selectedLead.relative_time_zh || selectedLead.posted_at : selectedLead.relative_time_en || selectedLead.posted_at}
                  </span>
                </div>
                <p className="text-sm font-semibold leading-snug">{selectedLead.title}</p>
                {selectedLead.excerpt && (
                  <>
                    <Separator className="my-2" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{selectedLead.excerpt}</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 3 种自然语调 */}
            <Tabs value={tone} onValueChange={(v) => applyToneOrLink(v as ReplyTone, zeroLinkMode)}>
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

            {/* 零链接养号模式 */}
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
              <div className="space-y-0.5">
                <Label htmlFor="zero-link-switch" className="text-sm font-medium cursor-pointer">
                  {isZh ? "零链接安全养号模式" : "Zero-Link Safe Mode"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isZh ? "自动剔除外部链接，避免 Reddit / HN 社区新号被判定广告" : "Strips URLs to keep new Reddit/HN accounts safe"}
                </p>
              </div>
              <Switch
                id="zero-link-switch"
                checked={zeroLinkMode}
                onCheckedChange={(checked) => applyToneOrLink(tone, Boolean(checked))}
              />
            </div>

            {/* AI 生成栏 */}
            <div className="flex items-center justify-between gap-2">
              <Badge variant={draftEngine.engine === "llm" ? "info" : draftEngine.engine === "saved" ? "success" : "neutral"} className="text-[11px] font-normal">
                {draftEngine.engine === "llm"
                  ? isZh
                    ? "AI 实时生成"
                    : "AI Generated"
                  : draftEngine.engine === "saved"
                    ? isZh
                      ? "已载入保存草稿"
                      : "Saved Draft"
                    : isZh
                      ? "场景化起草草稿"
                      : "Contextual Draft"}
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
                {generatingAi ? (isZh ? "AI 生成中..." : "Generating...") : isZh ? "AI 实时精编" : "Draft with AI"}
              </Button>
            </div>

            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={7}
              aria-label={isZh ? "原生英文回复草稿" : "Reply draft"}
              className="text-sm leading-relaxed bg-card"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <div className="flex items-center gap-1.5">
              {selectedLead.status === "dismissed" ? (
                <Button variant="outline" size="sm" disabled={updating} onClick={() => void handleRestoreLead()}>
                  <IconRotateClockwise className="size-3.5" />
                  {isZh ? "恢复至待跟进" : "Restore"}
                </Button>
              ) : (
                <Button variant="ghost" size="sm" disabled={updating} onClick={() => void handleDismissLead()}>
                  {isZh ? "归档忽略" : "Archive"}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => void handleCopyOnly()}>
                <IconCopy className="size-3.5" />
                {isZh ? "仅复制" : "Copy"}
              </Button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {selectedLead.status !== "won" && selectedLead.status !== "dismissed" && (
                <Button variant="outline" size="sm" disabled={updating} onClick={() => void handleMarkWon()}>
                  <IconTrophy className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  {isZh ? "标为已转化" : "Mark Won"}
                </Button>
              )}
              <Button size="sm" disabled={updating} onClick={() => void handleCopyAndMarkReplied()}>
                <IconCheck className="size-3.5" />
                {isZh ? "复制并标已回复" : "Copy & Mark Replied"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-1 flex-col lg:h-[calc(100vh-3.5rem)] lg:overflow-hidden">
      <div className="hidden lg:flex flex-1 min-h-0">
        <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
          <ResizablePanel defaultSize="50%" minSize="34%">
            {listPane}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="50%" minSize="34%">
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
