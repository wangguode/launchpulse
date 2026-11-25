"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  Radar,
  RefreshCw,
  Send,
  Shield,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";

export interface RadarMonitorConfig {
  keywords?: string[];
  competitors?: string[];
  excludeWords?: string[];
  sources?: string[];
  webhook_url?: string;
  daily_digest_enabled?: number;
  last_scanned_at?: string;
}

export interface RadarLeadRow {
  id: number;
  source: string;
  community: string;
  author: string;
  title: string;
  excerpt: string;
  url: string;
  intent_type: "alternative" | "pain" | "buying";
  intent_score: number;
  status: "new" | "drafted" | "replied" | "won" | "dismissed";
  draft_reply?: string;
  posted_at: string;
}

interface BuyerRadarProPanelProps {
  campaignId: number;
  productName: string;
  tagline: string;
  communityShortlink: string;
  monitor: RadarMonitorConfig | null;
  leads: RadarLeadRow[];
  locale: "en" | "zh" | "ja";
  isSample?: boolean;
  onRefresh: () => Promise<void> | void;
}

type ReplyTone = "peer" | "founder" | "compare";

/**
 * 零延迟 3 风格原生防封号回复生成器（内置「零链接安全养号模式」开关）
 */
function buildNativeReply(
  lead: RadarLeadRow,
  productName: string,
  tagline: string,
  shortlink: string,
  tone: ReplyTone,
  zeroLinkMode: boolean
): string {
  const linkLine = zeroLinkMode
    ? ""
    : `\n\nHappy to share what we built around this if useful: ${shortlink}`;

  if (tone === "peer") {
    return `We ran into this exact headache on "${lead.title.slice(0, 72)}" earlier this year.\n\nTwo things that actually moved the needle for us:\n1. Separate the detection/validation step from the main pipeline so failures surface deterministically instead of silently.\n2. Keep a tiny external check running every few hours with zero manual upkeep.\n\nIf you're still comparing options, happy to share our exact checklist or benchmark notes.${linkLine}`;
  }

  if (tone === "founder") {
    return `Super relatable thread—this exact pain point is actually why I ended up building ${productName} (${tagline || "a focused tool for teams dealing with this workflow"}).\n\nEven if you roll your own script, make sure you handle edge-case alerting and automatic verification rather than relying on manual checks.${
      zeroLinkMode
        ? " Happy to DM details or compare notes if helpful—no pitch."
        : `\n\nIf you want to test a ready-made setup (free tier included), here's the link: ${shortlink}`
    }`;
  }

  return `Quick objective breakdown from testing a few tools in this space:\n- Heavy enterprise suites work well for 50+ seat orgs, but pricing and setup overhead are usually overkill for small teams.\n- DIY scripts are free upfront, though maintenance silently breaks right when you need them.\n- Lightweight dedicated tools like ${productName} focus purely on "${tagline || "solving this one bottleneck cleanly"}" without bloat.${linkLine}`;
}

/**
 * V4 24/7 买家意图雷达 Pro（承接 GummySearch 退场空窗，对标 Octolens + Syften + ReplyGuy）
 */
export default function BuyerRadarProPanel({
  campaignId,
  productName,
  tagline,
  communityShortlink,
  monitor,
  leads,
  locale,
  isSample = false,
  onRefresh,
}: BuyerRadarProPanelProps) {
  const isZh = locale === "zh";

  const [keywordsInput, setKeywordsInput] = useState("");
  const [competitorsInput, setCompetitorsInput] = useState("");
  const [excludeInput, setExcludeInput] = useState("hiring, freelancer, what are you working on");
  const [sources, setSources] = useState<string[]>(["hn", "github", "devto"]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [showRules, setShowRules] = useState(false);

  const [savingRules, setSavingRules] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [testingHook, setTestingHook] = useState(false);
  const [banner, setBanner] = useState("");

  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "replied" | "won">("all");
  const [intentFilter, setIntentFilter] = useState<"all" | "alternative" | "buying" | "pain">("all");

  // 右侧滑出原生回复工作台状态
  const [activeLead, setActiveLead] = useState<RadarLeadRow | null>(null);
  const [tone, setTone] = useState<ReplyTone>("peer");
  const [zeroLinkMode, setZeroLinkMode] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [copiedReply, setCopiedReply] = useState(false);
  const [updatingLeadId, setUpdatingLeadId] = useState<number | null>(null);

  useEffect(() => {
    setKeywordsInput((monitor?.keywords || []).join(", "));
    setCompetitorsInput((monitor?.competitors || []).join(", "));
    setExcludeInput(
      (monitor?.excludeWords && monitor.excludeWords.length > 0
        ? monitor.excludeWords
        : ["hiring", "freelancer", "what are you working on"]
      ).join(", ")
    );
    setSources(monitor?.sources && monitor.sources.length > 0 ? monitor.sources : ["hn", "github", "devto"]);
    setWebhookUrl(monitor?.webhook_url || "");
  }, [monitor, campaignId]);

  const openInspector = (lead: RadarLeadRow) => {
    setActiveLead(lead);
    setTone("peer");
    setReplyText(
      lead.draft_reply ||
        buildNativeReply(lead, productName, tagline, communityShortlink, "peer", zeroLinkMode)
    );
  };

  const regenerateReply = (nextTone: ReplyTone, nextZeroLink: boolean) => {
    setTone(nextTone);
    setZeroLinkMode(nextZeroLink);
    if (!activeLead) return;
    setReplyText(buildNativeReply(activeLead, productName, tagline, communityShortlink, nextTone, nextZeroLink));
  };

  const toggleSource = (src: string) => {
    setSources((prev) => (prev.includes(src) ? prev.filter((x) => x !== src) : [...prev, src]));
  };

  const handleSaveRules = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSample) {
      setBanner(isZh ? "示例预览模式：注册登录账号后即可保存自定义监听规则并触发实时全网抓帖。" : "Sample mode: sign in to save custom rules & run live scans.");
      return;
    }
    if (!campaignId) return;
    setSavingRules(true);
    setBanner("");
    try {
      const res = await fetch("/api/dashboard/radar/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          keywords: keywordsInput.split(",").map((s) => s.trim()).filter(Boolean),
          competitors: competitorsInput.split(",").map((s) => s.trim()).filter(Boolean),
          excludeWords: excludeInput.split(",").map((s) => s.trim()).filter(Boolean),
          sources: sources.length ? sources : ["hn", "github"],
          webhookUrl: webhookUrl.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) setBanner(data.error || "Save failed");
      else {
        setBanner(isZh ? "✓ 监听规则与 Webhook 已保存，随时可点击「立即多源扫帖」。" : "✓ Monitor rules saved. Click Live Scan to pull fresh threads.");
        await onRefresh();
      }
    } finally {
      setSavingRules(false);
    }
  };

  const handleRunScan = async () => {
    if (isSample) {
      setBanner(isZh ? "示例预览模式：注册后可针对你的真实关键词实时抓取 HN / GitHub / DEV.to / Lobste.rs 讨论。" : "Sample mode: sign in to run live scans for your SaaS.");
      return;
    }
    if (!campaignId) return;
    setScanning(true);
    setBanner("");
    try {
      const res = await fetch("/api/dashboard/radar/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const data = (await res.json()) as { ok?: boolean; scanned?: number; inserted?: number; error?: string };
      if (!res.ok) setBanner(data.error || "Scan failed");
      else {
        setBanner(
          isZh
            ? `✓ 实时多源扫描完成：发现 ${data.scanned || 0} 条高意图原帖，已去重入库 ${data.inserted || 0} 条。`
            : `✓ Live scan finished: matched ${data.scanned || 0} high-intent threads (${data.inserted || 0} synced).`
        );
        await onRefresh();
      }
    } finally {
      setScanning(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) return;
    if (isSample) {
      setBanner(isZh ? "示例模式无法外发 Webhook，请登录真实账号测试。" : "Sign in to test live webhooks.");
      return;
    }
    setTestingHook(true);
    setBanner("");
    try {
      const res = await fetch("/api/dashboard/radar/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim(), productName }),
      });
      const data = (await res.json()) as { ok?: boolean; status?: number; error?: string };
      setBanner(
        data.ok
          ? isZh
            ? "✓ 测试消息已发送至你的 Slack / Discord 频道！"
            : "✓ Test alert delivered to your Slack/Discord channel!"
          : data.error || `Webhook returned HTTP ${data.status || 400}`
      );
    } finally {
      setTestingHook(false);
    }
  };

  const updateLeadStatus = async (
    lead: RadarLeadRow,
    nextStatus: "new" | "drafted" | "replied" | "won" | "dismissed",
    draftText?: string
  ) => {
    if (isSample) {
      setBanner(isZh ? "示例预览模式：登录后可持久化保存跟进状态。" : "Sign in to persist CRM lead status.");
      return;
    }
    setUpdatingLeadId(lead.id);
    try {
      const res = await fetch("/api/dashboard/radar/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, status: nextStatus, draftReply: draftText ?? lead.draft_reply }),
      });
      if (res.ok) {
        if (activeLead?.id === lead.id) {
          setActiveLead({ ...lead, status: nextStatus, draft_reply: draftText ?? lead.draft_reply });
        }
        await onRefresh();
      }
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const handleCopyAndMarkReplied = async () => {
    if (!activeLead) return;
    try {
      await navigator.clipboard.writeText(replyText);
      setCopiedReply(true);
      setTimeout(() => setCopiedReply(false), 1800);
    } catch {
      // ignore
    }
    await updateLeadStatus(activeLead, "replied", replyText);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (l.status === "dismissed" && statusFilter !== "all") return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (intentFilter !== "all" && l.intent_type !== intentFilter) return false;
      return true;
    });
  }, [leads, statusFilter, intentFilter]);

  const intentLabel = (t: RadarLeadRow["intent_type"]) => {
    if (t === "alternative") return isZh ? "求竞品替代" : "Alternative";
    if (t === "buying") return isZh ? "直接求推荐" : "Buying Intent";
    return isZh ? "痛点吐槽" : "Pain Signal";
  };

  const crmLabel = (s: RadarLeadRow["status"]) => {
    if (s === "won") return isZh ? "已转化成交" : "Won";
    if (s === "replied") return isZh ? "已回复" : "Replied";
    if (s === "drafted") return isZh ? "已拟稿" : "Drafted";
    if (s === "dismissed") return isZh ? "已忽略" : "Dismissed";
    return isZh ? "待跟进" : "New";
  };

  return (
    <div className="space-y-5">
      {/* 顶栏操作条 */}
      <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Radar className="w-4 h-4 text-[var(--apple-blue)]" />
            <h2 className="text-[16px] font-semibold text-[var(--apple-ink)]">
              {isZh ? "24/7 买家意图雷达 Pro" : "24/7 Buyer Intent Radar Pro"}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-[var(--apple-blue-soft)] text-[var(--apple-blue)] text-[11px] font-medium">
              HN · GitHub · DEV.to · Lobste.rs
            </span>
          </div>
          <p className="text-[12px] text-[var(--apple-ink-secondary)]">
            {isZh
              ? "自定义痛点词、竞品替代词与排除词，全网捕获正在寻购同类 SaaS 的高意图原帖，并一键生成防封号原生回复。"
              : "Monitor keywords & competitor alternatives across developer communities with CRM tracking and non-spam reply drafting."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button type="button" variant="secondary" size="sm" onClick={() => setShowRules((v) => !v)}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {showRules ? (isZh ? "收起监听规则" : "Hide Rules") : isZh ? "监听规则 & Webhook" : "Rules & Webhook"}
          </Button>
          <Button type="button" variant="primary" size="sm" loading={scanning} onClick={handleRunScan}>
            <RefreshCw className="w-3.5 h-3.5" />
            {isZh ? "立即多源扫帖" : "Run Live Scan"}
          </Button>
        </div>
      </div>

      {banner && (
        <div className="rounded-[12px] bg-[var(--apple-blue-soft)] text-[var(--apple-blue)] px-4 py-2.5 text-[12px] font-medium">
          {banner}
        </div>
      )}

      {/* 可折叠：自定义布尔规则 & Slack/Discord Webhook 面板 */}
      {showRules && (
        <form
          onSubmit={handleSaveRules}
          className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 sm:p-6 space-y-4"
        >
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                {isZh ? "痛点与品类关键词（逗号分隔）" : "Pain & Topic Keywords"}
              </label>
              <input
                type="text"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="ssl expired, domain expiry, cert monitor"
                className="w-full h-10 px-3.5 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[14px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                {isZh ? "竞品拦截词（自动匹配 alternative）" : "Competitor Intercept Terms"}
              </label>
              <input
                type="text"
                value={competitorsInput}
                onChange={(e) => setCompetitorsInput(e.target.value)}
                placeholder="UptimeRobot, Better Stack, Pingdom"
                className="w-full h-10 px-3.5 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[14px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                {isZh ? "噪音排除词（NOT 过滤）" : "Negative Exclude Words"}
              </label>
              <input
                type="text"
                value={excludeInput}
                onChange={(e) => setExcludeInput(e.target.value)}
                placeholder="hiring, job, intern, what are you working on"
                className="w-full h-10 px-3.5 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[14px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                {isZh ? "启用数据源" : "Active Sources"}
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "hn", label: "Hacker News" },
                  { id: "github", label: "GitHub Issues" },
                  { id: "devto", label: "DEV.to" },
                  { id: "lobsters", label: "Lobste.rs" },
                ].map((s) => {
                  const on = sources.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSource(s.id)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition cursor-pointer ${
                        on
                          ? "border-[var(--apple-blue)] bg-[var(--apple-blue-soft)] text-[var(--apple-blue)]"
                          : "border-[var(--apple-border)] bg-[var(--apple-bg)] text-[var(--apple-ink-secondary)]"
                      }`}
                    >
                      {on ? "✓ " : ""}
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-5 space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)] flex items-center gap-1">
                <Bell className="w-3.5 h-3.5" />
                {isZh ? "Slack / Discord Webhook 实时推送 URL（可选）" : "Slack / Discord Webhook URL (Optional)"}
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/... or https://discord.com/api/webhooks/..."
                className="w-full h-10 px-3.5 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[13px] font-mono text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-2 justify-end">
              {webhookUrl.trim() && (
                <Button type="button" variant="secondary" size="sm" loading={testingHook} onClick={handleTestWebhook}>
                  <Send className="w-3.5 h-3.5" />
                  {isZh ? "测通" : "Ping"}
                </Button>
              )}
              <Button type="submit" variant="primary" size="sm" loading={savingRules}>
                {isZh ? "保存规则" : "Save"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* 线索收件箱 + 筛选栏 */}
      <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--apple-border)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-[9px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-0.5 text-[12px]">
              {(["all", "new", "replied", "won"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-[7px] font-medium transition cursor-pointer ${
                    statusFilter === st
                      ? "bg-[var(--apple-surface)] text-[var(--apple-ink)] shadow-xs"
                      : "text-[var(--apple-ink-secondary)]"
                  }`}
                >
                  {st === "all"
                    ? `${isZh ? "全部" : "All"} (${leads.length})`
                    : st === "new"
                      ? isZh
                        ? "待跟进"
                        : "New"
                      : st === "replied"
                        ? isZh
                          ? "已回复"
                          : "Replied"
                        : isZh
                          ? "已转化"
                          : "Won"}
                </button>
              ))}
            </div>

            <select
              value={intentFilter}
              onChange={(e) => setIntentFilter(e.target.value as "all" | "alternative" | "buying" | "pain")}
              className="h-8 px-2.5 rounded-[8px] border border-[var(--apple-border)] bg-[var(--apple-bg)] text-[12px] text-[var(--apple-ink)] outline-none"
            >
              <option value="all">{isZh ? "全部意图类型" : "All Intent Types"}</option>
              <option value="alternative">{isZh ? "求竞品替代" : "Alternative Seeking"}</option>
              <option value="buying">{isZh ? "直接求推荐" : "Buying Ready"}</option>
              <option value="pain">{isZh ? "痛点吐槽" : "Pain Complaint"}</option>
            </select>
          </div>

          <span className="text-[11px] text-[var(--apple-ink-tertiary)] tabular-nums">
            {monitor?.last_scanned_at
              ? `${isZh ? "最近扫描" : "Last scan"}: ${monitor.last_scanned_at.slice(0, 16)}`
              : isZh
                ? "点击「立即多源扫帖」拉取最新原帖"
                : "Click Live Scan to fetch fresh discussions"}
          </span>
        </div>

        <div className="divide-y divide-[var(--apple-border)]">
          {filteredLeads.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-[14px] font-medium text-[var(--apple-ink)]">
                {isZh ? "当前筛选条件下暂无线索" : "No buyer threads match this filter yet"}
              </p>
              <p className="text-[12px] text-[var(--apple-ink-secondary)]">
                {isZh
                  ? "点击上方「监听规则」填入 2–3 个英文痛点关键词或竞品名，再点击「立即多源扫帖」即可实时拉取。"
                  : "Add 2–3 keywords or competitor names in Rules, then click Run Live Scan."}
              </p>
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <div key={lead.id} className="p-5 hover:bg-[var(--apple-bg)] transition space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    <span className="px-2 py-0.5 rounded-full bg-[var(--apple-surface-subtle)] font-semibold text-[var(--apple-ink)]">
                      {lead.source}
                    </span>
                    <span className="text-[var(--apple-ink-tertiary)]">{lead.community}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[var(--apple-blue-soft)] text-[var(--apple-blue)] font-medium">
                      {intentLabel(lead.intent_type)} · {lead.intent_score}%
                    </span>
                    <span className="text-[var(--apple-ink-tertiary)] tabular-nums">{lead.posted_at}</span>
                  </div>

                  <StatusBadge
                    tone={
                      lead.status === "won"
                        ? "green"
                        : lead.status === "replied"
                          ? "blue"
                          : lead.status === "drafted"
                            ? "orange"
                            : "neutral"
                    }
                    label={crmLabel(lead.status)}
                  />
                </div>

                <h4 className="text-[15px] font-semibold text-[var(--apple-ink)] leading-snug">{lead.title}</h4>
                <p className="text-[13px] text-[var(--apple-ink-secondary)] leading-relaxed">{lead.excerpt}</p>

                <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-[12px]">
                    <span className="text-[var(--apple-ink-tertiary)]">{lead.author}</span>
                    <a
                      href={lead.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-[var(--apple-blue)] hover:underline"
                    >
                      {isZh ? "直达原帖" : "Open Thread"} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button type="button" variant="primary" size="sm" onClick={() => openInspector(lead)}>
                      <MessageSquare className="w-3.5 h-3.5" />
                      {isZh ? "生成防封号回复" : "Draft Native Reply"}
                    </Button>
                    {lead.status !== "won" && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={updatingLeadId === lead.id}
                        onClick={() => updateLeadStatus(lead, "won")}
                      >
                        {isZh ? "标记成交" : "Mark Won"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Apple Inspector 右侧滑出原生回复草稿抽屉 */}
      {activeLead && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg h-full bg-[var(--apple-surface)] border-l border-[var(--apple-border)] p-6 flex flex-col justify-between overflow-y-auto shadow-2xl">
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--apple-blue)]">
                    <Sparkles className="w-3.5 h-3.5" />
                    {isZh ? "防封号原生回复工作台" : "Anti-Spam Native Reply Studio"}
                  </div>
                  <h3 className="text-[16px] font-semibold text-[var(--apple-ink)] leading-snug">
                    {activeLead.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveLead(null)}
                  className="p-1.5 rounded-full hover:bg-[var(--apple-surface-subtle)] text-[var(--apple-ink-secondary)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-[12px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-3.5 text-[12px] text-[var(--apple-ink-secondary)] leading-relaxed">
                <p className="font-medium text-[var(--apple-ink)] mb-1">
                  {activeLead.source} · {activeLead.author}
                </p>
                {activeLead.excerpt}
              </div>

              {/* 语气切换 + 零链接安全养号开关 */}
              <div className="space-y-2.5">
                <span className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                  {isZh ? "选择回复切入视角" : "Select Reply Angle"}
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "peer", label: isZh ? "同行纯干货" : "Peer Engineer" },
                      { id: "founder", label: isZh ? "创始人坦诚分享" : "Founder Story" },
                      { id: "compare", label: isZh ? "客观方案对比" : "Objective Compare" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => regenerateReply(opt.id, zeroLinkMode)}
                      className={`py-2 px-2.5 rounded-[10px] border text-[12px] font-medium transition cursor-pointer ${
                        tone === opt.id
                          ? "border-[var(--apple-blue)] bg-[var(--apple-blue-soft)] text-[var(--apple-blue)]"
                          : "border-[var(--apple-border)] bg-[var(--apple-bg)] text-[var(--apple-ink-secondary)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <label className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--apple-border)] bg-[var(--apple-bg)] px-3.5 py-2.5 cursor-pointer">
                  <div className="flex items-center gap-2 text-[12px]">
                    <Shield className="w-4 h-4 text-[var(--apple-green)] shrink-0" />
                    <div>
                      <p className="font-medium text-[var(--apple-ink)]">
                        {isZh ? "零链接安全养号模式（Reddit / 新号推荐）" : "Zero-Link Safe Mode (Recommended for new accounts)"}
                      </p>
                      <p className="text-[11px] text-[var(--apple-ink-tertiary)]">
                        {isZh ? "关闭后将自动附带你的社区专属归因短链" : "Uncheck to attach your attribution shortlink"}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={zeroLinkMode}
                    onChange={(e) => regenerateReply(tone, e.target.checked)}
                    className="w-4 h-4 accent-[var(--apple-blue)]"
                  />
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                  {isZh ? "可编辑回复草稿" : "Editable Draft Reply"}
                </label>
                <textarea
                  rows={8}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full p-3.5 rounded-[12px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[13px] text-[var(--apple-ink)] leading-relaxed outline-none focus:border-[var(--apple-blue)]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--apple-border)] flex items-center justify-between gap-2 mt-5">
              <a
                href={activeLead.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--apple-blue)] hover:underline"
              >
                {isZh ? "打开原帖去粘贴" : "Open Thread"} <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => updateLeadStatus(activeLead, "drafted", replyText)}>
                  {isZh ? "仅保存草稿" : "Save Draft"}
                </Button>
                <Button type="button" variant="primary" size="sm" onClick={handleCopyAndMarkReplied}>
                  {copiedReply ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedReply ? (isZh ? "已复制并标为已回复" : "Copied & Marked Replied") : isZh ? "复制并标记已回复" : "Copy & Mark Replied"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
