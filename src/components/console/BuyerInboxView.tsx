"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ExternalLink, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  buildContextualReply,
  formatIntentBadge,
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
  initialLeadId?: number | null;
  isZh: boolean;
  isSample: boolean;
  onRefresh: () => Promise<void> | void;
  onLocalLeadStatus?: (leadId: number, status: RadarLeadRecord["status"]) => void;
}

type InboxFilter = "all" | "pending" | "replied" | "won";

/**
 * 视图 ③：买家收件箱（Linear 风格 55/45 常驻分栏 Master-Detail，严格对齐效果图 3）
 * - 左侧 55%：高意向求购帖列表（全部 / 待跟进 / 已回复 / 已转化 精确对账）
 * - 右侧 45%：常驻「原生回复精编器」（3 语调切换 + 零链接养号开关 + 无截断语境草稿 + J/K/C/E 快捷键）
 */
export default function BuyerInboxView({
  campaignId,
  productName,
  tagline,
  communityShortlink,
  monitor,
  leads,
  initialLeadId,
  isZh,
  isSample,
  onRefresh,
  onLocalLeadStatus,
}: BuyerInboxViewProps) {
  const [filter, setFilter] = useState<InboxFilter>("pending");
  const [selectedId, setSelectedId] = useState<number | null>(initialLeadId ?? null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // 原生回复精编状态
  const [tone, setTone] = useState<ReplyTone>("peer");
  const [zeroLinkMode, setZeroLinkMode] = useState(true);
  const [draft, setDraft] = useState("");
  const [actionToast, setActionToast] = useState("");
  const [updating, setUpdating] = useState(false);

  // 扫帖与规则配置弹窗
  const [scanning, setScanning] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [keywordsInput, setKeywordsInput] = useState((monitor?.keywords || []).join(", "));
  const [competitorsInput, setCompetitorsInput] = useState((monitor?.competitors || []).join(", "));
  const [excludeInput, setExcludeInput] = useState(
    (monitor?.excludeWords || ["hiring", "freelancer", "what are you working on"]).join(", ")
  );
  const [sources, setSources] = useState<string[]>(monitor?.sources || ["hn", "github", "devto", "lobsters"]);
  const [savingRules, setSavingRules] = useState(false);

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

  const selectedLead = useMemo(() => {
    if (visibleLeads.length === 0) return null;
    return visibleLeads.find((l) => l.id === selectedId) || visibleLeads[0];
  }, [visibleLeads, selectedId]);

  useEffect(() => {
    if (initialLeadId) {
      setSelectedId(initialLeadId);
    }
  }, [initialLeadId]);

  // 切换选中线索、语调或零链接模式时，同步刷新无截断自然草稿
  useEffect(() => {
    if (!selectedLead) {
      setDraft("");
      return;
    }
    setDraft(
      buildContextualReply(selectedLead, productName, tagline, communityShortlink, tone, zeroLinkMode)
    );
  }, [selectedLead, productName, tagline, communityShortlink, tone, zeroLinkMode]);

  const flashToast = useCallback((msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(""), 2800);
  }, []);

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
            body: JSON.stringify({
              leadId: lead.id,
              status: nextStatus,
              draftReply: replyPayload ?? draft,
            }),
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
    if (!selectedLead) return;
    try {
      await navigator.clipboard.writeText(draft);
    } catch {
      // ignore clipboard permission issues in headless environments
    }
    const idx = visibleLeads.findIndex((l) => l.id === selectedLead.id);
    const nextLead = visibleLeads[idx + 1] || visibleLeads[idx - 1] || null;
    await updateLeadStatus(selectedLead, "replied", draft);
    if (nextLead) setSelectedId(nextLead.id);
    flashToast(isZh ? "已复制回复草稿，并将该帖标记为已回复" : "Draft copied and thread marked replied");
  }, [draft, flashToast, isZh, selectedLead, updateLeadStatus, visibleLeads]);

  const handleDismissLead = useCallback(async () => {
    if (!selectedLead) return;
    const idx = visibleLeads.findIndex((l) => l.id === selectedLead.id);
    const nextLead = visibleLeads[idx + 1] || visibleLeads[idx - 1] || null;
    await updateLeadStatus(selectedLead, "dismissed");
    if (nextLead) setSelectedId(nextLead.id);
    flashToast(isZh ? "已忽略该线索" : "Thread archived");
  }, [flashToast, isZh, selectedLead, updateLeadStatus, visibleLeads]);

  const handleRunScan = async () => {
    if (isSample) {
      flashToast(isZh ? "体验模式已展示最新样例；登录后可按你的关键词实时扫帖" : "Sign in to run live scans on your keywords");
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
        flashToast(
          isZh
            ? `扫帖完成，新增 ${json.inserted || 0} 条高意向求购线索`
            : `Scan complete: ${json.inserted || 0} fresh buyer threads found`
        );
        await onRefresh();
      } else {
        flashToast(json.error || (isZh ? "扫描失败，请稍后重试" : "Scan failed"));
      }
    } finally {
      setScanning(false);
    }
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSample) {
      setShowRules(false);
      flashToast(isZh ? "体验模式规则已预览；登录后持久化生效" : "Sign in to persist custom monitor rules");
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
          sources: sources.length ? sources : ["hn", "github", "devto"],
        }),
      });
      if (res.ok) {
        setShowRules(false);
        flashToast(isZh ? "监听规则已保存" : "Monitor rules saved");
        await onRefresh();
      }
    } finally {
      setSavingRules(false);
    }
  };

  // 键盘微工效：J / K 切换线索，1 / 2 / 3 切语调，C 复制并标已回复，E 忽略，O 打开原帖
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
        const next = visibleLeads[(curIdx + 1) % visibleLeads.length];
        if (next) setSelectedId(next.id);
      } else if (k === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = visibleLeads[(curIdx - 1 + visibleLeads.length) % visibleLeads.length];
        if (prev) setSelectedId(prev.id);
      } else if (k === "1") {
        setTone("peer");
      } else if (k === "2") {
        setTone("founder");
      } else if (k === "3") {
        setTone("compare");
      } else if (k === "c") {
        e.preventDefault();
        void handleCopyAndMarkReplied();
      } else if (k === "e") {
        e.preventDefault();
        void handleDismissLead();
      } else if (k === "o" && selectedLead?.url) {
        window.open(selectedLead.url, "_blank", "noopener,noreferrer");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visibleLeads, selectedLead, showRules, handleCopyAndMarkReplied, handleDismissLead]);

  const tabs: Array<{ key: InboxFilter; label: string; count: number }> = [
    { key: "all", label: isZh ? "全部" : "All", count: counts.all },
    { key: "pending", label: isZh ? "待跟进" : "Pending", count: counts.pending },
    { key: "replied", label: isZh ? "已回复" : "Replied", count: counts.replied },
    { key: "won", label: isZh ? "已转化" : "Won", count: counts.won },
  ];

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,1fr)] divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-hairline)] min-h-[580px]">
      {/* ==================== 左栏（55%）：高意向求购线索流 ==================== */}
      <section className={`flex flex-col min-w-0 ${mobileDetailOpen ? "hidden lg:flex" : "flex"}`}>
        {/* 顶部工具栏 */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3">
          <h1 className="lp-display text-[19px] font-semibold text-[var(--ink-primary)] tracking-tight">
            {isZh ? "买家收件箱" : "Buyer Inbox"}
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="xs" onClick={() => setShowRules((v) => !v)}>
              <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.7} />
              <span className="hidden sm:inline">{isZh ? "监听词" : "Rules"}</span>
            </Button>
            <Button variant="secondary" size="xs" loading={scanning} onClick={handleRunScan}>
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.7} />
              {isZh ? "立即扫帖" : "Scan Now"}
            </Button>
          </div>
        </div>

        {/* 可折叠监听规则条 */}
        {showRules && (
          <form
            onSubmit={handleSaveRules}
            className="mx-5 mb-3 p-3.5 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-2.5 text-[12.5px]"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--ink-primary)]">
                {isZh ? "全网监听关键词与排除词" : "Monitor Keywords & Exclusions"}
              </span>
              <button
                type="button"
                onClick={() => setShowRules(false)}
                className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-2.5">
              <label className="space-y-1">
                <span className="text-[11.5px] text-[var(--ink-muted)]">
                  {isZh ? "求购痛点词（逗号分隔）" : "Pain keywords"}
                </span>
                <input
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-[6px] border border-[var(--border-strong)] bg-[var(--bg-sheet)] text-[var(--ink-primary)] outline-none"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11.5px] text-[var(--ink-muted)]">
                  {isZh ? "竞品替代词（逗号分隔）" : "Competitors"}
                </span>
                <input
                  value={competitorsInput}
                  onChange={(e) => setCompetitorsInput(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-[6px] border border-[var(--border-strong)] bg-[var(--bg-sheet)] text-[var(--ink-primary)] outline-none"
                />
              </label>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {["hn", "github", "devto", "lobsters"].map((src) => {
                  const on = sources.includes(src);
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() =>
                        setSources((prev) => (prev.includes(src) ? prev.filter((x) => x !== src) : [...prev, src]))
                      }
                      className={`px-2 py-0.5 rounded-[5px] text-[11px] border lp-ease cursor-pointer ${
                        on
                          ? "border-[var(--accent-primary)] bg-[var(--bg-active-tint)] text-[var(--ink-primary)] font-medium"
                          : "border-[var(--border-hairline)] text-[var(--ink-muted)]"
                      }`}
                    >
                      {src === "hn" ? "Hacker News" : src === "github" ? "GitHub" : src === "devto" ? "DEV.to" : "Lobste.rs"}
                    </button>
                  );
                })}
              </div>
              <Button type="submit" variant="primary" size="xs" loading={savingRules}>
                {isZh ? "保存规则" : "Save"}
              </Button>
            </div>
          </form>
        )}

        {/* 底部下划线状态筛选 Tabs（严格对账） */}
        <div className="px-5 border-b border-[var(--border-hairline)] flex items-center gap-5 text-[13px] tabular-nums">
          {tabs.map((t) => {
            const active = filter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                className={`pb-2.5 -mb-px border-b-2 lp-ease cursor-pointer inline-flex items-center gap-1.5 ${
                  active
                    ? "border-[var(--ink-primary)] text-[var(--ink-primary)] font-semibold"
                    : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)] font-medium"
                }`}
              >
                <span>{t.label}</span>
                <span className="font-mono text-[12px] opacity-80">{t.count}</span>
              </button>
            );
          })}
        </div>

        {/* 线索列表 */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-hairline)]">
          {visibleLeads.length === 0 ? (
            <div className="px-6 py-16 text-center space-y-2">
              <p className="text-[13.5px] font-medium text-[var(--ink-primary)]">
                {isZh ? "当前筛选下暂无求购线索" : "No buyer threads in this view"}
              </p>
              <p className="text-[12.5px] text-[var(--ink-muted)]">
                {isZh ? "点击右上角「立即扫帖」抓取最新海外社区讨论。" : "Click Scan Now to pull fresh discussions."}
              </p>
            </div>
          ) : (
            visibleLeads.map((lead) => {
              const selected = selectedLead?.id === lead.id;
              const badgeColor =
                lead.intent_type === "buying"
                  ? "text-[var(--accent-primary)] bg-[var(--accent-soft)]"
                  : lead.intent_type === "alternative"
                    ? "text-[var(--status-live)] bg-[var(--status-live-soft)]"
                    : "text-[var(--status-warn)] bg-[var(--status-warn-soft)]";

              return (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(lead.id);
                    setMobileDetailOpen(true);
                  }}
                  style={selected ? { boxShadow: "inset 1px 0 0 var(--accent-primary)" } : undefined}
                  className={`w-full text-left px-5 py-3.5 lp-ease cursor-pointer space-y-1.5 ${
                    selected ? "bg-[var(--bg-active-tint)]" : "hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-1.5 py-0.5 rounded-[5px] text-[11px] font-medium tabular-nums shrink-0 ${badgeColor}`}>
                        {formatIntentBadge(lead.intent_type, lead.intent_score, isZh)}
                      </span>
                      <span className="text-[var(--ink-secondary)] font-medium truncate">{lead.source}</span>
                    </div>
                    <span className="text-[var(--ink-muted)] text-[11.5px] shrink-0 tabular-nums">
                      {isZh ? lead.relative_time_zh || lead.posted_at : lead.relative_time_en || lead.posted_at}
                    </span>
                  </div>
                  <p className="text-[13.5px] font-medium text-[var(--ink-primary)] leading-snug line-clamp-2">
                    {lead.title}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* ==================== 右栏（45%）：常驻原生回复精编器 ==================== */}
      <aside className={`flex flex-col min-w-0 ${mobileDetailOpen ? "flex" : "hidden lg:flex"}`}>
        {/* 顶栏 */}
        <div className="px-5 h-[52px] border-b border-[var(--border-hairline)] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDetailOpen(false)}
              className="lg:hidden p-1 -ml-1 rounded text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer"
              aria-label="返回线索列表"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-[14px] font-semibold text-[var(--ink-primary)] truncate">
              {isZh ? "原生回复精编器" : "Native Reply Studio"}
            </h2>
          </div>

          {selectedLead?.url && (
            <a
              href={selectedLead.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--accent-primary)] hover:underline shrink-0"
            >
              <span>{isZh ? "打开原帖" : "Open Thread"}</span>
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
            </a>
          )}
        </div>

        {!selectedLead ? (
          <div className="flex-1 flex items-center justify-center p-8 text-[13px] text-[var(--ink-muted)]">
            {isZh ? "从左侧选择一条求购帖开始拟稿" : "Select a buyer thread on the left to draft a reply"}
          </div>
        ) : (
          <div className="flex-1 p-5 flex flex-col justify-between gap-4 overflow-y-auto">
            <div className="space-y-4">
              {/* 原帖摘要引用块 */}
              <div className="rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 space-y-1.5">
                <p className="text-[13.5px] font-medium text-[var(--ink-primary)] leading-snug">
                  {selectedLead.title}
                </p>
                <p className="text-[12px] text-[var(--ink-muted)]">
                  {selectedLead.source} ·{" "}
                  {isZh
                    ? selectedLead.relative_time_zh || selectedLead.posted_at
                    : selectedLead.relative_time_en || selectedLead.posted_at}{" "}
                  · {formatIntentBadge(selectedLead.intent_type, selectedLead.intent_score, isZh)}
                </p>
                {selectedLead.excerpt && (
                  <p className="text-[12.5px] text-[var(--ink-secondary)] leading-relaxed pt-1 border-t border-[var(--border-hairline)]">
                    {selectedLead.excerpt}
                  </p>
                )}
              </div>

              {/* 3 档自然语调分段切换 */}
              <div className="grid grid-cols-3 rounded-[7px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-0.5 text-[12px]">
                {(
                  [
                    { key: "peer", zh: "同行纯干货", en: "Peer Help" },
                    { key: "founder", zh: "创始人分享", en: "Founder Note" },
                    { key: "compare", zh: "客观对比", en: "Objective" },
                  ] as const
                ).map((item) => {
                  const active = tone === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setTone(item.key)}
                      className={`py-1.5 rounded-[5px] lp-ease cursor-pointer ${
                        active
                          ? "bg-[var(--bg-sheet)] text-[var(--ink-primary)] font-semibold border border-[var(--border-hairline)]"
                          : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)] font-medium"
                      }`}
                    >
                      {isZh ? item.zh : item.en}
                    </button>
                  );
                })}
              </div>

              {/* 零链接安全养号模式开关 */}
              <div className="flex items-center justify-between gap-3 py-1">
                <div>
                  <p className="text-[13px] font-medium text-[var(--ink-primary)]">
                    {isZh ? "零链接安全养号模式" : "Zero-Link Safe Mode"}
                  </p>
                  <p className="text-[11.5px] text-[var(--ink-muted)]">
                    {isZh
                      ? "剔除外部短链，避免 Reddit / HN 新号被系统误判广告"
                      : "Strips external URLs to keep new Reddit / HN accounts ban-free"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={zeroLinkMode}
                  aria-label={isZh ? "切换零链接安全养号模式" : "Toggle zero-link safe mode"}
                  onClick={() => setZeroLinkMode((v) => !v)}
                  className={`relative w-9 h-5 rounded-full lp-ease shrink-0 cursor-pointer ${
                    zeroLinkMode ? "bg-[var(--accent-primary)]" : "bg-[var(--border-strong)]"
                  }`}
                >
                  <span
                    className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform duration-150 ${
                      zeroLinkMode ? "translate-x-[18px]" : "translate-x-[3px]"
                    }`}
                  />
                </button>
              </div>

              {/* 可直接微调的英文回复框 */}
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={8}
                aria-label={isZh ? "原生英文回复草稿" : "Native English reply draft"}
                className="w-full rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-3 text-[13px] leading-[1.6] text-[var(--ink-primary)] outline-none focus:border-[var(--accent-primary)] resize-y"
              />

              {actionToast && (
                <div className="px-3 py-2 rounded-[6px] bg-[var(--status-live-soft)] text-[var(--status-live)] text-[12px] font-medium flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{actionToast}</span>
                </div>
              )}
            </div>

            {/* 底部行动栏与键盘快捷键提示 */}
            <div className="pt-3.5 border-t border-[var(--border-hairline)] flex items-center justify-between gap-3">
              <div className="hidden sm:flex flex-col gap-1.5 text-[11.5px] text-[var(--ink-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <kbd className="lp-kbd">C</kbd>
                  <span>{isZh ? "复制并标为已回复" : "Copy & mark replied"}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <kbd className="lp-kbd">E</kbd>
                  <span>{isZh ? "忽略此帖" : "Archive thread"}</span>
                </span>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <Button variant="ghost" size="sm" disabled={updating} onClick={handleDismissLead}>
                  {isZh ? "忽略" : "Archive"}
                </Button>
                <Button variant="primary" size="sm" loading={updating} onClick={handleCopyAndMarkReplied}>
                  {isZh ? "复制并标记已回复" : "Copy & Mark Replied"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
