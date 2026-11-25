"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Globe,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import AppShell, { type ShellNavItem } from "@/components/ui/AppShell";
import Button from "@/components/ui/lp-button";
import StatusBadge from "@/components/ui/StatusBadge";
import { DISTRIBUTION_DIRECTORIES, type DirectoryChannel } from "@/data/directories";

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
    updated_at: string;
  }>;
  orders: Array<{
    order_id: string;
    customer_email: string;
    plan: string;
    amount_usd: number;
    status: string;
    created_at: string;
  }>;
  directories: Array<{
    customer_email: string;
    directory_id: string;
    directory_name: string;
    status: "queued" | "submitted" | "live";
    live_backlink_url: string;
    updated_at: string;
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
    directory_id: string;
    moderation_state: "approved" | "skipped" | "priority";
    scheduled_wave: number;
    proof_screenshot_url: string;
    last_http_status: number;
    is_dofollow_verified: number;
    last_checked_at: string;
  }>;
}

type AdminTab = "overview" | "directories" | "orders";

/**
 * LaunchPulse V5 精密运营履约台（/admin）
 * 100% 复用 V5 Framed Sheet / True-Dark Obsidian 组件库，支持 HttpOnly Cookie 鉴权、
 * 客户 Brand Kit 一键复制、100 目录行内履约与一键 HTTP 外链验活巡检。
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
  const [selectedEmail, setSelectedEmail] = useState("");
  const [dirSearch, setDirSearch] = useState("");
  const [savingDirId, setSavingDirId] = useState<string | null>(null);
  const [urlDrafts, setUrlDrafts] = useState<Record<string, string>>({});
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [copiedKit, setCopiedKit] = useState(false);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.status === 401) {
        setData(null);
        return;
      }
      if (res.ok) {
        const json = (await res.json()) as AdminPayload;
        setData(json);
        setSelectedEmail((prev) => prev || json.campaigns[0]?.user_email || json.users[0]?.email || "");
      }
    } finally {
      setLoading(false);
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    void fetchAdminData();
  }, [fetchAdminData]);

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

  const selectedBrandKit = useMemo(() => {
    if (!data || !selectedEmail) return null;
    return (data.brandKits || []).find((b) => b.user_email.toLowerCase() === selectedEmail.toLowerCase()) || null;
  }, [data, selectedEmail]);

  const selectedDirState = useMemo(() => {
    const map = new Map<
      string,
      { status: "queued" | "submitted" | "live"; liveUrl: string; httpStatus: number; mod: string }
    >();
    if (!data || !selectedEmail) return map;
    const em = selectedEmail.toLowerCase();
    for (const h of data.directoryHealth || []) {
      if (h.customer_email.toLowerCase() === em) {
        map.set(h.directory_id, {
          status: "queued",
          liveUrl: "",
          httpStatus: h.last_http_status || 0,
          mod: h.moderation_state,
        });
      }
    }
    for (const d of data.directories) {
      if (d.customer_email.toLowerCase() === em) {
        const cur = map.get(d.directory_id);
        map.set(d.directory_id, {
          status: d.status,
          liveUrl: d.live_backlink_url || "",
          httpStatus: cur?.httpStatus || 0,
          mod: cur?.mod || "approved",
        });
      }
    }
    return map;
  }, [data, selectedEmail]);

  const handleSaveDirectory = async (dir: DirectoryChannel, nextStatus: "queued" | "submitted" | "live") => {
    if (!selectedEmail.trim()) return;
    setSavingDirId(dir.id);
    try {
      const camp = data?.campaigns.find((c) => c.user_email === selectedEmail);
      const cur = selectedDirState.get(dir.id);
      const liveBacklinkUrl = (urlDrafts[dir.id] ?? cur?.liveUrl ?? "").trim();
      const res = await fetch("/api/admin/directory-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: selectedEmail.trim(),
          slug: camp?.slug || "",
          directoryId: dir.id,
          directoryName: dir.name,
          directoryUrl: dir.url,
          dr: dir.dr,
          category: dir.category,
          status: nextStatus,
          liveBacklinkUrl,
          scheduledWave: dir.wave,
        }),
      });
      if (res.ok) await fetchAdminData();
    } finally {
      setSavingDirId(null);
    }
  };

  const handleTriggerVerify = async () => {
    setVerifying(true);
    setVerifyMsg("");
    try {
      const res = await fetch("/api/admin/verify-backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerEmail: selectedEmail.trim() }),
      });
      const json = (await res.json()) as { checked?: number; verifiedLive?: number; dofollowCount?: number };
      if (res.ok) {
        setVerifyMsg(
          isZh
            ? `验活完成：检测 ${json.checked || 0} 条，存活 ${json.verifiedLive || 0} 条（传递权重 ${json.dofollowCount || 0} 条）。`
            : `Checked ${json.checked || 0}: ${json.verifiedLive || 0} live (${json.dofollowCount || 0} dofollow).`
        );
        await fetchAdminData();
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyBrandKit = async () => {
    if (!selectedBrandKit) return;
    const text = [
      `Email: ${selectedEmail}`,
      `Tagline: ${selectedBrandKit.short_tagline}`,
      `Pitch: ${selectedBrandKit.medium_pitch}`,
      `Long: ${selectedBrandKit.long_description}`,
      `Pricing: ${selectedBrandKit.pricing_model}`,
      `Logo: ${selectedBrandKit.logo_url}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKit(true);
      setTimeout(() => setCopiedKit(false), 1600);
    } catch {
      // ignore
    }
  };

  const filteredDirs = useMemo(() => {
    const q = dirSearch.trim().toLowerCase();
    return DISTRIBUTION_DIRECTORIES.filter((d) => !q || `${d.name} ${d.url} dr${d.dr}`.toLowerCase().includes(q));
  }, [dirSearch]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[var(--bg-frame)] text-[var(--ink-muted)] flex items-center justify-center text-[13px]">
        {isZh ? "正在验证运营台会话..." : "Checking admin session..."}
      </div>
    );
  }

  // 未登录运营台：极简精密鉴权页
  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--bg-frame)] text-[var(--ink-primary)] flex flex-col">
        <header className="h-12 px-4 sm:px-6 border-b border-[var(--border-hairline)] flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold text-[14.5px] text-[var(--ink-primary)]">
            <BrandMark className="w-5 h-5" />
            <span>LaunchPulse</span>
          </Link>
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <ThemeSwitcher />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <form
            onSubmit={handleAdminLogin}
            className="w-full max-w-[380px] rounded-[12px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] p-7 space-y-5"
          >
            <div className="space-y-1.5">
              <div className="w-9 h-9 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center justify-center">
                <Lock className="w-4 h-4 text-[var(--ink-primary)]" />
              </div>
              <h1 className="lp-display text-[19px] font-semibold text-[var(--ink-primary)] pt-1">
                {isZh ? "运营履约台鉴权" : "Operations Console"}
              </h1>
              <p className="text-[12.5px] text-[var(--ink-secondary)]">
                {isZh ? "输入管理员密钥，服务端签发 HttpOnly 安全会话。" : "Sign in with your administrator key."}
              </p>
            </div>

            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[var(--ink-secondary)]">
                {isZh ? "管理员密钥" : "Admin Key"}
              </span>
              <input
                type="password"
                required
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-9 px-3 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[13.5px] font-mono text-[var(--ink-primary)] outline-none focus:border-[var(--accent-primary)]"
              />
            </label>

            {error && <p className="text-[12px] text-[var(--status-danger)]">{error}</p>}

            <Button type="submit" variant="primary" size="md" loading={loading} className="w-full">
              {isZh ? "验证并进入履约台" : "Unlock Console"}
            </Button>
          </form>
        </main>
      </div>
    );
  }

  const navItems: ShellNavItem[] = [
    { key: "overview", label: isZh ? "运营总览" : "Overview", icon: <Activity className="w-4 h-4" strokeWidth={1.7} /> },
    {
      key: "directories",
      label: isZh ? "100 目录履约" : "Fulfillment",
      icon: <Globe className="w-4 h-4" strokeWidth={1.7} />,
      badge: DISTRIBUTION_DIRECTORIES.length,
    },
    {
      key: "orders",
      label: isZh ? "订单与客户" : "Orders & Users",
      icon: <CreditCard className="w-4 h-4" strokeWidth={1.7} />,
      badge: data.orders.length,
    },
  ];

  const customerEmails = Array.from(
    new Set([...data.campaigns.map((c) => c.user_email), ...data.users.map((u) => u.email)])
  ).filter(Boolean);

  return (
    <AppShell
      navItems={navItems}
      activeKey={tab}
      onSelect={(k) => setTab(k as AdminTab)}
      breadcrumbRoot={isZh ? "运营履约台" : "Operations"}
      breadcrumbCurrent={navItems.find((n) => n.key === tab)?.label || ""}
      headerActions={
        <Button variant="secondary" size="xs" loading={loading} onClick={() => void fetchAdminData()}>
          <RefreshCw className="w-3.5 h-3.5" />
          {isZh ? "刷新" : "Sync"}
        </Button>
      }
      sidebarTopSlot={
        <select
          value={selectedEmail}
          onChange={(e) => setSelectedEmail(e.target.value)}
          aria-label={isZh ? "选择履约客户" : "Select customer"}
          className="w-full h-8 px-2.5 rounded-[7px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] text-[12px] font-medium text-[var(--ink-primary)] outline-none"
        >
          {customerEmails.length === 0 ? (
            <option value="">{isZh ? "暂无客户" : "No customers"}</option>
          ) : (
            customerEmails.map((em) => (
              <option key={em} value={em}>
                {em}
              </option>
            ))
          )}
        </select>
      }
      sidebarFooter={
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleAdminLogout}
            className="h-7 px-2 rounded-[6px] text-[12px] text-[var(--ink-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-primary)] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isZh ? "退出运营台" : "Log out"}</span>
          </button>
          <ThemeSwitcher />
        </div>
      }
    >
      {/* TAB 1：运营总览 */}
      {tab === "overview" && (
        <div className="p-5 sm:p-7 space-y-6 tabular-nums">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h1 className="lp-display text-[20px] font-semibold text-[var(--ink-primary)]">
                {isZh ? "平台实时运营与履约总览" : "Platform Operations Overview"}
              </h1>
              <p className="text-[12.5px] text-[var(--ink-muted)] mt-0.5">
                {isZh ? `最近同步：${data.syncedAt}` : `Synced at ${data.syncedAt}`}
              </p>
            </div>
            <Button variant="primary" size="sm" loading={verifying} onClick={handleTriggerVerify}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {isZh ? "批量执行外链 HTTP 验活" : "Verify Live Backlinks"}
            </Button>
          </div>

          {verifyMsg && (
            <div className="px-4 py-2.5 rounded-[7px] bg-[var(--status-live-soft)] text-[var(--status-live)] text-[12.5px] font-medium">
              {verifyMsg}
            </div>
          )}

          {/* 单行精密指标条 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 rounded-[9px] border border-[var(--border-hairline)] divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-hairline)]">
            {[
              { label: isZh ? "累计美元收款" : "Total Revenue", val: `$${data.kpis.totalRevenueUsd.toLocaleString()}` },
              { label: isZh ? "月度经常性收入" : "Active MRR", val: `$${data.kpis.activeMrrUsd.toLocaleString()}` },
              { label: isZh ? "活跃项目 / 注册用户" : "Projects / Users", val: `${data.kpis.totalCampaigns} / ${data.kpis.totalUsers}` },
              { label: isZh ? "全站累计点击 / 转化" : "Clicks / Conversions", val: `${data.kpis.totalClicks} / ${data.kpis.totalConversions}` },
            ].map((m, i) => (
              <div key={i} className="p-4">
                <p className="text-[12px] text-[var(--ink-muted)]">{m.label}</p>
                <p className="font-mono text-[22px] font-semibold text-[var(--ink-primary)] mt-1">{m.val}</p>
              </div>
            ))}
          </div>

          {/* 客户推广项目队列 */}
          <div className="space-y-2.5">
            <h2 className="text-[14px] font-semibold text-[var(--ink-primary)]">
              {isZh ? "待履约客户项目队列" : "Customer Workspaces"}
            </h2>
            <div className="rounded-[9px] border border-[var(--border-hairline)] overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] text-[12px] text-[var(--ink-muted)]">
                    <th className="py-2.5 px-4 font-medium">{isZh ? "产品名称" : "Product"}</th>
                    <th className="py-2.5 px-4 font-medium">{isZh ? "客户邮箱" : "Customer"}</th>
                    <th className="py-2.5 px-4 font-medium">{isZh ? "官网地址" : "URL"}</th>
                    <th className="py-2.5 px-4 font-medium text-right">{isZh ? "履约操作" : "Action"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)]">
                  {data.campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[var(--ink-muted)]">
                        {isZh ? "暂无客户项目" : "No campaigns yet"}
                      </td>
                    </tr>
                  ) : (
                    data.campaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-[var(--bg-hover)] lp-ease">
                        <td className="py-3 px-4 font-medium text-[var(--ink-primary)]">{c.product_name}</td>
                        <td className="py-3 px-4 font-mono text-[12px] text-[var(--ink-secondary)]">{c.user_email}</td>
                        <td className="py-3 px-4 font-mono text-[12px] text-[var(--ink-muted)]">{c.target_url}</td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => {
                              setSelectedEmail(c.user_email);
                              setTab("directories");
                            }}
                          >
                            {isZh ? "进入 100 目录履约" : "Fulfill Directories"}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2：100 目录行内履约 */}
      {tab === "directories" && (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-5 sm:px-7 py-4 border-b border-[var(--border-hairline)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h1 className="lp-display text-[18px] font-semibold text-[var(--ink-primary)]">
                  {isZh ? `客户外链履约：${selectedEmail || "未选择"}` : `Fulfillment: ${selectedEmail || "None"}`}
                </h1>
                {selectedBrandKit && (
                  <p className="text-[12px] text-[var(--ink-secondary)] mt-0.5 line-clamp-1">
                    {selectedBrandKit.short_tagline || selectedBrandKit.medium_pitch}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedBrandKit && (
                  <Button variant="secondary" size="xs" onClick={handleCopyBrandKit}>
                    {copiedKit ? <Check className="w-3.5 h-3.5 text-[var(--status-live)]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKit ? (isZh ? "已复制 Brand Kit" : "Copied") : isZh ? "复制客户资料包" : "Copy Brand Kit"}
                  </Button>
                )}
                <Button variant="primary" size="xs" loading={verifying} onClick={handleTriggerVerify}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isZh ? "一键 HTTP 验活" : "Verify HTTP"}
                </Button>
              </div>
            </div>

            <div className="relative max-w-[300px]">
              <Search className="w-3.5 h-3.5 text-[var(--ink-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={dirSearch}
                onChange={(e) => setDirSearch(e.target.value)}
                placeholder={isZh ? "过滤目录名称..." : "Filter directories..."}
                className="w-full h-8 pl-8 pr-3 rounded-[6px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[12.5px] text-[var(--ink-primary)] outline-none"
              />
            </div>

            {verifyMsg && <p className="text-[12px] text-[var(--status-live)] font-medium">{verifyMsg}</p>}
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12.5px] tabular-nums">
              <thead>
                <tr className="bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] text-[12px] text-[var(--ink-muted)]">
                  <th className="py-2.5 pl-5 pr-3 font-medium">{isZh ? "目录平台" : "Directory"}</th>
                  <th className="py-2.5 px-3 font-medium">DR</th>
                  <th className="py-2.5 px-3 font-medium">{isZh ? "当前状态" : "Status"}</th>
                  <th className="py-2.5 px-3 font-medium">{isZh ? "已收录外链回填地址" : "Live Backlink URL"}</th>
                  <th className="py-2.5 pl-3 pr-5 font-medium text-right">{isZh ? "快速切换" : "Update"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)]">
                {filteredDirs.map((dir) => {
                  const st = selectedDirState.get(dir.id);
                  const status = st?.status || "queued";
                  const draftUrl = urlDrafts[dir.id] ?? st?.liveUrl ?? "";
                  return (
                    <tr key={dir.id} className="hover:bg-[var(--bg-hover)] lp-ease">
                      <td className="py-2.5 pl-5 pr-3">
                        <a
                          href={dir.submitUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[var(--ink-primary)] hover:text-[var(--accent-primary)] inline-flex items-center gap-1"
                        >
                          {dir.name}
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[var(--ink-secondary)]">{dir.dr}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge
                          tone={status === "live" ? "success" : status === "submitted" ? "warning" : "neutral"}
                          label={
                            status === "live"
                              ? isZh
                                ? "已验活"
                                : "Live"
                              : status === "submitted"
                                ? isZh
                                  ? "已提交"
                                  : "Submitted"
                                : isZh
                                  ? "待提交"
                                  : "Queued"
                          }
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          value={draftUrl}
                          onChange={(e) => setUrlDrafts((prev) => ({ ...prev, [dir.id]: e.target.value }))}
                          placeholder="https://..."
                          className="w-full min-w-[200px] h-7 px-2 rounded-[5px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] font-mono text-[11.5px] text-[var(--ink-primary)] outline-none focus:border-[var(--accent-primary)]"
                        />
                      </td>
                      <td className="py-2.5 pl-3 pr-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="xs"
                            disabled={savingDirId === dir.id}
                            onClick={() => void handleSaveDirectory(dir, "submitted")}
                          >
                            {isZh ? "标已提交" : "Sub"}
                          </Button>
                          <Button
                            variant="secondary"
                            size="xs"
                            disabled={savingDirId === dir.id}
                            onClick={() => void handleSaveDirectory(dir, "live")}
                          >
                            {isZh ? "标已收录" : "Live"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3：订单与用户 */}
      {tab === "orders" && (
        <div className="p-5 sm:p-7 space-y-5 tabular-nums">
          <h1 className="lp-display text-[19px] font-semibold text-[var(--ink-primary)]">
            {isZh ? "付费订单与注册客户" : "Orders & Registered Users"}
          </h1>

          <div className="rounded-[9px] border border-[var(--border-hairline)] overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] text-[12px] text-[var(--ink-muted)]">
                  <th className="py-2.5 px-4 font-medium">{isZh ? "订单号" : "Order ID"}</th>
                  <th className="py-2.5 px-4 font-medium">{isZh ? "客户邮箱" : "Customer"}</th>
                  <th className="py-2.5 px-4 font-medium">{isZh ? "方案" : "Plan"}</th>
                  <th className="py-2.5 px-4 font-medium">{isZh ? "金额" : "Amount"}</th>
                  <th className="py-2.5 px-4 font-medium">{isZh ? "时间" : "Date"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)]">
                {data.orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[var(--ink-muted)]">
                      {isZh ? "暂无已支付订单" : "No orders yet"}
                    </td>
                  </tr>
                ) : (
                  data.orders.map((o) => (
                    <tr key={o.order_id} className="hover:bg-[var(--bg-hover)] lp-ease">
                      <td className="py-2.5 px-4 font-mono text-[12px] text-[var(--ink-primary)]">{o.order_id}</td>
                      <td className="py-2.5 px-4 font-mono text-[12px] text-[var(--ink-secondary)]">{o.customer_email}</td>
                      <td className="py-2.5 px-4">{o.plan}</td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-[var(--ink-primary)]">${o.amount_usd}</td>
                      <td className="py-2.5 px-4 text-[var(--ink-muted)]">{o.created_at}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
