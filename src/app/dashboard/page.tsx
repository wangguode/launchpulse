"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  IconAlertCircle,
  IconChartBar,
  IconFolderPlus,
  IconInbox,
  IconLayoutDashboard,
  IconLink,
  IconLogout,
  IconMoon,
  IconPlus,
  IconRefresh,
  IconSettings,
  IconShare,
  IconSun,
  IconUserCheck,
  IconWorldDownload,
} from "@tabler/icons-react";
import { useI18n } from "@/components/I18nProvider";
import { useTheme } from "@/components/ThemeProvider";
import AppShell, { type ShellNavGroup } from "@/components/ui/AppShell";
import CommandPalette, { type CommandActionItem } from "@/components/ui/CommandPalette";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import TodayCommandView from "@/components/console/TodayCommandView";
import DirectoriesChannelsView from "@/components/console/DirectoriesChannelsView";
import BuyerInboxView from "@/components/console/BuyerInboxView";
import AttributionAnalyticsView from "@/components/console/AttributionAnalyticsView";
import BrandKitView from "@/components/console/BrandKitView";
import WorkspaceSettingsView from "@/components/console/WorkspaceSettingsView";
import {
  buildSampleOverview,
  deriveConsoleLedger,
  formatPlanName,
  getSiteOrigin,
  type BrandKitRecord,
  type OverviewPayload,
  type RadarLeadRecord,
  type ReconciledDirectoryRow,
} from "@/lib/console-ledger";

type CoreView = "today" | "directories" | "inbox" | "analytics" | "brandkit" | "settings";

const VALID_VIEWS: CoreView[] = ["today", "directories", "inbox", "analytics", "brandkit", "settings"];

/**
 * LaunchPulse 客户增长控制台（/dashboard）
 * - 2 组 6 大全宽工作区：增长执行（今日作战室 / 目录分发 / 买家收件箱 / 归因与短链）+ 资产与配置（品牌物料库 / AEO 与账单设置）
 * - 完整 URL 状态同步（?view= & ?campaignId=）、真实 G+键 快捷跳转、Skeleton 骨架屏与接口异常恢复页
 */
export default function DashboardPage() {
  const { locale, setLocale } = useI18n();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isZh = locale === "zh";

  const [view, setView] = useState<CoreView>("today");
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number>(0);

  const [cmdOpen, setCmdOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  const [focusLeadId, setFocusLeadId] = useState<number | null>(null);
  const [focusDirId, setFocusDirId] = useState<string | null>(null);
  const [approvingWave, setApprovingWave] = useState(false);
  const [waveApprovedNotice, setWaveApprovedNotice] = useState(false);
  const [sharingReport, setSharingReport] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  // 新建项目 Dialog 状态
  const [projName, setProjName] = useState("");
  const [projUrl, setProjUrl] = useState("");
  const [projTagline, setProjTagline] = useState("");
  const [projCompetitors, setProjCompetitors] = useState("");
  const [crawlingProj, setCrawlingProj] = useState(false);
  const [crawledKitDraft, setCrawledKitDraft] = useState<Record<string, unknown> | null>(null);
  const [savingProj, setSavingProj] = useState(false);
  const [projError, setProjError] = useState("");

  // G-chord 导航状态
  const gChordTimerRef = useRef<number | null>(null);
  const gChordActiveRef = useRef(false);

  const syncUrlParams = useCallback((nextView: CoreView, nextCampId?: number) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("view", nextView);
    if (nextCampId && nextCampId > 0) url.searchParams.set("campaignId", String(nextCampId));
    else if (nextCampId === 0) url.searchParams.delete("campaignId");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const navigateView = useCallback(
    (next: CoreView) => {
      setView(next);
      syncUrlParams(next);
    },
    [syncUrlParams]
  );

  const loadOverview = useCallback(
    async (campId?: number) => {
      setLoadError("");
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
        if (!res.ok) {
          const errJson = (await res.json().catch(() => ({}))) as { error?: string };
          setLoadError(errJson.error || `HTTP ${res.status}`);
          return;
        }
        const json = (await res.json()) as OverviewPayload;
        setIsSampleMode(false);
        setData(json);
        const resolvedId = json.activeCampaignId || json.campaigns[0]?.id || 0;
        setSelectedCampaignId(resolvedId);
      } catch {
        setLoadError(isZh ? "网络连接异常，无法拉取工作台数据" : "Network error while loading workspace");
      } finally {
        setLoading(false);
      }
    },
    [isZh]
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const v = sp.get("view") as CoreView | null;
      if (v && VALID_VIEWS.includes(v)) setView(v);
      const initCampId = Number(sp.get("campaignId") || 0);
      const checkoutId = (sp.get("checkout_id") || sp.get("checkoutId") || "").trim();
      const incomingUrl = (sp.get("newUrl") || "").trim();
      if (incomingUrl) {
        setProjUrl(incomingUrl);
        setNewProjectOpen(true);
        sp.delete("newUrl");
        const cleanQs = sp.toString();
        window.history.replaceState({}, "", cleanQs ? `${window.location.pathname}?${cleanQs}` : window.location.pathname);
      }
      if (sp.get("sample") === "1") {
        setIsSampleMode(true);
        setData(buildSampleOverview());
        setSelectedCampaignId(1);
        setLoading(false);
        return;
      }
      if (checkoutId) {
        const claimWithRetry = async (attempt = 0): Promise<void> => {
          try {
            const r = await fetch("/api/checkout/claim", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ checkoutId }),
            });
            const claimed = (await r.json().catch(() => null)) as {
              unlocked?: boolean;
              pending?: boolean;
              amountUsd?: number;
            } | null;
            if (claimed?.unlocked) {
              toast.success(
                isZh ? "付款已确认，方案权益已自动同步解锁！" : "Payment confirmed — workspace entitlements updated!"
              );
              try {
                const w = window as Window & { lpConvert?: (t: string, a: number) => void };
                w.lpConvert?.("purchase", Number(claimed.amountUsd || 39));
              } catch {
                // 忽略归因像素异常
              }
              return;
            }
            if (claimed?.pending && attempt < 2) {
              await new Promise((res) => setTimeout(res, 1800));
              return claimWithRetry(attempt + 1);
            }
          } catch {
            // ignore
          }
        };
        void claimWithRetry().finally(() => {
          void loadOverview(initCampId > 0 ? initCampId : undefined);
        });
        return;
      }
      if (sp.get("unlocked") === "1") {
        sp.delete("unlocked");
        const cleanQs = sp.toString();
        window.history.replaceState({}, "", cleanQs ? `${window.location.pathname}?${cleanQs}` : window.location.pathname);
      }
      void loadOverview(initCampId > 0 ? initCampId : undefined);
      return;
    }
    void loadOverview();
  }, [loadOverview, isZh]);

  // ⌘K 命令面板 + 真实 G+键 快捷切换工作区
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || cmdOpen || newProjectOpen) return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      const k = e.key.toLowerCase();
      if (gChordActiveRef.current) {
        gChordActiveRef.current = false;
        if (gChordTimerRef.current) window.clearTimeout(gChordTimerRef.current);
        const map: Record<string, CoreView> = {
          t: "today",
          d: "directories",
          i: "inbox",
          a: "analytics",
          b: "brandkit",
          s: "settings",
        };
        if (map[k]) {
          e.preventDefault();
          navigateView(map[k]);
        }
        return;
      }
      if (k === "g") {
        gChordActiveRef.current = true;
        if (gChordTimerRef.current) window.clearTimeout(gChordTimerRef.current);
        gChordTimerRef.current = window.setTimeout(() => {
          gChordActiveRef.current = false;
        }, 900);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (gChordTimerRef.current) window.clearTimeout(gChordTimerRef.current);
    };
  }, [cmdOpen, newProjectOpen, navigateView]);

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
    syncUrlParams(view, nextId);
    if (!isSampleMode) await loadOverview(nextId);
  };

  const createProjectCore = async (params: {
    url: string;
    name?: string;
    tagline?: string;
    competitors?: string;
    crawledKit?: Record<string, unknown> | null;
  }): Promise<boolean> => {
    if (isSampleMode) {
      toast.info(isZh ? "体验模式仅用于预览，登录后即可创建并保存真实项目" : "Sign in to create live projects");
      return false;
    }
    const res = await fetch("/api/dashboard/campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: (params.name || "").trim(),
        targetUrl: params.url.trim(),
        tagline: (params.tagline || "").trim(),
        competitors: (params.competitors || "").trim(),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; campaign?: { id: number }; error?: string };
    if (!res.ok) {
      toast.error(json.error || (isZh ? "项目创建失败，请检查网址格式" : "Failed to create project"));
      return false;
    }
    if (json.campaign?.id && params.crawledKit) {
      const ck = params.crawledKit;
      await fetch("/api/dashboard/brand-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: json.campaign.id,
          logoUrl: String(ck.logoUrl || ""),
          screenshots: Array.isArray(ck.screenshots) ? ck.screenshots : [],
          shortTagline: (params.tagline || "").trim() || String(ck.shortTagline || ""),
          mediumPitch: String(ck.mediumPitch || ""),
          longDescription: String(ck.longDescription || ""),
          pricingModel: String(ck.pricingModel || "freemium"),
          categories: Array.isArray(ck.categories) ? ck.categories : ["SaaS"],
          competitors: (params.competitors || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          founderName: data?.user.name || "",
          founderX: String(ck.founderX || ""),
        }),
      }).catch(() => {});
    }
    toast.success(
      params.crawledKit
        ? isZh
          ? "出海项目已创建，并自动填充整套品牌物料库！"
          : "Project created with auto-filled Brand Kit!"
        : isZh
          ? "新出海项目已创建"
          : "Project created"
    );
    await loadOverview(json.campaign?.id);
    if (json.campaign?.id) syncUrlParams("today", json.campaign.id);
    return true;
  };

  const handleAutofillNewProject = async () => {
    const raw = projUrl.trim();
    if (!raw) {
      setProjError(isZh ? "请先填写官网地址再执行自动抓取" : "Enter your website URL first");
      return;
    }
    if (isSampleMode) {
      setProjName("AcmeFlow");
      setProjTagline("Automated SSL & domain expiry alerts for lean SaaS teams");
      toast.info(isZh ? "体验模式已填充示例数据；登录后支持抓取任意真实网站" : "Sample filled");
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
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setProjError(String(json.error || (isZh ? "无法访问该网址，请确认公网可打开" : "Unable to crawl URL")));
        return;
      }
      if (typeof json.productName === "string") setProjName(json.productName);
      if (typeof json.shortTagline === "string") setProjTagline(json.shortTagline);
      setCrawledKitDraft(json);
      toast.success(isZh ? "官网抓取成功，创建后将自动填充 Brand Kit" : "Website crawled — ready to save");
    } catch {
      setProjError(isZh ? "抓取超时，请检查网址或手动填写" : "Crawl timed out");
    } finally {
      clearTimeout(timer);
      setCrawlingProj(false);
    }
  };

  const handleSaveNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProj(true);
    setProjError("");
    try {
      const ok = await createProjectCore({
        url: projUrl,
        name: projName,
        tagline: projTagline,
        competitors: projCompetitors,
        crawledKit: crawledKitDraft,
      });
      if (ok) {
        setProjName("");
        setProjUrl("");
        setProjTagline("");
        setProjCompetitors("");
        setCrawledKitDraft(null);
        setNewProjectOpen(false);
      }
    } finally {
      setSavingProj(false);
    }
  };

  const handleUpdateProject = async (params: {
    campaignId: number;
    productName: string;
    targetUrl: string;
    tagline: string;
    competitors: string;
  }): Promise<boolean> => {
    const res = await fetch("/api/dashboard/campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast.error(json.error || (isZh ? "更新项目失败" : "Failed to update project"));
      return false;
    }
    toast.success(isZh ? "项目设置已更新" : "Project updated");
    await loadOverview(params.campaignId);
    return true;
  };

  const handleDeleteProject = async (campaignId: number): Promise<boolean> => {
    const res = await fetch("/api/dashboard/campaign", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId }),
    });
    if (!res.ok) {
      toast.error(isZh ? "删除项目失败，请重试" : "Failed to delete project");
      return false;
    }
    toast.success(isZh ? "项目已永久删除" : "Project deleted");
    navigateView("today");
    await loadOverview();
    return true;
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
        toast.success(isZh ? `已批准第 2 周 ${ids.length} 个精选目录` : `Approved ${ids.length} directories`);
        return;
      }
      const res = await fetch("/api/dashboard/directory-pref", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: activeCampaign?.id || 0,
          directoryIds: ids,
          moderationState: "priority",
          scheduledWave: 2,
        }),
      });
      if (!res.ok) {
        toast.error(isZh ? "批准确认失败，请稍后重试" : "Failed to approve Wave 2");
        return;
      }
      setWaveApprovedNotice(true);
      await loadOverview(activeCampaign?.id);
      toast.success(isZh ? `已批准第 2 周 ${ids.length} 个精选目录` : `Approved ${ids.length} directories`);
    } catch {
      toast.error(isZh ? "网络异常，批准未生效" : "Network error");
    } finally {
      setApprovingWave(false);
    }
  };

  const handleModerationChange = async (
    directoryId: string,
    moderationState: "approved" | "skipped" | "priority",
    scheduledWave: 1 | 2 | 3
  ): Promise<boolean> => {
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
      return true;
    }
    try {
      const res = await fetch("/api/dashboard/directory-pref", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: activeCampaign?.id || 0,
          directoryId,
          moderationState,
          scheduledWave,
        }),
      });
      if (!res.ok) {
        toast.error(isZh ? "保存目录偏好失败" : "Failed to save directory preference");
        return false;
      }
      await loadOverview(activeCampaign?.id);
      return true;
    } catch {
      toast.error(isZh ? "网络异常，请重试" : "Network error");
      return false;
    }
  };

  const handleSelfSubmitDirectory = async (params: {
    dir: ReconciledDirectoryRow;
    status: "queued" | "submitted" | "live";
    liveBacklinkUrl: string;
    verifyNow?: boolean;
  }): Promise<boolean> => {
    const { dir, status, liveBacklinkUrl, verifyNow } = params;
    if (isSampleMode) {
      setData((prev) => {
        if (!prev) return prev;
        const exists = prev.directories.some((d) => d.directory_id === dir.id);
        const updatedRow = {
          directory_id: dir.id,
          status,
          live_backlink_url: liveBacklinkUrl,
          updated_at: new Date().toISOString().slice(0, 10),
          moderation_state: dir.moderationState,
          scheduled_wave: dir.scheduledWave,
          last_http_status: status === "live" ? 200 : 0,
          is_dofollow_verified: status === "live" && dir.linkType === "dofollow",
          last_checked_at: status === "live" ? new Date().toISOString() : "",
        };
        return {
          ...prev,
          directories: exists
            ? prev.directories.map((d) => (d.directory_id === dir.id ? { ...d, ...updatedRow } : d))
            : [...prev.directories, updatedRow],
        };
      });
      toast.success(isZh ? `体验模式已更新 ${dir.name} 状态` : `Updated ${dir.name} in preview`);
      return true;
    }
    try {
      const res = await fetch("/api/dashboard/directory-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: activeCampaign?.id || 0,
          directoryId: dir.id,
          directoryName: dir.name,
          directoryUrl: dir.url,
          dr: dir.dr,
          category: dir.category,
          status,
          liveBacklinkUrl,
          verifyNow,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        httpStatus?: number;
        isDofollowVerified?: boolean;
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error || (isZh ? "更新目录进度失败" : "Failed to update directory"));
        return false;
      }
      if (verifyNow && json.httpStatus) {
        toast.success(
          isZh
            ? `${dir.name} 已更新并验活：HTTP ${json.httpStatus}${json.isDofollowVerified ? " · 传权重" : ""}`
            : `Verified ${dir.name}: HTTP ${json.httpStatus}`
        );
      } else {
        toast.success(
          status === "live"
            ? isZh
              ? `${dir.name} 已标为已收录`
              : `${dir.name} marked live`
            : status === "submitted"
              ? isZh
                ? `${dir.name} 已标为审核中`
                : `${dir.name} marked submitted`
              : isZh
                ? `${dir.name} 已退回待提交`
                : `${dir.name} reset to queued`
        );
      }
      await loadOverview(activeCampaign?.id);
      return true;
    } catch {
      toast.error(isZh ? "网络异常，更新失败" : "Network error");
      return false;
    }
  };

  const handleLocalLeadStatus = (leadId: number, status: RadarLeadRecord["status"], draftReply?: string) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            radarLeads: prev.radarLeads.map((l) =>
              l.id === leadId ? { ...l, status, draft_reply: draftReply ?? l.draft_reply } : l
            ),
          }
        : prev
    );
  };

  const handleBrandKitSaved = async (updatedSampleKit?: BrandKitRecord) => {
    if (isSampleMode && updatedSampleKit) {
      setData((prev) => (prev ? { ...prev, brandKit: updatedSampleKit } : prev));
      return;
    }
    await loadOverview(activeCampaign?.id);
  };

  const handlePublishReport = useCallback(
    async (opts?: { title?: string; showRevenue?: boolean }) => {
      if (isSampleMode) {
        const url = `${getSiteOrigin()}/report?id=demo-acmeflow`;
        navigator.clipboard?.writeText(url).catch(() => {});
        toast.success(isZh ? "已复制体验公开战报链接" : "Sample report URL copied");
        return;
      }
      if (!activeCampaign) {
        toast.error(isZh ? "请先创建一个出海项目再生成战报" : "Create a project first");
        return;
      }
      setSharingReport(true);
      try {
        const res = await fetch("/api/dashboard/public-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: activeCampaign.id,
            title:
              opts?.title ||
              (isZh
                ? `${activeCampaign.product_name} · 增长归因战报`
                : `${activeCampaign.product_name} · Growth & Attribution Report`),
            showRevenue: opts?.showRevenue ?? true,
          }),
        });
        const json = (await res.json().catch(() => ({}))) as { reportUrl?: string; error?: string };
        if (!res.ok || !json.reportUrl) {
          toast.error(json.error || (isZh ? "生成公开战报失败" : "Failed to publish report"));
          return;
        }
        navigator.clipboard?.writeText(json.reportUrl).catch(() => {});
        toast.success(isZh ? "公开只读战报已更新并复制链接" : "Public report URL copied");
        await loadOverview(activeCampaign.id);
      } finally {
        setSharingReport(false);
      }
    },
    [activeCampaign, isSampleMode, isZh, loadOverview]
  );

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
      const json = (await res.json().catch(() => ({}))) as { checkoutUrl?: string; error?: string };
      if (!res.ok || !json.checkoutUrl) {
        toast.error(json.error || (isZh ? "结账链接初始化失败，请稍后重试" : "Checkout initialization failed"));
        return;
      }
      window.location.href = json.checkoutUrl;
    } catch {
      toast.error(isZh ? "无法连接支付网关，请稍后重试" : "Unable to reach payment gateway");
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
        group: isZh ? "工作区导航" : "Workspaces",
        label: isZh ? "今日作战室" : "Growth Overview",
        shortcut: "G T",
        icon: <IconLayoutDashboard className="size-4" />,
        onSelect: () => navigateView("today"),
      },
      {
        id: "nav-dir",
        group: isZh ? "工作区导航" : "Workspaces",
        label: isZh ? "100+ 目录分发队列" : "Directory Distribution",
        shortcut: "G D",
        icon: <IconLink className="size-4" />,
        onSelect: () => navigateView("directories"),
      },
      {
        id: "nav-inbox",
        group: isZh ? "工作区导航" : "Workspaces",
        label: isZh ? "买家收件箱" : "Buyer Inbox",
        shortcut: "G I",
        icon: <IconInbox className="size-4" />,
        onSelect: () => navigateView("inbox"),
      },
      {
        id: "nav-analytics",
        group: isZh ? "工作区导航" : "Workspaces",
        label: isZh ? "归因短链与流量分析" : "Attribution & Links",
        shortcut: "G A",
        icon: <IconChartBar className="size-4" />,
        onSelect: () => navigateView("analytics"),
      },
      {
        id: "nav-brand",
        group: isZh ? "工作区导航" : "Workspaces",
        label: isZh ? "品牌物料库" : "Brand Launch Kit",
        hint: ledger ? `${ledger.brandKit.score}%` : undefined,
        shortcut: "G B",
        icon: <IconUserCheck className="size-4" />,
        onSelect: () => navigateView("brandkit"),
      },
      {
        id: "nav-settings",
        group: isZh ? "工作区导航" : "Workspaces",
        label: isZh ? "AEO 体检、战报与账单" : "AEO, Reports & Billing",
        shortcut: "G S",
        icon: <IconSettings className="size-4" />,
        onSelect: () => navigateView("settings"),
      },
      {
        id: "act-report",
        group: isZh ? "快捷操作" : "Actions",
        label: isZh ? "复制公开只读战报链接" : "Copy Public Report Link",
        icon: <IconShare className="size-4" />,
        onSelect: () => void handlePublishReport(),
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

    // 仅将当前套餐已解锁的目录开放至 ⌘K 检索，防止沙盒/免费版枚举全部 100 站私密列表
    const maxCmdDirs = isSampleMode ? 18 : data?.entitlement?.maxDirectories || 18;
    const unlockedDirs = [...(ledger?.directories || [])]
      .sort((a, b) => b.dr - a.dr)
      .slice(0, maxCmdDirs);
    const dirs: CommandActionItem[] = unlockedDirs.map((d) => ({
      id: `dir-${d.id}`,
      group: isZh ? `已解锁目录（${unlockedDirs.length} 站）` : `Unlocked Directories (${unlockedDirs.length})`,
      label: d.name,
      hint: `DR ${d.dr} · ${d.url.replace("https://", "")}`,
      keywords: `${d.category} dr${d.dr} ${d.linkType}`,
      onSelect: () => {
        setFocusDirId(d.id);
        navigateView("directories");
      },
    }));

    return [...base, ...dirs];
  }, [isZh, ledger, isSampleMode, data?.entitlement?.maxDirectories, resolvedTheme, toggleTheme, setLocale, navigateView, handlePublishReport]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Skeleton className="lg:col-span-8 h-72 rounded-xl" />
          <Skeleton className="lg:col-span-4 h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (loadError || !data || !ledger) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive text-base">
              <IconAlertCircle className="size-5" />
              {isZh ? "工作台加载受阻" : "Unable to load workspace"}
            </CardTitle>
            <CardDescription>{loadError || (isZh ? "服务端响应异常" : "Unexpected response from server")}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setLoading(true);
                void loadOverview(selectedCampaignId || undefined);
              }}
            >
              <IconRefresh className="size-4" />
              {isZh ? "立即重试" : "Retry"}
            </Button>
            <Button variant="outline" size="sm" render={<Link href="/dashboard?sample=1" />}>
              {isZh ? "先看体验沙盒" : "Open Sandbox"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasProject = Boolean(activeCampaign);
  const entitlement = data.entitlement || {
    plan: isSampleMode ? ("radar" as const) : ("free" as const),
    maxDirectories: isSampleMode ? 100 : 10,
    maxLeads: isSampleMode ? 999 : 3,
    canAutoScan: true,
    canAiReply: true,
    canExportReport: isSampleMode,
  };

  const navGroups: ShellNavGroup[] = [
    {
      label: isZh ? "增长执行" : "Growth Execution",
      items: [
        {
          key: "today",
          label: isZh ? "今日作战室" : "Overview",
          icon: <IconLayoutDashboard className="size-4" />,
        },
        {
          key: "directories",
          label: isZh ? "目录分发" : "Directories",
          icon: <IconLink className="size-4" />,
          badge: `${ledger.dirCounts.live}/${ledger.dirCounts.total}`,
          disabled: !hasProject,
        },
        {
          key: "inbox",
          label: isZh ? "买家收件箱" : "Buyer Inbox",
          icon: <IconInbox className="size-4" />,
          badge: ledger.leadCounts.pending > 0 ? ledger.leadCounts.pending : undefined,
          disabled: !hasProject,
        },
        {
          key: "analytics",
          label: isZh ? "归因与短链" : "Attribution",
          icon: <IconChartBar className="size-4" />,
          badge: data.links.length > 0 ? data.links.length : undefined,
          disabled: !hasProject,
        },
      ],
    },
    {
      label: isZh ? "资产与配置" : "Assets & Workspace",
      items: [
        {
          key: "brandkit",
          label: isZh ? "品牌物料库" : "Brand Kit",
          icon: <IconUserCheck className="size-4" />,
          badge: hasProject ? `${ledger.brandKit.score}%` : undefined,
          disabled: !hasProject,
        },
        {
          key: "settings",
          label: isZh ? "AEO 与账单设置" : "AEO & Settings",
          icon: <IconSettings className="size-4" />,
        },
      ],
    },
  ];

  const allNavItems = navGroups.flatMap((g) => g.items);
  const breadcrumbCurrent = allNavItems.find((n) => n.key === view)?.label || "";
  const communityShortlink = data.links.find((l) => l.channel === "community")
    ? `${getSiteOrigin()}/r/${data.links.find((l) => l.channel === "community")!.code}`
    : activeCampaign?.target_url || "https://your-saas.com";

  return (
    <>
      <AppShell
        navGroups={navGroups}
        activeKey={view}
        onSelect={(key) => navigateView(key as CoreView)}
        breadcrumbRoot={activeCampaign?.product_name || "LaunchPulse"}
        breadcrumbCurrent={breadcrumbCurrent}
        brandSubtitle={isZh ? "出海增长分析台" : "Growth Analytics"}
        onOpenCommand={() => setCmdOpen(true)}
        commandLabel={isZh ? "搜索页面或 100 目录..." : "Search pages or directories..."}
        headerActions={
          isSampleMode ? (
            <div className="flex items-center gap-1.5">
              <Badge variant="info" className="hidden md:inline-flex">
                {isZh ? "体验数据" : "Sandbox"}
              </Badge>
              <Button size="sm" className="h-8" render={<Link href="/login" />}>
                <span className="sm:hidden">{isZh ? "登录" : "Sign In"}</span>
                <span className="hidden sm:inline">{isZh ? "登录真实项目" : "Sign In"}</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button
                variant={entitlement.plan === "free" ? "secondary" : "outline"}
                size="sm"
                className="h-8 text-xs hidden sm:inline-flex"
                onClick={() => navigateView("settings")}
              >
                {formatPlanName(entitlement.plan, isZh)}
              </Button>
              <Button variant="outline" size="sm" className="h-8" onClick={handleLogout}>
                <IconLogout className="size-3.5" />
                <span className="hidden sm:inline">{isZh ? "退出" : "Log out"}</span>
              </Button>
            </div>
          )
        }
        sidebarTopSlot={
          <div className="flex items-center gap-1.5">
            <Select
              value={String(activeCampaign?.id || 0)}
              onValueChange={(v) => {
                const n = Number(v || 0);
                if (n > 0) void handleSwitchProject(n);
              }}
            >
              <SelectTrigger
                aria-label={isZh ? "切换当前项目" : "Switch project"}
                className="flex-1 min-w-0 h-8 bg-background text-xs font-medium"
              >
                <SelectValue>
                  {activeCampaign?.product_name || (isZh ? "尚未创建项目" : "No projects")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {data.campaigns.length === 0 ? (
                  <SelectItem value="0">{isZh ? "尚未创建项目" : "No projects"}</SelectItem>
                ) : (
                  data.campaigns.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.product_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon-sm"
              className="size-8 shrink-0 bg-background"
              aria-label={isZh ? "新建出海项目" : "Create new project"}
              title={isZh ? "新建出海项目" : "New project"}
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
                tooltip={data.user.email}
                onClick={() => navigateView("settings")}
                className="cursor-pointer h-auto py-1.5"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary font-semibold text-xs">
                  {(data.user.name || data.user.email || "U").slice(0, 1).toUpperCase()}
                </div>
                <div className="grid flex-1 text-left text-xs leading-tight min-w-0">
                  <span className="truncate font-medium text-foreground">
                    {data.user.name || data.user.email.split("@")[0]}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {formatPlanName(entitlement.plan, isZh)}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        }
      >
        {view === "today" && (
          <TodayCommandView
            ledger={ledger}
            topPendingLead={topPendingLead}
            hasProject={hasProject}
            isZh={isZh}
            isSample={isSampleMode}
            approvingWave={approvingWave}
            waveApprovedNotice={waveApprovedNotice}
            onOpenBrandKit={() => navigateView("brandkit")}
            onApproveWave2={handleApproveWave2}
            onGoInboxLead={(leadId) => {
              if (leadId) setFocusLeadId(leadId);
              navigateView("inbox");
            }}
            onOpenDirectory={(dir) => {
              setFocusDirId(dir.id);
              navigateView("directories");
            }}
            onGoDirectories={() => navigateView("directories")}
            onGoAnalytics={() => navigateView("analytics")}
            onQuickCreateProject={createProjectCore}
          />
        )}

        {view === "directories" && hasProject && (
          <DirectoriesChannelsView
            campaignId={activeCampaign?.id || 0}
            productName={activeCampaign?.product_name || "Your SaaS"}
            targetUrl={activeCampaign?.target_url || "https://your-saas.com"}
            brandKit={data.brandKit}
            ledger={ledger}
            entitlement={entitlement}
            initialDirectoryId={focusDirId}
            onClearInitialDirectory={() => setFocusDirId(null)}
            isZh={isZh}
            isSample={isSampleMode}
            onModerationChange={handleModerationChange}
            onSelfSubmitDirectory={handleSelfSubmitDirectory}
            onCheckout={handleCheckout}
            checkoutPlan={checkoutPlan}
            onShareReport={() => handlePublishReport()}
            sharingReport={sharingReport}
          />
        )}

        {view === "inbox" && hasProject && (
          <BuyerInboxView
            campaignId={activeCampaign?.id || 0}
            productName={activeCampaign?.product_name || "Your SaaS"}
            tagline={data.brandKit?.short_tagline || activeCampaign?.tagline || ""}
            communityShortlink={communityShortlink}
            monitor={data.radarMonitor}
            leads={data.radarLeads}
            entitlement={entitlement}
            initialLeadId={focusLeadId}
            shortcutsDisabled={cmdOpen || newProjectOpen}
            isZh={isZh}
            isSample={isSampleMode}
            onRefresh={() => loadOverview(activeCampaign?.id)}
            onCheckout={handleCheckout}
            checkoutPlan={checkoutPlan}
            onLocalLeadStatus={handleLocalLeadStatus}
          />
        )}

        {view === "analytics" && hasProject && (
          <AttributionAnalyticsView
            campaignId={activeCampaign?.id || 0}
            targetUrl={activeCampaign?.target_url || ""}
            links={data.links}
            stats={data.stats}
            ledger={ledger}
            isZh={isZh}
            isSample={isSampleMode}
            onRefresh={() => loadOverview(activeCampaign?.id)}
          />
        )}

        {view === "brandkit" && hasProject && (
          <BrandKitView
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
        )}

        {view === "settings" && (
          <WorkspaceSettingsView
            campaign={activeCampaign}
            tagline={data.brandKit?.short_tagline || activeCampaign?.tagline || ""}
            entitlement={entitlement}
            ledger={ledger}
            orders={data.orders}
            publicReport={data.publicReport}
            isZh={isZh}
            isSample={isSampleMode}
            onCheckout={handleCheckout}
            checkoutPlan={checkoutPlan}
            onPublishReport={handlePublishReport}
            sharingReport={sharingReport}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
          />
        )}
      </AppShell>

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        items={commandItems}
        placeholder={isZh ? "输入工作区名称或任意 100 目录名（如 SourceForge / BetaList）..." : "Jump to workspace or any of 100 directories..."}
        emptyText={isZh ? "未找到匹配结果" : "No results found"}
      />

      {/* 新建出海项目弹窗（全量绑定 htmlFor + 竞品输入框） */}
      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveNewProject} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IconFolderPlus className="size-4 text-primary" />
                {isZh ? "新建出海推广项目" : "Add Product Workspace"}
              </DialogTitle>
              <DialogDescription>
                {isZh
                  ? "输入官网地址自动提取品牌资料，立即生成 100 目录排期、归因短链与买家雷达。"
                  : "Crawl your URL once to generate directory queues, attribution links & buyer radar."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="np-url">{isZh ? "官网地址（HTTPS）" : "Website URL (HTTPS)"}</Label>
                <div className="flex gap-2">
                  <Input
                    id="np-url"
                    type="url"
                    required
                    value={projUrl}
                    onChange={(e) => setProjUrl(e.target.value)}
                    placeholder="https://your-saas.com"
                    className="font-mono text-xs flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    disabled={crawlingProj || !projUrl.trim()}
                    onClick={() => void handleAutofillNewProject()}
                  >
                    <IconWorldDownload className="size-3.5" />
                    {crawlingProj ? (isZh ? "抓取中..." : "Crawling...") : isZh ? "一键抓取" : "Auto-fill"}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="np-name">{isZh ? "产品名称" : "Product Name"}</Label>
                <Input
                  id="np-name"
                  required
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  placeholder="AcmeFlow"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="np-tag">{isZh ? "一句话定位" : "One-line Tagline"}</Label>
                <Input
                  id="np-tag"
                  value={projTagline}
                  onChange={(e) => setProjTagline(e.target.value)}
                  placeholder="Automated SSL & domain alerts for lean SaaS teams"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="np-comp">{isZh ? "主要竞品（可选，用于买家监听）" : "Competitors (optional)"}</Label>
                <Input
                  id="np-comp"
                  value={projCompetitors}
                  onChange={(e) => setProjCompetitors(e.target.value)}
                  placeholder="UptimeRobot, Better Stack"
                />
              </div>
              {projError && <p className="text-xs text-destructive">{projError}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setNewProjectOpen(false)}>
                {isZh ? "取消" : "Cancel"}
              </Button>
              <Button type="submit" disabled={savingProj}>
                {savingProj ? (isZh ? "创建中..." : "Creating...") : isZh ? "立即创建项目" : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
