"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  IconActivity,
  IconChartLine,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconCreditCard,
  IconExternalLink,
  IconGlobe,
  IconLock,
  IconLogout,
  IconMailForward,
  IconPhoto,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconShieldCheck,
  IconUsers,
} from "@tabler/icons-react";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import AppShell, { type ShellNavGroup } from "@/components/ui/AppShell";
import CommandPalette, { type CommandActionItem } from "@/components/ui/CommandPalette";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DISTRIBUTION_DIRECTORIES, type DirectoryChannel } from "@/data/directories";
import {
  formatChannelLabel,
  formatDateTimeLabel,
  formatOrderStatus,
  formatPlanName,
} from "@/lib/console-ledger";

interface AdminPayload {
  syncedAt: string;
  kpis: {
    totalUsers: number;
    totalCampaigns: number;
    totalOrders: number;
    totalRevenueUsd: number;
    activeMrrUsd: number;
    totalClicks: number;
    totalConversions: number;
    overallCvr: number;
  };
  users: Array<{ id: number; email: string; name: string; role: string; created_at: string }>;
  campaigns: Array<{
    id: number;
    user_email: string;
    slug: string;
    product_name: string;
    target_url: string;
    tagline?: string;
    competitors?: string;
    status?: string;
    updated_at: string;
  }>;
  orders: Array<{
    order_id: string;
    customer_email: string;
    slug?: string;
    plan: string;
    amount_usd: number;
    status: string;
    created_at: string;
  }>;
  links?: Array<{
    code: string;
    campaign_id: number;
    user_email: string;
    channel: string;
    label: string;
    destination_url: string;
    clicks_count: number;
    conversions_count: number;
    created_at?: string;
  }>;
  directories: Array<{
    customer_email: string;
    slug?: string;
    directory_id: string;
    directory_name: string;
    status: "queued" | "submitted" | "live";
    live_backlink_url: string;
    updated_at: string;
  }>;
  outreach?: Array<{
    id: number;
    slug: string;
    recipient_email: string;
    channel: string;
    sent_at: string;
    page_views: number;
    max_video_seconds: number;
    buyer_clicks: number;
    last_event_at: string;
    follow_up_status: string;
  }>;
  brandKits?: Array<{
    campaign_id: number;
    user_email: string;
    logo_url: string;
    screenshots_json: string;
    short_tagline: string;
    medium_pitch: string;
    long_description: string;
    pricing_model: string;
    categories_json: string;
    competitors_json: string;
    founder_name: string;
    founder_x: string;
    completeness_score: number;
  }>;
  directoryHealth?: Array<{
    customer_email: string;
    campaign_id?: number;
    directory_id: string;
    moderation_state: "approved" | "skipped" | "priority";
    scheduled_wave: number;
    proof_screenshot_url: string;
    last_http_status: number;
    is_dofollow_verified: number;
    last_checked_at: string;
  }>;
  auditLogs?: Array<{
    id: number;
    action: string;
    target_slug: string;
    ip: string;
    created_at: string;
  }>;
  leadCounts?: Array<{ campaign_id: number; cnt: number }>;
}

type AdminTab = "overview" | "directories" | "customers" | "telemetry";

const PAGE_SIZE = 20;

function safeParseList(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * LaunchPulse Ops 内部运营履约中枢（/admin）
 * - 独立 OPS 视觉隔离色带与品牌标识，彻底区别于客户台
 * - 以 Campaign（项目）为中心切换，草稿键按 `${campaignKey}:${dirId}` 严格隔离，根除跨客户串写
 * - 4 大工作区：运营总览与审计 / 双栏 100 目录批量履约台 / 订单与注册客户手工赋权 / 战情页视频触达与短链
 */
export default function AdminConsolePage() {
  const { locale } = useI18n();
  const isZh = locale === "zh";

  const [adminKey, setAdminKey] = useState("");
  const [data, setData] = useState<AdminPayload | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [tab, setTab] = useState<AdminTab>("overview");
  const [cmdOpen, setCmdOpen] = useState(false);

  // 以项目唯一键（camp:${id} 或 user:${email}）选中履约对象，彻底解决老客户多项目不可见问题
  const [selectedWorkspaceKey, setSelectedWorkspaceKey] = useState("");

  // 目录履约筛选、分页、批量勾选与隔离草稿
  const [dirSearch, setDirSearch] = useState("");
  const [dirStatusFilter, setDirStatusFilter] = useState<"all" | "queued" | "submitted" | "live" | "skipped">("all");
  const [dirWaveFilter, setDirWaveFilter] = useState<"all" | "1" | "2" | "3">("all");
  const [dirPage, setDirPage] = useState(0);
  const [selectedDirIds, setSelectedDirIds] = useState<Set<string>>(new Set());
  const [expandedProofDirId, setExpandedProofDirId] = useState<string | null>(null);
  const [urlDrafts, setUrlDrafts] = useState<Record<string, string>>({});
  const [proofDrafts, setProofDrafts] = useState<Record<string, string>>({});
  const [savingDirId, setSavingDirId] = useState<string | null>(null);
  const [batchSaving, setBatchSaving] = useState(false);
  const [verifyingScope, setVerifyingScope] = useState<"all" | "customer" | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // 订单与用户搜索 + 手动赋权弹窗
  const [customerSearch, setCustomerSearch] = useState("");
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantPlan, setGrantPlan] = useState<"blitz" | "radar" | "dfy">("radar");
  const [grantAmount, setGrantAmount] = useState("29");
  const [grantSlug, setGrantSlug] = useState("");
  const [grantSaving, setGrantSaving] = useState(false);

  const navigateTab = useCallback((next: AdminTab) => {
    setTab(next);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", next);
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.status === 401) {
        setData(null);
        return;
      }
      if (!res.ok) {
        toast.error(isZh ? `拉取运营数据失败 (HTTP ${res.status})` : `Sync failed (HTTP ${res.status})`);
        return;
      }
      const json = (await res.json()) as AdminPayload;
      setData(json);
      setSelectedWorkspaceKey((prev) => {
        if (prev) return prev;
        if (json.campaigns[0]) return `camp:${json.campaigns[0].id}`;
        if (json.users[0]) return `user:${json.users[0].email}`;
        return "";
      });
    } catch {
      toast.error(isZh ? "网络连接异常，请重试" : "Network error");
    } finally {
      setLoading(false);
      setCheckingAuth(false);
    }
  }, [isZh]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get("tab") as AdminTab | null;
      if (t && ["overview", "directories", "customers", "telemetry"].includes(t)) {
        setTab(t);
      }
    }
    void fetchAdminData();
  }, [fetchAdminData]);

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

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: adminKey.trim() }),
      });
      if (!res.ok) {
        setError(isZh ? "管理员密钥错误，请核对后重试。" : "Invalid administrator key.");
        setLoading(false);
        return;
      }
      setAdminKey("");
      await fetchAdminData();
    } catch {
      setError(isZh ? "网络异常，请稍后重试。" : "Network error.");
      setLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setData(null);
  };

  // 计算每个邮箱最高有效方案（用于 DFY 置顶与徽章展示）
  const planByEmail = useMemo(() => {
    const map = new Map<string, "dfy" | "radar" | "blitz" | "free">();
    const rank = { dfy: 3, radar: 2, blitz: 1, free: 0 } as const;
    for (const o of data?.orders || []) {
      if ((o.status || "").toLowerCase() !== "active") continue;
      const em = o.customer_email.toLowerCase();
      const raw = (o.plan || "").toLowerCase();
      const p: "dfy" | "radar" | "blitz" | "free" =
        raw === "dfy" ? "dfy" : raw === "radar" ? "radar" : raw === "blitz" || raw === "fixpack" ? "blitz" : "free";
      const cur = map.get(em) || "free";
      if (rank[p] > rank[cur]) map.set(em, p);
    }
    return map;
  }, [data]);

  // 构造全部可履约项目列表（先排 DFY，再排付费，再排免费），覆盖所有 Campaign + 无项目的注册用户
  const workspaces = useMemo(() => {
    if (!data) return [];
    const kitByCamp = new Map((data.brandKits || []).map((k) => [k.campaign_id, k]));
    const leadByCamp = new Map((data.leadCounts || []).map((l) => [l.campaign_id, l.cnt]));
    const dirStatsByEmail = new Map<string, { live: number; submitted: number; skipped: number }>();

    for (const d of data.directories || []) {
      const em = d.customer_email.toLowerCase();
      const cur = dirStatsByEmail.get(em) || { live: 0, submitted: 0, skipped: 0 };
      if (d.status === "live") cur.live += 1;
      else if (d.status === "submitted") cur.submitted += 1;
      dirStatsByEmail.set(em, cur);
    }
    for (const h of data.directoryHealth || []) {
      if (h.moderation_state === "skipped") {
        const em = h.customer_email.toLowerCase();
        const cur = dirStatsByEmail.get(em) || { live: 0, submitted: 0, skipped: 0 };
        cur.skipped += 1;
        dirStatsByEmail.set(em, cur);
      }
    }

    const planWeight = { dfy: 3, radar: 2, blitz: 1, free: 0 } as const;
    const list = data.campaigns.map((c) => {
      const em = c.user_email.toLowerCase();
      const plan = planByEmail.get(em) || "free";
      const kit = kitByCamp.get(c.id) || (data.brandKits || []).find((k) => k.user_email.toLowerCase() === em) || null;
      const stats = dirStatsByEmail.get(em) || { live: 0, submitted: 0, skipped: 0 };
      return {
        key: `camp:${c.id}`,
        campaignId: c.id,
        email: c.user_email,
        slug: c.slug,
        productName: c.product_name,
        targetUrl: c.target_url,
        plan,
        kitScore: kit?.completeness_score || 0,
        kit,
        liveCount: stats.live,
        submittedCount: stats.submitted,
        skippedCount: stats.skipped,
        leadsCount: leadByCamp.get(c.id) || 0,
        updatedAt: c.updated_at,
      };
    });

    list.sort((a, b) => planWeight[b.plan] - planWeight[a.plan] || b.liveCount - a.liveCount);
    return list;
  }, [data, planByEmail]);

  const activeWorkspace = useMemo(() => {
    return workspaces.find((w) => w.key === selectedWorkspaceKey) || workspaces[0] || null;
  }, [workspaces, selectedWorkspaceKey]);

  const selectedEmail = activeWorkspace?.email || "";
  const selectedCampaignId = activeWorkspace?.campaignId || 0;
  const selectedBrandKit = activeWorkspace?.kit || null;

  // 合并当前选中项目的全部目录状态（包含客户跳过/优先、HTTP 状态码、Dofollow、截图凭证）
  const selectedDirState = useMemo(() => {
    const map = new Map<
      string,
      {
        status: "queued" | "submitted" | "live";
        liveUrl: string;
        proofUrl: string;
        httpStatus: number;
        isDofollow: boolean;
        mod: "approved" | "skipped" | "priority";
        wave: number;
      }
    >();
    if (!data || !selectedEmail) return map;
    const em = selectedEmail.toLowerCase();

    for (const h of data.directoryHealth || []) {
      if (h.customer_email.toLowerCase() !== em) continue;
      if (h.campaign_id && selectedCampaignId && h.campaign_id !== selectedCampaignId) continue;
      const prev = map.get(h.directory_id);
      map.set(h.directory_id, {
        status: prev?.status || "queued",
        liveUrl: prev?.liveUrl || "",
        proofUrl: h.proof_screenshot_url || prev?.proofUrl || "",
        httpStatus: h.last_http_status || prev?.httpStatus || 0,
        isDofollow: Boolean(h.is_dofollow_verified) || Boolean(prev?.isDofollow),
        mod: h.moderation_state || prev?.mod || "approved",
        wave: h.scheduled_wave || prev?.wave || 1,
      });
    }
    for (const d of data.directories) {
      if (d.customer_email.toLowerCase() !== em) continue;
      const cur = map.get(d.directory_id);
      map.set(d.directory_id, {
        status: d.status,
        liveUrl: d.live_backlink_url || "",
        proofUrl: cur?.proofUrl || "",
        httpStatus: cur?.httpStatus || 0,
        isDofollow: cur?.isDofollow || false,
        mod: cur?.mod || "approved",
        wave: cur?.wave || 1,
      });
    }
    return map;
  }, [data, selectedEmail, selectedCampaignId]);

  const filteredDirs = useMemo(() => {
    const q = dirSearch.trim().toLowerCase();
    return DISTRIBUTION_DIRECTORIES.filter((d) => {
      const st = selectedDirState.get(d.id);
      const effectiveStatus = st?.mod === "skipped" ? "skipped" : st?.status || "queued";
      const wave = st?.wave || d.wave;
      if (dirStatusFilter !== "all" && effectiveStatus !== dirStatusFilter) return false;
      if (dirWaveFilter !== "all" && String(wave) !== dirWaveFilter) return false;
      if (q && !`${d.name} ${d.url} dr${d.dr}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [dirSearch, dirStatusFilter, dirWaveFilter, selectedDirState]);

  const totalPages = Math.max(1, Math.ceil(filteredDirs.length / PAGE_SIZE));
  const safePage = Math.min(dirPage, totalPages - 1);
  const pagedDirs = filteredDirs.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  useEffect(() => {
    setDirPage(0);
    setSelectedDirIds(new Set());
  }, [selectedWorkspaceKey, dirStatusFilter, dirWaveFilter, dirSearch]);

  const draftKey = (dirId: string) => `${activeWorkspace?.key || "none"}:${dirId}`;

  const statusTextZh = (st: "queued" | "submitted" | "live") =>
    st === "live" ? "已验活" : st === "submitted" ? "已提交" : "待提交";

  const handleSaveDirectory = async (dir: DirectoryChannel, nextStatus: "queued" | "submitted" | "live") => {
    if (!selectedEmail.trim()) return;
    setSavingDirId(dir.id);
    try {
      const cur = selectedDirState.get(dir.id);
      const dk = draftKey(dir.id);
      const liveBacklinkUrl = (urlDrafts[dk] ?? cur?.liveUrl ?? "").trim();
      const proofScreenshotUrl = (proofDrafts[dk] ?? cur?.proofUrl ?? "").trim();
      const res = await fetch("/api/admin/directory-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: selectedEmail.trim(),
          campaignId: selectedCampaignId,
          slug: activeWorkspace?.slug || "",
          directoryId: dir.id,
          directoryName: dir.name,
          directoryUrl: dir.url,
          dr: dir.dr,
          category: dir.category,
          status: nextStatus,
          liveBacklinkUrl,
          proofScreenshotUrl,
          scheduledWave: cur?.wave || dir.wave,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error || (isZh ? "更新失败，请检查链接格式（须为 https://）" : "Update failed"));
        return;
      }
      toast.success(isZh ? `${dir.name} 已更新为「${statusTextZh(nextStatus)}」` : `Updated ${dir.name}`);
      await fetchAdminData();
    } finally {
      setSavingDirId(null);
    }
  };

  const handleBatchUpdate = async (nextStatus: "queued" | "submitted" | "live") => {
    if (!selectedEmail.trim() || selectedDirIds.size === 0) return;
    setBatchSaving(true);
    try {
      const items = Array.from(selectedDirIds)
        .map((id) => DISTRIBUTION_DIRECTORIES.find((d) => d.id === id))
        .filter((d): d is DirectoryChannel => Boolean(d))
        .map((dir) => {
          const cur = selectedDirState.get(dir.id);
          const dk = draftKey(dir.id);
          return {
            directoryId: dir.id,
            directoryName: dir.name,
            directoryUrl: dir.url,
            dr: dir.dr,
            category: dir.category,
            status: nextStatus,
            liveBacklinkUrl: (urlDrafts[dk] ?? cur?.liveUrl ?? "").trim(),
            proofScreenshotUrl: (proofDrafts[dk] ?? cur?.proofUrl ?? "").trim(),
            scheduledWave: cur?.wave || dir.wave,
          };
        });

      const res = await fetch("/api/admin/directory-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: selectedEmail.trim(),
          campaignId: selectedCampaignId,
          slug: activeWorkspace?.slug || "",
          items,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { updatedCount?: number; error?: string };
      if (!res.ok) {
        toast.error(json.error || (isZh ? "批量更新失败，请检查外链格式" : "Batch update failed"));
        return;
      }
      toast.success(
        isZh
          ? `已批量将 ${json.updatedCount || items.length} 个目录标为「${statusTextZh(nextStatus)}」`
          : `Batch updated ${json.updatedCount || items.length} directories`
      );
      setSelectedDirIds(new Set());
      await fetchAdminData();
    } finally {
      setBatchSaving(false);
    }
  };

  const handleTriggerVerify = async (scope: "all" | "customer") => {
    setVerifyingScope(scope);
    try {
      const res = await fetch("/api/admin/verify-backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, customerEmail: scope === "customer" ? selectedEmail.trim() : "" }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        checked?: number;
        verifiedLive?: number;
        dofollowCount?: number;
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error || (isZh ? "验活请求失败" : "Verification failed"));
        return;
      }
      toast.success(
        isZh
          ? `${scope === "all" ? "全站" : activeWorkspace?.productName || "当前客户"}验活完成：检测 ${json.checked || 0} 条，存活 ${json.verifiedLive || 0} 条（传权重 ${json.dofollowCount || 0} 条）`
          : `Checked ${json.checked || 0}: ${json.verifiedLive || 0} live (${json.dofollowCount || 0} dofollow)`
      );
      await fetchAdminData();
    } finally {
      setVerifyingScope(null);
    }
  };

  const handleNotifyCustomer = async (ws: typeof activeWorkspace) => {
    if (!ws) return;
    setNotifying(true);
    try {
      const res = await fetch("/api/admin/notify-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: ws.email,
          productName: ws.productName,
          liveCount: ws.liveCount,
          submittedCount: ws.submittedCount,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        toast.error(json.error || (isZh ? "邮件发送受阻（请核对 Resend API Key 配置）" : "Email delivery failed"));
        return;
      }
      toast.success(isZh ? `已向 ${ws.email} 发送履约进展通知邮件` : `Progress email sent to ${ws.email}`);
      await fetchAdminData();
    } finally {
      setNotifying(false);
    }
  };

  const handleGrantPlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGrantSaving(true);
    try {
      const res = await fetch("/api/admin/grant-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: grantEmail.trim(),
          plan: grantPlan,
          amountUsd: Number(grantAmount || 0),
          slug: grantSlug.trim(),
          status: "active",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; orderId?: string; error?: string };
      if (!res.ok) {
        toast.error(json.error || (isZh ? "开通失败，请检查客户邮箱" : "Grant failed"));
        return;
      }
      toast.success(isZh ? `已为 ${grantEmail} 开通 ${formatPlanName(grantPlan, true)} (${json.orderId})` : `Plan granted (${json.orderId})`);
      setGrantOpen(false);
      setGrantEmail("");
      setGrantSlug("");
      await fetchAdminData();
    } finally {
      setGrantSaving(false);
    }
  };

  const handleToggleOrderStatus = async (orderId: string, nextStatus: "active" | "refunded" | "canceled") => {
    const res = await fetch("/api/admin/grant-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status: nextStatus }),
    });
    if (!res.ok) {
      toast.error(isZh ? "更新订单状态失败" : "Failed to update order status");
      return;
    }
    toast.success(isZh ? `订单 ${orderId} 已更新为「${formatOrderStatus(nextStatus, true)}」` : `Order updated`);
    await fetchAdminData();
  };

  const copyField = async (id: string, val: string, label: string) => {
    if (!val.trim()) return;
    try {
      await navigator.clipboard.writeText(val);
      setCopiedField(id);
      toast.success(isZh ? `已复制「${label}」` : `Copied ${label}`);
      setTimeout(() => setCopiedField(null), 1400);
    } catch {
      toast.error(isZh ? "复制失败" : "Copy failed");
    }
  };

  const commandItems: CommandActionItem[] = useMemo(() => {
    const base: CommandActionItem[] = [
      {
        id: "ops-overview",
        group: isZh ? "运营视图" : "Ops Views",
        label: isZh ? "平台运营与履约总览" : "Operations Overview",
        icon: <IconActivity className="size-4" />,
        onSelect: () => navigateTab("overview"),
      },
      {
        id: "ops-dirs",
        group: isZh ? "运营视图" : "Ops Views",
        label: isZh ? "100 目录批量履约台" : "Directory Fulfillment",
        icon: <IconGlobe className="size-4" />,
        onSelect: () => navigateTab("directories"),
      },
      {
        id: "ops-customers",
        group: isZh ? "运营视图" : "Ops Views",
        label: isZh ? "订单、注册用户与手工赋权" : "Orders & Users",
        icon: <IconUsers className="size-4" />,
        onSelect: () => navigateTab("customers"),
      },
      {
        id: "ops-telemetry",
        group: isZh ? "运营视图" : "Ops Views",
        label: isZh ? "战情页视频触达与全站短链" : "Outreach & Links Telemetry",
        icon: <IconChartLine className="size-4" />,
        onSelect: () => navigateTab("telemetry"),
      },
      {
        id: "ops-grant",
        group: isZh ? "快捷动作" : "Quick Actions",
        label: isZh ? "手动开通客户套餐 / 补单" : "Grant Customer Plan",
        icon: <IconPlus className="size-4" />,
        onSelect: () => setGrantOpen(true),
      },
    ];
    const wsItems: CommandActionItem[] = workspaces.map((w) => ({
      id: `ws-${w.key}`,
      group: isZh ? "切换履约项目" : "Switch Workspace",
      label: w.productName,
      hint: `${w.email} · ${formatPlanName(w.plan, isZh)}`,
      onSelect: () => {
        setSelectedWorkspaceKey(w.key);
        navigateTab("directories");
      },
    }));
    return [...base, ...wsItems];
  }, [isZh, navigateTab, workspaces]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background p-6 max-w-6xl mx-auto space-y-5">
        <Skeleton className="h-9 w-56" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400" />
        <header className="h-14 border-b bg-card px-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-sm tracking-tight">
            <div className="flex size-7 items-center justify-center rounded-md bg-amber-600 text-white">
              <BrandMark className="size-4" tone="light" />
            </div>
            <span>LaunchPulse</span>
            <Badge variant="warning" className="text-[10px]">OPS</Badge>
          </Link>
          <div className="flex items-center gap-1.5">
            <LangSwitcher />
            <ThemeModeToggle />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-sm">
            <CardHeader>
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/12 text-amber-600 dark:text-amber-400 mb-2">
                <IconLock className="size-4" />
              </div>
              <CardTitle>{isZh ? "运营履约中枢鉴权" : "LaunchPulse Ops Sign In"}</CardTitle>
              <CardDescription>
                {isZh ? "输入管理员密钥，服务端签发 HttpOnly 安全会话。" : "Sign in with your administrator key."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="admin-key">{isZh ? "管理员密钥" : "Admin Key"}</Label>
                  <Input
                    id="admin-key"
                    type="password"
                    required
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="••••••••••••"
                    className="font-mono"
                  />
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (isZh ? "验证中..." : "Verifying...") : isZh ? "验证并进入履约中枢" : "Unlock Ops Console"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const navGroups: ShellNavGroup[] = [
    {
      label: isZh ? "履约作战" : "Fulfillment",
      items: [
        { key: "overview", label: isZh ? "运营总览与审计" : "Overview", icon: <IconActivity className="size-4" /> },
        {
          key: "directories",
          label: isZh ? "100 目录履约台" : "100 Directories",
          icon: <IconGlobe className="size-4" />,
          badge: DISTRIBUTION_DIRECTORIES.length,
        },
      ],
    },
    {
      label: isZh ? "商业与监控" : "Revenue & Telemetry",
      items: [
        {
          key: "customers",
          label: isZh ? "订单与注册客户" : "Orders & Users",
          icon: <IconUsers className="size-4" />,
          badge: `${data.kpis.totalOrders}/${data.kpis.totalUsers}`,
        },
        {
          key: "telemetry",
          label: isZh ? "触达热力与短链" : "Outreach & Links",
          icon: <IconChartLine className="size-4" />,
          badge: (data.outreach || []).length + (data.links || []).length,
        },
      ],
    },
  ];

  const allNav = navGroups.flatMap((g) => g.items);
  const filteredOrders = data.orders.filter(
    (o) => !customerSearch.trim() || `${o.order_id} ${o.customer_email} ${o.plan}`.toLowerCase().includes(customerSearch.trim().toLowerCase())
  );
  const filteredUsers = data.users.filter(
    (u) => !customerSearch.trim() || `${u.email} ${u.name} ${u.role}`.toLowerCase().includes(customerSearch.trim().toLowerCase())
  );

  const kitCopyFields = selectedBrandKit
    ? [
        { id: "url", label: isZh ? "官网 URL" : "Website URL", val: activeWorkspace?.targetUrl || "" },
        { id: "tag", label: isZh ? "一句话定位" : "Tagline", val: selectedBrandKit.short_tagline || "" },
        { id: "pitch", label: isZh ? "标准简介" : "Standard Pitch", val: selectedBrandKit.medium_pitch || "" },
        { id: "long", label: isZh ? "深度介绍" : "Full Description", val: selectedBrandKit.long_description || "" },
        { id: "pricing", label: isZh ? "收费模式" : "Pricing Model", val: selectedBrandKit.pricing_model || "" },
        { id: "cats", label: isZh ? "产品分类" : "Categories", val: safeParseList(selectedBrandKit.categories_json).join(", ") },
        { id: "comps", label: isZh ? "主要竞品" : "Competitors", val: safeParseList(selectedBrandKit.competitors_json).join(", ") },
        { id: "founder", label: isZh ? "创始人信息" : "Founder", val: [selectedBrandKit.founder_name, selectedBrandKit.founder_x].filter(Boolean).join(" · ") },
        { id: "logo", label: "Logo URL", val: selectedBrandKit.logo_url || "" },
        { id: "shots", label: isZh ? "产品主图" : "Screenshots", val: safeParseList(selectedBrandKit.screenshots_json).join("\n") },
      ].filter((f) => f.val.trim().length > 0)
    : [];

  return (
    <>
      <AppShell
        navGroups={navGroups}
        activeKey={tab}
        onSelect={(k) => navigateTab(k as AdminTab)}
        breadcrumbRoot={isZh ? "内部履约中枢" : "LaunchPulse Ops"}
        breadcrumbCurrent={allNav.find((n) => n.key === tab)?.label || ""}
        brandSubtitle={isZh ? "内部履约中枢" : "Ops Command"}
        opsMode={true}
        onOpenCommand={() => setCmdOpen(true)}
        commandLabel={isZh ? "搜索客户项目或功能..." : "Search workspaces..."}
        headerActions={
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8" onClick={() => setGrantOpen(true)}>
              <IconPlus className="size-3.5" />
              <span className="hidden sm:inline">{isZh ? "开通套餐" : "Grant Plan"}</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8" disabled={loading} onClick={() => void fetchAdminData()}>
              <IconRefresh className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{isZh ? "同步" : "Sync"}</span>
            </Button>
          </div>
        }
        sidebarTopSlot={
          <Select
            value={activeWorkspace?.key || "__none__"}
            onValueChange={(v) => v && v !== "__none__" && setSelectedWorkspaceKey(String(v))}
          >
            <SelectTrigger
              className="w-full h-8 bg-background text-xs font-medium"
              aria-label={isZh ? "选择当前履约项目" : "Select workspace"}
            >
              <SelectValue>
                {activeWorkspace ? `${activeWorkspace.productName}` : isZh ? "暂无客户项目" : "No workspaces"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {workspaces.length === 0 ? (
                <SelectItem value="__none__">{isZh ? "暂无客户项目" : "No workspaces"}</SelectItem>
              ) : (
                workspaces.map((w) => (
                  <SelectItem key={w.key} value={w.key}>
                    {w.productName} · {w.email} ({formatPlanName(w.plan, isZh)})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        }
        sidebarFooter={
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleAdminLogout} className="cursor-pointer">
                <IconLogout className="size-4" />
                <span>{isZh ? "退出履约中枢" : "Log out"}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        }
      >
        {/* Tab 1: 平台运营总览与审计 */}
        {tab === "overview" && (
          <div className="p-4 md:p-6 space-y-6 tabular-nums">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {isZh ? "平台运营与履约总览" : "Operations & Fulfillment Overview"}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  {isZh
                    ? `最近数据同步：${formatDateTimeLabel(data.syncedAt, true)}`
                    : `Synced at ${formatDateTimeLabel(data.syncedAt, false)}`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {activeWorkspace && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={verifyingScope !== null}
                    onClick={() => void handleTriggerVerify("customer")}
                  >
                    <IconShieldCheck className="size-4" />
                    {verifyingScope === "customer"
                      ? isZh
                        ? "验活中..."
                        : "Checking..."
                      : isZh
                        ? `验活 ${activeWorkspace.productName}`
                        : `Verify ${activeWorkspace.productName}`}
                  </Button>
                )}
                <Button size="sm" disabled={verifyingScope !== null} onClick={() => void handleTriggerVerify("all")}>
                  <IconShieldCheck className="size-4" />
                  {verifyingScope === "all"
                    ? isZh
                      ? "全站验活中..."
                      : "Checking All..."
                    : isZh
                      ? "全站批量 HTTP 验活"
                      : "Verify All Backlinks"}
                </Button>
              </div>
            </div>

            {/* 4 列统一字体的清晰 Ops KPI 卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-xs">
                <CardHeader className="pb-2">
                  <CardDescription>{isZh ? "累计有效收款" : "Total Revenue"}</CardDescription>
                  <CardTitle className="text-2xl font-semibold">${data.kpis.totalRevenueUsd.toLocaleString()}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  {isZh ? `共 ${data.kpis.totalOrders.toLocaleString()} 笔订单记录` : `${data.kpis.totalOrders.toLocaleString()} total orders`}
                </CardContent>
              </Card>

              <Card className="shadow-xs">
                <CardHeader className="pb-2">
                  <CardDescription>{isZh ? "活跃月度经常性收入 (MRR)" : "Active MRR"}</CardDescription>
                  <CardTitle className="text-2xl font-semibold">${data.kpis.activeMrrUsd.toLocaleString()}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  {isZh ? "来自增长指挥台 Pro 活跃订阅" : "From active Growth Pro plans"}
                </CardContent>
              </Card>

              <Card className="shadow-xs">
                <CardHeader className="pb-2">
                  <CardDescription>{isZh ? "活跃项目 / 注册用户" : "Workspaces / Users"}</CardDescription>
                  <CardTitle className="text-2xl font-semibold">
                    {data.kpis.totalCampaigns.toLocaleString()}
                    <span className="text-base font-normal text-muted-foreground">
                      {" "}
                      / {data.kpis.totalUsers.toLocaleString()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  {isZh
                    ? `含 ${workspaces.filter((w) => w.plan === "dfy").length} 个 DFY 托管单`
                    : `${workspaces.filter((w) => w.plan === "dfy").length} DFY concierge projects`}
                </CardContent>
              </Card>

              <Card className="shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardDescription>{isZh ? "全站短链点击与转化" : "Platform Clicks & Conv"}</CardDescription>
                    <Badge variant="info" className="font-mono text-[11px]">
                      {data.kpis.overallCvr}% CVR
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl font-semibold">
                    {data.kpis.totalClicks.toLocaleString()}
                    <span className="text-base font-normal text-muted-foreground">
                      {" "}
                      / {data.kpis.totalConversions.toLocaleString()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  {isZh ? `活跃短链 ${(data.links || []).length} 条` : `${(data.links || []).length} active shortlinks`}
                </CardContent>
              </Card>
            </div>

            {/* 优先履约项目队列（DFY 置顶 + 完整进度条 + Brand Kit 评分 + 一键发信） */}
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle className="text-base">{isZh ? "客户项目履约队列（DFY 托管优先）" : "Priority Fulfillment Queue"}</CardTitle>
                <CardDescription>
                  {isZh ? "自动按套餐等级置顶急单，实时显示物料就绪度、目录验活进度与买家线索数" : "Sorted by tier priority with Brand Kit score and live backlink progress"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isZh ? "产品与客户" : "Product & Customer"}</TableHead>
                      <TableHead>{isZh ? "方案等级" : "Tier"}</TableHead>
                      <TableHead>{isZh ? "物料完整度" : "Brand Kit"}</TableHead>
                      <TableHead className="min-w-[170px]">{isZh ? "100 目录履约进度" : "Fulfillment Progress"}</TableHead>
                      <TableHead className="text-right">{isZh ? "操作" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workspaces.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          {isZh ? "暂无客户项目" : "No workspaces yet"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      workspaces.map((w) => {
                        const pct = Math.round((w.liveCount / DISTRIBUTION_DIRECTORIES.length) * 100);
                        const planVariant =
                          w.plan === "dfy" ? "destructive" : w.plan === "radar" ? "info" : w.plan === "blitz" ? "success" : "neutral";
                        return (
                          <TableRow key={w.key}>
                            <TableCell>
                              <div className="font-medium text-sm">{w.productName}</div>
                              <div className="font-mono text-xs text-muted-foreground truncate max-w-[240px]">
                                {w.email} · {w.targetUrl.replace(/^https?:\/\//, "")}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={planVariant} className="text-[11px]">
                                {formatPlanName(w.plan, isZh)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={w.kitScore >= 80 ? "success" : "warning"} className="font-mono text-xs">
                                {w.kitScore}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span>
                                    <strong className="text-emerald-600 dark:text-emerald-400">{w.liveCount}</strong> {isZh ? "验活" : "live"} ·{" "}
                                    {w.submittedCount} {isZh ? "审核" : "sub"}
                                  </span>
                                  <span className="font-mono text-muted-foreground">{pct}%</span>
                                </div>
                                <Progress value={pct} className="h-1.5" />
                              </div>
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  disabled={notifying}
                                  onClick={() => void handleNotifyCustomer(w)}
                                >
                                  <IconMailForward className="size-3.5" />
                                  {isZh ? "发进展" : "Email"}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setSelectedWorkspaceKey(w.key);
                                    navigateTab("directories");
                                  }}
                                >
                                  {isZh ? "进入履约" : "Fulfill"}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* 管理员操作审计日志（填补底部留白并可视化 admin_audit_logs） */}
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle className="text-base">{isZh ? "最近运维审计日志" : "Recent Admin Audit Log"}</CardTitle>
                <CardDescription>{isZh ? "记录后台履约、赋权、验活与通知操作，确保全链路可回溯" : "Latest 30 recorded operations actions"}</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isZh ? "动作类型" : "Action"}</TableHead>
                      <TableHead>{isZh ? "目标对象" : "Target"}</TableHead>
                      <TableHead>{isZh ? "来源 IP" : "IP"}</TableHead>
                      <TableHead className="text-right">{isZh ? "时间" : "Timestamp"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.auditLogs || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-16 text-center text-xs text-muted-foreground">
                          {isZh ? "暂无审计日志记录" : "No audit logs yet"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      (data.auditLogs || []).slice(0, 10).map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="neutral" className="font-mono text-[11px]">
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{log.target_slug || "—"}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{log.ip || "—"}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {formatDateTimeLabel(log.created_at, isZh)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 2: 双栏 100 目录批量履约台 */}
        {tab === "directories" && (
          <div className="p-4 md:p-6 space-y-4 tabular-nums">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold tracking-tight">
                    {activeWorkspace
                      ? isZh
                        ? `外链履约：${activeWorkspace.productName}`
                        : `Fulfillment: ${activeWorkspace.productName}`
                      : isZh
                        ? "外链履约台"
                        : "Directory Fulfillment"}
                  </h1>
                  {activeWorkspace && (
                    <>
                      <Badge variant={activeWorkspace.plan === "dfy" ? "destructive" : "info"}>
                        {formatPlanName(activeWorkspace.plan, isZh)}
                      </Badge>
                      <Badge variant="success" className="font-mono">
                        {activeWorkspace.liveCount} / 100 {isZh ? "已验活" : "Live"}
                      </Badge>
                    </>
                  )}
                </div>
                {activeWorkspace && (
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    {activeWorkspace.email} · {activeWorkspace.targetUrl}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeWorkspace && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={notifying}
                    onClick={() => void handleNotifyCustomer(activeWorkspace)}
                  >
                    <IconMailForward className="size-3.5" />
                    {isZh ? "发送进展邮件" : "Email Progress"}
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={verifyingScope !== null || !activeWorkspace}
                  onClick={() => void handleTriggerVerify("customer")}
                >
                  <IconShieldCheck className="size-3.5" />
                  {verifyingScope === "customer" ? (isZh ? "验活中..." : "Checking...") : isZh ? "一键 HTTP 验活" : "Verify HTTP"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              {/* 左 8 列：筛选 + 批量操作条 + 分页履约表 */}
              <div className="xl:col-span-8 space-y-3 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Tabs value={dirStatusFilter} onValueChange={(v) => setDirStatusFilter(v as typeof dirStatusFilter)}>
                    <TabsList>
                      <TabsTrigger value="all" className="text-xs px-2.5">{isZh ? "全部" : "All"}</TabsTrigger>
                      <TabsTrigger value="queued" className="text-xs px-2.5">{isZh ? "待提交" : "Queued"}</TabsTrigger>
                      <TabsTrigger value="submitted" className="text-xs px-2.5">{isZh ? "已提交" : "Submitted"}</TabsTrigger>
                      <TabsTrigger value="live" className="text-xs px-2.5">{isZh ? "已验活" : "Live"}</TabsTrigger>
                      <TabsTrigger value="skipped" className="text-xs px-2.5">{isZh ? "客户跳过" : "Skipped"}</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="flex items-center gap-2">
                    <Select value={dirWaveFilter} onValueChange={(v) => v && setDirWaveFilter(v as typeof dirWaveFilter)}>
                      <SelectTrigger className="h-8 w-[108px] text-xs" aria-label={isZh ? "按波次筛选" : "Wave filter"}>
                        <SelectValue>
                          {dirWaveFilter === "all" ? (isZh ? "全部波次" : "All Waves") : isZh ? `第 ${dirWaveFilter} 周` : `Week ${dirWaveFilter}`}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{isZh ? "全部波次" : "All Waves"}</SelectItem>
                        <SelectItem value="1">{isZh ? "第 1 周" : "Week 1"}</SelectItem>
                        <SelectItem value="2">{isZh ? "第 2 周" : "Week 2"}</SelectItem>
                        <SelectItem value="3">{isZh ? "第 3 周" : "Week 3"}</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="relative w-[180px]">
                      <IconSearch className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        aria-label={isZh ? "搜索目录名称" : "Filter directories"}
                        value={dirSearch}
                        onChange={(e) => setDirSearch(e.target.value)}
                        placeholder={isZh ? "过滤目录或 DR..." : "Filter directory..."}
                        className="h-8 pl-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 批量履约操作条 */}
                {selectedDirIds.size > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/[0.06] px-3.5 py-2 text-xs">
                    <span className="font-medium">
                      {isZh ? `已勾选 ${selectedDirIds.size} 个目录` : `${selectedDirIds.size} directories selected`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs bg-background"
                        disabled={batchSaving}
                        onClick={() => void handleBatchUpdate("submitted")}
                      >
                        {isZh ? "批量标已提交" : "Mark Submitted"}
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        disabled={batchSaving}
                        onClick={() => void handleBatchUpdate("live")}
                      >
                        {isZh ? "批量标已收录" : "Mark Live"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        disabled={batchSaving}
                        onClick={() => void handleBatchUpdate("queued")}
                      >
                        {isZh ? "退回待提交" : "Reset"}
                      </Button>
                    </div>
                  </div>
                )}

                <Card className="shadow-xs">
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-9">
                            <Checkbox
                              aria-label={isZh ? "全选本页目录" : "Select page rows"}
                              checked={pagedDirs.length > 0 && pagedDirs.every((d) => selectedDirIds.has(d.id))}
                              onCheckedChange={(checked) => {
                                const next = new Set(selectedDirIds);
                                for (const d of pagedDirs) {
                                  if (checked) next.add(d.id);
                                  else next.delete(d.id);
                                }
                                setSelectedDirIds(next);
                              }}
                            />
                          </TableHead>
                          <TableHead>{isZh ? "目录与客户偏好" : "Directory & Pref"}</TableHead>
                          <TableHead>DR</TableHead>
                          <TableHead>{isZh ? "状态 / 验活" : "Status / HTTP"}</TableHead>
                          <TableHead>{isZh ? "已收录外链 / 凭证" : "Live URL & Proof"}</TableHead>
                          <TableHead className="text-right">{isZh ? "履约切换" : "Update"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedDirs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                              {isZh ? "当前筛选下无匹配目录" : "No matching directories"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          pagedDirs.map((dir) => {
                            const st = selectedDirState.get(dir.id);
                            const status = st?.status || "queued";
                            const dk = draftKey(dir.id);
                            const draftUrl = urlDrafts[dk] ?? st?.liveUrl ?? "";
                            const draftProof = proofDrafts[dk] ?? st?.proofUrl ?? "";
                            const isSkipped = st?.mod === "skipped";
                            const isPriority = st?.mod === "priority";
                            const showProof = expandedProofDirId === dir.id || Boolean(draftProof);

                            return (
                              <TableRow key={dir.id} className={isSkipped ? "opacity-65 bg-muted/25" : undefined}>
                                <TableCell>
                                  <Checkbox
                                    aria-label={dir.name}
                                    checked={selectedDirIds.has(dir.id)}
                                    onCheckedChange={(checked) => {
                                      const next = new Set(selectedDirIds);
                                      if (checked) next.add(dir.id);
                                      else next.delete(dir.id);
                                      setSelectedDirIds(next);
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="min-w-[160px]">
                                  <a
                                    href={dir.submitUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-xs hover:underline inline-flex items-center gap-1"
                                  >
                                    {dir.name}
                                    <IconExternalLink className="size-3 opacity-60" />
                                  </a>
                                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                                    <span className="text-[10px] text-muted-foreground">W{st?.wave || dir.wave}</span>
                                    {isSkipped && (
                                      <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                                        {isZh ? "客户已跳过" : "Client Skipped"}
                                      </Badge>
                                    )}
                                    {isPriority && (
                                      <Badge variant="info" className="h-4 px-1 text-[10px]">
                                        {isZh ? "客户优先" : "Priority"}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={dir.dr >= 80 ? "success" : "neutral"} className="font-mono text-[11px]">
                                    {dir.dr}
                                  </Badge>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  <div className="flex flex-col gap-1">
                                    <Badge
                                      variant={status === "live" ? "success" : status === "submitted" ? "warning" : "neutral"}
                                      className="text-[11px]"
                                    >
                                      {status === "live"
                                        ? isZh
                                          ? "已验活"
                                          : "Live"
                                        : status === "submitted"
                                          ? isZh
                                            ? "已提交"
                                            : "Submitted"
                                          : isZh
                                            ? "待提交"
                                            : "Queued"}
                                    </Badge>
                                    {st && st.httpStatus > 0 && (
                                      <span
                                        className={`font-mono text-[10px] ${
                                          st.httpStatus >= 200 && st.httpStatus < 400 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                                        }`}
                                      >
                                        HTTP {st.httpStatus}
                                        {st.isDofollow ? " · DF" : ""}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="min-w-[210px] space-y-1.5">
                                  <div className="flex items-center gap-1">
                                    <Input
                                      aria-label={`${dir.name} live backlink URL`}
                                      value={draftUrl}
                                      onChange={(e) => setUrlDrafts((prev) => ({ ...prev, [dk]: e.target.value }))}
                                      placeholder="https://..."
                                      className="h-7 font-mono text-xs flex-1"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-xs"
                                      title={isZh ? "附加截图凭证 URL" : "Attach proof screenshot URL"}
                                      aria-label={isZh ? "附加截图凭证 URL" : "Attach proof URL"}
                                      onClick={() => setExpandedProofDirId(expandedProofDirId === dir.id ? null : dir.id)}
                                    >
                                      <IconPhoto className={`size-3.5 ${draftProof ? "text-primary" : "text-muted-foreground"}`} />
                                    </Button>
                                  </div>
                                  {showProof && (
                                    <Input
                                      aria-label={`${dir.name} proof screenshot URL`}
                                      value={draftProof}
                                      onChange={(e) => setProofDrafts((prev) => ({ ...prev, [dk]: e.target.value }))}
                                      placeholder={isZh ? "截图凭证 URL (https://...)" : "Proof screenshot URL..."}
                                      className="h-7 font-mono text-[11px] bg-muted/40"
                                    />
                                  )}
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap">
                                  <div className="inline-flex items-center gap-1">
                                    {status !== "queued" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-1.5 text-[11px] text-muted-foreground"
                                        disabled={savingDirId === dir.id}
                                        onClick={() => void handleSaveDirectory(dir, "queued")}
                                      >
                                        {isZh ? "重置" : "Reset"}
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      disabled={savingDirId === dir.id}
                                      onClick={() => void handleSaveDirectory(dir, "submitted")}
                                    >
                                      {isZh ? "已提交" : "Sub"}
                                    </Button>
                                    <Button
                                      variant={status === "live" ? "secondary" : "outline"}
                                      size="sm"
                                      className="h-7 px-2 text-xs border-emerald-500/35 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                                      disabled={savingDirId === dir.id}
                                      onClick={() => void handleSaveDirectory(dir, "live")}
                                    >
                                      {isZh ? "已收录" : "Live"}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* 分页控制栏 */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {isZh
                      ? `筛选命中 ${filteredDirs.length} 站 · 第 ${safePage + 1} / ${totalPages} 页`
                      : `${filteredDirs.length} matched · Page ${safePage + 1} of ${totalPages}`}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      disabled={safePage <= 0}
                      onClick={() => setDirPage((p) => Math.max(0, p - 1))}
                    >
                      <IconChevronLeft className="size-3.5" />
                      {isZh ? "上一页" : "Prev"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      disabled={safePage >= totalPages - 1}
                      onClick={() => setDirPage((p) => Math.min(totalPages - 1, p + 1))}
                    >
                      {isZh ? "下一页" : "Next"}
                      <IconChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* 右 4 列：常驻粘性客户物料分字段一键复制栏 */}
              <Card className="xl:col-span-4 xl:sticky xl:top-20 shadow-xs">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm">{isZh ? "客户提交资料分字段速查" : "Client Brand Kit Copy Rail"}</CardTitle>
                    {selectedBrandKit && (
                      <Badge variant={selectedBrandKit.completeness_score >= 80 ? "success" : "warning"} className="font-mono text-[11px]">
                        {selectedBrandKit.completeness_score}%
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    {isZh ? "逐项点击即可复制，无需手动拆分整段文本" : "Click any field to copy directly while submitting"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3.5 space-y-2.5 max-h-[calc(100vh-14rem)] overflow-y-auto">
                  {kitCopyFields.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-8 text-center">
                      {isZh ? "该客户尚未填写品牌物料库" : "Client has not filled Brand Kit yet"}
                    </p>
                  ) : (
                    kitCopyFields.map((field) => (
                      <div key={field.id} className="rounded-lg border bg-muted/30 p-2.5 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-muted-foreground">{field.label}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[11px]"
                            onClick={() => void copyField(field.id, field.val, field.label)}
                          >
                            {copiedField === field.id ? <IconCheck className="size-3 text-emerald-500" /> : <IconCopy className="size-3" />}
                            {isZh ? "复制" : "Copy"}
                          </Button>
                        </div>
                        <p className="text-xs leading-relaxed break-words line-clamp-3 text-foreground">{field.val}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 3: 订单、注册用户与手工赋权 */}
        {tab === "customers" && (
          <div className="p-4 md:p-6 space-y-4 tabular-nums">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {isZh ? "付费订单与注册客户管理" : "Orders, Users & Plan Grants"}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isZh
                    ? `共 ${data.kpis.totalOrders} 笔订单 · ${data.kpis.totalUsers} 位注册客户，支持手动开通线下套餐与状态变更`
                    : `${data.kpis.totalOrders} orders · ${data.kpis.totalUsers} registered users`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-[220px]">
                  <IconSearch className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    aria-label={isZh ? "搜索客户邮箱或订单号" : "Search email or order"}
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder={isZh ? "搜索邮箱或订单号..." : "Search email or order..."}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <Button size="sm" onClick={() => setGrantOpen(true)}>
                  <IconPlus className="size-3.5" />
                  {isZh ? "手动开通 / 补单" : "Grant Plan"}
                </Button>
              </div>
            </div>

            <Tabs defaultValue="orders" className="space-y-4">
              <TabsList>
                <TabsTrigger value="orders" className="text-xs px-3">
                  <IconCreditCard className="size-3.5" />
                  {isZh ? `付费订单台账 (${filteredOrders.length})` : `Orders (${filteredOrders.length})`}
                </TabsTrigger>
                <TabsTrigger value="users" className="text-xs px-3">
                  <IconUsers className="size-3.5" />
                  {isZh ? `注册用户明细 (${filteredUsers.length})` : `Users (${filteredUsers.length})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="orders">
                <Card className="shadow-xs">
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{isZh ? "订单号" : "Order ID"}</TableHead>
                          <TableHead>{isZh ? "客户邮箱" : "Customer"}</TableHead>
                          <TableHead>{isZh ? "套餐方案" : "Plan"}</TableHead>
                          <TableHead>{isZh ? "金额" : "Amount"}</TableHead>
                          <TableHead>{isZh ? "状态" : "Status"}</TableHead>
                          <TableHead>{isZh ? "创建时间" : "Date"}</TableHead>
                          <TableHead className="text-right">{isZh ? "操作" : "Action"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                              {isZh ? "暂无匹配订单" : "No matching orders"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredOrders.map((o) => (
                            <TableRow key={o.order_id}>
                              <TableCell className="font-mono text-xs">{o.order_id}</TableCell>
                              <TableCell className="font-mono text-xs">{o.customer_email}</TableCell>
                              <TableCell className="text-xs font-medium">{formatPlanName(o.plan, isZh)}</TableCell>
                              <TableCell className="font-mono text-xs font-semibold">${o.amount_usd}</TableCell>
                              <TableCell>
                                <Badge variant={o.status === "active" ? "success" : "neutral"} className="text-[11px]">
                                  {formatOrderStatus(o.status, isZh)}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {formatDateTimeLabel(o.created_at, isZh)}
                              </TableCell>
                              <TableCell className="text-right">
                                {o.status === "active" ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-destructive"
                                    onClick={() => void handleToggleOrderStatus(o.order_id, "refunded")}
                                  >
                                    {isZh ? "标为退款" : "Refund"}
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => void handleToggleOrderStatus(o.order_id, "active")}
                                  >
                                    {isZh ? "恢复生效" : "Reactivate"}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="users">
                <Card className="shadow-xs">
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>{isZh ? "用户邮箱" : "Email"}</TableHead>
                          <TableHead>{isZh ? "昵称" : "Name"}</TableHead>
                          <TableHead>{isZh ? "当前权益" : "Active Tier"}</TableHead>
                          <TableHead>{isZh ? "项目数" : "Projects"}</TableHead>
                          <TableHead>{isZh ? "注册时间" : "Joined"}</TableHead>
                          <TableHead className="text-right">{isZh ? "快捷操作" : "Action"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                              {isZh ? "暂无注册用户" : "No registered users"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((u) => {
                            const tier = planByEmail.get(u.email.toLowerCase()) || "free";
                            const projCount = data.campaigns.filter(
                              (c) => c.user_email.toLowerCase() === u.email.toLowerCase()
                            ).length;
                            return (
                              <TableRow key={u.id}>
                                <TableCell className="font-mono text-xs text-muted-foreground">#{u.id}</TableCell>
                                <TableCell className="font-mono text-xs">{u.email}</TableCell>
                                <TableCell className="text-xs">{u.name || "—"}</TableCell>
                                <TableCell>
                                  <Badge variant={tier === "free" ? "neutral" : "success"} className="text-[11px]">
                                    {formatPlanName(tier, isZh)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-xs">{projCount}</TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                  {formatDateTimeLabel(u.created_at, isZh)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => {
                                      setGrantEmail(u.email);
                                      setGrantOpen(true);
                                    }}
                                  >
                                    {isZh ? "开通套餐" : "Grant Plan"}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Tab 4: 战情页视频触达热力 & 全站短链监控（释放后端沉睡数据） */}
        {tab === "telemetry" && (
          <div className="p-4 md:p-6 space-y-5 tabular-nums">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isZh ? "外呼视频触达热力与全站短链" : "Outreach Heat & Platform Links"}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isZh
                  ? "实时监控冷邮件战情页访问、视频播放完播秒数、买家点击，以及全站归因短链排行"
                  : "Track teardown page views, video watch duration, buyer clicks & top platform links"}
              </p>
            </div>

            <Tabs defaultValue="outreach" className="space-y-4">
              <TabsList>
                <TabsTrigger value="outreach" className="text-xs px-3">
                  {isZh ? `战情页触达热力 (${(data.outreach || []).length})` : `Outreach Telemetry (${(data.outreach || []).length})`}
                </TabsTrigger>
                <TabsTrigger value="links" className="text-xs px-3">
                  {isZh ? `全站归因短链 (${(data.links || []).length})` : `Platform Shortlinks (${(data.links || []).length})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="outreach">
                <Card className="shadow-xs">
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{isZh ? "战情页 Slug" : "Slug"}</TableHead>
                          <TableHead>{isZh ? "收件人 / 渠道" : "Recipient"}</TableHead>
                          <TableHead className="text-right">{isZh ? "页面访问" : "Views"}</TableHead>
                          <TableHead className="min-w-[150px]">{isZh ? "视频观看最高秒数" : "Max Video Watch"}</TableHead>
                          <TableHead className="text-right">{isZh ? "线索点击" : "Lead Clicks"}</TableHead>
                          <TableHead>{isZh ? "跟进态" : "Status"}</TableHead>
                          <TableHead className="text-right">{isZh ? "最近活跃" : "Last Event"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data.outreach || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                              {isZh ? "暂无战情页外呼热力记录（客户打开 /audit/[slug] 后自动实时入库）" : "No outreach telemetry yet"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          (data.outreach || []).map((o) => {
                            const watchPct = Math.min(100, Math.round((Number(o.max_video_seconds || 0) / 60) * 100));
                            return (
                              <TableRow key={o.id}>
                                <TableCell className="font-mono text-xs font-medium">{o.slug}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {o.recipient_email || "—"} · {o.channel}
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs">{o.page_views}</TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <span className="font-mono text-xs font-semibold">{o.max_video_seconds}s</span>
                                    <Progress value={watchPct} className="h-1.5" />
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs">{o.buyer_clicks}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      o.follow_up_status === "won"
                                        ? "success"
                                        : o.follow_up_status === "replied"
                                          ? "info"
                                          : o.follow_up_status === "sent"
                                            ? "warning"
                                            : "neutral"
                                    }
                                    className="text-[11px]"
                                  >
                                    {isZh
                                      ? o.follow_up_status === "won"
                                        ? "已转化"
                                        : o.follow_up_status === "replied"
                                          ? "已回复"
                                          : o.follow_up_status === "sent"
                                            ? "已触达"
                                            : "待跟进"
                                      : o.follow_up_status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                  {formatDateTimeLabel(o.last_event_at, isZh)}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="links">
                <Card className="shadow-xs">
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{isZh ? "短链" : "Code"}</TableHead>
                          <TableHead>{isZh ? "所属客户" : "Owner"}</TableHead>
                          <TableHead>{isZh ? "渠道与备注" : "Channel & Label"}</TableHead>
                          <TableHead className="text-right">{isZh ? "点击数" : "Clicks"}</TableHead>
                          <TableHead className="text-right">{isZh ? "转化数" : "Conv"}</TableHead>
                          <TableHead className="text-right">CVR</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data.links || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                              {isZh ? "暂无全站追踪短链" : "No platform links yet"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          (data.links || []).map((l) => {
                            const cvr = l.clicks_count > 0 ? ((l.conversions_count / l.clicks_count) * 100).toFixed(1) : "0.0";
                            return (
                              <TableRow key={l.code}>
                                <TableCell className="font-mono text-xs text-primary">/r/{l.code}</TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{l.user_email}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant="neutral" className="text-[10px]">
                                      {formatChannelLabel(l.channel, isZh)}
                                    </Badge>
                                    <span className="text-xs truncate max-w-[180px]">{l.label}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs">{l.clicks_count.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-mono text-xs">{l.conversions_count}</TableCell>
                                <TableCell className="text-right font-mono text-xs font-medium">{cvr}%</TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </AppShell>

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        items={commandItems}
        placeholder={isZh ? "搜索客户项目、运营视图或快捷操作..." : "Search customer workspaces or ops views..."}
        emptyText={isZh ? "未找到匹配项" : "No matches"}
      />

      {/* 手动开通套餐 / 补单弹窗 */}
      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleGrantPlanSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{isZh ? "手动开通客户套餐 / 线下补单" : "Grant Customer Plan"}</DialogTitle>
              <DialogDescription>
                {isZh
                  ? "用于线下收款、VIP 测试或客服补单，提交后立即解锁该邮箱的目录与买家雷达配额。"
                  : "Immediately unlocks directory & buyer radar entitlements for the specified customer email."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="grant-email">{isZh ? "客户邮箱" : "Customer Email"}</Label>
                <Input
                  id="grant-email"
                  type="email"
                  required
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  placeholder="founder@saas.com"
                  className="font-mono text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="grant-plan">{isZh ? "开通方案" : "Plan"}</Label>
                  <Select
                    value={grantPlan}
                    onValueChange={(v) => {
                      const next = v as "blitz" | "radar" | "dfy";
                      setGrantPlan(next);
                      setGrantAmount(next === "dfy" ? "299" : next === "radar" ? "29" : "39");
                    }}
                  >
                    <SelectTrigger id="grant-plan" className="h-9 text-xs">
                      <SelectValue>{formatPlanName(grantPlan, isZh)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blitz">{isZh ? "启动包 · 30 站 ($39)" : "Launch Starter ($39)"}</SelectItem>
                      <SelectItem value="radar">{isZh ? "增长指挥台 Pro ($29/月)" : "Growth Pro ($29/mo)"}</SelectItem>
                      <SelectItem value="dfy">{isZh ? "代投旗舰托管 ($299)" : "Done-For-You ($299)"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="grant-amount">{isZh ? "入账金额 (USD)" : "Amount (USD)"}</Label>
                  <Input
                    id="grant-amount"
                    type="number"
                    min="0"
                    value={grantAmount}
                    onChange={(e) => setGrantAmount(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="grant-slug">{isZh ? "关联项目标识（可选）" : "Project Slug (optional)"}</Label>
                <Input
                  id="grant-slug"
                  value={grantSlug}
                  onChange={(e) => setGrantSlug(e.target.value)}
                  placeholder="acmeflow"
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setGrantOpen(false)}>
                {isZh ? "取消" : "Cancel"}
              </Button>
              <Button type="submit" disabled={grantSaving}>
                {grantSaving ? (isZh ? "开通中..." : "Granting...") : isZh ? "确认开通并入账" : "Confirm Grant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
