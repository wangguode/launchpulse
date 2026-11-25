"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  IconCreditCard,
  IconFolderPlus,
  IconInbox,
  IconLayoutDashboard,
  IconLink,
  IconLogout,
  IconMoon,
  IconPlus,
  IconRefresh,
  IconShare,
  IconSun,
  IconUserCheck,
  IconWorldDownload,
} from "@tabler/icons-react";
import { useI18n } from "@/components/I18nProvider";
import { useTheme } from "@/components/ThemeProvider";
import AppShell, { type ShellNavItem } from "@/components/ui/AppShell";
import CommandPalette, { type CommandActionItem } from "@/components/ui/CommandPalette";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
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
 * LaunchPulse 增长指挥台（/dashboard）
 * 100% 复用 Kiranism/next-shadcn-dashboard-starter (MIT) 原装 shadcn/ui 架构 + Recharts 3 + TanStack Table + cmdk + Resizable
 * 后端零改动直连 Cloudflare Workers + D1 全部 34 个线上 API
 */
export default function DashboardPage() {
  const { locale, setLocale } = useI18n();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isZh = locale === "zh";

  const [view, setView] = useState<CoreView>("today");
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number>(0);

  const [cmdOpen, setCmdOpen] = useState(false);
  const [brandDrawerOpen, setBrandDrawerOpen] = useState(false);
  const [billingDrawerOpen, setBillingDrawerOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  const [focusLeadId, setFocusLeadId] = useState<number | null>(null);
  const [focusDirId, setFocusDirId] = useState<string | null>(null);
  const [approvingWave, setApprovingWave] = useState(false);
  const [waveApprovedNotice, setWaveApprovedNotice] = useState(false);
  const [sharingReport, setSharingReport] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  const [projName, setProjName] = useState("");
  const [projUrl, setProjUrl] = useState("");
  const [projTagline, setProjTagline] = useState("");
  const [crawlingProj, setCrawlingProj] = useState(false);
  const [crawledKitDraft, setCrawledKitDraft] = useState<{
    shortTagline?: string;
    mediumPitch?: string;
    longDescription?: string;
    logoUrl?: string;
    screenshots?: string[];
    pricingModel?: string;
    categories?: string[];
    founderX?: string;
  } | null>(null);
  const [savingProj, setSavingProj] = useState(false);
  const [projError, setProjError] = useState("");

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
      const v = sp.get("view");
      if (v === "directories" || v === "inbox" || v === "today") setView(v);
      if (sp.get("unlocked") === "1") {
        toast.success(
          isZh
            ? "付款回调确认中，方案权益已同步更新！"
            : "Payment received — refreshing your workspace entitlements!"
        );
      }
      if (sp.get("sample") === "1") {
        setIsSampleMode(true);
        setData(buildSampleOverview());
        setSelectedCampaignId(1);
        setLoading(false);
        return;
      }
    }
    void loadOverview();
  }, [loadOverview]);

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
    return (
      (data?.radarLeads || [])
        .filter((l) => l.status === "new" || l.status === "drafted")
        .sort((a, b) => b.intent_score - a.intent_score)[0] || null
    );
  }, [data]);

  const handleSwitchProject = async (nextId: number) => {
    setSelectedCampaignId(nextId);
    setWaveApprovedNotice(false);
    if (!isSampleMode) await loadOverview(nextId);
  };

  const handleAutofillNewProject = async () => {
    const raw = projUrl.trim();
    if (!raw) {
      setProjError(isZh ? "请先填写官网地址再执行一键抓取" : "Enter your website URL first");
      return;
    }
    if (isSampleMode) {
      setProjName("AcmeFlow");
      setProjTagline("Automated SSL & domain expiry alerts built for lean SaaS teams");
      toast.info(isZh ? "体验模式已填充示例数据；登录后支持抓取任意真实网站" : "Sample filled; sign in to crawl live URLs");
      return;
    }
    setCrawlingProj(true);
    setProjError("");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch("/api/dashboard/brand-kit/autofill", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: raw }),
      });
      const json = (await res.json()) as {
        error?: string;
        productName?: string;
        shortTagline?: string;
        mediumPitch?: string;
        longDescription?: string;
        logoUrl?: string;
        screenshots?: string[];
        pricingModel?: string;
        categories?: string[];
        founderX?: string;
      };
      if (!res.ok) {
        setProjError(json.error || (isZh ? "无法访问该网址，请确认公网可打开" : "Unable to inspect URL"));
        return;
      }
      if (json.productName) setProjName(json.productName);
      if (json.shortTagline) setProjTagline(json.shortTagline);
      setCrawledKitDraft(json);
      toast.success(isZh ? "官网抓取成功，创建后将自动同步整套 Brand Kit！" : "Website crawled — full Brand Kit ready!");
    } catch {
      setProjError(isZh ? "抓取超时，请检查网址或手动填写" : "Crawl timed out");
    } finally {
      clearTimeout(timer);
      setCrawlingProj(false);
    }
  };

  const handleSaveNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSampleMode) {
      setProjError(isZh ? "体验模式仅用于预览，登录后即可创建并保存真实项目。" : "Sign in to create live projects.");
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
        setProjError(json.error || "Save failed");
      } else {
        // 若此前执行了 URL 一键抓取，建档后立刻同步持久化整套 Brand Kit，彻底消除空表单冷启动
        if (json.campaign?.id && crawledKitDraft) {
          await fetch("/api/dashboard/brand-kit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaignId: json.campaign.id,
              logoUrl: crawledKitDraft.logoUrl || "",
              screenshots: crawledKitDraft.screenshots || [],
              shortTagline: projTagline.trim() || crawledKitDraft.shortTagline || "",
              mediumPitch: crawledKitDraft.mediumPitch || "",
              longDescription: crawledKitDraft.longDescription || "",
              pricingModel: crawledKitDraft.pricingModel || "freemium",
              categories: crawledKitDraft.categories || ["SaaS"],
              competitors: [],
              founderName: data?.user.name || "",
              founderX: crawledKitDraft.founderX || "",
            }),
          }).catch(() => {});
        }
        setProjName("");
        setProjUrl("");
        setProjTagline("");
        setCrawledKitDraft(null);
        setNewProjectOpen(false);
        toast.success(
          crawledKitDraft
            ? isZh
              ? "新项目已创建，并自动填充整套品牌资料！"
              : "Project created with auto-filled Brand Kit!"
            : isZh
              ? "新出海项目已创建"
              : "Project created"
        );
        await loadOverview(json.campaign?.id);
      }
    } finally {
      setSavingProj(false);
    }
  };

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
        toast.success(isZh ? `已批量批准本周 ${ids.length} 个精选目录` : `Approved ${ids.length} directories`);
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
      toast.success(isZh ? `已批准本周 ${ids.length} 个精选目录` : `Approved ${ids.length} directories`);
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
      setData((prev) =>
        prev
          ? {
              ...prev,
              directories: prev.directories.map((d) =>
                d.directory_id === directoryId
                  ? { ...d, moderation_state: moderationState, scheduled_wave: scheduledWave }
                  : d
              ),
            }
          : prev
      );
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
    setData((prev) =>
      prev ? { ...prev, radarLeads: prev.radarLeads.map((l) => (l.id === leadId ? { ...l, status } : l)) } : prev
    );
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
      navigator.clipboard?.writeText(url).catch(() => {});
      toast.success(isZh ? "已复制体验公开战报链接" : "Sample report URL copied");
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
        navigator.clipboard?.writeText(json.reportUrl).catch(() => {});
        toast.success(isZh ? "公开只读战报链接已复制" : "Public report copied");
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

  const commandItems: CommandActionItem[] = useMemo(() => {
    const base: CommandActionItem[] = [
      {
        id: "nav-today",
        group: isZh ? "导航" : "Navigate",
        label: isZh ? "前往今日增长指挥台" : "Go to Overview",
        shortcut: "G T",
        icon: <IconLayoutDashboard className="size-4" />,
        onSelect: () => setView("today"),
      },
      {
        id: "nav-dir",
        group: isZh ? "导航" : "Navigate",
        label: isZh ? "打开外链与渠道（100 目录）" : "Open Directories & Links",
        shortcut: "G D",
        icon: <IconLink className="size-4" />,
        onSelect: () => setView("directories"),
      },
      {
        id: "nav-inbox",
        group: isZh ? "导航" : "Navigate",
        label: isZh ? "查看买家收件箱" : "Open Buyer Inbox",
        shortcut: "G I",
        icon: <IconInbox className="size-4" />,
        onSelect: () => setView("inbox"),
      },
      {
        id: "act-brand",
        group: isZh ? "快捷操作" : "Actions",
        label: isZh ? "编辑品牌提交资料" : "Edit Brand Kit",
        hint: ledger ? `${ledger.brandKit.score}%` : undefined,
        icon: <IconUserCheck className="size-4" />,
        onSelect: () => setBrandDrawerOpen(true),
      },
      {
        id: "act-billing",
        group: isZh ? "快捷操作" : "Actions",
        label: isZh ? "套餐账单与 AEO 工具" : "Plans, Billing & AEO",
        icon: <IconCreditCard className="size-4" />,
        onSelect: () => setBillingDrawerOpen(true),
      },
      {
        id: "act-report",
        group: isZh ? "快捷操作" : "Actions",
        label: isZh ? "复制公开只读战报链接" : "Copy Public Report",
        icon: <IconShare className="size-4" />,
        onSelect: () => void handleShareReport(),
      },
      {
        id: "act-theme",
        group: isZh ? "外观与语言" : "Preferences",
        label: resolvedTheme === "dark" ? (isZh ? "切换浅色模式" : "Light Mode") : isZh ? "切换暗黑模式" : "Dark Mode",
        icon: resolvedTheme === "dark" ? <IconSun className="size-4" /> : <IconMoon className="size-4" />,
        onSelect: toggleTheme,
      },
      {
        id: "act-lang",
        group: isZh ? "外观与语言" : "Preferences",
        label: isZh ? "Switch to English" : "切换为简体中文",
        icon: <IconRefresh className="size-4" />,
        onSelect: () => setLocale(isZh ? "en" : "zh"),
      },
    ];

    const dirs: CommandActionItem[] = (ledger?.directories || []).slice(0, 30).map((d) => ({
      id: `dir-${d.id}`,
      group: isZh ? "高权重目录" : "Top Directories",
      label: d.name,
      hint: `DR ${d.dr} · ${d.url.replace("https://", "")}`,
      onSelect: () => {
        setFocusDirId(d.id);
        setView("directories");
      },
    }));

    return [...base, ...dirs];
  }, [isZh, ledger, resolvedTheme, toggleTheme, setLocale]);

  if (loading || !data || !ledger) {
    return (
      <div className="min-h-screen bg-background text-muted-foreground flex items-center justify-center text-sm">
        {isZh ? "正在加载 LaunchPulse 增长指挥台..." : "Loading LaunchPulse..."}
      </div>
    );
  }

  const navItems: ShellNavItem[] = [
    {
      key: "today",
      label: isZh ? "今日指挥台" : "Overview",
      icon: <IconLayoutDashboard className="size-4" />,
    },
    {
      key: "directories",
      label: isZh ? "外链与渠道" : "Directories",
      icon: <IconLink className="size-4" />,
      badge: ledger.dirCounts.total,
    },
    {
      key: "inbox",
      label: isZh ? "买家收件箱" : "Buyer Inbox",
      icon: <IconInbox className="size-4" />,
      badge: ledger.leadCounts.pending > 0 ? ledger.leadCounts.pending : undefined,
    },
  ];

  const entitlement = data.entitlement || {
    plan: isSampleMode ? ("radar" as const) : ("free" as const),
    maxDirectories: isSampleMode ? 100 : 10,
    maxLeads: isSampleMode ? 999 : 3,
    canAutoScan: true,
    canAiReply: true,
    canExportReport: isSampleMode,
  };

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
        navGroupLabel={isZh ? "增长指挥台" : "Workspace"}
        onOpenCommand={() => setCmdOpen(true)}
        commandLabel={isZh ? "搜索页面或目录..." : "Search..."}
        headerActions={
          isSampleMode ? (
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="hidden md:inline-flex">
                {isZh ? "体验数据" : "Sandbox"}
              </Badge>
              <Button size="sm" className="h-8" render={<Link href="/login" />}>
                <span className="sm:hidden">{isZh ? "登录" : "Sign In"}</span>
                <span className="hidden sm:inline">{isZh ? "登录真实项目" : "Sign In"}</span>
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="h-8" onClick={handleLogout}>
              <IconLogout className="size-3.5" />
              <span className="hidden sm:inline">{isZh ? "退出" : "Log out"}</span>
            </Button>
          )
        }
        sidebarTopSlot={
          <div className="flex items-center gap-1.5">
            <select
              aria-label={isZh ? "切换当前项目" : "Switch project"}
              value={activeCampaign?.id || 0}
              onChange={(e) => handleSwitchProject(Number(e.target.value))}
              className="flex-1 min-w-0 h-8 rounded-md border border-sidebar-border bg-background px-2 text-xs font-medium text-foreground outline-none"
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
            <Button
              variant="outline"
              size="icon-sm"
              className="size-8 shrink-0"
              title={isZh ? "新增项目" : "New project"}
              onClick={() => setNewProjectOpen(true)}
            >
              <IconPlus className="size-3.5" />
            </Button>
          </div>
        }
        sidebarFooter={
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={isZh ? "品牌提交资料" : "Brand Kit"}
                onClick={() => setBrandDrawerOpen(true)}
                className="cursor-pointer"
              >
                <IconUserCheck className="size-4" />
                <span>{isZh ? "品牌资料" : "Brand Kit"}</span>
              </SidebarMenuButton>
              <SidebarMenuBadge className="font-mono tabular-nums">{ledger.brandKit.score}%</SidebarMenuBadge>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={isZh ? "套餐账单与 AEO 工具" : "Billing & Tools"}
                onClick={() => setBillingDrawerOpen(true)}
                className="cursor-pointer"
              >
                <IconCreditCard className="size-4" />
                <span>{isZh ? "套餐与工具" : "Billing & AEO"}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        }
      >
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
            entitlement={entitlement}
            initialDirectoryId={focusDirId}
            isZh={isZh}
            isSample={isSampleMode}
            onModerationChange={handleModerationChange}
            onCheckout={handleCheckout}
            checkoutPlan={checkoutPlan}
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
            entitlement={entitlement}
            initialLeadId={focusLeadId}
            isZh={isZh}
            isSample={isSampleMode}
            onRefresh={() => loadOverview(activeCampaign?.id)}
            onCheckout={handleCheckout}
            checkoutPlan={checkoutPlan}
            onLocalLeadStatus={handleLocalLeadStatus}
          />
        )}
      </AppShell>

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        items={commandItems}
        placeholder={isZh ? "输入页面、操作或目录名称（如 SourceForge / 切换主题）..." : "Type a command or directory..."}
        emptyText={isZh ? "未找到匹配结果" : "No results found"}
      />

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

      {/* 官方 shadcn Dialog 新增项目弹窗 */}
      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveNewProject} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IconFolderPlus className="size-4" />
                {isZh ? "新建出海推广项目" : "Add Product Workspace"}
              </DialogTitle>
              <DialogDescription>
                {isZh ? "录入官网地址，自动生成 100 目录排期与买家监听队列。" : "Add your SaaS URL to generate directory & buyer queues."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{isZh ? "官网地址（支持一键自动抓取资料）" : "Website URL (Auto-fill supported)"}</Label>
                <div className="flex gap-2">
                  <Input
                    required
                    type="url"
                    value={projUrl}
                    onChange={(e) => setProjUrl(e.target.value)}
                    placeholder="https://your-saas.com"
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    disabled={crawlingProj}
                    onClick={() => void handleAutofillNewProject()}
                  >
                    <IconWorldDownload className="size-3.5" />
                    {crawlingProj ? (isZh ? "抓取中..." : "Crawling...") : isZh ? "自动抓取" : "Auto-fill"}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{isZh ? "产品名称" : "Product Name"}</Label>
                <Input required value={projName} onChange={(e) => setProjName(e.target.value)} placeholder="AcmeFlow" />
              </div>
              <div className="space-y-1.5">
                <Label>{isZh ? "一句话定位" : "Tagline"}</Label>
                <Input
                  value={projTagline}
                  onChange={(e) => setProjTagline(e.target.value)}
                  placeholder={isZh ? "面向开发者的轻量级 SSL 到期告警工具" : "Lightweight SSL expiry alerts"}
                />
              </div>
              {crawledKitDraft && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {isZh
                    ? "✓ 已自动提取 Logo、简介与分类，创建项目后将自动同步至 Brand Kit。"
                    : "✓ Logo, pitch & categories extracted — will sync to Brand Kit on create."}
                </p>
              )}
              {projError && <p className="text-xs text-destructive">{projError}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setNewProjectOpen(false)}>
                {isZh ? "取消" : "Cancel"}
              </Button>
              <Button type="submit" disabled={savingProj}>
                {savingProj ? (isZh ? "创建中..." : "Creating...") : isZh ? "创建项目" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
