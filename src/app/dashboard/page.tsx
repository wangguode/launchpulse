"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  FolderPlus,
  Inbox,
  LayoutGrid,
  Link2,
  LogOut,
  Moon,
  Plus,
  RefreshCw,
  Share2,
  Sun,
  UserCheck,
  X,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { useTheme } from "@/components/ThemeProvider";
import AppShell, { type ShellNavItem } from "@/components/ui/AppShell";
import Button from "@/components/ui/Button";
import CommandPalette, { type CommandItem } from "@/components/ui/CommandPalette";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import TodayCommandView from "@/components/console/TodayCommandView";
import DirectoriesChannelsView from "@/components/console/DirectoriesChannelsView";
import BuyerInboxView from "@/components/console/BuyerInboxView";
import BrandKitDrawer from "@/components/console/BrandKitDrawer";
import BillingToolsDrawer from "@/components/console/BillingToolsDrawer";
import {
  buildSampleOverview,
  deriveConsoleLedger,
  type BrandKitRecord,
  type OverviewPayload,
  type RadarLeadRecord,
} from "@/lib/console-ledger";

type CoreView = "today" | "directories" | "inbox";

/**
 * LaunchPulse V5 行动驱动「每日增长指挥台」（/dashboard）
 * -----------------------------------------------------------------
 * - 6 合 3 极简核心导航：今日指挥台 / 外链与渠道 / 买家收件箱
 * - 静音底栏收纳：品牌资料 (完整度%) 侧滑抽屉 + 套餐与账单/AEO 工具抽屉
 * - 单一数据源绝对对账（deriveConsoleLedger）+ 全局 ⌘K 命令面板
 */
export default function DashboardV5Page() {
  const { locale, setLocale } = useI18n();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isZh = locale === "zh";

  const [view, setView] = useState<CoreView>("today");
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number>(0);

  // 侧滑抽屉 & 全局命令面板状态
  const [cmdOpen, setCmdOpen] = useState(false);
  const [brandDrawerOpen, setBrandDrawerOpen] = useState(false);
  const [billingDrawerOpen, setBillingDrawerOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  // 联动高亮定位状态
  const [focusLeadId, setFocusLeadId] = useState<number | null>(null);
  const [focusDirId, setFocusDirId] = useState<string | null>(null);

  // 批处理与即时反馈
  const [approvingWave, setApprovingWave] = useState(false);
  const [waveApprovedNotice, setWaveApprovedNotice] = useState(false);
  const [sharingReport, setSharingReport] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  // 新建项目表单
  const [projName, setProjName] = useState("");
  const [projUrl, setProjUrl] = useState("");
  const [projTagline, setProjTagline] = useState("");
  const [savingProj, setSavingProj] = useState(false);
  const [projError, setProjError] = useState("");

  const flashToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3800);
  }, []);

  const loadOverview = useCallback(async (campId?: number) => {
    try {
      const qs = campId ? `?campaignId=${campId}` : "";
      const res = await fetch(`/api/dashboard/overview${qs}`);
      if (res.status === 401) {
        if (typeof window !== "undefined") {
          const sp = new URLSearchParams(window.location.search);
          if (sp.get("sample") === "1") {
            setIsSampleMode(true);
            setData(buildSampleOverview());
            setSelectedCampaignId(1);
            setLoading(false);
            return;
          }
          window.location.href = "/login";
        }
        return;
      }
      if (res.ok) {
        const json = (await res.json()) as OverviewPayload;
        setIsSampleMode(false);
        setData(json);
        setSelectedCampaignId(json.activeCampaignId || json.campaigns[0]?.id || 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const initialView = sp.get("view");
      if (initialView === "directories" || initialView === "inbox" || initialView === "today") {
        setView(initialView);
      }
      if (sp.get("sample") === "1") {
        setIsSampleMode(true);
        setData(buildSampleOverview());
        setSelectedCampaignId(1);
        setLoading(false);
        return;
      }
    }
    loadOverview();
  }, [loadOverview]);

  // 全局 ⌘K / Ctrl+K 快捷键监听
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activeCampaign = useMemo(() => {
    const list = data?.campaigns || [];
    return list.find((c) => c.id === selectedCampaignId) || list[0] || null;
  }, [data, selectedCampaignId]);

  const ledger = useMemo(() => {
    if (!data) return null;
    return deriveConsoleLedger(data, isSampleMode);
  }, [data, isSampleMode]);

  const topPendingLead = useMemo(() => {
    const list = data?.radarLeads || [];
    return (
      list
        .filter((l) => l.status === "new" || l.status === "drafted")
        .sort((a, b) => b.intent_score - a.intent_score)[0] || null
    );
  }, [data]);

  const handleSwitchProject = async (nextId: number) => {
    setSelectedCampaignId(nextId);
    setWaveApprovedNotice(false);
    if (!isSampleMode) {
      await loadOverview(nextId);
    }
  };

  const handleSaveNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSampleMode) {
      setProjError(isZh ? "体验模式仅用于预览，注册登录后即可创建并保存你的真实项目。" : "Sign in to create live projects.");
      return;
    }
    setSavingProj(true);
    setProjError("");
    try {
      const res = await fetch("/api/dashboard/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: projName.trim(),
          targetUrl: projUrl.trim(),
          tagline: projTagline.trim(),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; campaign?: { id: number }; error?: string };
      if (!res.ok) {
        setProjError(json.error || (isZh ? "保存失败，请检查网址格式" : "Save failed"));
      } else {
        setProjName("");
        setProjUrl("");
        setProjTagline("");
        setNewProjectOpen(false);
        await loadOverview(json.campaign?.id);
        flashToast(isZh ? "新项目已创建" : "Project created");
      }
    } finally {
      setSavingProj(false);
    }
  };

  // 一键批准本周第 2 批精选目录
  const handleApproveWave2 = async () => {
    if (!ledger || ledger.dirCounts.wave2PendingIds.length === 0) return;
    const ids = ledger.dirCounts.wave2PendingIds;
    setApprovingWave(true);
    try {
      if (isSampleMode) {
        setData((prev) => {
          if (!prev) return prev;
          const idSet = new Set(ids);
          return {
            ...prev,
            directories: prev.directories.map((d) =>
              idSet.has(d.directory_id) ? { ...d, moderation_state: "priority", status: "submitted" } : d
            ),
          };
        });
        setWaveApprovedNotice(true);
        flashToast(isZh ? `已批量批准本周 ${ids.length} 个精选目录进入提交流程` : `Approved ${ids.length} directories`);
        return;
      }
      await fetch("/api/dashboard/directory-pref", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: activeCampaign?.id || 0,
          directoryIds: ids,
          moderationState: "priority",
          scheduledWave: 2,
        }),
      });
      setWaveApprovedNotice(true);
      await loadOverview(activeCampaign?.id);
      flashToast(isZh ? `已批准本周 ${ids.length} 个精选目录` : `Approved ${ids.length} Wave 2 directories`);
    } finally {
      setApprovingWave(false);
    }
  };

  const handleModerationChange = async (
    directoryId: string,
    moderationState: "approved" | "skipped" | "priority",
    scheduledWave: 1 | 2 | 3
  ) => {
    if (isSampleMode) {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          directories: prev.directories.map((d) =>
            d.directory_id === directoryId ? { ...d, moderation_state: moderationState, scheduled_wave: scheduledWave } : d
          ),
        };
      });
      return;
    }
    await fetch("/api/dashboard/directory-pref", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: activeCampaign?.id || 0,
        directoryId,
        moderationState,
        scheduledWave,
      }),
    });
    await loadOverview(activeCampaign?.id);
  };

  const handleLocalLeadStatus = (leadId: number, status: RadarLeadRecord["status"]) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        radarLeads: prev.radarLeads.map((l) => (l.id === leadId ? { ...l, status } : l)),
      };
    });
  };

  const handleBrandKitSaved = async (updatedSampleKit?: BrandKitRecord) => {
    if (isSampleMode && updatedSampleKit) {
      setData((prev) => (prev ? { ...prev, brandKit: updatedSampleKit } : prev));
      return;
    }
    await loadOverview(activeCampaign?.id);
  };

  const handleShareReport = async () => {
    if (isSampleMode) {
      const url = `${window.location.origin}/report?id=demo-acmeflow`;
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // ignore
      }
      flashToast(isZh ? "已复制体验公开战报链接" : "Sample report URL copied");
      return;
    }
    if (!activeCampaign) return;
    setSharingReport(true);
    try {
      const res = await fetch("/api/dashboard/public-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: activeCampaign.id,
          title: `${activeCampaign.product_name} · 增长归因战报`,
          showRevenue: true,
        }),
      });
      const json = (await res.json()) as { reportUrl?: string };
      if (json.reportUrl) {
        try {
          await navigator.clipboard.writeText(json.reportUrl);
        } catch {
          // ignore
        }
        flashToast(isZh ? `公开战报链接已复制：${json.reportUrl}` : `Copied report: ${json.reportUrl}`);
        await loadOverview(activeCampaign.id);
      }
    } finally {
      setSharingReport(false);
    }
  };

  const handleCheckout = async (plan: "blitz" | "radar" | "dfy") => {
    setCheckoutPlan(plan);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          slug: activeCampaign?.slug || "saas",
          targetUrl: activeCampaign?.target_url || "",
          customerEmail: isSampleMode ? "" : data?.user.email || "",
        }),
      });
      const json = (await res.json()) as { checkoutUrl?: string };
      if (res.ok && json.checkoutUrl) window.location.href = json.checkoutUrl;
    } finally {
      setCheckoutPlan(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  // 构建全局 ⌘K 命令面板项目（含 3 主视图、快捷操作与全部 100 目录直达）
  const commandItems: CommandItem[] = useMemo(() => {
    const base: CommandItem[] = [
      {
        id: "nav-today",
        group: isZh ? "导航" : "Navigate",
        label: isZh ? "前往今日指挥台" : "Go to Today Command",
        shortcut: "G T",
        icon: <LayoutGrid className="w-3.5 h-3.5" />,
        onSelect: () => setView("today"),
      },
      {
        id: "nav-dir",
        group: isZh ? "导航" : "Navigate",
        label: isZh ? "打开外链与渠道（100 目录）" : "Open Directories & Links",
        shortcut: "G D",
        icon: <Link2 className="w-3.5 h-3.5" />,
        onSelect: () => setView("directories"),
      },
      {
        id: "nav-inbox",
        group: isZh ? "导航" : "Navigate",
        label: isZh ? "查看买家收件箱" : "Open Buyer Inbox",
        shortcut: "G I",
        icon: <Inbox className="w-3.5 h-3.5" />,
        onSelect: () => setView("inbox"),
      },
      {
        id: "act-brand",
        group: isZh ? "操作" : "Action",
        label: isZh ? "编辑品牌提交资料" : "Edit Brand Kit",
        hint: ledger ? `${ledger.brandKit.score}%` : undefined,
        icon: <UserCheck className="w-3.5 h-3.5" />,
        onSelect: () => setBrandDrawerOpen(true),
      },
      {
        id: "act-report",
        group: isZh ? "操作" : "Action",
        label: isZh ? "复制公开只读战报链接" : "Copy Public Report Link",
        icon: <Share2 className="w-3.5 h-3.5" />,
        onSelect: () => void handleShareReport(),
      },
      {
        id: "act-billing",
        group: isZh ? "操作" : "Action",
        label: isZh ? "套餐账单与 AEO 体检" : "Plans, Billing & AEO Check",
        icon: <CreditCard className="w-3.5 h-3.5" />,
        onSelect: () => setBillingDrawerOpen(true),
      },
      {
        id: "act-theme",
        group: isZh ? "偏好" : "Preference",
        label:
          resolvedTheme === "dark"
            ? isZh
              ? "切换到浅色工作纸主题"
              : "Switch to Light Framed Sheet"
            : isZh
              ? "切换到暗黑曜石主题"
              : "Switch to Obsidian Dark Mode",
        icon: resolvedTheme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />,
        onSelect: toggleTheme,
      },
      {
        id: "act-lang",
        group: isZh ? "偏好" : "Preference",
        label: isZh ? "切换为纯正英文界面 (Switch to English)" : "切换为中文母语界面 (Chinese)",
        icon: <RefreshCw className="w-3.5 h-3.5" />,
        onSelect: () => setLocale(isZh ? "en" : "zh"),
      },
    ];

    const dirItems: CommandItem[] = (ledger?.directories || []).map((d) => ({
      id: `dir-${d.id}`,
      group: `DR ${d.dr}`,
      label: d.name,
      hint: `${d.url.replace("https://", "")} · ${isZh ? `第 ${d.scheduledWave} 周` : `Week ${d.scheduledWave}`}`,
      keywords: `${d.category} dr${d.dr} ${d.linkType}`,
      onSelect: () => {
        setFocusDirId(d.id);
        setView("directories");
      },
    }));

    return [...base, ...dirItems];
  }, [isZh, ledger, resolvedTheme, toggleTheme, setLocale]);

  if (loading || !data || !ledger) {
    return (
      <div className="min-h-screen bg-[var(--bg-frame)] text-[var(--ink-muted)] flex items-center justify-center text-[13px]">
        {isZh ? "正在加载 LaunchPulse 增长指挥台..." : "Loading LaunchPulse Command Center..."}
      </div>
    );
  }

  // 严格 3 项高频主导航（6 合 3，数字 100% 派生自同一 ledger）
  const navItems: ShellNavItem[] = [
    {
      key: "today",
      label: isZh ? "今日指挥台" : "Today",
      mobileLabel: isZh ? "指挥台" : "Today",
      icon: <LayoutGrid className="w-4 h-4" strokeWidth={1.7} />,
    },
    {
      key: "directories",
      label: isZh ? "外链与渠道" : "Directories",
      mobileLabel: isZh ? "外链" : "Links",
      icon: <Link2 className="w-4 h-4" strokeWidth={1.7} />,
      badge: ledger.dirCounts.total,
    },
    {
      key: "inbox",
      label: isZh ? "买家收件箱" : "Buyer Inbox",
      mobileLabel: isZh ? "收件箱" : "Inbox",
      icon: <Inbox className="w-4 h-4" strokeWidth={1.7} />,
      badge: ledger.leadCounts.pending > 0 ? ledger.leadCounts.pending : undefined,
    },
  ];

  const breadcrumbCurrent = navItems.find((n) => n.key === view)?.label || "";
  const communityShortlink = data.links.find((l) => l.channel === "community")
    ? `https://pulse.statementflow.win/r/${data.links.find((l) => l.channel === "community")!.code}`
    : activeCampaign?.target_url || "https://your-saas.com";

  return (
    <>
      <AppShell
        navItems={navItems}
        activeKey={view}
        onSelect={(key) => setView(key as CoreView)}
        breadcrumbRoot={activeCampaign?.product_name || "LaunchPulse"}
        breadcrumbCurrent={breadcrumbCurrent}
        onOpenCommand={() => setCmdOpen(true)}
        commandLabel={isZh ? "快速跳转" : "Jump to..."}
        headerActions={
          isSampleMode ? (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-[5px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] text-[11.5px] text-[var(--ink-muted)]">
                {isZh ? "体验数据" : "Sandbox"}
              </span>
              <Link
                href="/login"
                className="h-7 px-2.5 sm:px-3 rounded-[6px] lp-btn-primary text-[12px] font-medium inline-flex items-center whitespace-nowrap"
              >
                <span className="sm:hidden">{isZh ? "登录" : "Sign In"}</span>
                <span className="hidden sm:inline">{isZh ? "登录真实项目" : "Sign In"}</span>
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              title={isZh ? "退出登录" : "Log out"}
              className="w-7 h-7 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-sheet)] text-[12px] font-semibold text-[var(--ink-primary)] inline-flex items-center justify-center hover:border-[var(--border-strong)] lp-ease cursor-pointer"
            >
              {(data.user.name || data.user.email || "U").slice(0, 1).toUpperCase()}
            </button>
          )
        }
        sidebarTopSlot={
          <div className="flex items-center gap-1.5">
            <select
              aria-label={isZh ? "切换当前项目" : "Switch project"}
              value={activeCampaign?.id || 0}
              onChange={(e) => handleSwitchProject(Number(e.target.value))}
              className="flex-1 min-w-0 h-8 px-2.5 rounded-[7px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] text-[12.5px] font-medium text-[var(--ink-primary)] outline-none focus:border-[var(--border-strong)] cursor-pointer"
            >
              {data.campaigns.length === 0 ? (
                <option value={0}>{isZh ? "尚未创建项目" : "No projects"}</option>
              ) : (
                data.campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.product_name}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              title={isZh ? "新增项目" : "New project"}
              aria-label={isZh ? "新增项目" : "New project"}
              onClick={() => setNewProjectOpen(true)}
              className="w-8 h-8 shrink-0 rounded-[7px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] hover:bg-[var(--bg-hover)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] inline-flex items-center justify-center lp-ease cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />
            </button>
          </div>
        }
        sidebarFooter={
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setBrandDrawerOpen(true)}
              className="w-full h-8 px-2 rounded-[6px] text-[12.5px] text-[var(--ink-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-primary)] flex items-center justify-between lp-ease cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5 text-[var(--ink-muted)]" strokeWidth={1.7} />
                <span>{isZh ? "品牌资料" : "Brand Kit"}</span>
              </span>
              <span className="font-mono text-[11.5px] text-[var(--ink-muted)] tabular-nums">
                {ledger.brandKit.score}%
              </span>
            </button>

            <div className="flex items-center justify-between gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => setBillingDrawerOpen(true)}
                className="flex-1 h-8 px-2 rounded-[6px] text-[12.5px] text-[var(--ink-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-primary)] flex items-center gap-2 lp-ease cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5 text-[var(--ink-muted)]" strokeWidth={1.7} />
                <span className="truncate">{isZh ? "套餐与账单" : "Billing"}</span>
              </button>
              <ThemeSwitcher />
            </div>

            {!isSampleMode && (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full h-7 px-2 rounded-[6px] text-[11.5px] text-[var(--ink-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-primary)] flex items-center gap-2 lp-ease cursor-pointer"
              >
                <LogOut className="w-3 h-3" strokeWidth={1.7} />
                <span className="truncate">{data.user.email}</span>
              </button>
            )}
          </div>
        }
      >
        {/* 极简全局 Toast 提示 */}
        {toast && (
          <div className="px-5 py-2 border-b border-[var(--border-hairline)] bg-[var(--status-live-soft)] text-[var(--status-live)] text-[12.5px] font-medium flex items-center justify-between">
            <span>{toast}</span>
            <button type="button" onClick={() => setToast("")} className="opacity-70 hover:opacity-100 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {view === "today" && (
          <TodayCommandView
            ledger={ledger}
            topPendingLead={topPendingLead}
            hasProject={Boolean(activeCampaign)}
            isZh={isZh}
            approvingWave={approvingWave}
            waveApprovedNotice={waveApprovedNotice}
            onOpenBrandKit={() => setBrandDrawerOpen(true)}
            onApproveWave2={handleApproveWave2}
            onGoInboxLead={(leadId) => {
              if (leadId) setFocusLeadId(leadId);
              setView("inbox");
            }}
            onOpenDirectory={(dir) => {
              setFocusDirId(dir.id);
              setView("directories");
            }}
            onGoDirectories={() => setView("directories")}
            onCreateProject={() => setNewProjectOpen(true)}
          />
        )}

        {view === "directories" && (
          <DirectoriesChannelsView
            campaignId={activeCampaign?.id || 0}
            productName={activeCampaign?.product_name || "Your SaaS"}
            targetUrl={activeCampaign?.target_url || "https://your-saas.com"}
            brandKit={data.brandKit}
            ledger={ledger}
            links={data.links}
            initialDirectoryId={focusDirId}
            isZh={isZh}
            isSample={isSampleMode}
            onModerationChange={handleModerationChange}
            onShareReport={handleShareReport}
            sharingReport={sharingReport}
            onRefresh={() => loadOverview(activeCampaign?.id)}
          />
        )}

        {view === "inbox" && (
          <BuyerInboxView
            campaignId={activeCampaign?.id || 0}
            productName={activeCampaign?.product_name || "Your SaaS"}
            tagline={data.brandKit?.short_tagline || activeCampaign?.tagline || ""}
            communityShortlink={communityShortlink}
            monitor={data.radarMonitor}
            leads={data.radarLeads}
            initialLeadId={focusLeadId}
            isZh={isZh}
            isSample={isSampleMode}
            onRefresh={() => loadOverview(activeCampaign?.id)}
            onLocalLeadStatus={handleLocalLeadStatus}
          />
        )}
      </AppShell>

      {/* 全局 ⌘K 命令面板 */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        items={commandItems}
        placeholder={
          isZh
            ? "输入页面、操作或目录名称（如 SourceForge / 切换主题 / 品牌资料）..."
            : "Jump to view, action, or any of the 100 directories..."
        }
        emptyText={isZh ? "未找到匹配命令或目录" : "No matching commands or directories"}
      />

      {/* 品牌资料侧滑精编抽屉 */}
      <BrandKitDrawer
        open={brandDrawerOpen}
        onClose={() => setBrandDrawerOpen(false)}
        campaignId={activeCampaign?.id || 0}
        productName={activeCampaign?.product_name || ""}
        targetUrl={activeCampaign?.target_url || ""}
        initialTagline={activeCampaign?.tagline}
        initialCompetitors={activeCampaign?.competitors}
        brandKit={data.brandKit}
        isZh={isZh}
        isSample={isSampleMode}
        onSaved={handleBrandKitSaved}
      />

      {/* 套餐账单与 AEO 体检抽屉 */}
      <BillingToolsDrawer
        open={billingDrawerOpen}
        onClose={() => setBillingDrawerOpen(false)}
        productName={activeCampaign?.product_name || ""}
        targetUrl={activeCampaign?.target_url || ""}
        tagline={data.brandKit?.short_tagline || activeCampaign?.tagline || ""}
        competitors={activeCampaign?.competitors || ""}
        orders={data.orders}
        publicShareId={data.publicReport?.share_id}
        isZh={isZh}
        isSample={isSampleMode}
        onCheckout={handleCheckout}
        checkoutPlan={checkoutPlan}
        onShareReport={handleShareReport}
        sharingReport={sharingReport}
      />

      {/* 新增推广项目精简弹窗 */}
      {newProjectOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px]"
          onClick={() => setNewProjectOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveNewProject}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[440px] rounded-[12px] border border-[var(--border-strong)] bg-[var(--bg-sheet)] p-5 space-y-4"
            style={{ boxShadow: "var(--overlay-shadow)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-[var(--accent-primary)]" />
                <h2 className="text-[15px] font-semibold text-[var(--ink-primary)]">
                  {isZh ? "新建出海推广项目" : "Add Product Workspace"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setNewProjectOpen(false)}
                className="p-1 rounded text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-[12px] font-medium text-[var(--ink-secondary)]">
                  {isZh ? "产品名称" : "Product Name"}
                </span>
                <input
                  required
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  placeholder="AcmeFlow"
                  className="w-full h-9 px-3 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[13px] text-[var(--ink-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[12px] font-medium text-[var(--ink-secondary)]">
                  {isZh ? "官网地址" : "Website URL"}
                </span>
                <input
                  required
                  type="url"
                  value={projUrl}
                  onChange={(e) => setProjUrl(e.target.value)}
                  placeholder="https://your-saas.com"
                  className="w-full h-9 px-3 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[13px] font-mono text-[var(--ink-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[12px] font-medium text-[var(--ink-secondary)]">
                  {isZh ? "一句话定位" : "One-line Tagline"}
                </span>
                <input
                  value={projTagline}
                  onChange={(e) => setProjTagline(e.target.value)}
                  placeholder={isZh ? "例如：面向开发者的轻量级 SSL 到期告警工具" : "Lightweight SSL expiry alerts for dev teams"}
                  className="w-full h-9 px-3 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[13px] text-[var(--ink-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
              </label>
            </div>

            {projError && <p className="text-[12px] text-[var(--status-danger)]">{projError}</p>}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setNewProjectOpen(false)}>
                {isZh ? "取消" : "Cancel"}
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={savingProj}>
                {isZh ? "创建项目" : "Create"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
